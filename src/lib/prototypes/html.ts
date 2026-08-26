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
 * domain seperti tempatnya di-build. Tiga kebiasaan build harus dijembatani,
 * dan masing-masing butuh alat yang berbeda:
 *
 *  1. Path RELATIF (`href="style.css"`) — ditangani `<base>`.
 *
 *  2. Path ROOT-ABSOLUTE di dalam HTML (`src="/assets/index.js"`) —
 *     `<base>` tidak berpengaruh, karena garis miring di depan berarti
 *     "dari akar domain". Ditangani `rewriteAbsolutePaths` di server.
 *
 *  3. Path ROOT-ABSOLUTE yang dirakit JAVASCRIPT saat berjalan — menu yang
 *     dibangun lewat `innerHTML`, `fetch("/data.json")`. Tidak terlihat
 *     sama sekali oleh nomor 2, karena saat HTML dikirim path itu belum
 *     ada; ia baru lahir di browser. Ditangani `runtimeShim` di bawah.
 *
 * Nomor 3 awalnya sengaja dibiarkan terbuka sebagai batas yang jujur, dengan
 * alasan "menulis ulang isi berkas JS hasilnya tebakan". Prototipe sungguhan
 * yang pertama masuk langsung menabraknya: seluruh menu sampingnya dirakit
 * `app.js` dengan `href="/index.html"`, jadi setiap tautan navigasi mendarat
 * di akar decaf.id. Shim itu menyelesaikannya tanpa menyentuh isi berkas JS
 * sama sekali — yang diperbaiki adalah HASILNYA di DOM, bukan sumbernya.
 *
 * @param rootPath  akar prototipe tanpa garis miring akhir, mis. `/p/toko`
 * @param basePath  folder dokumen yang sedang disajikan, dengan garis miring
 *                  akhir, mis. `/p/toko/hr/attendance/`
 */
export function prepareHtml(
  html: string,
  rootPath: string,
  basePath: string,
): string {
  // Urutannya mengikat, dan pernah salah sekali: penulisan ulang path
  // absolut harus SELESAI sebelum apa pun milik kita disisipkan. Kalau
  // `<base href="/p/slug/">` masuk lebih dulu, ia sendiri ikut terbelokkan
  // jadi `/p/slug/p/slug/` — dan setiap aset ber-path relatif di seluruh
  // prototipe berakhir 404. Hal yang sama berlaku untuk logo di badge.
  return injectBadge(
    injectHead(rewriteAbsolutePaths(html, rootPath), rootPath, basePath),
  );
}

/**
 * Sisipkan `<base>`, `<meta name="robots">`, dan shim runtime di awal
 * `<head>`.
 *
 * `<base>` harus mendahului tag mana pun yang memuat sesuatu — begitu
 * browser bertemu `<link href="style.css">`, URL-nya sudah diselesaikan,
 * dan `<base>` yang datang belakangan tidak menariknya kembali. Shim juga
 * harus di sini, sebelum skrip prototipe mana pun sempat jalan.
 *
 * Nilai `<base>` adalah folder DOKUMEN YANG SEDANG DISAJIKAN, bukan akar
 * prototipe. Untuk `hr/attendance/index.html`, sebuah `href="../people/"`
 * di dalamnya harus diselesaikan dari `hr/attendance/`, persis seperti
 * kalau prototipe itu dihosting di akar domainnya sendiri. Memasang akar
 * prototipe di sini akan membuat setiap tautan relatif di sub-folder
 * meleset sejauh kedalaman foldernya.
 *
 * `noindex` di sini adalah lapis kedua; lapis utamanya header
 * `X-Robots-Tag` di route penyaji. Keduanya ada karena keduanya gagal
 * dengan cara berbeda: header hilang kalau halamannya disimpan lalu
 * disajikan ulang dari tempat lain, meta hilang kalau yang dibaca crawler
 * cuma header respons.
 */
function injectHead(html: string, rootPath: string, basePath: string): string {
  const tags =
    `<base href="${escapeAttribute(basePath)}">` +
    `<meta name="robots" content="noindex, nofollow">` +
    runtimeShim(rootPath);

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
 * `<rootPath>/x`.
 *
 * Dibatasi pada nilai yang diawali TEPAT satu garis miring: `//cdn.tld/x`
 * adalah URL protocol-relative ke host lain, dan menulis ulangnya akan
 * mengubah alamat orang lain jadi path lokal yang tidak ada.
 */
function rewriteAbsolutePaths(html: string, rootPath: string): string {
  return html
    .replace(
      /\b(src|href|poster|action|data-src)=(["'])\/(?!\/)([^"']*)\2/gi,
      (_match, attribute, quote, rest) =>
        `${attribute}=${quote}${rootPath}/${rest}${quote}`,
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
              (_m, space: string) => `${space}${rootPath}/`,
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
 * Skrip kecil yang membetulkan path root-absolute yang lahir SETELAH
 * halaman dikirim.
 *
 * Cara kerjanya sengaja bukan "tulis ulang berkas JS-nya", melainkan
 * mengamati DOM: sebuah `MutationObserver` menangkap setiap elemen yang
 * masuk atau atribut yang berubah, lalu membetulkan `href`/`src`-nya di
 * tempat. Itu yang membuatnya bekerja untuk menu yang dirakit `innerHTML`
 * tanpa perlu menebak-nebak isi kode orang. `fetch` dan `XMLHttpRequest`
 * ikut dibungkus untuk permintaan data yang jalurnya absolut.
 *
 * Pemasangannya idempoten — nilai yang sudah berawalan `rootPath`
 * dikembalikan apa adanya, jadi `setAttribute` di dalam observer tidak
 * memicu putaran tak berujung lewat mutasi yang ia sebabkan sendiri.
 *
 * Badge Decaf dikecualikan: logonya menunjuk `/brand/logo-icon.png` milik
 * aplikasi ini, bukan milik prototipe, dan tanpa pengecualian ini shim akan
 * dengan patuh membelokkannya ke dalam folder prototipe lalu menampilkan
 * gambar rusak di setiap halaman.
 *
 * Yang tetap di luar jangkauan: penugasan langsung ke `location.href` dan
 * `window.open` (keduanya tidak bisa dicegat tanpa mengambil alih navigasi),
 * serta prototipe yang memasang Content-Security-Policy ketat lewat `<meta>`
 * — skrip sebaris akan diblokir CSP-nya sendiri.
 */
function runtimeShim(rootPath: string): string {
  const root = JSON.stringify(rootPath);

  return `<script>(function(){
var R=${root};
function fix(v){
if(typeof v!=="string"||v.charCodeAt(0)!==47)return v;
if(v.charCodeAt(1)===47)return v;
if(v===R||v.lastIndexOf(R+"/",0)===0)return v;
return R+v;}
var A=["href","src","poster","action","data-src","formaction"];
function fixEl(el){
if(!el||el.nodeType!==1||!el.getAttribute)return;
if(el.closest&&el.closest("#${BADGE_ID}"))return;
for(var i=0;i<A.length;i++){var k=A[i],v=el.getAttribute(k);
if(v!=null){var n=fix(v);if(n!==v)el.setAttribute(k,n);}}
var s=el.getAttribute("srcset");
if(s){var n2=s.split(",").map(function(p){
return p.replace(/^(\\s*)\\/(?!\\/)/,function(m,sp){return sp+R+"/";});}).join(",");
if(n2!==s)el.setAttribute("srcset",n2);}}
function scan(n){
if(!n)return;fixEl(n);
if(n.querySelectorAll){var l=n.querySelectorAll("[href],[src],[srcset],[poster],[action],[data-src],[formaction]");
for(var i=0;i<l.length;i++)fixEl(l[i]);}}
new MutationObserver(function(ms){
for(var i=0;i<ms.length;i++){var m=ms[i];
if(m.type==="attributes")fixEl(m.target);
else for(var j=0;j<m.addedNodes.length;j++)scan(m.addedNodes[j]);}
}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:A.concat(["srcset"])});
if(window.fetch){var of=window.fetch;window.fetch=function(i,o){
if(typeof i==="string")i=fix(i);
else if(i&&typeof i.url==="string"){var u=fix(i.url);if(u!==i.url)i=new Request(u,i);}
return of.call(this,i,o);};}
var ox=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(){
if(arguments.length>1)arguments[1]=fix(arguments[1]);
return ox.apply(this,arguments);};
})();</script>`;
}

/**
 * Tempelkan tanda "Prototipe oleh Decaf" di pojok kanan bawah.
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
 * ini. Penulisan ulang di server sudah selesai sebelum badge disisipkan,
 * dan shim runtime mengecualikan seluruh isi badge — jadi path ini tidak
 * ikut dibelokkan ke folder prototipe dari sisi mana pun.
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
