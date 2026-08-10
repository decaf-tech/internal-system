"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/modal";
import { USER_ROLE_LABEL, type Profile, type UserRole } from "@/lib/types";
import { updateProfile, type FormState } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateProfile,
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="full_name">
          Nama Tampilan
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          defaultValue={profile.full_name}
          className="field"
          placeholder="Nafidz Abiyyu Hanief"
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Nama ini yang muncul di kartu tugas dan daftar penugasan.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="role">
          Peran
        </label>
        <select
          id="role"
          name="role"
          defaultValue={profile.role}
          className="field"
        >
          {Object.entries(USER_ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value as UserRole}>
              {label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-subtle">
          Peran hanya label untuk memperjelas siapa mengerjakan apa. Hak akses
          ketiga anggota tim sama rata — semua bisa melihat dan mengubah semua
          data, serta saling menugaskan.
        </p>
      </div>

      {state.error && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md bg-forest-soft px-3 py-2 text-sm text-forest">
          Profil tersimpan.
        </p>
      )}

      <SubmitButton>Simpan Profil</SubmitButton>
    </form>
  );
}
