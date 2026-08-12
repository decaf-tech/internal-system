"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Tombol pilih berkas yang tahu bedanya laptop dan HP.
 *
 * `<input type="file">` polos membuka penjelajah berkas — di laptop itu
 * memang yang dimaui, tapi di HP berkas yang mau diunggah hampir selalu
 * foto: struk yang baru difoto, tangkapan layar chat klien, foto papan
 * tulis sehabis rapat. Menyuruh orang menyusuri folder `Download` untuk
 * menemukannya adalah jalan memutar yang tidak perlu.
 *
 * Jadi di layar sentuh, satu ketukan memunculkan tiga pilihan — kamera,
 * galeri, berkas — dan barulah `accept`/`capture` yang sesuai dipasang di
 * input sebelum dibuka. Atribut itu tidak bisa dipasang permanen: `capture`
 * yang menempel membuat galeri tidak bisa dibuka sama sekali, dan
 * `accept="image/*"` menutup pintu untuk PDF invoice.
 *
 * Di layar berkursor tidak ada lembar pilihan sama sekali — ketukannya
 * langsung membuka dialog berkas, persis seperti sebelumnya.
 */
type Source = "camera" | "gallery" | "file";

const SOURCES: {
  key: Source;
  label: string;
  hint: string;
  accept: string;
  capture?: "environment";
  Icon: () => React.ReactElement;
}[] = [
  {
    key: "camera",
    label: "Ambil Foto",
    hint: "Buka kamera sekarang",
    accept: "image/*",
    capture: "environment",
    Icon: IconCamera,
  },
  {
    key: "gallery",
    label: "Galeri Foto",
    hint: "Pilih dari foto yang sudah ada",
    accept: "image/*",
    Icon: IconPhoto,
  },
  {
    key: "file",
    label: "Berkas",
    hint: "PDF, dokumen, apa saja",
    accept: "",
    Icon: IconFile,
  },
];

/**
 * Apakah perangkatnya digerakkan jari, bukan kursor.
 *
 * `matchMedia` adalah keadaan yang hidup di luar React, jadi dilanggan
 * lewat `useSyncExternalStore` — bukan disalin ke state lewat efek.
 * Bedanya bukan cuma gaya: di server snapshotnya selalu `false`, jadi
 * HTML dari server dan render pertama di browser dijamin sama, dan
 * React tidak perlu merender dua kali untuk sampai ke nilai yang benar.
 */
const TOUCH_QUERY = "(pointer: coarse)";

function subscribeTouch(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useTouchDevice() {
  return useSyncExternalStore(
    subscribeTouch,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );
}

export function FilePickButton({
  onFiles,
  children,
  className = "btn btn-accent",
  multiple = false,
  disabled = false,
  /** Judul lembar pilihan di HP. */
  sheetTitle = "Ambil berkas dari",
}: {
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
  sheetTitle?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const touch = useTouchDevice();
  const [sheet, setSheet] = useState(false);

  function open(source?: Source) {
    const input = inputRef.current;
    if (!input) return;

    const chosen = source ? SOURCES.find((item) => item.key === source) : null;

    if (chosen?.accept) input.setAttribute("accept", chosen.accept);
    else input.removeAttribute("accept");

    if (chosen?.capture) input.setAttribute("capture", chosen.capture);
    else input.removeAttribute("capture");

    // Kamera cuma mengembalikan satu bidikan; memaksa `multiple` di situ
    // membingungkan sebagian Android.
    input.multiple = multiple && source !== "camera";

    input.click();
  }

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        onClick={() => (touch ? setSheet(true) : open())}
      >
        {children}
      </button>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // Dikosongkan supaya berkas yang sama bisa dipilih lagi kalau
          // unggahan pertamanya gagal.
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />

      {sheet && (
        <SourceSheet
          title={sheetTitle}
          onClose={() => setSheet(false)}
          onPick={(source) => {
            setSheet(false);
            open(source);
          }}
        />
      )}
    </>
  );
}

/**
 * Lembar pilihan yang naik dari bawah layar — bukan menu melayang di dekat
 * tombolnya. Tombol unggah sering berada di ujung atas halaman, dan menu
 * yang muncul di situ menuntut jempol menyeberangi seluruh layar untuk
 * memilih. Yang di bawah tidak.
 */
function SourceSheet({
  title,
  onPick,
  onClose,
}: {
  title: string;
  onPick: (source: Source) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.querySelector("button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-t-xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg"
      >
        {/* Batang kecil di kepala lembar — penanda yang sudah dikenal
            semua orang bahwa ini bisa ditutup. */}
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>

        <p className="eyebrow px-5 pt-3 pb-1">{title}</p>

        <ul className="px-2 pb-2">
          {SOURCES.map(({ key, label, hint, Icon }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => onPick(key)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left active:bg-surface-muted"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-ink-subtle">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md py-3 text-sm text-ink-muted active:bg-surface-muted"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconCamera() {
  return (
    <svg {...iconProps}>
      <path d="M2.5 6.5A1.5 1.5 0 014 5h1.8l1-1.5h4.4l1 1.5H16a1.5 1.5 0 011.5 1.5v8A1.5 1.5 0 0116 16.5H4A1.5 1.5 0 012.5 15v-8.5z" />
      <circle cx="10" cy="10.5" r="3" />
    </svg>
  );
}

function IconPhoto() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <circle cx="7" cy="8" r="1.3" />
      <path d="M3 13.5l4-3.5 3.5 3 2.5-2 4 3.5" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg {...iconProps}>
      <path d="M11.5 2.5H6A1.5 1.5 0 004.5 4v12A1.5 1.5 0 006 17.5h8a1.5 1.5 0 001.5-1.5V6.5l-4-4z" />
      <path d="M11.5 2.5v4h4" />
    </svg>
  );
}
