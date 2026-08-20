"use client";

import { useTransition } from "react";
import { ConfirmButton } from "@/components/modal";
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
    <ConfirmButton
      disabled={pending}
      className="btn btn-ghost text-danger"
      title={`Hapus klien "${clientName}"?`}
      // Project & tugas terkait ikut terhapus (ON DELETE CASCADE), jadi
      // konfirmasinya perlu menyebut itu secara eksplisit.
      message="Semua project miliknya ikut terhapus. Dokumen di Google Drive tetap tersimpan."
      onConfirm={() => startTransition(() => deleteClientRecord(clientId))}
    >
      {pending ? "Menghapus…" : "Hapus"}
    </ConfirmButton>
  );
}
