"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Download, FileCheck2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/mock-store";

export default function MahasiswaCatalogPage() {
  const { letterTypes } = useAppStore();
  const activeTypes = letterTypes.filter((lt) => lt.is_active);

  const handleDownloadTemplate = (code: string, name: string) => {
    const content = `TEMPLATE SURAT RESMI KAMPUS\nJenis: ${name} (${code})\n\nNomor: ...\nPerihal: ...\nKepada Yth. ...\n\nIsi surat sesuai ketentuan tata naskah dinas universitas.`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Template_${code}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      allowedRoles={["mahasiswa"]}
      breadcrumbs={[
        { label: "Ringkasan", href: "/mahasiswa" },
        { label: "Katalog Jenis Surat" },
      ]}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#091540]">
          Katalog Jenis Surat
        </h1>
        <p className="text-sm text-[#475577] mt-1 max-w-[65ch]">
          Daftar layanan surat administrasi yang tersedia di Unit Layanan
          Terpadu beserta persyaratan dokumen dan estimasi waktu pemrosesan.
        </p>
      </div>

      <div className="mt-6 border border-[#DCE6F7] rounded-xl bg-[#FFFFFF] divide-y divide-[#DCE6F7]">
        {activeTypes.map((lt) => (
          <div
            key={lt.id}
            className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#F6F9FE] border border-[#DCE6F7] font-mono-tabular text-xs font-semibold text-[#1B2CC1]">
                  {lt.code}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-[#475577] font-mono-tabular">
                  <Clock className="w-3.5 h-3.5 text-[#7692FF]" strokeWidth={1.5} />
                  Estimasi {lt.estimated_days} hari kerja
                </span>
              </div>
              <h2 className="mt-2 text-base font-semibold text-[#091540]">
                {lt.name}
              </h2>
              <p className="mt-1 text-sm text-[#475577] leading-relaxed max-w-[65ch]">
                {lt.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={`/mahasiswa/submissions/new?type=${lt.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B2CC1] hover:bg-[#142196] text-[#FFFFFF] text-xs font-medium transition-transform duration-150 active:scale-[0.98]"
                >
                  <span>Ajukan Surat Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </Link>
                {lt.template_file_path && (
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(lt.code, lt.name)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#DCE6F7] bg-[#FFFFFF] hover:bg-[#F6F9FE] text-[#091540] text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#1B2CC1]" strokeWidth={1.5} />
                    <span>Unduh Template</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#F6F9FE] border border-[#DCE6F7] rounded-lg p-4">
              <p className="text-xs font-semibold text-[#091540] mb-2.5">
                Dokumen Persyaratan Wajib
              </p>
              <ul className="space-y-2">
                {lt.required_documents.map((doc) => (
                  <li
                    key={doc.key}
                    className="flex items-start gap-2 text-xs text-[#091540]"
                  >
                    <FileCheck2
                      className="w-3.5 h-3.5 text-[#1B2CC1] shrink-0 mt-0.5"
                      strokeWidth={1.5}
                    />
                    <div>
                      <span className="font-medium">{doc.label}</span>
                      <span className="block text-[11px] font-mono-tabular text-[#475577]">
                        Format: {doc.accepted_types.join(", ")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
