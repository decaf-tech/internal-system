"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/modal";
import type { DocumentLink } from "@/lib/documents/types";
import {
  generateFromTemplate,
  templateOptions,
  type TemplateChoice,
} from "@/lib/actions/document-templates";
import {
  remainingPlaceholders,
  resolvePlaceholders,
  type TemplateField,
} from "@/lib/templates/types";

/**
 * Dialog "Buat dari Template".
 *
 * Isian yang bisa dijawab database sudah terisi sebelum orangnya melihat
 * formnya — yang tersisa cuma yang memang cuma ada di kepalanya. Nilai
 * otomatisnya diambil sekali saat dialog dibuka, dari tautan dokumen yang
 * sama yang dipakai panelnya, jadi form ini tidak perlu tahu apa pun
 * tentang klien, project, atau tagihan.
 */
export function TemplateDialog({
  open,
  link,
  onClose,
  onGenerated,
}: {
  open: boolean;
  link: DocumentLink;
  onClose: () => void;
  onGenerated?: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Buat Dokumen dari Template">
      {/* Isinya baru dipasang saat dibuka: `Modal` selalu merender
          <dialog>-nya, dan tanpa ini daftar template diambil sekali saat
          halaman dimuat — untuk panel yang tombolnya tidak pernah
          disentuh sekalipun. */}
      {open && (
        <TemplateForm link={link} onClose={onClose} onGenerated={onGenerated} />
      )}
    </Modal>
  );
}

function TemplateForm({
  link,
  onClose,
  onGenerated,
}: {
  link: DocumentLink;
  onClose: () => void;
  onGenerated?: () => void;
}) {
  const [templates, setTemplates] = useState<TemplateChoice[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState("");
  // Cuma isian yang benar-benar disentuh orangnya. Sisanya dihitung dari
  // pola bawaan template tiap render — jadi begitu nilai otomatisnya
  // datang dari server, form ikut terisi tanpa efek yang menyetel state
  // (dan tanpa menimpa ketikan yang sudah ada).
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    name: string;
    webLink: string | null;
    empty: string[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void templateOptions(link).then((result) => {
      if (cancelled) return;
      setTemplates(result.templates);
      setValues(result.values);
      if (result.templates.length === 1) setSelectedId(result.templates[0].id);
    });

    return () => {
      cancelled = true;
    };
    // Tautannya objek baru tiap render induknya, jadi yang diawasi isinya —
    // bukan identitasnya, yang akan memicu pengambilan ulang tanpa henti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(link)]);

  const selected = templates?.find((template) => template.id === selectedId);

  /** Isi sebuah field: ketikan orangnya, atau pola bawaan yang sudah diisi. */
  const valueOf = (field: TemplateField) =>
    edits[field.key] ??
    resolvePlaceholders(field.default, {
      ...values,
      // Judulnya baru diketahui setelah templatenya dipilih, jadi
      // ditambahkan di sini — bukan ikut nilai yang datang dari server.
      "dokumen.judul": selected?.name ?? "",
    });

  if (templates === null) {
    return <p className="py-6 text-center text-sm text-ink-subtle">Memuat template…</p>;
  }

  if (templates.length === 0) {
    return (
      <div className="py-4">
        <p className="text-sm text-ink-muted">
          Belum ada template dokumen.
        </p>
        <p className="mt-1 text-xs text-ink-subtle">
          Unggah berkas templatenya lewat aplikasi ini, lalu daftarkan di
          Dokumen → Template.
        </p>
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          <span className="font-medium">{done.name}</span> sudah dibuat.
        </p>

        {done.empty.length > 0 && (
          <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-ink-muted">
            Placeholder ini dipakai di template tapi datanya masih kosong —
            isi manual di Google Docs:{" "}
            <span className="font-mono">{done.empty.join(", ")}</span>
          </p>
        )}

        <p className="text-xs text-ink-subtle">
          Review & rapikan langsung di Google Docs. Setelah final, tombol
          “Jadikan PDF” di baris dokumennya yang menerbitkan versi PDF-nya.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Tutup
          </button>
          {done.webLink && (
            <a
              href={done.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Buka di Google Docs
            </a>
          )}
        </div>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || pending) return;

    setPending(true);
    setError(null);

    const result = await generateFromTemplate(
      selected.id,
      link,
      Object.fromEntries(selected.fields.map((f) => [f.key, valueOf(f)])),
    );
    setPending(false);

    if (result.error !== null) {
      setError(result.error);
      return;
    }

    setDone({
      name: result.document.name,
      webLink: result.document.webLink,
      empty: result.emptyPlaceholders,
    });
    onGenerated?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="template_id">
          Jenis Dokumen <span className="text-accent">*</span>
        </label>
        <select
          id="template_id"
          required
          className="field"
          value={selectedId}
          onChange={(event) => {
            setSelectedId(event.target.value);
            setEdits({});
          }}
        >
          <option value="">— Pilih template —</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {selected?.description && (
          <p className="mt-1 text-xs text-ink-subtle">{selected.description}</p>
        )}
      </div>

      {selected && (
        <>
          <p className="rounded-md border border-line px-3 py-2 text-xs text-ink-subtle">
            {selected.numberPrefix
              ? `Nomor ${selected.numberPrefix} berikutnya diterbitkan saat dokumen dibuat.`
              : "Template ini tidak bernomor."}
            {values["klien.nama"]
              ? ` Ditujukan ke ${values["klien.tertagih"] || values["klien.nama"]}.`
              : " Belum ada klien yang tertaut — placeholder klien akan kosong."}
          </p>

          {selected.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={valueOf(field)}
              onChange={(value) =>
                setEdits((prev) => ({ ...prev, [field.key]: value }))
              }
            />
          ))}
        </>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Batal
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!selected || pending}
        >
          {pending ? "Membuat…" : "Buat Dokumen"}
        </button>
      </div>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.key}`;
  // Placeholder yang tidak dikenal dibiarkan utuh oleh `resolvePlaceholders`
  // — kalau masih ada yang tersisa di sini, biasanya salah ketik di
  // templatenya, dan lebih baik ketahuan sekarang daripada di dokumen.
  const unresolved = remainingPlaceholders(value);

  return (
    <div>
      <label className="label" htmlFor={id}>
        {field.label}
        {field.required && <span className="text-accent"> *</span>}
      </label>

      {field.type === "multiline" ? (
        <textarea
          id={id}
          rows={3}
          required={field.required}
          className="field resize-y"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          type={field.type === "date" ? "date" : "text"}
          inputMode={
            field.type === "number" || field.type === "money"
              ? "numeric"
              : undefined
          }
          required={field.required}
          className="field"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {unresolved.length > 0 && (
        <p className="mt-1 font-mono text-xs text-ink-subtle">
          belum terisi: {unresolved.join(" ")}
        </p>
      )}
    </div>
  );
}
