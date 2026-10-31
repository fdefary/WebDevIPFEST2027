# IPFEST 2027

Website IPFEST 2027: landing page, pendaftaran, acara, kompetisi, absensi, dan dashboard operasional. Hosting menggunakan Firebase; backend berjalan di Firebase Cloud Functions.

## Struktur proyek

```text
.
├── .github/             # Workflow CI untuk Firebase Hosting
├── design/               # Referensi dan bahan desain; bukan aset runtime
├── functions/            # Cloud Functions dan dependensi backend terisolasi
├── public/               # Root berkas yang dipublikasikan Firebase Hosting
│   ├── attendance/       # Halaman absensi
│   ├── competitions/     # Halaman kompetisi
│   ├── dashboard/        # Halaman operasional/admin
│   ├── events/           # Halaman acara
│   ├── static/           # CSS, gambar, font, pustaka browser
│   └── dist/             # Bundel browser hasil Webpack; jangan edit manual
├── scripts/              # Pemeriksaan struktur/layout frontend
├── src/                  # Source JavaScript frontend dan modul bersama
├── static/               # Aset tingkat repo; tidak otomatis disajikan Hosting
└── konfigurasi root      # Firebase, aturan Firestore/Storage, Webpack, Babel, npm
```

### Batas tanggung jawab

- `src/` berisi source JavaScript yang dibangun Webpack, termasuk integrasi Firebase Web SDK dan modul UI bersama.
- `public/` berisi HTML dan aset yang harus tetap tersedia melalui URL situs. Susunan halaman dan aset mempertahankan URL publik yang sudah ada.
- `public/dist/` adalah output build yang dimuat oleh halaman. Edit source di `src/`, lalu jalankan build.
- `functions/` adalah backend; `functions/index.js` menjadi entry point, sedangkan `functions/package.json` mengelola dependensi dan perintahnya sendiri.
- `design/` untuk referensi desain. `static/` di root tidak dipublikasikan oleh Hosting kecuali disalin ke `public/` atau konfigurasi Hosting diubah.
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, dan `storage.rules` mengatur Firebase. `webpack.config.babel.js` mengatur entry frontend dan output build.

## Pengembangan website

Dari root repo:

```sh
npm ci
npm run dev
```

Buka `http://localhost:9000/` dan biarkan terminal berjalan. Perintah ini hanya menjalankan frontend/Webpack; **belum menghubungkan aplikasi ke Firebase Emulator**. Konfigurasi di `src/index.js` menunjuk ke project produksi `ipfest-2027`, jadi aksi dari halaman lokal dapat membaca atau mengubah data produksi. Jangan gunakan akun atau data peserta sungguhan untuk uji coba lokal.

### Firebase: layanan dan batas lingkungan

| Layanan | Fungsi di aplikasi | Konfigurasi/kontrol utama |
| --- | --- | --- |
| Authentication | Login, pendaftaran, dan custom claims staf (`ipfestRole`, `ipfestCompetition`) | Provider Email/Password dan akun ada di Firebase Console; pemetaan claim ada di `functions/role-assignments.js`. |
| Firestore | Data tim, informasi kompetisi, hasil, dan status pembayaran | `firestore.rules` membatasi akses; `firestore.indexes.json` menyimpan indeks. Perubahan claim memerlukan login ulang agar token diperbarui. |
| Storage | Berkas pendaftaran, bukti pembayaran, dan berkas kompetisi | `storage.rules` mengatur akses langsung ke object. Dokumen privat yang dibuka lewat dashboard menggunakan callable `createPrivateDownloadUrl` untuk membuat signed URL sementara. |
| Cloud Functions | Operasi terotorisasi di server, seperti verifikasi pembayaran, hasil kompetisi, distribusi case, dan signed URL | Source di `functions/`; runtime Node.js 22, region `asia-southeast2`. Fungsi memakai Admin SDK sehingga validasi aksesnya ada di kode Function, bukan hanya di Rules. |
| Hosting | Menyajikan HTML, CSS, aset, dan bundle dari `public/` | `firebase.json`; target produksi `ipfest-2027`. Deploy Hosting tidak mengubah Rules, Functions, akun, claims, atau data. |

**Mode lokal dan pengujian:**

- `npm run dev` menjalankan situs lokal di port `9000`, tetapi Firebase-nya tetap project produksi. Perubahan konfigurasi Firebase atau operasi tulis dari situs ini berisiko menyentuh data produksi.
- `npm test` menjalankan pemeriksaan frontend dan pengujian Auth, Firestore, serta Storage Rules melalui emulator dengan project demo `demo-ipfest-p0`. Pengujian integrasi menghubungkan SDK-nya langsung ke emulator; ini **tidak** berarti halaman `localhost:9000` memakai emulator.
- Firebase Emulator di `firebase.json` menggunakan Auth `9099`, Firestore `8080`, dan Storage `9199`; UI emulator nonaktif. Frontend belum memanggil `connectAuthEmulator`, `connectFirestoreEmulator`, `connectStorageEmulator`, atau `connectFunctionsEmulator`. Jangan menganggap menjalankan emulator saja sudah membuat situs lokal terisolasi dari produksi.
- `npm --prefix functions test` menjalankan unit test backend di Node.js, bukan Cloud Functions Emulator. Repo belum mengonfigurasi emulator Functions.

Untuk membuka PDF privat, callable harus lolos validasi role/path dan service account runtime harus dapat menandatangani URL (`iam.serviceAccounts.signBlob`). Jika log `createPrivateDownloadUrl` menunjukkan izin `signBlob` ditolak, deploy Storage Rules saja tidak memperbaikinya; minta pemilik project meninjau IAM service account Function. Jangan memberikan role IAM yang lebih luas pada project tanpa peninjauan.

Detail inisialisasi project produksi, setup awal, dan klaim staf ada di [`docs/firebase-production-setup.md`](docs/firebase-production-setup.md). Build produksi:

```sh
npm run build
npm test
```

`npm test` juga menjalankan pengujian aturan Firebase dan alur pendaftaran melalui emulator Auth, Firestore, dan Storage. Pastikan Java tersedia dan porta emulator pada `firebase.json` tidak sedang dipakai.

## Deployment produksi (`ipfest-2027`)

### Cara utama: merge ke `main`

Deployment Hosting sehari-hari dilakukan melalui GitHub Actions, bukan perintah `firebase deploy` manual:

1. Jalankan pemeriksaan lokal yang relevan sebelum membuka pull request:

   ```sh
   npm test
   npm --prefix functions test
   npm run build
   ```

   Jika perubahan hanya frontend, pengujian Functions boleh dilewati. `npm test` menjalankan pengujian Rules dan alur pendaftaran di emulator.
2. Buka pull request ke `main`. Untuk PR dari branch di repo ini, workflow membangun bundle dan membuat Hosting preview. PR dari fork tidak menjalankan preview karena secret tidak tersedia.
3. Periksa status workflow dan preview. Setelah perubahan disetujui, merge PR ke `main`.
4. Workflow `firebase-hosting-merge.yml` akan menjalankan `npm ci`, membangun frontend, lalu menerbitkan Hosting live ke project `ipfest-2027` (`https://ipfest-2027.web.app`).

Workflow merge hanya men-deploy **Firebase Hosting**. Workflow tersebut tidak menjalankan `npm test` dan tidak men-deploy Firestore Rules, Storage Rules, Cloud Functions, akun, claims, atau data. Karena itu, jalankan pengujian sebelum PR dan lakukan deploy layanan Firebase lain secara terpisah bila memang berubah.

GitHub Actions memerlukan repository secret **`FIREBASE_SERVICE_ACCOUNT_IPFEST_2027`** di GitHub → Settings → Secrets and variables → Actions. Secret tersebut harus berisi kredensial service account khusus project 2027 dengan akses deploy Hosting. Jangan gunakan ulang secret project lama atau simpan kunci service account di repo.

### Alternatif: deploy manual dengan Firebase CLI

Gunakan cara ini hanya jika GitHub Actions tidak tersedia atau perlu menerbitkan perubahan Rules/Functions yang tidak dicakup workflow merge. Jalankan dari root repo dan pastikan akun CLI memiliki akses ke project **`ipfest-2027`**:

```sh
firebase login
firebase projects:list
npm ci
npm test
```

Untuk deploy Hosting secara manual, build harus dibuat lebih dahulu:

```sh
npm run build
firebase deploy --only hosting --project ipfest-2027
```

Deploy Rules/indeks hanya jika berkas terkait berubah:

```sh
firebase deploy --only firestore:rules,firestore:indexes,storage --project ipfest-2027
```

Deploy backend hanya jika Cloud Functions inti berubah. Pasang dependensi backend dan jalankan unit test sebelum deploy:

```sh
npm --prefix functions ci
npm --prefix functions test
firebase deploy --only functions:createPrivateDownloadUrl,functions:updatePaymentVerifications,functions:updateCompetitionResult,functions:publishCompetitionCase --project ipfest-2027
```

Periksa rencana perubahan yang ditampilkan CLI sebelum mengonfirmasi, terutama jika ada penghapusan Function. **Jangan jalankan deploy Functions tanpa target spesifik** (`firebase deploy --only functions` atau `npm --prefix functions run deploy`): perintah tersebut dapat menerbitkan Function sertifikat dan pemicu email yang masih ditunda. Setelah deploy layanan, uji dengan akun uji yang disetujui.

Petunjuk penyiapan awal, klaim akun staf, serta pemeriksaan pascadeploy ada di [`docs/firebase-production-setup.md`](docs/firebase-production-setup.md). Proyek 2027 **tidak memigrasikan** akun, dokumen Firestore, atau berkas Storage dari 2026.

## Cloud Functions dan secret email (sertifikat ditunda)

Function sertifikat memerlukan secret Firebase Secret Manager bernama `MAILGUN_SMTP_PASSWORD`. **Jangan deploy Function sertifikat saat ini.** Jika fitur tersebut nantinya disetujui, rotasi kredensial di penyedia email dan set secret melalui prompt interaktif; jangan masukkan nilainya ke Git, chat, atau log:

```sh
firebase functions:secrets:set MAILGUN_SMTP_PASSWORD --project ipfest-2027
```

Untuk emulator lokal, simpan secret hanya di `functions/.secret.local` dengan format `MAILGUN_SMTP_PASSWORD=...`. File `*.local` di folder Functions diabaikan Git; jangan menghapus aturan tersebut atau membagikan file ini.

Trigger sertifikat menggunakan Cloud Functions generasi kedua. Sebelum mengaktifkannya kelak, pastikan template PDF, pengirim email, secret, dan dampak perubahan generasi Function sudah ditinjau. Secret yang tersedia **tidak berarti** Function sertifikat boleh dideploy.

**Penting:** password SMTP sebelumnya tertulis di source dan riwayat Git. Anggap telah terekspos: rotasi/revoke kredensial lama di provider email, lalu simpan kredensial baru sebagai secret di atas. Menghapusnya dari file saat ini tidak menghapus nilai lama dari riwayat Git.
