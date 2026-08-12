"use client";

import { useCallback, useState } from "react";
import { Modal } from "@/components/modal";
import type { Client } from "@/lib/types";
import { ClientForm } from "./client-form";
import { createClientRecord, updateClientRecord } from "./actions";

export function NewClientButton() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        className="btn btn-accent flex-1 sm:flex-none"
        onClick={() => setOpen(true)}
      >
        + Klien Baru
      </button>
      <Modal open={open} onClose={close} title="Klien Baru">
        {/* Dirender hanya saat terbuka supaya isian sebelumnya tidak
            tertinggal saat modal dibuka lagi. */}
        {open && <ClientForm action={createClientRecord} onDone={close} />}
      </Modal>
    </>
  );
}

export function EditClientButton({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // Action butuh id klien, sementara useActionState hanya mengoper
  // (state, formData) — jadi id-nya diikat lebih dulu di sini.
  const action = updateClientRecord.bind(null, client.id);

  return (
    <>
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        Edit
      </button>
      <Modal open={open} onClose={close} title="Edit Klien">
        {open && <ClientForm action={action} initial={client} onDone={close} />}
      </Modal>
    </>
  );
}
