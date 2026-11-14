import { LetterType, SubmissionDocument } from "../types";
import { getSupabaseBrowserClient, STORAGE_BUCKET } from "./client";

const IDB_NAME = "sipas_file_blobs_v1";
const IDB_STORE = "files";

function openBlobDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalBinaryBlob(
  filePath: string,
  blob: Blob
): Promise<void> {
  try {
    const db = await openBlobDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(blob, filePath);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore IDB quota/unavailable errors
  }
}

export async function getLocalBinaryBlob(
  filePath: string
): Promise<Blob | null> {
  try {
    const db = await openBlobDb();
    const res = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(filePath);
      req.onsuccess = () => resolve((req.result as Blob) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return res;
  } catch {
    return null;
  }
}

export async function deleteLocalBinaryBlob(filePath: string): Promise<void> {
  try {
    const db = await openBlobDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(filePath);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}

export async function uploadRealFileToStorage(
  filePath: string,
  file: File | Blob,
  mimeType?: string
): Promise<{ uploadedToSupabase: boolean; error?: string }> {
  const contentType =
    mimeType || (file instanceof File ? file.type : "") || "application/pdf";

  await saveLocalBinaryBlob(filePath, file);

  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        upsert: true,
        contentType,
      });

    if (error) {
      return { uploadedToSupabase: false, error: error.message };
    }
    return { uploadedToSupabase: true };
  } catch (err) {
    return {
      uploadedToSupabase: false,
      error: err instanceof Error ? err.message : "Storage upload failed",
    };
  }
}

function buildMinimalPdfBlob(lines: string[]): Blob {
  const escaped = lines.map((l) =>
    l.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
  );
  const textOps = escaped
    .map((line, idx) => (idx === 0 ? `(${line}) Tj` : `0 -20 Td (${line}) Tj`))
    .join("\n");
  const streamContent = `BT\n/F1 12 Tf\n50 760 Td\n${textOps}\nET`;
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamContent.length} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000297 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${350 + streamContent.length}
%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export async function resolveDocumentSignedUrl(
  doc: SubmissionDocument,
  submissionNumber?: string | null
): Promise<{
  url: string;
  source: "supabase-storage" | "local-binary" | "seed-fallback";
  revokeOnCleanup: boolean;
}> {
  const localBlob = await getLocalBinaryBlob(doc.file_path);

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(doc.file_path, 60);

    if (!error && data?.signedUrl) {
      if (!localBlob) {
        return {
          url: data.signedUrl,
          source: "supabase-storage",
          revokeOnCleanup: false,
        };
      }
      const headResp = await fetch(data.signedUrl, { method: "HEAD" }).catch(
        () => null
      );
      if (headResp && headResp.ok) {
        return {
          url: data.signedUrl,
          source: "supabase-storage",
          revokeOnCleanup: false,
        };
      }
    }
  } catch {
    // Fall back to local binary or generated document
  }

  if (localBlob) {
    return {
      url: URL.createObjectURL(localBlob),
      source: "local-binary",
      revokeOnCleanup: true,
    };
  }

  const infoLines = [
    "SIPESAT : SISTEM INFORMASI PELAYANAN SURAT TERPADU",
    "------------------------------------------------------------",
    `Nama File       : ${doc.file_name}`,
    `Jalur Storage   : ${doc.file_path}`,
    `Nomor Pengajuan : ${submissionNumber ?? "DRAFT"}`,
    `Kategori        : ${doc.category}`,
    `Versi Dokumen   : v${doc.version}`,
    `Diunggah Pada   : ${doc.created_at}`,
  ];

  const fallbackBlob =
    doc.mime_type === "application/pdf" ||
    doc.file_name.toLowerCase().endsWith(".pdf")
      ? buildMinimalPdfBlob(infoLines)
      : new Blob([infoLines.join("\n")], {
          type: doc.mime_type || "application/octet-stream",
        });

  return {
    url: URL.createObjectURL(fallbackBlob),
    source: "seed-fallback",
    revokeOnCleanup: true,
  };
}

export function extractTemplateFileName(filePath: string | null): string | null {
  if (!filePath) return null;
  const segments = filePath.split("/").filter(Boolean);
  const raw = segments[segments.length - 1] ?? filePath;
  return raw.replace(/^\d{10,}_/, "");
}

export async function resolveTemplateSignedUrl(lt: LetterType): Promise<{
  url: string;
  fileName: string;
  revokeOnCleanup: boolean;
}> {
  const rawPath = lt.template_file_path ?? "";
  const normalizedPath = rawPath.replace(/^\/+/, "");
  const fileName =
    extractTemplateFileName(lt.template_file_path) ??
    `Template_${lt.code}.pdf`;

  if (normalizedPath) {
    const localBlob =
      (await getLocalBinaryBlob(normalizedPath)) ??
      (await getLocalBinaryBlob(rawPath));

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(normalizedPath, 60);

      if (!error && data?.signedUrl) {
        if (!localBlob) {
          return {
            url: data.signedUrl,
            fileName,
            revokeOnCleanup: false,
          };
        }
        const headResp = await fetch(data.signedUrl, { method: "HEAD" }).catch(
          () => null
        );
        if (headResp && headResp.ok) {
          return {
            url: data.signedUrl,
            fileName,
            revokeOnCleanup: false,
          };
        }
      }
    } catch {
      // Fall back to local binary or generated template
    }

    if (localBlob) {
      return {
        url: URL.createObjectURL(localBlob),
        fileName,
        revokeOnCleanup: true,
      };
    }
  }

  const infoLines = [
    "SIPESAT : SISTEM INFORMASI PELAYANAN SURAT TERPADU",
    "TEMPLATE SURAT RESMI ORGANISASI KEMAHASISWAAN",
    "------------------------------------------------------------",
    `Kode Layanan : ${lt.code}`,
    `Nama Layanan : ${lt.name}`,
    `Estimasi SLA : ${lt.estimated_days} Hari Kerja`,
    "------------------------------------------------------------",
    "Nomor    : ... / HIMPUNAN / ... / 2026",
    "Lampiran : 1 (Satu) Berkas",
    `Perihal  : Permohonan ${lt.name}`,
    "",
    "Yth. Pimpinan Fakultas / Unit Terkait",
    "di Tempat",
    "",
    "Dengan hormat,",
    `Sehubungan dengan pelaksanaan kegiatan organisasi kemahasiswaan,`,
    `bersama surat ini kami mengajukan ${lt.name}.`,
    "",
    "Demikian surat permohonan ini kami sampaikan. Atas perhatian dan",
    "kerja sama Bapak/Ibu, kami ucapkan terima kasih.",
  ];

  const fallbackBlob = buildMinimalPdfBlob(infoLines);
  const fallbackName = fileName.replace(/\.(docx|txt)$/i, ".pdf");

  return {
    url: URL.createObjectURL(fallbackBlob),
    fileName: fallbackName,
    revokeOnCleanup: true,
  };
}
