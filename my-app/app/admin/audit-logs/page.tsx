"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/mock-store";
import { formatDateTimeID } from "@/lib/constants";

export default function AdminAuditLogsPage() {
  const { auditLogs, users } = useAppStore();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entity_type.toLowerCase().includes(q) ||
        JSON.stringify(l.metadata).toLowerCase().includes(q)
    );
  }, [auditLogs, query]);

  const getUserName = (id: string | null) =>
    id ? users.find((u) => u.id === id)?.name ?? "—" : "Sistem";

  return (
    <AppShell
      allowedRoles={["superadmin"]}
      breadcrumbs={[
        { label: "Ringkasan", href: "/admin" },
        { label: "Audit Log" },
      ]}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
          Audit Log Aktivitas Sistem
        </h1>
        <p className="text-sm text-[#475577] mt-1">
          Pencatatan otomatis aktivitas autentikasi, perubahan status surat, dan
          mutasi master data.
        </p>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search
          className="w-4 h-4 text-[#475577] absolute left-3 top-1/2 -translate-y-1/2"
          strokeWidth={1.5}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter aksi, entitas, atau metadata..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-[#DCE6F7] rounded-lg bg-[#FFFFFF]"
        />
      </div>

      <div className="mt-5 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[170px_190px_140px_1fr_140px] gap-4 px-5 py-3 bg-[#F6F9FE] border-b border-[#DCE6F7] text-xs font-semibold text-[#475577]">
          <span>Waktu</span>
          <span>Aksi</span>
          <span>Pelaku</span>
          <span>Detail Metadata</span>
          <span className="text-right">IP Address</span>
        </div>

        <div className="divide-y divide-[#DCE6F7]">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="px-5 py-3.5 flex flex-col md:grid md:grid-cols-[170px_190px_140px_1fr_140px] gap-2 md:gap-4 md:items-center text-xs"
            >
              <span className="font-mono-tabular text-[#475577]">
                {formatDateTimeID(log.created_at)}
              </span>
              <span className="font-mono-tabular font-semibold text-[#1B2CC1]">
                {log.action}
              </span>
              <span className="font-medium text-[#091540]">
                {getUserName(log.user_id)}
              </span>
              <span className="font-mono-tabular text-[#475577] truncate">
                {JSON.stringify(log.metadata)}
              </span>
              <span className="font-mono-tabular text-[#475577] md:text-right">
                {log.ip_address}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
