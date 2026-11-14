"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { FilePlus2, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/lib/mock-store";
import { STATUS_CONFIG, formatDateTimeID } from "@/lib/constants";
import { SubmissionStatus } from "@/lib/types";

export default function MahasiswaSubmissionsPage() {
  const {
    currentUser,
    organizations,
    letterTypes,
    submissions,
    deleteDraftSubmission,
  } = useAppStore();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const org = organizations.find((o) => o.id === currentUser?.organization_id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions
      .filter((s) => s.organization_id === currentUser?.organization_id)
      .filter((s) => {
        if (statusFilter !== "all" && s.status !== statusFilter) return false;
        if (typeFilter !== "all" && s.letter_type_id !== typeFilter) return false;
        if (!q) return true;
        return (
          s.title.toLowerCase().includes(q) ||
          (s.submission_number ?? "").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [submissions, currentUser, query, statusFilter, typeFilter]);

  const getLetterTypeName = (id: string) =>
    letterTypes.find((l) => l.id === id)?.name ?? "—";

  return (
    <AppShell
      allowedRoles={["mahasiswa"]}
      breadcrumbs={[
        { label: "Ringkasan", href: "/mahasiswa" },
        { label: "Pengajuan Surat" },
      ]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
            Daftar Pengajuan Surat
          </h1>
          <p className="text-sm text-[#475577] mt-1">
            Seluruh riwayat pengajuan, draft, dan surat selesai milik{" "}
            {org?.code ?? "organisasi Anda"}.
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

      {/* Unified Search & Filter Bar */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_200px_220px] gap-3">
        <div className="relative">
          <Search
            className="w-4 h-4 text-[#475577] absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nomor pengajuan (ADM-...) atau perihal..."
            className="w-full pl-9 pr-3 py-2 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter status"
          className="px-3 py-2 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
        >
          <option value="all">Semua Status</option>
          {(Object.keys(STATUS_CONFIG) as SubmissionStatus[]).map((st) => (
            <option key={st} value={st}>
              {STATUS_CONFIG[st].label}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter jenis surat"
          className="px-3 py-2 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
        >
          <option value="all">Semua Jenis Surat</option>
          {letterTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.code} — {lt.name}
            </option>
          ))}
        </select>
      </div>

      {/* Data List / Table */}
      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada pengajuan ditemukan"
            description="Coba ubah kata kunci pencarian atau filter status, atau buat pengajuan surat baru."
            actionLabel="Ajukan Surat Baru"
            actionHref="/mahasiswa/submissions/new"
          />
        ) : (
          <div className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
            {/* Desktop Table Header */}
            <div className="hidden md:grid md:grid-cols-[160px_1.5fr_1fr_140px_170px] gap-4 px-5 py-3 bg-[#F6F9FE] border-b border-[#DCE6F7] text-xs font-semibold text-[#475577]">
              <span>Nomor Pengajuan</span>
              <span>Perihal</span>
              <span>Jenis Surat</span>
              <span>Status</span>
              <span className="text-right">Diperbarui</span>
            </div>

            <div className="divide-y divide-[#DCE6F7]">
              {filtered.map((sub) => (
                <div
                  key={sub.id}
                  className="px-5 py-4 hover:bg-[#F6F9FE] transition-colors flex flex-col md:grid md:grid-cols-[160px_1.5fr_1fr_140px_170px] gap-2 md:gap-4 md:items-center"
                >
                  <div className="flex items-center justify-between md:block">
                    <Link
                      href={
                        sub.status === "draft"
                          ? `/mahasiswa/submissions/new?draft=${sub.id}`
                          : `/submissions/${sub.id}`
                      }
                      className="text-xs font-mono-tabular font-semibold text-[#1B2CC1] hover:underline"
                    >
                      {sub.submission_number ?? "DRAFT"}
                    </Link>
                    <div className="md:hidden">
                      <StatusBadge status={sub.status} />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={
                        sub.status === "draft"
                          ? `/mahasiswa/submissions/new?draft=${sub.id}`
                          : `/submissions/${sub.id}`
                      }
                      className="text-sm font-medium text-[#091540] hover:text-[#1B2CC1] line-clamp-2"
                    >
                      {sub.title}
                    </Link>
                  </div>

                  <div className="text-xs text-[#475577] truncate">
                    {getLetterTypeName(sub.letter_type_id)}
                  </div>

                  <div className="hidden md:block">
                    <StatusBadge status={sub.status} />
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-2">
                    <span className="text-xs font-mono-tabular text-[#475577]">
                      {formatDateTimeID(sub.updated_at)}
                    </span>
                    {sub.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => deleteDraftSubmission(sub.id)}
                        title="Hapus Draft"
                        aria-label="Hapus Draft"
                        className="p-1.5 rounded-lg text-[#991B1B] hover:bg-[#FEE2E2]/60 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
