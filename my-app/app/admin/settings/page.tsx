"use client";

import React, { useState } from "react";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/mock-store";

export default function AdminSettingsPage() {
  const { settings, updateSettings, cleanupOldDrafts, resetDemoData } =
    useAppStore();

  const [prefix, setPrefix] = useState(settings.submission_prefix);
  const [maxSize, setMaxSize] = useState(settings.max_file_size_mb);
  const [maxFiles, setMaxFiles] = useState(settings.max_files_per_submission);
  const [slaDays, setSlaDays] = useState(settings.ult_sla_days);
  const [banner, setBanner] = useState(settings.maintenance_banner);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      submission_prefix: prefix.trim().toUpperCase() || "ADM",
      max_file_size_mb: Number(maxSize) || 5,
      max_files_per_submission: Number(maxFiles) || 5,
      ult_sla_days: Number(slaDays) || 3,
      maintenance_banner: banner.trim(),
    });
    setFeedback("Pengaturan sistem berhasil disimpan.");
  };

  return (
    <AppShell
      allowedRoles={["superadmin"]}
      breadcrumbs={[
        { label: "Ringkasan", href: "/admin" },
        { label: "Pengaturan Sistem" },
      ]}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
          Pengaturan Sistem Global
        </h1>
        <p className="text-sm text-[#475577] mt-1">
          Konfigurasi format penomoran pengajuan, batas kuota penyimpanan Free
          Tier, dan pemeliharaan data.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <form
          onSubmit={handleSave}
          className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#091540]">
                Prefix Nomor Pengajuan
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
              />
              <span className="text-xs text-[#475577] font-mono-tabular">
                Format: {prefix || "ADM"}-2026-00001
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#091540]">
                Target SLA ULT (Hari Kerja)
              </label>
              <input
                type="number"
                min={1}
                max={14}
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#091540]">
                Maks. Ukuran File (MB)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={maxSize}
                onChange={(e) => setMaxSize(Number(e.target.value))}
                className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#091540]">
                Maks. File per Pengajuan
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxFiles}
                onChange={(e) => setMaxFiles(Number(e.target.value))}
                className="px-3 py-2 text-sm font-mono-tabular border border-[#DCE6F7] rounded-lg"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#091540]">
              Banner Informasi Pemeliharaan (Opsional)
            </label>
            <input
              type="text"
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              placeholder="Kosongkan jika layanan berjalan normal"
              className="px-3 py-2 text-sm border border-[#DCE6F7] rounded-lg"
            />
          </div>

          {feedback && (
            <p className="text-xs font-medium text-[#166534]">{feedback}</p>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium"
          >
            <Save className="w-4 h-4" strokeWidth={1.5} />
            <span>Simpan Pengaturan</span>
          </button>
        </form>

        <section className="border border-[#DCE6F7] rounded-xl bg-[#F6F9FE] p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#091540]">
            Pemeliharaan Kuota &amp; Simulasi
          </h2>
          <p className="text-xs text-[#475577] leading-relaxed">
            Bersihkan draft usang untuk menjaga efisiensi kapasitas Supabase
            Storage Free Tier (1 GB).
          </p>
          <button
            type="button"
            onClick={() => {
              const removed = cleanupOldDrafts();
              setFeedback(`${removed} draft pengajuan berhasil dibersihkan.`);
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#DCE6F7] bg-[#FFFFFF] hover:bg-[#FEE2E2]/40 text-xs font-medium text-[#991B1B]"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Bersihkan Semua Draft Usang</span>
          </button>

          <div className="pt-3 border-t border-[#DCE6F7]">
            <button
              type="button"
              onClick={() => {
                resetDemoData();
                setFeedback("Data simulasi dikembalikan ke kondisi awal.");
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#DCE6F7] bg-[#FFFFFF] text-xs font-medium text-[#091540]"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Reset Data Simulasi Awal</span>
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
