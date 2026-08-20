"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { ConfirmButton, Modal, SubmitButton } from "@/components/modal";
import { EmptyState } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import type { DocumentTemplate } from "@/lib/types";
import {
  PLACEHOLDER_CATALOG,
  TEMPLATE_FIELD_TYPES,
  TEMPLATE_FIELD_TYPE_LABEL,
  parseTemplateFields,
  type TemplateField,
  type TemplateFieldType,
} from "@/lib/templates/types";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
  type FormState,
} from "./actions";

type SourceChoice = { id: string; name: string; mimeType: string | null };

export function TemplateManager({
  templates,
  sources,
  supported,
}: {
  templates: DocumentTemplate[];
  sources: SourceChoice[];
  supported: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  if (!supported) {
    return (
      <EmptyState
        title="Penyimpanan yang aktif tidak mendukung dokumen template"
        description="Fitur ini butuh penyimpanan yang bisa menyalin dokumen, mengisi placeholder, dan mengekspor PDF — sekarang cuma Google Drive."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-ink-muted">
          Susun dokumennya di Word atau Google Docs, tulis{" "}
          <code className="font-mono text-xs">{"{{klien.nama}}"}</code> di
          tempat yang perlu terisi sendiri, unggah lewat Arsip, lalu
          daftarkan di sini.
        </p>
        <button
          type="button"
          className="btn btn-accent w-full sm:w-auto"
          onClick={() => setCreating(true)}
        >
          + Template Baru
        </button>
      </div>

      <PlaceholderReference />

      {templates.length === 0 ? (
        <EmptyState
          title="Belum ada template"
          description="Tanpa template, dokumen tetap bisa diunggah manual seperti biasa — template cuma memotong langkah menyalin data yang sudah ada di sistem."
        />
      ) : (
        <ul className="card divide-y divide-line">
          {templates.map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              onEdit={() => setEditing(template)}
            />
          ))}
        </ul>
      )}

      <Modal open={creating} onClose={closeCreate} title="Template Baru">
        {creating && (
          <TemplateForm
            action={createTemplate}
            sources={sources}
            onDone={closeCreate}
          />
        )}
      </Modal>

      <Modal open={editing !== null} onClose={closeEdit} title="Ubah Template">
        {editing && (
          <TemplateForm
            key={editing.id}
            action={updateTemplate.bind(null, editing.id)}
            initial={editing}
            sources={sources}
            onDone={closeEdit}
          />
        )}
      </Modal>
    </div>
  );
}

function TemplateRow({
  template,
  onEdit,
}: {
  template: DocumentTemplate;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const fields = parseTemplateFields(template.fields);

  return (
    <li className="flex flex-wrap items-start gap-3 p-3 sm:px-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {template.name}
          {!template.is_active && (
            <span className="ml-2 text-xs text-ink-subtle">(nonaktif)</span>
          )}
        </p>
        {template.description && (
          <p className="text-sm text-ink-muted">{template.description}</p>
        )}
        <p className="font-mono text-[11px] text-ink-subtle">
          {template.number_prefix
            ? `kode ${template.number_prefix}`
            : "tanpa nomor"}
          {fields.length > 0 && ` · ${fields.length} isian manual`}
          {` · dibuat ${formatDate(template.created_at)}`}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {template.drive_web_link && (
          <a
            href={template.drive_web_link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded px-3 py-2 text-xs text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            Buka
          </a>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="rounded px-3 py-2 text-xs text-ink-muted hover:bg-surface-muted hover:text-ink"
        >
          Ubah
        </button>
        <ConfirmButton
          label={`Hapus template ${template.name}`}
          disabled={pending}
          className="icon-btn icon-btn-danger"
          title={`Hapus template "${template.name}"?`}
          message="Berkas templatenya pindah ke Trash Drive. Dokumen yang sudah pernah terbit dari template ini tidak ikut terhapus."
          onConfirm={() => startTransition(() => deleteTemplate(template.id))}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 4.5h10M6.5 4V2.5h3V4M4.5 4.5l.5 9h6l.5-9"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </ConfirmButton>
      </div>
    </li>
  );
}

function TemplateForm({
  action,
  initial,
  sources,
  onDone,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: DocumentTemplate;
  sources: SourceChoice[];
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {
    error: null,
  });
  const [fields, setFields] = useState<TemplateField[]>(
    initial ? parseTemplateFields(initial.fields) : [],
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Nama Template <span className="text-accent">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name ?? ""}
          className="field"
          placeholder="Invoice"
        />
      </div>

      {!initial && (
        <div>
          <label className="label" htmlFor="source_document_id">
            Berkas Template <span className="text-accent">*</span>
          </label>
          <select
            id="source_document_id"
            name="source_document_id"
            required
            className="field"
            defaultValue=""
          >
            <option value="">— Pilih berkas yang sudah diunggah —</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-subtle">
            Harus berkas yang diunggah lewat aplikasi ini — file yang
            ditaruh manual di Drive tidak bisa disentuh sistem. Word (.docx)
            otomatis dikonversi jadi Google Doc.
          </p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="description">
          Keterangan
        </label>
        <input
          id="description"
          name="description"
          defaultValue={initial?.description ?? ""}
          className="field"
          placeholder="Tagihan termin & langganan"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="number_prefix">
            Kode Penomoran
          </label>
          <input
            id="number_prefix"
            name="number_prefix"
            defaultValue={initial?.number_prefix ?? ""}
            className="field"
            placeholder="INV"
            maxLength={6}
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Kosongkan kalau dokumennya tidak bernomor. Bentuk nomornya:
            DC/INV/001/VIII/2026, urutan direset tiap awal tahun.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="output_name">
            Pola Nama Berkas
          </label>
          <input
            id="output_name"
            name="output_name"
            defaultValue={
              initial?.output_name ?? "{{dokumen.judul}} {{dokumen.nomor}} — {{klien.nama}}"
            }
            className="field font-mono text-xs"
          />
        </div>
      </div>

      <FieldsEditor fields={fields} onChange={setFields} />

      {initial && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={initial.is_active}
            className="size-4"
          />
          Aktif — muncul di daftar pilihan saat membuat dokumen
        </label>
      )}

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Batal
        </button>
        <SubmitButton pendingLabel={initial ? "Menyimpan…" : "Menyalin…"}>
          {initial ? "Simpan Perubahan" : "Daftarkan Template"}
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * Daftar isian manual — hal yang memang tidak ada di database dan cuma ada
 * di kepala orangnya saat dokumen itu dibuat.
 *
 * Dikirim sebagai array sejajar (`field_key[]`, `field_label[]`, …), bukan
 * JSON yang dirakit di browser: form ini tetap form biasa, jadi tidak ada
 * state tersembunyi yang bisa berbeda dari yang terlihat di layar.
 * `field_required` ikut sebagai hidden input, karena checkbox yang tidak
 * dicentang tidak terkirim sama sekali dan barisnya jadi meleset.
 */
function FieldsEditor({
  fields,
  onChange,
}: {
  fields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
}) {
  function update(index: number, patch: Partial<TemplateField>) {
    onChange(
      fields.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="label mb-0">Isian Manual</span>
        <button
          type="button"
          className="rounded px-2 py-1.5 text-xs text-accent hover:bg-accent-soft"
          onClick={() =>
            onChange([
              ...fields,
              { key: "", label: "", type: "text", required: false, default: "" },
            ])
          }
        >
          + Tambah isian
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-md border border-line px-3 py-2 text-xs text-ink-subtle">
          Belum ada. Tambahkan untuk hal yang tidak tersimpan di sistem —
          rincian pekerjaan, jangka waktu garansi, nama penanda tangan pihak
          kedua.
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <li key={index} className="rounded-md border border-line p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  name="field_key"
                  value={field.key}
                  onChange={(event) =>
                    update(index, {
                      key: event.target.value.toLowerCase().replace(/\s+/g, "_"),
                    })
                  }
                  className="field font-mono text-xs"
                  placeholder="rincian_pekerjaan"
                  aria-label="Nama placeholder"
                />
                <input
                  name="field_label"
                  value={field.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                  className="field"
                  placeholder="Rincian pekerjaan"
                  aria-label="Label di form"
                />
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <select
                  name="field_type"
                  value={field.type}
                  onChange={(event) =>
                    update(index, { type: event.target.value as TemplateFieldType })
                  }
                  className="field"
                  aria-label="Jenis isian"
                >
                  {TEMPLATE_FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {TEMPLATE_FIELD_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
                <input
                  name="field_default"
                  value={field.default}
                  onChange={(event) => update(index, { default: event.target.value })}
                  className="field font-mono text-xs"
                  placeholder="Termin — {{proyek.nama}}"
                  aria-label="Nilai awal"
                />
              </div>

              <input
                type="hidden"
                name="field_required"
                value={field.required ? "1" : "0"}
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      update(index, { required: event.target.checked })
                    }
                    className="size-4"
                  />
                  Wajib diisi
                </label>
                <button
                  type="button"
                  className="text-xs text-danger hover:underline"
                  onClick={() => onChange(fields.filter((_, i) => i !== index))}
                >
                  Hapus isian
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Daftar placeholder otomatis, dibuka-tutup.
 *
 * Ada di halaman ini, bukan di README: yang membacanya sedang menyusun
 * template, dan daftar yang tinggal di dokumen terpisah adalah daftar yang
 * basi enam bulan lagi tanpa ada yang tahu.
 */
function PlaceholderReference() {
  const [open, setOpen] = useState(false);

  return (
    <div className="card p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-medium">
          Placeholder yang diisi otomatis
        </span>
        <span className="text-xs text-ink-subtle">
          {open ? "Sembunyikan" : "Lihat daftar"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {PLACEHOLDER_CATALOG.map((group) => (
            <div key={group.label}>
              <p className="label mb-1">{group.label}</p>
              {group.requires && (
                <p className="mb-1.5 text-xs text-ink-subtle">
                  Terisi kalau {group.requires}.
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.key} className="flex flex-wrap gap-x-2 text-xs">
                    <code className="font-mono text-ink">{`{{${item.key}}}`}</code>
                    <span className="text-ink-subtle">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
