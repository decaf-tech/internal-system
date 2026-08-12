"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword, type ResetPasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "Menyimpan…" : "Simpan password baru"}
    </button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(
    updatePassword,
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">
          Password baru
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
          Ulangi password baru
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

      <SubmitButton />
    </form>
  );
}
