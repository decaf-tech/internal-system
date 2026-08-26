import "server-only";

/**
 * Penyesuaian HTML prototipe saat disajikan.
 *
 * Berkas di disk TIDAK pernah diubah — semua di bawah ini berlaku pada
 * salinan yang dikirim ke pengunjung. Artinya mengganti bentuk badge atau
 * memperbaiki penulisan ulang path cukup dengan deploy, tanpa perlu
 * mengunggah ulang satu pun prototipe yang sudah ada.
 */

const BADGE_ID = "decaf-prototype-badge";

/**
 * Prototipe disajikan dari sebuah sub-path (`/p/<slug>/`), bukan dari akar
 * domain seperti tempatnya di-build. Dua kebiasaan build harus dijembatani:
 *
 *  1. Path RELATIF (`href="style.css"`) — ditangani `<base>`, asalkan URL
 *     halamannya berakhir garis miring. Route penyaji yang mengurus itu
 *     lewat redirect 308.
 *
 *  2. Path ROOT-ABSOLUTE (`src="/assets/index-a1b2.js"`) — `<base>` tidak
 *     berpengaruh sama sekali di sini, karena garis miring di depan berarti
 *     "dari akar domain" dan mengabaikan base. Ini bawaan Vite dan CRA,
 *     jadi tanpa penanganan, hampir semua build React yang dijatuhkan ke
 *     sini akan tampil sebagai halaman putih. Karena itu atribut-atribut
 *     itu ditulis ulang dengan awalan prototipenya.
 *
 * Yang tidak tertutup: path absolut yang dirakit DI DALAM JavaScript saat
 * berjalan (`fetch("/api/…")`, impor dinamis yang jalurnya dihitung).
 * Menambal itu berarti menulis ulang isi berkas JS, dan hasilnya adalah
 * tebakan yang kadang benar — lebih buruk daripada batas yang jelas.
 * `warnAboutAbsolutePaths` di bawah dipakai halaman backoffice untuk
 * mengatakannya di muka, bukan membiarkannya jadi kejutan di depan klien.
 */
export function prepareHtml(html: string, basePath: string): string {
  // Urutannya mengikat, dan pernah salah sekali: penulisan ulang path
  // absolut harus SELESAI sebelum apa pun milik kita disisipkan. Kalau
  // `<base href="/p/slug/">` masuk lebih dulu, ia sendiri ikut terbelokkan
  // jadi `/p/slug/p/slug/` — dan setiap aset ber-path relatif di seluruh
  // prototipe berakhir 404. Hal yang sama berlaku untuk logo di badge.
  return injectBadge(injectHead(rewriteAbsolutePaths(html, basePath), basePath));
}

/**
 * Sisipkan `<base>` dan `<meta name="robots">` di awal `<head>`.
 *
 * `<base>` harus mendahului tag mana pun yang memuat sesuatu — begitu
 * browser bertemu `<link href="style.css">`, URL-nya sudah diselesaikan,
 * dan `<base>` yang datang belakangan tidak menariknya kembali.
 *
 * `noindex` di sini adalah lapis kedua; lapis utamanya header
 * `X-Robots-Tag` di route penyaji. Keduanya ada karena keduanya gagal
 * dengan cara berbeda: header hilang kalau halamannya disimpan lalu
 * disajikan ulang dari tempat lain, meta hilang kalau yang dibaca crawler
 * cuma header respons.
 */
function injectHead(html: string, basePath: string): string {
  const tags =
    `<base href="${escapeAttribute(basePath)}">` +
    `<meta name="robots" content="noindex, nofollow">`;

  const headMatch = html.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + tags + html.slice(at);
  }

  // HTML tanpa <head> yang tertulis eksplisit tetap sah — browser
  // membuatkannya. Sisipkan setelah <html>, atau di paling depan.
  const htmlMatch = html.match(/<html[^>]*>/i);
  if (htmlMatch?.index !== undefined) {
    const at = htmlMatch.index + htmlMatch[0].length;
    return html.slice(0, at) + tags + html.slice(at);
  }

  return tags + html;
}

/**
 * Ubah `src="/x"`, `href="/x"`, dan `srcset` yang root-absolute jadi
 * `<basePath>x`.
 *
 * Dibatasi pada nilai yang diawali TEPAT satu garis miring: `//cdn.tld/x`
 * adalah URL protocol-relative ke host lain, dan menulis ulangnya akan
 * mengubah alamat orang lain jadi path lokal yang tidak ada.
 */
function rewriteAbsolutePaths(html: string, basePath: string): string {
  const prefix = basePath.replace(/\/$/, "");

  return html
    .replace(
      /\b(src|href|poster|data-src)=(["'])\/(?!\/)([^"']*)\2/gi,
      (_match, attribute, quote, rest) =>
        `${attribute}=${quote}${prefix}/${rest}${quote}`,
    )
    .replace(
      /\b(srcset|data-srcset)=(["'])([^"']*)\2/gi,
      (match, attribute, quote, value: string) => {
        // srcset adalah daftar dipisah koma, tiap butir "URL [deskriptor]".
        const rewritten = value
          .split(",")
          .map((candidate) =>
            candidate.replace(
              /^(\s*)\/(?!\/)/,
              (_m, space: string) => `${space}${prefix}/`,
            ),
          )
          .join(",");

        return rewritten === value
          ? match
          : `${attribute}=${quote}${rewritten}${quote}`;
      },
    );
}

/**
 * Tempelkan tanda "Dibuat oleh Decaf" di pojok kanan bawah.
 *
 * Inilah alasan fitur ini ada: prototipe yang dikirim ke calon klien
 * membawa nama pembuatnya, dan tautan yang bisa diklik kembali ke
 * decaf.id.
 *
 * Dua hal yang menjaganya tetap utuh di atas CSS yang tidak kita kenal:
 * setiap properti diberi `!important`, dan seluruh pemilihnya berpangkal
 * pada satu id — sehingga aturan seperti `div { margin: 0 }` di prototipe
 * tidak menyentuhnya, dan sebaliknya tidak ada satu pun aturan di sini
 * yang bisa bocor ke elemen milik prototipe.
 *
 * Logonya dirujuk sebagai path absolut ke `public/brand/` milik aplikasi
 * ini — dan penulisan ulang di atas sudah selesai sebelum badge disisipkan,
 * jadi path ini tidak ikut dibelokkan ke folder prototipe.
 */
function injectBadge(html: string): string {
  const badge = `
<style>
#${BADGE_ID}{position:fixed!important;right:16px!important;bottom:16px!important;z-index:2147483647!important;display:flex!important;align-items:center!important;gap:8px!important;padding:8px 14px 8px 10px!important;border-radius:999px!important;background:#081f3b!important;color:#f7f9fc!important;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif!important;font-size:12px!important;line-height:1!important;font-weight:500!important;letter-spacing:0.01em!important;text-decoration:none!important;box-shadow:0 4px 16px rgba(8,31,59,.28)!important;opacity:.92!important;transition:opacity .15s ease,transform .15s ease!important;}
#${BADGE_ID}:hover{opacity:1!important;transform:translateY(-1px)!important;}
#${BADGE_ID} img{width:20px!important;height:20px!important;display:block!important;border:0!important;border-radius:0!important;}
#${BADGE_ID} span{white-space:nowrap!important;}
#${BADGE_ID} b{color:#22d3ee!important;font-weight:600!important;}
@media print{#${BADGE_ID}{display:none!important;}}
</style>
<a id="${BADGE_ID}" href="https://decaf.id" target="_blank" rel="noopener noreferrer">
<img src="/brand/logo-icon.png" alt="">
<span>Prototipe oleh <b>Decaf</b></span>
</a>`;

  const closing = html.lastIndexOf("</body>");
  if (closing !== -1) {
    return html.slice(0, closing) + badge + html.slice(closing);
  }

  // Tanpa </body> — HTML potongan, atau berkas yang ditulis tangan
  // seadanya. Tetap ditempel di akhir: browser memindahkannya ke dalam
  // body saat mengurai, dan badge yang muncul lebih baik daripada
  // halaman yang kehilangan tandanya cuma karena penutupnya lupa ditulis.
  return html + badge;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
