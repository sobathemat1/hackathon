"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/mock-store";

export default function HomePage() {
  const router = useRouter();
  const { isHydrated, currentUser } = useAppStore();

  useEffect(() => {
    if (!isHydrated) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (currentUser.role === "mahasiswa") router.replace("/mahasiswa");
    else if (currentUser.role === "ult") router.replace("/ult");
    else router.replace("/admin");
  }, [isHydrated, currentUser, router]);

  return (
    <div className="min-h-[100dvh] bg-[#FFFFFF] flex items-center justify-center p-6">
      <div className="flex items-center gap-3 text-sm text-[#475577]">
        <div className="w-4 h-4 rounded-full border-2 border-[#1B2CC1] border-t-transparent animate-spin" />
        <span>Memuat ruang kerja administrasi...</span>
      </div>
    </div>
  );
}
