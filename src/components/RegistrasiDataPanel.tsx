import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Award, Plus, Edit2, Trash2, Download, Upload, FileText, 
  ChevronLeft, Check, CheckSquare, Square, RefreshCw, HelpCircle,
  Trophy, Grid, List, Table, Filter, Shield, AlertCircle, X, Info,
  Shuffle, Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { getDynamicBracketRounds, downloadTournamentBracketPDF, downloadMatchSchedulePDF } from '../utils/pdf';
import { 
  calculateSeniKebenaranScore, 
  calculateSeniHukumanTotal, 
  calculateSeniStandardDeviation 
} from '../appState';

// Audio click sound trigger
function playClick() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.05);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    }
  } catch (e) {}
}

export interface RegisteredAthlete {
  id: string;
  nama: string;
  kontingen: string;
  kategoriJurus: string; // TUNGGAL, TUNGGAL BEBAS, GANDA, REGU, SOLO_KREATIF
  kategoriUsia: string;  // Pra Usia Dini, Usia Dini 1, Usia Dini 2, Pra Remaja, Remaja, Dewasa, Master 1, Master 2
  gender: string;        // Putra, Putri
  pool: string;          // POOL A to POOL O, None
  sistemTanding?: 'BATTLE' | 'POOL';
  tahapan?: string;
  gelanggang?: string;
}

interface RegistrasiDataPanelProps {
  onBack: () => void;
  jadwalLines: any[];
  onUpdateJadwalLines: (lines: any[]) => void;
  onApplyJadwal?: () => void;
}

export function RegistrasiDataPanel({ onBack, jadwalLines, onUpdateJadwalLines, onApplyJadwal }: RegistrasiDataPanelProps) {
  const [activeTab, setActiveTab] = useState<'INPUT_ATLIT' | 'BAGAN' | 'KONTROL_PARTAI'>('INPUT_ATLIT');
  
  // Athlete state
  const [athletes, setAthletes] = useState<RegisteredAthlete[]>(() => {
    try {
      const saved = localStorage.getItem('silat_registrasi_atlit');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    // Prepopulate with elegant sample athletes
    return [
      { id: "atl-1", nama: "ADI WIJAYA", kontingen: "JAWA TENGAH", kategoriJurus: "TUNGGAL", kategoriUsia: "Remaja", gender: "Putra", pool: "POOL A", sistemTanding: "BATTLE", tahapan: "PENYISIHAN", gelanggang: "GELANGGANG 1" },
      { id: "atl-2", nama: "RIZKY PUTRA", kontingen: "JAWA TIMUR", kategoriJurus: "TUNGGAL", kategoriUsia: "Remaja", gender: "Putra", pool: "POOL A", sistemTanding: "BATTLE", tahapan: "PENYISIHAN", gelanggang: "GELANGGANG 1" },
      { id: "atl-3", nama: "FARHAN RAZAK", kontingen: "JAWA BARAT", kategoriJurus: "TUNGGAL", kategoriUsia: "Remaja", gender: "Putra", pool: "POOL B", sistemTanding: "BATTLE", tahapan: "PENYISIHAN", gelanggang: "GELANGGANG 1" },
      { id: "atl-4", nama: "HERI KUSUMA", kontingen: "BALI", kategoriJurus: "TUNGGAL", kategoriUsia: "Remaja", gender: "Putra", pool: "POOL B", sistemTanding: "BATTLE", tahapan: "PENYISIHAN", gelanggang: "GELANGGANG 1" },
      { id: "atl-5", nama: "NURUL INDAH", kontingen: "SULAWESI SELATAN", kategoriJurus: "TUNGGAL", kategoriUsia: "Remaja", gender: "Putri", pool: "POOL A", sistemTanding: "BATTLE", tahapan: "PENYISIHAN", gelanggang: "GELANGGANG 1" },
      { id: "atl-6", nama: "SITI AMINAH", kontingen: "BANTEN", kategoriJurus: "TUNGGAL", kategoriUsia: "Remaja", gender: "Putri", pool: "POOL A", sistemTanding: "BATTLE", tahapan: "PENYISIHAN", gelanggang: "GELANGGANG 1" },
      { id: "atl-7", nama: "DEWANTO SURYA", kontingen: "DKI JAKARTA", kategoriJurus: "GANDA", kategoriUsia: "Dewasa", gender: "Putra", pool: "POOL A", sistemTanding: "BATTLE", tahapan: "PENYISIHAN", gelanggang: "GELANGGANG 1" },
      { id: "atl-8", nama: "AKBAR MAULANA", kontingen: "DI YOGYAKARTA", kategoriJurus: "GANDA", kategoriUsia: "Dewasa", gender: "Putra", pool: "POOL A", sistemTanding: "BATTLE", tahapan: "PENYISIHAN", gelanggang: "GELANGGANG 1" },
    ];
  });

  // Save athletes to localStorage when changed
  useEffect(() => {
    localStorage.setItem('silat_registrasi_atlit', JSON.stringify(athletes));
    // Backwards compatibility sync
    localStorage.setItem('silat_bagan_athletes', JSON.stringify(athletes));
  }, [athletes]);

  // Form input states
  const [formData, setFormData] = useState<{
    id: string;
    nama: string;
    kontingen: string;
    kategoriJurus: string;
    kategoriUsia: string;
    gender: string;
    pool: string;
    sistemTanding: 'BATTLE' | 'POOL';
    tahapan?: string;
    gelanggang?: string;
  }>({
    id: '',
    nama: '',
    kontingen: '',
    kategoriJurus: 'TUNGGAL',
    kategoriUsia: 'Remaja',
    gender: 'Putra',
    pool: 'POOL A',
    sistemTanding: 'BATTLE',
    tahapan: 'PENYISIHAN',
    gelanggang: 'GELANGGANG 1'
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllAthletes, setShowAllAthletes] = useState<boolean>(false);
  const [athleteIdToDelete, setAthleteIdToDelete] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Bracket Selection Tab States
  const [selectedBaganGroup, setSelectedBaganGroup] = useState<string>('TUNGGAL-Remaja-Putra');
  const [baganViewMode, setBaganViewMode] = useState<'BATTLE' | 'POOL'>('BATTLE');
  const [bracketLines, setBracketLines] = useState<any[]>([]);

  // Checked athletes for Scheduling (Kontrol Partai)
  const [kontrolSistemTampilan, setKontrolSistemTampilan] = useState<'BATTLE' | 'POOL'>('BATTLE');
  const [checkedAthleteIds, setCheckedAthleteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('silat_checked_athlete_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toggledBattleMatches, setToggledBattleMatches] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('silat_toggled_battle_matches');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [customPartaiNos, setCustomPartaiNos] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('silat_custom_partai_nos');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [customNomorTampils, setCustomNomorTampils] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('silat_custom_nomor_tampils');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('silat_checked_athlete_ids', JSON.stringify(checkedAthleteIds));
  }, [checkedAthleteIds]);

  useEffect(() => {
    localStorage.setItem('silat_toggled_battle_matches', JSON.stringify(toggledBattleMatches));
  }, [toggledBattleMatches]);

  useEffect(() => {
    localStorage.setItem('silat_custom_partai_nos', JSON.stringify(customPartaiNos));
  }, [customPartaiNos]);

  useEffect(() => {
    localStorage.setItem('silat_custom_nomor_tampils', JSON.stringify(customNomorTampils));
  }, [customNomorTampils]);

  // One-time initial sync of checkedAthleteIds from existing scheduled jadwalLines
  const hasSyncedFromJadwalRef = useRef(false);
  useEffect(() => {
    if (!hasSyncedFromJadwalRef.current && jadwalLines && jadwalLines.length > 0 && checkedAthleteIds.length === 0) {
      const idsFromJadwal: string[] = [];
      jadwalLines.forEach((line) => {
        if (line.atlitBiru?.id) idsFromJadwal.push(line.atlitBiru.id);
        if (line.atlitMerah?.id) idsFromJadwal.push(line.atlitMerah.id);
      });
      if (idsFromJadwal.length > 0) {
        setCheckedAthleteIds(prev => {
          const combined = new Set([...prev, ...idsFromJadwal]);
          return Array.from(combined);
        });
      }
      hasSyncedFromJadwalRef.current = true;
    }
  }, [jadwalLines, checkedAthleteIds.length]);

  // Load match history for scores
  const [matchHistory, setMatchHistory] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('silat_scoring_match_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Load current active match state
  const [activeMatchState, setActiveMatchState] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('silat_scoring_match_state');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Keep it fresh when activeTab is KONTROL_PARTAI
  useEffect(() => {
    if (activeTab === 'KONTROL_PARTAI') {
      try {
        const raw = localStorage.getItem('silat_scoring_match_history');
        if (raw) {
          setMatchHistory(JSON.parse(raw));
        }
        const activeRaw = localStorage.getItem('silat_scoring_match_state');
        if (activeRaw) {
          setActiveMatchState(JSON.parse(activeRaw));
        } else {
          setActiveMatchState(null);
        }
      } catch (e) {
        console.error("Failed to load match history in RegistrasiDataPanel", e);
      }
    }
  }, [activeTab]);

  // Automatically generate FINAL stage athletes when a PENYISIHAN pool is completed
  useEffect(() => {
    if (athletes.length === 0) return;

    // Get all POOL athletes in PENYISIHAN stage
    const poolPenyisihanAthletes = athletes.filter(a => 
      a.sistemTanding === 'POOL' && 
      (a.tahapan || 'PENYISIHAN').toUpperCase().trim() === 'PENYISIHAN'
    );

    if (poolPenyisihanAthletes.length === 0) return;

    // Group athletes by: kategoriJurus | kategoriUsia | gender | pool
    const groups: Record<string, RegisteredAthlete[]> = {};
    poolPenyisihanAthletes.forEach(a => {
      const pName = (a.pool || 'None').trim().toUpperCase();
      const key = `${a.kategoriJurus}|${a.kategoriUsia}|${a.gender}|${pName}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(a);
    });

    const newFinalAthletesToAdd: RegisteredAthlete[] = [];

    Object.entries(groups).forEach(([key, groupAthletes]) => {
      const [kategoriJurus, kategoriUsia, gender, poolName] = key.split('|');

      // Check if all athletes in this PENYISIHAN pool have completed their performance
      const allPerformed = groupAthletes.every(a => {
        const score = findPoolAthleteScore(a.id, a.nama);
        return score !== null;
      });

      if (allPerformed && groupAthletes.length > 0) {
        // Get sorted ranked list for this PENYISIHAN pool
        const performanceList = getPoolAthletePerformanceList(kategoriJurus, kategoriUsia, gender, poolName, 'PENYISIHAN');
        
        // Find Juara 1, 2, and 3
        const winners = performanceList.filter(ath => ath.hasPerformed && (ath.rank === 1 || ath.rank === 2 || ath.rank === 3));

        winners.forEach(winner => {
          const originalAth = groupAthletes.find(a => a.id === winner.id);
          if (!originalAth) return;

          const finalId = `atl-final-${originalAth.id}`;
          const alreadyExists = athletes.some(a => a.id === finalId);

          if (!alreadyExists) {
            newFinalAthletesToAdd.push({
              id: finalId,
              nama: originalAth.nama,
              kontingen: originalAth.kontingen,
              kategoriJurus: originalAth.kategoriJurus,
              kategoriUsia: originalAth.kategoriUsia,
              gender: originalAth.gender,
              pool: 'FINAL',
              sistemTanding: 'POOL',
              tahapan: 'FINAL',
              gelanggang: originalAth.gelanggang || 'GELANGGANG 1'
            });
          }
        });
      }
    });

    if (newFinalAthletesToAdd.length > 0) {
      setAthletes(prev => {
        // Double check against prev state to prevent concurrent updates duplicates
        const filteredToAdd = newFinalAthletesToAdd.filter(newA => !prev.some(p => p.id === newA.id));
        if (filteredToAdd.length === 0) return prev;

        const updated = [...prev, ...filteredToAdd];

        // Automatically check these new athletes for scheduling
        setCheckedAthleteIds(prevChecked => {
          const newChecked = [...prevChecked];
          filteredToAdd.forEach(newA => {
            if (!newChecked.includes(newA.id)) {
              newChecked.push(newA.id);
            }
          });
          
          // Let's defer schedule sync to allow states to settle
          setTimeout(() => {
            syncJadwalLines(newChecked);
          }, 100);

          return newChecked;
        });

        showToast(`Berhasil menambahkan ${filteredToAdd.length} atlit Juara PENYISIHAN ke Tahapan FINAL secara otomatis!`, 'success');
        return updated;
      });
    }
  }, [athletes, matchHistory]);

  // Find BATTLE match score helper
  const findBattleMatchScore = (m: any) => {
    const match = matchHistory.find((h: any) => {
      if (h.sistemTanding !== 'BATTLE') return false;
      
      // Match by party number if both have it
      if (m.partaiNo && h.partai && String(h.partai) === String(m.partaiNo)) {
        return true;
      }
      
      // Match by athlete names (allowing reverse order)
      const mMerahName = m.atlitMerah?.nama?.trim().toUpperCase();
      const mBiruName = m.atlitBiru?.nama?.trim().toUpperCase();
      
      const hMerahName = h.atlitMerah?.nama?.trim().toUpperCase();
      const hBiruName = h.atlitBiru?.nama?.trim().toUpperCase();
      
      if (!mMerahName || !hMerahName) return false;
      
      return (mMerahName === hMerahName && mBiruName === hBiruName) ||
             (mMerahName === hBiruName && mBiruName === hMerahName);
    });
    
    if (!match) return null;
    return {
      skorMerah: match.skorAkhirMerah,
      skorBiru: match.skorAkhirBiru,
      pemenang: match.pemenang
    };
  };

  // Find POOL athlete score helper
  const findPoolAthleteScore = (athleteId: string, athleteName: string) => {
    const match = matchHistory.find((h: any) => {
      const isHPool = h.sistemTanding === 'POOL' || 
                      h.kelas?.toUpperCase().includes('POOL') || 
                      h.atlitMerah?.nama === '---' || 
                      h.atlitBiru?.nama === '---' ||
                      !h.atlitMerah?.nama ||
                      !h.atlitBiru?.nama;
      if (!isHPool) return false;
      
      const hActiveCorner: 'BIRU' | 'MERAH' = (h.atlitBiru?.nama && h.atlitBiru?.nama !== '---') ? 'BIRU' : 'MERAH';
      const activeAtlit = hActiveCorner === 'BIRU' ? h.atlitBiru : h.atlitMerah;
      
      return activeAtlit?.nama?.trim().toUpperCase() === athleteName.trim().toUpperCase();
    });
    
    if (!match) return null;
    
    const hActiveCorner: 'BIRU' | 'MERAH' = (match.atlitBiru?.nama && match.atlitBiru?.nama !== '---') ? 'BIRU' : 'MERAH';
    return hActiveCorner === 'BIRU' ? match.skorAkhirBiru : match.skorAkhirMerah;
  };

  const getPoolAthletePerformanceList = (kategoriJurus: string, kategoriUsia: string, gender: string, poolName: string, tahapan: string = 'PENYISIHAN') => {
    const sameGroupAthletes = athletes.filter(ath => {
      const j1 = (ath.kategoriJurus || '').toUpperCase().trim();
      const u1 = (ath.kategoriUsia || '').toUpperCase().trim();
      const g1 = (ath.gender || '').toUpperCase().trim();
      const p1 = (ath.pool || '').toUpperCase().trim();
      const t1 = (ath.tahapan || 'PENYISIHAN').toUpperCase().trim();

      const j2 = (kategoriJurus || '').toUpperCase().trim();
      const u2 = (kategoriUsia || '').toUpperCase().trim();
      const g2 = (gender || '').toUpperCase().trim();
      const p2 = (poolName || '').toUpperCase().trim();
      const t2 = (tahapan || 'PENYISIHAN').toUpperCase().trim();

      const isPoolEqual = p1 === p2 || (p1 === 'NONE' && p2 === '') || (p1 === '' && p2 === 'NONE');

      return ath.sistemTanding === 'POOL' && j1 === j2 && u1 === u2 && g1 === g2 && isPoolEqual && t1 === t2;
    });

    const ranked = sameGroupAthletes.map(ath => {
      const match = matchHistory.find((h: any) => {
        const isHPool = h.sistemTanding === 'POOL' || 
                        h.kelas?.toUpperCase().includes('POOL') || 
                        h.atlitMerah?.nama === '---' || 
                        h.atlitBiru?.nama === '---' ||
                        !h.atlitMerah?.nama ||
                        !h.atlitBiru?.nama;
        if (!isHPool) return false;
        
        const hActiveCorner: 'BIRU' | 'MERAH' = (h.atlitBiru?.nama && h.atlitBiru?.nama !== '---') ? 'BIRU' : 'MERAH';
        const activeAtlit = hActiveCorner === 'BIRU' ? h.atlitBiru : h.atlitMerah;
        
        return activeAtlit?.nama?.trim().toUpperCase() === ath.nama.trim().toUpperCase();
      });

      if (match) {
        const corner: 'BIRU' | 'MERAH' = (match.atlitBiru?.nama && match.atlitBiru?.nama !== '---') ? 'BIRU' : 'MERAH';
        const score = corner === 'BIRU' ? match.skorAkhirBiru : match.skorAkhirMerah;
        const kebenaran = calculateSeniKebenaranScore(corner, match);
        const hukuman = calculateSeniHukumanTotal(match.seniScores?.[corner]?.hukumanLog);
        const durasiTampil = corner === 'BIRU' ? (match.durasiTampilBIRU || 0) : (match.durasiTampilMERAH || 0);
        const stdev = calculateSeniStandardDeviation(ath.kategoriJurus, match.seniScores?.[corner], match.jumlahJuri || 10, corner);
        const durasiBabak = match.durasiBabak || 180;

        return {
          id: ath.id,
          nama: ath.nama,
          hasPerformed: true,
          score,
          kebenaran,
          hukuman,
          durasiTampil,
          stdev,
          durasiBabak
        };
      } else {
        return {
          id: ath.id,
          nama: ath.nama,
          hasPerformed: false,
          score: 0,
          kebenaran: 0,
          hukuman: 0,
          durasiTampil: 0,
          stdev: 0,
          durasiBabak: 180
        };
      }
    });

    // Sort by performance rules
    const sorted = [...ranked].sort((a, b) => {
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

    // Assign rank
    let currentRank = 1;
    return sorted.map((ath, idx, arr) => {
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
        rank: currentRank
      };
    });
  };

  const getPoolAthleteRank = (a: RegisteredAthlete) => {
    const sameGroup = getPoolAthletePerformanceList(a.kategoriJurus, a.kategoriUsia, a.gender, a.pool, a.tahapan);
    const found = sameGroup.find(ath => ath.id === a.id);
    if (!found || !found.hasPerformed) return null;
    return found.rank;
  };

  // Helper to determine if an athlete has lost in a BATTLE match based on matchHistory
  const isAthleteLost = (id?: string, name?: string) => {
    if (!id && !name) return false;
    const cleanName = name ? name.trim().toUpperCase() : '';
    
    const lostMatch = matchHistory.find((h: any) => {
      if (h.sistemTanding !== 'BATTLE') return false;
      
      const mMerahId = h.atlitMerah?.id;
      const mBiruId = h.atlitBiru?.id;
      const mMerahName = h.atlitMerah?.nama?.trim().toUpperCase() || '';
      const mBiruName = h.atlitBiru?.nama?.trim().toUpperCase() || '';
      
      const isMerah = (id && mMerahId === id) || (cleanName && mMerahName === cleanName);
      const isBiru = (id && mBiruId === id) || (cleanName && mBiruName === cleanName);
      
      if (!isMerah && !isBiru) return false;
      
      if (h.pemenang === 'MERAH') {
        return isBiru; // Blue lost
      } else if (h.pemenang === 'BIRU') {
        return isMerah; // Red lost
      }
      return false;
    });
    
    return !!lostMatch;
  };

  // Helper to determine Battle match status: 'SELESAI' | 'BERLANGSUNG' | 'BELUM_MULAI'
  const getBattleMatchStatus = (m: any): 'SELESAI' | 'BERLANGSUNG' | 'BELUM_MULAI' => {
    // 1. Check if it's already in match history (which means finished and scored)
    const scoreData = findBattleMatchScore(m);
    if (scoreData) {
      return 'SELESAI';
    }

    // 2. Check if it's currently active (BERLANGSUNG)
    if (activeMatchState && activeMatchState.sistemTanding === 'BATTLE') {
      // Match by party if both have it
      const matchesPartai = m.partaiNo && activeMatchState.partai && String(activeMatchState.partai) === String(m.partaiNo);
      
      const mMerahName = m.atlitMerah?.nama?.trim().toUpperCase();
      const mBiruName = m.atlitBiru?.nama?.trim().toUpperCase();
      
      const aMerahName = activeMatchState.atlitMerah?.nama?.trim().toUpperCase();
      const aBiruName = activeMatchState.atlitBiru?.nama?.trim().toUpperCase();
      
      const namesMatch = mMerahName && aMerahName && (
        (mMerahName === aMerahName && mBiruName === aBiruName) ||
        (mMerahName === aBiruName && mBiruName === aMerahName)
      );

      if (matchesPartai || namesMatch) {
        if (activeMatchState.statusPertandingan === 'SELESAI') {
          return 'SELESAI';
        }
        return 'BERLANGSUNG';
      }
    }

    return 'BELUM_MULAI';
  };

  // Helper to determine POOL athlete status: 'SELESAI' | 'BERLANGSUNG' | 'BELUM_MULAI'
  const getPoolAthleteStatus = (athleteId: string, athleteName: string): 'SELESAI' | 'BERLANGSUNG' | 'BELUM_MULAI' => {
    // 1. Check if it's already in match history (which means finished and scored)
    const score = findPoolAthleteScore(athleteId, athleteName);
    if (score !== null) {
      return 'SELESAI';
    }

    // 2. Check if it's currently active (BERLANGSUNG)
    if (activeMatchState) {
      const isHPool = activeMatchState.sistemTanding === 'POOL' || 
                      activeMatchState.kelas?.toUpperCase().includes('POOL') || 
                      activeMatchState.atlitMerah?.nama === '---' || 
                      activeMatchState.atlitBiru?.nama === '---' ||
                      !activeMatchState.atlitMerah?.nama ||
                      !activeMatchState.atlitBiru?.nama;
                      
      if (isHPool) {
        const hActiveCorner: 'BIRU' | 'MERAH' = (activeMatchState.atlitBiru?.nama && activeMatchState.atlitBiru?.nama !== '---') ? 'BIRU' : 'MERAH';
        const activeAtlit = hActiveCorner === 'BIRU' ? activeMatchState.atlitBiru : activeMatchState.atlitMerah;
        
        if (activeAtlit?.nama?.trim().toUpperCase() === athleteName.trim().toUpperCase()) {
          if (activeMatchState.statusPertandingan === 'SELESAI') {
            return 'SELESAI';
          }
          return 'BERLANGSUNG';
        }
      }
    }

    return 'BELUM_MULAI';
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper arrays
  const JURUS_OPTIONS = ['TUNGGAL', 'TUNGGAL BEBAS', 'GANDA', 'REGU'];
  const USIA_OPTIONS = ['Pra Usia Dini', 'Usia Dini 1', 'Usia Dini 2', 'Pra Remaja', 'Remaja', 'Dewasa', 'Master 1', 'Master 2'];
  const GENDER_OPTIONS = ['Putra', 'Putri'];
  const POOL_OPTIONS = [
    'POOL A', 'POOL B', 'POOL C', 'POOL D', 'POOL E', 'POOL F', 'POOL G',
    'POOL H', 'POOL I', 'POOL J', 'POOL K', 'POOL L', 'POOL M', 'POOL N', 'POOL O', 'None'
  ];
  const TAHAPAN_OPTIONS = ['PENYISIHAN', 'PEREMPAT FINAL', 'SEMIFINAL', 'FINAL'];

  // Sorting priorities for display
  const sortingOrderJurus: Record<string, number> = {
    'TUNGGAL': 1,
    'TUNGGAL BEBAS': 2,
    'GANDA': 3,
    'REGU': 4,
    'SOLO_KREATIF': 5
  };

  const getJurusOrder = (j: string) => sortingOrderJurus[j.toUpperCase()] || 99;

  // Sorted Athletes list (TUNGGAL -> TUNGGAL BEBAS -> GANDA -> REGU -> gender)
  const sortedAthletes = [...athletes].sort((a, b) => {
    const orderA = getJurusOrder(a.kategoriJurus);
    const orderB = getJurusOrder(b.kategoriJurus);
    if (orderA !== orderB) return orderA - orderB;
    const genderComp = a.gender.localeCompare(b.gender);
    if (genderComp !== 0) return genderComp;
    return a.nama.localeCompare(b.nama);
  });

  // Live filtering based on active form selections
  const filteredAthletesGrid = sortedAthletes.filter(athlete => {
    const isSearching = searchQuery.trim().length > 0;
    const bypassFilters = showAllAthletes || isSearching;

    const matchJurus = bypassFilters || athlete.kategoriJurus.toUpperCase() === formData.kategoriJurus.toUpperCase();
    const matchUsia = bypassFilters || athlete.kategoriUsia === formData.kategoriUsia;
    const matchGender = bypassFilters || athlete.gender === formData.gender;
    const matchPool = bypassFilters || (formData.sistemTanding === 'BATTLE' ? true : athlete.pool === formData.pool);
    const matchSistemTanding = bypassFilters || (athlete.sistemTanding || 'BATTLE') === formData.sistemTanding;
    
    if (isSearching) {
      const q = searchQuery.toLowerCase();
      return (athlete.nama.toLowerCase().includes(q) || athlete.kontingen.toLowerCase().includes(q)) && matchJurus && matchUsia && matchGender && matchPool && matchSistemTanding;
    }
    
    return matchJurus && matchUsia && matchGender && matchPool && matchSistemTanding;
  });

  // Unique category groups with registered athletes
  const uniqueBaganGroups = Array.from(new Set(
    athletes.map(a => `${a.kategoriJurus}-${a.kategoriUsia}-${a.gender}`)
  )).sort() as string[];

  // Save / Update Athlete
  const handleSaveAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    if (!formData.nama.trim() || !formData.kontingen.trim()) {
      showToast('Nama Atlit dan Kontingen wajib diisi!', 'error');
      return;
    }

    if (isEditing) {
      setAthletes(prev => prev.map(a => a.id === formData.id ? { ...formData, nama: formData.nama.toUpperCase(), kontingen: formData.kontingen.toUpperCase() } : a));
      showToast('Data Atlit berhasil diperbarui!', 'success');
      setIsEditing(false);
    } else {
      const newAthlete: RegisteredAthlete = {
        ...formData,
        id: `atl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        nama: formData.nama.toUpperCase(),
        kontingen: formData.kontingen.toUpperCase()
      };
      setAthletes(prev => [...prev, newAthlete]);
      showToast('Data Atlit berhasil ditambahkan!', 'success');
    }

    setFormData(prev => ({
      ...prev,
      id: '',
      nama: '',
      kontingen: ''
    }));
  };

  const handleEditAthlete = (athlete: RegisteredAthlete) => {
    playClick();
    setFormData({
      id: athlete.id,
      nama: athlete.nama,
      kontingen: athlete.kontingen,
      kategoriJurus: athlete.kategoriJurus,
      kategoriUsia: athlete.kategoriUsia,
      gender: athlete.gender,
      pool: athlete.pool,
      sistemTanding: athlete.sistemTanding || 'BATTLE',
      tahapan: athlete.tahapan || 'PENYISIHAN',
      gelanggang: athlete.gelanggang || 'GELANGGANG 1'
    });
    setIsEditing(true);
    // Smooth scroll to form on mobile
    document.getElementById('athlete-registration-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteAthlete = (id: string) => {
    playClick();
    if (confirm('Apakah Anda yakin ingin menghapus data Atlit ini?')) {
      setAthletes(prev => prev.filter(a => a.id !== id));
      setCheckedAthleteIds(prev => prev.filter(checkedId => checkedId !== id));
      showToast('Data Atlit berhasil dihapus.', 'info');
    }
  };

  const handleClearForm = () => {
    playClick();
    setFormData({
      id: '',
      nama: '',
      kontingen: '',
      kategoriJurus: 'TUNGGAL',
      kategoriUsia: 'Remaja',
      gender: 'Putra',
      pool: 'POOL A',
      sistemTanding: 'BATTLE',
      tahapan: 'PENYISIHAN',
      gelanggang: 'GELANGGANG 1'
    });
    setIsEditing(false);
  };

  const handleResetAllData = () => {
    playClick();
    setAthletes([]);
    setCheckedAthleteIds([]);
    onUpdateJadwalLines([]);
    handleClearForm();
    setShowResetConfirm(false);
    showToast('Semua data berhasil direset & dihapus!', 'success');
  };

  // EXCEL & PDF STUFF
  const downloadExcelTemplate = (tab: string) => {
    playClick();
    let headers: any[] = [];
    let filename = '';
    
    if (tab === 'INPUT_ATLIT') {
      headers = [
        { "Nama Atlit": "ANDI SANTOSO", "Kontingen": "JAWA TENGAH", "Kategori Jurus": "TUNGGAL", "Kategori Usia": "Remaja", "Gender": "Putra", "POOL": "POOL A", "Sistem Tanding": "BATTLE" },
        { "Nama Atlit": "BUDI UTOMO", "Kontingen": "DKI JAKARTA", "Kategori Jurus": "TUNGGAL", "Kategori Usia": "Remaja", "Gender": "Putra", "POOL": "POOL A", "Sistem Tanding": "POOL" }
      ];
      filename = "Template_Registrasi_Atlit.xlsx";
    } else if (tab === 'BAGAN') {
      headers = [
        { "Kategori Jurus": "TUNGGAL", "Kategori Usia": "Remaja", "Gender": "Putra", "Nama Atlit": "ANDI SANTOSO", "Kontingen": "JAWA TENGAH", "POOL": "POOL A", "Sistem Tanding": "BATTLE" }
      ];
      filename = "Template_Bagan_Atlit.xlsx";
    } else {
      headers = [
        { "Partai": "1", "Kategori Jurus": "TUNGGAL", "Kategori Usia": "Remaja", "Gender": "Putra", "POOL": "POOL A", "Nama Merah": "ANDI SANTOSO", "Kontingen Merah": "JAWA TENGAH", "Nama Biru": "BUDI UTOMO", "Kontingen Biru": "DKI JAKARTA" }
      ];
      filename = "Template_Kontrol_Jadwal.xlsx";
    }

    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, filename);
    showToast('Template Excel berhasil diunduh.', 'success');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>, tab: string) => {
    playClick();
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];

        if (tab === 'INPUT_ATLIT' || tab === 'BAGAN') {
          const imported: RegisteredAthlete[] = json.map((row, idx) => {
            const sysRaw = String(row["Sistem Tanding"] || row["Sistem"] || "BATTLE").toUpperCase().trim();
            const sistemTanding: 'BATTLE' | 'POOL' = (sysRaw === 'POOL') ? 'POOL' : 'BATTLE';
            return {
              id: `atl-imported-${Date.now()}-${idx}`,
              nama: (row["Nama Atlit"] || row["Nama"] || `IMPORT-${idx}`).toUpperCase(),
              kontingen: (row["Kontingen"] || row["Daerah"] || "KLUB").toUpperCase(),
              kategoriJurus: (row["Kategori Jurus"] || row["Kategori"] || "TUNGGAL").toUpperCase(),
              kategoriUsia: row["Kategori Usia"] || row["Usia"] || "Remaja",
              gender: row["Gender"] || row["Jenis Kelamin"] || "Putra",
              pool: row["POOL"] || row["Pool"] || "None",
              sistemTanding: sistemTanding,
              gelanggang: row["Gelanggang"] || row["GELANGGANG"] || "GELANGGANG 1"
            };
          });

          setAthletes(prev => [...prev, ...imported]);
          showToast(`Berhasil mengimpor ${imported.length} Atlit!`, 'success');
        } else {
          // Import schedule
          const importedSchedule = json.map((row, idx) => ({
            partai: String(row["Partai"] || idx + 1),
            kelas: (row["Kategori Jurus"] || row["Kelas"] || "TUNGGAL").toUpperCase(),
            kategoriUsia: row["Kategori Usia"] || row["Usia"] || "Remaja",
            gender: (row["Gender"] || "PUTRA").toUpperCase(),
            tahapPertandingan: "PENYISIHAN",
            gelanggang: row["Gelanggang"] || row["GELANGGANG"] || "GELANGGANG 1",
            atlitMerah: { nama: row["Nama Merah"] || "BYE", kontingen: row["Kontingen Merah"] || "-" },
            atlitBiru: { nama: row["Nama Biru"] || "BYE", kontingen: row["Kontingen Biru"] || "-" }
          }));
          onUpdateJadwalLines(importedSchedule);
          showToast(`Berhasil mengimpor ${importedSchedule.length} jadwal pertandingan!`, 'success');
        }
      } catch (err) {
        showToast('Gagal memproses file Excel.', 'error');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input value
    e.target.value = '';
  };

  const handleExportExcel = (tab: string) => {
    playClick();
    let data: any[] = [];
    let filename = '';

    if (tab === 'INPUT_ATLIT') {
      data = athletes.map((a, i) => ({
        "No": i + 1,
        "Nama Atlit": a.nama,
        "Kontingen": a.kontingen,
        "Gelanggang": a.gelanggang || 'GELANGGANG 1',
        "Kategori Jurus": a.kategoriJurus,
        "Kategori Usia": a.kategoriUsia,
        "Gender": a.gender,
        "POOL": a.pool,
        "Sistem Tanding": a.sistemTanding || 'BATTLE'
      }));
      filename = `Ekspor_Atlit_${Date.now()}.xlsx`;
    } else if (tab === 'BAGAN') {
      const [j, u, g] = selectedBaganGroup.split('-');
      const groupAthletes = athletes.filter(a => a.kategoriJurus === j && a.kategoriUsia === u && a.gender === g);
      data = groupAthletes.map((a, i) => ({
        "Seed": i + 1,
        "Nama Atlit": a.nama,
        "Kontingen": a.kontingen,
        "Gelanggang": a.gelanggang || 'GELANGGANG 1',
        "Kategori": selectedBaganGroup,
        "POOL": a.pool,
        "Sistem Tanding": a.sistemTanding || 'BATTLE'
      }));
      filename = `Ekspor_Bagan_${selectedBaganGroup}_${Date.now()}.xlsx`;
    } else {
      data = jadwalLines.map((row) => ({
        "Partai": row.partai,
        "Gelanggang": row.gelanggang || "GELANGGANG 1",
        "Kategori": row.kelas,
        "Kategori Usia": row.kategoriUsia,
        "Gender": row.gender,
        "Atlit Merah": row.atlitMerah?.nama || 'BYE',
        "Kontingen Merah": row.atlitMerah?.kontingen || '-',
        "Atlit Biru": row.atlitBiru?.nama || 'BYE',
        "Kontingen Biru": row.atlitBiru?.kontingen || '-'
      }));
      filename = `Ekspor_Jadwal_Partai_${Date.now()}.xlsx`;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, filename);
    showToast('Data berhasil diekspor ke Excel.', 'success');
  };

  const handleDownloadPDF = async (tab: string) => {
    playClick();

    // Retrieve uploaded logos from Sekretaris/App state or activeMatchState
    let logoKiri = undefined;
    let logoKanan = undefined;
    try {
      const rawAppState = localStorage.getItem('pencak_silat_scoring_state');
      if (rawAppState) {
        const parsed = JSON.parse(rawAppState);
        if (parsed.logoLeft) logoKiri = parsed.logoLeft;
        if (parsed.logoRight) logoKanan = parsed.logoRight;
      }
    } catch (e) {
      console.error("Error loading logos from app state for PDF", e);
    }

    if (!logoKiri) logoKiri = activeMatchState?.logoKiri;
    if (!logoKanan) logoKanan = activeMatchState?.logoKanan;
    
    if (tab === 'BAGAN' && baganViewMode === 'BATTLE') {
      const [j, u, g] = selectedBaganGroup.split('-');
      const groupAthletes = athletes.filter(a => a.kategoriJurus === j && a.kategoriUsia === u && a.gender === g && a.sistemTanding === 'BATTLE');
      const eventName = activeMatchState?.eventName || "KEJUARAAN NASIONAL PENCAK SILAT 2026";
      
      await downloadTournamentBracketPDF(
        eventName,
        groupAthletes,
        `BAGAN KATEGORI ${j.toUpperCase()} ${g.toUpperCase()}`,
        j,
        g,
        u,
        undefined, // poolObj
        logoKiri, // logoKiri
        logoKanan, // logoKanan
        jadwalLines
      );
      showToast('Bagan PDF berhasil diunduh.', 'success');
      return;
    }

    if (tab === 'BAGAN' && baganViewMode === 'POOL') {
      const eventName = activeMatchState?.eventName || "KEJUARAAN NASIONAL PENCAK SILAT 2026";
      const activeGelanggang = (athletes.length > 0 ? athletes[0].gelanggang : "GELANGGANG I") || "GELANGGANG I";
      const venueText = activeMatchState?.tempatPelaksanaan || "PADEPOKAN PENCAK SILAT TMII, JAKARTA";
      const dateRangeText = activeMatchState?.waktuPelaksanaan || "12 - 15 JUNI 2026";

      const poolAthletesSorted = getSortedAthletesByPool();
      const scheduledPoolAthletes = poolAthletesSorted.filter(a => checkedAthleteIds.includes(a.id));
      
      const filteredLines = scheduledPoolAthletes.map((ath, index) => ({
        partai: String(index + 1),
        kelas: ath.kategoriJurus,
        kategoriUsia: ath.kategoriUsia,
        gender: ath.gender.toUpperCase(),
        tahapPertandingan: `${(ath.tahapan || 'PENYISIHAN').toUpperCase()} - ${(ath.pool && ath.pool !== 'None' ? ath.pool : 'POOL').toUpperCase()}`,
        sistemTanding: 'POOL',
        gelanggang: ath.gelanggang || 'GELANGGANG I',
        atlit: {
          id: ath.id,
          nama: ath.nama,
          kontingen: ath.kontingen
        }
      }));

      if (filteredLines.length === 0) {
        showToast(`Tidak ada data jadwal untuk Sistem POOL!`, 'info');
        return;
      }

      await downloadMatchSchedulePDF(
        eventName,
        filteredLines,
        logoKiri, // logoKiri
        logoKanan, // logoKanan
        activeGelanggang,
        venueText,
        dateRangeText
      );
      showToast(`Dokumen PDF Jadwal Sistem POOL berhasil diunduh.`, 'success');
      return;
    }

    if (tab === 'KONTROL_PARTAI') {
      const eventName = activeMatchState?.eventName || "KEJUARAAN NASIONAL PENCAK SILAT 2026";
      const activeGelanggang = (athletes.length > 0 ? athletes[0].gelanggang : "GELANGGANG I") || "GELANGGANG I";
      const venueText = activeMatchState?.tempatPelaksanaan || "PADEPOKAN PENCAK SILAT TMII, JAKARTA";
      const dateRangeText = activeMatchState?.waktuPelaksanaan || "12 - 15 JUNI 2026";

      // Filter jadwalLines based on active system view to keep them strictly separated
      let filteredLines = jadwalLines.filter(line => {
        const isPool = line.sistemTanding === 'POOL';
        if (kontrolSistemTampilan === 'BATTLE') {
          return !isPool;
        } else {
          return isPool;
        }
      });

      if (kontrolSistemTampilan === 'POOL') {
        const poolAthletesSorted = getSortedAthletesByPool();
        const scheduledPoolAthletes = poolAthletesSorted.filter(a => checkedAthleteIds.includes(a.id));
        
        filteredLines = scheduledPoolAthletes.map((ath, index) => ({
          partai: String(index + 1),
          kelas: ath.kategoriJurus,
          kategoriUsia: ath.kategoriUsia,
          gender: ath.gender.toUpperCase(),
          tahapPertandingan: `${(ath.tahapan || 'PENYISIHAN').toUpperCase()} - ${(ath.pool && ath.pool !== 'None' ? ath.pool : 'POOL').toUpperCase()}`,
          sistemTanding: 'POOL',
          gelanggang: ath.gelanggang || 'GELANGGANG I',
          atlit: {
            id: ath.id,
            nama: ath.nama,
            kontingen: ath.kontingen
          }
        }));
      }

      if (filteredLines.length === 0) {
        showToast(`Tidak ada data jadwal untuk Sistem ${kontrolSistemTampilan}!`, 'info');
        return;
      }

      await downloadMatchSchedulePDF(
        eventName,
        filteredLines,
        logoKiri, // logoKiri
        logoKanan, // logoKanan
        activeGelanggang,
        venueText,
        dateRangeText
      );
      showToast(`Dokumen PDF Jadwal Sistem ${kontrolSistemTampilan} berhasil diunduh.`, 'success');
      return;
    }

    const doc = new jsPDF();
    
    // Common header styles
    doc.setFillColor(15, 10, 45); // Deep Indigo
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SISTEM SKORING DIGITAL PENCAK SILAT OFFLINE", 15, 15);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("REKAP DATA DAN JADWAL REGISTRASI TURNAMEN", 15, 22);
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 255);
    doc.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID')}`, 15, 28);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");

    if (tab === 'INPUT_ATLIT') {
      doc.text("DAFTAR SELURUH DATA ATLIT TERDAFTAR", 15, 45);
      
      let y = 55;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(230, 230, 245);
      doc.rect(15, y - 5, 180, 7, 'F');
      doc.text("No", 17, y);
      doc.text("Nama Atlit", 27, y);
      doc.text("Kontingen / Klub", 80, y);
      doc.text("Jurus", 125, y);
      doc.text("Usia", 155, y);
      doc.text("POOL", 182, y);

      doc.setFont("helvetica", "normal");
      y += 7;
      sortedAthletes.forEach((a, i) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(String(i + 1), 17, y);
        doc.text(a.nama.substring(0, 22), 27, y);
        doc.text(a.kontingen.substring(0, 20), 80, y);
        doc.text(a.kategoriJurus, 125, y);
        doc.text(a.kategoriUsia, 155, y);
        doc.text(a.pool, 182, y);
        doc.setDrawColor(240, 240, 240);
        doc.line(15, y + 2, 195, y + 2);
        y += 8;
      });

    } else if (tab === 'BAGAN') {
      const [j, u, g] = selectedBaganGroup.split('-');
      doc.text(`BAGAN PERTANDINGAN: ${j} - ${u} (${g})`, 15, 45);
      
      const groupAthletes = athletes.filter(a => a.kategoriJurus === j && a.kategoriUsia === u && a.gender === g);
      const rounds = getDynamicBracketRounds(groupAthletes, 1, selectedBaganGroup, jadwalLines, battleMatches);

      let y = 55;
      if (rounds.length === 0) {
        doc.text("Belum ada data Atlit pada kategori ini.", 15, 60);
      } else {
        rounds.forEach((round, rIdx) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(`--- ${round.title} ---`, 15, y);
          y += 6;
          
          round.matches.forEach((m: any, mIdx: number) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            const p1Text = `${m.p1?.nama || 'BYE'} (${m.p1?.kontingen || '-'})`;
            const p2Text = `${m.p2?.nama || 'BYE'} (${m.p2?.kontingen || '-'})`;
            doc.text(`[MERAH] ${p1Text}`, 20, y);
            y += 4;
            doc.text(`[BIRU]  ${p2Text}`, 20, y);
            doc.setDrawColor(220, 220, 220);
            doc.line(18, y + 1.5, 150, y + 1.5);
            y += 7;
          });
          y += 5;
        });
      }
    } else {
      doc.text("JADWAL PERTANDINGAN AKTIF (KONTROL PARTAI)", 15, 45);
      
      let y = 55;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(230, 230, 245);
      doc.rect(15, y - 5, 180, 7, 'F');
      doc.text("Partai", 17, y);
      doc.text("Kelas / Kategori", 32, y);
      doc.text("Sudut Merah", 75, y);
      doc.text("Sudut Biru", 135, y);

      doc.setFont("helvetica", "normal");
      y += 7;
      jadwalLines.forEach((row) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(String(row.partai), 17, y);
        doc.text(`${row.kelas} (${row.gender})`, 32, y);
        doc.text(`${row.atlitMerah?.nama || 'BYE'} (${row.atlitMerah?.kontingen || '-'})`, 75, y);
        doc.text(`${row.atlitBiru?.nama || 'BYE'} (${row.atlitBiru?.kontingen || '-'})`, 135, y);
        doc.setDrawColor(240, 240, 240);
        doc.line(15, y + 2, 195, y + 2);
        y += 8;
      });
    }

    doc.save(`Dokumen_Registrasi_${tab}_${Date.now()}.pdf`);
    showToast('Dokumen PDF berhasil diunduh.', 'success');
  };

  // Synchronize/generate the jadwalLines matching the checked athletes
  const syncJadwalLines = (
    updatedChecked: string[],
    overrideToggledMatches?: Record<string, boolean>,
    overrideCustomPartai?: Record<string, string>,
    overrideCustomTampils?: Record<string, string>
  ) => {
    const newJadwalLines: any[] = [];
    let partaiCounter = 1;

    const actualPartaiNos = overrideCustomPartai || customPartaiNos;
    const actualNomorTampils = overrideCustomTampils || customNomorTampils;

    // 1. Process BATTLE matches in the beautifully sorted/rotated stage-by-stage order!
    const allBattleMatches = getBattleMatches(updatedChecked, overrideToggledMatches);
    const checkedBattleMatches = allBattleMatches.filter(m => m.isScheduled);

    checkedBattleMatches.forEach(m => {
      const customPartai = actualPartaiNos[m.id];
      const partaiValue = customPartai || String(partaiCounter++);
      if (customPartai) {
        const parsedPartai = parseInt(customPartai, 10);
        if (!isNaN(parsedPartai) && parsedPartai >= partaiCounter) {
          partaiCounter = parsedPartai + 1;
        }
      }

      newJadwalLines.push({
        partai: partaiValue,
        kelas: m.kelas,
        kategoriUsia: m.kategoriUsia,
        gender: m.gender.toUpperCase(),
        tahapPertandingan: m.tahapan || 'PENYISIHAN',
        sistemTanding: 'BATTLE',
        gelanggang: m.atlitMerah?.gelanggang || m.atlitBiru?.gelanggang || 'GELANGGANG 1',
        atlitMerah: m.atlitMerah ? { id: m.atlitMerah.id || null, nama: m.atlitMerah.nama, kontingen: m.atlitMerah.kontingen } : { nama: 'BYE', kontingen: '-' },
        atlitBiru: m.atlitBiru ? { id: m.atlitBiru.id || null, nama: m.atlitBiru.nama, kontingen: m.atlitBiru.kontingen } : { nama: 'BYE', kontingen: '-' }
      });
    });

    // 2. Process POOL Athletes (grouped by category as before)
    const sortedAllPool = getSortedAthletesByPool();
    const checkedPoolAthletes = sortedAllPool.filter(a => updatedChecked.includes(a.id));
    
    // Stable array of objects to maintain exact sort order of checkedPoolAthletes
    const poolGroups: { key: string; athList: RegisteredAthlete[] }[] = [];
    checkedPoolAthletes.forEach(ath => {
      const key = `${ath.pool || 'POOL'}_${ath.tahapan || 'PENYISIHAN'}_${ath.kategoriJurus}_${ath.kategoriUsia}_${ath.gender}`;
      let group = poolGroups.find(g => g.key === key);
      if (!group) {
        group = { key, athList: [] };
        poolGroups.push(group);
      }
      group.athList.push(ath);
    });

    poolGroups.forEach(({ key, athList }) => {
      const parts = key.split('_');
      const stageOrPool = parts[0];
      const tahapan = parts[1];
      const jurus = parts[2];
      const usia = parts[3];
      const gender = parts[4];
      
      for (let i = 0; i < athList.length; i++) {
        const ath = athList[i];
        const penampilNum = i + 1;
        const isBiru = penampilNum % 2 !== 0; // 1 -> BIRU, 2 -> MERAH, 3 -> BIRU, etc.

        const upperTahapan = (tahapan || 'PENYISIHAN').toUpperCase();
        const upperPool = (stageOrPool !== 'None' ? stageOrPool : 'POOL').toUpperCase();

        newJadwalLines.push({
          partai: String(partaiCounter++),
          kelas: jurus,
          kategoriUsia: usia,
          gender: gender.toUpperCase(),
          tahapPertandingan: `${upperTahapan} - ${upperPool}`,
          sistemTanding: 'POOL',
          gelanggang: ath.gelanggang || 'GELANGGANG 1',
          atlitMerah: !isBiru ? { id: ath.id, nama: ath.nama, kontingen: ath.kontingen } : { nama: '---', kontingen: 'POOL' },
          atlitBiru: isBiru ? { id: ath.id, nama: ath.nama, kontingen: ath.kontingen } : { nama: '---', kontingen: 'POOL' }
        });
      }
    });

    onUpdateJadwalLines(newJadwalLines);
  };

  // Shuffle Pool system athletes' names and contingents (or change their array order to rotate appearance)
  const handleShufflePoolAthletes = () => {
    playClick();
    const nonPoolAthletes = athletes.filter(a => a.sistemTanding !== 'POOL');
    const poolAthletes = athletes.filter(a => a.sistemTanding === 'POOL');
    
    if (poolAthletes.length === 0) {
      showToast('Tidak ada data Atlit POOL untuk di-shuffle.', 'info');
      return;
    }

    // Group POOL athletes by their category combo: Kategori Jurus, Kategori Usia, Gender
    const groups: Record<string, RegisteredAthlete[]> = {};
    poolAthletes.forEach(ath => {
      const key = `${ath.kategoriJurus}-${ath.kategoriUsia}-${ath.gender}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ath);
    });

    // Shuffle each group separately to keep them within their categories
    const shuffledPoolAthletes: RegisteredAthlete[] = [];
    Object.values(groups).forEach(group => {
      // Simple shuffle
      const shuffledGroup = [...group].sort(() => Math.random() - 0.5);
      shuffledPoolAthletes.push(...shuffledGroup);
    });

    // Merge back
    const updatedAthletes = [...nonPoolAthletes, ...shuffledPoolAthletes];
    setAthletes(updatedAthletes);
    localStorage.setItem('silat_athletes', JSON.stringify(updatedAthletes));
    showToast('Nomor Urut Tampil Atlit POOL berhasil di-Shuffle!', 'success');
  };

  // Shuffle Battle system athletes' names and contingents (to rotate/shuffle matches)
  const handleShuffleBattleAthletes = () => {
    playClick();
    const poolAthletes = athletes.filter(a => a.sistemTanding === 'POOL');
    const battleAthletes = athletes.filter(a => a.sistemTanding !== 'POOL');
    
    if (battleAthletes.length === 0) {
      showToast('Tidak ada data Atlit BATTLE untuk di-shuffle.', 'info');
      return;
    }

    // Group BATTLE athletes by their category combo: Kategori Jurus, Kategori Usia, Gender, Tahapan
    const groups: Record<string, RegisteredAthlete[]> = {};
    battleAthletes.forEach(ath => {
      const key = `${ath.kategoriJurus}-${ath.kategoriUsia}-${ath.gender}-${ath.tahapan || 'PENYISIHAN'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ath);
    });

    // Shuffle each group separately to keep them within their categories/stages
    const shuffledBattleAthletes: RegisteredAthlete[] = [];
    Object.values(groups).forEach(group => {
      const shuffledGroup = [...group].sort(() => Math.random() - 0.5);
      shuffledBattleAthletes.push(...shuffledGroup);
    });

    // Merge back
    const updatedAthletes = [...poolAthletes, ...shuffledBattleAthletes];
    setAthletes(updatedAthletes);
    localStorage.setItem('silat_athletes', JSON.stringify(updatedAthletes));
    
    // Re-sync scheduled parties if any are already checked, to keep them updated
    syncJadwalLines(checkedAthleteIds);
    
    showToast('Nama & Bagan Atlit BATTLE berhasil di-Shuffle!', 'success');
  };

  // Checkbox scheduling synchronization
  const handleCheckboxChange = (athleteId: string) => {
    playClick();
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete && getPoolAthleteStatus(athlete.id, athlete.nama) === 'SELESAI') {
      showToast('Tampilan Atlit sudah selesai dan dikunci.', 'info');
      return;
    }

    let updatedChecked: string[];
    
    if (checkedAthleteIds.includes(athleteId)) {
      updatedChecked = checkedAthleteIds.filter(id => id !== athleteId);
    } else {
      updatedChecked = [...checkedAthleteIds, athleteId];
    }
    setCheckedAthleteIds(updatedChecked);
    syncJadwalLines(updatedChecked);
  };

  const handleSavePartai = (matchId: string) => {
    playClick();
    const cleanValue = editingValue.trim();
    let updated = { ...customPartaiNos };

    if (cleanValue === '') {
      const allBattleMatches = getBattleMatches(checkedAthleteIds);
      const checkedBattleMatches = allBattleMatches.filter(m => m.isScheduled);
      checkedBattleMatches.forEach(m => {
        delete updated[m.id];
      });
      setCustomPartaiNos(updated);
      setEditingId(null);
      syncJadwalLines(checkedAthleteIds, toggledBattleMatches, updated, customNomorTampils);
      showToast('Nomor Partai di-reset ke standar.', 'info');
      return;
    }

    const parsed = parseInt(cleanValue, 10);
    if (!isNaN(parsed)) {
      const allBattleMatches = getBattleMatches(checkedAthleteIds);
      const checkedBattleMatches = allBattleMatches.filter(m => m.isScheduled);
      const N = checkedBattleMatches.length;

      if (N > 0) {
        const targetValue = Math.max(1, Math.min(parsed, N));

        const mappedItems = checkedBattleMatches.map((m, i) => {
          const currentStr = updated[m.id];
          const currentVal = currentStr ? parseInt(currentStr, 10) : (i + 1);
          return { id: m.id, val: isNaN(currentVal) ? (i + 1) : currentVal, origIdx: i };
        });

        const sortedItems = [...mappedItems].sort((a, b) => {
          if (a.val !== b.val) return a.val - b.val;
          return a.origIdx - b.origIdx;
        });

        sortedItems.forEach((item, idx) => {
          item.val = idx + 1;
        });

        const finalMap = new Map<string, number>();
        sortedItems.forEach(item => {
          finalMap.set(item.id, item.val);
        });

        const currentAVal = finalMap.get(matchId) || 1;
        
        let itemBId: string | null = null;
        for (const [id, val] of finalMap.entries()) {
          if (id !== matchId && val === targetValue) {
            itemBId = id;
            break;
          }
        }

        finalMap.set(matchId, targetValue);
        if (itemBId) {
          finalMap.set(itemBId, currentAVal);
        }

        checkedBattleMatches.forEach(m => {
          const newVal = finalMap.get(m.id);
          if (newVal !== undefined) {
            updated[m.id] = String(newVal);
          }
        });
      } else {
        updated[matchId] = cleanValue;
      }
    } else {
      updated[matchId] = cleanValue;
    }

    setCustomPartaiNos(updated);
    setEditingId(null);
    syncJadwalLines(checkedAthleteIds, toggledBattleMatches, updated, customNomorTampils);
    showToast('Nomor Partai berhasil diperbarui dan disesuaikan.', 'success');
  };

  const handleSaveNomorTampil = (athleteId: string) => {
    playClick();
    const cleanValue = editingValue.trim();
    let updated = { ...customNomorTampils };

    const targetAthlete = athletes.find(a => a.id === athleteId);
    if (!targetAthlete) {
      setEditingId(null);
      return;
    }

    const poolListForAthlete = athletes.filter(ath => 
      ath.kategoriJurus === targetAthlete.kategoriJurus && 
      ath.kategoriUsia === targetAthlete.kategoriUsia && 
      ath.gender === targetAthlete.gender && 
      ath.sistemTanding === 'POOL'
    );
    const M = poolListForAthlete.length;

    if (cleanValue === '') {
      poolListForAthlete.forEach(ath => {
        delete updated[ath.id];
      });
      setCustomNomorTampils(updated);
      setEditingId(null);
      syncJadwalLines(checkedAthleteIds, toggledBattleMatches, customPartaiNos, updated);
      showToast('Nomor Urut Tampil di-reset ke standar.', 'info');
      return;
    }

    const parsed = parseInt(cleanValue, 10);
    if (!isNaN(parsed) && M > 0) {
      const targetValue = Math.max(1, Math.min(parsed, M));

      const mappedItems = poolListForAthlete.map((ath, i) => {
        const currentStr = updated[ath.id];
        const currentVal = currentStr ? parseInt(currentStr, 10) : (i + 1);
        return { id: ath.id, val: isNaN(currentVal) ? (i + 1) : currentVal, origIdx: i };
      });

      const sortedItems = [...mappedItems].sort((a, b) => {
        if (a.val !== b.val) return a.val - b.val;
        return a.origIdx - b.origIdx;
      });

      sortedItems.forEach((item, idx) => {
        item.val = idx + 1;
      });

      const finalMap = new Map<string, number>();
      sortedItems.forEach(item => {
        finalMap.set(item.id, item.val);
      });

      const currentAVal = finalMap.get(athleteId) || 1;

      let athleteBId: string | null = null;
      for (const [id, val] of finalMap.entries()) {
        if (id !== athleteId && val === targetValue) {
          athleteBId = id;
          break;
        }
      }

      finalMap.set(athleteId, targetValue);
      if (athleteBId) {
        finalMap.set(athleteBId, currentAVal);
      }

      poolListForAthlete.forEach(ath => {
        const newVal = finalMap.get(ath.id);
        if (newVal !== undefined) {
          updated[ath.id] = String(newVal);
        }
      });
    } else {
      updated[athleteId] = cleanValue;
    }

    setCustomNomorTampils(updated);
    setEditingId(null);
    syncJadwalLines(checkedAthleteIds, toggledBattleMatches, customPartaiNos, updated);
    showToast('Nomor Urut Tampil berhasil diperbarui dan disesuaikan.', 'success');
  };

  // Toggle Battle Match (schedules both Blue and Red athletes)
  const handleToggleBattleMatch = (mId: string | null | undefined, bId: string | null | undefined, matchId?: string) => {
    playClick();
    if (!matchId) return;

    const matchObj = battleMatches.find(m => m.id === matchId);
    if (matchObj && getBattleMatchStatus(matchObj) === 'SELESAI') {
      showToast('Pertandingan sudah selesai dan dikunci.', 'info');
      return;
    }

    const currentScheduled = matchObj ? matchObj.isScheduled : false;
    const nextScheduled = !currentScheduled;

    const newToggled = { ...toggledBattleMatches, [matchId]: nextScheduled };
    setToggledBattleMatches(newToggled);
    localStorage.setItem('silat_toggled_battle_matches', JSON.stringify(newToggled));

    let updatedChecked = [...checkedAthleteIds];
    if (matchObj) {
      const realIds: string[] = [];
      if (matchObj.atlitMerah?.id) realIds.push(matchObj.atlitMerah.id);
      if (matchObj.atlitBiru?.id) realIds.push(matchObj.atlitBiru.id);

      if (nextScheduled) {
        realIds.forEach(id => {
          if (!updatedChecked.includes(id)) {
            updatedChecked.push(id);
          }
        });
      }
    } else {
      if (mId) {
        if (nextScheduled && !updatedChecked.includes(mId)) updatedChecked.push(mId);
      }
      if (bId) {
        if (nextScheduled && !updatedChecked.includes(bId)) updatedChecked.push(bId);
      }
    }

    setCheckedAthleteIds(updatedChecked);
    syncJadwalLines(updatedChecked, newToggled);
  };

  // Helper to sort Battle matches with rotation and stage-by-stage rules
  const sortBattleMatchesByRules = (rawMatches: any[]) => {
    const getCategoryWeight = (key: string) => {
      const [j, u, g] = key.split('-');
      const jUpper = (j || '').toUpperCase();
      const uUpper = (u || '').toUpperCase();
      const gUpper = (g || '').toUpperCase();

      const sortingOrderJurus: Record<string, number> = {
        'TUNGGAL': 1,
        'TUNGGAL BEBAS': 2,
        'GANDA': 3,
        'REGU': 4,
        'SOLO_KREATIF': 5
      };
      const sortingOrderUsia: Record<string, number> = {
        'PRA USIA DINI': 1,
        'USIA DINI 1': 2,
        'USIA DINI 2': 3,
        'PRA REMAJA': 4,
        'REMAJA': 5,
        'DEWASA': 6,
        'MASTER 1': 7,
        'MASTER 2': 8
      };

      const wJurus = sortingOrderJurus[jUpper] || 99;
      const wUsia = sortingOrderUsia[uUpper] || 99;
      const wGender = gUpper === 'PUTRA' ? 1 : (gUpper === 'PUTRI' ? 2 : 3);

      return wJurus * 1000 + wUsia * 10 + wGender;
    };

    // Group matches by distanceToFinal (which represents how many rounds remain until the final)
    const stageGroups: Record<number, any[]> = {};
    rawMatches.forEach(m => {
      const dist = m.distanceToFinal !== undefined ? m.distanceToFinal : 0;
      if (!stageGroups[dist]) stageGroups[dist] = [];
      stageGroups[dist].push(m);
    });

    const sortedAllMatches: any[] = [];

    // Process from the maximum distanceToFinal down to 0 (earliest round first, Final last)
    const allDistances = Object.keys(stageGroups).map(Number).sort((a, b) => b - a);

    for (const dist of allDistances) {
      const matchesInStage = stageGroups[dist];
      if (matchesInStage.length === 0) continue;

      // Group matches in this stage by Category Key: jurus + usia + gender
      const catGroups: Record<string, any[]> = {};
      matchesInStage.forEach(m => {
        const catKey = `${m.kelas}-${m.kategoriUsia}-${m.gender}`;
        if (!catGroups[catKey]) catGroups[catKey] = [];
        catGroups[catKey].push(m);
      });

      // Sort Category Keys by match count descending (most participants/matches first),
      // with a deterministic tie-breaker based on standard categories sequence
      const sortedCatKeys = Object.keys(catGroups).sort((a, b) => {
        const diff = catGroups[b].length - catGroups[a].length;
        if (diff !== 0) return diff;
        return getCategoryWeight(a) - getCategoryWeight(b);
      });

      // Setup queues for each category
      const queues: Record<string, any[]> = {};
      sortedCatKeys.forEach(key => {
        queues[key] = [...catGroups[key]];
      });

      let hasMatches = true;
      const rotationSize = 2; // Rotates category every 2 matches as per instructions

      while (hasMatches) {
        hasMatches = false;
        for (const key of sortedCatKeys) {
          const queue = queues[key];
          if (queue.length > 0) {
            hasMatches = true;
            const countToTake = Math.min(rotationSize, queue.length);
            for (let i = 0; i < countToTake; i++) {
              sortedAllMatches.push(queue.shift());
            }
          }
        }
      }
    }

    // Re-assign index sequentially
    sortedAllMatches.forEach((m, idx) => {
      m.index = idx + 1;
    });

    return sortedAllMatches;
  };

  // Helper to generate Battle matches for Tab 3 (BATTLE Tampilan) - Generates full bracket trees
  const getBattleMatches = (overrideCheckedIds?: string[], overrideToggledMatches?: Record<string, boolean>) => {
    const activeCheckedIds = overrideCheckedIds || checkedAthleteIds;
    const activeToggledMatches = overrideToggledMatches || toggledBattleMatches;
    const battleAthletes = athletes.filter(a => a.sistemTanding === 'BATTLE');
    
    // Group athletes by Category Key: jurus-usia-gender
    const catGroups: Record<string, RegisteredAthlete[]> = {};
    battleAthletes.forEach(ath => {
      const key = `${ath.kategoriJurus}-${ath.kategoriUsia}-${ath.gender}`;
      if (!catGroups[key]) catGroups[key] = [];
      catGroups[key].push(ath);
    });

    // For each category, generate all active matches of the brackets
    const allMatches: any[] = [];

    Object.entries(catGroups).forEach(([catKey, athList]) => {
      const [jurus, usia, gender] = catKey.split('-');
      
      // We run getDynamicBracketRounds to get the full bracket tree rounds
      // Pass empty array [] for jadwalLines so it produces the raw/clean bracket structure
      const rounds = getDynamicBracketRounds(athList, 1, catKey, []);

      rounds.forEach((roundObj: any, rIdx: number) => {
        const stageName = roundObj.title; // ALWAYS use the exact title from roundObj to match the bracket perfectly!
        
        let stageRank = 1;
        const sUpper = (stageName || '').toUpperCase();
        const totalRounds = rounds.length;
        const distanceToFinal = (totalRounds - 1) - rIdx;

        if (sUpper === 'FINAL' || distanceToFinal === 0) {
          stageRank = 4;
        } else if (sUpper === 'SEMIFINAL' || sUpper === 'SEMI FINAL' || distanceToFinal === 1) {
          stageRank = 3;
        } else if (sUpper === 'PENYISIHAN 2' || sUpper === 'PEREMPAT FINAL' || sUpper.includes('PEREMPAT') || distanceToFinal === 2) {
          stageRank = 2;
        } else {
          stageRank = 1;
        }

        // Filter active matches (excluding BYE matches)
        const isMatchBye = (m: any) => {
          const p1Bye = !m.p1 || !m.p1.nama || m.p1.nama.toUpperCase().includes("BYE");
          const p2Bye = !m.p2 || !m.p2.nama || m.p2.nama.toUpperCase().includes("BYE");
          return p1Bye || p2Bye;
        };

        const activeMatchesInRound = roundObj.matches.filter((m: any) => !isMatchBye(m));

        activeMatchesInRound.forEach((m: any, mIdx: number) => {
          const matchId = `bracket-match-${jurus}-${usia}-${gender}-${stageName}-${mIdx}`;

          // To check if scheduled, we match this exact bracket match against our active scheduled jadwalLines
          const cleanStr = (s: string | undefined) => (s || '').trim().toUpperCase();
          const jurusClean = cleanStr(jurus);
          const usiaClean = cleanStr(usia);
          const genderClean = cleanStr(gender);
          const stageClean = cleanStr(stageName).replace(/\s+/g, '');

          const p1Name = cleanStr(m.p1?.nama);
          const p2Name = cleanStr(m.p2?.nama);

          const foundLine = jadwalLines.find(line => {
            const lineKelas = cleanStr(line.kelas);
            const lineUsia = cleanStr(line.kategoriUsia);
            const lineGender = cleanStr(line.gender);
            const lineStage = cleanStr(line.tahapPertandingan).replace(/\s+/g, '');

            const isCatMatch = lineKelas === jurusClean && lineUsia === usiaClean && lineGender === genderClean;
            if (!isCatMatch) return false;

            const lineMerah = cleanStr(line.atlitMerah?.nama);
            const lineBiru = cleanStr(line.atlitBiru?.nama);

            const isStageMatch = lineStage === stageClean || lineStage.includes(stageClean) || stageClean.includes(lineStage) || lineStage.replace(/\s+/g, '') === stageClean;
            if (!isStageMatch) return false;

            const getNormalizedName = (name: string) => {
              const s = (name || '').toUpperCase().replace(/\s+/g, '');
              if (s.includes('PEMENANG') || s.includes('MENUNGGU')) {
                const match = s.match(/\d+/);
                if (match) {
                  return `PEMENANG_PARTAI_${match[0]}`;
                }
              }
              return s;
            };

            const p1Norm = getNormalizedName(p1Name);
            const p2Norm = getNormalizedName(p2Name);
            const lineMerahNorm = getNormalizedName(lineMerah);
            const lineBiruNorm = getNormalizedName(lineBiru);

            return (lineBiruNorm === p1Norm && lineMerahNorm === p2Norm) || (lineBiruNorm === p2Norm && lineMerahNorm === p1Norm);
          });

          const isP1Real = m.p1?.id ? true : false;
          const isP2Real = m.p2?.id ? true : false;
          const isP1Bye = !m.p1?.nama || m.p1.nama.toUpperCase().includes("BYE");
          const isP2Bye = !m.p2?.nama || m.p2.nama.toUpperCase().includes("BYE");
          const isP1Winner = m.p1?.nama && m.p1.nama.toUpperCase().includes("PEMENANG");
          const isP2Winner = m.p2?.nama && m.p2.nama.toUpperCase().includes("PEMENANG");

          const isP1RealAthlete = m.p1?.nama && !m.p1.nama.toUpperCase().includes("PEMENANG") && !m.p1.nama.toUpperCase().includes("MENUNGGU") && !m.p1.nama.toUpperCase().includes("BYE");
          const isP2RealAthlete = m.p2?.nama && !m.p2.nama.toUpperCase().includes("PEMENANG") && !m.p2.nama.toUpperCase().includes("MENUNGGU") && !m.p2.nama.toUpperCase().includes("BYE");

          let defaultScheduled = false;
          const p1Resolved = !isP1Winner && (isP1Real || isP1Bye);
          const p2Resolved = !isP2Winner && (isP2Real || isP2Bye);

          if (!isP1Winner && !isP2Winner) {
            defaultScheduled = (isP1Real || isP1Bye) && (isP2Real || isP2Bye);
          } else if (isP1RealAthlete || isP2RealAthlete) {
            // At least one side has resolved (real athlete or BYE), so auto-schedule it!
            defaultScheduled = p1Resolved || p2Resolved;
          } else {
            defaultScheduled = false;
          }

          let isScheduled = defaultScheduled;
          if (foundLine) {
            isScheduled = true;
          }

          if (activeToggledMatches[matchId] !== undefined) {
            isScheduled = activeToggledMatches[matchId];
          }

          allMatches.push({
            id: matchId,
            kelas: jurus,
            kategoriUsia: usia,
            gender: gender,
            tahapan: stageName,
            stageRank: stageRank,
            distanceToFinal: distanceToFinal,
            atlitBiru: m.p1,
            atlitMerah: m.p2,
            isScheduled: isScheduled,
            partaiNo: customPartaiNos[matchId] || (foundLine ? foundLine.partai : null)
          });
        });
      });
    });

    return sortBattleMatchesByRules(allMatches);
  };

  const battleMatches = getBattleMatches();

  const eligibleBattleMatches = battleMatches.filter(m => {
    const isP1Winner = m.atlitBiru?.nama && m.atlitBiru.nama.toUpperCase().includes("PEMENANG");
    const isP2Winner = m.atlitMerah?.nama && m.atlitMerah.nama.toUpperCase().includes("PEMENANG");
    const isP1RealAthlete = m.atlitBiru?.nama && !m.atlitBiru.nama.toUpperCase().includes("PEMENANG") && !m.atlitBiru.nama.toUpperCase().includes("MENUNGGU") && !m.atlitBiru.nama.toUpperCase().includes("BYE");
    const isP2RealAthlete = m.atlitMerah?.nama && !m.atlitMerah.nama.toUpperCase().includes("PEMENANG") && !m.atlitMerah.nama.toUpperCase().includes("MENUNGGU") && !m.atlitMerah.nama.toUpperCase().includes("BYE");
    
    const isEligible = (!isP1Winner && !isP2Winner) || isP1RealAthlete || isP2RealAthlete;
    const isSelesai = getBattleMatchStatus(m) === 'SELESAI';
    return isEligible && !isSelesai;
  });

  const isAllBattleSelected = eligibleBattleMatches.length > 0 && eligibleBattleMatches.every(m => m.isScheduled);

  // Save current computed battleMatches to localStorage so that the bracket view utility has direct access to them
  const lastSavedBattleMatchesStrRef = useRef<string>('');
  useEffect(() => {
    try {
      const serialized = JSON.stringify(battleMatches);
      if (serialized !== lastSavedBattleMatchesStrRef.current) {
        localStorage.setItem('silat_battle_matches', serialized);
        lastSavedBattleMatchesStrRef.current = serialized;
      }
    } catch (e) {
      console.error("Error saving silat_battle_matches to localStorage", e);
    }
  });

  // Helper to sort POOL athletes based on appearance order (Nomor Tampil)
  const getSortedAthletesByPool = () => {
    const poolAthletes = athletes.filter(a => a.sistemTanding === 'POOL');
    
    // Count total POOL athletes in each Category (Kategori Jurus, Kategori Usia, Gender)
    const categoryCounts: Record<string, number> = {};
    poolAthletes.forEach(a => {
      const key = `${a.kategoriJurus || ''}_${a.kategoriUsia || ''}_${a.gender || ''}`.toUpperCase().trim();
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    });

    // Pre-calculate appearance index (nomorTampil) for each athlete
    const withNomorTampil = poolAthletes.map(a => {
      const poolListForAthlete = athletes.filter(ath => 
        ath.sistemTanding === 'POOL' &&
        (ath.pool || '').toUpperCase().trim() === (a.pool || '').toUpperCase().trim() &&
        (ath.tahapan || 'PENYISIHAN').toUpperCase().trim() === (a.tahapan || 'PENYISIHAN').toUpperCase().trim() &&
        (ath.kategoriJurus || '').toUpperCase().trim() === (a.kategoriJurus || '').toUpperCase().trim() &&
        (ath.kategoriUsia || '').toUpperCase().trim() === (a.kategoriUsia || '').toUpperCase().trim() &&
        (ath.gender || '').toUpperCase().trim() === (a.gender || '').toUpperCase().trim()
      );
      const idxInPool = poolListForAthlete.findIndex(ath => ath.id === a.id);
      const nomorTampil = idxInPool !== -1 ? idxInPool + 1 : 9999;
      
      const catKey = `${a.kategoriJurus || ''}_${a.kategoriUsia || ''}_${a.gender || ''}`.toUpperCase().trim();
      const catSize = categoryCounts[catKey] || 0;

      return { athlete: a, nomorTampil, catSize, catKey };
    });

    // Sort primarily by:
    // 1. catSize descending (Most participants in Category first)
    // 2. catKey alphabetically (To break ties stably between categories of the same size)
    // 3. POOL name alphabetically
    // 4. Tahapan Pertandingan
    // 5. nomorTampil (Original registration index inside the group)
    withNomorTampil.sort((a, b) => {
      // 1. catSize descending
      if (b.catSize !== a.catSize) {
        return b.catSize - a.catSize;
      }

      // 2. catKey alphabetically
      const catKeyComp = a.catKey.localeCompare(b.catKey);
      if (catKeyComp !== 0) return catKeyComp;

      // 3. POOL alphabetically
      const poolA = (a.athlete.pool || '').toUpperCase().trim();
      const poolB = (b.athlete.pool || '').toUpperCase().trim();
      const isANone = poolA === 'NONE' || !poolA;
      const isBNone = poolB === 'NONE' || !poolB;
      if (isANone && !isBNone) return 1;
      if (!isANone && isBNone) return -1;
      const poolComp = poolA.localeCompare(poolB);
      if (poolComp !== 0) return poolComp;

      // 4. Tahapan Pertandingan
      const tahapanA = (a.athlete.tahapan || 'PENYISIHAN').toUpperCase().trim();
      const tahapanB = (b.athlete.tahapan || 'PENYISIHAN').toUpperCase().trim();
      const tahapanComp = tahapanA.localeCompare(tahapanB);
      if (tahapanComp !== 0) return tahapanComp;

      // 5. nomorTampil (Stable order inside the pool)
      if (a.nomorTampil !== b.nomorTampil) {
        return a.nomorTampil - b.nomorTampil;
      }

      return a.athlete.nama.localeCompare(b.athlete.nama);
    });

    return withNomorTampil.map(item => item.athlete);
  };

  const sortedAthletesByPool = getSortedAthletesByPool();

  // Toggle select all available schedules in the active view
  const handleToggleSelectAll = () => {
    playClick();
    if (kontrolSistemTampilan === 'BATTLE') {
      const eligibleMatches = battleMatches.filter(m => {
        const isP1Winner = m.atlitBiru?.nama && m.atlitBiru.nama.toUpperCase().includes("PEMENANG");
        const isP2Winner = m.atlitMerah?.nama && m.atlitMerah.nama.toUpperCase().includes("PEMENANG");
        const isP1RealAthlete = m.atlitBiru?.nama && !m.atlitBiru.nama.toUpperCase().includes("PEMENANG") && !m.atlitBiru.nama.toUpperCase().includes("MENUNGGU") && !m.atlitBiru.nama.toUpperCase().includes("BYE");
        const isP2RealAthlete = m.atlitMerah?.nama && !m.atlitMerah.nama.toUpperCase().includes("PEMENANG") && !m.atlitMerah.nama.toUpperCase().includes("MENUNGGU") && !m.atlitMerah.nama.toUpperCase().includes("BYE");
        
        const isEligible = (!isP1Winner && !isP2Winner) || isP1RealAthlete || isP2RealAthlete;
        const isSelesai = getBattleMatchStatus(m) === 'SELESAI';
        return isEligible && !isSelesai;
      });

      const isAllSelected = eligibleMatches.length > 0 && eligibleMatches.every(m => m.isScheduled);
      
      const newToggled = { ...toggledBattleMatches };
      let updatedChecked = [...checkedAthleteIds];

      eligibleMatches.forEach(m => {
        newToggled[m.id] = !isAllSelected;
        
        const realIds: string[] = [];
        if (m.atlitMerah?.id) realIds.push(m.atlitMerah.id);
        if (m.atlitBiru?.id) realIds.push(m.atlitBiru.id);

        if (!isAllSelected) {
          // Select: add real athlete IDs
          realIds.forEach(id => {
            if (!updatedChecked.includes(id)) {
              updatedChecked.push(id);
            }
          });
        }
      });

      setToggledBattleMatches(newToggled);
      localStorage.setItem('silat_toggled_battle_matches', JSON.stringify(newToggled));
      setCheckedAthleteIds(updatedChecked);
      syncJadwalLines(updatedChecked, newToggled);
    } else {
      const allPoolAthleteIds = sortedAthletesByPool.map(a => a.id);
      const completedPoolAthleteIds = sortedAthletesByPool
        .filter(a => getPoolAthleteStatus(a.id, a.nama) === 'SELESAI')
        .map(a => a.id);
        
      const isAllSelected = allPoolAthleteIds.length > 0 && allPoolAthleteIds.every(id => checkedAthleteIds.includes(id));

      let updatedChecked: string[];
      if (isAllSelected) {
        // Deselect all pool athletes except the ones that are SELESAI, keeping existing battle ones
        updatedChecked = checkedAthleteIds.filter(id => !allPoolAthleteIds.includes(id) || completedPoolAthleteIds.includes(id));
      } else {
        // Select all pool athletes, keeping existing battle ones
        const uniqueIds = new Set([...checkedAthleteIds, ...allPoolAthleteIds]);
        updatedChecked = Array.from(uniqueIds);
      }
      setCheckedAthleteIds(updatedChecked);
      syncJadwalLines(updatedChecked);
    }
  };

  // Find dynamic party assignment label for checked athletes
  const getAthleteScheduledPartai = (athleteId: string) => {
    // Find if scheduled
    const foundLine = jadwalLines.find(line => 
      line.atlitMerah?.id === athleteId || line.atlitBiru?.id === athleteId
    );
    if (foundLine) {
      const corner = foundLine.atlitMerah?.id === athleteId ? 'MERAH' : 'BIRU';
      return `Partai ${foundLine.partai} (${corner})`;
    }
    return '';
  };

  // Total Athlete Summary per Kategori Jurus
  const getClassSummary = () => {
    const summary: Record<string, number> = {};
    JURUS_OPTIONS.forEach(j => {
      summary[j] = athletes.filter(a => a.kategoriJurus.toUpperCase() === j.toUpperCase()).length;
    });
    return summary;
  };

  const classSummary = getClassSummary();

  // Helper to calculate custom yellow connector lines for the BATTLE dynamic bracket
  const calculateBracketLines = () => {
    const container = document.getElementById('bracket-container-battle');
    if (!container) return;

    const newLines: any[] = [];
    const [jurus, usia, gender] = selectedBaganGroup.split('-');
    const groupAthletes = athletes.filter(a => a.kategoriJurus === jurus && a.kategoriUsia === usia && a.gender === gender && a.sistemTanding === 'BATTLE');
    const rounds = getDynamicBracketRounds(groupAthletes, 1, selectedBaganGroup, jadwalLines, battleMatches);

    rounds.forEach((round, rIdx) => {
      if (rIdx >= rounds.length - 1) return; // skip final round since it doesn't connect further
      
      round.matches.forEach((m: any, mIdx: number) => {
        const sourceEl = document.getElementById(`bracket-match-${rIdx}-${mIdx}`);
        const targetEl = document.getElementById(`bracket-match-${rIdx + 1}-${Math.floor(mIdx / 2)}`);
        
        if (sourceEl && targetEl) {
          const containerRect = container.getBoundingClientRect();
          const sourceRect = sourceEl.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();
          
          // X and Y positions are calculated relative to the bracket scrollable container
          const sourceX = sourceRect.right - containerRect.left + container.scrollLeft;
          const sourceY = (sourceRect.top + sourceRect.height / 2) - containerRect.top + container.scrollTop;
          
          const targetX = targetRect.left - containerRect.left + container.scrollLeft;
          const targetY = (targetRect.top + targetRect.height / 2) - containerRect.top + container.scrollTop;
          
          const midX = sourceX + (targetX - sourceX) / 2;
          
          newLines.push({
            id: `${rIdx}-${mIdx}`,
            d: `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`
          });
        }
      });
    });
    
    setBracketLines(newLines);
  };

  // Recalculate bracket lines on relevant changes and resize events
  useEffect(() => {
    if (activeTab === 'BAGAN' && baganViewMode === 'BATTLE') {
      const timer = setTimeout(() => {
        calculateBracketLines();
      }, 250);
      
      window.addEventListener('resize', calculateBracketLines);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', calculateBracketLines);
      };
    }
  }, [activeTab, baganViewMode, selectedBaganGroup, athletes, athletes.length]);

  // Rendering a beautiful Match Bracket Column Layout
  const renderBracketView = () => {
    const [jurus, usia, gender] = selectedBaganGroup.split('-');
    const groupAthletes = athletes.filter(a => a.kategoriJurus === jurus && a.kategoriUsia === usia && a.gender === gender && a.sistemTanding === 'BATTLE');
    
    if (groupAthletes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-purple-500/20 rounded-2xl bg-black/40 text-center h-[300px] w-full">
          <Trophy className="w-12 h-12 text-slate-600 mb-2 animate-bounce" />
          <span className="text-slate-400 font-mono text-xs">Belum ada data Atlit BATTLE terdaftar untuk Kategori:</span>
          <span className="font-extrabold text-purple-400 text-sm mt-1">{selectedBaganGroup.replace(/-/g, ' • ')}</span>
          <span className="text-slate-500 text-[11px] mt-2">Daftarkan Atlit dengan sistem tanding BATTLE terlebih dahulu di Tab "INPUT DATA ATLIT".</span>
        </div>
      );
    }

    const rounds = getDynamicBracketRounds(groupAthletes, 1, selectedBaganGroup, jadwalLines, battleMatches);
    
    const firstRoundMatchCount = rounds[0]?.matches?.length || 0;
    // Mathematically perfect vertical alignment by setting equal column heights
    const columnHeight = Math.max(480, firstRoundMatchCount * 140);

    const formatName = (nama: string | undefined, isMatchSingle?: boolean) => {
      if (isMatchSingle) return "-";
      if (!nama) return "-";
      const u = nama.toUpperCase();
      if (u === "BYE / KOSONG" || u.includes("BYE")) return "-";
      if (u.includes("MENUNGGU PEMENANG PARTAI")) {
        const id = u.replace("MENUNGGU PEMENANG PARTAI", "").trim();
        return `PEMENANG PTY ${id}`;
      }
      if (u.includes("PEMENANG PARTAI")) {
        const id = u.replace("PEMENANG PARTAI", "").trim();
        return `PEMENANG PTY ${id}`;
      }
      return u;
    };

    const formatKontingen = (kontingen: string | undefined, nama: string | undefined, isMatchSingle?: boolean) => {
      if (isMatchSingle) return "-";
      if (!nama || nama.toUpperCase().includes("BYE") || nama.toUpperCase() === "BYE / KOSONG") return "-";
      if (nama.toUpperCase().includes("MENUNGGU PEMENANG PARTAI") || nama.toUpperCase().includes("PEMENANG PARTAI")) return "-";
      if (!kontingen || kontingen === "-" || kontingen.toUpperCase() === "PEMENANG") return "-";
      return kontingen.toUpperCase();
    };
    
    return (
      <div 
        id="bracket-container-battle"
        className="relative flex gap-14 overflow-x-auto pb-6 pt-4 no-scrollbar scroll-smooth items-start min-h-[460px] max-w-full"
      >
        {/* Connection Bracket Lines in Yellow */}
        <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible">
          {bracketLines.map((line) => (
            <path
              key={line.id}
              d={line.d}
              fill="none"
              stroke="#f59e0b" // Orange-yellow/amber colored lines as requested
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          ))}
        </svg>
 
        {rounds.map((round, rIdx) => (
          <div 
            key={rIdx} 
            className="flex flex-col shrink-0 w-64 space-y-6 z-10"
            style={{ height: `${columnHeight}px` }}
          >
            {/* Headers are styled exactly as requested: Amber-500, rounded rectangular banner */}
            <div className="text-center bg-amber-500 text-black font-extrabold px-4 py-2 rounded-lg text-[10.5px] font-sans tracking-widest uppercase shadow-md select-none border border-amber-400">
              {round.title}
            </div>
            
            <div className="flex flex-col justify-around flex-1 py-2">
              {round.matches.map((m: any, mIdx: number) => {
                const isByeP1 = !m.p1?.nama || m.p1?.nama.toUpperCase().includes("BYE");
                const isByeP2 = !m.p2?.nama || m.p2?.nama.toUpperCase().includes("BYE");
                const isMatchSingle = isByeP1 || isByeP2;
                
                return (
                  <div 
                    key={mIdx} 
                    id={`bracket-match-${rIdx}-${mIdx}`}
                    className="bg-[#0b0e20]/95 border border-slate-800/80 rounded-xl relative shadow-xl hover:border-purple-500/30 transition duration-200 w-full flex flex-col"
                  >
                    {/* Badge on top-left of each card */}
                    <div className="absolute -top-2.5 left-3 bg-[#0d142c] border border-slate-800 text-[8px] font-black px-2 py-0.5 rounded font-mono text-slate-300 shadow-sm z-10 tracking-widest uppercase">
                      PARTAI {m.partaiId || '-'}
                    </div>
                    
                    {/* Player 2 (Blue) - Render top with blue accent bar */}
                    <div className={`relative pt-3.5 pb-2 px-3 flex items-center justify-between min-w-0 border-b border-slate-800/60 ${isMatchSingle || isByeP2 ? 'opacity-30' : ''}`}>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-extrabold text-[11px] tracking-wide truncate ${m.p2?.nama && isAthleteLost(m.p2.id, m.p2.nama) ? 'line-through opacity-45 text-blue-700/60' : 'text-blue-400'}`}>
                          {formatName(m.p2?.nama, isMatchSingle)}
                        </span>
                        <span className={`text-[9px] font-mono tracking-wider truncate uppercase ${m.p2?.nama && isAthleteLost(m.p2.id, m.p2.nama) ? 'line-through opacity-45 text-blue-800/60' : 'text-blue-300/70'}`}>
                          {formatKontingen(m.p2?.kontingen, m.p2?.nama, isMatchSingle)}
                        </span>
                      </div>
                      
                      {/* Blue stripe on the right */}
                      <div className="absolute top-0 right-0 bottom-0 w-1 bg-blue-500 rounded-tr-xl" />
                    </div>
                    
                    {/* Player 1 (Red) - Render bottom with red accent bar */}
                    <div className={`relative pt-2 pb-3 px-3 flex items-center justify-between min-w-0 ${isMatchSingle || isByeP1 ? 'opacity-30' : ''}`}>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-extrabold text-[11px] tracking-wide truncate ${m.p1?.nama && isAthleteLost(m.p1.id, m.p1.nama) ? 'line-through opacity-45 text-red-700/60' : 'text-red-400'}`}>
                          {formatName(m.p1?.nama, isMatchSingle)}
                        </span>
                        <span className={`text-[9px] font-mono tracking-wider truncate uppercase ${m.p1?.nama && isAthleteLost(m.p1.id, m.p1.nama) ? 'line-through opacity-45 text-red-800/60' : 'text-red-300/70'}`}>
                          {formatKontingen(m.p1?.kontingen, m.p1?.nama, isMatchSingle)}
                        </span>
                      </div>
                      
                      {/* Red stripe on the right */}
                      <div className="absolute top-0 right-0 bottom-0 w-1 bg-red-500 rounded-br-xl" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen max-h-screen bg-[#05000a] text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background Siluet Gradient Effect */}
      <div className="absolute inset-0 bg-radial-at-t from-[#1b092e] via-[#05000a] to-[#010005] z-0 pointer-events-none" />
      
      {/* Header Panel */}
      <header className="relative z-10 bg-black/40 border-b border-purple-500/20 p-4 md:px-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2.5 bg-purple-950/40 border border-purple-500/30 hover:border-purple-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-purple-300" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300">
              REGISTRASI DATA TURNAMEN
            </h1>
            <p className="text-xs text-slate-400 font-mono">DASHBOARD MANAJEMEN PENDAFTARAN, BAGAN & PENJADWALAN PARTAI</p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => downloadExcelTemplate(activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-sky-500 text-sky-400 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" /> Template Excel
          </button>
          
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-indigo-500 text-indigo-400 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all duration-200">
            <Upload className="w-3.5 h-3.5" /> Impor Excel
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={(e) => handleImportExcel(e, activeTab)} 
            />
          </label>

          <button 
            onClick={() => handleExportExcel(activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-emerald-500 text-emerald-400 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" /> Ekspor Excel
          </button>

          {activeTab !== 'KONTROL_PARTAI' && (
            <button 
              onClick={() => handleDownloadPDF(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950/40 border border-purple-500/40 hover:border-purple-400 text-purple-300 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all duration-200"
            >
              <FileText className="w-3.5 h-3.5" /> Unduh PDF
            </button>
          )}
        </div>
      </header>

      {/* Tabs Menu Navigation */}
      <nav className="relative z-10 bg-black/20 border-b border-purple-500/10 p-2.5 shrink-0">
        <div className="w-full max-w-full px-4 md:px-8 mx-auto flex items-center gap-2">
          <button
            onClick={() => { playClick(); setActiveTab('INPUT_ATLIT'); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center gap-2 ${activeTab === 'INPUT_ATLIT' ? 'bg-gradient-to-r from-purple-800 to-indigo-900 text-white shadow-lg border border-purple-400/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <User className="w-4 h-4" /> 1. Input Data Atlit
          </button>

          <button
            onClick={() => { playClick(); setActiveTab('BAGAN'); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center gap-2 ${activeTab === 'BAGAN' ? 'bg-gradient-to-r from-purple-800 to-indigo-900 text-white shadow-lg border border-purple-400/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Trophy className="w-4 h-4" /> 2. Bagan Pertandingan
          </button>

          <button
            onClick={() => { playClick(); setActiveTab('KONTROL_PARTAI'); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center gap-2 ${activeTab === 'KONTROL_PARTAI' ? 'bg-gradient-to-r from-purple-800 to-indigo-900 text-white shadow-lg border border-purple-400/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <CheckSquare className="w-4 h-4" /> 3. Kontrol Partai
          </button>
        </div>
      </nav>

      {/* Main Content Panels container */}
      <main className="flex-1 overflow-hidden relative z-10 p-4 md:p-6 md:px-8 w-full max-w-full mx-auto flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: INPUT DATA ATLIT */}
          {activeTab === 'INPUT_ATLIT' && (
            <motion.div
              key="tab-input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-full overflow-hidden"
            >
              {/* Form Input (Left span 5/12) */}
              <div id="athlete-registration-form" className="lg:col-span-5 bg-gradient-to-br from-[#12082b] to-black/60 p-5 rounded-2xl border border-purple-500/20 flex flex-col justify-between shadow-xl overflow-y-auto no-scrollbar">
                <form onSubmit={handleSaveAthlete} className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-purple-400 border-b border-purple-500/20 pb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <User className="w-4.5 h-4.5 text-purple-400" />
                      {isEditing ? 'EDIT DATA ATLIT' : 'REGISTRASI DATA ATLIT BARU'}
                    </span>
                    {isEditing && (
                      <span className="px-2 py-0.5 text-[9px] font-black tracking-widest uppercase bg-amber-500/20 border border-amber-500/30 rounded text-amber-300 animate-pulse">
                        EDITING MODE
                      </span>
                    )}
                  </h3>

                  {/* Name Input */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1.5">Nama Lengkap Atlit</label>
                    <input 
                      type="text"
                      required
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      placeholder="cth: KADEK WAHYU DEWANTARA"
                      className="w-full bg-black/60 border border-white/10 focus:border-purple-500 rounded-xl px-3 py-2 text-xs uppercase text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                    />
                  </div>

                  {/* Contingent Input */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1.5">Daerah / Kontingen</label>
                    <input 
                      type="text"
                      required
                      value={formData.kontingen}
                      onChange={(e) => setFormData({ ...formData, kontingen: e.target.value })}
                      placeholder="cth: BALI - INDONESIA"
                      className="w-full bg-black/60 border border-white/10 focus:border-purple-500 rounded-xl px-3 py-2 text-xs uppercase text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                    />
                  </div>

                  {/* Gelanggang Dropdown Input */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1.5">Gelanggang</label>
                    <select
                      value={formData.gelanggang || 'GELANGGANG 1'}
                      onChange={(e) => setFormData({ ...formData, gelanggang: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 focus:border-purple-500 rounded-xl px-3 py-2 text-xs uppercase text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40 cursor-pointer"
                    >
                      {['GELANGGANG 1', 'GELANGGANG 2', 'GELANGGANG 3', 'GELANGGANG 4', 'GELANGGANG 5', 'GELANGGANG 6', 'GELANGGANG 7'].map(g => (
                        <option key={g} value={g} className="bg-slate-900 text-white uppercase">{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1.5">Sistem Tanding</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => { playClick(); setFormData({ ...formData, sistemTanding: 'BATTLE', pool: 'None' }); }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                          formData.sistemTanding === 'BATTLE'
                            ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:bg-black/60'
                        }`}
                      >
                        ⚔️ BATTLE
                      </button>
                      <button
                        type="button"
                        onClick={() => { playClick(); setFormData({ ...formData, sistemTanding: 'POOL', pool: formData.pool === 'None' ? 'POOL A' : formData.pool }); }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                          formData.sistemTanding === 'POOL'
                            ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:bg-black/60'
                        }`}
                      >
                        🏆 POOL
                      </button>
                    </div>
                  </div>

                  {/* Dropdowns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1.5">Kategori Jurus</label>
                      <select
                        value={formData.kategoriJurus}
                        onChange={(e) => setFormData({ ...formData, kategoriJurus: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-xs focus:outline-none text-white focus:border-purple-500 uppercase"
                      >
                        {JURUS_OPTIONS.map(j => (
                          <option key={j} value={j} className="uppercase bg-slate-900 text-white">{j}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1.5">Kategori Usia</label>
                      <select
                        value={formData.kategoriUsia}
                        onChange={(e) => setFormData({ ...formData, kategoriUsia: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-xs focus:outline-none text-white focus:border-purple-500 uppercase"
                      >
                        {USIA_OPTIONS.map(u => (
                          <option key={u} value={u} className="uppercase bg-slate-900 text-white">{u.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1.5">Jenis Kelamin</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-xs focus:outline-none text-white focus:border-purple-500 uppercase"
                      >
                        {GENDER_OPTIONS.map(g => (
                          <option key={g} value={g} className="uppercase bg-slate-900 text-white">{g.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {formData.sistemTanding === 'BATTLE' ? (
                      <div>
                        <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1.5">Tahapan Pertandingan</label>
                        <select
                          value={formData.tahapan || 'PENYISIHAN'}
                          onChange={(e) => setFormData({ ...formData, tahapan: e.target.value })}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-xs focus:outline-none text-white focus:border-purple-500 uppercase"
                        >
                          {TAHAPAN_OPTIONS.map(t => (
                            <option key={t} value={t} className="uppercase bg-slate-900 text-white">{t}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest">POOL</label>
                        </div>
                        <select
                          value={formData.pool}
                          onChange={(e) => setFormData({ ...formData, pool: e.target.value })}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-xs focus:outline-none text-white focus:border-purple-500 uppercase"
                        >
                          {POOL_OPTIONS.map(p => (
                            <option key={p} value={p} className="uppercase bg-slate-900 text-white">{p}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {formData.sistemTanding === 'POOL' && (
                    <div>
                      <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1.5">Tahapan Pertandingan</label>
                      <select
                        value={formData.tahapan || 'PENYISIHAN'}
                        onChange={(e) => setFormData({ ...formData, tahapan: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-xs focus:outline-none text-white focus:border-purple-500 uppercase"
                      >
                        {TAHAPAN_OPTIONS.map(t => (
                          <option key={t} value={t} className="uppercase bg-slate-900 text-white">{t}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-extrabold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-purple-900/30 cursor-pointer active:scale-95 transition"
                    >
                      {isEditing ? 'Simpan Perubahan' : 'Simpan Atlit'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
                    >
                      {isEditing ? 'Batal' : 'Clear'}
                    </button>
                  </div>
                </form>

                {/* Helpful Tip */}
                <div className="mt-6 p-3.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 flex items-start gap-2">
                  <Info className="w-4.5 h-4.5 shrink-0 text-indigo-400 mt-0.5" />
                  <span>Gunakan pencarian atau aktifkan <strong>"Tampilkan Semua"</strong> pada daftar atlit di kanan untuk melihat, mengedit, atau menghapus atlit di kategori lain dengan mudah.</span>
                </div>

                {/* Reset All Data Button */}
                <div className="mt-4 pt-4 border-t border-purple-500/10">
                  {showResetConfirm ? (
                    <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-xl flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-black text-red-200 uppercase tracking-wider">RESET SEMUA DATA?</h4>
                          <p className="text-[10px] text-slate-300 font-medium uppercase mt-1 leading-relaxed">
                            Tindakan ini akan menghapus semua data atlit, mengosongkan bagan pertandingan, dan mereset kontrol partai secara permanen.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            setShowResetConfirm(false);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-[10px] rounded-lg uppercase cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            handleResetAllData();
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] rounded-lg uppercase cursor-pointer flex items-center gap-1 shadow-lg shadow-red-900/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Ya, Reset Semua
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setShowResetConfirm(true);
                      }}
                      className="w-full py-2.5 bg-red-950/20 border border-red-500/20 hover:border-red-500/50 hover:bg-red-950/40 text-red-400 hover:text-red-300 font-extrabold uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition duration-200"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" /> RESET / HAPUS SEMUA DATA
                    </button>
                  )}
                </div>
              </div>

              {/* Live Filter Roster Grid (Right span 7/12) */}
              <div className="lg:col-span-7 flex flex-col space-y-4 h-full overflow-hidden">
                <div className="bg-gradient-to-br from-[#12082b] to-black/60 p-4 rounded-2xl border border-purple-500/20 shadow-xl flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Header with Search and Group details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-500/20 gap-3">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                          <Grid className="w-4 h-4 text-indigo-400" /> Live Filter Roster Atlit
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">
                          {showAllAthletes ? 'MENAMPILKAN SEMUA DATA JURUS' : `${formData.kategoriJurus} • ${formData.kategoriUsia} • ${formData.gender}${formData.sistemTanding !== 'BATTLE' ? ` • ${formData.pool}` : ` • ${formData.tahapan || 'PENYISIHAN'}`}`}
                        </p>
                      </div>

                      {/* Search & Show All Toggles */}
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] text-slate-300 font-bold hover:text-white select-none bg-black/30 border border-white/10 px-2.5 py-1.5 rounded-xl">
                          <input 
                            type="checkbox"
                            checked={showAllAthletes}
                            onChange={(e) => { playClick(); setShowAllAthletes(e.target.checked); }}
                            className="rounded border-white/20 bg-black text-purple-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>Tampilkan Semua ({athletes.length})</span>
                        </label>

                        <input 
                          type="text"
                          placeholder="Cari Atlit / Kontingen..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="px-3 py-1.5 bg-black/50 border border-white/15 focus:border-purple-500 rounded-xl text-xs placeholder-slate-500 focus:outline-none w-full sm:w-40"
                        />
                      </div>
                    </div>

                    {/* Filtered Grid Listing */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 flex-1 overflow-y-auto no-scrollbar pr-1">
                      {filteredAthletesGrid.length === 0 ? (
                        <div className="col-span-2 py-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl bg-black/20">
                          <User className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                          <p className="text-xs font-mono">Tidak ada data Atlit untuk filter ini.</p>
                          <p className="text-[10px] text-slate-600 mt-1">Daftarkan atlit baru menggunakan form sebelah kiri atau aktifkan 'Tampilkan Semua'.</p>
                        </div>
                      ) : (
                        filteredAthletesGrid.map(athlete => {
                          const isPendingDelete = athleteIdToDelete === athlete.id;
                          return isPendingDelete ? (
                            <div key={athlete.id} className="bg-red-950/25 border border-red-500/30 rounded-xl p-3 flex justify-between items-center transition duration-200">
                              <div className="min-w-0 pr-2">
                                <h4 className="font-black text-[11px] text-red-400 truncate">Hapus {athlete.nama}?</h4>
                                <p className="text-[9.5px] text-slate-400 font-mono truncate">Tindakan ini tidak bisa dibatalkan.</p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button 
                                  onClick={() => {
                                    playClick();
                                    setAthletes(prev => prev.filter(a => a.id !== athlete.id));
                                    setCheckedAthleteIds(prev => prev.filter(checkedId => checkedId !== athlete.id));
                                    setAthleteIdToDelete(null);
                                    showToast('Data Atlit berhasil dihapus.', 'info');
                                  }}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[9.5px] rounded uppercase cursor-pointer transition active:scale-95"
                                >
                                  Ya
                                </button>
                                <button 
                                  onClick={() => {
                                    playClick();
                                    setAthleteIdToDelete(null);
                                  }}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-[9.5px] rounded uppercase cursor-pointer transition active:scale-95"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div key={athlete.id} className="bg-[#0b061c]/60 border border-purple-500/10 hover:border-purple-500/35 rounded-xl p-3 flex justify-between items-center transition duration-200">
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-[12px] text-slate-100 truncate">{athlete.nama}</h4>
                                <p className="text-[10px] text-slate-400 font-mono uppercase truncate mt-0.5">{athlete.kontingen}</p>
                                <div className="flex gap-1.5 mt-1">
                                  {athlete.sistemTanding === 'POOL' ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-900/30 text-purple-300 rounded font-mono uppercase">
                                      {athlete.pool}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-900/30 text-purple-300 rounded font-mono uppercase">
                                      {athlete.tahapan || 'PENYISIHAN'}
                                    </span>
                                  )}
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${athlete.sistemTanding === 'POOL' ? 'bg-amber-950/40 text-amber-300 border border-amber-500/20' : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20'}`}>
                                    {athlete.sistemTanding || 'BATTLE'}
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 rounded font-mono uppercase">
                                    {athlete.gelanggang || 'GELANGGANG 1'}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-1 shrink-0">
                                <button 
                                  onClick={() => handleEditAthlete(athlete)}
                                  className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:border-indigo-500 text-indigo-400 hover:text-white cursor-pointer transition"
                                  title="Edit Atlit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => { playClick(); setAthleteIdToDelete(athlete.id); }}
                                  className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:border-red-500 text-red-400 hover:text-white cursor-pointer transition"
                                  title="Hapus Atlit"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="pt-3 border-t border-purple-500/20 flex flex-wrap justify-between text-[11px] font-mono text-slate-400 mt-4 gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <span>Total Registrasi:</span>
                      <strong className="text-white font-bold">{athletes.length} Atlit</strong>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Object.entries(classSummary).map(([cls, qty]) => qty > 0 && (
                        <span key={cls} className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px]">
                          {cls}: <strong className="text-purple-300">{qty}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: BAGAN PERTANDINGAN */}
          {activeTab === 'BAGAN' && (
            <motion.div
              key="tab-bagan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-full overflow-hidden"
            >
              {/* Category Selector Buttons (Left span 4/12) */}
              <div className="lg:col-span-4 bg-gradient-to-br from-[#12082b] to-black/60 p-4 rounded-2xl border border-purple-500/20 flex flex-col shadow-xl h-full overflow-hidden">
                <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 border-b border-purple-500/20 pb-2 mb-3 flex items-center gap-1.5 shrink-0">
                  <Filter className="w-4 h-4 text-purple-400" /> Kategori Jurus Tersedia
                </h3>
                
                <div className="flex-1 overflow-y-auto no-scrollbar pr-1 min-h-0">
                  {uniqueBaganGroups.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                      <AlertCircle className="w-6 h-6 mx-auto text-slate-600 mb-1.5" />
                      <p className="text-xs font-mono">Belum ada kategori yang terisi data atlit.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {uniqueBaganGroups.map(group => {
                        const [jurus, usia, gender] = group.split('-');
                        const count = athletes.filter(a => a.kategoriJurus === jurus && a.kategoriUsia === usia && a.gender === gender).length;
                        
                        return (
                          <button
                            key={group}
                            onClick={() => { playClick(); setSelectedBaganGroup(group); }}
                            className={`w-full text-left p-3 rounded-xl border font-bold flex justify-between items-center transition cursor-pointer active:scale-98 ${selectedBaganGroup === group ? 'bg-gradient-to-r from-purple-800 to-indigo-900 border-purple-400 text-white shadow-lg' : 'bg-black/30 border-white/5 text-slate-300 hover:bg-black/50 hover:border-purple-500/20'}`}
                          >
                            <div>
                              <div className="text-xs font-extrabold truncate">{jurus} ({gender})</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">{usia}</div>
                            </div>
                            <span className="px-2 py-0.5 bg-black/40 border border-white/10 rounded text-[9.5px] font-mono text-indigo-300">
                              {count} Atlit
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bracket Render Zone (Right span 8/12) */}
              <div className="lg:col-span-8 bg-gradient-to-br from-[#12082b] to-black/60 p-5 rounded-2xl border border-purple-500/20 flex flex-col justify-between shadow-xl h-full overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {/* Selector Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-4 shrink-0">
                    <div className="min-w-0">
                      <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">
                        {selectedBaganGroup.replace(/-/g, ' • ')}
                      </h3>
                      <p className="text-[9.5px] text-slate-400 font-mono uppercase mt-0.5">Bagan & Penempatan Sudut Dinamis</p>
                    </div>

                    {/* BATTLE vs POOL Switcher */}
                    <div className="flex bg-black/60 p-1 border border-white/10 rounded-xl">
                      <button
                        onClick={() => { playClick(); setBaganViewMode('BATTLE'); }}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-150 cursor-pointer ${baganViewMode === 'BATTLE' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                      >
                        BATTLE
                      </button>
                      <button
                        onClick={() => { playClick(); setBaganViewMode('POOL'); }}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-150 cursor-pointer ${baganViewMode === 'POOL' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                      >
                        POOL
                      </button>
                    </div>
                  </div>

                  {/* Render Visual Bracket or Participant Pool Table */}
                  <div className="flex-1 overflow-y-auto no-scrollbar pr-1 min-h-0">
                    {baganViewMode === 'BATTLE' ? (
                      renderBracketView()
                    ) : (
                      // POOL View Table & Card Grid
                      <div className="space-y-4">
                      {(() => {
                        const [j, u, g] = selectedBaganGroup.split('-');
                        const poolList = athletes.filter(a => a.kategoriJurus === j && a.kategoriUsia === u && a.gender === g && a.sistemTanding === 'POOL');
                        
                        if (poolList.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-purple-500/20 rounded-2xl bg-black/40 text-center h-[300px] w-full">
                              <Trophy className="w-12 h-12 text-slate-600 mb-2 animate-bounce" />
                              <span className="text-slate-400 font-mono text-xs">Belum ada data Atlit POOL terdaftar untuk Kategori:</span>
                              <span className="font-extrabold text-purple-400 text-sm mt-1">{selectedBaganGroup.replace(/-/g, ' • ')}</span>
                              <span className="text-slate-500 text-[11px] mt-2">Daftarkan Atlit dengan sistem tanding POOL terlebih dahulu di Tab "INPUT DATA ATLIT".</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="flex flex-col space-y-4 w-full">
                            <div className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-955/10 border border-amber-500/20 py-2.5 px-4 rounded-xl shadow-md flex items-center justify-between">
                              <span className="flex items-center gap-2">🏆 SISTEM POOL: URUTAN PENAMPILAN SECARA BERGANTIAN</span>
                              <span className="text-[10px] text-slate-400 font-mono">TOTAL: {poolList.length} PENAMPIL</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {poolList.map((athlete, idx) => {
                                const penampilNum = idx + 1;
                                const isBiru = penampilNum % 2 !== 0; // 1 -> Biru, 2 -> Merah, 3 -> Biru, etc.
                                const cornerColorClass = isBiru ? 'bg-blue-950/20 border-blue-500/30 hover:border-blue-400 text-blue-300' : 'bg-red-950/20 border-red-500/30 hover:border-red-400 text-red-300';
                                const dotColorClass = isBiru ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
                                
                                return (
                                  <div 
                                    key={athlete.id} 
                                    className={`border rounded-xl p-4 flex items-center justify-between transition-all duration-200 relative overflow-hidden shadow-lg ${cornerColorClass}`}
                                  >
                                    <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                                      <Trophy className="w-16 h-16" />
                                    </div>
                                    
                                    <div className="flex items-center gap-3.5 min-w-0">
                                      <div className="flex flex-col items-center justify-center bg-black/40 border border-white/10 rounded-lg w-12 h-12 shrink-0 font-mono text-white">
                                        <span className="text-[8px] text-slate-400 font-bold uppercase leading-none">NO</span>
                                        <span className="text-[8px] text-slate-500 font-bold uppercase leading-none mt-0.5">TAMPIL</span>
                                        <span className="font-extrabold text-xs text-amber-400 mt-0.5">{penampilNum}</span>
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-100 truncate">{athlete.nama}</h4>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase truncate mt-0.5">{athlete.kontingen}</p>
                                      </div>
                                    </div>

                                    <div className="flex flex-col items-end shrink-0 gap-1.5 pl-2">
                                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full font-mono ${isBiru ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                                        {isBiru ? 'Sudut Biru' : 'Sudut Merah'}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${dotColorClass}`} />
                                        <span className="text-[9.5px] text-slate-400 font-mono">
                                          {athlete.pool || 'None'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  </div>
                </div>

                {/* Legend Tip footer */}
                <div className="mt-4 pt-3 border-t border-purple-500/10 text-[10px] text-slate-500 font-mono uppercase flex justify-between shrink-0">
                  <span>Sistem Seeding standard IPSI Pencak Silat</span>
                  <span>Auto-seeding power-of-two (32 &amp; 16 slots)</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: KONTROL PARTAI */}
          {activeTab === 'KONTROL_PARTAI' && (
            <motion.div
              key="tab-kontrol"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 h-full flex flex-col overflow-hidden"
            >
              {/* Scheduling Control Center */}
              <div className="bg-gradient-to-br from-purple-600/35 via-indigo-950/75 to-[#0b0d1e] p-5 rounded-2xl border border-purple-400/40 shadow-2xl flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-500/20 mb-4 gap-3 shrink-0">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-indigo-400" /> Penjadwalan Roster & Kontrol Partai
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">Atur parameter dan tampilkan jadwal partai pertandingan</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Interactive BATTLE / POOL system selector */}
                      <div className="flex items-center gap-1 bg-black/50 border border-white/10 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => { playClick(); setKontrolSistemTampilan('BATTLE'); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition duration-150 cursor-pointer ${kontrolSistemTampilan === 'BATTLE' ? 'bg-gradient-to-r from-purple-800 to-indigo-900 text-white shadow-lg border border-purple-500/30' : 'text-slate-400 hover:text-white'}`}
                        >
                          BATTLE VIEW
                        </button>
                        <button
                          type="button"
                          onClick={() => { playClick(); setKontrolSistemTampilan('POOL'); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition duration-150 cursor-pointer ${kontrolSistemTampilan === 'POOL' ? 'bg-gradient-to-r from-amber-800 to-orange-900 text-white shadow-lg border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}
                        >
                          POOL VIEW
                        </button>
                      </div>

                      {kontrolSistemTampilan === 'BATTLE' && (
                        <>
                          <button
                            type="button"
                            onClick={handleShuffleBattleAthletes}
                            className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-purple-200 border border-purple-500/30 flex items-center gap-1.5 shadow-lg hover:text-white transition duration-150 cursor-pointer"
                          >
                            <Shuffle className="w-3.5 h-3.5 text-purple-300" /> Shuffle Battle
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF('KONTROL_PARTAI')}
                            className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-purple-950 to-indigo-950 border border-purple-500/40 hover:border-purple-400 text-purple-300 flex items-center gap-1.5 shadow-lg transition duration-150 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-400" /> Unduh Dokumen PDF BATTLE
                          </button>
                        </>
                      )}

                      {kontrolSistemTampilan === 'POOL' && (
                        <>
                          <button
                            type="button"
                            onClick={handleShufflePoolAthletes}
                            className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-200 border border-amber-500/30 flex items-center gap-1.5 shadow-lg hover:text-white transition duration-150 cursor-pointer"
                          >
                            <Shuffle className="w-3.5 h-3.5 text-amber-300" /> Shuffle Pool
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadPDF('KONTROL_PARTAI')}
                            className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-950 to-orange-950 border border-amber-500/40 hover:border-amber-400 text-amber-300 flex items-center gap-1.5 shadow-lg transition duration-150 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" /> Unduh Dokumen PDF POOL
                          </button>
                        </>
                      )}

                      {/* Select All / Deselect All Button */}
                      {((kontrolSistemTampilan === 'BATTLE' && battleMatches.length > 0) || 
                        (kontrolSistemTampilan === 'POOL' && sortedAthletesByPool.length > 0)) && (
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border transition duration-150 cursor-pointer ${
                            ((kontrolSistemTampilan === 'BATTLE' && isAllBattleSelected) ||
                             (kontrolSistemTampilan === 'POOL' && sortedAthletesByPool.every(a => checkedAthleteIds.includes(a.id))))
                              ? 'bg-rose-950/40 hover:bg-rose-900/50 border-rose-500/30 text-rose-300'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          {
                            ((kontrolSistemTampilan === 'BATTLE' && isAllBattleSelected) ||
                             (kontrolSistemTampilan === 'POOL' && sortedAthletesByPool.every(a => checkedAthleteIds.includes(a.id))))
                              ? 'BATALKAN SEMUA'
                              : 'PILIH SEMUA'
                          }
                        </button>
                      )}
                      
                      {/* Schedule statistics banner */}
                      <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl px-3 py-1.5 text-xs text-indigo-300 font-mono">
                        Jadwal Aktif: <strong className="text-white font-black">{jadwalLines.length} Partai</strong>
                      </div>

                      {/* Terapkan Jadwal Terpilih button */}
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          if (onApplyJadwal) {
                            onApplyJadwal();
                          }
                        }}
                        disabled={jadwalLines.length === 0}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 border ${
                          jadwalLines.length > 0
                            ? 'bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white border-emerald-500/20 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> TERAPKAN JADWAL TERPILIH
                      </button>
                    </div>
                  </div>

                  {/* 3A: BATTLE SYSTEM VIEW */}
                  {kontrolSistemTampilan === 'BATTLE' ? (
                    <div className="flex-1 overflow-auto no-scrollbar pr-1 min-h-0">
                      <table className="w-full text-left border-collapse text-[11px] bg-black/40 rounded-xl overflow-hidden shadow-inner">
                        <thead>
                          <tr className="bg-gradient-to-r from-purple-900/60 to-indigo-950/60 text-slate-300 font-bold text-[9px] uppercase tracking-widest border-b border-purple-500/20">
                            <th className="p-3 pl-4 text-center w-16">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={handleToggleSelectAll}
                                  className="p-1 rounded bg-slate-900 border border-slate-700 hover:border-purple-500 text-purple-400 transition cursor-pointer"
                                  title="Pilih Semua / Batalkan Semua"
                                >
                                  {isAllBattleSelected ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-600" />
                                  )}
                                </button>
                                <span className="text-[8px]">All</span>
                              </div>
                            </th>
                            <th className="p-3 w-32 min-w-[120px] text-center whitespace-nowrap">Partai</th>
                            <th className="p-3">Kategori / Kelas</th>
                            <th className="p-3 text-right pr-6 w-1/3">Sudut Biru (BLUE)</th>
                            <th className="p-3 text-center w-12">VS</th>
                            <th className="p-3 pl-6 w-1/3">Sudut Merah (RED)</th>
                            <th className="p-3 text-center w-24">Tahapan Pertandingan</th>
                            <th className="p-3 text-center w-28">Skor</th>
                            <th className="p-3 text-center w-28">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-sans">
                          {battleMatches.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-500 font-mono text-xs">
                                Belum ada data atlit bersistem tanding BATTLE yang terdaftar. Silakan daftarkan atlit baru di tab pertama.
                              </td>
                            </tr>
                          ) : (
                            battleMatches.map((m) => {
                              const matchStatus = getBattleMatchStatus(m);
                              const isSelesai = matchStatus === 'SELESAI';
                              
                              return (
                                <tr key={m.id} className={`hover:bg-purple-950/15 transition ${m.isScheduled ? 'bg-purple-950/10' : ''} ${isSelesai ? 'opacity-65 select-none bg-slate-950/40' : ''}`}>
                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      disabled={isSelesai}
                                      onClick={() => handleToggleBattleMatch(m.atlitMerah?.id, m.atlitBiru?.id, m.id)}
                                      className={`p-1 mx-auto rounded bg-slate-900 border ${m.isScheduled ? 'border-green-500/50 text-green-500 hover:border-green-400' : 'border-slate-700 hover:border-purple-500 text-purple-400'} transition cursor-pointer ${isSelesai ? 'opacity-30 cursor-not-allowed border-slate-800' : ''}`}
                                    >
                                      {m.isScheduled ? (
                                        <CheckSquare className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-600" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="p-3 text-center font-mono font-black text-indigo-400 whitespace-nowrap">
                                    {editingId === m.id ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <input
                                          type="text"
                                          value={editingValue}
                                          onChange={(e) => setEditingValue(e.target.value)}
                                          className="w-12 px-1 py-0.5 bg-slate-900 border border-purple-500 rounded text-center text-xs text-white focus:outline-none"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSavePartai(m.id);
                                            else if (e.key === 'Escape') setEditingId(null);
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSavePartai(m.id)}
                                          className="p-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition cursor-pointer"
                                          title="Simpan"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingId(null)}
                                          className="p-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition cursor-pointer"
                                          title="Batal"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1.5 group">
                                        {m.partaiNo ? (
                                          <span className="px-2 py-0.5 bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 rounded text-[10px]">
                                            P-{m.partaiNo}
                                          </span>
                                        ) : (
                                          <span className="text-slate-600 text-[10px] uppercase font-bold">DRAFT</span>
                                        )}
                                        <button
                                          type="button"
                                          disabled={isSelesai}
                                          onClick={() => {
                                            playClick();
                                            setEditingId(m.id);
                                            setEditingValue(m.partaiNo || '');
                                          }}
                                          className={`p-0.5 rounded bg-slate-800 border border-slate-700 hover:border-purple-500 text-slate-400 hover:text-purple-300 transition cursor-pointer opacity-0 group-hover:opacity-100 ${isSelesai ? 'pointer-events-none opacity-0' : ''}`}
                                          title="Edit Partai"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-extrabold text-slate-200 text-xs uppercase leading-none">{m.kelas}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-1 uppercase">
                                      {m.kategoriUsia} • {m.gender}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right pr-6">
                                    {m.atlitBiru ? (
                                      <>
                                        <div className={`font-extrabold text-blue-400 text-xs ${isAthleteLost(m.atlitBiru.id, m.atlitBiru.nama) ? 'line-through opacity-45 text-slate-400' : ''}`}>{m.atlitBiru.nama}</div>
                                        <div className={`text-[10px] text-slate-400 font-mono uppercase mt-0.5 ${isAthleteLost(m.atlitBiru.id, m.atlitBiru.nama) ? 'line-through opacity-45 text-slate-500' : ''}`}>{m.atlitBiru.kontingen}</div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="font-extrabold text-slate-600 text-xs">BYE</div>
                                        <div className="text-[10px] text-slate-600 font-mono uppercase mt-0.5">-</div>
                                      </>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-white/5 border border-white/10 text-slate-400">
                                      VS
                                    </span>
                                  </td>
                                  <td className="p-3 pl-6">
                                    <div className={`font-extrabold text-red-400 text-xs ${isAthleteLost(m.atlitMerah.id, m.atlitMerah.nama) ? 'line-through opacity-45 text-slate-400' : ''}`}>{m.atlitMerah.nama}</div>
                                    <div className={`text-[10px] text-slate-400 font-mono uppercase mt-0.5 ${isAthleteLost(m.atlitMerah.id, m.atlitMerah.nama) ? 'line-through opacity-45 text-slate-500' : ''}`}>{m.atlitMerah.kontingen}</div>
                                  </td>
                                  <td className="p-3 text-center font-mono text-slate-300 font-bold uppercase">
                                    <span className="px-1.5 py-0.5 bg-purple-950/40 border border-purple-500/20 text-purple-300 rounded text-[9.5px]">
                                      {m.tahapan || 'PENYISIHAN'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-mono">
                                    {(() => {
                                      const scoreData = findBattleMatchScore(m);
                                      if (scoreData) {
                                        return (
                                          <div className="inline-flex items-center justify-center gap-1.5 bg-purple-950/35 px-2 py-1 rounded border border-purple-500/20 shadow-sm">
                                            <span className="text-blue-400 font-extrabold text-[11px] leading-none">
                                              {typeof scoreData.skorBiru === 'number' ? scoreData.skorBiru.toFixed(3) : scoreData.skorBiru}
                                            </span>
                                            <span className="text-slate-500 font-bold text-[9px] leading-none">:</span>
                                            <span className="text-red-400 font-extrabold text-[11px] leading-none">
                                              {typeof scoreData.skorMerah === 'number' ? scoreData.skorMerah.toFixed(3) : scoreData.skorMerah}
                                            </span>
                                          </div>
                                        );
                                      }
                                      return (
                                        <span className="text-slate-600 text-[10px] font-bold uppercase font-mono">
                                          -
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="p-3 text-center">
                                    {matchStatus === 'SELESAI' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9.5px] font-black uppercase font-mono shadow-sm">
                                        <Lock className="w-3 h-3 text-emerald-400" /> SELESAI
                                      </span>
                                    ) : matchStatus === 'BERLANGSUNG' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9.5px] font-black uppercase font-mono shadow-sm animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span> BERLANGSUNG
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/55 border border-slate-700/30 text-slate-400 text-[9.5px] font-bold uppercase font-mono">
                                        BELUM MULAI
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* 3B: POOL SYSTEM VIEW (Sorted alphabetically by Pool name A, B, C...) */
                    <div className="flex-1 overflow-auto no-scrollbar pr-1 min-h-0">
                      <table className="w-full text-left border-collapse text-[11px] bg-black/40 rounded-xl overflow-hidden shadow-inner">
                        <thead>
                          <tr className="bg-gradient-to-r from-purple-900/60 to-indigo-950/60 text-slate-300 font-bold text-[9px] uppercase tracking-widest border-b border-purple-500/20">
                            <th className="p-3 pl-4 text-center w-12">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={handleToggleSelectAll}
                                  className="p-1 rounded bg-slate-900 border border-slate-700 hover:border-purple-500 text-purple-400 transition cursor-pointer"
                                  title="Pilih Semua / Batalkan Semua"
                                >
                                  {sortedAthletesByPool.length > 0 && sortedAthletesByPool.every(a => checkedAthleteIds.includes(a.id)) ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-600" />
                                  )}
                                </button>
                                <span className="text-[8px]">All</span>
                              </div>
                            </th>
                            <th className="p-3 w-32 min-w-[130px] whitespace-nowrap">POOL</th>
                            <th className="p-3">TAHAPAN PERTANDINGAN</th>
                            <th className="p-3">Nama Atlit</th>
                            <th className="p-3">Daerah / Kontingen</th>
                            <th className="p-3">Gelanggang</th>
                            <th className="p-3">Kategori Jurus</th>
                            <th className="p-3">Kategori Usia</th>
                            <th className="p-3">Gender</th>
                            <th className="p-3 text-center w-48 min-w-[190px] whitespace-nowrap">Nomor Tampil</th>
                            <th className="p-3 text-center w-28">Skor</th>
                            <th className="p-3 text-center w-28">Status</th>
                            <th className="p-3 text-center w-36">JUARA/PERINGKAT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-sans">
                          {sortedAthletesByPool.length === 0 ? (
                            <tr>
                              <td colSpan={13} className="p-8 text-center text-slate-500 font-mono text-xs">
                                Belum ada data atlit terdaftar. Silakan registrasikan di tab pertama.
                              </td>
                            </tr>
                          ) : (
                            sortedAthletesByPool.map((a) => {
                              const isChecked = checkedAthleteIds.includes(a.id);
                              const athleteStatus = getPoolAthleteStatus(a.id, a.nama);
                              const isSelesai = athleteStatus === 'SELESAI';
                              
                              // Calculate Nomor Urut Penampilan based on POOL system category in Bagan Pertandingan
                              const poolListForAthlete = athletes.filter(ath => 
                                ath.sistemTanding === 'POOL' &&
                                (ath.pool || '').toUpperCase().trim() === (a.pool || '').toUpperCase().trim() &&
                                (ath.tahapan || 'PENYISIHAN').toUpperCase().trim() === (a.tahapan || 'PENYISIHAN').toUpperCase().trim() &&
                                (ath.kategoriJurus || '').toUpperCase().trim() === (a.kategoriJurus || '').toUpperCase().trim() &&
                                (ath.kategoriUsia || '').toUpperCase().trim() === (a.kategoriUsia || '').toUpperCase().trim() &&
                                (ath.gender || '').toUpperCase().trim() === (a.gender || '').toUpperCase().trim()
                              );
                              const idxInPool = poolListForAthlete.findIndex(ath => ath.id === a.id);
                              const defaultNomorTampil = idxInPool !== -1 ? idxInPool + 1 : '-';
                              const nomorTampil = customNomorTampils[a.id] || String(defaultNomorTampil);
                              
                              const numTampilVal = parseInt(nomorTampil, 10);
                              const isGanjil = !isNaN(numTampilVal) ? numTampilVal % 2 !== 0 : true;

                              const rowBgClass = isSelesai
                                ? 'opacity-65 select-none bg-slate-950/40'
                                : isChecked
                                  ? (isGanjil ? 'bg-blue-950/35 text-blue-200' : 'bg-red-950/35 text-red-200')
                                  : (isGanjil ? 'bg-blue-950/15 hover:bg-blue-950/25 text-blue-100/90' : 'bg-red-950/15 hover:bg-red-950/25 text-red-100/90');

                              return (
                                <tr key={a.id} className={`${rowBgClass} transition border-b border-white/5`}>
                                  <td className={`p-3 text-center border-l-4 ${isSelesai ? 'border-l-slate-700' : isGanjil ? 'border-l-blue-500' : 'border-l-red-500'}`}>
                                    <button
                                      type="button"
                                      disabled={isSelesai}
                                      onClick={() => handleCheckboxChange(a.id)}
                                      className={`p-1 rounded bg-slate-900 border ${isChecked ? 'border-green-500/50 text-green-500 hover:border-green-400' : 'border-slate-700 hover:border-purple-500 text-purple-400'} transition cursor-pointer ${isSelesai ? 'opacity-30 cursor-not-allowed border-slate-800' : ''}`}
                                    >
                                      {isChecked ? (
                                        <CheckSquare className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-600" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="p-3 whitespace-nowrap">
                                    <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono font-extrabold rounded inline-block whitespace-nowrap">
                                      {a.pool || 'None'}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-slate-300 font-bold uppercase">
                                    <span className="px-1.5 py-0.5 bg-purple-950/40 border border-purple-500/20 text-purple-300 rounded text-[9.5px]">
                                      {a.tahapan || 'PENYISIHAN'}
                                    </span>
                                  </td>
                                  <td className={`p-3 font-extrabold ${isSelesai ? 'text-slate-400' : isGanjil ? 'text-blue-300' : 'text-red-300'}`}>{a.nama}</td>
                                  <td className="p-3 font-mono text-slate-400">{a.kontingen}</td>
                                  <td className="p-3 font-semibold text-cyan-400 font-mono uppercase text-[10px]">{a.gelanggang || 'GELANGGANG 1'}</td>
                                  <td className="p-3 font-semibold text-slate-300">{a.kategoriJurus}</td>
                                  <td className="p-3 font-mono text-slate-400">{a.kategoriUsia}</td>
                                  <td className="p-3 font-mono text-slate-400">{a.gender}</td>
                                  <td className="p-3 text-center whitespace-nowrap">
                                    {editingId === a.id ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <input
                                          type="text"
                                          value={editingValue}
                                          onChange={(e) => setEditingValue(e.target.value)}
                                          className="w-12 px-1 py-0.5 bg-slate-900 border border-amber-500 rounded text-center text-xs text-white focus:outline-none"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveNomorTampil(a.id);
                                            else if (e.key === 'Escape') setEditingId(null);
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveNomorTampil(a.id)}
                                          className="p-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition cursor-pointer"
                                          title="Simpan"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingId(null)}
                                          className="p-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 transition cursor-pointer"
                                          title="Batal"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1.5 group">
                                        <span className={`px-2.5 py-1 border font-mono font-black text-xs rounded-lg shadow-sm whitespace-nowrap ${
                                          isGanjil 
                                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' 
                                            : 'bg-red-500/20 border-red-500/40 text-red-300'
                                        }`}>
                                          TAMPIL {nomorTampil} ({isGanjil ? 'BIRU' : 'MERAH'})
                                        </span>
                                        <button
                                          type="button"
                                          disabled={isSelesai}
                                          onClick={() => {
                                            playClick();
                                            setEditingId(a.id);
                                            setEditingValue(String(nomorTampil));
                                          }}
                                          className={`p-0.5 rounded bg-slate-800 border border-slate-700 hover:border-amber-500 text-slate-400 hover:text-amber-300 transition cursor-pointer opacity-0 group-hover:opacity-100 ${isSelesai ? 'pointer-events-none opacity-0' : ''}`}
                                          title="Edit Nomor Tampil"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {(() => {
                                      const score = findPoolAthleteScore(a.id, a.nama);
                                      if (score !== null) {
                                        return (
                                          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-black text-xs rounded-lg shadow-sm">
                                            {typeof score === 'number' ? score.toFixed(3) : score} pts
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="text-slate-600 text-[10px] font-bold uppercase font-mono">
                                          -
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="p-3 text-center">
                                    {athleteStatus === 'SELESAI' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9.5px] font-black uppercase font-mono shadow-sm">
                                        <Lock className="w-3 h-3 text-emerald-400" /> SELESAI
                                      </span>
                                    ) : athleteStatus === 'BERLANGSUNG' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9.5px] font-black uppercase font-mono shadow-sm animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span> BERLANGSUNG
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/55 border border-slate-700/30 text-slate-400 text-[9.5px] font-bold uppercase font-mono">
                                        BELUM MULAI
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {(() => {
                                      const rank = getPoolAthleteRank(a);
                                      if (rank !== null) {
                                        let medalColor = "bg-slate-800/50 text-slate-300 border-slate-700/50";
                                        let trophyIcon = null;
                                        if (rank === 1) {
                                          medalColor = "bg-yellow-500/20 border-yellow-500/40 text-yellow-300";
                                          trophyIcon = <Trophy className="w-3 h-3 text-yellow-400 inline" />;
                                        } else if (rank === 2) {
                                          medalColor = "bg-slate-400/20 border-slate-400/40 text-slate-300";
                                        } else if (rank === 3) {
                                          medalColor = "bg-amber-650/20 border-amber-500/40 text-amber-400";
                                        }
                                        
                                        return (
                                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase font-mono shadow-sm ${medalColor}`}>
                                            {trophyIcon} JUARA {rank}
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="text-slate-600 text-[10px] font-bold uppercase font-mono">
                                          -
                                        </span>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Schedule control guidelines */}
                <div className="mt-4 pt-4 border-t border-purple-500/10 text-[10px] text-slate-500 font-mono uppercase flex items-center justify-between shrink-0">
                  <span>Centang ganjil/genap secara otomatis melakukan pairing Merah vs Biru</span>
                  <span>Partai terurut 1, 2, ... menyesuaikan jumlah terpilih</span>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Global Toast Alert Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-green-500 shadow-md shadow-green-500/50' : toast.type === 'error' ? 'bg-red-500 shadow-md shadow-red-500/50' : 'bg-blue-500 shadow-md shadow-blue-500/50'}`} />
            <span className="text-xs font-black uppercase text-slate-100 tracking-wider">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
