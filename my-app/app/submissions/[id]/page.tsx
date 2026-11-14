"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileCheck2,
  FileText,
  UploadCloud,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { useAppStore } from "@/lib/mock-store";
import {
  MAX_FILE_SIZE_BYTES,
  ROLE_LABELS,
  STATUS_CONFIG,
  formatBytes,
  formatDateID,
  formatDateTimeID,
} from "@/lib/constants";
import { DocumentCategory, SubmissionDocument } from "@/lib/types";

function SubmissionDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    currentUser,
    users,
    organizations,
    letterTypes,
    submissions,
    documents,
    histories,
    claimSubmission,
    transitionSubmission,
    downloadDocument,
    getDocumentPreviewUrl,
  } = useAppStore();

  const submission = useMemo(
    () => submissions.find((s) => s.id === params.id),
    [submissions, params.id]
  );

  const [previewDoc, setPreviewDoc] = useState<SubmissionDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<string>("supabase-storage");
  const [expandedOldVersions, setExpandedOldVersions] = useState<
    Record<string, boolean>
  >({});

  // ULT Action States
  const [reviewDecision, setReviewDecision] = useState<
    "approved" | "revision_required" | "rejected"
  >("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [officialNumber, setOfficialNumber] = useState("");
  const [resultFile, setResultFile] = useState<{
    file_name: string;
    file_size_bytes: number;
    mime_type: string;
    file?: File;
  } | null>(null);

  // Mahasiswa Revision States
  const [revisionDocKey, setRevisionDocKey] = useState("draft_utama");
  const [revisionFiles, setRevisionFiles] = useState<
    {
      document_key: string;
      category: DocumentCategory;
      file_name: string;
      file_size_bytes: number;
      mime_type: string;
      file?: File;
    }[]
  >([]);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let revokeUrl: string | null = null;
    if (!previewDoc) {
      queueMicrotask(() => {
        if (active) setPreviewUrl(null);
      });
      return;
    }
    void getDocumentPreviewUrl(previewDoc, submission?.submission_number).then(
      (res) => {
        if (!active) {
          if (res.revokeOnCleanup) URL.revokeObjectURL(res.url);
          return;
        }
        if (res.revokeOnCleanup) revokeUrl = res.url;
        setPreviewUrl(res.url);
        setPreviewSource(res.source);
      }
    );
    return () => {
      active = false;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [previewDoc, getDocumentPreviewUrl, submission?.submission_number]);

  const subDocs = useMemo(
    () =>
      submission
        ? documents.filter((d) => d.submission_id === submission.id)
        : [],
    [documents, submission]
  );

  const docGroups = useMemo(() => {
    const groups: Record<string, SubmissionDocument[]> = {};
    subDocs
      .filter((d) => d.category !== "result_letter")
      .forEach((d) => {
        if (!groups[d.document_key]) groups[d.document_key] = [];
        groups[d.document_key].push(d);
      });
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => b.version - a.version)
    );
    return groups;
  }, [subDocs]);

  const subHistories = useMemo(
    () =>
      submission
        ? histories
            .filter((h) => h.submission_id === submission.id)
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
        : [],
    [histories, submission]
  );

  const latestRevisionNote = useMemo(() => {
    if (!submission || submission.status !== "revision_required") return null;
    return subHistories.find((h) => h.to_status === "revision_required")?.notes;
  }, [submission, subHistories]);

  if (!submission) {
    return (
      <AppShell breadcrumbs={[{ label: "Detail Pengajuan" }]}>
        <div className="border border-[#DCE6F7] rounded-xl p-8 bg-[#FFFFFF] text-center">
          <h1 className="text-lg font-semibold text-[#091540]">
            Pengajuan Tidak Ditemukan
          </h1>
          <p className="text-sm text-[#475577] mt-1">
            Data pengajuan mungkin telah dihapus atau URL tidak valid.
          </p>
        </div>
      </AppShell>
    );
  }

  // Organization isolation guard for mahasiswa
  if (
    currentUser?.role === "mahasiswa" &&
    submission.organization_id !== currentUser.organization_id
  ) {
    return (
      <AppShell breadcrumbs={[{ label: "Akses Ditolak" }]}>
        <div className="border border-[#FCA5A5] rounded-xl p-8 bg-[#FEE2E2]/30">
          <h1 className="text-lg font-semibold text-[#991B1B]">
            Akses Ditolak (Isolasi Organisasi)
          </h1>
          <p className="text-sm text-[#991B1B] mt-1">
            Anda tidak memiliki izin untuk melihat atau mengunduh dokumen milik
            organisasi lain.
          </p>
        </div>
      </AppShell>
    );
  }

  const org = organizations.find((o) => o.id === submission.organization_id);
  const letterType = letterTypes.find(
    (l) => l.id === submission.letter_type_id
  );
  const submitter = users.find((u) => u.id === submission.user_id);
  const picUser = users.find((u) => u.id === submission.assigned_to);

  const resultLetterDoc = subDocs.find(
    (d) => d.category === "result_letter" && d.is_current
  );

  const handleSimulatedDownload = (doc: SubmissionDocument) => {
    void downloadDocument(doc, submission.submission_number);
  };

  const handleUltReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const res = transitionSubmission({
      submissionId: submission.id,
      toStatus: reviewDecision,
      notes: reviewNotes,
    });
    if (!res.ok) {
      setActionError(res.error ?? "Gagal memperbarui status.");
      return;
    }
    setReviewNotes("");
  };

  const handleUltCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!officialNumber.trim()) {
      setActionError("Nomor surat resmi wajib diisi.");
      return;
    }
    if (!resultFile) {
      setActionError("Wajib mengunggah file surat hasil akhir (PDF).");
      return;
    }
    const res = transitionSubmission({
      submissionId: submission.id,
      toStatus: "completed",
      officialLetterNumber: officialNumber,
      notes: `Surat resmi diterbitkan dengan nomor ${officialNumber.trim()}.`,
      resultFile,
    });
    if (!res.ok) {
      setActionError(res.error ?? "Gagal menyelesaikan pengajuan.");
      return;
    }
    setResultFile(null);
    setOfficialNumber("");
  };

  const handleMahasiswaRevisionSubmit = () => {
    setActionError(null);
    if (revisionFiles.length === 0) {
      setActionError("Unggah minimal 1 dokumen revisi versi terbaru.");
      return;
    }
    const res = transitionSubmission({
      submissionId: submission.id,
      toStatus: "submitted",
      notes: "Pemohon mengirimkan dokumen revisi versi terbaru.",
      revisionFiles,
    });
    if (!res.ok) {
      setActionError(res.error ?? "Gagal mengirim revisi.");
      return;
    }
    setRevisionFiles([]);
  };

  const backHref =
    currentUser?.role === "mahasiswa"
      ? "/mahasiswa/submissions"
      : currentUser?.role === "ult"
      ? "/ult/queue"
      : "/admin";

  return (
    <AppShell
      breadcrumbs={[
        { label: "Pengajuan", href: backHref },
        { label: submission.submission_number ?? "Detail Draft" },
      ]}
    >
      {/* Split Workspace (§10.5.5) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
        {/* Left Column: Submission Data & Versioned Documents */}
        <div className="space-y-6">
          {/* Header Block */}
          <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-lg sm:text-xl font-mono-tabular font-semibold text-[#091540]">
                  {submission.submission_number ?? "DRAFT-BELUM-DIAJUKAN"}
                </span>
                <StatusBadge status={submission.status} />
              </div>
              <span className="text-xs font-mono-tabular text-[#475577]">
                {submission.submitted_at
                  ? `Diajukan ${formatDateTimeID(submission.submitted_at)}`
                  : `Dibuat ${formatDateTimeID(submission.created_at)}`}
              </span>
            </div>

            <h1 className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-[#091540] leading-snug">
              {submission.title}
            </h1>

            <div className="mt-4 pt-4 border-t border-[#DCE6F7] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[#475577]">Organisasi</p>
                <p className="mt-0.5 font-semibold text-[#091540]">
                  {org?.code ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[#475577]">Pemohon</p>
                <p className="mt-0.5 font-semibold text-[#091540]">
                  {submitter?.name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[#475577]">Jenis Surat</p>
                <p className="mt-0.5 font-semibold text-[#091540]">
                  {letterType?.code ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[#475577]">PIC Petugas ULT</p>
                <p className="mt-0.5 font-semibold text-[#091540]">
                  {picUser?.name ?? "Belum ditugaskan"}
                </p>
              </div>
            </div>
          </section>

          {/* Highlight Official Result Letter Banner (if completed) */}
          {submission.status === "completed" && resultLetterDoc && (
            <section className="border-2 border-[#1B2CC1] rounded-xl bg-[#ABD2FA]/35 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1B2CC1]">
                  <FileCheck2 className="w-4 h-4" strokeWidth={1.75} />
                  <span>SURAT RESMI TELAH TERBIT</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-[#091540]">
                  Nomor Surat Resmi:{" "}
                  <span className="font-mono-tabular">
                    {submission.official_letter_number ?? "—"}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-[#475577]">
                  {resultLetterDoc.file_name} (
                  <span className="font-mono-tabular">
                    {formatBytes(resultLetterDoc.file_size_bytes)}
                  </span>
                  )
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSimulatedDownload(resultLetterDoc)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98] shrink-0"
              >
                <Download className="w-4 h-4" strokeWidth={1.5} />
                <span>Unduh Surat Resmi (PDF)</span>
              </button>
            </section>
          )}

          {/* Key-Value Form Details */}
          <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#F6F9FE] border-b border-[#DCE6F7]">
              <h2 className="text-base font-semibold tracking-tight text-[#091540]">
                Rincian Data Pengajuan
              </h2>
            </div>
            <div className="divide-y divide-[#DCE6F7] text-sm">
              <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1">
                <span className="text-[#475577]">Ditujukan Kepada</span>
                <span className="font-medium text-[#091540]">
                  {submission.recipient_target}
                </span>
              </div>
              <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1">
                <span className="text-[#475577]">Tanggal Kebutuhan</span>
                <span className="font-medium font-mono-tabular text-[#091540]">
                  {formatDateID(submission.event_date)}
                </span>
              </div>
              <div className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1">
                <span className="text-[#475577]">Tujuan &amp; Ringkasan</span>
                <span className="text-[#091540] leading-relaxed">
                  {submission.purpose}
                </span>
              </div>
              {letterType?.custom_fields_schema.map((cf) => (
                <div
                  key={cf.key}
                  className="px-5 py-3.5 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1"
                >
                  <span className="text-[#475577]">{cf.label}</span>
                  <span className="font-medium text-[#091540]">
                    {submission.custom_data[cf.key] || "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Versioned Documents List */}
          <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#F6F9FE] border-b border-[#DCE6F7]">
              <h2 className="text-base font-semibold tracking-tight text-[#091540]">
                Dokumen Lampiran &amp; Riwayat Versi
              </h2>
            </div>
            <div className="divide-y divide-[#DCE6F7]">
              {Object.entries(docGroups).map(([docKey, versions]) => {
                const currentDoc = versions[0];
                const olderDocs = versions.slice(1);
                const docLabel =
                  letterType?.required_documents.find((r) => r.key === docKey)
                    ?.label ?? docKey;
                const isExpanded = Boolean(expandedOldVersions[docKey]);

                return (
                  <div key={docKey} className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText
                          className="w-4 h-4 text-[#1B2CC1] shrink-0 mt-0.5"
                          strokeWidth={1.5}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-[#091540]">
                              {docLabel}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#E8F2FE] border border-[#ABD2FA] font-mono-tabular text-[11px] font-semibold text-[#091540]">
                              v{currentDoc.version} — Terkini
                            </span>
                          </div>
                          <p className="text-sm text-[#091540] truncate mt-0.5">
                            {currentDoc.file_name}
                          </p>
                          <p className="text-xs font-mono-tabular text-[#475577]">
                            {formatBytes(currentDoc.file_size_bytes)} •{" "}
                            {formatDateTimeID(currentDoc.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(currentDoc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs font-medium text-[#091540]"
                        >
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>Pratinjau</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSimulatedDownload(currentDoc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs font-medium text-[#1B2CC1]"
                        >
                          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>Unduh</span>
                        </button>
                      </div>
                    </div>

                    {olderDocs.length > 0 && (
                      <div className="pl-7">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedOldVersions((prev) => ({
                              ...prev,
                              [docKey]: !isExpanded,
                            }))
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#475577] hover:text-[#1B2CC1]"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                          <span>
                            Lihat versi sebelumnya ({olderDocs.length})
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="mt-2 border border-[#DCE6F7] rounded-lg bg-[#F6F9FE] divide-y divide-[#DCE6F7]">
                            {olderDocs.map((old) => (
                              <div
                                key={old.id}
                                className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <span className="font-mono-tabular font-semibold text-[#475577] mr-2">
                                    v{old.version}
                                  </span>
                                  <span className="text-[#091540] truncate">
                                    {old.file_name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSimulatedDownload(old)}
                                  className="text-[#1B2CC1] hover:underline shrink-0"
                                >
                                  Unduh
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Contextual Action Panel & Chronological Vertical Timeline */}
        <div className="space-y-6">
          {/* Contextual Action Panel */}
          <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] p-5 space-y-4">
            <h2 className="text-base font-semibold tracking-tight text-[#091540]">
              Tindakan Pengajuan
            </h2>

            {actionError && (
              <p role="alert" className="text-xs text-[#991B1B] font-medium">
                {actionError}
              </p>
            )}

            {/* ULT Contextual Actions */}
            {currentUser?.role === "ult" && (
              <div className="space-y-4">
                {!submission.assigned_to &&
                  !["completed", "rejected", "cancelled"].includes(
                    submission.status
                  ) && (
                    <button
                      type="button"
                      onClick={() => claimSubmission(submission.id)}
                      className="w-full py-2 px-4 rounded-lg border border-[#1B2CC1] text-[#1B2CC1] hover:bg-[#1B2CC1] hover:text-[#FFFFFF] text-sm font-medium transition-colors"
                    >
                      Ambil Tugas Pemeriksaan
                    </button>
                  )}

                {submission.status === "submitted" && (
                  <button
                    type="button"
                    onClick={() =>
                      transitionSubmission({
                        submissionId: submission.id,
                        toStatus: "under_review",
                        notes: "Petugas ULT memulai verifikasi berkas.",
                      })
                    }
                    className="w-full py-2.5 px-4 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98]"
                  >
                    Mulai Verifikasi
                  </button>
                )}

                {submission.status === "under_review" && (
                  <form onSubmit={handleUltReviewSubmit} className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "approved", label: "Setujui" },
                          { id: "revision_required", label: "Minta Revisi" },
                          { id: "rejected", label: "Tolak" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setReviewDecision(opt.id)}
                          className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                            reviewDecision === opt.id
                              ? "border-[#1B2CC1] bg-[#ABD2FA]/40 text-[#091540] font-semibold"
                              : "border-[#DCE6F7] text-[#475577] hover:bg-[#F6F9FE]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="review-notes"
                        className="text-xs font-medium text-[#091540]"
                      >
                        Catatan Verifikasi{" "}
                        {reviewDecision !== "approved"
                          ? "(Wajib min. 10 karakter)"
                          : "(Opsional)"}
                      </label>
                      <textarea
                        id="review-notes"
                        rows={3}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder={
                          reviewDecision === "revision_required"
                            ? "Jelaskan bagian berkas yang perlu diperbaiki pemohon..."
                            : reviewDecision === "rejected"
                            ? "Tuliskan alasan penolakan pengajuan..."
                            : "Catatan tambahan untuk pemohon (opsional)..."
                        }
                        className="px-3 py-2 text-xs border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98]"
                    >
                      Simpan Keputusan Verifikasi
                    </button>
                  </form>
                )}

                {submission.status === "approved" && (
                  <button
                    type="button"
                    onClick={() =>
                      transitionSubmission({
                        submissionId: submission.id,
                        toStatus: "processing",
                        notes:
                          "Surat masuk tahap pencetakan, penomoran resmi, dan penandatanganan.",
                      })
                    }
                    className="w-full py-2.5 px-4 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98]"
                  >
                    Mulai Proses Surat
                  </button>
                )}

                {submission.status === "processing" && (
                  <form
                    onSubmit={handleUltCompleteSubmit}
                    className="space-y-3"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="official-num"
                        className="text-xs font-medium text-[#091540]"
                      >
                        Nomor Surat Resmi
                      </label>
                      <input
                        id="official-num"
                        type="text"
                        value={officialNumber}
                        onChange={(e) => setOfficialNumber(e.target.value)}
                        placeholder="Contoh: B/158/UN10.F07/KM.01/2026"
                        className="px-3 py-2 text-xs font-mono-tabular border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[#091540]">
                        Unggah Surat Hasil Akhir (PDF, maks 5 MB)
                      </label>
                      <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-[#7692FF] rounded-lg bg-[#F6F9FE] cursor-pointer text-xs text-[#091540]">
                        <UploadCloud
                          className="w-4 h-4 text-[#1B2CC1]"
                          strokeWidth={1.5}
                        />
                        <span className="truncate">
                          {resultFile
                            ? resultFile.file_name
                            : "Pilih file PDF surat resmi"}
                        </span>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            if (f.size > MAX_FILE_SIZE_BYTES) {
                              setActionError("Ukuran file melebihi 5 MB.");
                              return;
                            }
                            setResultFile({
                              file_name: f.name,
                              file_size_bytes: f.size,
                              mime_type: f.type || "application/pdf",
                              file: f,
                            });
                          }}
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98]"
                    >
                      Selesaikan &amp; Terbitkan Surat
                    </button>
                  </form>
                )}

                {["revision_required", "completed", "rejected", "cancelled"].includes(
                  submission.status
                ) && (
                  <p className="text-xs text-[#475577]">
                    {STATUS_CONFIG[submission.status].description}
                  </p>
                )}
              </div>
            )}

            {/* Mahasiswa Contextual Actions */}
            {currentUser?.role === "mahasiswa" && (
              <div className="space-y-4">
                {submission.status === "revision_required" && (
                  <div className="space-y-3">
                    {latestRevisionNote && (
                      <div className="p-3.5 rounded-lg border border-[#F59E0B] bg-[#FEF3C7]/60">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#92400E]">
                          <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                          <span>Catatan Revisi dari ULT</span>
                        </div>
                        <p className="mt-1 text-xs text-[#92400E] leading-relaxed">
                          {latestRevisionNote}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[#091540]">
                        Dokumen yang Direvisi
                      </label>
                      <select
                        value={revisionDocKey}
                        onChange={(e) => setRevisionDocKey(e.target.value)}
                        className="px-3 py-2 text-xs border border-[#DCE6F7] rounded-lg bg-[#FFFFFF]"
                      >
                        {letterType?.required_documents.map((d) => (
                          <option key={d.key} value={d.key}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-[#7692FF] rounded-lg bg-[#F6F9FE] cursor-pointer text-xs text-[#091540]">
                      <UploadCloud
                        className="w-4 h-4 text-[#1B2CC1]"
                        strokeWidth={1.5}
                      />
                      <span>
                        {revisionFiles.length > 0
                          ? `${revisionFiles.length} file revisi dipilih`
                          : "Pilih file revisi baru (v+1)"}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > MAX_FILE_SIZE_BYTES) {
                            setActionError("Ukuran file melebihi 5 MB.");
                            return;
                          }
                          const spec = letterType?.required_documents.find(
                            (d) => d.key === revisionDocKey
                          );
                          setRevisionFiles([
                            {
                              document_key: revisionDocKey,
                              category: spec?.category ?? "supporting_doc",
                              file_name: f.name,
                              file_size_bytes: f.size,
                              mime_type: f.type || "application/pdf",
                              file: f,
                            },
                          ]);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleMahasiswaRevisionSubmit}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98]"
                    >
                      Kirim Ulang Revisi
                    </button>
                  </div>
                )}

                {["submitted", "revision_required"].includes(
                  submission.status
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      const res = transitionSubmission({
                        submissionId: submission.id,
                        toStatus: "cancelled",
                        notes: "Pengajuan dibatalkan oleh pemohon.",
                      });
                      if (res.ok) router.refresh();
                    }}
                    className="w-full py-2 px-4 rounded-lg border border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEE2E2]/50 text-xs font-medium"
                  >
                    Batalkan Pengajuan
                  </button>
                )}

                {!["submitted", "revision_required"].includes(
                  submission.status
                ) && (
                  <p className="text-xs text-[#475577]">
                    {STATUS_CONFIG[submission.status].description}
                  </p>
                )}
              </div>
            )}

            {currentUser?.role === "superadmin" && (
              <p className="text-xs text-[#475577]">
                Mode pengawasan (read-only). {STATUS_CONFIG[submission.status].description}
              </p>
            )}
          </section>

          {/* Vertical Chronological Timeline (§10.5.5) */}
          <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] p-5">
            <h2 className="text-base font-semibold tracking-tight text-[#091540] mb-4">
              Timeline Aktivitas
            </h2>

            <div className="relative pl-5 space-y-5 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[#DCE6F7]">
              {subHistories.map((hist, idx) => {
                const actor = users.find((u) => u.id === hist.updated_by);
                const isLatest = idx === 0;
                return (
                  <div key={hist.id} className="relative">
                    <span
                      className={`absolute -left-5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#FFFFFF] ${
                        isLatest ? "bg-[#1B2CC1]" : "bg-[#ABD2FA]"
                      }`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge status={hist.to_status} />
                      <span className="text-[11px] font-mono-tabular text-[#475577]">
                        {formatDateTimeID(hist.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-[#091540]">
                      {actor?.name ?? "Sistem"}{" "}
                      <span className="text-[#475577] font-normal">
                        ({actor ? ROLE_LABELS[actor.role] : "Otomatis"})
                      </span>
                    </p>
                    {hist.notes && (
                      <p className="mt-1 text-xs text-[#475577] leading-relaxed bg-[#F6F9FE] border border-[#DCE6F7] rounded-lg px-3 py-2">
                        {hist.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-[#091540]/45 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#DCE6F7] rounded-xl shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#F6F9FE] border-b border-[#DCE6F7] flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#091540] truncate">
                  {previewDoc.file_name}
                </p>
                <p className="text-xs font-mono-tabular text-[#475577]">
                  Versi v{previewDoc.version} •{" "}
                  {formatBytes(previewDoc.file_size_bytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                aria-label="Tutup pratinjau"
                className="p-1.5 rounded-lg text-[#475577] hover:bg-[#FFFFFF]"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-5 bg-[#F6F9FE] space-y-3">
              {previewUrl &&
              (previewDoc.mime_type === "application/pdf" ||
                previewDoc.file_name.toLowerCase().endsWith(".pdf")) ? (
                <iframe
                  src={previewUrl}
                  title={previewDoc.file_name}
                  className="w-full h-[380px] rounded-lg border border-[#DCE6F7] bg-[#FFFFFF]"
                />
              ) : previewUrl && previewDoc.mime_type.startsWith("image/") ? (
                <div className="max-h-[380px] overflow-auto flex items-center justify-center rounded-lg border border-[#DCE6F7] bg-[#FFFFFF] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={previewDoc.file_name}
                    className="max-h-[350px] object-contain"
                  />
                </div>
              ) : null}
              <div className="bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg p-4 text-left space-y-1.5">
                <p className="text-xs font-mono-tabular text-[#1B2CC1] font-semibold">
                  PRATINJAU DOKUMEN ({previewSource === "supabase-storage" ? "SUPABASE STORAGE SIGNED URL 60s" : "BINARY FILE STORAGE"})
                </p>
                <p className="text-xs text-[#475577] leading-relaxed">
                  Jalur bucket <span className="font-mono-tabular text-[#091540]">submission-files/{previewDoc.file_path}</span>
                </p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[#DCE6F7] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-lg border border-[#DCE6F7] text-xs font-medium text-[#091540]"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handleSimulatedDownload(previewDoc)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1B2CC1] text-[#FFFFFF] text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Unduh File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function SubmissionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#FFFFFF] p-8 text-sm text-[#475577]">
          Memuat detail pengajuan...
        </div>
      }
    >
      <SubmissionDetailContent />
    </Suspense>
  );
}
