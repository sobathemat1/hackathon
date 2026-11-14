"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/mock-store";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILES_PER_SUBMISSION,
  MAX_FILE_SIZE_BYTES,
  formatBytes,
} from "@/lib/constants";
import { DocumentCategory } from "@/lib/types";

interface StagedFile {
  localId: string;
  document_key: string;
  category: DocumentCategory;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  progress: number;
}

function NewSubmissionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const draftParam = searchParams.get("draft");

  const {
    letterTypes,
    submissions,
    documents,
    createOrUpdateSubmission,
  } = useAppStore();

  const activeLetterTypes = useMemo(
    () => letterTypes.filter((lt) => lt.is_active),
    [letterTypes]
  );

  const existingDraft = useMemo(
    () =>
      draftParam
        ? submissions.find((s) => s.id === draftParam && s.status === "draft")
        : undefined,
    [draftParam, submissions]
  );

  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    existingDraft?.letter_type_id ??
      typeParam ??
      activeLetterTypes[0]?.id ??
      ""
  );
  const [title, setTitle] = useState(existingDraft?.title ?? "");
  const [recipientTarget, setRecipientTarget] = useState(
    existingDraft?.recipient_target ?? ""
  );
  const [eventDate, setEventDate] = useState(existingDraft?.event_date ?? "");
  const [purpose, setPurpose] = useState(existingDraft?.purpose ?? "");
  const [customData, setCustomData] = useState<Record<string, string>>(
    existingDraft?.custom_data ?? {}
  );
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [selectedDocKey, setSelectedDocKey] = useState<string>("draft_utama");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingDraft) {
      setSelectedTypeId(existingDraft.letter_type_id);
      setTitle(existingDraft.title);
      setRecipientTarget(existingDraft.recipient_target);
      setEventDate(existingDraft.event_date ?? "");
      setPurpose(existingDraft.purpose);
      setCustomData(existingDraft.custom_data);
      const existingDocs = documents
        .filter((d) => d.submission_id === existingDraft.id && d.is_current)
        .map((d) => ({
          localId: d.id,
          document_key: d.document_key,
          category: d.category,
          file_name: d.file_name,
          file_size_bytes: d.file_size_bytes,
          mime_type: d.mime_type,
          progress: 100,
        }));
      setStagedFiles(existingDocs);
    }
  }, [existingDraft, documents]);

  const currentLetterType = useMemo(
    () =>
      activeLetterTypes.find((lt) => lt.id === selectedTypeId) ??
      activeLetterTypes[0],
    [activeLetterTypes, selectedTypeId]
  );

  useEffect(() => {
    if (currentLetterType?.required_documents.length) {
      setSelectedDocKey(currentLetterType.required_documents[0].key);
    }
  }, [currentLetterType]);

  const handleFilesAdded = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const incoming = Array.from(fileList);
    if (stagedFiles.length + incoming.length > MAX_FILES_PER_SUBMISSION) {
      setUploadError(
        `Maksimal ${MAX_FILES_PER_SUBMISSION} file per pengajuan.`
      );
      return;
    }

    const docSpec = currentLetterType?.required_documents.find(
      (d) => d.key === selectedDocKey
    );

    const validFiles: StagedFile[] = [];
    for (const file of incoming) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      if (
        !ALLOWED_MIME_TYPES.includes(file.type) &&
        !ALLOWED_EXTENSIONS.includes(ext)
      ) {
        setUploadError(
          `Format "${file.name}" tidak didukung. Gunakan PDF, DOCX, JPG, atau PNG.`
        );
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES || file.size === 0) {
        setUploadError(
          `Ukuran "${file.name}" melebihi batas maksimal 5 MB per file.`
        );
        return;
      }

      const localId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      validFiles.push({
        localId,
        document_key: selectedDocKey,
        category: docSpec?.category ?? "supporting_doc",
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type || "application/pdf",
        progress: 25,
      });
    }

    setStagedFiles((prev) => [...prev, ...validFiles]);

    // Simulate Direct Signed Upload progress bar
    validFiles.forEach((vf) => {
      setTimeout(() => {
        setStagedFiles((prev) =>
          prev.map((item) =>
            item.localId === vf.localId ? { ...item, progress: 70 } : item
          )
        );
      }, 180);
      setTimeout(() => {
        setStagedFiles((prev) =>
          prev.map((item) =>
            item.localId === vf.localId ? { ...item, progress: 100 } : item
          )
        );
      }, 380);
    });
  };

  const handleSubmitForm = (submitNow: boolean) => {
    const errors: Record<string, string> = {};
    if (!currentLetterType) {
      errors.letterType = "Pilih jenis surat terlebih dahulu.";
    }
    if (!title.trim() || title.trim().length < 5) {
      errors.title = "Perihal pengajuan wajib diisi minimal 5 karakter.";
    }

    if (submitNow) {
      if (!purpose.trim() || purpose.trim().length < 10) {
        errors.purpose = "Tujuan / keterangan ringkas wajib diisi minimal 10 karakter.";
      }
      if (!recipientTarget.trim()) {
        errors.recipientTarget = "Tujuan pejabat/instansi surat wajib diisi.";
      }
      currentLetterType?.custom_fields_schema.forEach((cf) => {
        if (cf.required && !(customData[cf.key] ?? "").trim()) {
          errors[`custom_${cf.key}`] = `${cf.label} wajib diisi.`;
        }
      });

      const missingRequiredDocs =
        currentLetterType?.required_documents.filter(
          (req) =>
            req.required &&
            !stagedFiles.some((sf) => sf.document_key === req.key)
        ) ?? [];

      if (missingRequiredDocs.length > 0) {
        errors.documents = `Dokumen wajib belum lengkap: ${missingRequiredDocs
          .map((d) => d.label)
          .join(", ")}.`;
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const res = createOrUpdateSubmission({
      id: existingDraft?.id,
      letter_type_id: currentLetterType.id,
      title,
      purpose: purpose || "Draft pengajuan surat.",
      recipient_target: recipientTarget || "—",
      event_date: eventDate || null,
      custom_data: customData,
      submitNow,
      files: existingDraft
        ? stagedFiles.filter(
            (sf) => !documents.some((d) => d.id === sf.localId)
          )
        : stagedFiles,
    });

    if (res.ok && res.submissionId) {
      if (submitNow) {
        router.push(`/submissions/${res.submissionId}`);
      } else {
        router.push("/mahasiswa/submissions");
      }
    }
  };

  const handleDownloadTemplate = () => {
    if (!currentLetterType) return;
    const content = `TEMPLATE SURAT RESMI KAMPUS\nJenis: ${currentLetterType.name} (${currentLetterType.code})\n\nNomor: ...\nPerihal: ...\nKepada Yth. ...\n\nIsi surat sesuai ketentuan tata naskah dinas universitas.`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Template_${currentLetterType.code}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      allowedRoles={["mahasiswa"]}
      breadcrumbs={[
        { label: "Pengajuan Surat", href: "/mahasiswa/submissions" },
        { label: existingDraft ? "Edit Draft" : "Ajukan Surat Baru" },
      ]}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
          {existingDraft ? "Lanjutkan Draft Pengajuan" : "Ajukan Surat Baru"}
        </h1>
        <p className="text-sm text-[#475577] mt-1 max-w-[65ch]">
          Lengkapi formulir dan unggah dokumen persyaratan sesuai jenis surat
          yang dipilih. Anda dapat menyimpan sebagai draft kapan saja.
        </p>
      </div>

      {/* Split Workspace (§10.5.4) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-8 items-start">
        {/* Left Column: Form & Upload */}
        <div className="space-y-6">
          {/* 1. Letter Type Selection */}
          <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] p-5 sm:p-6">
            <h2 className="text-base font-semibold tracking-tight text-[#091540]">
              1. Pilih Jenis Surat
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeLetterTypes.map((lt) => {
                const selected = lt.id === currentLetterType?.id;
                return (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => setSelectedTypeId(lt.id)}
                    className={`p-3.5 rounded-lg border text-left transition-colors ${
                      selected
                        ? "border-[#1B2CC1] bg-[#ABD2FA]/25"
                        : "border-[#DCE6F7] bg-[#FFFFFF] hover:bg-[#F6F9FE]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-xs font-semibold text-[#1B2CC1]">
                        {lt.code}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-[#475577]">
                        ~{lt.estimated_days} hari
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#091540]">
                      {lt.name}
                    </p>
                  </button>
                );
              })}
            </div>
            {fieldErrors.letterType && (
              <p className="mt-2 text-xs text-[#991B1B]">
                {fieldErrors.letterType}
              </p>
            )}
          </section>

          {/* 2. Standard & Custom Fields */}
          <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold tracking-tight text-[#091540]">
              2. Rincian Pengajuan
            </h2>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="title"
                className="text-sm font-medium text-[#091540]"
              >
                Perihal / Judul Pengajuan
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Peminjaman Auditorium Gedung Teknik untuk Seminar Nasional"
                className="px-3 py-2 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
              />
              {fieldErrors.title && (
                <p className="text-xs text-[#991B1B]">{fieldErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="recipient_target"
                  className="text-sm font-medium text-[#091540]"
                >
                  Ditujukan Kepada
                </label>
                <input
                  id="recipient_target"
                  type="text"
                  value={recipientTarget}
                  onChange={(e) => setRecipientTarget(e.target.value)}
                  placeholder="Contoh: Wakil Dekan II Bidang Umum"
                  className="px-3 py-2 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
                />
                {fieldErrors.recipientTarget && (
                  <p className="text-xs text-[#991B1B]">
                    {fieldErrors.recipientTarget}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="event_date"
                  className="text-sm font-medium text-[#091540]"
                >
                  Tanggal Kegiatan / Kebutuhan
                </label>
                <input
                  id="event_date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="px-3 py-2 text-sm font-mono-tabular text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="purpose"
                className="text-sm font-medium text-[#091540]"
              >
                Tujuan &amp; Ringkasan Keperluan
              </label>
              <textarea
                id="purpose"
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Jelaskan maksud pengajuan surat secara singkat dan jelas..."
                className="px-3 py-2 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
              />
              {fieldErrors.purpose && (
                <p className="text-xs text-[#991B1B]">{fieldErrors.purpose}</p>
              )}
            </div>

            {/* Dynamic Custom Fields */}
            {currentLetterType &&
              currentLetterType.custom_fields_schema.length > 0 && (
                <div className="pt-4 border-t border-[#DCE6F7] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentLetterType.custom_fields_schema.map((cf) => (
                    <div key={cf.key} className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`cf_${cf.key}`}
                        className="text-sm font-medium text-[#091540]"
                      >
                        {cf.label}
                        {cf.required && (
                          <span className="text-[#991B1B] ml-0.5">*</span>
                        )}
                      </label>
                      <input
                        id={`cf_${cf.key}`}
                        type={cf.type === "textarea" ? "text" : cf.type}
                        value={customData[cf.key] ?? ""}
                        onChange={(e) =>
                          setCustomData((prev) => ({
                            ...prev,
                            [cf.key]: e.target.value,
                          }))
                        }
                        placeholder={cf.placeholder}
                        className="px-3 py-2 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
                      />
                      {fieldErrors[`custom_${cf.key}`] && (
                        <p className="text-xs text-[#991B1B]">
                          {fieldErrors[`custom_${cf.key}`]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </section>

          {/* 3. Document Upload Zone */}
          <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-[#091540]">
                3. Unggah Dokumen Persyaratan
              </h2>
              <span className="text-xs font-mono-tabular text-[#475577]">
                Maks. 5 MB/file • Maks. 5 file
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="doc_slot"
                className="text-sm font-medium text-[#091540]"
              >
                Pilih Kategori Dokumen yang Akan Diunggah
              </label>
              <select
                id="doc_slot"
                value={selectedDocKey}
                onChange={(e) => setSelectedDocKey(e.target.value)}
                className="px-3 py-2 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
              >
                {currentLetterType?.required_documents.map((doc) => (
                  <option key={doc.key} value={doc.key}>
                    {doc.label} ({doc.accepted_types.join(", ")})
                  </option>
                ))}
                <option value="lampiran_tambahan">
                  Lampiran Pendukung Tambahan
                </option>
              </select>
            </div>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesAdded(e.dataTransfer.files);
              }}
              className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                isDragging
                  ? "border-[#7692FF] bg-[#ABD2FA]/20"
                  : "border-[#DCE6F7] bg-[#F6F9FE] hover:border-[#7692FF]"
              }`}
            >
              <UploadCloud
                className="w-6 h-6 text-[#1B2CC1] mb-2"
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium text-[#091540]">
                Tarik &amp; lepas file di sini, atau klik untuk memilih
              </p>
              <p className="text-xs text-[#475577] mt-1 font-mono-tabular">
                PDF, DOCX, JPG, PNG (Direct Signed Upload)
              </p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  handleFilesAdded(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>

            {uploadError && (
              <p role="alert" className="text-xs text-[#991B1B] font-medium">
                {uploadError}
              </p>
            )}
            {fieldErrors.documents && (
              <p role="alert" className="text-xs text-[#991B1B] font-medium">
                {fieldErrors.documents}
              </p>
            )}

            {/* Staged Files List */}
            {stagedFiles.length > 0 && (
              <div className="border border-[#DCE6F7] rounded-lg divide-y divide-[#DCE6F7]">
                {stagedFiles.map((file) => {
                  const docLabel =
                    currentLetterType?.required_documents.find(
                      (d) => d.key === file.document_key
                    )?.label ?? "Lampiran Tambahan";
                  return (
                    <div key={file.localId} className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText
                            className="w-4 h-4 text-[#1B2CC1] shrink-0"
                            strokeWidth={1.5}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#091540] truncate">
                              {file.file_name}
                            </p>
                            <p className="text-xs text-[#475577]">
                              {docLabel} •{" "}
                              <span className="font-mono-tabular">
                                {formatBytes(file.file_size_bytes)}
                              </span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setStagedFiles((prev) =>
                              prev.filter((f) => f.localId !== file.localId)
                            )
                          }
                          aria-label={`Hapus ${file.file_name}`}
                          className="p-1.5 rounded-lg text-[#991B1B] hover:bg-[#FEE2E2]/60"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                      {file.progress < 100 && (
                        <div className="w-full h-1.5 bg-[#DCE6F7] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1B2CC1] transition-all duration-200"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Bottom Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSubmitForm(false)}
              className="px-5 py-2.5 rounded-lg border border-[#DCE6F7] bg-[#FFFFFF] hover:bg-[#F6F9FE] text-[#091540] text-sm font-medium transition-transform duration-150 active:scale-[0.98]"
            >
              Simpan sebagai Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmitForm(true)}
              className="px-5 py-2.5 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98]"
            >
              Kirim Pengajuan
            </button>
          </div>
        </div>

        {/* Right Column: Sticky Checklist Panel (#F6F9FE) */}
        <aside className="lg:sticky lg:top-20 border border-[#DCE6F7] rounded-xl bg-[#F6F9FE] p-5 space-y-5">
          <div>
            <p className="text-xs font-mono-tabular font-semibold text-[#1B2CC1]">
              {currentLetterType?.code}
            </p>
            <h3 className="text-base font-semibold text-[#091540] mt-1">
              Checklist Persyaratan
            </h3>
            <p className="text-xs text-[#475577] mt-1 leading-relaxed">
              Pastikan seluruh dokumen wajib di bawah ini telah diunggah sebelum
              mengirim pengajuan.
            </p>
          </div>

          <ul className="space-y-3 border-t border-[#DCE6F7] pt-4">
            {currentLetterType?.required_documents.map((req) => {
              const fulfilled = stagedFiles.some(
                (sf) => sf.document_key === req.key
              );
              return (
                <li key={req.key} className="flex items-start gap-2.5">
                  {fulfilled ? (
                    <CheckCircle2
                      className="w-4 h-4 text-[#166534] shrink-0 mt-0.5"
                      strokeWidth={1.75}
                    />
                  ) : (
                    <AlertCircle
                      className="w-4 h-4 text-[#7692FF] shrink-0 mt-0.5"
                      strokeWidth={1.5}
                    />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium ${
                        fulfilled ? "text-[#166534]" : "text-[#091540]"
                      }`}
                    >
                      {req.label}
                    </p>
                    <p className="text-[11px] font-mono-tabular text-[#475577]">
                      {fulfilled
                        ? "Sudah diunggah"
                        : `Wajib • ${req.accepted_types.join(", ")}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {currentLetterType?.template_file_path && (
            <div className="pt-4 border-t border-[#DCE6F7]">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-[#DCE6F7] bg-[#FFFFFF] hover:bg-[#ABD2FA]/20 text-xs font-medium text-[#091540] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#1B2CC1]" strokeWidth={1.5} />
                <span>Unduh Template Surat</span>
              </button>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

export default function NewSubmissionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#FFFFFF] p-8 text-sm text-[#475577]">
          Memuat formulir pengajuan...
        </div>
      }
    >
      <NewSubmissionContent />
    </Suspense>
  );
}
