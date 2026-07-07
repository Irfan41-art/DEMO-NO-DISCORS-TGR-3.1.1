/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MatchState, JuriSeniScore, CornerSeniState } from "../types";
import {
  calculateFinalScore,
  calculateSeniScoreForJuri,
  calculateSeniHukumanTotal,
  evaluateTieBreak,
  calculateSeniStandardDeviation,
  calculateSeniKebenaranScore,
} from "../appState";
import { playClickSound, playBuzzer, playGongSound } from "../sound";
import {
  Gavel,
  Play,
  Pause,
  Square,
  Lock,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Maximize2,
  Minimize2,
  HelpCircle,
  Info,
  Clock,
  User,
  Users,
  Award,
  Settings,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Trophy,
  UserX,
  ShieldAlert,
} from "lucide-react";

interface DewanPanelProps {
  matchState: MatchState;
  updateMatchState: (newState: MatchState) => void;
  onBackToLanding?: () => void;
}

export const DewanPanel: React.FC<DewanPanelProps> = ({
  matchState,
  updateMatchState,
  onBackToLanding,
}) => {
  const isPoolSystem = matchState.sistemTanding === 'POOL' || 
                       matchState.tahapPertandingan?.toUpperCase().includes('POOL') || 
                       matchState.atlitMerah?.nama === '---' || 
                       matchState.atlitBiru?.nama === '---';

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeCorner, setActiveCorner] = useState<"MERAH" | "BIRU">("BIRU");

  const activeJudgesList = Array.from(
    { length: matchState.jumlahJuri || 10 },
    (_, i) => i + 1,
  );

  const allActiveJudgesReady = activeJudgesList.length > 0 && activeJudgesList.every((id) => {
    const jsObj = matchState.seniScores?.[activeCorner]?.juriScores?.[id];
    return jsObj?.isReady === true;
  });

  const allActiveJudgesFinished = activeJudgesList.length > 0 && activeJudgesList.every((id) => {
    const jsObj = matchState.seniScores?.[activeCorner]?.juriScores?.[id];
    return jsObj?.isLocked === true;
  });

  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [isDewanInputFinished, setIsDewanInputFinished] = useState(false);

  useEffect(() => {
    setIsDewanInputFinished(false);
    setIsBannerOpen(false);
    setHasAutoOpened(false);
  }, [activeCorner]);

  useEffect(() => {
    if (allActiveJudgesReady) {
      if (!hasAutoOpened) {
        setIsBannerOpen(true);
        setHasAutoOpened(true);
      }
    } else {
      setHasAutoOpened(false);
      setIsDewanInputFinished(false);
    }
  }, [allActiveJudgesReady, hasAutoOpened]);

  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<"MERAH" | "BIRU" | null>(
    null,
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showManualOverrides, setShowManualOverrides] = useState(false);
  const [showLanjutConfirm, setShowLanjutConfirm] = useState(false);
  const [showLanjutPoolConfirm, setShowLanjutPoolConfirm] = useState(false);
  const [showAkhiriConfirm, setShowAkhiriConfirm] = useState(false);
  const [showDiskUdModal, setShowDiskUdModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'DISKUALIFIKASI' | 'UNDUR_DIRI' | null>(null);
  const [autoDiskReason, setAutoDiskReason] = useState<string | null>(null);
  const [autoDiskTargetCorner, setAutoDiskTargetCorner] = useState<'BIRU' | 'MERAH' | 'BOTH' | null>(null);

  // Flash effect state for active judges on KESALAHAN GERAK row (TUNGGAL & REGU)
  const [flashJuri, setFlashJuri] = useState<Record<number, boolean>>({});
  const [prevScores, setPrevScores] = useState<Record<string, Record<number, number>>>({});

  useEffect(() => {
    // Only apply for TUNGGAL and REGU categories
    const category = matchState.kategoriSeni || "TUNGGAL";
    if (category !== "TUNGGAL" && category !== "REGU") {
      return;
    }

    const corner = activeCorner;
    const currentCornerScores = matchState.seniScores?.[corner]?.juriScores || {};
    const previousCornerScores = prevScores[corner] || {};

    const nextPrevScores = { ...prevScores };
    if (!nextPrevScores[corner]) {
      nextPrevScores[corner] = {};
    }

    let triggeredFlash = false;
    const newFlashJuri = { ...flashJuri };

    // We check all active/potential juri IDs (up to 10)
    for (let id = 1; id <= 10; id++) {
      const currentCount = currentCornerScores[id]?.salahGerakCount || 0;
      const previousCount = previousCornerScores[id] !== undefined ? previousCornerScores[id] : currentCount;

      if (currentCount > previousCount) {
        // Trigger flash
        newFlashJuri[id] = true;
        triggeredFlash = true;

        // Remove flash after a quick delay (e.g. 350ms) to make it a single fast blink
        setTimeout(() => {
          setFlashJuri((prev) => ({
            ...prev,
            [id]: false,
          }));
        }, 350);
      }
      // Update our stored reference
      nextPrevScores[corner][id] = currentCount;
    }

    if (triggeredFlash) {
      setFlashJuri(newFlashJuri);
    }
    setPrevScores(nextPrevScores);
  }, [matchState.seniScores, activeCorner, matchState.kategoriSeni]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Synchronize active corner with Secretary panel direction
  useEffect(() => {
    if (matchState?.activeCorner) {
      setActiveCorner(matchState.activeCorner);
    } else {
      setActiveCorner("BIRU");
    }
  }, [matchState?.activeCorner]);

  const toggleFullscreen = () => {
    playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Error exiting fullscreen:", err);
      });
    }
  };

  const saveState = (updated: MatchState) => {
    updateMatchState(updated);
  };

  const getSeniDqThreshold = (kategoriUsia?: string) => {
    const kUsiaNormalized = (kategoriUsia || "").toUpperCase().trim().replace(/[-_]/g, " ");
    const isGroup1 = kUsiaNormalized.includes("PRA USIA DINI") || 
                     kUsiaNormalized.includes("USIA DINI 1") || 
                     kUsiaNormalized.includes("USIA DINI I") || 
                     kUsiaNormalized.includes("USIA DINI 2") || 
                     kUsiaNormalized.includes("USIA DINI II") ||
                     kUsiaNormalized.includes("USIA DINI") ||
                     kUsiaNormalized.includes("PRA REMAJA");
    return isGroup1 ? 16 : 11;
  };

  const checkCornerAutoDq = (state: MatchState, corner: 'BIRU' | 'MERAH') => {
    if (!state) return null;
    
    const isSeniMatch =
      ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(
        state.kelas || ""
      ) ||
      ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(
        state.kategoriSeni || ""
      );

    if (!isSeniMatch) return null;
    if (state.diskualifikasi === corner || state.diskualifikasi === 'BOTH') return null; // already disqualified

    const target = state.durasiBabak || 180;
    const actual = corner === 'BIRU' ? (state.durasiTampilBIRU || 0) : (state.durasiTampilMERAH || 0);
    const deviation = Math.abs(actual - target);

    const threshold = getSeniDqThreshold(state.kategoriUsia);

    if (deviation >= threshold) {
      if (threshold === 16) {
        return `Waktu tampil Sudut ${corner} (${actual} detik) berbeda ${deviation} detik dari target durasi (${target} detik). Sesuai aturan kategori ${state.kategoriUsia}, toleransi deviasi adalah ±15 detik (berlaku di 16 detik kurang/lebih).`;
      } else {
        return `Waktu tampil Sudut ${corner} (${actual} detik) berbeda ${deviation} detik dari target durasi (${target} detik). Sesuai aturan kategori ${state.kategoriUsia}, toleransi deviasi adalah ±10 detik (berlaku di 11 detik kurang/lebih).`;
      }
    }

    return null;
  };

  // Timer Handlers
  const toggleTimer = () => {
    if (!matchState.timerBerjalan && matchState.timerPlayLocked) {
      return;
    }
    playClickSound();
    const nextState = !matchState.timerBerjalan;

    let gongPlayedForCurrentRound = matchState.gongPlayedForCurrentRound;
    let timerPlayLocked = matchState.timerPlayLocked;

    if (!nextState) {
      // stopping
      timerPlayLocked = true;
      if (!gongPlayedForCurrentRound) {
        playGongSound();
        gongPlayedForCurrentRound = true;
      }
    } else {
      // starting
      if (matchState.sisaWaktu === 0) {
        playGongSound();
      }
    }

    const localGetMaxRounds = (kUsia?: string) => {
      const k = (kUsia || "").toUpperCase().trim();
      if (k === "USIA DINI B" || k === "USIA DINI A" || k === "USIA DINI")
        return 2;
      if (k === "PRA REMAJA" || k === "PRA-REMAJA") return 2;
      return 3;
    };

    const localDetermineWinner = (state: MatchState) => {
      const scoreB = calculateFinalScore("BIRU", state);
      const scoreR = calculateFinalScore("MERAH", state);
      if (scoreB > scoreR) return "BIRU";
      if (scoreR > scoreB) return "MERAH";
      return null;
    };

    const currentRound = matchState.babakAktif;
    const maxRounds = localGetMaxRounds(matchState.kategoriUsia);
    const isSeniMatch =
      ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(
        matchState.kelas,
      ) ||
      ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(
        matchState.kategoriSeni,
      );

    let isMatchFinished = false;
    let updatedHasPerformed = {};

    if (isSeniMatch) {
      // In Seni matches, popup triggers ONLY when all Juris press FINISH, not on timer stopping
    } else {
      isMatchFinished = currentRound === maxRounds;
    }

    const isRoundFinished = isSeniMatch
      ? true
      : matchState.sisaWaktu >= matchState.durasiBabak;

    const stoppedState: any = {
      ...matchState,
      ...updatedHasPerformed,
      statusPertandingan: "BERJALAN" as const,
      timerBerjalan: nextState,
      showRoundEndPopUp: isSeniMatch
        ? matchState.showRoundEndPopUp
        : !nextState && isRoundFinished,
      showMatchEndPopUp: isSeniMatch
        ? matchState.showMatchEndPopUp
        : !nextState && isRoundFinished && isMatchFinished,
      gongPlayedForCurrentRound,
      timerPlayLocked,
      version: Date.now(),
    };

    if (!nextState && isRoundFinished && isMatchFinished && !isSeniMatch) {
      stoppedState.statusPertandingan = "SELESAI";
      stoppedState.pemenang = localDetermineWinner(stoppedState);
    }

    saveState(stoppedState);
  };

  const resetTimer = () => {
    playClickSound();
    const defaultDuration = matchState.durasiBabak || 180;
    const updated = {
      ...matchState,
      sisaWaktu: 0,
      timer2Value: 0,
      durasiBabak: defaultDuration,
      timerBerjalan: false,
      gongPlayedForCurrentRound: false,
      timerPlayLocked: false,
      version: Date.now(),
    };
    saveState(updated);
    setShowResetConfirm(false);
  };

  const setTimerDuration = (seconds: number) => {
    playClickSound();
    const updated = {
      ...matchState,
      sisaWaktu: 0,
      durasiBabak: seconds,
      timerBerjalan: false,
      version: Date.now(),
    };
    saveState(updated);
  };

  // Category Selector
  const changeCategorySeni = (
    category: "TUNGGAL" | "GANDA" | "REGU" | "SOLO_KREATIF",
  ) => {
    playClickSound();
    const duration = 180;
    const updated = {
      ...matchState,
      kategoriSeni: category,
      durasiBabak: duration,
      sisaWaktu: 0,
      timerBerjalan: false,
      version: Date.now(),
    };
    saveState(updated);
  };

  // Juri Score Adjustments
  const adjustJuriFieldValue = (
    corner: "MERAH" | "BIRU",
    juriId: number,
    field:
      | "kebenaran"
      | "teknikSerangBela"
      | "teknikSenjataKoreografi"
      | "kemantapan",
    adjustment: number,
  ) => {
    playClickSound();
    const updated = { ...matchState };
    const curScores = { ...updated.seniScores[corner] };
    const curJuri = { ...curScores.juriScores[juriId] };

    let minVal = 50;
    let maxVal = 60;
    if (field === "kebenaran") {
      minVal = 0;
      maxVal = 100;
    }

    const newVal = Math.round((curJuri[field] + adjustment) * 10) / 10;
    curJuri[field] = Math.max(minVal, Math.min(maxVal, newVal));

    // Auto-calculate mistake count based on kebenaran reduction
    if (field === "kebenaran" && adjustment < 0) {
      curJuri.salahGerakCount = Math.max(0, curJuri.salahGerakCount + 1);
    } else if (field === "kebenaran" && adjustment > 0) {
      curJuri.salahGerakCount = Math.max(0, curJuri.salahGerakCount - 1);
    }

    curScores.juriScores[juriId] = curJuri;
    updated.seniScores[corner] = curScores;
    updated.version = Date.now();
    saveState(updated);
  };

  // Adjust Hukuman (Deductions) from Dewan
  const adjustHukuman = (
    corner: "MERAH" | "BIRU",
    field:
      | "waktu"
      | "pakaian"
      | "suara"
      | "gelanggang"
      | "senjataJatuh"
      | "other",
    adjustment: number,
  ) => {
    playClickSound();
    const updated = { ...matchState };
    const curScores = { ...updated.seniScores[corner] };
    const curHukuman = { ...curScores.hukumanLog };

    const newVal = Math.round((curHukuman[field] + adjustment) * 10) / 10;
    curHukuman[field] = Math.max(0, newVal);

    curScores.hukumanLog = curHukuman;
    updated.seniScores[corner] = curScores;
    updated.version = Date.now();
    saveState(updated);
  };

  const clearHukuman = (corner: "MERAH" | "BIRU", field: string) => {
    playClickSound();
    const updated = { ...matchState };
    const curScores = { ...updated.seniScores[corner] };
    const curHukuman = { ...curScores.hukumanLog };

    curHukuman[field as any] = 0;

    curScores.hukumanLog = curHukuman;
    updated.seniScores[corner] = curScores;
    updated.version = Date.now();
    saveState(updated);
  };

  // Final Winner Declarations
  const declareWinnerAndFinish = (winner: "MERAH" | "BIRU") => {
    playClickSound();
    const updated = {
      ...matchState,
      pemenang: winner,
      statusPertandingan: "SELESAI" as const,
      showMatchEndPopUp: true,
      version: Date.now(),
    };
    saveState(updated);
    setShowWinnerModal(false);
  };

  // Calculations for display
  const getSubtotalsForCorner = (corner: "MERAH" | "BIRU") => {
    const sScores = matchState.seniScores[corner];
    const cat = matchState.kategoriSeni || "TUNGGAL";
    const jCount = matchState.jumlahJuri || 10;

    let sumJuri = 0;
    const scoresList: number[] = [];
    for (let i = 1; i <= jCount; i++) {
      const scoreObj = sScores.juriScores[i] || {
        juriId: i,
        kebenaran: 100,
        teknikSerangBela: 50,
        teknikSenjataKoreografi: 50,
        kemantapan: 50,
        salahGerakCount: 0,
        salahSenjataCount: 0,
        suaraCount: 0,
        keluarGelanggangCount: 0,
        pakaianAksesorisCount: 0,
      };
      const scoreVal = calculateSeniScoreForJuri(cat, scoreObj);
      sumJuri += scoreVal;
      scoresList.push(scoreVal);
    }

    const avgJuri = jCount > 0 ? sumJuri / jCount : 0;
    const hukuman = calculateSeniHukumanTotal(sScores.hukumanLog);
    const finalScore = calculateFinalScore(corner, matchState);

    return {
      sumJuri,
      avgJuri,
      hukuman,
      finalScore,
      scoresList,
    };
  };

  const merahStats = getSubtotalsForCorner("MERAH");
  const biruStats = getSubtotalsForCorner("BIRU");

  const formatMinSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getDewanPenaltyList = (state: MatchState) => {
    const cat = (state.kategoriSeni || "TUNGGAL").toUpperCase();
    const kel = (state.kelas || "").toUpperCase();
    const isTunggalBebas =
      cat === "SOLO_KREATIF" ||
      cat === "TUNGGAL BEBAS" ||
      kel === "TUNGGAL BEBAS" ||
      kel === "SOLO_KREATIF" ||
      kel === "SOLO KREATIF";

    if (isTunggalBebas) {
      return [
        { id: "gelanggang", label: "PENAMPILAN SATU KAKI KELUAR GELANGGANG 10 M X 10 M." },
        { id: "senjataJatuh", label: "SENJATA JATUH TIDAK MEMENUHI SINOPSIS." },
        { id: "suara", label: "SENJATA JATUH KELUAR GELANGGANG SAAT MASIH HARUS DIGUNAKAN." },
        { id: "other", label: "SENJATA TERLEPAS DARI GAGANGNYA / PATAH / RUSAK" },
        { id: "pakaian", label: "MENGENAKAN PAKAIAN YANG TIDAK SESUAI DENGAN KETENTUAN" },
        { id: "waktu", label: "PENAMPILAN MELEBIHI / KURANG DARI TOLERANSI WAKTU" },
      ];
    } else if (cat === "GANDA") {
      return [
        { id: "waktu", label: "PENAMPILAN LEBIH / KURANG DARI TOLERANSI WAKTU" },
        { id: "gelanggang", label: "PENAMPILAN KELUAR GELANGGANG 10 M X 10 M." },
        { id: "senjataJatuh", label: "SENJATA JATUH TIDAK SESUAI DENGAN DESKRIPSI." },
        { id: "suara", label: "SENJATA JATUH DI LUAR GELANGGANG SAAT TIM MASIH HARUS MENGGUNAKANNYA." },
        { id: "pakaian", label: "PAKAIAN TIDAK SESUAI ATURAN (ATASAN DAN BAWAHAN, SERTA KAIN SAMPING DAN IKAT KEPALA TIDAK 1 (SATU) MOTIF / PAKAIAN ROBEK)" },
        { id: "other", label: "MENAHAN GERAKAN LEBIH DARI 5 (LIMA) DETIK." },
      ];
    } else if (cat === "REGU") {
      return [
        { id: "waktu", label: "PENAMPILAN LEBIH ATAU KURANG DARI TOLERANSI WAKTU" },
        { id: "gelanggang", label: "PENAMPILAN KELUAR GELANGGANG 10 m X 10 m." },
        { id: "pakaian", label: "PAKAIAN TIDAK SESUAI ATURAN." },
        { id: "other", label: "MENAHAN GERAKAN LEBIH DARI 5 (LIMA) DETIK." },
      ];
    } else {
      // TUNGGAL
      return [
        { id: "waktu", label: "PENAMPILAN MELEBIHI / KURANG DARI TOLERANSI WAKTU" },
        { id: "gelanggang", label: "PENAMPILAN KELUAR GELANGGANG 10m X 10m" },
        { id: "senjataJatuh", label: "SENJATA JATUH, MENYENTUH MATRAS" },
        { id: "pakaian", label: "PAKAIAN TIDAK SESUAI ATURAN (KAIN SAMPING JATUH, TIDAK SATU MOTIF, BAJU ATASAN DAN BAWAHAN TIDAK SATU WARNA)" },
        { id: "other", label: "MENAHAN GERAKAN LEBIH DARI 5 (LIMA) DETIK" },
      ];
    }
  };

  return (
    <div
      id="dewan-seni-panel"
      className={`w-full flex flex-col bg-gradient-to-br from-[#080d24] via-[#0b0f27] to-[#1e0d30] text-slate-100 select-none font-sans relative ${
        isFullscreen
          ? "h-screen overflow-hidden p-1.5"
          : "min-h-screen p-2 md:p-4"
      }`}
    >
      {/* Background Watermark Accent */}
      <div className="absolute inset-0 pointer-events-none flex justify-center items-center z-0 opacity-[0.08]">
        <img 
          src="./temadiscors.png" 
          alt="Watermark Premium"
          className="w-[900px] h-[900px] md:w-[1200px] md:h-[1200px] object-contain filter drop-shadow-[0_0_50px_rgba(168,85,247,0.2)]"
          referrerPolicy="no-referrer"
        />
      </div>
      {/* ========================================================================= */}
      {/* ADMINISTRATIVE CONTROLS DASHBOARD (REMOVED RECENTLY PER USER REQUEST)     */}
      {/* ========================================================================= */}

      {/* ========================================================================= */}
      {/* EMERGENCY MANUAL JURI SCORE OVERRIDES PANEL (COLLAPSABLE)                  */}
      {/* ========================================================================= */}
      {showManualOverrides && (
        <section className="bg-slate-900 border border-purple-500/35 p-4 rounded-2xl mb-4 shadow-xl z-20 relative animate-fadeIn select-none text-left">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-1">
              <User className="w-4 h-4 text-purple-500" />
              PENGATURAN DARURAT SCORE JURI (SUDUT AKTIF: {activeCorner})
            </span>
            <button
              onClick={() => setShowManualOverrides(false)}
              className="text-slate-400 hover:text-white text-xs font-bold bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-lg"
            >
              TUTUP PENGATURAN
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from(
              { length: matchState.jumlahJuri || 10 },
              (_, i) => i + 1,
            ).map((juriId) => {
              const jScore = matchState.seniScores[activeCorner].juriScores[
                juriId
              ] || {
                kebenaran: 100,
                teknikSerangBela: 50,
                teknikSenjataKoreografi: 50,
                kemantapan: 50,
                salahGerakCount: 0,
                salahSenjataCount: 0,
                suaraCount: 0,
                keluarGelanggangCount: 0,
                pakaianAksesorisCount: 0,
              };
              return (
                <div
                  key={juriId}
                  className="bg-slate-955 p-3 rounded-xl border border-slate-800"
                >
                  <div className="flex justify-between items-center mb-2 border-b border-slate-900 pb-1">
                    <span className="text-xs font-black text-slate-300 font-mono font-sans font-bold">
                      JURI {juriId}
                    </span>
                    <span className="text-[10px] font-bold text-amber-500 font-mono">
                      Total:{" "}
                      {calculateSeniScoreForJuri(
                        matchState.kategoriSeni,
                        jScore,
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-3.5 text-[10px]">
                    {/* Kebenaran Controller */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-bold text-slate-400">
                        <span>SKOR KEBENARAN (0-100)</span>
                        <span className="font-mono text-slate-100">
                          {jScore.kebenaran}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            adjustJuriFieldValue(
                              activeCorner,
                              juriId,
                              "kebenaran",
                              -1,
                            )
                          }
                          className="flex-1 bg-red-950/20 hover:bg-red-900/20 text-red-400 py-1 rounded font-bold border border-red-900/20 cursor-pointer active:scale-95"
                        >
                          -1 PT (SALAH)
                        </button>
                        <button
                          onClick={() =>
                            adjustJuriFieldValue(
                              activeCorner,
                              juriId,
                              "kebenaran",
                              1,
                            )
                          }
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1 rounded border border-slate-755 cursor-pointer active:scale-95"
                        >
                          +1 PT
                        </button>
                      </div>
                    </div>

                    {/* Flow & Stamina / Assessment (starts at 50) */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between font-bold text-slate-400">
                        <span>KEMANTAPAN, RASA & HARMONI</span>
                        <span className="font-mono text-slate-100">
                          {jScore.kemantapan}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            adjustJuriFieldValue(
                              activeCorner,
                              juriId,
                              "kemantapan",
                              -1,
                            )
                          }
                          className="flex-1 bg-slate-800 hover:bg-slate-755 text-slate-300 py-1 rounded border border-slate-755 cursor-pointer active:scale-95"
                        >
                          -1 PT
                        </button>
                        <button
                          onClick={() =>
                            adjustJuriFieldValue(
                              activeCorner,
                              juriId,
                              "kemantapan",
                              1,
                            )
                          }
                          className="flex-1 bg-indigo-950/20 hover:bg-indigo-900/20 text-indigo-400 py-1 rounded border border-indigo-900/20 cursor-pointer active:scale-95"
                        >
                          +1 PT
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* CORE scoreboard VIEW (LIGHT-GREY / BLUE MATTE THEME MATCHING THE IMAGE)     */}
      {/* ========================================================================= */}
      <section
        className={`flex-1 w-full bg-transparent border-0 relative select-none flex flex-col ${
          isFullscreen
            ? "max-w-full p-4 overflow-hidden min-w-0 h-full justify-start"
            : "max-w-full px-4 md:px-8 py-5 w-full justify-between"
        }`}
      >
        <div
          className={`flex-1 flex flex-col justify-start w-full h-full ${
            isFullscreen ? "min-h-0 gap-2" : "gap-4"
          }`}
        >
          {/* Header ribbon section from the image */}
          <div
            className={`relative overflow-hidden w-full bg-gradient-to-r from-[#1d072b] via-[#0c051a] to-[#04010b] border border-[#ff00ea]/15 shadow-xl rounded-2xl px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4 ${isFullscreen ? "mb-3" : "mb-5"}`}
          >
            {/* Ambient maroon glow on the right side */}
            <div className="absolute right-0 top-0 bottom-0 w-[45%] bg-gradient-to-l from-[#aa113b]/25 via-[#540416]/10 to-transparent pointer-events-none z-0 rounded-r-2xl" />

            {/* Left Column: Event Title and details */}
            <div className="relative z-10 flex flex-col text-left justify-center flex-1 w-full md:w-auto">
              <h1 className="text-white font-extrabold text-base md:text-lg lg:text-xl xl:text-2xl tracking-wide uppercase leading-tight font-sans">
                {matchState.eventName || "KEJUARAAN NASIONAL PENCAK SILAT 2026"}
              </h1>
              <div className="text-slate-300 font-bold text-xs md:text-sm tracking-wider mt-2 flex items-center flex-wrap gap-2 md:gap-2.5 select-none font-sans">
                {isPoolSystem ? (
                  <>
                    <span>
                      {(matchState.gelanggang || "GELANGGANG 1").toUpperCase()}
                    </span>
                    <span className="text-[#a586ff]/60 font-black">|</span>
                    <span className="whitespace-pre">
                      {(matchState.kategoriSeni === "SOLO_KREATIF" ? "TUNGGAL BEBAS" : matchState.kategoriSeni || "TUNGGAL").toUpperCase()} ({(matchState.gender || "PUTRA").toUpperCase()})  {(matchState.kategoriUsia || "REMAJA").toUpperCase()}
                    </span>
                    <span className="text-[#a586ff]/60 font-black">|</span>
                    <span>
                      {(matchState.tahapPertandingan || `POOL A - TAMPIL ${matchState.partai || "1"}`).toUpperCase()}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {`PARTAI ${String(matchState.partai || "1").padStart(2, "0")}`}
                    </span>
                    <span className="text-[#a586ff]/60 font-black">|</span>
                    <span>
                      {(() => {
                        const gName = matchState.gelanggang || 'GELANGGANG 1';
                        const activePool = (typeof window !== 'undefined' ? localStorage.getItem('silat_bagan_pool') : 'NONE') || 'NONE';
                        if (activePool && activePool.toUpperCase() !== 'NONE') {
                          return `${gName} (${activePool.toUpperCase()})`;
                        }
                        return gName;
                      })()}
                    </span>
                    <span className="text-[#a586ff]/60 font-black">|</span>
                    <span>
                      {matchState.kategoriSeni === "SOLO_KREATIF"
                        ? "TUNGGAL BEBAS"
                        : matchState.kategoriSeni || "TUNGGAL"}{" "}
                      ({matchState.gender || "PUTRA"})
                    </span>
                    <span className="text-[#a586ff]/60 font-black">|</span>
                    <span>
                      {(matchState.kategoriUsia || "REMAJA").toUpperCase()}
                    </span>
                    <span className="text-[#a586ff]/60 font-black">|</span>
                    <span>
                      {(matchState.tahapPertandingan || "PENYISIHAN").toUpperCase()}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Kategori Pertandingan */}
            <div className="relative z-10 flex flex-col md:text-right mt-1 md:mt-0 w-full md:w-auto select-none">
              <div className="text-white font-black text-sm md:text-base lg:text-lg xl:text-xl uppercase tracking-wide leading-tight font-sans">
                {matchState.kategoriSeni === "SOLO_KREATIF"
                  ? "TUNGGAL BEBAS"
                  : matchState.kategoriSeni || "TUNGGAL"}{" "}
                • {matchState.gender || "PUTRA"}
              </div>
            </div>
          </div>

          {/* Athlete Info Banner */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-between px-3 border-b-2 border-[#412e6c]/40 gap-3 sm:gap-0 ${isFullscreen ? "pb-2 mb-2" : "pb-4 mb-3"}`}
          >
            {/* Left Column: Client Athlete Details */}
            <div className="text-center sm:text-left min-w-[200px]">
              <span
                className={`font-bold text-blue-300 uppercase tracking-wider block ${isFullscreen ? "text-xs md:text-[14px]" : "text-[11px]"}`}
              >
                {activeCorner === "BIRU"
                  ? matchState.atlitBiru?.kontingen || "BALI"
                  : matchState.atlitMerah?.kontingen || "JAWA BARAT"}
              </span>
              <h2
                className={`font-extrabold text-white uppercase mt-0.5 tracking-tight font-sans drop-shadow-md ${isFullscreen ? "text-base md:text-xl lg:text-2xl leading-tight" : "text-xl md:text-2xl"}`}
              >
                {activeCorner === "BIRU"
                  ? matchState.atlitBiru?.nama || "BENNY G. SUMARSONO"
                  : matchState.atlitMerah?.nama || "SUHARTONO"}
              </h2>
            </div>

            {/* Middle Column: ACTIVE ATHLETE / CORNER SWITCHER (GRID) WITH LANJUT/AKHIRI BUTTON ON THE RIGHT */}
            <div className="flex items-center gap-2 h-12 md:h-14">
              <div className="flex items-center justify-center bg-slate-900/80 p-1 rounded-2xl border-2 border-slate-800 gap-1.5 shadow-lg select-none h-full">
                <button
                  disabled={matchState?.activeCorner === "MERAH"}
                  onClick={() => {
                    playClickSound();
                    setActiveCorner("BIRU");
                  }}
                  className={`px-4 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-1.5 h-full ${
                    matchState?.activeCorner === "MERAH"
                      ? "text-slate-600 bg-slate-950/40 cursor-not-allowed opacity-30 line-through"
                      : activeCorner === "BIRU"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 cursor-pointer"
                        : "text-slate-400 hover:text-slate-200 cursor-pointer"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full bg-blue-400 ${matchState?.activeCorner !== "MERAH" ? "animate-pulse" : ""}`}
                  ></span>
                  SUDUT BIRU
                </button>
                <button
                  disabled={matchState?.activeCorner === "BIRU"}
                  onClick={() => {
                    playClickSound();
                    setActiveCorner("MERAH");
                  }}
                  className={`px-4 rounded-xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-1.5 h-full ${
                    matchState?.activeCorner === "BIRU"
                      ? "text-slate-600 bg-slate-950/40 cursor-not-allowed opacity-30 line-through"
                      : activeCorner === "MERAH"
                        ? "bg-red-600 text-white shadow-lg shadow-red-600/20 cursor-pointer"
                        : "text-slate-400 hover:text-slate-200 cursor-pointer"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full bg-red-400 ${matchState?.activeCorner !== "BIRU" ? "animate-pulse" : ""}`}
                  ></span>
                  SUDUT MERAH
                </button>
              </div>

              {/* LANJUT/AKHIRI BUTTON WITH TRANSLUCENT YELLOW GRADIENT STYLE */}
              {(() => {
                const getBasePool = (stage: string) => {
                  if (!stage) return '';
                  const upper = stage.toUpperCase();
                  const markers = [' - TAMPIL', '-TAMPIL', ' TAMPIL'];
                  for (const m of markers) {
                    const idx = upper.indexOf(m);
                    if (idx !== -1) {
                      return stage.substring(0, idx).trim();
                    }
                  }
                  return stage.trim();
                };

                const isLanjutBase = !(matchState?.hasPerformedBIRU || matchState?.hasPerformedMERAH);
                
                const isLastParticipantOfPool = (() => {
                  if (!isPoolSystem) return false;
                  
                  const activePool = (matchState.tahapPertandingan || 'POOL A').toUpperCase().trim();
                  const kategori = (matchState.kelas || matchState.kategoriSeni || 'TUNGGAL').toUpperCase().trim();
                  const usia = (matchState.kategoriUsia || 'REMAJA').toUpperCase().trim();
                  const gender = (matchState.gender || 'PUTRA').toUpperCase().trim();

                  const getTahapanOnly = (stage: string) => {
                    if (!stage) return 'PENYISIHAN';
                    const upper = stage.toUpperCase();
                    const parts = upper.split('-');
                    if (parts.length > 0) {
                      return parts[0].trim();
                    }
                    return 'PENYISIHAN';
                  };
                  const targetTahapan = getTahapanOnly(activePool).toUpperCase();
                  
                  // 1. Try checking Excel matches
                  try {
                    const rawExcel = typeof window !== 'undefined' ? localStorage.getItem('silat_excel_matches') : null;
                    if (rawExcel) {
                      const allMatches = JSON.parse(rawExcel);
                      if (Array.isArray(allMatches) && allMatches.length > 0) {
                        // Find current partai number
                        const matches = matchState.partai ? matchState.partai.match(/\d+/) : null;
                        const currentPartaiNum = matches ? parseInt(matches[0], 10) : 1;
                        
                        // Let's see if there is any match with Partai number > currentPartaiNum
                        // that belongs to the same pool, category, age, gender, and tahapan
                        const hasNext = allMatches.some((m: any) => {
                          const mPartaiStr = m['Partai'] || '';
                          const mPartaiMatches = mPartaiStr.match(/\d+/);
                          const mPartaiNum = mPartaiMatches ? parseInt(mPartaiMatches[0], 10) : -1;
                          if (mPartaiNum <= currentPartaiNum) return false;
                          
                          const mTahap = (m['Tahap Pertandingan'] || '').toUpperCase().trim();
                          const baseMTahap = getBasePool(mTahap).toUpperCase();
                          const mTahapan = getTahapanOnly(mTahap).toUpperCase();
                          const baseActivePool = getBasePool(activePool).toUpperCase();
                          const mKelas = (m['Kelas'] || '').toUpperCase().trim();
                          const mGender = (m['Gender'] || '').toUpperCase().trim() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                          const mUsia = (m['Kategori Usia'] || '').toUpperCase().trim();
                          const mSistem = (m['Sistem Tanding'] || '').toUpperCase().trim();

                          return (
                            mSistem === 'POOL' &&
                            mKelas === kategori &&
                            mUsia === usia &&
                            mGender === gender &&
                            mTahapan === targetTahapan &&
                            (baseMTahap === baseActivePool || baseActivePool.includes(baseMTahap) || baseMTahap.includes(baseActivePool))
                          );
                        });
                        
                        return !hasNext;
                      }
                    }
                  } catch (e) {
                    console.error("Error in checking excel next matches", e);
                  }

                  // 2. Fetch and combine all unique pool athletes (just like MonitorPanel)
                  let totalParticipants = 0;
                  try {
                    const uniqueAthletes = new Map<string, any>();

                    // a. Registered athletes from localStorage
                    const rawAthletes = typeof window !== 'undefined' ? localStorage.getItem('silat_athletes') : null;
                    const allAthletes = rawAthletes ? JSON.parse(rawAthletes) : [];
                    
                    const baseActivePool = getBasePool(activePool).toUpperCase();
                    const filteredRegistered = allAthletes.filter((a: any) => {
                      const aJurus = (a.kategoriJurus || '').toUpperCase().trim();
                      const aUsia = (a.kategoriUsia || '').toUpperCase().trim();
                      const aGender = (a.gender || '').toUpperCase().trim();
                      const aPool = (a.pool || '').toUpperCase().trim().replace('-', ' ');
                      const aSistem = (a.sistemTanding || 'BATTLE').toUpperCase().trim();
                      const aTahapan = (a.tahapan || 'PENYISIHAN').toUpperCase().trim();

                      const targetPool = baseActivePool.replace('-', ' ');

                      return (
                        aSistem === 'POOL' &&
                        aJurus === kategori &&
                        aUsia === usia &&
                        aGender === gender &&
                        aTahapan === targetTahapan &&
                        (aPool === targetPool || targetPool.includes(aPool) || aPool.includes(targetPool) || getBasePool(aPool).toUpperCase() === targetPool)
                      );
                    });

                    filteredRegistered.forEach((a: any) => {
                      if (a.nama && a.nama !== '---') {
                        uniqueAthletes.set(a.nama.toUpperCase().trim(), { nama: a.nama, kontingen: a.kontingen });
                      }
                    });

                    // b. Current active match
                    if (matchState.atlitBiru?.nama && matchState.atlitBiru?.nama !== '---') {
                      uniqueAthletes.set(matchState.atlitBiru.nama.toUpperCase().trim(), matchState.atlitBiru);
                    }
                    if (matchState.atlitMerah?.nama && matchState.atlitMerah?.nama !== '---') {
                      uniqueAthletes.set(matchState.atlitMerah.nama.toUpperCase().trim(), matchState.atlitMerah);
                    }

                    // c. Match history
                    const rawHistory = typeof window !== 'undefined' ? localStorage.getItem('silat_scoring_match_history') : null;
                    const historyList = rawHistory ? JSON.parse(rawHistory) : [];
                    historyList.forEach((h: any) => {
                      const hKategori = (h.kategoriSeni || h.kelas || '').toUpperCase().trim();
                      const hUsia = (h.kategoriUsia || '').toUpperCase().trim();
                      const hGender = (h.gender || '').toUpperCase().trim();
                      const hStage = (h.tahapPertandingan || '').toUpperCase().trim();
                      
                      const isPoolMatchHist = hStage.includes('POOL') || 
                                               (h.atlitMerah?.nama === '---' || h.atlitBiru?.nama === '---');
                                               
                      const baseHStage = getBasePool(hStage).toUpperCase();
                      const hTahapan = getTahapanOnly(hStage).toUpperCase();
                      const baseActivePoolLocal = getBasePool(activePool).toUpperCase();
                                               
                      if (
                        isPoolMatchHist &&
                        hKategori === kategori &&
                        hUsia === usia &&
                        hGender === gender &&
                        hTahapan === targetTahapan &&
                        (baseHStage === baseActivePoolLocal || baseActivePoolLocal.includes(baseHStage) || baseHStage.includes(baseActivePoolLocal))
                      ) {
                        if (h.atlitBiru?.nama && h.atlitBiru?.nama !== '---') {
                          uniqueAthletes.set(h.atlitBiru.nama.toUpperCase().trim(), h.atlitBiru);
                        }
                        if (h.atlitMerah?.nama && h.atlitMerah?.nama !== '---') {
                          uniqueAthletes.set(h.atlitMerah.nama.toUpperCase().trim(), h.atlitMerah);
                        }
                      }
                    });

                    totalParticipants = uniqueAthletes.size;
                  } catch (e) {
                    console.error("Error gathering total participants in DewanPanel", e);
                  }

                  // 3. Count completed pool matches in history
                  let historyCount = 0;
                  try {
                    const rawHistory = typeof window !== 'undefined' ? localStorage.getItem('silat_scoring_match_history') : null;
                    const historyList = rawHistory ? JSON.parse(rawHistory) : [];
                    const poolHistoryMatches = historyList.filter((h: any) => {
                      const hKategori = (h.kategoriSeni || h.kelas || '').toUpperCase().trim();
                      const hUsia = (h.kategoriUsia || '').toUpperCase().trim();
                      const hGender = (h.gender || '').toUpperCase().trim();
                      const hStage = (h.tahapPertandingan || '').toUpperCase().trim();
                      
                      const isPoolMatchHist = hStage.includes('POOL') || 
                                               (h.atlitMerah?.nama === '---' || h.atlitBiru?.nama === '---');
                                               
                      const baseHStage = getBasePool(hStage).toUpperCase();
                      const hTahapan = getTahapanOnly(hStage).toUpperCase();
                      const baseActivePoolLocal = getBasePool(activePool).toUpperCase();
                                               
                      return (
                        isPoolMatchHist &&
                        hKategori === kategori &&
                        hUsia === usia &&
                        hGender === gender &&
                        hTahapan === targetTahapan &&
                        (baseHStage === baseActivePoolLocal || baseActivePoolLocal.includes(baseHStage) || baseHStage.includes(baseActivePoolLocal))
                      );
                    });
                    historyCount = poolHistoryMatches.length;
                  } catch (e) {
                    console.error("Error counting history matches in DewanPanel", e);
                  }

                  // If we have totalParticipants, return if (historyCount + 1) >= totalParticipants
                  if (totalParticipants > 0) {
                    return (historyCount + 1) >= totalParticipants;
                  }

                  return true;
                })();

                const isLanjut = isLanjutBase;
                const displayLabel = isPoolSystem
                  ? (matchState.dewanConfirmedLanjutPool ? "PROSES..." : isLastParticipantOfPool ? "AKHIRI" : "LANJUT")
                  : (isLanjut ? "LANJUT" : "AKHIRI");

                return (
                  <button
                    type="button"
                    disabled={matchState.dewanConfirmedLanjutPool}
                    onClick={() => {
                      if (matchState.dewanConfirmedLanjutPool) return;
                      playClickSound();
                      if (isPoolSystem) {
                        const active = matchState.activeCorner || "BIRU";
                        const corner2 = active;

                        // Create temporary state with active corner's duration populated to check DQ
                        const tempState = { ...matchState };
                        if (corner2 === "BIRU") {
                          tempState.durasiTampilBIRU = matchState.timer2Value || 0;
                        } else {
                          tempState.durasiTampilMERAH = matchState.timer2Value || 0;
                        }

                        const reason2 = checkCornerAutoDq(tempState, corner2);

                        if (reason2) {
                          setAutoDiskTargetCorner(corner2);
                          setAutoDiskReason(reason2);
                          setSelectedAction('DISKUALIFIKASI');
                          setShowDiskUdModal(true);
                        } else {
                          if (isLastParticipantOfPool) {
                            setShowAkhiriConfirm(true);
                          } else {
                            setShowLanjutPoolConfirm(true);
                          }
                        }
                      } else {
                        if (isLanjut) {
                          setShowLanjutConfirm(true);
                        } else {
                          const active = matchState.activeCorner || "BIRU";
                          const corner2 = active;
                          const corner1 = active === "BIRU" ? "MERAH" : "BIRU";

                          // Create temporary state with both durations populated to check DQ
                          const tempState = { ...matchState };
                          if (corner2 === "BIRU") {
                            tempState.durasiTampilBIRU = matchState.timer2Value || 0;
                            tempState.durasiTampilMERAH = matchState.durasiTampilMERAH || 0;
                          } else {
                            tempState.durasiTampilMERAH = matchState.timer2Value || 0;
                            tempState.durasiTampilBIRU = matchState.durasiTampilBIRU || 0;
                          }

                          const reason1 = checkCornerAutoDq(tempState, corner1);
                          const reason2 = checkCornerAutoDq(tempState, corner2);

                          if (reason1 && reason2) {
                            // BOTH performers are disqualified
                            setAutoDiskTargetCorner('BOTH');
                            setAutoDiskReason(`KEDUA PENAMPIL MELEBIHI TOLERANSI DURASI:\n\n1. ${reason1}\n\n2. ${reason2}`);
                            setSelectedAction('DISKUALIFIKASI');
                            setShowDiskUdModal(true);
                          } else if (reason1) {
                            // ONLY Penampil 1 (first performer) is disqualified
                            setAutoDiskTargetCorner(corner1);
                            setAutoDiskReason(reason1);
                            setSelectedAction('DISKUALIFIKASI');
                            setShowDiskUdModal(true);
                          } else if (reason2) {
                            // ONLY Penampil 2 is disqualified
                            setAutoDiskTargetCorner(corner2);
                            setAutoDiskReason(reason2);
                            setSelectedAction('DISKUALIFIKASI');
                            setShowDiskUdModal(true);
                          } else {
                            setShowAkhiriConfirm(true);
                          }
                        }
                      }
                    }}
                    className={`px-5 text-xs md:text-sm font-black uppercase tracking-wider rounded-2xl transition-all duration-300 ${
                      matchState.dewanConfirmedLanjutPool
                        ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60"
                        : "active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-500/25 hover:from-amber-500/40 hover:via-yellow-500/30 hover:to-amber-500/40 text-yellow-300 border-yellow-500/40 hover:border-yellow-400/70 shadow-yellow-500/5 hover:shadow-yellow-500/10"
                    } flex items-center justify-center shadow-lg border-2 min-w-[85px] md:min-w-[100px] h-full`}
                  >
                    {displayLabel}
                  </button>
                );
              })()}
            </div>

            {/* Right Column: Timer Operator Panel with DISK-UD on its left */}
            <div className="flex items-center justify-center sm:justify-end gap-2 select-none h-12 md:h-14">
              {/* DISK - UD BUTTON WITH TRANSLUCENT TEAL GRADIENT STYLE */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowDiskUdModal(true);
                  setSelectedAction(null);
                }}
                className="px-5 text-xs md:text-sm font-black uppercase tracking-wider rounded-2xl transition-all duration-300 active:scale-95 cursor-pointer flex items-center justify-center shadow-lg border-2 bg-gradient-to-r from-teal-500/25 via-emerald-500/15 to-teal-500/25 hover:from-teal-500/40 hover:via-emerald-500/30 hover:to-teal-500/40 text-teal-300 border-teal-500/40 hover:border-teal-400/70 shadow-teal-500/5 hover:shadow-teal-500/10 min-w-[95px] md:min-w-[110px] h-full"
              >
                DISK - UD
              </button>

              <div className="flex items-center justify-center bg-slate-900/95 px-6 rounded-2xl border-2 border-slate-700/80 shadow-[0_0_20px_rgba(234,179,8,0.15)] min-w-[140px] md:min-w-[160px] h-full">
                <span
                  className={`font-mono font-black text-3xl md:text-4xl lg:text-5xl text-yellow-400 tracking-wider leading-none ${matchState.timerBerjalan ? "animate-pulse" : ""}`}
                >
                  {formatMinSec(matchState.timer2Value || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MAIN JURI SCORING GRID (DYNAMIC)                                           */}
          {/* ========================================================================= */}
          <div
            className={`w-full overflow-y-hidden border-2 border-[#3c206d] rounded-none bg-transparent overflow-x-auto no-scrollbar ${isFullscreen ? "flex-none mb-2 flex flex-col" : "mb-6 flex-grow flex flex-col"}`}
          >
            <table className="w-full text-center border-collapse table-auto flex-grow">
              <thead>
                <tr
                  className={`border-b-2 transition-all duration-300 ${activeCorner === "BIRU" ? "bg-gradient-to-r from-blue-950/80 via-blue-900/70 to-[#0c1f47]/80 border-[#3c206d] text-blue-100" : "bg-gradient-to-r from-red-950/80 via-red-900/70 to-[#4a0d14]/80 border-[#3c206d] text-red-100"}`}
                >
                  <th
                    className={`text-left font-bold border-r-2 uppercase tracking-wide transition-all duration-300 border-[#3c206d] ${activeCorner === "BIRU" ? "text-blue-100" : "text-red-100"} ${isFullscreen ? "px-4 py-1.5 text-sm md:text-base lg:text-lg min-w-[120px]" : "px-5 py-4.5 md:py-6 text-sm md:text-base lg:text-lg min-w-[150px]"}`}
                  >
                    JURI
                  </th>
                  {activeJudgesList.map((id) => {
                    const jsObj =
                      matchState.seniScores[activeCorner].juriScores[id] || {};
                    const isReady = jsObj?.isReady;
                    return (
                      <th
                        key={id}
                        className={`font-bold transition-all duration-300 text-slate-100 ${
                          isReady
                            ? "border-4 border-emerald-400 bg-emerald-950/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                            : "border-r-2 last:border-r-0 border-[#3c206d]"
                        } ${isFullscreen ? "px-2 py-1.5 text-sm md:text-base lg:text-lg min-w-[45px]" : "px-4 py-4.5 md:py-6 text-sm md:text-base lg:text-lg min-w-[60px]"}`}
                      >
                        {id}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#3c206d] text-xs text-indigo-100">
                {/* Row 1: Movement splitting */}
                {matchState.kategoriSeni !== "GANDA" && matchState.kategoriSeni !== "SOLO_KREATIF" && (
                  <tr className="hover:bg-purple-950/20">
                    <td
                      className={`text-left font-semibold border-r-2 border-[#3c206d] text-indigo-200 bg-[#120e33]/80 ${isFullscreen ? "px-4 py-0.5 text-xs md:text-sm lg:text-[15px]" : "px-5 py-1.5 md:py-2 text-xs md:text-sm lg:text-base"}`}
                    >
                      KESALAHAN GERAK
                    </td>
                    {activeJudgesList.map((id) => {
                      const jsObj = matchState.seniScores[activeCorner]
                        .juriScores[id] || { salahGerakCount: 0, suaraCount: 0 };
                      const isFlashing = flashJuri[id];
                      const isReady = jsObj?.isReady;
                      return (
                        <td
                          key={id}
                          className={`font-mono font-black transition-all duration-300 ease-out ${
                            isReady
                              ? "border-x-2 border-emerald-400 bg-emerald-950/10"
                              : "border-r-2 last:border-r-0 border-[#3c206d]"
                          } ${
                            isFlashing
                              ? "bg-yellow-400 text-slate-950 scale-105 shadow-md shadow-yellow-400/50"
                              : "text-red-400 bg-purple-950/45"
                          } ${isFullscreen ? "px-1.5 py-0.5 text-base md:text-lg lg:text-xl" : "px-3 py-1.5 md:py-2 text-base md:text-lg lg:text-xl"}`}
                        >
                          {jsObj.salahGerakCount}
                        </td>
                      );
                    })}
                  </tr>
                )}

                {/* Row 2: Correctness Score */}
                <tr className="hover:bg-purple-950/20">
                  <td
                    className={`text-left font-semibold border-r-2 border-[#3c206d] text-indigo-200 bg-[#120e33]/80 ${isFullscreen ? "px-4 py-0.5 text-xs md:text-sm lg:text-[15px]" : "px-5 py-1.5 md:py-2 text-xs md:text-sm lg:text-base"}`}
                  >
                    {matchState.kategoriSeni === "GANDA" || matchState.kategoriSeni === "SOLO_KREATIF"
                      ? "TEKNIK SERANG BELA"
                      : "NILAI KEBENARAN (0 - 9.90)"}
                  </td>
                  {activeJudgesList.map((id) => {
                    const jsObj =
                      matchState.seniScores[activeCorner].juriScores[id] || {};
                    let displayAccuracyVal = 0;
                    if (matchState.kategoriSeni === "GANDA") {
                      const raw = jsObj.teknikSerangBela;
                      displayAccuracyVal = (raw !== undefined && raw !== 50 && raw >= 0.01 && raw <= 0.30) ? raw : 0;
                    } else if (matchState.kategoriSeni === "SOLO_KREATIF") {
                      const raw = jsObj.teknikSenjataKoreografi;
                      displayAccuracyVal = (raw !== undefined && raw !== 50 && raw >= 0.01 && raw <= 0.30) ? raw : 0;
                    } else {
                      const kebenaran =
                        jsObj.kebenaran !== undefined ? jsObj.kebenaran : 100;
                      displayAccuracyVal = Math.max(
                        0,
                        9.9 - (100 - kebenaran) * 0.01,
                      );
                    }
                    const isReady = jsObj?.isReady;
                    return (
                      <td
                        key={id}
                        className={`font-mono font-black text-amber-300 tracking-wide bg-purple-950/45 ${
                          isReady
                            ? "border-x-2 border-emerald-400 bg-emerald-950/10"
                            : "border-r-2 last:border-r-0 border-[#3c206d]"
                        } ${isFullscreen ? "px-1.5 py-0.5 text-base md:text-lg lg:text-xl" : "px-3 py-1.5 md:py-2 text-base md:text-lg lg:text-xl"}`}
                      >
                        {displayAccuracyVal.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 3: Flow of Movement / Stamina */}
                <tr className="hover:bg-purple-950/20">
                  <td
                    className={`text-left font-semibold border-r-2 border-[#3c206d] text-indigo-200 bg-[#120e33]/80 ${isFullscreen ? "px-4 py-0.5 text-xs md:text-sm lg:text-[15px]" : "px-5 py-1.5 md:py-2 text-xs md:text-sm lg:text-base"}`}
                  >
                    {matchState.kategoriSeni === "GANDA" ||
                    matchState.kategoriSeni === "SOLO_KREATIF"
                      ? "KEMANTAPAN & HARMONI"
                      : "KEMANTAPAN & STAMINA"}
                  </td>
                  {activeJudgesList.map((id) => {
                    const jsObj =
                      matchState.seniScores[activeCorner].juriScores[id] || {};
                    let displayStaminaVal = 0;
                    if (
                      matchState.kategoriSeni === "GANDA" ||
                      matchState.kategoriSeni === "SOLO_KREATIF"
                    ) {
                      const raw = jsObj.kemantapan;
                      displayStaminaVal = (raw !== undefined && raw !== 50 && raw >= 0.01 && raw <= 0.30) ? raw : 0;
                    } else {
                      const kemantapan =
                        jsObj.kemantapan !== undefined ? jsObj.kemantapan : 50;
                      const isStaminaRated =
                        kemantapan >= 1 && kemantapan <= 10;
                      displayStaminaVal = isStaminaRated ? kemantapan / 100 : 0;
                    }
                    const isReady = jsObj?.isReady;
                    return (
                      <td
                        key={id}
                        className={`font-mono font-black text-blue-400 tracking-wide bg-purple-950/45 ${
                          isReady
                            ? "border-x-2 border-emerald-400 bg-emerald-950/10"
                            : "border-r-2 last:border-r-0 border-[#3c206d]"
                        } ${isFullscreen ? "px-1.5 py-0.5 text-base md:text-lg lg:text-xl" : "px-3 py-1.5 md:py-2 text-base md:text-lg lg:text-xl"}`}
                      >
                        {displayStaminaVal.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 3.5: Penjiwaan / Penghayatan (Only for GANDA & SOLO_KREATIF) */}
                {(matchState.kategoriSeni === "GANDA" || matchState.kategoriSeni === "SOLO_KREATIF") && (
                  <tr className="hover:bg-purple-950/20">
                    <td
                      className={`text-left font-semibold border-r-2 border-[#3c206d] text-indigo-200 bg-[#120e33]/80 ${isFullscreen ? "px-4 py-0.5 text-xs md:text-sm lg:text-[15px]" : "px-5 py-1.5 md:py-2 text-xs md:text-sm lg:text-base"}`}
                    >
                      PENJIWAAN & PENGHAYATAN
                    </td>
                    {activeJudgesList.map((id) => {
                      const jsObj =
                        matchState.seniScores[activeCorner].juriScores[id] || {};
                      const raw = jsObj.penjiwaan;
                      const displayPenjiwaanVal = (raw !== undefined && raw !== 50 && raw >= 0.01 && raw <= 0.30) ? raw : 0;
                      const isReady = jsObj?.isReady;
                      return (
                        <td
                          key={id}
                          className={`font-mono font-black text-violet-400 tracking-wide bg-purple-950/45 ${
                            isReady
                              ? "border-x-2 border-emerald-400 bg-emerald-950/10"
                              : "border-r-2 last:border-r-0 border-[#3c206d]"
                          } ${isFullscreen ? "px-1.5 py-0.5 text-base md:text-lg lg:text-xl" : "px-3 py-1.5 md:py-2 text-base md:text-lg lg:text-xl"}`}
                        >
                          {displayPenjiwaanVal.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                )}

                {/* Row 4: Total Score */}
                <tr className="bg-gradient-to-r from-[#0a1530]/80 via-[#102454]/85 to-[#0b204c]/80 border-t-2 border-[#3c206d]">
                  <td
                    className={`text-left font-extrabold border-r-2 border-[#3c206d] text-blue-300 uppercase bg-gradient-to-r from-[#03091a]/95 to-[#0c1f47]/90 ${isFullscreen ? "px-4 py-1.5 text-sm md:text-base lg:text-lg" : "px-5 py-5.5 md:py-7 text-sm md:text-base lg:text-lg"}`}
                  >
                    TOTAL SKOR
                  </td>
                  {activeJudgesList.map((id) => {
                    const jsObj =
                      matchState.seniScores[activeCorner].juriScores[id] || {};
                    const isFinished = !!jsObj.isLocked;
                    const scoreVal = calculateSeniScoreForJuri(
                      matchState.kategoriSeni,
                      jsObj,
                    );
                    const isReady = jsObj?.isReady;
                    return (
                      <td
                        key={id}
                        className={`transition-all duration-300 ${
                          isFinished
                            ? "gold-shimmer-bg font-mono font-black text-slate-950"
                            : `font-mono font-extrabold text-yellow-300 tracking-wide bg-gradient-to-br from-[#0a204f]/90 to-[#123175]/80 backdrop-blur-sm ${
                                isReady
                                  ? "border-x-2 border-emerald-400 bg-emerald-950/20"
                                  : "border-r-2 last:border-r-0 border-[#3c206d]"
                              }`
                        } ${isFullscreen ? "px-1.5 py-1.5 text-lg md:text-xl lg:text-2xl" : "px-3 py-5.5 md:py-7 text-lg md:text-xl lg:text-2xl"}`}
                      >
                        {scoreVal.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM COLUMN ROW: TIMING WORKSPACE (LEFT) & PENALTIES (RIGHT)             */}
          {/* ========================================================================= */}
          {!isBannerOpen && (
            <div
              className={`grid grid-cols-1 lg:grid-cols-12 items-stretch ${isFullscreen ? "gap-2 mt-0 flex-none" : "gap-5 mt-0"}`}
            >
              {/* Left Section: Time Performance & Sorted Judges & Median */}
              <div
                className={`${(allActiveJudgesReady && !isDewanInputFinished) ? "lg:col-span-7" : "lg:col-span-12"} flex flex-col ${isFullscreen ? "" : "flex-1"}`}
              >
                <div
                  className={`bg-[#0e0a24]/85 border-2 border-[#3c2a68]/85 rounded-none overflow-hidden shadow-md flex flex-col ${isFullscreen ? "h-full justify-between gap-1.5 py-1" : "flex-grow justify-between"}`}
                >
                  {/* Line 1: Time Performance */}
                  {allActiveJudgesReady && !isDewanInputFinished && (
                    <div className="border-b border-[#3c2a68]/60">
                    <div
                      className={`bg-[#1e1742] text-left border-b border-[#3c2a68]/60 ${isFullscreen ? "px-3 py-1" : "px-4 py-2"}`}
                    >
                      <span
                        className={`font-bold text-indigo-200 uppercase tracking-wide ${isFullscreen ? "text-xs" : "text-xs"}`}
                      >
                        DURASI PENAMPILAN
                      </span>
                    </div>

                    <div
                      className={`grid grid-cols-4 text-center bg-[#0b081e]/40 ${isFullscreen ? "py-0.5 gap-2 px-2" : "py-3 px-4 gap-4"}`}
                    >
                      <div
                        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#2a134a]/85 via-[#34165c]/75 to-[#1c0b33]/85 border border-[#3c2a68] rounded-none shadow-inner backdrop-blur-sm ${isFullscreen ? "py-1" : "py-2.5"}`}
                      >
                        <span
                          className={`font-semibold text-yellow-300 ${isFullscreen ? "text-[9px] mb-0.5" : "text-[10px] mb-0.5"}`}
                        >
                          MENIT
                        </span>
                        <span
                          className={`font-mono font-black text-yellow-300 ${isFullscreen ? "text-lg md:text-xl lg:text-2xl" : "text-xl"}`}
                        >
                          {String(
                            Math.floor((matchState.timer2Value || 0) / 60),
                          ).padStart(2, "0")}
                        </span>
                      </div>
                      <div
                        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#2a134a]/85 via-[#34165c]/75 to-[#1c0b33]/85 border border-[#3c2a68] rounded-none shadow-inner backdrop-blur-sm ${isFullscreen ? "py-1" : "py-2.5"}`}
                      >
                        <span
                          className={`font-semibold text-yellow-300 ${isFullscreen ? "text-[9px] mb-0.5" : "text-[10px] mb-0.5"}`}
                        >
                          DETIK
                        </span>
                        <span
                          className={`font-mono font-black text-yellow-300 ${isFullscreen ? "text-lg md:text-xl lg:text-2xl" : "text-xl"}`}
                        >
                          {String((matchState.timer2Value || 0) % 60).padStart(
                            2,
                            "0",
                          )}
                        </span>
                      </div>
                      {(() => {
                        const targetDur = matchState.durasiBabak || 180;
                        const elapsedDur = matchState.timer2Value || 0;
                        const isTimerStopped = !matchState.timerBerjalan && elapsedDur > 0;

                        const kurangDiff = elapsedDur < targetDur ? targetDur - elapsedDur : 0;
                        const kurangMin = Math.floor(kurangDiff / 60);
                        const kurangSec = kurangDiff % 60;
                        const kurangFormatted = `${String(kurangMin).padStart(2, "0")} : ${String(kurangSec).padStart(2, "0")}`;

                        const lebihDiff = elapsedDur > targetDur ? elapsedDur - targetDur : 0;
                        const lebihMin = Math.floor(lebihDiff / 60);
                        const lebihSec = lebihDiff % 60;
                        const lebihFormatted = `${String(lebihMin).padStart(2, "0")} : ${String(lebihSec).padStart(2, "0")}`;

                        const hasKurang = isTimerStopped && kurangDiff > 0;
                        const hasLebih = isTimerStopped && lebihDiff > 0;

                        return (
                          <>
                            <div
                              className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#2a134a]/85 via-[#34165c]/75 to-[#1c0b33]/85 rounded-none backdrop-blur-sm transition-all duration-700 ease-in-out ${isFullscreen ? "py-1" : "py-2.5"} ${
                                hasKurang
                                  ? "border-2 border-red-500 shadow-[0_0_22px_rgba(239,68,68,0.85)] bg-red-950/50"
                                  : "border border-red-500/30 shadow-inner"
                              }`}
                            >
                              <span
                                className={`font-semibold text-rose-400 ${isFullscreen ? "text-[9px] mb-0.5" : "text-[10px] mb-0.5"}`}
                              >
                                KURANG
                              </span>
                              <span
                                className={`font-mono font-black transition-all duration-700 ${
                                  isFullscreen
                                    ? "text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl"
                                    : "text-base md:text-lg"
                                } ${
                                  hasKurang
                                    ? "text-rose-400 animate-pulse scale-105"
                                    : "text-rose-400/50"
                                }`}
                              >
                                {hasKurang ? kurangFormatted : "-- : --"}
                              </span>
                            </div>
                            <div
                              className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#2a134a]/85 via-[#34165c]/75 to-[#1c0b33]/85 rounded-none backdrop-blur-sm transition-all duration-700 ease-in-out ${isFullscreen ? "py-1" : "py-2.5"} ${
                                hasLebih
                                  ? "border-2 border-blue-500 shadow-[0_0_22px_rgba(59,130,246,0.85)] bg-blue-950/50"
                                  : "border border-blue-500/30 shadow-inner"
                              }`}
                            >
                              <span
                                className={`font-semibold text-blue-400 ${isFullscreen ? "text-[9px] mb-0.5" : "text-[10px] mb-0.5"}`}
                              >
                                LEBIH
                              </span>
                              <span
                                className={`font-mono font-black transition-all duration-700 ${
                                  isFullscreen
                                    ? "text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl"
                                    : "text-base md:text-lg"
                                } ${
                                  hasLebih
                                    ? "text-blue-400 animate-pulse scale-105"
                                    : "text-blue-400/50"
                                }`}
                              >
                                {hasLebih ? lebihFormatted : "-- : --"}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  )}

                  {/* Line 2: Sorted Judges values with highlight */}
                  <div
                    className={`border-b border-[#3c2a68]/60 bg-[#0e0a24]/90 ${isFullscreen ? "py-1.5 px-3 flex-1 flex flex-col" : "py-4 px-4"}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`font-bold text-indigo-200 uppercase tracking-wide text-left block ${isFullscreen ? "text-[10px] md:text-xs" : "text-xs"}`}
                      >
                        NILAI JURI BERTUGAS
                      </span>
                    </div>

                    <div
                      className={`flex flex-nowrap items-stretch justify-center gap-1 w-full border border-[#3c2a68]/50 bg-[#070517] p-1 rounded-none overflow-x-auto no-scrollbar ${isFullscreen ? "flex-1" : ""}`}
                    >
                      {(() => {
                        const jCount = matchState.jumlahJuri || 10;
                        const catSeni = matchState.kategoriSeni || "TUNGGAL";
                        const judgesList = [];
                        for (let i = 1; i <= jCount; i++) {
                          const scoreObj = matchState.seniScores[activeCorner]
                            .juriScores[i] || {
                            juriId: i,
                            kebenaran: 100,
                            teknikSerangBela: 50,
                            teknikSenjataKoreografi: 50,
                            kemantapan: 50,
                            salahGerakCount: 0,
                            salahSenjataCount: 0,
                            suaraCount: 0,
                            keluarGelanggangCount: 0,
                            pakaianAksesorisCount: 0,
                          };
                          const scoreVal = calculateSeniScoreForJuri(
                            catSeni,
                            scoreObj,
                          );
                          judgesList.push({
                            juriId: i,
                            score: scoreVal,
                          });
                        }

                        const sortedJudges = [...judgesList].sort(
                          (a, b) => a.score - b.score,
                        );
                        const len = sortedJudges.length;
                        const middleIndices: number[] = [];
                        if (len > 0) {
                          if (len % 2 === 0) {
                            middleIndices.push(Math.floor(len / 2) - 1);
                            middleIndices.push(Math.floor(len / 2));
                          } else {
                            middleIndices.push(Math.floor(len / 2));
                          }
                        }

                        return sortedJudges.map((j, idx) => {
                          const isMedian = middleIndices.includes(idx);
                          const topBgColor = isMedian
                            ? "bg-emerald-600"
                            : activeCorner === "BIRU"
                              ? "bg-blue-600"
                              : "bg-red-600";
                          const bottomBgColor = isMedian
                            ? "bg-emerald-700"
                            : activeCorner === "BIRU"
                              ? "bg-blue-700"
                              : "bg-red-700";

                          return (
                            <div
                              key={j.juriId}
                              className="flex flex-col flex-1 border border-[#3c2a68]/60 rounded-none overflow-hidden shadow-sm min-w-[42px] h-full"
                            >
                              {/* Top (Judge Number) */}
                              <div
                                className={`${topBgColor} text-white font-mono font-black text-center border-b border-[#3c2a68]/60 ${isFullscreen ? "py-1 md:py-1.5 text-[10px] md:text-[11px]" : "py-1.5 text-[10px] md:text-[11px]"}`}
                              >
                                J{j.juriId}
                              </div>
                              {/* Bottom (Judge Score) */}
                              <div
                                className={`flex-1 flex items-center justify-center ${bottomBgColor} text-white font-mono font-extrabold text-center ${isFullscreen ? "py-1 md:py-2.5 text-xs md:text-[13px]" : "py-2 text-xs md:text-sm"}`}
                              >
                                {j.score.toFixed(2)}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Line 3: Median Final Highlight */}
                  <div
                    className={`flex justify-between items-center bg-gradient-to-r from-[#170e30] via-[#221345] to-[#120a27] ${isFullscreen ? "px-3.5 py-1" : "p-4"}`}
                  >
                    <span
                      className={`font-black text-indigo-100 uppercase tracking-wider text-left ${isFullscreen ? "text-[10px] md:text-xs" : "text-xs"}`}
                    >
                      MEDIAN
                    </span>
                    <div
                      className={`font-mono font-extrabold text-yellow-300 bg-gradient-to-br from-[#0a1e4a]/95 via-[#102d6b]/85 to-[#07173a]/90 rounded-none border border-blue-500/40 rounded-none text-center shadow-inner ${isFullscreen ? "py-0.5 px-3 text-sm md:text-base" : "py-2 px-6 text-2xl"}`}
                    >
                      {(() => {
                        const jCount = matchState.jumlahJuri || 10;
                        const scoresList = [];
                        for (let i = 1; i <= jCount; i++) {
                          const scoreObj =
                            matchState.seniScores[activeCorner].juriScores[i];
                          scoresList.push(
                            calculateSeniScoreForJuri(
                              matchState.kategoriSeni,
                              scoreObj,
                            ),
                          );
                        }
                        const sortedScores = [...scoresList].sort(
                          (a, b) => a - b,
                        );
                        let medianValue = 0;
                        if (sortedScores.length > 0) {
                          if (sortedScores.length % 2 === 0) {
                            medianValue =
                              (sortedScores[sortedScores.length / 2 - 1] +
                                sortedScores[sortedScores.length / 2]) /
                              2;
                          } else {
                            medianValue =
                              sortedScores[Math.floor(sortedScores.length / 2)];
                          }
                        }
                        return medianValue.toFixed(3);
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Section: Penalties (5 Cols) */}
              {allActiveJudgesReady && !isDewanInputFinished && (
                <div className="lg:col-span-5">
                <div
                  className={`bg-[#0e0a24]/85 border-2 border-[#3c2a68]/85 rounded-none overflow-hidden shadow-md flex flex-col ${isFullscreen ? "h-full justify-between gap-1 py-1" : "h-full justify-between"}`}
                >
                  <div
                    className={`bg-[#1e1742] text-left border-b border-[#3c2a68]/70 ${isFullscreen ? "px-3 py-1" : "px-4 py-2"}`}
                  >
                    <span
                      className={`font-bold text-indigo-200 uppercase tracking-wide text-xs`}
                    >
                      PENGURANGAN HUKUMAN DEWAN
                    </span>
                  </div>

                  <div
                    className={`divide-y divide-[#3c2a68]/60 text-left text-xs bg-[#0c0822] flex-1 flex flex-col ${isFullscreen ? "justify-start gap-0" : "justify-between"}`}
                  >
                    {getDewanPenaltyList(matchState).map((row) => {
                      const currentVal =
                        (matchState.seniScores[activeCorner].hukumanLog as any)[
                          row.id
                        ] || 0;
                      return (
                        <div
                          key={row.id}
                          className={`flex items-center justify-between ${isFullscreen ? "flex-none px-3 py-1" : "flex-1 p-3"}`}
                        >
                          <span
                            className={`font-semibold text-purple-200 pr-3 leading-tight max-w-[240px] ${isFullscreen ? "text-[10px] md:text-[11px] lg:text-[12px]" : "text-[11px]"}`}
                          >
                            {row.label}
                          </span>
                          <div className="flex items-center gap-1.5 flex-1 justify-end ml-2">
                            <button
                              onClick={() =>
                                adjustHukuman(activeCorner, row.id as any, 0.5)
                              }
                              className={`font-black bg-[#e63222] hover:bg-red-500 text-white rounded-none cursor-pointer transition active:scale-90 flex-1 min-w-[75px] max-w-[130px] text-center ${isFullscreen ? "py-1 text-[10px] md:text-xs" : "py-1.5 text-[11px]"}`}
                            >
                              -0.5
                            </button>
                            <button
                              onClick={() =>
                                clearHukuman(activeCorner, row.id as any)
                              }
                              className={`font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-none border border-[#3c2a68]/60 cursor-pointer transition active:scale-95 ${isFullscreen ? "px-1.5 py-0.5 text-[9px] md:text-[10px]" : "px-2 py-1 text-[9px]"}`}
                            >
                              CLR
                            </button>
                            <div
                              className={`text-center font-mono font-black text-red-400 bg-gradient-to-br from-[#2a134a]/85 via-[#34165c]/75 to-[#1c0b33]/85 rounded-none border border-purple-500/40 ml-1 shadow-inner backdrop-blur-sm ${isFullscreen ? "w-12 py-0.5 text-xs md:text-[13px]" : "w-12 py-1 text-xs"}`}
                            >
                              {currentVal > 0
                                ? `-${currentVal.toFixed(2)}`
                                : "0"}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Penalty Row 6: Total Penalty */}
                    <div
                      className={`flex items-center justify-between bg-[#141035]/80 font-bold border-t border-[#3c2a68]/60 ${isFullscreen ? "flex-none px-3 py-1.5" : "flex-none p-3"}`}
                    >
                      <span
                        className={`text-[#0fd4f5] uppercase tracking-wider ${isFullscreen ? "text-[10px] md:text-[11px] lg:text-[12px]" : "text-[11px] font-bold"}`}
                      >
                        TOTAL HUKUMAN
                      </span>
                      <div
                        className={`text-center font-mono font-black text-yellow-300 bg-gradient-to-br from-[#0a1e4a]/95 via-[#102d6b]/85 to-[#07173a]/90 rounded-none border border-blue-500/45 shadow-inner ${isFullscreen ? "w-16 py-0.5 text-xs md:text-sm" : "w-16 py-1 text-sm"}`}
                      >
                        {(() => {
                          const totalPenalties = calculateSeniHukumanTotal(
                            matchState.seniScores[activeCorner].hukumanLog,
                          );
                          return totalPenalties > 0
                            ? `-${totalPenalties.toFixed(2)}`
                            : "0.00";
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

          {allActiveJudgesReady && !isBannerOpen && !isDewanInputFinished && (
            <div className="w-full mb-4 px-5 py-3.5 bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-indigo-950/90 border-2 border-emerald-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl animate-pulse z-20">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping"></span>
                <div className="text-left">
                  <p className="text-xs font-black text-emerald-300 uppercase tracking-widest">SEMUA JURI TELAH READY!</p>
                  <p className="text-[10px] text-slate-300 font-medium">Panel Durasi Penampilan & Pengurangan Hukuman Dewan siap diinput via Banner.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsBannerOpen(true);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                Buka Panel Input Dewan
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM TOTAL SUMMARY SCOREBOARDS                                           */}
          {/* ========================================================================= */}
          <div
            className={`w-full scale-x-[1.005] ${isFullscreen ? "mt-1 flex-none" : "mt-6"}`}
          >
            <div className="w-full text-center border-2 border-[#3c2a68]/85 rounded-none overflow-hidden bg-[#0e0a24]/85 flex flex-col">
              {/* Row 1: Final Score */}
              <div className="flex border-b-2 border-[#3c2a68] w-full">
                <div
                  className={`w-[45%] text-left px-5 font-extrabold text-white uppercase bg-[#25195c] flex items-center ${isFullscreen ? "py-2.5 lg:py-3.5 text-sm md:text-base lg:text-lg" : "py-4 text-xs md:text-sm"}`}
                >
                  SKOR AKHIR
                </div>
                <div
                  className={`flex-1 text-center font-mono font-black tracking-widest bg-gradient-to-r from-[#0a1e4a]/90 via-[#102d6b]/80 to-[#07173a]/85 backdrop-blur-sm text-rose-450 border-l-2 border-[#3c2a68] flex items-center justify-center ${isFullscreen ? "py-2.5 lg:py-3.5 text-2xl md:text-3xl lg:text-4xl" : "py-4 text-2xl"}`}
                >
                  {(() => {
                    const sScores = matchState.seniScores[activeCorner];
                    const jCount = matchState.jumlahJuri || 10;
                    const cat = matchState.kategoriSeni || matchState.kelas || 'TUNGGAL';
                    const scoresList = [];
                    for (let i = 1; i <= jCount; i++) {
                      const scoreObj = sScores.juriScores[i] || {
                        juriId: i,
                        kebenaran: 100,
                        teknikSerangBela: 50,
                        teknikSenjataKoreografi: 50,
                        kemantapan: 50,
                        penjiwaan: 50,
                        salahGerakCount: 0,
                        salahSenjataCount: 0,
                        suaraCount: 0,
                        keluarGelanggangCount: 0,
                        pakaianAksesorisCount: 0,
                      };
                      scoresList.push(calculateSeniScoreForJuri(cat, scoreObj));
                    }
                    const sorted = [...scoresList].sort((a, b) => a - b);
                    let medianVal = 0;
                    if (sorted.length > 0) {
                      if (sorted.length % 2 === 0) {
                        medianVal = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
                      } else {
                        medianVal = sorted[Math.floor(sorted.length / 2)];
                      }
                    }
                    const hukuman = calculateSeniHukumanTotal(sScores.hukumanLog);
                    const rawTotalScore = Math.max(0, medianVal - hukuman);
                    return rawTotalScore.toFixed(3);
                  })()}
                </div>
              </div>

              {/* Row 2: Standard Deviation */}
              <div className="flex w-full">
                <div
                  className={`w-[45%] text-left px-5 font-extrabold text-indigo-200 uppercase bg-[#1a1442]/65 flex items-center ${isFullscreen ? "py-2 lg:py-2.5 text-sm md:text-base lg:text-lg" : "py-4 text-xs md:text-sm"}`}
                >
                  STANDAR DEVIASI
                </div>
                <div
                  className={`flex-1 text-center font-mono font-bold text-indigo-100 bg-gradient-to-r from-[#0a1e4a]/90 via-[#102d6b]/85 to-[#07173a]/85 backdrop-blur-sm border-l-2 border-[#3c2a68] flex items-center justify-center ${isFullscreen ? "py-2 lg:py-2.5 text-lg md:text-xl lg:text-2xl" : "py-4 text-base"}`}
                >
                  {calculateSeniStandardDeviation(
                    matchState.kategoriSeni || "TUNGGAL",
                    matchState.seniScores?.[activeCorner],
                    matchState.jumlahJuri || 10,
                    activeCorner
                  ).toFixed(9)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FULL-SCREEN BANNER FOR INPUT NILAI HUKUMAN DEWAN (WHEN ALL JURI READY) */}
      {isBannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-md flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto animate-fadeIn select-none font-sans">
          <div className="w-full max-w-7xl bg-[#080d24]/90 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(168,85,247,0.15)] mt-4 mb-4 relative">

            {/* Athlete Info Header inside the Banner */}
            <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between border-b border-purple-500/20 pb-2 mb-4 gap-3">
              <div className="text-left">
                <span className="text-[9px] bg-purple-650 text-white font-bold px-1.5 py-0.5 rounded font-mono w-max block mb-1">
                  PANEL INPUT NILAI HUKUMAN DEWAN (ALL JURI READY)
                </span>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">
                  PENAMPIL AKTIF (SUDUT {activeCorner})
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight font-sans leading-none mt-1">
                  {activeCorner === "BIRU"
                    ? matchState.atlitBiru?.nama || "BENNY G. SUMARSONO"
                    : matchState.atlitMerah?.nama || "SUHARTONO"}
                </h3>
                <p className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold mt-0.5">
                  {activeCorner === "BIRU"
                    ? matchState.atlitBiru?.kontingen || "BALI"
                    : matchState.atlitMerah?.kontingen || "JAWA BARAT"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-left md:text-right">
                  <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">KATEGORI</span>
                  <span className="text-xs font-black text-white uppercase">
                    {matchState.kategoriSeni === "SOLO_KREATIF" ? "TUNGGAL BEBAS" : matchState.kategoriSeni || "TUNGGAL"} ({matchState.gender || "PUTRA"})
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-950/80 border-2 border-purple-500/50 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
                  <Gavel className="w-5 h-5 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Row 1: Durasi & Rekap Skor Side-by-Side (Highly Compact) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full mb-4 items-stretch">
              
              {/* Grid 1: Durasi Penampilan Card (Compact) */}
              <div className="w-full bg-[#0e0a24]/90 border-2 border-[#3c2a68] rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
                <div className="bg-[#1e1742] text-left border-b border-[#3c2a68] px-4 py-1.5 flex items-center justify-between">
                  <span className="font-bold text-indigo-100 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-yellow-400" />
                    DURASI PENAMPILAN (Layar Sentuh/Dewan)
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300 font-bold">TARGET: {formatMinSec(matchState.durasiBabak || 180)}</span>
                </div>

                <div className="grid grid-cols-4 text-center bg-[#0b081e]/60 py-2.5 px-4 gap-2.5 flex-grow justify-center items-center">
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-[#2a134a]/90 via-[#34165c]/80 to-[#1c0b33]/90 border border-[#3c2a68] rounded-xl py-1 shadow-inner">
                    <span className="font-semibold text-yellow-300 text-[9px] mb-0.5 uppercase tracking-wider">MENIT</span>
                    <span className="font-mono font-black text-lg md:text-xl text-yellow-300 leading-tight">
                      {String(Math.floor((matchState.timer2Value || 0) / 60)).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-[#2a134a]/90 via-[#34165c]/80 to-[#1c0b33]/90 border border-[#3c2a68] rounded-xl py-1 shadow-inner">
                    <span className="font-semibold text-yellow-300 text-[9px] mb-0.5 uppercase tracking-wider">DETIK</span>
                    <span className="font-mono font-black text-lg md:text-xl text-yellow-300 leading-tight">
                      {String((matchState.timer2Value || 0) % 60).padStart(2, "0")}
                    </span>
                  </div>
                  {(() => {
                    const targetDur = matchState.durasiBabak || 180;
                    const elapsedDur = matchState.timer2Value || 0;
                    const isTimerStopped = !matchState.timerBerjalan && elapsedDur > 0;

                    const kurangDiff = elapsedDur < targetDur ? targetDur - elapsedDur : 0;
                    const kurangMin = Math.floor(kurangDiff / 60);
                    const kurangSec = kurangDiff % 60;
                    const kurangFormatted = `${String(kurangMin).padStart(2, "0")} : ${String(kurangSec).padStart(2, "0")}`;

                    const lebihDiff = elapsedDur > targetDur ? elapsedDur - targetDur : 0;
                    const lebihMin = Math.floor(lebihDiff / 60);
                    const lebihSec = lebihDiff % 60;
                    const lebihFormatted = `${String(lebihMin).padStart(2, "0")} : ${String(lebihSec).padStart(2, "0")}`;

                    const hasKurang = isTimerStopped && kurangDiff > 0;
                    const hasLebih = isTimerStopped && lebihDiff > 0;

                    return (
                      <>
                        <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#2a134a]/90 via-[#34165c]/80 to-[#1c0b33]/90 rounded-xl py-1 transition-all duration-700 ease-in-out ${
                          hasKurang
                            ? "border-2 border-red-500 shadow-[0_0_22px_rgba(239,68,68,0.85)] bg-red-950/50"
                            : "border border-red-500/30 shadow-inner"
                        }`}>
                          <span className="font-semibold text-rose-400 text-[9px] mb-0.5 uppercase tracking-wider">KURANG</span>
                          <span className={`font-mono font-black text-sm md:text-base leading-tight transition-all duration-700 ${
                            hasKurang ? "text-rose-400 animate-pulse scale-105" : "text-rose-400/40"
                          }`}>
                            {hasKurang ? kurangFormatted : "-- : --"}
                          </span>
                        </div>
                        <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#2a134a]/90 via-[#34165c]/80 to-[#1c0b33]/90 rounded-xl py-1 transition-all duration-700 ease-in-out ${
                          hasLebih
                            ? "border-2 border-blue-500 shadow-[0_0_22px_rgba(59,130,246,0.85)] bg-blue-950/50"
                            : "border border-blue-500/30 shadow-inner"
                        }`}>
                          <span className="font-semibold text-blue-400 text-[9px] mb-0.5 uppercase tracking-wider">LEBIH</span>
                          <span className={`font-mono font-black text-sm md:text-base leading-tight transition-all duration-700 ${
                            hasLebih ? "text-blue-400 animate-pulse scale-105" : "text-blue-400/40"
                          }`}>
                            {hasLebih ? lebihFormatted : "-- : --"}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Grid 2: Score Summary Info Card (Median, Total Hukuman, Skor Akhir) (Compact) */}
              <div className="w-full bg-[#0b081e]/80 border-2 border-purple-500/20 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                <div className="bg-[#1e1742] text-left border-b border-purple-500/20 px-4 py-1.5 flex items-center">
                  <span className="font-bold text-indigo-100 uppercase tracking-wide text-[11px]">
                    REKAPITULASI SKOR PENAMPILAN
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 bg-[#0b081e]/60 py-2.5 px-4 flex-grow justify-center items-center">
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-purple-500/10 text-center flex flex-col justify-center h-full">
                    <span className="text-[9px] text-purple-300 font-bold uppercase tracking-wider block mb-0.5">MEDIAN JURI</span>
                    <span className="font-mono text-base md:text-lg font-black text-yellow-400 leading-tight">
                      {(() => {
                        const jCount = matchState.jumlahJuri || 10;
                        const scoresList = [];
                        for (let i = 1; i <= jCount; i++) {
                          const scoreObj = matchState.seniScores[activeCorner].juriScores[i];
                          scoresList.push(calculateSeniScoreForJuri(matchState.kategoriSeni, scoreObj));
                        }
                        const sortedScores = [...scoresList].sort((a, b) => a - b);
                        let medianValue = 0;
                        if (sortedScores.length > 0) {
                          if (sortedScores.length % 2 === 0) {
                            medianValue = (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2;
                          } else {
                            medianValue = sortedScores[Math.floor(sortedScores.length / 2)];
                          }
                        }
                        return medianValue.toFixed(3);
                      })()}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-xl border border-purple-500/10 text-center flex flex-col justify-center h-full">
                    <span className="text-[9px] text-purple-300 font-bold uppercase tracking-wider block mb-0.5">TOTAL HUKUMAN</span>
                    <span className="font-mono text-base md:text-lg font-black text-red-400 leading-tight">
                      {(() => {
                        const totalPenalties = calculateSeniHukumanTotal(matchState.seniScores[activeCorner].hukumanLog);
                        return totalPenalties > 0 ? `-${totalPenalties.toFixed(2)}` : "0.00";
                      })()}
                    </span>
                  </div>

                  <div className="bg-[#1b103c]/60 p-2 rounded-xl border border-purple-500/30 text-center flex flex-col justify-center h-full">
                    <span className="text-[9px] text-yellow-300 font-bold uppercase tracking-wider block mb-0.5">SKOR AKHIR</span>
                    <span className="font-mono text-base md:text-lg font-black text-emerald-400 leading-tight">
                      {(() => {
                        const sScores = matchState.seniScores[activeCorner];
                        const jCount = matchState.jumlahJuri || 10;
                        const cat = matchState.kategoriSeni || matchState.kelas || 'TUNGGAL';
                        const scoresList = [];
                        for (let i = 1; i <= jCount; i++) {
                          const scoreObj = sScores.juriScores[i] || {
                            juriId: i,
                            kebenaran: 100,
                            teknikSerangBela: 50,
                            teknikSenjataKoreografi: 50,
                            kemantapan: 50,
                            penjiwaan: 50,
                            salahGerakCount: 0,
                            salahSenjataCount: 0,
                            suaraCount: 0,
                            keluarGelanggangCount: 0,
                            pakaianAksesorisCount: 0,
                          };
                          scoresList.push(calculateSeniScoreForJuri(cat, scoreObj));
                        }
                        const sorted = [...scoresList].sort((a, b) => a - b);
                        let medianVal = 0;
                        if (sorted.length > 0) {
                          if (sorted.length % 2 === 0) {
                            medianVal = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
                          } else {
                            medianVal = sorted[Math.floor(sorted.length / 2)];
                          }
                        }
                        const hukuman = calculateSeniHukumanTotal(sScores.hukumanLog);
                        const rawTotalScore = Math.max(0, medianVal - hukuman);
                        return rawTotalScore.toFixed(3);
                      })()}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Grid 3: Pengurangan Hukuman Dewan Card (Enlarged Elements) */}
            <div className="w-full bg-[#0e0a24]/95 border-2 border-[#3c2a68] rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between mb-6">
              <div className="bg-[#1e1742] text-left border-b border-[#3c2a68] px-5 py-3.5">
                <span className="font-bold text-indigo-100 uppercase tracking-wide text-xs">
                  PENGURANGAN HUKUMAN DEWAN
                </span>
              </div>

              <div className="divide-y divide-[#3c2a68]/60 text-left bg-[#0c0822] flex-1 flex flex-col justify-between">
                {getDewanPenaltyList(matchState).map((row) => {
                  const currentVal = (matchState.seniScores[activeCorner].hukumanLog as any)[row.id] || 0;
                  return (
                    <div key={row.id} className="flex items-center justify-between p-4.5 w-full hover:bg-white/5 transition">
                      <span className="font-extrabold text-white pr-4 leading-tight text-xs md:text-sm flex-grow text-left">
                        {row.label}
                      </span>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => adjustHukuman(activeCorner, row.id as any, 0.5)}
                          className="font-black bg-[#e63222] hover:bg-red-500 text-white rounded-xl cursor-pointer transition active:scale-90 px-12 py-4 text-base md:text-lg min-w-[180px] md:min-w-[210px] shadow-md"
                        >
                          -0.5
                        </button>
                        <button
                          onClick={() => clearHukuman(activeCorner, row.id as any)}
                          className="font-black bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border-2 border-slate-600/60 cursor-pointer transition active:scale-95 px-3 py-2.5 text-xs md:text-xs shadow-md"
                        >
                          CLR
                        </button>
                        <div className="text-center font-mono font-black text-red-400 bg-gradient-to-br from-[#2a134a]/85 via-[#34165c]/75 to-[#1c0b33]/85 rounded-xl border-2 border-purple-500/60 ml-1 shadow-inner backdrop-blur-sm w-16 py-2 text-sm leading-tight">
                          {currentVal > 0 ? `-${currentVal.toFixed(2)}` : "0"}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Total Penalty Row inside Banner */}
                <div className="flex items-center justify-between bg-[#141035]/90 font-bold border-t border-[#3c2a68] p-4.5 flex-none">
                  <span className="text-[#0fd4f5] uppercase tracking-wider text-xs font-black">
                    TOTAL HUKUMAN DEWAN
                  </span>
                  <div className="text-center font-mono font-black text-yellow-300 bg-gradient-to-br from-[#0a1e4a]/95 via-[#102d6b]/85 to-[#07173a]/90 rounded-xl border-2 border-blue-500/50 shadow-inner w-20 py-2 text-base">
                    {(() => {
                      const totalPenalties = calculateSeniHukumanTotal(matchState.seniScores[activeCorner].hukumanLog);
                      return totalPenalties > 0 ? `-${totalPenalties.toFixed(2)}` : "0.00";
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol selesai input/tutup Banner */}
            <div className="flex justify-center mt-6 w-full">
              <button
                disabled={!allActiveJudgesFinished}
                onClick={() => {
                  playClickSound();
                  setIsBannerOpen(false);
                  setIsDewanInputFinished(true);
                }}
                className={`w-full sm:w-auto px-12 py-4 font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg border transition ${
                  allActiveJudgesFinished
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-500/20 active:scale-95 cursor-pointer"
                    : "bg-slate-800/85 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-50"
                }`}
              >
                {!allActiveJudgesFinished ? "MENUNGGU SEMUA JURI FINISH (TERKUNCI)" : "SELESAI INPUT / TUTUP BANNER"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION FOR LANJUT */}
      {showLanjutConfirm && (
        <div id="dewan-lanjut-confirm-modal" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-yellow-500/50 rounded-3xl p-6 shadow-2xl text-center font-sans">
            <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-pulse" />
            <h4 className="text-lg font-black text-white uppercase mb-2 tracking-wide font-sans">
              KONFIRMASI LANJUT
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed mb-6 font-medium">
              {(() => {
                if (isPoolSystem) {
                  const matches = matchState.partai ? matchState.partai.match(/\d+/) : null;
                  const currentPartaiNum = matches ? parseInt(matches[0], 10) : 1;
                  return `Apakah Akan Melanjutkan Penampil ${currentPartaiNum + 1}?`;
                }
                return "Apakah Akan Melanjutkan Penampil Kedua (Sudut Biru/Merah)?";
              })()}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                id="lanjut-btn-tidak"
                onClick={() => {
                  playClickSound();
                  setShowLanjutConfirm(false);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-755 text-slate-300 hover:text-white font-extrabold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
              >
                TIDAK
              </button>
              <button
                type="button"
                id="lanjut-btn-ya"
                onClick={() => {
                  playClickSound();
                  const active = matchState.activeCorner || "BIRU";
                  const updated = { ...matchState };
                  if (active === "BIRU") {
                    updated.hasPerformedBIRU = true;
                    if (updated.durasiTampilBIRU === undefined || updated.durasiTampilBIRU === 0) {
                      updated.durasiTampilBIRU = updated.timer2Value || 0;
                    }
                  } else {
                    updated.hasPerformedMERAH = true;
                    if (updated.durasiTampilMERAH === undefined || updated.durasiTampilMERAH === 0) {
                      updated.durasiTampilMERAH = updated.timer2Value || 0;
                    }
                  }

                  // Trigger Penampilan Selesai pop-up (showRoundEndPopUp = true)
                  updated.showRoundEndPopUp = true;
                  updated.showMatchEndPopUp = false;
                  updated.version = Date.now();

                  saveState(updated);
                  setShowLanjutConfirm(false);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-450 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 transition active:scale-95 cursor-pointer"
              >
                YA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION FOR AKHIRI */}
      {showAkhiriConfirm && (
        <div id="dewan-akhiri-confirm-modal" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center font-sans">
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-bounce" />
            <h4 className="text-lg font-black text-white uppercase mb-2 tracking-wide font-sans">
              AKHIRI PERTANDINGAN
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
              Apakah Anda Yakin Mengakhiri Pertandingan Ini? Tindakan ini akan mengunci seluruh nilai dan menentukan pemenang.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                id="akhiri-btn-tidak"
                onClick={() => {
                  playClickSound();
                  setShowAkhiriConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-755 text-slate-300 hover:text-white font-extrabold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
              >
                TIDAK
              </button>
              <button
                type="button"
                id="akhiri-btn-ya"
                onClick={() => {
                  playClickSound();
                  const updated = { ...matchState };
                  const active = matchState.activeCorner || "BIRU";

                  // Mark current active corner as performed
                  if (active === "BIRU") {
                    updated.hasPerformedBIRU = true;
                    if (updated.durasiTampilBIRU === undefined || updated.durasiTampilBIRU === 0) {
                      updated.durasiTampilBIRU = updated.timer2Value || 0;
                    }
                  } else {
                    updated.hasPerformedMERAH = true;
                    if (updated.durasiTampilMERAH === undefined || updated.durasiTampilMERAH === 0) {
                      updated.durasiTampilMERAH = updated.timer2Value || 0;
                    }
                  }

                  updated.showMatchEndPopUp = true;
                  updated.showRoundEndPopUp = false;
                  updated.statusPertandingan = "SELESAI";

                  const scoreB = calculateFinalScore("BIRU", updated);
                  const scoreR = calculateFinalScore("MERAH", updated);
                  if (scoreB > scoreR) {
                    updated.pemenang = "BIRU";
                  } else if (scoreR > scoreB) {
                    updated.pemenang = "MERAH";
                  } else {
                    updated.pemenang = evaluateTieBreak(updated).winner;
                  }

                  updated.version = Date.now();
                  saveState(updated);
                  setShowAkhiriConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/10 transition active:scale-95 cursor-pointer"
              >
                YA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION FOR LANJUT POOL */}
      {showLanjutPoolConfirm && (
        <div id="dewan-lanjut-pool-confirm-modal" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center font-sans">
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-bounce" />
            <h4 className="text-lg font-black text-white uppercase mb-2 tracking-wide font-sans">
              SIMPAN & LANJUTKAN
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
              Apakah Anda Yakin ingin menyimpan nilai penampil ini dan melanjutkan ke pertandingan pool berikutnya?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                id="lanjut-pool-btn-tidak"
                onClick={() => {
                  playClickSound();
                  setShowLanjutPoolConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-755 text-slate-300 hover:text-white font-extrabold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
              >
                TIDAK
              </button>
              <button
                type="button"
                id="lanjut-pool-btn-ya"
                onClick={() => {
                  playClickSound();
                  const updated = { ...matchState };
                  const active = matchState.activeCorner || "BIRU";

                  // Mark current active corner as performed
                  if (active === "BIRU") {
                    updated.hasPerformedBIRU = true;
                    if (updated.durasiTampilBIRU === undefined || updated.durasiTampilBIRU === 0) {
                      updated.durasiTampilBIRU = updated.timer2Value || 0;
                    }
                  } else {
                    updated.hasPerformedMERAH = true;
                    if (updated.durasiTampilMERAH === undefined || updated.durasiTampilMERAH === 0) {
                      updated.durasiTampilMERAH = updated.timer2Value || 0;
                    }
                  }

                  updated.dewanConfirmedLanjutPool = true;
                  updated.showMatchEndPopUp = false;
                  updated.showRoundEndPopUp = false;
                  updated.statusPertandingan = "SELESAI";

                  const scoreB = calculateFinalScore("BIRU", updated);
                  const scoreR = calculateFinalScore("MERAH", updated);
                  if (scoreB > scoreR) {
                    updated.pemenang = "BIRU";
                  } else if (scoreR > scoreB) {
                    updated.pemenang = "MERAH";
                  } else {
                    updated.pemenang = evaluateTieBreak(updated).winner;
                  }

                  updated.version = Date.now();
                  saveState(updated);
                  setShowLanjutPoolConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-450 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 transition active:scale-95 cursor-pointer"
              >
                YA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISKUALIFIKASI / UNDUR DIRI (DISK - UD) MODAL */}
      {showDiskUdModal && (() => {
        const currentActiveCorner = matchState.activeCorner || activeCorner || "BIRU";
        const target = autoDiskTargetCorner || currentActiveCorner;
        return (
          <div id="dewan-diskud-modal" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl font-sans text-center">
              {selectedAction === null ? (
                // STEP 1: CHOOSE ACTION
                <div>
                  <AlertTriangle className="w-12 h-12 text-teal-400 mx-auto mb-4 animate-pulse" />
                  <h4 className="text-lg font-black text-white uppercase mb-1 tracking-wide font-sans">
                    DISKUALIFIKASI / UNDUR DIRI
                  </h4>
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 my-4 text-center">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                      currentActiveCorner === 'BIRU' ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'bg-red-600/20 text-red-300 border border-red-500/30'
                    }`}>
                      {currentActiveCorner === 'BIRU' ? 'SUDUT BIRU' : 'SUDUT MERAH'} (AKTIF)
                    </span>
                    <h5 className="text-base font-black text-white uppercase mt-1.5 leading-tight">
                      {currentActiveCorner === 'BIRU' ? (matchState?.atlitBiru?.nama || 'ATLIT BIRU') : (matchState?.atlitMerah?.nama || 'ATLIT MERAH')}
                    </h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                      {currentActiveCorner === 'BIRU' ? (matchState?.atlitBiru?.kontingen || '') : (matchState?.atlitMerah?.kontingen || '')}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    Silakan pilih jenis keputusan di bawah ini untuk sudut yang aktif saat ini.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSelectedAction('DISKUALIFIKASI');
                      }}
                      className="py-4 px-3 rounded-2xl bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 hover:border-red-400/50 text-red-300 font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer flex flex-col items-center gap-2 justify-center"
                    >
                      <ShieldAlert className="w-6 h-6 text-red-500" />
                      <span>DISKUALIFIKASI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSelectedAction('UNDUR_DIRI');
                      }}
                      className="py-4 px-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/40 hover:border-amber-400/50 text-amber-300 font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer flex flex-col items-center gap-2 justify-center"
                    >
                      <UserX className="w-6 h-6 text-amber-500" />
                      <span>UNDUR DIRI</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowDiskUdModal(false);
                      setAutoDiskTargetCorner(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                  >
                    BATAL
                  </button>
                </div>
              ) : (
                // STEP 2: CONFIRM "TIDAK / YA"
                <div>
                  {selectedAction === 'DISKUALIFIKASI' ? (
                     <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
                  ) : (
                    <UserX className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
                  )}
                  <h4 className="text-lg font-black text-white uppercase mb-1 tracking-wide font-sans">
                    KONFIRMASI {selectedAction === 'DISKUALIFIKASI' ? 'DISKUALIFIKASI' : 'UNDUR DIRI'}
                  </h4>

                  {autoDiskReason && (
                    <div className="bg-red-950/65 border border-red-500/50 p-4 rounded-2xl mb-4 text-center">
                      <p className="text-red-400 font-extrabold text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                        DISKUALIFIKASI OTOMATIS (DURASI)
                      </p>
                      <p className="text-slate-200 text-xs leading-relaxed font-sans font-medium whitespace-pre-line">
                        {autoDiskReason}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 leading-relaxed my-4">
                    {target === 'BOTH' ? (
                      <span>Apakah Anda yakin ingin menyatakan <span className="text-red-400 font-extrabold">DISKUALIFIKASI KEDUA PENAMPIL</span>? Penentuan pemenang akan dilakukan menggunakan aturan khusus diskualifikasi ganda.</span>
                    ) : (
                      <span>
                        Apakah Anda yakin ingin menyatakan <span className="text-white font-extrabold">{selectedAction === 'DISKUALIFIKASI' ? 'DISKUALIFIKASI' : 'UNDUR DIRI'}</span> untuk{" "}
                        <span className={target === 'BIRU' ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'}>
                          {target === 'BIRU' ? 'SUDUT BIRU' : 'SUDUT MERAH'}
                        </span>{" "}
                        ({target === 'BIRU' ? (matchState?.atlitBiru?.nama || 'ATLIT BIRU') : (matchState?.atlitMerah?.nama || 'ATLIT MERAH')})?
                      </span>
                    )}
                  </p>
                  <div className="flex gap-4 justify-center mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setShowDiskUdModal(false);
                        setSelectedAction(null);
                        setAutoDiskReason(null);
                        setAutoDiskTargetCorner(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-755 text-slate-300 hover:text-white font-black text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                    >
                      TIDAK
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        const updated = { ...matchState };

                        if (selectedAction === 'DISKUALIFIKASI') {
                          if (target === 'BOTH') {
                            updated.diskualifikasi = 'BOTH';
                            updated.pemenang = evaluateTieBreak(updated).winner;
                            updated.victoryType = undefined;
                          } else {
                            updated.diskualifikasi = target;
                            updated.pemenang = target === "BIRU" ? "MERAH" : "BIRU";
                            updated.victoryType = undefined;
                          }
                          if (autoDiskReason) {
                            updated.diskualifikasiReason = 'MELEBIHI_TOLERANSI_WAKTU';
                            updated.autoDiskReason = autoDiskReason;
                          } else {
                            updated.diskualifikasiReason = 'MANUAL_DISKUALIFIKASI';
                            updated.autoDiskReason = null;
                          }
                        } else {
                          updated.victoryType = 'UNDUR_DIRI';
                          updated.pemenang = target === "BIRU" ? "MERAH" : "BIRU";
                          updated.diskualifikasi = null;
                          updated.diskualifikasiReason = 'MANUAL_UNDUR_DIRI';
                          updated.autoDiskReason = null;
                        }

                        // Mark current active corner as performed & record duration
                        if (currentActiveCorner === "BIRU") {
                          updated.hasPerformedBIRU = true;
                          if (updated.durasiTampilBIRU === undefined || updated.durasiTampilBIRU === 0) {
                            updated.durasiTampilBIRU = updated.timer2Value || 0;
                          }
                        } else {
                          updated.hasPerformedMERAH = true;
                          if (updated.durasiTampilMERAH === undefined || updated.durasiTampilMERAH === 0) {
                            updated.durasiTampilMERAH = updated.timer2Value || 0;
                          }
                        }

                        if (isPoolSystem) {
                          updated.dewanConfirmedLanjutPool = true;
                          updated.showMatchEndPopUp = false;
                        } else {
                          updated.showMatchEndPopUp = true;
                        }
                        updated.showRoundEndPopUp = false;
                        updated.statusPertandingan = "SELESAI";
                        updated.version = Date.now();

                        saveState(updated);
                        setShowDiskUdModal(false);
                        setSelectedAction(null);
                        setAutoDiskReason(null);
                        setAutoDiskTargetCorner(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/10 transition active:scale-95 cursor-pointer"
                    >
                      YA
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* CONFIRMATION TIMEOUT RESEATING MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center font-sans">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-bounce" />
            <h4 className="text-lg font-black text-white uppercase mb-2">
              RESET WAKTU PERTANDINGAN
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
              APAKAH ANDA YAKIN INGIN MENYETEL ULANG WAKTU PERTANDINGAN KE
              DEFAULT 3 MENIT (180 DETIK)? TINDAKAN INI AKAN MENGHENTIKAN TIMER.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white font-bold text-xs cursor-pointer active:scale-95"
              >
                BATAL
              </button>
              <button
                onClick={resetTimer}
                className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-450 cursor-pointer active:scale-95"
              >
                YA, RESET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHOOSE WINNER DECLARATION POPUP */}
      {showWinnerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
          <div className="w-full max-w-md bg-[#1e293b] border border-slate-700 rounded-3xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowWinnerModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 hover:text-white transition cursor-pointer font-sans"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
            <h3 className="text-lg font-black text-white uppercase flex items-center gap-1.5 mb-2 font-display">
              <Award className="w-5 h-5 text-amber-500" /> KEPUTUSAN REFEREE:
              PEMENANG SENI
            </h3>
            <p className="text-[11px] text-slate-400 leading-snug mb-5 font-medium">
              SISTEM TELAH MEREKAP SEMUA SKOR DAN DEVIASI. SILAKAN KONFIRMASI
              SUDUT PEMENANG PERTANDINGAN INI:
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Biru Corner Button */}
              <button
                onClick={() => setSelectedWinner("BIRU")}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-95 ${
                  selectedWinner === "BIRU"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-md font-bold"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-350"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-900/50 text-blue-400 border border-blue-900/30 flex items-center justify-center font-black text-sm mb-2">
                  B
                </div>
                <span className="text-xs font-black uppercase leading-tight truncate w-full">
                  {matchState.atlitBiru?.nama || "ATLIT BIRU"}
                </span>
                <span className="text-[10px] font-mono mt-1 font-extrabold">
                  {biruStats.finalScore.toFixed(3)} PT
                </span>
              </button>

              {/* Merah Corner Button */}
              <button
                onClick={() => setSelectedWinner("MERAH")}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-95 ${
                  selectedWinner === "MERAH"
                    ? "bg-red-600/20 border-red-500 text-red-500 shadow-md font-bold"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-350"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-red-900/50 text-red-400 border border-red-900/30 flex items-center justify-center font-black text-sm mb-2">
                  M
                </div>
                <span className="text-xs font-black uppercase leading-tight truncate w-full">
                  {matchState.atlitMerah?.nama || "ATLIT MERAH"}
                </span>
                <span className="text-[10px] font-mono mt-1 font-extrabold">
                  {merahStats.finalScore.toFixed(3)} PT
                </span>
              </button>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowWinnerModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-750 font-bold text-xs cursor-pointer active:scale-95 text-center uppercase"
              >
                BATAL
              </button>
              <button
                disabled={!selectedWinner}
                onClick={() => declareWinnerAndFinish(selectedWinner!)}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-450 disabled:bg-slate-800 disabled:text-slate-655 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs cursor-pointer active:scale-95 text-center uppercase shadow-lg"
              >
                UMUMKAN PEMENANG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERTANDINGAN SELESAI OVERLAY FOR DEWAN */}
      {matchState.showMatchEndPopUp && (() => {
        const isDqOrUdInPool = isPoolSystem && (!!matchState.diskualifikasi || matchState.victoryType === 'UNDUR_DIRI');
        if (isDqOrUdInPool) {
          const matches = matchState.partai ? matchState.partai.match(/\d+/) : null;
          const currentPartaiNum = matches ? parseInt(matches[0], 10) : 1;
          const nextPartaiNum = currentPartaiNum + 1;
          return (
            <div className="fixed inset-0 z-50 bg-[#00000ef9] backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none font-sans">
              <div className="max-w-md w-full bg-[#160a2acc] border-2 border-teal-500 p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
                {/* Decorative header */}
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 animate-pulse"></div>
                <AlertTriangle className="w-16 h-16 text-teal-400 animate-pulse" />
                <div>
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest font-mono block">
                    PANEL DEWAN - SISTEM POOL
                  </span>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase mt-1">
                    LANJUTKAN PENAMPIL BERIKUTNYA
                  </h3>
                </div>
                <p className="text-sm font-bold text-slate-300">
                  Apakah Akan Melanjutkan Penampil {nextPartaiNum}?
                </p>
                <p className="text-xs text-slate-400 leading-relaxed px-2 font-sans font-medium">
                  Memilih <span className="font-extrabold text-white">YA</span> akan meneruskan instruksi ke panel Sekretaris untuk memuat penampil selanjutnya. Memilih <span className="font-extrabold text-white">TIDAK</span> akan menutup notifikasi ini.
                </p>
                <div className="flex gap-4 w-full pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      updateMatchState({
                        ...matchState,
                        showMatchEndPopUp: false,
                        diskualifikasi: null,
                        pemenang: null
                      });
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-755 text-slate-300 hover:text-white font-black text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer text-center font-sans"
                  >
                    TIDAK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      updateMatchState({
                        ...matchState,
                        showMatchEndPopUp: false,
                        dewanConfirmedLanjutPool: true
                      });
                    }}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer text-center shadow-[0_0_12px_rgba(20,184,166,0.3)] border border-teal-400/30 font-sans"
                  >
                    YA
                  </button>
                </div>
              </div>
            </div>
          );
        }

        let isPoolFullyCompleted = false;
        let performedCount = 0;
        let totalPoolAthletes = 0;

        if (isPoolSystem) {
          const activePool = (matchState.tahapPertandingan || 'POOL A').toUpperCase();
          const kategori = (matchState.kelas || matchState.kategoriSeni || 'TUNGGAL').toUpperCase();
          const usia = (matchState.kategoriUsia || 'REMAJA').toUpperCase();
          const gender = (matchState.gender || 'PUTRA').toUpperCase();

          const getBasePoolLocal = (stage: string) => {
            if (!stage) return '';
            const upper = stage.toUpperCase();
            const markers = [' - TAMPIL', '-TAMPIL', ' TAMPIL'];
            for (const m of markers) {
              if (upper.includes(m)) {
                return upper.split(m)[0].trim();
              }
            }
            return upper.trim();
          };
          const baseActivePool = getBasePoolLocal(activePool).toUpperCase();

          let poolAthletesList: any[] = [];
          try {
            const uniqueAthletes = new Map<string, any>();
            const rawAthletes = typeof window !== 'undefined' ? localStorage.getItem('silat_athletes') : null;
            const allAthletes = rawAthletes ? JSON.parse(rawAthletes) : [];
            const filteredRegistered = allAthletes.filter((a: any) => {
              const aJurus = (a.kategoriJurus || '').toUpperCase().trim();
              const aUsia = (a.kategoriUsia || '').toUpperCase().trim();
              const aGender = (a.gender || '').toUpperCase().trim();
              const aPool = (a.pool || '').toUpperCase().trim().replace('-', ' ');
              const aSistem = (a.sistemTanding || 'BATTLE').toUpperCase().trim();
              return (
                aSistem === 'POOL' &&
                aJurus === kategori &&
                aUsia === usia &&
                aGender === gender &&
                (aPool === baseActivePool || baseActivePool.includes(aPool) || aPool.includes(baseActivePool) || getBasePoolLocal(aPool).toUpperCase() === baseActivePool)
              );
            });
            filteredRegistered.forEach((a: any) => {
              if (a.nama && a.nama !== '---') {
                uniqueAthletes.set(a.nama.toUpperCase().trim(), { nama: a.nama, kontingen: a.kontingen });
              }
            });
            if (matchState.atlitBiru?.nama && matchState.atlitBiru?.nama !== '---') {
              uniqueAthletes.set(matchState.atlitBiru.nama.toUpperCase().trim(), matchState.atlitBiru);
            }
            if (matchState.atlitMerah?.nama && matchState.atlitMerah?.nama !== '---') {
              uniqueAthletes.set(matchState.atlitMerah.nama.toUpperCase().trim(), matchState.atlitMerah);
            }
            const rawHistory = typeof window !== 'undefined' ? localStorage.getItem('silat_scoring_match_history') : null;
            const historyList: any[] = rawHistory ? JSON.parse(rawHistory) : [];
            historyList.forEach(h => {
              const hKategori = (h.kategoriSeni || h.kelas || '').toUpperCase().trim();
              const hUsia = (h.kategoriUsia || '').toUpperCase().trim();
              const hGender = (h.gender || '').toUpperCase().trim();
              const hStage = (h.tahapPertandingan || '').toUpperCase().trim();
              const isPoolMatchHist = hStage.includes('POOL') || (h.atlitMerah?.nama === '---' || h.atlitBiru?.nama === '---');
              const baseHStage = getBasePoolLocal(hStage).toUpperCase();
              if (isPoolMatchHist && hKategori === kategori && hUsia === usia && hGender === gender && (baseHStage === baseActivePool || baseActivePool.includes(baseHStage) || baseHStage.includes(baseActivePool))) {
                if (h.atlitBiru?.nama && h.atlitBiru?.nama !== '---') {
                  uniqueAthletes.set(h.atlitBiru.nama.toUpperCase().trim(), h.atlitBiru);
                }
                if (h.atlitMerah?.nama && h.atlitMerah?.nama !== '---') {
                  uniqueAthletes.set(h.atlitMerah.nama.toUpperCase().trim(), h.atlitMerah);
                }
              }
            });

            // 4. Get from silat_jadwal_lines (Secretary's match parameters schedule list)
            let jadwalLinesLocal: any[] | null = null;
            if (matchState.silat_jadwal_lines && Array.isArray(matchState.silat_jadwal_lines)) {
              jadwalLinesLocal = matchState.silat_jadwal_lines;
            } else {
              const jadwalDataStr = typeof window !== 'undefined' ? localStorage.getItem('silat_jadwal_lines') : null;
              if (jadwalDataStr) {
                try {
                  const parsed = JSON.parse(jadwalDataStr);
                  if (Array.isArray(parsed)) {
                    jadwalLinesLocal = parsed;
                  }
                } catch (err) {
                  console.error("Error parsing silat_jadwal_lines in DewanPanel:", err);
                }
              }
            }

            if (jadwalLinesLocal && Array.isArray(jadwalLinesLocal)) {
              jadwalLinesLocal.forEach((row: any) => {
                const hKategori = (row.kelas || row.kategoriSeni || '').toUpperCase().trim();
                const hUsia = (row.kategoriUsia || '').toUpperCase().trim();
                const hGender = (row.gender || '').toUpperCase().trim();
                const hStage = (row.tahapPertandingan || '').toUpperCase().trim();
                const baseHStage = getBasePoolLocal(hStage).toUpperCase();

                if (
                  hKategori === kategori &&
                  hUsia === usia &&
                  hGender === gender &&
                  (baseHStage === baseActivePool || baseActivePool.includes(baseHStage) || baseHStage.includes(baseActivePool))
                ) {
                  if (row.atlitBiru?.nama && row.atlitBiru?.nama !== '---') {
                    uniqueAthletes.set(row.atlitBiru.nama.toUpperCase().trim(), row.atlitBiru);
                  }
                  if (row.atlitMerah?.nama && row.atlitMerah?.nama !== '---') {
                    uniqueAthletes.set(row.atlitMerah.nama.toUpperCase().trim(), row.atlitMerah);
                  }
                }
              });
            }

            // 5. Get from silat_excel_matches
            let excelMatchesLocal: any[] | null = null;
            if (matchState.silat_excel_matches && Array.isArray(matchState.silat_excel_matches)) {
              excelMatchesLocal = matchState.silat_excel_matches;
            } else {
              const excelDataStr = typeof window !== 'undefined' ? localStorage.getItem('silat_excel_matches') : null;
              if (excelDataStr) {
                try {
                  const parsed = JSON.parse(excelDataStr);
                  if (Array.isArray(parsed)) {
                    excelMatchesLocal = parsed;
                  }
                } catch (err) {
                  console.error("Error parsing silat_excel_matches in DewanPanel:", err);
                }
              }
            }

            if (excelMatchesLocal && Array.isArray(excelMatchesLocal)) {
              excelMatchesLocal.forEach((row: any) => {
                const hKategori = (row['Kelas'] || '').toUpperCase().trim();
                const hUsia = (row['Kategori Usia'] || '').toUpperCase().trim();
                const hGender = (row['Gender'] || '').toUpperCase().trim();
                const hStage = (row['Tahap Pertandingan'] || '').toUpperCase().trim();
                const baseHStage = getBasePoolLocal(hStage).toUpperCase();

                if (
                  hKategori === kategori &&
                  hUsia === usia &&
                  hGender === gender &&
                  (baseHStage === baseActivePool || baseActivePool.includes(baseHStage) || baseHStage.includes(baseActivePool))
                ) {
                  const rowAtlitBiru = {
                    nama: row['Nama Pesilat Biru'],
                    kontingen: row['Kontingen Biru']
                  };
                  const rowAtlitMerah = {
                    nama: row['Nama Pesilat Merah'],
                    kontingen: row['Kontingen Merah']
                  };

                  if (rowAtlitBiru.nama && rowAtlitBiru.nama !== '---') {
                    uniqueAthletes.set(rowAtlitBiru.nama.toUpperCase().trim(), rowAtlitBiru);
                  }
                  if (rowAtlitMerah.nama && rowAtlitMerah.nama !== '---') {
                    uniqueAthletes.set(rowAtlitMerah.nama.toUpperCase().trim(), rowAtlitMerah);
                  }
                }
              });
            }

            poolAthletesList = Array.from(uniqueAthletes.values());
          } catch (e) {
            console.error(e);
          }

          totalPoolAthletes = poolAthletesList.length;

          // Check performed status
          let perfCount = 0;
          poolAthletesList.forEach(ath => {
            const cleanName = ath.nama.toUpperCase().trim();
            const isMerahCurrent = (matchState.atlitMerah?.nama || '').toUpperCase().trim() === cleanName;
            const isBiruCurrent = (matchState.atlitBiru?.nama || '').toUpperCase().trim() === cleanName;
            let hasPerf = false;
            if (isMerahCurrent || isBiruCurrent) {
              const corner = isMerahCurrent ? 'MERAH' : 'BIRU';
              hasPerf = (matchState.statusPertandingan === 'SELESAI' || !!matchState.umumkanPemenang)
                ? true
                : (corner === 'MERAH' ? !!matchState.hasPerformedMERAH : !!matchState.hasPerformedBIRU);
            } else {
              try {
                const rawHistory = typeof window !== 'undefined' ? localStorage.getItem('silat_scoring_match_history') : null;
                const historyList: any[] = rawHistory ? JSON.parse(rawHistory) : [];
                const foundInHist = historyList.some(h => {
                  const hKategori = (h.kategoriSeni || h.kelas || '').toUpperCase().trim();
                  const hUsia = (h.kategoriUsia || '').toUpperCase().trim();
                  const hGender = (h.gender || '').toUpperCase().trim();
                  const nameMerah = (h.atlitMerah?.nama || '').toUpperCase().trim();
                  const nameBiru = (h.atlitBiru?.nama || '').toUpperCase().trim();
                  const nameMatches = nameMerah === cleanName || nameBiru === cleanName;
                  const hStage = (h.tahapPertandingan || '').toUpperCase().trim();
                  const baseHStage = getBasePoolLocal(hStage).toUpperCase();
                  const stageMatches = hStage.includes('POOL') || baseHStage === baseActivePool || baseActivePool.includes(baseHStage) || baseHStage.includes(baseActivePool);
                  return nameMatches && stageMatches && hKategori === kategori && hUsia === usia && hGender === gender;
                });
                if (foundInHist) hasPerf = true;
              } catch (err) {}
            }
            if (hasPerf) perfCount++;
          });

          performedCount = perfCount;
          isPoolFullyCompleted = perfCount === totalPoolAthletes;
        }

        return (
          <div className="fixed inset-0 z-50 bg-[#00000ef9] backdrop-blur-md flex flex-col items-center justify-center p-4 text-center select-none font-sans overflow-y-auto">
            <div className={`w-full bg-[#160a2acc] border-2 border-purple-500/80 p-5 rounded-2xl space-y-4 shadow-2xl transition-all ${
              isPoolSystem ? 'max-w-4xl' : 'max-w-xl'
            }`}>
              <div className="flex items-center justify-center gap-3">
                <Award className="w-10 h-10 text-yellow-500 animate-bounce flex-shrink-0" />
                <div className="text-left">
                  <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest font-mono block">
                    {isPoolSystem
                      ? `PANEL DEWAN - SISTEM POOL (${performedCount} DARI ${totalPoolAthletes} PENAMPIL)`
                      : "PANEL DEWAN - KEPUTUSAN FINAL"
                    }
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">
                    {isPoolSystem
                      ? (isPoolFullyCompleted ? "PERTANDINGAN POOL SELESAI" : "PENAMPILAN SELESAI")
                      : "PERTANDINGAN TELAH SELESAI"
                    }
                  </h3>
                </div>
              </div>

              {(() => {
                const tbRes = evaluateTieBreak(matchState);
                const activeWinner = matchState.pemenang || tbRes.winner;
                const isSeniMatch =
                  [
                    "TUNGGAL",
                    "TUNGGAL BEBAS",
                    "GANDA",
                    "REGU",
                    "SOLO_KREATIF",
                  ].includes(matchState.kelas) ||
                  ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(
                    matchState.kategoriSeni,
                  );

                if (isPoolSystem) {
                  // Pool System: Show Standings for Juara 1, 2, 3
                  const activePool = (matchState.tahapPertandingan || 'POOL A').toUpperCase();
                  const kategori = (matchState.kelas || matchState.kategoriSeni || 'TUNGGAL').toUpperCase();
                  const usia = (matchState.kategoriUsia || 'REMAJA').toUpperCase();
                  const gender = (matchState.gender || 'PUTRA').toUpperCase();

                  const getBasePoolLocal = (stage: string) => {
                    if (!stage) return '';
                    const upper = stage.toUpperCase();
                    const markers = [' - TAMPIL', '-TAMPIL', ' TAMPIL'];
                    for (const m of markers) {
                      if (upper.includes(m)) {
                        return upper.split(m)[0].trim();
                      }
                    }
                    return upper.trim();
                  };

                  const baseActivePool = getBasePoolLocal(activePool).toUpperCase();
                  
                  let poolAthletesList: any[] = [];
                  try {
                    const uniqueAthletes = new Map<string, any>();

                    // 1. Get from registration list (silat_athletes)
                    const rawAthletes = typeof window !== 'undefined' ? localStorage.getItem('silat_athletes') : null;
                    const allAthletes = rawAthletes ? JSON.parse(rawAthletes) : [];
                    
                    const filteredRegistered = allAthletes.filter((a: any) => {
                      const aJurus = (a.kategoriJurus || '').toUpperCase().trim();
                      const aUsia = (a.kategoriUsia || '').toUpperCase().trim();
                      const aGender = (a.gender || '').toUpperCase().trim();
                      const aPool = (a.pool || '').toUpperCase().trim().replace('-', ' ');
                      const aSistem = (a.sistemTanding || 'BATTLE').toUpperCase().trim();
                      
                      const targetJurus = kategori.trim();
                      const targetUsia = usia.trim();
                      const targetGender = gender.trim();
                      const targetPool = baseActivePool.replace('-', ' ');
                      
                      return (
                        aSistem === 'POOL' &&
                        aJurus === targetJurus &&
                        aUsia === targetUsia &&
                        aGender === targetGender &&
                        (aPool === targetPool || targetPool.includes(aPool) || aPool.includes(targetPool) || getBasePoolLocal(aPool).toUpperCase() === targetPool)
                      );
                    });

                    filteredRegistered.forEach((a: any) => {
                      if (a.nama && a.nama !== '---') {
                        uniqueAthletes.set(a.nama.toUpperCase().trim(), { nama: a.nama, kontingen: a.kontingen });
                      }
                    });

                    // 2. Get from active match (matchState)
                    if (matchState.atlitBiru?.nama && matchState.atlitBiru?.nama !== '---') {
                      uniqueAthletes.set(matchState.atlitBiru.nama.toUpperCase().trim(), matchState.atlitBiru);
                    }
                    if (matchState.atlitMerah?.nama && matchState.atlitMerah?.nama !== '---') {
                      uniqueAthletes.set(matchState.atlitMerah.nama.toUpperCase().trim(), matchState.atlitMerah);
                    }

                    // 3. Get from completed match history (silat_scoring_match_history)
                    const rawHistory = typeof window !== 'undefined' ? localStorage.getItem('silat_scoring_match_history') : null;
                    const historyList: any[] = rawHistory ? JSON.parse(rawHistory) : [];
                    historyList.forEach(h => {
                      const hKategori = (h.kategoriSeni || h.kelas || '').toUpperCase().trim();
                      const hUsia = (h.kategoriUsia || '').toUpperCase().trim();
                      const hGender = (h.gender || '').toUpperCase().trim();
                      const hStage = (h.tahapPertandingan || '').toUpperCase().trim();
                      
                      const isPoolMatchHist = hStage.includes('POOL') || 
                                               (h.atlitMerah?.nama === '---' || h.atlitBiru?.nama === '---');
                                               
                      const baseHStage = getBasePoolLocal(hStage).toUpperCase();
                                               
                      if (
                        isPoolMatchHist &&
                        hKategori === kategori &&
                        hUsia === usia &&
                        hGender === gender &&
                        (baseHStage === baseActivePool || baseActivePool.includes(baseHStage) || baseHStage.includes(baseActivePool))
                      ) {
                        if (h.atlitBiru?.nama && h.atlitBiru?.nama !== '---') {
                          uniqueAthletes.set(h.atlitBiru.nama.toUpperCase().trim(), h.atlitBiru);
                        }
                        if (h.atlitMerah?.nama && h.atlitMerah?.nama !== '---') {
                          uniqueAthletes.set(h.atlitMerah.nama.toUpperCase().trim(), h.atlitMerah);
                        }
                      }
                    });

                    poolAthletesList = Array.from(uniqueAthletes.values());
                  } catch (e) {
                    console.error("Failed to load pool athletes in DewanPanel modal", e);
                  }

                  const findAthletePerformance = (athleteName: string) => {
                    const cleanName = athleteName.toUpperCase().trim();
                    
                    const isMerahCurrent = (matchState.atlitMerah?.nama || '').toUpperCase().trim() === cleanName;
                    const isBiruCurrent = (matchState.atlitBiru?.nama || '').toUpperCase().trim() === cleanName;
                    
                    if (isMerahCurrent || isBiruCurrent) {
                      const corner = isMerahCurrent ? 'MERAH' : 'BIRU';
                      const score = calculateFinalScore(corner, matchState);
                      const kebenaran = calculateSeniKebenaranScore(corner, matchState);
                      const hukuman = calculateSeniHukumanTotal(matchState.seniScores?.[corner]?.hukumanLog);
                      const durasiTampil = corner === 'MERAH' ? (matchState.durasiTampilMERAH || 0) : (matchState.durasiTampilBIRU || 0);
                      const pStdev = calculateSeniStandardDeviation(kategori, matchState.seniScores?.[corner], matchState.jumlahJuri || 10, corner);
                      const durasiBabak = matchState.durasiBabak || 180;
                      
                      const hasPerf = (matchState.statusPertandingan === 'SELESAI' || !!matchState.umumkanPemenang)
                        ? true
                        : (corner === 'MERAH' ? !!matchState.hasPerformedMERAH : !!matchState.hasPerformedBIRU);

                      return {
                        hasPerformed: hasPerf,
                        score,
                        kebenaran,
                        hukuman,
                        durasiTampil,
                        stdev: pStdev,
                        durasiBabak,
                        partai: matchState.partai || '',
                        corner,
                        record: matchState
                      };
                    }

                    try {
                      const rawHistory = typeof window !== 'undefined' ? localStorage.getItem('silat_scoring_match_history') : null;
                      const historyList: any[] = rawHistory ? JSON.parse(rawHistory) : [];
                      
                      let matchRecord = historyList.find(h => {
                        const hKategori = (h.kategoriSeni || h.kelas || '').toUpperCase().trim();
                        const hUsia = (h.kategoriUsia || '').toUpperCase().trim();
                        const hGender = (h.gender || '').toUpperCase().trim();
                        
                        const nameMerah = (h.atlitMerah?.nama || '').toUpperCase().trim();
                        const nameBiru = (h.atlitBiru?.nama || '').toUpperCase().trim();
                        
                        const nameMatches = nameMerah === cleanName || nameBiru === cleanName;
                        if (!nameMatches) return false;
                        
                        const hStage = (h.tahapPertandingan || '').toUpperCase().trim();
                        const baseHStage = getBasePoolLocal(hStage).toUpperCase();
                        
                        const stageMatches = hStage.includes('POOL') || 
                                             baseHStage === baseActivePool || 
                                             baseActivePool.includes(baseHStage) || 
                                             baseHStage.includes(baseActivePool);
                                             
                        return stageMatches && hKategori === kategori && hUsia === usia && hGender === gender;
                      });

                      if (!matchRecord) {
                        matchRecord = historyList.find(h => {
                          const nameMerah = (h.atlitMerah?.nama || '').toUpperCase().trim();
                          const nameBiru = (h.atlitBiru?.nama || '').toUpperCase().trim();
                          return nameMerah === cleanName || nameBiru === cleanName;
                        });
                      }
                      
                      if (matchRecord) {
                        const isMerah = (matchRecord.atlitMerah?.nama || '').toUpperCase().trim() === cleanName;
                        const corner = isMerah ? 'MERAH' : 'BIRU';
                        const score = corner === 'MERAH' ? matchRecord.skorAkhirMerah : matchRecord.skorAkhirBiru;
                        const kebenaran = calculateSeniKebenaranScore(corner, matchRecord as any);
                        const hukuman = calculateSeniHukumanTotal(matchRecord.seniScores?.[corner]?.hukumanLog);
                        const durasiTampil = corner === 'MERAH' ? (matchRecord.durasiTampilMERAH || 0) : (matchRecord.durasiTampilBIRU || 0);
                        const pStdev = calculateSeniStandardDeviation(kategori, matchRecord.seniScores?.[corner], matchRecord.jumlahJuri || 10, corner);
                        const durasiBabak = matchRecord.durasiBabak || 180;
                        
                        return {
                          hasPerformed: true,
                          score,
                          kebenaran,
                          hukuman,
                          durasiTampil,
                          stdev: pStdev,
                          durasiBabak,
                          partai: matchRecord.partai,
                          corner,
                          record: matchRecord
                        };
                      }
                    } catch (e) {
                      console.error("Error loading performance from history", e);
                    }
                    
                    return {
                      hasPerformed: false,
                      score: 0,
                      kebenaran: 0,
                      hukuman: 0,
                      durasiTampil: 0,
                      stdev: 0,
                      durasiBabak: 180,
                      partai: '',
                      corner: null,
                      record: null
                    };
                  };

                  const rankedAthletes = poolAthletesList.map(ath => {
                    const perf = findAthletePerformance(ath.nama);
                    return {
                      nama: ath.nama,
                      kontingen: ath.kontingen,
                      ...perf
                    };
                  });

                  const sortedRankedAthletes = [...rankedAthletes].sort((a, b) => {
                    if (!a.hasPerformed && b.hasPerformed) return 1;
                    if (a.hasPerformed && !b.hasPerformed) return -1;
                    if (!a.hasPerformed && !b.hasPerformed) return 0;
                    
                    if (b.score !== a.score) {
                      return b.score - a.score;
                    }
                    
                    if (b.kebenaran !== a.kebenaran) {
                      return b.kebenaran - a.kebenaran;
                    }
                    
                    if (a.hukuman !== b.hukuman) {
                      return a.hukuman - b.hukuman;
                    }
                    
                    const targetA = a.durasiBabak || 180;
                    const diffA = Math.abs(a.durasiTampil - targetA);
                    const diffB = Math.abs(b.durasiTampil - targetA);
                    if (diffA !== diffB) {
                      return diffA - diffB;
                    }
                    
                    if (a.stdev !== b.stdev) {
                      return a.stdev - b.stdev;
                    }
                    
                    return 0;
                  });

                  let cRank = 1;
                  const finalLeaderboard = sortedRankedAthletes.map((ath, idx, arr) => {
                    if (idx > 0) {
                      const prev = arr[idx - 1];
                      const isPerfectTie = 
                        prev.hasPerformed === ath.hasPerformed &&
                        prev.score === ath.score &&
                        prev.kebenaran === ath.kebenaran &&
                        prev.hukuman === ath.hukuman &&
                        Math.abs(prev.durasiTampil - (prev.durasiBabak || 180)) === Math.abs(ath.durasiTampil - (ath.durasiBabak || 180)) &&
                        prev.stdev === ath.stdev;
                      
                      if (!isPerfectTie) {
                        cRank = idx + 1;
                      }
                    }
                    return {
                      ...ath,
                      rank: cRank
                    };
                  });

                  const top3 = finalLeaderboard.slice(0, 3);

                  return (
                    <div className="space-y-2.5 w-full">
                      <div className="text-[10px] font-mono tracking-wider text-purple-300 font-extrabold uppercase">
                        {isPoolFullyCompleted
                          ? "🏆 DAFTAR PEMENANG POOL (STANDINGS) 🏆"
                          : "📊 KLASEMEN SEMENTARA POOL (STANDINGS) 📊"
                        }
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {top3.length === 0 ? (
                          <div className="col-span-3 p-4 bg-purple-950/20 rounded-xl border border-purple-900/40 text-slate-400 text-xs font-mono">
                            Belum ada atlit yang tampil di pool ini.
                          </div>
                        ) : (
                          top3.map((ath, idx) => {
                            const isJuara1 = ath.rank === 1 && ath.hasPerformed;
                            const isJuara2 = ath.rank === 2 && ath.hasPerformed;
                            const isJuara3 = ath.rank === 3 && ath.hasPerformed;

                            let medalLabel = `JUARA ${ath.rank}`;
                            let badgeStyle = "bg-purple-900/60 border-purple-700/50 text-purple-200";
                            let cardStyle = "bg-[#0c051a]/90 border-purple-950/40 shadow-sm";
                            
                            if (isJuara1) {
                              medalLabel = "🏆 JUARA 1 (EMAS)";
                              badgeStyle = "bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black border-yellow-400";
                              cardStyle = "bg-gradient-to-br from-yellow-950/30 via-amber-950/20 to-[#0e041d] border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)]";
                            } else if (isJuara2) {
                              medalLabel = "🥈 JUARA 2 (PERAK)";
                              badgeStyle = "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 font-black border-slate-200";
                              cardStyle = "bg-gradient-to-br from-slate-950/30 via-zinc-950/20 to-[#0e041d] border-slate-400/40 shadow-[0_0_10px_rgba(148,163,184,0.1)]";
                            } else if (isJuara3) {
                              medalLabel = "🥉 JUARA 3 (PERUNGGU)";
                              badgeStyle = "bg-gradient-to-r from-amber-600 to-amber-800 text-white font-black border-amber-500";
                              cardStyle = "bg-gradient-to-br from-amber-950/30 via-stone-950/20 to-[#0e041d] border-amber-600/40 shadow-[0_0_10px_rgba(217,119,6,0.1)]";
                            }

                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border transition-all duration-300 flex flex-col justify-between text-left h-28 ${cardStyle}`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 justify-between">
                                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                                      {medalLabel}
                                    </span>
                                    {!ath.hasPerformed && (
                                      <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[8px] font-mono px-1 py-0.5 rounded">
                                        BELUM
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-sm font-black text-white uppercase tracking-tight line-clamp-1">
                                    {ath.nama}
                                  </h4>
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase truncate">
                                    {ath.kontingen}
                                  </p>
                                </div>
                                <div className="flex justify-between items-center pt-1.5 border-t border-purple-950/50 mt-1">
                                  <span className="text-[9px] font-mono text-purple-400 uppercase font-bold">SKOR</span>
                                  <span className="text-sm font-black font-mono text-cyan-300">
                                    {ath.hasPerformed ? ath.score.toFixed(3) : "0.000"}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 w-full">
                    <div
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        activeWinner === "MERAH"
                          ? "bg-red-950/80 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                          : activeWinner === "BIRU"
                            ? "bg-blue-950/80 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
                            : "bg-[#0a0315] border-purple-950"
                      }`}
                    >
                      {activeWinner === "MERAH" ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-1">
                            <span className="bg-red-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider shadow-sm">
                              PEMENANG: SUDUT MERAH
                            </span>
                            {tbRes.ruleApplied > 0 && (
                              <span className="bg-red-500/20 text-red-200 border border-red-500/30 font-bold text-[9px] px-2 py-0.5 rounded font-mono tracking-wider uppercase">
                                {tbRes.reason}
                              </span>
                            )}
                          </div>
                          <h4 className="text-2xl font-black text-white uppercase mt-1">
                            {matchState?.atlitMerah?.nama || "ATLIT MERAH"}
                          </h4>
                          <p className="text-xs font-bold mt-0.5 text-red-400 uppercase">
                            {matchState?.atlitMerah?.kontingen || ""}
                          </p>
                        </div>
                      ) : activeWinner === "BIRU" ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-1">
                            <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider shadow-sm">
                              PEMENANG: SUDUT BIRU
                            </span>
                            {tbRes.ruleApplied > 0 && (
                              <span className="bg-blue-500/20 text-blue-200 border border-blue-500/30 font-bold text-[9px] px-2 py-0.5 rounded font-mono tracking-wider uppercase">
                                {tbRes.reason}
                              </span>
                            )}
                          </div>
                          <h4 className="text-2xl font-black text-white uppercase mt-1">
                            {matchState?.atlitBiru?.nama || "ATLIT BIRU"}
                          </h4>
                          <p className="text-xs font-bold mt-0.5 text-blue-400 uppercase">
                            {matchState?.atlitBiru?.kontingen || ""}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <h4 className="text-lg font-black text-white uppercase">
                            DRAW / SERI (SAMA SELESAI SYARAT 1-4)
                          </h4>
                          {isSeniMatch && (
                            <div className="text-center p-3 bg-[#1c0f30]/80 border border-amber-500/30 rounded-xl space-y-1">
                              <span className="text-amber-400 font-mono text-[10px] uppercase font-extrabold tracking-widest block animate-pulse">
                                ⚠️ AKAN DILAKUKAN UNDIAN OLEH KP/DEWAN/JURI/PELATIH
                              </span>
                              <p className="text-[10px] text-amber-200 leading-relaxed px-2">
                                Skor akhir dan seluruh kriteria tie-breaker
                                (Nilai Kebenaran, Nilai Hukuman, Waktu/Durasi Tampil, Standar Deviasi) bernilai sama kuat.
                                Berdasarkan aturan resmi, penetapan pemenang dilakukan dengan cara undian. Hasil resmi otomatis diterbitkan saat tombol UMUMKAN HASIL PERTANDINGAN ditekan.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ACTION BUTTONS FOR DEWAN */}
              <div className="border border-purple-500/20 bg-purple-950/25 p-4 rounded-xl flex flex-col items-center gap-2 text-center">
                <span className="text-[10px] font-extrabold tracking-widest text-purple-400 font-mono block uppercase">
                  📢 PUBLISH HASIL PERTANDINGAN
                </span>
                {matchState.umumkanPemenang ? (
                  <div className="w-full py-3 px-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> REKAP & HASIL DIUMUMKAN
                    DI SEMUA LAYAR
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      playClickSound();
                      try {
                        playBuzzer();
                      } catch (e) {}
                      
                      const currentWinner = matchState.pemenang !== undefined && matchState.pemenang !== null ? matchState.pemenang : evaluateTieBreak(matchState).winner;

                      saveState({
                        ...matchState,
                        pemenang: currentWinner,
                        umumkanPemenang: true,
                        juriTerkunci: true,
                        version: Date.now(),
                      });
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl border border-purple-400/30 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer"
                  >
                    <Award className="w-4 h-4 animate-bounce" /> UMUMKAN HASIL
                    PERTANDINGAN
                  </button>
                )}
                <p className="text-[9px] text-zinc-400 font-sans">
                  Pilih tombol di atas untuk mempublikasikan keputusan final
                  Pemenang ke Layar Monitor Utama dan Panel Juri.
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
