# IPFEST 2027

## Tentang proyek

Repositori ini berisi situs web IPFEST 2027. Isinya mencakup halaman utama, autentikasi peserta, informasi acara dan kompetisi, serta halaman operasional dan admin. Firebase Hosting menyajikan situs dari direktori `public/`. Backend menggunakan Firebase Cloud Functions.

## Teknologi yang digunakan

- **HTML, CSS, dan JavaScript** membentuk halaman, tampilan, dan interaksi situs.
- **Bootstrap dan SCSS** mendukung tata letak serta gaya antarmuka. Berkas Bootstrap dan sumber SCSS berada di `public/static/`.
- **Firebase Web SDK** menghubungkan situs dengan Firebase Authentication, Cloud Firestore, Cloud Storage, dan Analytics.
- **Firebase Hosting** menyajikan berkas situs dari direktori `public/`.
- **Firebase Cloud Functions** menjalankan fungsi backend. Dependensi fungsi mencakup Firebase Admin SDK, Firebase Functions SDK, Nodemailer, Mailgun, dan pdf-lib.
- **Webpack** menggabungkan kode JavaScript dari `public/src/` menjadi berkas bundel di `public/dist/`.
- **Babel** mengubah sintaks JavaScript melalui preset `@babel/preset-env`.
- **Node.js dan npm** digunakan untuk menjalankan skrip pengembangan, memasang dependensi, dan membangun situs.
- **Chart.js, Express, Google APIs, Google Cloud Storage, dan dotenv** tercatat sebagai dependensi proyek. Penggunaannya dapat berbeda di setiap bagian aplikasi.

## Struktur direktori

```text
.
├── .github/          # Otomatisasi GitHub Actions untuk Firebase Hosting
├── functions/        # Firebase Cloud Functions untuk backend
├── public/           # Berkas situs yang disajikan Firebase Hosting
│   ├── attendance/   # Halaman absensi acara
│   ├── competitions/ # Halaman informasi kompetisi
│   ├── dashboard/    # Halaman operasional dan admin
│   ├── events/       # Halaman informasi acara
│   ├── src/          # JavaScript aplikasi dan integrasi Firebase
│   ├── static/       # CSS, JavaScript, gambar, font, dan pustaka statis
│   └── dist/         # Hasil bundel Webpack
├── static/           # Aset gambar di luar direktori hosting
└── berkas root       # Konfigurasi Firebase, Webpack, Babel, npm, dan Git
```

## Tanggung jawab direktori

### `.github/`

Berisi workflow GitHub Actions untuk proses Firebase Hosting, misalnya membuat preview saat pull request dan melakukan deploy setelah perubahan digabungkan.

### `functions/`

Direktori ini berisi Firebase Cloud Functions untuk backend. Berkas `index.js` menjadi titik masuk fungsi server. Berkas `package.json` dan `package-lock.json` mencatat dependensi serta menyediakan perintah untuk menjalankan emulator, melakukan deployment, dan melihat log.

### `public/`

Direktori ini menjadi sumber konten Firebase Hosting sesuai konfigurasi di `firebase.json`. Berkas HTML, aset, dan hasil build yang perlu diakses peramban ditempatkan di sini.

- **`attendance/`** berisi halaman absensi dan pencatatan kehadiran acara.
- **`competitions/`** berisi halaman informasi setiap kompetisi.
- **`dashboard/`** berisi halaman operasional dan admin, termasuk pengelolaan treasury, delegasi, merchandise, acara, dan Smart Competition.
- **`events/`** berisi halaman detail acara IPFEST.
- **`src/`** berisi kode JavaScript aplikasi dan integrasi Firebase, seperti autentikasi, pendaftaran, absensi, pengelolaan peserta, kompetisi, dan merchandise. Berkas `webpack.config.babel.js` mengatur titik masuk dan hasil build.
- **`static/`** berisi aset untuk halaman. Direktori `css/` memuat stylesheet, `js/` memuat kode interaksi antarmuka, `images/` memuat gambar, `fonts/` memuat jenis huruf, `lib/` memuat pustaka pihak ketiga, dan `scss/` memuat sumber SCSS serta berkas Bootstrap.
- **`dist/`** berisi hasil bundel Webpack, misalnya berkas `*.bundle.js` yang dimuat halaman.
- **Berkas HTML di direktori utama `public/`** mencakup halaman utama, login, registrasi, pengaturan ulang kata sandi, merchandise, dan halaman galat seperti 400 serta 404.

### `static/` di root

Direktori ini berisi aset gambar di tingkat repositori. Firebase Hosting menyajikan isi `public/`, sehingga aset di `static/` tingkat root tidak otomatis tersedia sebagai URL publik. Aset perlu disalin ke `public/` atau konfigurasi Hosting perlu diubah.

## File konfigurasi utama

- **`firebase.json`** mengatur Firebase Hosting, Cloud Functions, Firestore, dan Storage. Direktori publik Hosting ditetapkan sebagai `public/`.
- **`.firebaserc`** menghubungkan alias Firebase CLI dengan proyek Firebase.
- **`firestore.rules`** mengatur izin akses ke Firestore.
- **`firestore.indexes.json`** mencatat indeks Firestore yang dibutuhkan oleh kueri.
- **`storage.rules`** mengatur izin akses ke Firebase Storage.
- **`webpack.config.babel.js`** menetapkan berkas JavaScript yang dibundel, aturan pemrosesan, lokasi hasil build di `public/dist/`, dan konfigurasi server pengembangan.
- **`.babelrc`** mengatur Babel untuk mengubah sintaks JavaScript.
- **`package.json` dan `package-lock.json` di root** mencatat dependensi serta skrip npm situs, termasuk `npm run start` untuk server pengembangan dan `npm run build` untuk build produksi.
- **`functions/package.json` dan `functions/package-lock.json`** mencatat dependensi khusus Cloud Functions.
- **`.gitignore`** mencatat berkas yang diabaikan Git. Berkas `functions/.gitignore` berlaku khusus untuk direktori Functions.
- **`README.md`** memuat dokumentasi repositori.

## Pengembangan

Pasang dependensi di root repositori, kemudian jalankan perintah berikut.

```sh
npm install
npm run start
```

Untuk membuat bundel produksi, jalankan perintah berikut.

```sh
npm run build
```

Cloud Functions memiliki dependensi tersendiri di `functions/`. Pasang dependensi dari direktori tersebut. Perintah untuk menjalankan emulator dan melakukan deployment tersedia di `functions/package.json`.
