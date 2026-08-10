"use client";

import { useTransition } from "react";
import { deleteClientRecord } from "../actions";

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="btn btn-ghost text-danger"
      onClick={() => {
        // Project & tugas terkait ikut terhapus (ON DELETE CASCADE),
        // jadi konfirmasinya perlu menyebut itu secara eksplisit.
        if (
          !confirm(
            `Hapus klien "${clientName}"? Semua project miliknya ikut terhapus. Dokumen di Google Drive tetap tersimpan.`,
          )
        )
          return;
        startTransition(() => deleteClientRecord(clientId));
      }}
    >
      {pending ? "Menghapus…" : "Hapus"}
    </button>
  );
}
