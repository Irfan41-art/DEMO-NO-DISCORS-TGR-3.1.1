/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AppState, BabakType, JurusType, UsiaType, SudutType, MatchRecord } from '../types';
import { 
  Play, Pause, RotateCcw, Upload, Download, Trash2, 
  Plus, Check, Award, ShieldAlert, Clock, RefreshCw, Eye, Users
} from 'lucide-react';
import { 
  parseTimeToSeconds, 
  formatSecondsToTime, 
  downloadFile, 
  getHistory, 
  saveHistory,
  DEFAULT_STATE
} from '../utils';

interface SekretarisPanelProps {
  appState: AppState;
  onUpdateState: (newState: AppState) => void;
}

export default function SekretarisPanel({ appState, onUpdateState }: SekretarisPanelProps) {
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [importFeedback, setImportFeedback] = useState<string>('');
  const [showImportConfirm, setShowImportConfirm] = useState<boolean>(false);
  const [rawImportData, setRawImportData] = useState<string>('');
  
  // Local temporary inputs
  const [athleteInput, setAthleteInput] = useState({
    nama: appState.athleteName,
    kontingen: appState.athleteKontingen,
    sudut: appState.athleteSudut
  });

  const fileInputLeftRef = useRef<HTMLInputElement>(null);
  const fileInputRightRef = useRef<HTMLInputElement>(null);

  // Sync internal local athlete inputs when appState changes (e.g. from sync or CSV import)
  useEffect(() => {
    setAthleteInput({
      nama: appState.athleteName,
      kontingen: appState.athleteKontingen,
      sudut: appState.athleteSudut
    });
  }, [appState.athleteName, appState.athleteKontingen, appState.athleteSudut]);

  useEffect(() => {
    setHistory(getHistory());
  }, [appState.matchSaved]);

  const updateField = (key: keyof AppState, value: any) => {
    let updated = { ...appState, [key]: value };
    
    // Auto-update duration (waktuMenit) based on Kategori Jurus & Babak changes
    if (key === 'babak' || key === 'kategoriJurus') {
      const b = updated.babak;
      const k = updated.kategoriJurus;
      const isTargetCategory = k === 'Tunggal Bebas' || k === 'Ganda' || k === 'Regu';
      
      if (isTargetCategory) {
        if (b === 'Penyisihan' || b === 'Perempat Final' || b === 'Semifinal') {
          updated.waktuMenit = '01:30';
          const secs = parseTimeToSeconds('01:30');
          updated.timer = {
            timeLeft: secs,
            duration: secs,
            isRunning: false,
            lastUpdated: Date.now()
          };
        } else if (b === 'Final') {
          updated.waktuMenit = '03:00';
          const secs = parseTimeToSeconds('03:00');
          updated.timer = {
            timeLeft: secs,
            duration: secs,
            isRunning: false,
            lastUpdated: Date.now()
          };
        }
      }
    }

    // If timer setting changes, reset timer
    if (key === 'waktuMenit') {
      const secs = parseTimeToSeconds(value);
      updated.timer = {
        timeLeft: secs,
        duration: secs,
        isRunning: false,
        lastUpdated: Date.now()
      };
    }
    
    // If juri count changes, re-initialize judges mapping
    if (key === 'jumlahJuri') {
      const count = value as number;
      const newJudges: typeof appState.judges = {};
      for (let i = 1; i <= count; i++) {
        newJudges[i] = {
          score: 9.90,
          wrongMoveCount: 0,
          isReady: false,
          isFinished: false
        };
      }
      updated.judges = newJudges;
    }

    onUpdateState(updated);
  };

  // Immediate athlete sync button or on blur
  const handleApplyAthlete = () => {
    const updated = {
      ...appState,
      athleteName: athleteInput.nama,
      athleteKontingen: athleteInput.kontingen,
      athleteSudut: athleteInput.sudut,
      matchSaved: false // reset saved status for new athlete setup
    };
    onUpdateState(updated);
  };

  // Timer Controls
  const toggleTimer = () => {
    const now = Date.now();
    let currentSeconds = appState.timer.timeLeft;

    if (appState.timer.isRunning) {
      // Pause: calculate elapsed seconds and lock them
      const elapsed = Math.floor((now - appState.timer.lastUpdated) / 1000);
      currentSeconds = Math.max(0, appState.timer.timeLeft - elapsed);
    }

    const updated = {
      ...appState,
      timer: {
        ...appState.timer,
        timeLeft: currentSeconds,
        isRunning: !appState.timer.isRunning,
        lastUpdated: now
      }
    };
    onUpdateState(updated);
  };

  const resetTimer = () => {
    const secs = parseTimeToSeconds(appState.waktuMenit);
    const updated = {
      ...appState,
      timer: {
        timeLeft: secs,
        duration: secs,
        isRunning: false,
        lastUpdated: Date.now()
      }
    };
    onUpdateState(updated);
  };

  // Reset current judge scores to starting 9.90
  const resetJudges = () => {
    const updatedJudges = { ...appState.judges };
    Object.keys(updatedJudges).forEach(k => {
      const id = parseInt(k);
      updatedJudges[id] = {
        score: 9.90,
        wrongMoveCount: 0,
        isReady: false,
        isFinished: false
      };
    });
    
    onUpdateState({
      ...appState,
      judges: updatedJudges,
      isDisqualified: false,
      matchSaved: false
    });
  };

  // Load logo files and convert to base64 for persistent offline viewing
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateField(side === 'left' ? 'logoLeft' : 'logoRight', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogos = () => {
    onUpdateState({
      ...appState,
      logoLeft: DEFAULT_STATE.logoLeft,
      logoRight: DEFAULT_STATE.logoRight
    });
  };

  // History Actions
  const handleClearHistory = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua histori pertandingan?')) {
      saveHistory([]);
      setHistory([]);
      onUpdateState({ ...appState, matchSaved: false });
    }
  };

  // CSV Export & Template Creators
  const handleExportTemplate = () => {
    const headers = "Partai;Nama;Kontingen;Sudut;Babak;KategoriJurus;KategoriUsia;Gender\n";
    const sample = "01;Kadek Wahyu Dewantara;Bali - Indonesia;Biru;Final;Tunggal;Dewasa;Putra\n02;Ayu Lestari;Jawa Barat;Merah;Semifinal;Tunggal Bebas;Remaja;Putri\n03;Regu Putra DKI;DKI Jakarta;Biru;Penyisihan;Regu;Dewasa;Putra";
    downloadFile("Template_Pertandingan_Seni.csv", headers + sample);
  };

  // Robust parsing of CSV imports
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setRawImportData(text);
          parseAndApplyCSV(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const parseAndApplyCSV = (text: string) => {
    try {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        setImportFeedback("Format File salah atau kosong!");
        return;
      }

      // Determine separator (semicolon or comma)
      const firstLine = lines[0];
      const separator = firstLine.includes(';') ? ';' : ',';
      
      const parsedMatches: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 4) {
          parsedMatches.push({
            partai: cols[0] || "01",
            nama: cols[1] || "Atlet Baru",
            kontingen: cols[2] || "Klub",
            sudut: (cols[3] === 'Merah' || cols[3] === 'merah' || cols[3]?.toUpperCase() === 'MERAH') ? 'Merah' : 'Biru',
            babak: (cols[4] as BabakType) || "Final",
            kategoriJurus: (cols[5] as JurusType) || "Tunggal",
            kategoriUsia: (cols[6] as UsiaType) || "Dewasa",
            gender: (cols[7] === 'Putri' || cols[7] === 'putri' || cols[7]?.toUpperCase() === 'PUTRI') ? 'Putri' : 'Putra'
          });
        }
      }

      if (parsedMatches.length > 0) {
        // Load the first match immediately to active
        const first = parsedMatches[0];
        
        let initialWaktuMenit = appState.waktuMenit;
        let initialTimer = appState.timer;
        
        const b = first?.babak || "Final";
        const k = first?.kategoriJurus || "Tunggal";
        const isTargetCategory = k === 'Tunggal Bebas' || k === 'Ganda' || k === 'Regu';
        
        if (isTargetCategory) {
          if (b === 'Penyisihan' || b === 'Perempat Final' || b === 'Semifinal') {
            initialWaktuMenit = '01:30';
            const secs = parseTimeToSeconds('01:30');
            initialTimer = {
              timeLeft: secs,
              duration: secs,
              isRunning: false,
              lastUpdated: Date.now()
            };
          } else if (b === 'Final') {
            initialWaktuMenit = '03:00';
            const secs = parseTimeToSeconds('03:00');
            initialTimer = {
              timeLeft: secs,
              duration: secs,
              isRunning: false,
              lastUpdated: Date.now()
            };
          }
        }

        onUpdateState({
          ...appState,
          partai: first?.partai || "",
          athleteName: first?.nama || "",
          athleteKontingen: first?.kontingen || "",
          athleteSudut: first?.sudut || "BIRU",
          babak: b,
          kategoriJurus: k,
          kategoriUsia: first?.kategoriUsia || "",
          gender: first?.gender || "Putra",
          waktuMenit: initialWaktuMenit,
          timer: initialTimer,
          matchSaved: false
        });

        setImportFeedback(`Berhasil mengimpor ${parsedMatches.length} data atlet! Atlet pertama '${first?.nama || ""}' aktif.`);
      } else {
        setImportFeedback("Gagal mengurai baris data. Pastikan format sesuai template.");
      }
    } catch (err) {
      setImportFeedback("Gagal mengimpor file: " + String(err));
    }
  };

  const handleExportHistoryToCSV = () => {
    const list = getHistory();
    if (list.length === 0) {
      alert("Belum ada histori pertandingan untuk diunduh.");
      return;
    }

    let csv = "ID;WAKTU;EVENT;TEMPAT;TANGGAL;PARTAI;BABAK;KATEGORI;USIA;GENDER;NAMA ATLET;KONTINGEN;SUDUT;JUMLAH JURI;MEDIAN SKOR;JURI DETAILS;STATUS\n";
    list.forEach(item => {
      const juriDetails = Object.entries(item.judgeScores)
        .map(([jId, info]) => `Juri${jId}: ${info.score.toFixed(2)} (${info.wrongMoveCount} WM)`)
        .join(" | ");

      const row = [
        item.id,
        item.timestamp,
        item.eventName,
        item.eventVenue,
        item.eventDate,
        item.partai,
        item.babak,
        item.kategoriJurus,
        item.kategoriUsia,
        item.gender,
        item.athleteName,
        item.athleteKontingen,
        item.athleteSudut,
        item.jumlahJuri,
        item.finalMedianScore.toFixed(3),
        `"${juriDetails}"`,
        item.status
      ].join(";");
      csv += row + "\n";
    });

    downloadFile(`Histori_Skoring_Seni_PencakSilat_${Date.now()}.csv`, csv);
  };

  // Convert current match results to History Records
  const handleSaveMatchToHistory = () => {
    // Collect judges scores
    const activeJudgesScoresList = Object.entries(appState.judges).map(([_, state]) => state.score);
    // Find Median
    const sorted = [...activeJudgesScoresList].sort((a, b) => a - b);
    let median = 0;
    const len = sorted.length;
    if (len > 0) {
      const mid = Math.floor(len / 2);
      if (len % 2 !== 0) {
        median = sorted[mid];
      } else {
        median = (sorted[mid - 1] + sorted[mid]) / 2;
      }
    }

    const newRecord: MatchRecord = {
      id: `MATCH-${appState.partai}-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date().toLocaleDateString('id-ID'),
      eventName: appState.eventName,
      eventVenue: appState.eventVenue,
      eventDate: appState.eventDate,
      partai: appState.partai,
      babak: appState.babak,
      kategoriJurus: appState.kategoriJurus,
      kategoriUsia: appState.kategoriUsia,
      gender: appState.gender,
      athleteName: appState.athleteName,
      athleteKontingen: appState.athleteKontingen,
      athleteSudut: appState.athleteSudut,
      jumlahJuri: appState.jumlahJuri,
      judgeScores: { ...appState.judges },
      finalMedianScore: median,
      allScoresSorted: sorted,
      isDisqualified: appState.isDisqualified,
      status: appState.isDisqualified ? 'Diskualifikasi' : 'Selesai'
    };

    const updatedHistory = [newRecord, ...history];
    saveHistory(updatedHistory);
    setHistory(updatedHistory);
    
    onUpdateState({
      ...appState,
      matchSaved: true
    });
    alert(`Hasil pertandingan Partai ${appState.partai} untuk ${appState.athleteName} berhasil disimpan ke histoy!`);
  };

  return (
    <div id="sekretaris-panel-container" className="h-full flex flex-col text-slate-100 bg-[#050510] p-4 select-none text-[13px] border border-blue-500/10">
      
      {/* HEADER SECTION (Event Name & Venue) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-500/30 pb-3 mb-3 gap-2">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-gradient-to-r from-blue-700 to-indigo-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-blue-900/40">
            SEKRETARIS TERMINAL
          </div>
          <div className="text-slate-400 max-w-lg truncate font-medium text-[11.5px] uppercase tracking-wider font-mono">
            IPSI 2024 SCORING MANAGEMENT CONTROL
          </div>
        </div>
        
        {/* Save Match Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetJudges}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600 hover:text-white text-amber-400 font-bold rounded-xl cursor-pointer transition duration-200 text-[11px]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Juri
          </button>
          
          <button
            onClick={handleSaveMatchToHistory}
            className={`${appState.matchSaved ? 'bg-emerald-950/45 text-emerald-400 border border-emerald-500/20 pointer-events-none' : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg shadow-emerald-900/30'} flex items-center gap-1.5 px-4 py-1.5 font-bold rounded-xl cursor-pointer transition duration-200 text-[11px]`}
          >
            <Check className="w-4 h-4" /> {appState.matchSaved ? 'Saved to History' : 'Simpan Pertandingan'}
          </button>
        </div>
      </div>

      {/* THREE COLUMN GRID - AUTO FIT SINGLE SCREEN */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* COLUMN 1: EVENT METRICS (Width spans 4/12) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#1a1a3a] to-[#0a0a20] p-4 rounded-2xl border border-blue-500/20 flex flex-col justify-between overflow-y-auto shadow-xl">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
              <Award className="w-4 h-4 text-blue-400" /> Detail Event & Branding
            </h3>
 
            {/* Event Name */}
            <div className="mb-3">
              <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Nama Event Kejuaraan</label>
              <input 
                type="text" 
                value={appState.eventName}
                onChange={(e) => updateField('eventName', e.target.value)}
                className="w-full bg-black/60 border border-white/10 focus:border-blue-500/85 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none transition font-sans text-xs"
                placeholder="cth: KEJUARAAN PENCAK SILAT IPSI REKOR..."
              />
            </div>

            {/* Venue & Date */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Tempat</label>
                <input 
                  type="text" 
                  value={appState.eventVenue}
                  onChange={(e) => updateField('eventVenue', e.target.value)}
                  className="w-full bg-black/60 border border-white/10 focus:border-blue-500/85 rounded-xl px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none text-xs transition"
                  placeholder="Tempat"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Tanggal</label>
                <input 
                  type="text" 
                  value={appState.eventDate}
                  onChange={(e) => updateField('eventDate', e.target.value)}
                  className="w-full bg-black/60 border border-white/10 focus:border-blue-500/85 rounded-xl px-3 py-1.5 text-slate-100 focus:outline-none text-xs transition"
                  placeholder="20 Juli 2026"
                />
              </div>
            </div>

            {/* Logo Sisi Kiri & Kanan */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">Logo Kiri</span>
                <div className="w-12 h-12 bg-black/60 border border-white/10 rounded-full flex items-center justify-center p-1.5 mb-2 overflow-hidden shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                  <img src={appState.logoLeft} alt="Kiri" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <button 
                  onClick={() => fileInputLeftRef.current?.click()}
                  className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] uppercase tracking-widest font-bold text-slate-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer transition duration-200"
                >
                  <Upload className="w-2.5 h-2.5" /> Upload
                </button>
                <input 
                  type="file" 
                  ref={fileInputLeftRef} 
                  onChange={(e) => handleLogoUpload(e, 'left')} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>

              <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">Logo Kanan</span>
                <div className="w-12 h-12 bg-black/60 border border-white/10 rounded-full flex items-center justify-center p-1.5 mb-2 overflow-hidden shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                  <img src={appState.logoRight} alt="Kanan" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <button 
                  onClick={() => fileInputRightRef.current?.click()}
                  className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] uppercase tracking-widest font-bold text-slate-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer transition duration-200"
                >
                  <Upload className="w-2.5 h-2.5" /> Upload
                </button>
                <input 
                  type="file" 
                  ref={fileInputRightRef} 
                  onChange={(e) => handleLogoUpload(e, 'right')} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/10 flex justify-between items-center text-[10px] font-mono">
            <span className="text-slate-500 uppercase tracking-widest">Logo Preset IPSI</span>
            <button 
              onClick={handleResetLogos}
              className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
            >
              Reset ke Default
            </button>
          </div>
        </div>

        {/* COLUMN 2: MATCH SETUP & VALUES (Width spans 4/12) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#1a1a3a] to-[#0a0a20] p-4 rounded-2xl border border-blue-500/20 flex flex-col justify-between overflow-y-auto shadow-xl">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
              <Clock className="w-4 h-4 text-indigo-400" /> Kategori & Waktu
            </h3>

            {/* Dropdown Babak & Kategori Jurus */}
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Babak</label>
                <select 
                  value={appState.babak}
                  onChange={(e) => updateField('babak', e.target.value as BabakType)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Penyisihan">Penyisihan</option>
                  <option value="Perempat Final">Perempat Final</option>
                  <option value="Semifinal">Semifinal</option>
                  <option value="Final">Final</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Kategori Jurus</label>
                <select 
                  value={appState.kategoriJurus}
                  onChange={(e) => updateField('kategoriJurus', e.target.value as JurusType)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Tunggal">Tunggal (Wajib)</option>
                  <option value="Tunggal Bebas">Tunggal Bebas</option>
                  <option value="Ganda">Ganda</option>
                  <option value="Regu">Regu</option>
                </select>
              </div>
            </div>

            {/* Dropdown Kategori Usia & Gender */}
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Kategori Usia</label>
                <select 
                  value={appState.kategoriUsia}
                  onChange={(e) => updateField('kategoriUsia', e.target.value as UsiaType)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Pra Usia Dini">Pra Usia Dini</option>
                  <option value="Usia Dini 1">Usia Dini 1</option>
                  <option value="Usia Dini 2">Usia Dini 2</option>
                  <option value="Pra Remaja">Pra Remaja</option>
                  <option value="Remaja">Remaja</option>
                  <option value="Dewasa">Dewasa</option>
                  <option value="Master 1">Master 1</option>
                  <option value="Master 2">Master 2</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Gender</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => updateField('gender', 'Putra')}
                    className={`py-1 text-xs font-bold text-center rounded-xl border transition duration-200 uppercase tracking-wider ${appState.gender === 'Putra' ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-900/50' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-black/60'}`}
                  >
                    MALE
                  </button>
                  <button
                    onClick={() => updateField('gender', 'Putri')}
                    className={`py-1 text-xs font-bold text-center rounded-xl border transition duration-200 uppercase tracking-wider ${appState.gender === 'Putri' ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-900/50' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-black/60'}`}
                  >
                    FEMALE
                  </button>
                </div>
              </div>
            </div>

            {/* Dropdown Waktu + Jumlah Juri */}
            <div className="grid grid-cols-2 gap-2 mb-3.5">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Durasi Waktu</label>
                <select 
                  value={appState.waktuMenit}
                  onChange={(e) => updateField('waktuMenit', e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="01:00">01:00 Menit</option>
                  <option value="01:10">01:10 Menit</option>
                  <option value="01:20">01:20 Menit</option>
                  <option value="01:30">01:30 Menit</option>
                  <option value="01:40">01:40 Menit</option>
                  <option value="01:50">01:50 Menit</option>
                  <option value="02:00">02:00 Menit</option>
                  <option value="03:00">03:00 Menit</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Panel Juri</label>
                <select 
                  value={appState.jumlahJuri}
                  onChange={(e) => updateField('jumlahJuri', parseInt(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-black"
                >
                  <option value={4}>4 JURI PANEL</option>
                  <option value={6}>6 JURI PANEL</option>
                  <option value={8}>8 JURI PANEL</option>
                  <option value={10}>10 JURI PANEL</option>
                </select>
              </div>
            </div>

            {/* CENTRAL REAL-TIME TIMER CONTROL BOX */}
            <div className="bg-black/50 rounded-2xl p-3 border border-white/10 text-center shadow-inner relative overflow-hidden">
              <span className="text-[9px] text-[#ff2a55] uppercase tracking-[0.25em] font-mono block">RUN TIMER</span>
              <div className="text-3xl font-mono font-black text-red-500 my-1 tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                {formatSecondsToTime(appState.timer.timeLeft)}
              </div>
              <div className="flex justify-center gap-2 mt-1.5">
                <button 
                  onClick={toggleTimer}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 font-black uppercase text-[10px] tracking-wide rounded-xl cursor-pointer transition duration-300 ${appState.timer.isRunning ? 'bg-red-650 hover:bg-red-600 text-white border border-red-500 shadow-md shadow-red-900/50' : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-md shadow-emerald-950/50'}`}
                >
                  {appState.timer.isRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5 animate-pulse" /> PAUSE
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> RUN TIMER
                    </>
                  )}
                </button>

                <button 
                  onClick={resetTimer}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-bold tracking-widest text-[10px] rounded-xl flex items-center gap-1 cursor-pointer hover:bg-white/10 transition"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> RESET
                </button>
              </div>
            </div>

          </div>

          <div className="p-2.5 mt-2 bg-blue-950/20 border border-blue-500/20 rounded-xl text-[10px] font-mono text-blue-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block shrink-0" />
            <span>Waktu dan countdown tersinkronisasi multi-tab secara langsung.</span>
          </div>
        </div>

        {/* COLUMN 3: ATHLETE & DATA BULK ACTIONS (Width spans 4/12) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#1a1a3a] to-[#0a0a20] p-4 rounded-2xl border border-blue-500/20 flex flex-col justify-between overflow-y-auto shadow-xl">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-3 border-b border-white/10 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Atlet Seni Aktif
              </div>
              <div className="text-[10px] text-slate-500 font-mono uppercase">PARTAI: {appState.partai}</div>
            </h3>

            {/* Partai & Sudut */}
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">No. Partai</label>
                <input 
                  type="text" 
                  value={appState.partai}
                  onChange={(e) => updateField('partai', e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs transition"
                  placeholder="Partai"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Sudut Arena</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => {
                      setAthleteInput({ ...athleteInput, sudut: 'Biru' });
                      onUpdateState({ ...appState, athleteSudut: 'Biru', matchSaved: false });
                    }}
                    className={`py-1 text-xs font-black text-center rounded-xl border transition text-[10px] duration-200 ${athleteInput.sudut === 'Biru' ? 'bg-blue-600/30 border-blue-500/60 text-white shadow-[0_0_15px_rgba(59,130,246,0.55)]' : 'bg-black/40 border-white/5 text-blue-400 hover:bg-black/60'}`}
                  >
                    BIRU
                  </button>
                  <button
                    onClick={() => {
                      setAthleteInput({ ...athleteInput, sudut: 'Merah' });
                      onUpdateState({ ...appState, athleteSudut: 'Merah', matchSaved: false });
                    }}
                    className={`py-1 text-xs font-black text-center rounded-xl border transition text-[10px] duration-200 ${athleteInput.sudut === 'Merah' ? 'bg-red-600/30 border-red-500/60 text-white shadow-[0_0_15px_rgba(239,68,68,0.55)]' : 'bg-black/40 border-white/5 text-red-500 hover:bg-black/60'}`}
                  >
                    MERAH
                  </button>
                </div>
              </div>
            </div>

            {/* Nama Atlet */}
            <div className="mb-2.5">
              <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Nama Lengkap Atlet</label>
              <input 
                type="text"
                value={athleteInput.nama}
                onChange={(e) => setAthleteInput({ ...athleteInput, nama: e.target.value })}
                onBlur={handleApplyAthlete}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-slate-100 text-xs focus:border-emerald-500 focus:outline-none transition"
                placeholder="Nama Atlet"
              />
            </div>

            {/* Kontingen */}
            <div className="mb-3.5">
              <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">Kontingen</label>
              <input 
                type="text" 
                value={athleteInput.kontingen}
                onChange={(e) => setAthleteInput({ ...athleteInput, kontingen: e.target.value })}
                onBlur={handleApplyAthlete}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-slate-100 text-xs focus:border-emerald-500 focus:outline-none transition"
                placeholder="Provinsi / Daerah"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleApplyAthlete}
                className="w-full py-1.5 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition hover:bg-white/10 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Terapkan Data Atlet
              </button>
            </div>

            {/* BULK UPLOAD EXCEL / CSV TOOL */}
            <div className="mt-3.5 pt-3.5 border-t border-white/10">
              <span className="block text-slate-400 font-mono text-[9px] uppercase tracking-[0.2em] mb-1.5">BULK REGISTRATION CSV</span>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleExportTemplate}
                  className="px-2 py-1.5 bg-black/60 border border-white/10 text-slate-300 hover:text-white rounded-xl text-[10px] tracking-wider uppercase font-bold flex items-center justify-center gap-1 transition-all"
                  title="Unduh format templating"
                >
                  <Download className="w-3 h-3 text-sky-400" /> TEMP. CSV
                </button>

                <label className="px-2 py-1.5 bg-black/60 border border-indigo-500/30 text-slate-300 hover:text-white rounded-xl text-[10px] tracking-wider uppercase font-bold flex items-center justify-center gap-1 cursor-pointer transition-all">
                  <Upload className="w-3 h-3 text-indigo-400" /> IMPORT CSV
                  <input 
                    type="file" 
                    onChange={handleCSVImport} 
                    className="hidden" 
                    accept=".csv,text/csv,application/vnd.ms-excel" 
                  />
                </label>
              </div>

              {importFeedback && (
                <div className="mt-2 p-1.5 bg-black/40 border border-indigo-500/20 rounded-lg text-[10px] font-mono text-indigo-300 text-center animate-fade-in line-clamp-2">
                  {importFeedback}
                </div>
              )}
            </div>

          </div>

          <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-white/5">
            <button
              onClick={() => onUpdateState({ ...appState, isDisqualified: !appState.isDisqualified })}
              className={`w-full py-1.5 text-[10px] font-black tracking-widest rounded-xl uppercase flex items-center justify-center gap-1 transition ${appState.isDisqualified ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600/10 border border-red-505/20 text-red-500 hover:bg-red-650 hover:text-white'}`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {appState.isDisqualified ? 'BATALKAN DISKUALIFIKASI' : 'DISKUALIFIKASI ATLET'}
            </button>
          </div>
        </div>

      </div>

      {/* LOWER TAB - HISTORI PERTANDINGAN (GRID ROW SAVED MATCHES) */}
      <div className="mt-4 border-t border-blue-500/20 pt-3 flex flex-col min-h-[140px] max-h-[180px] bg-black/60 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="font-black text-xs text-white flex items-center gap-2 uppercase tracking-widest font-mono">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            Histori Pertandingan Tersertifikasi ({history.length} Saved)
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportHistoryToCSV}
              className="px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl flex items-center gap-1 transition text-[10px] uppercase tracking-wider cursor-pointer"
              title="Unduh seluruh histori ke file excel"
            >
              <Download className="w-3 h-3 text-sky-400" /> Export Excel
            </button>
            <button 
              onClick={handleClearHistory}
              className="px-3 py-1 bg-red-600/10 border border-red-500/20 hover:bg-red-600 hover:text-white text-red-400 font-bold rounded-xl flex items-center gap-0.5 transition text-[10px] uppercase tracking-wider cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Clear Logs
            </button>
          </div>
        </div>

        {/* Saved Items Wrapper */}
        <div className="flex-1 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-slate-500 border border-dashed border-white/10 rounded-xl bg-[#050510] py-4">
              <span className="text-xs uppercase font-mono tracking-wider">Belum ada rekam data tersimpan. Lakukan penilaian juri, lalu klik "Simpan Pertandingan".</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[11.5px] bg-black/40 rounded-xl overflow-hidden shadow-inner">
              <thead>
                <tr className="bg-gradient-to-r from-[#0a0a25] to-[#101035] text-slate-400 font-bold text-[9.5px] uppercase tracking-widest border-b border-white/10">
                  <th className="p-2 pl-3">No.</th>
                  <th className="p-2">Waktu</th>
                  <th className="p-2">Partai</th>
                  <th className="p-2">Atlit / Kontingen</th>
                  <th className="p-2">Kategori</th>
                  <th className="p-2">Juri Penilai</th>
                  <th className="p-2 text-center">Median IPSI</th>
                  <th className="p-2 pr-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((record, rIdx) => (
                  <tr key={`${record.id || rIdx}-${rIdx}`} className="hover:bg-blue-950/20 transition duration-150">
                    <td className="p-2 pl-3 text-blue-400 font-mono font-bold">{record.partai}</td>
                    <td className="p-2 text-slate-500 font-mono text-[10px]">{record.timestamp.split(' ')[0]}</td>
                    <td className="p-2 font-black text-slate-300">Partai {record.partai}</td>
                    <td className="p-2">
                      <span className="font-bold text-slate-100">{record.athleteName}</span>
                      <span className="text-slate-400 font-mono block text-[9.5px] leading-tight mt-0.5 uppercase tracking-wide">{record.athleteKontingen} ({record.gender})</span>
                    </td>
                    <td className="p-2 text-slate-400 text-xs font-medium">
                      {record.babak} - {record.kategoriJurus} {record.kategoriUsia}
                    </td>
                    <td className="p-2 text-[10px] font-mono text-slate-400 tracking-tight max-w-xs truncate">
                      {(Object.entries(record.judgeScores) as Array<[string, { score: number, wrongMoveCount: number, isFinished: boolean }]>).map(([k, v]) => `J${k}:${v.score.toFixed(2)}`).join(", ")}
                    </td>
                    <td className="p-2 font-mono font-bold text-center text-amber-400 text-[13px] glow-text-amber">
                      {record.finalMedianScore.toFixed(3)}
                    </td>
                    <td className="p-2 pr-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold inline-block font-mono tracking-widest ${record.status === 'Selesai' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-red-600/20 text-red-400 border border-red-500/30'}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
