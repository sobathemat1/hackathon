"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { useAppStore } from "@/lib/mock-store";
import { formatDateTimeID } from "@/lib/constants";

export default function AdminDashboardPage() {
  const { users, organizations, letterTypes, submissions, auditLogs } =
    useAppStore();

  const metrics = useMemo(() => {
    return {
      totalSubmissions: submissions.length,
      activeOrgs: organizations.filter((o) => o.is_active).length,
      activeUsers: users.filter((u) => u.is_active).length,
      activeLetterTypes: letterTypes.filter((l) => l.is_active).length,
    };
  }, [submissions, organizations, users, letterTypes]);

  const recentSubmissions = useMemo(
    () =>
      [...submissions]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        .slice(0, 6),
    [submissions]
  );

  const recentAudits = useMemo(() => auditLogs.slice(0, 6), [auditLogs]);

  const getOrgCode = (id: string) =>
    organizations.find((o) => o.id === id)?.code ?? "—";
  const getUserName = (id: string | null) =>
    id ? users.find((u) => u.id === id)?.name ?? "Sistem" : "Sistem";

  return (
    <AppShell
      allowedRoles={["superadmin"]}
      breadcrumbs={[{ label: "Ringkasan Sistem" }]}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
          Dashboard Superadmin UPATIK
        </h1>
        <p className="text-sm text-[#475577] mt-1">
          Pengawasan keseluruhan sistem persuratan, manajemen akun organisasi,
          katalog jenis surat, dan jejak audit.
        </p>
      </div>

      {/* Summary Strip */}
      <div className="mt-6 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#DCE6F7]">
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Total Pengajuan</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#091540]">
            {metrics.totalSubmissions}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Organisasi Aktif</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#1B2CC1]">
            {metrics.activeOrgs}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Pengguna Aktif</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#091540]">
            {metrics.activeUsers}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Jenis Surat Aktif</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#166534]">
            {metrics.activeLetterTypes}
          </p>
        </div>
      </div>

      {/* Asymmetric Workspace */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
        <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DCE6F7] bg-[#F6F9FE] flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-[#091540]">
              Pengawasan Pengajuan Terbaru
            </h2>
            <span className="text-xs text-[#475577]">Mode Read-Only</span>
          </div>
          <div className="divide-y divide-[#DCE6F7]">
            {recentSubmissions.map((sub) => (
              <Link
                key={sub.id}
                href={`/submissions/${sub.id}`}
                className="block px-5 py-3.5 hover:bg-[#F6F9FE] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono-tabular text-xs font-semibold text-[#1B2CC1]">
                      {sub.submission_number ?? "DRAFT"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#F6F9FE] border border-[#DCE6F7] text-[11px] font-semibold text-[#091540]">
                      {getOrgCode(sub.organization_id)}
                    </span>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
                <p className="mt-1 text-sm font-medium text-[#091540] truncate">
                  {sub.title}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DCE6F7] bg-[#F6F9FE] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1B2CC1]" strokeWidth={1.5} />
              <h2 className="text-base font-semibold tracking-tight text-[#091540]">
                Audit Log Terbaru
              </h2>
            </div>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-medium text-[#1B2CC1] hover:underline inline-flex items-center gap-1"
            >
              <span>Semua</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="divide-y divide-[#DCE6F7]">
            {recentAudits.map((log) => (
              <div key={log.id} className="px-5 py-3">
                <p className="text-xs font-mono-tabular font-semibold text-[#091540]">
                  {log.action}
                </p>
                <p className="text-xs text-[#475577] mt-0.5">
                  Oleh {getUserName(log.user_id)} • {log.entity_type}
                </p>
                <p className="text-[11px] font-mono-tabular text-[#475577] mt-1">
                  {formatDateTimeID(log.created_at)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
