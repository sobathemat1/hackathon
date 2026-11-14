"use client";

import React, { useState } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/mock-store";
import { ROLE_LABELS } from "@/lib/constants";
import { User, UserRole } from "@/lib/types";

export default function AdminUsersPage() {
  const { users, organizations, upsertUser, toggleUserActive } = useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nimNip, setNimNip] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("mahasiswa");
  const [orgId, setOrgId] = useState<string>(organizations[0]?.id ?? "");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setNimNip("");
    setPhone("");
    setRole("mahasiswa");
    setOrgId(organizations[0]?.id ?? "");
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setNimNip(u.nim_nip);
    setPhone(u.phone);
    setRole(u.role);
    setOrgId(u.organization_id ?? "");
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    upsertUser({
      id: editingUser?.id,
      name: name.trim(),
      email: email.trim(),
      nim_nip: nimNip.trim(),
      phone: phone.trim(),
      role,
      organization_id: role === "mahasiswa" ? orgId || null : null,
      is_active: editingUser ? editingUser.is_active : true,
      must_change_password: editingUser
        ? editingUser.must_change_password
        : true,
    });
    setModalOpen(false);
  };

  const handleCopyInvite = (u: User) => {
    const link = `${window.location.origin}/login?invite=${encodeURIComponent(
      u.email
    )}`;
    navigator.clipboard?.writeText(link);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getOrgCode = (id: string | null) =>
    id ? organizations.find((o) => o.id === id)?.code ?? "—" : "—";

  return (
    <AppShell
      allowedRoles={["superadmin"]}
      breadcrumbs={[
        { label: "Ringkasan", href: "/admin" },
        { label: "Pengguna & Role" },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
            Manajemen Pengguna &amp; Role
          </h1>
          <p className="text-sm text-[#475577] mt-1">
            Sistem tertutup (Admin-Managed). Daftarkan akun pengurus himpunan,
            petugas ULT, atau administrator UPATIK.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          <span>Undang Pengguna</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="mt-6 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
        <div className="hidden lg:grid lg:grid-cols-[1.3fr_1.4fr_140px_110px_110px_180px] gap-4 px-5 py-3 bg-[#F6F9FE] border-b border-[#DCE6F7] text-xs font-semibold text-[#475577]">
          <span>Nama &amp; NIM/NIP</span>
          <span>Email</span>
          <span>Role</span>
          <span>Organisasi</span>
          <span>Status</span>
          <span className="text-right">Aksi</span>
        </div>

        <div className="divide-y divide-[#DCE6F7]">
          {users.map((u) => (
            <div
              key={u.id}
              className="px-5 py-4 flex flex-col lg:grid lg:grid-cols-[1.3fr_1.4fr_140px_110px_110px_180px] gap-2 lg:gap-4 lg:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-[#091540]">{u.name}</p>
                <p className="text-xs font-mono-tabular text-[#475577]">
                  {u.nim_nip || "—"}
                </p>
              </div>
              <p className="text-xs font-mono-tabular text-[#091540] truncate">
                {u.email}
              </p>
              <span className="text-xs font-medium text-[#1B2CC1]">
                {ROLE_LABELS[u.role]}
              </span>
              <span className="text-xs font-semibold text-[#091540]">
                {getOrgCode(u.organization_id)}
              </span>
              <div>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium border ${
                    u.is_active
                      ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
                      : "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]"
                  }`}
                >
                  {u.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div className="flex items-center lg:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyInvite(u)}
                  title="Salin Tautan Undangan"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs text-[#091540]"
                >
                  {copiedId === u.id ? (
                    <Check className="w-3.5 h-3.5 text-[#166534]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#475577]" />
                  )}
                  <span>{copiedId === u.id ? "Disalin" : "Invite"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(u)}
                  className="px-2.5 py-1 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs font-medium text-[#1B2CC1]"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => toggleUserActive(u.id)}
                  className="px-2.5 py-1 rounded-lg border border-[#DCE6F7] hover:bg-[#F6F9FE] text-xs font-medium text-[#475577]"
                >
                  {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Read-Only RBAC Matrix (§3.8) */}
      <section className="mt-8 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
        <div className="px-5 py-3.5 bg-[#F6F9FE] border-b border-[#DCE6F7]">
          <h2 className="text-base font-semibold tracking-tight text-[#091540]">
            Matriks Hak Akses Role (Read-Only)
          </h2>
        </div>
        <div className="divide-y divide-[#DCE6F7] text-xs">
          <div className="px-5 py-3 grid grid-cols-4 font-semibold text-[#475577] bg-[#F6F9FE]/50">
            <span>Resource</span>
            <span>Mahasiswa (Himpunan)</span>
            <span>Petugas ULT</span>
            <span>Superadmin (UPATIK)</span>
          </div>
          <div className="px-5 py-3 grid grid-cols-4 text-[#091540]">
            <span className="font-medium">Pengajuan Surat</span>
            <span>Buat, Edit Draft, Revisi (Milik Org)</span>
            <span>Lihat Non-Draft, Verifikasi, Proses</span>
            <span>Lihat Semua (Audit)</span>
          </div>
          <div className="px-5 py-3 grid grid-cols-4 text-[#091540]">
            <span className="font-medium">Dokumen Hasil</span>
            <span>Unduh Surat Selesai</span>
            <span>Unggah Surat Resmi &amp; Nomor</span>
            <span>Unduh untuk Audit</span>
          </div>
          <div className="px-5 py-3 grid grid-cols-4 text-[#091540]">
            <span className="font-medium">Master Data &amp; Audit</span>
            <span>—</span>
            <span>Lihat Organisasi &amp; Jenis Surat</span>
            <span>CRUD Penuh &amp; Audit Log</span>
          </div>
        </div>
      </section>

      {/* Modal Create / Edit User */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#091540]/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#DCE6F7] rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#091540]">
                {editingUser ? "Ubah Data Pengguna" : "Undang Pengguna Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#475577] hover:bg-[#F6F9FE]"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#091540]">
                  Nama Lengkap
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
                  Email Institusi
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#091540]">
                    NIM / NIP
                  </label>
                  <input
                    type="text"
                    value={nimNip}
                    onChange={(e) => setNimNip(e.target.value)}
                    className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#091540]">
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#091540]">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg bg-[#FFFFFF]"
                  >
                    <option value="mahasiswa">Mahasiswa (Himpunan)</option>
                    <option value="ult">Petugas ULT</option>
                    <option value="superadmin">Superadmin (UPATIK)</option>
                  </select>
                </div>
                {role === "mahasiswa" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-[#091540]">
                      Organisasi
                    </label>
                    <select
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                      className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg bg-[#FFFFFF]"
                    >
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.code}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                  className="px-4 py-2 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-xs font-medium"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
