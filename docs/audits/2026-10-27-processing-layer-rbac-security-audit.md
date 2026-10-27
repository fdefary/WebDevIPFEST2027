# Audit Layer Processing, RBAC, Modularity, dan Kebocoran Akses

**Tanggal:** 27 Oktober 2026  
**Status:** Audit statis; tidak ada perubahan pada kode aplikasi  
**Cakupan:** Firebase Authentication, Firestore/Storage Security Rules, frontend processing aktif, alur registrasi/kompetisi/treasury/attendance/merchandise/SC, Cloud Functions, modularitas dan test.

## Ringkasan eksekutif

**Kesimpulan: kontrol akses belum aman untuk produksi.** Autentikasi dan role yang diperiksa di browser hanya mengatur navigasi/UI, bukan otorisasi. Firestore memberi izin tulis publik ke seluruh `Team`; Storage memberi akses luas kepada semua pengguna terautentikasi dan akses baca publik untuk file `Merch`. Data tim mencakup PII, dokumen identitas, pembayaran, dan submission. Di sisi lain, banyak koleksi aktif tidak memiliki rule Firestore sehingga fitur terkait kemungkinan gagal dengan `permission-denied` (kecuali aturan project live berbeda dari file repository).

### Temuan teratas

| ID | Keparahan | Temuan |
|---|---|---|
| F-01 | **Kritis** | Semua orang dapat membuat, mengubah, atau menghapus dokumen `Team` melalui Firestore. |
| F-02 | **Kritis** | Storage tidak membatasi akses berdasarkan role/pemilik untuk beberapa folder sensitif; folder `Merch` terbuka baca publik. |
| F-03 | **Tinggi** | Banyak koleksi Firestore yang digunakan aplikasi tidak tercakup rules; pembacaan/penulisan ditolak secara default. |
| F-04 | **Tinggi** | Pemeriksaan role hanya di frontend; data sensitif dibaca penuh oleh dashboard dan difilter di browser. |
| F-05 | **Tinggi** | Data Firestore merchandise dan SC dirender sebagai HTML mentah; memungkinkan stored XSS jika data berbahaya masuk. |
| F-06 | **Tinggi** | Tautan unduhan Firebase Storage disimpan sebagai URL/token dan diperlakukan sebagai akses bearer; kontrol file tidak mengikuti role. |
| F-07 | **Sedang** | Otorisasi menggunakan daftar email/UID tersebar, tidak konsisten, sulit dicabut, dan tidak punya satu sumber kebenaran. |
| F-08 | **Sedang** | Batas modul, error/validasi, dan pengujian keamanan tidak memadai untuk menjamin aturan RBAC dan alur data. |

## Lingkup, metode, dan batas verifikasi

- Membaca konfigurasi deploy, entrypoint bundler, rules, modul frontend yang aktif, alur autentikasi dan data, Cloud Function, serta test yang tersedia.
- Entry point frontend ditentukan dari `webpack.config.babel.js:4-24`. File dengan sufiks `-ori.js`/`_ori.js` yang tidak menjadi entrypoint tidak diperlakukan sebagai source aktif, kecuali disebut sebagai catatan migrasi.
- Mengasumsikan trafik publik website dengan banyak peserta dan petugas; ancaman mencakup pengguna tanpa login, peserta login biasa, dan petugas yang akunnya diambil alih.
- Tidak mengakses Firebase Console/API live, tidak memverifikasi rules yang sedang ter-deploy, bucket IAM/CORS, isi data produksi, secret, maupun log. Semua klaim konfigurasi runtime merujuk pada file repo, bukan kondisi project live.
- Tidak menjalankan Firebase Emulator/Security Rules Unit Testing. Karena itu izin aktual harus diuji terhadap project yang ter-deploy sebelum dianggap pasti.

## Temuan terperinci

### F-01 — Tulis publik tanpa autentikasi ke seluruh dokumen Team

**Severity: Kritis | Dampak: integritas registrasi, pembayaran, kelulusan dan data peserta**

**Bukti:** `firestore.rules:15-20`:

```text
15 match /Team/{document=**} {
16   allow write: if true;
17   allow read: if request.auth != null && request.auth.uid in [...]
18 }
19 match /Team/{userId} {
20   allow read, write: if request.auth != null && request.auth.uid == userId
```

Aturan Firestore yang cocok dievaluasi secara OR. Maka rule pemilik pada baris 19-20 tidak mempersempit izin; `allow write: if true` pada baris 16 tetap mengizinkan write untuk setiap request. Wildcard juga mencakup path dokumen di bawah `Team`.

**Prinsip yang tidak dipenuhi:** default deny, least privilege, server-side authorization, pemisahan hak baca/tulis, dan validasi perubahan berdasarkan role.

**Skenario bug/serangan:** penyerang tanpa login dapat memakai Firebase Web API dengan project config publik untuk membuat dokumen `Team`, mengubah `payment_status` menjadi `verified`, mengganti `sub_preliminary.final`, rank/score atau `final_reg`, mengubah data/URL file peserta, atau menghapus dokumen. UI validasi/konfirmasi tidak membatasi pemanggilan API langsung. Dampak dapat berupa pemalsuan status pembayaran/kelulusan, sabotase registrasi, serta perubahan PII.

**Penanganan:** segera cabut `allow write: if true`; buat rule eksplisit per operasi (`get/list/create/update/delete`) dan role. Batasi peserta pada dokumen miliknya, validasi bentuk/field yang boleh berubah dengan `diff().affectedKeys()` dan validasi tipe/nilai. Status pembayaran, kelulusan, skor/ranking, dan keputusan operasional harus hanya dapat diubah role petugas yang sesuai, idealnya melalui endpoint tepercaya/Cloud Function. Jangan memercayai ID dokumen atau data role dari client. Tambahkan emulator test yang membuktikan request anonymous dan peserta tidak dapat mengubah field petugas.

### F-02 — Storage lintas pengguna dan file merchandise dapat dibaca publik

**Severity: Kritis | Dampak: kerahasiaan KTP/kartu mahasiswa, bukti pembayaran dan submission**

**Bukti:** `storage.rules:6-18` mengizinkan `read, write` kepada siapa pun yang sekadar login pada `Case`, `preliminary_submissions`, dan `payments`. `storage.rules:21-29` memang membatasi write `final_submissions`/`finalreg_submissions` ke folder UID sendiri, tetapi `read` tetap berlaku untuk semua pengguna login. `storage.rules:33-46` mengizinkan `read, write` seluruh folder `team` kepada semua pengguna login dan membuka `Merch` dengan `allow get, create: if true` serta `allow read: if true`.

Alur unggah yang cocok: `src/registration.js:377-390` mengunggah bukti pembayaran dan berkas identitas ke `payments/` dan `team/{uid}/...`; `src/delegates.js:403-406` menulis final submission ke folder UID; `src/merchandise.js:42-52` mengunggah kartu identitas dan bukti pembayaran ke folder `Merch`.

**Prinsip yang tidak dipenuhi:** least privilege, isolasi tenant/pemilik, klasifikasi data dan perlindungan data sensitif.

**Skenario bug/serangan:** pengguna terdaftar yang login dapat membaca file pengguna lain dalam folder yang rule-nya mengizinkan read, atau menimpa/menghapus file di `team/`, `payments/`, dan submission prelim. URL/token Storage yang diketahui dapat membagikan file tanpa konteks role. Pada `Merch`, URL/path file dapat dibaca publik; penyerang dapat mengambil dokumen identitas/bukti pembayaran pelanggan jika mengetahui atau menemukan path/URL. Rule `create` publik juga memungkinkan unggahan objek tanpa login ke path `Merch`.

**Penanganan:** batasi read/write berdasarkan UID pemilik dan role operasional yang benar; pisahkan dokumen publik dan privat. Untuk `Merch`, jangan gunakan rule baca publik pada bukti identitas/pembayaran; unggah di path privat dengan UID/order ID acak, dan berikan akses terbatas via backend atau URL bertanda tangan berumur singkat setelah otorisasi. Tambahkan validasi ukuran, MIME/content type, path, dan operasi (hindari izin overwrite/delete umum). Audit dan rotasi token download yang pernah tersebar bila memungkinkan; URL token lama harus diperlakukan sebagai kredensial.

### F-03 — Koleksi aktif tidak tercakup Firestore Rules

**Severity: Tinggi | Dampak: fitur tidak tersedia; kebijakan akses tidak dapat dibuktikan**

**Bukti:** `firestore.rules:15-24` hanya memiliki match untuk `Team` dan `Payment_Summary`. Rules tidak memiliki match eksplisit untuk, antara lain:

- `SC_Selection` dan `SC_Del_Answer`: `src/login-sc.js:25,32`, `src/sc_prelim.js:45,53`.
- `Information`: `src/compe-manager.js:487`; juga source manager lain.
- `Career_Talk` dan `Grand_IPCONVEX`: `src/ct-start.js:29`, `src/ct-finish.js:29`, `src/gi-start.js:29`, `src/gi-finish.js:34`, `src/event-attendance.js:21,50`.
- `Merch`: `src/merchandise.js:71`, `src/merchmanager.js:68,155`.
- `Certificates`: trigger `functions/index.js:12-16`.
- `Submission_Status` pada alur lama; perlu pastikan masih digunakan halaman yang ter-deploy.

Firestore menolak akses yang tidak diizinkan rule mana pun. Dengan rules di repo, modul aktif yang membaca/menulis koleksi tersebut seharusnya mendapat `permission-denied`, termasuk pengunjung attendance/merch dan peserta SC. Sementara `firebase.json:2-4,28-30` menunjuk file rules ini sebagai berkas deploy.

**Prinsip yang tidak dipenuhi:** kebijakan akses terdefinisi per sumber data; fail-safe tetap perlu dibarengi kesesuaian implementasi dan test.

**Skenario bug:** peserta SC login gagal memuat seleksi/jawaban; pendaftaran attendance gagal menyimpan check-in/out; dashboard event/merch tidak dapat memuat data; manager gagal menyimpan link case; trigger sertifikat tidak dapat dipicu client (jika memang dipicu dengan write client). Apabila project live memiliki rules lebih luas yang tidak ada di repo, muncul risiko drift konfigurasi dan paparan yang tidak tercatat.

**Penanganan:** inventarisasi seluruh koleksi aktif terhadap semua read/write callsite. Definisikan kontrak akses per koleksi dan operasi; tambahkan rules terkecil yang memenuhi alur. Jangan menambahkan broad allow untuk sekadar membuat fitur jalan. Verifikasi menggunakan emulator test positif dan negatif dan deploy rules dari repository yang sama. Selidiki terlebih dahulu apakah project live berbeda.

### F-04 — RBAC frontend bukan batas keamanan; dashboard mengambil seluruh Team

**Severity: Tinggi | Dampak: data leakage dan eskalasi akses jika rules dilonggarkan**

**Bukti:** pemeriksaan email di `src/compe-manager.js:186-207` dilakukan di browser, kemudian listener membaca `collection(DB, 'Team')`; filter kompetisi baru diterapkan di client pada baris 208-211. `src/treasury.js:236-250` memeriksa email lalu membaca seluruh `Team`. `src/delegates-relation.js:160-175` melakukan hal yang sama untuk dashboard delegates relation. `src/compe-manager-sc.js:36-51,82-84` juga memakai email client untuk memilih kompetisi.

Frontend saat ini tidak dapat memberi akses karena F-01 memiliki allowlist UID untuk read; tetapi jika UID petugas terdaftar, manager kompetisi tetap menerima semua dokumen sebelum filter. Jika rules diperlebar agar dashboard bekerja, filter client tidak mencegah pengguna melihat kompetisi lain atau mengakses API langsung.

**Prinsip yang tidak dipenuhi:** otorisasi dilakukan server-side, least privilege/data minimization, dan isolasi lintas kompetisi.

**Skenario:** akun manager BCC yang termasuk UID reader mengunduh snapshot seluruh kompetisi lalu hanya melihat subset BCC di tabel. Data lain tetap telah berada di browser/devtools dan dapat disalin. Jika akun petugas dicuri, seluruh data sesuai hak read yang sama dapat diakses.

**Penanganan:** simpan role/kompetisi di custom claims yang ditetapkan hanya oleh Admin SDK atau model ACL server-trusted; tegakkan di Firestore Rules. Batasi query dan field/data yang dapat dibaca per role—atau pindahkan operasi dashboard sensitif ke backend. Jangan menganggap route redirect, `display:none`, daftar email di JavaScript, atau filter UI sebagai kontrol keamanan. Tambahkan skenario uji akses silang antar-kompetisi.

### F-05 — Stored XSS dari data Firestore pada dashboard SC dan merchandise

**Severity: Tinggi | Dampak: sesi petugas, data dashboard, dan tindakan petugas dapat disalahgunakan**

**Bukti:** `src/compe-manager-sc.js:132-149,155-166` memasukkan nama tim, universitas, dan data leader/member ke `innerHTML` tanpa escaping. Karena dokumen `Team` dapat ditulis publik (F-01), penyerang dapat memasukkan payload HTML/script dalam field tersebut dan menunggu petugas membuka dashboard. `src/merchmanager.js:100-145` memasukkan nama/email/WhatsApp/item/status serta URL file dari dokumen `Merch` ke template dan `insertAdjacentHTML` tanpa escaping; pesanan dapat dikirim publik lewat `src/merchandise.js:54-71` (subject to Firestore rules live).

**Prinsip yang tidak dipenuhi:** output encoding kontekstual dan pemisahan data dari markup. `innerHTML` memperlakukan data sebagai program HTML.

**Skenario:** nama produk/pemesan atau nama peserta mengandung tag/event handler; saat snapshot dashboard dirender, script berjalan dalam origin website. Jika rules live mengizinkan write yang sesuai, serangan dapat mencuri data DOM/tautan unduhan atau mengoperasikan sesi petugas.

**Penanganan:** bangun node dengan `textContent`/DOM API untuk teks; untuk nilai atribut gunakan API properti setelah validasi protokol dan format; jangan merakit HTML dengan data tak tepercaya. Jika templating HTML memang dibutuhkan, lakukan escaping sesuai konteks dan validasi URL (`https:`/domain yang diizinkan). Tambahkan tes payload XSS pada field yang bisa dikirim publik. Perbaikan F-01 juga menurunkan peluang input berbahaya tetapi bukan pengganti output encoding.

### F-06 — URL download file adalah bearer access dan retensi tidak dibatasi

**Severity: Tinggi | Dampak: kebocoran file setelah URL tersebar**

**Bukti:** `src/registration.js:145-151` mendapatkan `getDownloadURL` dan menyimpan URL-nya dalam dokumen tim (`:407`); file pembayaran disimpan sebagai `payment.proofUrl` (`:415-419`). Submission juga menyimpan URL (`src/delegates-sc.js:889-915`, bagian berikutnya alur submit). Dashboard membentuk link langsung dari URL; contoh `src/treasury.js:363-379` dan `src/compe-manager.js:95-100`.

Firebase download URL mengandung token yang dapat dipakai sebagai bearer link. Siapa pun yang memperoleh URL dapat mengakses objek tanpa evaluasi role aplikasi; log, export Excel, screenshot, pesan, atau XSS dapat memperluas penyebaran. Storage Rules tetap berlaku berbeda tergantung jenis URL/path dan implementasi; jangan mengandalkan hidden URL sebagai otorisasi.

**Prinsip yang tidak dipenuhi:** akses file mengikuti role, minimisasi paparan, dan retensi/daur hidup data.

**Skenario:** petugas export/berbagi link identitas atau bukti transfer; URL tetap hidup setelah peserta kehilangan akses/akun dicabut. URL `Merch` publik makin memperparah F-02.

**Penanganan:** file privat secara default; simpan path object, bukan URL bearer jangka panjang. Berikan URL sementara hanya setelah backend memeriksa otorisasi, batasi masa berlaku, dan tentukan retensi/penghapusan data. Batasi akses petugas sesuai kebutuhan dan jangan memasukkan URL sensitif ke export publik.

### F-07 — Otorisasi berbasis daftar email/UID tersebar dan inkonsisten

**Severity: Sedang | Dampak: role salah diberikan/ditolak dan pencabutan akses rawan terlambat**

**Bukti:** daftar manager berada di `src/compe-manager.js:18-28`; manager SC di `src/compe-manager-sc.js:22-29`; official account/route di `src/login.js:43-58,92-106`; treasury punya allowlist di `src/treasury.js` (deklarasi awal); event memakai `event@ipfest25.com` di `src/event-attendance.js:10-17`, berbeda dari `event@ipfest2026.com` di login dan Storage rules; merchandising memakai `entrepreneurship.ipfest2026@gmail.com` pada client, sedangkan banyak akun/label menggunakan 2027. Rules Firestore justru memakai daftar UID literal pada `firestore.rules:17,23`. `src/merchmanager.js:16-23` meminta token refresh tetapi tidak menggunakan `idTokenResult` untuk otorisasi.

**Prinsip yang tidak dipenuhi:** satu sumber otoritatif untuk identitas/role, konsistensi konfigurasi dan siklus hidup akses.

**Skenario bug:** alamat email berubah tetapi UID/daftar lain tidak diperbarui; petugas valid diarahkan salah/ditolak. Akun lama tetap berhak karena UID tidak dicabut. Perbedaan alamat event membuat client menganggap akun valid tetapi policy backend tidak cocok. Daftar email/UID dalam bundle juga mudah dipetakan (meskipun bukan secret).

**Penanganan:** gunakan role/claims yang dikelola admin sebagai sumber otorisasi, dengan pemetaan role dan kompetisi yang terpusat. Proses onboarding/offboarding harus memperbarui claims dan menguji rules. Normalisasi email hanya untuk display/compatibility, bukan pengganti identitas/claim. Hapus daftar duplikat setelah migrasi, dan pastikan seluruh environment mengacu pada project/role yang sama.

### F-08 — Tidak ada backend policy untuk keputusan sensitif; Cloud Function mempercayai isi event

**Severity: Sedang–Tinggi | Dampak: pemalsuan workflow dan email/sertifikat yang tidak tervalidasi**

**Bukti:** status sensitif diubah langsung oleh browser: `src/treasury.js:454-489,505-520`; skor/rank/kelulusan oleh `src/compe-manager.js:351-405` dan `src/compe-manager-sc.js:230-334`. Waktu rilis case juga hanya diperiksa client di `src/compe-manager.js:460-487` dan dapat dilewati dengan request langsung; URL case lalu ditulis ke `Information` (`:487`). Cloud Function `functions/index.js:12-17` menangani setiap `Certificates/{docId}` create dan langsung mempercayai `name,email`; data itu digunakan untuk PDF, nama file dan email (`:31-56,69-71`) tanpa validasi format, otorisasi pemicu, atau idempotensi aplikasi.

**Prinsip yang tidak dipenuhi:** business invariants ditegakkan di trust boundary, validasi input server-side, idempotensi untuk trigger berulang, dan segregasi tanggung jawab.

**Skenario:** client melewati tanggal rilis dan menulis link case kapan saja; perubahan status/score dapat dibuat melalui API bila rule memberi izin. Dokumen Certificates yang dapat ditulis oleh aktor tak semestinya dapat mengirim sertifikat ke alamat arbitrer, membuat PDF dengan nama tak valid, atau mengakibatkan duplikasi saat trigger retry. Perlu dicatat, rules repo saat ini tidak mencakup Certificates sehingga client write ditolak; risiko privilege bergantung pada izin project live/aktor Admin.

**Penanganan:** pindahkan keputusan petugas dan pemeriksaan waktu/eligibility ke backend tepercaya; rules validasi perubahan sebagai pertahanan tambahan. Untuk trigger, validasi payload, batasi pembuat dokumen sertifikat, lakukan sanitasi nilai sebelum PDF/email/path, gunakan kunci idempotensi/status proses untuk retry, dan catat hasil/kegagalan. Jangan mengirim sertifikat ke email bebas dari event tanpa memverifikasi sumbernya.

### F-09 — Registrasi memiliki efek samping parsial tanpa kompensasi

**Severity: Sedang | Dampak: akun/file yatim dan pemulihan registrasi sulit**

**Bukti:** `src/registration.js:373-390` mengunggah bukti pembayaran dan dokumen ke Storage; `:380-381` membuat akun Auth; `:466-470` baru menulis dokumen Team dan mengirim verifikasi. Catch `:476-482` hanya menampilkan error; tidak menghapus akun/file yang telah dibuat. Alur upload berurutan dan tanpa transaksi lintas layanan.

**Prinsip yang tidak dipenuhi:** atomicity/kompensasi untuk proses multi-layanan, penanganan kegagalan yang mencegah data yatim.

**Skenario:** jika satu upload gagal setelah akun dibuat, atau write Firestore gagal setelah upload selesai, peserta tidak mendapat dokumen Team tetapi email/UID telah terdaftar dan file tetap tersimpan. Percobaan ulang menerima `email-already-in-use`; support harus memperbaiki manual. Terlebih lagi F-01 memungkinkan record disabotase.

**Penanganan:** rancang proses registrasi dengan status/idempotency yang dapat dilanjutkan dan kompensasi terkontrol; validasi semua input/file sebelum efek samping; gunakan backend untuk urutan yang memerlukan privileged cleanup. Buat tool operasional untuk mendeteksi orphan, bukan menghapus otomatis tanpa audit.

## Modularitas, reliability, dan pengujian

### Batas modul dan policy tersebar

- Auth, role, URL redirect dan email resmi tersebar di login, dashboard, rules, dan konfigurasi storage; drift pada F-07 membuktikan tidak ada sumber tunggal.
- Processing multi-domain hidup di browser dan berkomunikasi langsung ke Firestore/Storage. Tidak ada lapisan layanan tepercaya untuk invariant status pembayaran, kelulusan, jadwal, atau sertifikat.
- `src/index.js:12-27` menginisialisasi Firebase sekaligus Analytics, Firestore, Storage, Auth dan mengekspor instance global modul. Ini pola sederhana yang mengikat semua entrypoint ke satu bundle/config project; tidak dengan sendirinya vulnerability, tetapi menambah coupling dan membuat pemisahan environment/policy sulit.
- `functions/index.js:1-10` memiliki satu trigger sertifikat beserta SMTP, PDF, dan Storage sekaligus. `functions/package.json:16-23` mencantumkan dependencies yang tampak tidak digunakan (`-`, `mailgun-js`, `save`); perlu diverifikasi sebelum dibersihkan, bukan risiko akses langsung.
- `src/ct-start.js` dan `src/ct-finish.js` mengulang pola parsing data attendance dan menggunakan form id `#ct-start`; `src/gi-start.js`/`gi-finish.js` serupa. Ini meningkatkan kemungkinan policy/validasi tidak konsisten. Namun rules saat ini belum mengizinkan koleksi attendance sama sekali.

### Validasi input dan resilience

- Browser validation bukan validasi otoritatif: file `src/registration.js:369-371` hanya memeriksa email/password secara terbatas; ukuran, MIME, jumlah dan isi file tidak diperiksa sebelum upload (`:145-151`). Storage rules juga tidak menerapkan batas ukuran/content type.
- `src/ct-start.js:22-30` menggunakan email dari form sebagai document ID tanpa normalisasi/otorisasi. `src/ct-finish.js:54-65` memeriksa bahwa email sama dengan ID dokumen, tetapi siapa pun dapat mengisi email target jika rules kelak terlalu luas.
- `src/event-attendance.js:24-31,53-61` mengasumsikan tabel ada dan field timestamp valid; snapshot malformed/null dapat melempar error saat rendering. Ini reliability issue, bukan pengganti kontrol akses.
- Perhitungan merchandise cart di browser `src/merchandise.js:54-68` menentukan harga/total dan status order. Karena browser bisa dimodifikasi, server harus menghitung harga dari katalog terpercaya sebelum menerima pembayaran/status.

### Test dan bukti yang dijalankan

- Root `npm test` — **lulus**: hanya `scripts/check-frontend-layout.js` dan `scripts/check-registration-flow.js`.
- `npm run build` — **lulus**, dengan warning ukuran bundle entry point (>244 KiB); ini catatan performa, bukan bukti keamanan. Build sukses tidak memverifikasi Firebase Rules.
- `npm test --prefix functions` — **lulus**; satu test memeriksa Secret Manager binding dan trigger string (`functions/test/secret-binding.test.js`). Tidak menguji authorization/validasi/idempotensi trigger.
- Tidak ditemukan test emulator untuk Firestore/Storage Rules, role matrix, akses lintas UID/kompetisi, atau payload XSS. Test struktur frontend yang lulus bukan bukti policy aman.

## Rencana remediasi berurutan

### P0 — Mitigasi sebelum penggunaan data produksi

1. Hapus unconditional Team write; terapkan deny-by-default dengan akses per role/field. Uji anonymous, peserta, manager kompetisi A/B, treasury, dan admin.
2. Tutup pembacaan publik pada seluruh `Merch`; pindahkan file identitas/bukti ke bucket/path privat. Cabut akses lintas pengguna di `team`, `payments`, prelim, dan final submission.
3. Tinjau token URL Storage yang sudah tersimpan/terdistribusi dan lakukan rotasi/revokasi bila paparan nyata ditemukan.
4. Perbaiki output encoding di `compe-manager-sc.js` dan `merchmanager.js`; prioritaskan karena input yang masuk dapat berasal dari publik.

### P1 — Pulihkan policy dan alur secara terkontrol

5. Buat inventaris koleksi × operasi × role dari callsite aktif dan desain Rules yang eksplisit. Hindari broad authenticated/public allow.
6. Tetapkan role/kompetisi melalui custom claims atau ACL yang hanya dapat diubah backend. Terapkan least privilege dan akses lintas-kompetisi yang diuji.
7. Pindahkan write sensitif (payment verification, score/rank/final, case release, order pricing, certificate creation) ke backend atau batasi field lewat rules yang tervalidasi.
8. Tambahkan Emulator Suite Rules tests untuk Firestore dan Storage, lalu jalankan pada CI sebelum deploy.

### P2 — Kurangi risiko operasional dan coupling

9. Terapkan validasi server-side dan batas file (ukuran, MIME, extension allowlist, ownership/path), idempotensi serta rekonsiliasi orphan pada registrasi.
10. Tentukan retensi PII/submission dan mekanisme penghapusan; jangan ekspor tautan privat yang bearer ke spreadsheet umum.
11. Satukan role/config environment, tambah structured audit log untuk tindakan petugas, dan tinjau dependencies serta bundle size secara terpisah.

## Artefak dan konfigurasi terkait

- `firebase.json:2-4,19-30` menunjuk `firestore.rules`, `storage.rules`, Hosting site `ipfest-2026` dan Functions.
- `.firebaserc:1-4` juga menetapkan project default `ipfest-2026`.
- `src/index.js:12-20` mengandung Firebase web config project tersebut. Web API key bukan secret; keamanan harus datang dari Rules/App Check dan autentikasi yang benar, bukan menyembunyikan config.
- `functions/test/secret-binding.test.js` hanya memastikan password SMTP tidak hard-coded dan secret terikat ke function; Secret Manager binding adalah praktik baik yang sudah ada.

## Penilaian akhir

Prinsip **RBAC, least privilege, dan isolasi akses belum terpenuhi** pada rules yang diperiksa. Ada satu bypass kritis untuk write Firestore dan paparan kritis Storage. Validasi role di UI tidak dapat memperbaiki keduanya. Rules yang tidak lengkap juga menunjukkan mismatch besar antara source aplikasi dan kebijakan backend: sebagian fitur ditolak, sementara sebagian lain terlalu terbuka. Prioritas pertama adalah menutup izin publik/lintas pengguna, lalu menguji ulang seluruh matriks akses terhadap project live menggunakan emulator dan deployment aktual.
