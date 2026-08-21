import type { SiteCopy } from "./copy";

/**
 * Seluruh teks situs publik dalam bahasa Indonesia — versi bawaan.
 *
 * Sumbernya bukan karangan baru: hampir semuanya disalin dari
 * `Pitch_Deck_Transformasi_Digital_v2.1` dan `Proposal v2.1` — dokumen yang
 * sudah dipakai 1-on-1 ke prospek — lalu disaring lewat pagar di
 * `encode-craft-brand-gtm-foundation.md`.
 *
 * Aturan yang mengikat isi berkas ini (dan padanannya di `copy-en.ts`):
 *   - **Angka dulu, kata sifat belakangan.** "0% error" menggantikan "sangat
 *     andal". Kalau sebuah klaim tidak punya angka, ia tidak masuk.
 *   - **Anti-hype.** "revolusioner", "canggih", "cutting-edge",
 *     "game-changer" haram di seluruh berkas ini.
 *   - **Yang belum selesai tidak dipajang.** `cases` cuma memuat sistem
 *     yang sudah berjalan dan angkanya bisa ditelusuri. Proyek yang masih
 *     setengah jalan menunggu di luar sampai datanya lengkap — bukan masuk
 *     dengan label "sedang berjalan".
 *
 * Jangkar seksi (`#filosofi`, `#layanan`, …) sengaja tetap berbahasa
 * Indonesia di kedua versi. Ia id elemen, bukan kalimat: menerjemahkannya
 * berarti dua set id untuk seksi yang sama, dan tiap tautan jangkar harus
 * tahu ia sedang berada di versi bahasa yang mana.
 */

export const ID: SiteCopy = {
  meta: {
    title: "Decaf Tech — Transformasi Digital yang Memanusiakan",
    description:
      "Sistem custom yang Anda miliki, bukan Anda sewa. Rekap harian jadi satu klik, error pencatatan 0%, biaya server Rp 0/bulan.",
  },

  nav: {
    links: [
      { href: "#filosofi", label: "Filosofi" },
      { href: "#layanan", label: "Layanan" },
      { href: "#portfolio", label: "Portfolio" },
      { href: "#proses", label: "Proses" },
      { href: "#kontak", label: "Kontak" },
    ],
    sections: "Bagian halaman",
    home: "Decaf Tech — ke atas halaman",
    language: "Pilih bahasa",
    cta: "Sesi gratis",
  },

  hero: {
    splashEyebrow: "Studio digital, dibuat hanya untuk Anda",
    scroll: "Scroll",
    eyebrow: "Decaf Tech · Studio Sistem Digital",
    title: {
      line1: "Transformasi digital",
      line2: "yang ",
      accent: "memanusiakan.",
    },
    lede: {
      before:
        "Teknologi tidak diciptakan untuk menggantikan manusia, melainkan untuk memperkuat kapasitasnya. Kami membangun sistem custom yang ",
      strong: "Anda miliki",
      after: " — bukan yang Anda sewa selamanya.",
    },
    ctaSecondary: "Lihat angka nyatanya",
    stats: [
      { value: "1 klik", label: "dari 30–50 menit rekap harian" },
      { value: "10–18×", label: "rekonsiliasi lebih cepat" },
      { value: "55–65%", label: "efisiensi handoff prototype" },
      { value: "6", label: "sistem live yang bisa ditelusuri" },
    ],
  },

  philosophy: {
    eyebrow: "01 · Filosofi",
    title: "Menggeser kurva produktivitas",
    body: [
      "Dalam operasional konvensional, mencapai akurasi menuntut jam-jam kerja manual. Setiap tambahan ketelitian dibayar dengan tambahan waktu — dan kurvanya naik landai.",
      "Sistem digital yang tepat menggeser kurva itu: hasil lebih tinggi, keputusan lebih tajam, waktu jauh lebih singkat.",
    ],
    empowering: {
      title: "Empowering Technology",
      body: "Teknologi yang tepat tidak menciptakan ketergantungan baru — ia melipatgandakan kapasitas yang sudah dimiliki tim Anda. Sehingga, dapat memaksimalkan dua variabel waktu dan hasil menjadi dengan waktu yang lebih singkat dapat menghasilkan hasil yang lebih baik",
    },
    // Craft dulu: empati dan pemahaman konteks masalah, baru solusinya
    // dirancang. Tech belakangan: teknologi bukan tujuan, dan tidak semua
    // masalah butuh yang paling canggih — kadang yang dibutuhkan cuma yang
    // tepat, dipadukan dengan empati dan konteks tadi.
    craft: {
      title: "Craft First, Tech Second",
      body: "Craft terlebih dahulu — empati dan pemahaman konteks atas masalah, agar solusinya turut kontekstual. Tech kemudian, karena tidak semua masalah memerlukan solusi teknologi — terkadang hanya butuh pendekatan yang tepat sudah memadai.",
    },
  },

  services: {
    eyebrow: "02 · Layanan",
    title: "Dua layanan, satu cara kerja",
    lede: "Tidak semua bisnis membutuhkan solusi yang sama. Dua layanan dengan karakter arsitektur berlawanan, masing-masing optimal di konteksnya — keduanya tetap dibangun untuk Anda miliki.",
    cta: "Mulai dari sini",
    investmentLabel: "Skema investasi",
    // Skema investasi tiap layanan dulu berdiri sebagai seksi sendiri
    // ("06 · Investasi"). Dipindah jadi field `investment` di sini karena
    // isinya memang milik kartu yang sama — pengunjung yang sudah membaca
    // "Kepemilikan" di atas seharusnya tidak perlu menggulir lima seksi
    // lagi untuk tahu skema biayanya. Satu layanan, satu kartu, satu
    // tempat baca.
    tracks: [
      {
        eyebrow: "Layanan 01 · The Kitchen",
        title: "Business Operational",
        subtitle: "Untuk dapur operasional bisnis Anda",
        tone: "night",
        rows: [
          { label: "Cocok untuk", value: "UMKM, kafe, toko ritel, kasir, gudang" },
          {
            label: "Dibangun untuk Anda",
            value:
              "Dirancang khusus untuk operasional Anda — bukan produk siap pakai yang diseragamkan",
          },
          {
            label: "Kepemilikan",
            value:
              "Sepenuhnya milik Anda sejak hari pertama, tanpa biaya berlangganan bulanan",
          },
          { label: "Data", value: "100% di kendali fisik lokasi bisnis" },
        ],
        investment: [
          "Satu kali biaya pengembangan",
          "Tanpa biaya berlangganan bulanan yang mengikat",
          "Berjalan langsung di perangkat Anda, tanpa bergantung pada layanan luar",
          "Data 100% di kendali fisik Anda",
          "Bisa dipantau dari jarak jauh kapan pun dibutuhkan",
          "Upgrade & iterasi fitur sesuai kebutuhan",
        ],
      },
      {
        eyebrow: "Layanan 02 · The Storefront",
        title: "Community & Branding",
        subtitle: "Untuk etalase digital identitas Anda",
        tone: "forest",
        rows: [
          {
            label: "Cocok untuk",
            value: "Company profile, portofolio, komunitas, branding",
          },
          {
            label: "Dibangun untuk Anda",
            value:
              "Dirancang khusus untuk cerita bisnis Anda — bukan template yang bisa dipakai siapa saja",
          },
          {
            label: "Kepemilikan",
            value: "Sepenuhnya milik Anda, tanpa biaya berlangganan yang mengikat",
          },
          {
            label: "Jangkauan",
            value: "Diakses cepat dari mana saja, sejak hari pertama live",
          },
        ],
        investment: [
          "Satu kali biaya pengembangan",
          "Tanpa biaya awal untuk skala kebutuhan umum",
          "Upgrade mandiri saat skala tumbuh",
          "Pembaruan otomatis setiap kali ada perubahan, tanpa proses manual",
          "Diakses cepat dari mana saja, sejak hari pertama live",
          "Iterasi konten tanpa perlu developer",
        ],
      },
    ],
  },

  outcomes: {
    kitchen: {
      eyebrow: "Layanan 01 · Operasional bisnis",
      title: "Apa yang Anda dapatkan",
      items: [
        {
          metric: "1-Klik",
          caption: "dari 30–50 mnt manual",
          title: "Waktu yang Kembali",
          body: "Rekapitulasi keuangan harian yang tadinya memakan 30–50 menit kerja manual kini selesai dalam satu klik. Waktu Anda kembali sepenuhnya.",
        },
        {
          metric: "0%",
          caption: "error pencatatan & stok",
          title: "Keandalan yang Terukur",
          body: "Error pada pengurangan stok dieliminasi lewat transaksi database atomik. Tidak ada lagi overselling, tidak ada salah catat harga.",
        },
        {
          metric: "Real-Time",
          caption: "wawasan keuangan & tren",
          title: "Kejelasan Seketika",
          body: "Arus kas, tren penjualan, dan rekonsiliasi tersedia seketika — tanpa menunggu akhir bulan atau proses manual berhari-hari.",
        },
      ],
    },
    // Ditulis dari sudut pandang pemilik bisnis, bukan dari sudut pandang
    // developer. CDN, skor Lighthouse, dan CMS itu nyata dan bisa diukur —
    // tapi pemilik UMKM tidak bertanya "server saya di mana", ia bertanya
    // "apakah orang bisa menemukan saya". Angkanya tetap sama, cuma
    // dijelaskan lewat akibatnya.
    storefront: {
      eyebrow: "Layanan 02 · Komunitas & branding",
      title: "Identitas digital yang berbicara untuk Anda",
      items: [
        {
          metric: "Global CDN",
          caption: "bukan cuma toko fisik Anda yang buka 24 jam",
          title: "Bisa Ditemukan dari Mana Saja",
          body: "Situs Anda disalin ke ratusan server di seluruh dunia, jadi orang di kota mana pun tetap membukanya dengan cepat — bukan cuma yang lokasinya dekat. Jangkauan bisnis Anda tidak lagi dibatasi jarak.",
        },
        {
          metric: "~100",
          caption: "skor kecepatan resmi dari Google",
          title: "Kesan Pertama yang Meyakinkan",
          body: "Orang menilai sebuah bisnis dalam detik pertama membuka situsnya. Situs yang lambat atau terasa asal jadi membuat calon pelanggan pergi sebelum sempat mengenal produk Anda — yang cepat dan rapi meyakinkan mereka untuk tinggal.",
        },
        {
          metric: "Self-CMS",
          caption: "tanpa developer, tanpa antre",
          title: "Selalu Terbaru, Tanpa Ribet",
          body: "Ubah harga, foto, atau kabar terbaru sendiri kapan pun — tanpa menghubungi developer atau menunggu giliran. Setiap orang yang mengisi form di situs Anda otomatis tercatat, jadi tidak ada calon pelanggan yang terlewat.",
        },
      ],
    },
  },

  proof: {
    eyebrow: "03 · Rekam jejak",
    title: "Angka nyata dari sistem yang aktif",
    lede: "Setiap angka berikut adalah hasil terukur dari sistem yang berjalan — bukan proyeksi, bukan klaim pemasaran. Semuanya bisa ditelusuri ke kode dan dokumentasi pengembangannya.",
    trackLabel: { kitchen: "Kitchen", storefront: "Storefront" },
    cases: [
      {
        no: "01",
        name: "Mammo's Home Bakery",
        kind: "POS & Business Management",
        meta: "Bukit Lawang, Sumatera Utara",
        before: "Pencatatan di kertas & spreadsheet. Rekapitulasi 30–50 menit/hari.",
        track: "kitchen",
        stats: [
          { value: "0%", label: "Error pengurangan stok" },
          { value: "1-klik", label: "Rekap keuangan harian" },
          { value: "0 kasus", label: "Overselling stok" },
        ],
      },
      {
        no: "02",
        name: "Diversity of Sumatra Clothes",
        kind: "Multi-Location Inventory",
        meta: "Bukit Lawang, Sumatera Utara",
        before:
          "Stok tersebar tanpa visibilitas. Staf menjual barang tanpa tahu ketersediaan.",
        track: "kitchen",
        stats: [
          { value: "→ 0", label: "Stockout pasca go-live" },
          { value: "< 2 mnt", label: "Pencatatan per transaksi" },
          { value: "0%", label: "Revenue leakage harga" },
        ],
      },
      {
        no: "03",
        name: "CS Dashboard Siswamedia",
        kind: "Enterprise Monitoring Platform",
        meta: "Jakarta",
        before:
          "WhatsApp threads & Google Sheets. Selisih keuangan baru terdeteksi akhir bulan.",
        track: "kitchen",
        stats: [
          { value: "10–18×", label: "Rekonsiliasi lebih cepat" },
          { value: "< 60 dtk", label: "Analisis AI atas data 90 hari" },
          { value: "55–65%", label: "Efisiensi handoff prototype" },
        ],
      },
      {
        no: "04",
        name: "Sadewa (Sayap Dewantara)",
        kind: "Situs + CMS + Analytics Yayasan",
        meta: "Jakarta",
        before:
          "Situs Wix statis; rekam jejak 15 tahun program pendidikan tak terdokumentasi publik.",
        track: "storefront",
        url: "sadewaind.org",
        stats: [
          {
            value: "10 angkatan",
            label:
              "15 tahun rekam jejak program kini bisa dibaca publik — bukan lagi terkubur di laporan PDF internal",
          },
          {
            value: "0 baris kode",
            label:
              "Pengurus yayasan update kabar & program sendiri, tanpa menunggu developer",
          },
          {
            value: "Rp0/bulan",
            label:
              "Tanpa biaya sewa platform bulanan — situs sepenuhnya milik yayasan",
          },
        ],
      },
      {
        no: "05",
        name: "LAKSA Bogor",
        kind: "Direktori Wisata + Backoffice Pemda",
        meta: "Bogor",
        before:
          "Konten wisata terkubur di iframe chatbot — 0 halaman bisa diindeks Google.",
        track: "storefront",
        url: "laksabogor.info",
        stats: [
          {
            value: "76 halaman",
            label:
              "Wisata Kota Bogor sekarang muncul di pencarian Google — sebelumnya 0 halaman bisa ditemukan sama sekali",
          },
          {
            value: "0 baris kode",
            label:
              "Staf Dinas tambah & ubah info destinasi wisata sendiri, tanpa developer",
          },
          {
            value: "250 faskes",
            label:
              "Warga & wisatawan cari fasilitas kesehatan terdekat langsung dari situs",
          },
        ],
      },
      {
        no: "06",
        name: "Gernas Tastaka",
        kind: "Migrasi & Modernisasi Situs",
        meta: "Nonprofit literasi",
        before: "WordPress lama, konten campur sampah, tanpa jalur bahasa Inggris.",
        track: "storefront",
        url: "gernastastaka.org",
        stats: [
          {
            value: "2 bahasa",
            label:
              "Situs kini bisa dibaca mitra & donor internasional, bukan cuma pengunjung lokal",
          },
          {
            value: "24 blok",
            label:
              "Staf non-teknis susun halaman baru sendiri lewat dasbor berbahasa Indonesia",
          },
          {
            value: "123 foto",
            label:
              "Seluruh dokumentasi kegiatan program dipindahkan utuh, tidak ada yang hilang",
          },
        ],
      },
    ],
  },

  value: {
    eyebrow: "04 · Proposisi nilai",
    title: "Lebih dari sekadar transaksi",
    quote:
      "Saya memberikan nilai, dan saya juga menerima nilai. Keberhasilan sistem Anda adalah portofolio terbaik saya.",
    // Pagar §4 brand doc, ditulis eksplisit di halaman. Tanpa kalimat ini,
    // tiga kartu di bawahnya gampang terbaca sebagai isyarat bahwa harganya
    // bisa ditawar — persis kebalikan maksudnya.
    note: {
      before: "Ini berdiri ",
      strong: "di atas",
      after:
        " biaya pengembangan yang transparan, bukan menggantikannya. Di luar angka yang disepakati, ada tiga hal yang sama-sama saya cari dalam setiap pengembangan.",
    },
    items: [
      {
        no: "01",
        title: "Jejaring Bermakna",
        body: "Akses ke komunitas, referral bisnis, dan ekosistem relasi yang saling menguntungkan jangka panjang.",
      },
      {
        no: "02",
        title: "Pembelajaran Berkelanjutan",
        body: "Setiap pengembangan mengajarkan sesuatu yang baru dari konteks bisnis Anda — pembelajaran itu yang membuat solusi berikutnya makin tajam dan tepat sasaran.",
      },
      {
        no: "03",
        title: "Dampak Sosial Nyata",
        body: "Pengembangan yang memberi manfaat melampaui bisnis — pada komunitas, lingkungan, atau masyarakat sekitar.",
      },
    ],
  },

  /**
   * Lima tahap, tanpa angka hari.
   *
   * Durasinya dulu tercantum per tahap ("1–2 hari", "1–2 minggu"). Dicabut
   * karena rentang yang dipasang sebelum masalahnya diketahui cuma bisa
   * salah dengan dua cara: terbaca sebagai janji kalau ternyata lebih lama,
   * atau membuat pekerjaan yang memang butuh waktu terlihat asal cepat.
   * Angka waktu yang mengikat tetap ada — di penawaran, setelah lingkupnya
   * jelas. Yang ditampilkan di sini urutannya, bukan jadwalnya.
   */
  process: {
    eyebrow: "05 · Proses eksekusi",
    title: "Dari masalah ke produk berjalan",
    lede: "Lima tahap yang dilalui setiap pengembangan, berurutan. Anda selalu tahu sedang di tahap mana — dan apa yang keluar dari tahap itu.",
    steps: [
      {
        no: "01",
        title: "Discovery & Pemetaan Masalah",
        body: "Identifikasi akar masalah, bukan hanya gejalanya. Keluarannya satu problem statement yang disepakati bersama.",
      },
      {
        no: "02",
        title: "Spesifikasi & Prototyping",
        body: "Penentuan jalur solusi, penyusunan kebutuhan, estimasi effort transparan. Tidak ada kejutan biaya.",
      },
      {
        no: "03",
        title: "Sprint Eksekusi",
        body: "Iteratif. Anda melihat sistemnya berkembang sejak hari pertama — bukan menunggu sampai selesai.",
      },
      {
        no: "04",
        title: "Deployment & Handover",
        body: "Instalasi di perangkat Anda, dokumentasi teknis, sesi pelatihan. Anda tidak bergantung pada kami.",
      },
      {
        no: "05",
        title: "Dukungan Pasca-Delivery",
        body: "Garansi perbaikan bug dan jalur komunikasi yang jelas untuk iterasi fitur berikutnya.",
      },
    ],
  },

  /**
   * Seksi "yang membentuk cara kerja ini" — dulu profil personal, lengkap
   * dengan nama, jabatan, dan tautan portofolio.
   *
   * Diganti jadi rekam jejak tanpa nama dengan sengaja. Pengunjung halaman
   * ini sedang menimbang apakah operasionalnya aman dititipkan, bukan sedang
   * membaca CV: yang menjawab pertanyaan itu hasil pekerjaan sebelumnya —
   * berapa yang terkumpul, berapa yang terlayani, apa yang berubah — bukan
   * siapa yang mengerjakan. Nama tetap muncul, tapi nanti, saat sudah ada
   * orang di seberang meja.
   *
   * Angkanya dari pekerjaan yang benar-benar dilalui (portofolio 2020–2025),
   * bukan dari proyek klien di `proof.cases` — dua hal berbeda, dan
   * menggabungkan keduanya akan membuat keduanya sama-sama sulit dipercaya.
   */
  about: {
    eyebrow: "Yang membentuk cara kerja ini",
    title: "Bermula dari lapangan, bukan dari layar",
    location: "Bogor, Jawa Barat",
    body: [
      "Sebelum jadi studio, kerjanya adalah mengelola program pemberdayaan di lapangan: duduk bersama pemilik usaha kecil, guru, dan pengurus komunitas — orang-orang yang sistemnya bukan dashboard, melainkan buku tulis dan grup WhatsApp yang tidak pernah selesai dibaca.",
      "Dari sana kebiasaannya terbentuk: masalah dipetakan dulu di tempat kejadian, baru diputuskan perlu dibangun apa. Sering jawabannya justru lebih sedikit fitur, bukan lebih banyak.",
      "Ukuran keberhasilannya pun ikut bergeser. Bukan sistemnya selesai tepat waktu, tapi orang yang setiap hari memakainya masih memakainya tiga bulan kemudian — tanpa perlu ditemani.",
    ],
    facts: [
      {
        value: "Rp 200 jt",
        label: "Hibah usaha yang dikelola sampai cair untuk 70 wirausaha di 5 lokasi",
      },
      {
        value: "6.117 pengguna",
        label: "Terlayani lewat sistem sekolah di 15+ sekolah",
      },
      {
        value: "Rp 11,8 jt",
        label: "Donasi publik terkumpul dalam satu bulan kampanye Hari Anak Nasional",
      },
      {
        value: "290 rb+",
        label:
          "Audiens terjangkau lewat dua kolaborasi kampanye, 130 rb+ tayangan — termasuk kampanye yang berhasil mengumpulkan Rp 11,8 jt donasi publik",
      },
      {
        value: "20+ sesi",
        label: "Uji coba bersama pengguna sungguhan sebelum fitur dinyatakan selesai",
      },
    ],
  },

  contact: {
    eyebrow: "Langkah berikutnya",
    title: "Mari rancang solusinya bersama",
    lede: "Sesi discovery pertama tidak mengikat dan tanpa biaya. Isi tiga kolom singkat, lalu tim kami yang menghubungi Anda — kita mulai dari memahami masalah, bukan dari menjual solusi.",
    ctaSecondary: "Hubungi kami langsung",
  },

  footer: {
    tagline: "Memperkuat manusia, mengutamakan dampak.",
    backoffice: "Masuk tim",
  },

  /**
   * Isi form pop-up sesi discovery.
   *
   * Sebelumnya semua tombol ajakan melompat ke WhatsApp. Masalahnya bukan
   * WhatsApp-nya — melainkan bahwa lompatan itu terjadi sebelum pengunjung
   * menyebut apa pun tentang dirinya: yang batal mengetik di sana hilang
   * tanpa jejak, dan yang jadi mengetik pun datang tanpa konteks.
   *
   * Tiga field, semuanya wajib, dan tidak satu pun menanyakan hal yang bisa
   * ditunda ke percakapan pertama (anggaran, jumlah karyawan, jadwal). Yang
   * ditanyakan cuma: ke mana menghubungi, bergerak di bidang apa, dan apa
   * yang sedang mengganjal.
   */
  discovery: {
    cta: "Sesi discovery gratis",
    title: "Sesi discovery gratis",
    intro:
      "Isi tiga kolom di bawah. Tim kami yang akan menghubungi Anda — tidak ada biaya dan tidak mengikat apa pun.",
    fields: {
      phone: {
        label: "Nomor telepon / WhatsApp",
        placeholder: "0812xxxxxxxx",
        hint: "Ke sinilah tim kami menghubungi Anda.",
      },
      business: {
        label: "Bidang atau jenis bisnis",
        placeholder: "Kafe, 2 cabang · Toko bahan bangunan · Yayasan pendidikan",
      },
      interest: {
        label: "Ceritakan bisnis/projek anda saat ini?",
        placeholder:
          "Contoh: kafe dengan 2 cabang, pencatatan stok masih manual dan sering selisih.",
      },
    },
    honeypot: "Jangan diisi",
    submit: "Kirim & tunggu dihubungi",
    pending: "Mengirim…",
    close: "Tutup",
    successTitle: "Terkirim. Terima kasih!",
    successBody:
      "Tim kami akan menghubungi Anda lewat nomor yang tadi diisi, paling lambat 1×24 jam kerja. Tidak perlu menyiapkan apa pun — obrolan pertama memang untuk memahami masalahnya dulu.",
    fallback: "Lebih suka mengobrol langsung?",
    fallbackLink: "Hubungi kami langsung di WhatsApp",
    errors: {
      empty: "Ketiga kolom masih harus diisi.",
      phone: "Nomor teleponnya sepertinya belum lengkap — coba cek lagi.",
      business: "Sebutkan bidang atau jenis bisnisnya sedikit lebih jelas.",
      interest: "Ceritakan sedikit soal bisnis atau projek Anda.",
      failed:
        "Maaf, pengirimannya gagal. Coba sekali lagi, atau hubungi kami langsung lewat WhatsApp.",
    },
  },

  waMessage:
    "Halo, saya menemukan Decaf Tech lewat situsnya. Saya ingin mengobrol soal operasional bisnis saya.",
};
