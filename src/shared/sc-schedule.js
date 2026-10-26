// =====================================================================
//   JADWAL TES PRELIMINARY SMART COMPETITION
//   Dipakai oleh dashboard delegates SC (tombol Start Test) dan sesi-1 (halaman soal).
//   TODO: sesuaikan dengan jadwal resmi tes SC IPFEST 2027
// =====================================================================
export const SC_TEST_WINDOW = {
    open:  { date: new Date('2026-12-05T09:00:00+07:00'), label: '5 December 2026, 09.00 WIB' }, // 5 Desember 2026 09.00 WIB
    close: { date: new Date('2026-12-05T12:00:00+07:00'), label: '5 December 2026, 12.00 WIB' }  // 5 Desember 2026 12.00 WIB
}

// 'before' = belum dibuka, 'open' = sedang berlangsung, 'closed' = sudah ditutup
export function scTestStatus(now = Date.now()) {
    if (now < SC_TEST_WINDOW.open.date.getTime()) return 'before'
    if (now >= SC_TEST_WINDOW.close.date.getTime()) return 'closed'
    return 'open'
}
