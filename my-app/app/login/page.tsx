"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, X } from "lucide-react";
import { useAppStore } from "@/lib/mock-store";
import { UserRole } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { isHydrated, currentUser, login, loginAsRole } = useAppStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (isHydrated && currentUser) {
      if (currentUser.role === "mahasiswa") router.replace("/mahasiswa");
      else if (currentUser.role === "ult") router.replace("/ult");
      else router.replace("/admin");
    }
  }, [isHydrated, currentUser, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const res = login(email, password);
    if (!res.ok || !res.user) {
      setFormError(res.error ?? "Gagal masuk ke sistem.");
      return;
    }
    if (res.user.role === "mahasiswa") router.push("/mahasiswa");
    else if (res.user.role === "ult") router.push("/ult");
    else router.push("/admin");
  };

  const handleDemoLogin = (role: UserRole) => {
    const user = loginAsRole(role);
    if (!user) return;
    if (role === "mahasiswa") router.push("/mahasiswa");
    else if (role === "ult") router.push("/ult");
    else router.push("/admin");
  };

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-2 bg-[#FFFFFF]">
      {/* Left Panel: Institutional Identity (#091540) */}
      <div className="relative bg-[#091540] text-[#FFFFFF] p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Thin Geometric Hairline Accents (#1B2CC1 & #7692FF) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute top-0 right-16 w-px h-full bg-[#1B2CC1]/45" />
          <div className="absolute top-28 left-0 w-full h-px bg-[#1B2CC1]/35" />
          <div className="absolute bottom-28 left-0 w-2/3 h-px bg-[#7692FF]/30" />
          <div className="absolute top-28 right-16 w-24 h-24 border border-[#7692FF]/30" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1B2CC1] flex items-center justify-center font-mono-tabular text-xs font-semibold text-[#FFFFFF]">
              SP
            </div>
            <span className="text-sm font-semibold tracking-tight text-[#FFFFFF]">
              SIPESAT
            </span>
          </div>

          <div className="mt-10 lg:mt-20 max-w-md">
            <p className="text-xs font-mono-tabular uppercase tracking-widest text-[#ABD2FA]">
              Unit Layanan Terpadu &amp; UPATIK
            </p>
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[#FFFFFF] leading-snug">
              SIPESAT : Sistem Informasi Pelayanan Surat Terpadu
            </h1>
            <p className="mt-4 text-sm text-[#ABD2FA]/90 leading-relaxed">
              Platform resmi pengelolaan pengajuan surat organisasi mahasiswa,
              verifikasi berkas oleh petugas ULT, pelacakan status kronologis,
              dan pengarsipan surat hasil terenkripsi.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-10 pt-6 border-t border-[#1B2CC1]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#ABD2FA]">
          <span>Akses tertutup khusus pengurus terdaftar.</span>
          <span className="font-mono-tabular">
            Bantuan Akun: upatik@kampus.ac.id
          </span>
        </div>
      </div>

      {/* Right Panel: Authentication Form (#FFFFFF) */}
      <div className="bg-[#FFFFFF] p-8 sm:p-12 lg:p-16 flex items-center justify-center lg:justify-start">
        <div className="w-full max-w-sm">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#091540]">
              Masuk ke Akun
            </h2>
            <p className="mt-1.5 text-sm text-[#475577]">
              Gunakan surel institusi yang telah didaftarkan oleh UPATIK.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[#091540]"
              >
                Alamat Email Institusi
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-[#475577] absolute left-3 top-1/2 -translate-y-1/2"
                  strokeWidth={1.5}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@hmif.ac.id"
                  className="w-full pl-9 pr-3 py-2.5 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF] focus:ring-offset-2 focus:border-[#1B2CC1]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[#091540]"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setForgotSent(false);
                  }}
                  className="text-xs font-medium text-[#1B2CC1] hover:underline"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-[#475577] absolute left-3 top-1/2 -translate-y-1/2"
                  strokeWidth={1.5}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full pl-9 pr-10 py-2.5 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF] focus:ring-offset-2 focus:border-[#1B2CC1]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475577] hover:text-[#091540]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {formError && (
              <p role="alert" className="text-xs text-[#991B1B] font-medium">
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium inline-flex items-center justify-center gap-2 transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7692FF] focus-visible:ring-offset-2"
            >
              <span>Masuk ke Sistem</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </form>

          {/* Quick Role Switcher for Testing All PRD Flows */}
          <div className="mt-8 pt-6 border-t border-[#DCE6F7]">
            <p className="text-xs font-medium text-[#475577] mb-3">
              Akses Cepat Simulasi Peran (Demo):
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("mahasiswa")}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6F7] bg-[#F6F9FE] hover:border-[#7692FF] text-left flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-[#091540]">
                    Budi Santoso (HIMATIF)
                  </p>
                  <p className="text-[11px] text-[#475577] font-mono-tabular">
                    budi.santoso@hmif.ac.id
                  </p>
                </div>
                <span className="text-[11px] font-medium text-[#1B2CC1]">
                  Mahasiswa
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("ult")}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6F7] bg-[#F6F9FE] hover:border-[#7692FF] text-left flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-[#091540]">
                    Siti Rahmawati
                  </p>
                  <p className="text-[11px] text-[#475577] font-mono-tabular">
                    siti.rahmawati@ult.ac.id
                  </p>
                </div>
                <span className="text-[11px] font-medium text-[#1B2CC1]">
                  Petugas ULT
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("superadmin")}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE6F7] bg-[#F6F9FE] hover:border-[#7692FF] text-left flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-[#091540]">
                    Hendra Wijaya
                  </p>
                  <p className="text-[11px] text-[#475577] font-mono-tabular">
                    hendra.wijaya@upatik.ac.id
                  </p>
                </div>
                <span className="text-[11px] font-medium text-[#1B2CC1]">
                  Superadmin
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 bg-[#091540]/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFFFFF] border border-[#DCE6F7] rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#091540]">
                Reset Kata Sandi
              </h3>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="p-1 rounded-lg text-[#475577] hover:bg-[#F6F9FE]"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            {forgotSent ? (
              <div className="mt-4">
                <p className="text-sm text-[#091540] leading-relaxed">
                  Tautan pengaturan ulang kata sandi telah dikirim ke{" "}
                  <span className="font-mono-tabular font-medium">
                    {forgotEmail}
                  </span>
                  . Silakan periksa kotak masuk surel institusi Anda.
                </p>
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="mt-5 w-full py-2 rounded-lg bg-[#1B2CC1] text-[#FFFFFF] text-sm font-medium"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (forgotEmail.trim()) setForgotSent(true);
                }}
                className="mt-4 space-y-4"
              >
                <p className="text-sm text-[#475577]">
                  Masukkan alamat email terdaftar untuk menerima tautan reset
                  kata sandi melalui layanan email kampus.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="forgot-email"
                    className="text-sm font-medium text-[#091540]"
                  >
                    Email Terdaftar
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="nama@hmif.ac.id"
                    className="w-full px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="px-4 py-2 rounded-lg border border-[#DCE6F7] text-sm font-medium text-[#091540]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium"
                  >
                    Kirim Tautan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
