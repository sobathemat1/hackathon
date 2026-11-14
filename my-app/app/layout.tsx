import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/mock-store";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SIPESAT : Sistem Informasi Pelayanan Surat Terpadu",
  description:
    "SIPESAT (Sistem Informasi Pelayanan Surat Terpadu) — Platform terpusat pengajuan, verifikasi, pemrosesan, dan pengarsipan surat administrasi organisasi mahasiswa dan Unit Layanan Terpadu (ULT).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-[100dvh] bg-[#FFFFFF] text-[#091540] antialiased selection:bg-[#ABD2FA] selection:text-[#091540]">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
