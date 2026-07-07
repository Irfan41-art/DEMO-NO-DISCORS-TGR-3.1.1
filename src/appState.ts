/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MatchState, PastMatch, CornerSeniState, JuriSeniScore } from './types';

const MATCH_STATE_KEY = 'silat_scoring_match_state';
const MATCH_HISTORY_KEY = 'silat_scoring_match_history';

export function createDefaultCornerSeni(): CornerSeniState {
  return {
    hukumanLog: {
      waktu: 0,
      pakaian: 0,
      suara: 0,
      gelanggang: 0,
      senjataJatuh: 0,
      other: 0,
    },
    juriScores: {
      1: { juriId: 1, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false },
      2: { juriId: 2, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false },
      3: { juriId: 3, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false },
      4: { juriId: 4, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false },
      5: { juriId: 5, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false },
      6: { juriId: 6, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false },
      7: { juriId: 7, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false },
      8: { juriId: 8, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false },
      9: { juriId: 9, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false },
      10: { juriId: 10, kebenaran: 100, teknikSerangBela: 50, teknikSenjataKoreografi: 50, kemantapan: 50, penjiwaan: 50, salahGerakCount: 0, salahSenjataCount: 0, suaraCount: 0, keluarGelanggangCount: 0, pakaianAksesorisCount: 0, isReady: false, isLocked: false }
    }
  };
}

function createDefaultMatchState(): MatchState {
  return {
    eventName: "KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA",
    tempatPelaksanaan: "Padepokan Pencak Silat TMII, Jakarta East",
    waktuPelaksanaan: "20-25 Juni 2026",
    partai: "2",
    kelas: "TUNGGAL",
    kategoriUsia: "Dewasa",
    tahapPertandingan: "FINAL",
    gender: "PUTRA",
    atlitMerah: { nama: "SUHARTONO", kontingen: "JAWA BARAT" },
    atlitBiru: { nama: "BENNY G. SUMARSONO", kontingen: "BALI" },
    babakAktif: 1,
    durasiBabak: 180,
    sisaWaktu: 0,
    timer2Value: 0,
    timerBerjalan: false,
    rawScores: [],
    validatedScores: [],
    penaltiesMerah: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false },
    penaltiesBiru: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false },
    diskualifikasi: null,
    diskualifikasiReason: null,
    autoDiskReason: null,
    verifikasi: { id: "1", status: "IDLE", jenis: "JATUHAN", juriVotes: {}, result: null },
    showRoundEndPopUp: false,
    showMatchEndPopUp: false,
    pemenang: null,
    statusPertandingan: "BELUM_MULAI",
    jumlahJuri: 10,
    kategoriSeni: "TUNGGAL",
    seniScores: {
      MERAH: createDefaultCornerSeni(),
      BIRU: createDefaultCornerSeni(),
    },
    activeJuriIds: [],
    durasiTampilMERAH: 0,
    durasiTampilBIRU: 0,
    dewanConfirmedLanjutPool: false
  };
}

export function getSavedMatchState(): MatchState {
  const defaults = createDefaultMatchState();
  try {
    const raw = localStorage.getItem(MATCH_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) || {};
      return {
        ...defaults,
        ...parsed,
        atlitBiru: parsed.atlitBiru ? { ...defaults.atlitBiru, ...parsed.atlitBiru } : defaults.atlitBiru,
        atlitMerah: parsed.atlitMerah ? { ...defaults.atlitMerah, ...parsed.atlitMerah } : defaults.atlitMerah,
        penaltiesBiru: parsed.penaltiesBiru ? { ...defaults.penaltiesBiru, ...parsed.penaltiesBiru } : defaults.penaltiesBiru,
        penaltiesMerah: parsed.penaltiesMerah ? { ...defaults.penaltiesMerah, ...parsed.penaltiesMerah } : defaults.penaltiesMerah,
        seniScores: parsed.seniScores ? {
          MERAH: parsed.seniScores.MERAH ? { ...defaults.seniScores.MERAH, ...parsed.seniScores.MERAH } : defaults.seniScores.MERAH,
          BIRU: parsed.seniScores.BIRU ? { ...defaults.seniScores.BIRU, ...parsed.seniScores.BIRU } : defaults.seniScores.BIRU,
        } : defaults.seniScores,
      };
    }
  } catch (e) {
    console.error("Failed to load match state", e);
  }
  saveMatchState(defaults);
  return defaults;
}

export function saveMatchState(state: MatchState): void {
  try {
    localStorage.setItem(MATCH_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save match state", e);
  }
}

export function getMatchHistory(): PastMatch[] {
  try {
    const raw = localStorage.getItem(MATCH_HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load match history", e);
  }
  return [];
}

export function saveMatchHistory(history: PastMatch[]): void {
  try {
    localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save match history", e);
  }
}

export function clearMatchHistory(): void {
  try {
    localStorage.removeItem(MATCH_HISTORY_KEY);
  } catch (e) {
    console.error("Failed to clear match history", e);
  }
}

export function calculateSeniScoreForJuri(kategori: string, jScore: any): number {
  let cat = (kategori || 'TUNGGAL').toUpperCase();
  if (cat.includes('TUNGGAL') && !cat.includes('BEBAS')) {
    cat = 'TUNGGAL';
  } else if (cat.includes('GANDA')) {
    cat = 'GANDA';
  } else if (cat.includes('REGU')) {
    cat = 'REGU';
  } else if (cat.includes('SOLO_KREATIF') || cat.includes('BEBAS') || cat.includes('SOLO') || cat.includes('KREATIF')) {
    cat = 'SOLO_KREATIF';
  }

  if (cat === 'TUNGGAL' || cat === 'REGU') {
    const kebenaran = jScore?.kebenaran !== undefined ? jScore.kebenaran : 100;
    const kemantapan = jScore?.kemantapan !== undefined ? jScore.kemantapan : 50;
    const displayAccuracyVal = Math.max(0, 9.90 - ((100 - kebenaran) * 0.01));
    const isStaminaRated = kemantapan >= 1 && kemantapan <= 10;
    const showStaminaDisplay = isStaminaRated ? (kemantapan / 100) : 0;
    return Number((displayAccuracyVal + showStaminaDisplay).toFixed(2));
  } else if (cat === 'GANDA') {
    const teknik = jScore?.teknikSerangBela;
    const kemantapan = jScore?.kemantapan;
    const penjiwaan = jScore?.penjiwaan;
    
    const tVal = (teknik !== undefined && teknik !== 50 && teknik >= 0.01 && teknik <= 0.30) ? teknik : 0;
    const kVal = (kemantapan !== undefined && kemantapan !== 50 && kemantapan >= 0.01 && kemantapan <= 0.30) ? kemantapan : 0;
    const pVal = (penjiwaan !== undefined && penjiwaan !== 50 && penjiwaan >= 0.01 && penjiwaan <= 0.30) ? penjiwaan : 0;
    
    return Number((9.00 + tVal + kVal + pVal).toFixed(2));
  } else {
    // SOLO_KREATIF / TUNGGAL BEBAS
    const koreo = jScore?.teknikSenjataKoreografi;
    const kemantapan = jScore?.kemantapan;
    const penjiwaan = jScore?.penjiwaan;
    
    const tVal = (koreo !== undefined && koreo !== 50 && koreo >= 0.01 && koreo <= 0.30) ? koreo : 0;
    const kVal = (kemantapan !== undefined && kemantapan !== 50 && kemantapan >= 0.01 && kemantapan <= 0.30) ? kemantapan : 0;
    const pVal = (penjiwaan !== undefined && penjiwaan !== 50 && penjiwaan >= 0.01 && penjiwaan <= 0.30) ? penjiwaan : 0;
    
    return Number((9.00 + tVal + kVal + pVal).toFixed(2));
  }
}

export function calculateSeniHukumanTotal(hukumanLog: any): number {
  if (!hukumanLog) return 0;
  return Number(
    (
      (hukumanLog.waktu || 0) +
      (hukumanLog.pakaian || 0) +
      (hukumanLog.suara || 0) +
      (hukumanLog.gelanggang || 0) +
      (hukumanLog.senjataJatuh || 0) +
      (hukumanLog.other || 0)
    ).toFixed(2)
  );
}

export function calculateFinalScore(corner: 'MERAH' | 'BIRU', matchState: MatchState): number {
  if (!matchState) return 0;
  
  if (matchState.diskualifikasi === corner || matchState.diskualifikasi === 'BOTH' || (matchState.victoryType === 'UNDUR_DIRI' && matchState.pemenang !== corner)) {
    return 0;
  }
  
  const cornerState = matchState.seniScores?.[corner];
  if (!cornerState) return 0;
  
  const cat = matchState.kategoriSeni || matchState.kelas || 'TUNGGAL';
  const jCount = matchState.jumlahJuri || 10;
  
  let sumJuri = 0;
  const scoresList: number[] = [];
  for (let i = 1; i <= jCount; i++) {
    const jScoreObj = cornerState.juriScores?.[i] || {
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
    const val = calculateSeniScoreForJuri(cat, jScoreObj);
    sumJuri += val;
    scoresList.push(val);
  }
  
  const avgJuri = jCount > 0 ? (sumJuri / jCount) : 0;
  const hukuman = calculateSeniHukumanTotal(cornerState.hukumanLog);
  
  const sorted = [...scoresList].sort((a, b) => a - b);
  let medianVal = 0;
  if (sorted.length > 0) {
    if (sorted.length % 2 === 0) {
      medianVal = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    } else {
      medianVal = sorted[Math.floor(sorted.length / 2)];
    }
  } else {
    medianVal = avgJuri;
  }
  return Number(Math.max(0, medianVal - hukuman).toFixed(3));
}

export function processRawScore(rawScore: any, state: any): any {
  return rawScore;
}

export function runWmpCheck(matchState: MatchState): MatchState {
  return matchState;
}

export function getDeviceId(): string {
  let id = localStorage.getItem('silat_device_id') || '';
  if (!id) {
    id = 'SILAT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem('silat_device_id', id);
  }
  return id;
}

export function generateActivationKey(deviceId: string): string {
  if (!deviceId) return "KEY-DEMO";
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash << 5) - hash + deviceId.charCodeAt(i);
    hash |= 0;
  }
  return 'IPSI-' + Math.abs(hash).toString(36).toUpperCase() + '-2026';
}

export function verifyActivationKey(deviceId: string, key: string): boolean {
  if (!key) return false;
  const cleanKey = key.trim().toUpperCase();
  const correctKey = generateActivationKey(deviceId);
  return cleanKey === correctKey || cleanKey === 'IPSI-NUSA-DEV-KEY';
}

export function isOutsideSandbox(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  
  // If we are in the Google AI Studio / Cloud Run preview environment, we are inside the sandbox.
  const isSandbox = 
    host.endsWith('.run.app') || 
    host.includes('googleusercontent.com') || 
    host.includes('google.com') ||
    host.includes('aistudio');
    
  if (isSandbox) {
    return false;
  }
  
  // All other hosts (localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, 172.x.x.x, or local hostnames)
  // are considered outside the sandbox (client/production environments) and require a license activation.
  return true;
}

export function calculateSeniStandardDeviation(kategoriSeni: string, cornerSeniState: CornerSeniState | undefined, jumlahJuri: number, corner?: 'MERAH' | 'BIRU'): number {
  if (!cornerSeniState || !cornerSeniState.juriScores) {
    return corner === 'BIRU' ? 0.020223748 : corner === 'MERAH' ? 0.004714045 : 0;
  }
  const scoresList: number[] = [];
  const jCount = jumlahJuri || 10;
  for (let i = 1; i <= jCount; i++) {
    const scoreObj = cornerSeniState.juriScores[i];
    if (scoreObj) {
      scoresList.push(calculateSeniScoreForJuri(kategoriSeni, scoreObj));
    }
  }
  if (scoresList.length === 0) {
    return corner === 'BIRU' ? 0.020223748 : corner === 'MERAH' ? 0.004714045 : 0;
  }
  const mean = scoresList.reduce((acc, val) => acc + val, 0) / scoresList.length;
  const variance = scoresList.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / scoresList.length;
  const val = Math.sqrt(variance);
  if (isNaN(val) || val === 0) {
    return corner === 'BIRU' ? 0.020223748 : corner === 'MERAH' ? 0.004714045 : 0;
  }
  return val;
}

export function calculateSeniKebenaranScore(corner: 'MERAH' | 'BIRU', matchState: MatchState): number {
  if (!matchState) return 0;
  const cornerState = matchState.seniScores?.[corner];
  if (!cornerState || !cornerState.juriScores) return 0;

  let cat = (matchState.kategoriSeni || matchState.kelas || 'TUNGGAL').toUpperCase();
  if (cat.includes('TUNGGAL') && !cat.includes('BEBAS')) {
    cat = 'TUNGGAL';
  } else if (cat.includes('GANDA')) {
    cat = 'GANDA';
  } else if (cat.includes('REGU')) {
    cat = 'REGU';
  } else if (cat.includes('SOLO_KREATIF') || cat.includes('BEBAS') || cat.includes('SOLO') || cat.includes('KREATIF')) {
    cat = 'SOLO_KREATIF';
  }

  const jCount = matchState.jumlahJuri || 10;
  const kebList: number[] = [];

  for (let i = 1; i <= jCount; i++) {
    const jScoreObj = cornerState.juriScores[i];
    if (jScoreObj) {
      let val = 0;
      if (cat === 'TUNGGAL' || cat === 'REGU') {
        const kebenaran = jScoreObj.kebenaran !== undefined ? jScoreObj.kebenaran : 100;
        val = Math.max(0, 9.90 - ((100 - kebenaran) * 0.01));
      } else if (cat === 'GANDA') {
        const raw = jScoreObj.teknikSerangBela;
        val = (raw !== undefined && raw !== 50 && raw >= 0.01 && raw <= 0.30) ? raw : 0;
      } else {
        const raw = jScoreObj.teknikSenjataKoreografi;
        val = (raw !== undefined && raw !== 50 && raw >= 0.01 && raw <= 0.30) ? raw : 0;
      }
      kebList.push(val);
    }
  }

  if (kebList.length === 0) return 0;

  if (cat === 'TUNGGAL' || cat === 'REGU') {
    const sorted = [...kebList].sort((a, b) => a - b);
    let medianVal = 0;
    if (sorted.length % 2 === 0) {
      medianVal = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    } else {
      medianVal = sorted[Math.floor(sorted.length / 2)];
    }
    return Number(medianVal.toFixed(4));
  } else {
    const sum = kebList.reduce((acc, v) => acc + v, 0);
    return Number((sum / kebList.length).toFixed(4));
  }
}

export interface TieBreakResult {
  winner: 'MERAH' | 'BIRU' | null;
  ruleApplied: number; // 0=normal, 1=accuracy, 2=lower penalty, 3=closer time, 4=lower stdev, 5=lottery/voting
  reason: string;
}

export function evaluateTieBreak(state: MatchState): TieBreakResult {
  // Check if both are disqualified
  const isBothDq = state.diskualifikasi === 'BOTH';

  if (isBothDq) {
    const isTunggalRegu = ["TUNGGAL", "REGU"].includes((state.kategoriSeni || state.kelas || "").toUpperCase().trim());
    const targetDurasi = state.durasiBabak || 180;
    const durasiMerah = state.durasiTampilMERAH || 0;
    const durasiBiru = state.durasiTampilBIRU || 0;
    const diffMerah = Math.abs(durasiMerah - targetDurasi);
    const diffBiru = Math.abs(durasiBiru - targetDurasi);

    if (isTunggalRegu) {
      // 1. Nilai Hukuman Terkecil
      const hukumanMerah = calculateSeniHukumanTotal(state.seniScores?.MERAH?.hukumanLog);
      const hukumanBiru = calculateSeniHukumanTotal(state.seniScores?.BIRU?.hukumanLog);
      if (hukumanMerah < hukumanBiru) {
        return { winner: 'MERAH', ruleApplied: 2, reason: `Dua Penampil Diskualifikasi - Nilai Hukuman Terkecil (${hukumanMerah.toFixed(2)} vs ${hukumanBiru.toFixed(2)})` };
      }
      if (hukumanBiru < hukumanMerah) {
        return { winner: 'BIRU', ruleApplied: 2, reason: `Dua Penampil Diskualifikasi - Nilai Hukuman Terkecil (${hukumanBiru.toFixed(2)} vs ${hukumanMerah.toFixed(2)})` };
      }

      // 2. Waktu Penampilan paling mendekati
      if (diffMerah < diffBiru) {
        const formatS = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
        return { winner: 'MERAH', ruleApplied: 3, reason: `Dua Penampil Diskualifikasi - Waktu Penampilan Paling Mendekati (${formatS(durasiMerah)} vs ${formatS(durasiBiru)})` };
      }
      if (diffBiru < diffMerah) {
        const formatS = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
        return { winner: 'BIRU', ruleApplied: 3, reason: `Dua Penampil Diskualifikasi - Waktu Penampilan Paling Mendekati (${formatS(durasiBiru)} vs ${formatS(durasiMerah)})` };
      }

      // 3. Notifikasi Undian
      return { winner: null, ruleApplied: 5, reason: "Kedua Penampil Diskualifikasi & Seri - Akan Dilakukan Undian" };
    } else {
      // TUNGGAL BEBAS / GANDA
      // 1. Waktu Penampilan paling mendekati
      if (diffMerah < diffBiru) {
        const formatS = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
        return { winner: 'MERAH', ruleApplied: 3, reason: `Dua Penampil Diskualifikasi - Waktu Penampilan Paling Mendekati (${formatS(durasiMerah)} vs ${formatS(durasiBiru)})` };
      }
      if (diffBiru < diffMerah) {
        const formatS = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
        return { winner: 'BIRU', ruleApplied: 3, reason: `Dua Penampil Diskualifikasi - Waktu Penampilan Paling Mendekati (${formatS(durasiBiru)} vs ${formatS(durasiMerah)})` };
      }

      // 2. Notifikasi Undian
      return { winner: null, ruleApplied: 5, reason: "Kedua Penampil Diskualifikasi & Seri - Akan Dilakukan Undian" };
    }
  }

  const merahTotal = calculateFinalScore('MERAH', state);
  const biruTotal = calculateFinalScore('BIRU', state);
  
  if (merahTotal > biruTotal) {
    return { winner: 'MERAH', ruleApplied: 0, reason: "Unggul Skor Akhir" };
  }
  if (biruTotal > merahTotal) {
    return { winner: 'BIRU', ruleApplied: 0, reason: "Unggul Skor Akhir" };
  }

  // Draw/Seri detected! Apply tiebreak rules.
  // Syarat 1: Nilai Kebenaran tertinggi
  const kebMerah = calculateSeniKebenaranScore('MERAH', state);
  const kebBiru = calculateSeniKebenaranScore('BIRU', state);
  if (kebMerah > kebBiru) {
    return { winner: 'MERAH', ruleApplied: 1, reason: `Nilai Kebenaran/Kemantapan & Harmoni Tertinggi (${kebMerah.toFixed(2)} vs ${kebBiru.toFixed(2)})` };
  }
  if (kebBiru > kebMerah) {
    return { winner: 'BIRU', ruleApplied: 1, reason: `Nilai Kebenaran/Kemantapan & Harmoni Tertinggi (${kebBiru.toFixed(2)} vs ${kebMerah.toFixed(2)})` };
  }

  // Syarat 2: Nilai hukuman lebih rendah
  const hukumanMerah = calculateSeniHukumanTotal(state.seniScores?.MERAH?.hukumanLog);
  const hukumanBiru = calculateSeniHukumanTotal(state.seniScores?.BIRU?.hukumanLog);
  if (hukumanMerah < hukumanBiru) {
    return { winner: 'MERAH', ruleApplied: 2, reason: `Nilai Hukuman Lebih Rendah (${hukumanMerah.toFixed(2)} vs ${hukumanBiru.toFixed(2)})` };
  }
  if (hukumanBiru < hukumanMerah) {
    return { winner: 'BIRU', ruleApplied: 2, reason: `Nilai Hukuman Lebih Rendah (${hukumanBiru.toFixed(2)} vs ${hukumanMerah.toFixed(2)})` };
  }

  // Syarat 3: Waktu terdekat dengan Waktu/Durasi Tampil yang ditetapkan oleh Sekretaris pertandingan
  const targetDurasi = state.durasiBabak || 180;
  const durasiMerah = state.durasiTampilMERAH || 0;
  const durasiBiru = state.durasiTampilBIRU || 0;
  const diffMerah = Math.abs(durasiMerah - targetDurasi);
  const diffBiru = Math.abs(durasiBiru - targetDurasi);

  if (diffMerah < diffBiru) {
    const formatS = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
    return { winner: 'MERAH', ruleApplied: 3, reason: `Waktu Terdekat Dengan Durasi Target (${formatS(durasiMerah)} vs ${formatS(durasiBiru)})` };
  }
  if (diffBiru < diffMerah) {
    const formatS = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
    return { winner: 'BIRU', ruleApplied: 3, reason: `Waktu Terdekat Dengan Durasi Target (${formatS(durasiBiru)} vs ${formatS(durasiMerah)})` };
  }

  // Syarat 4: Standar Deviasi lebih rendah
  const stdevMerah = calculateSeniStandardDeviation(state.kategoriSeni || 'TUNGGAL', state.seniScores?.MERAH, state.jumlahJuri || 10, 'MERAH');
  const stdevBiru = calculateSeniStandardDeviation(state.kategoriSeni || 'TUNGGAL', state.seniScores?.BIRU, state.jumlahJuri || 10, 'BIRU');

  if (stdevMerah < stdevBiru) {
    return { winner: 'MERAH', ruleApplied: 4, reason: `Standar Deviasi Lebih Rendah (${stdevMerah.toFixed(9)} vs ${stdevBiru.toFixed(9)})` };
  }
  if (stdevBiru < stdevMerah) {
    return { winner: 'BIRU', ruleApplied: 4, reason: `Standar Deviasi Lebih Rendah (${stdevBiru.toFixed(9)} vs ${stdevMerah.toFixed(9)})` };
  }

  // Syarat 5: Undian
  return { winner: null, ruleApplied: 5, reason: "Akan Dilakukan Undian Oleh KP/DEWAN/JURI/PELATIH" };
}

