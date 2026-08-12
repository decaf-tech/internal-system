"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/modal";
import { initials } from "@/lib/format";
import {
  MEMBER_COLORS,
  MEMBER_COLOR_ORDER,
  USER_ROLE_LABEL,
  memberColor,
  type MemberColor,
  type Profile,
  type UserRole,
} from "@/lib/types";
import { updateProfile, type FormState } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateProfile,
    { error: null },
  );

  const [color, setColor] = useState<MemberColor>(memberColor(profile));

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

      <div>
        <span className="label">Warna Saya</span>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap items-center gap-2">
          {MEMBER_COLOR_ORDER.map((option) => {
            const palette = MEMBER_COLORS[option];
            const active = option === color;
            return (
              <button
                key={option}
                type="button"
                title={palette.label}
                aria-label={`Warna ${palette.label}`}
                aria-pressed={active}
                onClick={() => setColor(option)}
                style={{
                  backgroundColor: palette.solid,
                  outlineColor: palette.solid,
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs text-white transition-transform ${
                  active ? "outline outline-offset-2" : "hover:scale-105"
                }`}
              >
                {initials(profile.full_name)}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-ink-subtle">
          Warna ini menempel ke kamu di seluruh sistem: avatar di kartu tugas,
          garis penanda di kalender, dan tombol filter di papan. Pilih yang
          jelas berbeda dari dua orang lainnya.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
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
