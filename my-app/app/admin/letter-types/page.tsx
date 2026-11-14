"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/mock-store";
import { LetterType } from "@/lib/types";

export default function AdminLetterTypesPage() {
  const { letterTypes, upsertLetterType, toggleLetterTypeActive } =
    useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LetterType | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedDays, setEstimatedDays] = useState(3);

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setName("");
    setDescription("");
    setEstimatedDays(3);
    setModalOpen(true);
  };

  const openEdit = (lt: LetterType) => {
    setEditing(lt);
    setCode(lt.code);
    setName(lt.name);
    setDescription(lt.description);
    setEstimatedDays(lt.estimated_days);
    setModalOpen(true);
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
      required_documents: editing?.required_documents ?? [
        {
          key: "draft_utama",
          label: "Draft Surat Utama",
          required: true,
          accepted_types: [".pdf", ".docx"],
          category: "draft_letter",
        },
      ],
      custom_fields_schema: editing?.custom_fields_schema ?? [],
      template_file_path: editing?.template_file_path ?? null,
      is_active: editing ? editing.is_active : true,
    });
    setModalOpen(false);
  };

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
            estimasi hari kerja.
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
        {letterTypes.map((lt) => (
          <div
            key={lt.id}
            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
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
              <h2 className="mt-1.5 text-base font-semibold text-[#091540]">
                {lt.name}
              </h2>
              <p className="text-xs text-[#475577] mt-0.5 max-w-[65ch]">
                {lt.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openEdit(lt)}
                className="px-3 py-1.5 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs font-medium text-[#1B2CC1]"
              >
                Ubah
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
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#091540]/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#DCE6F7] rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#091540]">
                {editing ? "Ubah Jenis Surat" : "Tambah Jenis Surat"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#475577]"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
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
                    Estimasi (Hari)
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
                  className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#091540]">
                  Deskripsi Layanan
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#DCE6F7] text-xs font-medium text-[#091540]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1B2CC1] text-[#FFFFFF] text-xs font-medium"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
