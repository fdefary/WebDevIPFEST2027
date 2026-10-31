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
npm run start
```

Buka `http://localhost:9000/` dan biarkan terminal berjalan. Build produksi:

```sh
npm run build
npm test
```

`npm test` juga menjalankan pengujian aturan Firebase dan alur pendaftaran melalui emulator Auth, Firestore, dan Storage. Pastikan Java tersedia dan porta emulator pada `firebase.json` tidak sedang dipakai.

## Deployment produksi (`ipfest-2027`)

Jalankan dari root repo. Pastikan akun Firebase CLI memiliki akses ke proyek **`ipfest-2027`**, lalu periksa target dan hasil pengujian sebelum deploy:

```sh
firebase login
firebase projects:list
npm ci
npm --prefix functions ci
npm test
npm --prefix functions test
npm run build
```

Untuk perubahan frontend (HTML, CSS, atau JavaScript), **build ulang sebelum deploy Hosting** agar `public/dist/` berisi bundel terbaru:

```sh
npm run build
firebase deploy --only hosting --project ipfest-2027
```

Hanya bila aturan atau indeks berubah, deploy secara terpisah:

```sh
firebase deploy --only firestore:rules,firestore:indexes,storage --project ipfest-2027
```

Hanya bila backend inti berubah, deploy **empat Function yang memang digunakan**:

```sh
firebase deploy --only functions:createPrivateDownloadUrl,functions:updatePaymentVerifications,functions:updateCompetitionResult,functions:publishCompetitionCase --project ipfest-2027
```

Periksa rencana perubahan yang ditampilkan CLI sebelum mengonfirmasi, terutama jika ada penghapusan Function. **Jangan jalankan `firebase deploy` tanpa `--only`, `firebase deploy --only functions`, atau `npm --prefix functions run deploy`**: perintah tersebut dapat menerbitkan Function penerbitan sertifikat dan pemicu email yang masih ditunda. Deploy Hosting tidak mengubah Firestore Rules, Storage Rules, akun, klaim manager, ataupun data peserta. Setelah deploy, buka `https://ipfest-2027.web.app`, uji login, pendaftaran, dan dashboard terkait dengan akun uji yang disetujui.

**GitHub Actions:** workflow di `.github/workflows/` membangun dan men-deploy Hosting ke `ipfest-2027` saat ada push ke `main` (termasuk merge); PR dari repo yang sama membuat preview (PR dari fork dilewati agar secret tidak terekspos). Sebelum workflow dapat berjalan, pemilik repo harus menambahkan repository secret **`FIREBASE_SERVICE_ACCOUNT_IPFEST_2027`** di GitHub → Settings → Secrets and variables → Actions, berisi kredensial service account khusus proyek 2027 dengan akses deploy Firebase Hosting. Jangan gunakan ulang secret proyek lama atau simpan kunci service account di repo. Perubahan workflow ini baru aktif setelah di-merge; tidak men-deploy Functions atau Rules.

Petunjuk penyiapan awal, klaim akun staf, serta pemeriksaan pascadeploy ada di [`docs/firebase-production-setup.md`](docs/firebase-production-setup.md). Proyek 2027 **tidak memigrasikan** akun, dokumen Firestore, atau berkas Storage dari 2026.

## Cloud Functions dan secret email (sertifikat ditunda)

Function sertifikat memerlukan secret Firebase Secret Manager bernama `MAILGUN_SMTP_PASSWORD`. **Jangan deploy Function sertifikat saat ini.** Jika fitur tersebut nantinya disetujui, rotasi kredensial di penyedia email dan set secret melalui prompt interaktif; jangan masukkan nilainya ke Git, chat, atau log:

```sh
firebase functions:secrets:set MAILGUN_SMTP_PASSWORD --project ipfest-2027
```

Untuk emulator lokal, simpan secret hanya di `functions/.secret.local` dengan format `MAILGUN_SMTP_PASSWORD=...`. File `*.local` di folder Functions diabaikan Git; jangan menghapus aturan tersebut atau membagikan file ini.

Trigger sertifikat menggunakan Cloud Functions generasi kedua. Sebelum mengaktifkannya kelak, pastikan template PDF, pengirim email, secret, dan dampak perubahan generasi Function sudah ditinjau. Secret yang tersedia **tidak berarti** Function sertifikat boleh dideploy.

**Penting:** password SMTP sebelumnya tertulis di source dan riwayat Git. Anggap telah terekspos: rotasi/revoke kredensial lama di provider email, lalu simpan kredensial baru sebagai secret di atas. Menghapusnya dari file saat ini tidak menghapus nilai lama dari riwayat Git.
