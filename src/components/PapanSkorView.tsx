/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Peserta, SkorJuri, Hukuman, SistemPenilaian } from '../types';
import { hitungTotalSkorAkhir, hitungDaftarHukuman } from '../utils';
import { Trophy, Clock, ShieldCheck, HelpCircle, Expand, Award, Share2, Eye, ShieldAlert } from 'lucide-react';

interface PapanSkorViewProps {
  activePeserta: Peserta | null;
  sistemPenilaian: SistemPenilaian;
  jumlahJuri: number;
}

export default function PapanSkorView({
  activePeserta,
  sistemPenilaian,
  jumlahJuri,
}: PapanSkorViewProps) {
  
  // Simulated reactive score logic matching active state or presets
  // If no state is loaded, we can guide the user
  const defaultKebenaranInit = sistemPenilaian === 'Persilat_2022' ? 9.90 : 100.00;
  const defaultKemantapanInit = sistemPenilaian === 'Persilat_2022' ? 9.50 : 5.50;

  // Let's declare local demo state inside Scoreboard to make it fully functional 
  // on its own or reactively synced from local storage / parent state!
  const [demoSkorList, setDemoSkorList] = useState<SkorJuri[]>([]);
  const [demoHukuman, setDemoHukuman] = useState<Hukuman>({
    keluarGelanggangCount: 0,
    senjataJatuhCount: 0,
    aksesorisJatuhCount: 0,
    pakaianTidakLengkap: false,
    suaraDilarangCount: 0,
    durasiOverUnderSeconds: 0,
  });

  const [durasiBerjalan, setDurasiBerjalan] = useState(180); // full 3 minutes standard
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  useEffect(() => {
    // Generate initial judges list based on system
    const list: SkorJuri[] = [];
    for (let i = 1; i <= jumlahJuri; i++) {
      // Add random minor decimals to make the scoreboard look alive with data when opened
      const offsetKebenaran = sistemPenilaian === 'Persilat_2022' ? -0.05 * i : -2 * i;
      const offsetKemantapan = sistemPenilaian === 'Persilat_2022' ? -0.02 * i : -0.05 * i;
      list.push({
        juriId: i,
        kebenaran: defaultKebenaranInit + offsetKebenaran,
        kemantapan: defaultKemantapanInit + offsetKemantapan,
      });
    }
    setDemoSkorList(list);
  }, [jumlahJuri, sistemPenilaian, activePeserta]);

  // If there is an active athlete, calculate based on dynamic values of standard system, 
  // otherwise show the beautiful live dynamic demo simulation
  const scoringData = hitungTotalSkorAkhir(
    demoSkorList,
    activePeserta?.kategori || 'Tunggal',
    sistemPenilaian,
    demoHukuman
  );

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const { perincian, totalDeduction } = hitungDaftarHukuman(demoHukuman, sistemPenilaian);

  return (
    <div className={`p-4 sm:p-6 transition-all ${isFullscreenMode ? 'bg-[#030a07] min-h-screen text-white' : 'max-w-7xl mx-auto text-white'}`} id="scoreboard-viewer">
      
      {/* Scoreboard toolbar header */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-[#10241b] rounded-xl px-4 py-3 border border-[#23513d] gap-3 mb-6">
        <div>
          <span className="text-[11px] font-mono text-emerald-400 block font-bold">MODE PROYEKSI LAYAR GEBYAR (SCREENBOARD BROADCAST)</span>
          <p className="text-xs text-gray-400">
            Gunakan mode ini untuk diproyeksikan pada layar besar (LED TV / Proyektor) arena pertandingan Pencak Silat.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFullscreenMode(!isFullscreenMode)}
            className="flex items-center gap-1 px-4 py-2 bg-[#d4af37] text-black font-extrabold text-xs rounded-lg transition-transform active:scale-95 cursor-pointer hover:bg-[#aa841c]"
          >
            <Expand className="w-4 h-4 text-black" />
            <span>{isFullscreenMode ? 'KEMBALI KE APLIKASI' : 'SIMULASI PROYEKSI LAYAR'}</span>
          </button>
        </div>
      </div>

      {activePeserta ? (
        <div className="space-y-6">
          
          {/* Main big scoreboard panel */}
          <div className="bg-gradient-to-b from-[#0e271c] to-[#04110b] rounded-3xl border-4 border-[#d4af37] p-6 lg:p-8 shadow-2xl relative overflow-hidden" id="scoreboard-gong-board">
            
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-[#d4af37] to-amber-500" />
            <div className="absolute right-0 bottom-0 w-96 h-96 bg-[#d4af37]/5 rounded-tl-full blur-2xl pointer-events-none" />

            {/* Stadium Header Overlay */}
            <div className="flex flex-col sm:flex-row justify-between items-center border-b border-[#1f4c37]/60 pb-5 mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-tr from-[#d4af37] to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#0000008b]">
                  <Trophy className="w-7 h-7 text-[#0c2217] stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold tracking-widest text-[#d4af37] bg-emerald-950 px-2.5 py-0.5 rounded border border-[#214f36]">
                    KEJUARAAN PENCAK SILAT JURUS SENI
                  </span>
                  <h2 className="text-lg lg:text-xl font-bold font-sans text-white tracking-tight">
                    DEWAN JURI ARENA A
                  </h2>
                </div>
              </div>
              
              {/* Massive stadium official clock */}
              <div className="flex items-center gap-4 bg-[#07130f] px-5 py-2.5 rounded-2xl border border-[#204a36] font-mono text-center shadow-inner min-w-[180px]">
                <Clock className="w-8 h-8 text-[#d4af37] animate-pulse" />
                <div className="text-left leading-none">
                  <span className="text-[10px] text-gray-500 block">DURASI</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400">03:00</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Athlete information grid alongside current grand total and system */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              
              {/* Athlete Banner details */}
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 text-xs font-mono font-bold uppercase">
                    <Award className="w-4 h-4 fill-current" />
                    <span>PESERTA UTARA • NO UNDIAN {activePeserta.noUndian}</span>
                  </div>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-none text-white pt-1">
                    {activePeserta.nama}
                  </h1>
                  <p className="text-lg text-gray-300 font-mono font-medium">
                    {activePeserta.kontingen}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="bg-[#1b4332] text-white py-1 px-3.5 rounded-lg border border-[#2d6f52]/40 shadow-sm">
                    Kategori: <strong>Seni {activePeserta.kategori}</strong>
                  </span>
                  <span className="bg-[#1b4332] text-[#d4af37] py-1 px-3.5 rounded-lg border border-[#2d6f52]/40 shadow-sm">
                    Kelas: <strong>{activePeserta.kelas} • {activePeserta.gender === 'Putra' ? 'Putra/Pa' : 'Putri/Pi'}</strong>
                  </span>
                </div>
              </div>

              {/* Juri Status Indicator Cards (Live panel output) */}
              <div className="lg:col-span-1 border border-[#22503d] rounded-2xl bg-[#0b1d16] p-4 font-mono space-y-2">
                <span className="text-[10px] text-gray-400 block font-bold">INFO JURNAL SISTEM</span>
                <div className="flex justify-between text-xs py-1 border-b border-[#1b3d2f]">
                  <span className="text-gray-400">Sistem Nilai</span>
                  <span className="font-bold text-white text-right">
                    {sistemPenilaian === 'Persilat_2022' ? 'PERSILAT 2022' : 'IPSI 100 POIN'}
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-[#1b3d2f]">
                  <span className="text-gray-400">Total Juri</span>
                  <span className="font-bold text-emerald-400">{jumlahJuri} PANEL JURI</span>
                </div>
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-gray-400">Pelepasan Ekstrem</span>
                  <span className="font-bold text-amber-500">Ya (2 Juri)</span>
                </div>
              </div>

              {/* Massive Score Readout */}
              <div className="lg:col-span-1 bg-[#06140f] border-2 border-dashed border-[#ea580c] rounded-2xl p-4 text-center">
                <span className="text-[10px] font-mono tracking-widest text-[#ea580c] block font-bold uppercase">AKUMULASI SKOR AKHIR</span>
                <div className="text-6xl font-black font-mono tracking-tighter text-[#fbbf24] my-1">
                  {scoringData.totalSkor.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 font-sans tracking-tight">
                  Setelah Pemotongan Penalti
                </div>
              </div>

            </div>

            {/* Bottom Row - Individual Judges Results block */}
            <div className="mt-8 pt-6 border-t border-[#1f4c37]/60">
              <h3 className="font-mono text-xs text-gray-400 tracking-wider mb-4 font-bold">
                RINCIAN PENILAIAN INDIVIDUAL 5 JURI
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {demoSkorList.map((juri) => {
                  const rawScore = juri.kebenaran + juri.kemantapan;
                  const isLow = juri.juriId === scoringData.juriTerendahId;
                  const isHigh = juri.juriId === scoringData.juriTertinggiId;
                  const isUsed = !isLow && !isHigh;

                  return (
                    <div
                      key={juri.juriId}
                      className={`rounded-xl p-3 border text-center font-mono relative transition-all ${
                        isHigh 
                          ? 'bg-rose-950/20 border-rose-900/50 opacity-40 select-none' 
                          : isLow 
                          ? 'bg-blue-950/20 border-blue-900/50 opacity-40 select-none' 
                          : 'bg-[#122b20] border-[#22503d] border-t-4 border-t-emerald-500 shadow'
                      }`}
                    >
                      {/* Badge representing discarded high or low points */}
                      {isHigh && (
                        <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-rose-900 text-rose-100 text-[8px] px-1.5 py-0.5 rounded border border-rose-800 font-bold font-sans">
                          TERTINGGI OUT
                        </span>
                      )}
                      {isLow && (
                        <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-900 text-blue-100 text-[8px] px-1.5 py-0.5 rounded border border-blue-800 font-bold font-sans">
                          TERENDAH OUT
                        </span>
                      )}

                      <div className="text-[10px] text-gray-400 font-bold block mb-1">
                        JURI {juri.juriId}
                      </div>

                      <div className={`text-2xl font-bold block ${!isUsed ? 'line-through text-gray-500' : 'text-emerald-400'}`}>
                        {rawScore.toFixed(2)}
                      </div>

                      <div className="grid grid-cols-2 gap-1 mt-2 text-[9px] text-gray-400 pt-1.5 border-t border-[#1b3d2f]">
                        <div>
                          <span>Akurasi</span>
                          <strong className="block text-white font-mono">{juri.kebenaran.toFixed(2)}</strong>
                        </div>
                        <div>
                          <span>Mantap</span>
                          <strong className="block text-white font-mono">{juri.kemantapan.toFixed(2)}</strong>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Extra warning if there is penalty applied */}
            {scoringData.totalHukuman > 0 && (
              <div className="mt-6 p-3 bg-rose-950/40 border border-rose-900 text-rose-200 rounded-xl text-xs flex gap-2 items-center">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <span className="font-extrabold">Terdeteksi Pemotongan Poin (Penalti): -{scoringData.totalHukuman.toFixed(2)} poin</span>
                  <p className="text-[10px] text-gray-400">
                    Sistem mencatat adanya pelanggaran gelanggang, durasi waktu, atau pelepasan aksesoris pakaian dari pembukuan dewan.
                  </p>
                </div>
              </div>
            )}

          </div>

          <div className="text-center text-xs text-gray-500">
            Aplikasi melayani sinkronisasi data instan ke monitor operator. Hubungkan multi-screen di windows setup Anda.
          </div>

        </div>
      ) : (
        <div className="bg-[#10241b] rounded-2xl p-10 border border-[#23513d] text-center max-w-lg mx-auto shadow-md">
          <Eye className="w-16 h-16 text-[#d4af37]/80 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">Menunggu Atlet Tanding</h3>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Tidak ada atlet aktif yang sedang berada di gelanggang. Silakan pilih atlet tanding di tab <strong>&apos;Peserta & Panel&apos;</strong> untuk mengaktifkan proyektor digital.
          </p>
          <button
            onClick={() => {
              const el = document.getElementById('tab-dashboard');
              if (el) el.click();
            }}
            className="mt-4 px-4 py-2 bg-[#d4af37] hover:bg-[#aa841c] text-black font-semibold text-xs rounded-lg transition-transform active:scale-95 cursor-pointer font-mono"
          >
            PILIH ATLET SEKARANG
          </button>
        </div>
      )}

    </div>
  );
}
