"use client";

import React, { useState } from "react";
import { Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/mock-store";
import { ROLE_LABELS } from "@/lib/constants";

export default function ProfilePage() {
  const { currentUser, organizations, updateProfile, completePasswordChange } =
    useAppStore();

  const [name, setName] = useState(currentUser?.name ?? "");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [nimNip, setNimNip] = useState(currentUser?.nim_nip ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const org = organizations.find((o) => o.id === currentUser?.organization_id);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, phone, nim_nip: nimNip });
    if (newPassword.length >= 8) {
      completePasswordChange(newPassword);
      setNewPassword("");
    }
    setSavedMsg("Profil dan pengaturan akun berhasil diperbarui.");
  };

  return (
    <AppShell breadcrumbs={[{ label: "Profil Saya" }]}>
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
          Profil &amp; Keamanan Akun
        </h1>
        <p className="text-sm text-[#475577] mt-1">
          Perbarui informasi kontak dasar Anda untuk keperluan koordinasi
          persuratan.
        </p>
      </div>

      <form
        onSubmit={handleSaveProfile}
        className="mt-6 max-w-xl border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#DCE6F7] text-xs">
          <div>
            <p className="text-[#475577]">Email Institusi</p>
            <p className="mt-0.5 font-mono-tabular font-semibold text-[#091540]">
              {currentUser?.email}
            </p>
          </div>
          <div>
            <p className="text-[#475577]">Peran &amp; Organisasi</p>
            <p className="mt-0.5 font-semibold text-[#1B2CC1]">
              {currentUser ? ROLE_LABELS[currentUser.role] : "—"}
              {org ? ` (${org.code})` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#091540]">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#091540]">
              NIM / NIP
            </label>
            <input
              type="text"
              value={nimNip}
              onChange={(e) => setNimNip(e.target.value)}
              className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#091540]">
              No. Telepon / WhatsApp
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-2 border-t border-[#DCE6F7]">
          <label className="text-sm font-medium text-[#091540]">
            Ubah Kata Sandi Baru (Opsional)
          </label>
          <input
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 8 karakter jika ingin mengganti"
            className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg"
          />
        </div>

        {savedMsg && (
          <p className="text-xs font-medium text-[#166534]">{savedMsg}</p>
        )}

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium"
        >
          <Save className="w-4 h-4" strokeWidth={1.5} />
          <span>Simpan Perubahan</span>
        </button>
      </form>
    </AppShell>
  );
}
