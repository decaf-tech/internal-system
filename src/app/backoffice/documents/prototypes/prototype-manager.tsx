"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton, Modal, SubmitButton } from "@/components/modal";
import { EmptyState } from "@/components/page-header";
import { formatDate, formatFileSize } from "@/lib/format";
import {
  MAX_ZIP_BYTES,
  slugify,
  type PrototypeWithRelations,
} from "@/lib/prototypes/types";
import { deletePrototype, setPrototypePublic, updatePrototype } from "./actions";

type Client = { id: string; name: string };

export function PrototypeManager({
  prototypes,
  clients,
  origin,
}: {
  prototypes: PrototypeWithRelations[];
  clients: Client[];
  origin: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<PrototypeWithRelations | null>(null);
  const [replacing, setReplacing] = useState<PrototypeWithRelations | null>(null);

  const closeUpload = useCallback(() => setUploading(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeReplace = useCallback(() => setReplacing(null), []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-ink-muted">
          Yang diunggah adalah <strong>hasil build</strong> — folder berisi{" "}
          <code className="font-mono text-xs">index.html</code>, biasanya
          bernama <code className="font-mono text-xs">dist</code> atau{" "}
          <code className="font-mono text-xs">build</code>. Tautannya tidak
          tercantum di mana pun dan tidak masuk hasil pencarian: hanya yang
          menerima tautannya yang bisa membuka.
        </p>
        <button
          type="button"
          className="btn btn-accent w-full sm:w-auto"
          onClick={() => setUploading(true)}
        >
          + Prototipe Baru
        </button>
      </div>

      {prototypes.length === 0 ? (
        <EmptyState
          title="Belum ada prototipe"
          description="Jatuhkan zip hasil build di sini, lalu kirim tautannya ke calon klien."
          action={
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => setUploading(true)}
            >
              + Prototipe Baru
            </button>
          }
        />
      ) : (
        <ul className="card divide-y divide-line">
          {prototypes.map((prototype) => (
            <PrototypeRow
              key={prototype.id}
              prototype={prototype}
              origin={origin}
              onEdit={() => setEditing(prototype)}
              onReplace={() => setReplacing(prototype)}
            />
          ))}
        </ul>
      )}

      <Modal open={uploading} onClose={closeUpload} title="Prototipe Baru">
        {uploading && <UploadForm clients={clients} onDone={closeUpload} />}
      </Modal>

      <Modal
        open={editing !== null}
        onClose={closeEdit}
        title="Ubah Keterangan"
      >
        {editing && (
          <EditForm
            prototype={editing}
            clients={clients}
            origin={origin}
            onDone={closeEdit}
          />
        )}
      </Modal>

      <Modal
        open={replacing !== null}
        onClose={closeReplace}
        title="Ganti Isi Prototipe"
      >
        {replacing && (
          <UploadForm
            replacesId={replacing.id}
            replacesName={replacing.name}
            onDone={closeReplace}
          />
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------
// Satu baris daftar
// ---------------------------------------------------------------------

function PrototypeRow({
  prototype,
  origin,
  onEdit,
  onReplace,
}: {
  prototype: PrototypeWithRelations;
  origin: string;
  onEdit: () => void;
  onReplace: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const url = `${origin}/p/${prototype.slug}`;

  return (
    <li className="flex flex-wrap items-start gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate font-medium text-ink">
            {prototype.name}
          </p>
          <span
            className={`badge ${
              prototype.is_public
                ? "bg-forest-soft text-forest"
                : "bg-surface-muted text-ink-subtle"
            }`}
          >
            {prototype.is_public ? "Publik" : "Draf"}
          </span>
        </div>

        <p className="mt-1 truncate font-mono text-xs text-ink-subtle">
          /p/{prototype.slug}
        </p>

        <p className="mt-1 text-xs text-ink-subtle">
          {prototype.client ? `${prototype.client.name} · ` : ""}
          {prototype.file_count} berkas ·{" "}
          {formatFileSize(prototype.size_bytes)} ·{" "}
          {formatDate(prototype.created_at)}
          {prototype.uploader?.full_name
            ? ` · ${prototype.uploader.full_name}`
            : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1">
        {prototype.is_public && <CopyLinkButton url={url} />}

        <a
          href={`/p/${prototype.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          // Draf sengaja tetap bisa dibuka dari sini supaya hasilnya bisa
          // diperiksa dulu — tapi yang membukanya akan dapat 404 sama
          // seperti orang luar, karena gerbangnya di sisi server dan tidak
          // mengenal siapa yang sedang login. Diberi keterangan supaya itu
          // tidak terbaca sebagai kerusakan.
          title={
            prototype.is_public
              ? "Buka prototipe"
              : "Masih draf — akan tampil 404 sampai dipublikasikan"
          }
        >
          Buka
        </a>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(() =>
              setPrototypePublic(prototype.id, !prototype.is_public),
            )
          }
        >
          {prototype.is_public ? "Tutup" : "Publikasikan"}
        </button>

        <button type="button" className="btn btn-ghost" onClick={onEdit}>
          Ubah
        </button>

        <button type="button" className="btn btn-ghost" onClick={onReplace}>
          Ganti Isi
        </button>

        <ConfirmButton
          title="Hapus prototipe?"
          message={
            prototype.is_public
              ? `"${prototype.name}" sedang publik. Setelah dihapus, tautan yang sudah dikirim ke klien akan mati.`
              : `"${prototype.name}" beserta seluruh berkasnya akan dihapus.`
          }
          confirmLabel="Hapus"
          onConfirm={() => startTransition(() => deletePrototype(prototype.id))}
        >
          Hapus
        </ConfirmButton>
      </div>
    </li>
  );
}

/** Menyalin tautan penuh — yang dikirim ke klien, bukan path-nya saja. */
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          // clipboard butuh konteks aman (https atau localhost). Kalau
          // ditolak, tautannya tetap bisa diambil lewat tombol Buka.
          window.prompt("Salin tautan ini:", url);
        }
      }}
    >
      {copied ? "Tersalin" : "Salin Link"}
    </button>
  );
}

// ---------------------------------------------------------------------
// Unggah
// ---------------------------------------------------------------------

/**
 * Form unggah, dipakai dua keperluan: prototipe baru, dan mengganti isi
 * yang sudah ada (`replacesId` terisi — nama, alamat, dan klien tidak
 * ditanyakan lagi karena tidak berubah).
 *
 * Kirimannya lewat `XMLHttpRequest`, bukan `fetch`, karena hanya XHR yang
 * melaporkan progres unggah — pola yang sama dengan `putToDrive()` di
 * `lib/upload-client.ts`. Untuk zip puluhan megabyte, bilah progres itu
 * bedanya antara "sedang jalan" dan "aplikasi hang".
 */
function UploadForm({
  clients,
  replacesId,
  replacesName,
  onDone,
}: {
  clients?: Client[];
  replacesId?: string;
  replacesName?: string;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // Begitu alamat disunting tangan, ia berhenti mengikuti nama. Tanpa ini,
  // mengetik nama setelah merapikan alamat akan menimpa hasil rapiannya.
  const [slugTouched, setSlugTouched] = useState(false);
  const [clientId, setClientId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isReplace = replacesId !== undefined;
  const effectiveSlug = slugTouched ? slug : slugify(name);

  function pick(picked: File | null) {
    setError(null);
    if (!picked) return;

    if (!/\.zip$/i.test(picked.name)) {
      setError("Yang diterima cuma berkas .zip.");
      return;
    }
    if (picked.size > MAX_ZIP_BYTES) {
      setError(
        `Ukuran zip melebihi ${Math.round(MAX_ZIP_BYTES / 1024 / 1024)}MB.`,
      );
      return;
    }

    setFile(picked);
    if (!isReplace && !name) setName(picked.name.replace(/\.zip$/i, ""));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || percent !== null) return;

    setError(null);
    setPercent(0);

    const body = new FormData();
    body.set("zip", file);
    if (isReplace) {
      body.set("id", replacesId);
    } else {
      body.set("name", name);
      body.set("slug", effectiveSlug);
      if (clientId) body.set("client_id", clientId);
    }

    try {
      await send(body, setPercent);
      // Daftarnya dirakit di server, dan unggahnya lewat route handler —
      // tidak ada Server Action yang bisa memanggil `revalidatePath`
      // untuknya. `refresh()` yang menarik ulang server component-nya,
      // tanpa memuat ulang seluruh aplikasi seperti `location.reload()`.
      onDone();
      router.refresh();
    } catch (uploadError) {
      setPercent(null);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Gagal mengunggah prototipe.",
      );
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {isReplace && (
        <p className="text-sm text-ink-muted">
          Isi <strong>{replacesName}</strong> akan diganti. Tautannya tidak
          berubah — yang sudah memegangnya akan langsung melihat versi baru.
        </p>
      )}

      {/* Kotak jatuh. `preventDefault` di dragOver wajib: tanpa itu browser
          menangani jatuhan sendiri dengan membuka berkasnya sebagai
          halaman, dan seluruh backoffice tergantikan oleh isi zip. */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pick(event.dataTransfer.files[0] ?? null);
        }}
        className={`rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft" : "border-line bg-canvas"
        }`}
      >
        {file ? (
          <>
            <p className="font-medium text-ink">{file.name}</p>
            <p className="mt-1 text-xs text-ink-subtle">
              {formatFileSize(file.size)}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              Jatuhkan zip hasil build di sini
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              atau pilih lewat tombol di bawah
            </p>
          </>
        )}

        <label className="btn btn-ghost mt-3 inline-block cursor-pointer">
          {file ? "Ganti berkas" : "Pilih berkas"}
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {!isReplace && (
        <>
          <div>
            <label className="label" htmlFor="prototype-name">
              Nama
            </label>
            <input
              id="prototype-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field"
              placeholder="Landing Page Kopi Kenangan"
            />
          </div>

          <div>
            <label className="label" htmlFor="prototype-slug">
              Alamat Tautan
            </label>
            <div className="flex items-center gap-1">
              <span className="shrink-0 font-mono text-xs text-ink-subtle">
                /p/
              </span>
              <input
                id="prototype-slug"
                value={effectiveSlug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                className="field font-mono text-sm"
                placeholder="landing-kopi-kenangan"
              />
            </div>
            <p className="mt-1 text-xs text-ink-subtle">
              Ini yang dikirim ke klien, jadi buat yang enak dibaca. Huruf
              kecil, angka, dan tanda hubung saja.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="prototype-client">
              Klien (opsional)
            </label>
            <select
              id="prototype-client"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="field"
            >
              <option value="">— tidak ditautkan —</option>
              {(clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {percent !== null && (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-subtle">
            {percent < 100
              ? `Mengunggah… ${percent}%`
              : "Membongkar zip di server…"}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onDone}
          disabled={percent !== null}
        >
          Batal
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!file || percent !== null}
        >
          {percent !== null ? "Mengunggah…" : isReplace ? "Ganti" : "Unggah"}
        </button>
      </div>
    </form>
  );
}

/** Kirim ke route unggah sambil melaporkan progresnya. */
function send(body: FormData, onPercent: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/prototypes/upload", true);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onPercent(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onerror = () => reject(new Error("Koneksi ke server terputus."));

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      // Route unggah membalas { error } untuk kegagalan yang memang untuk
      // dibaca orang. Yang tidak berbentuk itu berarti kegagalan yang tak
      // terduga, dan isinya bukan kalimat yang layak ditampilkan.
      try {
        const parsed = JSON.parse(request.responseText);
        reject(new Error(parsed?.error ?? "Gagal mengunggah prototipe."));
      } catch {
        reject(new Error(`Gagal mengunggah prototipe (${request.status}).`));
      }
    };

    request.send(body);
  });
}

// ---------------------------------------------------------------------
// Ubah keterangan
// ---------------------------------------------------------------------

function EditForm({
  prototype,
  clients,
  origin,
  onDone,
}: {
  prototype: PrototypeWithRelations;
  clients: Client[];
  origin: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(
    updatePrototype.bind(null, prototype.id),
    { error: null },
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="edit-name">
          Nama
        </label>
        <input
          id="edit-name"
          name="name"
          defaultValue={prototype.name}
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="edit-slug">
          Alamat Tautan
        </label>
        <div className="flex items-center gap-1">
          <span className="shrink-0 font-mono text-xs text-ink-subtle">/p/</span>
          <input
            id="edit-slug"
            name="slug"
            defaultValue={prototype.slug}
            className="field font-mono text-sm"
          />
        </div>
        {prototype.is_public && (
          <p className="mt-1 text-xs text-ink-subtle">
            Sudah publik di{" "}
            <span className="font-mono">
              {origin}/p/{prototype.slug}
            </span>
            . Mengganti alamat akan mematikan tautan itu.
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="edit-client">
          Klien (opsional)
        </label>
        <select
          id="edit-client"
          name="client_id"
          defaultValue={prototype.client_id ?? ""}
          className="field"
        >
          <option value="">— tidak ditautkan —</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Batal
        </button>
        <SubmitButton>Simpan</SubmitButton>
      </div>
    </form>
  );
}
