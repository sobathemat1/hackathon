"use client";

import React, {
  createContext,
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

const STORAGE_KEY = "sipas_frontend_state_v1";

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

interface CreateSubmissionInput {
  id?: string;
  letter_type_id: string;
  title: string;
  purpose: string;
  recipient_target: string;
  event_date: string | null;
  custom_data: Record<string, string>;
  submitNow: boolean;
  files: {
    document_key: string;
    category: DocumentCategory;
    file_name: string;
    file_size_bytes: number;
    mime_type: string;
  }[];
}

interface TransitionResult {
  ok: boolean;
  error?: string;
}

interface AppContextValue {
  isHydrated: boolean;
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
  login: (email: string, password: string) => { ok: boolean; error?: string; user?: User };
  loginAsRole: (role: UserRole) => User | null;
  logout: () => void;
  completePasswordChange: () => void;
  updateProfile: (data: { name: string; phone: string; nim_nip: string }) => void;
  createOrUpdateSubmission: (input: CreateSubmissionInput) => {
    ok: boolean;
    submissionId?: string;
    error?: string;
  };
  deleteDraftSubmission: (submissionId: string) => TransitionResult;
  claimSubmission: (submissionId: string, ultUserId?: string) => TransitionResult;
  transitionSubmission: (params: {
    submissionId: string;
    toStatus: SubmissionStatus;
    notes?: string;
    officialLetterNumber?: string;
    revisionFiles?: {
      document_key: string;
      category: DocumentCategory;
      file_name: string;
      file_size_bytes: number;
      mime_type: string;
    }[];
    resultFile?: {
      file_name: string;
      file_size_bytes: number;
      mime_type: string;
    };
  }) => TransitionResult;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  upsertUser: (user: Omit<User, "created_at" | "updated_at"> & { id?: string }) => void;
  toggleUserActive: (userId: string) => void;
  upsertOrganization: (
    org: Omit<Organization, "created_at" | "updated_at"> & { id?: string }
  ) => void;
  toggleOrganizationActive: (orgId: string) => void;
  upsertLetterType: (
    lt: Omit<LetterType, "created_at" | "updated_at"> & { id?: string }
  ) => void;
  toggleLetterTypeActive: (ltId: string) => void;
  updateSettings: (next: SystemSettings) => void;
  cleanupOldDrafts: () => number;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
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
  }, []);

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
        error: "Akun tidak ditemukan. Hubungi UPATIK jika Anda belum terdaftar.",
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
    setState((prev) => ({
      ...prev,
      currentUserId: found.id,
      auditLogs: [
        {
          id: makeId("audit"),
          user_id: found.id,
          action: "USER_LOGIN",
          entity_type: "users",
          entity_id: found.id,
          metadata: { email: found.email, role: found.role },
          ip_address: "103.24.56.10",
          created_at: now,
        },
        ...prev.auditLogs,
      ],
    }));
    return { ok: true, user: found };
  };

  const loginAsRole = (role: UserRole): User | null => {
    const found = state.users.find((u) => u.role === role && u.is_active);
    if (!found) return null;
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      currentUserId: found.id,
      auditLogs: [
        {
          id: makeId("audit"),
          user_id: found.id,
          action: "USER_LOGIN_DEMO",
          entity_type: "users",
          entity_id: found.id,
          metadata: { email: found.email, role: found.role },
          ip_address: "103.24.56.10",
          created_at: now,
        },
        ...prev.auditLogs,
      ],
    }));
    return found;
  };

  const logout = () => {
    setState((prev) => ({ ...prev, currentUserId: null }));
  };

  const completePasswordChange = () => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === currentUser.id
          ? { ...u, must_change_password: false, updated_at: now }
          : u
      ),
    }));
  };

  const updateProfile = (data: {
    name: string;
    phone: string;
    nim_nip: string;
  }) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === currentUser.id ? { ...u, ...data, updated_at: now } : u
      ),
    }));
  };

  const createOrUpdateSubmission = (input: CreateSubmissionInput) => {
    if (!currentUser || currentUser.role !== "mahasiswa" || !currentUser.organization_id) {
      return { ok: false, error: "Hanya pengurus himpunan yang dapat membuat pengajuan." };
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
    const submissionId = existing ? existing.id : makeId("sub");

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

    const newDocs: SubmissionDocument[] = input.files.map((f) => ({
      id: makeId("doc"),
      submission_id: submissionId,
      document_key: f.document_key,
      category: f.category,
      file_name: f.file_name,
      file_path: `${currentUser.organization_id}/${submissionId}/v1-${f.file_name}`,
      file_size_bytes: f.file_size_bytes,
      mime_type: f.mime_type,
      version: 1,
      is_current: true,
      uploaded_by: currentUser.id,
      created_at: now,
    }));

    const newHistory: SubmissionHistory[] = input.submitNow
      ? [
          {
            id: makeId("hist"),
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
    const org = state.organizations.find((o) => o.id === currentUser.organization_id);
    const newNotifications: NotificationItem[] = input.submitNow
      ? ultUsers.map((ult) => ({
          id: makeId("notif"),
          user_id: ult.id,
          submission_id: submissionId,
          title: `Pengajuan Baru: ${submissionNumber}`,
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
      documents: [...prev.documents, ...newDocs],
      histories: [...prev.histories, ...newHistory],
      notifications: [...newNotifications, ...prev.notifications],
    }));

    return { ok: true, submissionId };
  };

  const deleteDraftSubmission = (submissionId: string): TransitionResult => {
    const target = state.submissions.find((s) => s.id === submissionId);
    if (!target) return { ok: false, error: "Pengajuan tidak ditemukan." };
    if (target.status !== "draft") {
      return { ok: false, error: "Hanya pengajuan berstatus Draft yang dapat dihapus." };
    }
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.filter((s) => s.id !== submissionId),
      documents: prev.documents.filter((d) => d.submission_id !== submissionId),
      histories: prev.histories.filter((h) => h.submission_id !== submissionId),
    }));
    return { ok: true };
  };

  const claimSubmission = (
    submissionId: string,
    ultUserId?: string
  ): TransitionResult => {
    if (!currentUser || currentUser.role !== "ult") {
      return { ok: false, error: "Hanya petugas ULT yang dapat mengambil tugas." };
    }
    const assigneeId = ultUserId ?? currentUser.id;
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === submissionId ? { ...s, assigned_to: assigneeId, updated_at: now } : s
      ),
    }));
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

    if (from === "revision_required" && toStatus === "submitted" && revisionFiles?.length) {
      for (const rf of revisionFiles) {
        const existingSameKey = updatedDocs.filter(
          (d) =>
            d.submission_id === submissionId && d.document_key === rf.document_key
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
        updatedDocs.push({
          id: makeId("doc"),
          submission_id: submissionId,
          document_key: rf.document_key,
          category: rf.category,
          file_name: rf.file_name,
          file_path: `${sub.organization_id}/${submissionId}/v${maxVersion + 1}-${rf.file_name}`,
          file_size_bytes: rf.file_size_bytes,
          mime_type: rf.mime_type,
          version: maxVersion + 1,
          is_current: true,
          uploaded_by: currentUser.id,
          created_at: now,
        });
      }
    }

    if (toStatus === "completed" && resultFile) {
      updatedDocs.push({
        id: makeId("doc"),
        submission_id: submissionId,
        document_key: "result_letter",
        category: "result_letter",
        file_name: resultFile.file_name,
        file_path: `${sub.organization_id}/${submissionId}/result-${resultFile.file_name}`,
        file_size_bytes: resultFile.file_size_bytes,
        mime_type: resultFile.mime_type,
        version: 1,
        is_current: true,
        uploaded_by: currentUser.id,
        created_at: now,
      });
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
      id: makeId("hist"),
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
            sub.assigned_to ? u.id === sub.assigned_to : u.role === "ult" && u.is_active
          );

    const newNotifications: NotificationItem[] = targetNotifUsers.map((u) => ({
      id: makeId("notif"),
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
      id: makeId("audit"),
      user_id: currentUser.id,
      action: "SUBMISSION_STATUS_CHANGED",
      entity_type: "submissions",
      entity_id: submissionId,
      metadata: {
        submission_number: sub.submission_number,
        from,
        to: toStatus,
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

    return { ok: true };
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
    }));
  };

  const markAllNotificationsRead = () => {
    if (!currentUser) return;
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.user_id === currentUser.id ? { ...n, is_read: true } : n
      ),
    }));
  };

  const upsertUser: AppContextValue["upsertUser"] = (userInput) => {
    const now = new Date().toISOString();
    const isEdit = Boolean(userInput.id);
    const id = userInput.id ?? makeId("user");
    const nextUser: User = {
      ...userInput,
      id,
      created_at: now,
      updated_at: now,
    };
    setState((prev) => ({
      ...prev,
      users: isEdit
        ? prev.users.map((u) =>
            u.id === id ? { ...u, ...userInput, updated_at: now } : u
          )
        : [nextUser, ...prev.users],
      auditLogs: [
        {
          id: makeId("audit"),
          user_id: currentUser?.id ?? null,
          action: isEdit ? "USER_UPDATED" : "USER_CREATED",
          entity_type: "users",
          entity_id: id,
          metadata: { email: userInput.email, role: userInput.role },
          ip_address: "103.24.56.12",
          created_at: now,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const toggleUserActive = (userId: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, is_active: !u.is_active, updated_at: now } : u
      ),
      auditLogs: [
        {
          id: makeId("audit"),
          user_id: currentUser?.id ?? null,
          action: "USER_STATUS_TOGGLED",
          entity_type: "users",
          entity_id: userId,
          metadata: {},
          ip_address: "103.24.56.12",
          created_at: now,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const upsertOrganization: AppContextValue["upsertOrganization"] = (orgInput) => {
    const now = new Date().toISOString();
    const isEdit = Boolean(orgInput.id);
    const id = orgInput.id ?? makeId("org");
    setState((prev) => ({
      ...prev,
      organizations: isEdit
        ? prev.organizations.map((o) =>
            o.id === id ? { ...o, ...orgInput, updated_at: now } : o
          )
        : [{ ...orgInput, id, created_at: now, updated_at: now }, ...prev.organizations],
      auditLogs: [
        {
          id: makeId("audit"),
          user_id: currentUser?.id ?? null,
          action: isEdit ? "ORG_UPDATED" : "ORG_CREATED",
          entity_type: "organizations",
          entity_id: id,
          metadata: { code: orgInput.code },
          ip_address: "103.24.56.12",
          created_at: now,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const toggleOrganizationActive = (orgId: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      organizations: prev.organizations.map((o) =>
        o.id === orgId ? { ...o, is_active: !o.is_active, updated_at: now } : o
      ),
    }));
  };

  const upsertLetterType: AppContextValue["upsertLetterType"] = (ltInput) => {
    const now = new Date().toISOString();
    const isEdit = Boolean(ltInput.id);
    const id = ltInput.id ?? makeId("lt");
    setState((prev) => ({
      ...prev,
      letterTypes: isEdit
        ? prev.letterTypes.map((l) =>
            l.id === id ? { ...l, ...ltInput, updated_at: now } : l
          )
        : [{ ...ltInput, id, created_at: now, updated_at: now }, ...prev.letterTypes],
      auditLogs: [
        {
          id: makeId("audit"),
          user_id: currentUser?.id ?? null,
          action: isEdit ? "LETTER_TYPE_UPDATED" : "LETTER_TYPE_CREATED",
          entity_type: "letter_types",
          entity_id: id,
          metadata: { code: ltInput.code },
          ip_address: "103.24.56.12",
          created_at: now,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const toggleLetterTypeActive = (ltId: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      letterTypes: prev.letterTypes.map((l) =>
        l.id === ltId ? { ...l, is_active: !l.is_active, updated_at: now } : l
      ),
    }));
  };

  const updateSettings = (next: SystemSettings) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      settings: next,
      auditLogs: [
        {
          id: makeId("audit"),
          user_id: currentUser?.id ?? null,
          action: "SYSTEM_SETTINGS_UPDATED",
          entity_type: "system_settings",
          entity_id: null,
          metadata: next as unknown as Record<string, unknown>,
          ip_address: "103.24.56.12",
          created_at: now,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const cleanupOldDrafts = (): number => {
    const drafts = state.submissions.filter((s) => s.status === "draft");
    if (drafts.length === 0) return 0;
    const draftIds = new Set(drafts.map((d) => d.id));
    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.filter((s) => !draftIds.has(s.id)),
      documents: prev.documents.filter((d) => !draftIds.has(d.submission_id)),
    }));
    return drafts.length;
  };

  const resetDemoData = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(DEFAULT_STATE);
  };

  return (
    <AppContext.Provider
      value={{
        isHydrated,
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
