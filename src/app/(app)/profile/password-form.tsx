"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/modal";
import { changePassword, type FormState } from "./actions";

export function PasswordForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    changePassword,
    { error: null },
  );

  // Kosongkan isian begitu tersimpan, supaya password baru tidak tertinggal
  // terbaca di layar orang berikutnya yang lewat.
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok]);

  return (
    <form ref={form} action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="current_password">
          Password Saat Ini
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password Baru
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field"
          placeholder="••••••••"
        />
        <p className="mt-1 text-xs text-ink-subtle">Minimal 8 karakter.</p>
      </div>

      <div>
        <label className="label" htmlFor="confirm">
          Ulangi Password Baru
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md bg-forest-soft px-3 py-2 text-sm text-forest">
          Password tersimpan. Perangkat lain yang masih masuk tidak ikut
          keluar — kalau perlu, keluarkan lewat dashboard Supabase.
        </p>
      )}

      <SubmitButton>Ganti Password</SubmitButton>
    </form>
  );
}
