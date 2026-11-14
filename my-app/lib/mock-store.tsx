"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuditLog,
  DocumentCategory,
  LetterType,
  NotificationItem,
  Organization,
  Submission,
  SubmissionDocument,
  SubmissionHistory,
  SubmissionStatus,
  SystemSettings,
  User,
  UserRole,
} from "./types";
import {
  SEED_AUDIT_LOGS,
  SEED_DOCUMENTS,
  SEED_HISTORIES,
  SEED_LETTER_TYPES,
  SEED_NOTIFICATIONS,
  SEED_ORGANIZATIONS,
  SEED_SUBMISSIONS,
  SEED_SYSTEM_SETTINGS,
  SEED_USERS,
} from "./seed-data";
import { getSupabaseBrowserClient, STORAGE_BUCKET } from "./supabase/client";
import {
  deleteLocalBinaryBlob,
  resolveDocumentSignedUrl,
  resolveTemplateSignedUrl,
  uploadRealFileToStorage,
} from "./supabase/file-storage";

const STORAGE_KEY = "sipas_frontend_state_v4";

interface AppState {
  currentUserId: string | null;
  users: User[];
  organizations: Organization[];
  letterTypes: LetterType[];
  submissions: Submission[];
  documents: SubmissionDocument[];
  histories: SubmissionHistory[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  lastSequenceNumber: number;
}

const DEFAULT_STATE: AppState = {
  currentUserId: null,
  users: SEED_USERS,
  organizations: SEED_ORGANIZATIONS,
  letterTypes: SEED_LETTER_TYPES,
  submissions: SEED_SUBMISSIONS,
  documents: SEED_DOCUMENTS,
  histories: SEED_HISTORIES,
  notifications: SEED_NOTIFICATIONS,
  auditLogs: SEED_AUDIT_LOGS,
  settings: SEED_SYSTEM_SETTINGS,
  lastSequenceNumber: 44,
};

export interface FileUploadPayload {
  document_key: string;
  category: DocumentCategory;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  file?: File;
}

interface CreateSubmissionInput {
  id?: string;
  letter_type_id: string;
  title: string;
  purpose: string;
  recipient_target: string;
  event_date: string | null;
  custom_data: Record<string, string>;
  submitNow: boolean;
  files: FileUploadPayload[];
}

interface TransitionResult {
  ok: boolean;
  error?: string;
}

interface AppContextValue {
  isHydrated: boolean;
  isSupabaseConnected: boolean;
  currentUser: User | null;
  users: User[];
  organizations: Organization[];
  letterTypes: LetterType[];
  submissions: Submission[];
  documents: SubmissionDocument[];
  histories: SubmissionHistory[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  login: (
    email: string,
    password: string
  ) => { ok: boolean; error?: string; user?: User };
  loginAsRole: (role: UserRole) => User | null;
  logout: () => void;
  completePasswordChange: (newPassword?: string) => void;
  updateProfile: (data: {
    name: string;
    phone: string;
    nim_nip: string;
  }) => void;
  createOrUpdateSubmission: (input: CreateSubmissionInput) => {
    ok: boolean;
    submissionId?: string;
    error?: string;
  };
  deleteDraftSubmission: (submissionId: string) => TransitionResult;
  claimSubmission: (
    submissionId: string,
    ultUserId?: string
  ) => TransitionResult;
  transitionSubmission: (params: {
    submissionId: string;
    toStatus: SubmissionStatus;
    notes?: string;
    officialLetterNumber?: string;
    revisionFiles?: FileUploadPayload[];
    resultFile?: {
      file_name: string;
      file_size_bytes: number;
      mime_type: string;
      file?: File;
    };
  }) => TransitionResult;
  downloadDocument: (
    doc: SubmissionDocument,
    submissionNumber?: string | null
  ) => Promise<void>;
  downloadLetterTemplate: (lt: LetterType) => Promise<void>;
  getDocumentPreviewUrl: (
    doc: SubmissionDocument,
    submissionNumber?: string | null
  ) => Promise<{
    url: string;
    source: "supabase-storage" | "local-binary" | "seed-fallback";
    revokeOnCleanup: boolean;
  }>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  upsertUser: (
    user: Omit<User, "id" | "created_at" | "updated_at"> & {
      id?: string;
      tempPassword?: string;
    }
  ) => { id: string; tempPassword?: string };
  toggleUserActive: (userId: string) => void;
  upsertOrganization: (
    org: Omit<Organization, "id" | "created_at" | "updated_at"> & { id?: string }
  ) => void;
  toggleOrganizationActive: (orgId: string) => void;
  upsertLetterType: (
    lt: Omit<LetterType, "id" | "created_at" | "updated_at"> & {
      id?: string;
      templateFile?: File | null;
      removeTemplate?: boolean;
    }
  ) => void;
  toggleLetterTypeActive: (ltId: string) => void;
  updateSettings: (next: SystemSettings) => void;
  cleanupOldDrafts: () => number;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  const syncFromSupabase = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: orgs, error: orgErr } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: true });

      if (orgErr) {
        return;
      }

      setIsSupabaseConnected(true);

      if (!orgs || orgs.length === 0) {
        await supabase.from("organizations").upsert(SEED_ORGANIZATIONS);
        await supabase.from("users").upsert(SEED_USERS);
        await supabase.from("letter_types").upsert(SEED_LETTER_TYPES);
        await supabase
          .from("submission_counters")
          .upsert({ year: new Date().getFullYear(), last_number: 44 });
        await supabase.from("submissions").upsert(SEED_SUBMISSIONS);
        await supabase.from("submission_documents").upsert(SEED_DOCUMENTS);
        await supabase.from("submission_histories").upsert(SEED_HISTORIES);
        await supabase.from("notifications").upsert(SEED_NOTIFICATIONS);
        await supabase.from("audit_logs").upsert(SEED_AUDIT_LOGS);
        await supabase.from("system_settings").upsert([
          { key: "submission_prefix", value: SEED_SYSTEM_SETTINGS.submission_prefix },
          { key: "max_file_size_mb", value: SEED_SYSTEM_SETTINGS.max_file_size_mb },
          {
            key: "max_files_per_submission",
            value: SEED_SYSTEM_SETTINGS.max_files_per_submission,
          },
          { key: "ult_sla_days", value: SEED_SYSTEM_SETTINGS.ult_sla_days },
          {
            key: "maintenance_banner",
            value: SEED_SYSTEM_SETTINGS.maintenance_banner,
          },
        ]);
      }

      const [
        orgsRes,
        usersRes,
        ltRes,
        subsRes,
        docsRes,
        histRes,
        notifRes,
        auditRes,
        settingsRes,
        counterRes,
      ] = await Promise.all([
        supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("users")
          .select(
            "id,name,email,nim_nip,phone,role,organization_id,is_active,must_change_password,created_at,updated_at"
          )
          .order("created_at", { ascending: true }),
        supabase
          .from("letter_types")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("submissions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("submission_documents")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("submission_histories")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("system_settings").select("*"),
        supabase
          .from("submission_counters")
          .select("*")
          .eq("year", new Date().getFullYear())
          .maybeSingle(),
      ]);

      const nextSettings: SystemSettings = { ...SEED_SYSTEM_SETTINGS };
      if (settingsRes.data) {
        for (const row of settingsRes.data) {
          if (row.key in nextSettings) {
            (nextSettings as unknown as Record<string, unknown>)[row.key] =
              row.value;
          }
        }
      }

      setState((prev) => ({
        ...prev,
        organizations: (orgsRes.data as Organization[]) || prev.organizations,
        users: (usersRes.data as User[]) || prev.users,
        letterTypes: (ltRes.data as LetterType[]) || prev.letterTypes,
        submissions: (subsRes.data as Submission[]) || prev.submissions,
        documents: (docsRes.data as SubmissionDocument[]) || prev.documents,
        histories: (histRes.data as SubmissionHistory[]) || prev.histories,
        notifications:
          (notifRes.data as NotificationItem[]) || prev.notifications,
        auditLogs: (auditRes.data as AuditLog[]) || prev.auditLogs,
        settings: nextSettings,
        lastSequenceNumber:
          counterRes.data?.last_number ?? prev.lastSequenceNumber,
      }));
    } catch {
      // Fallback to local state if offline or tables not created yet
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          setState({
            ...DEFAULT_STATE,
            ...parsed,
          });
        }
      } catch {
        // Ignore corrupt localStorage
      } finally {
        setIsHydrated(true);
      }
      void syncFromSupabase();
    });

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("sipas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => void syncFromSupabase()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submission_documents" },
        () => void syncFromSupabase()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void syncFromSupabase()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [syncFromSupabase]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state, isHydrated]);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId]
  );

  const login = (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { ok: false, error: "Email dan kata sandi wajib diisi." };
    }
    if (password.length < 8) {
      return {
        ok: false,
        error: "Kata sandi minimal terdiri dari 8 karakter.",
      };
    }
    const found = state.users.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (!found) {
      return {
        ok: false,
        error:
          "Akun tidak ditemukan. Hubungi UPATIK jika Anda belum terdaftar.",
      };
    }
    if (!found.is_active) {
      return {
        ok: false,
        error:
          "Akun Anda dinonaktifkan oleh administrator UPATIK. Silakan hubungi layanan bantuan.",
      };
    }
    const now = new Date().toISOString();
    const auditEntry: AuditLog = {
      id: makeUuid(),
      user_id: found.id,
      action: "USER_LOGIN",
      entity_type: "users",
      entity_id: found.id,
      metadata: { email: found.email, role: found.role },
      ip_address: "103.24.56.10",
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      currentUserId: found.id,
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth
          .signInWithPassword({ email: cleanEmail, password })
          .catch(() => null);
        await supabase.from("audit_logs").insert(auditEntry);
      } catch {
        // Ignore
      }
    })();

    return { ok: true, user: found };
  };

  const loginAsRole = (role: UserRole): User | null => {
    const found = state.users.find((u) => u.role === role && u.is_active);
    if (!found) return null;
    const now = new Date().toISOString();
    const auditEntry: AuditLog = {
      id: makeUuid(),
      user_id: found.id,
      action: "USER_LOGIN_DEMO",
      entity_type: "users",
      entity_id: found.id,
      metadata: { email: found.email, role: found.role },
      ip_address: "103.24.56.10",
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      currentUserId: found.id,
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.from("audit_logs").insert(auditEntry);
      } catch {
        // Ignore
      }
    })();

    return found;
  };

  const logout = () => {
    setState((prev) => ({ ...prev, currentUserId: null }));
    void getSupabaseBrowserClient()
      .auth.signOut()
      .catch(() => null);
  };

  const completePasswordChange = (newPassword?: string) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const userId = currentUser.id;
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId
          ? { ...u, must_change_password: false, updated_at: now }
          : u
      ),
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (newPassword && newPassword.length >= 8) {
          await supabase.rpc("change_user_password", {
            p_user_id: userId,
            p_new_password: newPassword,
          });
        } else {
          await supabase
            .from("users")
            .update({ must_change_password: false, updated_at: now })
            .eq("id", userId);
        }
      } catch {
        // Ignore
      }
    })();
  };

  const updateProfile = (data: {
    name: string;
    phone: string;
    nim_nip: string;
  }) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const userId = currentUser.id;
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, ...data, updated_at: now } : u
      ),
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase
          .from("users")
          .update({
            name: data.name,
            phone: data.phone,
            nim_nip: data.nim_nip,
            updated_at: now,
          })
          .eq("id", userId);
      } catch {
        // Ignore
      }
    })();
  };

  const createOrUpdateSubmission = (input: CreateSubmissionInput) => {
    if (
      !currentUser ||
      currentUser.role !== "mahasiswa" ||
      !currentUser.organization_id
    ) {
      return {
        ok: false,
        error: "Hanya pengurus himpunan yang dapat membuat pengajuan.",
      };
    }
    const now = new Date().toISOString();
    const year = new Date().getFullYear();

    let nextSeq = state.lastSequenceNumber;
    let submissionNumber: string | null = null;
    if (input.submitNow) {
      nextSeq += 1;
      submissionNumber = `${state.settings.submission_prefix}-${year}-${String(
        nextSeq
      ).padStart(5, "0")}`;
    }

    const existing = input.id
      ? state.submissions.find((s) => s.id === input.id)
      : undefined;
    const submissionId = existing ? existing.id : makeUuid();

    const nextSub: Submission = existing
      ? {
          ...existing,
          letter_type_id: input.letter_type_id,
          title: input.title.trim(),
          purpose: input.purpose.trim(),
          recipient_target: input.recipient_target.trim(),
          event_date: input.event_date,
          custom_data: input.custom_data,
          status: input.submitNow ? "submitted" : "draft",
          submission_number: existing.submission_number ?? submissionNumber,
          submitted_at: input.submitNow ? now : existing.submitted_at,
          updated_at: now,
        }
      : {
          id: submissionId,
          submission_number: submissionNumber,
          official_letter_number: null,
          user_id: currentUser.id,
          organization_id: currentUser.organization_id,
          letter_type_id: input.letter_type_id,
          assigned_to: null,
          title: input.title.trim(),
          purpose: input.purpose.trim(),
          recipient_target: input.recipient_target.trim(),
          event_date: input.event_date,
          custom_data: input.custom_data,
          status: input.submitNow ? "submitted" : "draft",
          submitted_at: input.submitNow ? now : null,
          completed_at: null,
          created_at: now,
          updated_at: now,
        };

    const newDocs: { doc: SubmissionDocument; rawFile?: File }[] =
      input.files.map((f) => {
        const safeName = sanitizeFileName(f.file_name);
        const filePath = `${currentUser.organization_id}/${submissionId}/v1-${Date.now()}-${safeName}`;
        return {
          rawFile: f.file,
          doc: {
            id: makeUuid(),
            submission_id: submissionId,
            document_key: f.document_key,
            category: f.category,
            file_name: f.file_name,
            file_path: filePath,
            file_size_bytes: f.file_size_bytes,
            mime_type: f.mime_type,
            version: 1,
            is_current: true,
            uploaded_by: currentUser.id,
            created_at: now,
          },
        };
      });

    const newHistory: SubmissionHistory[] = input.submitNow
      ? [
          {
            id: makeUuid(),
            submission_id: submissionId,
            from_status: existing ? existing.status : null,
            to_status: "submitted",
            notes: "Pengajuan dikirim oleh pemohon ke Unit Layanan Terpadu.",
            updated_by: currentUser.id,
            created_at: now,
          },
        ]
      : [];

    const ultUsers = state.users.filter((u) => u.role === "ult" && u.is_active);
    const org = state.organizations.find(
      (o) => o.id === currentUser.organization_id
    );
    const newNotifications: NotificationItem[] = input.submitNow
      ? ultUsers.map((ult) => ({
          id: makeUuid(),
          user_id: ult.id,
          submission_id: submissionId,
          title: `Pengajuan Baru: ${nextSub.submission_number}`,
          message: `${org?.code ?? "Himpunan"} mengirim "${nextSub.title}".`,
          is_read: false,
          created_at: now,
        }))
      : [];

    setState((prev) => ({
      ...prev,
      lastSequenceNumber: nextSeq,
      submissions: existing
        ? prev.submissions.map((s) => (s.id === submissionId ? nextSub : s))
        : [nextSub, ...prev.submissions],
      documents: [...prev.documents, ...newDocs.map((d) => d.doc)],
      histories: [...prev.histories, ...newHistory],
      notifications: [...newNotifications, ...prev.notifications],
    }));

    void (async () => {
      try {
        for (const item of newDocs) {
          if (item.rawFile) {
            await uploadRealFileToStorage(
              item.doc.file_path,
              item.rawFile,
              item.doc.mime_type
            );
          }
        }
        const supabase = getSupabaseBrowserClient();
        if (input.submitNow && !existing?.submission_number) {
          const { data: rpcNum } = await supabase.rpc(
            "generate_submission_number"
          );
          if (typeof rpcNum === "string" && rpcNum.length > 0) {
            nextSub.submission_number = rpcNum;
            setState((prev) => ({
              ...prev,
              submissions: prev.submissions.map((s) =>
                s.id === submissionId
                  ? { ...s, submission_number: rpcNum }
                  : s
              ),
            }));
          }
        }
        await supabase.from("submissions").upsert(nextSub);
        if (newDocs.length > 0) {
          await supabase
            .from("submission_documents")
            .upsert(newDocs.map((d) => d.doc));
        }
        if (newHistory.length > 0) {
          await supabase.from("submission_histories").insert(newHistory);
        }
        if (newNotifications.length > 0) {
          await supabase.from("notifications").insert(newNotifications);
        }
      } catch {
        // Ignore
      }
    })();

    return { ok: true, submissionId };
  };

  const deleteDraftSubmission = (submissionId: string): TransitionResult => {
    const target = state.submissions.find((s) => s.id === submissionId);
    if (!target) return { ok: false, error: "Pengajuan tidak ditemukan." };
    if (target.status !== "draft") {
      return {
        ok: false,
        error: "Hanya pengajuan berstatus Draft yang dapat dihapus.",
      };
    }
    const targetDocs = state.documents.filter(
      (d) => d.submission_id === submissionId
    );
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.filter((s) => s.id !== submissionId),
      documents: prev.documents.filter((d) => d.submission_id !== submissionId),
      histories: prev.histories.filter((h) => h.submission_id !== submissionId),
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const paths = targetDocs.map((d) => d.file_path);
        for (const p of paths) {
          await deleteLocalBinaryBlob(p);
        }
        if (paths.length > 0) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove(paths)
            .catch(() => null);
        }
        await supabase.from("submissions").delete().eq("id", submissionId);
      } catch {
        // Ignore
      }
    })();

    return { ok: true };
  };

  const claimSubmission = (
    submissionId: string,
    ultUserId?: string
  ): TransitionResult => {
    if (!currentUser || currentUser.role !== "ult") {
      return {
        ok: false,
        error: "Hanya petugas ULT yang dapat mengambil tugas.",
      };
    }
    const assigneeId = ultUserId ?? currentUser.id;
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === submissionId
          ? { ...s, assigned_to: assigneeId, updated_at: now }
          : s
      ),
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase
          .from("submissions")
          .update({ assigned_to: assigneeId, updated_at: now })
          .eq("id", submissionId);
      } catch {
        // Ignore
      }
    })();

    return { ok: true };
  };

  const transitionSubmission: AppContextValue["transitionSubmission"] = ({
    submissionId,
    toStatus,
    notes,
    officialLetterNumber,
    revisionFiles,
    resultFile,
  }) => {
    if (!currentUser) {
      return { ok: false, error: "Sesi berakhir. Silakan login kembali." };
    }
    const sub = state.submissions.find((s) => s.id === submissionId);
    if (!sub) return { ok: false, error: "Pengajuan tidak ditemukan." };

    const from = sub.status;
    const allowedTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
      draft: ["submitted"],
      submitted: ["under_review", "cancelled"],
      under_review: ["revision_required", "approved", "rejected"],
      revision_required: ["submitted", "cancelled"],
      approved: ["processing"],
      processing: ["completed"],
      completed: [],
      rejected: [],
      cancelled: [],
    };

    if (!allowedTransitions[from].includes(toStatus)) {
      return {
        ok: false,
        error: `Transisi status tidak valid (${from} -> ${toStatus}).`,
      };
    }

    if (
      (toStatus === "revision_required" || toStatus === "rejected") &&
      (!notes || notes.trim().length < 10)
    ) {
      return {
        ok: false,
        error: "Catatan / alasan wajib diisi minimal 10 karakter.",
      };
    }

    if (toStatus === "completed" && !resultFile) {
      return {
        ok: false,
        error: "Wajib mengunggah dokumen surat hasil akhir (PDF).",
      };
    }

    const now = new Date().toISOString();
    let updatedDocs = [...state.documents];
    const newlyCreatedDocs: { doc: SubmissionDocument; rawFile?: File }[] = [];
    const deactivatedDocKeys: string[] = [];

    if (
      from === "revision_required" &&
      toStatus === "submitted" &&
      revisionFiles?.length
    ) {
      for (const rf of revisionFiles) {
        const existingSameKey = updatedDocs.filter(
          (d) =>
            d.submission_id === submissionId &&
            d.document_key === rf.document_key
        );
        const maxVersion = existingSameKey.reduce(
          (max, d) => Math.max(max, d.version),
          0
        );
        updatedDocs = updatedDocs.map((d) =>
          d.submission_id === submissionId && d.document_key === rf.document_key
            ? { ...d, is_current: false }
            : d
        );
        deactivatedDocKeys.push(rf.document_key);
        const safeName = sanitizeFileName(rf.file_name);
        const newDoc: SubmissionDocument = {
          id: makeUuid(),
          submission_id: submissionId,
          document_key: rf.document_key,
          category: rf.category,
          file_name: rf.file_name,
          file_path: `${sub.organization_id}/${submissionId}/v${
            maxVersion + 1
          }-${Date.now()}-${safeName}`,
          file_size_bytes: rf.file_size_bytes,
          mime_type: rf.mime_type,
          version: maxVersion + 1,
          is_current: true,
          uploaded_by: currentUser.id,
          created_at: now,
        };
        updatedDocs.push(newDoc);
        newlyCreatedDocs.push({ doc: newDoc, rawFile: rf.file });
      }
    }

    if (toStatus === "completed" && resultFile) {
      const safeName = sanitizeFileName(resultFile.file_name);
      const newResultDoc: SubmissionDocument = {
        id: makeUuid(),
        submission_id: submissionId,
        document_key: "result_letter",
        category: "result_letter",
        file_name: resultFile.file_name,
        file_path: `${sub.organization_id}/${submissionId}/result-${Date.now()}-${safeName}`,
        file_size_bytes: resultFile.file_size_bytes,
        mime_type: resultFile.mime_type,
        version: 1,
        is_current: true,
        uploaded_by: currentUser.id,
        created_at: now,
      };
      updatedDocs.push(newResultDoc);
      newlyCreatedDocs.push({ doc: newResultDoc, rawFile: resultFile.file });
    }

    const updatedSub: Submission = {
      ...sub,
      status: toStatus,
      assigned_to:
        toStatus === "under_review" && !sub.assigned_to
          ? currentUser.id
          : sub.assigned_to,
      official_letter_number:
        officialLetterNumber?.trim() || sub.official_letter_number,
      completed_at: toStatus === "completed" ? now : sub.completed_at,
      updated_at: now,
    };

    const historyEntry: SubmissionHistory = {
      id: makeUuid(),
      submission_id: submissionId,
      from_status: from,
      to_status: toStatus,
      notes: notes?.trim() || null,
      updated_by: currentUser.id,
      created_at: now,
    };

    const targetNotifUsers =
      currentUser.role === "ult"
        ? state.users.filter(
            (u) => u.organization_id === sub.organization_id && u.is_active
          )
        : state.users.filter((u) =>
            sub.assigned_to
              ? u.id === sub.assigned_to
              : u.role === "ult" && u.is_active
          );

    const newNotifications: NotificationItem[] = targetNotifUsers.map((u) => ({
      id: makeUuid(),
      user_id: u.id,
      submission_id: submissionId,
      title: `Pembaruan Status: ${sub.submission_number ?? "Pengajuan"}`,
      message: `Status pengajuan "${sub.title}" diperbarui menjadi ${toStatus.replace(
        "_",
        " "
      )}.`,
      is_read: false,
      created_at: now,
    }));

    const newAudit: AuditLog = {
      id: makeUuid(),
      user_id: currentUser.id,
      action:
        toStatus === "completed"
          ? "SUBMISSION_COMPLETED"
          : "SUBMISSION_STATUS_CHANGED",
      entity_type: "submissions",
      entity_id: submissionId,
      metadata: {
        submission_number: sub.submission_number,
        from,
        to: toStatus,
        ...(officialLetterNumber
          ? { official_letter_number: officialLetterNumber.trim() }
          : {}),
      },
      ip_address: "103.24.56.18",
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === submissionId ? updatedSub : s
      ),
      documents: updatedDocs,
      histories: [...prev.histories, historyEntry],
      notifications: [...newNotifications, ...prev.notifications],
      auditLogs: [newAudit, ...prev.auditLogs],
    }));

    void (async () => {
      try {
        for (const item of newlyCreatedDocs) {
          if (item.rawFile) {
            await uploadRealFileToStorage(
              item.doc.file_path,
              item.rawFile,
              item.doc.mime_type
            );
          }
        }
        const supabase = getSupabaseBrowserClient();
        for (const docKey of deactivatedDocKeys) {
          await supabase
            .from("submission_documents")
            .update({ is_current: false })
            .eq("submission_id", submissionId)
            .eq("document_key", docKey);
        }
        if (newlyCreatedDocs.length > 0) {
          await supabase
            .from("submission_documents")
            .insert(newlyCreatedDocs.map((d) => d.doc));
        }
        await supabase
          .from("submissions")
          .update({
            status: updatedSub.status,
            assigned_to: updatedSub.assigned_to,
            official_letter_number: updatedSub.official_letter_number,
            completed_at: updatedSub.completed_at,
            updated_at: updatedSub.updated_at,
          })
          .eq("id", submissionId);
        await supabase.from("submission_histories").insert(historyEntry);
        if (newNotifications.length > 0) {
          await supabase.from("notifications").insert(newNotifications);
        }
        await supabase.from("audit_logs").insert(newAudit);
      } catch {
        // Ignore
      }
    })();

    return { ok: true };
  };

  const getDocumentPreviewUrl = useCallback(
    async (doc: SubmissionDocument, submissionNumber?: string | null) => {
      return resolveDocumentSignedUrl(doc, submissionNumber);
    },
    []
  );

  const downloadDocument = useCallback(
    async (doc: SubmissionDocument, submissionNumber?: string | null) => {
      const resolved = await resolveDocumentSignedUrl(doc, submissionNumber);
      const a = document.createElement("a");
      a.href = resolved.url;
      a.download = doc.file_name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (resolved.revokeOnCleanup) {
        setTimeout(() => URL.revokeObjectURL(resolved.url), 10000);
      }
    },
    []
  );

  const downloadLetterTemplate = useCallback(async (lt: LetterType) => {
    const resolved = await resolveTemplateSignedUrl(lt);
    const a = document.createElement("a");
    a.href = resolved.url;
    a.download = resolved.fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (resolved.revokeOnCleanup) {
      setTimeout(() => URL.revokeObjectURL(resolved.url), 10000);
    }
  }, []);

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
    }));

    void (async () => {
      try {
        await getSupabaseBrowserClient()
          .from("notifications")
          .update({ is_read: true })
          .eq("id", id);
      } catch {
        // Ignore
      }
    })();
  };

  const markAllNotificationsRead = () => {
    if (!currentUser) return;
    const uid = currentUser.id;
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.user_id === uid ? { ...n, is_read: true } : n
      ),
    }));

    void (async () => {
      try {
        await getSupabaseBrowserClient()
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", uid);
      } catch {
        // Ignore
      }
    })();
  };

  const upsertUser: AppContextValue["upsertUser"] = (userInput) => {
    const now = new Date().toISOString();
    const isEdit = Boolean(userInput.id);
    const id = userInput.id ?? makeUuid();
    const tempPassword =
      !isEdit ? userInput.tempPassword || "Sipas2026!" : undefined;
    const nextUser: User = {
      id,
      name: userInput.name,
      email: userInput.email,
      nim_nip: userInput.nim_nip,
      phone: userInput.phone,
      role: userInput.role,
      organization_id: userInput.organization_id,
      is_active: userInput.is_active,
      must_change_password: userInput.must_change_password,
      created_at: now,
      updated_at: now,
    };
    const auditEntry: AuditLog = {
      id: makeUuid(),
      user_id: currentUser?.id ?? null,
      action: isEdit ? "USER_UPDATED" : "USER_CREATED",
      entity_type: "users",
      entity_id: id,
      metadata: { email: userInput.email, role: userInput.role },
      ip_address: "103.24.56.12",
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      users: isEdit
        ? prev.users.map((u) =>
            u.id === id ? { ...u, ...nextUser, created_at: u.created_at } : u
          )
        : [nextUser, ...prev.users],
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.from("users").upsert(nextUser);
        if (tempPassword) {
          await supabase.rpc("change_user_password", {
            p_user_id: id,
            p_new_password: tempPassword,
          });
        }
        await supabase.from("audit_logs").insert(auditEntry);
      } catch {
        // Ignore
      }
    })();

    return { id, tempPassword };
  };

  const toggleUserActive = (userId: string) => {
    const now = new Date().toISOString();
    const target = state.users.find((u) => u.id === userId);
    const nextActive = target ? !target.is_active : false;
    const auditEntry: AuditLog = {
      id: makeUuid(),
      user_id: currentUser?.id ?? null,
      action: "USER_STATUS_TOGGLED",
      entity_type: "users",
      entity_id: userId,
      metadata: { is_active: nextActive },
      ip_address: "103.24.56.12",
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, is_active: !u.is_active, updated_at: now } : u
      ),
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase
          .from("users")
          .update({ is_active: nextActive, updated_at: now })
          .eq("id", userId);
        await supabase.from("audit_logs").insert(auditEntry);
      } catch {
        // Ignore
      }
    })();
  };

  const upsertOrganization: AppContextValue["upsertOrganization"] = (
    orgInput
  ) => {
    const now = new Date().toISOString();
    const isEdit = Boolean(orgInput.id);
    const id = orgInput.id ?? makeUuid();
    const nextOrg: Organization = {
      ...orgInput,
      id,
      created_at: now,
      updated_at: now,
    };
    const auditEntry: AuditLog = {
      id: makeUuid(),
      user_id: currentUser?.id ?? null,
      action: isEdit ? "ORG_UPDATED" : "ORG_CREATED",
      entity_type: "organizations",
      entity_id: id,
      metadata: { code: orgInput.code },
      ip_address: "103.24.56.12",
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      organizations: isEdit
        ? prev.organizations.map((o) =>
            o.id === id ? { ...o, ...orgInput, updated_at: now } : o
          )
        : [nextOrg, ...prev.organizations],
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.from("organizations").upsert(nextOrg);
        await supabase.from("audit_logs").insert(auditEntry);
      } catch {
        // Ignore
      }
    })();
  };

  const toggleOrganizationActive = (orgId: string) => {
    const now = new Date().toISOString();
    const target = state.organizations.find((o) => o.id === orgId);
    const nextActive = target ? !target.is_active : false;
    setState((prev) => ({
      ...prev,
      organizations: prev.organizations.map((o) =>
        o.id === orgId ? { ...o, is_active: !o.is_active, updated_at: now } : o
      ),
    }));

    void (async () => {
      try {
        await getSupabaseBrowserClient()
          .from("organizations")
          .update({ is_active: nextActive, updated_at: now })
          .eq("id", orgId);
      } catch {
        // Ignore
      }
    })();
  };

  const upsertLetterType: AppContextValue["upsertLetterType"] = (ltInput) => {
    const now = new Date().toISOString();
    const isEdit = Boolean(ltInput.id);
    const id = ltInput.id ?? makeUuid();
    const { templateFile, removeTemplate, ...restLt } = ltInput;

    const resolvedTemplatePath = templateFile
      ? `templates/${restLt.code.trim().toLowerCase()}/${Date.now()}_${sanitizeFileName(
          templateFile.name
        )}`
      : removeTemplate
      ? null
      : restLt.template_file_path;

    const existing = state.letterTypes.find((l) => l.id === id);
    const nextLt: LetterType = {
      id,
      code: restLt.code,
      name: restLt.name,
      description: restLt.description,
      estimated_days: restLt.estimated_days,
      required_documents: restLt.required_documents,
      custom_fields_schema: restLt.custom_fields_schema,
      template_file_path: resolvedTemplatePath,
      is_active: restLt.is_active,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    const auditEntry: AuditLog = {
      id: makeUuid(),
      user_id: currentUser?.id ?? null,
      action: isEdit ? "LETTER_TYPE_UPDATED" : "LETTER_TYPE_CREATED",
      entity_type: "letter_types",
      entity_id: id,
      metadata: {
        code: nextLt.code,
        template_file_path: nextLt.template_file_path,
      },
      ip_address: "103.24.56.12",
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      letterTypes: isEdit
        ? prev.letterTypes.map((l) => (l.id === id ? nextLt : l))
        : [nextLt, ...prev.letterTypes],
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));

    void (async () => {
      try {
        if (templateFile && resolvedTemplatePath) {
          await uploadRealFileToStorage(
            resolvedTemplatePath,
            templateFile,
            templateFile.type || "application/pdf"
          );
        }
        const supabase = getSupabaseBrowserClient();
        await supabase.from("letter_types").upsert(nextLt);
        await supabase.from("audit_logs").insert(auditEntry);
      } catch {
        // Ignore
      }
    })();
  };

  const toggleLetterTypeActive = (ltId: string) => {
    const now = new Date().toISOString();
    const target = state.letterTypes.find((l) => l.id === ltId);
    const nextActive = target ? !target.is_active : false;
    setState((prev) => ({
      ...prev,
      letterTypes: prev.letterTypes.map((l) =>
        l.id === ltId ? { ...l, is_active: !l.is_active, updated_at: now } : l
      ),
    }));

    void (async () => {
      try {
        await getSupabaseBrowserClient()
          .from("letter_types")
          .update({ is_active: nextActive, updated_at: now })
          .eq("id", ltId);
      } catch {
        // Ignore
      }
    })();
  };

  const updateSettings = (next: SystemSettings) => {
    const now = new Date().toISOString();
    const auditEntry: AuditLog = {
      id: makeUuid(),
      user_id: currentUser?.id ?? null,
      action: "SYSTEM_SETTINGS_UPDATED",
      entity_type: "system_settings",
      entity_id: null,
      metadata: next as unknown as Record<string, unknown>,
      ip_address: "103.24.56.12",
      created_at: now,
    };

    setState((prev) => ({
      ...prev,
      settings: next,
      auditLogs: [auditEntry, ...prev.auditLogs],
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.from("system_settings").upsert([
          {
            key: "submission_prefix",
            value: next.submission_prefix,
            updated_by: currentUser?.id ?? null,
            updated_at: now,
          },
          {
            key: "max_file_size_mb",
            value: next.max_file_size_mb,
            updated_by: currentUser?.id ?? null,
            updated_at: now,
          },
          {
            key: "max_files_per_submission",
            value: next.max_files_per_submission,
            updated_by: currentUser?.id ?? null,
            updated_at: now,
          },
          {
            key: "ult_sla_days",
            value: next.ult_sla_days,
            updated_by: currentUser?.id ?? null,
            updated_at: now,
          },
          {
            key: "maintenance_banner",
            value: next.maintenance_banner,
            updated_by: currentUser?.id ?? null,
            updated_at: now,
          },
        ]);
        await supabase.from("audit_logs").insert(auditEntry);
      } catch {
        // Ignore
      }
    })();
  };

  const cleanupOldDrafts = (): number => {
    const drafts = state.submissions.filter((s) => s.status === "draft");
    if (drafts.length === 0) return 0;
    const draftIds = new Set(drafts.map((d) => d.id));
    const draftDocs = state.documents.filter((d) =>
      draftIds.has(d.submission_id)
    );
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.filter((s) => !draftIds.has(s.id)),
      documents: prev.documents.filter((d) => !draftIds.has(d.submission_id)),
    }));

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const paths = draftDocs.map((d) => d.file_path);
        for (const p of paths) {
          await deleteLocalBinaryBlob(p);
        }
        if (paths.length > 0) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove(paths)
            .catch(() => null);
        }
        await supabase
          .from("submissions")
          .delete()
          .in("id", Array.from(draftIds));
      } catch {
        // Ignore
      }
    })();

    return drafts.length;
  };

  const resetDemoData = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    const keepUser = currentUser?.id ?? null;
    setState({
      ...DEFAULT_STATE,
      currentUserId: keepUser,
    });

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        await supabase.from("organizations").upsert(SEED_ORGANIZATIONS);
        await supabase.from("users").upsert(SEED_USERS);
        await supabase.from("letter_types").upsert(SEED_LETTER_TYPES);
        await supabase.from("submissions").upsert(SEED_SUBMISSIONS);
        await supabase.from("submission_documents").upsert(SEED_DOCUMENTS);
        await supabase.from("submission_histories").upsert(SEED_HISTORIES);
        await supabase.from("notifications").upsert(SEED_NOTIFICATIONS);
      } catch {
        // Ignore
      }
    })();
  };

  return (
    <AppContext.Provider
      value={{
        isHydrated,
        isSupabaseConnected,
        currentUser,
        users: state.users,
        organizations: state.organizations,
        letterTypes: state.letterTypes,
        submissions: state.submissions,
        documents: state.documents,
        histories: state.histories,
        notifications: state.notifications,
        auditLogs: state.auditLogs,
        settings: state.settings,
        login,
        loginAsRole,
        logout,
        completePasswordChange,
        updateProfile,
        createOrUpdateSubmission,
        deleteDraftSubmission,
        claimSubmission,
        transitionSubmission,
        downloadDocument,
        downloadLetterTemplate,
        getDocumentPreviewUrl,
        markNotificationRead,
        markAllNotificationsRead,
        upsertUser,
        toggleUserActive,
        upsertOrganization,
        toggleOrganizationActive,
        upsertLetterType,
        toggleLetterTypeActive,
        updateSettings,
        cleanupOldDrafts,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppStore must be used inside AppProvider");
  }
  return ctx;
}
