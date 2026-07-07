/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HelpCircle, Shield, Award, Swords, Star, Info, ListOrdered, GraduationCap } from 'lucide-react';

export default function BantuanAturan() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-white space-y-6" id="guideline-container">
      
      {/* Visual Banner */}
      <div className="bg-gradient-to-r from-[#10241b] to-[#06140f] rounded-2xl border border-[#23513d] p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#d4af37] to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-[#000000bc]">
          <GraduationCap className="w-10 h-10 text-emerald-950 stroke-[2.2]" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-[#143225] py-0.5 px-2 rounded-full border border-emerald-800">
            EDU-SMI PENCAK SILAT
          </span>
          <h2 className="text-xl font-bold font-sans tracking-tight text-white">
            Buku Panduan & Aturan Penilaian Kategori Seni (Jurus)
          </h2>
          <p className="text-xs text-gray-300">
            Pahami tatacara penilaian Pencak Silat Seni Tunggal, Ganda, dan Regu berdasarkan regulasi resmi PERSILAT 2022 dan Ikatan Pencak Silat Indonesia (IPSI).
          </p>
        </div>
      </div>

      {/* Grid containing Rules details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: 2022 DESIMAL RULE */}
        <div className="bg-[#10241b] rounded-2xl border border-[#23513d] p-5 space-y-3 shadow-md">
          <div className="flex items-center gap-1.5 font-bold font-sans text-[#d4af37] text-sm sm:text-base border-b border-[#1b3d2f] pb-2">
            <Star className="w-5 h-5 text-[#d4af37]" />
            <span>Sistem Nilai Baru PERSILAT 2022</span>
          </div>
          <p className="text-xs text-gray-300 text-justify leading-relaxed">
            Sesuai hasil keputusan Kongres PERSILAT, sistem penilaian kategori Seni dirombak sepenuhnya menggunakan model skala desimal baru yang presisi dan adil:
          </p>
          <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside">
            <li>
              <strong>Akurasi / Kebenaran:</strong> Rentang nilai berkisar antara <strong>0.00 hingga 9.90</strong>. Juri memulai penilaian dari nilai kebenaran 9.90 (Seni Tunggal / Regu) dan mengurangi poin jika terjadi kesalahan gerak.
            </li>
            <li>
              <strong>Kemantapan / Penghayatan / Kekompakan:</strong> Rentang nilai berkisar antara <strong>9.00 hingga 9.90</strong> yang dinilai berdasarkan kemantapan stamina, power, gerak eksplosif, penjiwaan karakter jurus, dan sinkronisasi kekompakan tim (untuk kategori Regu).
            </li>
            <li>
              <strong>Akumulasi Skor Juri:</strong> Nilai satu juri didapat dari penjumlahan <em>Kebenaran + Kemantapan</em> (maksimal <strong>19.80</strong>).
            </li>
          </ul>
        </div>

        {/* Card 2: IPSI TRADISIONAL POIN RULE */}
        <div className="bg-[#10241b] rounded-2xl border border-[#23513d] p-5 space-y-3 shadow-md">
          <div className="flex items-center gap-1.5 font-bold font-sans text-emerald-400 text-sm sm:text-base border-b border-[#1b3d2f] pb-2">
            <Swords className="w-5 h-5 text-emerald-400" />
            <span>Sistem Poin Tradisional IPSI</span>
          </div>
          <p className="text-xs text-gray-300 text-justify leading-relaxed">
            Sistem penilaian tradisional yang umum digunakan pada kejuaraan daerah / sirkuit prestasi di tingkat lokal:
          </p>
          <ul className="space-y-2 text-xs text-gray-300 list-disc list-inside">
            <li>
              <strong>Kebenaran Gerakan:</strong> Dimulai dari poin bulat <strong>100.00</strong> (untuk 100 gerakan). Tiap gerakan yang salah, tertinggal, terbalik urutannya didenda pemotongan <strong>-1.00</strong> per gerakan.
            </li>
            <li>
              <strong>Kemantapan / Keserasian:</strong> Dinilai secara subjektif murni oleh panel juri dalam rentang sempit berkisar antara <strong>5.00 hingga 6.00</strong> dengan lompatan ketelitian desimal dua angka (e.g. 5.65).
            </li>
            <li>
              <strong>Total Poin Juri:</strong> Formula perolehan poin per juri adalah <em>Kebenaran (100 - total salah) + Kemantapan (5.00 - 6.00)</em>.
            </li>
          </ul>
        </div>

        {/* Card 3: PENALTY MATRIX (Hukuman & Diskualifikasi) */}
        <div className="bg-[#10241b] rounded-2xl border border-[#23513d] p-5 space-y-3 shadow-md md:col-span-2">
          <div className="flex items-center gap-1.5 font-bold font-sans text-rose-400 text-sm sm:text-base border-b border-[#1b3d2f] pb-2">
            <Info className="w-5 h-5 text-rose-500" />
            <span>Daftar Pelanggaran & Potongan Nilai (Technical Deductions)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <h4 className="font-bold text-white font-mono">Pelanggaran Teknis Geralanggang</h4>
              <ul className="list-decimal list-inside space-y-1 text-gray-400">
                <li><strong className="text-rose-400">Keluar Gelanggang (Borderline):</strong> Kaki atlet murni melangkah/menyentuh di luar batas gelanggang 10m x 10m (Denda <strong className="text-white">-0.05 / -5 Poin</strong> per kejadian).</li>
                <li><strong className="text-rose-400">Senjata Jatuh / Lepas:</strong> Menggelincirkan golok, toya lepas dari gagang gendong saat atraksi (Denda <strong className="text-white">-0.10 / -10 Poin</strong> per kejadian).</li>
                <li><strong className="text-rose-400">Aksesoris / Saping Jatuh:</strong> Penutup samping kain atau destar kepala goyah & terjatuh lepas (Denda <strong className="text-white">-0.05 / -5 Poin</strong>).</li>
              </ul>
            </div>
            
            <div className="space-y-1.5">
              <h4 className="font-bold text-white font-mono">Pelanggaran Disiplin Waktu & Suara</h4>
              <ul className="list-decimal list-inside space-y-1 text-gray-400">
                <li><strong className="text-rose-400">Pakaian Tidak Lengkap:</strong> Tidak memakai pin sabuk kancing laskar lengkap, sabuk salah arah (Denda <strong className="text-white">-0.05 / -5 Poin</strong> total).</li>
                <li><strong className="text-rose-400">Mengeluarkan Suara Teriak:</strong> Berteriak di sela jurus secara histeris dilarang kecuali aba-aba murni (Denda <strong className="text-white">-0.05 / -5 Poin</strong>).</li>
                <li><strong className="text-rose-400">Denda Selisih Waktu:</strong> Batas durasi resmi seni adalah tepat 3 menit (180 detik). Ada toleransi aman ±5 detik (175s s.d 185s). Di luar rentang toleransi tsb dikurangi <strong className="text-white">-0.05 / -5 Poin per detik</strong> kelebihan / kekurangan waktu.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Quick workflow guidelines footer */}
      <div className="p-4 bg-[#091712] rounded-xl border border-[#1b3d2f] text-xs font-mono text-gray-400 flex items-start gap-3">
        <ListOrdered className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#d4af37]">SOP Petunjuk Aliran Kerja Operator Pertandingan:</span>
          <p className="text-[11px] text-justify leading-relaxed mt-1">
            1. Pergi ke tab <strong className="text-white">Peserta & Panel</strong> untuk menyunting daftar kontingen atau mendaftarkan nomor undian. <br/>
            2. Klik <strong className="text-white">Pilih Atlet</strong> pada baris salah satu kontingean untuk memuat profil ke gelanggang tanding.<br/>
            3. Pindah ke tab <strong className="text-white">Konsol Skoring</strong>, mulailah menyalakan timer ketika gong berbunyi.<br/>
            4. Klik denda-denda kesalahan gerakan demi pergerakan per juri, lalu sesuaikan denda dewan (hukuman). <br/>
            5. Tekan tombol <strong className="text-[#d4af37]">Simpan & Selesai</strong> untuk membukukan hasil pertadingan ke papan klasemen.
          </p>
        </div>
      </div>

    </div>
  );
}
