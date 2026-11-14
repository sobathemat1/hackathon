"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckSquare, UserCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/lib/mock-store";
import { formatDateTimeID } from "@/lib/constants";

type QuickTab = "all" | "submitted" | "under_review" | "processing";

export default function UltDashboardPage() {
  const {
    currentUser,
    organizations,
    letterTypes,
    users,
    submissions,
    claimSubmission,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<QuickTab>("all");

  // ULT sees all non-draft submissions (§4.1)
  const nonDraftSubmissions = useMemo(
    () =>
      submissions
        .filter((s) => s.status !== "draft")
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
    [submissions]
  );

  const metrics = useMemo(() => {
    const incoming = nonDraftSubmissions.filter(
      (s) => s.status === "submitted"
    ).length;
    const myTasks = nonDraftSubmissions.filter(
      (s) =>
        s.assigned_to === currentUser?.id &&
        !["completed", "rejected", "cancelled"].includes(s.status)
    ).length;
    const processing = nonDraftSubmissions.filter(
      (s) => s.status === "processing"
    ).length;
    const completed = nonDraftSubmissions.filter(
      (s) => s.status === "completed"
    ).length;
    return { incoming, myTasks, processing, completed };
  }, [nonDraftSubmissions, currentUser]);

  const queueList = useMemo(() => {
    const actionable = nonDraftSubmissions.filter((s) =>
      ["submitted", "under_review", "approved", "processing"].includes(s.status)
    );
    if (activeTab === "all") return actionable.slice(0, 8);
    return actionable.filter((s) => s.status === activeTab).slice(0, 8);
  }, [nonDraftSubmissions, activeTab]);

  const myAssignedList = useMemo(
    () =>
      nonDraftSubmissions
        .filter(
          (s) =>
            s.assigned_to === currentUser?.id &&
            !["completed", "rejected", "cancelled"].includes(s.status)
        )
        .slice(0, 5),
    [nonDraftSubmissions, currentUser]
  );

  const getOrgCode = (id: string) =>
    organizations.find((o) => o.id === id)?.code ?? "—";
  const getLetterTypeName = (id: string) =>
    letterTypes.find((l) => l.id === id)?.name ?? "—";
  const getUserName = (id: string | null) =>
    id ? users.find((u) => u.id === id)?.name ?? "—" : "Belum ditugaskan";

  return (
    <AppShell
      allowedRoles={["ult"]}
      breadcrumbs={[{ label: "Ringkasan Layanan ULT" }]}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
            Workspace Petugas ULT
          </h1>
          <p className="text-sm text-[#475577] mt-1">
            Kelola antrean masuk, verifikasi kelengkapan berkas himpunan, dan
            terbitkan surat hasil resmi.
          </p>
        </div>
        <Link
          href="/ult/queue"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-sm font-medium transition-transform duration-150 active:scale-[0.98] shrink-0"
        >
          <span>Buka Semua Antrean</span>
          <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Summary Strip */}
      <div className="mt-6 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#DCE6F7]">
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Antrean Baru</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#091540]">
            {metrics.incoming}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Tugas Saya</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#1B2CC1]">
            {metrics.myTasks}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Sedang Diproses</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#1E3A8A]">
            {metrics.processing}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#475577]">Selesai</p>
          <p className="mt-2 text-2xl font-semibold font-mono-tabular text-[#166534]">
            {metrics.completed}
          </p>
        </div>
      </div>

      {/* Asymmetric Workspace */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
        {/* Left: Actionable Queue with Quick Filter Tabs */}
        <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#DCE6F7] bg-[#F6F9FE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight text-[#091540]">
              Antrean Perlu Tindakan
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "Semua" },
                  { id: "submitted", label: "Diajukan" },
                  { id: "under_review", label: "Diverifikasi" },
                  { id: "processing", label: "Diproses" },
                ] as { id: QuickTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-[#ABD2FA] text-[#091540] font-semibold"
                      : "text-[#475577] hover:bg-[#FFFFFF]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {queueList.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Antrean pada kategori ini kosong"
                description="Seluruh pengajuan pada filter ini telah ditangani."
                icon={<CheckSquare className="w-5 h-5" strokeWidth={1.5} />}
              />
            </div>
          ) : (
            <div className="divide-y divide-[#DCE6F7]">
              {queueList.map((sub) => (
                <div
                  key={sub.id}
                  className="px-5 py-4 hover:bg-[#F6F9FE] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <Link
                    href={`/submissions/${sub.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular text-xs font-semibold text-[#1B2CC1]">
                        {sub.submission_number}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#F6F9FE] border border-[#DCE6F7] text-[11px] font-semibold text-[#091540]">
                        {getOrgCode(sub.organization_id)}
                      </span>
                      <span className="text-xs text-[#475577] truncate">
                        {getLetterTypeName(sub.letter_type_id)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#091540] truncate">
                      {sub.title}
                    </p>
                    <p className="mt-1 text-xs text-[#475577]">
                      PIC:{" "}
                      <span className="font-medium text-[#091540]">
                        {getUserName(sub.assigned_to)}
                      </span>{" "}
                      •{" "}
                      <span className="font-mono-tabular">
                        {formatDateTimeID(sub.updated_at)}
                      </span>
                    </p>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={sub.status} />
                    {!sub.assigned_to && (
                      <button
                        type="button"
                        onClick={() => claimSubmission(sub.id)}
                        className="px-3 py-1.5 rounded-lg border border-[#1B2CC1] text-[#1B2CC1] hover:bg-[#1B2CC1] hover:text-[#FFFFFF] text-xs font-medium transition-colors"
                      >
                        Ambil Tugas
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: My Assigned Tasks */}
        <section className="border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DCE6F7] bg-[#F6F9FE] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#1B2CC1]" strokeWidth={1.5} />
            <h2 className="text-base font-semibold tracking-tight text-[#091540]">
              Tugas Aktif Saya
            </h2>
          </div>

          {myAssignedList.length === 0 ? (
            <div className="p-5 text-sm text-[#475577]">
              Anda belum memiliki pengajuan aktif yang ditugaskan. Klik{" "}
              <span className="font-medium text-[#091540]">Ambil Tugas</span>{" "}
              pada antrean di sebelah kiri.
            </div>
          ) : (
            <div className="divide-y divide-[#DCE6F7]">
              {myAssignedList.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/submissions/${sub.id}`}
                  className="block px-5 py-3.5 hover:bg-[#F6F9FE] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[#1B2CC1]">
                      {sub.submission_number}
                    </span>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#091540] line-clamp-2">
                    {sub.title}
                  </p>
                  <p className="mt-1 text-xs text-[#475577]">
                    {getOrgCode(sub.organization_id)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
