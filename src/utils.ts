/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, MatchRecord } from './types';

// Sleek Pencak Silat circular silhouette SVG Logos
export const DEFAULT_LOGO_LEFT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="45" fill="%230f172a" stroke="%233b82f6" stroke-width="3"/><path d="M50 15 A 35 35 0 0 1 85 50 A 35 35 0 0 1 50 85 A 35 35 0 0 1 15 50 A 35 35 0 0 1 50 15 Z" fill="none" stroke="%238b5cf6" stroke-width="1" stroke-dasharray="2,2"/><path d="M35 65 C40 55 45 60 50 50 C55 40 45 35 55 25 M55 25 C60 30 65 35 60 45 C55 55 60 60 55 65" stroke="%2360a5fa" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="55" cy="22" r="3" fill="%23a78bfa"/><path d="M30 40 L45 42 M55 58 L70 55" stroke="%23ef4444" stroke-width="2" stroke-linecap="round"/><text x="50" y="80" text-anchor="middle" font-family="sans-serif" font-size="6" fill="%2394a3b8" font-weight="bold">IPSI 2024</text><text x="50" y="91" text-anchor="middle" font-family="sans-serif" font-size="5" fill="%233b82f6" letter-spacing="1">SENI</text></svg>`;

export const DEFAULT_LOGO_RIGHT = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="45" fill="%230f172a" stroke="%238b5cf6" stroke-width="3"/><path d="M50 15 A 35 35 0 0 1 85 50 A 35 35 0 0 1 50 85 A 35 35 0 0 1 15 50 A 35 35 0 0 1 50 15 Z" fill="none" stroke="%233b82f6" stroke-width="1" stroke-dasharray="2,2"/><path d="M40 70 M45 40 Q 55 45 65 35 T 55 65 Q 45 55 35 50" stroke="%23c084fc" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="65" cy="30" r="4" fill="%23f43f5e"/><path d="M25 50 L35 50" stroke="%2310b981" stroke-width="2" stroke-linecap="round"/><text x="50" y="12" text-anchor="middle" font-family="sans-serif" font-size="6" fill="%23c084fc" font-weight="bold">JURUS</text><text x="50" y="88" text-anchor="middle" font-family="sans-serif" font-size="6" fill="%23a78bfa" letter-spacing="0.5">CHAMPIONSHIP</text></svg>`;

export const DEFAULT_STATE: AppState = {
  eventName: "KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA",
  eventVenue: "Padepokan Pencak Silat TMII, Jakarta East",
  eventDate: "20-25 Juni 2026",
  logoLeft: DEFAULT_LOGO_LEFT,
  logoRight: DEFAULT_LOGO_RIGHT,
  partai: "01",
  babak: "Final",
  kategoriJurus: "Tunggal",
  kategoriUsia: "Dewasa",
  gender: "PUTRA",
  waktuMenit: "03:00",
  jumlahJuri: 6,
  athleteName: "Kadek Wahyu Dewantara",
  athleteKontingen: "Bali - Indonesia",
  athleteSudut: "Biru",
  timer: {
    timeLeft: 180, // 3 minutes
    duration: 180,
    isRunning: false,
    lastUpdated: Date.now()
  },
  judges: {
    1: { score: 9.90, wrongMoveCount: 0, isReady: false, isFinished: false },
    2: { score: 9.90, wrongMoveCount: 0, isReady: false, isFinished: false },
    3: { score: 9.90, wrongMoveCount: 0, isReady: false, isFinished: false },
    4: { score: 9.90, wrongMoveCount: 0, isReady: false, isFinished: false },
    5: { score: 9.90, wrongMoveCount: 0, isReady: false, isFinished: false },
    6: { score: 9.90, wrongMoveCount: 0, isReady: false, isFinished: false }
  },
  isDisqualified: false,
  matchSaved: false
};

const LOCAL_STORAGE_KEY = 'pencak_silat_scoring_state';
const HISTORY_KEY = 'pencak_silat_scoring_history';

// In-app singleton fallback memory
let memorySaveListener: (() => void) | null = null;

export function getAppState(): AppState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all judges are initialized properly when transitioning formats
      if (parsed && typeof parsed === 'object') {
        return parsed as AppState;
      }
    }
  } catch (e) {
    console.error("Failed to load app state, resetting to default.", e);
  }
  setAppState(DEFAULT_STATE);
  return DEFAULT_STATE;
}

export function setAppState(state: AppState): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('pencak-silat-state-update', { detail: state }));
  } catch (e) {
    console.error("Failed to save state to localStorage", e);
  }
}

export function getHistory(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load history", e);
  }
  return [];
}

export function saveHistory(records: MatchRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error("Failed to save history", e);
  }
}

/**
 * Calculates median from an array of numbers.
 * Shows detailed work step for display under "Monitor" and "Dewan" panels.
 */
export function calculateMedianDetailed(scores: number[]): {
  median: number;
  sorted: number[];
  middleIndices: number[];
  middleValues: number[];
} {
  if (scores.length === 0) {
    return { median: 9.90, sorted: [], middleIndices: [], middleValues: [] };
  }
  
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 !== 0) {
    // Odd: e.g. length 5, mid is 2. Middle element at sorted[2]
    return {
      median: Number(sorted[mid].toFixed(2)),
      sorted,
      middleIndices: [mid],
      middleValues: [sorted[mid]]
    };
  } else {
    // Even: e.g. length 6, mid is 3. Middle element at sorted[2], sorted[3]
    const mid1 = mid - 1;
    const mid2 = mid;
    const val1 = sorted[mid1];
    const val2 = sorted[mid2];
    const avg = (val1 + val2) / 2;
    return {
      median: Number(avg.toFixed(3)), // scale usually outputted to 2-3 decimal precision
      sorted,
      middleIndices: [mid1, mid2],
      middleValues: [val1, val2]
    };
  }
}

/**
 * Parses duration formats like "03:00" or "01:20" to total seconds
 */
export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const min = parseInt(parts[0], 10) || 0;
    const sec = parseInt(parts[1], 10) || 0;
    return min * 60 + sec;
  }
  return 180; // default 3 min
}

/**
 * Formats seconds format like 180 to "03:00"
 */
export function formatSecondsToTime(totalSeconds: number): string {
  const mins = Math.floor(Math.abs(totalSeconds) / 60);
  const secs = Math.abs(totalSeconds) % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Downloads standard text file with custom content (for history export/import CSV)
 */
export function downloadFile(filename: string, text: string) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
