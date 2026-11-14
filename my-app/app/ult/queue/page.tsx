"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/lib/mock-store";
import { STATUS_CONFIG, formatDateTimeID } from "@/lib/constants";
import { SubmissionStatus } from "@/lib/types";

export default function UltQueuePage() {
  const {
    organizations,
    letterTypes,
    users,
    submissions,
    claimSubmission,
  } = useAppStore();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");

  const ultOfficers = useMemo(
    () => users.filter((u) => u.role === "ult" && u.is_active),
    [users]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions
      .filter((s) => s.status !== "draft")
      .filter((s) => {
        if (statusFilter !== "all" && s.status !== statusFilter) return false;
        if (orgFilter !== "all" && s.organization_id !== orgFilter) return false;
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
  }, [submissions, query, statusFilter, orgFilter]);

  const getOrgCode = (id: string) =>
    organizations.find((o) => o.id === id)?.code ?? "—";
  const getLetterTypeName = (id: string) =>
    letterTypes.find((l) => l.id === id)?.name ?? "—";

  return (
    <AppShell
      allowedRoles={["ult"]}
      breadcrumbs={[
        { label: "Ringkasan ULT", href: "/ult" },
        { label: "Antrean Pengajuan" },
      ]}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
          Antrean Pengajuan Surat
        </h1>
        <p className="text-sm text-[#475577] mt-1">
          Seluruh pengajuan non-draft dari organisasi mahasiswa. Tugaskan PIC
          petugas untuk menghindari pemeriksaan ganda.
        </p>
      </div>

      {/* Filters */}
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
            placeholder="Cari nomor ADM-... atau perihal surat..."
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
          {(Object.keys(STATUS_CONFIG) as SubmissionStatus[])
            .filter((s) => s !== "draft")
            .map((st) => (
              <option key={st} value={st}>
                {STATUS_CONFIG[st].label}
              </option>
            ))}
        </select>

        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          aria-label="Filter organisasi"
          className="px-3 py-2 text-sm text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
        >
          <option value="all">Semua Organisasi</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.code} — {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table / Stacked Rows */}
      <div className="mt-5">
        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada antrean yang cocok"
            description="Ubah filter pencarian atau status untuk melihat pengajuan lainnya."
          />
        ) : (
          <div className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
            <div className="hidden lg:grid lg:grid-cols-[140px_100px_1.5fr_1fr_140px_180px] gap-4 px-5 py-3 bg-[#F6F9FE] border-b border-[#DCE6F7] text-xs font-semibold text-[#475577]">
              <span>Nomor</span>
              <span>Himpunan</span>
              <span>Perihal</span>
              <span>Jenis Surat</span>
              <span>Status</span>
              <span>PIC Petugas</span>
            </div>

            <div className="divide-y divide-[#DCE6F7]">
              {filtered.map((sub) => (
                <div
                  key={sub.id}
                  className="px-5 py-4 hover:bg-[#F6F9FE] transition-colors flex flex-col lg:grid lg:grid-cols-[140px_100px_1.5fr_1fr_140px_180px] gap-2 lg:gap-4 lg:items-center"
                >
                  <div className="flex items-center justify-between lg:block">
                    <Link
                      href={`/submissions/${sub.id}`}
                      className="text-xs font-mono-tabular font-semibold text-[#1B2CC1] hover:underline"
                    >
                      {sub.submission_number}
                    </Link>
                    <div className="lg:hidden">
                      <StatusBadge status={sub.status} />
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-[#091540]">
                    {getOrgCode(sub.organization_id)}
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={`/submissions/${sub.id}`}
                      className="text-sm font-medium text-[#091540] hover:text-[#1B2CC1] line-clamp-2"
                    >
                      {sub.title}
                    </Link>
                    <p className="text-[11px] font-mono-tabular text-[#475577] mt-0.5">
                      {formatDateTimeID(sub.submitted_at)}
                    </p>
                  </div>

                  <div className="text-xs text-[#475577] truncate">
                    {getLetterTypeName(sub.letter_type_id)}
                  </div>

                  <div className="hidden lg:block">
                    <StatusBadge status={sub.status} />
                  </div>

                  <div>
                    <select
                      aria-label={`PIC untuk ${sub.submission_number}`}
                      value={sub.assigned_to ?? ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          claimSubmission(sub.id, e.target.value);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs text-[#091540] bg-[#FFFFFF] border border-[#DCE6F7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7692FF]"
                    >
                      <option value="">— Belum Ditugaskan —</option>
                      {ultOfficers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
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
