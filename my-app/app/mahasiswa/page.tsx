"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  FilePlus2,
  FolderKanban,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/lib/mock-store";
import { formatDateTimeID } from "@/lib/constants";

export default function MahasiswaDashboardPage() {
  const {
    currentUser,
    organizations,
    letterTypes,
    submissions,
    notifications,
  } = useAppStore();

  const org = useMemo(
    () => organizations.find((o) => o.id === currentUser?.organization_id),
    [organizations, currentUser]
  );

  const orgSubmissions = useMemo(
    () =>
      submissions
        .filter((s) => s.organization_id === currentUser?.organization_id)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
    [submissions, currentUser]
  );

  const metrics = useMemo(() => {
    const total = orgSubmissions.length;
    const inProcess = orgSubmissions.filter((s) =>
      ["submitted", "under_review", "approved", "processing"].includes(s.status)
    ).length;
    const needsRevision = orgSubmissions.filter(
      (s) => s.status === "revision_required"
    ).length;
    const completed = orgSubmissions.filter(
      (s) => s.status === "completed"
    ).length;
    return { total, inProcess, needsRevision, completed };
  }, [orgSubmissions]);

  const prioritySubmissions = useMemo(() => {
    return [...orgSubmissions]
      .sort((a, b) => {
        if (a.status === "revision_required" && b.status !== "revision_required")
          return -1;
        if (b.status === "revision_required" && a.status !== "revision_required")
          return 1;
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      })
      .slice(0, 6);
  }, [orgSubmissions]);

  const recentNotifs = useMemo(
    () =>
      notifications.filter((n) => n.user_id === currentUser?.id).slice(0, 5),
    [notifications, currentUser]
  );

  const getLetterTypeName = (id: string) =>
    letterTypes.find((l) => l.id === id)?.name ?? "Jenis Surat";

  return (
    <AppShell
      allowedRoles={["mahasiswa"]}
      breadcrumbs={[{ label: "Ringkasan Organisasi" }]}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
            Dashboard {org?.code ?? "Himpunan"}
          </h1>
          <p className="text-sm text-[#475577] mt-1">
            {org?.name ?? "Organisasi Mahasiswa"} — Pantau status pengajuan dan
            unduh surat resmi yang telah terbit.
          </p>
        </div>
        <Link
          href="/mahasiswa/submissions/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98] shrink-0"
        >
          <FilePlus2 className="w-4 h-4" strokeWidth={1.5} />
          <span>Ajukan Surat Baru</span>
        </Link>
      </div>

      {/* Summary Strip (§10.5.3 - single bordered container with divide-x) */}
      <div className="mt-6 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#DCE6F7]">
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Total Pengajuan</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#091540]">
            {metrics.total}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Sedang Diproses</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#1B2CC1]">
            {metrics.inProcess}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Perlu Revisi</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#92400E]">
            {metrics.needsRevision}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Surat Selesai</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#166534]">
            {metrics.completed}
          </p>
        </div>
      </div>

      {/* Revision Alert Banner if any */}
      {metrics.needsRevision > 0 && (
        <div className="mt-5 px-4 py-3 rounded-xl border border-[#F59E0B] bg-[#FEF3C7]/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle
              className="w-4 h-4 text-[#92400E] shrink-0"
              strokeWidth={1.5}
            />
            <p className="text-sm text-[#92400E]">
              Terdapat{" "}
              <span className="font-semibold font-mono-tabular">
                {metrics.needsRevision}
              </span>{" "}
              pengajuan yang memerlukan revisi berkas dari petugas ULT.
            </p>
          </div>
          <Link
            href="/mahasiswa/submissions?status=revision_required"
            className="text-xs font-semibold text-[#92400E] hover:underline shrink-0"
          >
            Tinjau Sekarang
          </Link>
        </div>
      )}

      {/* Asymmetric 2-Column Workspace */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
        {/* Left: Active & Priority Submissions */}
        <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DCE6F7] bg-[#F6F9FE] flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-[#091540]">
              Pengajuan Aktif &amp; Terkini
            </h2>
            <Link
              href="/mahasiswa/submissions"
              className="text-xs font-medium text-[#1B2CC1] hover:underline inline-flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>

          {prioritySubmissions.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Belum ada pengajuan surat"
                description={`Belum ada pengajuan surat dari ${
                  org?.code ?? "organisasi Anda"
                }. Buat pengajuan pertama Anda sekarang.`}
                actionLabel="Buat Pengajuan Pertama"
                actionHref="/mahasiswa/submissions/new"
              />
            </div>
          ) : (
            <div className="divide-y divide-[#DCE6F7]">
              {prioritySubmissions.map((sub) => (
                <Link
                  key={sub.id}
                  href={
                    sub.status === "draft"
                      ? `/mahasiswa/submissions/new?draft=${sub.id}`
                      : `/submissions/${sub.id}`
                  }
                  className="block px-5 py-4 hover:bg-[#F6F9FE] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono-tabular font-semibold text-[#1B2CC1]">
                          {sub.submission_number ?? "DRAFT"}
                        </span>
                        <span className="text-xs text-[#475577]">
                          {getLetterTypeName(sub.letter_type_id)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#091540] truncate">
                        {sub.title}
                      </p>
                      <p className="mt-1 text-xs font-mono-tabular text-[#475577]">
                        Diperbarui {formatDateTimeID(sub.updated_at)}
                      </p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Right: Recent Notifications & Catalog Shortcut */}
        <div className="space-y-6">
          <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DCE6F7] bg-[#F6F9FE] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#1B2CC1]" strokeWidth={1.5} />
              <h2 className="text-base font-semibold tracking-tight text-[#091540]">
                Notifikasi Terbaru
              </h2>
            </div>
            <div className="divide-y divide-[#DCE6F7]">
              {recentNotifs.length === 0 ? (
                <p className="p-5 text-sm text-[#475577]">
                  Belum ada pembaruan notifikasi.
                </p>
              ) : (
                recentNotifs.map((n) => (
                  <Link
                    key={n.id}
                    href={
                      n.submission_id
                        ? `/submissions/${n.submission_id}`
                        : "/mahasiswa"
                    }
                    className={`block px-5 py-3.5 hover:bg-[#F6F9FE] transition-colors ${
                      !n.is_read ? "bg-[#ABD2FA]/15" : ""
                    }`}
                  >
                    <p className="text-xs font-semibold text-[#091540]">
                      {n.title}
                    </p>
                    <p className="text-xs text-[#475577] mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[11px] font-mono-tabular text-[#475577] mt-1.5">
                      {formatDateTimeID(n.created_at)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="border border-[#DCE6F7] rounded-xl bg-[#F6F9FE] p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#FFFFFF] border border-[#DCE6F7] flex items-center justify-center text-[#1B2CC1] shrink-0">
                <FolderKanban className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#091540]">
                  Panduan &amp; Template Surat
                </h3>
                <p className="text-xs text-[#475577] mt-1 leading-relaxed">
                  Periksa daftar dokumen wajib dan unduh template resmi sebelum
                  mengirim pengajuan baru.
                </p>
                <Link
                  href="/mahasiswa/catalog"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B2CC1] hover:underline"
                >
                  <span>Buka Katalog Jenis Surat</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
