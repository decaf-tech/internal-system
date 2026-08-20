"use client";

import { useState, useTransition } from "react";
import { MemberAvatar } from "@/components/member-avatar";
import { USER_ROLE_LABEL, type Profile, type UserRole } from "@/lib/types";
import { adminUpdateMember } from "./actions";

/**
 * Satu baris anggota tim, bisa diedit di tempat.
 *
 * Bukan form terpisah/modal — dashboard admin ini dipakai sesekali, jadi
 * lebih penting cepat dibaca sekali lihat daripada dirapikan jadi banyak
 * layar. Sama polanya dengan mengubah nilai deal di halaman klien.
 */
export function MemberRow({
  member,
  isSelf,
}: {
  member: Profile;
  isSelf: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.full_name);
  const [role, setRole] = useState<UserRole>(member.role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await adminUpdateMember(member.id, name, role);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  function cancel() {
    setEditing(false);
    setName(member.full_name);
    setRole(member.role);
    setError(null);
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <MemberAvatar member={member} size="md" />

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Nama"
              className="field w-40 py-1 text-base sm:text-xs"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              aria-label="Peran"
              className="field w-auto py-1 text-base sm:text-xs"
            >
              {Object.entries(USER_ROLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded bg-ink px-2 py-1 text-[11px] text-ink-inverse disabled:opacity-40"
            >
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="px-1 text-[11px] text-ink-muted hover:text-ink"
            >
              Batal
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">
              {member.full_name}
              {isSelf && (
                <span className="ml-1.5 text-xs text-ink-subtle">(kamu)</span>
              )}
              {member.is_super_admin && (
                <span className="ml-1.5 rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-accent uppercase">
                  Super Admin
                </span>
              )}
            </p>
            <p className="text-xs text-ink-subtle">
              {USER_ROLE_LABEL[member.role]}
            </p>
          </>
        )}
        {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
      </div>

      {!editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-accent hover:underline"
        >
          Ubah
        </button>
      )}
    </li>
  );
}
