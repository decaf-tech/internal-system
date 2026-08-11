import "server-only";

import { Readable } from "node:stream";
import { auth as googleAuth, drive as driveApi } from "@googleapis/drive";
import { googleDrive as googleDriveEnv } from "@/lib/env";
import type {
  DownloadResult,
  ResumableUpload,
  ResumableUploadInput,
  StorageProvider,
  StoredFile,
  UploadInput,
} from "./types";

const FOLDER_MIME = "application/vnd.google-apps.folder";

const RESUMABLE_ENDPOINT =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";

function createOAuthClient() {
  const { clientId, clientSecret, refreshToken } = googleDriveEnv();

  const oauth2 = new googleAuth.OAuth2(clientId, clientSecret);
  // Refresh token tidak kedaluwarsa selama akses tidak dicabut. Library
  // yang menukarnya jadi access token dan menyegarkannya sendiri.
  oauth2.setCredentials({ refresh_token: refreshToken });

  return oauth2;
}

/** Escape tanda kutip tunggal untuk query Drive API. */
function escapeQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export class GoogleDriveProvider implements StorageProvider {
  private auth = createOAuthClient();
  private drive = driveApi({ version: "v3", auth: this.auth });
  private rootFolderId = googleDriveEnv().rootFolderId;

  // Cache pemetaan path -> folderId selama umur instance, supaya upload
  // beruntun ke klien yang sama tidak mengulang pencarian folder.
  private folderCache = new Map<string, string>();

  async ensureFolder(path: string[]): Promise<string> {
    let parentId = this.rootFolderId;
    const walked: string[] = [];

    for (const rawSegment of path) {
      const segment = sanitizeFolderName(rawSegment);
      walked.push(segment);

      const cacheKey = walked.join("/");
      const cached = this.folderCache.get(cacheKey);
      if (cached) {
        parentId = cached;
        continue;
      }

      const existing = await this.drive.files.list({
        q: [
          `name = '${escapeQueryValue(segment)}'`,
          `mimeType = '${FOLDER_MIME}'`,
          `'${parentId}' in parents`,
          "trashed = false",
        ].join(" and "),
        fields: "files(id)",
        pageSize: 1,
      });

      const found = existing.data.files?.[0]?.id;
      if (found) {
        this.folderCache.set(cacheKey, found);
        parentId = found;
        continue;
      }

      const created = await this.drive.files.create({
        requestBody: {
          name: segment,
          mimeType: FOLDER_MIME,
          parents: [parentId],
        },
        fields: "id",
      });

      const createdId = created.data.id;
      if (!createdId) {
        throw new Error(`Gagal membuat folder "${segment}" di Google Drive.`);
      }

      this.folderCache.set(cacheKey, createdId);
      parentId = createdId;
    }

    return parentId;
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    const folderId = await this.ensureFolder(input.folderPath);

    const body =
      input.content instanceof Buffer
        ? Readable.from(input.content)
        : // Drive API butuh stream Node, sedangkan objek File di route
          // handler memberi web ReadableStream — jembatani di sini.
          Readable.fromWeb(input.content as Parameters<typeof Readable.fromWeb>[0]);

    const created = await this.drive.files.create({
      requestBody: {
        name: input.name,
        parents: [folderId],
      },
      media: {
        mimeType: input.mimeType,
        body,
      },
      fields: "id, name, mimeType, size, webViewLink",
    });

    const file = created.data;
    if (!file.id) {
      throw new Error("Google Drive tidak mengembalikan ID file setelah upload.");
    }

    return {
      id: file.id,
      name: file.name ?? input.name,
      mimeType: file.mimeType ?? input.mimeType,
      sizeBytes: Number(file.size ?? 0),
      webLink: file.webViewLink ?? null,
    };
  }

  /**
   * Minta Drive membuka sesi upload, lalu serahkan URL-nya ke browser.
   *
   * Yang keluar dari sini bukan token akun kita — melainkan URL sesi yang
   * hanya berlaku untuk satu file, ke satu folder yang sudah kita tentukan,
   * dan hangus setelah dipakai. Karena itu byte-nya aman dikirim langsung
   * dari browser, dan batas 4.5MB body request Vercel tidak lagi berlaku.
   */
  async createResumableUpload(
    input: ResumableUploadInput,
  ): Promise<ResumableUpload> {
    const folderId = await this.ensureFolder(input.folderPath);
    const { token } = await this.auth.getAccessToken();
    if (!token) {
      throw new Error(
        "Gagal menukar refresh token jadi access token Google Drive.",
      );
    }

    const response = await fetch(RESUMABLE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        // Google hanya memasang header CORS pada sesi yang dibuat dengan
        // Origin. Tanpa baris ini sesi tetap terbentuk, tapi browser akan
        // ditolak saat mengirim byte-nya.
        Origin: input.origin,
        "X-Upload-Content-Type": input.mimeType,
        "X-Upload-Content-Length": String(input.sizeBytes),
      },
      body: JSON.stringify({ name: input.name, parents: [folderId] }),
    });

    if (!response.ok) {
      throw new Error(
        `Drive menolak permintaan sesi upload (${response.status}): ${await response.text()}`,
      );
    }

    const uploadUrl = response.headers.get("location");
    if (!uploadUrl) {
      throw new Error("Drive tidak mengembalikan URL sesi upload.");
    }

    return { uploadUrl };
  }

  async getFile(fileId: string): Promise<StoredFile> {
    const { data } = await this.drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, webViewLink, parents",
    });

    if (!data.id) {
      throw new Error(`File ${fileId} tidak ditemukan di Google Drive.`);
    }

    return {
      id: data.id,
      name: data.name ?? "file",
      mimeType: data.mimeType ?? "application/octet-stream",
      sizeBytes: Number(data.size ?? 0),
      webLink: data.webViewLink ?? null,
      parentIds: data.parents ?? [],
    };
  }

  async download(fileId: string): Promise<DownloadResult> {
    const meta = await this.drive.files.get({
      fileId,
      fields: "name, mimeType",
    });

    const res = await this.drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" },
    );

    return {
      stream: res.data as unknown as Readable,
      mimeType: meta.data.mimeType ?? "application/octet-stream",
      name: meta.data.name ?? "file",
    };
  }

  async remove(fileId: string): Promise<void> {
    // Dibuang ke Trash, bukan dihapus permanen — kalau ada salah hapus,
    // file masih bisa dipulihkan dari Drive selama 30 hari.
    await this.drive.files.update({
      fileId,
      requestBody: { trashed: true },
    });
  }
}

/**
 * Nama klien/project dipakai langsung sebagai nama folder, jadi karakter
 * yang bikin path ambigu harus dibersihkan dulu.
 */
function sanitizeFolderName(name: string) {
  const cleaned = name.replace(/[/\\]/g, "-").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "Tanpa Nama";
}
