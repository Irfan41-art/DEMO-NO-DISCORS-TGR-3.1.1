/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { MatchState, PastMatch } from '../types';
import { calculateSeniScoreForJuri, calculateSeniHukumanTotal, calculateSeniStandardDeviation, calculateSeniKebenaranScore } from '../appState';

/**
 * Calculates correct bracket rounds matching the tournament flow requirements with BYE systems
 */
export function getDynamicBracketRounds(
  athletes: any[], 
  startPartaiNum: number = 1,
  categoryKey?: string,
  jadwalLines?: any[],
  globalMatches?: any[]
): any[] {
  const filtered = athletes.filter(a => a && (a.nama || a.kontingen));
  const N = filtered.length;
  if (N === 0) return [];

  // Next power of 2
  const power = Math.ceil(Math.log2(N)) || 1;
  const size = Math.pow(2, power);

  // Generate standard tournament seeding order
  const getStandardSeedingOrder = (s: number): number[] => {
    let order = [1];
    while (order.length < s) {
      const nextOrder = [];
      const target = order.length * 2 + 1;
      for (const seed of order) {
        nextOrder.push(seed);
        nextOrder.push(target - seed);
      }
      order = nextOrder;
    }
    return order;
  };

  const seedingOrder = getStandardSeedingOrder(size);

  // Map the N athletes to their corresponding seeds
  // Seeds are 1-indexed. Athletes are 0-indexed in the filtered list.
  const seededAthletes = new Array(size).fill(null).map((_, idx) => {
    const seedNum = seedingOrder[idx];
    if (seedNum <= N) {
      return filtered[seedNum - 1];
    }
    return { nama: "BYE / KOSONG", kontingen: "-" };
  });

  // Build Round 1 matches
  const numMatches = size / 2;
  const round1Matches: any[] = [];
  let numByes = 0;

  for (let i = 0; i < numMatches; i++) {
    const p1 = seededAthletes[2 * i] || { nama: "BYE / KOSONG", kontingen: "-" };
    const p2 = seededAthletes[2 * i + 1] || { nama: "BYE / KOSONG", kontingen: "-" };

    const isP1Bye = !p1.nama || p1.nama.toUpperCase().includes("BYE");
    const isP2Bye = !p2.nama || p2.nama.toUpperCase().includes("BYE");

    if (isP1Bye || isP2Bye) {
      numByes++;
    }

    round1Matches.push({
      p1,
      p2,
      p1Score: "",
      p2Score: "",
      isSingleMatch: isP1Bye || isP2Bye,
      advancingSide: isP2Bye && !isP1Bye ? 'p1' : (isP1Bye && !isP2Bye ? 'p2' : null)
    });
  }

  // Determine stage/round name for Round 1
  let round1Title = "PENYISIHAN 1";
  if (numByes === 0) {
    if (numMatches === 1) round1Title = "FINAL";
    else if (numMatches === 2) round1Title = "SEMIFINAL";
    else if (numMatches === 4) round1Title = "PEREMPAT FINAL";
    else round1Title = "BABAK 1";
  }

  const rounds = [];
  rounds.push({
    title: round1Title,
    roundName: round1Title,
    matches: round1Matches
  });

  // Build subsequent rounds hierarchically
  let currentMatches = [...round1Matches];
  let roundNum = 1;
  while (currentMatches.length > 1) {
    const nextMatches: any[] = [];
    const nextMatchesCount = currentMatches.length / 2;
    roundNum++;

    for (let i = 0; i < nextMatchesCount; i++) {
      const m1 = currentMatches[2 * i];
      const m2 = currentMatches[2 * i + 1];

      nextMatches.push({
        m1, // reference to previous match 1
        m2, // reference to previous match 2
        p1: null, // will be resolved in second pass
        p2: null, // will be resolved in second pass
        p1Score: "",
        p2Score: "",
        isSingleMatch: false,
        advancingSide: null
      });
    }

    rounds.push({
      title: `BABAK ${roundNum}`,
      roundName: `BABAK ${roundNum}`,
      matches: nextMatches
    });

    currentMatches = nextMatches;
  }

  // Overwrite round titles/roundNames cleanly to enforce the requested naming:
  // "PENYISIHAN (32 BESAR), PENYISIHAN (16 BESAR), PEREMPAT FINAL, SEMIFINAL, DAN FINAL"
  const L = rounds.length;
  for (let idx = 0; idx < L; idx++) {
    const distanceToFinal = (L - 1) - idx;
    let title = "";
    if (distanceToFinal === 0) {
      title = "FINAL";
    } else if (distanceToFinal === 1) {
      title = "SEMIFINAL";
    } else if (distanceToFinal === 2) {
      title = "PEREMPAT FINAL";
    } else if (distanceToFinal === 3) {
      title = "PENYISIHAN (16 BESAR)";
    } else if (distanceToFinal === 4) {
      title = "PENYISIHAN (32 BESAR)";
    } else if (distanceToFinal === 5) {
      title = "PENYISIHAN (64 BESAR)";
    } else {
      title = `PENYISIHAN (${Math.pow(2, distanceToFinal + 1)} BESAR)`;
    }
    rounds[idx].title = title;
    rounds[idx].roundName = title;
  }

  // Second pass: resolve player names and assign partaiIds round by round
  const maxScheduledPartai = (jadwalLines && jadwalLines.length > 0)
    ? Math.max(...jadwalLines.map(line => Number(line.partai) || 0))
    : 0;
  let globalMatchCounter = Math.max(startPartaiNum, maxScheduledPartai + 1);

  // Read battle matches and history from localStorage if in browser to keep all parts synchronized
  let battleMatchesFromStorage: any[] = [];
  let historyList: any[] = [];
  if (typeof window !== 'undefined') {
    try {
      const rawMatches = localStorage.getItem('silat_battle_matches');
      if (rawMatches) {
        battleMatchesFromStorage = JSON.parse(rawMatches);
      }
      const rawHistory = localStorage.getItem('silat_scoring_match_history');
      if (rawHistory) {
        historyList = JSON.parse(rawHistory);
      }
    } catch (e) {
      console.error("Error reading localStorage in getDynamicBracketRounds", e);
    }
  }
  const activeGlobalMatches = (globalMatches && globalMatches.length > 0) ? globalMatches : battleMatchesFromStorage;

  // Helper to retrieve winner of a target partai from finished matches history
  const getWinnerOfPartai = (targetPartaiId: any) => {
    if (!targetPartaiId) return null;
    const targetPartaiNum = Number(targetPartaiId);
    if (isNaN(targetPartaiNum)) return null;

    const completedMatch = historyList.find(h => {
      const hPartaiStr = String(h.partai || "").trim();
      const numMatch = hPartaiStr.match(/\d+/);
      if (numMatch) {
        return parseInt(numMatch[0], 10) === targetPartaiNum;
      }
      return false;
    });

    if (completedMatch && completedMatch.pemenang) {
      let winner = null;
      if (completedMatch.pemenang === 'MERAH' || completedMatch.pemenang === 'DISK_MERAH') {
        winner = completedMatch.atlitMerah;
      } else if (completedMatch.pemenang === 'BIRU' || completedMatch.pemenang === 'DISK_BIRU') {
        winner = completedMatch.atlitBiru;
      }
      if (winner && winner.nama) {
        return {
          id: winner.id || null,
          nama: winner.nama.toUpperCase(),
          kontingen: (winner.kontingen || "").toUpperCase()
        };
      }
    }
    return null;
  };

  // Helper to identify if a match has a BYE
  const isMatchBye = (m: any) => {
    const p1Bye = !m.p1 || !m.p1.nama || m.p1.nama.toUpperCase().includes("BYE");
    const p2Bye = !m.p2 || !m.p2.nama || m.p2.nama.toUpperCase().includes("BYE");
    return p1Bye || p2Bye;
  };

  // Helper to check if an athlete is a placeholder winner from a previous match
  const isPlaceholderWinner = (p: any) => {
    return p && p.nama && p.nama.toUpperCase().includes("MENUNGGU PEMENANG PARTAI");
  };

  for (let r = 0; r < rounds.length; r++) {
    const roundMatches = rounds[r].matches;

    // First resolve the player names for this round based on previous round's matches
    if (r > 0) {
      roundMatches.forEach((m: any) => {
        // Resolve p1
        const m1 = m.m1;
        if (isMatchBye(m1)) {
          // If previous match was a BYE, the real player advanced directly
          m.p1 = m1.p1 && !m1.p1.nama.toUpperCase().includes("BYE") ? m1.p1 : m1.p2;
        } else {
          const winner = getWinnerOfPartai(m1.partaiId);
          if (winner) {
            m.p1 = winner;
          } else {
            // Otherwise, it is a dynamic winner placeholder
            m.p1 = {
              nama: `MENUNGGU PEMENANG PARTAI ${m1.partaiId}`,
              kontingen: "PEMENANG"
            };
          }
        }

        // Resolve p2
        const m2 = m.m2;
        if (isMatchBye(m2)) {
          // If previous match was a BYE, the real player advanced directly
          m.p2 = m2.p1 && !m2.p1.nama.toUpperCase().includes("BYE") ? m2.p1 : m2.p2;
        } else {
          const winner = getWinnerOfPartai(m2.partaiId);
          if (winner) {
            m.p2 = winner;
          } else {
            // Otherwise, it is a dynamic winner placeholder
            m.p2 = {
              nama: `MENUNGGU PEMENANG PARTAI ${m2.partaiId}`,
              kontingen: "PEMENANG"
            };
          }
        }
      });
    }

    // Now, split matches of this round into BYE matches and ACTIVE matches
    const byeMatches = roundMatches.filter(m => isMatchBye(m));
    const activeMatches = roundMatches.filter(m => !isMatchBye(m));

    // Sort active matches so that those with no dependencies (both players are known) are scheduled first ("mengurut dari Partai Bye dahulu")
    activeMatches.sort((a, b) => {
      const aDeps = (isPlaceholderWinner(a.p1) ? 1 : 0) + (isPlaceholderWinner(a.p2) ? 1 : 0);
      const bDeps = (isPlaceholderWinner(b.p1) ? 1 : 0) + (isPlaceholderWinner(b.p2) ? 1 : 0);
      if (aDeps !== bDeps) {
        return aDeps - bDeps;
      }
      // Keep their relative order if dependencies are same
      return roundMatches.indexOf(a) - roundMatches.indexOf(b);
    });

    // Assign partaiId to BYE matches (not printed/scheduled)
    byeMatches.forEach(m => {
      m.id = null;
      m.partaiId = null;
    });

    // Assign partaiId to active matches in their sorted order (or use the one scheduled in jadwalLines if available)
    activeMatches.forEach(m => {
      let assignedPartai: any = null;
      
      if (activeGlobalMatches && activeGlobalMatches.length > 0 && categoryKey) {
        const [jurus, usia, gender] = categoryKey.split('-');
        const clean = (s: string | undefined) => (s || '').trim().toUpperCase();
        const jurusClean = clean(jurus);
        const usiaClean = clean(usia);
        const genderClean = clean(gender);
        const stageClean = clean(rounds[r].title).replace(/\s+/g, '');

        const p1Name = clean(m.p1?.nama);
        const p2Name = clean(m.p2?.nama);

        const foundGlobal = activeGlobalMatches.find(gm => {
          const gmKelas = clean(gm.kelas);
          const gmUsia = clean(gm.kategoriUsia);
          const gmGender = clean(gm.gender);
          const gmStage = clean(gm.tahapan).replace(/\s+/g, '');

          const isCatMatch = gmKelas === jurusClean && gmUsia === usiaClean && gmGender === genderClean;
          if (!isCatMatch) return false;

          const norm = (s: string) => s.replace(/\s+/g, '');
          const isStageMatch = gmStage === stageClean || gmStage.includes(stageClean) || stageClean.includes(gmStage) || norm(gmStage) === norm(stageClean);
          if (!isStageMatch) return false;

          const gmMerah = clean(gm.atlitMerah?.nama);
          const gmBiru = clean(gm.atlitBiru?.nama);

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
          const gmMerahNorm = getNormalizedName(gmMerah);
          const gmBiruNorm = getNormalizedName(gmBiru);

          return (gmBiruNorm === p1Norm && gmMerahNorm === p2Norm) || (gmBiruNorm === p2Norm && gmMerahNorm === p1Norm);
        });

        if (foundGlobal) {
          assignedPartai = foundGlobal.partaiNo || String(foundGlobal.index);
        }
      }

      if (assignedPartai === null && jadwalLines && jadwalLines.length > 0 && categoryKey) {
        const [jurus, usia, gender] = categoryKey.split('-');
        const clean = (s: string | undefined) => (s || '').trim().toUpperCase();
        const jurusClean = clean(jurus);
        const usiaClean = clean(usia);
        const genderClean = clean(gender);
        const stageClean = clean(rounds[r].title).replace(/\s+/g, '');

        const p1Name = clean(m.p1?.nama);
        const p2Name = clean(m.p2?.nama);

        const foundLine = jadwalLines.find(line => {
          const lineKelas = clean(line.kelas);
          const lineUsia = clean(line.kategoriUsia);
          const lineGender = clean(line.gender);
          const lineStage = clean(line.tahapPertandingan).replace(/\s+/g, '');

          const isCatMatch = lineKelas === jurusClean && lineUsia === usiaClean && lineGender === genderClean;
          if (!isCatMatch) return false;

          const norm = (s: string) => s.replace(/\s+/g, '');
          const isStageMatch = lineStage === stageClean || lineStage.includes(stageClean) || stageClean.includes(lineStage) || norm(lineStage) === norm(stageClean);
          if (!isStageMatch) return false;

          const lineMerah = clean(line.atlitMerah?.nama);
          const lineBiru = clean(line.atlitBiru?.nama);

          // If there are real athletes, match them
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

        if (foundLine) {
          assignedPartai = foundLine.partai;
        }
      }

      if (assignedPartai !== null && assignedPartai !== undefined) {
        m.id = Number(assignedPartai) || globalMatchCounter;
        m.partaiId = assignedPartai;
      } else {
        m.id = globalMatchCounter;
        m.partaiId = globalMatchCounter;
        globalMatchCounter++;
      }
    });
  }

  return rounds;
}

/**
 * Helper to safely load any image source (Base64 data URL, standard URL, SVG or PNG/JPEG) as a clean PNG Base64 Data URL.
 * It also processes SVGs by rendering them onto a canvas, which guarantees jsPDF can display them properly.
 */
async function loadImageAsBase64(urlOrBase64: string): Promise<string> {
  if (!urlOrBase64) return "";

  let src = urlOrBase64;
  if (!urlOrBase64.startsWith("data:")) {
    try {
      const response = await fetch(urlOrBase64);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to load image as base64:", e);
      return "";
    }
  }

  // Now we have a Data URL (starts with "data:").
  // Render it on an HTML canvas to convert SVG or WebP to a standard PNG,
  // which jsPDF fully supports.
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // Keep a higher resolution for clean PDF rendering, e.g., 300px
        const maxDim = 300;
        let width = img.width || 120;
        let height = img.height || 120;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Transparent / clean canvas
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // Export as PNG
          resolve(canvas.toDataURL("image/png"));
          return;
        }
      } catch (err) {
        console.error("Failed to convert image to canvas PNG:", err);
      }
      resolve(src); // fallback to original data URL
    };
    img.onerror = (e) => {
      console.error("Failed to render image source in helper:", e);
      resolve(src); // fallback
    };
    img.src = src;
  });
}

/**
 * Generates an elegant and professional PDF score sheet for the current match
 */
export async function downloadMatchPDF(matchState: MatchState, shouldSave: boolean = true): Promise<jsPDF | void> {
  const base64Kiri = matchState.logoKiri ? await loadImageAsBase64(matchState.logoKiri) : "";
  const base64Kanan = matchState.logoKanan ? await loadImageAsBase64(matchState.logoKanan) : "";

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'legal'
    });

    const jCount = matchState.jumlahJuri || 10;
    const cat = (matchState.kategoriSeni || 'TUNGGAL').toUpperCase();

    const isPoolSystem = matchState.sistemTanding === 'POOL' || 
                         matchState.tahapPertandingan?.toUpperCase().includes('POOL') || 
                         matchState.atlitMerah?.nama === '---' || 
                         matchState.atlitBiru?.nama === '---';
    const activePoolCorner: 'BIRU' | 'MERAH' = (matchState.atlitBiru?.nama && matchState.atlitBiru?.nama !== '---') 
      ? 'BIRU' 
      : (matchState.atlitMerah?.nama && matchState.atlitMerah?.nama !== '---' ? 'MERAH' : (matchState.activeCorner || 'BIRU'));

    const formatSec = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const getCornerDetails = (corner: 'BIRU' | 'MERAH') => {
      const ath = corner === 'BIRU' ? matchState.atlitBiru : matchState.atlitMerah;
      const scores = matchState.seniScores?.[corner];
      
      let sumJuri = 0;
      const scoreArr: number[] = [];
      const v1List: number[] = [];
      const v2List: number[] = [];
      const v3List: number[] = [];
      
      for (let i = 1; i <= jCount; i++) {
        const jsObj = (scores?.juriScores?.[i] || {}) as any;
        let v1 = 0;
        let v2 = 0;
        let v3 = 0;
        
        if (cat === 'GANDA') {
          const rawTeknik = jsObj.teknikSerangBela;
          v1 = (rawTeknik !== undefined && rawTeknik !== 50 && rawTeknik >= 0.01 && rawTeknik <= 0.30) ? rawTeknik : 0;
          const rawKeman = jsObj.kemantapan;
          v2 = (rawKeman !== undefined && rawKeman !== 50 && rawKeman >= 0.01 && rawKeman <= 0.30) ? rawKeman : 0;
          const rawPenjiwaan = jsObj.penjiwaan;
          v3 = (rawPenjiwaan !== undefined && rawPenjiwaan !== 50 && rawPenjiwaan >= 0.01 && rawPenjiwaan <= 0.30) ? rawPenjiwaan : 0;
        } else if (cat === 'SOLO_KREATIF') {
          const rawTeknik = jsObj.teknikSenjataKoreografi;
          v1 = (rawTeknik !== undefined && rawTeknik !== 50 && rawTeknik >= 0.01 && rawTeknik <= 0.30) ? rawTeknik : 0;
          const rawKeman = jsObj.kemantapan;
          v2 = (rawKeman !== undefined && rawKeman !== 50 && rawKeman >= 0.01 && rawKeman <= 0.30) ? rawKeman : 0;
          const rawPenjiwaan = jsObj.penjiwaan;
          v3 = (rawPenjiwaan !== undefined && rawPenjiwaan !== 50 && rawPenjiwaan >= 0.01 && rawPenjiwaan <= 0.30) ? rawPenjiwaan : 0;
        } else {
          // TUNGGAL or REGU
          const sGerak = jsObj.salahGerakCount || 0;
          v1 = sGerak;
          const kebenaran = jsObj.kebenaran !== undefined ? jsObj.kebenaran : 100;
          v2 = Math.max(0, 9.90 - ((100 - kebenaran) * 0.01));
          const kemantapan = jsObj.kemantapan !== undefined ? jsObj.kemantapan : 50;
          const isStaminaRated = kemantapan >= 1 && kemantapan <= 10;
          v3 = isStaminaRated ? (kemantapan / 100) : 0;
        }
        
        const scoreVal = calculateSeniScoreForJuri(cat, jsObj);
        sumJuri += scoreVal;
        scoreArr.push(Number(scoreVal.toFixed(2)));
        v1List.push(v1);
        v2List.push(v2);
        v3List.push(v3);
      }
      
      const avg = jCount > 0 ? (sumJuri / jCount) : 0;
      const sorted = [...scoreArr].sort((a,b)=>a-b);
      let median = avg;
      if (sorted.length > 0) {
        if (sorted.length % 2 === 0) {
          median = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
        } else {
          median = sorted[Math.floor(sorted.length / 2)];
        }
      }
      
      const totalHukuman = scores ? calculateSeniHukumanTotal(scores.hukumanLog) : 0;
      let finalVal = Math.max(0, (cat === 'TUNGGAL' || cat === 'REGU' ? median : avg) - totalHukuman);
      if (matchState.diskualifikasi === corner || matchState.diskualifikasi === 'BOTH' || (matchState.victoryType === 'UNDUR_DIRI' && matchState.pemenang !== corner)) {
        finalVal = 0;
      }
      const stdev = calculateSeniStandardDeviation(cat, scores, jCount, corner);

      let v1Label = "Kesalahan Gerak";
      let v2Label = "Nilai Kebenaran";
      let v3Label = "Kemantapan Stamina";

      if (cat === 'GANDA') {
        v1Label = "Teknik Serang Bela";
        v2Label = "Kemantapan & Harmoni";
        v3Label = "Penjiwaan & Penghayatan";
      } else if (cat === 'SOLO_KREATIF') {
        v1Label = "Teknik Serang Bela";
        v2Label = "Kemantapan & Harmoni";
        v3Label = "Penjiwaan & Penghayatan";
      }

      return {
        name: ath?.nama || (corner === 'BIRU' ? "ARIS SAJIWO" : "GEDE SASTRAWAN"),
        kontingen: ath?.kontingen || (corner === 'BIRU' ? "JAWA TENGAH" : "BALI"),
        v1List,
        v2List,
        v3List,
        scoreArr,
        sorted,
        v1Label,
        v2Label,
        v3Label,
        avg: avg.toFixed(3),
        median: median.toFixed(3),
        hukuman: totalHukuman.toFixed(2),
        finalVal: finalVal.toFixed(3),
        stdev: stdev.toFixed(9),
        durasiTampil: corner === 'BIRU' ? (matchState.durasiTampilBIRU !== undefined ? matchState.durasiTampilBIRU : 180) : (matchState.durasiTampilMERAH !== undefined ? matchState.durasiTampilMERAH : 180)
      };
    };

    const biruInfo = getCornerDetails('BIRU');
    const merahInfo = getCornerDetails('MERAH');

    // ================= PAGE 1 =================
    // 1. PAGE HEADER (Y: 12 to 39)
    // Helper to get image format for jsPDF
    const getImageFormat = (imgStr: string): string => {
      if (imgStr.includes('image/png')) return 'PNG';
      if (imgStr.includes('image/jpeg') || imgStr.includes('image/jpg')) return 'JPEG';
      if (imgStr.includes('image/webp')) return 'WEBP';
      return 'PNG'; // default fallback
    };

    let hasLogoKiri = false;
    if (base64Kiri) {
      try {
        const formatKiri = getImageFormat(base64Kiri);
        doc.addImage(base64Kiri, formatKiri, 13, 11, 18, 18);
        hasLogoKiri = true;
      } catch (e) {
        console.error("Failed to add logoKiri to PDF", e);
      }
    }

    let hasLogoKanan = false;
    if (base64Kanan) {
      try {
        const formatKanan = getImageFormat(base64Kanan);
        doc.addImage(base64Kanan, formatKanan, 185, 11, 18, 18);
        hasLogoKanan = true;
      } catch (e) {
        console.error("Failed to add logoKanan to PDF", e);
      }
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("LAPORAN PERTANDINGAN", 108, 16, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(matchState.eventName?.toUpperCase() || "KEJUARAAN NASIONAL PENCAK SILAT", 108, 22, { align: 'center' });
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const tempat = matchState.tempatPelaksanaan || "Jakarta";
    const waktu = matchState.waktuPelaksanaan || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(`${tempat} , ${waktu}`, 108, 27, { align: 'center' });

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(15, 32, 201, 32);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const tahap = (matchState.tahapPertandingan || "PENYISIHAN").trim().toUpperCase();
    const jurus = (matchState.kategoriSeni || "TUNGGAL").trim().toUpperCase();
    const genderStr = (matchState.gender || "PUTRA").trim().toUpperCase();
    const usia = (matchState.kategoriUsia || matchState.kelas || "REMAJA").trim().toUpperCase();
    const kelasSeni = `${tahap} ${jurus} ${genderStr} ${usia}`;
    doc.text(kelasSeni.toUpperCase(), 15, 37);
    
    const labelTampilOrPartai = (matchState.sistemTanding === 'POOL') ? 'TAMPIL' : 'PARTAI';
    const gelanggangText = `${(matchState.gelanggang || "GELANGGANG 1").toUpperCase()} | ${labelTampilOrPartai} ${matchState.partai || "-"}`;
    doc.text(gelanggangText, 201, 37, { align: 'right' });

    doc.line(15, 39, 201, 39);

    // 2. SUMMARY SCORES BANNER (Y: 43 to 54)
    if (isPoolSystem) {
      const activeInfo = activePoolCorner === 'BIRU' ? biruInfo : merahInfo;
      const cornerColor = activePoolCorner === 'BIRU' ? [37, 99, 235] : [220, 38, 38];
      doc.setFillColor(cornerColor[0], cornerColor[1], cornerColor[2]);
      doc.rect(15, 43, 186, 11, 'F');
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(activeInfo.name.toUpperCase(), 19, 48);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(activePoolCorner === 'BIRU' ? 219 : 254, activePoolCorner === 'BIRU' ? 234 : 226, activePoolCorner === 'BIRU' ? 254 : 226);
      doc.text(activeInfo.kontingen.toUpperCase(), 19, 51.5);

      // Label "Selesai" on the right
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("STATUS: SELESAI", 197, 49.5, { align: 'right' });
    } else {
      // Left Box (Blue Corner)
      doc.setFillColor(37, 99, 235);
      doc.rect(15, 43, 55, 11, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(biruInfo.name.toUpperCase(), 19, 48);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(219, 234, 254);
      doc.text(biruInfo.kontingen.toUpperCase(), 19, 51.5);
      
      // Right Box (Red Corner)
      doc.setFillColor(220, 38, 38);
      doc.rect(146, 43, 55, 11, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(merahInfo.name.toUpperCase(), 150, 48);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(254, 226, 226);
      doc.text(merahInfo.kontingen.toUpperCase(), 150, 51.5);

      // Middle Box (Pemenang Banner)
      doc.setFillColor(253, 224, 71); // Yellow background
      doc.rect(80, 43, 56, 11, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(15, 23, 42); // Dark text for readability on yellow background
      doc.text("PEMENANG", 108, 47, { align: 'center' });
      doc.setFontSize(8);
      const winnerText = matchState.pemenang ? `SUDUT ${matchState.pemenang.toUpperCase()}` : "SUDUT BIRU/MERAH";
      if (matchState.pemenang === 'BIRU') {
        doc.setTextColor(30, 58, 138); // Royal Blue for high contrast on yellow
      } else if (matchState.pemenang === 'MERAH') {
        doc.setTextColor(153, 27, 27); // Crimson Red for high contrast on yellow
      } else {
        doc.setTextColor(71, 85, 105); // Slate grey
      }
      doc.text(winnerText, 108, 51.5, { align: 'center' });
    }

    // 3. DETAIL POIN & HASIL SKOR TABLE (Y: 58 to 89.5)
    if (isPoolSystem) {
      const activeInfo = activePoolCorner === 'BIRU' ? biruInfo : merahInfo;
      const activeColor = activePoolCorner === 'BIRU' ? [29, 78, 216] : [185, 28, 28];

      // Header row
      doc.setFillColor(109, 40, 217); // Purple for Komponen
      doc.rect(15, 58, 100, 7, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("DETAIL POIN / KOMPONEN", 18, 62.5);

      doc.setFillColor(activeColor[0], activeColor[1], activeColor[2]);
      doc.rect(115, 58, 86, 7, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`PEROLEHAN NILAI (SUDUT ${activePoolCorner})`, 158, 62.5, { align: 'center' });

      // Row 1: STANDAR DEVIASI
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 65, 100, 5.5, 'F');
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("STANDAR DEVIASI", 18, 68.8);

      doc.setFillColor(255, 255, 255);
      doc.rect(115, 65, 86, 5.5, 'F');
      doc.setTextColor(30, 41, 59);
      doc.text(activeInfo.stdev, 158, 68.8, { align: 'center' });

      // Row 2: WAKTU TAMPIL
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 70.5, 100, 5.5, 'F');
      doc.text("WAKTU TAMPIL", 18, 74.3);

      doc.setFillColor(255, 255, 255);
      doc.rect(115, 70.5, 86, 5.5, 'F');
      doc.text(formatSec(activeInfo.durasiTampil), 158, 74.3, { align: 'center' });

      // Row 3: HUKUMAN
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 76, 100, 5.5, 'F');
      doc.text("HUKUMAN", 18, 79.8);

      doc.setFillColor(255, 255, 255);
      doc.rect(115, 76, 86, 5.5, 'F');
      doc.text(activeInfo.hukuman, 158, 79.8, { align: 'center' });

      // Row 4: NILAI PEROLEHAN / SKOR AKHIR
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 81.5, 100, 8, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text("NILAI AKHIR", 18, 86.5);

      doc.setFillColor(255, 255, 255);
      doc.rect(115, 81.5, 86, 8, 'F');
      doc.setFontSize(10);
      doc.setTextColor(activeColor[0], activeColor[1], activeColor[2]);
      doc.text(activeInfo.finalVal, 158, 86.5, { align: 'center' });

      // Summary Score Grid Borders
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.rect(15, 58, 186, 31.5, 'S');
      doc.line(15, 65, 201, 65);
      doc.line(15, 70.5, 201, 70.5);
      doc.line(15, 76, 201, 76);
      doc.line(15, 81.5, 201, 81.5);
      doc.line(100 + 15, 58, 100 + 15, 89.5);
    } else {
      // Table Header Row (Single Row Layout)
      doc.setFillColor(109, 40, 217); // Purple, senada dengan HASIL SKOR
      doc.rect(15, 58, 56, 7, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("DETAIL POIN", 18, 62.5);

      doc.setFillColor(29, 78, 216); // Blue
      doc.rect(71, 58, 50, 7, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("BIRU", 96, 62.5, { align: 'center' });

      doc.setFillColor(109, 40, 217); // Purple for Hasil Skor
      doc.rect(121, 58, 30, 7, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("HASIL SKOR", 136, 62.5, { align: 'center' });

      doc.setFillColor(185, 28, 28); // Red
      doc.rect(151, 58, 50, 7, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("MERAH", 176, 62.5, { align: 'center' });

      // Table Data Rows (All white backgrounds for clean, professional look)
      // Row 1: STANDAR DEVIASI
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 65, 56, 5.5, 'F');
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("STANDAR DEVIASI", 18, 68.8);

      doc.setFillColor(255, 255, 255);
      doc.rect(71, 65, 50, 5.5, 'F');
      doc.setTextColor(30, 41, 59);
      doc.text(biruInfo.stdev, 96, 68.8, { align: 'center' });

      doc.setFillColor(255, 255, 255);
      doc.rect(121, 65, 30, 5.5, 'F');
      doc.text("", 136, 68.8, { align: 'center' });

      doc.setFillColor(255, 255, 255);
      doc.rect(151, 65, 50, 5.5, 'F');
      doc.text(merahInfo.stdev, 176, 68.8, { align: 'center' });

      // Row 2: WAKTU TAMPIL
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 70.5, 56, 5.5, 'F');
      doc.text("WAKTU TAMPIL", 18, 74.3);

      doc.setFillColor(255, 255, 255);
      doc.rect(71, 70.5, 50, 5.5, 'F');
      doc.text(formatSec(biruInfo.durasiTampil), 96, 74.3, { align: 'center' });

      doc.setFillColor(255, 255, 255);
      doc.rect(121, 70.5, 30, 5.5, 'F');
      doc.text("", 136, 74.3, { align: 'center' });

      doc.setFillColor(255, 255, 255);
      doc.rect(151, 70.5, 50, 5.5, 'F');
      doc.text(formatSec(merahInfo.durasiTampil), 176, 74.3, { align: 'center' });

      // Row 3: HUKUMAN
      doc.setFillColor(255, 255, 255);
      doc.rect(15, 76, 56, 5.5, 'F');
      doc.text("HUKUMAN", 18, 79.8);

      doc.setFillColor(255, 255, 255);
      doc.rect(71, 76, 50, 5.5, 'F');
      doc.text(biruInfo.hukuman, 96, 79.8, { align: 'center' });

      doc.setFillColor(255, 255, 255);
      doc.rect(121, 76, 30, 5.5, 'F');
      doc.text("", 136, 79.8, { align: 'center' });

      doc.setFillColor(255, 255, 255);
      doc.rect(151, 76, 50, 5.5, 'F');
      doc.text(merahInfo.hukuman, 176, 79.8, { align: 'center' });

      // Row 4: NILAI KEMENANGAN (Highlight with white background instead of yellow/black)
      const pemenangStr = (matchState.pemenang || "").toUpperCase();
      const isBiruWinner = pemenangStr === 'BIRU' || pemenangStr === 'DISK_BIRU';
      const isMerahWinner = pemenangStr === 'MERAH' || pemenangStr === 'DISK_MERAH';

      doc.setFillColor(255, 255, 255);
      doc.rect(15, 81.5, 56, 8, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text("NILAI KEMENANGAN", 18, 86.5);

      doc.setFillColor(255, 255, 255);
      doc.rect(71, 81.5, 50, 8, 'F');
      doc.setFontSize(isBiruWinner ? 10 : 8);
      doc.setTextColor(29, 78, 216);
      doc.text(biruInfo.finalVal, 96, 86.5, { align: 'center' });

      doc.setFillColor(255, 255, 255);
      doc.rect(121, 81.5, 30, 8, 'F');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text("-", 136, 86.5, { align: 'center' });

      doc.setFillColor(255, 255, 255);
      doc.rect(151, 81.5, 50, 8, 'F');
      doc.setFontSize(isMerahWinner ? 10 : 8);
      doc.setTextColor(185, 28, 28);
      doc.text(merahInfo.finalVal, 176, 86.5, { align: 'center' });

      // Summary Score Grid Borders with standard clean light grey color
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.rect(15, 58, 186, 31.5, 'S');
      doc.line(15, 65, 201, 65);
      doc.line(15, 70.5, 201, 70.5);
      doc.line(15, 76, 201, 76);
      doc.line(15, 81.5, 201, 81.5);
      doc.line(71, 58, 71, 89.5);
      doc.line(121, 58, 121, 89.5);
      doc.line(151, 58, 151, 89.5);
    }

    // 4. DETAIL NILAI JURI SECTION (Y: 97 onwards)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("DETAIL NILAI JURI", 15, 97);

    const renderCornerDetailTable = (corner: 'BIRU' | 'MERAH', startY: number) => {
      const info = corner === 'BIRU' ? biruInfo : merahInfo;
      const brandColor = corner === 'BIRU' ? [29, 78, 216] : [185, 28, 28];
      const brandLight = corner === 'BIRU' ? [239, 246, 255] : [254, 242, 242];

      // Section label
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text(`${corner === 'BIRU' ? 'A. SUDUT BIRU' : 'B. SUDUT MERAH'}`, 15, startY - 4);

      // Detail Table
      const labelColWidth = 56;
      const valColWidth = 130 / jCount;

      // Row 1: Header (JURI | 1 | 2 | ... | 10)
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(15, startY, 186, 5.5, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("JURI", 18, startY + 3.8);

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);

      for (let i = 1; i <= jCount; i++) {
        const colX = 15 + labelColWidth + (i - 1) * valColWidth;
        doc.line(colX, startY, colX, startY + 5.5);
        doc.text(String(i), colX + valColWidth / 2, startY + 3.8, { align: 'center' });
      }

      // Row 2: KESALAHAN GERAK
      let tableY = startY + 5.5;
      doc.setFillColor(255, 255, 255);
      doc.rect(15, tableY, 186, 5, 'F');
      doc.line(15, tableY + 5, 201, tableY + 5);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(info.v1Label, 18, tableY + 3.5);

      for (let i = 1; i <= jCount; i++) {
        const colX = 15 + labelColWidth + (i - 1) * valColWidth;
        doc.line(colX, tableY, colX, tableY + 5);
        const val = info.v1List[i - 1] || 0;
        const displayVal = info.v1Label === "Kesalahan Gerak" ? String(val) : val.toFixed(2);
        doc.text(displayVal, colX + valColWidth / 2, tableY + 3.5, { align: 'center' });
      }

      // Row 3: NILAI KEBENARAN
      tableY += 5;
      doc.setFillColor(255, 255, 255);
      doc.rect(15, tableY, 186, 5, 'F');
      doc.line(15, tableY + 5, 201, tableY + 5);
      doc.text(info.v2Label, 18, tableY + 3.5);

      for (let i = 1; i <= jCount; i++) {
        const colX = 15 + labelColWidth + (i - 1) * valColWidth;
        doc.line(colX, tableY, colX, tableY + 5);
        const val = info.v2List[i - 1] || 0;
        doc.text(val.toFixed(2), colX + valColWidth / 2, tableY + 3.5, { align: 'center' });
      }

      // Row 4: KEMANTAPAN & STAMINA
      tableY += 5;
      doc.setFillColor(255, 255, 255);
      doc.rect(15, tableY, 186, 5, 'F');
      doc.line(15, tableY + 5, 201, tableY + 5);
      doc.text(info.v3Label, 18, tableY + 3.5);

      for (let i = 1; i <= jCount; i++) {
        const colX = 15 + labelColWidth + (i - 1) * valColWidth;
        doc.line(colX, tableY, colX, tableY + 5);
        const val = info.v3List[i - 1] || 0;
        doc.text(val.toFixed(2), colX + valColWidth / 2, tableY + 3.5, { align: 'center' });
      }

      // Row 5: TOTAL SKOR (solid corner background, white text)
      tableY += 5;
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(15, tableY, 186, 6, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("TOTAL SKOR", 18, tableY + 4.2);

      for (let i = 1; i <= jCount; i++) {
        const colX = 15 + labelColWidth + (i - 1) * valColWidth;
        doc.setDrawColor(255, 255, 255);
        doc.line(colX, tableY, colX, tableY + 6);
        const val = info.scoreArr[i - 1] || 0;
        doc.text(val.toFixed(2), colX + valColWidth / 2, tableY + 4.2, { align: 'center' });
      }

      // Reset Draw Color to slate
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);

      // Draw table outline
      doc.rect(15, startY, 186, 26.5, 'S');

      // DURASI PENAMPILAN Card Row (Y starts at tableY + 11.5)
      const blockY = tableY + 11.5;
      
      // Header block
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(15, blockY, 186, 5.5, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("DURASI PENAMPILAN", 18, blockY + 3.8);
      doc.rect(15, blockY, 186, 5.5, 'S');

      const durY = blockY + 5.5;
      const cardW = (186 - 6) / 4; // 45mm width per card
      
      const elapsed = info.durasiTampil;
      const target = matchState.durasiBabak || 180;
      const kurang = (elapsed > 0 && elapsed < target) ? target - elapsed : 0;
      const lebih = (elapsed > 0 && elapsed > target) ? elapsed - target : 0;

      const mStr = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const sStr = String(elapsed % 60).padStart(2, '0');
      const kurangStr = kurang > 0 ? `${String(Math.floor(kurang / 60)).padStart(2, '0')} : ${String(kurang % 60).padStart(2, '0')}` : "-- : --";
      const lebihStr = lebih > 0 ? `${String(Math.floor(lebih / 60)).padStart(2, '0')} : ${String(lebih % 60).padStart(2, '0')}` : "-- : --";

      // Card 1: MENIT
      doc.setFillColor(248, 250, 252);
      doc.rect(15, durY, cardW, 9, 'FD');
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text("MENIT", 15 + cardW / 2, durY + 2.8, { align: 'center' });
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(mStr, 15 + cardW / 2, durY + 6.8, { align: 'center' });

      // Card 2: DETIK
      doc.setFillColor(248, 250, 252);
      doc.rect(15 + cardW + 2, durY, cardW, 9, 'FD');
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text("DETIK", 15 + cardW + 2 + cardW / 2, durY + 2.8, { align: 'center' });
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(sStr, 15 + cardW + 2 + cardW / 2, durY + 6.8, { align: 'center' });

      // Card 3: KURANG
      if (kurang > 0) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(239, 68, 68);
      } else {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
      }
      doc.rect(15 + 2 * (cardW + 2), durY, cardW, 9, 'FD');
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(kurang > 0 ? 185 : 100, kurang > 0 ? 28 : 116, kurang > 0 ? 28 : 139);
      doc.text("KURANG", 15 + 2 * (cardW + 2) + cardW / 2, durY + 2.8, { align: 'center' });
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(kurang > 0 ? 220 : 51, kurang > 0 ? 38 : 65, kurang > 0 ? 38 : 85);
      doc.text(kurangStr, 15 + 2 * (cardW + 2) + cardW / 2, durY + 6.8, { align: 'center' });

      // Card 4: LEBIH
      if (lebih > 0) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(239, 68, 68);
      } else {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
      }
      doc.rect(15 + 3 * (cardW + 2), durY, cardW, 9, 'FD');
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(lebih > 0 ? 185 : 100, lebih > 0 ? 28 : 116, lebih > 0 ? 28 : 139);
      doc.text("LEBIH", 15 + 3 * (cardW + 2) + cardW / 2, durY + 2.8, { align: 'center' });
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(lebih > 0 ? 220 : 51, lebih > 0 ? 38 : 65, lebih > 0 ? 38 : 85);
      doc.text(lebihStr, 15 + 3 * (cardW + 2) + cardW / 2, durY + 6.8, { align: 'center' });

      doc.setDrawColor(203, 213, 225);

      // NILAI JURI BERTUGAS Card Row (Y starts at durY + 12.5)
      const sortX_Y = durY + 12.5;

      // Header block
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(15, sortX_Y, 186, 5.5, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("NILAI JURI BERTUGAS", 18, sortX_Y + 3.8);
      doc.rect(15, sortX_Y, 186, 5.5, 'S');

      // Highlight median index values in green
      const len = info.sorted.length;
      const middleIndices: number[] = [];
      if (len > 0) {
        if (len % 2 === 0) {
          middleIndices.push(Math.floor(len / 2) - 1);
          middleIndices.push(Math.floor(len / 2));
        } else {
          middleIndices.push(Math.floor(len / 2));
        }
      }

      const totalGaps = jCount - 1;
      const gapSize = 0.8;
      const boxW = (186 - (totalGaps * gapSize)) / jCount;

      for (let i = 1; i <= jCount; i++) {
        const cx = 15 + (i - 1) * (boxW + gapSize);
        const isMedian = middleIndices.includes(i - 1);

        // Box header (J1..J10)
        const headerBg = isMedian ? [16, 185, 129] : brandColor;
        doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
        doc.rect(cx, sortX_Y + 5.5, boxW, 4, 'F');

        // Outer outline
        doc.setDrawColor(isMedian ? 16 : 203, isMedian ? 185 : 213, isMedian ? 129 : 225);
        doc.rect(cx, sortX_Y + 5.5, boxW, 9, 'S');

        // Header text (J1..J10)
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(255, 255, 255);
        doc.text(`J${i}`, cx + boxW / 2, sortX_Y + 8.2, { align: 'center' });

        // Score text
        const val = info.sorted[i - 1] || 0;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(isMedian ? 16 : brandColor[0], isMedian ? 185 : brandColor[1], isMedian ? 129 : brandColor[2]);
        doc.text(val.toFixed(2), cx + boxW / 2, sortX_Y + 12.2, { align: 'center' });
      }

      // Summary Table (MEDIAN, SKOR AKHIR, STANDAR DEVIASI)
      const summaryY = sortX_Y + 18;

      // Row 1: MEDIAN
      doc.setFillColor(248, 250, 252);
      doc.rect(15, summaryY, 145, 5, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("MEDIAN", 18, summaryY + 3.5);

      doc.setFillColor(16, 185, 129); // Emerald green background
      doc.rect(160, summaryY, 41, 5, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(info.median, 180.5, summaryY + 3.5, { align: 'center' });

      // Row 2: SKOR AKHIR
      doc.setFillColor(248, 250, 252);
      doc.rect(15, summaryY + 5, 145, 5, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("SKOR AKHIR", 18, summaryY + 8.5);

      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]); // Corner background
      doc.rect(160, summaryY + 5, 41, 5, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(info.finalVal, 180.5, summaryY + 8.5, { align: 'center' });

      // Row 3: STANDAR DEVIASI
      doc.setFillColor(248, 250, 252);
      doc.rect(15, summaryY + 10, 145, 5, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("STANDAR DEVIASI", 18, summaryY + 13.5);

      doc.setFillColor(100, 116, 139); // Slate grey background
      doc.rect(160, summaryY + 10, 41, 5, 'F');
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(info.stdev, 180.5, summaryY + 13.5, { align: 'center' });

      // Table borders
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.rect(15, summaryY, 186, 15, 'S');
      doc.line(15, summaryY + 5, 201, summaryY + 5);
      doc.line(15, summaryY + 10, 201, summaryY + 10);
      doc.line(160, summaryY, 160, summaryY + 15);
    };

    if (isPoolSystem) {
      renderCornerDetailTable(activePoolCorner, 105);

      // Signature Section for POOL on Page 1 (at Y = 205)
      let sigY = 205;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text("Ketua Pertandingan (Dewan)", 25, sigY);
      doc.text("Sekretaris Pertandingan", 140, sigY);
      
      sigY += 25;
      doc.line(22, sigY, 72, sigY);
      doc.line(135, sigY, 185, sigY);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("(_______________________)", 25, sigY + 4.5);
      doc.text("(_______________________)", 138, sigY + 4.5);

      // Page 1 Footer Line & Note (Y: 334 to 342)
      doc.setDrawColor(203, 213, 225);
      doc.line(15, 334, 201, 334);

      doc.setFont("Helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Dokumen resmi ini digenerate secara otomatis oleh NUSA SILAT DIGITAL SCORING SYSTEM pada ${new Date().toLocaleString('id-ID')}`, 15, 338);

      if (shouldSave) {
        doc.save(`Laporan_Skoring_Seni_Partai_${matchState.partai || "Match"}.pdf`);
      } else {
        return doc;
      }
      return;
    }

    renderCornerDetailTable('BIRU', 105);
    renderCornerDetailTable('MERAH', 196);

    // Page 1 Footer Line & Note (Y: 334 to 342)
    doc.setDrawColor(203, 213, 225);
    doc.line(15, 334, 201, 334);

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Dokumen resmi ini digenerate secara otomatis oleh NUSA SILAT DIGITAL SCORING SYSTEM pada ${new Date().toLocaleString('id-ID')}`, 15, 338);

    // ================= PAGE 2 =================
    doc.addPage();

    // 1. PAGE 2 HEADER (Y: 15 to 23)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const eventTextUpper = (matchState.eventName || "KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA").toUpperCase();
    doc.text(eventTextUpper, 15, 20);

    const labelTampilOrPartaiP2 = (matchState.sistemTanding === 'POOL') ? 'TAMPIL' : 'PARTAI';
    const matchInfoRight = `${labelTampilOrPartaiP2}: ${matchState.partai || "-"} | TAHAP: ${matchState.tahapPertandingan?.toUpperCase() || "-"}`;
    doc.text(matchInfoRight, 201, 20, { align: 'right' });

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(15, 23, 201, 23);

    // 2. SECTION TITLE: STATISTIK PERTANDINGAN (Y: 32)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("STATISTIK PERTANDINGAN", 15, 32);

     // 3. BILATERAL COMPARISON DIAGRAM (Y: 38 to 108)
     const getCornerSeniPDFStats = (corner: 'BIRU' | 'MERAH') => {
       const info = corner === 'BIRU' ? biruInfo : merahInfo;
       const avgVal2 = info.v2List.reduce((a, b) => a + b, 0) / jCount;
       const avgVal3 = info.v3List.reduce((a, b) => a + b, 0) / jCount;
       const totalScoreSum = info.scoreArr.reduce((a, b) => a + b, 0);
       const avgTotalScore = jCount > 0 ? (totalScoreSum / jCount) : 1;

       const hukuman = parseFloat(info.hukuman);
       const hukumanPct = avgTotalScore > 0 ? Math.min(100, parseFloat(((hukuman / avgTotalScore) * 100).toFixed(1))) : 0;

       const median = parseFloat(info.median);
       const stdev = parseFloat(info.stdev);

       let val2Pct = 0;
       let val3Pct = 0;

       val2Pct = avgTotalScore > 0 ? parseFloat(((avgVal2 / avgTotalScore) * 100).toFixed(1)) : 0;
       val3Pct = avgTotalScore > 0 ? parseFloat(((avgVal3 / avgTotalScore) * 100).toFixed(1)) : 0;

       const medianPct = parseFloat(((median / 10.00) * 100).toFixed(1));
       const stdevPct = parseFloat((Math.min(100, (stdev / 0.1) * 100)).toFixed(2));

       return {
         val2Score: avgVal2,
         val2Pct,
         val3Score: avgVal3,
         val3Pct,
         hukuman,
         hukumanPct,
         median,
         medianPct,
         stdev,
         stdevPct,
       };
     };

     const pdfStatsBiru = getCornerSeniPDFStats('BIRU');
     const pdfStatsMerah = getCornerSeniPDFStats('MERAH');

     // Outer box
     doc.setFillColor(248, 250, 252); // slate-50 background
     doc.setDrawColor(226, 232, 240); // slate-200 border
     doc.setLineWidth(0.4);
     doc.rect(15, 38, 186, 70, 'FD');

     // Header strip inside box
     doc.setFillColor(15, 23, 42); // slate-900 background
     doc.rect(15, 38, 186, 6.5, 'F');

     doc.setFont("Helvetica", "bold");
     doc.setFontSize(7.5);
     doc.setTextColor(255, 255, 255);
     doc.text("DIAGRAM PERBANDINGAN KOMPONEN NILAI SENI", 19, 42.5);



     // Draw comparison rows
     const drawCompRow = (
       rowY: number, 
       label: string, 
       leftValStr: string, 
       rightValStr: string, 
       leftPct: number, 
       rightPct: number,
       leftColor: [number, number, number],
       rightColor: [number, number, number]
     ) => {
       // Draw Label centered
       doc.setFont("Helvetica", "bold");
       doc.setFontSize(7);
       doc.setTextColor(51, 65, 85);
       doc.text(label.toUpperCase(), 108, rowY - 2.2, { align: 'center' });

       // Left value text
       doc.setFont("Helvetica", "bold");
       doc.setFontSize(7.5);
       doc.setTextColor(leftColor[0], leftColor[1], leftColor[2]);
       doc.text(leftValStr, 19, rowY + 1);

       // Right value text
       doc.setFont("Helvetica", "bold");
       doc.setFontSize(7.5);
       doc.setTextColor(rightColor[0], rightColor[1], rightColor[2]);
       doc.text(rightValStr, 197, rowY + 1, { align: 'right' });

       // Bar Backgrounds (50mm width)
       doc.setFillColor(226, 232, 240); // slate-200
       doc.rect(53, rowY - 1, 50, 2.5, 'F'); // Left bg
       doc.rect(113, rowY - 1, 50, 2.5, 'F'); // Right bg

       // Left Filled Bar (originates at X=103 and expands left)
       const leftW = Math.max(1, (leftPct / 100) * 50);
       doc.setFillColor(leftColor[0], leftColor[1], leftColor[2]);
       doc.rect(103 - leftW, rowY - 1, leftW, 2.5, 'F');

       // Right Filled Bar (originates at X=113 and expands right)
       const rightW = Math.max(1, (rightPct / 100) * 50);
       doc.setFillColor(rightColor[0], rightColor[1], rightColor[2]);
       doc.rect(113, rowY - 1, rightW, 2.5, 'F');

       // Percentages outside bars
       doc.setFont("Helvetica", "normal");
       doc.setFontSize(6.5);
       doc.setTextColor(leftColor[0], leftColor[1], leftColor[2]);
       doc.text(`${leftPct.toFixed(1)}%`, 50, rowY + 1, { align: 'right' });

       doc.setTextColor(rightColor[0], rightColor[1], rightColor[2]);
       doc.text(`${rightPct.toFixed(1)}%`, 166, rowY + 1);

       // Center Divider line
       doc.setDrawColor(148, 163, 184);
       doc.setLineWidth(0.45);
       doc.line(108, rowY - 2, 108, rowY + 2);
     };

     drawCompRow(52, "Nilai Kebenaran / Kemantapan & Harmoni", `+${pdfStatsBiru.val2Score.toFixed(3)} pts`, `+${pdfStatsMerah.val2Score.toFixed(3)} pts`, pdfStatsBiru.val2Pct, pdfStatsMerah.val2Pct, [29, 78, 216], [185, 28, 28]);
     drawCompRow(63, "Kemantapan Stamina / Penjiwaan & Penghayatan", `+${pdfStatsBiru.val3Score.toFixed(3)} pts`, `+${pdfStatsMerah.val3Score.toFixed(3)} pts`, pdfStatsBiru.val3Pct, pdfStatsMerah.val3Pct, [29, 78, 216], [185, 28, 28]);
     drawCompRow(74, "Nilai Hukuman", `-${pdfStatsBiru.hukuman.toFixed(2)} pts`, `-${pdfStatsMerah.hukuman.toFixed(2)} pts`, pdfStatsBiru.hukumanPct, pdfStatsMerah.hukumanPct, [225, 29, 72], [225, 29, 72]);
     drawCompRow(85, "Median", `${pdfStatsBiru.median.toFixed(3)} pts`, `${pdfStatsMerah.median.toFixed(3)} pts`, pdfStatsBiru.medianPct, pdfStatsMerah.medianPct, [29, 78, 216], [185, 28, 28]);
     drawCompRow(96, "Standar Deviasi", pdfStatsBiru.stdev.toFixed(5), pdfStatsMerah.stdev.toFixed(5), pdfStatsBiru.stdevPct, pdfStatsMerah.stdevPct, [79, 70, 229], [79, 70, 229]);

     // 4. SIGNATURE SECTION (Y: 120 to 155)
     doc.setDrawColor(203, 213, 225);
     doc.setLineWidth(0.35);
     doc.line(15, 114, 201, 114);

     let sigY = 121;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("Ketua Pertandingan (Dewan)", 25, sigY);
    doc.text("Sekretaris Pertandingan", 140, sigY);
    
    sigY += 25;
    doc.line(22, sigY, 72, sigY);
    doc.line(135, sigY, 185, sigY);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("(_______________________)", 25, sigY + 4.5);
    doc.text("(_______________________)", 138, sigY + 4.5);

    // 5. PAGE 2 FOOTER
    doc.setDrawColor(203, 213, 225);
    doc.line(15, 334, 201, 334);

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Dokumen resmi ini digenerate secara otomatis oleh NUSA SILAT DIGITAL SCORING SYSTEM pada ${new Date().toLocaleString('id-ID')}`, 15, 338);

    if (shouldSave) {
      doc.save(`Laporan_Skoring_Seni_Partai_${matchState.partai || "Match"}.pdf`);
    } else {
      return doc;
    }
  } catch (error) {
    console.error("PDF Generate Error", error);
  }
}

/**
 * Checks if a specific athlete has lost in any match in matchHistory
 */
export function isAthleteLostInHistory(id?: string, name?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const rawHistory = localStorage.getItem('silat_scoring_match_history');
    if (!rawHistory) return false;
    const history = JSON.parse(rawHistory);
    if (!Array.isArray(history)) return false;

    const cleanName = name ? name.trim().toUpperCase() : '';
    const lostMatch = history.find((h: any) => {
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
  } catch (e) {
    console.error("Error reading history in pdf helper", e);
    return false;
  }
}

/**
 * Draws a strikethrough line over printed text in jsPDF
 */
export function drawStrikethrough(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  align: 'left' | 'center' | 'right' = 'left',
  lineColor = [0, 0, 0]
): void {
  const textWidth = doc.getTextWidth(text);
  let startX = x;
  let endX = x + textWidth;
  
  if (align === 'center') {
    startX = x - textWidth / 2;
    endX = x + textWidth / 2;
  } else if (align === 'right') {
    startX = x - textWidth;
    endX = x;
  }
  
  const lineY = y - (fontSize * 0.12);
  const prevLineWidth = doc.getLineWidth();
  const prevDrawColor = doc.getDrawColor();
  
  doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
  doc.setLineWidth(0.65);
  doc.line(startX, lineY, endX, lineY);
  
  doc.setLineWidth(prevLineWidth);
  doc.setDrawColor(prevDrawColor);
}

/**
 * Generates tournament brackets overview in high fidelity PDF
 */
export async function downloadTournamentBracketPDF(
  eventName: string,
  athletes: any[],
  subTitle: string,
  kelasObj?: string,
  genderObj?: string,
  usiaObj?: string,
  poolObj?: string,
  logoKiri?: string,
  logoKanan?: string,
  jadwalLines?: any[]
): Promise<void> {
  try {
    const base64Kiri = logoKiri ? await loadImageAsBase64(logoKiri) : "";
    const base64Kanan = logoKanan ? await loadImageAsBase64(logoKanan) : "";

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const getImageFormat = (imgStr: string): string => {
      if (imgStr.includes('image/png')) return 'PNG';
      if (imgStr.includes('image/jpeg') || imgStr.includes('image/jpg')) return 'JPEG';
      if (imgStr.includes('image/webp')) return 'WEBP';
      return 'PNG'; // default fallback
    };

    const activeList = athletes.filter(a => a && (a.nama || a.kontingen));
    if (activeList.length === 0) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("BELUM ADA DATA BAGAN ATLET", 148.5, 105, { align: "center" });
      doc.save("Bagan_Kosong.pdf");
      return;
    }

    // ================= PAGE 1 HEADER =================
    // Draw Left Logo
    if (base64Kiri) {
      try {
        const formatKiri = getImageFormat(base64Kiri);
        doc.addImage(base64Kiri, formatKiri, 16.5, 10, 13.5, 13.5);
      } catch (e) {
        console.error("Failed to add logoKiri to bracket", e);
      }
    }

    // Draw Right Logo
    if (base64Kanan) {
      try {
        const formatKanan = getImageFormat(base64Kanan);
        doc.addImage(base64Kanan, formatKanan, 267, 10, 13.5, 13.5);
      } catch (e) {
        console.error("Failed to add logoKanan to bracket", e);
      }
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(eventName.toUpperCase(), 148.5, 12, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const venueText = "PADEPOKAN PENCAK SILAT TMII, JAKARTA   |   12 - 15 JUNI 2026";
    doc.text(venueText, 148.5, 17, { align: "center" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(76, 29, 149); // Dark purple accent color
    const categoryText = `KATEGORI : ${String(kelasObj || "TUNGGAL").toUpperCase()}   |   ${String(genderObj || "PUTRA").toUpperCase()}   |   ${String(usiaObj || "REMAJA").toUpperCase()}`;
    doc.text(categoryText, 148.5, 22.2, { align: "center" });

    // Dual elegant purple separator line
    doc.setDrawColor(76, 29, 149); // Dark purple (Purple-700)
    doc.setLineWidth(0.85);
    doc.line(15, 25.5, 282, 25.5);

    doc.setDrawColor(139, 92, 246); // Lighter purple (Violet-500)
    doc.setLineWidth(0.25);
    doc.line(15, 26.5, 282, 26.5);

    // ================= GENERATE ROUNDS & STRUCTURE =================
    const categoryKey = `${kelasObj || ''}-${usiaObj || ''}-${genderObj || ''}`;
    const rounds = getDynamicBracketRounds(activeList, 1, categoryKey, jadwalLines);
    const numRounds = rounds.length;
    if (numRounds === 0) return;

    const N = activeList.length;
    const power = Math.ceil(Math.log2(N)) || 1;
    const size = Math.pow(2, power);

    const margin = 15;
    const totalWidth = 267; // 282 - 15
    const numColumns = numRounds + 1; // Round columns + Champion Column
    const colWidth = totalWidth / numColumns;

    // Define vertical boundaries
    const yStart = 48;
    const yEnd = 194;

    // Helper to calculate Y coordinate recursively/consistently for any col and slot
    const getY = (col: number, slot: number): number => {
      const slotsInCol = size / Math.pow(2, col);
      const step = (yEnd - yStart) / slotsInCol;
      return yStart + (slot + 0.5) * step;
    };

    // ================= DRAW COLUMN PILLS =================
    const pillY = 31;
    const pillHeight = 6;

    for (let c = 0; c < numColumns; c++) {
      const colStartX = margin + c * colWidth;
      const colCenterX = colStartX + colWidth / 2;

      let title = "CHAMPION";
      if (c < numRounds) {
        title = rounds[c].title.toUpperCase();
      }

      const pillWidth = Math.max(22, Math.min(38, colWidth * 0.85));
      const pillX = colCenterX - pillWidth / 2;

      // Draw light grey rounded pill background
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 1.2, 1.2, 'F');

      // Draw text centered inside the pill
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(title, colCenterX, pillY + 4.1, { align: "center" });
    }

    // ================= DRAW BRACKET LINES AND TEXTS =================
    doc.setDrawColor(109, 40, 217); // Purple-700
    doc.setLineWidth(0.45);

    const lineLength = colWidth * 0.65; // Horizontal line length

    const isReal = (p: any) => {
      return p && p.nama && p.nama !== "BYE / KOSONG";
    };

    const isPlaceholder = (name: string) => {
      if (!name) return true;
      const u = name.toUpperCase();
      return u.startsWith("PEMENANG M") || u.includes("MENUNGGU PEMENANG") || u.startsWith("PEMENANG PARTAI");
    };

    const isMatchBye = (m: any) => {
      if (!m) return false;
      const p1Bye = !m.p1 || !m.p1.nama || m.p1.nama.toUpperCase().includes("BYE");
      const p2Bye = !m.p2 || !m.p2.nama || m.p2.nama.toUpperCase().includes("BYE");
      return p1Bye || p2Bye;
    };

    const getLineStartX = (col: number, matchIdx: number, side: 'p1' | 'p2'): number => {
      let startCol = col;
      let mIdx = matchIdx;
      let s = side;
      
      while (startCol > 0) {
        const prevRound = rounds[startCol - 1];
        const prevMatchIdx = s === 'p1' ? 2 * mIdx : 2 * mIdx + 1;
        const prevMatch = prevRound.matches[prevMatchIdx];
        if (prevMatch && isMatchBye(prevMatch)) {
          startCol--;
          const prevIsP1 = prevMatch.p1 && !prevMatch.p1.nama.toUpperCase().includes("BYE");
          s = prevIsP1 ? 'p1' : 'p2';
          mIdx = prevMatchIdx;
        } else {
          break;
        }
      }
      return margin + startCol * colWidth;
    };

    // Loop through each round to draw tree components
    for (let c = 0; c < numRounds; c++) {
      const colStartX = margin + c * colWidth;
      const nextColStartX = margin + (c + 1) * colWidth;
      const roundMatches = rounds[c].matches;

      for (let m = 0; m < roundMatches.length; m++) {
        const match = roundMatches[m];
        const p1 = match.p1;
        const p2 = match.p2;

        // Skip drawing if both are BYE
        if (!isReal(p1) && !isReal(p2)) {
          continue;
        }

        const y1 = getY(c, 2 * m);
        const y2 = getY(c, 2 * m + 1);
        const yMid = (y1 + y2) / 2;

        const p1StartColX = getLineStartX(c, m, 'p1');
        const p2StartColX = getLineStartX(c, m, 'p2');

        const isMatchSingle = isMatchBye(match);

        // If the match is a BYE/single match, we do not draw any lines or text in this round.
        // Instead, they will be drawn as a continuous line in their first active round appearance.
        if (isMatchSingle) {
          continue;
        }

        // Draw horizontal lines for p1 and p2 of active matches
        if (isReal(p1)) {
          doc.setDrawColor(109, 40, 217); // purple
          doc.setLineWidth(0.45);
          doc.line(p1StartColX, y1, colStartX + lineLength, y1);

          // Write name if not a placeholder
          if (!isPlaceholder(p1.nama)) {
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(p1.nama.toUpperCase(), colStartX, y1 - 1.2);
            
            const isP1Lost = isAthleteLostInHistory(p1.id, p1.nama);
            if (isP1Lost) {
              drawStrikethrough(doc, p1.nama.toUpperCase(), colStartX, y1 - 1.2, 7.5, 'left', [0, 0, 0]);
            }

            if (p1.kontingen && p1.kontingen !== "-") {
              doc.setFont("Helvetica", "normal");
              doc.setFontSize(5.8);
              doc.setTextColor(100, 116, 139); // slate-500
              doc.text(p1.kontingen.toUpperCase(), colStartX, y1 + 3.0);
              
              if (isP1Lost) {
                drawStrikethrough(doc, p1.kontingen.toUpperCase(), colStartX, y1 + 3.0, 5.8, 'left', [0, 0, 0]);
              }
            }
          }
        }

        if (isReal(p2)) {
          doc.setDrawColor(109, 40, 217); // purple
          doc.setLineWidth(0.45);
          doc.line(p2StartColX, y2, colStartX + lineLength, y2);

          // Write name if not a placeholder
          if (!isPlaceholder(p2.nama)) {
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(p2.nama.toUpperCase(), colStartX, y2 - 1.2);
            
            const isP2Lost = isAthleteLostInHistory(p2.id, p2.nama);
            if (isP2Lost) {
              drawStrikethrough(doc, p2.nama.toUpperCase(), colStartX, y2 - 1.2, 7.5, 'left', [0, 0, 0]);
            }

            if (p2.kontingen && p2.kontingen !== "-") {
              doc.setFont("Helvetica", "normal");
              doc.setFontSize(5.8);
              doc.setTextColor(100, 116, 139); // slate-500
              doc.text(p2.kontingen.toUpperCase(), colStartX, y2 + 3.0);
              
              if (isP2Lost) {
                drawStrikethrough(doc, p2.kontingen.toUpperCase(), colStartX, y2 + 3.0, 5.8, 'left', [0, 0, 0]);
              }
            }
          }
        }

        // Connect them with a vertical line and midpoint extension
        doc.setDrawColor(109, 40, 217); // purple
        doc.setLineWidth(0.45);
        doc.line(colStartX + lineLength, y1, colStartX + lineLength, y2);

        // Draw horizontal extension line to the next column
        doc.line(colStartX + lineLength, yMid, nextColStartX, yMid);
      }
    }

    // ================= CHAMPION COLUMN (LAST) =================
    // Draw the final Champion line in a distinct Amber/Gold color
    const lastColStartX = margin + numRounds * colWidth;
    const finalMatchMidpointY = (getY(numRounds - 1, 0) + getY(numRounds - 1, 1)) / 2;

    doc.setDrawColor(217, 119, 6); // Gold-600 / Amber
    doc.setLineWidth(0.6);
    doc.line(lastColStartX, finalMatchMidpointY, lastColStartX + colWidth * 0.8, finalMatchMidpointY);

    // Juara 1 label
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(217, 119, 6); // gold
    doc.text("JUARA 1 (CHAMPION)", lastColStartX + 1.2, finalMatchMidpointY - 1.8);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text("PEMENANG", lastColStartX + 1.2, finalMatchMidpointY + 3.2);

    if (poolObj && poolObj.toUpperCase() !== "NONE") {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(44); // Sangat besar (44pt) sesuai contoh gambar
      doc.setTextColor(51, 65, 85); // Slate-700 / Deep Slate Gray yang elegan
      doc.text(poolObj.toUpperCase(), lastColStartX + 2, finalMatchMidpointY - 60);
    }

    // ================= FOOTER =================
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175); // gray-400
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
    doc.text(`Nebeng's Official Digital Scoring Silat TGR Versi 3.1 | IRFAN, S.Pd. Hari/Tanggal: ${dateStr}, ${timeStr}`, margin, 202);

    // Save final document
    doc.save(`Bagan_Dynamic_Kategori_${String(kelasObj || "TUNGGAL").replace(/\s+/g, '_')}.pdf`);
  } catch (err) {
    console.error("Failed to generate bracket PDF", err);
  }
}

/**
 * Generates match schedule overview list in high fidelity PDF
 */
export async function downloadMatchSchedulePDF(
  eventName: string,
  scheduleLines: any[],
  logoKiri?: string,
  logoKanan?: string,
  selectedGelanggang?: string,
  tempatPelaksanaan?: string,
  waktuPelaksanaan?: string,
  poolObj?: string
): Promise<void> {
  try {
    const base64Kiri = logoKiri ? await loadImageAsBase64(logoKiri) : "";
    const base64Kanan = logoKanan ? await loadImageAsBase64(logoKanan) : "";

    let matchHistory: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const rawHistory = localStorage.getItem('silat_scoring_match_history');
        if (rawHistory) {
          matchHistory = JSON.parse(rawHistory);
        }
      } catch (e) {
        console.error("Failed to load match history in PDF", e);
      }
    }

    const findMatchHistoryRecord = (line: any) => {
      if (!line) return null;
      
      // Try matching by partai number first (highly specific)
      if (line.partai) {
        const matchByPartai = matchHistory.find((h: any) => h.sistemTanding === 'BATTLE' && String(h.partai) === String(line.partai));
        if (matchByPartai) return matchByPartai;
      }
      
      // Try matching by athlete names
      const lMerahName = line.atlitMerah?.nama?.trim().toUpperCase();
      const lBiruName = line.atlitBiru?.nama?.trim().toUpperCase();
      
      if (!lMerahName || !lBiruName) return null;
      
      return matchHistory.find((h: any) => {
        if (h.sistemTanding !== 'BATTLE') return false;
        const hMerahName = h.atlitMerah?.nama?.trim().toUpperCase();
        const hBiruName = h.atlitBiru?.nama?.trim().toUpperCase();
        return (lMerahName === hMerahName && lBiruName === hBiruName) ||
               (lMerahName === hBiruName && lBiruName === hMerahName);
      });
    };

    const formatSec = (seconds: any) => {
      if (typeof seconds !== 'number' || isNaN(seconds)) return "-";
      const rounded = Math.round(seconds);
      const m = Math.floor(rounded / 60);
      const s = rounded % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const getIndonesianDate = () => {
      try {
        const days = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
        const months = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
        const now = new Date();
        const yr = now.getFullYear() < 2026 ? 2026 : now.getFullYear();
        return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${yr}`;
      } catch (e) {
        return "MINGGU, 28 JUNI 2026";
      }
    };

    const getImageFormat = (imgStr: string): string => {
      if (imgStr.includes('image/png')) return 'PNG';
      if (imgStr.includes('image/jpeg') || imgStr.includes('image/jpg')) return 'JPEG';
      if (imgStr.includes('image/webp')) return 'WEBP';
      return 'PNG'; // default fallback
    };

    // Check if we are doing POOL system format
    const isPoolSystem = scheduleLines.some(line => line.sistemTanding === 'POOL');
    if (isPoolSystem) {
      // -------------------------------------------------------------
      // DEDICATED POOL SYSTEM PDF GENERATOR
      // -------------------------------------------------------------
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const drawPageFooter = (dObj: jsPDF) => {
        dObj.setFont("Helvetica", "normal");
        dObj.setFontSize(7.5);
        dObj.setTextColor(115, 115, 115);
        const now = new Date();
        const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
        const footerText = `Dicetak otomatis menggunakan Nebeng's Official Digital Scoring Silat TGR Versi 3.1 | IRFAN, S.Pd. pada ${dateStr}, ${timeStr}`;
        dObj.text(footerText, 15, 287);
      };

      const findAthletePerformance = (athleteName: string) => {
        if (!athleteName) return { score: 0, durasiTampil: 0, stdev: 0, hasPerformed: false, kebenaran: 0, hukuman: 0, durasiBabak: 180 };
        const cleanName = athleteName.trim().toUpperCase();
        try {
          const matchRecord = matchHistory.find((h: any) => {
            const isHPool = h.sistemTanding === 'POOL' || 
                            h.kelas?.toUpperCase().includes('POOL') || 
                            h.atlitMerah?.nama === '---' || 
                            h.atlitBiru?.nama === '---' ||
                            !h.atlitMerah?.nama ||
                            !h.atlitBiru?.nama;
            if (!isHPool) return false;
            
            const hActiveCorner: 'BIRU' | 'MERAH' = (h.atlitBiru?.nama && h.atlitBiru?.nama !== '---') ? 'BIRU' : 'MERAH';
            const activeAtlit = hActiveCorner === 'BIRU' ? h.atlitBiru : h.atlitMerah;
            
            return activeAtlit?.nama?.trim().toUpperCase() === cleanName;
          });
          
          if (matchRecord) {
            const corner = (matchRecord.atlitBiru?.nama && matchRecord.atlitBiru?.nama !== '---') ? 'BIRU' : 'MERAH';
            const score = corner === 'BIRU' ? matchRecord.skorAkhirBiru : matchRecord.skorAkhirMerah;
            const durasiTampil = corner === 'BIRU' ? (matchRecord.durasiTampilBIRU || 0) : (matchRecord.durasiTampilMERAH || 0);
            const kebenaran = calculateSeniKebenaranScore(corner, matchRecord as any);
            const hukuman = calculateSeniHukumanTotal(matchRecord.seniScores?.[corner]?.hukumanLog);
            const durasiBabak = matchRecord.durasiBabak || 180;
            
            const stdev = calculateSeniStandardDeviation(
              matchRecord.kelas || "TUNGGAL",
              matchRecord.seniScores?.[corner],
              matchRecord.jumlahJuri || 10,
              corner
            );
            
            return {
              score,
              durasiTampil,
              stdev,
              hasPerformed: true,
              kebenaran,
              hukuman,
              durasiBabak
            };
          }
        } catch (e) {
          console.error("Error finding pool performance in PDF generator", e);
        }
        return { score: 0, durasiTampil: 0, stdev: 0, hasPerformed: false, kebenaran: 0, hukuman: 0, durasiBabak: 180 };
      };

      const drawHeaderAndMetadata = (dObj: jsPDF, pageNum: number) => {
        // Left Logo
        if (base64Kiri) {
          try {
            const formatKiri = getImageFormat(base64Kiri);
            dObj.addImage(base64Kiri, formatKiri, 16.5, 11, 13, 13);
          } catch (e) {
            console.error("Failed to add logoKiri to POOL schedule", e);
          }
        } else {
          dObj.setFillColor(255, 255, 255);
          dObj.setDrawColor(220, 38, 38);
          dObj.setLineWidth(1.2);
          dObj.ellipse(23, 17.5, 7.5, 7.5, 'FD');
          dObj.setFillColor(34, 197, 94);
          dObj.triangle(23, 13.5, 19, 21, 27, 21, 'F');
        }

        // Right Logo
        if (base64Kanan) {
          try {
            const formatKanan = getImageFormat(base64Kanan);
            dObj.addImage(base64Kanan, formatKanan, 180.5, 11, 13, 13);
          } catch (e) {
            console.error("Failed to add logoKanan to POOL schedule", e);
          }
        } else {
          dObj.setFillColor(255, 255, 255);
          dObj.setDrawColor(25, 118, 210);
          dObj.setLineWidth(1.2);
          dObj.ellipse(187, 17.5, 7.5, 7.5, 'FD');
          dObj.setFillColor(245, 158, 11);
          dObj.roundedRect(183.5, 14, 7, 7, 1.2, 1.2, 'F');
        }

        // Main Headers
        dObj.setFont("Helvetica", "bold");
        dObj.setFontSize(14);
        dObj.setTextColor(15, 23, 42);
        dObj.text("JADWAL PERTANDINGAN", 105, 13, { align: "center" });

        dObj.setFontSize(11);
        dObj.text(eventName.toUpperCase(), 105, 18.5, { align: "center" });

        const venueText = (tempatPelaksanaan || "PADEPOKAN PENCAK SILAT TMII, JAKARTA").toUpperCase();
        const dateRangeText = (waktuPelaksanaan || "12 - 15 JUNI 2026").toUpperCase();
        dObj.setFont("Helvetica", "normal");
        dObj.setFontSize(8);
        dObj.setTextColor(71, 85, 105);
        dObj.text(`${venueText}   |   ${dateRangeText}`, 105, 23.5, { align: "center" });

        // Divider
        dObj.setDrawColor(76, 29, 149);
        dObj.setLineWidth(0.85);
        dObj.line(15, 27.2, 195, 27.2);
        dObj.setDrawColor(139, 92, 246);
        dObj.setLineWidth(0.25);
        dObj.line(15, 28.2, 195, 28.2);

        // Metadata Boxes
        const sY = 34;
        
        // Date Box
        dObj.setDrawColor(148, 163, 184);
        dObj.setLineWidth(0.25);
        dObj.rect(15, sY, 52, 10);
        const indonesianDate = getIndonesianDate();
        dObj.setFont("Helvetica", "bold");
        dObj.setFontSize(8);
        dObj.setTextColor(15, 23, 42);
        dObj.text(indonesianDate, 15 + 26, sY + 6.2, { align: "center" });

        // Gelanggang Box
        dObj.setFillColor(224, 242, 254);
        dObj.rect(71, sY, 68, 10, 'FD');
        let gelanggangText = (selectedGelanggang || "GELANGGANG I").toUpperCase();
        gelanggangText = gelanggangText.replace("GELANGGANG 1", "GELANGGANG I")
                                       .replace("GELANGGANG 2", "GELANGGANG II")
                                       .replace("GELANGGANG 3", "GELANGGANG III")
                                       .replace("GELANGGANG 4", "GELANGGANG IV")
                                       .replace("GELANGGANG 5", "GELANGGANG V")
                                       .replace("GELANGGANG 6", "GELANGGANG VI")
                                       .replace("GELANGGANG 7", "GELANGGANG VII");
        dObj.setFont("Helvetica", "bold");
        dObj.setFontSize(8.5);
        dObj.setTextColor(30, 64, 175);
        dObj.text(gelanggangText, 71 + 34, sY + 6.2, { align: "center" });

        // Time Box
        dObj.setDrawColor(148, 163, 184);
        dObj.setLineWidth(0.25);
        dObj.rect(143, sY, 52, 10);
        dObj.setFont("Helvetica", "bold");
        dObj.setFontSize(8);
        dObj.setTextColor(15, 23, 42);
        dObj.text("09.00 - SELESAI", 143 + 26, sY + 6.2, { align: "center" });
      };

      const drawTableHeaders = (dObj: jsPDF, hY: number) => {
        dObj.setFillColor(76, 29, 149);
        dObj.rect(15, hY, 10, 10, 'F');
        dObj.rect(25, hY, 13, 10, 'F');
        dObj.rect(38, hY, 48, 10, 'F');
        dObj.rect(86, hY, 38, 10, 'F');
        dObj.rect(124, hY, 14, 10, 'F');
        dObj.rect(138, hY, 22, 10, 'F');
        dObj.rect(160, hY, 15, 10, 'F');
        dObj.rect(175, hY, 20, 10, 'F');

        dObj.setDrawColor(148, 163, 184);
        dObj.setLineWidth(0.25);
        dObj.line(15, hY, 195, hY);
        dObj.line(15, hY + 10, 195, hY + 10);

        dObj.setFont("Helvetica", "bold");
        dObj.setFontSize(8.5);
        dObj.setTextColor(255, 255, 255);
        dObj.text("NO", 15 + 5, hY + 6.5, { align: "center" });
        dObj.text("PARTAI", 25 + 6.5, hY + 6.5, { align: "center" });
        dObj.text("NAMA ATLIT", 38 + 2, hY + 6.5);
        dObj.text("DAERAH / KONTINGEN", 86 + 2, hY + 6.5);
        dObj.text("WAKTU", 124 + 7, hY + 6.5, { align: "center" });
        
        // Wrap text for STANDAR DEVIASI
        dObj.setFontSize(7.5);
        dObj.text("STANDAR", 138 + 11, hY + 4.2, { align: "center" });
        dObj.text("DEVIASI", 138 + 11, hY + 7.8, { align: "center" });
        
        dObj.setFontSize(8.5);
        dObj.text("SKOR", 160 + 7.5, hY + 6.5, { align: "center" });
        
        // Wrap text for JUARA/PERINGKAT
        dObj.setFontSize(7.5);
        dObj.text("JUARA /", 175 + 10, hY + 4.2, { align: "center" });
        dObj.text("PERINGKAT", 175 + 10, hY + 7.8, { align: "center" });
      };

      const categoryGroups: Record<string, any[]> = {};
      scheduleLines.forEach(line => {
        const catKey = `${line.kelas} ${line.gender} | ${line.kategoriUsia}:::${line.tahapPertandingan}`;
        if (!categoryGroups[catKey]) {
          categoryGroups[catKey] = [];
        }
        categoryGroups[catKey].push(line);
      });

      let currentY = 48;
      let currentPage = 1;
      drawHeaderAndMetadata(doc, currentPage);

      Object.entries(categoryGroups).forEach(([catKey, lines], gIdx) => {
        const [catTitle, poolTitle] = catKey.split(':::');

        // PRE-CALCULATE RANKS FOR THIS GROUP
        const rankedPoolAthletes = lines.map((line, idx) => {
          const athleteName = line.atlit?.nama || '-';
          const perf = findAthletePerformance(athleteName);
          return {
            idx,
            athleteName,
            perf
          };
        });

        const sortedPoolAthletes = [...rankedPoolAthletes].sort((a, b) => {
          const pa = a.perf;
          const pb = b.perf;
          if (!pa.hasPerformed && pb.hasPerformed) return 1;
          if (pa.hasPerformed && !pb.hasPerformed) return -1;
          if (!pa.hasPerformed && !pb.hasPerformed) return 0;
          
          if (pb.score !== pa.score) {
            return pb.score - pa.score;
          }
          if (pb.kebenaran !== pa.kebenaran) {
            return pb.kebenaran - pa.kebenaran;
          }
          if (pa.hukuman !== pb.hukuman) {
            return pa.hukuman - pb.hukuman;
          }
          const targetA = pa.durasiBabak || 180;
          const diffA = Math.abs(pa.durasiTampil - targetA);
          const diffB = Math.abs(pb.durasiTampil - targetA);
          if (diffA !== diffB) {
            return diffA - diffB;
          }
          if (pa.stdev !== pb.stdev) {
            return pa.stdev - pb.stdev;
          }
          return 0;
        });

        let currentRank = 1;
        const ranksMap: Record<string, number> = {};
        sortedPoolAthletes.forEach((item, idx) => {
          const ath = item.perf;
          if (idx > 0) {
            const prevItem = sortedPoolAthletes[idx - 1];
            const prev = prevItem.perf;
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
          if (ath.hasPerformed) {
            ranksMap[item.athleteName.trim().toUpperCase()] = currentRank;
          }
        });

        if (currentY + 35 > 245) {
          drawPageFooter(doc);
          doc.addPage();
          currentPage++;
          currentY = 48;
          drawHeaderAndMetadata(doc, currentPage);
        }

        currentY += 3;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(catTitle.toUpperCase(), 15, currentY);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(194, 120, 3);
        doc.text(poolTitle.toUpperCase(), 195, currentY, { align: "right" });

        currentY += 4;
        let lastHeaderY = currentY;
        drawTableHeaders(doc, currentY);
        currentY += 10;

        lines.forEach((line, rowIdx) => {
          if (currentY + 12 > 245) {
            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.25);
            doc.line(15, currentY, 195, currentY);
            
            const tableLines = [15, 25, 38, 86, 124, 138, 160, 175, 195];
            tableLines.forEach(x => {
              doc.line(x, lastHeaderY, x, currentY);
            });

            drawPageFooter(doc);
            doc.addPage();
            currentPage++;
            currentY = 48;
            drawHeaderAndMetadata(doc, currentPage);

            currentY += 3;
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(30, 41, 59);
            doc.text(`${catTitle.toUpperCase()} (Lanjutan)`, 15, currentY);

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(194, 120, 3);
            doc.text(poolTitle.toUpperCase(), 195, currentY, { align: "right" });

            currentY += 4;
            lastHeaderY = currentY;
            drawTableHeaders(doc, currentY);
            currentY += 10;
          }

          doc.setFillColor(255, 255, 255);
          doc.rect(15, currentY, 180, 11, 'F');

          const athleteName = line.atlit?.nama || '-';
          const athleteKontingen = line.atlit?.kontingen || '-';
          const perf = findAthletePerformance(athleteName);

          const partaiNum = parseInt(line.partai) || (rowIdx + 1);
          const isOdd = partaiNum % 2 !== 0;
          const rColor = isOdd ? [29, 78, 216] : [220, 38, 38];

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(rColor[0], rColor[1], rColor[2]);
          doc.text(`${rowIdx + 1}.`, 15 + 5, currentY + 7, { align: "center" });

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(rColor[0], rColor[1], rColor[2]);
          doc.text(String(line.partai), 25 + 6.5, currentY + 7, { align: "center" });

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(rColor[0], rColor[1], rColor[2]);
          doc.text(athleteName.toUpperCase(), 38 + 2, currentY + 7);

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(rColor[0], rColor[1], rColor[2]);
          doc.text(athleteKontingen.toUpperCase(), 86 + 2, currentY + 7);

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(rColor[0], rColor[1], rColor[2]);
          const timeText = perf.hasPerformed ? formatSec(perf.durasiTampil) : "-";
          doc.text(timeText, 124 + 7, currentY + 7, { align: "center" });

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(rColor[0], rColor[1], rColor[2]);
          const stdevText = perf.hasPerformed ? perf.stdev.toFixed(9) : "-";
          doc.text(stdevText, 138 + 11, currentY + 7, { align: "center" });

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(rColor[0], rColor[1], rColor[2]);
          const scoreText = perf.hasPerformed ? perf.score.toFixed(3) : "-";
          doc.text(scoreText, 160 + 7.5, currentY + 7, { align: "center" });

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(rColor[0], rColor[1], rColor[2]);
          const rankValue = ranksMap[athleteName.trim().toUpperCase()];
          const rankText = rankValue ? `JUARA ${rankValue}` : "-";
          doc.text(rankText, 175 + 10, currentY + 7, { align: "center" });

          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.2);
          doc.line(15, currentY + 11, 195, currentY + 11);

          currentY += 11;
        });

        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.25);
        doc.line(15, currentY, 195, currentY);

        const tableLines = [15, 25, 38, 86, 124, 138, 160, 175, 195];
        tableLines.forEach(x => {
          doc.line(x, lastHeaderY, x, currentY);
        });

        currentY += 6;
      });

      let sigY = currentY + 10;
      if (sigY + 35 > 280) {
        drawPageFooter(doc);
        doc.addPage();
        currentPage++;
        sigY = 35;
        drawHeaderAndMetadata(doc, currentPage);
      }

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);

      doc.text("Mengetahui, Ketua", 45, sigY, { align: "center" });
      doc.text("Pertandingan", 45, sigY + 4.5, { align: "center" });

      doc.text("Panitia Pelaksana,", 165, sigY, { align: "center" });
      doc.text("Sekretaris Pertandingan", 165, sigY + 4.5, { align: "center" });

      doc.text("( _____________________ )", 45, sigY + 28, { align: "center" });
      doc.text("( _____________________ )", 165, sigY + 28, { align: "center" });

      drawPageFooter(doc);
      doc.save("Jadwal_Partai_Sistem_Pool.pdf");
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Helper to draw footer on each page
    const drawPageFooter = (dObj: jsPDF) => {
      dObj.setFont("Helvetica", "normal");
      dObj.setFontSize(7.5);
      dObj.setTextColor(115, 115, 115);
      const now = new Date();
      const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
      const footerText = `Dicetak otomatis menggunakan Nebeng's Official Digital Scoring Silat TGR Versi 3.1 | IRFAN, S.Pd. pada ${dateStr}, ${timeStr}`;
      dObj.text(footerText, 15, 287);
    };

    // ================= PAGE 1 HEADER =================
    // Draw Left Logo
    if (base64Kiri) {
      try {
        const formatKiri = getImageFormat(base64Kiri);
        doc.addImage(base64Kiri, formatKiri, 16.5, 11, 13, 13);
      } catch (e) {
        console.error("Failed to add logoKiri to schedule", e);
      }
    } else {
      // Draw IPSI vector fallback circle + triangle
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 38, 38); // Red
      doc.setLineWidth(1.2);
      doc.ellipse(23, 17.5, 7.5, 7.5, 'FD');
      
      doc.setFillColor(34, 197, 94); // Green
      doc.triangle(23, 13.5, 19, 21, 27, 21, 'F');
    }

    // Draw Right Logo
    if (base64Kanan) {
      try {
        const formatKanan = getImageFormat(base64Kanan);
        doc.addImage(base64Kanan, formatKanan, 180.5, 11, 13, 13);
      } catch (e) {
        console.error("Failed to add logoKanan to schedule", e);
      }
    } else {
      // Draw DISCORS vector fallback circle + rounded square
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(25, 118, 210); // Blue
      doc.setLineWidth(1.2);
      doc.ellipse(187, 17.5, 7.5, 7.5, 'FD');
      
      doc.setFillColor(245, 158, 11); // Gold
      doc.roundedRect(183.5, 14, 7, 7, 1.2, 1.2, 'F');
    }

    // Main Headers
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("JADWAL PERTANDINGAN", 105, 13, { align: "center" });

    doc.setFontSize(11);
    doc.text(eventName.toUpperCase(), 105, 18.5, { align: "center" });

    const venueText = (tempatPelaksanaan || "PADEPOKAN PENCAK SILAT TMII, JAKARTA").toUpperCase();
    const dateRangeText = (waktuPelaksanaan || "12 - 15 JUNI 2026").toUpperCase();
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${venueText}   |   ${dateRangeText}`, 105, 23.5, { align: "center" });

    // Elegant modern dual-line separator in dark purple
    doc.setDrawColor(76, 29, 149); // Dark purple (Purple-700)
    doc.setLineWidth(0.85);
    doc.line(15, 27.2, 195, 27.2);

    doc.setDrawColor(139, 92, 246); // Lighter accent violet/purple
    doc.setLineWidth(0.25);
    doc.line(15, 28.2, 195, 28.2);

    // ================= PARAMS / METADATA BOXES =================
    let startY = 34;

    // Box 1 (Left - Date)
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.25);
    doc.rect(15, startY, 52, 10);

    const dateStr = getIndonesianDate();
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(dateStr, 15 + 26, startY + 6.2, { align: "center" });

    // Box 2 (Middle - Gelanggang)
    doc.setFillColor(224, 242, 254); // cyan/sky-100
    doc.rect(71, startY, 68, 10, 'FD');
    let gelanggangText = (selectedGelanggang || "GELANGGANG I").toUpperCase();
    gelanggangText = gelanggangText.replace("GELANGGANG 1", "GELANGGANG I")
                                   .replace("GELANGGANG 2", "GELANGGANG II")
                                   .replace("GELANGGANG 3", "GELANGGANG III")
                                   .replace("GELANGGANG 4", "GELANGGANG IV")
                                   .replace("GELANGGANG 5", "GELANGGANG V")
                                   .replace("GELANGGANG 6", "GELANGGANG VI")
                                   .replace("GELANGGANG 7", "GELANGGANG VII");
    const activePool = (poolObj || (typeof window !== 'undefined' ? localStorage.getItem('silat_bagan_pool') : 'NONE') || 'NONE').toUpperCase();
    if (activePool && activePool !== "NONE") {
      gelanggangText += ` (${activePool})`;
    }
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 64, 175); // Deep Blue text for gelanggang
    doc.text(gelanggangText, 71 + 34, startY + 6.2, { align: "center" });

    // Box 3 (Right - Time)
    doc.rect(143, startY, 52, 10);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("09.00 - SELESAI", 143 + 26, startY + 6.2, { align: "center" });

    // ================= TABLE HEADERS =================
    startY = 49.5;
    let lastHeaderY = startY;

    // Draw header backgrounds
    doc.setFillColor(76, 29, 149); // Indigo/Purple
    doc.rect(15, startY, 12, 10, 'F');
    doc.rect(27, startY, 15, 10, 'F');
    doc.rect(42, startY, 40, 10, 'F');
    doc.setFillColor(30, 64, 175); // Royal Blue
    doc.rect(82, startY, 44, 10, 'F');
    doc.setFillColor(185, 28, 28); // Deep Red
    doc.rect(126, startY, 44, 10, 'F');
    doc.setFillColor(76, 29, 149); // Indigo/Purple
    doc.rect(170, startY, 13, 10, 'F');
    doc.rect(183, startY, 12, 10, 'F');

    // Headers border
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.25);
    doc.line(15, startY, 195, startY);
    doc.line(15, startY + 10, 195, startY + 10);

    // Labels
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("NO", 15 + 6, startY + 6.5, { align: "center" });
    doc.text("PARTAI", 27 + 7.5, startY + 6.5, { align: "center" });
    doc.text("KATEGORI", 42 + 20, startY + 6.5, { align: "center" });
    doc.text("BIRU", 82 + 22, startY + 6.5, { align: "center" });
    doc.text("MERAH", 126 + 22, startY + 6.5, { align: "center" });
    doc.text("WAKTU", 170 + 6.5, startY + 6.5, { align: "center" });
    doc.text("SKOR", 183 + 6, startY + 6.5, { align: "center" });

    startY += 10;

    // ================= TABLE ROWS =================
    scheduleLines.forEach((line, i) => {
      // Check for page break
      if (startY + 16 > 245) {
        // Draw grid lines for the completed section
        doc.setDrawColor(148, 163, 184); // Slate-400
        doc.setLineWidth(0.25);
        doc.line(15, startY, 195, startY);

        const colBounds = [15, 27, 42, 82, 126, 170, 183, 195];
        colBounds.forEach(x => {
          doc.line(x, lastHeaderY, x, startY);
        });

        drawPageFooter(doc);
        doc.addPage();

        // New page setup
        startY = 20;
        lastHeaderY = startY;

        // Draw headers on the new page
        doc.setFillColor(76, 29, 149);
        doc.rect(15, startY, 12, 10, 'F');
        doc.rect(27, startY, 15, 10, 'F');
        doc.rect(42, startY, 40, 10, 'F');
        doc.setFillColor(30, 64, 175);
        doc.rect(82, startY, 44, 10, 'F');
        doc.setFillColor(185, 28, 28);
        doc.rect(126, startY, 44, 10, 'F');
        doc.setFillColor(76, 29, 149);
        doc.rect(170, startY, 13, 10, 'F');
        doc.rect(183, startY, 12, 10, 'F');

        // Headers border on new page
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.25);
        doc.line(15, startY, 195, startY);
        doc.line(15, startY + 10, 195, startY + 10);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text("NO", 15 + 6, startY + 6.5, { align: "center" });
        doc.text("PARTAI", 27 + 7.5, startY + 6.5, { align: "center" });
        doc.text("KATEGORI", 42 + 20, startY + 6.5, { align: "center" });
        doc.text("BIRU", 82 + 22, startY + 6.5, { align: "center" });
        doc.text("MERAH", 126 + 22, startY + 6.5, { align: "center" });
        doc.text("WAKTU", 170 + 6.5, startY + 6.5, { align: "center" });
        doc.text("SKOR", 183 + 6, startY + 6.5, { align: "center" });

        startY += 10;
        lastHeaderY = startY - 10;
      }

      // Plain white row background for high clarity
      doc.setFillColor(255, 255, 255);
      doc.rect(15, startY, 180, 16, 'F');

      // 1. NO Column
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`${i + 1}.`, 15 + 6, startY + 9, { align: "center" });

      // 2. PARTAI Column
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(String(line.partai || i + 1), 27 + 7.5, startY + 9.5, { align: "center" });

      // 3. KATEGORI Column
      const catLabel1 = `${String(line.kelas || "TUNGGAL").toUpperCase()} / ${line.gender === "PUTRI" ? "PI" : "PA"}`;
      const catLabel2 = `(${String(line.kategoriUsia || "DEWASA").toUpperCase()} - ${String(line.tahapPertandingan || "PENYISIHAN").toUpperCase()})`;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(catLabel1, 42 + 20, startY + 6.5, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(catLabel2, 42 + 20, startY + 11.5, { align: "center" });

      // Helper to format placeholder names and clean kontingen for schedule PDF
      const formatAthleteForSchedule = (athlete: any) => {
        const rawName = String(athlete?.nama || "-").toUpperCase();
        const rawKontingen = String(athlete?.kontingen || "-").toUpperCase();
        
        let isPlaceholder = false;
        let formattedName = rawName;
        let formattedKontingen = rawKontingen;
        
        if (rawName.includes("MENUNGGU PEMENANG PARTAI") || rawName.includes("PEMENANG PARTAI") || rawName.includes("MENUNGGU PEMENANG") || rawName.includes("MENUNGGU PEMENANG PARTAI ...")) {
          isPlaceholder = true;
          const matchNum = rawName.match(/PARTAI\s*(\d+|\.\.\.|\?)/i);
          if (matchNum) {
            formattedName = `PEMENANG PARTAI ${matchNum[1]}`;
          } else {
            formattedName = "PEMENANG PARTAI ...";
          }
          formattedKontingen = "";
        }
        
        if (rawKontingen === "PEMENANG" || rawKontingen.includes("PEMENANG")) {
          formattedKontingen = "";
        }
        
        return {
          name: formattedName,
          kontingen: formattedKontingen,
          isPlaceholder
        };
      };

      // 4. BIRU Column
      const bInfo = formatAthleteForSchedule(line.atlitBiru);
      doc.setFont("Helvetica", "bold");
      const bFontSize = bInfo.isPlaceholder ? 6.5 : 8.5;
      doc.setFontSize(bFontSize);
      doc.setTextColor(29, 78, 216); // Royal Blue
      if (bInfo.kontingen) {
        doc.text(bInfo.name, 82 + 22, startY + 6.5, { align: "center" });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(30, 64, 175); // Darker Blue
        doc.text(bInfo.kontingen, 82 + 22, startY + 11.5, { align: "center" });
      } else {
        doc.text(bInfo.name, 82 + 22, startY + 9.5, { align: "center" });
      }
      
      const isBlueLost = line.atlitBiru && isAthleteLostInHistory(line.atlitBiru.id, line.atlitBiru.nama);
      if (isBlueLost) {
        if (bInfo.kontingen) {
          drawStrikethrough(doc, bInfo.name, 82 + 22, startY + 6.5, bFontSize, 'center', [0, 0, 0]);
          drawStrikethrough(doc, bInfo.kontingen, 82 + 22, startY + 11.5, 6.5, 'center', [0, 0, 0]);
        } else {
          drawStrikethrough(doc, bInfo.name, 82 + 22, startY + 9.5, bFontSize, 'center', [0, 0, 0]);
        }
      }

      // 5. MERAH Column
      const mInfo = formatAthleteForSchedule(line.atlitMerah);
      doc.setFont("Helvetica", "bold");
      const mFontSize = mInfo.isPlaceholder ? 6.5 : 8.5;
      doc.setFontSize(mFontSize);
      doc.setTextColor(185, 28, 28); // Red-700
      if (mInfo.kontingen) {
        doc.text(mInfo.name, 126 + 22, startY + 6.5, { align: "center" });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(153, 27, 27); // Darker Red
        doc.text(mInfo.kontingen, 126 + 22, startY + 11.5, { align: "center" });
      } else {
        doc.text(mInfo.name, 126 + 22, startY + 9.5, { align: "center" });
      }
      
      const isRedLost = line.atlitMerah && isAthleteLostInHistory(line.atlitMerah.id, line.atlitMerah.nama);
      if (isRedLost) {
        if (mInfo.kontingen) {
          drawStrikethrough(doc, mInfo.name, 126 + 22, startY + 6.5, mFontSize, 'center', [0, 0, 0]);
          drawStrikethrough(doc, mInfo.kontingen, 126 + 22, startY + 11.5, 6.5, 'center', [0, 0, 0]);
        } else {
          drawStrikethrough(doc, mInfo.name, 126 + 22, startY + 9.5, mFontSize, 'center', [0, 0, 0]);
        }
      }

      // 6. WAKTU & SKOR Columns (drawn from completed match history if available)
      const matchRecord = findMatchHistoryRecord(line);
      if (matchRecord) {
        const isBlueWinner = matchRecord.pemenang === 'BIRU';
        const isRedWinner = matchRecord.pemenang === 'MERAH';

        const blueTimeVal = matchRecord.durasiTampilBIRU ?? 0;
        const redTimeVal = matchRecord.durasiTampilMERAH ?? 0;

        const blueScoreVal = matchRecord.skorAkhirBiru;
        const redScoreVal = matchRecord.skorAkhirMerah;

        const blueTimeStr = formatSec(blueTimeVal);
        const redTimeStr = formatSec(redTimeVal);

        const blueScoreStr = typeof blueScoreVal === 'number' ? blueScoreVal.toFixed(3) : String(blueScoreVal ?? "0.000");
        const redScoreStr = typeof redScoreVal === 'number' ? redScoreVal.toFixed(3) : String(redScoreVal ?? "0.000");

        // Font sizes: Winner large (9.0), Loser small (5.5), Neutral (7.5)
        const bScoreFontSize = isBlueWinner ? 9.0 : (isRedWinner ? 5.5 : 7.5);
        const rScoreFontSize = isRedWinner ? 9.0 : (isBlueWinner ? 5.5 : 7.5);

        doc.setFont("Helvetica", "bold");

        // Write Blue Waktu & Skor
        doc.setFontSize(bScoreFontSize);
        doc.setTextColor(29, 78, 216); // Royal Blue
        doc.text(blueTimeStr, 170 + 6.5, startY + 6.5, { align: "center" });
        doc.text(blueScoreStr, 183 + 6, startY + 6.5, { align: "center" });

        // Write Red Waktu & Skor
        doc.setFontSize(rScoreFontSize);
        doc.setTextColor(185, 28, 28); // Red-700
        doc.text(redTimeStr, 170 + 6.5, startY + 11.5, { align: "center" });
        doc.text(redScoreStr, 183 + 6, startY + 11.5, { align: "center" });
      }

      // Draw horizontal separator line for this row
      doc.setDrawColor(148, 163, 184); // Slate-400
      doc.setLineWidth(0.25);
      doc.line(15, startY + 16, 195, startY + 16);

      startY += 16;
    });

    // Draw final table borders & grid lines
    doc.setDrawColor(148, 163, 184); // Slate-400
    doc.setLineWidth(0.25);
    doc.line(15, startY, 195, startY);

    const finalColBounds = [15, 27, 42, 82, 126, 170, 183, 195];
    finalColBounds.forEach(x => {
      doc.line(x, lastHeaderY, x, startY);
    });

    // ================= SIGNATURES =================
    let sigY = startY + 15;
    if (sigY + 35 > 280) {
      drawPageFooter(doc);
      doc.addPage();
      sigY = 30;
    }

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);

    doc.text("Mengetahui, Ketua", 45, sigY, { align: "center" });
    doc.text("Pertandingan", 45, sigY + 4.5, { align: "center" });

    doc.text("Panitia Pelaksana,", 165, sigY, { align: "center" });
    doc.text("Sekretaris Pertandingan", 165, sigY + 4.5, { align: "center" });

    doc.text("( _____________________ )", 45, sigY + 28, { align: "center" });
    doc.text("( _____________________ )", 165, sigY + 28, { align: "center" });

    // Footer on final page
    drawPageFooter(doc);

    doc.save("Jadwal_Partai_Pertandingan.pdf");
  } catch (err) {
    console.error("PDF schedule export err", err);
  }
}

/**
 * Downloads all PDF documents in match history into a zip file
 */
export async function downloadAllHistoryPDFsAsZip(history: PastMatch[]): Promise<void> {
  if (!history || history.length === 0) {
    throw new Error("Histori kosong, tidak ada dokumen untuk diunduh!");
  }
  
  const zip = new JSZip();
  
  for (const h of history) {
    // Cast to MatchState for compatibility
    const doc = await downloadMatchPDF(h as any, false);
    if (doc && typeof (doc as any).output === 'function') {
      const pdfArrayBuffer = (doc as any).output('arraybuffer');
      const filename = `Laporan_Skoring_Seni_Partai_${h.partai || "Match"}.pdf`;
      
      // Handle file naming collision by appending a unique identifier if needed
      let uniqueFilename = filename;
      let counter = 1;
      while (zip.file(uniqueFilename)) {
        uniqueFilename = `Laporan_Skoring_Seni_Partai_${h.partai || "Match"}_(${counter}).pdf`;
        counter++;
      }
      
      zip.file(uniqueFilename, pdfArrayBuffer);
    }
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  
  // Trigger download of the zip file in browser
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `Histori_Hasil_Tanding_PDF.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
