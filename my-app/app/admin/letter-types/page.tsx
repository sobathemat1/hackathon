"use client";

import React, { useState } from "react";
import {
  Download,
  FileText,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/mock-store";
import { LetterType, RequiredDocumentSpec } from "@/lib/types";
import { MAX_FILE_SIZE_BYTES, formatBytes } from "@/lib/constants";
import { extractTemplateFileName } from "@/lib/supabase/file-storage";

const DEFAULT_REQUIRED_DOC: RequiredDocumentSpec = {
  key: "draft_utama",
  label: "Draft Surat Utama",
  required: true,
  accepted_types: [".pdf", ".docx"],
  category: "draft_letter",
};

export default function AdminLetterTypesPage() {
  const {
    letterTypes,
    upsertLetterType,
    toggleLetterTypeActive,
    downloadLetterTemplate,
  } = useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LetterType | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedDays, setEstimatedDays] = useState(3);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocumentSpec[]>([
    DEFAULT_REQUIRED_DOC,
  ]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [removeExistingTemplate, setRemoveExistingTemplate] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [newDocLabel, setNewDocLabel] = useState("");

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setName("");
    setDescription("");
    setEstimatedDays(3);
    setRequiredDocs([DEFAULT_REQUIRED_DOC]);
    setTemplateFile(null);
    setRemoveExistingTemplate(false);
    setFileError(null);
    setNewDocLabel("");
    setModalOpen(true);
  };

  const openEdit = (lt: LetterType) => {
    setEditing(lt);
    setCode(lt.code);
    setName(lt.name);
    setDescription(lt.description);
    setEstimatedDays(lt.estimated_days);
    setRequiredDocs(
      lt.required_documents.length > 0
        ? lt.required_documents
        : [DEFAULT_REQUIRED_DOC]
    );
    setTemplateFile(null);
    setRemoveExistingTemplate(false);
    setFileError(null);
    setNewDocLabel("");
    setModalOpen(true);
  };

  const handleTemplateFileChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);
    const file = fileList[0];
    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (![".pdf", ".docx", ".doc"].includes(ext)) {
      setFileError("Format template harus berupa PDF atau DOCX.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES || file.size === 0) {
      setFileError("Ukuran file template maksimal 5 MB.");
      return;
    }
    setTemplateFile(file);
    setRemoveExistingTemplate(false);
  };

  const handleAddRequiredDoc = () => {
    const trimmed = newDocLabel.trim();
    if (!trimmed) return;
    const key = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!key || requiredDocs.some((d) => d.key === key)) {
      setNewDocLabel("");
      return;
    }
    setRequiredDocs((prev) => [
      ...prev,
      {
        key,
        label: trimmed,
        required: true,
        accepted_types: [".pdf", ".docx", ".jpg", ".png"],
        category: "supporting_doc",
      },
    ]);
    setNewDocLabel("");
  };

  const handleRemoveRequiredDoc = (key: string) => {
    if (requiredDocs.length <= 1) return;
    setRequiredDocs((prev) => prev.filter((d) => d.key !== key));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    upsertLetterType({
      id: editing?.id,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      estimated_days: Number(estimatedDays) || 3,
      required_documents:
        requiredDocs.length > 0 ? requiredDocs : [DEFAULT_REQUIRED_DOC],
      custom_fields_schema: editing?.custom_fields_schema ?? [],
      template_file_path: editing?.template_file_path ?? null,
      templateFile,
      removeTemplate: removeExistingTemplate,
      is_active: editing ? editing.is_active : true,
    });
    setModalOpen(false);
  };

  const existingTemplateName =
    !removeExistingTemplate && editing?.template_file_path
      ? extractTemplateFileName(editing.template_file_path)
      : null;

  return (
    <AppShell
      allowedRoles={["superadmin"]}
      breadcrumbs={[
        { label: "Ringkasan", href: "/admin" },
        { label: "Katalog Jenis Surat" },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
            Manajemen Katalog Jenis Surat
          </h1>
          <p className="text-sm text-[#475577] mt-1">
            Atur jenis surat yang tersedia bagi himpunan mahasiswa beserta SLA
            estimasi hari kerja, syarat dokumen, dan template surat resmi.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          <span>Tambah Jenis Surat</span>
        </button>
      </div>

      <div className="mt-6 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] divide-y divide-[#DCE6F7]">
        {letterTypes.map((lt) => {
          const tplName = extractTemplateFileName(lt.template_file_path);
          return (
            <div
              key={lt.id}
              className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-[#F6F9FE] border border-[#DCE6F7] font-mono-tabular text-xs font-semibold text-[#1B2CC1]">
                    {lt.code}
                  </span>
                  <span className="text-xs font-mono-tabular text-[#475577]">
                    Estimasi {lt.estimated_days} hari kerja •{" "}
                    {lt.required_documents.length} syarat dokumen
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${
                      lt.is_active
                        ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
                        : "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]"
                    }`}
                  >
                    {lt.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-[#091540]">
                  {lt.name}
                </h2>
                <p className="text-xs text-[#475577] max-w-[65ch]">
                  {lt.description}
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  {tplName ? (
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#F6F9FE] border border-[#DCE6F7] text-xs text-[#091540]">
                      <FileText
                        className="w-3.5 h-3.5 text-[#1B2CC1] shrink-0"
                        strokeWidth={1.5}
                      />
                      <span className="font-mono-tabular truncate max-w-[240px]">
                        {tplName}
                      </span>
                      <button
                        type="button"
                        onClick={() => void downloadLetterTemplate(lt)}
                        className="inline-flex items-center gap-1 text-[#1B2CC1] hover:underline font-medium ml-1"
                      >
                        <Download className="w-3 h-3" strokeWidth={1.5} />
                        <span>Unduh</span>
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEF3C7]/60 border border-[#F59E0B]/40 text-xs text-[#92400E]">
                      Belum ada file template
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(lt)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs font-medium text-[#1B2CC1]"
                >
                  <UploadCloud className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{tplName ? "Ubah & Template" : "Tambah Template"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleLetterTypeActive(lt.id)}
                  className="px-3 py-1.5 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs font-medium text-[#475577]"
                >
                  {lt.is_active ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#091540]/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#DCE6F7] rounded-xl shadow-xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#091540]">
                {editing
                  ? "Ubah Jenis Surat & Template"
                  : "Tambah Jenis Surat & Template"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#475577] hover:bg-[#F6F9FE]"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#091540]">
                    Kode Jenis Surat
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PINJAM-RUANG"
                    className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#091540]">
                    Estimasi SLA (Hari Kerja)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={estimatedDays}
                    onChange={(e) => setEstimatedDays(Number(e.target.value))}
                    className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#091540]">
                  Nama Jenis Surat
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Surat Peminjaman Ruangan / Fasilitas"
                  className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#091540]">
                  Deskripsi Layanan
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg"
                />
              </div>

              {/* Template Surat Upload Section */}
              <div className="pt-2 border-t border-[#DCE6F7] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#091540]">
                    Template Surat Resmi (PDF / DOCX)
                  </label>
                  <span className="text-[11px] font-mono-tabular text-[#475577]">
                    Maks. 5 MB
                  </span>
                </div>

                {templateFile ? (
                  <div className="p-3 rounded-lg border border-[#1B2CC1]/40 bg-[#F6F9FE] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText
                        className="w-4 h-4 text-[#1B2CC1] shrink-0"
                        strokeWidth={1.5}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#091540] truncate">
                          {templateFile.name}
                        </p>
                        <p className="text-[11px] font-mono-tabular text-[#475577]">
                          File baru siap disimpan •{" "}
                          {formatBytes(templateFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTemplateFile(null)}
                      className="p-1.5 rounded-lg text-[#991B1B] hover:bg-[#FEE2E2]/60"
                      aria-label="Batal pilih file template"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : existingTemplateName && editing ? (
                  <div className="p-3 rounded-lg border border-[#DCE6F7] bg-[#F6F9FE] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText
                        className="w-4 h-4 text-[#1B2CC1] shrink-0"
                        strokeWidth={1.5}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#091540] truncate">
                          {existingTemplateName}
                        </p>
                        <p className="text-[11px] text-[#475577]">
                          Template aktif saat ini
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void downloadLetterTemplate(editing)}
                        className="px-2.5 py-1 rounded border border-[#DCE6F7] bg-[#FFFFFF] hover:bg-[#ABD2FA]/20 text-[11px] font-medium text-[#1B2CC1]"
                      >
                        Unduh
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoveExistingTemplate(true)}
                        className="p-1.5 rounded text-[#991B1B] hover:bg-[#FEE2E2]/60"
                        aria-label="Hapus template saat ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ) : null}

                <label className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-[#DCE6F7] bg-[#F6F9FE] hover:border-[#7692FF] cursor-pointer transition-colors">
                  <UploadCloud
                    className="w-5 h-5 text-[#1B2CC1] mb-1"
                    strokeWidth={1.5}
                  />
                  <span className="text-xs font-medium text-[#091540]">
                    {templateFile || existingTemplateName
                      ? "Klik untuk mengganti file template surat"
                      : "Klik untuk mengunggah file template surat"}
                  </span>
                  <span className="text-[11px] font-mono-tabular text-[#475577] mt-0.5">
                    Format didukung: .pdf, .docx
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    className="hidden"
                    onChange={(e) => {
                      handleTemplateFileChange(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>

                {fileError && (
                  <p className="text-xs text-[#991B1B] font-medium">
                    {fileError}
                  </p>
                )}
              </div>

              {/* Syarat Dokumen Section */}
              <div className="pt-2 border-t border-[#DCE6F7] space-y-2.5">
                <label className="text-xs font-semibold text-[#091540] block">
                  Dokumen Persyaratan Wajib ({requiredDocs.length})
                </label>
                <div className="space-y-1.5">
                  {requiredDocs.map((doc) => (
                    <div
                      key={doc.key}
                      className="px-3 py-2 rounded-lg border border-[#DCE6F7] bg-[#FFFFFF] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#091540] truncate">
                          {doc.label}
                        </p>
                        <p className="text-[11px] font-mono-tabular text-[#475577]">
                          {doc.accepted_types.join(", ")}
                        </p>
                      </div>
                      {requiredDocs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRequiredDoc(doc.key)}
                          className="p-1 rounded text-[#991B1B] hover:bg-[#FEE2E2]/60"
                          aria-label={`Hapus syarat ${doc.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDocLabel}
                    onChange={(e) => setNewDocLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRequiredDoc();
                      }
                    }}
                    placeholder="Tambah syarat dokumen baru (misal: Proposal Kegiatan)"
                    className="flex-1 px-3 py-1.5 text-xs border border-[#DCE6F7] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddRequiredDoc}
                    className="px-3 py-1.5 rounded-lg border border-[#DCE6F7] bg-[#F6F9FE] hover:bg-[#ABD2FA]/25 text-xs font-medium text-[#1B2CC1] shrink-0"
                  >
                    + Tambah
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[#DCE6F7] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#DCE6F7] text-xs font-medium text-[#091540]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-xs font-medium"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
