import { initials } from "@/lib/format";
import { MEMBER_COLORS, memberColor, type Member } from "@/lib/types";

/**
 * Penanda orang: lingkaran berinisial dengan warna tetap milik orang itu.
 *
 * Warnanya yang bekerja, bukan inisialnya — di papan yang penuh, "ini
 * punya siapa" harus terjawab dari sudut mata, dan dua inisial setinggi
 * 9px tidak bisa melakukan itu. Inisial cuma pembeda cadangan kalau
 * nanti ada dua orang berwarna sama.
 *
 * Server component: tidak ada state, tidak perlu ikut dikirim ke browser.
 */
export function MemberAvatar({
  member,
  size = "sm",
  showName = false,
}: {
  member: Member | null;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
}) {
  const palette = MEMBER_COLORS[memberColor(member)];

  const box =
    size === "xs"
      ? "h-4 w-4 text-[8px]"
      : size === "md"
        ? "h-7 w-7 text-[11px]"
        : "h-5 w-5 text-[9px]";

  const circle = (
    <span
      title={member?.full_name ?? "Belum ditugaskan"}
      style={
        member
          ? { backgroundColor: palette.solid, color: "#fff" }
          : undefined
      }
      className={`flex shrink-0 items-center justify-center rounded-full font-mono leading-none ${box} ${
        member
          ? ""
          : "border border-dashed border-ink-subtle/60 text-ink-subtle"
      }`}
    >
      {member ? initials(member.full_name) : "?"}
    </span>
  );

  if (!showName) return circle;

  return (
    <span className="inline-flex items-center gap-1.5">
      {circle}
      <span className="truncate text-xs text-ink-muted">
        {member?.full_name ?? "Belum ditugaskan"}
      </span>
    </span>
  );
}

/**
 * Beberapa avatar bertumpuk tipis, untuk tugas dengan lebih dari satu
 * penanggung jawab. Dipotong ke `max` orang supaya kartu tidak melebar
 * tanpa batas kalau suatu saat semua orang ditugaskan sekaligus; sisanya
 * diringkas jadi "+N" — jumlahnya tetap terbaca tanpa menghitung lingkaran.
 */
export function MemberAvatarStack({
  members,
  size = "sm",
  max = 3,
}: {
  members: Member[];
  size?: "xs" | "sm" | "md";
  max?: number;
}) {
  if (members.length === 0) return null;

  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  const ring = size === "md" ? "ring-2" : "ring-1";

  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((member) => (
        <span key={member.id} className={`${ring} rounded-full ring-surface`}>
          <MemberAvatar member={member} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          title={members
            .slice(max)
            .map((member) => member.full_name)
            .join(", ")}
          className={`flex h-5 w-5 items-center justify-center rounded-full bg-surface-sunken font-mono text-[9px] leading-none text-ink-muted ${ring} ring-surface`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
