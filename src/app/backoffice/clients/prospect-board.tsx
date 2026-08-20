"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ConfirmButton, Modal } from "@/components/modal";
import {
  PROSPECT_OPEN_STAGES,
  PROSPECT_STAGE_LABEL,
  PROSPECT_STAGE_ORDER,
  PROSPECT_STAGE_TINT,
  type Member,
  type ProspectStage,
  type ProspectWithRelations,
} from "@/lib/types";
import {
  createProspect,
  deleteProspect,
  moveProspect,
  updateProspect,
} from "./prospect-actions";
import { LoseProspectDialog, WinProspectDialog } from "./prospect-close";
import { ProspectCardBody, SortableProspectCard, whatsappLink } from "./prospect-card";
import { ProspectForm } from "./prospect-form";

/** Dua tahap penutup — masing-masing punya gerbangnya sendiri, lihat
 *  `prospect-close.tsx`. */
type ClosingStage = "menang" | "kalah";

function isClosingStage(stage: ProspectStage): stage is ClosingStage {
  return stage === "menang" || stage === "kalah";
}

function isOpenStage(stage: ProspectStage) {
  return PROSPECT_OPEN_STAGES.includes(stage);
}

/** Prospek yang follow-up-nya sudah jatuh tempo — dasar filter & sorotan. */
function isFollowUpDue(prospect: ProspectWithRelations, today: string) {
  return (
    isOpenStage(prospect.stage) &&
    prospect.next_follow_up_date !== null &&
    prospect.next_follow_up_date <= today
  );
}

/**
 * Papan pipeline — pola yang sama dengan papan tugas (`tasks/task-board.tsx`),
 * disalin lalu disesuaikan, bukan digeneralisasi jadi satu komponen bersama.
 *
 * Alasannya: yang benar-benar sama cuma kerangka dnd-kit-nya (sensor, kolom
 * droppable, overlay). Sisanya berbeda di hampir setiap detail — papan tugas
 * punya batas WIP, label, penulis kartu cepat, dan kolom `position` untuk
 * urutan manual; papan ini tidak punya satu pun dari itu. Komponen bersama
 * yang menampung keduanya akan menerima selusin prop opsional yang cuma
 * dipakai satu pemanggil — lebih banyak yang harus dibaca, bukan lebih
 * sedikit.
 *
 * Konsekuensi tidak adanya kolom `position`: kartu tidak bisa diurutkan
 * manual. Seretan cuma memindahkan tahap, dan urutan di dalam kolom
 * ditentukan data (lihat `sortForStage`) — untuk pipeline itu justru lebih
 * berguna daripada urutan manual: yang paling mendesak selalu di atas tanpa
 * ada yang perlu merapikan.
 */
export function ProspectBoard({
  prospects,
  members,
  today,
  currentUserId,
}: {
  prospects: ProspectWithRelations[];
  members: Member[];
  /** Tanggal hari ini menurut jam Jakarta, dihitung di server. */
  today: string;
  currentUserId: string | null;
}) {
  // Salinan lokal supaya kartu langsung berpindah saat dilepas, tanpa
  // menunggu server. Server action yang menyusul akan menyamakan data.
  const [items, setItems] = useState(prospects);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState<ProspectStage | null>(null);
  // Yang disimpan id-nya, bukan salinan barisnya: modal yang memegang potret
  // akan menampilkan data lama setelah datanya berubah di server.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Prospek yang sedang menunggu gerbang penutupnya dijawab (alasan batal /
  // pembuatan klien). Id lagi, dengan alasan yang sama seperti `editingId`.
  const [closing, setClosing] = useState<{
    id: string;
    stage: ClosingStage;
  } | null>(null);
  // Filter follow-up di kepala tab (PRD v3.0 §2.7). Disimpan di komponen,
  // bukan di URL: ini saringan sekali pakai untuk "hari ini kerjakan yang
  // mana", bukan tampilan yang perlu ditautkan atau dibuka ulang nanti.
  const [onlyDue, setOnlyDue] = useState(false);

  // Sinkronkan ulang kalau data dari server berubah (mis. setelah prospek
  // baru dibuat atau revalidatePath berjalan).
  const [syncedFrom, setSyncedFrom] = useState(prospects);
  if (syncedFrom !== prospects) {
    setSyncedFrom(prospects);
    setItems(prospects);
  }

  const sensors = useSensors(
    // Tetikus: geser 5px sudah dianggap seret, jadi kartu terasa ringan.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Sentuh: harus ditahan dulu, kalau tidak setiap usaha menggulir papan
    // di HP tertangkap sebagai seretan kartu.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dueCount = useMemo(
    () => items.filter((prospect) => isFollowUpDue(prospect, today)).length,
    [items, today],
  );

  // Filter dipakai untuk apa yang digambar saja, bukan untuk `items` — kolom
  // tujuan seretan harus tetap ada meski isinya sedang tersembunyi.
  const visible = useMemo(
    () =>
      onlyDue
        ? items.filter((prospect) => isFollowUpDue(prospect, today))
        : items,
    [items, onlyDue, today],
  );

  const grouped = useMemo(() => {
    const map = new Map<ProspectStage, ProspectWithRelations[]>(
      PROSPECT_STAGE_ORDER.map((stage) => [stage, []]),
    );
    for (const prospect of visible) map.get(prospect.stage)?.push(prospect);
    for (const [stage, list] of map) list.sort(sortForStage(stage));
    return map;
  }, [visible]);

  const closeCreate = useCallback(() => setCreating(null), []);
  const closeEdit = useCallback(() => setEditingId(null), []);
  const closeGate = useCallback(() => setClosing(null), []);

  // Prospek yang hilang dari daftar (dihapus) membuat ini null, dan modalnya
  // menutup sendiri — perilaku yang memang diinginkan.
  const editing = useMemo(
    () => items.find((prospect) => prospect.id === editingId) ?? null,
    [items, editingId],
  );

  const activeProspect = activeId
    ? (items.find((prospect) => prospect.id === activeId) ?? null)
    : null;

  // Dicari ulang dari `items`, bukan disimpan saat gerbangnya dibuka: kalau
  // prospeknya berubah di server sementara modal terbuka, yang dibaca modal
  // tetap data terbaru.
  const closingProspect = useMemo(
    () =>
      closing
        ? (items.find((prospect) => prospect.id === closing.id) ?? null)
        : null,
    [items, closing],
  );

  function columnOf(id: string): ProspectStage | null {
    if (PROSPECT_STAGE_ORDER.includes(id as ProspectStage))
      return id as ProspectStage;
    return items.find((prospect) => prospect.id === id)?.stage ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  // Saat kartu melintasi batas kolom, pindahkan di state lokal duluan supaya
  // kolom tujuan langsung memberi ruang secara visual.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const from = columnOf(String(active.id));
    const to = columnOf(String(over.id));
    if (!from || !to || from === to) return;

    setItems((current) =>
      current.map((prospect) =>
        prospect.id === String(active.id) ? { ...prospect, stage: to } : prospect,
      ),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const prospectId = String(active.id);
    const target = columnOf(String(over.id));
    if (!target) return;

    // Kartu yang dilepas kembali di kolomnya sendiri tidak menghasilkan
    // perubahan apa pun — urutan dalam kolom bukan urusan seretan di sini.
    const origin = syncedFrom.find((prospect) => prospect.id === prospectId);
    if (!origin || origin.stage === target) {
      setItems(syncedFrom);
      return;
    }

    // Menang & Kalah bukan perpindahan biasa: yang satu menuntut alasan,
    // yang satu membuat baris klien baru. Kalau seretan langsung memanggil
    // `moveProspect`, ia jadi jalan pintas yang melewati keduanya — jadi
    // kartunya dikembalikan dulu, dan gerbangnya yang bicara. Kartu baru
    // benar-benar pindah setelah modal itu dijawab.
    if (isClosingStage(target)) {
      setItems(syncedFrom);
      setClosing({ id: prospectId, stage: target });
      return;
    }

    setItems((current) =>
      current.map((prospect) =>
        prospect.id === prospectId ? { ...prospect, stage: target } : prospect,
      ),
    );

    // Kalau server menolak, kembalikan papan ke kondisi terakhir yang
    // dikonfirmasi server — lebih baik kartu melompat balik daripada layar
    // menampilkan tahap yang sebenarnya tidak tersimpan.
    moveProspect(prospectId, target).catch((error) => {
      console.error("Gagal memindahkan prospek:", error);
      setItems(syncedFrom);
      alert("Perpindahan prospek gagal disimpan. Papan dikembalikan.");
    });
  }

  return (
    <DndContext
      // ID eksplisit. Tanpa ini dnd-kit membuat ID berurutan sendiri yang
      // berbeda antara render server dan hidrasi klien, dan React membuang
      // seluruh HTML papan karena dianggap tidak cocok.
      id="prospect-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setItems(syncedFrom);
      }}
    >
      <FollowUpFilter
        active={onlyDue}
        count={dueCount}
        onToggle={() => setOnlyDue((current) => !current)}
      />

      {/* Lima kolom di layar lebar, dua di tablet, satu di HP — pembagian
          yang sama seperti papan tugas, cuma satu kolom lebih banyak. */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 xl:grid-cols-5">
        {PROSPECT_STAGE_ORDER.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            prospects={grouped.get(stage) ?? []}
            today={today}
            onOpen={setEditingId}
            onAdd={() => setCreating(stage)}
          />
        ))}
      </div>

      {items.length === 0 && (
        <p className="mt-4 text-center text-sm text-ink-subtle">
          Belum ada prospek. Tambahkan lewat tombol di kepala kolom mana pun.
        </p>
      )}

      {items.length > 0 && onlyDue && dueCount === 0 && (
        <p className="mt-4 text-center text-sm text-ink-subtle">
          Tidak ada follow-up yang jatuh tempo hari ini. Semua terkejar.
        </p>
      )}

      <DragOverlay>
        {activeProspect && (
          <div className="rotate-2 cursor-grabbing rounded-sm border border-line bg-surface p-2.5 shadow-lg">
            <ProspectCardBody prospect={activeProspect} today={today} />
          </div>
        )}
      </DragOverlay>

      <Modal open={creating !== null} onClose={closeCreate} title="Prospek Baru">
        {/* `key` memaksa form dibuat ulang tiap kali dibuka dari kolom yang
            berbeda: React mengabaikan defaultValue pada input yang sudah
            ter-mount, jadi tanpa ini tahapnya tertinggal di pilihan lama. */}
        {creating !== null && (
          <ProspectForm
            key={creating}
            action={createProspect}
            members={members}
            defaultStage={creating}
            defaultOwnerId={currentUserId ?? undefined}
            onDone={closeCreate}
          />
        )}
      </Modal>

      <Modal open={editing !== null} onClose={closeEdit} title="Detail Prospek">
        {editing && (
          <>
            <ContactLinks prospect={editing} />
            {isOpenStage(editing.stage) && (
              <CloseButtons
                onWin={() => setClosing({ id: editing.id, stage: "menang" })}
                onLose={() => setClosing({ id: editing.id, stage: "kalah" })}
              />
            )}
            <ProspectForm
              key={editing.id}
              action={updateProspect.bind(null, editing.id)}
              initial={editing}
              members={members}
              onDone={closeEdit}
            />
            <div className="mt-4 border-t border-line pt-3">
              <DeleteProspectButton
                prospectId={editing.id}
                name={editing.name}
                onDeleted={closeEdit}
              />
            </div>
          </>
        )}
      </Modal>

      <WinProspectDialog
        prospect={closing?.stage === "menang" ? closingProspect : null}
        // Tanggal Jakarta dari server, sama seperti sorotan follow-up di
        // kartu: prasetel "mulai kontrak" tidak boleh ikut jam browser.
        today={today}
        onClose={closeGate}
        onDone={() => {
          setClosing(null);
          setEditingId(null);
        }}
      />
      <LoseProspectDialog
        prospect={closing?.stage === "kalah" ? closingProspect : null}
        onClose={closeGate}
        onDone={() => {
          setClosing(null);
          setEditingId(null);
        }}
      />
    </DndContext>
  );
}

/**
 * Saringan "follow-up jatuh tempo" di kepala tab (PRD v3.0 §2.7).
 *
 * Satu tombol, bukan sederet kotak centang: pertanyaannya tiap pagi cuma
 * satu — "hari ini siapa yang harus dihubungi?" — dan jawabannya sudah
 * lengkap begitu papannya menyisakan mereka saja. Angka di sebelahnya tetap
 * terbaca walau filternya mati, jadi tombol ini juga berfungsi sebagai
 * pemberitahuan kecil bahwa ada yang menunggu.
 */
function FollowUpFilter({
  active,
  count,
  onToggle,
}: {
  active: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`btn text-sm ${active ? "btn-primary" : "btn-ghost"}`}
      >
        {active ? "⏰ Hanya follow-up hari ini" : "⏰ Follow-up jatuh tempo"}
        <span
          className={`ml-1.5 font-mono text-xs ${
            active
              ? "text-ink-inverse/70"
              : count > 0
                ? "text-danger"
                : "text-ink-subtle"
          }`}
        >
          {count}
        </span>
      </button>
      {active && (
        <span className="text-xs text-ink-subtle">
          Kartu lain disembunyikan sementara.
        </span>
      )}
    </div>
  );
}

/**
 * Dua tombol penutup di modal detail — jalan masuk kedua ke gerbang yang
 * sama, untuk yang lebih suka membuka kartunya daripada menyeretnya (dan
 * untuk HP, di mana kolom Menang/Kalah terlipat sejak awal).
 */
function CloseButtons({
  onWin,
  onLose,
}: {
  onWin: () => void;
  onLose: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 border-b border-line pb-4">
      <button type="button" className="btn btn-primary text-sm" onClick={onWin}>
        Tandai Menang
      </button>
      <button type="button" className="btn btn-ghost text-sm" onClick={onLose}>
        Tandai Kalah
      </button>
    </div>
  );
}

/** Tombol tambah di kepala halaman — perlu client karena membuka modal. */
export function NewProspectButton({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        className="btn btn-accent flex-1 sm:flex-none"
        onClick={() => setOpen(true)}
      >
        + Prospek Baru
      </button>
      <Modal open={open} onClose={close} title="Prospek Baru">
        {open && (
          <ProspectForm
            action={createProspect}
            members={members}
            defaultOwnerId={currentUserId ?? undefined}
            onDone={close}
          />
        )}
      </Modal>
    </>
  );
}

function Column({
  stage,
  prospects,
  today,
  onOpen,
  onAdd,
}: {
  stage: ProspectStage;
  prospects: ProspectWithRelations[];
  today: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const tint = PROSPECT_STAGE_TINT[stage];

  // Di HP kelima kolom berbaris ke bawah, jadi papannya panjang. "Menang"
  // dan "Kalah" adalah arsip — dilipat sejak awal supaya tiga kolom yang
  // benar-benar dikerjakan tiap hari muat dalam satu-dua gulungan. Pola yang
  // sama dipakai kolom "Selesai" di papan tugas.
  const [collapsed, setCollapsed] = useState(
    stage === "menang" || stage === "kalah",
  );

  return (
    <section className="flex flex-col">
      <header
        className="flex items-center gap-2 border-b border-line px-3 py-2.5"
        style={{ backgroundColor: tint.header }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center justify-center gap-2 md:pointer-events-none"
        >
          <span className="text-sm font-medium text-ink">
            {PROSPECT_STAGE_LABEL[stage]}
          </span>
          <span className="font-mono text-[11px] text-ink-muted">
            {prospects.length}
          </span>
          {/* Segitiga, bukan "+/−" seperti papan tugas: di sini tombol
              tambah bersebelahan dengannya, dan dua "+" berdampingan
              membuat keduanya terbaca sebagai tombol yang sama. */}
          <span className="ml-auto font-mono text-[10px] text-ink-muted md:hidden">
            {collapsed ? "▸" : "▾"}
          </span>
        </button>
        {/* Tidak di kolom Menang & Kalah: prospek tidak lahir dalam keadaan
            sudah selesai. Yang sudah telanjur ditutup sebelum tercatat tetap
            dimasukkan di kolom berjalan dulu, lalu ditutup lewat gerbangnya —
            kalau tidak, tombol ini jadi jalan membuat prospek "menang" yang
            tidak punya klien. */}
        {isOpenStage(stage) && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Tambah prospek di ${PROSPECT_STAGE_LABEL[stage]}`}
            title={`Tambah prospek di ${PROSPECT_STAGE_LABEL[stage]}`}
            className="shrink-0 rounded px-1.5 text-base leading-none text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
          >
            +
          </button>
        )}
      </header>

      <div
        ref={setNodeRef}
        // Kolom yang terlipat tetap ter-render (cuma disembunyikan di HP)
        // supaya tetap bisa jadi tujuan seretan di layar lebar.
        className={`flex flex-1 flex-col p-2.5 transition-colors ${
          collapsed ? "hidden md:flex" : ""
        }`}
        style={{ backgroundColor: isOver ? tint.header : tint.body }}
      >
        <SortableContext
          items={prospects.map((prospect) => prospect.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex min-h-20 flex-1 flex-col gap-2">
            {prospects.map((prospect) => (
              <SortableProspectCard
                key={prospect.id}
                prospect={prospect}
                today={today}
                onOpen={() => onOpen(prospect.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </div>
    </section>
  );
}

/**
 * Nomor dan email yang bisa langsung ditekan, di kepala modal detail.
 *
 * Tanpa ini, follow-up berarti menyalin nomor dari form lalu berpindah
 * aplikasi sendiri — padahal itu satu-satunya hal yang benar-benar dilakukan
 * dengan data prospek setiap hari.
 */
function ContactLinks({ prospect }: { prospect: ProspectWithRelations }) {
  const wa = whatsappLink(prospect.contact_phone);
  if (!wa && !prospect.contact_email) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost text-sm"
        >
          WhatsApp {prospect.contact_phone}
        </a>
      )}
      {prospect.contact_email && (
        <a
          href={`mailto:${prospect.contact_email}`}
          className="btn btn-ghost text-sm"
        >
          Email
        </a>
      )}
    </div>
  );
}

function DeleteProspectButton({
  prospectId,
  name,
  onDeleted,
}: {
  prospectId: string;
  name: string;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmButton
      disabled={pending}
      className="text-sm text-danger hover:underline disabled:opacity-50"
      title={`Hapus prospek "${name}"?`}
      message="Riwayat tahapnya ikut hilang. Prospek yang batal sebaiknya ditandai Kalah, bukan dihapus — supaya tetap terbaca kenapa tidak jadi."
      onConfirm={() =>
        startTransition(async () => {
          await deleteProspect(prospectId);
          onDeleted();
        })
      }
    >
      {pending ? "Menghapus…" : "Hapus prospek ini"}
    </ConfirmButton>
  );
}

/**
 * Urutan kartu di dalam satu kolom.
 *
 * Kolom yang masih berjalan diurutkan dari follow-up paling mendesak: yang
 * tanggalnya paling dekat di atas, yang belum punya tanggal di bawah (bukan
 * di atas — tidak adanya tanggal berarti tidak ada yang jatuh tempo, bukan
 * jatuh tempo hari ini). Kolom Menang/Kalah sudah tidak menuntut follow-up,
 * jadi yang paling berguna di sana adalah yang paling baru ditutup.
 */
function sortForStage(stage: ProspectStage) {
  const closed = stage === "menang" || stage === "kalah";

  return (a: ProspectWithRelations, b: ProspectWithRelations) => {
    if (closed) return b.updated_at.localeCompare(a.updated_at);

    const left = a.next_follow_up_date;
    const right = b.next_follow_up_date;
    if (left !== right) {
      if (left === null) return 1;
      if (right === null) return -1;
      return left.localeCompare(right);
    }
    return b.created_at.localeCompare(a.created_at);
  };
}
