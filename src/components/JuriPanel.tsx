/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MatchState } from '../types';
import { Users, AlertCircle, HelpCircle, Trophy, CheckCircle2, Maximize2, Minimize2, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { playClickSound } from '../sound';
import { useJuriStatuses } from '../hooks/useJuriStatuses';
import { saveMatchState, calculateSeniScoreForJuri } from '../appState';

const calculateJuriRawHits = (
  state: MatchState,
  juriId: number | null,
  sudut: 'MERAH' | 'BIRU',
  babak: number
): number => {
  if (!juriId || !state.rawScores) return 0;
  return state.rawScores.filter(
    (score) =>
      score.juriId === juriId &&
      score.sudut === sudut &&
      score.babak === babak
  ).length;
};

const getMaxRounds = (kategoriUsia?: string): number => {
  const norm = (kategoriUsia || '').toUpperCase().trim();
  const isTwoRounds = [
    "PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER 2", "MASTER A", "MASTER B"
  ].includes(norm);
  return isTwoRounds ? 2 : 3;
};

interface JuriPanelProps {
  matchState: MatchState;
  registerJuriPress: (juriId: 1 | 2 | 3, action: string, corner: 'MERAH' | 'BIRU') => void;
  selectJuriVerificationVote: (juriId: 1 | 2 | 3, vote: 'MERAH' | 'BIRU' | 'TIDAK_SAH') => void;
  onBackToLanding?: () => void;
  updateMatchState?: (newState: MatchState) => void;
  presetJuriId?: 1 | 2 | 3 | null;
  onDeleteRawClick?: (corner: 'MERAH' | 'BIRU') => void;
}

export const JuriPanel: React.FC<JuriPanelProps> = ({
  matchState,
  registerJuriPress,
  selectJuriVerificationVote,
  onBackToLanding,
  updateMatchState,
  presetJuriId,
  onDeleteRawClick,
}) => {
  const [selectedJuriId, setSelectedJuriId] = useState<1 | 2 | 3 | null>(presetJuriId || null);
  const [juriSeniCorner, setJuriSeniCorner] = useState<'MERAH' | 'BIRU'>('BIRU');
  const [juriSeniMove, setJuriSeniMove] = useState<Record<'MERAH' | 'BIRU', number>>({ MERAH: 0, BIRU: 0 });
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [hasDeclinedConfirm, setHasDeclinedConfirm] = useState(false);
  const juriStatuses = useJuriStatuses();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Local states for sliders in GANDA & TUNGGAL BEBAS to prevent jumping during dragging on mobile/HP
  const [localTeknik, setLocalTeknik] = useState<number | null>(null);
  const [localKemantapan, setLocalKemantapan] = useState<number | null>(null);
  const [localPenjiwaan, setLocalPenjiwaan] = useState<number | null>(null);

  // Sync effect to reset local slider states when jury corner, id, category, or match state resets
  useEffect(() => {
    setLocalTeknik(null);
    setLocalKemantapan(null);
    setLocalPenjiwaan(null);
  }, [juriSeniCorner, selectedJuriId, matchState.kelas, matchState.kategoriSeni, matchState.partai, matchState.babakAktif]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('silat_sound_enabled') !== 'false';
  });

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('silat_sound_enabled', String(newVal));
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    const syncSound = () => {
      setSoundEnabled(localStorage.getItem('silat_sound_enabled') !== 'false');
    };
    window.addEventListener('storage', syncSound);
    return () => window.removeEventListener('storage', syncSound);
  }, []);

  // Track fullscreen changes to sync buttons across pages (with vendor prefix compatibility)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Synchronize active corner with Secretary panel direction
  useEffect(() => {
    if (matchState?.activeCorner) {
      setJuriSeniCorner(matchState.activeCorner);
    }
  }, [matchState?.activeCorner]);

  const toggleFullscreen = () => {
    playClickSound();
    
    const doc = document as any;
    const docEl = document.documentElement as any;
    
    const isFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFull) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err: any) => {
          console.error('Error enabling fullscreen:', err);
        });
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.webkitRequestFullScreen) {
        docEl.webkitRequestFullScreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch((err: any) => {
          console.error('Error exiting fullscreen:', err);
        });
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.webkitCancelFullScreen) {
        doc.webkitCancelFullScreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };

  // Handle automatic online status heartbeats when a Juri selects their ID
  useEffect(() => {
    if (!selectedJuriId) return;

    const channel = new BroadcastChannel('silat_juri_pulse');

    const sendHeartbeat = () => {
      try {
        const raw = localStorage.getItem('silat_juri_heartbeats');
        const heartbeats = raw ? JSON.parse(raw) : {};
        heartbeats[selectedJuriId] = Date.now();
        localStorage.setItem('silat_juri_heartbeats', JSON.stringify(heartbeats));
        
        // Notify the Central Express Server so remote devices (PC) can register this Juri's connection
        fetch('/api/juri/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ juriId: selectedJuriId }),
        }).catch((err) => {
          // Fail silently if offline or standalone
        });

        window.dispatchEvent(new Event('storage_juri_heartbeat'));
        channel.postMessage('heartbeat_updated');
      } catch (e) {
        console.error('Error sending heartbeat:', e);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 1500);

    // Listen to force sync probes from Secretary
    channel.onmessage = (event) => {
      if (event.data === 'probe_request') {
        sendHeartbeat();
      }
    };

    return () => {
      clearInterval(interval);
      channel.close();
      try {
        const raw = localStorage.getItem('silat_juri_heartbeats');
        if (raw) {
          const heartbeats = JSON.parse(raw);
          delete heartbeats[selectedJuriId];
          localStorage.setItem('silat_juri_heartbeats', JSON.stringify(heartbeats));
          window.dispatchEvent(new Event('storage_juri_heartbeat'));
          
          const channelClose = new BroadcastChannel('silat_juri_pulse');
          channelClose.postMessage('heartbeat_updated');
          channelClose.close();
        }
      } catch (e) {}
    };
  }, [selectedJuriId]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If juri ID is not selected yet, show selection screen
  if (!selectedJuriId) {
    return (
      <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-[#03060f] text-slate-100 relative overflow-y-auto">
        
        {/* Floating Top Right Full Screen Controls */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3.5 py-2 bg-[#0a0f1d] hover:bg-[#121b2d] border border-blue-950/50 rounded-xl text-xs font-black text-[#fafafa] hover:text-white transition-all cursor-pointer active:scale-95 shadow-xl select-none"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
          {isFullscreen ? 'LAYAR NORMAL' : 'LAYAR PENUH'}
        </button>

        <div className="w-full max-w-md bg-[#0a0f1d] border border-blue-950/40 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
          
          <div className="inline-flex p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white">PILIH IDENTITAS JURI</h2>
          <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed">
            Pilihlah panel Juri sesuai dengan penomoran tempat duduk Anda di sisi gelanggang untuk menyinkronkan data ketukan secara sah.
          </p>

          <div className={`grid gap-3 mb-6 ${
            (matchState.jumlahJuri || 3) > 3 
              ? 'grid-cols-2 sm:grid-cols-3' 
              : 'grid-cols-3'
          }`}>
            {Array.from({ length: matchState.jumlahJuri || 3 }, (_, i) => i + 1).map((id) => {
              const isActive = matchState.activeJuriIds?.includes(id);
              const isOnline = juriStatuses[id as 1 | 2 | 3] || isActive;
              return (
                <button
                  key={id}
                  id={`juri-select-btn-${id}`}
                  disabled={isActive}
                  onClick={() => {
                    playClickSound();
                    setSelectedJuriId(id as 1 | 2 | 3);
                    
                    const currentActive = matchState.activeJuriIds || [];
                    if (!currentActive.includes(id)) {
                      const updatedActive = [...currentActive, id];
                      if (updateMatchState) {
                        updateMatchState({
                          ...matchState,
                          activeJuriIds: updatedActive
                        });
                      }
                    }
                  }}
                  className={`py-4 border rounded-2xl font-black text-xl shadow-md transition-all duration-75 flex flex-col items-center justify-center ${
                    isActive
                      ? 'bg-slate-950/40 border-slate-900 text-slate-500 cursor-not-allowed opacity-55'
                      : isOnline 
                        ? 'bg-emerald-950/10 border-emerald-500 text-white hover:border-emerald-400 cursor-pointer active:scale-95' 
                        : 'bg-[#050914] border-slate-800 hover:bg-[#121b2d] hover:border-blue-500 text-white cursor-pointer active:scale-95'
                  }`}
                >
                  <span className={isActive ? 'line-through text-slate-500' : 'text-white'}>JURI {id}</span>
                  <span className={`text-[9px] font-black uppercase mt-2 px-2 py-0.5 rounded tracking-wider ${
                    isActive 
                      ? 'bg-red-900/30 text-red-500 animate-pulse border border-red-500/20'
                      : isOnline 
                        ? 'bg-emerald-500 text-slate-950 animate-pulse' 
                        : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isActive ? '● TERKUNCI' : isOnline ? '● ONLINE' : '● LOGOUT'}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              playClickSound();
              if (updateMatchState) {
                updateMatchState({
                  ...matchState,
                  activeJuriIds: []
                });
              }
            }}
            className="w-full mb-4 py-2.5 text-xs bg-red-950/30 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-xl transition-all font-bold cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            RESET KUNCI SEMUA JURI
          </button>

          <button
            onClick={() => {
              playClickSound();
              if (selectedJuriId) {
                const currentActive = matchState.activeJuriIds || [];
                const updatedActive = currentActive.filter(id => id !== selectedJuriId);
                if (updateMatchState) {
                  updateMatchState({
                    ...matchState,
                    activeJuriIds: updatedActive
                  });
                }
              }
              if (onBackToLanding) onBackToLanding();
            }}
            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-4 cursor-pointer font-bold"
          >
            Kembali ke Beranda Utama
          </button>
        </div>
      </div>
    );
  }

  const myRawHitsMerah = (babak: number) => calculateJuriRawHits(matchState, selectedJuriId, 'MERAH', babak);
  const myRawHitsBiru = (babak: number) => calculateJuriRawHits(matchState, selectedJuriId, 'BIRU', babak);

  const waktuTersisa = typeof matchState.sisaWaktu === 'number' ? matchState.sisaWaktu : ((matchState as any).waktuTersisa ?? 180);
  const timerRunning = typeof matchState.timerBerjalan === 'boolean' ? matchState.timerBerjalan : ((matchState as any).timerRunning ?? false);
  const durasiBabak = typeof matchState.durasiBabak === 'number' ? matchState.durasiBabak : ((matchState as any).settings?.durasiBabak ?? 180);

  const isSeniCategory = ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kelas) || ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kategoriSeni || '');
  const isTunggalOrRegu = isSeniCategory && (matchState.kelas === 'TUNGGAL' || matchState.kelas === 'REGU' || matchState.kategoriSeni === 'TUNGGAL' || matchState.kategoriSeni === 'REGU');

  const isUnlocked = matchState.statusPertandingan === 'BERJALAN';

  const isRoundOver = !isSeniCategory && (waktuTersisa <= 0);
  const isMatchOver = !isSeniCategory && isRoundOver && matchState.babakAktif === getMaxRounds(matchState.kategoriUsia);
  
  // Checking if there is an active Verification process, and if this Juri hasn't voted yet
  const activeVerification = matchState.verificationRequest;
  const hasVotedForVerification = activeVerification ? activeVerification.votes[selectedJuriId] !== null : false;

  const handleAction = (corner: 'MERAH' | 'BIRU', action: string) => {
    // Cannot register anything if match is not unlocked or babak completed
    if (!isUnlocked || isRoundOver) return;
    registerJuriPress(selectedJuriId, action, corner);
  };

  const activeJuriScore = (() => {
    const defaultScore = {
      juriId: selectedJuriId || 1,
      kebenaran: 100,
      teknikSerangBela: 50,
      teknikSenjataKoreografi: 50,
      kemantapan: 50,
      salahGerakCount: 0,
      salahSenjataCount: 0,
      suaraCount: 0,
      keluarGelanggangCount: 0,
      pakaianAksesorisCount: 0
    };
    if (!matchState.seniScores) return defaultScore;
    const cornerScores = matchState.seniScores[juriSeniCorner];
    if (!cornerScores) return defaultScore;
    return cornerScores.juriScores[selectedJuriId || 1] || defaultScore;
  })();
  
  const rawTeknik = matchState.kategoriSeni === 'GANDA' ? activeJuriScore.teknikSerangBela : activeJuriScore.teknikSenjataKoreografi;
  const displayTeknik = (rawTeknik !== undefined && rawTeknik !== 50 && rawTeknik >= 0.01 && rawTeknik <= 0.30) ? rawTeknik : 0.00;

  const rawKemantapan = activeJuriScore.kemantapan;
  const displayKemantapan = (rawKemantapan !== undefined && rawKemantapan !== 50 && rawKemantapan >= 0.01 && rawKemantapan <= 0.30) ? rawKemantapan : 0.00;

  const rawPenjiwaan = activeJuriScore.penjiwaan;
  const displayPenjiwaan = (rawPenjiwaan !== undefined && rawPenjiwaan !== 50 && rawPenjiwaan >= 0.01 && rawPenjiwaan <= 0.30) ? rawPenjiwaan : 0.00;

  const currentTeknik = localTeknik !== null ? localTeknik : displayTeknik;
  const currentKemantapan = localKemantapan !== null ? localKemantapan : displayKemantapan;
  const currentPenjiwaan = localPenjiwaan !== null ? localPenjiwaan : displayPenjiwaan;

  const isWrongMoveBtnEnabled = isUnlocked && activeJuriScore.isReady && !activeJuriScore.isLocked;

  const isGandaTunggalBebasLocked = 
    activeJuriScore.isLocked ||
    timerRunning ||
    waktuTersisa === durasiBabak;

  // Reset decline state when corner, juri, or active babak changes
  useEffect(() => {
    setHasDeclinedConfirm(false);
  }, [juriSeniCorner, selectedJuriId, matchState.babakAktif]);

  // Auto show confirmation when 3 buttons are active for GANDA & TUNGGAL BEBAS
  useEffect(() => {
    const isGandaOrTunggalBebas = matchState.kategoriSeni === 'GANDA' || matchState.kategoriSeni === 'SOLO_KREATIF';
    if (!isGandaOrTunggalBebas) return;

    if (displayTeknik > 0 && displayKemantapan > 0 && displayPenjiwaan > 0) {
      if (!hasDeclinedConfirm && !activeJuriScore.isLocked && !showFinishConfirm) {
        setShowFinishConfirm(true);
      }
    }
  }, [displayTeknik, displayKemantapan, displayPenjiwaan, hasDeclinedConfirm, activeJuriScore.isLocked, showFinishConfirm, matchState.kategoriSeni]);

  const updateSeniScoreValue = (field: string, val: number) => {
    if (!isUnlocked) return;
    const currentJuri = selectedJuriId || 1;
    const updatedSeniScores = { ...matchState.seniScores };
    const updatedCornerState = { ...updatedSeniScores[juriSeniCorner] };
    const updatedJuriScores = { ...updatedCornerState.juriScores };
    
    updatedJuriScores[currentJuri] = {
      ...updatedJuriScores[currentJuri],
      [field]: val
    };
    
    updatedCornerState.juriScores = updatedJuriScores;
    updatedSeniScores[juriSeniCorner] = updatedCornerState;
    
    const nextState: MatchState = {
      ...matchState,
      seniScores: updatedSeniScores,
      version: Date.now()
    };

    if (updateMatchState) {
      updateMatchState(nextState);
    } else {
      saveMatchState(nextState);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('silat_state_updated_internally'));
    }
  };

  const handleWrongMoveClick = () => {
    playClickSound();
    const nextSalahGerakCount = (activeJuriScore.salahGerakCount || 0) + 1;
    const nextKebenaran = Math.max(0, activeJuriScore.kebenaran - 1);
    
    const currentJuri = selectedJuriId || 1;
    const updatedSeniScores = { ...matchState.seniScores };
    const updatedCornerState = { ...updatedSeniScores[juriSeniCorner] };
    const updatedJuriScores = { ...updatedCornerState.juriScores };
    
    updatedJuriScores[currentJuri] = {
      ...updatedJuriScores[currentJuri],
      salahGerakCount: nextSalahGerakCount,
      kebenaran: nextKebenaran
    };
    
    updatedCornerState.juriScores = updatedJuriScores;
    updatedSeniScores[juriSeniCorner] = updatedCornerState;
    
    const nextState: MatchState = {
      ...matchState,
      seniScores: updatedSeniScores,
      version: Date.now()
    };

    if (updateMatchState) {
      updateMatchState(nextState);
    } else {
      saveMatchState(nextState);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('silat_state_updated_internally'));
    }
  };

  const handleBackspaceClick = () => {
    playClickSound();
    const nextSalahGerakCount = Math.max(0, (activeJuriScore.salahGerakCount || 0) - 1);
    const nextKebenaran = Math.min(100, activeJuriScore.kebenaran + 1);
    
    const currentJuri = selectedJuriId || 1;
    const updatedSeniScores = { ...matchState.seniScores };
    const updatedCornerState = { ...updatedSeniScores[juriSeniCorner] };
    const updatedJuriScores = { ...updatedCornerState.juriScores };
    
    updatedJuriScores[currentJuri] = {
      ...updatedJuriScores[currentJuri],
      salahGerakCount: nextSalahGerakCount,
      kebenaran: nextKebenaran
    };
    
    updatedCornerState.juriScores = updatedJuriScores;
    updatedSeniScores[juriSeniCorner] = updatedCornerState;
    
    const nextState: MatchState = {
      ...matchState,
      seniScores: updatedSeniScores,
      version: Date.now()
    };

    if (updateMatchState) {
      updateMatchState(nextState);
    } else {
      saveMatchState(nextState);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('silat_state_updated_internally'));
    }
  };

  const updateJuriReadyStatus = (isReady: boolean, isLocked: boolean) => {
    const currentJuri = selectedJuriId || 1;
    const updatedSeniScores = { ...matchState.seniScores };
    const updatedCornerState = { ...updatedSeniScores[juriSeniCorner] };
    const updatedJuriScores = { ...updatedCornerState.juriScores };
    
    updatedJuriScores[currentJuri] = {
      ...updatedJuriScores[currentJuri],
      isReady,
      isLocked
    };
    
    updatedCornerState.juriScores = updatedJuriScores;
    updatedSeniScores[juriSeniCorner] = updatedCornerState;
    
    const nextState: MatchState = {
      ...matchState,
      seniScores: updatedSeniScores,
      version: Date.now()
    };

    if (updateMatchState) {
      updateMatchState(nextState);
    } else {
      saveMatchState(nextState);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('silat_state_updated_internally'));
    }
  };

  const handleReadyOrFinishClick = () => {
    playClickSound();
    if (!activeJuriScore.isReady) {
      updateJuriReadyStatus(true, false);
    } else {
      setShowFinishConfirm(true);
    }
  };

  const isStaminaRated = activeJuriScore.kemantapan >= 1 && activeJuriScore.kemantapan <= 10;
  const selectedStaminaValue = isStaminaRated ? activeJuriScore.kemantapan : 0;
  const showStaminaDisplay = isStaminaRated ? (activeJuriScore.kemantapan / 100) : 0;

  const displayAccuracyVal = Math.max(0, 9.90 - ((100 - activeJuriScore.kebenaran) * 0.01));
  const displayTotalSeniVal = displayAccuracyVal + showStaminaDisplay;

  const athleteBiruNama = matchState.biru?.atlit?.nama || matchState.atlitBiru?.nama || 'ATLIT BIRU';
  const athleteBiruKontingen = matchState.biru?.atlit?.kontingen || matchState.atlitBiru?.kontingen || '';
  const athleteMerahNama = matchState.merah?.atlit?.nama || matchState.atlitMerah?.nama || 'ATLIT MERAH';
  const athleteMerahKontingen = matchState.merah?.atlit?.kontingen || matchState.atlitMerah?.kontingen || '';

  const getSeniHeaderTitle = (move: number, isTunggal: boolean) => {
    if (isTunggal) {
      if (matchState.durasiBabak === 80) {
        return "JURUS TUNGGAL TANGAN KOSONG (JURUS 1 – 7)";
      }
      if (matchState.durasiBabak === 100) {
        return "JURUS TUNGGAL SENJATA (Jurus 8 – 14)";
      }
      if (matchState.durasiBabak === 180) {
        return "JURUS TUNGGAL FULL (JURUS 1 – 14)";
      }
      if (move <= 0) return "Tunggal Jurus 1 Tangan Kosong Movement 1";
      if (move <= 50) {
        const jurusNum = Math.min(7, Math.ceil(move / 7) || 1);
        return `Tunggal Jurus ${jurusNum} Tangan Kosong Movement ${move}`;
      } else if (move <= 75) {
        const weaponMove = move - 50;
        return `Tunggal Jurus 8 Golok Movement ${weaponMove}`;
      } else {
        const weaponMove = move - 75;
        return `Tunggal Jurus 9 Toya (Tongkat) Movement ${weaponMove}`;
      }
    } else {
      if (move <= 0) return "Regu Jurus Masal Movement 1";
      return `Regu Jurus Masal Movement ${move}`;
    }
  };

  return (
    <div className={`w-full ${isFullscreen ? 'h-screen h-[100dvh] overflow-hidden p-0.5 sm:p-1' : 'min-h-screen lg:h-screen lg:h-[100dvh] overflow-y-auto lg:overflow-hidden p-1 sm:p-2 md:p-4'} flex flex-col select-none relative transition-colors duration-300 bg-[#03060f] text-slate-100 font-sans`}>
      
      {/* HEADER SECTION (ONLY FOR DECK SELECTION OR COINCIDENCE MODE TANDING) */}
      {!isSeniCategory && (
        <header className="flex justify-between items-center border-b border-slate-900 pb-1 sm:pb-2 mb-1 sm:mb-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => {
                playClickSound();
                if (selectedJuriId) {
                  const currentActive = matchState.activeJuriIds || [];
                  const updatedActive = currentActive.filter(id => id !== selectedJuriId);
                  if (updateMatchState) {
                    updateMatchState({
                      ...matchState,
                      activeJuriIds: updatedActive
                    });
                  }
                }
                if (onBackToLanding) {
                  onBackToLanding();
                } else {
                  setSelectedJuriId(null);
                }
              }}
              className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-[#121b2d] hover:bg-[#18263c] text-[8px] sm:text-[10px] text-slate-200 rounded border border-blue-955 transition font-bold cursor-pointer select-none"
            >
              ← GANTI JURI
            </button>
            <div>
              <h1 className="text-[10px] sm:text-xs font-black tracking-wider text-blue-400 font-mono uppercase flex items-center gap-1 sm:gap-1.5">
                DECK {selectedJuriId}
                <span className="inline-flex items-center text-[7px] sm:text-[8px] font-black text-emerald-400 bg-emerald-950/20 px-1 py-0.5 rounded border border-emerald-500/20">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  ON
                </span>
              </h1>
              <p className="text-[8px] sm:text-[9px] text-slate-500 max-w-[90px] sm:max-w-[150px] md:max-w-xs truncate leading-none font-bold">
                {(matchState as any).settings?.eventName || matchState.eventName}
              </p>
            </div>
          </div>

          {/* MIDDLE TICKER */}
          <div className="flex items-center gap-1.5 sm:gap-3 bg-[#0a0f1d] border border-blue-955 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-inner font-mono">
            <div className="text-right">
              <span className="text-[7px] sm:text-[8px] text-slate-505 block uppercase font-bold">{matchState.sistemTanding === 'POOL' ? 'Tampil' : 'Partai'} {(matchState as any).settings?.partai || matchState.partai}</span>
              <span className="text-[8px] sm:text-[10px] font-black text-amber-505 block uppercase leading-none truncate max-w-[80px] sm:max-w-none">
                {(matchState as any).settings?.babakSeksi || matchState.tahapPertandingan} | {(matchState as any).settings?.kelasNomor || matchState.kelas}
              </span>
            </div>
            <div className="w-px h-4 sm:h-5 bg-slate-900"></div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className={`px-1 sm:px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black ${timerRunning ? 'bg-green-500 text-black animate-pulse' : 'bg-red-500/20 text-red-300'}`}>
                B{matchState.babakAktif}
              </span>
              <span className="text-xs sm:text-sm md:text-base font-black tracking-widest text-white leading-none">
                {formatTime(waktuTersisa)}
              </span>
            </div>
          </div>


        </header>
      )}
      {/* ATHLETE BAR & MAIN ASSESSMENT CORNER */}
      {isSeniCategory ? (
        <div className={`flex-1 flex flex-col bg-[#0a0f1d]/75 backdrop-blur-md text-slate-100 font-sans border border-blue-950/40 ${
          isFullscreen ? 'p-1.5 sm:p-2 rounded-xl gap-0.5 min-h-0' : 'lg:min-h-0 p-2 sm:p-4 rounded-2xl'
        } landscape:p-1.5 md:landscape:p-2 landscape:rounded-xl`}>
          {/* HEADER ROW INSIDE SCRIPT */}
          <div className={`flex justify-between items-center border-b border-slate-800 shrink-0 ${
            isFullscreen ? 'py-1 sm:py-[14px] md:py-[16px] mb-1 sm:mb-2.5 sm:landscape:py-1 md:landscape:py-1.5 sm:landscape:mb-1' : 'pb-2 mb-2'
          } landscape:pb-0.5 landscape:mb-0.5`}>
            {/* Top Left info */}
            <div className="flex flex-col text-left justify-center">
              <span className={`uppercase tracking-wider font-sans leading-none ${
                isFullscreen ? 'text-[9px] sm:text-xl md:text-2xl lg:text-3xl font-black text-slate-400 sm:landscape:text-[8px] md:landscape:text-[9px]' : 'text-[10px] sm:text-xs font-bold text-slate-400'
              } landscape:text-[8px]`}>
                {((juriSeniCorner === 'MERAH' ? athleteMerahKontingen : athleteBiruKontingen) || '').toUpperCase() || 'SINGAPORE'}
              </span>
              <span className={`font-black uppercase tracking-tight leading-none ${
                juriSeniCorner === 'MERAH' ? 'text-red-500' : 'text-blue-400'
              } ${isFullscreen ? 'text-sm sm:text-4xl md:text-5xl lg:text-6xl mt-0.5 sm:mt-3 sm:landscape:text-xs md:landscape:text-sm sm:landscape:mt-0.5' : 'text-sm sm:text-lg mt-0.5'} landscape:text-xs`}>
                {(juriSeniCorner === 'MERAH' ? athleteMerahNama : athleteBiruNama) || 'SHEIK ALAUDDIN'}
              </span>
            </div>

            {/* Top Center Pills Corner Switcher */}
            <div className={`flex bg-slate-900 border border-slate-800 items-center justify-center transition-all duration-150 landscape:p-0.5 ${
              isFullscreen ? 'p-0.5 sm:p-1.5 rounded-lg sm:rounded-xl gap-1 sm:gap-3.5 relative sm:-translate-y-3 md:-translate-y-4 sm:landscape:translate-y-0 md:landscape:translate-y-0 shadow-lg' : 'p-1 rounded-lg gap-1 scale-95 landscape:scale-80'
            }`}>
              <button
                type="button"
                disabled={matchState?.activeCorner === 'MERAH'}
                onClick={() => { playClickSound(); setJuriSeniCorner('BIRU'); }}
                className={`font-black tracking-wide transition-all duration-150 rounded ${
                  isFullscreen 
                    ? 'px-3 sm:px-16 md:px-20 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-base md:text-lg border border-blue-400/20 sm:landscape:px-4 sm:landscape:py-0.5 sm:landscape:text-[8px] md:landscape:px-6 md:landscape:py-1 md:landscape:text-[9px]' 
                    : 'px-4 py-1.5 text-[10px] landscape:py-0.5 landscape:px-2 landscape:text-[8px]'
                } ${
                  matchState?.activeCorner === 'MERAH'
                    ? 'text-slate-600 bg-slate-950 cursor-not-allowed opacity-30 line-through'
                    : juriSeniCorner === 'BIRU'
                      ? 'bg-blue-600 text-white shadow-md cursor-pointer'
                      : 'text-slate-400 hover:text-slate-200 cursor-pointer'
                }`}
              >
                BIRU
              </button>
              <button
                type="button"
                disabled={matchState?.activeCorner === 'BIRU'}
                onClick={() => { playClickSound(); setJuriSeniCorner('MERAH'); }}
                className={`font-black tracking-wide transition-all duration-150 rounded ${
                  isFullscreen 
                    ? 'px-3 sm:px-16 md:px-20 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-base md:text-lg border border-red-400/20 sm:landscape:px-4 sm:landscape:py-0.5 sm:landscape:text-[8px] md:landscape:px-6 md:landscape:py-1 md:landscape:text-[9px]' 
                    : 'px-4 py-1.5 text-[10px] landscape:py-0.5 landscape:px-2 landscape:text-[8px]'
                } ${
                  matchState?.activeCorner === 'BIRU'
                    ? 'text-slate-600 bg-slate-950 cursor-not-allowed opacity-30 line-through'
                    : juriSeniCorner === 'MERAH'
                      ? 'bg-red-600 text-white shadow-md cursor-pointer'
                      : 'text-slate-400 hover:text-slate-200 cursor-pointer'
                }`}
              >
                MERAH
              </button>
            </div>

            {/* Top Right info */}
            <div className="flex flex-col items-end justify-center text-right">
              <span className={`font-mono block leading-none ${
                isFullscreen ? 'text-[9px] sm:text-base md:text-lg lg:text-xl font-bold text-slate-400' : 'text-[10px] sm:text-xs font-bold text-slate-400'
              } landscape:text-[8px]`}>
                {(() => {
                  const gName = matchState.gelanggang || 'GELANGGANG 1';
                  const activePool = (typeof window !== 'undefined' ? localStorage.getItem('silat_bagan_pool') : 'NONE') || 'NONE';
                  if (activePool && activePool.toUpperCase() !== 'NONE') {
                    return `${gName} (${activePool.toUpperCase()})`;
                  }
                  return gName;
                })()}, {matchState.sistemTanding === 'POOL' ? 'Tampil' : 'Partai'} {(matchState as any).settings?.partai || matchState.partai || '2'}
              </span>
              <span className={`font-black text-amber-400 uppercase tracking-tight font-sans leading-none block ${
                isFullscreen ? 'text-xs sm:text-4xl md:text-5xl lg:text-6xl mt-0.5 sm:mt-3 sm:landscape:text-xs sm:landscape:mt-0.5 md:landscape:text-sm' : 'text-sm sm:text-lg mt-0.5'
              } landscape:text-xs`}>
                {matchState.kategoriSeni === 'TUNGGAL' ? 'TUNGGAL/SINGLE' : 
                 matchState.kategoriSeni === 'REGU' ? 'REGU/GROUP' :
                 matchState.kategoriSeni === 'GANDA' ? 'GANDA/DOUBLE' : 'TUNGGAL BEBAS'}
              </span>
            </div>
          </div>

          {/* DYNAMIC JURUS BANNER (GREY BAR) */}
          {isTunggalOrRegu ? (
            <div className={`w-full bg-slate-900/60 border-y border-slate-800 text-center select-none shadow-xs font-sans font-bold tracking-wide uppercase text-slate-200 ${
              isFullscreen ? 'py-1 sm:py-[22px] md:py-[26px] mb-1 sm:mb-3 text-[10px] sm:text-2xl md:text-3xl sm:landscape:py-0.5 sm:landscape:mb-0.5 sm:landscape:text-[9px] md:landscape:py-1 md:landscape:mb-1 md:landscape:text-[10px]' : 'py-1 sm:py-2 px-2 sm:px-4 mb-1 sm:mb-1.5 text-[10px] sm:text-xs md:text-sm'
            } landscape:py-0.5 landscape:px-2 landscape:text-[9px] landscape:mb-0.5`}>
              {getSeniHeaderTitle(juriSeniMove[juriSeniCorner] || 0, matchState.kategoriSeni === 'TUNGGAL')}
            </div>
          ) : (
            <div className={`w-full bg-slate-900/60 border-y border-slate-800 text-center select-none shadow-xs font-sans font-bold tracking-wide uppercase text-slate-200 ${
              isFullscreen ? 'py-1 sm:py-[22px] md:py-[26px] mb-1 sm:mb-3 text-[10px] sm:text-2xl md:text-3xl sm:landscape:py-0.5 sm:landscape:mb-0.5 sm:landscape:text-[9px] md:landscape:py-1 md:landscape:mb-1 md:landscape:text-[10px]' : 'py-1 sm:py-2 px-2 sm:px-4 mb-1 sm:mb-1.5 text-[10px] sm:text-xs md:text-sm'
            } landscape:py-0.5 landscape:px-2 landscape:text-[9px] landscape:mb-0.5`}>
              Penilaian Kategori {matchState.kategoriSeni === 'GANDA' ? 'GANDA / DOUBLE' : 'TUNGGAL BEBAS'}
            </div>
          )}

          {isTunggalOrRegu ? (
            <>
              {/* DYNAMIC SPIT COUNT BAR ("0" and "0" split horizontal box) */}
              <div className={`w-full grid grid-cols-2 bg-slate-900/60 border border-slate-700/60 rounded-xl overflow-hidden select-none text-center divide-x divide-slate-700/60 ${
                isFullscreen ? 'mb-1 sm:mb-4 sm:landscape:mb-0.5' : 'mb-1.5 sm:mb-2'
              } landscape:mb-0.5`}>
                <div className={`${isFullscreen ? 'py-2.5 sm:py-14 md:py-[72px] sm:landscape:py-0.5 md:landscape:py-0.5' : 'py-0.5 sm:py-1.5'} flex justify-center items-center landscape:py-0`}>
                  <span className={`font-black text-[#E05236] leading-none select-none drop-shadow-sm ${
                    isFullscreen ? 'text-2xl sm:text-6xl md:text-7xl lg:text-8xl sm:landscape:text-lg md:landscape:text-xl' : 'text-lg sm:text-2xl md:text-3xl'
                  } landscape:text-sm`}>
                    {activeJuriScore.salahGerakCount || 0}
                  </span>
                </div>
                <div className={`${isFullscreen ? 'py-2.5 sm:py-14 md:py-[72px] sm:landscape:py-0.5 md:landscape:py-0.5' : 'py-0.5 sm:py-1.5'} flex justify-center items-center bg-slate-950/30 landscape:py-0`}>
                  {activeJuriScore.isReady ? (
                    <span className={`font-black text-emerald-400 uppercase tracking-widest animate-pulse font-sans ${
                      isFullscreen ? 'text-[10px] sm:text-2xl md:text-3xl lg:text-4xl sm:landscape:text-[9px] md:landscape:text-[10px]' : 'text-xs sm:text-sm md:text-base'
                    } landscape:text-[9px]`}>
                      JURI ACTIVE
                    </span>
                  ) : (
                    <span className={`font-black text-rose-500 uppercase tracking-widest font-sans ${
                      isFullscreen ? 'text-[10px] sm:text-2xl md:text-3xl lg:text-4xl sm:landscape:text-[9px] md:landscape:text-[10px]' : 'text-xs sm:text-sm md:text-base'
                    } landscape:text-[9px]`}>
                      LOCKED
                    </span>
                  )}
                </div>
              </div>

              {/* CENTRE SCORE INPUT ZONE & checklist list */}
              <div className="flex-1 grid grid-cols-12 gap-0 border border-slate-700/60 bg-slate-900/40 select-none mb-1.5 sm:mb-3 items-stretch rounded-xl overflow-hidden shadow-sm min-h-0 landscape:mb-0.5 sm:landscape:mb-0.5">
                
                {/* WRONG MOVE BUTTON (RED SIDE) - Left Column */}
                <div className={`col-span-5 flex flex-col justify-center items-stretch bg-slate-900/20 select-none border-r border-slate-700/60 ${
                  isFullscreen ? 'p-1 sm:p-4 sm:landscape:p-0.5 md:landscape:p-0.5' : 'p-1.5 sm:p-3'
                } landscape:p-0.5`}>
                  <button
                    type="button"
                    id={`juri-wrong-move-btn`}
                    disabled={!isWrongMoveBtnEnabled}
                    onClick={handleWrongMoveClick}
                    className={`w-full bg-gradient-to-b from-[#e12d1b] to-[#a01a0d] hover:from-[#f54331] hover:to-[#be2718] disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-500 disabled:border-slate-800 disabled:cursor-not-allowed text-white font-black uppercase rounded-lg sm:rounded-xl md:rounded-2xl transition active:scale-[0.98] cursor-pointer flex items-center justify-center border border-white/10 select-none shadow-md text-center leading-none ${
                      isFullscreen 
                        ? 'flex-1 min-h-[50px] sm:min-h-[130px] md:min-h-[150px] sm:landscape:min-h-[28px] md:landscape:min-h-[32px] py-2 sm:py-6 sm:landscape:py-0.5 md:landscape:py-1 text-sm sm:text-2xl md:text-3xl lg:text-4xl sm:landscape:text-[10px] md:landscape:text-xs'
                        : 'flex-1 min-h-[50px] sm:min-h-[120px] md:min-h-[140px] py-2 sm:py-4 text-sm sm:text-2xl md:text-3xl'
                    } landscape:min-h-[26px] landscape:py-0.5 landscape:text-[10px] sm:landscape:text-xs md:landscape:text-sm`}
                  >
                    Wrong Move
                  </button>
                </div>

                {/* MOVEMENT DETAILS (MIDDLE COLUMN) */}
                <div className="col-span-2 bg-slate-900/60 p-1 sm:p-2 sm:landscape:p-0.5 flex flex-col justify-center items-center text-center select-none border-r border-slate-700/60 landscape:p-0.5">
                  <img
                    src="/logodiscorsgrid.svg"
                    alt="Logo Discors Grid"
                    className="max-h-[85%] max-w-[90%] object-contain pointer-events-none opacity-90 transition-all duration-150"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* READY / FINISH BUTTON - Right Column */}
                <div className={`col-span-5 flex flex-col justify-center items-stretch bg-slate-900/20 select-none ${
                  isFullscreen ? 'p-1 sm:p-4 sm:landscape:p-0.5 md:landscape:p-0.5' : 'p-1.5 sm:p-3'
                } landscape:p-0.5`}>
                  <button
                    type="button"
                    onClick={handleReadyOrFinishClick}
                    disabled={!isUnlocked}
                    className={`w-full text-white font-black uppercase rounded-lg sm:rounded-xl md:rounded-2xl transition active:scale-[0.98] cursor-pointer flex items-center justify-center border border-white/10 select-none shadow-md text-center leading-none ${
                      isFullscreen
                        ? 'flex-1 min-h-[50px] sm:min-h-[130px] md:min-h-[150px] sm:landscape:min-h-[28px] md:landscape:min-h-[32px] py-2 sm:py-6 sm:landscape:py-0.5 md:landscape:py-1 text-sm sm:text-2xl md:text-3xl lg:text-4xl sm:landscape:text-[10px] md:landscape:text-xs'
                        : 'flex-1 min-h-[50px] sm:min-h-[120px] md:min-h-[140px] py-2 sm:py-4 text-sm sm:text-2xl md:text-3xl'
                    } landscape:min-h-[26px] landscape:py-0.5 landscape:text-[10px] sm:landscape:text-xs md:landscape:text-sm ${
                      activeJuriScore.isReady
                        ? 'bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600'
                        : 'bg-gradient-to-b from-[#1b75bc] to-[#0d467a] hover:from-[#3192dc] hover:to-[#0f5494]'
                    }`}
                  >
                    {activeJuriScore.isReady ? 'FINISH' : 'READY'}
                  </button>
                </div>

              </div>

              {/* LOWER ROW TABLE (ACCURACY & STAMINA & TOTALS IN CRISP GRID STRUCTURE) */}
              <div className="w-full border border-slate-700/60 select-none font-sans text-slate-200 rounded-lg overflow-hidden shadow-sm bg-[#0a0f1d]/40 divide-y divide-slate-700/60 mb-0.5 sm:mb-1 landscape:mb-0.5 sm:landscape:mb-0.5">
                
                {/* ROW 1: ACCURACY DISPLAY CARD */}
                <div className={`grid grid-cols-12 items-stretch ${
                  isFullscreen ? 'min-h-[32px] sm:min-h-[56px] md:min-h-[64px] sm:landscape:min-h-[24px] md:landscape:min-h-[28px]' : 'min-h-[32px] sm:min-h-[44px]'
                } landscape:min-h-[22px]`}>
                  {/* Left Label cell */}
                  <div className={`col-span-10 bg-slate-900/20 uppercase font-black text-slate-400 flex items-center justify-center border-r border-slate-700/60 leading-none tracking-wider relative ${
                    isFullscreen ? 'px-3 py-1.5 sm:py-3.5 sm:landscape:py-1 md:landscape:py-1.5 text-[9px] sm:text-base sm:landscape:text-[9px] md:landscape:text-[10px]' : 'px-3 py-1.5 sm:py-2.5 text-[9px] sm:text-xs landscape:py-1 landscape:text-[8px]'
                  }`}>
                    {/* Yellow BACKSPACE button to revert last mistake */}
                    <button
                      type="button"
                      disabled={!activeJuriScore.salahGerakCount}
                      onClick={handleBackspaceClick}
                      className="absolute left-1 sm:left-2 sm:landscape:left-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 sm:landscape:px-1 sm:landscape:py-0.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-500/30 disabled:text-slate-500 disabled:border-slate-800 disabled:cursor-not-allowed text-slate-950 font-black text-[7px] sm:text-[10px] sm:landscape:text-[7px] rounded border border-yellow-600 transition active:scale-95 cursor-pointer flex items-center gap-0.5 sm:gap-1 shadow-md uppercase tracking-wider landscape:py-0.5 landscape:px-1.5 landscape:text-[7px]"
                      title="Backspace (Hapus Nilai Terakhir)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                      </svg>
                      BACKSPACE
                    </button>
                    <span>ACCURACY TOTAL SCORE</span>
                  </div>
                  {/* Right Score cell */}
                  <div className="col-span-2 flex items-center justify-center px-2 py-1.5 bg-slate-950 text-center font-bold landscape:py-0.5">
                    <span className={`font-black text-blue-400 tracking-tight ${
                      isFullscreen ? 'text-xs sm:text-2xl md:text-3xl sm:landscape:text-xs md:landscape:text-sm' : 'text-xs sm:text-xl md:text-2xl landscape:text-xs'
                    }`}>
                      {displayAccuracyVal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* ROW 2: FLOW OF MOVEMENT / STAMINA ROW (0.01 - 0.10 SELECTOR) */}
                <div className={`grid grid-cols-12 items-stretch ${isFullscreen ? 'min-h-[80px] sm:min-h-[170px] md:min-h-[210px] sm:landscape:min-h-[45px] md:landscape:min-h-[50px]' : 'min-h-[40px] sm:min-h-[80px]'} landscape:min-h-[40px]`}>
                  {/* Left Label and Buttons cell */}
                  <div className={`col-span-10 bg-slate-900/20 text-center uppercase font-black border-r border-slate-700/60 flex flex-col justify-center items-center ${
                    isFullscreen 
                      ? 'px-2 py-1 sm:px-6 sm:py-3 sm:landscape:py-1 sm:landscape:px-2 sm:landscape:gap-0.5 md:landscape:py-1 md:landscape:px-3 md:landscape:gap-1 gap-1 sm:gap-2 text-[9px] sm:text-base sm:landscape:text-[9px] md:landscape:text-[10px]' 
                      : 'px-2 py-1 sm:px-3 sm:py-3 gap-1 sm:gap-1.5 text-[9px] sm:text-xs leading-none landscape:py-1 landscape:px-1 landscape:gap-1'
                  }`}>
                    <span className={`tracking-wider ${isFullscreen ? 'text-[7.5px] sm:text-lg md:text-xl sm:landscape:text-[8px] md:landscape:text-[9px]' : 'text-[7.5px] sm:text-[11px] landscape:text-[8px]'}`}>
                      FLOW OF MOVEMENT / STAMINA <span className={`font-bold lowercase italic font-sans ${isFullscreen ? 'text-[6.5px] sm:text-sm sm:landscape:text-[6.5px] md:landscape:text-[7px]' : 'text-[6.5px] sm:text-[9.5px] text-slate-500 landscape:text-[6px]'}`}>(range score : 0.01 - 0.10)</span>
                    </span>
                    
                    {/* Large, comfortable button grid */}
                    <div className={`w-full grid grid-cols-5 sm:grid-cols-10 gap-0.5 sm:gap-1.5 sm:landscape:gap-0.5 md:landscape:gap-1 mt-1 sm:mt-1.5 sm:landscape:mt-0.5 transition-all duration-150 ${isFullscreen ? 'max-w-none' : 'max-w-3xl'} landscape:mt-1`}>
                      {Array.from({ length: 10 }, (_, i) => (i + 1) / 100).map((val) => {
                        const label = val.toFixed(2);
                        const isSelected = selectedStaminaValue === Math.round(val * 100);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              playClickSound();
                              updateSeniScoreValue('kemantapan', Math.round(val * 100));
                            }}
                            className={`rounded-sm sm:rounded font-black font-mono transition-all duration-75 border shadow-sm select-none cursor-pointer flex items-center justify-center active:scale-95 ${
                              isFullscreen
                                ? 'py-1 sm:py-[18px] md:py-[22px] px-1 sm:px-3 text-[8px] sm:text-xl md:text-2xl gap-1 shadow-md landscape:py-2 landscape:text-[10px] sm:landscape:text-sm sm:landscape:py-1 sm:landscape:px-2 sm:landscape:text-xs md:landscape:py-1 md:landscape:text-xs'
                                : 'py-1 sm:py-3 text-[8px] sm:text-xs md:text-sm landscape:py-0.5 landscape:text-[8px]'
                            } ${
                              isSelected
                                ? 'bg-gradient-to-b from-[#1b75bc] to-[#115082] text-white border-[#1b75bc] shadow-[0_0_15px_rgba(27,117,188,0.5)] scale-[1.05]'
                                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700/60 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Right Score cell */}
                  <div className="col-span-2 flex items-center justify-center px-2 py-1.5 bg-slate-950 text-center font-bold landscape:py-0.5">
                    <span className={`font-black text-blue-400 tracking-tight ${
                      isFullscreen ? 'text-xs sm:text-2xl md:text-3xl sm:landscape:text-xs md:landscape:text-sm' : 'text-xs sm:text-xl md:text-2xl landscape:text-xs'
                    }`}>
                      {showStaminaDisplay.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* ROW 3: FINAL TOTAL SCORE ACCUMULATED BY JURI */}
                <div className={`grid grid-cols-12 items-stretch bg-slate-900/60 ${
                  isFullscreen ? 'min-h-[24px] sm:min-h-[96px] md:min-h-[120px] landscape:min-h-[18px] sm:landscape:min-h-[22px] md:landscape:min-h-[26px]' : 'min-h-[32px] sm:min-h-[44px]'
                } landscape:min-h-[30px]`}>
                  {/* Left Label cell */}
                  <div className={`col-span-10 bg-slate-900/40 uppercase font-black text-amber-400 flex items-center justify-center border-r border-slate-700/60 leading-none tracking-wider ${
                    isFullscreen ? 'text-[9px] px-3 py-1 sm:text-xl sm:px-4 sm:py-3 landscape:py-0.5 landscape:text-[8px] sm:landscape:py-1 sm:landscape:text-[9px] md:landscape:py-1.5 md:landscape:text-xs' : 'text-[10px] sm:text-sm px-3 py-1.5 sm:py-2.5 landscape:py-1 landscape:text-[8px]'
                  }`}>
                    Total Score
                  </div>
                  {/* Right Score cell */}
                  <div className={`col-span-2 flex items-center justify-center bg-slate-950 text-center font-bold ${
                    isFullscreen ? 'px-3 py-1 landscape:py-0.5 sm:landscape:py-1' : 'px-1.5 py-1 landscape:py-1'
                  }`}>
                    <span className={`font-black text-amber-400 tracking-tight ${
                      isFullscreen ? 'text-xs sm:text-3xl md:text-4xl landscape:text-[10px] sm:landscape:text-sm md:landscape:text-base' : 'text-sm sm:text-2xl md:text-3xl landscape:text-xs'
                    }`}>
                      {displayTotalSeniVal.toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>
            </>
          ) : (
            <>
              {/* ================= GANDA & TUNGGAL BEBAS TABLE/GRID LAYOUT ================= */}
              <div className={`w-full border border-slate-700/60 select-none font-sans text-slate-200 rounded-2xl overflow-hidden shadow-xl bg-[#0a0f1d]/40 divide-y divide-slate-700/60 my-1 md:my-1.5 lg:my-3 landscape:my-0.5 ${
                isMobile && isFullscreen ? 'landscape:flex-1 landscape:flex landscape:flex-col landscape:min-h-0' : ''
              }`}>
                
                {/* TABLE HEADER */}
                <div className="hidden md:grid grid-cols-12 bg-slate-950/80 border-b border-slate-700/60 items-center text-center font-black tracking-wider uppercase text-[10px] text-slate-400 py-3">
                  <div className="col-span-9 grid grid-cols-12 items-center">
                    <div className="col-span-3 text-left pl-6">KATEGORI PENILAIAN</div>
                    <div className="col-span-7">KONTROL PENILAIAN (TUNING BUTTONS)</div>
                    <div className="col-span-2">NILAI SKOR</div>
                  </div>
                  <div className="col-span-3 border-l border-slate-700/60 py-1">TOTAL SCORE (COMBINED)</div>
                </div>

                {/* MAIN GRID SPLIT: LEFT (3 ROWS) & RIGHT (TOTAL SCORE SIDEBAR) */}
                <div className={`grid grid-cols-12 items-stretch divide-x divide-slate-700/60 ${
                  isMobile && isFullscreen ? 'landscape:flex-1 landscape:min-h-0' : ''
                }`}>
                  
                  {/* LEFT: 3 ROWS CONTAINER */}
                  <div className={`col-span-9 divide-y divide-slate-700/60 ${
                    isMobile && isFullscreen ? 'landscape:flex landscape:flex-col landscape:h-full' : ''
                  }`}>
                    
                    {/* ROW 1: NILAI TEKNIK */}
                    <div className={`grid grid-cols-12 items-stretch bg-slate-900/20 hover:bg-slate-900/30 transition-colors ${
                      isFullscreen ? 'min-h-[35px] sm:min-h-[70px] landscape:min-h-[28px] sm:landscape:min-h-[32px] md:landscape:min-h-[36px]' : 'min-h-[45px] sm:min-h-[70px] md:min-h-[110px]'
                    } lg:min-h-[150px] xl:min-h-[200px] 2xl:min-h-[240px] landscape:min-h-[42px] ${
                      isMobile && isFullscreen ? 'landscape:flex-1 landscape:min-h-0' : ''
                    }`}>
                      {/* Left Column: Category Label */}
                      <div className={`col-span-3 flex flex-col justify-center px-2 sm:px-6 border-r border-slate-700/60 text-center md:text-left ${
                        isFullscreen ? 'py-0.5 sm:py-1 sm:landscape:py-0.5' : 'py-1 md:py-2.5 lg:py-3 xl:py-4 landscape:py-0.5'
                      }`}>
                        <span className={`font-black uppercase tracking-wider leading-tight ${juriSeniCorner === 'MERAH' ? 'text-red-400' : 'text-blue-400'} ${
                          isFullscreen ? 'text-[8px] sm:text-xs md:text-sm sm:landscape:text-[8px] md:landscape:text-[9px]' : 'text-[9px] sm:text-xs md:text-[13px] xl:text-base'
                        }`}>
                          {matchState.kategoriSeni === 'GANDA' || matchState.kategoriSeni === 'SOLO_KREATIF' ? 'TEKNIK SERANG BELA' : 'TEKNIK & KOREO'}
                        </span>
                        <span className={`text-slate-500 font-bold uppercase tracking-wide font-mono leading-none ${
                          isFullscreen ? 'text-[6.5px] sm:text-[8px] sm:landscape:text-[6.5px] mt-0' : 'text-[7.5px] sm:text-[9.5px] md:text-[10px] xl:text-xs mt-0.5'
                        }`}>
                          (0.01 - 0.30)
                        </span>
                      </div>

                      {/* Middle Column: Tuning Controls */}
                      <div className={`col-span-7 flex items-center justify-center border-r border-slate-700/60 bg-slate-950/20 ${
                        isFullscreen ? 'p-0.5 sm:landscape:p-0.5' : 'p-1 sm:p-3 md:p-2.5 lg:p-4 xl:p-6 landscape:p-1'
                      }`}>
                        {isMobile ? (
                          <div className="flex flex-col w-full px-1.5 py-0.5 landscape:py-0">
                            {/* Current Value Display & Min/Max */}
                            <div className={`flex justify-between items-center leading-none ${isFullscreen ? 'mb-0.5 sm:landscape:mb-1' : 'mb-1'}`}>
                              <span className="text-[7.5px] sm:text-[9px] font-mono text-slate-500 font-bold">MIN: 0.01</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold">TEKNIK:</span>
                                <span className={`text-[9px] sm:text-xs font-black font-mono px-1.5 py-0.5 rounded border leading-none ${
                                  juriSeniCorner === 'MERAH' 
                                    ? 'bg-red-950/40 border-red-500/30 text-red-400' 
                                    : 'bg-blue-950/40 border-blue-500/30 text-blue-400'
                                  }`}>
                                  {currentTeknik.toFixed(2)}
                                </span>
                              </div>
                              <span className="text-[7.5px] sm:text-[9px] font-mono text-slate-500 font-bold">MAX: 0.30</span>
                            </div>

                            {/* Slider range input with dynamic gradient */}
                            <div className={`relative flex items-center ${isFullscreen ? 'my-0 sm:landscape:my-0.5' : 'my-0.5'}`}>
                              <input
                                type="range"
                                min="0.01"
                                max="0.30"
                                step="0.01"
                                value={currentTeknik === 0 ? 0.01 : currentTeknik}
                                disabled={isGandaTunggalBebasLocked}
                                onChange={(e) => {
                                  const newVal = Number(parseFloat(e.target.value).toFixed(2));
                                  setLocalTeknik(newVal);
                                }}
                                onPointerUp={(e) => {
                                  const val = Number(parseFloat(e.currentTarget.value).toFixed(2));
                                  const fieldName = matchState.kategoriSeni === 'GANDA' ? 'teknikSerangBela' : 'teknikSenjataKoreografi';
                                  updateSeniScoreValue(fieldName, val);
                                }}
                                onTouchEnd={(e) => {
                                  const val = Number(parseFloat(e.currentTarget.value).toFixed(2));
                                  const fieldName = matchState.kategoriSeni === 'GANDA' ? 'teknikSerangBela' : 'teknikSenjataKoreografi';
                                  updateSeniScoreValue(fieldName, val);
                                }}
                                onMouseUp={(e) => {
                                  const val = Number(parseFloat(e.currentTarget.value).toFixed(2));
                                  const fieldName = matchState.kategoriSeni === 'GANDA' ? 'teknikSerangBela' : 'teknikSenjataKoreografi';
                                  updateSeniScoreValue(fieldName, val);
                                }}
                                className={`w-full h-1.5 sm:h-2 rounded-lg appearance-none cursor-pointer outline-none transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:w-[22px] [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:cursor-pointer ${
                                  juriSeniCorner === 'MERAH' 
                                    ? '[&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-white' 
                                    : '[&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-white'
                                }`}
                                style={{
                                  background: `linear-gradient(to right, ${
                                    juriSeniCorner === 'MERAH' ? '#ef4444' : '#3b82f6'
                                  } ${
                                    currentTeknik > 0 ? ((currentTeknik - 0.01) / 0.29) * 100 : 0
                                  }%, #1e293b ${
                                    currentTeknik > 0 ? ((currentTeknik - 0.01) / 0.29) * 100 : 0
                                  }%)`
                                }}
                              />
                            </div>

                            {/* Quick Select Milestones */}
                            <div className={`flex justify-between items-center ${isFullscreen ? 'mt-0.5 sm:landscape:mt-1' : 'mt-1'}`}>
                              {[0.01, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30].map((marker) => (
                                <button
                                  key={marker}
                                  type="button"
                                  disabled={isGandaTunggalBebasLocked}
                                  onClick={() => {
                                    playClickSound();
                                    const fieldName = matchState.kategoriSeni === 'GANDA' ? 'teknikSerangBela' : 'teknikSenjataKoreografi';
                                    setLocalTeknik(marker);
                                    updateSeniScoreValue(fieldName, marker);
                                  }}
                                  className={`font-mono font-black rounded transition cursor-pointer select-none ${
                                    currentTeknik === marker
                                      ? juriSeniCorner === 'MERAH'
                                        ? 'text-red-400 bg-red-950/60 border border-red-500/30 shadow-sm'
                                        : 'text-blue-400 bg-blue-950/60 border border-blue-500/30 shadow-sm'
                                      : 'text-slate-100 bg-slate-900/40 border border-slate-800/30 hover:text-white'
                                  } ${
                                    isFullscreen 
                                      ? 'text-[6.5px] px-1 py-0 sm:text-[9px] sm:landscape:text-[6.5px] sm:landscape:px-1 sm:landscape:py-0' 
                                      : 'text-[7.5px] sm:text-[9px] px-1.5 py-0.5'
                                  }`}
                                >
                                  {marker.toFixed(2)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 sm:gap-1.5 md:gap-1.5 xl:gap-2.5 w-full">
                            {Array.from({ length: 30 }, (_, i) => {
                              const val = Number(((i + 1) * 0.01).toFixed(2));
                              const isSelected = currentTeknik === val;
                              let btnClass = "";
                              if (juriSeniCorner === 'MERAH') {
                                btnClass = isSelected
                                  ? "bg-red-600 text-white border-red-500 font-black scale-105 shadow-lg shadow-red-900/50"
                                  : "bg-red-950/25 hover:bg-red-900/50 border border-red-900/40 text-slate-300 font-black";
                              } else {
                                btnClass = isSelected
                                  ? "bg-blue-600 text-white border-blue-500 font-black scale-105 shadow-lg shadow-blue-900/50"
                                  : "bg-blue-950/25 hover:bg-blue-900/50 border border-blue-900/40 text-slate-300 font-black";
                              }
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={isGandaTunggalBebasLocked}
                                  onClick={() => {
                                    playClickSound();
                                    const fieldName = matchState.kategoriSeni === 'GANDA' ? 'teknikSerangBela' : 'teknikSenjataKoreografi';
                                    setLocalTeknik(val);
                                    updateSeniScoreValue(fieldName, val);
                                  }}
                                  className={`py-1.5 sm:py-2 md:py-3 lg:py-4 xl:py-5.5 px-1 text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg rounded-lg transition-all active:scale-95 text-center cursor-pointer select-none font-black ${btnClass} ${
                                    isGandaTunggalBebasLocked ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
                                  }`}
                                >
                                  {val.toFixed(2)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Large Score Display */}
                      <div className={`col-span-2 flex items-center justify-center bg-slate-950 ${
                        isFullscreen ? 'p-0.5 sm:landscape:p-0.5' : 'p-1.5 sm:p-4'
                      }`}>
                        <div className="text-center font-mono">
                          <span className={`text-slate-500 font-black uppercase block leading-none ${
                            isFullscreen ? 'text-[6px] sm:text-[8px] sm:landscape:text-[6px] mb-0' : 'text-[7.5px] sm:text-[10px] mb-0.5'
                          }`}>SCORE</span>
                          <span className={`font-black tracking-tight leading-none ${juriSeniCorner === 'MERAH' ? 'text-red-400' : 'text-blue-400'} ${
                            isFullscreen ? 'text-xs sm:text-3xl md:text-4xl sm:landscape:text-xs md:landscape:text-sm' : 'text-lg sm:text-3xl md:text-4xl xl:text-5xl 2xl:text-6xl'
                          }`}>
                            {currentTeknik.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ROW 2: NILAI KEMANTAPAN */}
                    <div className={`grid grid-cols-12 items-stretch bg-slate-900/20 hover:bg-slate-900/30 transition-colors ${
                      isFullscreen ? 'min-h-[35px] sm:min-h-[70px] landscape:min-h-[28px] sm:landscape:min-h-[32px] md:landscape:min-h-[36px]' : 'min-h-[45px] sm:min-h-[70px] md:min-h-[110px]'
                    } lg:min-h-[150px] xl:min-h-[200px] 2xl:min-h-[240px] landscape:min-h-[42px] ${
                      isMobile && isFullscreen ? 'landscape:flex-1 landscape:min-h-0' : ''
                    }`}>
                      {/* Left Column: Category Label */}
                      <div className={`col-span-3 flex flex-col justify-center px-2 sm:px-6 border-r border-slate-700/60 text-center md:text-left ${
                        isFullscreen ? 'py-0.5 sm:py-1 sm:landscape:py-0.5' : 'py-1 md:py-2.5 lg:py-3 xl:py-4 landscape:py-0.5'
                      }`}>
                        <span className={`font-black text-orange-400 uppercase tracking-wider leading-tight ${
                          isFullscreen ? 'text-[8px] sm:text-xs md:text-sm sm:landscape:text-[8px] md:landscape:text-[9px]' : 'text-[9px] sm:text-xs md:text-[13px] xl:text-base'
                        }`}>
                          KEMANTAPAN & HARMONISASI
                        </span>
                        <span className={`text-slate-500 font-bold uppercase tracking-wide font-mono leading-none ${
                          isFullscreen ? 'text-[6.5px] sm:text-[8px] sm:landscape:text-[6.5px] mt-0' : 'text-[7.5px] sm:text-[9.5px] md:text-[10px] xl:text-xs mt-0.5'
                        }`}>
                          (0.01 - 0.30)
                        </span>
                      </div>

                      {/* Middle Column: Tuning Controls */}
                      <div className={`col-span-7 flex items-center justify-center border-r border-slate-700/60 bg-slate-950/20 ${
                        isFullscreen ? 'p-0.5 sm:landscape:p-0.5' : 'p-1 sm:p-3 md:p-2.5 lg:p-4 xl:p-6 landscape:p-1'
                      }`}>
                        {isMobile ? (
                          <div className="flex flex-col w-full px-1.5 py-0.5 landscape:py-0">
                            {/* Current Value Display & Min/Max */}
                            <div className={`flex justify-between items-center leading-none ${isFullscreen ? 'mb-0.5 sm:landscape:mb-1' : 'mb-1'}`}>
                              <span className="text-[7.5px] sm:text-[9px] font-mono text-slate-500 font-bold">MIN: 0.01</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold">KEMANTAPAN:</span>
                                <span className="text-[9px] sm:text-xs font-black font-mono px-1.5 py-0.5 rounded border leading-none bg-orange-950/40 border-orange-500/30 text-orange-400">
                                  {currentKemantapan.toFixed(2)}
                                </span>
                              </div>
                              <span className="text-[7.5px] sm:text-[9px] font-mono text-slate-500 font-bold">MAX: 0.30</span>
                            </div>

                            {/* Slider range input with dynamic gradient */}
                            <div className={`relative flex items-center ${isFullscreen ? 'my-0 sm:landscape:my-0.5' : 'my-0.5'}`}>
                              <input
                                type="range"
                                min="0.01"
                                max="0.30"
                                step="0.01"
                                value={currentKemantapan === 0 ? 0.01 : currentKemantapan}
                                disabled={isGandaTunggalBebasLocked}
                                onChange={(e) => {
                                  const newVal = Number(parseFloat(e.target.value).toFixed(2));
                                  setLocalKemantapan(newVal);
                                }}
                                onPointerUp={(e) => {
                                  const val = Number(parseFloat(e.currentTarget.value).toFixed(2));
                                  updateSeniScoreValue('kemantapan', val);
                                }}
                                onTouchEnd={(e) => {
                                  const val = Number(parseFloat(e.currentTarget.value).toFixed(2));
                                  updateSeniScoreValue('kemantapan', val);
                                }}
                                onMouseUp={(e) => {
                                  const val = Number(parseFloat(e.currentTarget.value).toFixed(2));
                                  updateSeniScoreValue('kemantapan', val);
                                }}
                                className="w-full h-1.5 sm:h-2 rounded-lg appearance-none cursor-pointer outline-none transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:w-[22px] [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:cursor-pointer [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-white"
                                style={{
                                  background: `linear-gradient(to right, #f97316 ${
                                    currentKemantapan > 0 ? ((currentKemantapan - 0.01) / 0.29) * 100 : 0
                                  }%, #1e293b ${
                                    currentKemantapan > 0 ? ((currentKemantapan - 0.01) / 0.29) * 100 : 0
                                  }%)`
                                }}
                              />
                            </div>

                            {/* Quick Select Milestones */}
                            <div className={`flex justify-between items-center ${isFullscreen ? 'mt-0.5 sm:landscape:mt-1' : 'mt-1'}`}>
                              {[0.01, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30].map((marker) => (
                                <button
                                  key={marker}
                                  type="button"
                                  disabled={isGandaTunggalBebasLocked}
                                  onClick={() => {
                                    playClickSound();
                                    setLocalKemantapan(marker);
                                    updateSeniScoreValue('kemantapan', marker);
                                  }}
                                  className={`font-mono font-black rounded transition cursor-pointer select-none ${
                                    currentKemantapan === marker
                                      ? 'text-orange-400 bg-orange-950/60 border border-orange-500/30 shadow-sm'
                                      : 'text-slate-100 bg-slate-900/40 border border-slate-800/30 hover:text-white'
                                  } ${
                                    isFullscreen 
                                      ? 'text-[6.5px] px-1 py-0 sm:text-[9px] sm:landscape:text-[6.5px] sm:landscape:px-1 sm:landscape:py-0' 
                                      : 'text-[7.5px] sm:text-[9px] px-1.5 py-0.5'
                                  }`}
                                >
                                  {marker.toFixed(2)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 sm:gap-1.5 md:gap-1.5 xl:gap-2.5 w-full">
                            {Array.from({ length: 30 }, (_, i) => {
                              const val = Number(((i + 1) * 0.01).toFixed(2));
                              const isSelected = currentKemantapan === val;
                              let btnClass = "";
                              if (juriSeniCorner === 'MERAH') {
                                btnClass = isSelected
                                  ? "bg-red-600 text-white border-red-500 font-black scale-105 shadow-lg shadow-red-900/50"
                                  : "bg-red-950/25 hover:bg-red-900/50 border border-red-900/40 text-slate-300 font-black";
                              } else {
                                btnClass = isSelected
                                  ? "bg-blue-600 text-white border-blue-500 font-black scale-105 shadow-lg shadow-blue-900/50"
                                  : "bg-blue-950/25 hover:bg-blue-900/50 border border-blue-900/40 text-slate-300 font-black";
                              }
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={isGandaTunggalBebasLocked}
                                  onClick={() => {
                                    playClickSound();
                                    setLocalKemantapan(val);
                                    updateSeniScoreValue('kemantapan', val);
                                  }}
                                  className={`py-1.5 sm:py-2 md:py-3 lg:py-4 xl:py-5.5 px-1 text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg rounded-lg transition-all active:scale-95 text-center cursor-pointer select-none font-black ${btnClass} ${
                                    isGandaTunggalBebasLocked ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
                                  }`}
                                >
                                  {val.toFixed(2)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Large Score Display */}
                      <div className={`col-span-2 flex items-center justify-center bg-slate-950 ${
                        isFullscreen ? 'p-0.5 sm:landscape:p-0.5' : 'p-1.5 sm:p-4'
                      }`}>
                        <div className="text-center font-mono">
                          <span className={`text-slate-500 font-black uppercase block leading-none ${
                            isFullscreen ? 'text-[6px] sm:text-[8px] sm:landscape:text-[6px] mb-0' : 'text-[7.5px] sm:text-[10px] mb-0.5'
                          }`}>SCORE</span>
                          <span className={`font-black tracking-tight leading-none text-orange-400 ${
                            isFullscreen ? 'text-xs sm:text-3xl md:text-4xl sm:landscape:text-xs md:landscape:text-sm' : 'text-lg sm:text-3xl md:text-4xl xl:text-5xl 2xl:text-6xl'
                          }`}>
                            {currentKemantapan.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ROW 2.5: NILAI PENJIWAAN / PENGHAYATAN GERAK */}
                    <div className={`grid grid-cols-12 items-stretch bg-slate-900/20 hover:bg-slate-900/30 transition-colors ${
                      isFullscreen ? 'min-h-[35px] sm:min-h-[70px] landscape:min-h-[28px] sm:landscape:min-h-[32px] md:landscape:min-h-[36px]' : 'min-h-[45px] sm:min-h-[70px] md:min-h-[110px]'
                    } lg:min-h-[150px] xl:min-h-[200px] 2xl:min-h-[240px] landscape:min-h-[42px] ${
                      isMobile && isFullscreen ? 'landscape:flex-1 landscape:min-h-0' : ''
                    }`}>
                      {/* Left Column: Category Label */}
                      <div className={`col-span-3 flex flex-col justify-center px-2 sm:px-6 border-r border-slate-700/60 text-center md:text-left ${
                        isFullscreen ? 'py-0.5 sm:py-1 sm:landscape:py-0.5' : 'py-1 md:py-2.5 lg:py-3 xl:py-4 landscape:py-0.5'
                      }`}>
                        <span className={`font-black text-violet-400 uppercase tracking-wider leading-tight ${
                          isFullscreen ? 'text-[8px] sm:text-xs md:text-sm sm:landscape:text-[8px] md:landscape:text-[9px]' : 'text-[9px] sm:text-xs md:text-[13px] xl:text-base'
                        }`}>
                          PENJIWAAN & PENGHAYATAN
                        </span>
                        <span className={`text-slate-500 font-bold uppercase tracking-wide font-mono leading-none ${
                          isFullscreen ? 'text-[6.5px] sm:text-[8px] sm:landscape:text-[6.5px] mt-0' : 'text-[7.5px] sm:text-[9.5px] md:text-[10px] xl:text-xs mt-0.5'
                        }`}>
                          (0.01 - 0.30)
                        </span>
                      </div>

                      {/* Middle Column: Tuning Controls */}
                      <div className={`col-span-7 flex items-center justify-center border-r border-slate-700/60 bg-slate-950/20 ${
                        isFullscreen ? 'p-0.5 sm:landscape:p-0.5' : 'p-1 sm:p-3 md:p-2.5 lg:p-4 xl:p-6 landscape:p-1'
                      }`}>
                        {isMobile ? (
                          <div className="flex flex-col w-full px-1.5 py-0.5 landscape:py-0">
                            {/* Current Value Display & Min/Max */}
                            <div className={`flex justify-between items-center leading-none ${isFullscreen ? 'mb-0.5 sm:landscape:mb-1' : 'mb-1'}`}>
                              <span className="text-[7.5px] sm:text-[9px] font-mono text-slate-500 font-bold">MIN: 0.01</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold">PENJIWAAN:</span>
                                <span className="text-[9px] sm:text-xs font-black font-mono px-1.5 py-0.5 rounded border leading-none bg-violet-950/40 border-violet-500/30 text-violet-400">
                                  {currentPenjiwaan.toFixed(2)}
                                </span>
                              </div>
                              <span className="text-[7.5px] sm:text-[9px] font-mono text-slate-500 font-bold">MAX: 0.30</span>
                            </div>

                            {/* Slider range input with dynamic gradient */}
                            <div className={`relative flex items-center ${isFullscreen ? 'my-0 sm:landscape:my-0.5' : 'my-0.5'}`}>
                              <input
                                type="range"
                                min="0.01"
                                max="0.30"
                                step="0.01"
                                value={currentPenjiwaan === 0 ? 0.01 : currentPenjiwaan}
                                disabled={isGandaTunggalBebasLocked}
                                onChange={(e) => {
                                  const newVal = Number(parseFloat(e.target.value).toFixed(2));
                                  setLocalPenjiwaan(newVal);
                                }}
                                onPointerUp={(e) => {
                                  const val = Number(parseFloat(e.currentTarget.value).toFixed(2));
                                  updateSeniScoreValue('penjiwaan', val);
                                }}
                                onTouchEnd={(e) => {
                                  const val = Number(parseFloat(e.currentTarget.value).toFixed(2));
                                  updateSeniScoreValue('penjiwaan', val);
                                }}
                                onMouseUp={(e) => {
                                  const val = Number(parseFloat(e.currentTarget.value).toFixed(2));
                                  updateSeniScoreValue('penjiwaan', val);
                                }}
                                className="w-full h-1.5 sm:h-2 rounded-lg appearance-none cursor-pointer outline-none transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:w-[22px] [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:cursor-pointer [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:bg-violet-500 [&::-moz-range-thumb]:border-white"
                                style={{
                                  background: `linear-gradient(to right, #8b5cf6 ${
                                    currentPenjiwaan > 0 ? ((currentPenjiwaan - 0.01) / 0.29) * 100 : 0
                                  }%, #1e293b ${
                                    currentPenjiwaan > 0 ? ((currentPenjiwaan - 0.01) / 0.29) * 100 : 0
                                  }%)`
                                }}
                              />
                            </div>

                            {/* Quick Select Milestones */}
                            <div className={`flex justify-between items-center ${isFullscreen ? 'mt-0.5 sm:landscape:mt-1' : 'mt-1'}`}>
                              {[0.01, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30].map((marker) => (
                                <button
                                  key={marker}
                                  type="button"
                                  disabled={isGandaTunggalBebasLocked}
                                  onClick={() => {
                                    playClickSound();
                                    setLocalPenjiwaan(marker);
                                    updateSeniScoreValue('penjiwaan', marker);
                                  }}
                                  className={`font-mono font-black rounded transition cursor-pointer select-none ${
                                    currentPenjiwaan === marker
                                      ? 'text-violet-400 bg-violet-950/60 border border-violet-500/30 shadow-sm'
                                      : 'text-slate-100 bg-slate-900/40 border border-slate-800/30 hover:text-white'
                                  } ${
                                    isFullscreen 
                                      ? 'text-[6.5px] px-1 py-0 sm:text-[9px] sm:landscape:text-[6.5px] sm:landscape:px-1 sm:landscape:py-0' 
                                      : 'text-[7.5px] sm:text-[9px] px-1.5 py-0.5'
                                  }`}
                                >
                                  {marker.toFixed(2)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 sm:gap-1.5 md:gap-1.5 xl:gap-2.5 w-full">
                            {Array.from({ length: 30 }, (_, i) => {
                              const val = Number(((i + 1) * 0.01).toFixed(2));
                              const isSelected = currentPenjiwaan === val;
                              let btnClass = "";
                              if (juriSeniCorner === 'MERAH') {
                                btnClass = isSelected
                                  ? "bg-red-600 text-white border-red-500 font-black scale-105 shadow-lg shadow-red-900/50"
                                  : "bg-red-950/25 hover:bg-red-900/50 border border-red-900/40 text-slate-300 font-black";
                              } else {
                                btnClass = isSelected
                                  ? "bg-blue-600 text-white border-blue-500 font-black scale-105 shadow-lg shadow-blue-900/50"
                                  : "bg-blue-950/25 hover:bg-blue-900/50 border border-blue-900/40 text-slate-300 font-black";
                              }
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={isGandaTunggalBebasLocked}
                                  onClick={() => {
                                    playClickSound();
                                    setLocalPenjiwaan(val);
                                    updateSeniScoreValue('penjiwaan', val);
                                  }}
                                  className={`py-1.5 sm:py-2 md:py-3 lg:py-4 xl:py-5.5 px-1 text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg rounded-lg transition-all active:scale-95 text-center cursor-pointer select-none font-black ${btnClass} ${
                                    isGandaTunggalBebasLocked ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
                                  }`}
                                >
                                  {val.toFixed(2)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Large Score Display */}
                      <div className={`col-span-2 flex items-center justify-center bg-slate-950 ${
                        isFullscreen ? 'p-0.5 sm:landscape:p-0.5' : 'p-1.5 sm:p-4'
                      }`}>
                        <div className="text-center font-mono">
                          <span className={`text-slate-500 font-black uppercase block leading-none ${
                            isFullscreen ? 'text-[6px] sm:text-[8px] sm:landscape:text-[6px] mb-0' : 'text-[7.5px] sm:text-[10px] mb-0.5'
                          }`}>SCORE</span>
                          <span className={`font-black tracking-tight leading-none text-violet-400 ${
                            isFullscreen ? 'text-xs sm:text-3xl md:text-4xl sm:landscape:text-xs md:landscape:text-sm' : 'text-lg sm:text-3xl md:text-4xl xl:text-5xl 2xl:text-6xl'
                          }`}>
                            {currentPenjiwaan.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT Column: COMBINED/TOTAL SCORE (technique, firmness, soulfulness) */}
                  <div className={`col-span-3 bg-slate-950/70 flex flex-col justify-center items-center text-center select-none ${
                    isFullscreen ? 'p-1 sm:landscape:p-1' : 'p-1.5 sm:p-4 xl:p-6'
                  }`}>
                    <div className={isFullscreen ? 'space-y-0.5 sm:landscape:space-y-1' : 'space-y-1.5 sm:space-y-4'}>
                      <div>
                        <span className={`font-extrabold text-slate-400 tracking-widest uppercase block leading-tight ${
                          isFullscreen ? 'text-[7px] sm:landscape:text-[8px] md:landscape:text-[9px]' : 'text-[9px] sm:text-[13px] md:text-sm xl:text-base'
                        }`}>
                          TOTAL SCORE
                        </span>
                        <div className="hidden sm:block text-[9px] sm:text-[10px] md:text-xs xl:text-sm text-slate-400/80 font-bold text-left mt-1.5 space-y-1 xl:space-y-1.5 inline-block">
                          <div>- Technique</div>
                          <div>- Firmness</div>
                          <div>- Soulfulness</div>
                        </div>
                      </div>
                      
                      <div className="font-mono">
                        <span className={`font-black tracking-tight leading-none ${juriSeniCorner === 'MERAH' ? 'text-red-500' : 'text-blue-400'} ${
                          isFullscreen ? 'text-sm sm:text-3xl md:text-4xl sm:landscape:text-sm md:landscape:text-base' : 'text-2xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl'
                        }`}>
                          {(currentTeknik + currentKemantapan + currentPenjiwaan).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ROW 3: TOTAL SCORE */}
                <div className={`grid grid-cols-12 items-stretch bg-slate-950 ${
                  isFullscreen ? 'min-h-[24px] sm:min-h-[65px] landscape:min-h-[18px] sm:landscape:min-h-[22px] md:landscape:min-h-[26px]' : 'min-h-[40px] sm:min-h-[65px] md:min-h-[75px] xl:min-h-[105px]'
                }`}>
                  <div className={`col-span-9 flex items-center uppercase font-black text-amber-400 tracking-wider sm:tracking-widest leading-none border-r border-slate-800 ${
                    isFullscreen ? 'text-[8px] pl-2 sm:text-sm sm:landscape:text-[9px] md:landscape:text-[xs] py-1' : 'text-[9px] sm:text-xs md:text-sm xl:text-base pl-3 sm:pl-6 py-1 sm:py-3'
                  }`}>
                    TOTAL AKUMULASI SCORE JURI {selectedJuriId}
                  </div>
                  <div className="col-span-3 flex items-center justify-center px-1.5 bg-slate-950 font-mono">
                    <span className={`font-black text-amber-400 tracking-tight leading-none ${
                      isFullscreen ? 'text-xs sm:text-2xl sm:landscape:text-sm md:landscape:text-base' : 'text-base sm:text-2xl md:text-3xl xl:text-5xl 2xl:text-6xl'
                    }`}>
                      {(9.00 + currentTeknik + currentKemantapan + currentPenjiwaan).toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>
            </>
          )}

          {/* FOOTER TRADEMARK (GANTI JURI BUTTON REMOVED AS REQUESTED) */}
          <div className={`justify-end items-center text-[10px] text-slate-400 font-bold select-none mt-auto pt-2 border-t border-slate-800 ${
            (isMobile && isFullscreen) ? '!hidden' : 'flex'
          } landscape:hidden md:landscape:flex`}>
            <span className="text-blue-400 font-sans font-black tracking-wide">NO DISCORS PENCAK SILAT - Versi 3.0</span>
          </div>
        </div>
      ) : (
        <>
          {/* ATHLETE BAR (INFO ONLY) */}
          <div className="grid grid-cols-2 gap-1 sm:gap-2 mb-1.5 sm:mb-2 shrink-0">
            <div className="bg-[#070d1a]/80 border border-blue-950/40 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl flex items-center justify-between">
              <span className="text-[8px] sm:text-[9px] font-black text-blue-400 uppercase tracking-wider font-mono">BIRU</span>
              <span className="text-[10px] sm:text-xs font-black text-white truncate max-w-[80px] sm:max-w-[150px]">{athleteBiruNama}</span>
              <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase truncate max-w-[50px] sm:max-w-none">{athleteBiruKontingen}</span>
            </div>
            <div className="bg-[#0f070a]/80 border border-red-955/40 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl flex items-center justify-between">
              <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase truncate max-w-[50px] sm:max-w-none">{athleteMerahKontingen}</span>
              <span className="text-[10px] sm:text-xs font-black text-white truncate max-w-[80px] sm:max-w-[150px]">{athleteMerahNama}</span>
              <span className="text-[8px] sm:text-[9px] font-black text-red-400 uppercase tracking-wider font-mono">MERAH</span>
            </div>
          </div>

          {/* CORE INPUT & REKAP AREA */}
          <div className="flex-1 lg:min-h-0 grid grid-cols-12 gap-1.5 sm:gap-3 overflow-visible lg:overflow-hidden mb-0.5 sm:mb-1">
            
            {/* LEFT COLUMN: BLUE CORNER (SISI KIRI) */}
            <section className="col-span-4 flex flex-col gap-1.5 sm:gap-2 min-h-0">
              <div className="flex-1 rounded-xl sm:rounded-2xl border border-dashed border-blue-500/30 flex flex-col items-center justify-center p-4 bg-blue-950/10 text-center select-none">
                <span className="text-xs sm:text-sm font-black text-blue-400 uppercase tracking-widest leading-normal">LOGIKA BARU</span>
                <span className="text-[9px] text-blue-300 font-semibold tracking-wide uppercase mt-1 opacity-60">Menunggu Konfigurasi</span>
              </div>

              {/* HAPUS BLUE BUTTON */}
              {onDeleteRawClick && (
                <button
                  onClick={() => onDeleteRawClick('BIRU')}
                  className="py-1.5 sm:py-2 px-3 rounded-lg border border-red-500/30 hover:border-red-500/60 bg-red-950/55 hover:bg-red-900/60 text-red-300 font-mono uppercase text-[9px] font-extrabold tracking-widest text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
                >
                  HAPUS (BACKSPACE)
                </button>
              )}
            </section>

            {/* MIDDLE COLUMN: OWN JURI RECAP BY BABAK */}
            <section className="col-span-4 bg-[#050914] border border-slate-900 rounded-xl sm:rounded-2xl p-1.5 sm:p-3 sm:pb-3 flex flex-col justify-between min-h-0 shadow-inner">
              <div className="min-h-0 flex flex-col">
                <h3 className="text-[9px] sm:text-[10px] md:text-[11px] font-black text-blue-400 text-center tracking-widest uppercase mb-1 sm:mb-1.5 border-b border-slate-900 pb-1 sm:pb-1.5 font-mono truncate leading-none">
                  REKAP DECK {selectedJuriId}
                </h3>
                
                <p className="text-[8px] sm:text-[9px] text-slate-500 text-center mb-1.5 leading-tight hidden sm:block">
                  Merekam seluruh ketukan mentah Anda secara real-time.
                </p>

                {/* Score by Babak list */}
                <div className="space-y-1 overflow-y-auto max-h-[85px] sm:max-h-[150px] min-h-0">
                  {Array.from({ length: getMaxRounds(matchState.kategoriUsia) }, (_, i) => i + 1).map((b) => (
                    <div
                      key={b}
                      className={`p-1 sm:p-1.5 rounded-lg border flex justify-between items-center text-[8.5px] sm:text-[10px] ${
                        b === matchState.babakAktif ? 'bg-blue-550/10 border-blue-500/30' : 'bg-slate-950/40 border-slate-950 opacity-70'
                      }`}
                    >
                      <span className="font-extrabold text-slate-350">BABAK {b}</span>
                      <div className="flex items-center gap-1.5 sm:gap-3">
                        <div className="flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-blue-500" />
                          <span className="font-mono text-[8px] sm:text-[9.5px]">B:<strong className="text-blue-400 font-black">{myRawHitsBiru(b)}</strong></span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-red-500" />
                          <span className="font-mono text-[8px] sm:text-[9.5px]">M:<strong className="text-red-400 font-black">{myRawHitsMerah(b)}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-900 pt-1 flex flex-col justify-center items-center text-center shrink-0">
                <span className="text-[7.5px] sm:text-[8.5px] text-slate-500 uppercase block font-mono font-bold tracking-wider leading-none">TOTAL MENTAH</span>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-3 w-full mt-1">
                  <div className="bg-blue-950/20 py-0.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-blue-900/30">
                    <div className="text-[7px] sm:text-[8px] text-blue-400 font-bold uppercase leading-none mb-0.5">BIRU</div>
                    <span className="text-[10px] sm:text-xs md:text-sm font-black text-blue-400 font-mono leading-none">{myRawHitsBiru(1) + myRawHitsBiru(2) + myRawHitsBiru(3)} HITS</span>
                  </div>
                  <div className="bg-red-950/20 py-0.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-red-955/30">
                    <div className="text-[7px] sm:text-[8px] text-red-400 font-bold uppercase leading-none mb-0.5">MERAH</div>
                    <span className="text-[10px] sm:text-xs md:text-sm font-black text-red-400 font-mono leading-none">{myRawHitsMerah(1) + myRawHitsMerah(2) + myRawHitsMerah(3)} HITS</span>
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: RED CORNER (SISI KANAN) */}
            <section className="col-span-4 flex flex-col gap-1.5 sm:gap-2 min-h-0">
              <div className="flex-1 rounded-xl sm:rounded-2xl border border-dashed border-red-500/30 flex flex-col items-center justify-center p-4 bg-red-950/10 text-center select-none">
                <span className="text-xs sm:text-sm font-black text-red-400 uppercase tracking-widest leading-normal">LOGIKA BARU</span>
                <span className="text-[9px] text-red-300 font-semibold tracking-wide uppercase mt-1 opacity-60">Menunggu Konfigurasi</span>
              </div>

              {/* HAPUS RED BUTTON */}
              {onDeleteRawClick && (
                <button
                  onClick={() => onDeleteRawClick('MERAH')}
                  className="py-1.5 sm:py-2 px-3 rounded-lg border border-red-500/30 hover:border-red-500/60 bg-red-950/55 hover:bg-red-900/60 text-red-300 font-mono uppercase text-[9px] font-extrabold tracking-widest text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
                >
                  HAPUS (BACKSPACE)
                </button>
              )}
            </section>

          </div>

          {/* FOOTER TRADEMARK (GANTI JURI BUTTON REMOVED AS REQUESTED) */}
          <div className={`justify-end items-center text-[10px] text-slate-400 font-bold select-none mt-auto pt-2 border-t border-slate-800 ${
            (isMobile && isFullscreen) ? '!hidden' : 'flex'
          } landscape:hidden md:landscape:flex`}>
            <span className="text-blue-400 font-sans font-black tracking-wide">NO DISCORS PENCAK SILAT - Versi 3.0</span>
          </div>
        </>
      )}

      {/* POP-UP: NOTIFIKASI VERIFIKASI DEWAN */}
      {activeVerification && !hasVotedForVerification && (
        <div className="absolute inset-0 z-45 bg-[#02050b]/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0f1d] border-2 border-amber-500 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            
            <div className="inline-flex p-3 bg-amber-500/10 text-amber-500 rounded-full mb-3.5 shadow-md">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <h3 className="text-base font-black uppercase text-slate-100 tracking-widest leading-tight">
              VERIFIKASI DEWAN PERTANDINGAN
            </h3>
            
            <p className="text-[10px] text-amber-400 uppercase tracking-widest font-black bg-amber-500/10 py-2 rounded-lg border border-amber-500/20 my-3.5 font-mono">
              FORM VERIFIKASI: {activeVerification.type}
            </p>
            
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-sans">
              Dewan Pertandingan meminta Anda melakukan verifikasi keputusan kejadian tersebut. Pilihlah salah satu sudut atau Tidak Sah:
            </p>

            <div className="grid grid-cols-3 gap-3">
              <button
                id={`juri-vote-biru-${selectedJuriId}`}
                onClick={() => selectJuriVerificationVote(selectedJuriId, 'BIRU')}
                className="py-3 bg-blue-650 hover:bg-blue-600 text-white font-black text-xs rounded-xl uppercase transition-all duration-150 active:scale-95 cursor-pointer shadow-md border border-blue-500"
              >
                Sudut Biru
              </button>
              <button
                id={`juri-vote-merah-${selectedJuriId}`}
                onClick={() => selectJuriVerificationVote(selectedJuriId, 'MERAH')}
                className="py-3 bg-red-650 hover:bg-red-600 text-white font-black text-xs rounded-xl uppercase transition-all duration-150 active:scale-95 cursor-pointer shadow-md border border-red-500"
              >
                Sudut Merah
              </button>
              <button
                id={`juri-vote-taksah-${selectedJuriId}`}
                onClick={() => selectJuriVerificationVote(selectedJuriId, 'TIDAK_SAH')}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs rounded-xl uppercase transition-all duration-150 active:scale-95 cursor-pointer shadow-md border border-slate-700"
              >
                Tidak Sah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: BLOCKED WITH WAITING OVERLAYS WHEN NOT ACTIVE */}
      {isUnlocked && isRoundOver && (
        <div className="absolute inset-0 z-30 bg-[#02050b]/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0a0f1d] border border-red-950/40 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
            
            {isMatchOver ? (
              <>
                <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3.5 animate-[spin_4s_linear_infinite]" />
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wider font-sans">PERTANDINGAN SELESAI</h3>
                <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed font-sans">
                  Pertandingan {matchState.sistemTanding === 'POOL' ? 'Tampil' : 'Partai'} {matchState.partai || (matchState as any).settings?.partai} telah berakhir sepenuhnya. Rekap akhir sedang dihimpun oleh Dewan dan Monitor.
                </p>
                <div className="inline-flex px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg border border-yellow-500/25 text-[10px] font-black uppercase tracking-widest font-mono">
                  Menunggu instruksi Sekretaris
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3.5" />
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wider font-sans">BABAK {matchState.babakAktif} SELESAI</h3>
                <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed font-sans">
                  Waktu babak ini telah habis. Tombol penilaian dimatikan sementara agar tidak terjadi pemencetan tak sengaja selama istirahat.
                </p>
                <div className="inline-flex px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/25 text-[10px] font-black uppercase tracking-widest font-mono">
                  Menunggu tombol Lanjut dari Sekretaris
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* FINISH ASSESSMENT CONFIRMATION MODAL */}
      {showFinishConfirm && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-auto select-none">
          <div className="bg-[#0c0d19]/95 border border-amber-500/30 px-6 py-6 rounded-2xl shadow-2xl max-w-sm text-center mx-4">
            <span className="text-xl font-bold text-slate-100 block mb-3">
              Apakah Anda Akan Mengakhiri Penilaian?
            </span>
            <p className="text-xs text-slate-400 font-sans mb-6 leading-relaxed">
              Setelah dinonaktifkan, panel penilaian Anda akan terkunci secara otomatis dan tidak dapat diubah kembali.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setHasDeclinedConfirm(false);
                  setShowFinishConfirm(false);

                  // Reset local slider states to null to clear UI sliders on mobile/HP
                  setLocalTeknik(null);
                  setLocalKemantapan(null);
                  setLocalPenjiwaan(null);

                  // Reset values for GANDA / TUNGGAL BEBAS to default (50)
                  const currentJuri = selectedJuriId || 1;
                  const updatedSeniScores = { ...matchState.seniScores };
                  const updatedCornerState = { ...updatedSeniScores[juriSeniCorner] };
                  const updatedJuriScores = { ...updatedCornerState.juriScores };
                  
                  updatedJuriScores[currentJuri] = {
                    ...updatedJuriScores[currentJuri],
                    teknikSerangBela: 50,
                    teknikSenjataKoreografi: 50,
                    kemantapan: 50,
                    penjiwaan: 50
                  };
                  
                  updatedCornerState.juriScores = updatedJuriScores;
                  updatedSeniScores[juriSeniCorner] = updatedCornerState;
                  
                  const nextState: MatchState = {
                    ...matchState,
                    seniScores: updatedSeniScores
                  };

                  if (updateMatchState) {
                    updateMatchState(nextState);
                  } else {
                    saveMatchState(nextState);
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new Event('silat_state_updated_internally'));
                  }
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition active:scale-95 cursor-pointer uppercase text-xs tracking-wider"
              >
                Tidak
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  updateJuriReadyStatus(true, true);
                  setShowFinishConfirm(false);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer uppercase text-xs tracking-wider"
              >
                Ya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCAL JURI PANEL LOCKED OVERLAY */}
      {isUnlocked && activeJuriScore.isLocked && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-[4px] flex flex-col items-center justify-center pointer-events-auto select-none">
          <div className="bg-[#050914]/95 border border-emerald-500/30 px-6 py-6 rounded-2xl shadow-2xl max-w-sm text-center mx-4">
            <span className="text-xs font-black tracking-widest text-emerald-400 uppercase font-mono block mb-2">
              🔒 STATUS PANEL: TERKUNCI (SELESAI)
            </span>
            <p className="text-xs text-slate-300 font-sans leading-relaxed block mb-4">
              Penilaian Anda telah berhasil direkam dan panel juri Anda telah terkunci secara otomatis.
            </p>
            <span className="text-[10px] text-slate-500 font-mono block">
              Juri ID: {selectedJuriId}
            </span>
          </div>
        </div>
      )}

      {/* NEW POP-UP: KONFIRMASI KESIAPAN PENILAIAN (READY CHECK) FOR GANDA & TUNGGAL BEBAS */}
      {(() => {
        const isGandaOrTunggalBebas = 
          matchState.kelas === 'TUNGGAL BEBAS' || 
          matchState.kelas === 'GANDA' || 
          matchState.kategoriSeni === 'GANDA' || 
          matchState.kategoriSeni === 'SOLO_KREATIF' ||
          (matchState.kelas && (
            matchState.kelas.toUpperCase().includes('GANDA') || 
            matchState.kelas.toUpperCase().includes('BEBAS') || 
            matchState.kelas.toUpperCase().includes('SOLO') || 
            matchState.kelas.toUpperCase().includes('KREATIF')
          ));
        
        if (isUnlocked && isGandaOrTunggalBebas && !activeJuriScore.isReady) {
          return (
            <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-[4px] flex flex-col items-center justify-center pointer-events-auto select-none">
              <div className="bg-[#050914]/98 border border-emerald-500/40 px-8 py-8 rounded-3xl shadow-2xl max-w-sm text-center mx-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>
                
                <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase font-mono block mb-3 animate-pulse">
                  🔔 KONFIRMASI KESIAPAN PENILAIAN
                </span>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide font-sans mb-2">
                  KATEGORI: {matchState.kelas || matchState.kategoriSeni}
                </h3>
                <p className="text-xs text-slate-300 font-sans leading-relaxed mb-6">
                  Silakan konfirmasi kesiapan Anda sebelum memulai penilaian penampilan sudut <strong className="text-amber-400 uppercase">{juriSeniCorner}</strong>.
                </p>
                
                <button
                  id={`juri-confirmation-ready-btn`}
                  onClick={() => {
                    playClickSound();
                    updateJuriReadyStatus(true, false);
                  }}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 transition-all duration-150 active:scale-95 cursor-pointer text-xs tracking-wider uppercase"
                >
                  READY
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* POP-UP: WAITING PANEL IN JURI FOR THE VERY FIRST START BEFORE PLAY IS PRESSED */}
      {!isUnlocked && (
        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-auto">
          <div className="bg-[#050914]/95 border border-red-500/30 px-6 py-4 rounded-2xl shadow-xl max-w-sm text-center">
            <span className="text-[10px] font-black tracking-widest text-[#ef4444] uppercase animate-pulse font-mono block mb-2">
              🔒 STATUS PANEL JURI: DIKUNCI
            </span>
            <span className="text-xs text-slate-300 font-sans leading-relaxed block">
              Menunggu tombol <strong className="text-purple-400">"Mulai (Buka Kunci)"</strong> ditekan oleh Sekretaris di Panel Sekretaris untuk mengaktifkan penilaian.
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
