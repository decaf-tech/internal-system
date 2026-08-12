"use client";

import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { renderMarkdown } from "@/lib/markdown";

/**
 * Editor teks untuk catatan & notulen.
 *
 * Yang diketik adalah Markdown, yang tersimpan adalah Markdown — tombol di
 * bilah atas menyisipkan penandanya, bukan menyembunyikannya. Ini pilihan
 * sadar dan bukan jalan pintas: editor WYSIWYG (contenteditable) berarti
 * menerima HTML sembarang dari clipboard, mengurusi `execCommand` yang
 * sudah deprecated, dan menyimpan markup yang harus disanitasi tiap kali
 * dibaca. Dengan Markdown, tulisan yang ditempel dari WhatsApp atau Google
 * Docs masuk sebagai teks apa adanya — dan itu justru yang diinginkan saat
 * menyalin poin rapat.
 *
 * Yang tetap harus terasa seperti editor sungguhan ditangani di sini:
 * seleksi yang tidak lompat setelah tombol ditekan, daftar yang menyambung
 * sendiri saat Enter, dan pratinjau yang ikut berubah sambil diketik.
 *
 * Pratinjaunya bersisian, bukan bergantian, di layar yang cukup lebar —
 * lihat komentar di `useWideScreen` untuk kenapa itu tidak berlaku di HP.
 */
type BlockStyle = {
  /** Penanda yang disisipkan. Diberi nomor baris untuk daftar bernomor. */
  prefix: (index: number) => string;
  /** Penanda yang dianggap "sudah bergaya ini" — dipakai untuk melepas. */
  matches: RegExp;
  /** Kutipan tidak melepas penanda lama; sisanya melepas. */
  keepsExisting?: boolean;
};

/** Semua penanda blok yang dikenal — dilepas saat baris berganti jenis. */
const ANY_BLOCK =
  /^\s*(?:#{1,4}\s+|[-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+[.)]\s+|>\s?)/;

const BLOCK_STYLES: Record<string, BlockStyle> = {
  heading: {
    prefix: () => "## ",
    matches: /^\s*#{1,4}\s+/,
  },
  bullet: {
    prefix: () => "- ",
    // Butir checklist juga diawali "- ", jadi harus dikecualikan di sini —
    // kalau tidak, tombol daftar akan menganggap checklist sebagai "sudah
    // bergaya ini" dan justru melepasnya jadi "[ ] Kirim invoice".
    matches: /^\s*[-*]\s+(?!\[[ xX]\]\s)/,
  },
  numbered: {
    prefix: (index: number) => `${index + 1}. `,
    matches: /^\s*\d+[.)]\s+/,
  },
  check: {
    prefix: () => "- [ ] ",
    matches: /^\s*[-*]\s+\[[ xX]\]\s+/,
  },
  quote: {
    prefix: () => "> ",
    matches: /^\s*>\s?/,
    keepsExisting: true,
  },
};

/**
 * Lebar minimum kotak editor sebelum dibagi dua, dalam piksel. Di bawah
 * ini tiap kolom tinggal ~45 karakter per baris — teknisnya "bersisian",
 * praktiknya dua kolom yang sama-sama sesak.
 */
const SPLIT_MIN_WIDTH = 832;

/**
 * Apakah kotak editornya cukup lebar untuk dua kolom.
 *
 * Yang diukur lebar elemennya sendiri, bukan lebar layar. Editor ini
 * duduk di dalam kartu ber-`max-w`, jadi layar 1440px tidak berarti
 * editornya 1440px — dan `matchMedia` tidak tahu bedanya. Kalau kelak
 * dipasang di kolom sempit (panel samping, modal), pratinjaunya akan
 * bergantian di situ tanpa ada yang perlu diubah di sini.
 */
function useSplitCapable(ref: React.RefObject<HTMLElement | null>) {
  // Dimulai dari false, jadi render pertama di browser sama persis dengan
  // HTML dari server — pengukuran baru masuk setelahnya.
  const [capable, setCapable] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setCapable(entry.contentRect.width >= SPLIT_MIN_WIDTH);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return capable;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  autoFocus = false,
  minHeight = "24rem",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  minHeight?: string;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const wide = useSplitCapable(frameRef);

  // "split" cuma berlaku di layar lebar; kalau layarnya menyempit
  // (jendela dikecilkan, HP diputar tegak) yang tampil jatuh balik ke
  // menulis saja, tanpa perlu state kedua yang harus ikut disinkronkan.
  const [mode, setMode] = useState<"write" | "preview" | "split">("split");
  const showEditor = mode !== "preview";
  const showPreview = mode === "preview" || (mode === "split" && wide);

  // Isi pratinjau tertinggal satu tarikan napas di belakang ketikan saat
  // React sedang sibuk. Tanpa ini, tiap huruf yang diketik di notulen
  // panjang memaksa parser Markdown berjalan ulang sebelum huruf itu
  // sendiri sempat tergambar — dan yang terasa adalah ketikan yang berat.
  const previewSource = useDeferredValue(value);
  const html = useMemo(
    () =>
      previewSource.trim().length > 0
        ? renderMarkdown(previewSource)
        : `<p class="empty">Belum ada isi.</p>`,
    [previewSource],
  );

  // Posisi kursor yang harus dipulihkan setelah render berikutnya. Nilai
  // textarea dikendalikan induk, jadi setiap perubahan membuat React
  // menulis ulang isinya — dan browser memindahkan kursor ke ujung kalau
  // tidak dikembalikan sendiri.
  const pendingSelection = useRef<[number, number] | null>(null);

  useLayoutEffect(() => {
    const area = areaRef.current;
    const selection = pendingSelection.current;
    if (!area || !selection) return;

    pendingSelection.current = null;
    area.focus();
    area.setSelectionRange(selection[0], selection[1]);
  });

  // Tumbuh mengikuti isi, supaya yang menggulir adalah halaman — bukan
  // kotak di dalam halaman. Menulis notulen panjang di dalam jendela
  // setinggi 300px membuat orang kehilangan tempat setiap kali menengok
  // ke atas.
  useEffect(() => {
    const area = areaRef.current;
    if (!area || !showEditor) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }, [value, showEditor]);

  function apply(next: string, selectionStart: number, selectionEnd: number) {
    pendingSelection.current = [selectionStart, selectionEnd];
    onChange(next);
  }

  /** Bungkus teks terpilih (tebal, miring, kode). Menekan lagi melepasnya. */
  function wrap(marker: string) {
    const area = areaRef.current;
    if (!area) return;

    const { selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end);
    const width = marker.length;

    const alreadyWrapped =
      value.slice(start - width, start) === marker &&
      value.slice(end, end + width) === marker;

    if (alreadyWrapped) {
      const next =
        value.slice(0, start - width) + selected + value.slice(end + width);
      apply(next, start - width, end - width);
      return;
    }

    const next =
      value.slice(0, start) + marker + selected + marker + value.slice(end);
    // Tanpa seleksi, kursor mendarat di antara kedua penanda — langsung
    // bisa mengetik isinya.
    apply(next, start + width, end + width);
  }

  /**
   * Ubah jenis blok tiap baris yang tersentuh seleksi.
   *
   * Bukan sekadar menempelkan awalan di depan. Menandai tiga butir daftar
   * sebagai tindak lanjut adalah gerakan yang wajar dan sering — dan kalau
   * tombolnya cuma menempel, hasilnya "- [ ] - Kirim invoice". Jadi
   * penanda blok yang sudah ada dilepas dulu, dan menekan tombol yang
   * sama dua kali mengembalikannya jadi paragraf biasa.
   */
  function setBlock(style: BlockStyle) {
    const area = areaRef.current;
    if (!area) return;

    const { selectionStart: start, selectionEnd: end } = area;
    const from = value.lastIndexOf("\n", start - 1) + 1;
    const toIndex = value.indexOf("\n", end);
    const to = toIndex === -1 ? value.length : toIndex;

    const lines = value.slice(from, to).split("\n");
    const stripping = lines.every((line) => style.matches.test(line));

    const rebuilt = lines
      .map((line, index) => {
        if (stripping) return line.replace(style.matches, "");
        // Kutipan boleh membungkus daftar ("> - poin"), jadi hanya itu
        // yang menyisakan penanda lama.
        const bare = style.keepsExisting ? line : line.replace(ANY_BLOCK, "");
        return style.prefix(index) + bare;
      })
      .join("\n");

    const next = value.slice(0, from) + rebuilt + value.slice(to);
    apply(next, from, from + rebuilt.length);
  }

  function insertLink() {
    const area = areaRef.current;
    if (!area) return;

    const { selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end) || "teks tautan";
    const snippet = `[${selected}](https://)`;
    const next = value.slice(0, start) + snippet + value.slice(end);

    // Kursor mendarat tepat setelah "https://" — bagian yang pasti perlu
    // diketik, sementara label sudah benar.
    const caret = start + snippet.length - 1;
    apply(next, caret, caret);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const meta = event.metaKey || event.ctrlKey;

    if (meta && event.key.toLowerCase() === "b") {
      event.preventDefault();
      wrap("**");
      return;
    }
    if (meta && event.key.toLowerCase() === "i") {
      event.preventDefault();
      wrap("*");
      return;
    }

    if (event.key !== "Enter" || event.shiftKey || meta) return;

    // Menyambung daftar. Mengetik lima poin rapat lalu harus mengetik "- "
    // lima kali adalah gesekan yang membuat orang berhenti memakai daftar
    // sama sekali.
    const area = event.currentTarget;
    const start = area.selectionStart;
    if (start !== area.selectionEnd) return;

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const line = value.slice(lineStart, start);

    const marker = /^(\s*)(?:([-*])\s+(\[[ xX]\]\s+)?|(\d+)[.)]\s+)/.exec(line);
    if (!marker) return;

    const [matched, indent, bullet, checkbox, number] = marker;

    // Baris daftar yang isinya kosong berarti "sudah selesai berdaftar" —
    // Enter di situ menutup daftarnya, bukan menambah butir kosong lagi.
    if (line.trim() === matched.trim()) {
      event.preventDefault();
      const next = value.slice(0, lineStart) + value.slice(start);
      apply(next, lineStart, lineStart);
      return;
    }

    const nextMarker = bullet
      ? `${indent}${bullet} ${checkbox ? "[ ] " : ""}`
      : `${indent}${Number(number) + 1}. `;

    event.preventDefault();
    const next = value.slice(0, start) + "\n" + nextMarker + value.slice(start);
    const caret = start + 1 + nextMarker.length;
    apply(next, caret, caret);
  }

  return (
    <div
      ref={frameRef}
      className="overflow-hidden rounded-md border border-line-strong bg-surface"
    >
      {/* Deretan alat menggulir sendiri di layar sempit, tapi pengalih
          tampilan tetap menempel di kanan — kalau ikut menggulir, tombol
          yang paling sering dicari justru yang tersembunyi di HP. */}
      <div className="flex items-center border-b border-line bg-surface-muted pr-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1.5 py-1">
          <ToolButton
            label="Judul"
            hint="Judul bagian"
            onClick={() => setBlock(BLOCK_STYLES.heading)}
          >
            H
          </ToolButton>
          <ToolButton label="Tebal" hint="Tebal (⌘B)" onClick={() => wrap("**")}>
            <span className="font-bold">B</span>
          </ToolButton>
          <ToolButton label="Miring" hint="Miring (⌘I)" onClick={() => wrap("*")}>
            <span className="font-serif italic">I</span>
          </ToolButton>

          <Divider />

          <ToolButton
            label="Daftar"
            hint="Daftar berbutir"
            onClick={() => setBlock(BLOCK_STYLES.bullet)}
          >
            <IconBullets />
          </ToolButton>
          <ToolButton
            label="Daftar bernomor"
            hint="Daftar bernomor"
            onClick={() => setBlock(BLOCK_STYLES.numbered)}
          >
            <IconNumbers />
          </ToolButton>
          <ToolButton
            label="Checklist"
            hint="Checklist / tindak lanjut"
            onClick={() => setBlock(BLOCK_STYLES.check)}
          >
            <IconCheckbox />
          </ToolButton>

          <Divider />

          <ToolButton
            label="Kutipan"
            hint="Kutipan"
            onClick={() => setBlock(BLOCK_STYLES.quote)}
          >
            <span className="font-serif">”</span>
          </ToolButton>
          <ToolButton label="Kode" hint="Kode" onClick={() => wrap("`")}>
            <span className="font-mono text-[11px]">{"</>"}</span>
          </ToolButton>
          <ToolButton label="Tautan" hint="Tautan" onClick={insertLink}>
            <IconLink />
          </ToolButton>
        </div>

        {/* Di layar lebar pilihannya tiga (tulis / sandingkan / baca), di
            HP cuma dua — "sandingkan" tidak ditawarkan di tempat yang
            tidak sanggup menampungnya. */}
        <div
          role="group"
          aria-label="Tampilan editor"
          className="flex shrink-0 items-center gap-0.5"
        >
          {/* Yang ditandai aktif adalah apa yang BENAR-BENAR tampil, bukan
              nilai `mode`. Di layar sempit mode "split" jatuh balik jadi
              menulis saja — dan kalau tandanya dibaca dari `mode`, tidak
              ada satu pun tombol yang menyala di situ. */}
          <ViewButton
            active={showEditor && !showPreview}
            onClick={() => setMode("write")}
          >
            Tulis
          </ViewButton>
          {wide && (
            <ViewButton
              active={showEditor && showPreview}
              onClick={() => setMode("split")}
            >
              Sandingkan
            </ViewButton>
          )}
          <ViewButton
            active={showPreview && !showEditor}
            onClick={() => setMode("preview")}
          >
            {wide ? "Hasil" : "Pratinjau"}
          </ViewButton>
        </div>
      </div>

      {/* Dua kolom yang menggulir bersama halaman, bukan masing-masing di
          dalam kotaknya sendiri: satu-satunya cara menulis dan membaca
          hasilnya tanpa dua bilah gulir yang saling berebut roda mouse. */}
      <div className={showEditor && showPreview ? "grid grid-cols-2" : ""}>
        {showEditor && (
          <textarea
            ref={areaRef}
            value={value}
            autoFocus={autoFocus}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            spellCheck
            aria-label="Isi catatan (Markdown)"
            style={{ minHeight }}
            // text-base di HP, sama alasannya dengan `.field` di
            // globals.css: huruf di bawah 16px membuat Safari iOS
            // memperbesar halaman begitu kursor masuk.
            className="block w-full resize-none bg-transparent px-4 py-3.5 text-base leading-relaxed text-ink outline-none placeholder:text-ink-subtle sm:text-sm"
          />
        )}

        {showPreview && (
          <div
            aria-live="off"
            style={{ minHeight }}
            className={`prose-note px-4 py-3.5 ${
              showEditor ? "border-l border-line bg-surface-muted/40" : ""
            }`}
            // Aman: renderMarkdown meng-escape seluruh teks sebelum menandai,
            // dan hanya menghasilkan tag miliknya sendiri. Lihat lib/markdown.ts.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}

/** Isi catatan dalam bentuk terbaca — dipakai di luar editor. */
export function MarkdownView({ content }: { content: string }) {
  return (
    <div
      className="prose-note"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

function ToolButton({
  label,
  hint,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={hint}
      aria-label={label}
      // Mencegah textarea kehilangan fokus saat tombol ditekan — tanpa ini,
      // seleksi yang mau diproses sudah hilang sebelum onClick berjalan.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      {children}
    </button>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors ${
        active
          ? "bg-ink text-ink-inverse"
          : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-line-strong" />;
}

const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconBullets() {
  return (
    <svg {...iconProps}>
      <circle cx="3" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M6.5 4h7M6.5 8h7M6.5 12h7" />
    </svg>
  );
}

function IconNumbers() {
  return (
    <svg {...iconProps}>
      <path d="M2 3.2l1-.7V6M2 10.2h2L2 12.2h2" />
      <path d="M6.5 4h7M6.5 11h7" />
    </svg>
  );
}

function IconCheckbox() {
  return (
    <svg {...iconProps}>
      <rect x="1.5" y="5" width="6" height="6" rx="1.2" />
      <path d="M3 8l1.3 1.3L6.3 6.8M10 8h4.5" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg {...iconProps}>
      <path d="M6.8 9.2a2.6 2.6 0 003.9.3l1.8-1.8a2.6 2.6 0 00-3.7-3.7l-1 1" />
      <path d="M9.2 6.8a2.6 2.6 0 00-3.9-.3L3.5 8.3a2.6 2.6 0 003.7 3.7l1-1" />
    </svg>
  );
}
