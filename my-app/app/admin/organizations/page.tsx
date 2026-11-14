"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/mock-store";
import { Organization } from "@/lib/types";

export default function AdminOrganizationsPage() {
  const { organizations, upsertOrganization, toggleOrganizationActive } =
    useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [description, setDescription] = useState("");

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setName("");
    setFaculty("");
    setDescription("");
    setModalOpen(true);
  };

  const openEdit = (o: Organization) => {
    setEditing(o);
    setCode(o.code);
    setName(o.name);
    setFaculty(o.faculty);
    setDescription(o.description);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    upsertOrganization({
      id: editing?.id,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      faculty: faculty.trim(),
      description: description.trim(),
      is_active: editing ? editing.is_active : true,
    });
    setModalOpen(false);
  };

  return (
    <AppShell
      allowedRoles={["superadmin"]}
      breadcrumbs={[
        { label: "Ringkasan", href: "/admin" },
        { label: "Organisasi / Himpunan" },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
            Organisasi &amp; Himpunan Mahasiswa
          </h1>
          <p className="text-sm text-[#475577] mt-1">
            Kelola daftar himpunan, BEM, dan UKM yang terdaftar dalam sistem
            persuratan.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          <span>Tambah Organisasi</span>
        </button>
      </div>

      <div className="mt-6 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] divide-y divide-[#DCE6F7]">
        {organizations.map((org) => (
          <div
            key={org.id}
            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-[#F6F9FE] border border-[#DCE6F7] font-mono-tabular text-xs font-semibold text-[#1B2CC1]">
                  {org.code}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${
                    org.is_active
                      ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
                      : "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]"
                  }`}
                >
                  {org.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <h2 className="mt-1.5 text-base font-semibold text-[#091540]">
                {org.name}
              </h2>
              <p className="text-xs text-[#475577] mt-0.5">
                {org.faculty} — {org.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openEdit(org)}
                className="px-3 py-1.5 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs font-medium text-[#1B2CC1]"
              >
                Ubah
              </button>
              <button
                type="button"
                onClick={() => toggleOrganizationActive(org.id)}
                className="px-3 py-1.5 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs font-medium text-[#475577]"
              >
                {org.is_active ? "Nonaktifkan" : "Aktifkan"}
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
                {editing ? "Ubah Organisasi" : "Tambah Organisasi"}
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
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#091540]">
                  Kode Singkat
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="HMIF"
                  className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#091540]">
                  Nama Lengkap Organisasi
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
                  Fakultas / Unit Naungan
                </label>
                <input
                  type="text"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#091540]">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
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
