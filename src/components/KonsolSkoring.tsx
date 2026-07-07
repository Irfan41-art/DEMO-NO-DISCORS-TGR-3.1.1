/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Peserta, SkorJuri, Hukuman, SistemPenilaian, Pertandingan, SystemSettings } from '../types';
import { hitungTotalSkorAkhir, hitungDaftarHukuman, GERAKAN_TUNGGAL_GUIDE, hitungSkorSatuJuri } from '../utils';
import { Play, Pause, RotateCcw, AlertTriangle, Save, Heart, Shield, HelpCircle, Swords, Volume2, ShieldAlert, BadgeInfo } from 'lucide-react';

interface KonsolSkoringProps {
  activePeserta: Peserta | null;
  sistemPenilaian: SistemPenilaian;
  jumlahJuri: number;
  onSavePertandingan: (pertandingan: Pertandingan) => void;
  onNavigateToHistory: () => void;
}

// Function to synthesize an organic-like Indonesian GONG sound using Web Audio API
function mainkanSuaraGong() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Low baseline boom
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, ctx.currentTime); // Deep rumbling frequency
    osc1.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 3.0);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(150, ctx.currentTime); // Harmonics
    osc2.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 2.5);

    gainNode.gain.setValueAtTime(1.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.0); // Slow long gong decay

    // Filter to sweeten
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(300, ctx.currentTime);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(lowpass);
    lowpass.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 4.1);
    osc2.stop(ctx.currentTime + 4.1);
  } catch (error) {
    console.warn('Audio Context failed to play:', error);
  }
}

// Function to synthesize a sharp referee BEEP warning sound
function mainkanSuaraBeep(pitch = 880, duration = 0.15) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  } catch (error) {
    console.warn('Audio Beep failed to play:', error);
  }
}

export default function KonsolSkoring({
  activePeserta,
  sistemPenilaian,
  jumlahJuri,
  onSavePertandingan,
  onNavigateToHistory,
}: KonsolSkoringProps) {
  
  // Scoring default config per system
  const defaultKebenaranInit = sistemPenilaian === 'Persilat_2022' ? 9.90 : 100.00;
  const defaultKemantapanInit = sistemPenilaian === 'Persilat_2022' ? 9.50 : 5.50; // default medium

  // Juri state array
  const [skorJuriList, setSkorJuriList] = useState<SkorJuri[]>([]);

  // Hukuman state
  const [hukuman, setHukuman] = useState<Hukuman>({
    keluarGelanggangCount: 0,
    senjataJatuhCount: 0,
    aksesorisJatuhCount: 0,
    pakaianTidakLengkap: false,
    suaraDilarangCount: 0,
    durasiOverUnderSeconds: 0,
  });

  // Official stopwatch state
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger setup Juri list when count, system, or active competitor changes
  useEffect(() => {
    resetConsoleState();
  }, [jumlahJuri, sistemPenilaian, activePeserta]);

  // Audio trigger at critical times
  useEffect(() => {
    if (seconds === 180) {
      // 3 minutes mark - sound gong!
      mainkanSuaraGong();
      setIsRunning(false);
    } else if (seconds === 170) {
      // 10 seconds warning
      mainkanSuaraBeep(1000, 0.5);
    } else if (seconds > 0 && seconds % 60 === 0 && seconds < 180) {
      // Every 1 minute passed - subtle double pip
      mainkanSuaraBeep(660, 0.15);
      setTimeout(() => mainkanSuaraBeep(660, 0.15), 200);
    }
  }, [seconds]);

  const resetConsoleState = () => {
    const list: SkorJuri[] = [];
    for (let i = 1; i <= jumlahJuri; i++) {
      list.push({
        juriId: i,
        kebenaran: defaultKebenaranInit,
        kemantapan: defaultKemantapanInit,
      });
    }
    setSkorJuriList(list);

    setHukuman({
      keluarGelanggangCount: 0,
      senjataJatuhCount: 0,
      aksesorisJatuhCount: 0,
      pakaianTidakLengkap: false,
      suaraDilarangCount: 0,
      durasiOverUnderSeconds: 0,
    });

    setSeconds(0);
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Timer runner
  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mainkanSuaraBeep(440, 0.2); // Beep pause
    } else {
      setIsRunning(true);
      if (seconds === 0) {
        mainkanSuaraGong(); // Gong at kickoff!
      } else {
        mainkanSuaraBeep(880, 0.2); // Beep play
      }
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const resetTimerOnly = () => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSeconds(0);
    mainkanSuaraBeep(330, 0.3);
  };

  // Auto time penalty calculation according to official rules
  // Time should be exactly 3 minutes (180s)
  // Standard PERSILAT rule gives a leeway/toleransi, which is e.g. 5 seconds (175s to 185s is safe, otherwise -0.05 per second)
  useEffect(() => {
    if (seconds > 0) {
      const standard = 180;
      const margin = 5;
      let diff = 0;

      if (seconds < standard - margin) {
        diff = (standard - margin) - seconds;
      } else if (seconds > standard + margin) {
        diff = seconds - (standard + margin);
      }

      setHukuman((prev) => ({
        ...prev,
        durasiOverUnderSeconds: diff,
      }));
    }
  }, [seconds]);

  // Adjust score for specific judge
  const handleAdjustKebenaran = (juriId: number, adjustment: number) => {
    setSkorJuriList((prevList) =>
      prevList.map((j) => {
        if (j.juriId === juriId) {
          let updated = j.kebenaran + adjustment;
          // Bounds check
          if (sistemPenilaian === 'Persilat_2022') {
            updated = Math.min(9.90, Math.max(0.0, Number(updated.toFixed(2))));
          } else {
            updated = Math.min(100.00, Math.max(0.0, Number(updated.toFixed(2))));
          }
          return { ...j, kebenaran: updated };
        }
        return j;
      })
    );
  };

  const handleAdjustKemantapan = (juriId: number, adjustment: number) => {
    setSkorJuriList((prevList) =>
      prevList.map((j) => {
        if (j.juriId === juriId) {
          let updated = j.kemantapan + adjustment;
          if (sistemPenilaian === 'Persilat_2022') {
            // Range 9.00 - 9.90
            updated = Math.min(9.90, Math.max(9.00, Number(updated.toFixed(2))));
          } else {
            // Range 5.00 - 6.00
            updated = Math.min(6.00, Math.max(5.00, Number(updated.toFixed(2))));
          }
          return { ...j, kemantapan: updated };
        }
        return j;
      })
    );
  };

  // Presets generators (Acak Nilai)
  // Very useful for demonstration/testing with realistic silat profiles
  const handleRandomizeExcellent = () => {
    setSkorJuriList((prevList) =>
      prevList.map((j) => {
        const randKebBonus = parseFloat((Math.random() * -0.15).toFixed(2)); // minimal mistakes (-0.00 to -0.15)
        const randKemantapan = parseFloat(
          (sistemPenilaian === 'Persilat_2022' ? 9.60 + Math.random() * 0.28 : 5.75 + Math.random() * 0.23).toFixed(2)
        );
        return {
          ...j,
          kebenaran: Number((defaultKebenaranInit + randKebBonus).toFixed(2)),
          kemantapan: randKemantapan,
        };
      })
    );
    mainkanSuaraBeep(1200, 0.15);
  };

  const handleRandomizeAverage = () => {
    setSkorJuriList((prevList) =>
      prevList.map((j) => {
        const randKebBonus = parseFloat((Math.random() * -0.45).toFixed(2)); // average mistakes (-0.10 to -0.45)
        const randKemantapan = parseFloat(
          (sistemPenilaian === 'Persilat_2022' ? 9.20 + Math.random() * 0.35 : 5.40 + Math.random() * 0.35).toFixed(2)
        );
        return {
          ...j,
          kebenaran: Number((defaultKebenaranInit + randKebBonus).toFixed(2)),
          kemantapan: randKemantapan,
        };
      })
    );
    mainkanSuaraBeep(900, 0.15);
  };

  // Grand Total Calculation
  const calculationResult = hitungTotalSkorAkhir(
    skorJuriList,
    activePeserta?.kategori || 'Tunggal',
    sistemPenilaian,
    hukuman
  );

  const { totalSkor, skorMurniPerJuri, juriTertinggiId, juriTerendahId, totalHukuman } = calculationResult;

  // Save handling
  const handleSave = () => {
    if (!activePeserta) {
      alert('Maaf, belum ada Atlet AKTIF yang dipilih untuk disimpan nilainya!');
      return;
    }

    const matchSnap: Pertandingan = {
      id: `saved-${Date.now()}`,
      pesertaId: activePeserta.id,
      peserta: activePeserta,
      kategori: activePeserta.kategori,
      sistemPenilaian,
      jumlahJuri,
      skorJuriList: JSON.parse(JSON.stringify(skorJuriList)),
      hukuman: { ...hukuman },
      durasiDetik: seconds,
      totalSkorAkhir: totalSkor,
      tanggalSelesai: new Date().toISOString(),
      status: 'SELESAI',
    };

    onSavePertandingan(matchSnap);
    mainkanSuaraGong(); // celebration sound
    alert(`Data pertandingan untuk ${activePeserta.nama} berhasil direkam ke database rekap!`);
    onNavigateToHistory();
  };

  // Stopwatch formatting utils
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 text-white" id="scoring-console-container">
      
      {/* Active Athlete strip marquee */}
      {!activePeserta ? (
        <div className="bg-gradient-to-r from-amber-950 to-orange-950 border-2 border-amber-500 rounded-2xl p-6 text-center max-w-2xl mx-auto my-8">
          <ShieldAlert className="w-14 h-14 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-amber-100">Konsol Skoring Terkunci</h2>
          <p className="text-xs text-amber-200/80 mt-1 max-w-lg mx-auto">
            Anda belum memilih atlet aktif yang akan dinilai di turnamen ini. Hubungkan database atau pilih nama dari daftar atlet di menu utama terlebih dahulu.
          </p>
          <button
            onClick={() => {
              const el = document.getElementById('tab-dashboard');
              if (el) el.click();
            }}
            className="mt-4 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs uppercase font-mono rounded-xl transition-all cursor-pointer"
          >
            PILIH ATLET SEKARANG
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Athlete banner merged with stopwatch */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#10241b] rounded-2xl border border-[#23513d] p-5 shadow-lg relative items-center overflow-hidden">
            
            {/* Athlete profile */}
            <div className="lg:col-span-1 space-y-1">
              <span className="text-[10px] bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-amber-400 font-bold px-2 py-0.5 rounded font-mono">
                MATC-NILAI AKTIF
              </span>
              <h2 className="text-xl font-extrabold tracking-tight mt-1 text-white">
                {activePeserta.nama}
              </h2>
              <p className="text-xs font-mono text-gray-300">
                {activePeserta.kontingen} • No. Undian <strong className="text-[#d4af37]">{activePeserta.noUndian}</strong>
              </p>
              <div className="flex gap-1.5 pt-1.5">
                <span className="text-[10px] bg-[#22503a] text-white px-2 py-0.5 rounded-full font-semibold border border-[#307051]">
                  Seni {activePeserta.kategori}
                </span>
                <span className="text-[10px] bg-[#22503a] text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-[#307051]">
                  {activePeserta.gender === 'Putra' ? 'Putra / Pa' : 'Putri / Pi'}
                </span>
              </div>
            </div>

            {/* Official timer */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center p-3 rounded-xl bg-[#091712] border border-[#1b3d2f] min-h-[110px]">
              <div className="text-[10px] font-mono tracking-widest text-[#d4af37] uppercase flex items-center gap-1">
                <Swords className="w-3 h-3 text-[#d4af37]" /> OFFICIAL STOPWATCH
              </div>
              <div className={`text-4xl font-mono font-bold tracking-tight mt-1 ${
                seconds >= 180 ? 'text-rose-500 animate-pulse' : seconds >= 170 ? 'text-yellow-400 animate-pulse' : 'text-emerald-400'
              }`}>
                {formatTime(seconds)}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={toggleTimer}
                  className={`px-3 py-1 text-xs font-bold font-mono rounded-lg flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer ${
                    isRunning 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-black'
                  }`}
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isRunning ? 'JEDA' : 'MULAI'}</span>
                </button>
                <button
                  onClick={resetTimerOnly}
                  className="px-2 py-1 bg-[#1c3e31] hover:bg-[#2c624d] border border-[#2b5e4a] text-gray-300 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* LIVE CORE SCORING SUMMARY BOX */}
            <div className="lg:col-span-1 bg-gradient-to-br from-emerald-950/80 to-[#0c2219] p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between text-right">
              <div className="text-left">
                <span className="text-[10px] text-gray-400 tracking-wider block font-mono">LIVE GRAND TOTAL</span>
                <span className="text-xs text-gray-300 bg-emerald-950/90 py-0.5 px-2 rounded-full border border-emerald-800 font-mono mt-0.5 inline-block">
                  {jumlahJuri} JURI PANEL
                </span>
                <div className="text-[10px] text-yellow-400/80 font-mono mt-1">
                  Hukuman: -{totalHukuman.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold font-mono tracking-tighter text-[#d4af37]">
                  {totalSkor.toFixed(2)}
                </div>
                <div className="text-[10px] font-mono text-gray-400">
                  Total Terakumulasi
                </div>
              </div>
            </div>

          </div>

          {/* Quick preset triggers row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#132c21] rounded-xl px-4 py-2 border border-[#23513d] text-xs">
            <div className="flex items-center gap-1 text-gray-300 font-mono">
              <Volume2 className="w-4 h-4 text-[#d4af37]" />
              <span>Simulasi Suara:</span>
              <button onClick={() => mainkanSuaraGong()} className="px-2 py-0.5 bg-[#1b3d2f] hover:bg-[#275743] rounded text-white font-mono cursor-pointer ml-1">
                GONG
              </button>
              <button onClick={() => mainkanSuaraBeep(880, 0.2)} className="px-2 py-0.5 bg-[#1b3d2f] hover:bg-[#275743] rounded text-white font-mono cursor-pointer ml-1">
                SEMPRIT
              </button>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-gray-400">Papan Pengacak:</span>
              <button
                onClick={handleRandomizeExcellent}
                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 text-[#d4af37] hover:text-black hover:font-bold rounded-lg border border-amber-500/20 text-[11px] transition-colors cursor-pointer"
                title="Generasi set nilai di atas rata-rata"
              >
                Simulasi Nilai Bagus
              </button>
              <button
                onClick={handleRandomizeAverage}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black hover:font-bold rounded-lg border border-emerald-500/20 text-[11px] transition-colors cursor-pointer"
                title="Generasi nilai rata-rata biasa"
              >
                Simulasi Nilai Standar
              </button>
              <button
                onClick={resetConsoleState}
                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-600 rounded-lg border border-rose-500/30 text-[11px] text-rose-300 transition-colors cursor-pointer"
              >
                Reset Nilai 0
              </button>
            </div>
          </div>

          {/* Main Action Block: 5/3 Judges Panel & Technical Penalty Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* Judges Scoring Cards Stack (width = 3 cols) */}
            <div className="xl:col-span-3 space-y-4">
              <div className="flex items-center justify-between border-b border-[#23513d] pb-2">
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5 font-sans">
                  <Shield className="w-5 h-5 text-[#d4af37]" /> Input Panel Juri
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  Sistem: {sistemPenilaian === 'Persilat_2022' ? 'PERSILAT 2022 (Kebenaran + Kemantapan)' : 'Tradisional (Kebenaran + Kemantapan)'}
                </span>
              </div>

              {/* Grid of Juri Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="judges-grid">
                {skorJuriList.map((juri) => {
                  const rawScore = hitungSkorSatuJuri(juri, activePeserta.kategori, sistemPenilaian);
                  const isDiscardedHigh = juri.juriId === juriTertinggiId;
                  const isDiscardedLow = juri.juriId === juriTerendahId;
                  const isUsed = !isDiscardedHigh && !isDiscardedLow;

                  return (
                    <div
                      key={juri.juriId}
                      className={`rounded-2xl p-4 border transition-all ${
                        isDiscardedHigh 
                          ? 'bg-rose-950/20 border-rose-900/60 opacity-80' 
                          : isDiscardedLow 
                          ? 'bg-blue-950/20 border-blue-900/60 opacity-80' 
                          : 'bg-[#10241b] border-[#224c39] border-t-4 border-t-emerald-500 shadow-md'
                      }`}
                      id={`juri-card-${juri.juriId}`}
                    >
                      {/* Juri head metadata */}
                      <div className="flex justify-between items-start mb-3 border-b border-[#1b3d2f] pb-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-white font-mono flex items-center gap-1">
                            JURI {juri.juriId}
                          </h4>
                          <span className="text-[9px] font-mono block text-gray-400">
                            {isDiscardedHigh 
                              ? '⚠️ Nilai Tertinggi (Dibuang)' 
                              : isDiscardedLow 
                              ? '⚠️ Nilai Terendah (Dibuang)' 
                              : '✅ Nilai Digunakan'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-mono font-extrabold block text-white ${
                            !isUsed ? 'line-through text-gray-500' : 'text-[#d4af37]'
                          }`}>
                            {rawScore.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-gray-500 block uppercase">Poin Juri</span>
                        </div>
                      </div>

                      {/* Kebenaran (Accuracy of Movements) Section */}
                      <div className="space-y-1.5 mb-4 bg-[#091712] p-2.5 rounded-lg border border-[#1b3d2f]">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-gray-300 font-sans font-medium">Akurasi / Kebenaran</span>
                          <strong className="text-white text-xs">{juri.kebenaran.toFixed(2)}</strong>
                        </div>
                        
                        {/* Incremental inputs */}
                        <div className="grid grid-cols-5 gap-1 pt-1">
                          <button
                            onClick={() => handleAdjustKebenaran(juri.juriId, -1.0)}
                            className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 rounded py-1 px-1.5 text-xs text-rose-300 font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                            title="Salah 1 Jurus (-1.0 poin)"
                          >
                            -1.0
                          </button>
                          <button
                            onClick={() => handleAdjustKebenaran(juri.juriId, -0.10)}
                            className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900 rounded py-1 px-1 text-[10px] text-rose-300 font-mono transition-transform active:scale-95 cursor-pointer"
                            title="Mistake minor / Salah urutan (-0.10)"
                          >
                            -0.1
                          </button>
                          <button
                            onClick={() => handleAdjustKebenaran(juri.juriId, -0.01)}
                            className="bg-rose-950/30 hover:bg-rose-900/40 border border-rose-950 rounded py-1 px-1 text-[9px] text-rose-400 font-mono transition-transform active:scale-95 cursor-pointer"
                            title="Mistake micro (-0.01)"
                          >
                            -0.01
                          </button>
                          <button
                            onClick={() => handleAdjustKebenaran(juri.juriId, 0.01)}
                            className="bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-800 rounded py-1 px-1 text-[9px] text-emerald-400 font-mono transition-transform active:scale-95 cursor-pointer"
                          >
                            +0.01
                          </button>
                          <button
                            onClick={() => handleAdjustKebenaran(juri.juriId, 0.10)}
                            className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 rounded py-1 px-1 text-[10px] text-emerald-300 font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                          >
                            +0.1
                          </button>
                        </div>
                      </div>

                      {/* Kemantapan / Kekompakan (Stamina/Expression) Section */}
                      <div className="space-y-1.5 bg-[#091712] p-2.5 rounded-lg border border-[#1b3d2f]">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-gray-300 font-sans font-medium">Stamina/Penghayatan</span>
                          <strong className="text-white text-xs">{juri.kemantapan.toFixed(2)}</strong>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-1 font-mono">
                          <button
                            onClick={() => handleAdjustKemantapan(juri.juriId, -0.05)}
                            className="w-1/4 bg-[#1b3d2f] hover:bg-[#255743] rounded py-1 font-bold text-gray-300 transition-transform active:scale-90 cursor-pointer"
                          >
                            -
                          </button>
                          <div className="w-2/4 text-center text-xs font-bold text-emerald-400 bg-emerald-950/50 py-0.5 rounded border border-emerald-900">
                            {juri.kemantapan.toFixed(2)}
                          </div>
                          <button
                            onClick={() => handleAdjustKemantapan(juri.juriId, 0.05)}
                            className="w-1/4 bg-[#1b3d2f] hover:bg-[#255743] rounded py-1 font-bold text-gray-300 transition-transform active:scale-90 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-[9px] text-gray-500 text-center leading-none mt-1">
                          {sistemPenilaian === 'Persilat_2022' ? 'Rentang: 9.00 - 9.90' : 'Rentang: 5.00 - 6.00'}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Movement verification reference widget (only for Tunggal/Regu standard) */}
              {(activePeserta.kategori === 'Tunggal' || activePeserta.kategori === 'Regu') && (
                <div className="bg-[#10241b] rounded-xl p-4 border border-[#23513d] text-xs">
                  <div className="flex items-center gap-1 text-[#d4af37] font-bold uppercase mb-2 font-mono">
                    <BadgeInfo className="w-5 h-5 text-[#d4af37]" />
                    <span>Panduan Standar Kebenaran Gerakan {activePeserta.kategori} (Total 100 Gerakan)</span>
                  </div>
                  <p className="text-gray-300 mb-3 text-justify">
                    Bila atlet lupa, terbalik, melakukan kesalahan berat, atau merubah jurus standar, kurangi Kebenaran Juri sebesar <strong>-1.0</strong>. Untuk kesilapan jurus kecil kurangi <strong>-0.10</strong> atau <strong>-0.01</strong>. Dibawah ini beberapa blok urutan jurus utama:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-[11px] font-mono text-gray-300">
                    {GERAKAN_TUNGGAL_GUIDE.slice(0, 12).map((ger) => (
                      <div key={ger.no} className="bg-[#091712] p-1.5 rounded border border-[#1b3d2f] flex gap-1">
                        <span className="text-[#d4af37] font-bold">#{ger.no}</span>
                        <span className="truncate" title={ger.deskripsi}>{ger.deskripsi}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Official Deductions / Penalties Widget (width = 1 col) */}
            <div className="xl:col-span-1 space-y-4">
              <div className="border-b border-[#23513d] pb-2">
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5 font-sans text-rose-400">
                  <AlertTriangle className="w-5 h-5 text-rose-500" /> Hukuman & Penalti
                </h3>
              </div>

              <div className="bg-[#10241b] rounded-xl p-4 border border-[#244f3b] space-y-4" id="hukuman-pnl">
                <p className="text-xs text-gray-400 text-justify">
                  Penalti ini dikurangi dari total nilai setelah pembuangan nilai ekstrim per juri. Dikelola langsung oleh Dewan Hakim / Asisten Juri.
                </p>

                {/* keluarGelanggang Count */}
                <div className="space-y-1 bg-[#091712] p-3 rounded-lg border border-[#1b3d2f]" id="penalty-out">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold block">Keluar Gelanggang</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {sistemPenilaian === 'Persilat_2022' ? '-0.05 per kejadian' : '-5.0 per kejadian'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        onClick={() => setHukuman(prev => ({ ...prev, keluarGelanggangCount: Math.max(0, prev.keluarGelanggangCount - 1) }))}
                        className="w-6 h-6 bg-[#163326] rounded border border-[#1b3d2f] text-center font-bold font-sans hover:bg-rose-950/30 transition-transform active:scale-90 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-[#d4af37]">{hukuman.keluarGelanggangCount}</span>
                      <button
                        onClick={() => setHukuman(prev => ({ ...prev, keluarGelanggangCount: prev.keluarGelanggangCount + 1 }))}
                        className="w-6 h-6 bg-[#163326] rounded border border-[#1b3d2f] text-center font-bold font-sans hover:bg-rose-950/30 transition-transform active:scale-90 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* senjataJatuh Count */}
                <div className="space-y-1 bg-[#091712] p-3 rounded-lg border border-[#1b3d2f]" id="penalty-weapon">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold block">Senjata Jatuh / Lepas</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {sistemPenilaian === 'Persilat_2022' ? '-0.10 per kejadian' : '-10.0 per kejadian'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        onClick={() => setHukuman(prev => ({ ...prev, senjataJatuhCount: Math.max(0, prev.senjataJatuhCount - 1) }))}
                        className="w-6 h-6 bg-[#163326] rounded border border-[#1b3d2f] text-center font-bold font-sans hover:bg-rose-950/30 transition-transform active:scale-90 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-[#d4af37]">{hukuman.senjataJatuhCount}</span>
                      <button
                        onClick={() => setHukuman(prev => ({ ...prev, senjataJatuhCount: prev.senjataJatuhCount + 1 }))}
                        className="w-6 h-6 bg-[#163326] rounded border border-[#1b3d2f] text-center font-bold font-sans hover:bg-rose-950/30 transition-transform active:scale-90 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* aksesorisJatuh Count */}
                <div className="space-y-1 bg-[#091712] p-3 rounded-lg border border-[#1b3d2f]">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold block">Aksesoris/Saping Jatuh</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {sistemPenilaian === 'Persilat_2022' ? '-0.05 per kejadian' : '-5.0 per kejadian'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        onClick={() => setHukuman(prev => ({ ...prev, aksesorisJatuhCount: Math.max(0, prev.aksesorisJatuhCount - 1) }))}
                        className="w-6 h-6 bg-[#163326] rounded border border-[#1b3d2f] text-center font-bold font-sans hover:bg-[#1b3d2f] transition-transform active:scale-90 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-[#d4af37]">{hukuman.aksesorisJatuhCount}</span>
                      <button
                        onClick={() => setHukuman(prev => ({ ...prev, aksesorisJatuhCount: prev.aksesorisJatuhCount + 1 }))}
                        className="w-6 h-6 bg-[#163326] rounded border border-[#1b3d2f] text-center font-bold font-sans hover:bg-[#1b3d2f] transition-transform active:scale-90 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* suaraDilarang Count */}
                <div className="space-y-1 bg-[#091712] p-3 rounded-lg border border-[#1b3d2f]">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold block">Suara Teriak Dilarang</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {sistemPenilaian === 'Persilat_2022' ? '-0.05 per suara' : '-5.0 per suara'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        onClick={() => setHukuman(prev => ({ ...prev, suaraDilarangCount: Math.max(0, prev.suaraDilarangCount - 1) }))}
                        className="w-6 h-6 bg-[#163326] rounded border border-[#1b3d2f] text-center font-bold font-sans hover:bg-[#1b3d2f] transition-transform active:scale-90 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-[#d4af37]">{hukuman.suaraDilarangCount}</span>
                      <button
                        onClick={() => setHukuman(prev => ({ ...prev, suaraDilarangCount: prev.suaraDilarangCount + 1 }))}
                        className="w-6 h-6 bg-[#163326] rounded border border-[#1b3d2f] text-center font-bold font-sans hover:bg-[#1b3d2f] transition-transform active:scale-90 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* pakaianTidakLengkap Checkbox */}
                <label className="flex items-center justify-between p-3 bg-[#091712] rounded-lg border border-[#1b3d2f] cursor-pointer text-xs group">
                  <div>
                    <span className="font-semibold block group-hover:text-emerald-400 transition-colors">Pakaian Tidak Disiplin</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {sistemPenilaian === 'Persilat_2022' ? 'Potongan -0.05 flat' : 'Potongan -5.0 flat'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hukuman.pakaianTidakLengkap}
                    onChange={(e) => setHukuman(prev => ({ ...prev, pakaianTidakLengkap: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded text-rose-500 bg-[#163326] accent-[#d4af37]"
                  />
                </label>

                {/* Time Penalty Readout */}
                <div className="p-3 bg-[#1d1215] border border-rose-950 text-rose-200 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Ketimpangan Waktu:</span>
                    <span className="font-mono text-rose-400">
                      {hukuman.durasiOverUnderSeconds} Detik
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    Tingkat toleransi 3 menit ± 5 detik. Penalti otomatis dari timer: -0.05 per detik melebihi/kurang.
                  </p>
                </div>

              </div>
            </div>

          </div>

          {/* Grand Save Action Deck */}
          <div className="bg-[#10241b] rounded-2xl border border-[#23513d] p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            <div className="text-xs text-gray-300">
              <span className="font-bold text-white block mb-0.5 sm:text-sm">Siap untuk Menyalin Hasil Score?</span>
              Verifikasi rekapitulasi poin Anda. Menyimpan akan membukukan data ke ringkasan klasemen lokal dan mengosongkan status tanding berikutnya.
            </div>
            
            <div className="flex w-full md:w-auto gap-2">
              <button
                onClick={resetConsoleState}
                className="flex-1 md:flex-none px-5 py-3 bg-[#143125] lg:px-6 hover:bg-[#204e3b] text-white border border-[#214f3c] font-bold rounded-xl transition-all font-sans active:scale-[0.98] cursor-pointer text-xs"
              >
                KOSONGKAN JURNAL
              </button>
              <button
                id="btn-save-match"
                onClick={handleSave}
                className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-amber-500 to-[#d4af37] hover:from-amber-600 hover:to-[#aa841c] text-black font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all font-sans active:scale-[0.98] cursor-pointer text-xs flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4 text-black stroke-[2.5]" />
                SIMPAN & SELESAI
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
