import { SubmissionStatus, UserRole } from "./types";

export const STATUS_CONFIG: Record<
  SubmissionStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    description: string;
  }
> = {
  draft: {
    label: "Draft",
    bg: "#F1F5F9",
    text: "#334155",
    border: "#CBD5E1",
    description: "Disimpan sementara oleh pemohon dan belum dikirim ke ULT.",
  },
  submitted: {
    label: "Diajukan",
    bg: "#E8F2FE",
    text: "#091540",
    border: "#ABD2FA",
    description: "Menunggu petugas ULT mengambil dan memulai verifikasi berkas.",
  },
  under_review: {
    label: "Sedang Diverifikasi",
    bg: "#EEF2FF",
    text: "#1B2CC1",
    border: "#7692FF",
    description: "Petugas ULT sedang memeriksa kelengkapan dan keabsahan dokumen.",
  },
  revision_required: {
    label: "Perlu Revisi",
    bg: "#FEF3C7",
    text: "#92400E",
    border: "#F59E0B",
    description: "Memerlukan perbaikan berkas atau data sesuai catatan petugas ULT.",
  },
  approved: {
    label: "Disetujui",
    bg: "#E0F2FE",
    text: "#075985",
    border: "#7DD3FC",
    description: "Berkas dinyatakan lengkap dan disetujui untuk masuk tahap pemrosesan.",
  },
  processing: {
    label: "Diproses",
    bg: "#E0E7FF",
    text: "#1E3A8A",
    border: "#7692FF",
    description: "Surat sedang dicetak, diberi nomor resmi, dan ditandatangani pimpinan.",
  },
  completed: {
    label: "Selesai",
    bg: "#DCFCE7",
    text: "#166534",
    border: "#86EFAC",
    description: "Surat resmi telah terbit dan siap diunduh oleh pemohon.",
  },
  rejected: {
    label: "Ditolak",
    bg: "#FEE2E2",
    text: "#991B1B",
    border: "#FCA5A5",
    description: "Pengajuan ditolak dengan alasan resmi dari petugas ULT.",
  },
  cancelled: {
    label: "Dibatalkan",
    bg: "#F1F5F9",
    text: "#64748B",
    border: "#E2E8F0",
    description: "Pengajuan dibatalkan oleh pemohon sebelum diverifikasi.",
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  mahasiswa: "Pengurus Himpunan",
  ult: "Petugas ULT",
  superadmin: "Superadmin UPATIK",
};

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES_PER_SUBMISSION = 5;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDateTimeID(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hh}:${mm} WIB`;
}

export function formatDateID(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
