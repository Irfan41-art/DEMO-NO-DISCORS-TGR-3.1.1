/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchState, JuriSeniScore } from '../types';
import { calculateFinalScore, calculateSeniScoreForJuri, calculateSeniHukumanTotal, calculateSeniStandardDeviation, calculateSeniKebenaranScore } from '../appState';
import { Trophy, HelpCircle, AlertCircle, Maximize2, Minimize2, Clock, User, ShieldAlert, Award, Star, Users, Flame } from 'lucide-react';

const IPSIColoredLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
    <polygon points="60,10 110,40 100,90 60,110 20,90 10,40" fill="#1b5e20" stroke="#ffeb3b" strokeWidth="3" />
    <circle cx="60" cy="55" r="22" fill="#d50000" stroke="#ffffff" strokeWidth="2" />
    <path d="M60,10 L60,110" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" className="opacity-40" />
    <path d="M10,40 L110,40" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" className="opacity-40" />
    <path d="M20,90 L100,90" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" className="opacity-40" />
    <path d="M42,55 Q60,32 78,55" fill="none" stroke="#ffeb3b" strokeWidth="2.5" />
    <path d="M42,55 Q60,78 78,55" fill="none" stroke="#ffeb3b" strokeWidth="2.5" />
    <path d="M48,48 L72,72" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    <path d="M72,48 L48,72" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const PERSILATColoredLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="50" fill="#030612" stroke="#ffeb3b" strokeWidth="3.5" />
    <circle cx="60" cy="60" r="44" fill="#0d5c22" stroke="#ffffff" strokeWidth="1.5" />
    <path d="M60,16 Q45,60 60,104" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
    <path d="M60,16 Q75,60 60,104" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
    <line x1="16" y1="60" x2="104" y2="60" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
    <circle cx="60" cy="60" r="14" fill="#d50000" stroke="#ffffff" strokeWidth="1.5" />
    <path d="M45,75 Q60,60 75,45" fill="none" stroke="#ffeb3b" strokeWidth="3" strokeLinecap="round" />
    <path d="M75,75 Q60,60 45,45" fill="none" stroke="#ffeb3b" strokeWidth="3" strokeLinecap="round" />
    <path d="M30,80 Q20,60 30,40" fill="none" stroke="#ffeb3b" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M90,80 Q100,60 90,40" fill="none" stroke="#ffeb3b" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

interface MonitorPanelProps {
  matchState: MatchState;
  onBackToLanding?: () => void;
}

export const MonitorPanel: React.FC<MonitorPanelProps> = ({ matchState, onBackToLanding }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flashMerah, setFlashMerah] = useState(false);
  const [flashBiru, setFlashBiru] = useState(false);
  const [forceReview, setForceReview] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [flashingJuris, setFlashingJuris] = useState<Record<string, boolean>>({});
  const prevSalahGerakCountsRef = React.useRef<Record<string, number>>({});

  const isPoolSystem = matchState.sistemTanding === 'POOL' || 
                       matchState.tahapPertandingan?.toUpperCase().includes('POOL') || 
                       matchState.atlitMerah?.nama === '---' || 
                       matchState.atlitBiru?.nama === '---';

  const [viewMode, setViewMode] = useState<'ACTIVE_ATHLETE' | 'POOL_STANDINGS'>('ACTIVE_ATHLETE');

  useEffect(() => {
    setViewMode('ACTIVE_ATHLETE');
  }, [isPoolSystem, matchState.partai]);

  useEffect(() => {
    if (!matchState?.seniScores) return;
    
    // Only check if category is TUNGGAL or REGU
    const currentKategori = (matchState.kategoriSeni || '').toUpperCase().trim();
    const currentKelas = (matchState.kelas || '').toUpperCase().trim();
    const isTunggalOrReguCategory = 
      currentKategori === 'TUNGGAL' || 
      currentKategori === 'REGU' || 
      currentKelas === 'TUNGGAL' || 
      currentKelas === 'REGU' || 
      currentKelas.includes('TUNGGAL') || 
      currentKelas.includes('REGU');
      
    if (!isTunggalOrReguCategory) return;

    const nextFlashingJuris = { ...flashingJuris };
    let hasChanges = false;
    
    // Check both corners
    (['BIRU', 'MERAH'] as const).forEach((corner) => {
      const cornerState = matchState.seniScores[corner];
      if (!cornerState || !cornerState.juriScores) return;
      
      const jCount = matchState.jumlahJuri || 10;
      for (let juriId = 1; juriId <= jCount; juriId++) {
        const jScore = cornerState.juriScores[juriId];
        if (jScore) {
          const currentCount = jScore.salahGerakCount || 0;
          const key = `${corner}-${juriId}`;
          const prevCount = prevSalahGerakCountsRef.current[key];
          
          // Only trigger if prevCount is defined and currentCount has increased
          if (prevCount !== undefined && currentCount > prevCount) {
            nextFlashingJuris[key] = true;
            hasChanges = true;
            
            // Clear the flash after a delay (e.g. 0.35 seconds for a fast single flash)
            const flashDuration = 350;
            setTimeout(() => {
              setFlashingJuris(prev => {
                const updated = { ...prev };
                delete updated[key];
                return updated;
              });
            }, flashDuration);
          }
          
          // Always update the ref
          prevSalahGerakCountsRef.current[key] = currentCount;
        }
      }
    });
    
    if (hasChanges) {
      setFlashingJuris(nextFlashingJuris);
    }
  }, [matchState]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const YYYY = now.getFullYear();
      const MM = String(now.getMonth() + 1).padStart(2, '0');
      const DD = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setCurrentDateTime(`${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setForceReview(false);
  }, [matchState.pemenang, matchState.umumkanPemenang]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          console.error('Error enabling fullscreen:', err);
          setIsFullscreen(!isFullscreen);
        });
    } else {
      document.exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
        })
        .catch((err) => {
          console.error('Error exiting fullscreen:', err);
          setIsFullscreen(!isFullscreen);
        });
    }
  };

  const getSubtotalsForCorner = (corner: 'MERAH' | 'BIRU') => {
    const sScores = matchState.seniScores[corner];
    const cat = matchState.kategoriSeni || 'TUNGGAL';
    const jCount = matchState.jumlahJuri || 10;
    
    let sumJuri = 0;
    for (let i = 1; i <= jCount; i++) {
      const jScoreObj = sScores.juriScores[i] || {
        juriId: i,
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
      sumJuri += calculateSeniScoreForJuri(cat, jScoreObj);
    }
    
    const avgJuri = jCount > 0 ? (sumJuri / jCount) : 0;
    const hukuman = calculateSeniHukumanTotal(sScores.hukumanLog);
    const finalScore = Math.max(0, avgJuri - hukuman);

    return {
      sumJuri,
      avgJuri,
      hukuman,
      finalScore
    };
  };

  const merahStats = getSubtotalsForCorner('MERAH');
  const biruStats = getSubtotalsForCorner('BIRU');

  const [prevMerahScore, setPrevMerahScore] = useState(0);
  const [prevBiruScore, setPrevBiruScore] = useState(0);
  const [selectedCorner, setSelectedCorner] = useState<'MERAH' | 'BIRU'>(matchState.activeCorner || 'BIRU');

  useEffect(() => {
    if (matchState.activeCorner) {
      setSelectedCorner(matchState.activeCorner);
    }
  }, [matchState.activeCorner]);

  useEffect(() => {
    if (merahStats.finalScore !== prevMerahScore) {
      setFlashMerah(true);
      const timer = setTimeout(() => setFlashMerah(false), 1000);
      setPrevMerahScore(merahStats.finalScore);
      return () => clearTimeout(timer);
    }
  }, [merahStats.finalScore]);

  useEffect(() => {
    if (biruStats.finalScore !== prevBiruScore) {
      setFlashBiru(true);
      const timer = setTimeout(() => setFlashBiru(false), 1050);
      setPrevBiruScore(biruStats.finalScore);
      return () => clearTimeout(timer);
    }
  }, [biruStats.finalScore]);

  const formatMinSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isMatchSelesai = matchState.statusPertandingan === 'SELESAI' || !!matchState.umumkanPemenang;
  const pemenangName = matchState.pemenang === 'MERAH' ? (matchState.atlitMerah?.nama || 'ATLIT MERAH') : (matchState.atlitBiru?.nama || 'ATLIT BIRU');
  const pemenangKontingen = matchState.pemenang === 'MERAH' ? (matchState.atlitMerah?.kontingen || '') : (matchState.atlitBiru?.kontingen || '');

  const isTunggalOrRegu = true;

  // State values for selected corner in Tunggal / Regu
  const currentAthlete = selectedCorner === 'MERAH' ? matchState.atlitMerah : matchState.atlitBiru;
  const sScoresSelected = matchState.seniScores[selectedCorner];
  const jCountSelected = matchState.jumlahJuri || 10;
  const catSelected = matchState.kategoriSeni || 'TUNGGAL';

  const judgesListSelected = [];
  for (let i = 1; i <= jCountSelected; i++) {
    const jScoreObj = sScoresSelected.juriScores[i] || {
      juriId: i,
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
    const scoreVal = calculateSeniScoreForJuri(catSelected, jScoreObj);
    judgesListSelected.push({
      juriId: i,
      score: scoreVal
    });
  }

  const sortedJudgesSelected = [...judgesListSelected].sort((a, b) => a.score - b.score);

  const middleIndicesSelected: number[] = [];
  const lenSelected = sortedJudgesSelected.length;
  if (lenSelected > 0) {
    if (lenSelected % 2 === 0) {
      middleIndicesSelected.push(Math.floor(lenSelected / 2) - 1);
      middleIndicesSelected.push(Math.floor(lenSelected / 2));
    } else {
      middleIndicesSelected.push(Math.floor(lenSelected / 2));
    }
  }

  const medianValueSelected = (() => {
    const scoresOnly = sortedJudgesSelected.map(j => j.score);
    if (scoresOnly.length === 0) return 0;
    if (scoresOnly.length % 2 === 0) {
      return (scoresOnly[scoresOnly.length / 2 - 1] + scoresOnly[scoresOnly.length / 2]) / 2;
    } else {
      return scoresOnly[Math.floor(scoresOnly.length / 2)];
    }
  })();

  const penaltyValueSelected = calculateSeniHukumanTotal(sScoresSelected.hukumanLog);
  const totalValueSelected = Math.max(0, medianValueSelected - penaltyValueSelected);

  const stdDevValueSelected = calculateSeniStandardDeviation(
    matchState.kategoriSeni || 'TUNGGAL',
    matchState.seniScores?.[selectedCorner],
    matchState.jumlahJuri || 10,
    selectedCorner
  );

  const elapsedSeconds = matchState.timer2Value || 0;
  const performanceTimeSelected = formatMinSec(elapsedSeconds);

  const finishedJudgesCount = (() => {
    const jCount = matchState.jumlahJuri || 10;
    const sScores = matchState.seniScores[selectedCorner];
    if (!sScores || !sScores.juriScores) return 0;
    let count = 0;
    for (let i = 1; i <= jCount; i++) {
      const jScoreObj = sScores.juriScores[i];
      if (jScoreObj && jScoreObj.isLocked) {
        count++;
      }
    }
    return count;
  })();

  const isAllJudgesFinished = (() => {
    const jCount = matchState.jumlahJuri || 10;
    return finishedJudgesCount >= jCount;
  })();

  const showTimer = !isAllJudgesFinished;

  const getStdDev = (corner: 'MERAH' | 'BIRU') => {
    return calculateSeniStandardDeviation(
      matchState.kategoriSeni || 'TUNGGAL',
      matchState.seniScores?.[corner],
      matchState.jumlahJuri || 10,
      corner
    );
  };

  const formatPenalty = (val: number) => {
    return val > 0 ? `-${val.toFixed(2)}` : "0.00";
  };

  const renderFlag = (kontingen: string) => {
    const kClean = kontingen ? kontingen.toUpperCase() : '';
    if (kClean.includes('INDONESIA') || kClean.includes('INA') || kClean.includes('DKI') || kClean.includes('JAWA') || kClean.includes('JABAR') || kClean.includes('JATENG') || kClean.includes('JATIM') || kClean.includes('BALI') || kClean.includes('SUMATERA') || kClean.includes('PAPUA') || kClean.includes('SULAWESI') || kClean.includes('KALIMANTAN') || kClean.includes('SULSEL') || kClean.includes('ACEH') || kClean.includes('MEDAN')) {
      return (
        <svg viewBox="0 0 60 40" className="w-14 h-9 shadow-sm border border-slate-300 inline-block rounded-sm">
          <rect width="60" height="20" fill="#E31D1C" />
          <rect y="20" width="60" height="20" fill="#FFFFFF" />
        </svg>
      );
    }
    if (kClean.includes('SINGAPORE') || kClean.includes('SGP') || kClean.includes('SIN')) {
      return (
        <svg viewBox="0 0 60 40" className="w-14 h-9 shadow-sm border border-slate-300 inline-block rounded-sm">
          <rect width="60" height="20" fill="#DF151A" />
          <rect y="20" width="60" height="20" fill="#FFFFFF" />
          <path d="M 6 5 A 5 5 0 0 0 11 13 A 5 5 0 0 1 6 5" fill="#FFFFFF" />
          <polygon points="13,4 14,7 17,7 15,9 16,12 13,10 10,12 11,9 9,7 12,7" fill="#FFFFFF" transform="scale(0.65)" />
        </svg>
      );
    }
    if (kClean.includes('MALAYSIA') || kClean.includes('MAS')) {
      return (
        <svg viewBox="0 0 60 40" className="w-14 h-9 shadow-sm border border-slate-300 inline-block rounded-sm">
          <rect width="60" height="40" fill="#FFFFFF" />
          {[...Array(14)].map((_, i) => (
            <rect key={i} y={(i * 40) / 14} width="60" height={40 / 14} fill={i % 2 === 0 ? '#E21A22' : '#FFFFFF'} />
          ))}
          <rect width="30" height="21" fill="#010066" />
          <path d="M 6 3 A 7 7 0 0 0 16 16 A 7 7 0 0 1 6 3" fill="#FFCC00" />
        </svg>
      );
    }
    if (kClean.includes('VIETNAM') || kClean.includes('VIE')) {
      return (
        <svg viewBox="0 0 60 40" className="w-14 h-9 shadow-sm border border-slate-300 inline-block rounded-sm">
          <rect width="60" height="40" fill="#DA251D" />
          <polygon points="30,12 32,18 38,18 33,21 35,27 30,23 25,27 27,21 22,18 28,18" fill="#FFFF00" />
        </svg>
      );
    }
    if (kClean.includes('THAILAND') || kClean.includes('THA')) {
      return (
        <svg viewBox="0 0 60 40" className="w-14 h-9 shadow-sm border border-slate-300 inline-block rounded-sm">
          <rect width="60" height="6.6" fill="#A51931" />
          <rect y="6.6" width="60" height="6.6" fill="#F4F5F7" />
          <rect y="13.2" width="60" height="13.2" fill="#2D2A4A" />
          <rect y="26.4" width="60" height="6.6" fill="#F4F5F7" />
          <rect y="33" width="60" height="7" fill="#A51931" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 60 40" className="w-14 h-9 shadow-sm border border-slate-200 inline-block rounded-sm bg-slate-100">
        <rect width="60" height="40" fill="#f1f5f9" />
        <polygon points="10,5 30,35 50,5" fill="none" stroke="#64748b" strokeWidth="2" />
        <circle cx="30" cy="18" r="4" fill="#3b82f6" />
      </svg>
    );
  };

  const renderBeautifulAvatar = (corner: 'BIRU' | 'MERAH') => {
    const isBlue = corner === 'BIRU';
    const ringColor = isBlue ? 'border-[#2563eb] ring-[#60a5fa]' : 'border-[#dc2626] ring-[#f87171]';
    return (
      <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 ${ringColor} overflow-hidden shadow-md flex items-center justify-center bg-gradient-to-tr from-slate-200 to-slate-100`}>
        <svg className={`w-14 h-14 ${isBlue ? 'text-blue-950' : 'text-red-950'} opacity-85`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A5,5 0 0,0 7,7A5,5 0 0,0 12,12A5,5 0 0,0 17,7A5,5 0 0,0 12,2M12,14C6.5,14 2,17.5 2,21H22C22,17.5 17.5,14 12,14Z" />
        </svg>
      </div>
    );
  };

  const renderWavingFlag = (kontingen: string, isLarge?: boolean) => {
    return (
      <div className={`relative shadow-md border border-slate-300 rounded-sm overflow-hidden inline-block transition-all ${isLarge ? 'scale-150 mx-4' : 'scale-110'}`}>
        {renderFlag(kontingen)}
        {/* Subtle realistic wave shadows inside flag */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/15 to-transparent mix-blend-multiply opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 opacity-50"></div>
      </div>
    );
  };

  const renderBeautifulAvatarCustom = (corner: 'BIRU' | 'MERAH', isLarge?: boolean) => {
    const isBlue = corner === 'BIRU';
    const ringColor = isBlue ? 'border-[#0052cc] ring-4 ring-blue-500/10' : 'border-[#df151a] ring-4 ring-red-500/10';
    // Use professional, clear headshot images as shown in the mockup
    const imgUrl = isBlue
      ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80'
      : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80';
    return (
      <div className={`relative ${isLarge ? 'w-32 h-32 md:w-36 md:h-36' : 'w-24 h-24'} rounded-full border-4 ${ringColor} overflow-hidden shadow-md flex items-center justify-center bg-slate-100 transition-all`}>
        <img
          src={imgUrl}
          alt={isBlue ? "Atlit Biru" : "Atlit Merah"}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  };

  const renderPoolLeaderboard = () => {
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

    const getTahapanOnly = (stage: string) => {
      if (!stage) return 'PENYISIHAN';
      const upper = stage.toUpperCase();
      const parts = upper.split('-');
      if (parts.length > 0) {
        return parts[0].trim();
      }
      return 'PENYISIHAN';
    };

    const activePool = (matchState.tahapPertandingan || (typeof window !== 'undefined' ? localStorage.getItem('silat_bagan_pool') : 'NONE') || 'POOL A').toUpperCase();
    const kategori = (matchState.kelas || matchState.kategoriSeni || 'TUNGGAL').toUpperCase();
    const usia = (matchState.kategoriUsia || 'REMAJA').toUpperCase();
    const gender = (matchState.gender || 'PUTRA').toUpperCase();

    const baseActivePool = getBasePool(activePool).toUpperCase();
    const targetTahapan = getTahapanOnly(activePool).toUpperCase();
    
    // Fetch and combine all pool athletes from registration, current match, and history
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
        const aTahapan = (a.tahapan || 'PENYISIHAN').toUpperCase().trim();
        
        const targetJurus = kategori.trim();
        const targetUsia = usia.trim();
        const targetGender = gender.trim();
        const targetPool = baseActivePool.replace('-', ' ');
        
        return (
          aSistem === 'POOL' &&
          aJurus === targetJurus &&
          aUsia === targetUsia &&
          aGender === targetGender &&
          aTahapan === targetTahapan &&
          (aPool === targetPool || targetPool.includes(aPool) || aPool.includes(targetPool) || getBasePool(aPool).toUpperCase() === targetPool)
        );
      });

      filteredRegistered.forEach((a: any) => {
        if (a.nama && a.nama !== '---') {
          uniqueAthletes.set(a.nama.toUpperCase().trim(), { nama: a.nama, kontingen: a.kontingen });
        }
      });

      // 2. Get from active match (matchState)
      const isPoolMatchCurrent = matchState.sistemTanding === 'POOL' || 
                                 (matchState.tahapPertandingan || '').toUpperCase().includes('POOL') ||
                                 matchState.atlitMerah?.nama === '---' ||
                                 matchState.atlitBiru?.nama === '---';
      if (isPoolMatchCurrent) {
        if (matchState.atlitBiru?.nama && matchState.atlitBiru?.nama !== '---') {
          uniqueAthletes.set(matchState.atlitBiru.nama.toUpperCase().trim(), matchState.atlitBiru);
        }
        if (matchState.atlitMerah?.nama && matchState.atlitMerah?.nama !== '---') {
          uniqueAthletes.set(matchState.atlitMerah.nama.toUpperCase().trim(), matchState.atlitMerah);
        }
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
                                 
        const baseHStage = getBasePool(hStage).toUpperCase();
        const hTahapan = getTahapanOnly(hStage).toUpperCase();
                                 
        if (
          isPoolMatchHist &&
          hKategori === kategori &&
          hUsia === usia &&
          hGender === gender &&
          hTahapan === targetTahapan &&
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
      console.error("Failed to load pool athletes", e);
    }
    
    // Find performance
    const findAthletePerformance = (athleteName: string) => {
      const cleanName = athleteName.toUpperCase().trim();
      
      // Check active
      const isMerahCurrent = (matchState.atlitMerah?.nama || '').toUpperCase().trim() === cleanName;
      const isBiruCurrent = (matchState.atlitBiru?.nama || '').toUpperCase().trim() === cleanName;
      
      if (isMerahCurrent || isBiruCurrent) {
        const corner = isMerahCurrent ? 'MERAH' : 'BIRU';
        const score = calculateFinalScore(corner, matchState);
        const kebenaran = calculateSeniKebenaranScore(corner, matchState);
        const hukuman = calculateSeniHukumanTotal(matchState.seniScores?.[corner]?.hukumanLog);
        const durasiTampil = corner === 'MERAH' ? (matchState.durasiTampilMERAH || 0) : (matchState.durasiTampilBIRU || 0);
        const stdev = calculateSeniStandardDeviation(kategori, matchState.seniScores?.[corner], matchState.jumlahJuri || 10, corner);
        const durasiBabak = matchState.durasiBabak || 180;
        
        const hasPerf = (matchState.statusPertandingan === 'SELESAI' || !!matchState.umumkanPemenang)
          ? true
          : (corner === 'MERAH' ? !!matchState.hasPerformedMERAH : !!matchState.hasPerformedBIRU);
        
        return {
          hasPerformed: hasPerf,
          isCurrentActive: true,
          score,
          kebenaran,
          hukuman,
          durasiTampil,
          stdev,
          durasiBabak,
          partai: matchState.partai,
          corner,
          record: matchState
        };
      }
      
      // Check history
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
          const baseHStage = getBasePool(hStage).toUpperCase();
          const baseActivePoolLocal = getBasePool(activePool).toUpperCase();
          
          const stageMatches = hStage.includes('POOL') || 
                               baseHStage === baseActivePoolLocal || 
                               baseActivePoolLocal.includes(baseHStage) || 
                               baseHStage.includes(baseActivePoolLocal);
                               
          return stageMatches && hKategori === kategori && hUsia === usia && hGender === gender;
        });

        // Fallback: search by name only if no strict record found
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
          const stdev = calculateSeniStandardDeviation(kategori, matchRecord.seniScores?.[corner], matchRecord.jumlahJuri || 10, corner);
          const durasiBabak = matchRecord.durasiBabak || 180;
          
          return {
            hasPerformed: true,
            score,
            kebenaran,
            hukuman,
            durasiTampil,
            stdev,
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
    
    // Sort
    const sortedRankedAthletes = [...rankedAthletes].sort((a, b) => {
      if (!a.hasPerformed && b.hasPerformed) return 1;
      if (a.hasPerformed && !b.hasPerformed) return -1;
      if (!a.hasPerformed && !b.hasPerformed) return 0;
      
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      
      // Tie break 1: Kebenaran Score
      if (b.kebenaran !== a.kebenaran) {
        return b.kebenaran - a.kebenaran;
      }
      
      // Tie break 2: Hukuman
      if (a.hukuman !== b.hukuman) {
        return a.hukuman - b.hukuman;
      }
      
      // Tie break 3: Durasi
      const targetA = a.durasiBabak || 180;
      const diffA = Math.abs(a.durasiTampil - targetA);
      const diffB = Math.abs(b.durasiTampil - targetA);
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      
      // Tie break 4: Stdev
      if (a.stdev !== b.stdev) {
        return a.stdev - b.stdev;
      }
      
      return 0;
    });
    
    // Assign ranks and tie break notes with proper tie/draw ranking
    let currentRank = 1;
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
          currentRank = idx + 1;
        }
      }
      return {
        ...ath,
        rank: currentRank,
        tieBreakNote: ''
      };
    });
    
    // Annotate tie breaks
    for (let i = 1; i < finalLeaderboard.length; i++) {
      const prev = finalLeaderboard[i - 1];
      const curr = finalLeaderboard[i];
      if (prev.hasPerformed && curr.hasPerformed && prev.score === curr.score) {
        if (prev.kebenaran > curr.kebenaran) {
          prev.tieBreakNote = `Unggul Kebenaran (${prev.kebenaran.toFixed(3)} vs ${curr.kebenaran.toFixed(3)})`;
        } else if (prev.hukuman < curr.hukuman) {
          prev.tieBreakNote = `Hukuman Lebih Rendah (${prev.hukuman.toFixed(2)} vs ${curr.hukuman.toFixed(2)})`;
        } else {
          const target = prev.durasiBabak || 180;
          const diffPrev = Math.abs(prev.durasiTampil - target);
          const diffCurr = Math.abs(curr.durasiTampil - target);
          if (diffPrev < diffCurr) {
            prev.tieBreakNote = `Waktu Lebih Dekat (${prev.durasiTampil}s vs ${curr.durasiTampil}s)`;
          } else if (prev.stdev < curr.stdev) {
            prev.tieBreakNote = `Deviasi Lebih Rendah (${prev.stdev.toFixed(4)} vs ${curr.stdev.toFixed(4)})`;
          }
        }
      }
    }
    
    const showJuaraPool = matchState.statusPertandingan === 'SELESAI' || !!matchState.umumkanPemenang;
    
    return (
      <div id="pool-leaderboard-screen" className={`w-full bg-gradient-to-br from-[#0c0018] via-[#08020e] to-[#01061c] text-white flex flex-col justify-between font-sans relative select-none transition-all duration-300 ${
        isFullscreen ? 'h-screen overflow-hidden p-8 md:p-12 xl:p-16' : 'min-h-screen overflow-visible p-4 md:p-6'
      }`}>
        <div className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] bg-[#4a0010]/25 rounded-full filter blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[600px] h-[600px] bg-[#001035]/30 rounded-full filter blur-[120px] pointer-events-none"></div>
        
        {/* Toggle & Fullscreen controls removed */}

        {/* HEADER */}
        <header className={`shrink-0 flex items-center justify-between bg-transparent select-none relative transition-all duration-300 ${
          isFullscreen ? 'px-10 py-6 mb-6' : 'px-6 py-4 mb-2'
        }`}>
          <div className="w-16 h-16 shrink-0 flex items-center justify-center">
            {matchState.logoKiri ? (
              <img src={matchState.logoKiri} alt="Logo Kiri" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <IPSIColoredLogo className="w-16 h-16" />
            )}
          </div>

          <div className={`flex-grow mx-8 bg-[#2d1154]/70 backdrop-blur-md border border-purple-500/30 rounded-xl relative py-4 px-12 shadow-lg`}>
            <div className="absolute left-1/2 -translate-x-1/2 -top-4">
              <div className="bg-[#120421] text-purple-200 rounded-full font-extrabold uppercase shadow-md flex items-center justify-center border border-purple-500/40 px-14 py-1 text-xs tracking-[0.3em]">
                SISTEM POOL PENCAK SILAT
              </div>
            </div>

            <div className="grid grid-cols-3 items-center text-center font-black text-white">
              <div className="text-xl md:text-2xl uppercase tracking-wide text-left">{getBasePool(activePool)}</div>
              <div className="text-xl md:text-2xl uppercase tracking-wide text-center">{usia} {gender}</div>
              <div className="text-xl md:text-2xl uppercase tracking-wide text-right">{kategori}</div>
            </div>
          </div>

          <div className="w-16 h-16 shrink-0 flex items-center justify-center">
            {matchState.logoKanan ? (
              <img src={matchState.logoKanan} alt="Logo Kanan" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <PERSILATColoredLogo className="w-16 h-16" />
            )}
          </div>
        </header>

        {/* LEADERBOARD MAIN */}
        <main className={`flex-grow flex flex-col justify-start items-center w-full transition-all duration-300 ${
          isFullscreen ? 'px-8 max-w-none gap-6 py-4' : 'px-4 max-w-7xl mx-auto gap-4'
        }`}>
          {/* BANNER REVEAL */}
          <div className="text-center space-y-1 my-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 uppercase drop-shadow-[0_4px_12px_rgba(234,179,8,0.25)]">
              {showJuaraPool ? "🏆 PENGUMUMAN JUARA POOL 🏆" : "⏱️ KLASEMEN SEMENTARA POOL ⏱️"}
            </h1>
            <p className="text-xs md:text-sm text-purple-200 font-mono tracking-wider uppercase">
              {showJuaraPool ? "Seluruh Atlit Selesai Tampil - Hasil Akhir Resmi" : "Pertandingan Berlangsung - Urutan Berdasarkan Poin & Aturan Seri"}
            </p>
          </div>

          {/* TABLE */}
          <div className="bg-[#140624]/55 backdrop-blur-md border border-purple-500/20 w-full rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 md:p-8 flex-grow overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-purple-500/25 text-purple-300 text-xs md:text-sm uppercase font-black tracking-wider">
                  <th className="p-3 text-center w-16">RANK</th>
                  <th className="p-3">NAMA ATLIT</th>
                  <th className="p-3">KONTINGEN</th>
                  <th className="p-3 text-center">NILAI KEBENARAN</th>
                  <th className="p-3 text-center">HUKUMAN</th>
                  <th className="p-3 text-center">DURASI</th>
                  <th className="p-3 text-center">STD DEV</th>
                  <th className="p-3 text-right">TOTAL SKOR</th>
                  <th className="p-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-950/40">
                {finalLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-mono text-sm">
                      Belum ada data atlit yang terdaftar atau tampil pada pool ini.
                    </td>
                  </tr>
                ) : (
                  finalLeaderboard.map((ath, idx) => {
                    const isJuara1 = ath.rank === 1 && ath.hasPerformed;
                    const isJuara2 = ath.rank === 2 && ath.hasPerformed;
                    const isJuara3 = ath.rank === 3 && ath.hasPerformed;
                    
                    const formatDuration = (sec: number) => {
                      const mins = Math.floor(sec / 60);
                      const secs = sec % 60;
                      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    };
                    
                    return (
                      <tr 
                        key={idx} 
                        className={`transition-all duration-150 ${
                          isJuara1 ? 'bg-amber-950/20 font-bold border-l-4 border-amber-500' :
                          isJuara2 ? 'bg-slate-900/20 font-bold border-l-4 border-slate-400' :
                          isJuara3 ? 'bg-yellow-950/10 font-bold border-l-4 border-amber-700' :
                          'hover:bg-purple-950/10'
                        }`}
                      >
                        {/* RANK BADGE */}
                        <td className="p-3 text-center">
                          {ath.hasPerformed ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-mono text-sm font-black ${
                              isJuara1 ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 ring-2 ring-yellow-300' :
                              isJuara2 ? 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 ring-2 ring-slate-200' :
                              isJuara3 ? 'bg-gradient-to-r from-amber-600 to-amber-800 text-white ring-2 ring-amber-500' :
                              'bg-purple-950/40 text-purple-300'
                            }`}>
                              {ath.rank}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </td>

                        {/* NAME */}
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className={`uppercase font-black tracking-wide text-xs md:text-sm ${
                              isJuara1 ? 'text-amber-300' : 'text-white'
                            }`}>
                              {ath.nama}
                            </span>
                            {ath.tieBreakNote && (
                              <span className="text-[10px] text-amber-400/80 font-mono italic">
                                * {ath.tieBreakNote}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* KONTINGEN */}
                        <td className="p-3 uppercase font-extrabold text-xs md:text-sm text-purple-200/95">
                          {ath.kontingen}
                        </td>

                        {/* DETAILS: KEBENARAN */}
                        <td className="p-3 text-center font-mono text-xs md:text-sm text-slate-300">
                          {ath.hasPerformed || ath.isCurrentActive ? ath.kebenaran.toFixed(3) : '-'}
                        </td>

                        {/* DETAILS: HUKUMAN */}
                        <td className="p-3 text-center font-mono text-xs md:text-sm text-red-400">
                          {ath.hasPerformed || ath.isCurrentActive ? (ath.hukuman > 0 ? `-${ath.hukuman.toFixed(2)}` : '0.00') : '-'}
                        </td>

                        {/* DETAILS: DURASI */}
                        <td className="p-3 text-center font-mono text-xs md:text-sm text-slate-300">
                          {ath.hasPerformed || ath.isCurrentActive ? formatDuration(ath.durasiTampil) : '-'}
                        </td>

                        {/* DETAILS: STD DEV */}
                        <td className="p-3 text-center font-mono text-[10px] md:text-xs text-slate-400">
                          {ath.hasPerformed || ath.isCurrentActive ? ath.stdev.toFixed(4) : '-'}
                        </td>

                        {/* TOTAL SKOR */}
                        <td className="p-3 text-right">
                          {ath.hasPerformed || ath.isCurrentActive ? (
                            <span className={`font-mono font-black text-sm md:text-base lg:text-lg ${
                              isJuara1 ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400 drop-shadow' :
                              'text-cyan-300'
                            }`}>
                              {ath.score.toFixed(3)}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">-</span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                            ath.hasPerformed ? 'bg-green-950/40 text-green-400 border border-green-500/20' : 
                            ath.isCurrentActive ? 'bg-blue-950/50 text-blue-400 border border-blue-500/30 animate-pulse' :
                            'bg-slate-900/60 text-slate-500'
                          }`}>
                            {ath.hasPerformed ? "Selesai" : ath.isCurrentActive ? "Sedang Tampil" : "Belum Tampil"}
                          </span>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>

        {/* FOOTER */}
        <footer className={`shrink-0 flex items-center justify-between border-t border-purple-950/60 bg-[#120421]/20 mt-4 ${
          isFullscreen ? 'px-12 py-4 text-sm md:text-lg font-bold' : 'px-8 py-2 md:py-2.5 text-xs md:text-sm'
        }`}>
          <span>{currentDateTime}</span>
          <span className="uppercase font-bold tracking-widest text-purple-100 font-sans">
            NO DISCORS PENCAK SILAT - Versi 3.0
          </span>
          <span className="w-10"></span>
        </footer>
      </div>
    );
  };

  const renderVictoryDisplay = () => {
    const pemenangCorner = matchState.pemenang || 'BIRU';
    const isPemenangBiru = pemenangCorner === 'BIRU';
    
    const blueName = matchState.atlitBiru?.nama || 'BENNY G. SUMARSONO';
    const blueTeam = matchState.atlitBiru?.kontingen || 'INDONESIA';
    const redName = matchState.atlitMerah?.nama || 'SHEIK ALAUDDIN';
    const redTeam = matchState.atlitMerah?.kontingen || 'SINGAPORE';

    const stdDevB = getStdDev('BIRU');
    const stdDevR = getStdDev('MERAH');

    const perfTimeB = matchState.durasiTampilBIRU || 180;
    const perfTimeR = matchState.durasiTampilMERAH || 177;

    const formatDuration = (totalSeconds: number) => {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, '0')} : ${seconds.toString().padStart(2, '0')}`;
    };

    const penaltyB = biruStats.hukuman.toFixed(2);
    const penaltyR = merahStats.hukuman.toFixed(2);

    const winPointB = calculateFinalScore('BIRU', matchState).toFixed(3);
    const winPointR = calculateFinalScore('MERAH', matchState).toFixed(3);

    return (
      <div id="victory-scoreboard-screen" className={`w-full bg-gradient-to-br from-[#0c0018] via-[#08020e] to-[#01061c] text-white flex flex-col justify-between font-sans relative select-none transition-all duration-300 ${
        isFullscreen ? 'h-screen overflow-hidden p-8 md:p-12 xl:p-16' : 'min-h-screen overflow-visible p-4 md:p-6'
      }`}>
        {/* Background Glowing Ambient Orbs */}
        <div className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] bg-[#4a0010]/25 rounded-full filter blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[600px] h-[600px] bg-[#001035]/30 rounded-full filter blur-[120px] pointer-events-none"></div>
        
        {/* HEADER: DEEP PURPLE HEADER BAR RUNNING ACROSS WITH CENTRAL BADGE AND SIDE LOGOS */}
        <header className={`shrink-0 flex items-center justify-between bg-transparent select-none relative transition-all duration-300 ${
          isFullscreen ? 'px-10 py-6 mb-6' : 'px-6 py-4 mb-2'
        }`}>
          {/* IPSI EMBLEM (LEFT) */}
          <div className={`flex items-center justify-center shrink-0 transition-all duration-300 ${
            isFullscreen ? 'w-24 h-24' : 'w-16 h-16'
          }`}>
            {matchState.logoKiri ? (
              <img
                src={matchState.logoKiri}
                alt="Logo Kiri"
                className={`object-contain ${isFullscreen ? 'w-24 h-24' : 'w-16 h-16'}`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <IPSIColoredLogo className={isFullscreen ? 'w-24 h-24' : 'w-16 h-16'} />
            )}
          </div>

          {/* MAIN DEEP-PURPLE BAR */}
          <div className={`flex-grow mx-8 bg-[#2d1154]/70 backdrop-blur-md border border-purple-500/30 rounded-xl relative grid grid-cols-3 items-center shadow-lg transition-all duration-300 ${
            isFullscreen ? 'py-6 px-16' : 'py-4 px-12'
          }`}>
            {/* PENCAK SILAT PILLED HEADER CENTER */}
            <div className={`absolute left-1/2 -translate-x-1/2 transition-all duration-300 ${
              isFullscreen ? '-top-5' : '-top-4'
            }`}>
              <div className={`bg-[#120421] text-purple-200 rounded-full font-extrabold uppercase shadow-md flex items-center justify-center border border-purple-500/40 transition-all duration-300 ${
                isFullscreen ? 'px-20 py-2 text-base tracking-[0.35em]' : 'px-14 py-1 text-xs tracking-[0.3em]'
              }`}>
                PENCAK SILAT
              </div>
            </div>

            {/* THREE COLUMNS */}
            <div className={`font-black text-white text-left tracking-wide font-sans transition-all duration-300 ${
              isFullscreen ? 'text-4xl lg:text-5xl xl:text-5xl' : 'text-3xl lg:text-4xl'
            }`}>
              {(() => {
                const p = (matchState.partai || 'A - 2').trim();
                if (isPoolSystem) {
                  return p.toUpperCase().startsWith('TAMPIL') ? p.toUpperCase() : `TAMPIL ${p}`;
                }
                return p.toUpperCase().startsWith('PARTAI') ? p : `PARTAI ${p}`;
              })()}
            </div>
            <div className={`font-black text-white text-center tracking-wider font-sans transition-all duration-300 ${
              isFullscreen ? 'text-4xl lg:text-5xl xl:text-5xl' : 'text-3xl lg:text-4xl'
            }`}>
              {matchState.tahapPertandingan || 'FINAL'}
            </div>
            <div className={`font-black text-white text-right tracking-wide font-sans transition-all duration-300 ${
              isFullscreen ? 'text-4xl lg:text-5xl xl:text-5xl' : 'text-3xl lg:text-4xl'
            }`}>
              {matchState.kelas || matchState.kategoriSeni || 'TUNGGAL'}
            </div>
          </div>

          {/* PERSILAT EMBLEM (RIGHT) */}
          <div className={`flex items-center justify-center shrink-0 transition-all duration-300 ${
            isFullscreen ? 'w-24 h-24' : 'w-16 h-16'
          }`}>
            {matchState.logoKanan ? (
              <img
                src={matchState.logoKanan}
                alt="Logo Kanan"
                className={`object-contain ${isFullscreen ? 'w-24 h-24' : 'w-16 h-16'}`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <PERSILATColoredLogo className={isFullscreen ? 'w-24 h-24' : 'w-16 h-16'} />
            )}
          </div>
        </header>

        {/* MAIN BODY: ATHLETES & SCORECARD GRID */}
        <main className={`flex-grow flex flex-col justify-center items-center my-auto w-full transition-all duration-300 ${
          isFullscreen ? 'px-8 max-w-none gap-6 py-4' : 'px-4 max-w-7xl mx-auto gap-2'
        }`}>
          
          {/* ATHLETES DISPLAY ROW - SPECTACULAR TRANSPARENT NAVY BLUE & MAROON RED GRADIENT BANNER WITH BLUR EFFECT */}
          <div className={`grid grid-cols-12 gap-4 items-center w-full bg-gradient-to-r from-[#001035]/65 via-[#1a0833]/60 to-[#4a0010]/65 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-[0_12px_40px_0_rgba(168,85,247,0.2)] relative z-10 transition-all duration-300 ${
            isFullscreen ? 'py-8 px-12 md:py-10 md:px-14' : 'py-6 px-8'
          }`}>
            
            {/* BLUE ATHLETE (LEFT) */}
            <div className="col-span-12 md:col-span-5 flex items-center gap-5 py-2">
              <div className="flex flex-col text-left">
                <span className={`font-bold text-purple-300/80 uppercase tracking-wide leading-none pb-1 transition-all duration-300 ${
                  isFullscreen ? 'text-lg md:text-xl' : 'text-sm md:text-base'
                }`}>
                  {blueName}
                </span>
                <span className={`font-black text-blue-400 uppercase tracking-wider mt-0.5 drop-shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all duration-300 ${
                  isFullscreen ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-2xl md:text-3xl lg:text-4xl'
                }`}>
                  {blueTeam}
                </span>
              </div>
            </div>

            {/* WINNER MIDDLE COLUMN */}
            <div className={`col-span-12 md:col-span-2 flex flex-col items-center justify-center text-center bg-purple-950/45 backdrop-blur-sm border border-purple-500/20 px-4 rounded-xl transition-all duration-300 ${
              isFullscreen ? 'py-6 px-8' : 'py-2 md:py-3'
            }`}>
              <span className={`text-purple-300 font-extrabold uppercase tracking-[0.25em] transition-all duration-300 ${
                isFullscreen ? 'text-sm' : 'text-[10px]'
              }`}>PEMENANG</span>
              <span className={`font-black uppercase tracking-wider leading-none mt-1 transition-all duration-300 ${
                isPemenangBiru ? 'text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              } ${
                isFullscreen ? 'text-3xl md:text-4xl lg:text-4xl' : 'text-2xl md:text-3xl'
              }`}>
                {pemenangCorner === 'BIRU' ? 'BIRU' : 'MERAH'}
              </span>
            </div>

            {/* RED ATHLETE (RIGHT) */}
            <div className="col-span-12 md:col-span-5 flex items-center justify-end gap-5 py-2 text-right">
              <div className="flex flex-col text-right">
                <span className={`font-bold text-purple-300/80 uppercase tracking-wide leading-none pb-1 transition-all duration-300 ${
                  isFullscreen ? 'text-lg md:text-xl' : 'text-sm md:text-base'
                }`}>
                  {redName}
                </span>
                <span className={`font-black text-red-400 uppercase tracking-wider mt-0.5 drop-shadow-[0_0_12px_rgba(239,68,68,0.3)] transition-all duration-300 ${
                  isFullscreen ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-2xl md:text-3xl lg:text-4xl'
                }`}>
                  {redTeam}
                </span>
              </div>
            </div>

          </div>

          {/* TABLE COMPARISON CONTAINER */}
          <div className={`bg-[#140624]/55 backdrop-blur-md border border-purple-500/20 w-full rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative z-10 transition-all duration-300 ${
            isFullscreen ? 'p-6 md:p-8 xl:p-10 max-w-none flex-grow flex flex-col justify-center' : 'p-5 max-w-6xl'
          }`}>
            
            <div className="w-full overflow-hidden">
              <table style={{ borderCollapse: 'separate', borderSpacing: isFullscreen ? '6px' : '3px', width: '100%' }} className="w-full text-center">
                <thead>
                  <tr>
                    <th style={{ backgroundColor: 'rgba(88, 28, 135, 0.4)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: isFullscreen ? '16px 20px' : '8px 14px', fontWeight: 'bold', textTransform: 'uppercase', color: '#e9d5ff', width: '34%', fontSize: isFullscreen ? '20px' : '' }} className="text-xs md:text-sm uppercase tracking-wider">
                      DETAIL POIN
                    </th>
                    <th colSpan={3} style={{ backgroundColor: 'rgba(88, 28, 135, 0.4)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: isFullscreen ? '16px 20px' : '8px 14px', fontWeight: 'bold', textTransform: 'uppercase', color: '#e9d5ff', fontSize: isFullscreen ? '20px' : '' }} className="text-xs md:text-sm uppercase tracking-wider">
                      HASIL SKOR
                    </th>
                  </tr>
                  <tr>
                    <th style={{ border: 'none', height: '0px', padding: '0px' }}></th>
                    <th style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.45) 0%, rgba(30, 58, 138, 0.2) 100%)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.4)', padding: isFullscreen ? '12px 16px' : '6px 10px', fontWeight: 'extrabold', textTransform: 'uppercase', width: '31%', fontSize: isFullscreen ? '22px' : '' }} className="text-xs md:text-sm tracking-wider">
                      BIRU
                    </th>
                    <th style={{ border: 'none', width: '4%' }}></th>
                    <th style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.45) 0%, rgba(127, 29, 29, 0.2) 100%)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)', padding: isFullscreen ? '12px 16px' : '6px 10px', fontWeight: 'extrabold', textTransform: 'uppercase', width: '31%', fontSize: isFullscreen ? '22px' : '' }} className="text-xs md:text-sm tracking-wider">
                      MERAH
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Standard Deviation */}
                  <tr>
                    <td style={{ textAlign: 'left', paddingLeft: isFullscreen ? '40px' : '20px', fontWeight: 'bold', color: '#e2e8f0', border: '1px solid rgba(168, 85, 247, 0.2)', backgroundColor: 'rgba(88, 28, 135, 0.15)', height: isFullscreen ? '70px' : '40px', fontSize: isFullscreen ? '20px' : '' }} className="text-xs md:text-sm uppercase tracking-wide">
                      STANDAR DEVIASI
                    </td>
                    <td style={{ fontSize: isFullscreen ? '22px' : '14px', fontWeight: 'bold', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)', backgroundColor: 'rgba(30, 58, 138, 0.2)' }}>
                      {stdDevB.toFixed(9)}
                    </td>
                    <td style={{ border: 'none' }}></td>
                    <td style={{ fontSize: isFullscreen ? '22px' : '14px', fontWeight: 'bold', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(127, 29, 29, 0.2)' }}>
                      {stdDevR.toFixed(9)}
                    </td>
                  </tr>

                  {/* Row 2: Performance Time */}
                  <tr>
                    <td style={{ textAlign: 'left', paddingLeft: isFullscreen ? '40px' : '20px', fontWeight: 'bold', color: '#e2e8f0', border: '1px solid rgba(168, 85, 247, 0.2)', backgroundColor: 'rgba(88, 28, 135, 0.15)', height: isFullscreen ? '70px' : '40px', fontSize: isFullscreen ? '20px' : '' }} className="text-xs md:text-sm uppercase tracking-wide">
                      WAKTU TAMPIL
                    </td>
                    <td style={{ fontSize: isFullscreen ? '22px' : '14px', fontWeight: 'bold', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)', backgroundColor: 'rgba(30, 58, 138, 0.2)' }}>
                      {formatDuration(perfTimeB)}
                    </td>
                    <td style={{ border: 'none' }}></td>
                    <td style={{ fontSize: isFullscreen ? '22px' : '14px', fontWeight: 'bold', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(127, 29, 29, 0.2)' }}>
                      {formatDuration(perfTimeR)}
                    </td>
                  </tr>

                  {/* Row 3: Penalty */}
                  <tr>
                    <td style={{ textAlign: 'left', paddingLeft: isFullscreen ? '40px' : '20px', fontWeight: 'bold', color: '#e2e8f0', border: '1px solid rgba(168, 85, 247, 0.2)', backgroundColor: 'rgba(88, 28, 135, 0.15)', height: isFullscreen ? '70px' : '40px', fontSize: isFullscreen ? '20px' : '' }} className="text-xs md:text-sm uppercase tracking-wide">
                      HUKUMAN
                    </td>
                    <td style={{ fontSize: isFullscreen ? '22px' : '14px', fontWeight: 'bold', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)', backgroundColor: 'rgba(30, 58, 138, 0.2)' }}>
                      {penaltyB}
                    </td>
                    <td style={{ border: 'none' }}></td>
                    <td style={{ fontSize: isFullscreen ? '22px' : '14px', fontWeight: 'bold', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(127, 29, 29, 0.2)' }}>
                      {penaltyR}
                    </td>
                  </tr>

                  {/* Row 4: Winning Point */}
                  <tr>
                    <td style={{ textAlign: 'left', paddingLeft: isFullscreen ? '40px' : '20px', fontWeight: 'extrabold', color: '#ffffff', border: '1px solid rgba(168, 85, 247, 0.3)', backgroundColor: 'rgba(88, 28, 135, 0.3)', height: isFullscreen ? '90px' : '52px', fontSize: isFullscreen ? '22px' : '' }} className="text-xs md:text-sm uppercase tracking-wide">
                      NILAI KEMENANGAN
                    </td>
                    <td style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.45) 0%, rgba(30, 58, 138, 0.2) 100%)', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '6px' }}>
                      <div className="flex items-center justify-center">
                        <div style={{ padding: isFullscreen ? '8px 36px' : '4px 24px', border: 'none', backgroundColor: 'transparent', color: '#60a5fa', fontWeight: '900', fontSize: isFullscreen ? '36px' : '22px', letterSpacing: '0.05em' }} className="min-w-[130px] md:min-w-[180px]">
                          {winPointB}
                        </div>
                      </div>
                    </td>
                    <td style={{ border: 'none', fontSize: isFullscreen ? '24px' : '18px', fontWeight: 'bold', color: '#c084fc' }}>
                      -
                    </td>
                    <td style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.45) 0%, rgba(127, 29, 29, 0.2) 100%)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '6px' }}>
                      <div className="flex items-center justify-center">
                        <div style={{ padding: isFullscreen ? '8px 36px' : '4px 24px', border: 'none', backgroundColor: 'transparent', color: '#f87171', fontWeight: '900', fontSize: isFullscreen ? '36px' : '22px', letterSpacing: '0.05em' }} className="min-w-[130px] md:min-w-[180px]">
                          {winPointR}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </main>

        {/* FOOTER BAR: BRANDING & CURRENT LIVE DATE-TIME */}
        <footer className={`shrink-0 bg-[#1e1135]/80 backdrop-blur-md text-purple-200 flex items-center justify-between mt-2 font-sans select-none rounded-xl border border-purple-500/20 shadow-md relative z-10 transition-all duration-300 ${
          isFullscreen ? 'px-12 py-4 text-sm md:text-lg font-bold' : 'px-8 py-2 md:py-2.5 text-xs md:text-sm font-semibold tracking-wider font-sans'
        }`}>
          <span>{currentDateTime}</span>
          <span className={`uppercase font-bold tracking-widest text-purple-100 drop-shadow-sm font-sans transition-all duration-300 ${
            isFullscreen ? 'text-sm md:text-base' : 'text-[11px] md:text-xs'
          }`}>
            NO DISCORS PENCAK SILAT - Versi 3.0
          </span>
          <span className="w-10"></span>
        </footer>

      </div>
    );
  };

  if (isPoolSystem && viewMode === 'POOL_STANDINGS' && isMatchSelesai && matchState.umumkanPemenang) {
    return renderPoolLeaderboard();
  }

  if (isMatchSelesai && matchState.pemenang && matchState.umumkanPemenang && !forceReview) {
    if (isPoolSystem) {
      return renderPoolLeaderboard();
    }
    return renderVictoryDisplay();
  }

  if (isTunggalOrRegu) {
    return (
      <div 
        id="live-monitor-seni-screen" 
        className={`w-full flex flex-col bg-gradient-to-br from-[#1d0a3d] via-[#0b041a] to-[#01122a] text-slate-100 select-none font-sans relative justify-between ${
          isFullscreen 
            ? "h-screen overflow-hidden p-3 md:p-4" 
            : "min-h-screen overflow-visible p-4 md:p-6"
        }`}
      >
        
        {/* Floating Top Controls */}
        {isPoolSystem && isMatchSelesai && matchState.umumkanPemenang && (
          <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
            <button
              onClick={() => setViewMode('POOL_STANDINGS')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg cursor-pointer border border-amber-400/30 backdrop-blur shadow flex items-center gap-1.5 transition-all text-xs uppercase"
            >
              🏆 Klasemen Pool
            </button>
          </div>
        )}
        
        {forceReview && isMatchSelesai && matchState.pemenang && matchState.umumkanPemenang && (
          <div className="relative z-50 shrink-0 bg-[#0052cc] text-white font-bold p-3 text-center flex items-center justify-between shadow-lg px-6 rounded-md mb-4 border border-blue-400 animate-pulse">
            <span className="text-sm tracking-wide uppercase">Mode Tinjauan: Hasil Pertandingan Resmi Telah Diumumkan</span>
            <button
              onClick={() => setForceReview(false)}
              className="px-4 py-1.5 bg-white text-[#0052cc] rounded-lg hover:bg-slate-100 font-extrabold tracking-widest text-[11px] shadow cursor-pointer transition-all uppercase"
            >
              Kembali ke Layar Pemenang →
            </button>
          </div>
        )}

        {/* Decorative colored radial background glow */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-500/15 rounded-full filter blur-[130px] pointer-events-none select-none z-0"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-blue-500/15 rounded-full filter blur-[130px] pointer-events-none select-none z-0"></div>

        {/* HEADER: MASSIVE PB IPSI SPECTACLE BAR LIGHT SYSTEM */}
        <header className={`relative z-10 shrink-0 bg-slate-900/40 p-4 rounded-none border border-purple-900/60 backdrop-blur-md flex items-center justify-between shadow-2xl h-24 transition-all duration-300 ${
          isFullscreen ? 'mb-2' : 'mb-6'
        }`}>
          
          {/* Left Logo Badge */}
          <div className="w-16 h-16 flex items-center justify-center shrink-0">
            {matchState.logoKiri ? (
              <img
                src={matchState.logoKiri}
                alt="Logo Kiri"
                className="w-16 h-16 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <IPSIColoredLogo className="w-16 h-16" />
            )}
          </div>

          {/* Three Giant Columns */}
          {isPoolSystem ? (
            <div className="flex-1 text-center px-4 font-black select-none text-white text-2xl md:text-3xl lg:text-4xl xl:text-5xl drop-shadow-[1px_1px_2px_rgba(0,0,0,0.55)] uppercase tracking-widest font-sans whitespace-pre">
              {(() => {
                const p = (matchState.partai || '2').trim();
                const tampilStr = p.toUpperCase().startsWith('TAMPIL') ? p.toUpperCase() : `TAMPIL ${p}`;
                
                const getPoolNameOnly = (tahap: string) => {
                  if (!tahap) return 'POOL A';
                  const parts = tahap.split('-');
                  const foundPool = parts.find(p => p.toUpperCase().includes('POOL'));
                  if (foundPool) return foundPool.trim().toUpperCase();
                  return parts[0].trim().toUpperCase();
                };
                
                const poolStr = getPoolNameOnly(matchState.tahapPertandingan || 'POOL A');
                
                const jurusSeni = (matchState.kategoriSeni === "SOLO_KREATIF" ? "TUNGGAL BEBAS" : matchState.kelas || matchState.kategoriSeni || "TUNGGAL").toUpperCase();
                const genderStr = (matchState.gender || "PUTRA").toUpperCase();
                
                return `${tampilStr} | ${poolStr} | ${jurusSeni} ${genderStr}`;
              })()}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-3 text-center px-4 font-black select-none">
              {/* Arena - Partai */}
              <div className="text-white text-3xl md:text-4xl lg:text-5xl drop-shadow-[1px_1px_2px_rgba(0,0,0,0.55)] uppercase tracking-wider">
                {(() => {
                  const p = (matchState.partai || 'A-2').trim();
                  if (isPoolSystem) {
                    return p.toUpperCase().startsWith('TAMPIL') ? p.toUpperCase() : `TAMPIL ${p}`;
                  }
                  return p.toUpperCase().startsWith('PARTAI') ? p : `PARTAI ${p}`;
                })()}
              </div>
              {/* Tahap Pertandingan */}
              <div className="text-white text-3xl md:text-4xl lg:text-5xl drop-shadow-[1px_1px_2px_rgba(0,0,0,0.55)] uppercase tracking-wider">
                {matchState.tahapPertandingan || 'PENYISIHAN'}
              </div>
              {/* Kategori Seni */}
              <div className="text-white text-3xl md:text-4xl lg:text-5xl drop-shadow-[1px_1px_2px_rgba(0,0,0,0.55)] uppercase tracking-wider">
                {matchState.kelas || matchState.kategoriSeni || 'TUNGGAL'}
              </div>
            </div>
          )}

          {/* Right Logo Badge */}
          <div className="w-16 h-16 flex items-center justify-center shrink-0">
            {matchState.logoKanan ? (
              <img
                src={matchState.logoKanan}
                alt="Logo Kanan"
                className="w-16 h-16 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <PERSILATColoredLogo className="w-16 h-16" />
            )}
          </div>
        </header>

         {/* MAIN BODY AREA */}
        <main className={`relative z-10 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 select-none transition-all duration-300 ${
          isFullscreen ? 'items-stretch my-2' : 'items-center my-auto'
        }`}>
          
          {/* LEFT COLUMN: ATHLETE IDENTITY CARD (5/12 cols or 4/12 in fullscreen) */}
          <section className={`flex flex-col justify-between items-start text-left relative overflow-hidden transition-all duration-300 w-full backdrop-blur-md rounded-none ${
            selectedCorner === 'BIRU'
              ? 'bg-gradient-to-r from-blue-600/85 via-blue-900/40 to-slate-900/10 shadow-[0_10px_35px_rgba(30,58,138,0.25)]'
              : 'bg-gradient-to-r from-red-600/85 via-red-900/40 to-slate-900/10 shadow-[0_10px_35px_rgba(127,29,29,0.25)]'
          } ${
            isFullscreen ? 'p-10 lg:col-span-4 h-full lg:h-full lg:min-h-[460px] pb-12 pt-8' : 'p-6 h-full min-h-[300px] lg:col-span-5 pb-8 pt-6'
          }`}>
            
            {/* Giant Watermark background text positioned absolutely inside the section card with a safe top offset */}
            <div className={`absolute left-6 select-none pointer-events-none opacity-[0.14] font-sans font-black italic tracking-widest transition-all duration-300 leading-none z-0 ${
              selectedCorner === 'BIRU' ? 'text-blue-500' : 'text-red-500'
            } ${
              isFullscreen ? 'text-[7.5rem] md:text-[9.5rem] -translate-x-1 top-2' : 'text-7xl md:text-8xl -translate-x-0.5 top-1.5'
            }`}>
              {selectedCorner}
            </div>

            {/* Top header portion with foreground text */}
            <div className="w-full relative select-none pr-8 flex items-center justify-start z-10">
              {/* Foreground header text */}
              <div className={`font-sans font-extrabold uppercase tracking-wider text-slate-100 transition-all duration-300 ${
                isFullscreen ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'
              }`}>
                SUDUT {selectedCorner}
              </div>
            </div>

            {/* A thin, low-opacity dividing border matching the separator in mockup */}
            <div className="w-full border-t border-white/10 my-4 md:my-6 relative z-10" />

            {/* Bottom info portion */}
            <div className="w-full relative z-10 mt-auto">
              <h2 className={`font-sans font-black text-[#ffffff] uppercase tracking-wide leading-tight transition-all duration-300 ${
                isFullscreen ? 'text-4xl md:text-5xl lg:text-5xl mb-2' : 'text-2xl md:text-3xl lg:text-3.5xl mb-1'
              }`}>
                {currentAthlete?.nama || "BUDI RAHARJO"}
              </h2>
              <div className={`font-sans font-bold uppercase tracking-wider transition-all duration-300 ${
                selectedCorner === 'BIRU' ? 'text-blue-400' : 'text-red-400'
              } ${
                isFullscreen ? 'text-lg md:text-xl lg:text-xl' : 'text-sm md:text-base lg:text-base'
              }`}>
                {currentAthlete?.kontingen || "JAWA BARAT"}
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: METRICS & SCORE SUMMARY TABLE OR SPECTACULAR CLOCK (7/12 cols) */}
          <section className={`flex flex-col justify-start pt-0 w-full h-full min-h-[290px] relative transition-all duration-300 ${
            isFullscreen ? 'lg:col-span-8' : 'lg:col-span-7'
          }`}>
            <AnimatePresence mode="wait">
              {showTimer ? (
                <motion.div
                  key="timer"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`border border-purple-900/60 rounded-none overflow-hidden bg-slate-900/40 backdrop-blur-md shadow-2xl mx-auto w-full flex flex-col items-center justify-center text-center bg-[#070912]/80 relative transition-all duration-300 ${
                    isFullscreen ? 'max-w-4xl p-12 shadow-[0_0_50px_rgba(147,51,234,0.15)]' : 'max-w-2xl p-8'
                  }`}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-25"></div>

                  <span className={`font-black text-yellow-300 tracking-[0.2em] font-mono uppercase flex items-center gap-2 relative z-10 transition-all duration-300 ${
                    isFullscreen ? 'text-sm md:text-lg lg:text-xl mb-6' : 'text-xs mb-4'
                  }`}>
                    <Clock className={`animate-pulse text-yellow-300 transition-all ${isFullscreen ? 'w-6 h-6' : 'w-4 h-4'}`} />
                    WAKTU TAMPIL (TIMER 2)
                  </span>

                  <div className={`font-mono font-black text-yellow-300 tracking-wider bg-black/50 rounded-none border-purple-950/60 w-full shadow-[0_0_30px_rgba(250,204,21,0.15)] relative z-10 transition-all duration-300 ${
                    isFullscreen ? 'text-8xl md:text-[8rem] lg:text-[10rem] py-8 border-[4px] mb-8' : 'text-6xl md:text-8xl px-8 py-4 border-2 mb-4'
                  }`}>
                    {formatMinSec(matchState.timer2Value || 0)}
                  </div>

                  <div className={`flex items-center gap-2.5 font-extrabold text-slate-300 uppercase bg-slate-950/60 border border-purple-900/30 rounded-full relative z-10 transition-all duration-300 ${
                    isFullscreen ? 'text-xs md:text-base px-6 py-2.5' : 'text-xs px-4 py-1.5'
                  }`}>
                    <span className={`rounded-full transition-all ${matchState.timerBerjalan ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'} ${isFullscreen ? 'w-4 h-4' : 'w-3 h-3'}`} />
                    <span className={`rounded-full transition-all ${matchState.timerBerjalan ? 'bg-emerald-500' : 'bg-slate-500'} absolute ${isFullscreen ? 'w-4 h-4 left-[24px]' : 'w-3 h-3 left-[17px]'}`} />
                    <span className={isFullscreen ? 'pl-4' : ''}>
                      STATUS: {matchState.timerBerjalan ? 'BERJALAN' : (finishedJudgesCount > 0 || (matchState.timer2Value && matchState.timer2Value > 0) ? `MENUNGGU JURI (${finishedJudgesCount}/${matchState.jumlahJuri || 10} FINISH)` : 'BELUM MULAI')}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`border border-purple-900/60 rounded-none overflow-hidden bg-slate-900/40 backdrop-blur-md shadow-2xl mx-auto w-full transition-all duration-300 ${
                    isFullscreen ? 'max-w-none shadow-[0_0_50px_rgba(147,51,234,0.15)] h-full flex flex-col justify-between' : 'max-w-2xl'
                  }`}
                >
                  {/* Row 1 headers (Green Background) */}
                  <div className="grid grid-cols-4 bg-emerald-600/85 border-b border-purple-950/40 flex-none">
                    <div className={`border-r border-[#15803d]/40 text-white font-bold text-center uppercase tracking-wider transition-all duration-300 flex items-center justify-center ${
                      isFullscreen ? 'py-6 px-4 text-sm md:text-xl lg:text-2xl' : 'py-2.5 px-2 text-xs md:text-sm'
                    }`}>Median</div>
                    <div className={`border-r border-[#15803d]/40 text-white font-bold text-center uppercase tracking-wider transition-all duration-300 flex items-center justify-center ${
                      isFullscreen ? 'py-6 px-4 text-sm md:text-xl lg:text-2xl' : 'py-2.5 px-2 text-xs md:text-sm'
                    }`}>Penalty</div>
                    <div className={`border-r border-[#15803d]/40 text-white font-bold text-center uppercase tracking-wider transition-all duration-300 flex items-center justify-center ${
                      isFullscreen ? 'py-6 px-4 text-sm md:text-xl lg:text-2xl' : 'py-2.5 px-2 text-xs md:text-sm'
                    }`}>Time Performance</div>
                    <div className={`text-white font-bold text-center uppercase tracking-wider transition-all duration-300 flex items-center justify-center ${
                      isFullscreen ? 'py-6 px-4 text-sm md:text-xl lg:text-2xl' : 'py-2.5 px-2 text-xs md:text-sm'
                    }`}>Total</div>
                  </div>

                  {/* Row 2 values (Dark Translucent Background with Crisp Numbers) */}
                  <div className={`grid grid-cols-4 bg-slate-950/40 border-b border-purple-950/60 ${isFullscreen ? 'flex-grow' : ''}`}>
                    <div className={`border-r border-purple-900/40 text-white font-extrabold text-center font-mono transition-all duration-300 flex items-center justify-center ${
                      isFullscreen ? 'py-12 px-4 text-2xl md:text-6xl lg:text-7xl' : 'py-3 px-2 text-base md:text-2xl'
                    }`}>{medianValueSelected.toFixed(3)}</div>
                    <div className={`border-r border-purple-900/40 text-white font-extrabold text-center font-mono transition-all duration-300 flex items-center justify-center ${
                      isFullscreen ? 'py-12 px-4 text-2xl md:text-6xl lg:text-7xl' : 'py-3 px-2 text-base md:text-2xl'
                    }`}>{penaltyValueSelected.toFixed(2)}</div>
                    <div className={`border-r border-purple-900/40 text-white font-extrabold text-center font-mono transition-all duration-300 flex items-center justify-center ${
                      isFullscreen ? 'py-12 px-4 text-2xl md:text-6xl lg:text-7xl' : 'py-3 px-2 text-base md:text-2xl'
                    }`}>{performanceTimeSelected}</div>
                    <div className={`text-emerald-400 font-black text-center font-mono drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] transition-all duration-300 flex items-center justify-center ${
                      isFullscreen ? 'py-14 px-4 text-3xl md:text-7xl lg:text-8xl font-black' : 'py-3 px-2 text-base md:text-2xl font-black'
                    }`}>{totalValueSelected.toFixed(3)}</div>
                  </div>

                  {/* Row 3 Standard Deviation Label (Green Strip) */}
                  <div className={`bg-emerald-600/85 border-b border-purple-950/40 text-center transition-all duration-300 flex-none ${
                    isFullscreen ? 'py-5' : 'py-1'
                  }`}>
                    <span className={`text-white font-bold tracking-widest uppercase transition-all duration-300 ${
                      isFullscreen ? 'text-xs md:text-lg lg:text-2xl' : 'text-[10px] md:text-xs'
                    }`}>Standard Deviation</span>
                  </div>

                  {/* Row 4 Standard Deviation Value (Translucent Background) */}
                  <div className={`bg-slate-950/40 text-center transition-all duration-300 flex items-center justify-center ${
                    isFullscreen ? 'flex-grow py-8' : 'py-3'
                  }`}>
                    <span className={`text-slate-200 font-extrabold text-center tracking-widest font-mono transition-all duration-300 ${
                      isFullscreen ? 'text-base md:text-3xl lg:text-5xl' : 'text-sm md:text-base'
                    }`}>
                      {stdDevValueSelected.toFixed(9)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

        </main>

        {/* BOTTOM SECTION: DETAILED JUDGES SCORES RECTANGLE ROW */}
        <section className={`relative z-10 shrink-0 select-none bg-slate-900/40 border border-purple-900/60 rounded-none shadow-md w-full backdrop-blur-md transition-all duration-300 ${
          isFullscreen ? 'p-4 my-auto hover:bg-slate-900/60 shadow-[0_0_30px_rgba(147,51,234,0.15)]' : 'p-2 mt-3.5'
        }`}>
          <div className="flex flex-nowrap items-stretch justify-center gap-1.5 w-full">
            {sortedJudgesSelected.map((j, idx) => {
              const isMedian = middleIndicesSelected.includes(idx);
              const isFlashing = flashingJuris[`${selectedCorner}-${j.juriId}`];
              const borderClass = isFlashing ? 'border-yellow-400 ring-4 ring-yellow-400/80 z-10 scale-[1.05]' : 'border-purple-950/80';
              const topBgColor = isFlashing 
                ? 'bg-yellow-500 text-slate-950 font-black' 
                : (isMedian ? 'bg-emerald-600 text-white' : (selectedCorner === 'BIRU' ? 'bg-blue-600' : 'bg-red-600'));
              const bottomBgColor = isFlashing 
                ? 'bg-yellow-600 text-slate-950 font-black' 
                : (isMedian ? 'bg-emerald-700 text-white' : (selectedCorner === 'BIRU' ? 'bg-blue-700' : 'bg-red-700'));
              
              return (
                <div key={j.juriId} className={`flex flex-col flex-1 border rounded-none overflow-hidden shadow-sm transition-all duration-300 hover:scale-[1.03] min-w-[55px] ${borderClass} ${isFlashing ? 'flash-yellow' : ''}`}>
                  {/* Top deck (Judge ID number) */}
                  <div className={`${topBgColor} font-mono font-black text-center border-b border-purple-950/80 transition-all duration-300 ${
                    isFullscreen ? 'py-4 text-sm md:text-xl lg:text-2xl' : 'py-2 text-xs md:text-sm'
                  }`}>
                    {j.juriId}
                  </div>
                  {/* Bottom deck (Judge score value) */}
                  <div className={`${bottomBgColor} font-mono font-extrabold text-center transition-all duration-300 ${
                    isFullscreen ? 'py-6 text-base md:text-3xl lg:text-4xl' : 'py-2.5 text-xs md:text-base'
                  }`}>
                    {j.score.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CHAMPIONSHIP CONGRATULATORY FOOTER SYSTEM */}
        <footer className={`relative z-10 shrink-0 px-4 py-2 bg-slate-900/40 border border-slate-850/60 rounded-none flex items-center justify-between text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider select-none h-10 transition-all duration-300 ${
          isFullscreen ? 'mt-auto' : 'mt-4'
        }`}>
          <span>NO DISCORS PENCAK SILAT - Versi 3.0</span>
          <span>{(() => {
            const gName = matchState.gelanggang || 'GELANGGANG 1';
            const activePool = (typeof window !== 'undefined' ? localStorage.getItem('silat_bagan_pool') : 'NONE') || 'NONE';
            if (activePool && activePool.toUpperCase() !== 'NONE') {
              return `${gName} (${activePool.toUpperCase()})`;
            }
            return gName;
          })()}</span>
        </footer>

        {/* POP-UP: SPECTACULAR GLOWING WINNER CONFETTI OVERLAY */}
        {isMatchSelesai && matchState.pemenang && !matchState.umumkanPemenang && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none border-4 border-amber-500/30 animate-fade-in shadow-[inset_0_0_100px_rgba(245,158,11,0.25)]">
            <div className="max-w-2xl text-center space-y-6 flex flex-col items-center">
              
              {/* Animated loading wave */}
              <div className="p-8 rounded-full bg-slate-900/60 border-2 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.4)] animate-pulse relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-400 border-t-transparent animate-spin"></div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-black tracking-[0.35em] text-purple-400 font-mono uppercase block animate-pulse">REKAP NILAI SELESAI</span>
                <h2 className="text-4xl md:text-5xl font-black text-white leading-none uppercase tracking-wide">
                  MENUNGGU KEPUTUSAN DEWAN
                </h2>
                <p className="text-slate-400 font-sans text-sm max-w-md mx-auto">
                  Pertandingan telah selesai tampil. Pemenang dan kalkulasi skor resmi sedang diverifikasi oleh Dewan Hakim dan akan segera diumumkan ke layar monitor.
                </p>
              </div>

              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-2/3 animate-[pulse_1.5s_infinite]"></div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ==========================================
  // OLD COMPARATIVE VIEW FOR GANDA & SOLO_KREATIF
  // ==========================================

  return (
    <div 
      id="live-monitor-seni-screen" 
      className={`w-full flex flex-col bg-gradient-to-br from-[#1d0a3d] via-[#0b041a] to-[#01122a] text-slate-100 select-none font-sans relative justify-between ${
        isFullscreen 
          ? "h-screen overflow-hidden p-2 md:p-3" 
          : "min-h-screen overflow-visible p-3 md:p-5"
      }`}
    >
      
      {forceReview && isMatchSelesai && matchState.pemenang && matchState.umumkanPemenang && (
        <div className="relative z-50 shrink-0 bg-[#0052cc] text-white font-bold p-3 text-center flex items-center justify-between shadow-lg px-6 rounded-md mb-4 border border-blue-400 animate-pulse">
          <span className="text-sm tracking-wide uppercase">Mode Tinjauan: Hasil Pertandingan Resmi Telah Diumumkan</span>
          <button
            onClick={() => setForceReview(false)}
            className="px-4 py-1.5 bg-white text-[#0052cc] rounded-lg hover:bg-slate-100 font-extrabold tracking-widest text-[11px] shadow cursor-pointer transition-all uppercase"
          >
            Kembali ke Layar Kemenangan →
          </button>
        </div>
      )}

      {/* Dynamic Back to Landing Floater */}
      {!isFullscreen && onBackToLanding && (
        <button
          onClick={onBackToLanding}
          className="absolute top-4 left-4 z-40 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-[10px] font-black text-slate-400 border border-purple-900/55 rounded-lg cursor-pointer flex items-center gap-1 opacity-40 hover:opacity-100 transition-all duration-300"
        >
          ← Beranda
        </button>
      )}

      {/* Decorative colored radial background glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[300px] bg-purple-500/10 rounded-full filter blur-[150px] pointer-events-none select-none z-0"></div>
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[300px] bg-indigo-500/10 rounded-full filter blur-[150px] pointer-events-none select-none z-0"></div>

      {/* HEADER: MASSIVE PB IPSI SPECTACLE BAR */}
      <header className="relative z-10 shrink-0 bg-slate-900/40 p-4 rounded-none border border-purple-900/60 backdrop-blur-md flex items-center justify-between mb-4 shadow-2xl">
        <div className="flex items-center gap-3">
          {matchState.logoKiri ? (
            <img
              src={matchState.logoKiri}
              alt="Logo Kiri"
              className="w-16 h-16 animate-pulse object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <IPSIColoredLogo className="w-16 h-16 animate-pulse" />
          )}
          <div className="text-left">
            <span className="text-[10px] font-black tracking-[0.25em] text-amber-500 font-mono uppercase block">LIVE SCORE MONITOR</span>
            <h1 className="text-sm md:text-base font-black text-white font-mono tracking-widest uppercase leading-none mt-0.5">IPSI SENI APP - PB IPSI BOARD</h1>
          </div>
        </div>

        {/* Dynamic central event indicator */}
        <div className="hidden lg:flex flex-col items-center max-w-sm text-center">
          <span className="text-xs font-black text-slate-300 font-mono tracking-wider uppercase truncate w-64">{matchState.eventName || "KEJUARAAN NASIONAL PENCAK SILAT"}</span>
          <span className="text-[9px] text-indigo-400 font-bold uppercase mt-1">GEGER ARENA DIGITAL MAT</span>
        </div>

        {/* Metadata Details Corner */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] text-slate-400 font-mono uppercase font-black block">
              {(() => {
                const p = (matchState.partai || 'A-2').trim();
                if (isPoolSystem) {
                  return p.toUpperCase().startsWith('TAMPIL') ? p.toUpperCase() : `TAMPIL ${p}`;
                }
                return p.toUpperCase().startsWith('PARTAI') ? p : `PARTAI ${p}`;
              })()}
            </span>
            <span className="text-[10px] font-black text-[#00E5FF] uppercase leading-none font-mono">{matchState.kelas || matchState.kategoriSeni || 'TUNGGAL'} | {matchState.kategoriUsia} ({matchState.gender})</span>
          </div>
          <div className="w-px h-6 bg-purple-900/40" />
          {matchState.logoKanan ? (
            <img
              src={matchState.logoKanan}
              alt="Logo Kanan"
              className="w-16 h-16 shrink-0 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <PERSILATColoredLogo className="w-16 h-16 shrink-0" />
          )}
        </div>
      </header>

      {/* ================= MAIN CONTENT COMPARATOR: BLUE VS RED GRID (BENTO STYLING) ================= */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch select-none">
        
        {/* ================= LEFT BENTO CELL: SUDUT BIRU (5/12) ================= */}
        <section className={`lg:col-span-5 flex flex-col p-4 md:p-6 bg-gradient-to-br from-blue-950/90 via-blue-900/55 to-blue-950/95 rounded-none border transition-all duration-300 relative overflow-hidden justify-between shadow-[inset_0_0_50px_rgba(59,130,246,0.15)] ${
          flashBiru ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-900/40' : 'border-blue-700/40'
        }`}>
          {/* Watermark Blue Pattern */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10rem] md:text-[14rem] font-black opacity-[0.015] select-none pointer-events-none text-blue-500 font-orbitron">BIRU</div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Competitor Header */}
            <div className="flex justify-between items-baseline border-b border-blue-500/10 pb-3 mb-4">
              <span className="text-xs font-black tracking-widest text-blue-400 font-mono bg-blue-950/20 px-2.5 py-1 rounded-none border border-blue-800/35 uppercase flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 animate-bounce" /> SUDUT BIRU
              </span>
              <div className="text-right">
                <h2 className="text-lg md:text-xl font-black text-white leading-none uppercase">{matchState?.atlitBiru?.nama || 'ATLIT BIRU'}</h2>
                <span className="text-[10px] md:text-[11px] font-bold text-slate-400 mt-1 uppercase block">({matchState?.atlitBiru?.kontingen || 'CONTINGENT'})</span>
              </div>
            </div>

            {/* Giant Dynamic Live Score Display */}
            <div className="flex flex-col items-center py-6 bg-black/45 border border-blue-500/20 rounded-none shadow-inner mb-4">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mb-1">SKOR AKUMULASI JURI + DEWAN</span>
              <span className="text-7xl md:text-8xl font-black text-blue-500 tracking-tighter leading-none font-mono drop-shadow-[0_0_20px_rgba(59,130,246,0.75)] animate-pulse-status">
                {biruStats.finalScore.toFixed(3)}
              </span>
              <div className="w-full flex justify-around mt-4 pt-3 border-t border-slate-900 text-xs font-semibold text-slate-400 font-mono">
                <span>Rata Juri: {biruStats.avgJuri.toFixed(3)}</span>
                <span>Hukuman: -{biruStats.hukuman.toFixed(1)}</span>
              </div>
            </div>

            {/* Detailed scoring grids */}
            <div className="grid grid-cols-3 gap-2 text-center mt-auto">
              {[1, 2, 3].map((juriId) => {
                const jScore: JuriSeniScore = matchState.seniScores.BIRU.juriScores[juriId];
                const totalJuriScore = calculateSeniScoreForJuri(matchState.kategoriSeni, jScore);
                const norm = (val: number | undefined) => {
                  if (val === undefined || val === 50) return 0;
                  return (val >= 0.01 && val <= 0.30) ? val : 0;
                };

                return (
                  <div key={juriId} className="bg-slate-950/50 p-3 rounded-none border border-blue-900/30 flex flex-col justify-between">
                    <span className="text-[9px] font-black tracking-wider text-blue-400 font-mono uppercase block border-b border-blue-900/25 pb-1 mb-1.5">JURI {juriId}</span>
                    <span className="text-lg font-black text-white font-mono leading-none">{totalJuriScore.toFixed(2)}</span>
                    <div className="text-[8px] font-bold text-slate-400 mt-2 space-y-0.5">
                      {(matchState.kategoriSeni === 'TUNGGAL' || matchState.kategoriSeni === 'REGU') ? (
                        <>
                          <div className="flex justify-between"><span>Benar:</span> <span className="font-mono text-slate-350">{jScore.kebenaran}</span></div>
                          <div className="flex justify-between"><span>Mantap:</span> <span className="font-mono text-slate-350">{jScore.kemantapan.toFixed(1)}</span></div>
                        </>
                      ) : matchState.kategoriSeni === 'GANDA' ? (
                        <>
                          <div className="flex justify-between"><span>Teknik:</span> <span className="font-mono text-slate-350">{norm(jScore.teknikSerangBela).toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Mantap:</span> <span className="font-mono text-slate-350">{norm(jScore.kemantapan).toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Jiwa:</span> <span className="font-mono text-slate-350">{norm(jScore.penjiwaan).toFixed(2)}</span></div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between"><span>Koreo:</span> <span className="font-mono text-slate-350">{norm(jScore.teknikSenjataKoreografi).toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Mantap:</span> <span className="font-mono text-slate-350">{norm(jScore.kemantapan).toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>Jiwa:</span> <span className="font-mono text-slate-350">{norm(jScore.penjiwaan).toFixed(2)}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= CENTER CELL: COUNTER CLOCK TIME & COCKPIT CONTROLLER (2/12) ================= */}
        <section className="lg:col-span-2 flex flex-col justify-between gap-4 p-4 bg-slate-950/45 border border-purple-900/60 rounded-none select-none text-center">
          
          {/* DIGITAL SPECTACULAR COUNTDOWN CLOCK */}
          <div className="flex flex-col items-center py-4 px-3 bg-[#070912] border-2 border-purple-900/40 rounded-none relative">
            <span className="text-[9px] font-black text-yellow-300 tracking-widest font-mono uppercase mb-2">RUNNING CLOCK</span>
            <div className="font-mono font-black text-2xl text-yellow-300 tracking-wider bg-black/40 px-3 py-1.5 rounded-none border border-purple-950/60 w-full mb-1">
              {formatMinSec(matchState.timer2Value || 0)}
            </div>
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 mt-1 uppercase">
              <span className={`w-1.5 h-1.5 rounded-full ${matchState.timerBerjalan ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {matchState.timerBerjalan ? 'RUNNING' : 'STOPPED'}
            </div>
          </div>

          {/* Dewan Penalties Logs comparison columns */}
          <div className="flex flex-col gap-2 p-3 bg-slate-900/60 rounded-none border border-purple-950/60 flex-1 overflow-y-auto">
            <span className="text-[9px] font-black text-indigo-400 tracking-wider uppercase block border-b border-purple-950/40 pb-1.5 mb-2">DEWAN PENALTIES LOG</span>
            
            <div className="space-y-1.5 text-[10px] font-bold text-slate-450 leading-tight">
              {[
                { id: 'waktu', label: 'TIME DEV' },
                { id: 'pakaian', label: 'COSTUME' },
                { id: 'suara', label: 'SOUNDS' },
                { id: 'gelanggang', label: 'ESCAPE' },
                { id: 'senjataJatuh', label: 'WEAPON' }
              ].map((p) => {
                const mV = matchState.seniScores.MERAH.hukumanLog[p.id as any] || 0;
                const bV = matchState.seniScores.BIRU.hukumanLog[p.id as any] || 0;
                return (
                  <div key={p.id} className="flex justify-between items-center bg-black/30 px-2 py-1 build rounded-none border border-purple-950/60">
                    <span className="font-mono text-red-500 font-extrabold">-{mV.toFixed(1)}</span>
                    <span className="text-[8px] tracking-wider uppercase font-black text-slate-450">{p.label}</span>
                    <span className="font-mono text-blue-500 font-extrabold">-{bV.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Powered by tag */}
          <div className="text-[8px] font-black text-slate-600 tracking-widest uppercase font-mono mt-auto">
            PB IPSI MAT SCORE
          </div>
        </section>

        {/* ================= RIGHT BENTO CELL: SUDUT MERAH (5/12) ================= */}
        <section className={`lg:col-span-5 flex flex-col p-4 md:p-6 bg-gradient-to-br from-red-950/90 via-red-900/55 to-red-950/95 rounded-none border transition-all duration-300 relative overflow-hidden justify-between shadow-[inset_0_0_50px_rgba(239,68,68,0.15)] ${
          flashMerah ? 'border-red-500 ring-2 ring-red-500 bg-red-900/40' : 'border-red-700/40'
        }`}>
          {/* Watermark Red Pattern */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10rem] md:text-[14rem] font-black opacity-[0.015] select-none pointer-events-none text-red-500 font-orbitron">MERAH</div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Competitor Header */}
            <div className="flex justify-between items-baseline border-b border-red-500/10 pb-3 mb-4">
              <span className="text-xs font-black tracking-widest text-red-400 font-mono bg-red-950/20 px-2.5 py-1 rounded-none border border-red-800/35 uppercase flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 animate-bounce" /> SUDUT MERAH
              </span>
              <div className="text-right">
                <h2 className="text-lg md:text-xl font-black text-white leading-none uppercase">{matchState?.atlitMerah?.nama || 'ATLIT MERAH'}</h2>
                <span className="text-[10px] md:text-[11px] font-bold text-slate-400 mt-1 uppercase block">({matchState?.atlitMerah?.kontingen || 'CONTINGENT'})</span>
              </div>
            </div>

            {/* Giant Dynamic Live Score Display */}
            <div className="flex flex-col items-center py-6 bg-black/45 border border-red-500/20 rounded-none shadow-inner mb-4">
              <span className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mb-1">SKOR AKUMULASI JURI + DEWAN</span>
              <span className="text-7xl md:text-8xl font-black text-red-500 tracking-tighter leading-none font-mono drop-shadow-[0_0_20px_rgba(239,68,68,0.75)] animate-pulse-status">
                {merahStats.finalScore.toFixed(3)}
              </span>
              <div className="w-full flex justify-around mt-4 pt-3 border-t border-slate-900 text-xs font-semibold text-slate-400 font-mono">
                <span>Rata Juri: {merahStats.avgJuri.toFixed(3)}</span>
                <span>Hukuman: -{merahStats.hukuman.toFixed(1)}</span>
              </div>
            </div>

            {/* Detailed scoring grids */}
            <div className="grid grid-cols-3 gap-2 text-center mt-auto">
              {[1, 2, 3].map((juriId) => {
                const jScore: JuriSeniScore = matchState.seniScores.MERAH.juriScores[juriId];
                const totalJuriScore = calculateSeniScoreForJuri(matchState.kategoriSeni, jScore);
                const norm = (val: number | undefined) => {
                  if (val === undefined || val === 50) return 0;
                  return (val >= 0.01 && val <= 0.30) ? val : 0;
                };

                return (
                  <div key={juriId} className="bg-slate-950/50 p-3 rounded-none border border-red-900/30 flex flex-col justify-between">
                    <span className="text-[9px] font-black tracking-wider text-red-400 font-mono uppercase block border-b border-red-900/25 pb-1 mb-1.5">JURI {juriId}</span>
                    <span className="text-lg font-black text-white font-mono leading-none">{totalJuriScore.toFixed(2)}</span>
                    <div className="text-[8px] font-bold text-slate-400 mt-2 space-y-0.5">
                      {(matchState.kategoriSeni === 'TUNGGAL' || matchState.kategoriSeni === 'REGU') ? (
                        <>
                           <div className="flex justify-between"><span>Benar:</span> <span className="font-mono text-slate-350">{jScore.kebenaran}</span></div>
                           <div className="flex justify-between"><span>Mantap:</span> <span className="font-mono text-slate-350">{jScore.kemantapan.toFixed(1)}</span></div>
                        </>
                      ) : matchState.kategoriSeni === 'GANDA' ? (
                        <>
                           <div className="flex justify-between"><span>Teknik:</span> <span className="font-mono text-slate-350">{norm(jScore.teknikSerangBela).toFixed(2)}</span></div>
                           <div className="flex justify-between"><span>Mantap:</span> <span className="font-mono text-slate-350">{norm(jScore.kemantapan).toFixed(2)}</span></div>
                           <div className="flex justify-between"><span>Jiwa:</span> <span className="font-mono text-slate-350">{norm(jScore.penjiwaan).toFixed(2)}</span></div>
                        </>
                      ) : (
                        <>
                           <div className="flex justify-between"><span>Koreo:</span> <span className="font-mono text-slate-350">{norm(jScore.teknikSenjataKoreografi).toFixed(2)}</span></div>
                           <div className="flex justify-between"><span>Mantap:</span> <span className="font-mono text-slate-350">{norm(jScore.kemantapan).toFixed(2)}</span></div>
                           <div className="flex justify-between"><span>Jiwa:</span> <span className="font-mono text-slate-350">{norm(jScore.penjiwaan).toFixed(2)}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </main>

      {/* LOWER BANNER: SPECTACULAR ON-SCREEN FOOTER MARGINS */}
      <footer className="relative z-10 shrink-0 mt-4 px-4 py-2 bg-slate-900/40 border border-purple-900/30 rounded-none flex items-center justify-between text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider select-none">
        <span>NO DISCORS PENCAK SILAT - Versi 3.0</span>
        <span>{(() => {
          const gName = matchState.gelanggang || 'GELANGGANG 1';
          const activePool = (typeof window !== 'undefined' ? localStorage.getItem('silat_bagan_pool') : 'NONE') || 'NONE';
          if (activePool && activePool.toUpperCase() !== 'NONE') {
            return `${gName} (${activePool.toUpperCase()})`;
          }
          return gName;
        })()}</span>
      </footer>

      {/* ================= SPECTACULAR GLOWING WINNER CONFETTI OVERLAY ================= */}
      {isMatchSelesai && matchState.pemenang && !matchState.umumkanPemenang && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none border-4 border-amber-500/30 animate-fade-in shadow-[inset_0_0_100px_rgba(245,158,11,0.25)]">
          <div className="max-w-2xl text-center space-y-6 flex flex-col items-center">
            
            {/* Animated loading wave */}
            <div className="p-8 rounded-full bg-slate-900/60 border-2 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.4)] animate-pulse relative">
              <div className="w-16 h-16 rounded-full border-4 border-purple-400 border-t-transparent animate-spin"></div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-black tracking-[0.35em] text-purple-400 font-mono uppercase block animate-pulse">REKAP NILAI SELESAI</span>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-none uppercase tracking-wide">
                MENUNGGU KEPUTUSAN DEWAN
              </h2>
              <p className="text-slate-400 font-sans text-sm max-w-md mx-auto">
                Pertandingan telah selesai tampil. Pemenang dan kalkulasi skor resmi sedang diverifikasi oleh Dewan Hakim dan akan segera diumumkan ke layar monitor.
              </p>
            </div>

            <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-2/3 animate-[pulse_1.5s_infinite]"></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
