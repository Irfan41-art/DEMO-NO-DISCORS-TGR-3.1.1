import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Square,
  RotateCcw, 
  Upload, 
  Download, 
  User, 
  Award, 
  Clock, 
  Monitor as MonitorIcon, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Trash2, 
  Volume2, 
  ArrowLeft, 
  Maximize2,
  Minimize2,
  ListFilter,
  Users,
  Layers,
  FileSpreadsheet,
  AlertOctagon,
  RefreshCw,
  Sparkles,
  Settings,
  Lock,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  GitFork,
  Calendar,
  Trophy,
  Plus,
  BarChart3,
  FileArchive
} from 'lucide-react';

function uuid() {
  return Math.random().toString(36).substring(2, 9);
}
import { MatchState, PastMatch, ValidatedScore, ScoreEntry, CustomIcons } from './types';
import { 
  getSavedMatchState, 
  saveMatchState, 
  getMatchHistory, 
  saveMatchHistory, 
  clearMatchHistory, 
  calculateFinalScore, 
  processRawScore,
  runWmpCheck,
  getDeviceId,
  generateActivationKey,
  verifyActivationKey,
  isOutsideSandbox,
  createDefaultCornerSeni,
  evaluateTieBreak,
  calculateSeniStandardDeviation,
  calculateSeniScoreForJuri,
  calculateSeniHukumanTotal,
  calculateSeniKebenaranScore
} from './appState';
import { 
  playClickSound, 
  playPointSound, 
  playWarningSound, 
  playBuzzer, 
  playGongSound,
  playUiSwipeConfirmSound,
  startBuzzer,
  stopBuzzer,
  initAudio 
} from './sound';
import { DewanPanel } from './components/DewanPanel';
import { MonitorPanel } from './components/MonitorPanel';
import { JuriPanel } from './components/JuriPanel';
import { RegistrasiDataPanel } from './components/RegistrasiDataPanel';
import { 
  exportHistoryToExcel, 
  downloadExcelTemplate, 
  downloadJadwalExcelTemplate,
  downloadBaganExcelTemplate,
  exportBaganToExcel,
  parseExcelImport 
} from './utils/excel';
import { downloadMatchPDF, downloadTournamentBracketPDF, downloadMatchSchedulePDF, getDynamicBracketRounds, downloadAllHistoryPDFsAsZip } from './utils/pdf';
import { 
  SiluetSilatStance, 
  SiluetSilatKick,
  SiluetBackgroundCenter,
  Binaan1Icon,
  Binaan2Icon,
  Teguran1Icon,
  Teguran2Icon,
  Peringatan1Icon,
  Peringatan2Icon,
  DisqualificationIcon,
  JatuhanIcon,
  PunchIcon,
  KickIcon
} from './components/SilatIcons';

// Keyboard shortcut listener hook to integrate high professional feel for sekretaris
function useKeyPress(targetKey: string, action: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Avoid firing if user is inside form inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') {
        return;
      }
      if (event.code === targetKey || event.key === targetKey) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [targetKey, action]);
}

// Client-side image compressor helper to prevent LocalStorage QuotaExceeded and SSE network choke
function compressImage(base64Str: string, maxDim = 160): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

// Module-level cache to keep track of preloaded asset URLs and prevent infinite duplicate fetches
const preloadedAssetsCache = new Set<string>();

const getMatchDuration = (kelas: string, tahap: string): number => {
  const upperKelas = (kelas || "").toUpperCase().trim();
  const upperTahap = (tahap || "").toUpperCase().trim();

  const isSeniSpesial = upperKelas === "TUNGGAL BEBAS" || upperKelas === "GANDA" || upperKelas === "REGU";

  if (isSeniSpesial) {
    if (upperTahap === "FINAL" || (upperTahap.includes("FINAL") && !upperTahap.includes("SEMIFINAL") && !upperTahap.includes("SEMI FINAL") && !upperTahap.includes("PEREMPAT FINAL"))) {
      return 180; // 03:00
    }
    return 90; // 01:30 for all other stages of TUNGGAL BEBAS, GANDA, REGU
  } else {
    // Kategori TUNGGAL or any other (like default TUNGGAL)
    if (upperTahap === "FINAL" || (upperTahap.includes("FINAL") && !upperTahap.includes("SEMIFINAL") && !upperTahap.includes("SEMI FINAL") && !upperTahap.includes("PEREMPAT FINAL"))) {
      return 180; // 03:00
    } else if (upperTahap.includes("SEMI FINAL") || upperTahap.includes("SEMIFINAL")) {
      return 100; // 01:40
    } else {
      // PENYISIHAN, PEREMPAT FINAL, POOL, etc.
      return 80; // 01:20
    }
  }
};

const getMatchDurationString = (kelas: string, tahap: string): string => {
  const dur = getMatchDuration(kelas, tahap);
  if (dur === 180) return '03:00';
  if (dur === 100) return '01:40';
  if (dur === 90) return '01:30';
  if (dur === 80) return '01:20';
  if (dur === 70) return '01:10';
  if (dur === 60) return '01:00';
  const mins = Math.floor(dur / 60);
  const secs = dur % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function App() {
  const [role, setRole] = useState<'LANDING' | 'DEWAN' | 'JURI_SELECT' | 'JURI_PANEL' | 'SEKRETARIS' | 'MONITOR' | 'REGISTRASI_DATA'>('LANDING');
  const [selectedJuriId, setSelectedJuriId] = useState<number>(1);
  const [matchState, setMatchState] = useState<MatchState>(getSavedMatchState());

  const matchStateRef = useRef<MatchState>(matchState);
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  const lastStateVersionRef = useRef<number | undefined>(undefined);
  const isLocalChangeRef = useRef<boolean>(false);

  const isSeniMatch = ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kelas) || ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kategoriSeni);

  // Scoring superiority calculations for Monitor screen neon borders & golden light tracing animations
  const scoreBiru = calculateFinalScore('BIRU', matchState);
  const scoreMerah = calculateFinalScore('MERAH', matchState);
  const biruUnggul = scoreBiru > scoreMerah;
  const merahUnggul = scoreMerah > scoreBiru;
  const [history, setHistory] = useState<PastMatch[]>(getMatchHistory());
  const [rotated, setRotated] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [dqConfirmCorner, setDqConfirmCorner] = useState<'BIRU' | 'MERAH' | null>(null);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showVerifikasiResultPopup, setShowVerifikasiResultPopup] = useState(false);
  const [verifikasiPopupData, setVerifikasiPopupData] = useState<{
    jenis: 'JATUHAN' | 'PELANGGARAN';
    result: 'MERAH' | 'BIRU' | 'TIDAK_SAH' | null;
  } | null>(null);
  const [peekRoundEnd, setPeekRoundEnd] = useState<boolean>(false);
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [dewanClosedMatchEndPopUp, setDewanClosedMatchEndPopUp] = useState<boolean>(false);
  const [showDewanStopMatchModal, setShowDewanStopMatchModal] = useState<boolean>(false);
  const [selectedWinnerCorner, setSelectedWinnerCorner] = useState<'BIRU' | 'MERAH' | null>(null);
  const [deleteConfirmSudut, setDeleteConfirmSudut] = useState<'BIRU' | 'MERAH' | null>(null);
  const [showMonitorNextMatchBanner, setShowMonitorNextMatchBanner] = useState<boolean>(false);
  const [showMonitorRoundFinishedBanner, setShowMonitorRoundFinishedBanner] = useState<boolean>(false);
  const [finishedRoundNumber, setFinishedRoundNumber] = useState<number | null>(null);
  const [showNextMatchesPopup, setShowNextMatchesPopup] = useState<boolean>(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [showStatsBanner, setShowStatsBanner] = useState<boolean>(false);
  const [activeStatsCorner, setActiveStatsCorner] = useState<'BIRU' | 'MERAH'>('BIRU');
  const [showGenerateBaganPopup, setShowGenerateBaganPopup] = useState<boolean>(false);
  const [showGenerateJadwalPopup, setShowGenerateJadwalPopup] = useState<boolean>(false);
  const [selectedGelanggang, setSelectedGelanggang] = useState<string>(() => localStorage.getItem('silat_selected_gelanggang') || 'GELANGGANG 1');
  const [showGelanggangDropdown, setShowGelanggangDropdown] = useState<boolean>(false);
  const [baganAthletes, setBaganAthletes] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('silat_bagan_athletes');
      return saved ? JSON.parse(saved) : [
        { nama: "ADI WIJAYA", kontingen: "JAWA TENGAH" },
        { nama: "RIZKY PUTRA", kontingen: "JAWA TIMUR" },
        { nama: "NURUL INDAH", kontingen: "SULAWESI SELATAN" },
        { nama: "SITI AMINAH", kontingen: "BANTEN" },
        { nama: "DEWANTO", kontingen: "DKI JAKARTA" },
        { nama: "FARHAN RAZAK", kontingen: "JAWA BARAT" },
        { nama: "HERI KUSUMA", kontingen: "BALI" },
        { nama: "AKBAR MAULANA", kontingen: "DI YOGYAKARTA" }
      ];
    } catch {
      return [
        { nama: "ADI WIJAYA", kontingen: "JAWA TENGAH" },
        { nama: "RIZKY PUTRA", kontingen: "JAWA TIMUR" },
        { nama: "NURUL INDAH", kontingen: "SULAWESI SELATAN" },
        { nama: "SITI AMINAH", kontingen: "BANTEN" },
        { nama: "DEWANTO", kontingen: "DKI JAKARTA" },
        { nama: "FARHAN RAZAK", kontingen: "JAWA BARAT" },
        { nama: "HERI KUSUMA", kontingen: "BALI" },
        { nama: "AKBAR MAULANA", kontingen: "DI YOGYAKARTA" }
      ];
    }
  });

  const [baganKelas, setBaganKelas] = useState<string>(() => localStorage.getItem('silat_bagan_kelas') || 'TUNGGAL');
  const [baganGender, setBaganGender] = useState<string>(() => localStorage.getItem('silat_bagan_gender') || 'PUTRA');
  const [baganUsia, setBaganUsia] = useState<string>(() => localStorage.getItem('silat_bagan_usia') || 'REMAJA');
  const [baganStartingStage, setBaganStartingStage] = useState<string>(() => localStorage.getItem('silat_bagan_starting_stage') || 'PENYISIHAN');
  const [baganPool, setBaganPool] = useState<string>(() => localStorage.getItem('silat_bagan_pool') || 'NONE');

  const [jadwalLines, setJadwalLines] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('silat_jadwal_lines');
      return saved ? JSON.parse(saved) : [
        {
          partai: "1",
          kelas: "TUNGGAL",
          gender: "PUTRA",
          kategoriUsia: "REMAJA",
          tahapPertandingan: "PENYISIHAN",
          atlitMerah: { nama: "ANDI SANTOSO", kontingen: "JAWA TENGAH" },
          atlitBiru: { nama: "BUDI PRASETYO", kontingen: "DKI JAKARTA" }
        },
        {
          partai: "2",
          kelas: "TUNGGAL",
          gender: "PUTRI",
          kategoriUsia: "REMAJA",
          tahapPertandingan: "PENYISIHAN",
          atlitMerah: { nama: "SITI NUR HALIZA", kontingen: "JAWA BARAT" },
          atlitBiru: { nama: "DIAN UTAMI", kontingen: "JAWA TIMUR" }
        },
        {
          partai: "3",
          kelas: "TUNGGAL",
          gender: "PUTRA",
          kategoriUsia: "DEWASA",
          tahapPertandingan: "SEMIFINAL",
          atlitMerah: { nama: "EKO WAHYUDI", kontingen: "BALI" },
          atlitBiru: { nama: "FAJAR NUGRAHA", kontingen: "DI YOGYAKARTA" }
        },
        {
          partai: "4",
          kelas: "TUNGGAL",
          gender: "PUTRA",
          kategoriUsia: "DEWASA",
          tahapPertandingan: "FINAL",
          atlitMerah: { nama: "GUNTUR PERMANA", kontingen: "BANTEN" },
          atlitBiru: { nama: "HERI SUSANTO", kontingen: "SUMATERA UTARA" }
        }
      ];
    } catch {
      return [];
    }
  });

  const updateJadwalLines = (lines: any[]) => {
    setJadwalLines(lines);
    localStorage.setItem('silat_jadwal_lines', JSON.stringify(lines));
  };

  const handleBaganFileUpload = async (file: File) => {
    try {
      const data = await parseExcelImport(file);
      if (data && data.length > 0) {
        const matchedList = data.map((row: any) => {
          const nama = row['Nama'] || row['Nama Pesilat'] || row['Nama Atlit'] || row['Pesilat'] || row['atlit'] || Object.values(row)[0] || "";
          const kontingen = row['Kontingen'] || row['Asal'] || row['Daerah'] || row['Asal Kontingen'] || Object.values(row)[1] || "";
          if (!nama || String(nama).trim() === "") return null;
          return { nama: String(nama).toUpperCase(), kontingen: String(kontingen).toUpperCase() };
        }).filter(Boolean) as { nama: string; kontingen: string }[];

        const L = matchedList.length;
        if (L < 2) {
          // Guarantee a minimum of 2 slots
          const paddedList = [...matchedList];
          while (paddedList.length < 2) {
            paddedList.push({ nama: "", kontingen: "" });
          }
          setBaganAthletes(paddedList);
          localStorage.setItem('silat_bagan_athletes', JSON.stringify(paddedList));
          showToast(`Berhasil mengimpor ${L} atlit ke bagan!`, 'success');
        } else {
          setBaganAthletes(matchedList);
          localStorage.setItem('silat_bagan_athletes', JSON.stringify(matchedList));
          showToast(`Berhasil mengimpor ${L} atlit ke bagan!`, 'success');
        }
      }
    } catch (err) {
      showToast('Gagal memproses file excel bagan.', 'warning');
    }
  };

  const handleJadwalFileUpload = async (file: File) => {
    try {
      const data = await parseExcelImport(file);
      if (data && data.length > 0) {
        const parsed = data.map((row: any, i: number) => {
          let rPartai = String(row['Partai'] || row['partai'] || i + 1);
          let rKelas = String(row['Kategori'] || row['kategori'] || row['KATEGORI'] || row['Kelas'] || row['kelas'] || 'TUNGGAL').toUpperCase();
          let rGender = String(row['Gender'] || row['gender'] || 'PUTRA').toUpperCase();
          let rUsia = String(row['Kategori Usia'] || row['Usia'] || row['usia'] || row['kategoriUsia'] || 'REMAJA').toUpperCase();
          let rTahap = String(row['Babak'] || row['babak'] || row['Tahap Pertandingan'] || row['Tahapan'] || row['tahap'] || 'PENYISIHAN').toUpperCase();
          
          let nmM = String(row['Nama Pesilat Merah'] || row['Nama Atlit Merah'] || row['Nama Merah'] || row['namaMerah'] || row['atlitMerahNama'] || row['Nama'] || '-').toUpperCase();
          let ktM = String(row['Kontingen Merah'] || row['Asal Merah'] || row['kontingenMerah'] || row['Kontingen'] || 'DAERAH').toUpperCase();
          
          let nmB = String(row['Nama Pesilat Biru'] || row['Nama Atlit Biru'] || row['Nama Biru'] || row['namaBiru'] || row['atlitBiruNama'] || row['Nama_2'] || '-').toUpperCase();
          let ktB = String(row['Kontingen Biru'] || row['Asal Biru'] || row['kontingenBiru'] || row['Kontingen_2'] || 'DAERAH').toUpperCase();

          return {
            partai: rPartai,
            kelas: rKelas,
            gender: rGender,
            kategoriUsia: rUsia,
            tahapPertandingan: rTahap,
            atlitMerah: { nama: nmM, kontingen: ktM },
            atlitBiru: { nama: nmB, kontingen: ktB }
          };
        });
        setJadwalLines(parsed);
        localStorage.setItem('silat_jadwal_lines', JSON.stringify(parsed));
        showToast(`Sukses memuat ${parsed.length} jadwal pertandingan dari Excel!`, 'success');
      }
    } catch (err) {
      showToast('Gagal memproses file excel jadwal.', 'warning');
    }
  };

  // License and simulated lock states
  const [isSimulatedLocked, setIsSimulatedLocked] = useState<boolean>(() => localStorage.getItem('silat_simulated_lock') === 'true');
  const [activationKeyInput, setActivationKeyInput] = useState<string>(() => {
    const saved = localStorage.getItem('silat_activation_key') || '';
    if (saved && verifyActivationKey(getDeviceId(), saved)) {
      return saved;
    }
    return '';
  });
  const [isAppLicensed, setIsAppLicensed] = useState<boolean>(() => {
    const saved = localStorage.getItem('silat_activation_key') || '';
    return verifyActivationKey(getDeviceId(), saved);
  });
  const [activationError, setActivationError] = useState<string | null>(null);
  const [showActivationSuccess, setShowActivationSuccess] = useState<boolean>(false);
  const [genDeviceIdInput, setGenDeviceIdInput] = useState<string>('');
  const [showAdminGen, setShowAdminGen] = useState<boolean>(false);
  const [serverDeviceId, setServerDeviceId] = useState<string>(() => getDeviceId());
  const [showLicenseStatusPopup, setShowLicenseStatusPopup] = useState<boolean>(false);

  useEffect(() => {
    // Check local server license status on mount
    fetch('/api/license/status')
      .then(res => res.json())
      .then(data => {
        if (data.deviceId) {
          setServerDeviceId(data.deviceId);
          
          const localSavedKey = localStorage.getItem('silat_activation_key') || '';
          const serverSavedKey = data.activationKey || '';
          const bestKey = (serverSavedKey || localSavedKey).trim().toUpperCase();

          // Pre-fill the activation key input if it is valid for this device ID
          if (bestKey && verifyActivationKey(data.deviceId, bestKey)) {
            setActivationKeyInput(bestKey);
          } else {
            setActivationKeyInput('');
          }

          if (data.isLicensed) {
            setIsAppLicensed(true);
            // Sync to local storage
            if (serverSavedKey && serverSavedKey !== localSavedKey) {
              localStorage.setItem('silat_activation_key', serverSavedKey);
            }
          } else {
            // Server is not licensed, check if we have a valid key for this device
            if (bestKey && verifyActivationKey(data.deviceId, bestKey)) {
              // Automatically activate!
              fetch('/api/license/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activationKey: bestKey })
              })
              .then(async res => {
                const actData = await res.json();
                if (res.ok && actData.success) {
                  localStorage.setItem('silat_activation_key', bestKey);
                  setIsAppLicensed(true);
                  showToast('Lisensi sebelumnya terdeteksi dan diaktifkan secara otomatis!', 'success');
                } else {
                  setIsAppLicensed(false);
                }
              })
              .catch(err => {
                // Offline fallback activation
                localStorage.setItem('silat_activation_key', bestKey);
                setIsAppLicensed(true);
                showToast('Lisensi sebelumnya diaktifkan secara otomatis (Offline)!', 'success');
              });
            } else {
              setIsAppLicensed(false);
            }
          }
        }
      })
      .catch(err => {
        console.warn('Could not contact server for license status:', err);
        // Offline fallback logic using local storage
        const localSavedKey = localStorage.getItem('silat_activation_key') || '';
        if (localSavedKey && verifyActivationKey(getDeviceId(), localSavedKey)) {
          setActivationKeyInput(localSavedKey);
          setIsAppLicensed(true);
        } else {
          setIsAppLicensed(false);
          setActivationKeyInput('');
        }
      });
  }, []);

  // Aggressive SVG & Image assets preloading to ensure instant render without flicker when entering Dewan/Monitor panel
  useEffect(() => {
    const assetsToPreload = [
      // Standard roots
      "/binaan1.svg",
      "/binaan2.svg",
      "/teguran1.svg",
      "/teguran2.svg",
      "/peringatan1.svg",
      "/peringatan2.svg",
      "/punch.svg",
      "/kick.svg",
      "/pesilatkiri.svg",
      "/pesilatkanan.svg",
      "/pesilat1.png",
      "/pesilat2.png",
      "/temadiscors.png",
      "/logodiscorsgrid.svg",
      "/nodiscorstgr.png",
      "/dewan.png",
      "/juri.png",
      "/monitor.png",
      "/sekretaris.png",
      // /assets/ routes
      "/assets/binaan1.svg",
      "/assets/binaan2.svg",
      "/assets/teguran1.svg",
      "/assets/teguran2.svg",
      "/assets/peringatan1.svg",
      "/assets/peringatan2.svg",
      "/assets/punch.svg",
      "/assets/kick.svg",
      "/assets/pesilat1.png",
      "/assets/pesilat2.png",
      "/assets/pesilatkiri.svg",
      "/assets/pesilatkanan.svg",
      "/assets/temadiscors.png"
    ].map(url => url.includes('?') ? url : `${url}?v=15`);

    // Dynamic customIcons from state
    if (matchState.customIcons) {
      Object.keys(matchState.customIcons).forEach((key) => {
        const url = matchState.customIcons?.[key as any];
        if (url && typeof url === "string") {
          assetsToPreload.push(url);
          // Preload clean URL without timestamp hash as well to ensure perfect caching
          const idx = url.indexOf('?');
          if (idx !== -1) {
            assetsToPreload.push(url.substring(0, idx));
          }
        }
      });
    }

    // Dynamic logos
    if (matchState.logoKiri && typeof matchState.logoKiri === "string") {
      assetsToPreload.push(matchState.logoKiri);
      const idx = matchState.logoKiri.indexOf('?');
      if (idx !== -1) assetsToPreload.push(matchState.logoKiri.substring(0, idx));
    }
    if (matchState.logoKanan && typeof matchState.logoKanan === "string") {
      assetsToPreload.push(matchState.logoKanan);
      const idx = matchState.logoKanan.indexOf('?');
      if (idx !== -1) assetsToPreload.push(matchState.logoKanan.substring(0, idx));
    }

    // Unique URL collection
    const uniqueAssets = Array.from(new Set([
      ...assetsToPreload,
      "/sekretaris.png",
      "/dewan.png",
      "/juri.png",
      "/monitor.png",
      "/nodiscorstgr.png",
      "/temadiscors.png",
      "/pesilat1.png",
      "/pesilat2.png"
    ]));

    // Force preloading via DOM Image instantiation - cache check to avoid CPU lag / crashes
    uniqueAssets.forEach((url) => {
      if (preloadedAssetsCache.has(url)) return;
      preloadedAssetsCache.add(url);
      const img = new Image();
      const finalUrl = (url.startsWith('/') && !url.startsWith('/api')) ? '.' + url : url;
      img.src = finalUrl;
    });
  }, [JSON.stringify(matchState.customIcons || {}), matchState.logoKiri, matchState.logoKanan]);

  useEffect(() => {
    if (!matchState.showRoundEndPopUp) {
      setPeekRoundEnd(false);
    }
  }, [matchState.showRoundEndPopUp]);

  useEffect(() => {
    if (matchState.showMatchEndPopUp || matchState.diskualifikasi) {
      setDewanClosedMatchEndPopUp(false);
    }
  }, [matchState.showMatchEndPopUp, matchState.diskualifikasi]);

  const RenderIconOrCustom = ({ 
    iconKey, 
    DefaultIcon, 
    className = "w-8 h-8 mb-1" 
  }: { 
    iconKey: keyof CustomIcons; 
    DefaultIcon: React.FC<React.SVGProps<SVGSVGElement>>; 
    className?: string;
  }) => {
    const customSrc = matchState.customIcons?.[iconKey];
    if (customSrc) {
      const classes = className.split(' ');
      const sizeClasses = classes.filter(c => c.startsWith('w-') || c.startsWith('h-')).join(' ');
      const otherClasses = classes.filter(c => !c.startsWith('w-') && !c.startsWith('h-')).join(' ');
      return (
        <div className={`flex items-center justify-center overflow-hidden shrink-0 ${sizeClasses} ${otherClasses}`}>
          <img 
            src={customSrc} 
            className="w-full h-full object-contain max-w-full max-h-full pointer-events-none" 
            alt={iconKey} 
            referrerPolicy="no-referrer" 
          />
        </div>
      );
    }
    return <DefaultIcon className={className} />;
  };



  const getMaxRounds = (kategoriUsia?: string, babakAktif?: number): number => {
    const norm = (kategoriUsia || '').toUpperCase().trim();
    const isTwoRounds = [
      "PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER 2", "MASTER A", "MASTER B"
    ].includes(norm);
    const normalMax = isTwoRounds ? 2 : 3;
    const currentBabak = babakAktif !== undefined ? babakAktif : (matchState ? matchState.babakAktif : 1);
    return Math.max(normalMax, currentBabak);
  };

  // High quality local states to back input fields preventing typing lag / cursor jumping
  const [localEventName, setLocalEventName] = useState(matchState.eventName);
  const [localTempatPelaksanaan, setLocalTempatPelaksanaan] = useState(matchState.tempatPelaksanaan || '');
  const [localWaktuPelaksanaan, setLocalWaktuPelaksanaan] = useState(matchState.waktuPelaksanaan || '');
  const [localPartai, setLocalPartai] = useState(matchState.partai);
  const [localKelas, setLocalKelas] = useState(matchState.kelas);
  const [localAtlitBiruNama, setLocalAtlitBiruNama] = useState(matchState?.atlitBiru?.nama || '');
  const [localAtlitBiruKontingen, setLocalAtlitBiruKontingen] = useState(matchState?.atlitBiru?.kontingen || '');
  const [localAtlitMerahNama, setLocalAtlitMerahNama] = useState(matchState?.atlitMerah?.nama || '');
  const [localAtlitMerahKontingen, setLocalAtlitMerahKontingen] = useState(matchState?.atlitMerah?.kontingen || '');
  const [localLogoKiri, setLocalLogoKiri] = useState(matchState.logoKiri || '');
  const [localLogoKanan, setLocalLogoKanan] = useState(matchState.logoKanan || '');

  const isPoolSystem = matchState.sistemTanding === 'POOL' || 
                       matchState.tahapPertandingan?.toUpperCase().includes('POOL') || 
                       matchState.atlitMerah?.nama === '---' || 
                       matchState.atlitBiru?.nama === '---';

  const isCurrentMatchArchived = history.some(h => 
    String(h.partai).trim().toUpperCase() === String(matchState.partai || '').trim().toUpperCase() &&
    (String(h.kelas || '').trim().toUpperCase() === String(matchState.kelas || '').trim().toUpperCase() ||
     String(h.kategoriSeni || '').trim().toUpperCase() === String(matchState.kategoriSeni || '').trim().toUpperCase())
  );

  const activePoolCorner = isPoolSystem
    ? ((matchState.atlitBiru?.nama !== '---' && matchState.atlitBiru?.nama) ? 'BIRU' : 'MERAH')
    : undefined;

  useEffect(() => {
    if (document.activeElement?.id !== 'input-eventName') setLocalEventName(matchState.eventName);
    if (document.activeElement?.id !== 'input-tempatPelaksanaan') setLocalTempatPelaksanaan(matchState.tempatPelaksanaan || '');
    if (document.activeElement?.id !== 'input-waktuPelaksanaan') setLocalWaktuPelaksanaan(matchState.waktuPelaksanaan || '');
    if (document.activeElement?.id !== 'input-partai') setLocalPartai(matchState.partai);
    if (document.activeElement?.id !== 'input-kelas') setLocalKelas(matchState.kelas);
    if (document.activeElement?.id !== 'input-atlitBiruNama') setLocalAtlitBiruNama(matchState?.atlitBiru?.nama || '');
    if (document.activeElement?.id !== 'input-atlitBiruKontingen') setLocalAtlitBiruKontingen(matchState?.atlitBiru?.kontingen || '');
    if (document.activeElement?.id !== 'input-atlitMerahNama') setLocalAtlitMerahNama(matchState?.atlitMerah?.nama || '');
    if (document.activeElement?.id !== 'input-atlitMerahKontingen') setLocalAtlitMerahKontingen(matchState?.atlitMerah?.kontingen || '');
    if (document.activeElement?.id !== 'input-logoKiri') setLocalLogoKiri(matchState.logoKiri || '');
    if (document.activeElement?.id !== 'input-logoKanan') setLocalLogoKanan(matchState.logoKanan || '');

    // Auto-activate corner for POOL system matches
    if (isPoolSystem && role === 'SEKRETARIS') {
      const detectedActiveCorner = (matchState.atlitBiru?.nama !== '---' && matchState.atlitBiru?.nama) ? 'BIRU' : 'MERAH';
      if (matchState.activeCorner !== detectedActiveCorner) {
        const timer = setTimeout(() => {
          updateMatchState({
            ...matchState,
            activeCorner: detectedActiveCorner,
            sisaWaktu: 0,
            timer2Value: 0,
            timerBerjalan: false
          });
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [matchState, role]);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleActivateApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = activationKeyInput.trim().toUpperCase();
    
    fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activationKey: cleanKey })
    })
    .then(async res => {
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('silat_activation_key', cleanKey);
        localStorage.setItem('silat_simulated_lock', 'false');
        setIsSimulatedLocked(false);
        setIsAppLicensed(true);
        setActivationError(null);
        setActivationKeyInput('');
        setShowActivationSuccess(true);
        if (soundEnabled) playPointSound();
        showToast('Sistem Berhasil Diaktifkan! Proteksi Dibuka.', 'success');
      } else {
        throw new Error(data.error || 'Aktivasi gagal.');
      }
    })
    .catch(err => {
      // Local offline fallback in case the server is temporarily unreachable
      const correctKey = generateActivationKey(serverDeviceId);
      if (cleanKey === correctKey) {
        localStorage.setItem('silat_activation_key', cleanKey);
        localStorage.setItem('silat_simulated_lock', 'false');
        setIsSimulatedLocked(false);
        setIsAppLicensed(true);
        setActivationError(null);
        setActivationKeyInput('');
        setShowActivationSuccess(true);
        if (soundEnabled) playPointSound();
        showToast('Aktivasi Lokal Sukses (Offline)! Proteksi Dibuka.', 'success');
      } else {
        setActivationError('Kunci Aktivasi tidak valid! Silakan periksa kembali.');
        if (soundEnabled) playWarningSound();
        showToast('Kunci Aktivasi Salah!', 'warning');
      }
    });
  };

  const toggleSimulatedLock = () => {
    const nextVal = !isSimulatedLocked;
    localStorage.setItem('silat_simulated_lock', String(nextVal));
    setIsSimulatedLocked(nextVal);
    if (soundEnabled) playClickSound();
    showToast(nextVal ? 'Simulasi Layar Pengunci Diaktifkan!' : 'Simulasi Layar Pengunci Dinonaktifkan!', nextVal ? 'warning' : 'success');
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const docEl = document.documentElement as any;
      const requestM = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (requestM) {
        requestM.call(docEl).catch((err: any) => {
          console.error(`Error attempting to enable fullscreen: ${err?.message}`);
        });
      }
    } else {
      const doc = document as any;
      const exitM = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exitM) {
        exitM.call(doc);
      }
    }
  };

  // Keepalive heartbeat effect so that other devices know which Juri panels are active/in use
  useEffect(() => {
    if (role === 'JURI_PANEL' && selectedJuriId) {
      const sendHeartbeat = () => {
        fetch('/api/juri/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ juriId: selectedJuriId }),
        }).catch((err) => console.debug("Heartbeat error:", err));
      };

      // Send heartbeat immediately on mounting the panel
      sendHeartbeat();

      // Send heartbeat every 3 seconds
      const intervalId = setInterval(sendHeartbeat, 3000);
      return () => clearInterval(intervalId);
    }
  }, [role, selectedJuriId]);

  // Sync animation triggers on Validated Score additions
  const [glowMerah, setGlowMerah] = useState(false);
  const [glowBiru, setGlowBiru] = useState(false);
  
  // Track previous validated scores to trigger flashes only on NEW scores
  const lastValidatedLengthRef = useRef(matchState.validatedScores.length);

  // States for Juri cell flashing
  const [flashCells, setFlashCells] = useState<Record<string, boolean>>({});
  const flashedRawIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Sync/Clean up IDs that are no longer present in rawScores on resets
    const currentRawIds = new Set((matchState.rawScores || []).map(s => s.id));
    flashedRawIdsRef.current.forEach(id => {
      if (!currentRawIds.has(id)) {
        flashedRawIdsRef.current.delete(id);
      }
    });

    const validatedRaws = (matchState.rawScores || []).filter(s => s.validated);
    const cellsToFlash: Record<string, boolean> = {};

    validatedRaws.forEach(r => {
      if (!flashedRawIdsRef.current.has(r.id)) {
        flashedRawIdsRef.current.add(r.id);
        if (r.jenis) {
          const key = `${r.juriId}-${r.sudut}-${r.jenis}`;
          cellsToFlash[key] = true;
        }
      }
    });

    if (Object.keys(cellsToFlash).length > 0) {
      setFlashCells(prev => ({ ...prev, ...cellsToFlash }));
      setTimeout(() => {
        setFlashCells(prev => {
          const updated = { ...prev };
          Object.keys(cellsToFlash).forEach(key => {
            delete updated[key];
          });
          return updated;
        });
      }, 1500);
    }
  }, [matchState.rawScores]);

  // Shared state updater that integrates server and peer updates
  const handleIncomingState = (incomingState: MatchState) => {
    isLocalChangeRef.current = false;
    // Guard against stale/older server states due to network/SSE latency
    if (incomingState.version !== undefined && matchStateRef.current.version !== undefined) {
      if (incomingState.version < matchStateRef.current.version) {
        // Ignore older state to prevent flickering or reverting local actions
        return;
      }
      if (incomingState.version === matchStateRef.current.version) {
        // No-op for the same state we already computed locally
        return;
      }
    }

    // Sound indicator on new points in active juri or monitor tabs - REMOVED sound playback as requested to prevent match distraction, but keeping visual glow
    if (incomingState.validatedScores.length > lastValidatedLengthRef.current) {
      const lastNewScore = incomingState.validatedScores[incomingState.validatedScores.length - 1];
      if (lastNewScore && lastNewScore.jenis) {
        if (lastNewScore.sudut === 'MERAH') {
          setGlowMerah(true);
          setTimeout(() => setGlowMerah(false), 1500);
        } else {
          setGlowBiru(true);
          setTimeout(() => setGlowBiru(false), 1500);
        }
      }
    }
    
    // Sync sounds for verifikasi status transitions
    const prevVerif = matchStateRef.current.verifikasi;
    const nextVerif = incomingState.verifikasi;
    if (nextVerif && prevVerif && nextVerif.status !== prevVerif.status) {
      if (soundEnabled) {
        if (nextVerif.status === 'PENDING') {
          playWarningSound();
        } else if (nextVerif.status === 'RESOLVED') {
          playBuzzer();
        }
      }
    }

    // Sync buzzer sound on starting/resuming a new round (timer transitions from inactive to active and sisaWaktu is 0)
    const prevTimer = matchStateRef.current.timerBerjalan;
    const nextTimer = incomingState.timerBerjalan;
    if (!prevTimer && nextTimer && incomingState.sisaWaktu === 0) {
      if (soundEnabled) playGongSound();
    }

    // Sync buzzer sound (GONG) when TIMER 1 actually reaches the end of the round duration
    const prevGong = matchStateRef.current.gongPlayedForCurrentRound;
    const nextGong = incomingState.gongPlayedForCurrentRound;
    if (!prevGong && nextGong) {
      if (soundEnabled) playGongSound();
    }

    lastValidatedLengthRef.current = incomingState.validatedScores.length;

    // Unify state updates to prevent network latency and base64 upload lags from jittering the timer
    let finalState = checkSeniJuriFinish({ ...incomingState });

    // Preserve customIcons so they are not wiped from Juri click actions or state updates without customIcons
    if (finalState.customIcons === undefined && matchStateRef.current.customIcons !== undefined) {
      finalState.customIcons = matchStateRef.current.customIcons;
    }

    if (incomingState.timerBerjalan && matchStateRef.current.timerBerjalan) {
      // Rely on the local high-precision client device timer while actively running
      // to completely prevent any network latency or button-press events from jittering/reverting the timer
      finalState.sisaWaktu = matchStateRef.current.sisaWaktu;
      finalState.timer2Value = matchStateRef.current.timer2Value || 0;
    }

    if (incomingState.gelanggang && incomingState.gelanggang !== selectedGelanggang) {
      setSelectedGelanggang(incomingState.gelanggang);
      localStorage.setItem('silat_selected_gelanggang', incomingState.gelanggang);
    }

    // Track the last version we processed to prevent feedback loops in the broadcast effect
    lastStateVersionRef.current = finalState.version;
    matchStateRef.current = finalState;

    setMatchState(finalState);
    saveMatchState(finalState);
  };

  // Broadcast code for instant synchronization across tabs and network
  useEffect(() => {
    const channel = new BroadcastChannel('silat_scoring_sync');

    channel.onmessage = (event) => {
      if (event.data.type === 'UPDATE_STATE') {
        handleIncomingState(event.data.state as MatchState);
      } else if (event.data.type === 'UPDATE_HISTORY') {
        setHistory(event.data.history);
      }
    };

    // Server-Sent Events setup for cross-device sync
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'UPDATE_STATE') {
            handleIncomingState(data.state as MatchState);
          } else if (data.type === 'UPDATE_HISTORY') {
            setHistory(data.history);
          } else if (data.type === 'LICENSE_UPDATE') {
            setIsAppLicensed(data.isLicensed);
            if (data.deviceId) {
              setServerDeviceId(data.deviceId);
            }
          }
        } catch (e) {
          console.debug("SSE Parse Error", e);
        }
      };
    } catch (e) {
      console.warn("EventSource is not supported or server is offline", e);
    }

    return () => {
      channel.close();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [soundEnabled, selectedGelanggang]);

  // Effect to fetch initial match state from server on mount
  useEffect(() => {
    fetch('/api/match-state')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('No state on server');
      })
      .then(data => {
        if (data && data.state) {
          handleIncomingState(data.state);
        }
      })
      .catch(err => {
        console.debug('No server state yet, using local storage state.', err);
      });
  }, []);

  // Periodic polling fallback to resync in case network/SSE drops
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/match-state')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Poll failed');
        })
        .then(data => {
          if (data && data.state) {
            handleIncomingState(data.state);
          }
        })
        .catch(err => console.debug('Poll sync error:', err));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Effect to listen to other tabs updating local storage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'silat_scoring_match_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingState(parsed);
        } catch (err) {
          console.error('Error listening to storage sync:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Effect to broadcast state changes to other tabs when our local state increases its version
  useEffect(() => {
    if (matchState.version !== undefined && matchState.version !== lastStateVersionRef.current) {
      lastStateVersionRef.current = matchState.version;
      matchStateRef.current = matchState;
      saveMatchState(matchState);

      // Broadcast changes to other tabs
      try {
        const channel = new BroadcastChannel('silat_scoring_sync');
        channel.postMessage({ type: 'UPDATE_STATE', state: matchState });
        channel.close();
      } catch (e) {
        console.debug("Failed to post message on BroadcastChannel:", e);
      }
    }
  }, [matchState]);

  // Helper to check and trigger popups for Seni matches when all Juris have finished
  const checkSeniJuriFinish = (state: MatchState): MatchState => {
    // Automatics transitions from jury finish are disabled in favor of Dewan's LANJUT/AKHIRI button trigger.
    return state;
  };

  // Synchronize localStorage and active state to local variables on save
  const updateMatchState = (updatedRaw: MatchState) => {
    isLocalChangeRef.current = true;
    let updated = checkSeniJuriFinish(updatedRaw);
    
    // Filter activeJuriIds so they do not exceed current jumlahJuri
    if (updated.activeJuriIds) {
      const maxJuri = updated.jumlahJuri || 3;
      updated.activeJuriIds = updated.activeJuriIds.filter(id => id <= maxJuri);
    }

    // Inject gelanggang if not present
    if (!updated.gelanggang && selectedGelanggang) {
      updated.gelanggang = selectedGelanggang;
    }

    // Synchronize kategoriSeni with kelas (Kategori Jurus) dynamically
    if (updated.kelas) {
      const upperKelas = updated.kelas.toUpperCase();
      if (upperKelas.includes("GANDA")) {
        updated.kategoriSeni = "GANDA";
      } else if (upperKelas.includes("REGU")) {
        updated.kategoriSeni = "REGU";
      } else if (upperKelas.includes("SOLO") || upperKelas.includes("KREATIF") || upperKelas.includes("BEBAS")) {
        updated.kategoriSeni = "SOLO_KREATIF";
      } else if (upperKelas.includes("TUNGGAL")) {
        updated.kategoriSeni = "TUNGGAL";
      }
    }

    // If the Partai (match number) has changed compared to current state, reset bypass & trigger flags!
    if (updated.partai !== matchState.partai) {
      updated = {
        ...updated,
        wmpTriggered: false,
        wmpBypassed: false,
        wmpBypassedScoreDiff: 0,
        wmpWon: false,
        wmpBabak1Occurred: false,
        gongPlayedForCurrentRound: false,
        timerPlayLocked: false,
        timerBerjalan: false
      };
    }

    // If the babakAktif has changed compared to current state, reset the gong flag!
    if (updated.babakAktif !== matchState.babakAktif) {
      updated.gongPlayedForCurrentRound = false;
      updated.timerPlayLocked = false;
      updated.timerBerjalan = false;
    }

    // If the activeCorner has changed compared to current state, unlock the play button!
    if (updated.activeCorner !== matchState.activeCorner) {
      updated.timerPlayLocked = false;
      updated.gongPlayedForCurrentRound = false;
    }

    // Run WMP Check to automatically pause on score differences of 30/20 in babak 2 or 3
    const updatedWithCheck = runWmpCheck(updated);

    const babak = updatedWithCheck.babakAktif || 1;
    const historyMerah = { ...(updatedWithCheck.historyPenaltiesMerah || {}) };
    historyMerah[babak] = { ...updatedWithCheck.penaltiesMerah };

    const historyBiru = { ...(updatedWithCheck.historyPenaltiesBiru || {}) };
    historyBiru[babak] = { ...updatedWithCheck.penaltiesBiru };

    const updatedWithVersion = { 
      ...updatedWithCheck, 
      historyPenaltiesMerah: historyMerah,
      historyPenaltiesBiru: historyBiru,
      version: (matchStateRef.current.version ?? 0) + 1
    };
    matchStateRef.current = updatedWithVersion;
    setMatchState(updatedWithVersion);
    saveMatchState(updatedWithVersion);

    // Sync state with the server instantly (Exclude MONITOR role which is purely passive)
    if (role !== 'MONITOR') {
      fetch('/api/match-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          state: updatedWithVersion,
          role,
          selectedJuriId
        }),
      }).catch(err => {
        console.debug("Failed to sync match state with server:", err);
      });
    }
  };

  useKeyPress(' ', () => {
    if (matchState.statusPertandingan === 'BERJALAN') {
      toggleTimer();
    }
  });

  // Shift key shortcut for BELL / HORN on PC (Secretary panel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }
      if (e.key === 'Shift') {
        if (e.repeat) return;
        if (soundEnabled && role === 'SEKRETARIS') {
          e.preventDefault();
          startBuzzer();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        if (soundEnabled && role === 'SEKRETARIS') {
          e.preventDefault();
          stopBuzzer();
        }
      }
    };

    const handleBlur = () => {
      if (soundEnabled && role === 'SEKRETARIS') {
        stopBuzzer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [soundEnabled, role]);

  // Sound triggering helper
  const triggerClick = () => {
    if (soundEnabled && role !== 'SEKRETARIS') playClickSound();
  };

  // Automatically fill placeholders in jadwalLines and silat_excel_matches when history changes
  useEffect(() => {
    if (!history || history.length === 0 || !jadwalLines || jadwalLines.length === 0) return;
    
    let updated = false;
    const newJadwalLines = jadwalLines.map((row) => {
      const nextRow = { ...row };
      const resolvedBiru = resolvePlaceholderAthlete(row.atlitBiru, history);
      const resolvedMerah = resolvePlaceholderAthlete(row.atlitMerah, history);
      
      if (resolvedBiru?.nama !== row.atlitBiru?.nama || resolvedBiru?.kontingen !== row.atlitBiru?.kontingen) {
        nextRow.atlitBiru = resolvedBiru;
        updated = true;
      }
      if (resolvedMerah?.nama !== row.atlitMerah?.nama || resolvedMerah?.kontingen !== row.atlitMerah?.kontingen) {
        nextRow.atlitMerah = resolvedMerah;
        updated = true;
      }
      return nextRow;
    });

    if (updated) {
      setJadwalLines(newJadwalLines);
      localStorage.setItem('silat_jadwal_lines', JSON.stringify(newJadwalLines));
      
      // Also sync silat_excel_matches in localStorage if it exists
      const excelDataStr = localStorage.getItem('silat_excel_matches');
      if (excelDataStr) {
        try {
          const excelMatches = JSON.parse(excelDataStr);
          if (Array.isArray(excelMatches)) {
            const newExcelMatches = excelMatches.map((excelRow) => {
              const pStr = String(excelRow['Partai'] || '');
              const matchedRow = newJadwalLines.find(j => String(j.partai) === pStr);
              if (matchedRow) {
                return {
                  ...excelRow,
                  'Nama Pesilat Merah': matchedRow.atlitMerah?.nama || '',
                  'Kontingen Merah': matchedRow.atlitMerah?.kontingen || '',
                  'Nama Pesilat Biru': matchedRow.atlitBiru?.nama || '',
                  'Kontingen Biru': matchedRow.atlitBiru?.kontingen || ''
                };
              }
              return excelRow;
            });
            localStorage.setItem('silat_excel_matches', JSON.stringify(newExcelMatches));
          }
        } catch (err) {
          console.error("Error syncing excel matches on history update:", err);
        }
      }
    }
  }, [history, jadwalLines.length]);

  // Synchronize schedules to matchState so they are shared across devices / Monitor role
  useEffect(() => {
    if (role === 'SEKRETARIS') {
      const excelDataStr = localStorage.getItem('silat_excel_matches');
      let excelMatches: any[] = [];
      if (excelDataStr) {
        try {
          excelMatches = JSON.parse(excelDataStr);
        } catch {}
      }

      const shouldUpdate = 
        JSON.stringify(matchState.silat_jadwal_lines || []) !== JSON.stringify(jadwalLines || []) ||
        JSON.stringify(matchState.silat_excel_matches || []) !== JSON.stringify(excelMatches);

      if (shouldUpdate) {
        const timerObj = setTimeout(() => {
          updateMatchState({
            ...matchState,
            silat_jadwal_lines: jadwalLines,
            silat_excel_matches: excelMatches
          });
        }, 300);
        return () => clearTimeout(timerObj);
      }
    }
  }, [role, jadwalLines, matchState.partai]);

  // Local high-precision upward timer connected to device system clock
  const targetDur = matchState.durasiBabak || 180;
  const isTimer1Running = matchState.timerBerjalan || (matchState.sisaWaktu > 0 && matchState.sisaWaktu < targetDur);

  useEffect(() => {
    const isTimer2Running = matchState.timerBerjalan;

    if (!isTimer1Running && !isTimer2Running) return;

    const deviceStartTime = Date.now();
    const initialSisaWaktu = matchState.sisaWaktu;
    const initialTimer2Value = matchState.timer2Value || 0;

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - deviceStartTime) / 1000);
      const targetDuration = matchStateRef.current.durasiBabak || 180;
      
      const calculatedSisa = isTimer1Running 
        ? Math.min(targetDuration, initialSisaWaktu + elapsedSeconds)
        : matchStateRef.current.sisaWaktu;

      const calculatedSisa2 = isTimer2Running
        ? initialTimer2Value + elapsedSeconds
        : (matchStateRef.current.timer2Value || 0);

      if (calculatedSisa !== matchStateRef.current.sisaWaktu || calculatedSisa2 !== (matchStateRef.current.timer2Value || 0)) {
        const playedGong = matchStateRef.current.gongPlayedForCurrentRound;
        const shouldPlayGongNow = calculatedSisa >= targetDuration && !playedGong;

        let isWmpFired = false;
        let wmpStateToReturn: MatchState | null = null;

        const prev = matchStateRef.current;
        const kUsia = (prev.kategoriUsia || '').toUpperCase().trim();
        const isPraRemaja = kUsia === 'PRA REMAJA' || kUsia === 'PRA-REMAJA';
        const threshold = isPraRemaja ? 20 : 30;
        const scoreB = calculateFinalScore('BIRU', prev);
        const scoreR = calculateFinalScore('MERAH', prev);
        const diff = Math.abs(scoreB - scoreR);

        const isBabak1WmpActive = prev.wmpBabak1Occurred && calculatedSisa >= 60 && diff >= threshold;
        if (prev.babakAktif === 2 && isBabak1WmpActive && !prev.wmpTriggered && !prev.wmpWon && !prev.wmpBypassed) {
          isWmpFired = true;
          const winner = prev.wmpPemenang || (scoreB > scoreR ? 'BIRU' : 'MERAH');
          wmpStateToReturn = {
            ...prev,
            sisaWaktu: calculatedSisa,
            timer2Value: calculatedSisa2,
            timerBerjalan: false,
            wmpTriggered: true,
            wmpPemenang: winner,
            wmpBypassed: false
          };
        }

        if (shouldPlayGongNow) {
          if (soundEnabled) playGongSound();
        }

        const currentRound = prev.babakAktif;
        const maxRounds = getMaxRounds(prev.kategoriUsia);
        const isSeniMatch = ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(prev.kelas) || ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(prev.kategoriSeni);
        
        let isMatchFinished = false;
        if (isSeniMatch) {
          const willHavePerformedBIRU = prev.hasPerformedBIRU;
          const willHavePerformedMERAH = prev.hasPerformedMERAH;
          isMatchFinished = !!(willHavePerformedBIRU && willHavePerformedMERAH);
        } else {
          isMatchFinished = currentRound === maxRounds;
        }

        let baseNextState: MatchState = {
          ...matchStateRef.current,
          sisaWaktu: calculatedSisa,
          timer2Value: calculatedSisa2,
          gongPlayedForCurrentRound: shouldPlayGongNow ? true : playedGong
        };

        if (isSeniMatch) {
          const active = prev.activeCorner || 'BIRU';
          if (active === 'BIRU') {
            baseNextState.durasiTampilBIRU = calculatedSisa2;
          } else {
            baseNextState.durasiTampilMERAH = calculatedSisa2;
          }
        }

        const nextState: MatchState = isWmpFired && wmpStateToReturn ? {
          ...wmpStateToReturn,
          gongPlayedForCurrentRound: shouldPlayGongNow ? true : playedGong
        } : baseNextState;

        if (role === 'SEKRETARIS') {
          updateMatchState(nextState);
        } else {
          setMatchState(nextState);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    isTimer1Running,
    matchState.timerBerjalan,
    matchState.durasiBabak,
    matchState.babakAktif,
    role,
    soundEnabled
  ]);

  // Auto-close VAR result display after 3 seconds on MONITOR
  useEffect(() => {
    if (role === 'MONITOR' && matchState.varChecking && matchState.varChecking.status === 'RESULT') {
      const timer = setTimeout(() => {
        updateMatchState({
          ...matchState,
          varChecking: {
            status: 'IDLE',
            sudut: null,
            result: null
          }
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [role, matchState.varChecking?.status, matchState.varChecking?.result]);

  // Track displayed verifikasi ID using a ref to avoid repeating on re-renders/SSE updates
  const lastDisplayedVerifikasiIdRef = useRef<string | null>(null);
  const verifikasiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (role === 'MONITOR') {
      const currentStatus = matchState.verifikasi.status;
      const currentId = matchState.verifikasi.id;

      if (currentStatus === 'RESOLVED' && currentId) {
        // Only trigger the popup if we haven't displayed this specific resolved verifikasi ID yet
        if (lastDisplayedVerifikasiIdRef.current !== currentId) {
          lastDisplayedVerifikasiIdRef.current = currentId;

          setVerifikasiPopupData({
            jenis: matchState.verifikasi.jenis,
            result: matchState.verifikasi.result,
          });
          setShowVerifikasiResultPopup(true);

          if (verifikasiTimeoutRef.current) {
            clearTimeout(verifikasiTimeoutRef.current);
          }

          verifikasiTimeoutRef.current = setTimeout(() => {
            setShowVerifikasiResultPopup(false);
            setVerifikasiPopupData(null);
            verifikasiTimeoutRef.current = null;
          }, 3000);
        }
      } else if (currentStatus !== 'RESOLVED') {
        setShowVerifikasiResultPopup(false);
        setVerifikasiPopupData(null);
        if (verifikasiTimeoutRef.current) {
          clearTimeout(verifikasiTimeoutRef.current);
          verifikasiTimeoutRef.current = null;
        }
        if (!currentId) {
          lastDisplayedVerifikasiIdRef.current = null;
        }
      }
    }
  }, [role, matchState.verifikasi.status, matchState.verifikasi.id, matchState.verifikasi.jenis, matchState.verifikasi.result]);

  useEffect(() => {
    return () => {
      if (verifikasiTimeoutRef.current) {
        clearTimeout(verifikasiTimeoutRef.current);
      }
    };
  }, []);

  const lastWmpTriggeredRef = useRef<boolean>(false);
  useEffect(() => {
    if (matchState.wmpTriggered && !lastWmpTriggeredRef.current) {
      if (soundEnabled) {
        playBuzzer(); // Play Horn sound automatically
      }
    }
    lastWmpTriggeredRef.current = !!matchState.wmpTriggered;
  }, [matchState.wmpTriggered, soundEnabled]);

  // Web Audio Context activation physically on user gesture
  const selectRoleAndTriggerAudio = (destRole: typeof role) => {
    initAudio();
    triggerClick();

    // If navigating away from JURI_PANEL, remove the selected Juri ID from activeJuriIds
    if (role === 'JURI_PANEL' && destRole !== 'JURI_PANEL' && selectedJuriId) {
      const currentActive = matchState.activeJuriIds || [];
      const updatedActive = currentActive.filter(id => id !== selectedJuriId);
      updateMatchState({
        ...matchState,
        activeJuriIds: updatedActive
      });
    }

    setRole(destRole);
  };

  const registerJuriClick = (sudut: 'MERAH' | 'BIRU', jenis: string) => {
    triggerClick();

    // Trigger visual neon glow effect
    // Punch and kick are no longer utilized since this is exclusively Seni/Jurus category

    // 1. Optimistic Local State Update for instantaneous visual response
    const timestamp = Date.now();
    const tempId = 'temp-' + timestamp + '-' + Math.random().toString(36).substr(2, 9);
    const newRaw: any = {
      id: tempId,
      juriId: Number(selectedJuriId),
      sudut,
      jenis,
      timestamp,
      babak: matchState.babakAktif,
      validated: false,
      validatedGroupId: undefined,
    };

    setMatchState(prev => {
      return {
        ...prev,
        version: (prev.version ?? 0) + 1, // Optimistic sequential version increase
        rawScores: [...(prev.rawScores || []), newRaw]
      };
    });

    fetch('/api/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        juriId: selectedJuriId,
        sudut,
        jenis,
        babak: matchState.babakAktif,
      }),
    })
    .catch((err) => {
      console.error("Error registering Juri click:", err);
    });
  };

  const deleteLastJuriClick = (sudut: 'MERAH' | 'BIRU') => {
    triggerClick();

    // Optimistic local state update for instantaneous delete response
    setMatchState(prev => {
      const list = [...(prev.rawScores || [])];
      const jNum = Number(selectedJuriId);
      const bNum = Number(prev.babakAktif);
      const lastIdx = list
        .map((s, idx) => ({ s, idx }))
        .filter(x => x.s.juriId === jNum && x.s.sudut === sudut && x.s.babak === bNum)
        .sort((a, b) => b.s.timestamp - a.s.timestamp)[0]?.idx;

      if (lastIdx !== undefined) {
        list.splice(lastIdx, 1);
      }
      return {
        ...prev,
        version: (prev.version ?? 0) + 1,
        rawScores: list
      };
    });

    fetch('/api/delete-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        juriId: selectedJuriId,
        sudut,
        babak: matchState.babakAktif,
      }),
    })
    .catch((err) => {
      console.error("Error deleting last Juri click:", err);
    });
  };

  // Countdown timer effect is handled entirely on the server-side to guarantee consistency across multi-devices, tabs, and clients without racing conditions.
  useEffect(() => {
    // Client-side timer intervals are disabled. The Server-Sent Events (SSE) automatically sync server ticks.
  }, [matchState.timerBerjalan]);

  const toggleTimer = () => {
    if (!matchState.timerBerjalan && (matchState.timerPlayLocked || (isSeniMatch && !matchState.activeCorner))) {
      return;
    }
    triggerClick();
    const nextState = !matchState.timerBerjalan;
    
    let gongPlayedForCurrentRound = matchState.gongPlayedForCurrentRound;
    let timerPlayLocked = matchState.timerPlayLocked;

    if (!nextState) { // stopping
      timerPlayLocked = true;
      // No GONG plays on manual STOP. GONG for Timer 1 ONLY triggers automatically in the background ticker upon reaching target duration.
    } else { // starting
      if (matchState.sisaWaktu === 0 && soundEnabled) {
        playGongSound();
      }
    }

    const currentRound = matchState.babakAktif;
    const maxRounds = getMaxRounds(matchState.kategoriUsia);
    
    let isMatchFinished = false;
    let updatedHasPerformed = {};

    if (isSeniMatch) {
      const active = matchState.activeCorner || 'BIRU';
      if (active === 'BIRU') {
        updatedHasPerformed = { 
          durasiTampilBIRU: matchState.timer2Value || 0
        };
      } else {
        updatedHasPerformed = { 
          durasiTampilMERAH: matchState.timer2Value || 0
        };
      }
    } else {
      isMatchFinished = currentRound === maxRounds;
    }

    const isRoundFinished = isSeniMatch ? true : (matchState.sisaWaktu >= matchState.durasiBabak);

    const stoppedState: MatchState = {
      ...matchState,
      ...updatedHasPerformed,
      statusPertandingan: 'BERJALAN', // Auto-unlock the board if they start the timer
      timerBerjalan: nextState,
      showRoundEndPopUp: isSeniMatch ? matchState.showRoundEndPopUp : (!nextState && isRoundFinished),
      showMatchEndPopUp: isSeniMatch ? matchState.showMatchEndPopUp : (!nextState && isRoundFinished && isMatchFinished),
      gongPlayedForCurrentRound,
      timerPlayLocked,
    };

    if (!nextState && isRoundFinished && isMatchFinished && !isSeniMatch) {
      stoppedState.statusPertandingan = "SELESAI";
      stoppedState.pemenang = determineWinner(stoppedState);
    }

    updateMatchState(stoppedState);
  };

  const resetTimer = () => {
    triggerClick();
    updateMatchState({
      ...matchState,
      timerBerjalan: false,
      sisaWaktu: 0,
      timer2Value: 0,
      activeCorner: undefined,
      showRoundEndPopUp: false,
      showMatchEndPopUp: false,
      gongPlayedForCurrentRound: false,
      timerPlayLocked: false
    });
  };

  const resolvePlaceholderAthlete = (athlete: any, historyList: PastMatch[]) => {
    if (!athlete || !athlete.nama) return athlete;
    const upperName = String(athlete.nama).toUpperCase();
    
    // Support "MENUNGGU PEMENANG PARTAI 1" or "PEMENANG PARTAI 1"
    const regex = /(?:MENUNGGU\s+)?PEMENANG\s+PARTAI\s*(\d+)/i;
    const match = upperName.match(regex);
    if (match) {
      const targetPartaiNum = parseInt(match[1], 10);
      // Search history for a match with this partai
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
            nama: winner.nama.toUpperCase(),
            kontingen: (winner.kontingen || "").toUpperCase()
          };
        }
      }
    }
    return athlete;
  };

  const getNextMatchInfo = () => {
    let nextPartai = "1";
    if (matchState.partai) {
      const matches = matchState.partai.match(/\d+/);
      if (matches) {
        const num = parseInt(matches[0], 10);
        nextPartai = matchState.partai.replace(matches[0], (num + 1).toString());
      } else {
        nextPartai = (parseInt(matchState.partai, 10) || 0) + 1 + "";
      }
    }

    const normalizePartai = (p: any): string => {
      if (p === undefined || p === null) return '';
      const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
      const matched = str.match(/\d+/);
      if (matched) {
        return parseInt(matched[0], 10).toString();
      }
      return str;
    };

    const targetNorm = normalizePartai(nextPartai);

    // 1. First, try reading from silat_jadwal_lines (Secretary's match parameters schedule list)
    let jadwalLinesLocal: any[] | null = null;
    if (matchState.silat_jadwal_lines && Array.isArray(matchState.silat_jadwal_lines)) {
      jadwalLinesLocal = matchState.silat_jadwal_lines;
    } else {
      const jadwalDataStr = localStorage.getItem('silat_jadwal_lines');
      if (jadwalDataStr) {
        try {
          const parsed = JSON.parse(jadwalDataStr);
          if (Array.isArray(parsed)) {
            jadwalLinesLocal = parsed;
          }
        } catch (err) {
          console.error("Error parsing silat_jadwal_lines in getNextMatchInfo:", err);
        }
      }
    }

    if (jadwalLinesLocal && Array.isArray(jadwalLinesLocal)) {
      const matchRow = jadwalLinesLocal.find((rowAny: any) => normalizePartai(rowAny?.partai) === targetNorm);
      if (matchRow) {
        const resolvedMerah = resolvePlaceholderAthlete(matchRow.atlitMerah, history);
        const resolvedBiru = resolvePlaceholderAthlete(matchRow.atlitBiru, history);
        return {
          partai: matchRow.partai || nextPartai,
          merah: {
            nama: (resolvedMerah?.nama || 'Pesilat Merah').toString().toUpperCase(),
            kontingen: (resolvedMerah?.kontingen || '-').toString().toUpperCase()
          },
          biru: {
            nama: (resolvedBiru?.nama || 'Pesilat Biru').toString().toUpperCase(),
            kontingen: (resolvedBiru?.kontingen || '-').toString().toUpperCase()
          },
          kelas: (matchRow.kelas || '-').toString().toUpperCase(),
          gender: (matchRow.gender || '-').toString().toUpperCase(),
          kategoriUsia: (matchRow.kategoriUsia || '-').toString().toUpperCase(),
          tahapPertandingan: (matchRow.tahapPertandingan || '-').toString().toUpperCase()
        };
      }
    }

    // 2. Next, fallback to silat_excel_matches
    let excelMatchesLocal: any[] | null = null;
    if (matchState.silat_excel_matches && Array.isArray(matchState.silat_excel_matches)) {
      excelMatchesLocal = matchState.silat_excel_matches;
    } else {
      const excelDataStr = localStorage.getItem('silat_excel_matches');
      if (excelDataStr) {
        try {
          const parsed = JSON.parse(excelDataStr);
          if (Array.isArray(parsed)) {
            excelMatchesLocal = parsed;
          }
        } catch (err) {
          console.error("Error parsing silat_excel_matches in getNextMatchInfo:", err);
        }
      }
    }

    if (excelMatchesLocal && Array.isArray(excelMatchesLocal)) {
      const matchRow = excelMatchesLocal.find((rowAny: any) => normalizePartai(rowAny['Partai']) === targetNorm);
      if (matchRow) {
        const resolvedMerah = resolvePlaceholderAthlete({
          nama: matchRow['Nama Pesilat Merah'],
          kontingen: matchRow['Kontingen Merah']
        }, history);
        const resolvedBiru = resolvePlaceholderAthlete({
          nama: matchRow['Nama Pesilat Biru'],
          kontingen: matchRow['Kontingen Biru']
        }, history);
        return {
          partai: matchRow['Partai'] || nextPartai,
          merah: {
            nama: (resolvedMerah?.nama || 'Pesilat Merah').toString().toUpperCase(),
            kontingen: (resolvedMerah?.kontingen || '-').toString().toUpperCase()
          },
          biru: {
            nama: (resolvedBiru?.nama || 'Pesilat Biru').toString().toUpperCase(),
            kontingen: (resolvedBiru?.kontingen || '-').toString().toUpperCase()
          },
          kelas: (matchRow['Kelas'] || '-').toString().toUpperCase(),
          gender: (matchRow['Gender'] || '-').toString().toUpperCase(),
          kategoriUsia: (matchRow['Kategori Usia'] || '-').toString().toUpperCase(),
          tahapPertandingan: (matchRow['Tahap Pertandingan'] || '-').toString().toUpperCase()
        };
      }
    }
    return null;
  };

  // 1. Manages the "BABAK SELESAI" (Round Finished) banner and immediate upcoming match banner for Babak 1 and 2
  useEffect(() => {
    if (role === 'MONITOR') {
      const isMatchEnd = matchState.showMatchEndPopUp || !!matchState.diskualifikasi;
      
      if (matchState.showRoundEndPopUp) {
        setFinishedRoundNumber(matchState.babakAktif);
        setShowMonitorRoundFinishedBanner(true);
        setShowMonitorNextMatchBanner(false);

        if (!isMatchEnd) {
          // Regular Babak (1, 2)
          const finishedTimer = setTimeout(() => {
            setShowMonitorRoundFinishedBanner(false);
            setShowMonitorNextMatchBanner(true);

            const upcomingTimer = setTimeout(() => {
              setShowMonitorNextMatchBanner(false);
            }, 5000);

            return () => clearTimeout(upcomingTimer);
          }, 3000);

          return () => {
            clearTimeout(finishedTimer);
            setShowMonitorRoundFinishedBanner(false);
            setShowMonitorNextMatchBanner(false);
          };
        } else {
          // Babak 3 / Babak Tambahan / Match End
          const finishedTimer = setTimeout(() => {
            setShowMonitorRoundFinishedBanner(false);
          }, 3000);

          return () => {
            clearTimeout(finishedTimer);
            setShowMonitorRoundFinishedBanner(false);
          };
        }
      } else {
        setShowMonitorRoundFinishedBanner(false);
        setShowMonitorNextMatchBanner(false);
      }
    }
  }, [matchState.showRoundEndPopUp, matchState.babakAktif, matchState.showMatchEndPopUp, matchState.diskualifikasi, role]);

  // 2. For match end (Babak 3/Tambahan): when winner is announced ("umumkanPemenang" is clicked), 
  // wait 5 seconds for the announcement animation, then present the "UPCOMING MATCH" banner
  useEffect(() => {
    if (role === 'MONITOR') {
      const isMatchEnd = matchState.showMatchEndPopUp || !!matchState.diskualifikasi;
      if (isMatchEnd && matchState.umumkanPemenang) {
        setShowMonitorRoundFinishedBanner(false);
        const delayTimer = setTimeout(() => {
          setShowMonitorNextMatchBanner(true);
          const showTimer = setTimeout(() => {
            setShowMonitorNextMatchBanner(false);
          }, 5000);
          return () => clearTimeout(showTimer);
        }, 5000);

        return () => {
          clearTimeout(delayTimer);
          setShowMonitorNextMatchBanner(false);
        };
      }
    }
  }, [matchState.umumkanPemenang, matchState.showMatchEndPopUp, matchState.diskualifikasi, role]);

  const getPoolLeaderboard = () => {
    const getBasePool = (stage: string) => {
      if (!stage) return '';
      const upper = stage.toUpperCase();
      const parts = upper.split('-');
      const foundPool = parts.find(p => p.includes('POOL'));
      if (foundPool) return foundPool.trim();

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

    const activePool = (matchState.tahapPertandingan || '').toUpperCase();
    const kategori = (matchState.kelas || matchState.kategoriSeni || 'TUNGGAL').toUpperCase();
    const usia = (matchState.kategoriUsia || 'REMAJA').toUpperCase();
    const gender = (matchState.gender || 'PUTRA').toUpperCase();

    const baseActivePool = getBasePool(activePool).toUpperCase();
    const targetTahapan = getTahapanOnly(activePool).toUpperCase();
    
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
            console.error("Error parsing silat_jadwal_lines in getPoolLeaderboard:", err);
          }
        }
      }

      if (jadwalLinesLocal && Array.isArray(jadwalLinesLocal)) {
        jadwalLinesLocal.forEach((row: any) => {
          const hKategori = (row.kelas || row.kategoriSeni || '').toUpperCase().trim();
          const hUsia = (row.kategoriUsia || '').toUpperCase().trim();
          const hGender = (row.gender || '').toUpperCase().trim();
          const hStage = (row.tahapPertandingan || '').toUpperCase().trim();
          const baseHStage = getBasePool(hStage).toUpperCase();
          const hTahapan = getTahapanOnly(hStage).toUpperCase();

          if (
            hKategori === kategori &&
            hUsia === usia &&
            hGender === gender &&
            hTahapan === targetTahapan &&
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
            console.error("Error parsing silat_excel_matches in getPoolLeaderboard:", err);
          }
        }
      }

      if (excelMatchesLocal && Array.isArray(excelMatchesLocal)) {
        excelMatchesLocal.forEach((row: any) => {
          const hKategori = (row['Kelas'] || '').toUpperCase().trim();
          const hUsia = (row['Kategori Usia'] || '').toUpperCase().trim();
          const hGender = (row['Gender'] || '').toUpperCase().trim();
          const hStage = (row['Tahap Pertandingan'] || '').toUpperCase().trim();
          const baseHStage = getBasePool(hStage).toUpperCase();
          const hTahapan = getTahapanOnly(hStage).toUpperCase();

          if (
            hKategori === kategori &&
            hUsia === usia &&
            hGender === gender &&
            hTahapan === targetTahapan &&
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
          score,
          kebenaran,
          hukuman,
          durasiTampil,
          stdev,
          durasiBabak,
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
    
    let currentRank = 1;
    return sortedRankedAthletes.map((ath, idx, arr) => {
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
      };
    });
  };

  // Helper calculation to find winner
  function determineWinner(state: MatchState): 'MERAH' | 'BIRU' | null {
    if (state.victoryType && state.pemenang) return state.pemenang;
    if (state.wmpWon && state.wmpPemenang) return state.wmpPemenang;
    if (state.diskualifikasi === 'MERAH') return 'BIRU';
    if (state.diskualifikasi === 'BIRU') return 'MERAH';
    
    return evaluateTieBreak(state).winner;
  }

  // Helper to convert text to Titlecase (Capitalised Letter at the Start of Each Word)
  function toTitleCase(str: string | undefined | null): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Helper to determine victory reason precisely
  function getWinningReason(state: MatchState): string {
    if (state.victoryType === 'WMP' || state.wmpWon) {
      return "Kemenangan : Wasit Menghentikan Pertandingan (WMP)";
    }
    if (state.victoryType === 'TEKNIK') {
      return "KEMENANGAN TEKNIK";
    }
    if (state.victoryType === 'MUTLAK') {
      return "KEMENANGAN MUTLAK";
    }
    if (state.diskualifikasiReason === 'MELEBIHI_TOLERANSI_WAKTU') {
      return "DISKUALIFIKASI : MELEBIHI TOLERANSI WAKTU";
    }
    if (state.diskualifikasiReason === 'MANUAL_DISKUALIFIKASI') {
      return "DISKUALIFIKASI";
    }
    if (state.diskualifikasiReason === 'MANUAL_UNDUR_DIRI' || state.victoryType === 'UNDUR_DIRI') {
      return "UNDUR DIRI";
    }
    if (state.victoryType === 'UNDUR_DIRI') {
      return "KEMENANGAN UNDUR DIRI";
    }
    if (state.diskualifikasi === 'BOTH') {
      const res = evaluateTieBreak(state);
      return `MENANG ATURAN KHUSUS DQ GANDA (${res.reason})`;
    }
    if (state.diskualifikasi) {
      return "MENANG DISKUALIFIKASI";
    }
    
    const res = evaluateTieBreak(state);
    if (res.ruleApplied === 0) {
      return "Kemenangan ANGKA";
    }
    if (res.ruleApplied === 1) {
      return `Kemenangan Nilai Kebenaran (${res.reason})`;
    }
    if (res.ruleApplied === 2) {
      return `Kemenangan Nilai Hukuman (${res.reason})`;
    }
    if (res.ruleApplied === 3) {
      return `Kemenangan Waktu Tampil (${res.reason})`;
    }
    if (res.ruleApplied === 4) {
      return `Kemenangan Standar Deviasi (${res.reason})`;
    }
    return "DRAW / SERI (UNDIAN)";
  }

  const isCurrentlyLocked = isSimulatedLocked || (isOutsideSandbox() && !isAppLicensed);

  if (isCurrentlyLocked) {
    return (
      <div id="silat-app-locked" className="min-h-screen bg-[#05000a] text-white font-sans flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Subtle decorative grid/glow rings */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.15),transparent_65%)] pointer-events-none"></div>
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-purple-900/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
        
        {/* Toast Notification for Locked Screen */}
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-55">
            <div className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 ${
              toast.type === 'success' 
                ? 'bg-green-950/90 border-green-550 text-green-400' 
                : toast.type === 'warning'
                ? 'bg-red-950/90 border-red-500 text-red-400'
                : 'bg-indigo-950/90 border-indigo-500 text-indigo-400'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, type: "spring" }}
          className="w-full max-w-lg bg-gradient-to-b from-[#120722]/95 to-[#090114]/98 border-2 border-purple-500/35 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(168,85,247,0.15)] relative z-10 space-y-6"
        >
          {/* Neon Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 animate-pulse"></div>
          
          <div className="text-center space-y-3">
            <div className="flex flex-col items-center select-none pt-2 pb-1">
              <img
                id="brand-logo-discors-license"
                src="/temadiscors.png?v=15"
                alt="DISCORS - Digital Scoring Pencak Silat"
                className="h-32 object-contain filter drop-shadow-[0_4px_12px_rgba(168,85,247,0.25)] hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="w-10 h-10 rounded-full bg-[#120722]/90 border border-purple-500/40 flex items-center justify-center -mt-5 shadow-[0_0_15px_rgba(168,85,247,0.3)] relative z-10 animate-bounce">
                <Lock className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black tracking-tight font-display text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-purple-300">
                SISTEM SKORING TERKUNCI
              </h2>
              <p className="text-[10px] md:text-xs text-purple-400 font-mono font-bold tracking-widest uppercase">
                HUBUNGI PENGEMBANG APLIKASI
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Aplikasi ini dideteksi berjalan di luar developer sandbox aman. Proteksi lisensi otomatis telah membatasi seluruh fungsionalitas sistem.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Device ID Display Box */}
            <div className="bg-[#0e041a] border border-purple-950 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-purple-400 font-semibold uppercase tracking-wider">Device ID Perangkat Anda</span>
                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase font-mono bg-purple-950/45 text-purple-300 border border-purple-500/20">
                  Hardware Signature
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-1 font-mono text-center text-sm font-extrabold text-amber-300 select-all tracking-wider">
                  {serverDeviceId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(serverDeviceId);
                    showToast('Device ID berhasil disalin ke clipboard!', 'success');
                  }}
                  className="p-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-500/20 text-purple-300 hover:text-white transition-all active:scale-95"
                  title="Salin Device ID"
                >
                  <Upload className="w-4 h-4 rotate-90" />
                </button>
              </div>
            </div>

            {/* Simulated Banner if simulation is active */}
            {isSimulatedLocked && (
              <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-center space-y-0.5">
                <span className="text-[10px] font-extrabold text-amber-200 uppercase tracking-widest block">⚠️ MODE SIMULASI UJI LISENSI</span>
                <p className="text-[9.5px] text-amber-300/80 leading-normal">
                  Fungsionalitas simulasi penguncian aktif untuk verifikasi operasional. Salin Activation Key dari Panel Sekretaris untuk membuka.
                </p>
              </div>
            )}

            {/* Error Message */}
            {activationError && (
              <div className="bg-red-950/20 border border-red-500/30 text-red-300 px-3 py-2.5 rounded-xl text-xs font-mono text-center flex items-center justify-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{activationError}</span>
              </div>
            )}

            {/* Form Input */}
            <form onSubmit={handleActivateApp} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-purple-400 font-semibold uppercase tracking-wider block">Kunci Aktivasi (Activation Key)</label>
                <input
                  type="text"
                  value={activationKeyInput}
                  onChange={(e) => setActivationKeyInput(e.target.value)}
                  className="w-full text-center bg-[#0a0315] hover:bg-[#120722] focus:bg-[#120722] border-2 border-purple-950 focus:border-purple-500 rounded-xl font-mono py-3 outline-none text-amber-400 font-extrabold tracking-widest placeholder-purple-950/45 focus:ring-1 focus:ring-purple-500 uppercase text-sm"
                  placeholder="ACT-XXXX-XXXX-XX"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('silat_simulated_lock', 'false');
                    setIsSimulatedLocked(false);
                    showToast('Simulasi dilewati.', 'info');
                  }}
                  className="py-3 px-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer"
                >
                  Batal / Lewati
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-purple-950/40 border border-purple-500/30 transition-all hover:border-purple-500/60 active:scale-[0.97] cursor-pointer"
                >
                  Aktifkan Perangkat
                </button>
              </div>
            </form>
          </div>

          <div className="border-t border-purple-500/10 pt-4 text-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              Pencak Silat Digital Scoring System v2.0
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="silat-app" className={`min-h-screen relative overflow-hidden transition-all duration-300 ${isLightMode ? 'light bg-white text-slate-900' : 'bg-[#05000a] text-white'} font-sans ${rotated ? 'origin-center rotate-90 scale-95 md:rotate-0 md:scale-100' : ''}`}>
      
      {isLightMode && (
        <style>{`
          #silat-app.light {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          
          /* Background overrides for dark containers to crisp templates */
          #silat-app.light .bg-\\[\\#05000a\\],
          #silat-app.light .bg-\\[\\#0c041d\\],
          #silat-app.light .bg-\\[\\#05000a\\]\\/92,
          #silat-app.light .bg-\\[\\#0e031a\\]\\/95,
          #silat-app.light .bg-\\[\\#18092a\\],
          #silat-app.light .bg-\\[\\#18092a\\]\\/80,
          #silat-app.light .bg-\\[\\#18092a\\]\\/90,
          #silat-app.light .bg-\\[\\#1a0c2c\\],
          #silat-app.light .bg-\\[\\#120822\\]\\/80,
          #silat-app.light .bg-\\[\\#0f041d\\]\\/90,
          #silat-app.light .bg-\\[\\#110524\\],
          #silat-app.light .bg-\\[\\#0d041c\\],
          #silat-app.light .bg-\\[\\#0d041c\\]\\/60,
          #silat-app.light .bg-\\[\\#0a0210\\]\\/95,
          #silat-app.light .bg-\\[\\#0a0210\\],
          #silat-app.light .bg-\\[\\#140624\\]\\/90,
          #silat-app.light .bg-\\[\\#160b29\\],
          #silat-app.light .bg-\\[\\#1c0d35\\],
          #silat-app.light .bg-\\[\\#090114\\],
          #silat-app.light .bg-\\[\\#120521\\],
          #silat-app.light .bg-purple-950,
          #silat-app.light .bg-purple-950\\/10,
          #silat-app.light .bg-purple-950\\/40,
          #silat-app.light .bg-purple-950\\/60,
          #silat-app.light .bg-purple-950\\/80,
          #silat-app.light .bg-purple-900\\/10,
          #silat-app.light .bg-purple-900\\/20,
          #silat-app.light .bg-purple-900\\/30,
          #silat-app.light .bg-purple-900\\/45,
          #silat-app.light .bg-purple-900\\/40,
          #silat-app.light .bg-purple-900\\/50,
          #silat-app.light .bg-purple-900\\/60,
          #silat-app.light .bg-purple-900\\/85,
          #silat-app.light .bg-purple-900\\/80,
          #silat-app.light .bg-violet-950\\/20,
          #silat-app.light .bg-violet-900\\/30,
          #silat-app.light .bg-slate-900,
          #silat-app.light .bg-slate-900\\/30,
          #silat-app.light .bg-slate-950,
          #silat-app.light .from-blue-900\\/80,
          #silat-app.light .from-red-900\\/80,
          #silat-app.light .from-brand-purple\\/40,
          #silat-app.light .to-black\\/60,
          #silat-app.light .from-blue-950\\/40,
          #silat-app.light .to-blue-900\\/10,
          #silat-app.light .from-red-950\\/40,
          #silat-app.light .to-red-900\\/10,
          #silat-app.light .bg-black\\/50,
          #silat-app.light .bg-black\\/40,
          #silat-app.light .bg-black\\/80,
          #silat-app.light .bg-blue-950\\/20,
          #silat-app.light .bg-red-950\\/20,
          #silat-app.light .bg-blue-900\\/10,
          #silat-app.light .bg-red-900\\/10,
          #silat-app.light .bg-\\[\\#1f093a\\]\\/90,
          #silat-app.light .bg-\\[\\#060b24\\],
          #silat-app.light .bg-\\[\\#060b24\\]\\/90,
          #silat-app.light .bg-\\[\\#020410\\],
          #silat-app.light .bg-\\[\\#020410\\]\\/90,
          #silat-app.light .bg-\\[\\#240606\\],
          #silat-app.light .bg-\\[\\#240606\\]\\/90,
          #silat-app.light .bg-\\[\\#100202\\],
          #silat-app.light .bg-\\[\\#100202\\]\\/90,
          #silat-app.light .bg-\\[\\#05000a\\],
          #silat-app.light .bg-\\[\\#0e041dd0\\],
          #silat-app.light .bg-\\[\\#1c0f30\\]\\/60,
          #silat-app.light .bg-\\[\\#160a2acc\\],
          #silat-app.light .bg-\\[\\|160b2d\\],
          #silat-app.light .bg-\\[\\#160b2d\\]\\/50,
          #silat-app.light .bg-\\[\\#25104d\\],
          #silat-app.light .bg-\\[\\#0b0416\\]\\/30,
          #silat-app.light .bg-\\[\\#0a0315\\],
          #silat-app.light .bg-\\[\\#120822\\],
          #silat-app.light .bg-\\[\\#0a0515\\],
          #silat-app.light .bg-\\[\\#0f111d\\],
          #silat-app.light .border-purple-950,
          #silat-app.light .border-purple-950\\/50,
          #silat-app.light .border-purple-900\\/30,
          #silat-app.light .border-purple-500\\/40,
          #silat-app.light .border-purple-500\\/30,
          #silat-app.light .border-purple-500\\/60,
          #silat-app.light .border-blue-900,
          #silat-app.light .border-blue-950,
          #silat-app.light .border-red-900,
          #silat-app.light .border-red-950,
          #silat-app.light .bg-indigo-950\\/40 {
            background-color: #ffffff !important;
            background-image: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            border-color: rgba(203, 213, 225, 0.7) !important;
          }

          /* Keep standard fullscreen screen wrapper or page wrapper as clean white background under light mode */
          #silat-app.light .bg-\\[\\#0c041d\\] {
            background-color: #ffffff !important;
            background: #ffffff !important;
          }

          /* Inactive empty penalty slots indicators */
          #silat-app.light .bg-\\[\\#0f0720\\]\\/45,
          #silat-app.light .bg-\\[\\#200707\\]\\/45 {
            background-color: #f1f5f9 !important;
            background: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
            color: #94a3b8 !important;
          }

          /* Lock/Modal Blur Background */
          #silat-app.light .bg-\\[\\#05000a\\]\\/92,
          #silat-app.light .bg-\\[\\#05000a\\]\\/95,
          #silat-app.light .bg-\\[\\#05000a\\]\\/90 {
            background-color: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(16px) !important;
          }

          /* Secondary subtle bg colors for list items metadata */
          #silat-app.light .bg-slate-900\\/20,
          #silat-app.light .bg-slate-900\\/40,
          #silat-app.light .bg-slate-800\\/40,
          #silat-app.light .bg-gray-900\\/40,
          #silat-app.light .bg-\\[\\#080210\\],
          #silat-app.light .bg-\\[\\#0c0316\\] {
            background-color: #f8fafc !important;
            background: #f8fafc !important;
          }

          /* Header subheaders */
          #silat-app.light header {
            background-color: #ffffff !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }

          /* Text color overrides to dark colors */
          #silat-app.light .text-white,
          #silat-app.light .text-slate-50,
          #silat-app.light .text-slate-100 {
            color: #0f172a !important;
          }
          #silat-app.light .text-slate-200,
          #silat-app.light .text-slate-300 {
            color: #1e293b !important;
          }
          #silat-app.light .text-slate-400,
          #silat-app.light .text-gray-400,
          #silat-app.light .text-purple-300,
          #silat-app.light .text-pink-300,
          #silat-app.light .text-violet-300 {
            color: #475569 !important;
          }
          
          /* Make Red & Blue team colors highly readable on white grids */
          #silat-app.light .text-blue-300,
          #silat-app.light .text-blue-400 {
            color: #1d4ed8 !important;
          }
          #silat-app.light .text-red-300,
          #silat-app.light .text-red-450,
          #silat-app.light .text-red-400 {
            color: #b91c1c !important;
          }

          /* Specialized labels & details */
          #silat-app.light .text-purple-200,
          #silat-app.light .text-purple-400 {
            color: #7c3aed !important;
          }
          #silat-app.light .text-amber-400 {
            color: #d97706 !important;
          }
          #silat-app.light .text-zinc-400 {
            color: #52525b !important;
          }

          /* Form / inputs styling */
          #silat-app.light input,
          #silat-app.light select,
          #silat-app.light textarea {
            background-color: #ffffff !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
          }

          #silat-app.light input::placeholder {
            color: #94a3b8 !important;
          }

          /* Border color overrides */
          #silat-app.light .border-purple-900\\/40,
          #silat-app.light .border-purple-950,
          #silat-app.light .border-purple-950\\/35,
          #silat-app.light .border-purple-950\\/70,
          #silat-app.light .border-purple-950\\/80,
          #silat-app.light .border-purple-900\\/20,
          #silat-app.light .border-purple-900\\/30,
          #silat-app.light .border-purple-500\\/10,
          #silat-app.light .border-purple-500\\/15,
          #silat-app.light .border-purple-500\\/20,
          #silat-app.light .border-purple-500\\/30,
          #silat-app.light .border-purple-500\\/40,
          #silat-app.light .border-purple-500\\/60,
          #silat-app.light .border-purple-800\\/30,
          #silat-app.light .border-violet-500\\/30,
          #silat-app.light .border-pink-500\\/30,
          #silat-app.light .border-amber-500\\/30,
          #silat-app.light .border-slate-800,
          #silat-app.light .border-slate-900 {
            border-color: rgba(203, 213, 225, 0.7) !important;
          }

          /* Keep radiant red/blue buttons intact helper styling */
          #silat-app.light .from-red-900\\/50 {
            background-image: linear-gradient(to right, rgba(239, 68, 68, 0.15), rgba(248, 250, 252, 0.95), rgba(59, 130, 246, 0.15)) !important;
          }

          /* Highlight titles */
          #silat-app.light .h2,
          #silat-app.light h2,
          #silat-app.light .h3,
          #silat-app.light h3 {
            color: #0f172a !important;
          }

          /* Buttons which are purple action items */
          #silat-app.light button.bg-purple-950\\/60 {
            background-color: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
            color: #475569 !important;
          }

          #silat-app.light button.bg-purple-950\\/40 {
            background-color: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
            color: #475569 !important;
          }

          /* Hover states for buttons in light mode */
          #silat-app.light button:hover {
            filter: brightness(0.95);
          }

          /* Dropdowns */
          #silat-app.light select {
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>") !important;
            background-position: right 0.5rem center !important;
            background-repeat: no-repeat !important;
            background-size: 1.2em !important;
            padding-right: 2rem !important;
            appearance: none !important;
          }
        `}</style>
      )}

      {/* Invisible Persistent DOM preloader/decoder container to keep GPU textures alive and prevent switching delay */}
      <div className="absolute top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none select-none opacity-0 z-0" aria-hidden="true" style={{ width: 0, height: 0, overflow: 'hidden', position: 'absolute' }}>
        <img src="./sekretaris.png" decoding="sync" loading="eager" alt="preload" />
        <img src="./dewan.png" decoding="sync" loading="eager" alt="preload" />
        <img src="./juri.png" decoding="sync" loading="eager" alt="preload" />
        <img src="./monitor.png" decoding="sync" loading="eager" alt="preload" />
        <img src="./nodiscorstgr.png" decoding="sync" loading="eager" alt="preload" />
        <img src="./temadiscors.png" decoding="sync" loading="eager" alt="preload" />
        <img src="./pesilat1.png" decoding="sync" loading="eager" alt="preload" />
        <img src="./pesilat2.png" decoding="sync" loading="eager" alt="preload" />
        <img src="./logodiscorsgrid.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/binaan1.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/binaan2.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/teguran1.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/teguran2.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/peringatan1.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/peringatan2.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/punch.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/kick.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/pesilatkiri.svg" decoding="sync" loading="eager" alt="preload" />
        <img src="./assets/pesilatkanan.svg" decoding="sync" loading="eager" alt="preload" />
      </div>
      
      {/* Exquisite Martial Arts Background Accent Elements */}
      <div className={`absolute inset-0 z-0 transition-colors duration-300 ${isLightMode ? 'bg-white' : 'bg-[#05000a]'}`} />
      
      {/* Background Vector Art Accent */}
      <div className={`absolute inset-0 pointer-events-none flex justify-center items-center z-0 transition-opacity duration-300 ${isLightMode ? 'opacity-5' : 'opacity-[0.08]'}`}>
        <img 
          src="./temadiscors.png" 
          alt="Watermark Premium"
          decoding="sync"
          loading="eager"
          className="w-[900px] h-[900px] md:w-[1200px] md:h-[1200px] object-contain filter drop-shadow-[0_0_50px_rgba(168,85,247,0.2)] transform-gpu"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Embedded Silat Warriors Silhouettes for premium thematic design */}
      <div className={`absolute bottom-10 left-6 select-none pointer-events-none z-0 transition-all duration-300 ${isLightMode ? 'opacity-[0.1]' : 'opacity-[0.05]'}`}>
        <img
          src="./pesilat2.png"
          alt="Pesilat Kiri Bawah"
          decoding="sync"
          loading="eager"
          className="w-64 h-64 object-contain filter drop-shadow-[0_0_20px_rgba(168,85,247,0.15)] transform-gpu"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className={`absolute top-10 right-10 select-none pointer-events-none z-0 transition-all duration-300 ${isLightMode ? 'opacity-[0.1]' : 'opacity-[0.05]'}`}>
        <img
          src="./pesilat1.png"
          alt="Pesilat Kanan Atas"
          decoding="sync"
          loading="eager"
          className="w-72 h-72 object-contain filter drop-shadow-[0_0_20px_rgba(168,85,247,0.15)] transform-gpu"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Main Core Content Controller */}
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* ROLE switcher top subheader for easy interactive usage */}
        <AnimatePresence>
          {role !== 'LANDING' && !isFullscreen && (
            <motion.header
              key="app-header"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="px-4 py-3 bg-[#0f041d]/90 border-b border-purple-950/70 flex items-center justify-between landscape:py-1.5 landscape:px-3 overflow-hidden shrink-0"
            >
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => selectRoleAndTriggerAudio('LANDING')}
                  className="p-1 px-3 bg-purple-950/40 hover:bg-purple-900/40 rounded-lg text-xs flex items-center gap-1.5 transition-all text-purple-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  MENU
                </button>
                <div className="h-4 w-[1px] bg-purple-900/50" />
                <div className="text-xs font-semibold tracking-wider text-purple-300 uppercase font-mono">
                  {role === 'JURI_PANEL' ? `JURI ${selectedJuriId}` : role === 'JURI_SELECT' ? 'PEMILIHAN JURI' : role}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400 font-mono hidden md:inline">{matchState.eventName}</span>
                
                {/* Elegant Light/Dark Mode toggle inside sub-pages header */}
                <button
                  type="button"
                  onClick={() => {
                    triggerClick();
                    setIsLightMode(!isLightMode);
                  }}
                  className={`p-1.5 rounded-lg transition-colors duration-300 cursor-pointer ${isLightMode ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'}`}
                  title={isLightMode ? "Ganti ke Mode Gelap" : "Ganti ke Mode Terang"}
                >
                  {isLightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Elegant Fullscreen Button inside sub-pages purple header */}
                <button 
                  onClick={() => {
                    triggerClick();
                    toggleFullscreen();
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isFullscreen 
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                      : isLightMode 
                        ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
                        : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                  }`}
                  title={isFullscreen ? "Layar Biasa" : "Layar Penuh"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {role !== 'JURI_PANEL' && (
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)} 
                    className={`p-1.5 rounded-lg transition-colors ${soundEnabled ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-900 text-slate-500'}`}
                    title="Aktifkan Suara"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* LANDING PAGE VIEW */}
          {role === 'LANDING' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className={`flex-1 flex flex-col justify-center items-center px-4 md:px-8 w-full relative transition-all duration-300 ${
                isFullscreen 
                  ? 'h-screen max-h-screen py-3 sm:py-4 md:py-6 lg:py-8 xl:py-12 overflow-hidden min-h-0 max-w-7xl xl:max-w-[1450px] mx-auto justify-around' 
                  : 'py-8 max-w-5xl mx-auto'
              }`}
            >
              {/* Elegant Modern Control Group (Theme Toggle & Fullscreen Toggle) - Top Right Corner */}
              <div className="absolute top-0 right-4 lg:right-0 z-50 flex items-center gap-3 bg-transparent p-1.5 rounded-xl">
                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerClick();
                    toggleFullscreen();
                  }}
                  className={`p-1.5 px-3 rounded-lg border text-[10px] font-mono tracking-widest font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 duration-300 ${
                    isLightMode
                      ? 'bg-purple-100/80 border-purple-300/40 hover:bg-purple-200 text-purple-700'
                      : 'bg-[#18092a]/80 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-white'
                  }`}
                  title={isFullscreen ? 'Layar Biasa' : 'Layar Penuh'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'LAYAR BIASA' : 'LAYAR PENUH'}</span>
                </button>

                <div className="h-4 w-[1px] bg-purple-500/20" />

                {/* Theme Switcher Toggle */}
                <span className={`text-[10px] font-extrabold tracking-widest uppercase font-mono transition-colors duration-300 ${isLightMode ? 'text-slate-600' : 'text-purple-300'}`}>
                  {isLightMode ? 'TERANG' : 'GELAP'}
                </span>
                <button
                  type="button"
                  id="theme-toggle-btn"
                  onClick={() => {
                    triggerClick();
                    setIsLightMode(!isLightMode);
                  }}
                  className={`relative w-14 h-7 rounded-full p-0.5 transition-all duration-300 cursor-pointer focus:outline-none flex items-center ${
                    isLightMode 
                      ? 'bg-purple-600 justify-end shadow-[0_0_12px_rgba(147,51,234,0.4)]' 
                      : 'bg-[#18092a]/80 justify-start border border-purple-500/30'
                  }`}
                  aria-label="Toggle Theme Mode"
                >
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-5.5 h-5.5 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      isLightMode ? 'bg-white text-purple-600' : 'bg-purple-500 text-white'
                    }`}
                  >
                    {isLightMode ? (
                      <Sun className="w-3.5 h-3.5" />
                    ) : (
                      <Moon className="w-3.5 h-3.5" />
                    )}
                  </motion.div>
                </button>
              </div>

              <div className={`text-center space-y-0 transition-all duration-300 ${isFullscreen ? 'mb-1 mt-1 md:mb-3 xl:mb-5' : 'mb-10 mt-6'}`}>
                <div className={`flex justify-center select-none pt-2 pb-0 transition-all duration-300 ${
                  isFullscreen ? '-mb-1 sm:-mb-2 md:-mb-3 xl:-mb-4' : '-mb-4 sm:-mb-6 md:-mb-8'
                }`}>
                  <img
                    id="brand-logo-discors-landing"
                    src="./nodiscorstgr.png"
                    alt="DISCORS - Digital Scoring Pencak Silat"
                    decoding="sync"
                    loading="eager"
                    className={`object-contain filter drop-shadow-[0_4px_12px_rgba(168,85,247,0.25)] hover:scale-105 transition-all duration-300 transform-gpu ${
                      isFullscreen ? 'h-24 sm:h-32 md:h-40 lg:h-48 xl:h-64 2xl:h-72' : 'h-44 sm:h-56 md:h-64 lg:h-72'
                    }`}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className={`font-black tracking-tight font-sans transition-all duration-300 ${
                  isFullscreen ? 'text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl' : 'text-4xl md:text-6xl'
                } ${
                  isLightMode ? 'text-slate-900' : 'text-white'
                }`}>
                  PENCAK <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-purple-400 to-violet-400">SILAT</span>
                </h1>
                <p className={`mx-auto font-light leading-relaxed transition-all duration-300 ${
                  isFullscreen ? 'text-xs sm:text-sm pt-1 max-w-2xl xl:max-w-4xl xl:text-base 2xl:text-lg 2xl:pt-2' : 'text-sm md:text-base pt-2 max-w-xl'
                } ${
                  isLightMode ? 'text-slate-650' : 'text-gray-400'
                }`}>
                  <span className="block font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300 uppercase">
                    PLATFORM DIGITAL SKORING PENCAK SILAT KATEGORI JURUS
                  </span>
                  <span className="block mt-1 text-[10px] sm:text-xs font-medium tracking-wider uppercase opacity-80">
                    DENGAN SINKRONISASI INSTAN MULTI LAYAR SECARA ONLINE MAUPUN OFFLINE
                  </span>
                </p>
              </div>

              {/* Premium Role Choice Selection Grids */}
              <div className={`grid w-full px-2 transition-all duration-300 ${
                isFullscreen 
                  ? 'grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 lg:gap-6 xl:gap-8' 
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
              }`}>
                             {/* SEKRETARIS */}
                <button 
                  onClick={() => selectRoleAndTriggerAudio('SEKRETARIS')}
                  className={`group relative flex flex-col items-center justify-center transition-all duration-300 active:scale-95 text-center overflow-hidden ${
                    isFullscreen 
                      ? 'h-full min-h-[180px] sm:min-h-[220px] p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 rounded-2xl border' 
                      : 'aspect-square w-full max-w-[240px] sm:max-w-[285px] mx-auto p-4 sm:p-6 rounded-2xl border'
                  } ${
                    isLightMode 
                      ? 'bg-purple-100/40 backdrop-blur-md border-purple-300/40 hover:border-pink-500/50 hover:bg-purple-200/40 shadow-md hover:shadow-lg' 
                      : 'bg-[#180529]/65 backdrop-blur-md border-purple-500/30 hover:border-pink-500/70 shadow-xl hover:bg-[#280c44]/75'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="transition-all duration-300 group-hover:scale-105 flex flex-col items-center justify-center relative transform-gpu">
                    {/* Glowing Purple Neon Light Effect */}
                    <div className="absolute w-36 h-36 bg-purple-600/30 rounded-full blur-2xl group-hover:bg-purple-500/50 group-hover:scale-125 transition-all duration-300 pointer-events-none" />
                    <img 
                      src="./sekretaris.png" 
                      alt="Sekretaris Icon" 
                      decoding="sync"
                      loading="eager"
                      className={`object-contain transition-all relative z-10 transform-gpu group-hover:scale-110 duration-300 ${
                        isFullscreen ? "w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 lg:w-72 lg:h-72 xl:w-80 xl:h-80" : "w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-76 lg:h-76"
                      }`} 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </button>

                {/* DEWAN */}
                <button 
                  onClick={() => selectRoleAndTriggerAudio('DEWAN')}
                  className={`group relative flex flex-col items-center justify-center transition-all duration-300 active:scale-95 text-center overflow-hidden ${
                    isFullscreen 
                      ? 'h-full min-h-[180px] sm:min-h-[220px] p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 rounded-2xl border' 
                      : 'aspect-square w-full max-w-[240px] sm:max-w-[285px] mx-auto p-4 sm:p-6 rounded-2xl border'
                  } ${
                    isLightMode 
                      ? 'bg-purple-100/40 backdrop-blur-md border-purple-300/40 hover:border-purple-500/50 hover:bg-purple-200/40 shadow-md hover:shadow-lg' 
                      : 'bg-[#180529]/65 backdrop-blur-md border-purple-500/30 hover:border-purple-500/70 shadow-xl hover:bg-[#280c44]/75'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="transition-all duration-300 group-hover:scale-105 flex flex-col items-center justify-center relative transform-gpu">
                    {/* Glowing Purple Neon Light Effect */}
                    <div className="absolute w-36 h-36 bg-purple-600/30 rounded-full blur-2xl group-hover:bg-purple-500/50 group-hover:scale-125 transition-all duration-300 pointer-events-none" />
                    <img 
                      src="./dewan.png" 
                      alt="Dewan Icon" 
                      decoding="sync"
                      loading="eager"
                      className={`object-contain transition-all relative z-10 transform-gpu group-hover:scale-110 duration-300 ${
                        isFullscreen ? "w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 lg:w-72 lg:h-72 xl:w-80 xl:h-80" : "w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-76 lg:h-76"
                      }`} 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </button>

                {/* JURI */}
                <button 
                  onClick={() => selectRoleAndTriggerAudio('JURI_SELECT')}
                  className={`group relative flex flex-col items-center justify-center transition-all duration-300 active:scale-95 text-center overflow-hidden ${
                    isFullscreen 
                      ? 'h-full min-h-[180px] sm:min-h-[220px] p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 rounded-2xl border' 
                      : 'aspect-square w-full max-w-[240px] sm:max-w-[285px] mx-auto p-4 sm:p-6 rounded-2xl border'
                  } ${
                    isLightMode 
                      ? 'bg-purple-100/40 backdrop-blur-md border-purple-300/40 hover:border-violet-500/50 hover:bg-purple-200/40 shadow-md hover:shadow-lg' 
                      : 'bg-[#180529]/65 backdrop-blur-md border-purple-500/30 hover:border-violet-500/70 shadow-xl hover:bg-[#280c44]/75'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="transition-all duration-300 group-hover:scale-105 flex flex-col items-center justify-center relative transform-gpu">
                    {/* Glowing Purple Neon Light Effect */}
                    <div className="absolute w-36 h-36 bg-purple-600/30 rounded-full blur-2xl group-hover:bg-purple-500/50 group-hover:scale-125 transition-all duration-300 pointer-events-none" />
                    <img 
                      src="./juri.png" 
                      alt="Juri Icon" 
                      decoding="sync"
                      loading="eager"
                      className={`object-contain transition-all relative z-10 transform-gpu group-hover:scale-110 duration-300 ${
                        isFullscreen ? "w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 lg:w-72 lg:h-72 xl:w-80 xl:h-80" : "w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-76 lg:h-76"
                      }`} 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </button>

                {/* MONITOR */}
                <button 
                  onClick={() => selectRoleAndTriggerAudio('MONITOR')}
                  className={`group relative flex flex-col items-center justify-center transition-all duration-300 active:scale-95 text-center overflow-hidden ${
                    isFullscreen 
                      ? 'h-full min-h-[180px] sm:min-h-[220px] p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 rounded-2xl border' 
                      : 'aspect-square w-full max-w-[240px] sm:max-w-[285px] mx-auto p-4 sm:p-6 rounded-2xl border'
                  } ${
                    isLightMode 
                      ? 'bg-purple-100/40 backdrop-blur-md border-purple-300/40 hover:border-amber-500/50 hover:bg-purple-200/40 shadow-md hover:shadow-lg' 
                      : 'bg-[#180529]/65 backdrop-blur-md border-purple-500/30 hover:border-amber-500/70 shadow-xl hover:bg-[#280c44]/75'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="transition-all duration-300 group-hover:scale-105 flex flex-col items-center justify-center relative transform-gpu">
                    {/* Glowing Purple Neon Light Effect */}
                    <div className="absolute w-36 h-36 bg-purple-600/30 rounded-full blur-2xl group-hover:bg-purple-500/50 group-hover:scale-125 transition-all duration-300 pointer-events-none" />
                    <img 
                      src="./monitor.png" 
                      alt="Monitor Icon" 
                      decoding="sync"
                      loading="eager"
                      className={`object-contain transition-all relative z-10 transform-gpu group-hover:scale-110 duration-300 ${
                        isFullscreen ? "w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 lg:w-72 lg:h-72 xl:w-80 xl:h-80" : "w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-76 lg:h-76"
                      }`} 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </button>

              </div>

              {/* Quick tips about offline multi tab synchronization */}
              <div className={`text-center border transition-all duration-300 ${
                isFullscreen 
                  ? 'max-w-2xl xl:max-w-4xl mt-4 sm:mt-5 p-3 sm:p-4 xl:p-6 rounded-xl xl:rounded-2xl space-y-1 xl:space-y-2' 
                  : 'max-w-2xl mt-12 p-5 rounded-xl space-y-2'
              } ${
                isLightMode 
                  ? 'bg-purple-100/50 border-purple-200/60 text-slate-800' 
                  : 'bg-[#120822]/80 border border-purple-950/80 text-white'
              }`}>
                <h4 className={`font-semibold uppercase tracking-wider transition-colors ${
                  isFullscreen ? 'text-xs tracking-wider xl:text-sm' : 'text-xs text-purple-300'
                } ${
                  isLightMode ? 'text-purple-700' : 'text-purple-300'
                }`}>💡 Tips Penyiapan Multi-Layar offline</h4>
                <p className={`transition-colors ${
                  isFullscreen ? 'text-xs leading-relaxed max-w-xl mx-auto xl:max-w-3xl xl:text-sm xl:leading-relaxed' : 'text-xs leading-relaxed'
                } ${
                  isLightMode ? 'text-slate-650' : 'text-gray-400'
                }`}>
                  Aplikasi ini mendukung sinkronisasi data instan tanpa internet! Buka aplikasi ini di <strong>beberapa tab browser baru (atau layar monitor kedua)</strong> di komputer yang sama. Atur satu tab menjadi <strong>Sekretaris</strong> untuk mengontrol, tab lainnya menjadi <strong>Sekretaris</strong> untuk mengontrol, tab lainnya menjadi <strong>Juri 1, 2, 3</strong>, <strong>Dewan</strong>, dan <strong>Monitor</strong>. Data akan tersinkron otomatis dalam milidetik!
                </p>
              </div>

              {/* Developed by : IRFAN, S.Pd. */}
              <footer className={`text-center text-slate-500 text-xs font-medium tracking-wider font-mono transition-all duration-300 ${
                isFullscreen ? 'mt-2 mb-1 text-[10px] xl:text-xs' : 'mt-12'
              }`}>
                Developed by : <span className={`font-bold transition-all duration-300 ${isLightMode ? 'text-purple-600' : 'text-purple-400'}`}>IRFAN, S.Pd.</span>
              </footer>
            </motion.div>
          )}

          {/* DEWAN SCREEN VIEW */}
          {role === 'DEWAN' && (
            <DewanPanel 
              matchState={matchState}
              updateMatchState={updateMatchState}
              onBackToLanding={() => selectRoleAndTriggerAudio('LANDING')}
            />
          )}

        {/* JURI SELECTING SCREEN VIEW */}
        {role === 'JURI_SELECT' && (
          <motion.div
            key="juri_select"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`flex-1 flex flex-col justify-center items-center px-4 py-8 mx-auto w-full text-center ${(matchState.jumlahJuri || 3) > 3 ? 'max-w-4xl' : 'max-w-lg'}`}
          >
            <h2 className="text-3xl font-black mb-1.5 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">PILIH IDENTITAS JURI</h2>
            <p className="text-gray-400 text-xs mb-8">Pilih salah satu nomor Juri untuk bertugas.</p>
            
            <div className={`grid gap-4 w-full ${(matchState.jumlahJuri || 3) > 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {Array.from({ length: matchState.jumlahJuri || 3 }, (_, i) => i + 1).map((num) => {
                const isActive = matchState.activeJuriIds?.includes(num);
                return (
                  <button
                    key={num}
                    disabled={isActive}
                    onClick={() => {
                      setSelectedJuriId(num);
                      const currentActive = matchState.activeJuriIds || [];
                      if (!currentActive.includes(num)) {
                        const updatedActive = [...currentActive, num];
                        updateMatchState({
                          ...matchState,
                          activeJuriIds: updatedActive
                        });
                      }
                      selectRoleAndTriggerAudio('JURI_PANEL');
                    }}
                    className={`group relative flex items-center justify-between p-5 rounded-xl font-bold transition-all shadow-lg select-none ${
                      isActive 
                        ? 'bg-slate-950/40 border-slate-900 text-slate-500 cursor-not-allowed opacity-55' 
                        : 'bg-[#140a24]/90 hover:bg-[#1d0d35]/95 border-purple-900/40 hover:border-purple-500/80 text-white active:scale-95 cursor-pointer'
                    } border`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${isActive ? 'bg-slate-900 text-slate-600' : 'bg-purple-950 text-purple-400'}`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="text-left flex flex-col justify-center">
                        <span className={`text-lg leading-tight uppercase ${isActive ? 'text-slate-500 line-through font-medium' : 'text-white'}`}>
                          PETUGAS JURI {num}
                        </span>
                        {isActive && (
                          <span className="text-[9px] text-red-500 font-mono font-bold uppercase tracking-wider animate-pulse pt-0.5">
                            🔴 SEDANG BERTUGAS / TERKUNCI
                          </span>
                        )}
                      </div>
                    </div>
                    {!isActive && (
                      <span className="text-xs text-purple-400 font-mono group-hover:translate-x-1 transition-transform">Masuk Panel &rarr;</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                triggerClick();
                updateMatchState({
                  ...matchState,
                  activeJuriIds: []
                });
                showToast("Berhasil mereset seluruh kunci Juri!", "success");
              }}
              className="mt-6 px-4 py-2.5 text-xs bg-red-950/30 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-xl transition-all font-bold cursor-pointer active:scale-95 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              RESET KUNCI SEMUA JURI
            </button>
          </motion.div>
        )}

        {/* JURI SCORING PANEL SCREEN VIEW */}
        {role === 'JURI_PANEL' && (
          <JuriPanel
            matchState={matchState}
            registerJuriPress={(juriId, action, corner) => {
              setSelectedJuriId(juriId);
              registerJuriClick(corner, action);
            }}
            selectJuriVerificationVote={(juriId, vote) => {
              const nextVotes = { ...matchState.verifikasi.juriVotes, [juriId]: vote };
              updateMatchState({
                ...matchState,
                verifikasi: { ...matchState.verifikasi, juriVotes: nextVotes }
              });
            }}
            onBackToLanding={() => selectRoleAndTriggerAudio('LANDING')}
            updateMatchState={updateMatchState}
            presetJuriId={selectedJuriId as 1 | 2 | 3}
            onDeleteRawClick={(corner) => {
              deleteLastJuriClick(corner);
            }}
          />
        )}

        {role === 'JURI_PANEL_REMOVED' && (
          <motion.div
            key="juri_panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`flex flex-col max-w-7xl mx-auto w-full justify-between relative landscape:overflow-hidden ${
              isFullscreen 
                ? 'h-screen max-h-screen p-1.5 sm:p-2 md:p-4 overflow-hidden' 
                : 'flex-1 p-4 landscape:p-2 landscape:h-[calc(100vh-48px)] landscape:max-h-[calc(100vh-48px)]'
            }`}
          >
            {/* LOCK COVER SCREEN */}
            {matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI' && (
              <div className="absolute inset-0 bg-[#05000a]/92 backdrop-blur-md z-45 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-purple-500/10">
                <div className="w-16 h-16 bg-purple-950/40 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20 shadow-lg">
                  <Lock className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase font-display">PANEL JURI TERKUNCI</h3>
                <p className="text-sm text-slate-300 mt-2 max-w-md font-sans">
                  Pertandingan belum dimulai atau telah dibatalkan. Silakan minta <strong className="text-purple-400">Sekretaris</strong> untuk mengaktifkan status <strong className="text-amber-400">"Mulai Pertandingan"</strong> agar juri dapat memberikan penilaian.
                </p>
              </div>
            )}

            
            {/* Header / Athlete Details Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 landscape:grid-cols-5 gap-2 md:gap-3 bg-[#110524] p-2 md:p-3 rounded-xl border border-purple-900/30 landscape:py-1 items-center">
              <div className="flex flex-col justify-center col-span-2">
                <span className="text-[10px] text-purple-400 font-semibold tracking-wider font-mono">PANEL PENILAIAN AKTIF: JURI {selectedJuriId}</span>
                <span className="text-sm font-bold text-white uppercase landscape:hidden md:landscape:block leading-tight">{matchState.eventName}</span>
              </div>
              
              <div className="flex flex-col justify-center items-center py-1 bg-purple-950/40 rounded-lg border border-purple-900/20 landscape:py-0">
                <span className="text-[10px] text-purple-400 font-mono font-semibold landscape:text-[8px]">ROUND</span>
                <span className="text-lg font-black text-white landscape:text-sm">BABAK {matchState.babakAktif}</span>
              </div>

              <div className="flex flex-col justify-center items-end landscape:items-center">
                <span className="text-[10px] text-purple-400 font-mono font-semibold landscape:hidden md:landscape:block">SISA WAKTU</span>
                <span className="text-lg font-bold font-mono text-amber-400 landscape:text-sm">{Math.floor(matchState.sisaWaktu / 60).toString().padStart(2, '0')}:{(matchState.sisaWaktu % 60).toString().padStart(2, '0')}</span>
              </div>

              <button 
                onClick={toggleFullscreen}
                className="col-span-2 md:col-span-1 landscape:col-span-1 py-1.5 md:py-2 px-3 rounded-lg border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 font-mono uppercase text-[9px] font-extrabold tracking-widest text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'LAYAR BIASA' : 'LAYAR PENUH'}</span>
              </button>
            </div>

            {/* Athlete Data Bar / Detail Informasi Pertandingan */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 justify-center items-center py-1.5 px-3 bg-[#0d041c]/60 rounded-lg border border-purple-900/20 text-[10px] font-mono text-purple-300">
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Partai:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.partai || '-'}</span>
              </div>
              <span className="text-purple-950">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Tahapan:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.tahapPertandingan || '-'}</span>
              </div>
              <span className="text-purple-950">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Kategori:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.kelas || '-'}</span>
              </div>
              <span className="text-purple-950">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Putra/Putri:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.gender || '-'}</span>
              </div>
              <span className="text-purple-950">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Usia:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.kategoriUsia || '-'}</span>
              </div>
            </div>

            {/* Main Interactive Scoring Arena: Big Blue vs. Big Red Buttons */}
            <div className="flex-1 grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-3 md:gap-8 my-2 md:my-4 relative min-h-0">
              
              {/* Blue Angle (Left) */}
              <div className="flex flex-col justify-between p-3 md:p-6 bg-gradient-to-b from-blue-950/40 to-blue-900/10 rounded-2xl border border-blue-900/30 landscape:p-2 min-h-0">
                <div className="flex justify-between items-center border-b border-blue-900/20 pb-2 mb-2 landscape:pb-0.5 landscape:mb-1">
                  <div>
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded mr-2 font-mono">BIRU</span>
                    <span className="text-sm font-bold text-white landscape:text-xs leading-tight">{matchState?.atlitBiru?.nama || 'ATLIT BIRU'}</span>
                  </div>
                  <span className="text-xs text-slate-400 landscape:hidden sm:landscape:inline">{matchState?.atlitBiru?.kontingen || ''}</span>
                </div>

                {/* Big Giant Touch/Click Targets for Punch and Kick replaced by logical placeholder */}
                <div className="flex flex-col gap-2 md:gap-4 flex-1 justify-center my-1 md:my-2 w-full min-h-0">
                  <div className="flex-1 rounded-xl border border-dashed border-blue-500/30 flex flex-col items-center justify-center p-4 bg-blue-950/10 text-center select-none">
                    <span className="text-xs sm:text-sm font-black text-blue-400 uppercase tracking-widest leading-normal">LOGIKA BARU</span>
                    <span className="text-[9px] text-blue-300 font-semibold tracking-wide uppercase mt-1 opacity-60">Menunggu Konfigurasi</span>
                  </div>
                </div>

                {/* Score Log Entered by THIS Juri */}
                <div className="mt-2 md:mt-4 p-1.5 md:p-3 bg-slate-950/50 rounded-lg flex justify-end items-center landscape:mt-0.5 landscape:py-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        triggerClick();
                        setDeleteConfirmSudut('BIRU');
                      }}
                      disabled={(matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING'}
                      className="px-2 py-1 bg-red-650 hover:bg-red-700 active:bg-red-800 disabled:opacity-45 disabled:cursor-not-allowed text-white font-mono font-bold text-[9px] rounded uppercase transition-all cursor-pointer"
                      title="Backspace / Hapus Nilai Biru"
                    >
                      HAPUS (BACKSPACE)
                    </button>
                    <span className="text-[11px] md:text-sm font-bold font-mono text-blue-300">
                      TOTAL: {matchState.rawScores.filter(r => r.juriId === selectedJuriId && r.sudut === 'BIRU' && r.babak === matchState.babakAktif).length} HITS
                    </span>
                  </div>
                </div>
              </div>

              {/* Red Angle (Right) */}
              <div className="flex flex-col justify-between p-3 md:p-6 bg-gradient-to-b from-red-950/40 to-red-900/10 rounded-2xl border border-red-900/30 landscape:p-2 min-h-0">
                <div className="flex justify-between items-center border-b border-red-900/20 pb-2 mb-2 landscape:pb-0.5 landscape:mb-1">
                  <div>
                    <span className="text-[10px] bg-red-650 text-white font-bold px-1.5 py-0.5 rounded mr-2 font-mono">MERAH</span>
                    <span className="text-sm font-bold text-white landscape:text-xs leading-tight">{matchState?.atlitMerah?.nama || 'ATLIT MERAH'}</span>
                  </div>
                  <span className="text-xs text-slate-400 landscape:hidden sm:landscape:inline">{matchState?.atlitMerah?.kontingen || ''}</span>
                </div>

                {/* Big Giant Touch/Click Targets for Punch and Kick replaced by logical placeholder */}
                <div className="flex flex-col gap-2 md:gap-4 flex-1 justify-center my-1 md:my-2 w-full min-h-0">
                  <div className="flex-1 rounded-xl border border-dashed border-red-500/30 flex flex-col items-center justify-center p-4 bg-red-950/10 text-center select-none">
                    <span className="text-xs sm:text-sm font-black text-red-400 uppercase tracking-widest leading-normal">LOGIKA BARU</span>
                    <span className="text-[9px] text-red-300 font-semibold tracking-wide uppercase mt-1 opacity-60">Menunggu Konfigurasi</span>
                  </div>
                </div>

                {/* Score Log Entered by THIS Juri */}
                <div className="mt-2 md:mt-4 p-1.5 md:p-3 bg-slate-950/50 rounded-lg flex justify-between items-center landscape:mt-0.5 landscape:py-1">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] md:text-sm font-bold font-mono text-red-300">
                      TOTAL: {matchState.rawScores.filter(r => r.juriId === selectedJuriId && r.sudut === 'MERAH' && r.babak === matchState.babakAktif).length} HITS
                    </span>
                    <button
                      onClick={() => {
                        triggerClick();
                        setDeleteConfirmSudut('MERAH');
                      }}
                      disabled={(matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING'}
                      className="px-2 py-1 bg-red-650 hover:bg-red-700 active:bg-red-800 disabled:opacity-45 disabled:cursor-not-allowed text-white font-mono font-bold text-[9px] rounded uppercase transition-all cursor-pointer"
                      title="Backspace / Hapus Nilai Merah"
                    >
                      HAPUS (BACKSPACE)
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* VERIFIKASI POP UP FOR JURIES */}
            {matchState.verifikasi.status === 'PENDING' && !matchState.verifikasi.juriVotes[selectedJuriId] && (
              <div className="absolute inset-0 bg-[#06010fa5] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50">
                <div className="max-w-md w-full bg-[#150a26] border border-purple-500 p-8 rounded-2xl space-y-6 text-center shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-purple-900/40 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-purple-500/30">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">VERIFIKASI DEWAN</h3>
                    <p className="text-xs text-purple-300 mt-1 uppercase font-semibold font-mono">TIPE: {matchState.verifikasi.jenis}</p>
                    <p className="text-xs text-slate-400 mt-2">Dewan Penilai meminta keputusan juri terkait keabsahan aksi baru-baru ini. Berikan keputusan Anda:</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                    <button
                      onClick={() => {
                        triggerClick();
                        const nextVotes = { ...matchState.verifikasi.juriVotes, [selectedJuriId]: 'BIRU' };
                        updateMatchState({
                          ...matchState,
                          verifikasi: { ...matchState.verifikasi, juriVotes: nextVotes }
                        });
                      }}
                      className="px-4 py-3 bg-blue-700 hover:bg-blue-600 rounded-xl font-bold text-white text-sm tracking-wide transition-all shadow-md active:scale-95"
                    >
                      BIRU
                    </button>
                    <button
                      onClick={() => {
                        triggerClick();
                        const nextVotes = { ...matchState.verifikasi.juriVotes, [selectedJuriId]: 'TIDAK_SAH' };
                        updateMatchState({
                          ...matchState,
                          verifikasi: { ...matchState.verifikasi, juriVotes: nextVotes }
                        });
                      }}
                      className="px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-white text-sm tracking-wide transition-all shadow-md active:scale-95"
                    >
                      TIDAK SAH
                    </button>
                    <button
                      onClick={() => {
                        triggerClick();
                        const nextVotes = { ...matchState.verifikasi.juriVotes, [selectedJuriId]: 'MERAH' };
                        updateMatchState({
                          ...matchState,
                          verifikasi: { ...matchState.verifikasi, juriVotes: nextVotes }
                        });
                      }}
                      className="px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white text-sm tracking-wide transition-all shadow-md active:scale-95"
                    >
                      MERAH
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting for other juries to reply screen overlay */}
            {matchState.verifikasi.status === 'PENDING' && matchState.verifikasi.juriVotes[selectedJuriId] && (
              <div className="absolute inset-0 bg-[#07010e95] backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 z-40">
                <div className="bg-[#120722] border border-purple-950 p-6 rounded-xl text-center max-w-sm space-y-2">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
                  <h4 className="text-base font-bold text-white">Jawaban Juri {selectedJuriId} Terkirim!</h4>
                  <p className="text-xs text-slate-400">Menunggu Dewan memproses keputusan akhir consensus dari juri-juri lainnya.</p>
                </div>
              </div>
            )}

            {/* ROUND END NOTIFICATION POPUP */}
            <AnimatePresence>
              {matchState.showRoundEndPopUp && matchState.juriTerkunci && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#00000ed2] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 15 }}
                    transition={{ type: "spring", damping: 25, stiffness: 180 }}
                    className="max-w-md w-full bg-[#110524] border border-red-500/40 p-8 rounded-2xl space-y-4"
                  >
                    <div className="w-16 h-16 bg-red-950 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 select-none">
                      <AlertOctagon className="w-8 h-8 font-extrabold animate-bounce" />
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">ROUND {matchState.babakAktif} SELESAI</h3>
                    <p className="text-slate-300 text-xs leading-relaxed">Waktu babak telah habis. Silakan tunggu sekretaris melanjutkan ke babak selanjutnya agar panel nilai dapat dibuka kembali.</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MATCH END NOTIFICATION POPUP */}
            <AnimatePresence>
              {matchState.showMatchEndPopUp && matchState.umumkanPemenang && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ef6] backdrop-blur-lg rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-md w-full bg-[#130626]/90 border border-purple-500 p-8 rounded-2xl space-y-4"
                  >
                    <Award className="w-16 h-16 text-yellow-500 mx-auto animate-bounce" />
                    <h3 className="text-3xl font-black text-white tracking-tight">PERTANDINGAN SELESAI</h3>
                    <div className="p-3 bg-purple-950/40 rounded-lg text-sm border border-purple-900/20 text-purple-300 font-bold uppercase">
                      PEMENANG: SUDUT {determineWinner(matchState) || 'SAMA SKOR/DRAW'}
                    </div>
                    <p className="text-slate-400 text-xs text-center">Seluruh babak dan partai tanding ini telah diselesaikan. Panel dinonaktifkan menunggu reset/pertandingan baru dari Sekretaris.</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* VAR CHECKING POPUP FOR JURI (MIRRORED FROM MONITOR) */}
            <AnimatePresence>
              {matchState.varChecking && (matchState.varChecking.status === 'CHECKING' || matchState.varChecking.status === 'RESULT') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ed2] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className={`max-w-xl w-full bg-[#0a0315] border-2 rounded-3xl p-10 space-y-6 shadow-2xl transition-all duration-300 ${
                      matchState.varChecking.sudut === 'BIRU' 
                        ? 'shadow-[0_0_80px_rgba(59,130,246,0.9)] border-blue-500/80 bg-gradient-to-b from-blue-950/20 to-[#0c122c]/50' 
                        : 'shadow-[0_0_80px_rgba(239,68,68,0.9)] border-red-500/80 bg-gradient-to-b from-red-950/20 to-[#2a0d0d]/50'
                    }`}
                  >
                    {/* Blinking icon during checking */}
                    <div className="flex justify-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-lg ${
                        matchState.varChecking.status === 'CHECKING' ? 'animate-pulse' : ''
                      } ${
                        matchState.varChecking.sudut === 'BIRU'
                          ? 'bg-blue-950/80 border-blue-500 text-blue-400'
                          : 'bg-red-950/80 border-red-500 text-red-400'
                      }`}>
                        <MonitorIcon className="w-10 h-10" />
                      </div>
                    </div>

                    <div>
                      {matchState.varChecking.status === 'CHECKING' ? (
                        <>
                          <h2 className="text-4xl font-black text-white tracking-widest uppercase animate-pulse">
                            VAR CHECKING...
                          </h2>
                          <span className={`text-sm tracking-widest font-mono font-extrabold block mt-2 uppercase ${
                            matchState.varChecking.sudut === 'BIRU' ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            SUDUT {matchState.varChecking.sudut}
                          </span>
                          <p className="text-slate-400 text-xs mt-4 uppercase tracking-wider font-mono">
                            Dewan Sedang Meninjau VAR
                          </p>
                        </>
                      ) : (
                        <>
                          <h2 className={`text-5xl font-black tracking-widest uppercase ${
                            matchState.varChecking.result === 'SAH' ? 'text-green-500 animate-bounce' : 'text-red-500'
                          }`}>
                            RESULT : {matchState.varChecking.result === 'SAH' ? 'SAH' : 'TIDAK SAH'}
                          </h2>
                          <span className={`text-sm tracking-widest font-mono font-extrabold block mt-2 uppercase ${
                            matchState.varChecking.sudut === 'BIRU' ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            SUDUT {matchState.varChecking.sudut}
                          </span>
                          <p className="text-slate-400 text-xs mt-4 uppercase tracking-wider font-mono">
                            Keputusan VAR Telah Ditetapkan
                          </p>
                        </>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HAPUS NILAI CONFIRMATION POPUP FOR JURIES */}
            <AnimatePresence>
              {deleteConfirmSudut && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-[#00000ed2] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-55 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-md w-full bg-[#130626] border-2 border-red-500/50 p-6 md:p-8 rounded-2xl space-y-5 md:space-y-6 shadow-[0_0_40px_rgba(239,68,68,0.25)]"
                  >
                    <div className="w-14 h-14 bg-red-950/50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                      <Trash2 className="w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                    
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">Hapus Nilai?</h3>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Apakah Anda yakin ingin menghapus nilai terakhir untuk <strong className={deleteConfirmSudut === 'BIRU' ? 'text-blue-400 font-extrabold' : 'text-red-400 font-extrabold'}>SUDUT {deleteConfirmSudut}</strong>?
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* YA */}
                      <button
                        onClick={() => {
                          triggerClick();
                          deleteLastJuriClick(deleteConfirmSudut);
                          setDeleteConfirmSudut(null);
                        }}
                        className="py-3 px-4 rounded-xl bg-red-650 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                      >
                        Ya
                      </button>

                      {/* TIDAK */}
                      <button
                        onClick={() => {
                          triggerClick();
                          setDeleteConfirmSudut(null);
                        }}
                        className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-950 text-slate-300 font-extrabold text-sm uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-95"
                      >
                        Tidak
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}

        {/* SEKRETARIS (SECRETARY) CONFIG & COCKPIT SCREEN VIEW */}
        {role === 'SEKRETARIS' && (
          <motion.div
            key="sekretaris"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`flex-1 flex flex-col w-full mx-auto transition-all duration-300 ${
              isFullscreen 
                ? 'p-2 max-w-[99vw] h-[calc(100vh-16px)] overflow-hidden space-y-2' 
                : 'p-4 max-w-full lg:px-8 xl:px-12 space-y-4 overflow-y-auto pb-10'
            }`}
          >
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 bg-purple-950/10 border border-purple-950/30 w-full ${isFullscreen ? 'p-2 rounded-lg' : 'p-3.5 rounded-xl'}`}>
              <h2 className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 uppercase tracking-tight transition-all ${
                isFullscreen ? 'text-lg md:text-xl lg:text-2xl' : 'text-2xl md:text-3xl'
              }`}>
                PANEL SEKRETARIS & ENGINE KONTROL
              </h2>
              
              <button 
                onClick={toggleFullscreen}
                className="py-2 px-4 rounded-xl border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/80 hover:bg-purple-900/80 text-purple-300 hover:text-white font-mono uppercase text-[10px] font-extrabold tracking-widest text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md self-end md:self-auto shrink-0"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'LAYAR BIASA' : 'LAYAR PENUH'}</span>
              </button>
            </div>
            
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${
              isFullscreen ? 'lg:h-[calc(100vh-80px)] min-h-0 overflow-hidden items-stretch' : 'items-start'
            }`}>
              
              {/* Left Side: Configure Match details & Athlete properties */}
              <div className={`lg:col-span-8 bg-gradient-to-b from-brand-purple/40 to-black/60 rounded-2xl border border-purple-500/20 shadow-xl transition-all ${
                isFullscreen ? 'p-3.5 md:p-4 lg:h-full flex flex-col justify-between gap-3 min-h-0 overflow-hidden' : 'p-6 space-y-4'
              }`}>
                <h3 className={`font-bold border-b border-purple-500/20 flex items-center gap-2 shrink-0 ${
                  isFullscreen ? 'text-sm pb-1' : 'text-lg pb-1.5'
                }`}>
                  <Settings className="w-4.5 h-4.5 text-purple-400" />
                  Parameter Pertandingan
                </h3>
                
                {isCurrentMatchArchived && (
                  <div className="bg-red-500/15 border border-red-500/40 p-3 rounded-xl text-left space-y-1 animate-fadeIn shrink-0">
                    <span className="text-red-400 font-extrabold tracking-wider font-mono text-[10px] block">⚠️ MODE AMAN AKTIF:</span>
                    <div className="text-sm text-red-100 font-black uppercase tracking-tight">
                      PARTAI TELAH DIARSIPKAN & TERKUNCI
                    </div>
                    <div className="text-[10px] text-red-300 leading-normal">
                      Pertandingan ini telah selesai dan datanya disimpan dalam arsip riwayat pertandingan. Semua input parameter, detail atlit, sanksi, dan tombol "Mulai (Play)" dinonaktifkan secara otomatis untuk mencegah kesalahan perubahan data riwayat.
                    </div>
                  </div>
                )}
                
                <div className={`grid transition-all shrink-0 ${
                  isFullscreen 
                    ? 'grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-1.5 p-3.5 rounded-xl bg-purple-950/15 border border-purple-500/5 text-xs' 
                    : 'grid-cols-1 md:grid-cols-2 gap-4'
                }`}>
                  {/* Event Name */}
                  <div className={`${isFullscreen ? 'col-span-1 md:col-span-4' : 'col-span-1 md:col-span-2'} space-y-1`}>
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Nama Event Kejuaraan</label>
                    <input 
                      id="input-eventName"
                      type="text" 
                      value={localEventName}
                      disabled={isCurrentMatchArchived}
                      onChange={(e) => setLocalEventName(e.target.value.toUpperCase())}
                      onBlur={() => updateMatchState({ ...matchState, eventName: localEventName })}
                      className={`w-full bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-lg font-bold placeholder-purple-950/50 outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base' : 'p-2.5 text-sm'
                      }`}
                      placeholder="CONTOH: KEJUARAAN PENCAK SILAT WILAYAH 2026"
                    />
                  </div>

                  {/* Tempat Pelaksanaan & Waktu Pelaksanaan */}
                  <div className={`${isFullscreen ? 'col-span-1 md:col-span-4' : 'col-span-1 md:col-span-2'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
                    {/* Tempat Pelaksanaan */}
                    <div className="space-y-1">
                      <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Tempat Pelaksanaan</label>
                      <input 
                        id="input-tempatPelaksanaan"
                        type="text" 
                        value={localTempatPelaksanaan}
                        disabled={isCurrentMatchArchived}
                        onChange={(e) => setLocalTempatPelaksanaan(e.target.value.toUpperCase())}
                        onBlur={() => updateMatchState({ ...matchState, tempatPelaksanaan: localTempatPelaksanaan })}
                        className={`w-full bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-lg font-bold placeholder-purple-950/50 outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isFullscreen ? 'p-3.5 text-base' : 'p-2.5 text-sm'
                        }`}
                        placeholder="CONTOH: PADEPOKAN PENCAK SILAT TMII, JAKARTA"
                      />
                    </div>

                    {/* Waktu Pelaksanaan */}
                    <div className="space-y-1">
                      <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Waktu Pelaksanaan</label>
                      <input 
                        id="input-waktuPelaksanaan"
                        type="text" 
                        value={localWaktuPelaksanaan}
                        disabled={isCurrentMatchArchived}
                        onChange={(e) => setLocalWaktuPelaksanaan(e.target.value.toUpperCase())}
                        onBlur={() => updateMatchState({ ...matchState, waktuPelaksanaan: localWaktuPelaksanaan })}
                        className={`w-full bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-lg font-bold placeholder-purple-950/50 outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                          isFullscreen ? 'p-3.5 text-base' : 'p-2.5 text-sm'
                        }`}
                        placeholder="CONTOH: 12 - 15 JUNI 2026"
                      />
                    </div>
                  </div>

                  {/* Event Logo Inputs */}
                  <div className={`${isFullscreen ? 'col-span-1 md:col-span-4' : 'col-span-1 md:col-span-2'} grid grid-cols-1 md:grid-cols-2 bg-purple-950/10 border border-purple-950/40 rounded-xl transition-all ${
                    isFullscreen ? 'gap-2.5 p-2' : 'gap-4 p-4'
                  }`}>
                    {/* Logo Kiri */}
                    <div className="space-y-1">
                      <label className={`text-purple-300 font-semibold uppercase tracking-wider font-mono block ${isFullscreen ? 'text-[10px]' : 'text-xs'}`}>Logo Sisi Kiri (Monitor)</label>
                      <div className="flex items-center gap-3">
                        {matchState.logoKiri ? (
                          <div className={`relative bg-black/40 border border-purple-500/30 p-1 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                            isFullscreen ? 'h-10 w-10' : 'h-14 w-14'
                          }`}>
                            <img 
                              src={matchState.logoKiri} 
                              alt="Kiri Preview" 
                              className="max-h-full max-w-full object-contain rounded"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              disabled={isCurrentMatchArchived}
                              onClick={() => {
                                triggerClick();
                                updateMatchState({ ...matchState, logoKiri: "" });
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-red-650 hover:bg-red-500 border border-red-500 p-0.5 rounded-full text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Hapus logo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className={`bg-black/40 border border-dashed border-purple-950/70 rounded-lg flex flex-col items-center justify-center text-slate-600 shrink-0 transition-all ${
                            isFullscreen ? 'h-10 w-10' : 'h-14 w-14'
                          }`}>
                            <Upload className="w-4 h-4 opacity-40" />
                            <span className="text-[7px] font-mono mt-0.5 uppercase tracking-tighter">KOSONG</span>
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <input 
                            id="input-logoKiri"
                            type="text" 
                            value={localLogoKiri}
                            disabled={isCurrentMatchArchived}
                            onChange={(e) => setLocalLogoKiri(e.target.value)}
                            onBlur={() => updateMatchState({ ...matchState, logoKiri: localLogoKiri })}
                            className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-md font-semibold outline-none text-white placeholder-purple-950/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                              isFullscreen ? 'p-3 text-sm' : 'p-1.5 text-xs'
                            }`}
                            placeholder="Masukkan/paste URL logo..."
                          />
                          <label className={`inline-flex items-center justify-center gap-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/20 rounded-md font-bold text-purple-300 hover:text-white cursor-pointer transition-all active:scale-95 ${
                            isFullscreen ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[10px]'
                          } ${isCurrentMatchArchived ? 'pointer-events-none opacity-40 cursor-not-allowed' : ''}`}>
                            <Upload className="w-3 h-3" /> Upload Logo Kiri
                            <input 
                              type="file" 
                              accept="image/*" 
                              disabled={isCurrentMatchArchived}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    const base64 = event.target?.result as string;
                                    const compressed = await compressImage(base64);
                                    try {
                                      const res = await fetch('/api/logo/kiri', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ logo: compressed })
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        updateMatchState({ ...matchState, logoKiri: data.url });
                                      } else {
                                        updateMatchState({ ...matchState, logoKiri: compressed });
                                      }
                                    } catch (err) {
                                      updateMatchState({ ...matchState, logoKiri: compressed });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                    </div>
 
                    {/* Logo Kanan */}
                    <div className="space-y-1">
                      <label className={`text-purple-300 font-semibold uppercase tracking-wider font-mono block ${isFullscreen ? 'text-[10px]' : 'text-xs'}`}>Logo Sisi Kanan (Monitor)</label>
                      <div className="flex items-center gap-3">
                        {matchState.logoKanan ? (
                          <div className={`relative bg-black/40 border border-purple-500/30 p-1 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                            isFullscreen ? 'h-10 w-10' : 'h-14 w-14'
                          }`}>
                            <img 
                              src={matchState.logoKanan} 
                              alt="Kanan Preview" 
                              className="max-h-full max-w-full object-contain rounded"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              disabled={isCurrentMatchArchived}
                              onClick={() => {
                                triggerClick();
                                updateMatchState({ ...matchState, logoKanan: "" });
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-red-650 hover:bg-red-500 border border-red-500 p-0.5 rounded-full text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Hapus logo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className={`bg-black/40 border border-dashed border-purple-950/70 rounded-lg flex flex-col items-center justify-center text-slate-600 shrink-0 transition-all ${
                            isFullscreen ? 'h-10 w-10' : 'h-14 w-14'
                          }`}>
                            <Upload className="w-4 h-4 opacity-40" />
                            <span className="text-[7px] font-mono mt-0.5 uppercase tracking-tighter">KOSONG</span>
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <input 
                            id="input-logoKanan"
                            type="text" 
                            value={localLogoKanan}
                            disabled={isCurrentMatchArchived}
                            onChange={(e) => setLocalLogoKanan(e.target.value)}
                            onBlur={() => updateMatchState({ ...matchState, logoKanan: localLogoKanan })}
                            className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-md font-semibold outline-none text-white placeholder-purple-950/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                              isFullscreen ? 'p-3 text-sm' : 'p-1.5 text-xs'
                            }`}
                            placeholder="Masukkan/paste URL logo..."
                          />
                          <label className={`inline-flex items-center justify-center gap-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/20 rounded-md font-bold text-purple-300 hover:text-white cursor-pointer transition-all active:scale-95 ${
                            isFullscreen ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[10px]'
                          } ${isCurrentMatchArchived ? 'pointer-events-none opacity-40 cursor-not-allowed' : ''}`}>
                            <Upload className="w-3 h-3" /> Upload Logo Kanan
                            <input 
                              type="file" 
                              accept="image/*" 
                              disabled={isCurrentMatchArchived}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    const base64 = event.target?.result as string;
                                    const compressed = await compressImage(base64);
                                    try {
                                      const res = await fetch('/api/logo/kanan', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ logo: compressed })
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        updateMatchState({ ...matchState, logoKanan: data.url });
                                      } else {
                                        updateMatchState({ ...matchState, logoKanan: compressed });
                                      }
                                    } catch (err) {
                                      updateMatchState({ ...matchState, logoKanan: compressed });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                        {/* Partai & Kelas */}
                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>{matchState.sistemTanding === 'POOL' ? 'Urutan Tampil (#)' : 'Partai Tanding (#)'}</label>
                    <input 
                      id="input-partai"
                      type="text" 
                      value={localPartai}
                      onChange={(e) => setLocalPartai(e.target.value)}
                      onBlur={() => {
                        const targetPartai = localPartai.trim();
                        let updatedState = { ...matchState, partai: targetPartai };
                        
                        const normalizePartai = (p: any): string => {
                          if (p === undefined || p === null) return '';
                          const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                          const matched = str.match(/\d+/);
                          if (matched) {
                            return parseInt(matched[0], 10).toString();
                          }
                          return str;
                        };

                        const excelDataStr = localStorage.getItem('silat_excel_matches');
                        if (excelDataStr) {
                          try {
                            const excelMatches = JSON.parse(excelDataStr);
                            if (Array.isArray(excelMatches)) {
                              const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                              if (matchRow) {
                                const nameM = (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase();
                                const kontM = (matchRow['Kontingen Merah'] || "").toString().toUpperCase();
                                const nameB = (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase();
                                const kontB = (matchRow['Kontingen Biru'] || "").toString().toUpperCase();
                                
                                const resolvedM = resolvePlaceholderAthlete({ nama: nameM, kontingen: kontM }, history);
                                const resolvedB = resolvePlaceholderAthlete({ nama: nameB, kontingen: kontB }, history);

                                const kls = matchRow['Kelas'] ? matchRow['Kelas'].toString().toUpperCase() : matchState.kelas;
                                const gdr = matchRow['Gender'] && matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                const evt = matchState.eventName; // Preserve custom event name instead of resetting to default
                                
                                let kUsia = matchRow['Kategori Usia'] ? matchRow['Kategori Usia'].toString().trim().toUpperCase() : (matchState.kategoriUsia || 'REMAJA');
                                if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                  kUsia = 'PRA REMAJA';
                                }
                                const tPertandingan = matchRow['Tahap Pertandingan'] ? matchRow['Tahap Pertandingan'].toString().trim().toUpperCase() : (matchState.tahapPertandingan || 'PENYISIHAN');

                                let dur = getMatchDuration(kls, tPertandingan);

                                if (matchRow['Durasi Babak (Menit)']) {
                                  const durStr = matchRow['Durasi Babak (Menit)'].toString().trim().replace('.', ':');
                                  if (durStr.includes(':')) {
                                    const parts = durStr.split(':');
                                    const mins = parseInt(parts[0], 10) || 0;
                                    let secsStr = parts[1] || "0";
                                    if (secsStr.length === 1) {
                                      secsStr = secsStr + "0";
                                    }
                                    const secs = parseInt(secsStr, 10) || 0;
                                    dur = (mins * 60) + secs;
                                  } else {
                                    const parsedSecs = parseInt(durStr, 10);
                                    if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                      if (parsedSecs < 10) {
                                        dur = parsedSecs * 60;
                                      } else {
                                        dur = parsedSecs;
                                      }
                                    }
                                  }
                                }

                                updatedState = {
                                  ...updatedState,
                                  atlitMerah: { nama: resolvedM.nama, kontingen: resolvedM.kontingen },
                                  atlitBiru: { nama: resolvedB.nama, kontingen: resolvedB.kontingen },
                                  kelas: kls,
                                  kategoriUsia: kUsia,
                                  tahapPertandingan: tPertandingan,
                                  gender: gdr,
                                  eventName: evt,
                                  durasiBabak: dur,
                                  sisaWaktu: 0,
                                  timer2Value: 0,
                                  babakAktif: 1
                                };
                                showToast(`Data Partai ${targetPartai} berhasil dimuat dari Excel!`, 'success');
                              }
                            }
                          } catch (err) {
                            console.error("Error reading excel database lookup", err);
                          }
                        }
                        updateMatchState(updatedState);
                      }}
                      className={`w-full bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Tahap Pertandingan</label>
                    <select
                      value={matchState.tahapPertandingan || "PENYISIHAN"}
                      disabled={isCurrentMatchArchived}
                      onChange={(e) => {
                        triggerClick();
                        const nextTahap = e.target.value;
                        const dur = getMatchDuration(matchState.kelas, nextTahap);
                        updateMatchState({
                          ...matchState,
                          tahapPertandingan: nextTahap,
                          durasiBabak: dur,
                          sisaWaktu: 0,
                          babakAktif: 1
                        });
                      }}
                      className={`w-full bg-[#12092e] bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                    >
                      {(() => {
                        const currentTahap = matchState.tahapPertandingan || "PENYISIHAN";
                        const defaultOptions = ["PENYISIHAN", "PEREMPAT FINAL", "SEMIFINAL", "SEMI FINAL", "FINAL"];
                        const optionsSet = new Set(defaultOptions);
                        optionsSet.add(currentTahap);
                        return Array.from(optionsSet).map((opt) => (
                          <option key={opt} value={opt} className="bg-[#12092e] text-white font-semibold">
                            {opt}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>KATEGORI JURUS</label>
                    <select 
                      id="input-kelas"
                      value={["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU"].includes(localKelas) ? localKelas : "TUNGGAL"}
                      disabled={isCurrentMatchArchived}
                      onChange={(e) => {
                        triggerClick();
                        const val = e.target.value;
                        setLocalKelas(val);
                        const dur = getMatchDuration(val, matchState.tahapPertandingan || "PENYISIHAN");

                        updateMatchState({ 
                          ...matchState, 
                          kelas: val,
                          durasiBabak: dur,
                          sisaWaktu: 0,
                          babakAktif: 1
                        });
                      }}
                      className={`w-full bg-[#12092e] bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                    >
                      <option value="TUNGGAL" className="bg-[#12092e] text-white font-semibold">TUNGGAL</option>
                      <option value="TUNGGAL BEBAS" className="bg-[#12092e] text-white font-semibold">TUNGGAL BEBAS</option>
                      <option value="GANDA" className="bg-[#12092e] text-white font-semibold">GANDA</option>
                      <option value="REGU" className="bg-[#12092e] text-white font-semibold">REGU</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Kategori Usia</label>
                    <select
                      value={matchState.kategoriUsia || "REMAJA"}
                      disabled={isCurrentMatchArchived}
                      onChange={(e) => {
                        triggerClick();
                        const val = e.target.value;
                        updateMatchState({
                          ...matchState,
                          kategoriUsia: val,
                          babakAktif: 1 // ALWAYS start and reset to round 1 when category changes
                        });
                      }}
                      className={`w-full bg-[#12092e] bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                    >
                      <option value="PRA USIA DINI" className="bg-[#12092e] text-white font-semibold">PRA USIA DINI</option>
                      <option value="USIA DINI 1" className="bg-[#12092e] text-white font-semibold">USIA DINI 1</option>
                      <option value="USIA DINI 2" className="bg-[#12092e] text-white font-semibold">USIA DINI 2</option>
                      <option value="PRA REMAJA" className="bg-[#12092e] text-white font-semibold">PRA REMAJA</option>
                      <option value="REMAJA" className="bg-[#12092e] text-white font-semibold">REMAJA</option>
                      <option value="DEWASA" className="bg-[#12092e] text-white font-semibold">DEWASA</option>
                      <option value="MASTER 1" className="bg-[#12092e] text-white font-semibold">MASTER 1</option>
                      <option value="MASTER 2" className="bg-[#12092e] text-white font-semibold">MASTER 2</option>
                    </select>
                  </div>

                  {/* Stage Dropdown & Gender Selector */}
                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Gender (Kategori)</label>
                    <div className={`grid grid-cols-2 ${isFullscreen ? 'gap-2.5 text-sm' : 'gap-2'}`}>
                      <button
                        disabled={isCurrentMatchArchived}
                        onClick={() => { triggerClick(); updateMatchState({ ...matchState, gender: 'PUTRA' }); }}
                        className={`font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isFullscreen ? 'py-3 px-3 text-[14px] rounded-lg' : 'py-2 px-3 text-sm rounded-lg'} border ${matchState.gender === 'PUTRA' ? 'bg-purple-700 border-purple-500' : 'bg-slate-900 border-slate-950 text-slate-400 hover:bg-slate-800'}`}
                      >
                        PUTRA
                      </button>
                      <button
                        disabled={isCurrentMatchArchived}
                        onClick={() => { triggerClick(); updateMatchState({ ...matchState, gender: 'PUTRI' }); }}
                        className={`font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isFullscreen ? 'py-3 px-3 text-[14px] rounded-lg' : 'py-2 px-3 text-sm rounded-lg'} border ${matchState.gender === 'PUTRI' ? 'bg-purple-700 border-purple-500' : 'bg-slate-900 border-slate-950 text-slate-400 hover:bg-slate-800'}`}
                      >
                        PUTRI
                      </button>
                    </div>
                  </div>

                  {/* Round Time selector */}
                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Durasi Tampil</label>
                    <select
                      value={matchState.durasiBabak}
                      disabled={isCurrentMatchArchived}
                      onChange={(e) => {
                        const seconds = parseInt(e.target.value);
                        updateMatchState({
                          ...matchState,
                          durasiBabak: seconds,
                          sisaWaktu: 0
                        });
                      }}
                      className={`w-full bg-[#12092e] bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                    >
                      <option value="60" className="bg-[#12092e] text-white font-semibold">01.00 Menit</option>
                      <option value="70" className="bg-[#12092e] text-white font-semibold">01.10 Menit</option>
                      <option value="80" className="bg-[#12092e] text-white font-semibold">01.20 Menit</option>
                      <option value="90" className="bg-[#12092e] text-white font-semibold">01.30 Menit</option>
                      <option value="100" className="bg-[#12092e] text-white font-semibold">01.40 Menit</option>
                      <option value="110" className="bg-[#12092e] text-white font-semibold">01.50 Menit</option>
                      <option value="120" className="bg-[#12092e] text-white font-semibold">02.00 Menit</option>
                      <option value="150" className="bg-[#12092e] text-white font-semibold">02.30 Menit</option>
                      <option value="180" className="bg-[#12092e] text-white font-semibold">03.00 Menit</option>
                    </select>
                  </div>
                </div>

                {/* Athlete Profile Editors */}
                <div className={`grid ${isPoolSystem ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'} border-t border-purple-950/60 transition-all ${
                  isFullscreen ? 'gap-3 pt-2.5 flex-1 min-h-0' : 'gap-6 pt-2'
                }`}>
                  {/* Sudut Biru Athlete Card Wrapper */}
                  {(!isPoolSystem || activePoolCorner === 'BIRU') && (
                    <div className="flex flex-col gap-2">
                      {/* Sudut Biru Athlete Card */}
                      <div className={`bg-gradient-to-r from-blue-900/80 to-transparent border-l-4 border-blue-500 shadow-xl transition-all ${
                        isFullscreen ? 'p-3 rounded-xl space-y-2 h-fit' : 'p-4 rounded-xl space-y-3'
                      }`}>
                        <span className="text-[10px] bg-blue-650 text-white font-bold px-1.5 py-0.5 rounded font-mono w-max">SUDUT BIRU</span>
                        <div className={`space-y-1 ${isFullscreen ? 'gap-1' : ''}`}>
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Nama Atlit</label>
                            <input 
                              id="input-atlitBiruNama"
                              type="text" 
                              value={localAtlitBiruNama}
                              disabled={isCurrentMatchArchived}
                              onChange={(e) => setLocalAtlitBiruNama(e.target.value.toUpperCase())}
                              onBlur={() => updateMatchState({ ...matchState, atlitBiru: { ...matchState.atlitBiru, nama: localAtlitBiruNama } })}
                              className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded font-bold text-white uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                                isFullscreen ? 'p-3.5 text-base' : 'p-2 text-xs'
                              }`}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Kontingen</label>
                            <input 
                              id="input-atlitBiruKontingen"
                              type="text" 
                              value={localAtlitBiruKontingen}
                              disabled={isCurrentMatchArchived}
                              onChange={(e) => setLocalAtlitBiruKontingen(e.target.value.toUpperCase())}
                              onBlur={() => updateMatchState({ ...matchState, atlitBiru: { ...matchState.atlitBiru, kontingen: localAtlitBiruKontingen } })}
                              className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded font-bold text-white uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                                isFullscreen ? 'p-3.5 text-base' : 'p-2 text-xs'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sudut Merah Athlete Card Wrapper */}
                  {(!isPoolSystem || activePoolCorner === 'MERAH') && (
                    <div className="flex flex-col gap-2">
                      {/* Sudut Merah Athlete Card */}
                      <div className={`bg-gradient-to-br from-red-900/80 to-transparent border-l-4 border-red-500 shadow-xl transition-all ${
                        isFullscreen ? 'p-3 rounded-xl space-y-2 h-fit' : 'p-4 rounded-xl space-y-3'
                      }`}>
                        <span className="text-[10px] bg-red-650 text-white font-bold px-1.5 py-0.5 rounded font-mono w-max">SUDUT MERAH</span>
                        <div className={`space-y-1 ${isFullscreen ? 'gap-1' : ''}`}>
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-red-100 font-bold uppercase tracking-wider">Nama Atlit</label>
                            <input 
                              id="input-atlitMerahNama"
                              type="text" 
                              value={localAtlitMerahNama}
                              disabled={isCurrentMatchArchived}
                              onChange={(e) => setLocalAtlitMerahNama(e.target.value.toUpperCase())}
                              onBlur={() => updateMatchState({ ...matchState, atlitMerah: { ...matchState.atlitMerah, nama: localAtlitMerahNama } })}
                              className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded font-bold text-white uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                                isFullscreen ? 'p-3.5 text-base' : 'p-2 text-xs'
                              }`}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[10px] text-red-100 font-bold uppercase tracking-wider">Kontingen</label>
                            <input 
                              id="input-atlitMerahKontingen"
                              type="text" 
                              value={localAtlitMerahKontingen}
                              disabled={isCurrentMatchArchived}
                              onChange={(e) => setLocalAtlitMerahKontingen(e.target.value.toUpperCase())}
                              onBlur={() => updateMatchState({ ...matchState, atlitMerah: { ...matchState.atlitMerah, kontingen: localAtlitMerahKontingen } })}
                              className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded font-bold text-white uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                                isFullscreen ? 'p-3.5 text-base' : 'p-2 text-xs'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons: PREV MATCH and NEXT MATCH */}
                  <div className={`${
                    isPoolSystem 
                      ? `bg-gradient-to-r from-purple-900/40 to-transparent border-l-4 border-purple-500 shadow-xl transition-all ${
                          isFullscreen ? 'p-3 rounded-xl space-y-2 h-fit' : 'p-4 rounded-xl space-y-3'
                        }`
                      : 'flex flex-col gap-2 md:col-span-2'
                  }`}>
                    {isPoolSystem && (
                      <span className="text-[10px] bg-purple-650 text-white font-bold px-1.5 py-0.5 rounded font-mono w-max block">NAVIGASI PERTANDINGAN</span>
                    )}
                    {/* Action Button: CEK PARTAI SELANJUTNYA */}
                    <div className={isPoolSystem ? "space-y-1" : "grid grid-cols-1"}>
                      {isPoolSystem && (
                        <label className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider block">Daftar Partai</label>
                      )}
                      <button
                        onClick={() => {
                          triggerClick();
                          setShowNextMatchesPopup(true);
                        }}
                        className={`font-black uppercase tracking-wider transition-all duration-200 border flex items-center justify-center gap-1 shadow-md active:scale-95 text-yellow-950 border-yellow-600 bg-yellow-500 hover:bg-yellow-600 cursor-pointer ${
                          isPoolSystem 
                            ? (isFullscreen ? 'w-full p-3.5 text-base rounded' : 'w-full p-2 text-xs rounded')
                            : (isFullscreen ? 'py-4 text-sm md:text-base rounded-xl' : 'py-2.5 text-xs rounded-xl')
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> CEK PARTAI SELANJUTNYA
                      </button>
                    </div>

                    <div className={isPoolSystem ? "space-y-1" : ""}>
                      {isPoolSystem && (
                        <label className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider block">Pindah Partai / Penampilan</label>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          triggerClick();
                          const normalizePartai = (p: any): string => {
                            if (p === undefined || p === null) return '';
                            const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                            const matched = str.match(/\d+/);
                            if (matched) return parseInt(matched[0], 10).toString();
                            return str;
                          };
                          const excelDataStr = localStorage.getItem('silat_excel_matches');
                          let targetPartai = "";
                          if (excelDataStr) {
                            try {
                              const excelMatches = JSON.parse(excelDataStr);
                              if (Array.isArray(excelMatches) && excelMatches.length > 0) {
                                const currentIndex = excelMatches.findIndex((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(matchState.partai));
                                if (currentIndex > 0) {
                                  const prevRow = excelMatches[currentIndex - 1];
                                  targetPartai = prevRow['Partai'] ? prevRow['Partai'].toString() : "";
                                }
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          if (!targetPartai) {
                            const matches = matchState.partai.match(/\d+/);
                            if (matches) {
                              const num = parseInt(matches[0], 10);
                              if (num > 1) {
                                targetPartai = matchState.partai.replace(matches[0], (num - 1).toString());
                              } else {
                                showToast("Sudah di Partai pertama!", "warning");
                                return;
                              }
                            } else {
                              const parsed = parseInt(matchState.partai, 10);
                              if (!isNaN(parsed) && parsed > 1) {
                                targetPartai = (parsed - 1).toString();
                              } else {
                                showToast("Sudah di Partai pertama atau format partai tidak numerik!", "warning");
                                return;
                              }
                            }
                          }
                          
                          // Load details
                          let nextAtlitMerah = { nama: "", kontingen: "" };
                          let nextAtlitBiru = { nama: "", kontingen: "" };
                          let nextKelas = matchState.kelas;
                          let nextGender = matchState.gender;
                          let nextEventName = matchState.eventName;
                          let nextKategoriUsia = matchState.kategoriUsia || 'REMAJA';
                          let nextTahapPertandingan = matchState.tahapPertandingan || 'PENYISIHAN';
                          let nextDurasi = matchState.durasiBabak;
                          let foundExcelPrev = false;

                          if (excelDataStr) {
                            try {
                              const excelMatches = JSON.parse(excelDataStr);
                              if (Array.isArray(excelMatches)) {
                                const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                                if (matchRow) {
                                  foundExcelPrev = true;
                                  nextAtlitMerah = {
                                    nama: (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Merah'] || "").toString().toUpperCase()
                                  };
                                  nextAtlitBiru = {
                                    nama: (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Biru'] || "").toString().toUpperCase()
                                  };
                                  if (matchRow['Kelas']) nextKelas = matchRow['Kelas'].toString().toUpperCase();
                                  if (matchRow['Gender']) nextGender = matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                  // Preserve custom event name instead of resetting to default
                                  // if (matchRow['Nama Event']) nextEventName = matchRow['Nama Event'].toString().toUpperCase();
                                  
                                  if (matchRow['Kategori Usia']) {
                                    let kUsia = matchRow['Kategori Usia'].toString().trim().toUpperCase();
                                    if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                  kUsia = 'PRA REMAJA';
                                }
                                    nextKategoriUsia = kUsia;
                                    
                                    if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                                      nextDurasi = 120;
                                    } else if (kUsia === 'MASTER A') {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                                      nextDurasi = 60;
                                    }
                                  }
                                  if (matchRow['Tahap Pertandingan']) {
                                    nextTahapPertandingan = matchRow['Tahap Pertandingan'].toString().trim().toUpperCase();
                                  }
                                  let finalDur = ((nextKelas || "").toUpperCase() === "TUNGGAL BEBAS" || (nextKelas || "").toUpperCase() === "GANDA" || (nextKelas || "").toUpperCase() === "REGU")
                                    ? (nextTahapPertandingan === "FINAL" ? 180 : 90)
                                    : (nextTahapPertandingan === "FINAL" ? 180 : (nextTahapPertandingan === "SEMI FINAL" || nextTahapPertandingan === "SEMIFINAL" ? 100 : 80));
                                  nextDurasi = finalDur;
                                  if (matchRow['Durasi Babak (Menit)']) {
                                    const durStr = matchRow['Durasi Babak (Menit)'].toString().trim().replace('.', ':');
                                    if (durStr.includes(':')) {
                                      const parts = durStr.split(':');
                                      const mins = parseInt(parts[0], 10) || 0;
                                      let secsStr = parts[1] || "0";
                                      if (secsStr.length === 1) {
                                        secsStr = secsStr + "0";
                                      }
                                      const secs = parseInt(secsStr, 10) || 0;
                                      nextDurasi = (mins * 60) + secs;
                                    } else {
                                      const parsedSecs = parseInt(durStr, 10);
                                      if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                        if (parsedSecs < 10) {
                                          nextDurasi = parsedSecs * 60;
                                        } else {
                                          nextDurasi = parsedSecs;
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }

                          updateMatchState({
                            ...matchState,
                            partai: targetPartai,
                            kelas: nextKelas,
                            gender: nextGender,
                            eventName: nextEventName,
                            kategoriUsia: nextKategoriUsia,
                            tahapPertandingan: nextTahapPertandingan,
                            durasiBabak: nextDurasi,
                            sisaWaktu: 0,
                            timer2Value: 0,
                            statusPertandingan: 'BELUM_MULAI',
                            timerBerjalan: false,
                            validatedScores: [],
                            rawScores: [],
                            penaltiesMerah: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            penaltiesBiru: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            accumulatedPenaltyMerah: 0,
                            accumulatedPenaltyBiru: 0,
                            historyPenaltiesMerah: {},
                            historyPenaltiesBiru: {},
                            babakAktif: 1,
                            diskualifikasi: null,
                            pemenang: null,
                            verifikasi: {
                              id: "", status: 'IDLE', jenis: 'JATUHAN', juriVotes: {}, result: null
                            },
                            showRoundEndPopUp: false,
                            showMatchEndPopUp: false,
                            atlitMerah: nextAtlitMerah,
                            atlitBiru: nextAtlitBiru,
                            seniScores: {
                              MERAH: createDefaultCornerSeni(),
                              BIRU: createDefaultCornerSeni(),
                            },
                            hasPerformedBIRU: false,
                            hasPerformedMERAH: false
                          });

                          setLocalPartai(targetPartai);
                          setLocalKelas(nextKelas);
                          setLocalAtlitMerahNama(nextAtlitMerah.nama);
                          setLocalAtlitMerahKontingen(nextAtlitMerah.kontingen);
                          setLocalAtlitBiruNama(nextAtlitBiru.nama);
                          setLocalAtlitBiruKontingen(nextAtlitBiru.kontingen);

                          if (foundExcelPrev) {
                            showToast(`Sukses memuat Partai ${targetPartai} dari Excel!`, "success");
                          } else {
                            showToast(`Partai ${targetPartai} siap diinput manual.`, "info");
                          }
                        }}
                        className={`font-black uppercase tracking-wider transition-all duration-200 border flex items-center justify-center gap-1 shadow-md active:scale-95 text-white border-orange-600 bg-orange-500 hover:bg-orange-600 cursor-pointer ${
                          isPoolSystem 
                            ? (isFullscreen ? 'w-full p-3.5 text-base rounded' : 'w-full p-2 text-xs rounded')
                            : (isFullscreen ? 'py-4 text-sm md:text-base rounded-xl' : 'py-2.5 text-xs rounded-xl')
                        }`}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> PREV MATCH
                      </button>
                      
                      <button
                        onClick={() => {
                          triggerClick();
                          const normalizePartai = (p: any): string => {
                            if (p === undefined || p === null) return '';
                            const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                            const matched = str.match(/\d+/);
                            if (matched) return parseInt(matched[0], 10).toString();
                            return str;
                          };
                          const excelDataStr = localStorage.getItem('silat_excel_matches');
                          let targetPartai = "";
                          if (excelDataStr) {
                            try {
                              const excelMatches = JSON.parse(excelDataStr);
                              if (Array.isArray(excelMatches) && excelMatches.length > 0) {
                                const currentIndex = excelMatches.findIndex((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(matchState.partai));
                                if (currentIndex >= 0 && currentIndex < excelMatches.length - 1) {
                                  const nextRow = excelMatches[currentIndex + 1];
                                  targetPartai = nextRow['Partai'] ? nextRow['Partai'].toString() : "";
                                }
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          if (!targetPartai) {
                            const matches = matchState.partai.match(/\d+/);
                            if (matches) {
                              const num = parseInt(matches[0], 10);
                              targetPartai = matchState.partai.replace(matches[0], (num + 1).toString());
                            } else {
                              const parsed = parseInt(matchState.partai, 10);
                              if (!isNaN(parsed)) {
                                targetPartai = (parsed + 1).toString();
                              } else {
                                targetPartai = "1";
                              }
                            }
                          }
                          
                          // Load details
                          let nextAtlitMerah = { nama: "", kontingen: "" };
                          let nextAtlitBiru = { nama: "", kontingen: "" };
                          let nextKelas = matchState.kelas;
                          let nextGender = matchState.gender;
                          let nextEventName = matchState.eventName;
                          let nextKategoriUsia = matchState.kategoriUsia || 'REMAJA';
                          let nextTahapPertandingan = matchState.tahapPertandingan || 'PENYISIHAN';
                          let nextDurasi = matchState.durasiBabak;
                          let foundExcel = false;

                          if (excelDataStr) {
                            try {
                              const excelMatches = JSON.parse(excelDataStr);
                              if (Array.isArray(excelMatches)) {
                                const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                                if (matchRow) {
                                  foundExcel = true;
                                  nextAtlitMerah = {
                                    nama: (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Merah'] || "").toString().toUpperCase()
                                  };
                                  nextAtlitBiru = {
                                    nama: (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Biru'] || "").toString().toUpperCase()
                                  };
                                  if (matchRow['Kelas']) nextKelas = matchRow['Kelas'].toString().toUpperCase();
                                  if (matchRow['Gender']) nextGender = matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                  // Preserve custom event name instead of resetting to default
                                  // if (matchRow['Nama Event']) nextEventName = matchRow['Nama Event'].toString().toUpperCase();
                                  
                                  if (matchRow['Kategori Usia']) {
                                    let kUsia = matchRow['Kategori Usia'].toString().trim().toUpperCase();
                                    if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                  kUsia = 'PRA REMAJA';
                                }
                                    nextKategoriUsia = kUsia;
                                    
                                    if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                                      nextDurasi = 120;
                                    } else if (kUsia === 'MASTER A') {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                                      nextDurasi = 60;
                                    }
                                  }
                                  if (matchRow['Tahap Pertandingan']) {
                                    nextTahapPertandingan = matchRow['Tahap Pertandingan'].toString().trim().toUpperCase();
                                  }
                                  let finalDur = ((nextKelas || "").toUpperCase() === "TUNGGAL BEBAS" || (nextKelas || "").toUpperCase() === "GANDA" || (nextKelas || "").toUpperCase() === "REGU")
                                    ? (nextTahapPertandingan === "FINAL" ? 180 : 90)
                                    : (nextTahapPertandingan === "FINAL" ? 180 : (nextTahapPertandingan === "SEMI FINAL" || nextTahapPertandingan === "SEMIFINAL" ? 100 : 80));
                                  nextDurasi = finalDur;
                                  if (matchRow['Durasi Babak (Menit)']) {
                                    const durStr = matchRow['Durasi Babak (Menit)'].toString().trim().replace('.', ':');
                                    if (durStr.includes(':')) {
                                      const parts = durStr.split(':');
                                      const mins = parseInt(parts[0], 10) || 0;
                                      let secsStr = parts[1] || "0";
                                      if (secsStr.length === 1) {
                                        secsStr = secsStr + "0";
                                      }
                                      const secs = parseInt(secsStr, 10) || 0;
                                      nextDurasi = (mins * 60) + secs;
                                    } else {
                                      const parsedSecs = parseInt(durStr, 10);
                                      if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                        if (parsedSecs < 10) {
                                          nextDurasi = parsedSecs * 60;
                                        } else {
                                          nextDurasi = parsedSecs;
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }

                          updateMatchState({
                            ...matchState,
                            partai: targetPartai,
                            kelas: nextKelas,
                            gender: nextGender,
                            eventName: nextEventName,
                            kategoriUsia: nextKategoriUsia,
                            tahapPertandingan: nextTahapPertandingan,
                            durasiBabak: nextDurasi,
                            sisaWaktu: 0,
                            timer2Value: 0,
                            statusPertandingan: 'BELUM_MULAI',
                            timerBerjalan: false,
                            validatedScores: [],
                            rawScores: [],
                            penaltiesMerah: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            penaltiesBiru: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            accumulatedPenaltyMerah: 0,
                            accumulatedPenaltyBiru: 0,
                            historyPenaltiesMerah: {},
                            historyPenaltiesBiru: {},
                            babakAktif: 1,
                            diskualifikasi: null,
                            pemenang: null,
                            verifikasi: {
                              id: "", status: 'IDLE', jenis: 'JATUHAN', juriVotes: {}, result: null
                            },
                            showRoundEndPopUp: false,
                            showMatchEndPopUp: false,
                            atlitMerah: nextAtlitMerah,
                            atlitBiru: nextAtlitBiru,
                            seniScores: {
                              MERAH: createDefaultCornerSeni(),
                              BIRU: createDefaultCornerSeni(),
                            },
                            hasPerformedBIRU: false,
                            hasPerformedMERAH: false
                          });

                          setLocalPartai(targetPartai);
                          setLocalKelas(nextKelas);
                          setLocalAtlitMerahNama(nextAtlitMerah.nama);
                          setLocalAtlitMerahKontingen(nextAtlitMerah.kontingen);
                          setLocalAtlitBiruNama(nextAtlitBiru.nama);
                          setLocalAtlitBiruKontingen(nextAtlitBiru.kontingen);

                          if (foundExcel) {
                            showToast(`Sukses memuat Partai ${targetPartai} dari Excel!`, "success");
                          } else {
                            showToast(`Partai ${targetPartai} siap diinput manual.`, "info");
                          }
                        }}
                        className={`font-black uppercase tracking-wider transition-all duration-200 border flex items-center justify-center gap-1 shadow-md active:scale-95 text-white border-green-700 bg-green-600 hover:bg-green-700 cursor-pointer ${
                          isPoolSystem 
                            ? (isFullscreen ? 'w-full p-3.5 text-base rounded' : 'w-full p-2 text-xs rounded')
                            : (isFullscreen ? 'py-4 text-sm md:text-base rounded-xl' : 'py-2.5 text-xs rounded-xl')
                        }`}
                      >
                        NEXT MATCH <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    </div>
                  </div>
                </div>



                {/* Registrasi Data Turnamen Dashboard */}
                <div className={`bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-500/30 rounded-xl transition-all p-4 space-y-3`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 uppercase tracking-wider text-sm">Registrasi & Penjadwalan Data</h4>
                      <p className="text-slate-400 text-[10px]">Registrasi data atlit, buat bagan pertandingan (Battle/Pool), dan kontrol alokasi partai ke jadwal.</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        triggerClick();
                        setRole('REGISTRASI_DATA');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-purple-500/50 hover:border-purple-400 text-purple-200 hover:text-white bg-purple-950/50 hover:bg-purple-900/50 font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-lg shadow-purple-900/35"
                    >
                      <User className="w-4.5 h-4.5 text-purple-400" />
                      REGISTRASI DATA
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side: TIMER COCKPIT controllers & MATCH HISTORY */}
              <div className={`lg:col-span-4 transition-all duration-300 ${
                isFullscreen 
                  ? 'space-y-2 lg:h-full lg:overflow-hidden flex flex-col justify-between min-h-0' 
                  : 'space-y-4'
              }`}>
                
                {/* Timer Cockpit Card */}
                <div className={`bg-gradient-to-b from-brand-purple/40 to-black/60 rounded-2xl border border-purple-500/20 text-center relative overflow-hidden transition-all ${
                  isFullscreen ? 'p-3 space-y-2 h-fit shrink-0' : 'p-5 space-y-4'
                }`}>
                  <h3 className={`font-bold uppercase tracking-wider text-purple-400 border-b border-purple-500/20 flex items-center gap-1.5 justify-center font-display ${
                    isFullscreen ? 'text-xs pb-0.5' : 'text-sm pb-1'
                  }`}>
                    <Clock className="w-4 h-4 text-purple-400 font-bold" />
                    KONTROL UTAMA JALANNYA TANDING
                  </h3>

                  {/* Operational Status Pertandingan */}
                  <div className={`bg-black/50 border border-purple-500/10 text-left space-y-1 transition-all ${
                    isFullscreen ? 'p-1.5 rounded-lg text-[11px]' : 'p-2.5 rounded-xl text-xs'
                  }`}>
                    <span className={`text-purple-300 font-semibold tracking-wider font-mono block ${
                      isFullscreen ? 'text-[9px]' : 'text-[10px]'
                    }`}>STATUS LAGA:</span>
                    <div className="flex justify-between items-center">
                      <span className={`font-black tracking-widest font-mono text-xs ${
                        matchState.statusPertandingan === 'BERJALAN' 
                          ? 'text-green-400 animate-pulse'
                          : 'text-amber-500 font-bold'
                      }`}>
                        {matchState.statusPertandingan === 'BERJALAN' 
                          ? '● LAGA AKTIF BERJALAN' 
                          : '● LAGA DIKUNCI / JEDA'
                        }
                      </span>
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                        matchState.statusPertandingan === 'BERJALAN' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                      }`}>
                        {matchState.statusPertandingan === 'BERJALAN' ? 'active' : 'locked'}
                      </span>
                    </div>
                  </div>

                  {/* LAGA STATE CONTROLLERS: MULAI & RESET PERTANDINGAN */}
                  <div className="grid grid-cols-2 gap-2">
                    {!showResetConfirm ? (
                      <>
                        <button
                          onClick={() => {
                            updateMatchState({
                              ...matchState,
                              statusPertandingan: 'BERJALAN',
                              timerBerjalan: false,
                              showRoundEndPopUp: false
                            });
                          }}
                          disabled={matchState.statusPertandingan === 'BERJALAN' || isCurrentMatchArchived}
                          className={`text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                            isFullscreen ? 'py-1.5' : 'py-2.5'
                          } ${
                            (matchState.statusPertandingan === 'BERJALAN' || isCurrentMatchArchived)
                              ? 'bg-purple-950/20 border-purple-950/40 text-purple-600/70 cursor-not-allowed opacity-60'
                              : 'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white shadow-md active:scale-95 cursor-pointer'
                          }`}
                        >
                          <span>🚀 MULAI</span>
                          <span className="text-[8px] opacity-80">(BUKA KUNCI)</span>
                        </button>

                        <button
                          onClick={() => {
                            triggerClick();
                            setShowResetConfirm(true);
                          }}
                          disabled={isCurrentMatchArchived}
                          className={`text-[10px] font-black uppercase tracking-wider rounded-lg border flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${
                            isFullscreen ? 'py-1.5' : 'py-2.5'
                          } ${
                            isCurrentMatchArchived
                              ? 'bg-purple-950/20 border-purple-950/40 text-purple-600/70 cursor-not-allowed opacity-60'
                              : 'bg-red-950/45 hover:bg-red-800 border border-red-500/30 text-red-100 shadow-md hover:border-red-400 cursor-pointer'
                          }`}
                        >
                          <span>🛑 RESET</span>
                          <span className="text-[8px] opacity-80 text-red-400">(RESET & KUNCI)</span>
                        </button>
                      </>
                    ) : (
                      <div className={`col-span-2 bg-gradient-to-r from-red-950 to-red-900 border border-red-500/40 rounded-xl text-center animate-fadeIn ${
                        isFullscreen ? 'p-2 space-y-1' : 'p-3 space-y-2'
                      }`}>
                        <span className="text-[11px] font-extrabold text-red-200 uppercase tracking-tight block">⚠️ YAKIN BERSIHKAN LAGA?</span>
                        <div className="text-[9px] text-red-300 leading-normal max-w-xs mx-auto">
                          Waktu, skor juri, dan data sanksi pada partai saat ini akan dibatalkan & dikosongkan.
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              if (soundEnabled) playUiSwipeConfirmSound();
                              
                              // Clear localStorage keys
                              localStorage.removeItem('silat_excel_matches');
                              localStorage.removeItem('silat_jadwal_lines');
                              
                              // Clear React state variables
                              setJadwalLines([]);
                              setLocalAtlitMerahNama("");
                              setLocalAtlitMerahKontingen("");
                              setLocalAtlitBiruNama("");
                              setLocalAtlitBiruKontingen("");
                              
                              updateMatchState({
                                ...matchState,
                                statusPertandingan: 'BELUM_MULAI',
                                timerBerjalan: false,
                                timerPlayLocked: false,
                                activeCorner: undefined,
                                timer2Value: 0,
                                validatedScores: [],
                                rawScores: [],
                                wmpTriggered: false,
                                wmpBypassed: false,
                                wmpBypassedScoreDiff: 0,
                                wmpWon: false,
                                wmpBabak1Occurred: false,
                                atlitMerah: { nama: "", kontingen: "" },
                                atlitBiru: { nama: "", kontingen: "" },
                                silat_excel_matches: [],
                                silat_jadwal_lines: [],
                                penaltiesMerah: {
                                  binaan1: false, binaan2: false,
                                  teguran1: false, teguran2: false,
                                  peringatan1: false, peringatan2: false,
                                },
                                penaltiesBiru: {
                                  binaan1: false, binaan2: false,
                                  teguran1: false, teguran2: false,
                                  peringatan1: false, peringatan2: false,
                                },
                                accumulatedPenaltyMerah: 0,
                                accumulatedPenaltyBiru: 0,
                                historyPenaltiesMerah: {},
                                historyPenaltiesBiru: {},
                                varChecking: {
                                  status: 'IDLE',
                                  sudut: null,
                                  result: null
                                },
                                sisaWaktu: 0,
                                babakAktif: 1,
                                diskualifikasi: null,
                                pemenang: null,
                                verifikasi: {
                                  id: "",
                                  status: 'IDLE',
                                  jenis: 'JATUHAN',
                                  juriVotes: {},
                                  result: null
                                },
                                showRoundEndPopUp: false,
                                showMatchEndPopUp: false,
                                seniScores: {
                                  MERAH: createDefaultCornerSeni(),
                                  BIRU: createDefaultCornerSeni(),
                                },
                                hasPerformedBIRU: false,
                                hasPerformedMERAH: false
                              });
                              setShowResetConfirm(false);
                            }}
                            className="bg-red-650 hover:bg-red-550 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg tracking-widest uppercase cursor-pointer transition-all active:scale-95 border border-red-500"
                          >
                            YA, RESET
                          </button>
                          <button
                            onClick={() => {
                              triggerClick();
                              setShowResetConfirm(false);
                            }}
                            className="bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-white/10 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg tracking-widest uppercase cursor-pointer transition-all active:scale-95"
                          >
                            BATAL
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gigantic visual clock with TIMER 1 & TIMER 2 */}
                  <div className={`border-t border-purple-500/10 transition-all relative grid grid-cols-2 items-center ${isFullscreen ? 'py-1.5' : 'py-3'}`}>
                    {/* TIMER 1 */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">TIMER 1</span>
                      <span className={`font-black font-mono text-amber-400 tracking-wider transition-all duration-300 leading-none ${
                        isFullscreen ? 'text-2xl md:text-3xl lg:text-3.5xl' : 'text-4xl'
                      }`}>
                        {Math.floor(matchState.sisaWaktu / 60).toString().padStart(2, '0')}:{(matchState.sisaWaktu % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* Soft Neon Yellow vertical divider line */}
                    <div className="absolute inset-y-2 left-1/2 w-[1.5px] bg-yellow-400/50 shadow-[0_0_6px_rgba(250,204,21,0.6)]" />

                    {/* TIMER 2 */}
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-yellow-300 tracking-wider uppercase mb-0.5">TIMER 2</span>
                      <span className={`font-black font-mono text-yellow-300 tracking-wider transition-all duration-300 leading-none ${
                        isFullscreen ? 'text-2xl md:text-3xl lg:text-3.5xl' : 'text-4xl'
                      } ${matchState.timerBerjalan ? 'animate-pulse' : ''}`}>
                        {Math.floor((matchState.timer2Value || 0) / 60).toString().padStart(2, '0')}:{((matchState.timer2Value || 0) % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Cockpit buttons (Play, Stop, Reset, Change Round) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={toggleTimer}
                      disabled={isCurrentMatchArchived || (!matchState.timerBerjalan && (matchState.timerPlayLocked || (isSeniMatch && !matchState.activeCorner)))}
                      className={`rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all ${
                        isFullscreen ? 'py-2 text-[11px]' : 'py-3 text-xs'
                      } ${
                        matchState.timerBerjalan
                          ? 'bg-red-700 hover:bg-red-600 text-white'
                          : (isCurrentMatchArchived || (!matchState.timerBerjalan && (matchState.timerPlayLocked || (isSeniMatch && !matchState.activeCorner))))
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-50 cursor-not-allowed'
                          : 'bg-green-700 hover:bg-green-650 text-white'
                      }`}
                    >
                      {matchState.timerBerjalan ? (
                        <>
                          <Square className="w-4 h-4 fill-current" />
                          STOP
                        </>
                      ) : isCurrentMatchArchived ? (
                        <>
                          <Lock className="w-4 h-4 text-slate-500" />
                          ARSIP (KUNCI)
                        </>
                      ) : (!matchState.timerBerjalan && matchState.timerPlayLocked) ? (
                        <>
                          <Lock className="w-4 h-4 text-slate-500" />
                          LOCKED
                        </>
                      ) : (!matchState.timerBerjalan && isSeniMatch && !matchState.activeCorner) ? (
                        <>
                          <Lock className="w-4 h-4 text-slate-500" />
                          SUDUT BELUM AKTIF
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          MULAI (PLAY)
                        </>
                      )}
                    </button>

                    <button
                      onClick={resetTimer}
                      disabled={isCurrentMatchArchived}
                      className={`bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'py-2 text-[11px]' : 'py-3 text-xs'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4" />
                      RESET WAKTU
                    </button>
                  </div>

                  {/* BUTTONS: AKTIFKAN BIRU & AKTIFKAN MERAH */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      disabled={matchState.activeCorner === 'MERAH' || isCurrentMatchArchived}
                      onClick={() => {
                        if (soundEnabled) playClickSound();
                        const isCurrentlyActive = matchState.activeCorner === 'BIRU';
                        updateMatchState({
                          ...matchState,
                          activeCorner: isCurrentlyActive ? undefined : 'BIRU',
                          sisaWaktu: 0,
                          timer2Value: 0,
                          timerBerjalan: false
                        });
                        showToast(isCurrentlyActive ? "Kunci Sudut Dihapus!" : "Sudut BIRU Diaktifkan untuk Penilaian Juri!", "success");
                      }}
                      className={`uppercase tracking-wider rounded-lg border transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md active:scale-95 ${
                        isFullscreen ? 'py-2 text-[11px]' : 'py-3 text-xs'
                      } ${
                        isCurrentMatchArchived
                          ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                          : matchState.activeCorner === 'MERAH'
                            ? 'bg-slate-950 border-slate-900 text-slate-700 opacity-20 cursor-not-allowed line-through'
                            : matchState.activeCorner === 'BIRU'
                              ? 'bg-blue-600 border-blue-400/80 border-2 text-white font-black shadow-[0_0_20px_rgba(59,130,246,0.85)]'
                              : 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white font-bold cursor-pointer hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${matchState.activeCorner === 'BIRU' ? 'bg-blue-400 animate-ping shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-blue-200'}`}></span>
                      <span>{matchState.activeCorner === 'BIRU' ? 'BIRU AKTIF 👤' : 'AKTIFKAN BIRU'}</span>
                    </button>

                    <button
                      disabled={matchState.activeCorner === 'BIRU' || isCurrentMatchArchived}
                      onClick={() => {
                        if (soundEnabled) playClickSound();
                        const isCurrentlyActive = matchState.activeCorner === 'MERAH';
                        updateMatchState({
                          ...matchState,
                          activeCorner: isCurrentlyActive ? undefined : 'MERAH',
                          sisaWaktu: 0,
                          timer2Value: 0,
                          timerBerjalan: false
                        });
                        showToast(isCurrentlyActive ? "Kunci Sudut Dihapus!" : "Sudut MERAH Diaktifkan untuk Penilaian Juri!", "success");
                      }}
                      className={`uppercase tracking-wider rounded-lg border transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md active:scale-95 ${
                        isFullscreen ? 'py-2 text-[11px]' : 'py-3 text-xs'
                      } ${
                        isCurrentMatchArchived
                          ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                          : matchState.activeCorner === 'BIRU'
                            ? 'bg-slate-950 border-slate-900 text-slate-700 opacity-20 cursor-not-allowed line-through'
                            : matchState.activeCorner === 'MERAH'
                              ? 'bg-red-600 border-red-400/80 border-2 text-white font-black shadow-[0_0_20px_rgba(239,68,68,0.85)]'
                              : 'bg-red-600 hover:bg-red-500 border-red-400 text-white font-bold cursor-pointer hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${matchState.activeCorner === 'MERAH' ? 'bg-red-400 animate-ping shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-red-200'}`}></span>
                      <span>{matchState.activeCorner === 'MERAH' ? 'MERAH AKTIF 👤' : 'AKTIFKAN MERAH'}</span>
                    </button>
                  </div>

                  {/* BELL / HORN BUTTON tepat dibawah tombol MULAI & RESET WAKTU */}
                  <div className={`transition-all ${isFullscreen ? 'pt-1' : 'pt-2'}`}>
                    <button 
                      onMouseDown={() => {
                        if (soundEnabled) startBuzzer();
                      }}
                      onMouseUp={() => {
                        if (soundEnabled) stopBuzzer();
                      }}
                      onMouseLeave={() => {
                        if (soundEnabled) stopBuzzer();
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        if (soundEnabled) startBuzzer();
                      }}
                      onTouchEnd={() => {
                        if (soundEnabled) stopBuzzer();
                      }}
                      className={`w-full text-center rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-650 text-white font-extrabold tracking-wide shadow-xl shadow-purple-950/40 relative group overflow-hidden active:scale-95 transition-all outline-none user-select-none select-none ${
                        isFullscreen ? 'py-5 text-base md:text-lg border border-purple-500/30' : 'py-8 text-lg md:text-xl border border-purple-500/20'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        BELL / HORN
                        <kbd className="hidden md:inline-flex items-center text-[10px] uppercase font-mono tracking-tighter bg-black/40 px-1.5 py-0.5 rounded border border-white/10 text-purple-200">SHIFT</kbd>
                      </span>
                    </button>
                  </div>

                  {/* Grid Jumlah Juri Yang Akan Digunakan */}
                  <div className={`transition-all ${isFullscreen ? 'pt-1' : 'pt-2'}`}>
                    <label className={`text-purple-350 font-bold uppercase tracking-wider font-mono block mb-1.5 ${isFullscreen ? 'text-[10px]' : 'text-xs text-purple-300'}`}>
                      Jumlah Juri Yang Akan Digunakan
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[4, 6, 8, 10].map((juriCount) => {
                        const isSelected = (matchState.jumlahJuri || 3) === juriCount;
                        return (
                          <button
                            key={juriCount}
                            onClick={() => {
                              triggerClick();
                              updateMatchState({
                                ...matchState,
                                jumlahJuri: juriCount
                              });
                            }}
                            className={`font-bold rounded-lg transition-all duration-350 cursor-pointer ${
                              isFullscreen ? 'py-1 text-[11px]' : 'py-2 text-xs'
                            } ${
                              isSelected 
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-2 border-purple-400 scale-[1.05] shadow-[0_0_15px_rgba(168,85,247,0.65)] text-white font-extrabold' 
                                : 'bg-[#0f041d] border border-purple-950/60 text-slate-400 hover:bg-[#1a082e] hover:text-white'
                            }`}
                          >
                            {juriCount} Juri
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Unduh PDF Partai yang Sedang Berlangsung */}
                  <div className={`transition-all border-t border-purple-500/10 ${isFullscreen ? 'pt-1.5' : 'pt-2.5'}`}>
                    <button
                      onClick={() => {
                        if (soundEnabled) playPointSound();
                        downloadMatchPDF(matchState);
                      }}
                      className={`w-full py-2 px-3 rounded-lg bg-gradient-to-r from-red-805 to-purple-805 hover:from-red-700 hover:to-purple-700 text-white font-extrabold tracking-wider border border-purple-500/45 uppercase cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isFullscreen ? 'text-[9px]' : 'text-[11px]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-red-400" />
                      Unduh PDF (Partai Sedang Berjalan)
                    </button>
                  </div>
                </div>

                {/* Match History, downloading, and deleting */}
                <div className={`bg-[#120822] border border-purple-900/30 transition-all ${
                  isFullscreen ? 'p-3 space-y-2 flex-1 flex flex-col justify-between min-h-0' : 'p-5 space-y-3'
                }`}>
                  <div className={`flex justify-between items-center border-b border-purple-900/30 ${
                    isFullscreen ? 'pb-1' : 'pb-2'
                  }`}>
                    <h3 className={`font-bold text-white flex items-center gap-1.5 ${
                      isFullscreen ? 'text-xs' : 'text-sm'
                    }`}>
                      <Layers className="w-4 h-4 text-purple-400" />
                      Histori Hasil Tanding
                    </h3>
                    <div className="flex gap-1.5">
                      <button
                        title="Unduh Semua PDF (ZIP)"
                        onClick={async () => {
                          if (soundEnabled) playPointSound();
                          if (history.length === 0) {
                            showToast("Histori kosong, tidak ada dokumen untuk diunduh!", "warning");
                            return;
                          }
                          try {
                            showToast("Sedang mengunduh dokumen PDF ke ZIP...", "info");
                            await downloadAllHistoryPDFsAsZip(history);
                            showToast("Semua dokumen PDF berhasil diunduh!", "success");
                          } catch (error: any) {
                            console.error(error);
                            showToast(error.message || "Gagal mengunduh file ZIP", "warning");
                          }
                        }}
                        className="py-1 px-2 bg-purple-950 hover:bg-purple-900 rounded text-[9px] text-purple-300 font-bold font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-95 uppercase"
                      >
                        <FileArchive className="w-3 h-3 text-purple-400" /> Arsipkan (ZIP)
                      </button>
                      <button
                        onClick={() => {
                          triggerClick();
                          if (history.length === 0) {
                            showToast('Sejarah kosong!', 'warning');
                            return;
                          }
                          exportHistoryToExcel(history);
                        }}
                        className="py-1 px-2 bg-green-950 hover:bg-green-900 text-green-300 rounded text-[9px] font-bold font-mono flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> EXCEL
                      </button>
                    </div>
                  </div>

                  <div className={`overflow-y-auto space-y-2 pr-1 ${
                    isFullscreen ? 'flex-1 scrollbar-thin' : 'max-h-48'
                  }`}>
                    {history.length === 0 ? (
                      <div className={`text-center text-slate-500 font-mono ${isFullscreen ? 'py-2 text-[10px]' : 'py-6 text-xs'}`}>
                        Belum ada sejarah tanding diarsipkan.
                      </div>
                    ) : (
                      history.slice().reverse().map((h, hIdx) => {
                        const isSelected = selectedHistoryId === h.id || (selectedHistoryId === null && hIdx === 0);
                        const isHPool = h.sistemTanding === 'POOL' || 
                                        h.kelas?.toUpperCase().includes('POOL') || 
                                        h.atlitMerah?.nama === '---' || 
                                        h.atlitBiru?.nama === '---' ||
                                        !h.atlitMerah?.nama ||
                                        !h.atlitBiru?.nama;
                        const hActiveCorner: 'BIRU' | 'MERAH' = (h.atlitBiru?.nama && h.atlitBiru?.nama !== '---') ? 'BIRU' : 'MERAH';
                        const activeAtlit = hActiveCorner === 'BIRU' ? h.atlitBiru : h.atlitMerah;
                        const activeScore = hActiveCorner === 'BIRU' ? h.skorAkhirBiru : h.skorAkhirMerah;

                        return (
                          <div 
                            key={`${h.id || hIdx}-${hIdx}`} 
                            onClick={() => {
                              if (soundEnabled) playClickSound();
                              setSelectedHistoryId(h.id);
                            }}
                            className={`p-2.5 rounded-lg text-xs space-y-1 transition-all duration-350 cursor-pointer ${
                              isSelected 
                                ? 'bg-[#150a26] border border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-[1.01]' 
                                : 'bg-[#0a0315] border border-purple-950/80 hover:bg-[#110523] hover:border-purple-900/50'
                            }`}
                          >
                          <div className="flex justify-between text-[10px] text-purple-400 font-mono">
                            <span>Partai {h.partai} • Kategori {h.kelas}</span>
                            <span>{new Date(h.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          {isHPool ? (
                            <div className="grid grid-cols-5 text-center mt-1 items-center gap-0.5">
                              <span className="col-span-3 text-indigo-300 font-bold uppercase truncate text-left">
                                {activeAtlit?.nama || 'ATLIT POOL'}
                              </span>
                              <span className="col-span-2 font-mono bg-purple-950/20 py-0.5 text-slate-300 rounded font-bold text-right pr-1">
                                {typeof activeScore === 'number' ? activeScore.toFixed(3) : activeScore} ({hActiveCorner})
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-5 text-center mt-1 items-center gap-0.5">
                              <span className="col-span-2 text-blue-300 font-bold uppercase truncate text-left">{h?.atlitBiru?.nama || 'ATLIT BIRU'}</span>
                              <span className="font-mono bg-purple-950/20 py-0.5 text-slate-300 rounded font-bold">
                                {typeof h.skorAkhirBiru === 'number' ? h.skorAkhirBiru.toFixed(3) : h.skorAkhirBiru} - {typeof h.skorAkhirMerah === 'number' ? h.skorAkhirMerah.toFixed(3) : h.skorAkhirMerah}
                              </span>
                              <span className="col-span-2 text-red-300 font-bold uppercase truncate text-right">{h?.atlitMerah?.nama || 'ATLIT MERAH'}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center border-t border-purple-950/40 pt-1.5 mt-1">
                            {isHPool ? (
                              <span className="text-[8px] uppercase tracking-wider text-green-400 font-semibold">
                                STATUS: SELESAI
                              </span>
                            ) : (
                              <span className="text-[8px] uppercase tracking-wider text-amber-400 font-semibold">
                                PEMENANG: SUDUT {h.pemenang || 'DRAFT/SERI'}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                if (soundEnabled) playPointSound();
                                downloadMatchPDF(h);
                              }}
                              className="px-2 py-0.5 bg-red-950/60 hover:bg-red-900 border border-red-500/30 rounded text-[8px] text-red-450 font-bold font-mono uppercase flex items-center gap-1 transition-all cursor-pointer hover:border-red-500/60 active:scale-95"
                            >
                              <FileText className="w-2.5 h-2.5 text-red-400" /> PDF
                            </button>
                          </div>
                        </div>
                      ); })
                    )}
                  </div>

                  {/* TOMBOL STATISTIK PERTANDINGAN */}
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      if (history.length === 0) {
                        showToast("Belum ada sejarah tanding diarsipkan untuk menampilkan statistik.", "warning");
                        return;
                      }
                      
                      const currentMatch = history.find(h => h.id === selectedHistoryId) || history[history.length - 1];
                      if (currentMatch) {
                        let defaultCorner: 'BIRU' | 'MERAH' = 'BIRU';
                        if (currentMatch.pemenang === 'BIRU' || currentMatch.pemenang === 'MERAH') {
                          defaultCorner = currentMatch.pemenang;
                        } else if (currentMatch.pemenang === 'DISK_BIRU') {
                          defaultCorner = 'BIRU';
                        } else if (currentMatch.pemenang === 'DISK_MERAH') {
                          defaultCorner = 'MERAH';
                        }
                        setActiveStatsCorner(defaultCorner);
                      }
                      setShowStatsBanner(true);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl border border-indigo-500/40 bg-indigo-950/45 hover:bg-indigo-900/45 font-extrabold uppercase tracking-wider text-indigo-300 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-indigo-500/10 ${
                      isFullscreen ? 'text-[9px] mb-1' : 'text-[11px] mb-2'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                    STATISTIK PERTANDINGAN
                  </button>

                  {history.length > 0 && (
                    !showClearHistoryConfirm ? (
                      <button
                        onClick={() => {
                          triggerClick();
                          setShowClearHistoryConfirm(true);
                        }}
                        className={`w-full text-center bg-red-950/40 hover:bg-red-950 border border-red-900/30 text-red-400 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          isFullscreen ? 'py-1 text-[9px]' : 'py-1.5 text-[10px]'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" /> Hapus Semua Sejarah
                      </button>
                    ) : (
                      <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-3 text-center space-y-2">
                        <span className="text-[10px] font-extrabold text-red-200 uppercase tracking-tight block">⚠️ HAPUS SEMUA SEJARAH TANDING?</span>
                        <p className="text-[9px] text-slate-400 leading-relaxed">Tindakan ini tidak dapat dibatalkan.</p>
                        <div className="flex gap-2 justify-center pt-1">
                          <button
                            onClick={() => {
                              if (soundEnabled) playBuzzer();
                              clearMatchHistory();
                              setHistory([]);
                              setShowClearHistoryConfirm(false);
                            }}
                            className="bg-red-650 hover:bg-red-550 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-md tracking-wider uppercase cursor-pointer transition-all active:scale-95 border border-red-500"
                          >
                            YA, HAPUS
                          </button>
                          <button
                            onClick={() => {
                              triggerClick();
                              setShowClearHistoryConfirm(false);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-md tracking-wider uppercase cursor-pointer transition-all active:scale-95"
                          >
                            BATAL
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* 🔒 Status Lisensi Button */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setShowLicenseStatusPopup(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 font-bold uppercase tracking-wider text-[10px] text-purple-300 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    STATUS LISENSI
                  </button>
                </div>

              </div>

            </div>

            {/* Accidental Round End Prompt inside Secretary view */}
            <AnimatePresence>
              {matchState.showRoundEndPopUp && !matchState.showMatchEndPopUp && (
                peekRoundEnd ? (
                  <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-purple-900/90 to-slate-900/90 border-2 border-purple-500/60 p-3 rounded-xl flex items-center justify-between text-white shadow-[0_0_30px_rgba(168,85,247,0.3)] z-50 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-650/30 text-purple-400 flex items-center justify-center animate-pulse">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black tracking-wider uppercase font-mono">BABAK {matchState.babakAktif} SELESAI</p>
                        <p className="text-[10px] text-gray-300">Skor Sementara: <span className="font-bold text-red-550">M {calculateFinalScore('MERAH', matchState)}</span> - <span className="font-bold text-blue-500">B {calculateFinalScore('BIRU', matchState)}</span> | Klik tombol kanan untuk dewan juri</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setPeekRoundEnd(false)}
                      className="px-3 py-1 bg-purple-700 hover:bg-purple-600 active:scale-95 text-[10px] font-extrabold uppercase tracking-widest rounded-lg cursor-pointer transition-all border border-purple-400"
                    >
                      Buka Overlay
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-center"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 15 }}
                      transition={{ type: "spring", damping: 25, stiffness: 180 }}
                      className="bg-[#120722] border-2 border-purple-500 p-8 rounded-3xl max-w-4xl w-full shadow-[0_0_50px_rgba(168,85,247,0.4)] relative overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 text-left items-stretch"
                    >
                      {/* Decorative gradient header bar */}
                      <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 animate-pulse"></div>

                      {/* Left Column: Round Status Info & Intip Button */}
                      <div className="flex flex-col justify-between space-y-6 h-full text-center md:text-left">
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-purple-950/80 text-purple-450 border border-purple-500/55 rounded-full flex items-center justify-center mx-auto md:mx-0 shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-pulse">
                            <Clock className="w-8 h-8 animate-bounce" />
                          </div>
                          <div>
                            <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-tight font-sans">
                              {(() => {
                                const isSeniMatch = ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kelas) || ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kategoriSeni);
                                if (isSeniMatch) {
                                  return matchState.hasPerformedBIRU && matchState.hasPerformedMERAH ? "PARTAI SELESAI" : "WAKTU TAMPIL SELESAI";
                                }
                                return `BABAK ${matchState.babakAktif} SELESAI`;
                              })()}
                            </h3>
                            <p className="text-purple-450 text-[10px] tracking-widest uppercase font-mono font-bold animate-pulse mt-1">
                              {(() => {
                                const isSeniMatch = ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kelas) || ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kategoriSeni);
                                if (isSeniMatch) {
                                  return matchState.hasPerformedBIRU && matchState.hasPerformedMERAH ? "SELURUH PENAMPILAN SELESAI" : "SUDUT AKTIF SELESAI";
                                }
                                return "WAKTU MATCH HABIS";
                              })()}
                            </p>
                          </div>

                          <div className="p-4 bg-purple-950/25 border border-purple-900/40 rounded-xl text-left">
                            <span className="text-[9px] font-extrabold text-purple-400 tracking-widest uppercase block mb-1">Rekomendasi Transisi</span>
                            <p className="text-[10px] text-slate-300 leading-relaxed">
                              Skor sudut {calculateFinalScore('MERAH', matchState) > calculateFinalScore('BIRU', matchState) ? 'MERAH memimpin sementara' : calculateFinalScore('BIRU', matchState) > calculateFinalScore('MERAH', matchState) ? 'BIRU memimpin sementara' : 'SAMA KUAT/DRAW'}. Pilih <span className="font-semibold text-white">Ya</span> di panel sebelah kanan setelah dewan juri siap.
                            </p>
                          </div>

                          {/* GRID INFORMASI PARTAI SELANJUTNYA */}
                          {(() => {
                            const nextMatch = getNextMatchInfo();
                            return (
                              <div className="p-4 bg-[#110524]/80 border border-purple-500/30 rounded-2xl text-left space-y-2">
                                <div className="flex items-center justify-between border-b border-purple-500/20 pb-1.5">
                                  <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase flex items-center gap-1">
                                    ⏭️ {matchState.sistemTanding === 'POOL' ? 'PENAMPILAN' : 'PARTAI'} SELANJUTNYA (UPCOMING)
                                  </span>
                                  {nextMatch && (
                                    <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">
                                      {matchState.sistemTanding === 'POOL' ? 'Tampil' : 'Partai'} {nextMatch.partai}
                                    </span>
                                  )}
                                </div>
                                {nextMatch ? (
                                  (() => {
                                    const isNextPool = nextMatch.merah?.nama === '---' || nextMatch.biru?.nama === '---';
                                    const showBiru = !isNextPool || nextMatch.biru?.nama !== '---';
                                    const showMerah = !isNextPool || nextMatch.merah?.nama !== '---';
                                    return (
                                      <div className={`grid ${isNextPool ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pt-1`}>
                                        {/* Atlit Biru Corner */}
                                        {showBiru && (
                                          <div className="bg-gradient-to-r from-blue-900/80 to-transparent border-l-4 border-blue-500 shadow-lg p-2.5 rounded-xl flex flex-col justify-between">
                                            <div>
                                              <span className="text-[8px] font-bold text-blue-400 tracking-wider uppercase block">SUDUT BIRU</span>
                                              <span className="text-xs font-bold text-white truncate block mt-0.5">{nextMatch.biru.nama}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400 mt-1 uppercase truncate block">{nextMatch.biru.kontingen}</span>
                                          </div>
                                        )}

                                        {/* Atlit Merah Corner */}
                                        {showMerah && (
                                          <div className="bg-gradient-to-br from-red-900/80 to-transparent border-l-4 border-red-500 shadow-lg p-2.5 rounded-xl flex flex-col justify-between">
                                            <div>
                                              <span className="text-[8px] font-bold text-red-400 tracking-wider uppercase block">SUDUT MERAH</span>
                                              <span className="text-xs font-bold text-white truncate block mt-0.5">{nextMatch.merah.nama}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400 mt-1 uppercase truncate block">{nextMatch.merah.kontingen}</span>
                                          </div>
                                        )}

                                        {/* Match Parameter Metadata Grid */}
                                        <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-2 bg-purple-950/30 border border-purple-500/10 p-2 rounded-lg text-[9px] text-purple-300 font-mono">
                                          <div>
                                            <span className="text-purple-400 font-bold block">KATEGORI:</span>
                                            <span className="text-white font-extrabold">{nextMatch.kelas}</span>
                                          </div>
                                          <div>
                                            <span className="text-purple-400 font-bold block">GENDER:</span>
                                            <span className="text-white font-extrabold">{nextMatch.gender}</span>
                                          </div>
                                          <div>
                                            <span className="text-purple-400 font-bold block">TAHAPAN:</span>
                                            <span className="text-white font-extrabold truncate block">{nextMatch.tahapPertandingan}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <div className="py-2 text-center text-[10px] text-zinc-500 font-mono italic">
                                    Tidak ada partai selanjutnya yang terdaftar di database Excel.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex justify-center md:justify-start pt-2 border-t border-purple-500/5">
                          <button
                            onClick={() => setPeekRoundEnd(true)}
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            Intip Lembar Ringkasan Nilai &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Comparison & Decisions */}
                      <div className="flex flex-col justify-center space-y-4 h-full border-t md:border-t-0 md:border-l border-purple-500/15 pt-6 md:pt-0 md:pl-8">
                        {/* STATS COMPARISON BOX */}
                        <div className={`grid ${isPoolSystem ? 'grid-cols-1' : 'grid-cols-2'} gap-4 py-1`}>
                          {/* Blue Corner Info */}
                          {(!isPoolSystem || (matchState?.atlitBiru?.nama && matchState.atlitBiru.nama !== '---')) && (
                            <div className="bg-gradient-to-r from-blue-900/80 to-transparent border-l-4 border-blue-500 shadow-xl p-4 rounded-2xl text-left relative overflow-hidden flex flex-col justify-between shadow-inner">
                              <div className="absolute right-[-8px] bottom-[-8px] font-black text-5xl text-blue-950/10 select-none">B</div>
                              <div className="z-10">
                                <span className="text-[9px] font-extrabold tracking-widest text-blue-400 uppercase block mb-0.5">SUDUT BIRU</span>
                                <span className="text-xs font-bold text-white truncate block">{matchState?.atlitBiru?.nama || 'Pesilat Biru'}</span>
                              </div>
                              <div className="mt-3 flex items-baseline justify-between z-10">
                                <span className="text-[10px] text-zinc-400">Total Skor</span>
                                <span className="text-xl font-black text-blue-500">{calculateFinalScore('BIRU', matchState)}</span>
                              </div>
                            </div>
                          )}

                          {/* Red Corner Info */}
                          {(!isPoolSystem || (matchState?.atlitMerah?.nama && matchState.atlitMerah.nama !== '---')) && (
                            <div className="bg-gradient-to-br from-red-900/80 to-transparent border-l-4 border-red-500 shadow-xl p-4 rounded-2xl text-left relative overflow-hidden flex flex-col justify-between shadow-inner">
                              <div className="absolute right-[-8px] bottom-[-8px] font-black text-5xl text-red-950/10 select-none">M</div>
                              <div className="z-10">
                                <span className="text-[9px] font-extrabold tracking-widest text-red-400 uppercase block mb-0.5">SUDUT MERAH</span>
                                <span className="text-xs font-bold text-white truncate block">{matchState?.atlitMerah?.nama || 'Pesilat Merah'}</span>
                              </div>
                              <div className="mt-3 flex items-baseline justify-between z-10">
                                <span className="text-[10px] text-zinc-400">Total Skor</span>
                                <span className="text-xl font-black text-red-500">{calculateFinalScore('MERAH', matchState)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* KUNCI PANEL JURI CONTROLS (BABAK 1 dan 2) */}
                        <div className="border border-purple-500/20 bg-purple-950/25 p-4 rounded-2xl flex flex-col items-center gap-2.5 text-center">
                          <span className="text-[10px] font-extrabold tracking-widest text-amber-400 font-mono block uppercase animate-pulse">
                            🔒 MONITOR JURI SINKRON
                          </span>
                          {matchState.juriTerkunci ? (
                            <div className="w-full py-2 px-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 uppercase tracking-wide">
                              <Lock className="w-3.5 h-3.5" /> JURI TELAH DIKUNCI
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                triggerClick();
                                updateMatchState({
                                  ...matchState,
                                  juriTerkunci: true
                                });
                                showToast("Sukses Mengunci Panel Juri untuk Babak ini!", "success");
                              }}
                              className="w-full py-2 px-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl border border-red-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                            >
                              <Lock className="w-3.5 h-3.5 animate-pulse" /> KUNCI PANEL JURI
                            </button>
                          )}
                          <p className="text-[9px] text-zinc-400 font-sans font-medium">
                            *Jika belum ditekan, layar Panel Juri tidak akan terkunci dan juri masih bisa memantau.
                          </p>
                        </div>

                        {(() => {
                          const isSeniMatch = ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kelas) || ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kategoriSeni);
                          if (isSeniMatch) {
                            const finishedCorner = matchState.hasPerformedBIRU && !matchState.hasPerformedMERAH ? 'BIRU' : 'MERAH';
                            const nextCorner = finishedCorner === 'BIRU' ? 'MERAH' : 'BIRU';
                            return (
                              <>
                                <div className="bg-purple-950/40 border border-purple-500/20 p-4 rounded-2xl text-center space-y-3">
                                  <span className="text-amber-400 font-mono text-[10px] uppercase font-bold tracking-widest block animate-pulse">
                                    WAKTU TAMPIL SELESAI
                                  </span>
                                  <h4 className="text-white text-sm font-bold leading-snug font-sans">
                                    {isPoolSystem ? (
                                      (() => {
                                        const matches = matchState.partai ? matchState.partai.match(/\d+/) : null;
                                        const currentPartaiNum = matches ? parseInt(matches[0], 10) : 1;
                                        return `Apakah Akan Melanjutkan Penampil ${currentPartaiNum + 1}?`;
                                      })()
                                    ) : (
                                      <>Waktu Tampil Sudut <span className={finishedCorner === 'BIRU' ? 'text-blue-400 font-black' : 'text-red-400 font-black'}>{finishedCorner}</span> Selesai, lanjutkan untuk Penampilan Sudut <span className={nextCorner === 'BIRU' ? 'text-blue-400 font-black' : 'text-red-400 font-black'}>{nextCorner}</span>?</>
                                    )}
                                  </h4>
                                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                                    {isPoolSystem ? (
                                      <>Memilih <span className="font-bold text-white">Ya</span> akan menyimpan hasil penampil saat ini dan otomatis memuat data Penampil berikutnya.</>
                                    ) : (
                                      <>Memilih <span className="font-bold text-white">Ya</span> akan mereset timer secara otomatis, mengaktifkan sudut {nextCorner}, dan mengunci tombol lainnya.</>
                                    )}
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    id="btn-confirm-tidak"
                                    onClick={() => {
                                      triggerClick();
                                      updateMatchState({
                                        ...matchState,
                                        showRoundEndPopUp: false
                                      });
                                      showToast("Batal Lanjut.", "info");
                                    }}
                                    className="flex-1 py-3 px-4 bg-[#1b102f] hover:bg-[#2c1c4d] border border-purple-500/30 text-purple-300 font-extrabold text-xs rounded-xl tracking-wider uppercase cursor-pointer transition-all active:scale-95 text-center font-sans"
                                  >
                                    TIDAK
                                  </button>
                                  
                                  <button
                                    id="btn-confirm-ya"
                                    onClick={() => {
                                      triggerClick();
                                      playClickSound();

                                      if (isPoolSystem) {
                                        const excelDataStr = localStorage.getItem("silat_excel_matches") || "";
                                        const normalizePartai = (p: any): string => {
                                          if (p === undefined || p === null) return "";
                                          return p.toString().trim().replace(/^(partai|PARTAI)\s*/i, "").toLowerCase();
                                        };
                                        // 1. Archive current completed match
                                        const record: PastMatch = {
                                          id: uuid(),
                                          eventName: matchState.eventName,
                                          partai: matchState.partai,
                                          kelas: matchState.kelas,
                                          gender: matchState.gender,
                                          kategoriUsia: matchState.kategoriUsia || "REMAJA",
                                          tahapPertandingan: matchState.tahapPertandingan || "PENYISIHAN",
                                          tempatPelaksanaan: matchState.tempatPelaksanaan,
                                          waktuPelaksanaan: matchState.waktuPelaksanaan,
                                          atlitMerah: matchState.atlitMerah,
                                          atlitBiru: matchState.atlitBiru,
                                          skorAkhirMerah: calculateFinalScore('MERAH', matchState),
                                          skorAkhirBiru: calculateFinalScore('BIRU', matchState),
                                          pemenang: determineWinner(matchState),
                                          timestamp: Date.now(),
                                          rawScores: matchState.rawScores,
                                          validatedScores: matchState.validatedScores,
                                          penaltiesMerah: matchState.penaltiesMerah,
                                          penaltiesBiru: matchState.penaltiesBiru,
                                          accumulatedPenaltyMerah: matchState.accumulatedPenaltyMerah,
                                          accumulatedPenaltyBiru: matchState.accumulatedPenaltyBiru,
                                          historyPenaltiesMerah: matchState.historyPenaltiesMerah,
                                          historyPenaltiesBiru: matchState.historyPenaltiesBiru,
                                          diskualifikasi: matchState.diskualifikasi,
                                          logoKiri: matchState.logoKiri,
                                          logoKanan: matchState.logoKanan,
                                          wmpWon: matchState.wmpWon,
                                          wmpPemenang: matchState.wmpPemenang,
                                          kategoriSeni: matchState.kategoriSeni,
                                          seniScores: matchState.seniScores,
                                          durasiTampilMERAH: matchState.durasiTampilMERAH,
                                          durasiTampilBIRU: matchState.durasiTampilBIRU,
                                          durasiBabak: matchState.durasiBabak,
                                          sistemTanding: matchState.sistemTanding,
                                          jumlahJuri: matchState.jumlahJuri
                                        };
                                        const newHistory = [...history, record];
                                        setHistory(newHistory);
                                        saveMatchHistory(newHistory);

                                        // 2. Clear & Prepare for Next Partai
                                        let targetPartai = "1";
                                        if (matchState.partai) {
                                          const matches = matchState.partai.match(/\d+/);
                                          if (matches) {
                                            const num = parseInt(matches[0], 10);
                                            targetPartai = matchState.partai.replace(matches[0], (num + 1).toString());
                                          } else {
                                            targetPartai = (parseInt(matchState.partai, 10) || 0) + 1 + "";
                                          }
                                        }

                                        let nextAtlitMerah = { nama: "", kontingen: "" };
                                        let nextAtlitBiru = { nama: "", kontingen: "" };
                                        let nextKelas = matchState.kelas;
                                        let nextGender = matchState.gender;
                                        let nextEventName = matchState.eventName;
                                        let nextKategoriUsia = matchState.kategoriUsia || 'REMAJA';
                                        let nextTahapPertandingan = matchState.tahapPertandingan || 'PENYISIHAN';
                                        let nextDurasi = matchState.durasiBabak;

                                        if (excelDataStr) {
                                          try {
                                            const excelMatches = JSON.parse(excelDataStr);
                                            if (Array.isArray(excelMatches)) {
                                              const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                                              if (matchRow) {
                                                nextAtlitMerah = {
                                                  nama: (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase(),
                                                  kontingen: (matchRow['Kontingen Merah'] || "").toString().toUpperCase()
                                                };
                                                nextAtlitBiru = {
                                                  nama: (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase(),
                                                  kontingen: (matchRow['Kontingen Biru'] || "").toString().toUpperCase()
                                                };
                                                if (matchRow['Kelas']) nextKelas = matchRow['Kelas'].toString().toUpperCase();
                                                if (matchRow['Gender']) nextGender = matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                                
                                                if (matchRow['Kategori Usia']) {
                                                  let kUsia = matchRow['Kategori Usia'].toString().trim().toUpperCase();
                                                  if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                                    kUsia = 'PRA REMAJA';
                                                  }
                                                  nextKategoriUsia = kUsia;
                                                  
                                                  if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                                                    nextDurasi = 90;
                                                  } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                                                    nextDurasi = 120;
                                                  } else if (kUsia === 'MASTER A') {
                                                    nextDurasi = 90;
                                                  } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                                                    nextDurasi = 60;
                                                  }
                                                }
                                                if (matchRow['Tahap Pertandingan']) {
                                                  nextTahapPertandingan = matchRow['Tahap Pertandingan'].toString().trim().toUpperCase();
                                                }
                                                let finalDur = ((nextKelas || "").toUpperCase() === "TUNGGAL BEBAS" || (nextKelas || "").toUpperCase() === "GANDA" || (nextKelas || "").toUpperCase() === "REGU")
                                                  ? (nextTahapPertandingan === "FINAL" ? 180 : 90)
                                                  : (nextTahapPertandingan === "FINAL" ? 180 : (nextTahapPertandingan === "SEMI FINAL" || nextTahapPertandingan === "SEMIFINAL" ? 100 : 80));
                                                nextDurasi = finalDur;

                                                if (matchRow['Durasi Babak (Menit)']) {
                                                  const durStr = matchRow['Durasi Babak (Menit)'].toString().trim().replace('.', ':');
                                                  if (durStr.includes(':')) {
                                                    const parts = durStr.split(':');
                                                    const mins = parseInt(parts[0], 10) || 0;
                                                    let secsStr = parts[1] || "0";
                                                    if (secsStr.length === 1) {
                                                      secsStr = secsStr + "0";
                                                    }
                                                    const secs = parseInt(secsStr, 10) || 0;
                                                    nextDurasi = (mins * 60) + secs;
                                                  } else {
                                                    const parsedSecs = parseInt(durStr, 10);
                                                    if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                                      if (parsedSecs < 10) {
                                                        nextDurasi = parsedSecs * 60;
                                                      } else {
                                                        nextDurasi = parsedSecs;
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }

                                        updateMatchState({
                                          ...matchState,
                                          partai: targetPartai,
                                          kelas: nextKelas,
                                          gender: nextGender,
                                          eventName: nextEventName,
                                          kategoriUsia: nextKategoriUsia,
                                          tahapPertandingan: nextTahapPertandingan,
                                          durasiBabak: nextDurasi,
                                          sisaWaktu: 0,
                                          timer2Value: 0,
                                          timerPlayLocked: false,
                                          statusPertandingan: 'BELUM_MULAI',
                                          timerBerjalan: false,
                                          validatedScores: [],
                                          rawScores: [],
                                          penaltiesMerah: {
                                            binaan1: false, binaan2: false,
                                            teguran1: false, teguran2: false,
                                            peringatan1: false, peringatan2: false,
                                          },
                                          penaltiesBiru: {
                                            binaan1: false, binaan2: false,
                                            teguran1: false, teguran2: false,
                                            peringatan1: false, peringatan2: false,
                                          },
                                          accumulatedPenaltyMerah: 0,
                                          accumulatedPenaltyBiru: 0,
                                          historyPenaltiesMerah: {},
                                          historyPenaltiesBiru: {},
                                          babakAktif: 1,
                                          diskualifikasi: null,
                                 diskualifikasiReason: null,
                                 autoDiskReason: null,
                                          pemenang: null,
                                          victoryType: undefined,
                                          verifikasi: {
                                            id: "", status: 'IDLE', jenis: 'JATUHAN', juriVotes: {}, result: null
                                          },
                                          showRoundEndPopUp: false,
                                          showMatchEndPopUp: false,
                                          juriTerkunci: false,
                                          umumkanPemenang: false,
                                          atlitMerah: nextAtlitMerah,
                                          atlitBiru: nextAtlitBiru,
                                          activeCorner: undefined,
                                          seniScores: {
                                            MERAH: createDefaultCornerSeni(),
                                            BIRU: createDefaultCornerSeni(),
                                          },
                                          hasPerformedBIRU: false,
                                          hasPerformedMERAH: false,
                                          durasiTampilMERAH: 0,
                                          durasiTampilBIRU: 0,
                                          dewanConfirmedLanjutPool: false
                                        });

                                        setLocalPartai(targetPartai);
                                        setLocalKelas(nextKelas);
                                        setLocalAtlitMerahNama(nextAtlitMerah.nama);
                                        setLocalAtlitMerahKontingen(nextAtlitMerah.kontingen);
                                        setLocalAtlitBiruNama(nextAtlitBiru.nama);
                                        setLocalAtlitBiruKontingen(nextAtlitBiru.kontingen);

                                        showToast(`Lanjut ke Penampil berikutnya (Partai ${targetPartai})`, "success");
                                      } else {
                                        updateMatchState({
                                          ...matchState,
                                          activeCorner: nextCorner,
                                          sisaWaktu: 0,
                                          timer2Value: 0,
                                          timerPlayLocked: false,
                                          showRoundEndPopUp: false,
                                          timerBerjalan: false,
                                          juriTerkunci: false
                                        });
                                        showToast(`Sudut ${nextCorner} diaktifkan secara otomatis!`, "success");
                                      }
                                    }}
                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase cursor-pointer transition-all active:scale-95 text-center shadow-[0_0_12px_rgba(147,51,234,0.3)] border border-purple-400/30 font-sans"
                                  >
                                    YA
                                  </button>
                                </div>
                              </>
                            );
                          }

                          return (
                            <>
                              <div className="bg-purple-950/40 border border-purple-500/20 p-4 rounded-2xl text-center space-y-3">
                                <span className="text-amber-400 font-mono text-[10px] uppercase font-bold tracking-widest block animate-pulse">KONFIRMASI TRANSISI BABAK</span>
                                <h4 className="text-white text-sm font-bold leading-snug">
                                  Apakah Anda yakin ingin melanjutkan pertandingan ke <span className="text-green-400 font-bold bg-green-950/60 px-2 py-0.5 rounded border border-green-805">BABAK {Math.min(getMaxRounds(matchState.kategoriUsia), matchState.babakAktif + 1)}</span>?
                                </h4>
                                <p className="text-[10px] text-zinc-400 leading-relaxed">
                                  Pilihan ini menghindari kesalahan penekanan babak oleh sekretaris. Seluruh panel juri dan dewan akan disinkronkan otomatis.
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  id="btn-confirm-tidak"
                                  onClick={() => {
                                    triggerClick();
                                    updateMatchState({
                                      ...matchState,
                                      showRoundEndPopUp: false
                                    });
                                    showToast("Batal Lanjut, Tetap di Babak Saat Ini.", "info");
                                  }}
                                  className="flex-1 py-3 px-4 bg-[#1b102f] hover:bg-[#2c1c4d] border border-purple-500/30 text-purple-300 font-extrabold text-xs rounded-xl tracking-wider uppercase cursor-pointer transition-all active:scale-95 text-center"
                                >
                                  TIDAK
                                </button>
                                
                                <button
                                  id="btn-confirm-ya"
                                  onClick={() => {
                                    triggerClick();
                                    const nextRound = Math.min(getMaxRounds(matchState.kategoriUsia), matchState.babakAktif + 1) as 1 | 2 | 3 | 4;
                                    const currentRound = matchState.babakAktif;

                                    let newPenaltiesMerah = { ...matchState.penaltiesMerah };
                                    let newPenaltiesBiru = { ...matchState.penaltiesBiru };
                                    let newAccumulatedPenaltyMerah = matchState.accumulatedPenaltyMerah || 0;
                                    let newAccumulatedPenaltyBiru = matchState.accumulatedPenaltyBiru || 0;

                                    if (nextRound > currentRound) {
                                      let extraMerah = 0;
                                      if (matchState.penaltiesMerah.teguran1) extraMerah += 1;
                                      if (matchState.penaltiesMerah.teguran2) extraMerah += 2;

                                      let extraBiru = 0;
                                      if (matchState.penaltiesBiru.teguran1) extraBiru += 1;
                                      if (matchState.penaltiesBiru.teguran2) extraBiru += 2;

                                      newAccumulatedPenaltyMerah += extraMerah;
                                      newAccumulatedPenaltyBiru += extraBiru;

                                      newPenaltiesMerah = {
                                        ...newPenaltiesMerah,
                                        binaan1: false,
                                        binaan2: false,
                                        teguran1: false,
                                        teguran2: false,
                                      };
                                      newPenaltiesBiru = {
                                        ...newPenaltiesBiru,
                                        binaan1: false,
                                        binaan2: false,
                                        teguran1: false,
                                        teguran2: false,
                                      };
                                    }

                                    updateMatchState({
                                      ...matchState,
                                      babakAktif: nextRound,
                                      sisaWaktu: 0,
                                      showRoundEndPopUp: false,
                                      timerBerjalan: false,
                                      accumulatedPenaltyMerah: newAccumulatedPenaltyMerah,
                                      accumulatedPenaltyBiru: newAccumulatedPenaltyBiru,
                                      penaltiesMerah: newPenaltiesMerah,
                                      penaltiesBiru: newPenaltiesBiru,
                                      juriTerkunci: false,
                                      umumkanPemenang: false,
                                    });
                                    showToast(`Sukses Lanjut ke Babak ${nextRound}!`, "success");
                                  }}
                                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase cursor-pointer active:scale-95 transition-all text-center border border-green-500/30"
                                >
                                  YA
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  </motion.div>
                )
              )}
            </AnimatePresence>

            {/* WINNER POPUP ANNOUNCEMENT FOR SEKRETARIS */}
            <AnimatePresence>
              {(matchState.showMatchEndPopUp || matchState.diskualifikasi || (isPoolSystem && matchState.dewanConfirmedLanjutPool)) && (() => {
              const isSeniMatch = ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kelas) || ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kategoriSeni);
              
              const poolRanked = getPoolLeaderboard();
              const performedCount = poolRanked.filter(ath => ath.hasPerformed).length;
              const totalPoolAthletes = poolRanked.length;
              const isPoolFullyCompleted = isPoolSystem && poolRanked.every(ath => ath.hasPerformed);

              // Calculate nextPartai and look up if there is next match
              let nextPartai = "1";
              if (matchState.partai) {
                const matches = matchState.partai.match(/\d+/);
                if (matches) {
                  const num = parseInt(matches[0], 10);
                  nextPartai = matchState.partai.replace(matches[0], (num + 1).toString());
                } else {
                  nextPartai = (parseInt(matchState.partai, 10) || 0) + 1 + "";
                }
              }

              const normalizePartai = (p: any): string => {
                if (p === undefined || p === null) return '';
                const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                const matched = str.match(/\d+/);
                if (matched) {
                  return parseInt(matched[0], 10).toString();
                }
                return str;
              };

              const excelDataStr = localStorage.getItem('silat_excel_matches');
              let foundExcel = false;
              if (excelDataStr) {
                try {
                  const excelMatches = JSON.parse(excelDataStr);
                  if (Array.isArray(excelMatches)) {
                    const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(nextPartai));
                    if (matchRow) {
                      foundExcel = true;
                    }
                  }
                } catch (err) {
                  console.error(err);
                }
              }

              const noMoreMatches = !foundExcel;

              const isDqOrUdInPool = isPoolSystem && 
                (!!matchState.diskualifikasi || matchState.victoryType === 'UNDUR_DIRI') && 
                matchState.dewanConfirmedLanjutPool && 
                role === 'SEKRETARIS';

              if (isDqOrUdInPool) {
                const matches = matchState.partai ? matchState.partai.match(/\d+/) : null;
                const currentPartaiNum = matches ? parseInt(matches[0], 10) : 1;

                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-[#00000ef9] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 15 }}
                      transition={{ type: "spring", damping: 25, stiffness: 180 }}
                      className="bg-[#120722] border-2 border-teal-500 p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(20,184,166,0.3)] relative overflow-hidden flex flex-col items-center space-y-6 text-center"
                    >
                      {/* Decorative gradient header bar */}
                      <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 animate-pulse"></div>

                      <div className="w-16 h-16 bg-teal-950/80 text-teal-400 border border-teal-500/55 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.2)] animate-pulse shrink-0">
                        <Sparkles className="w-8 h-8 text-teal-400" />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-teal-400 uppercase font-bold tracking-widest font-mono">PANEL SEKRETARIS - SISTEM POOL</span>
                        <h3 className="text-2xl font-black text-white tracking-tight uppercase">PENAMPILAN SELESAI (PENAMPIL {currentPartaiNum})</h3>
                      </div>

                      <div className="bg-slate-950/85 p-4 rounded-2xl border border-slate-800/80 w-full text-center">
                        <span className="bg-rose-600/20 text-rose-300 border border-rose-500/30 text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md font-mono inline-block mb-1.5">
                          {matchState.diskualifikasiReason === 'MELEBIHI_TOLERANSI_WAKTU'
                            ? 'DISKUALIFIKASI : MELEBIHI TOLERANSI WAKTU'
                            : matchState.diskualifikasiReason === 'MANUAL_DISKUALIFIKASI'
                            ? 'DISKUALIFIKASI'
                            : matchState.diskualifikasiReason === 'MANUAL_UNDUR_DIRI'
                            ? 'UNDUR DIRI'
                            : matchState.diskualifikasi
                            ? 'DISKUALIFIKASI'
                            : 'UNDUR DIRI'}
                        </span>
                        <h4 className="text-base font-black text-white uppercase mt-1 leading-tight font-sans">
                          {matchState.activeCorner === 'BIRU' ? (matchState?.atlitBiru?.nama || 'ATLIT BIRU') : (matchState?.atlitMerah?.nama || 'ATLIT MERAH')}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5 font-sans">
                          {matchState.activeCorner === 'BIRU' ? (matchState?.atlitBiru?.kontingen || '') : (matchState?.atlitMerah?.kontingen || '')}
                        </p>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed px-2 font-sans">
                        {matchState.diskualifikasiReason === 'MELEBIHI_TOLERANSI_WAKTU'
                          ? 'Peserta melebihi batas toleransi waktu tampil sehingga otomatis diskualifikasi.'
                          : matchState.diskualifikasiReason === 'MANUAL_DISKUALIFIKASI'
                          ? 'Dewan Juri menetapkan peserta saat ini untuk Diskualifikasi secara manual.'
                          : matchState.diskualifikasiReason === 'MANUAL_UNDUR_DIRI'
                          ? 'Dewan Juri menetapkan peserta saat ini untuk Undur Diri secara manual.'
                          : `Dewan Juri menetapkan peserta saat ini untuk ${matchState.diskualifikasi ? 'Diskualifikasi' : 'Undur Diri'}.`} Apakah Anda ingin menyimpan data hasil tampil dan melompat ke Penampil {currentPartaiNum + 1}?
                      </p>

                      <div className="grid grid-cols-2 gap-4 w-full pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            triggerClick();
                            playClickSound();
                            // "Tidak" action: close notification
                            updateMatchState({
                              ...matchState,
                              showMatchEndPopUp: false,
                              diskualifikasi: null,
                              pemenang: null
                            });
                          }}
                          className="py-3 px-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 hover:text-white font-black text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer text-center font-sans"
                        >
                          TIDAK
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerClick();
                            playClickSound();
                            // "Ya" action: archive current and go to next
                            // 1. Archive current completed match
                            const record: PastMatch = {
                              id: uuid(),
                              eventName: matchState.eventName,
                              partai: matchState.partai,
                              kelas: matchState.kelas,
                              gender: matchState.gender,
                              kategoriUsia: matchState.kategoriUsia || "REMAJA",
                              tahapPertandingan: matchState.tahapPertandingan || "PENYISIHAN",
                              tempatPelaksanaan: matchState.tempatPelaksanaan,
                              waktuPelaksanaan: matchState.waktuPelaksanaan,
                              atlitMerah: matchState.atlitMerah,
                              atlitBiru: matchState.atlitBiru,
                              skorAkhirMerah: calculateFinalScore('MERAH', matchState),
                              skorAkhirBiru: calculateFinalScore('BIRU', matchState),
                              pemenang: determineWinner(matchState),
                              timestamp: Date.now(),
                              rawScores: matchState.rawScores,
                              validatedScores: matchState.validatedScores,
                              penaltiesMerah: matchState.penaltiesMerah,
                              penaltiesBiru: matchState.penaltiesBiru,
                              accumulatedPenaltyMerah: matchState.accumulatedPenaltyMerah,
                              accumulatedPenaltyBiru: matchState.accumulatedPenaltyBiru,
                              historyPenaltiesMerah: matchState.historyPenaltiesMerah,
                              historyPenaltiesBiru: matchState.historyPenaltiesBiru,
                              diskualifikasi: matchState.diskualifikasi,
                              logoKiri: matchState.logoKiri,
                              logoKanan: matchState.logoKanan,
                              wmpWon: matchState.wmpWon,
                              wmpPemenang: matchState.wmpPemenang,
                              kategoriSeni: matchState.kategoriSeni,
                              seniScores: matchState.seniScores,
                              durasiTampilMERAH: matchState.durasiTampilMERAH,
                              durasiTampilBIRU: matchState.durasiTampilBIRU,
                              durasiBabak: matchState.durasiBabak,
                              sistemTanding: matchState.sistemTanding,
                              jumlahJuri: matchState.jumlahJuri
                            };
                            const newHistory = [...history, record];
                            setHistory(newHistory);
                            saveMatchHistory(newHistory);

                            // 2. Clear & Prepare for Next Partai
                            let targetPartai = "1";
                            if (matchState.partai) {
                              const matches = matchState.partai.match(/\d+/);
                              if (matches) {
                                const num = parseInt(matches[0], 10);
                                  targetPartai = matchState.partai.replace(matches[0], (num + 1).toString());
                              } else {
                                targetPartai = (parseInt(matchState.partai, 10) || 0) + 1 + "";
                              }
                            }

                            let nextAtlitMerah = { nama: "", kontingen: "" };
                            let nextAtlitBiru = { nama: "", kontingen: "" };
                            let nextKelas = matchState.kelas;
                            let nextGender = matchState.gender;
                            let nextEventName = matchState.eventName;
                            let nextKategoriUsia = matchState.kategoriUsia || 'REMAJA';
                            let nextTahapPertandingan = matchState.tahapPertandingan || 'PENYISIHAN';
                            let nextDurasi = matchState.durasiBabak;

                            let foundExcelInner = false;
                            if (excelDataStr) {
                              try {
                                const excelMatches = JSON.parse(excelDataStr);
                                if (Array.isArray(excelMatches)) {
                                  const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                                  if (matchRow) {
                                    foundExcelInner = true;
                                    nextAtlitMerah = {
                                      nama: (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase(),
                                      kontingen: (matchRow['Kontingen Merah'] || "").toString().toUpperCase()
                                    };
                                    nextAtlitBiru = {
                                      nama: (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase(),
                                      kontingen: (matchRow['Kontingen Biru'] || "").toString().toUpperCase()
                                    };
                                    if (matchRow['Kelas']) nextKelas = matchRow['Kelas'].toString().toUpperCase();
                                    if (matchRow['Gender']) nextGender = matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                    
                                    if (matchRow['Kategori Usia']) {
                                      let kUsia = matchRow['Kategori Usia'].toString().trim().toUpperCase();
                                      if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                        kUsia = 'PRA REMAJA';
                                      }
                                      nextKategoriUsia = kUsia;
                                      
                                      if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                                        nextDurasi = 90;
                                      } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                                        nextDurasi = 120;
                                      } else if (kUsia === 'MASTER A') {
                                        nextDurasi = 90;
                                      } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                                        nextDurasi = 60;
                                      }
                                    }
                                    if (matchRow['Tahap Pertandingan']) {
                                      nextTahapPertandingan = matchRow['Tahap Pertandingan'].toString().trim().toUpperCase();
                                    }
                                    let finalDur = ((nextKelas || "").toUpperCase() === "TUNGGAL BEBAS" || (nextKelas || "").toUpperCase() === "GANDA" || (nextKelas || "").toUpperCase() === "REGU")
                                      ? (nextTahapPertandingan === "FINAL" ? 180 : 90)
                                      : (nextTahapPertandingan === "FINAL" ? 180 : (nextTahapPertandingan === "SEMI FINAL" || nextTahapPertandingan === "SEMIFINAL" ? 100 : 80));
                                    nextDurasi = finalDur;

                                    if (matchRow['Durasi Babak (Menit)']) {
                                      const durStr = matchRow['Durasi Babak (Menit)'].toString().trim().replace('.', ':');
                                      if (durStr.includes(':')) {
                                        const parts = durStr.split(':');
                                        const mins = parseInt(parts[0], 10) || 0;
                                        const secs = parseInt(parts[1], 10) || 0;
                                        nextDurasi = (mins * 60) + secs;
                                      } else {
                                        const parsedSecs = parseInt(durStr, 10);
                                        if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                          if (parsedSecs < 10) {
                                            nextDurasi = parsedSecs * 60;
                                          } else {
                                            nextDurasi = parsedSecs;
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }

                            updateMatchState({
                              ...matchState,
                              partai: targetPartai,
                              kelas: nextKelas,
                              gender: nextGender,
                              eventName: nextEventName,
                              kategoriUsia: nextKategoriUsia,
                              tahapPertandingan: nextTahapPertandingan,
                              durasiBabak: nextDurasi,
                              sisaWaktu: 0,
                              timer2Value: 0,
                              timerPlayLocked: false,
                              statusPertandingan: 'BELUM_MULAI',
                              timerBerjalan: false,
                              validatedScores: [],
                              rawScores: [],
                              penaltiesMerah: {
                                binaan1: false, binaan2: false,
                                teguran1: false, teguran2: false,
                                peringatan1: false, peringatan2: false,
                              },
                              penaltiesBiru: {
                                binaan1: false, binaan2: false,
                                teguran1: false, teguran2: false,
                                peringatan1: false, peringatan2: false,
                              },
                              accumulatedPenaltyMerah: 0,
                              accumulatedPenaltyBiru: 0,
                              historyPenaltiesMerah: {},
                              historyPenaltiesBiru: {},
                              babakAktif: 1,
                              diskualifikasi: null,
                              diskualifikasiReason: null,
                              autoDiskReason: null,
                              pemenang: null,
                              victoryType: undefined,
                              verifikasi: {
                                id: "", status: 'IDLE', jenis: 'JATUHAN', juriVotes: {}, result: null
                              },
                              showRoundEndPopUp: false,
                              showMatchEndPopUp: false,
                              juriTerkunci: false,
                              umumkanPemenang: false,
                              atlitMerah: nextAtlitMerah,
                              atlitBiru: nextAtlitBiru,
                              activeCorner: undefined,
                              seniScores: {
                                MERAH: createDefaultCornerSeni(),
                                BIRU: createDefaultCornerSeni(),
                              },
                              hasPerformedBIRU: false,
                              hasPerformedMERAH: false,
                              durasiTampilMERAH: 0,
                              durasiTampilBIRU: 0,
                              dewanConfirmedLanjutPool: false
                            });

                            setLocalPartai(targetPartai);
                            setLocalKelas(nextKelas);
                            setLocalAtlitMerahNama(nextAtlitMerah.nama);
                            setLocalAtlitMerahKontingen(nextAtlitMerah.kontingen);
                            setLocalAtlitBiruNama(nextAtlitBiru.nama);
                            setLocalAtlitBiruKontingen(nextAtlitBiru.kontingen);

                            if (noMoreMatches) {
                              showToast("PARTAI DIARSIPKAN! Semua pertandingan telah selesai, papan skor direset & dikunci.", "success");
                            } else {
                              if (foundExcelInner) {
                                showToast(`PARTAI BERHASIL DIARSIPKAN! Data Partai ${targetPartai} berhasil dimuat dari Excel.`, "success");
                              } else {
                                showToast(`PARTAI BERHASIL DIARSIPKAN! Silakan masukkan pesilat Partai Baru ${targetPartai}.`, "success");
                              }
                            }
                          }}
                          className="py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer text-center shadow-[0_0_12px_rgba(20,184,166,0.3)] border border-teal-400/30 font-sans"
                        >
                          YA
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ef9] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 15 }}
                    transition={{ type: "spring", damping: 25, stiffness: 180 }}
                    className="bg-[#120722] border-2 border-purple-500 p-8 rounded-3xl max-w-4xl w-full shadow-[0_0_50px_rgba(168,85,247,0.4)] relative overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 text-left items-stretch"
                  >
                    {/* Decorative gradient header bar */}
                    <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 animate-pulse"></div>

                    {/* Left Column: Match Status & Winner Announcement */}
                    <div className="flex flex-col justify-between space-y-6 h-full text-center md:text-left">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-purple-950/80 text-purple-450 border border-purple-500/55 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-pulse shrink-0">
                            <Award className="w-6 h-6 text-yellow-500 animate-bounce" />
                          </div>
                          <div>
                            <span className="text-[10px] text-purple-400 uppercase font-bold tracking-widest font-mono">
                              {isPoolSystem
                                ? `PANEL SEKRETARIS - SISTEM POOL (${performedCount} DARI ${totalPoolAthletes} PENAMPIL)`
                                : "PANEL SEKRETARIS - KEPUTUSAN FINAL"
                              }
                            </span>
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                              {isPoolSystem
                                ? (isPoolFullyCompleted ? "PERTANDINGAN POOL SELESAI" : "PENAMPILAN SELESAI")
                                : "PERTANDINGAN TELAH SELESAI"
                              }
                            </h3>
                            {(matchState.diskualifikasi || matchState.victoryType === 'UNDUR_DIRI') && (
                              <span className="inline-block mt-1 bg-pink-950 text-pink-300 border border-pink-500/50 text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full font-mono animate-pulse">
                                {matchState.diskualifikasiReason === 'MELEBIHI_TOLERANSI_WAKTU'
                                  ? 'DISKUALIFIKASI : MELEBIHI TOLERANSI WAKTU'
                                  : matchState.diskualifikasiReason === 'MANUAL_DISKUALIFIKASI'
                                  ? 'DISKUALIFIKASI'
                                  : matchState.diskualifikasiReason === 'MANUAL_UNDUR_DIRI' || matchState.victoryType === 'UNDUR_DIRI'
                                  ? 'UNDUR DIRI'
                                  : matchState.diskualifikasi === 'BOTH'
                                  ? 'Diskualifikasi Kedua Penampil (Double DQ)'
                                  : 'Kemenangan Diskualifikasi (DQ)'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* WINNER STATE PANEL BOX */}
                        <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                          isPoolSystem
                            ? (isLightMode ? 'bg-purple-50 border-purple-300' : 'bg-[#150a29] border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]')
                            : determineWinner(matchState) === 'MERAH'
                            ? (isLightMode ? 'bg-red-50 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-red-950/80 border-red-500/50 shadow-[0_0_27px_rgba(239,68,68,0.3)]')
                            : determineWinner(matchState) === 'BIRU'
                            ? (isLightMode ? 'bg-blue-50 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-blue-950/80 border-blue-500/50 shadow-[0_0_27px_rgba(59,130,246,0.3)]')
                            : (isLightMode ? 'bg-white border-slate-200' : 'bg-[#0a0315] border-purple-950')
                        }`}>
                          {isPoolSystem ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`${isPoolFullyCompleted ? 'bg-purple-600' : 'bg-amber-600'} text-white font-extrabold text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-widest shadow-sm`}>
                                  {isPoolFullyCompleted ? "🏆 HASIL AKHIR POOL" : "📊 KLASEMEN SEMENTARA POOL"}
                                </span>
                                <span className="bg-purple-950/50 border border-purple-500/20 text-[10px] text-purple-300 font-mono px-2 py-0.5 rounded">
                                  {isPoolFullyCompleted ? "Klasemen Resmi" : "Klasemen Sementara"}
                                </span>
                              </div>
                              
                              {(() => {
                                const poolRanked = getPoolLeaderboard();
                                const juara1 = poolRanked.filter(ath => ath.rank === 1 && ath.hasPerformed);
                                const juara2 = poolRanked.filter(ath => ath.rank === 2 && ath.hasPerformed);
                                const juara3 = poolRanked.filter(ath => ath.rank === 3 && ath.hasPerformed);

                                return (
                                  <div className="space-y-2 mt-2">
                                    {/* Juara 1 */}
                                    <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/5 border border-amber-500/40 p-2.5 rounded-xl flex items-center justify-between">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 text-xs font-black flex items-center justify-center ring-2 ring-yellow-300 shadow-lg shrink-0">
                                          1
                                        </span>
                                        <div className="min-w-0">
                                          <div className={`text-sm font-black uppercase leading-tight truncate ${isLightMode ? 'text-amber-900' : 'text-amber-300'}`}>
                                            {juara1.length > 0 ? juara1.map(j => j.nama).join(' / ') : '-'}
                                          </div>
                                          <div className={`text-[10px] font-bold uppercase truncate ${isLightMode ? 'text-amber-700/80' : 'text-amber-400/80'}`}>
                                            {juara1.length > 0 ? juara1.map(j => j.kontingen).join(' / ') : ''}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0 ml-2">
                                        <span className={`text-[9px] font-mono font-extrabold block ${isLightMode ? 'text-amber-750' : 'text-amber-400'}`}>SKOR</span>
                                        <span className={`text-sm font-black font-mono ${isLightMode ? 'text-amber-950' : 'text-white'}`}>{juara1.length > 0 ? juara1[0].score.toFixed(3) : '-'}</span>
                                      </div>
                                    </div>

                                    {/* Juara 2 */}
                                    <div className="bg-gradient-to-r from-slate-400/15 to-slate-500/5 border border-slate-500/30 p-2.5 rounded-xl flex items-center justify-between">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-5 h-5 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950 text-[10px] font-black flex items-center justify-center ring-2 ring-slate-200 shrink-0">
                                          2
                                        </span>
                                        <div className="min-w-0">
                                          <div className={`text-xs font-extrabold uppercase leading-tight truncate ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
                                            {juara2.length > 0 ? juara2.map(j => j.nama).join(' / ') : '-'}
                                          </div>
                                          <div className={`text-[9px] font-bold uppercase truncate ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {juara2.length > 0 ? juara2.map(j => j.kontingen).join(' / ') : ''}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0 ml-2">
                                        <span className={`text-[9px] font-mono font-bold block ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>SKOR</span>
                                        <span className={`text-xs font-black font-mono ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{juara2.length > 0 ? juara2[0].score.toFixed(3) : '-'}</span>
                                      </div>
                                    </div>

                                    {/* Juara 3 */}
                                    <div className="bg-gradient-to-r from-amber-800/15 to-amber-900/5 border border-amber-800/20 p-2.5 rounded-xl flex items-center justify-between">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-600 to-amber-800 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-amber-500 shrink-0">
                                          3
                                        </span>
                                        <div className="min-w-0">
                                          <div className={`text-xs font-extrabold uppercase leading-tight truncate ${isLightMode ? 'text-amber-850' : 'text-amber-250'}`}>
                                            {juara3.length > 0 ? juara3.map(j => j.nama).join(' / ') : '-'}
                                          </div>
                                          <div className={`text-[9px] font-bold uppercase truncate ${isLightMode ? 'text-amber-700/75' : 'text-amber-500/75'}`}>
                                            {juara3.length > 0 ? juara3.map(j => j.kontingen).join(' / ') : ''}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0 ml-2">
                                        <span className={`text-[9px] font-mono font-bold block ${isLightMode ? 'text-amber-800' : 'text-amber-500/70'}`}>SKOR</span>
                                        <span className={`text-xs font-black font-mono ${isLightMode ? 'text-amber-950' : 'text-white'}`}>{juara3.length > 0 ? juara3[0].score.toFixed(3) : '-'}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : determineWinner(matchState) === 'MERAH' ? (
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="bg-red-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-widest shadow-sm">PEMENANG: SUDUT MERAH</span>
                                <span className={`font-bold text-[10px] px-2 py-0.5 rounded font-mono tracking-widest shadow-sm border ${isLightMode ? 'bg-red-100/85 text-red-700 border-red-200' : 'bg-red-500/20 text-red-200 border-red-500/30'}`}>
                                  {getWinningReason(matchState)}
                                </span>
                              </div>
                              <h4 className={`text-2xl font-black mt-2 uppercase ${isLightMode ? 'text-red-900' : 'text-white'}`}>{matchState?.atlitMerah?.nama || 'ATLIT MERAH'}</h4>
                              <p className={`text-xs font-bold mt-1 uppercase ${isLightMode ? 'text-red-600' : 'text-red-400'}`}>{matchState?.atlitMerah?.kontingen || ''}</p>
                            </div>
                          ) : determineWinner(matchState) === 'BIRU' ? (
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-widest shadow-sm">PEMENANG: SUDUT BIRU</span>
                                <span className={`font-bold text-[10px] px-2 py-0.5 rounded font-mono tracking-widest shadow-sm border ${isLightMode ? 'bg-blue-100/85 text-blue-700 border-blue-200' : 'bg-blue-500/20 text-blue-200 border-blue-500/30'}`}>
                                  {getWinningReason(matchState)}
                                </span>
                              </div>
                              <h4 className={`text-2xl font-black mt-2 uppercase ${isLightMode ? 'text-blue-900' : 'text-white'}`}>{matchState?.atlitBiru?.nama || 'ATLIT BIRU'}</h4>
                              <p className={`text-xs font-bold mt-1 uppercase ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`}>{matchState?.atlitBiru?.kontingen || ''}</p>
                            </div>
                          ) : (
                            <div>
                              <h4 className={`text-xl font-black ${isLightMode ? 'text-slate-800' : 'text-white'}`}>DRAW / SERI (POIN AKHIR SAMA)</h4>
                              {(() => {
                                const isSeniMatch = ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kelas) || ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kategoriSeni);
                                if (isSeniMatch) {
                                  return (
                                    <div className="text-left p-3 bg-[#1c0f30]/80 border-2 border-amber-500/50 rounded-2xl space-y-1 mt-2">
                                      <span className="text-amber-400 font-mono text-[10px] uppercase font-extrabold tracking-widest block animate-pulse">
                                        ⚠️ AKAN DILAKUKAN UNDIAN OLEH KP/DEWAN/JURI/PELATIH
                                      </span>
                                      <p className="text-[10px] text-amber-200 leading-relaxed">
                                        Skor akhir dan seluruh kriteria tie-breaker (Nilai Kebenaran, Nilai Hukuman, Waktu/Durasi Tampil, Standar Deviasi) bernilai sama kuat. Berdasarkan aturan resmi, penetapan pemenang dilakukan dengan cara undian!
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>

                        {/* OVERTIME / BABAK TAMBAHAN */}
                        {(() => {
                          const isSeniMatch = ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kelas) || ["TUNGGAL", "GANDA", "REGU", "SOLO_KREATIF"].includes(matchState.kategoriSeni);
                          return determineWinner(matchState) === null && !isSeniMatch && (
                            <div className="text-left p-3 bg-[#1c0f30]/60 border border-purple-500/30 rounded-2xl space-y-2">
                              <span className="text-amber-400 font-mono text-[9px] uppercase font-bold tracking-widest block animate-pulse">OVERTIME / BABAK TAMBAHAN</span>
                              <p className="text-[10px] text-purple-200 leading-relaxed">
                                Hasil pertandingan bernilai sama kuat bahkan setelah evaluasi poin hukuman & prestasi teknik. Silakan tekan tombol di bawah untuk menambah 1 Babak Tambahan.
                              </p>
                              <button
                                id="btn-lanjut-babak-4"
                                onClick={() => {
                                  triggerClick();
                                  const nextRound = (matchState.babakAktif + 1) as 1 | 2 | 3 | 4;
                                  
                                  let newPenaltiesMerah = { ...matchState.penaltiesMerah };
                                  let newPenaltiesBiru = { ...matchState.penaltiesBiru };
                                  let newAccumulatedPenaltyMerah = matchState.accumulatedPenaltyMerah || 0;
                                  let newAccumulatedPenaltyBiru = matchState.accumulatedPenaltyBiru || 0;

                                  let extraMerah = 0;
                                  if (matchState.penaltiesMerah.teguran1) extraMerah += 1;
                                  if (matchState.penaltiesMerah.teguran2) extraMerah += 2;

                                  let extraBiru = 0;
                                  if (matchState.penaltiesBiru.teguran1) extraBiru += 1;
                                  if (matchState.penaltiesBiru.teguran2) extraBiru += 2;

                                  newAccumulatedPenaltyMerah += extraMerah;
                                  newAccumulatedPenaltyBiru += extraBiru;

                                  newPenaltiesMerah = {
                                    ...newPenaltiesMerah,
                                    binaan1: false,
                                    binaan2: false,
                                    teguran1: false,
                                    teguran2: false,
                                  };
                                  newPenaltiesBiru = {
                                    ...newPenaltiesBiru,
                                    binaan1: false,
                                    binaan2: false,
                                    teguran1: false,
                                    teguran2: false,
                                  };

                                  updateMatchState({
                                    ...matchState,
                                    babakAktif: nextRound,
                                    sisaWaktu: 0,
                                    showRoundEndPopUp: false,
                                    showMatchEndPopUp: false,
                                    timerBerjalan: false,
                                    accumulatedPenaltyMerah: newAccumulatedPenaltyMerah,
                                    accumulatedPenaltyBiru: newAccumulatedPenaltyBiru,
                                    penaltiesMerah: newPenaltiesMerah,
                                    penaltiesBiru: newPenaltiesBiru,
                                    statusPertandingan: 'BELUM_MULAI'
                                  });
                                  showToast(`Sukses Lanjut ke Babak ${nextRound} (Babak Tambahan)!`, "success");
                                }}
                                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-yellow-500 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase cursor-pointer active:scale-95 transition-all text-center border border-amber-500/30 font-sans"
                              >
                                LANJUT BABAK {matchState.babakAktif + 1} (BABAK TAMBAHAN)
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Right Column: Next Match Info & Official Action Buttons */}
                    <div className="flex flex-col justify-between space-y-4 h-full border-t md:border-t-0 md:border-l border-purple-500/15 pt-6 md:pt-0 md:pl-8">
                      <div className="space-y-4">
                        {/* GRID INFORMASI PARTAI SELANJUTNYA (BABAK 3 SELESAI / MATCH FINISHED) */}
                        {(() => {
                          const nextMatch = getNextMatchInfo();
                          return (
                            <div className="p-4 bg-[#110524]/80 border border-purple-500/30 rounded-2xl text-left space-y-2">
                              <div className="flex items-center justify-between border-b border-purple-500/20 pb-1.5">
                                <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase flex items-center gap-1">
                                  ⏭️ PARTAI SELANJUTNYA (UPCOMING)
                                </span>
                                {nextMatch && (
                                  <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">
                                    Partai {nextMatch.partai}
                                  </span>
                                )}
                              </div>
                              {nextMatch ? (
                                (() => {
                                  const isNextPool = nextMatch.merah?.nama === '---' || nextMatch.biru?.nama === '---';
                                  const showBiru = !isNextPool || nextMatch.biru?.nama !== '---';
                                  const showMerah = !isNextPool || nextMatch.merah?.nama !== '---';
                                  return (
                                    <div className={`grid ${isNextPool ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pt-1`}>
                                      {/* Atlit Biru Corner */}
                                      {showBiru && (
                                        <div className="bg-gradient-to-r from-blue-900/80 to-transparent border-l-4 border-blue-500 shadow-lg p-2.5 rounded-xl flex flex-col justify-between">
                                          <div>
                                            <span className="text-[8px] font-bold text-blue-400 tracking-wider uppercase block">SUDUT BIRU</span>
                                            <span className="text-xs font-bold text-white truncate block mt-0.5">{nextMatch.biru.nama}</span>
                                          </div>
                                          <span className="text-[10px] text-zinc-400 mt-1 uppercase truncate block">{nextMatch.biru.kontingen}</span>
                                        </div>
                                      )}

                                      {/* Atlit Merah Corner */}
                                      {showMerah && (
                                        <div className="bg-gradient-to-br from-red-900/80 to-transparent border-l-4 border-red-500 shadow-lg p-2.5 rounded-xl flex flex-col justify-between">
                                          <div>
                                            <span className="text-[8px] font-bold text-red-400 tracking-wider uppercase block">SUDUT MERAH</span>
                                            <span className="text-xs font-bold text-white truncate block mt-0.5">{nextMatch.merah.nama}</span>
                                          </div>
                                          <span className="text-[10px] text-zinc-400 mt-1 uppercase truncate block">{nextMatch.merah.kontingen}</span>
                                        </div>
                                      )}

                                      {/* Match Parameter Grid */}
                                      <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-2 bg-purple-950/30 border border-purple-500/10 p-2 rounded-lg text-[9px] text-purple-300 font-mono">
                                        <div>
                                          <span className="text-purple-400 font-bold block">KATEGORI:</span>
                                          <span className="text-white font-extrabold">{nextMatch.kelas}</span>
                                        </div>
                                        <div>
                                          <span className="text-purple-400 font-bold block">GENDER:</span>
                                          <span className="text-white font-extrabold">{nextMatch.gender}</span>
                                        </div>
                                        <div>
                                          <span className="text-purple-400 font-bold block">TAHAPAN:</span>
                                          <span className="text-white font-extrabold truncate block">{nextMatch.tahapPertandingan}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="py-2 text-center text-[10px] text-zinc-500 font-mono italic">
                                  Tidak ada partai selanjutnya yang terdaftar di database Excel.
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* UMUMKAN PEMENANG CONTROLS (DELEGATED TO DEWAN) */}
                        <div className="border border-purple-500/20 bg-purple-950/25 p-3 rounded-xl flex flex-col items-center gap-1.5 text-center">
                          <span className="text-[10px] font-extrabold tracking-widest text-purple-400 font-mono block uppercase">
                            📢 HASIL PERTANDINGAN
                          </span>
                          {matchState.umumkanPemenang ? (
                            <div className="w-full py-2 px-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 ml-0.5" /> PEMENANG TELAH DIUMUMKAN OLEH DEWAN
                            </div>
                          ) : (
                            <div className="w-full py-2 px-3 bg-amber-950/20 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-1.5 font-sans">
                              MENUNGGU PENGUMUMAN HASIL OLEH DEWAN PANEL
                            </div>
                          )}
                          <p className="text-[8px] text-zinc-400 font-sans">
                            *Hasil pertandingan dipublikasikan secara resmi oleh Dewan Juri melalui Dewan Panel.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-purple-500/10">
                        <button
                          onClick={() => {
                            triggerClick();
                            // 1. Archive current completed match
                            const record: PastMatch = {
                              id: uuid(),
                              eventName: matchState.eventName,
                              partai: matchState.partai,
                              kelas: matchState.kelas,
                              gender: matchState.gender,
                              kategoriUsia: matchState.kategoriUsia || "REMAJA",
                              tahapPertandingan: matchState.tahapPertandingan || "PENYISIHAN",
                              tempatPelaksanaan: matchState.tempatPelaksanaan,
                              waktuPelaksanaan: matchState.waktuPelaksanaan,
                              atlitMerah: matchState.atlitMerah,
                              atlitBiru: matchState.atlitBiru,
                              skorAkhirMerah: calculateFinalScore('MERAH', matchState),
                              skorAkhirBiru: calculateFinalScore('BIRU', matchState),
                              pemenang: determineWinner(matchState),
                              timestamp: Date.now(),
                              rawScores: matchState.rawScores,
                              validatedScores: matchState.validatedScores,
                              penaltiesMerah: matchState.penaltiesMerah,
                              penaltiesBiru: matchState.penaltiesBiru,
                              accumulatedPenaltyMerah: matchState.accumulatedPenaltyMerah,
                              accumulatedPenaltyBiru: matchState.accumulatedPenaltyBiru,
                              historyPenaltiesMerah: matchState.historyPenaltiesMerah,
                              historyPenaltiesBiru: matchState.historyPenaltiesBiru,
                              diskualifikasi: matchState.diskualifikasi,
                              logoKiri: matchState.logoKiri,
                              logoKanan: matchState.logoKanan,
                              wmpWon: matchState.wmpWon,
                              wmpPemenang: matchState.wmpPemenang,
                              kategoriSeni: matchState.kategoriSeni,
                              seniScores: matchState.seniScores,
                              durasiTampilMERAH: matchState.durasiTampilMERAH,
                              durasiTampilBIRU: matchState.durasiTampilBIRU,
                              durasiBabak: matchState.durasiBabak,
                              sistemTanding: matchState.sistemTanding,
                              jumlahJuri: matchState.jumlahJuri
                            };
                            const newHistory = [...history, record];
                            setHistory(newHistory);
                            saveMatchHistory(newHistory);

                            // 2. Clear & Prepare for Next Partai
                            let targetPartai = "1";
                            if (matchState.partai) {
                              const matches = matchState.partai.match(/\d+/);
                              if (matches) {
                                const num = parseInt(matches[0], 10);
                                targetPartai = matchState.partai.replace(matches[0], (num + 1).toString());
                              } else {
                                targetPartai = (parseInt(matchState.partai, 10) || 0) + 1 + "";
                              }
                            }

                            let nextAtlitMerah = { nama: "", kontingen: "" };
                            let nextAtlitBiru = { nama: "", kontingen: "" };
                            let nextKelas = matchState.kelas;
                            let nextGender = matchState.gender;
                            let nextEventName = matchState.eventName;
                            let nextKategoriUsia = matchState.kategoriUsia || 'REMAJA';
                            let nextTahapPertandingan = matchState.tahapPertandingan || 'PENYISIHAN';
                            let nextDurasi = matchState.durasiBabak;

                            let foundExcelInner = false;
                            if (excelDataStr) {
                              try {
                                const excelMatches = JSON.parse(excelDataStr);
                                if (Array.isArray(excelMatches)) {
                                  const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                                  if (matchRow) {
                                    foundExcelInner = true;
                                    nextAtlitMerah = {
                                      nama: (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase(),
                                      kontingen: (matchRow['Kontingen Merah'] || "").toString().toUpperCase()
                                    };
                                    nextAtlitBiru = {
                                      nama: (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase(),
                                      kontingen: (matchRow['Kontingen Biru'] || "").toString().toUpperCase()
                                    };
                                    if (matchRow['Kelas']) nextKelas = matchRow['Kelas'].toString().toUpperCase();
                                    if (matchRow['Gender']) nextGender = matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                    
                                    if (matchRow['Kategori Usia']) {
                                      let kUsia = matchRow['Kategori Usia'].toString().trim().toUpperCase();
                                      if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                        kUsia = 'PRA REMAJA';
                                      }
                                      nextKategoriUsia = kUsia;
                                      
                                      if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                                        nextDurasi = 90;
                                      } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                                        nextDurasi = 120;
                                      } else if (kUsia === 'MASTER A') {
                                        nextDurasi = 90;
                                      } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                                        nextDurasi = 60;
                                      }
                                    }
                                    if (matchRow['Tahap Pertandingan']) {
                                      nextTahapPertandingan = matchRow['Tahap Pertandingan'].toString().trim().toUpperCase();
                                    }
                                    let finalDur = ((nextKelas || "").toUpperCase() === "TUNGGAL BEBAS" || (nextKelas || "").toUpperCase() === "GANDA" || (nextKelas || "").toUpperCase() === "REGU")
                                      ? (nextTahapPertandingan === "FINAL" ? 180 : 90)
                                      : (nextTahapPertandingan === "FINAL" ? 180 : (nextTahapPertandingan === "SEMI FINAL" || nextTahapPertandingan === "SEMIFINAL" ? 100 : 80));
                                    nextDurasi = finalDur;

                                    if (matchRow['Durasi Babak (Menit)']) {
                                      const durStr = matchRow['Durasi Babak (Menit)'].toString().trim().replace('.', ':');
                                      if (durStr.includes(':')) {
                                        const parts = durStr.split(':');
                                        const mins = parseInt(parts[0], 10) || 0;
                                        const secs = parseInt(parts[1], 10) || 0;
                                        nextDurasi = (mins * 60) + secs;
                                      } else {
                                        const parsedSecs = parseInt(durStr, 10);
                                        if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                          if (parsedSecs < 10) {
                                            nextDurasi = parsedSecs * 60;
                                          } else {
                                            nextDurasi = parsedSecs;
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }

                            updateMatchState({
                              ...matchState,
                              partai: targetPartai,
                              kelas: nextKelas,
                              gender: nextGender,
                              eventName: nextEventName,
                              kategoriUsia: nextKategoriUsia,
                              tahapPertandingan: nextTahapPertandingan,
                              durasiBabak: nextDurasi,
                              sisaWaktu: 0,
                              timer2Value: 0,
                              timerPlayLocked: false,
                              statusPertandingan: 'BELUM_MULAI',
                              timerBerjalan: false,
                              validatedScores: [],
                              rawScores: [],
                              penaltiesMerah: {
                                binaan1: false, binaan2: false,
                                teguran1: false, teguran2: false,
                                peringatan1: false, peringatan2: false,
                              },
                              penaltiesBiru: {
                                binaan1: false, binaan2: false,
                                teguran1: false, teguran2: false,
                                peringatan1: false, peringatan2: false,
                              },
                              accumulatedPenaltyMerah: 0,
                              accumulatedPenaltyBiru: 0,
                              historyPenaltiesMerah: {},
                              historyPenaltiesBiru: {},
                              babakAktif: 1,
                              diskualifikasi: null,
                              diskualifikasiReason: null,
                              autoDiskReason: null,
                              pemenang: null,
                              victoryType: undefined,
                              verifikasi: {
                                id: "", status: 'IDLE', jenis: 'JATUHAN', juriVotes: {}, result: null
                              },
                              showRoundEndPopUp: false,
                              showMatchEndPopUp: false,
                              juriTerkunci: false,
                              umumkanPemenang: false,
                              atlitMerah: nextAtlitMerah,
                              atlitBiru: nextAtlitBiru,
                              activeCorner: undefined,
                              seniScores: {
                                MERAH: createDefaultCornerSeni(),
                                BIRU: createDefaultCornerSeni(),
                              },
                              hasPerformedBIRU: false,
                              hasPerformedMERAH: false,
                              durasiTampilMERAH: 0,
                              durasiTampilBIRU: 0,
                              dewanConfirmedLanjutPool: false
                            });

                            setLocalPartai(targetPartai);
                            setLocalKelas(nextKelas);
                            setLocalAtlitMerahNama(nextAtlitMerah.nama);
                            setLocalAtlitMerahKontingen(nextAtlitMerah.kontingen);
                            setLocalAtlitBiruNama(nextAtlitBiru.nama);
                            setLocalAtlitBiruKontingen(nextAtlitBiru.kontingen);

                            if (noMoreMatches) {
                              showToast("PARTAI DIARSIPKAN! Semua pertandingan telah selesai, papan skor direset & dikunci.", "success");
                            } else {
                              if (foundExcelInner) {
                                showToast(`PARTAI BERHASIL DIARSIPKAN! Data Partai ${targetPartai} berhasil dimuat dari Excel.`, "success");
                              } else {
                                showToast(`PARTAI BERHASIL DIARSIPKAN! Silakan masukkan pesilat Partai Baru ${targetPartai}.`, "success");
                              }
                            }
                          }}
                          className={`w-full py-3 bg-gradient-to-r ${
                            noMoreMatches 
                              ? 'from-red-700 via-rose-800 to-red-950 hover:from-red-600 hover:to-red-800' 
                              : 'from-purple-700 via-pink-700 to-amber-600 hover:from-purple-600 hover:to-amber-500'
                          } text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border border-purple-500/50`}
                        >
                          {noMoreMatches ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-rose-300 animate-spin" />
                              Akhiri dan Reset/Kunci
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                              {isPoolSystem
                                ? (isPoolFullyCompleted ? "Lanjutkan Partai Selanjutnya (Arsipkan Pool)" : "Arsipkan & Lanjut Penampil Berikutnya")
                                : "Lanjutkan Partai Selanjutnya (Arsipkan)"
                              }
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            triggerClick();
                            // Close popup but keep current match data for review as-is
                            updateMatchState({
                              ...matchState,
                              showMatchEndPopUp: false,
                              diskualifikasi: null,
                              pemenang: null
                            });
                          }}
                          className="w-full text-[10px] text-purple-400 hover:text-white transition-colors underline uppercase font-bold cursor-pointer text-center py-1 mt-1 block"
                        >
                          Tutup & Tinjau Kembali Skor
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
                );
              })()}
            </AnimatePresence>

            <AnimatePresence>
              {showNextMatchesPopup && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-[#00000ed2] backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-6 z-[9999] text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-2xl w-full bg-[#110524] border border-purple-500/40 p-6 rounded-2xl flex flex-col max-h-[85vh] text-left shadow-2xl"
                  >
                  {/* Header / Title */}
                  <div className="flex justify-between items-center border-b border-purple-900/30 pb-3 mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                      <h3 className="text-xl font-black text-white tracking-tight uppercase">Daftar Sisa Partai Pertandingan</h3>
                    </div>
                    <button
                      onClick={() => {
                        triggerClick();
                        setShowNextMatchesPopup(false);
                      }}
                      className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Excel Data List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {(() => {
                      const excelDataStr = localStorage.getItem('silat_excel_matches');
                      if (!excelDataStr) {
                        return (
                          <div className="p-8 text-center text-slate-400 font-medium space-y-2">
                            <p>Belum ada data partai dari unggahan Excel.</p>
                            <p className="text-xs text-slate-500 font-mono">Unggah template Excel terlebih dahulu pada menu "Akselerator Turnamen & Penjadwalan" di bawah.</p>
                          </div>
                        );
                      }

                      try {
                        const excelMatches = JSON.parse(excelDataStr);
                        if (!Array.isArray(excelMatches) || excelMatches.length === 0) {
                          return (
                            <div className="p-8 text-center text-slate-400 font-medium space-y-2">
                              <p>Belum ada data partai dari unggahan Excel.</p>
                              <p className="text-xs text-slate-500 font-mono">Unggah template Excel terlebih dahulu pada menu "Akselerator Turnamen & Penjadwalan" di bawah.</p>
                            </div>
                          );
                        }

                        // We can find the current match's index so we can highlight where we are and show subsequent/remaining matches.
                        const normalizePartai = (p: any): string => {
                          if (p === undefined || p === null) return '';
                          const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                          const matched = str.match(/\d+/);
                          if (matched) return parseInt(matched[0], 10).toString();
                          return str;
                        };

                        const currentIndex = excelMatches.findIndex((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(matchState.partai));

                        return (
                          <div className="space-y-2.5">
                            {excelMatches.map((rowAny: any, idx: number) => {
                              const isCurrent = idx === currentIndex;
                              const isPast = idx < currentIndex;
                              const isUpcoming = idx > currentIndex;

                              let bgClass = "bg-[#160b2d]/50 border-purple-900/25 text-slate-300";
                              if (isCurrent) {
                                bgClass = "bg-[#25104d] border-purple-500 ring-1 ring-purple-500/50 text-white shadow-lg";
                              } else if (isPast) {
                                bgClass = "bg-[#0b0416]/30 border-purple-950/20 text-slate-500 opacity-60";
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-xl border transition-all text-sm flex flex-col md:flex-row md:items-center justify-between gap-2 ${bgClass}`}
                                >
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                                        isCurrent 
                                          ? 'bg-purple-600 text-white animate-pulse' 
                                          : isPast 
                                            ? 'bg-slate-800 text-slate-400' 
                                            : 'bg-purple-950/60 text-purple-400 font-bold'
                                      }`}>
                                        PARTAI {rowAny['Partai']}
                                      </span>
                                      
                                      <span className="text-xs font-bold text-amber-500 uppercase">
                                        {rowAny['Kategori'] || rowAny['kategori'] || rowAny['KATEGORI'] || rowAny['Kelas'] || rowAny['kelas'] || 'TUNGGAL'} ({rowAny['Gender'] || 'PUTRA'})
                                      </span>

                                      <span className="text-[10px] bg-slate-900/60 text-slate-400 font-semibold px-1.5 py-0.5 rounded uppercase">
                                        {rowAny['Kategori Usia'] || 'REMAJA'}
                                      </span>

                                      {isCurrent && (
                                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded animate-pulse">
                                          SEDANG BERLANGSUNG
                                        </span>
                                      )}
                                    </div>

                                    {/* Athlete names */}
                                    {(() => {
                                      const isRowPool = rowAny['Sistem Tanding'] === 'POOL' || 
                                                        rowAny['sistemTanding'] === 'POOL' || 
                                                        rowAny['Nama Pesilat Biru'] === '---' || 
                                                        rowAny['Nama Pesilat Merah'] === '---';

                                      if (isRowPool) {
                                        const isBiruActive = rowAny['Nama Pesilat Biru'] !== '---' && rowAny['Nama Pesilat Biru'];
                                        const activeCornerName = isBiruActive ? 'BIRU' : 'MERAH';
                                        const activeCornerColor = isBiruActive ? 'text-blue-450 font-black' : 'text-red-450 font-black';
                                        const activeBgColor = isBiruActive ? 'bg-blue-950/40 border-blue-500/20' : 'bg-red-950/40 border-red-500/20';
                                        const activeName = isBiruActive ? rowAny['Nama Pesilat Biru'] : rowAny['Nama Pesilat Merah'];
                                        const activeKontingen = isBiruActive ? rowAny['Kontingen Biru'] : rowAny['Kontingen Merah'];

                                        return (
                                          <div className={`mt-1.5 p-2 rounded-lg border ${activeBgColor} max-w-sm`}>
                                            <span className={`text-[9px] ${activeCornerColor} block font-bold font-mono tracking-wider uppercase`}>SUDUT {activeCornerName} • POOL SYSTEM</span>
                                            <p className="font-extrabold uppercase tracking-tight text-xs md:text-sm truncate text-white mt-0.5">
                                              {activeName || '-'}
                                            </p>
                                            <p className="text-[10px] text-slate-400 uppercase font-mono truncate">
                                              {activeKontingen || '-'}
                                            </p>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div className="grid grid-cols-2 gap-4 pt-1">
                                          <div>
                                            <span className="text-[10px] text-blue-400 block font-bold font-sans">SUDUT BIRU</span>
                                            <p className="font-bold uppercase tracking-tight text-xs md:text-sm truncate">
                                              {rowAny['Nama Pesilat Biru'] || '-'}
                                            </p>
                                            <p className="text-[10px] text-slate-400 uppercase truncate">
                                              {rowAny['Kontingen Biru'] || '-'}
                                            </p>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-red-400 block font-bold font-sans">SUDUT MERAH</span>
                                            <p className="font-bold uppercase tracking-tight text-xs md:text-sm truncate">
                                              {rowAny['Nama Pesilat Merah'] || '-'}
                                            </p>
                                            <p className="text-[10px] text-slate-400 uppercase truncate">
                                              {rowAny['Kontingen Merah'] || '-'}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div className="text-right shrink-0 md:pl-4 border-t md:border-t-0 md:border-l border-purple-900/20 pt-2 md:pt-0">
                                    <p className="text-[10px] text-slate-400 font-mono leading-none">
                                      {rowAny['Tahap Pertandingan'] || 'PENYISIHAN'}
                                    </p>
                                    <p className="text-xs font-bold text-purple-300 mt-1">
                                      {rowAny['Durasi Babak (Menit)'] || '02:00'}
                                    </p>
                                    {isUpcoming && idx === currentIndex + 1 && (
                                      <span className="text-[9px] text-[#0f111d] bg-amber-400 font-black uppercase rounded-md px-1.5 py-0.5 mt-1 inline-block animate-bounce shadow">
                                        BERIKUTNYA
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      } catch (err) {
                        return (
                          <div className="p-4 text-center text-red-400 text-xs font-serif">
                            Gagal membaca data partai dari excel.
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* Close Footer button */}
                  <div className="border-t border-purple-900/30 pt-4 mt-4 text-right shrink-0">
                    <button
                      onClick={() => {
                        triggerClick();
                        setShowNextMatchesPopup(false);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer transition-all active:scale-[0.97] shadow-md border border-purple-500/20"
                    >
                      TUTUP
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

            {/* POPUP 2: GENERATE BAGAN MODEL */}
            <AnimatePresence>
              {showGenerateBaganPopup && (() => {
                const N = baganAthletes.length;
                const categoryKey = `${baganKelas}-${baganUsia}-${baganGender}`;
                const roundsData = getDynamicBracketRounds(baganAthletes, jadwalLines.length + 1, categoryKey, jadwalLines);
                const totalRounds = roundsData.length;

                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 220 }}
                      className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-6xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl text-slate-100"
                    >
                    
                    {/* Modal Header */}
                    <div className="p-4 bg-purple-950/20 border-b border-purple-900/30 flex justify-between items-center shrink-0">
                      <div>
                        <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-sm md:text-base uppercase tracking-wider flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-purple-400" />
                          GENERATOR BAGAN DYNAMIC (BELINGKARI 8 - 64 SLOTS / UP TO 50 ATHLETES)
                        </h3>
                        <p className="text-slate-400 text-[10px]">Tingkatkan performa kejuaraan dengan bagan otomatis up to 64 slot atlit. Format input diimpor dari Excel atau di-input manual.</p>
                      </div>
                      <button
                        onClick={() => { triggerClick(); setShowGenerateBaganPopup(false); }}
                        className="p-1 px-2.5 rounded-lg bg-red-950/30 text-red-400 border border-red-500/20 hover:bg-red-900/40 hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        X
                      </button>
                    </div>

                    <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
                      
                      {/* Left Column: athlete inputs (5 cols) */}
                      <div className="lg:col-span-5 space-y-4">
                        
                        {/* Excel Upload Zone */}
                        <div className="border border-dashed border-purple-500/20 bg-purple-950/10 hover:bg-purple-950/15 rounded-xl p-3.5 text-center transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Impor Cepat Dari Excel</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            id="bagan-excel-file"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                await handleBaganFileUpload(e.target.files[0]);
                              }
                            }}
                          />
                          <div className="flex flex-wrap gap-2 justify-center">
                            <label
                              htmlFor="bagan-excel-file"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/30 font-bold text-xs text-purple-300 cursor-pointer transition-all active:scale-[0.98]"
                            >
                              <Upload className="w-3.5 h-3.5" /> Pilih File Excel
                            </label>
                            <button
                              onClick={() => {
                                triggerClick();
                                downloadBaganExcelTemplate();
                                showToast('Template Excel Bagan berhasil diunduh!', 'success');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 font-bold text-xs cursor-pointer transition-all active:scale-[0.98]"
                            >
                              <Download className="w-3.5 h-3.5" /> Unduh Template
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-500 mt-1.5 font-sans">Template Roster berisi kolom <b>Nama</b> dan <b>Kontingen</b>. (Ukurannya menyesuaikan jumlah baris impor, maksimal 64 baris)</p>
                        </div>

                        {/* Parameter Pertandingan Bagan */}
                        <div className="bg-purple-955/40 border border-purple-500/20 p-3.5 rounded-xl space-y-2.5">
                          <span className="text-[10px] uppercase font-black text-purple-300 tracking-wider block">ID, KATEGORI & KAPASITAS BAGAN</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">KATEGORI JURUS</label>
                              <input
                                type="text"
                                value={baganKelas}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setBaganKelas(val);
                                  localStorage.setItem('silat_bagan_kelas', val);
                                }}
                                className="w-full bg-slate-950 border border-slate-800 text-xs px-2 py-1.5 rounded-lg focus:border-purple-500 text-purple-300 font-bold uppercase outline-none"
                                placeholder="CONTOH: TUNGGAL"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">GENDER</label>
                              <select
                                value={baganGender}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBaganGender(val);
                                  localStorage.setItem('silat_bagan_gender', val);
                                }}
                                className="w-full bg-[#12092e] bg-slate-950 border border-slate-800 text-xs px-1.5 py-1.5 rounded-lg focus:border-purple-500 text-purple-300 font-bold outline-none cursor-pointer"
                              >
                                <option value="PUTRA" className="bg-[#12092e] text-white font-semibold">PUTRA</option>
                                <option value="PUTRI" className="bg-[#12092e] text-white font-semibold">PUTRI</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">KATEGORI USIA</label>
                              <select
                                value={baganUsia}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBaganUsia(val);
                                  localStorage.setItem('silat_bagan_usia', val);
                                }}
                                className="w-full bg-[#12092e] bg-slate-950 border border-slate-800 text-xs px-1.5 py-1.5 rounded-lg focus:border-purple-500 text-purple-300 font-bold outline-none cursor-pointer"
                              >
                                <option value="PRA USIA DINI" className="bg-[#12092e] text-white font-semibold">PRA USIA DINI</option>
                                <option value="USIA DINI 1" className="bg-[#12092e] text-white font-semibold">USIA DINI 1</option>
                                <option value="USIA DINI 2" className="bg-[#12092e] text-white font-semibold">USIA DINI 2</option>
                                <option value="PRA REMAJA" className="bg-[#12092e] text-white font-semibold">PRA REMAJA</option>
                                <option value="REMAJA" className="bg-[#12092e] text-white font-semibold">REMAJA</option>
                                <option value="DEWASA" className="bg-[#12092e] text-white font-semibold">DEWASA</option>
                                <option value="MASTER 1" className="bg-[#12092e] text-white font-semibold">MASTER 1</option>
                                <option value="MASTER 2" className="bg-[#12092e] text-white font-semibold">MASTER 2</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">POOL</label>
                              <select
                                value={baganPool}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBaganPool(val);
                                  localStorage.setItem('silat_bagan_pool', val);
                                }}
                                className="w-full bg-[#12092e] bg-slate-950 border border-slate-800 text-xs px-1.5 py-1.5 rounded-lg focus:border-purple-500 text-purple-300 font-bold outline-none cursor-pointer"
                              >
                                <option value="NONE" className="bg-[#12092e] text-white font-semibold">NONE</option>
                                <option value="POOL-A" className="bg-[#12092e] text-white font-semibold">POOL-A</option>
                                <option value="POOL-B" className="bg-[#12092e] text-white font-semibold">POOL-B</option>
                                <option value="POOL-C" className="bg-[#12092e] text-white font-semibold">POOL-C</option>
                                <option value="POOL-D" className="bg-[#12092e] text-white font-semibold">POOL-D</option>
                                <option value="POOL-E" className="bg-[#12092e] text-white font-semibold">POOL-E</option>
                                <option value="POOL-F" className="bg-[#12092e] text-white font-semibold">POOL-F</option>
                                <option value="POOL-G" className="bg-[#12092e] text-white font-semibold">POOL-G</option>
                                <option value="POOL-H" className="bg-[#12092e] text-white font-semibold">POOL-H</option>
                                <option value="POOL-I" className="bg-[#12092e] text-white font-semibold">POOL-I</option>
                                <option value="POOL-J" className="bg-[#12092e] text-white font-semibold">POOL-J</option>
                                <option value="POOL-K" className="bg-[#12092e] text-white font-semibold">POOL-K</option>
                                <option value="POOL-L" className="bg-[#12092e] text-white font-semibold">POOL-L</option>
                                <option value="POOL-M" className="bg-[#12092e] text-white font-semibold">POOL-M</option>
                                <option value="POOL-N" className="bg-[#12092e] text-white font-semibold">POOL-N</option>
                                <option value="POOL-O" className="bg-[#12092e] text-white font-semibold">POOL-O</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/50">
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">JUMLAH ATLIT</label>
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={`${baganAthletes.filter((a: any) => a?.nama).length} ATLIT`}
                                className="w-full bg-slate-950 border border-slate-800 text-[11px] px-2 py-1.5 rounded-lg text-emerald-400 font-mono font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">KAPASITAS BAGAN</label>
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={`${baganAthletes.length} SLOT`}
                                className="w-full bg-slate-950 border border-slate-800 text-[11px] px-2 py-1.5 rounded-lg text-purple-400 font-mono font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">TAHAPAN</label>
                              <select
                                value={baganStartingStage}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBaganStartingStage(val);
                                  localStorage.setItem('silat_bagan_starting_stage', val);
                                }}
                                className="w-full bg-[#12092e] bg-slate-950 border border-slate-800 text-[11px] px-1.5 py-1.5 rounded-lg focus:border-purple-500 text-purple-300 font-bold outline-none cursor-pointer"
                              >
                                <option value="PENYISIHAN" className="bg-[#12092e] text-white font-semibold">PENYISIHAN</option>
                                <option value="PEREMPAT FINAL" className="bg-[#12092e] text-white font-semibold">PEREMPAT FINAL</option>
                                <option value="SEMI FINAL" className="bg-[#12092e] text-white font-semibold">SEMI FINAL</option>
                                <option value="FINAL" className="bg-[#12092e] text-white font-semibold">FINAL</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Manual Input Rows */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider">Editor Roster Atlit ({baganAthletes.length} Slot)</span>
                            <div className="flex flex-wrap gap-1 md:gap-1.5 justify-end">
                              <button
                                onClick={() => {
                                  triggerClick();
                                  const newA = [...baganAthletes, { nama: "", kontingen: "" }];
                                  setBaganAthletes(newA);
                                  localStorage.setItem('silat_bagan_athletes', JSON.stringify(newA));
                                  showToast('Slot baru ditambahkan.', 'success');
                                }}
                                className="text-[9px] px-2 py-1 bg-purple-900/40 hover:bg-purple-900/70 text-purple-300 border border-purple-500/20 rounded font-bold uppercase transition cursor-pointer"
                              >
                                + Slot
                              </button>
                              <button
                                onClick={() => {
                                  triggerClick();
                                  if (baganAthletes.length > 2) {
                                    const newA = baganAthletes.slice(0, -1);
                                    setBaganAthletes(newA);
                                    localStorage.setItem('silat_bagan_athletes', JSON.stringify(newA));
                                    showToast('Slot terakhir dihapus.', 'info');
                                  } else {
                                    showToast('Minimal harus ada 2 slot.', 'warning');
                                  }
                                }}
                                className="text-[9px] px-2 py-1 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-500/20 rounded font-bold uppercase transition cursor-pointer"
                              >
                                - Slot
                              </button>
                              <button
                                onClick={() => {
                                  triggerClick();
                                  const shuffled = [...baganAthletes].sort(() => Math.random() - 0.5);
                                  setBaganAthletes(shuffled);
                                  localStorage.setItem('silat_bagan_athletes', JSON.stringify(shuffled));
                                  showToast('Daftar Atlit berhasil diacak (shuffled)!', 'success');
                                }}
                                className="text-[9px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-pink-300 border border-pink-500/20 rounded font-bold uppercase transition cursor-pointer"
                              >
                                Shuffle
                              </button>
                              <button
                                onClick={() => {
                                  triggerClick();
                                  const cleared = Array(baganAthletes.length).fill(null).map((_, i) => ({ nama: "", kontingen: "" }));
                                  setBaganAthletes(cleared);
                                  localStorage.removeItem('silat_bagan_athletes');
                                  showToast('Daftar atlet dikosongkan.', 'info');
                                }}
                                className="text-[9px] px-2 py-1 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-500/20 rounded font-bold uppercase transition cursor-pointer"
                              >
                                Kosongkan
                              </button>
                            </div>
                          </div>

                          {/* List Inputs */}
                          <div className="max-h-[38vh] overflow-y-auto space-y-2 pr-1 border border-slate-800/60 p-2 rounded-xl bg-slate-950/20">
                            {baganAthletes.map((ath, idx) => {
                              const item = ath || { nama: "", kontingen: "" };
                              return (
                                <div key={idx} className="flex gap-2 items-center bg-slate-905 border border-slate-800/80 rounded-lg p-1.5">
                                  <span className="font-mono text-[9px] text-purple-400 w-5 text-center font-bold">#{idx + 1}</span>
                                  <div className="grid grid-cols-2 gap-2 flex-1">
                                    <input
                                      type="text"
                                      placeholder={`Nama Atlit ${idx + 1}`}
                                      value={item.nama}
                                      onChange={(e) => {
                                        const newA = [...baganAthletes];
                                        newA[idx] = { ...newA[idx], nama: e.target.value.toUpperCase() };
                                        setBaganAthletes(newA);
                                        localStorage.setItem('silat_bagan_athletes', JSON.stringify(newA));
                                      }}
                                      className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10.5px] text-white focus:border-purple-500 outline-none w-full"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Kontingen"
                                      value={item.kontingen}
                                      onChange={(e) => {
                                        const newA = [...baganAthletes];
                                        newA[idx] = { ...newA[idx], kontingen: e.target.value.toUpperCase() };
                                        setBaganAthletes(newA);
                                        localStorage.setItem('silat_bagan_athletes', JSON.stringify(newA));
                                      }}
                                      className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10.5px] text-slate-300 focus:border-purple-500 outline-none w-full"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Dynamic Visual Tree Render (7 cols) */}
                      <div className="lg:col-span-7 bg-slate-955 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
                        
                        <div className="flex justify-between items-center mb-1 border-b border-slate-800/40 pb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">Preview Bracket Interaktif ({N} Slot)</span>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[8px] text-slate-500 font-mono">RESPONSIVE COMPILING WORK</span>
                          </div>
                        </div>

                        {/* Beautiful horizontally scrollable tree container */}
                        <div className="flex-1 overflow-x-auto overflow-y-hidden select-text mt-2 pr-1 pb-2">
                          <div className="flex gap-4 h-full py-1" style={{ minWidth: `${totalRounds * 180}px` }}>
                            
                            {roundsData.map((roundObj: any, rIdx: number) => {
                              return (
                                <div key={rIdx} className="flex-1 flex flex-col justify-around h-full min-w-[170px] relative pt-6 border-r border-slate-900/10 last:border-r-0">
                                  {/* Headers styled beautifully matching the theme */}
                                  <div className="absolute top-0 left-0 right-2 text-center text-[7.5px] font-black tracking-widest text-black uppercase font-sans bg-amber-500 border border-amber-400 rounded py-0.5 select-none">
                                    {roundObj.roundName}
                                  </div>

                                  <div className="space-y-4 flex flex-col justify-around h-full">
                                    {roundObj.matches.map((m: any, mIdx: number) => {
                                      const blueAthlete = m.p1;
                                      const redAthlete = m.p2;
                                      const isBlueBye = !blueAthlete || !blueAthlete.nama || blueAthlete.nama.includes("BYE");
                                      const isRedBye = !redAthlete || !redAthlete.nama || redAthlete.nama.includes("BYE");
                                      const isMatchSingle = isBlueBye || isRedBye;
                                      const pId = m.partaiId || m.id || "-";
                                      
                                      const formatPreviewName = (nama: string | undefined, isMatchSingle?: boolean) => {
                                        if (isMatchSingle) return "-";
                                        if (!nama) return "-";
                                        const u = nama.toUpperCase();
                                        if (u === "BYE / KOSONG" || u.includes("BYE")) return "-";
                                        if (u.includes("MENUNGGU PEMENANG PARTAI")) {
                                          return `PEMENANG PTY ${u.replace("MENUNGGU PEMENANG PARTAI", "").trim()}`;
                                        }
                                        if (u.includes("PEMENANG PARTAI")) {
                                          return `PEMENANG PTY ${u.replace("PEMENANG PARTAI", "").trim()}`;
                                        }
                                        return u;
                                      };

                                      const formatPreviewKontingen = (kontingen: string | undefined, nama: string | undefined, isMatchSingle?: boolean) => {
                                        if (isMatchSingle) return "-";
                                        if (!nama || nama.toUpperCase().includes("BYE") || nama.toUpperCase() === "BYE / KOSONG") return "-";
                                        if (nama.toUpperCase().includes("MENUNGGU PEMENANG PARTAI") || nama.toUpperCase().includes("PEMENANG PARTAI")) return "-";
                                        if (!kontingen || kontingen === "-" || kontingen.toUpperCase() === "PEMENANG") return "-";
                                        return kontingen.toUpperCase();
                                      };

                                      return (
                                        <div key={`${pId}-${mIdx}`} className="bg-[#0b0e20]/95 border border-slate-800/80 rounded-lg relative shadow-md hover:border-purple-500/30 transition-all duration-200 flex flex-col">
                                          {/* Mini Badge top-left */}
                                          <div className="absolute -top-1.5 left-2 bg-[#0d142c] border border-slate-800 text-[6.5px] font-black px-1 py-0.2 rounded font-mono text-slate-300 shadow-sm z-10 tracking-widest uppercase">
                                            PTY {pId}
                                          </div>
                                          
                                          {/* Blue Participant (Top) */}
                                          <div className={`relative pt-2 pb-1 px-2 flex items-center justify-between border-b border-slate-800/60 min-w-0 ${isMatchSingle || isBlueBye ? 'opacity-30' : ''}`}>
                                            <div className="flex flex-col min-w-0">
                                              <span className="font-extrabold text-[8.5px] text-white truncate pr-1">
                                                {formatPreviewName(blueAthlete?.nama, isMatchSingle)}
                                              </span>
                                              <span className="text-[7.5px] text-slate-400 font-mono truncate">
                                                {formatPreviewKontingen(blueAthlete?.kontingen, blueAthlete?.nama, isMatchSingle)}
                                              </span>
                                            </div>
                                            <div className="absolute top-0 right-0 bottom-0 w-1 bg-blue-500" />
                                          </div>

                                          {/* Red Participant (Bottom) */}
                                          <div className={`relative pt-1 pb-2 px-2 flex items-center justify-between min-w-0 ${isMatchSingle || isRedBye ? 'opacity-30' : ''}`}>
                                            <div className="flex flex-col min-w-0">
                                              <span className="font-extrabold text-[8.5px] text-white truncate pr-1">
                                                {formatPreviewName(redAthlete?.nama, isMatchSingle)}
                                              </span>
                                              <span className="text-[7.5px] text-slate-400 font-mono truncate">
                                                {formatPreviewKontingen(redAthlete?.kontingen, redAthlete?.nama, isMatchSingle)}
                                              </span>
                                            </div>
                                            <div className="absolute top-0 right-0 bottom-0 w-1 bg-red-500" />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Champion Trophy Block at the extreme right of tree */}
                            <div className="flex flex-col justify-center items-center px-4 shrink-0 min-w-[130px] h-full">
                              <div className="p-2.5 bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 rounded-xl text-center shadow-lg w-full flex flex-col items-center">
                                <span className="text-[14px] animate-bounce">🏆</span>
                                <span className="font-black text-amber-400 text-[8px] block uppercase my-0.5">CHAMPION</span>
                                <div className="h-4.5 w-full bg-slate-950/80 rounded border border-slate-850 flex items-center justify-center text-[7px] text-amber-500/90 font-mono font-bold">
                                  WINNER P{roundsData[roundsData.length - 1]?.matches[0]?.partaiId || (N - 1)}
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>

                        <div className="text-slate-500 text-[8px] mt-1.5 italic font-sans text-center">
                          *Geser horizontal ke kanan untuk melihat rincian melaju ke semifinal, final & juara.
                        </div>

                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">Daftar Terisi: <b>{baganAthletes.filter((a: any) => a?.nama).length} / {baganAthletes.length} Atlit</b></span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { triggerClick(); setShowGenerateBaganPopup(false); }}
                          className="px-4 py-2 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          TUTUP PANEL
                        </button>
                        <button
                          onClick={() => {
                            triggerClick();
                            const startPartaiNum = jadwalLines.length + 1;
                            const rounds = getDynamicBracketRounds(baganAthletes, startPartaiNum);
                            const newLines: any[] = [];
                            
                            rounds.forEach((roundObj: any) => {
                              // Filter out BYE matches (which have no partaiId)
                              const activeMatches = roundObj.matches.filter((m: any) => m.partaiId !== null && m.partaiId !== undefined);
                              
                              // Sort matches of this round by partaiId ascending
                              const sortedMatches = [...activeMatches].sort((a, b) => (a.partaiId || 0) - (b.partaiId || 0));

                              sortedMatches.forEach((m: any) => {
                                const formatName = (name: string) => {
                                  const upper = (name || '').toUpperCase();
                                  if (upper.includes("BYE") || upper === "") {
                                    return "MENUNGGU PEMENANG PARTAI ...";
                                  }
                                  return upper;
                                };

                                newLines.push({
                                  partai: String(m.partaiId),
                                  kelas: baganKelas,
                                  gender: baganGender,
                                  kategoriUsia: baganUsia,
                                  tahapPertandingan: roundObj.roundName.toUpperCase(),
                                  atlitBiru: {
                                    nama: formatName(m.p1?.nama),
                                    kontingen: (m.p1?.kontingen || '').toUpperCase()
                                  },
                                  atlitMerah: {
                                    nama: formatName(m.p2?.nama),
                                    kontingen: (m.p2?.kontingen || '').toUpperCase()
                                  }
                                });
                              });
                            });

                            const updated = [...jadwalLines, ...newLines];
                            setJadwalLines(updated);
                            localStorage.setItem('silat_jadwal_lines', JSON.stringify(updated));
                            showToast(`Berhasil mengirimkan ${newLines.length} Partai dari Bagan ke Jadwal!`, "success");
                          }}
                          disabled={baganAthletes.filter((a: any) => a?.nama).length === 0}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 border ${
                            baganAthletes.filter((a: any) => a?.nama).length > 0
                              ? 'bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white border-emerald-500/20 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                          }`}
                        >
                          <Trophy className="w-3.5 h-3.5 animate-pulse" /> KIRIM KE JADWAL ({baganAthletes.filter((a: any) => a?.nama).length} Atlit)
                        </button>
                        <button
                          onClick={async () => {
                            triggerClick();
                            const filtered = baganAthletes.filter((a: any) => a?.nama);
                            await downloadTournamentBracketPDF(
                              matchState.eventName || "Kejuaraan Pencak Silat",
                              baganAthletes,
                              `BAGAN KATEGORI ${baganKelas} ${baganGender}`,
                              baganKelas,
                              baganGender,
                              baganUsia,
                              baganPool,
                              matchState.logoKiri,
                              matchState.logoKanan,
                              jadwalLines
                            );
                            showToast("Memulai unduhan PDF Bagan!", "success");
                          }}
                          disabled={baganAthletes.filter((a: any) => a?.nama).length === 0}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 border ${
                            baganAthletes.filter((a: any) => a?.nama).length > 0
                              ? 'bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white border-purple-500/20 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                          }`}
                        >
                          <Download className="w-3.5 h-3.5" /> UNDUH PDF BAGAN
                        </button>
                      </div>
                    </div>

                    </motion.div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* POPUP 3: GENERATE JADWAL MODEL */}
            <AnimatePresence>
              {showGenerateJadwalPopup && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-100"
                  >
                  
                  {/* Header */}
                  <div className="p-4 bg-indigo-950/20 border-b border-indigo-900/30 flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 text-sm md:text-base uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        GENERATOR DAN PARAMETER JADWAL PERTANDINGAN
                      </h3>
                      <p className="text-slate-400 text-[10px]">Unggah berkas jadwal pertandingan (.xlsx), edit data secara presisi, lalu gunakan rincian partai langsung di lapangan.</p>
                    </div>
                    <button
                      onClick={() => { triggerClick(); setShowGenerateJadwalPopup(false); }}
                      className="p-1 px-2.5 rounded-lg bg-red-950/30 text-red-400 border border-red-500/20 hover:bg-red-900/40 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      X
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 overflow-y-auto space-y-4 font-sans text-xs">
                    
                    {/* Control Bar: Excel Upload & reset */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-indigo-950/10 border border-indigo-500/10 p-3.5 rounded-xl">
                      <div className="md:col-span-6">
                        <p className="text-xs font-black text-indigo-300 uppercase tracking-wide">Unggah Spreadsheet Jadwal Partai</p>
                        <p className="text-[10px] text-slate-400 font-sans">Pastikan kolom spreadsheet mengandung: Partai, Kategori, Gender, Kategori Usia, Tahap, Nama Merah, Kontingen Merah, Nama Biru, Kontingen Biru</p>
                      </div>
                      <div className="md:col-span-6 flex flex-col gap-2 w-full max-w-lg ml-auto">
                        {/* Baris 1: Gelanggang (kiri) & Unduh Template (kanan) */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* GELANGGANG Selector Dropdown Button */}
                          <div className="relative w-full">
                            <button
                              onClick={() => {
                                triggerClick();
                                setShowGelanggangDropdown(!showGelanggangDropdown);
                              }}
                              className="w-full h-10 px-4 bg-indigo-950/40 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold text-xs rounded-xl cursor-pointer transition flex items-center justify-between focus:outline-none shadow-md"
                            >
                              <span className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                <span>GELANGGANG: <b className="text-cyan-400 font-extrabold">{selectedGelanggang}</b></span>
                              </span>
                              <ChevronDown className={`w-3.5 h-3.5 text-indigo-300 transition-transform duration-200 ${showGelanggangDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* Dropdown Options List */}
                            {showGelanggangDropdown && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setShowGelanggangDropdown(false)} 
                                />
                                <div className="absolute right-0 mt-2 w-full bg-slate-900 border border-indigo-500/35 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-fade-in">
                                  {['GELANGGANG 1', 'GELANGGANG 2', 'GELANGGANG 3', 'GELANGGANG 4', 'GELANGGANG 5', 'GELANGGANG 6', 'GELANGGANG 7'].map((gName) => (
                                    <button
                                      key={gName}
                                      onClick={() => {
                                        triggerClick();
                                        setSelectedGelanggang(gName);
                                        localStorage.setItem('silat_selected_gelanggang', gName);
                                        updateMatchState({ ...matchStateRef.current, gelanggang: gName });
                                        setShowGelanggangDropdown(false);
                                        showToast(`Set Gelanggang ke: ${gName}`, 'success');
                                      }}
                                      className={`w-full text-left px-4 py-2.5 hover:bg-indigo-950 text-xs transition cursor-pointer font-bold flex items-center justify-between ${
                                        selectedGelanggang === gName ? 'text-cyan-400 bg-indigo-900/30' : 'text-slate-300'
                                      }`}
                                    >
                                      <span>{gName}</span>
                                      {selectedGelanggang === gName && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              triggerClick();
                              downloadJadwalExcelTemplate();
                              showToast('Template Spreadsheet Jadwal berhasil diunduh!', 'success');
                            }}
                            className="w-full h-10 px-4 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-400" /> UNDUH TEMPLATE
                          </button>
                        </div>

                        {/* Baris 2: Kosongkan Jadwal (kiri) & Impor File Jadwal (kanan) */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              triggerClick();
                              setJadwalLines([]);
                              localStorage.removeItem('silat_jadwal_lines');
                              showToast('Jadwal pertandingan dikosongkan.', 'info');
                            }}
                            className="w-full h-10 px-4 hover:bg-red-900/30 text-red-400 border border-red-500/20 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 bg-red-950/15 shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" /> KOSONGKAN JADWAL
                          </button>

                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            id="jadwal-excel-file"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                await handleJadwalFileUpload(e.target.files[0]);
                              }
                            }}
                          />
                          <label
                            htmlFor="jadwal-excel-file"
                            className="w-full h-10 px-4 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 font-bold text-xs rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5 bg-indigo-950/25 shadow-md text-center"
                          >
                            <Upload className="w-3.5 h-3.5 text-indigo-400" /> IMPOR FILE JADWAL
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Table Preview */}
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                      <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-300 uppercase">Daftar Jadwal Pertandingan Yang Terbuka ({jadwalLines.length} Partai)</span>
                        <div className="flex items-center gap-3">
                          {/* POOL Dropdown Selection */}
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">POOL:</span>
                            <select
                              value={baganPool}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBaganPool(val);
                                localStorage.setItem('silat_bagan_pool', val);
                                showToast(`Set Pool ke: ${val}`, 'success');
                              }}
                              className="bg-transparent text-[10px] text-cyan-400 font-black outline-none cursor-pointer hover:text-cyan-300 transition-colors"
                            >
                              <option value="NONE">NONE</option>
                              <option value="POOL-A">POOL-A</option>
                              <option value="POOL-B">POOL-B</option>
                              <option value="POOL-C">POOL-C</option>
                              <option value="POOL-D">POOL-D</option>
                              <option value="POOL-E">POOL-E</option>
                              <option value="POOL-F">POOL-F</option>
                              <option value="POOL-G">POOL-G</option>
                              <option value="POOL-H">POOL-H</option>
                              <option value="POOL-I">POOL-I</option>
                              <option value="POOL-J">POOL-J</option>
                              <option value="POOL-K">POOL-K</option>
                              <option value="POOL-L">POOL-L</option>
                              <option value="POOL-M">POOL-M</option>
                              <option value="POOL-N">POOL-N</option>
                              <option value="POOL-O">POOL-O</option>
                            </select>
                          </div>

                          <button
                            onClick={() => {
                              triggerClick();
                              const newParty = {
                                partai: String(jadwalLines.length + 1),
                                kelas: "TUNGGAL",
                                gender: "PUTRA",
                                kategoriUsia: "REMAJA",
                                tahapPertandingan: "PENYISIHAN",
                                atlitMerah: { nama: "PESILAT MERAH BARU", kontingen: "CONTINGENT MERAH" },
                                atlitBiru: { nama: "PESILAT BIRU BARU", kontingen: "CONTINGENT BIRU" }
                              };
                              const updated = [...jadwalLines, newParty];
                              setJadwalLines(updated);
                              localStorage.setItem('silat_jadwal_lines', JSON.stringify(updated));
                              showToast('Satu Baris Jadwal Kosong Baru Ditambahkan!', 'success');
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-bold uppercase select-none flex items-center gap-0.5 cursor-pointer text-[9px] md:text-[10px]"
                          >
                            <Plus className="w-3 h-3 animate-pulse" /> Tambah Baris Partai
                          </button>
                        </div>
                      </div>

                      {jadwalLines.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-xs font-sans">
                          Belum ada jadwal pertandingan yang diimpor. Silahkan klik impor untuk mengunggah jadwal spreadsheet Excel (.xlsx).
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[48vh]">
                          <table className="w-full text-left border-collapse text-[11px] font-sans">
                            <thead>
                              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[9px] md:text-[10px]">
                                <th className="p-2 w-12 text-center font-bold">PARTAI</th>
                                <th className="p-2 w-14 text-center">KATEGORI</th>
                                <th className="p-2 w-16 text-center">GENDER</th>
                                <th className="p-2 w-20 text-center">USIA</th>
                                <th className="p-2 w-24 text-center">TAHAPAN</th>
                                <th className="p-2 bg-blue-950/10 border-l border-slate-850 text-blue-400">SUDUT BIRU (ATLET & TIM)</th>
                                <th className="p-2 bg-red-950/10 border-l border-slate-850 text-red-400">SUDUT MERAH (ATLET & TIM)</th>
                                <th className="p-2 text-center w-28">FITUR KONTROL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jadwalLines.map((row, idx) => {
                                return (
                                  <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition">
                                    <td className="p-2 text-center font-mono font-bold text-white">
                                      <input
                                        type="text"
                                        value={row.partai}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].partai = e.target.value;
                                          updateJadwalLines(copy);
                                        }}
                                        className="bg-transparent text-center border-none focus:bg-slate-950 rounded w-full font-bold focus:outline-purple-500 py-0.5"
                                      />
                                    </td>
                                    <td className="p-2 text-center uppercase">
                                      <input
                                        type="text"
                                        value={row.kelas}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].kelas = e.target.value.toUpperCase();
                                          updateJadwalLines(copy);
                                        }}
                                        className="bg-transparent text-center border-none focus:bg-slate-950 rounded w-full focus:outline-purple-500 py-0.5"
                                      />
                                    </td>
                                    <td className="p-2 text-center font-mono text-[10px]">
                                      <select
                                        value={row.gender}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].gender = e.target.value;
                                          updateJadwalLines(copy);
                                        }}
                                        className="bg-slate-900 border-none rounded py-0.5 w-full text-center text-[10px] focus:outline-purple-500"
                                      >
                                        <option value="PUTRA">PUTRA</option>
                                        <option value="PUTRI">PUTRI</option>
                                      </select>
                                    </td>
                                    <td className="p-2 text-center">
                                      <input
                                        type="text"
                                        value={row.kategoriUsia}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].kategoriUsia = e.target.value.toUpperCase();
                                          updateJadwalLines(copy);
                                        }}
                                        className="bg-transparent text-center border-none focus:bg-slate-950 rounded w-full focus:outline-purple-500 py-0.5"
                                      />
                                    </td>
                                    <td className="p-2 text-center">
                                      <input
                                        type="text"
                                        value={row.tahapPertandingan}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].tahapPertandingan = e.target.value.toUpperCase();
                                          updateJadwalLines(copy);
                                        }}
                                        className="bg-transparent text-center border-none focus:bg-slate-950 rounded w-full focus:outline-purple-500 py-0.5"
                                      />
                                    </td>
                                    
                                    {/* Sudut Biru Fields */}
                                    <td className="p-2 bg-blue-950/5 border-l border-slate-800">
                                      <div className="space-y-1">
                                        <input
                                          type="text"
                                          placeholder="Nama Pesilat"
                                          value={row.atlitBiru?.nama}
                                          onChange={(e) => {
                                            const copy = [...jadwalLines];
                                            copy[idx].atlitBiru = { ...copy[idx].atlitBiru, nama: e.target.value.toUpperCase() };
                                            updateJadwalLines(copy);
                                          }}
                                          className="bg-slate-950/60 border border-blue-500/15 px-1.5 py-0.5 rounded text-[11px] font-bold text-blue-300 focus:outline-blue-500 w-full"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Kontingen"
                                          value={row.atlitBiru?.kontingen}
                                          onChange={(e) => {
                                            const copy = [...jadwalLines];
                                            copy[idx].atlitBiru = { ...copy[idx].atlitBiru, kontingen: e.target.value.toUpperCase() };
                                            updateJadwalLines(copy);
                                          }}
                                          className="bg-slate-950/60 border border-slate-800/80 px-1.5 py-0 rounded text-[9px] text-slate-400 focus:outline-blue-500 w-full"
                                        />
                                      </div>
                                    </td>

                                    {/* Sudut Merah Fields */}
                                    <td className="p-2 bg-red-950/5 border-l border-slate-800">
                                      <div className="space-y-1">
                                        <input
                                          type="text"
                                          placeholder="Nama Pesilat"
                                          value={row.atlitMerah?.nama}
                                          onChange={(e) => {
                                            const copy = [...jadwalLines];
                                            copy[idx].atlitMerah = { ...copy[idx].atlitMerah, nama: e.target.value.toUpperCase() };
                                            updateJadwalLines(copy);
                                          }}
                                          className="bg-slate-950/60 border border-red-500/15 px-1.5 py-0.5 rounded text-[11px] font-bold text-red-300 focus:outline-red-500 w-full"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Kontingen"
                                          value={row.atlitMerah?.kontingen}
                                          onChange={(e) => {
                                            const copy = [...jadwalLines];
                                            copy[idx].atlitMerah = { ...copy[idx].atlitMerah, kontingen: e.target.value.toUpperCase() };
                                            updateJadwalLines(copy);
                                          }}
                                          className="bg-slate-950/60 border border-slate-800/80 px-1.5 py-0 rounded text-[9px] text-slate-400 focus:outline-red-500 w-full"
                                        />
                                      </div>
                                    </td>

                                    {/* Use and Delete Buttons */}
                                    <td className="p-2 text-center border-l border-slate-800">
                                      <div className="flex gap-1.5 justify-center">
                                        <button
                                          onClick={() => {
                                            triggerClick();
                                            
                                            const upperKelas = row.kelas ? row.kelas.toUpperCase() : "";
                                            const upperGender = row.gender ? row.gender.toUpperCase() : "PUTRA";
                                            const upperUsia = row.kategoriUsia ? row.kategoriUsia.toUpperCase() : "REMAJA";
                                            const upperTahap = row.tahapPertandingan ? row.tahapPertandingan.toUpperCase() : "PENYISIHAN";

                                            // Update matchState and local input variables in sequence
                                            let dur = getMatchDuration(upperKelas, upperTahap);
                                            updateMatchState({
                                              ...matchState,
                                              partai: row.partai, activeJuriIds: [],
                                              kelas: upperKelas,
                                              gender: upperGender,
                                              kategoriUsia: upperUsia,
                                              tahapPertandingan: upperTahap,
                                              durasiBabak: dur,
                                              sisaWaktu: 0,
                                              timer2Value: 0,
                                              babakAktif: 1,
                                              sistemTanding: row.sistemTanding,
                                              atlitMerah: {
                                                nama: row.atlitMerah?.nama || "",
                                                kontingen: row.atlitMerah?.kontingen || ""
                                              },
                                              atlitBiru: {
                                                nama: row.atlitBiru?.nama || "",
                                                kontingen: row.atlitBiru?.kontingen || ""
                                              }
                                            });

                                            // Sync the local states inside Secretariat Panel form
                                            setLocalPartai(row.partai);
                                            setLocalKelas(upperKelas);
                                            setLocalAtlitMerahNama(row.atlitMerah?.nama || "");
                                            setLocalAtlitMerahKontingen(row.atlitMerah?.kontingen || "");
                                            setLocalAtlitBiruNama(row.atlitBiru?.nama || "");
                                            setLocalAtlitBiruKontingen(row.atlitBiru?.kontingen || "");

                                            showToast(`Sukses memuat Partai ${row.partai} ke Cockpit Arena!`, "success");
                                            setShowGenerateJadwalPopup(false);
                                          }}
                                          className="flex-1 py-1.5 rounded-lg bg-indigo-900/70 hover:bg-indigo-800 border border-indigo-500/30 text-white font-black text-[9px] uppercase tracking-wider transition hover:shadow active:scale-95 cursor-pointer"
                                        >
                                          Gunakan
                                        </button>
                                        <button
                                          onClick={() => {
                                            triggerClick();
                                            if (confirm(`Apakah Anda yakin ingin menghapus partai ${row.partai}?`)) {
                                              const updated = jadwalLines.filter((_, rIdx) => rIdx !== idx);
                                              // Renumber the partai numbers so they are sequential
                                              const renumbered = updated.map((line, rIdx) => ({
                                                ...line,
                                                partai: String(rIdx + 1)
                                              }));
                                              updateJadwalLines(renumbered);
                                              showToast(`Partai ${row.partai} berhasil dihapus!`, 'success');
                                            }
                                          }}
                                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-500/25 text-red-400 hover:text-white transition active:scale-95 cursor-pointer"
                                          title="Hapus Baris Partai"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">Daftar Jadwal: <b>{jadwalLines.length} Partai Pertandingan</b></span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { triggerClick(); setShowGenerateJadwalPopup(false); }}
                        className="px-4 py-2 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        TUTUP
                      </button>
                      <button
                        onClick={async () => {
                          triggerClick();
                          await downloadMatchSchedulePDF(
                            matchState.eventName || "Kejuaraan Pencak Silat", 
                            jadwalLines,
                            matchState.logoKiri,
                            matchState.logoKanan,
                            selectedGelanggang,
                            matchState.tempatPelaksanaan,
                            matchState.waktuPelaksanaan,
                            baganPool
                          );
                          showToast("Memulai unduhan PDF Jadwal!", "success");
                        }}
                        disabled={jadwalLines.length === 0}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 border ${
                          jadwalLines.length > 0
                            ? 'bg-gradient-to-r from-indigo-800 to-cyan-800 hover:from-indigo-700 hover:to-cyan-700 text-white border-indigo-500/20 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" /> UNDUH PDF JADWAL
                      </button>
                      <button
                        onClick={() => {
                          triggerClick();
                          if (jadwalLines.length === 0) {
                            showToast("Belum ada jadwal untuk diterapkan!", "warning");
                            return;
                          }

                          // 1. Map and save all schedules to silat_excel_matches for Secretary Panel queue
                          const mappedMatches = jadwalLines.map((row) => ({
                            'Partai': row.partai,
                            'Kelas': row.kelas,
                            'Gender': row.gender,
                            'Kategori Usia': row.kategoriUsia,
                            'Tahap Pertandingan': row.tahapPertandingan,
                            'Sistem Tanding': row.sistemTanding || 'BATTLE',
                            'Nama Pesilat Merah': row.atlitMerah?.nama || '',
                            'Kontingen Merah': row.atlitMerah?.kontingen || '',
                            'Nama Pesilat Biru': row.atlitBiru?.nama || '',
                            'Kontingen Biru': row.atlitBiru?.kontingen || '',
                            'Nama Event': matchState.eventName || 'Kejuaraan Pencak Silat',
                            'Durasi Babak (Menit)': getMatchDurationString(row.kelas, row.tahapPertandingan)
                          }));

                          try {
                            localStorage.setItem('silat_excel_matches', JSON.stringify(mappedMatches));
                          } catch (err) {
                            console.warn("Gagal menyimpan jadwal pertandingan massal:", err);
                          }

                          // 2. Load the first party as the active match in Cockpit / Arena
                          const firstRow = jadwalLines[0];
                          if (firstRow) {
                            let dur = getMatchDuration(firstRow.kelas, firstRow.tahapPertandingan);
                            updateMatchState({
                              ...matchState,
                              partai: firstRow.partai,
                              kelas: firstRow.kelas,
                              gender: firstRow.gender,
                              kategoriUsia: firstRow.kategoriUsia,
                              tahapPertandingan: firstRow.tahapPertandingan,
                              durasiBabak: dur,
                              sisaWaktu: 0,
                              babakAktif: 1,
                              sistemTanding: firstRow.sistemTanding,
                              gelanggang: firstRow.gelanggang || selectedGelanggang || 'GELANGGANG 1',
                              atlitMerah: {
                                nama: firstRow.atlitMerah?.nama || "",
                                kontingen: firstRow.atlitMerah?.kontingen || ""
                              },
                              atlitBiru: {
                                nama: firstRow.atlitBiru?.nama || "",
                                kontingen: firstRow.atlitBiru?.kontingen || ""
                              },
                              silat_excel_matches: mappedMatches,
                              activeJuriIds: []
                            });

                            // 3. Sync the local input fields in Sekretaris Panel Form
                            setLocalPartai(firstRow.partai);
                            setLocalKelas(firstRow.kelas ? firstRow.kelas.toUpperCase() : "");
                            setLocalAtlitMerahNama(firstRow.atlitMerah?.nama || "");
                            setLocalAtlitMerahKontingen(firstRow.atlitMerah?.kontingen || "");
                            setLocalAtlitBiruNama(firstRow.atlitBiru?.nama || "");
                            setLocalAtlitBiruKontingen(firstRow.atlitBiru?.kontingen || "");
                          }

                          showToast(`Sukses menerapkan ${jadwalLines.length} Partai ke Parameter Panel Sekretaris!`, "success");
                          setShowGenerateJadwalPopup(false);
                        }}
                        disabled={jadwalLines.length === 0}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 border ${
                          jadwalLines.length > 0
                            ? 'bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white border-emerald-500/20 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> TERAPKAN SEMUA JADWAL
                      </button>
                    </div>
                  </div>

                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          </motion.div>
        )}

        {/* REGISTRASI DATA (New Independent Page) */}
        {role === 'REGISTRASI_DATA' && (
          <RegistrasiDataPanel 
            onBack={() => {
              triggerClick();
              setRole('SEKRETARIS');
            }}
            jadwalLines={jadwalLines}
            onUpdateJadwalLines={(lines) => {
              setJadwalLines(lines);
              localStorage.setItem('silat_jadwal_lines', JSON.stringify(lines));
            }}
            onApplyJadwal={() => {
              if (jadwalLines.length === 0) {
                showToast("Belum ada jadwal untuk diterapkan!", "warning");
                return;
              }

              // 1. Map and save all schedules to silat_excel_matches for Secretary Panel queue
              const mappedMatches = jadwalLines.map((row) => ({
                'Partai': row.partai,
                'Kelas': row.kelas ? row.kelas.toUpperCase() : '',
                'Gender': row.gender ? row.gender.toUpperCase() : 'PUTRA',
                'Kategori Usia': row.kategoriUsia ? row.kategoriUsia.toUpperCase() : 'REMAJA',
                'Tahap Pertandingan': row.tahapPertandingan ? row.tahapPertandingan.toUpperCase() : 'PENYISIHAN',
                'Sistem Tanding': row.sistemTanding || 'BATTLE',
                'Nama Pesilat Merah': row.atlitMerah?.nama || '',
                'Kontingen Merah': row.atlitMerah?.kontingen || '',
                'Nama Pesilat Biru': row.atlitBiru?.nama || '',
                'Kontingen Biru': row.atlitBiru?.kontingen || '',
                'Nama Event': matchState.eventName || 'Kejuaraan Pencak Silat',
                'Durasi Babak (Menit)': getMatchDurationString(row.kelas, row.tahapPertandingan)
              }));

              try {
                localStorage.setItem('silat_excel_matches', JSON.stringify(mappedMatches));
              } catch (err) {
                console.warn("Gagal menyimpan jadwal pertandingan massal:", err);
              }

              // 2. Load the first party as the active match in Cockpit / Arena
              const firstRow = jadwalLines[0];
              if (firstRow) {
                const upperKelas = firstRow.kelas ? firstRow.kelas.toUpperCase() : "";
                const upperGender = firstRow.gender ? firstRow.gender.toUpperCase() : "PUTRA";
                const upperUsia = firstRow.kategoriUsia ? firstRow.kategoriUsia.toUpperCase() : "REMAJA";
                const upperTahap = firstRow.tahapPertandingan ? firstRow.tahapPertandingan.toUpperCase() : "PENYISIHAN";

                let dur = getMatchDuration(upperKelas, upperTahap);
                updateMatchState({
                  ...matchState,
                  partai: firstRow.partai,
                  kelas: upperKelas,
                  gender: upperGender,
                  kategoriUsia: upperUsia,
                  tahapPertandingan: upperTahap,
                  durasiBabak: dur,
                  sisaWaktu: 0,
                  babakAktif: 1,
                  sistemTanding: firstRow.sistemTanding,
                  gelanggang: firstRow.gelanggang || selectedGelanggang || 'GELANGGANG 1',
                  atlitMerah: {
                    nama: firstRow.atlitMerah?.nama || "",
                    kontingen: firstRow.atlitMerah?.kontingen || ""
                  },
                  atlitBiru: {
                    nama: firstRow.atlitBiru?.nama || "",
                    kontingen: firstRow.atlitBiru?.kontingen || ""
                  },
                  silat_excel_matches: mappedMatches,
                  activeJuriIds: []
                });

                // 3. Sync the local input fields in Sekretaris Panel Form
                setLocalPartai(firstRow.partai);
                setLocalKelas(upperKelas);
                setLocalAtlitMerahNama(firstRow.atlitMerah?.nama || "");
                setLocalAtlitMerahKontingen(firstRow.atlitMerah?.kontingen || "");
                setLocalAtlitBiruNama(firstRow.atlitBiru?.nama || "");
                setLocalAtlitBiruKontingen(firstRow.atlitBiru?.kontingen || "");
              }

              showToast(`Sukses menerapkan ${jadwalLines.length} Partai ke Parameter Panel Sekretaris!`, "success");
            }}
          />
        )}

        {/* MONITOR DISPLAY (Main Spectacular Arena Board View) */}
        {role === 'MONITOR' && (
          <MonitorPanel 
            matchState={matchState} 
            onBackToLanding={() => selectRoleAndTriggerAudio('LANDING')}
          />
        )}

      </AnimatePresence>

        {/* Spectacular Persistent Role Switcher Footer */}
        {role !== 'LANDING' && !(role === 'MONITOR' && isFullscreen) && !(role === 'SEKRETARIS' && isFullscreen) && !(role === 'JURI_PANEL' && isFullscreen) && !(role === 'DEWAN' && isFullscreen) && (
          <footer className="h-14 bg-black flex items-center justify-between px-6 border-t border-purple-500/10 z-20 shrink-0">
            <div className="flex gap-1.5 flex-wrap">
              {!((role === 'JURI_PANEL' || role === 'DEWAN' || role === 'SEKRETARIS') && isFullscreen) && (
                <button
                  onClick={() => selectRoleAndTriggerAudio('LANDING')}
                  className="px-3.5 py-1.5 text-[10px] font-bold rounded-lg border uppercase tracking-widest border-purple-500/30 text-purple-300 hover:bg-purple-950/40 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <ArrowLeft className="w-3 h-3" /> Beranda Utama
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-[10px] text-white/20 uppercase font-mono tracking-widest hidden sm:inline">
                Nebeng's Official Digital Scoring Silat TGR Versi 3.1 | IRFAN, S.Pd.
              </div>
              {!((role === 'JURI_PANEL' || role === 'DEWAN' || role === 'SEKRETARIS') && isFullscreen) && (
                <button 
                  onClick={() => {
                    triggerClick();
                    setRotated(!rotated);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${rotated ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-purple-400'}`}
                  title="Rotasi Layar Landscape"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </footer>
        )}

      </div>



      {/* 🔐 POPUP STATUS LISENSI (KOKPIT KONTROL LISENSI) */}
      <AnimatePresence>
        {showLicenseStatusPopup && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-gradient-to-b from-[#18092a] to-black border border-purple-500/30 rounded-2xl p-5 shadow-2xl relative space-y-4 text-white"
            >
              {/* Reset button at top right corner */}
              <button
                type="button"
                onClick={() => {
                  triggerClick();
                  setShowLicenseStatusPopup(false);
                }}
                className="absolute top-4 right-4 text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 p-1.5 rounded-lg border border-purple-500/20 cursor-pointer transition-all active:scale-95 animate-in fade-in"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-purple-500/20 pb-3">
                <Shield className="w-5 h-5 text-purple-400 animate-pulse" />
                <div className="text-left">
                  <h3 className="font-extrabold uppercase tracking-wider text-purple-300 text-sm font-display">
                    KOKPIT KONTROL LISENSI
                  </h3>
                  <span className="text-[9px] text-purple-400/80 font-mono block">Status Proteksi & Manajemen Sistem</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Device ID Display & Copy */}
                <div className="bg-black/50 border border-purple-950 p-3 rounded-xl space-y-1.5 text-left">
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300">
                    <span>Device ID Perangkat Anda</span>
                    <span className="text-[7px] px-1.5 py-0.2 bg-purple-900/40 border border-purple-500/25 rounded text-amber-400 font-mono font-bold">Signature</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-mono text-xs font-black text-amber-300 select-all tracking-wider break-all">
                      {serverDeviceId}
                    </span>
                    <button
                      onClick={() => {
                        triggerClick();
                        navigator.clipboard.writeText(serverDeviceId);
                        showToast('Device ID berhasil disalin ke clipboard!', 'success');
                      }}
                      className="p-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/20 rounded text-purple-300 hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Salin Device ID"
                    >
                      <Upload className="w-3.5 h-3.5 rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Activation Key Generated & Copy */}
                <div className="bg-black/50 border border-purple-950 p-3 rounded-xl space-y-1.5 text-left">
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300">
                    <span>KUNCI AKTIVASI (AUTO-MATH)</span>
                    <span className="text-[7px] px-1.5 py-0.2 bg-green-950/40 border border-green-500/25 rounded text-green-400 font-mono font-bold">Valid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-mono text-xs font-black text-green-400 select-all tracking-widest break-all">
                      {generateActivationKey(serverDeviceId)}
                    </span>
                    <button
                      onClick={() => {
                        triggerClick();
                        navigator.clipboard.writeText(generateActivationKey(serverDeviceId));
                        showToast('Kunci Aktivasi berhasil disalin ke clipboard!', 'success');
                      }}
                      className="p-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/20 rounded text-purple-300 hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Salin Kunci Aktivasi"
                    >
                      <Upload className="w-3.5 h-3.5 rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-2 bg-purple-950/30 border border-purple-500/15 p-2.5 rounded-xl text-[10px] font-mono text-left">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[8px] uppercase tracking-wider block">Mode Sandbox</span>
                    <span className={`font-black text-[9px] uppercase tracking-tight ${!isOutsideSandbox() ? 'text-green-400' : 'text-amber-400'}`}>
                      {!isOutsideSandbox() ? '✅ SANDBOX (FREE)' : '⚠️ OFFLINE/LOCAL'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 border-l border-purple-500/15 pl-2.5">
                    <span className="text-slate-400 text-[8px] uppercase tracking-wider block">Status Proteksi</span>
                    <span className={`font-black text-[9px] uppercase tracking-tight ${isCurrentlyLocked ? 'text-red-400' : 'text-green-400'}`}>
                      {isCurrentlyLocked ? '🚨 TERKUNCI' : '✅ TERBUKA'}
                    </span>
                  </div>
                </div>

                {/* Simulation Control Block */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center bg-purple-950/20 border border-purple-500/10 p-2 rounded-lg text-[10px] font-mono text-left">
                    <span className="text-slate-400">Status Simulasi:</span>
                    <span className={`font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-[8.5px] ${
                      isSimulatedLocked
                        ? 'bg-amber-550/10 text-amber-400 border border-amber-555/35'
                        : 'bg-green-550/10 text-green-450 border border-green-555/35'
                    }`}>
                      {isSimulatedLocked ? '🚨 TERKUNCI' : '✅ BERJALAN'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerClick();
                        toggleSimulatedLock();
                      }}
                      className={`py-2 px-2 rounded-xl font-bold uppercase text-[9px] tracking-wider transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSimulatedLocked
                          ? 'bg-gradient-to-r from-green-700 to-indigo-700 hover:from-green-600 hover:to-indigo-650 text-white shadow-md border border-green-500/30'
                          : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-550 hover:to-orange-550 text-white shadow-md border border-amber-500/30'
                      }`}
                    >
                      {isSimulatedLocked ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          UN-LOCK
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          SIMULASIKAN
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerClick();
                        localStorage.removeItem('silat_activation_key');
                        localStorage.removeItem('silat_simulated_lock');
                        setIsAppLicensed(false);
                        setIsSimulatedLocked(false);
                        setActivationKeyInput('');
                        if (soundEnabled) playClickSound();
                        fetch('/api/license/reset', { method: 'POST' })
                          .then(() => showToast('Status Lisensi Berhasil Direset pada Server!', 'success'))
                          .catch(() => showToast('Gagal mereset lisensi di server lokal.', 'warning'));
                      }}
                      className="py-2.5 px-2 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-300 hover:text-white rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      RESET LISENSI
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-500 font-mono text-center leading-normal pt-1">
                    Tekan tombol simulasi di atas untuk menguji penguncian sistem secara nyata.
                  </p>
                </div>
              </div>

              <div className="border-t border-purple-500/25 pt-3.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    triggerClick();
                    setShowLicenseStatusPopup(false);
                  }}
                  className="px-4 py-2 bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white rounded-lg border border-purple-500/30 text-xs font-bold uppercase transition-all active:scale-[0.95] cursor-pointer"
                >
                  TUTUP
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WMP AUTO-PAUSE POPUP / NOTIFICATION */}
      <AnimatePresence>
        {role !== 'LANDING' && matchState.wmpTriggered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#00000ed2] backdrop-blur-md flex items-center justify-center p-4 z-[100] text-center select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="max-w-xl w-full bg-[#140a24] border-2 border-amber-500 rounded-3xl p-8 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-white"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500 text-amber-500 flex items-center justify-center animate-pulse">
                  <span className="text-3xl font-bold font-mono">⚠️</span>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] text-amber-500 font-extrabold uppercase tracking-[0.2em] font-mono">
                  NOTIFIKASI SELISIH NILAI
                </h3>
                <h2 className="text-3xl font-black mt-2 font-sans uppercase tracking-tight">
                  SELISIH SKOR TERDETEKSI
                </h2>
              </div>

              <div className="bg-[#24133d]/50 p-5 rounded-2xl border border-purple-500/25 space-y-3">
                <p className="text-sm leading-relaxed text-slate-300">
                  Nilai sudah selisih <span className="font-extrabold text-amber-400 font-mono text-lg">{
                    (matchState.kategoriUsia || '').toUpperCase().includes('PRA') ? '20' : '30'
                  }</span> pada babak ke-<span className="font-black text-white font-mono text-lg">{matchState.babakAktif}</span> untuk kategori <span className="font-extrabold text-purple-300">{matchState.kategoriUsia || "REMAJA"}</span>.
                </p>
                
                {/* Display total scores */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-purple-500/10 font-mono">
                  <div className="text-center p-2 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300">
                    <span className="text-[9px] block text-slate-400">MERAH</span>
                    <span className="text-2xl font-black">{calculateFinalScore('MERAH', matchState)}</span>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-300">
                    <span className="text-[9px] block text-slate-400">BIRU</span>
                    <span className="text-2xl font-black">{calculateFinalScore('BIRU', matchState)}</span>
                  </div>
                </div>
              </div>

              {role === 'SEKRETARIS' ? (
                <div className="space-y-4">
                  <p className="text-xs text-amber-300 font-medium">Apakah pertandingan akan dihentikan dan menetapkan pemenang?</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        triggerClick();
                        // "Tidak" -> Close and keep timer paused. Set bypass to prevent re-triggering.
                        const scoreB = calculateFinalScore('BIRU', matchState);
                        const scoreR = calculateFinalScore('MERAH', matchState);
                        const currentDiff = Math.abs(scoreB - scoreR);
                        updateMatchState({
                          ...matchState,
                          wmpTriggered: false,
                          wmpBypassed: true,
                          wmpBypassedScoreDiff: currentDiff,
                          timerBerjalan: false
                        });
                      }}
                      className="py-3.5 bg-red-950/40 hover:bg-red-900/40 active:scale-95 border border-red-500/30 hover:border-red-555 rounded-2xl text-xs font-black uppercase tracking-widest text-red-300 transition-all cursor-pointer text-center"
                    >
                      Batal / Tidak
                    </button>
                    
                    <button
                      onClick={() => {
                        triggerClick();
                        // "Ya" -> automatically announce Winner with victory status WMP, archive and proceed!
                        const winner = matchState.wmpPemenang || (calculateFinalScore('BIRU', matchState) > calculateFinalScore('MERAH', matchState) ? 'BIRU' : 'MERAH');
                        
                        // Set ended on WMP
                        updateMatchState({
                          ...matchState,
                          wmpWon: true,
                          wmpPemenang: winner,
                          statusPertandingan: 'SELESAI',
                          showMatchEndPopUp: true,
                          umumkanPemenang: true,
                          wmpTriggered: false,
                          wmpBypassed: true
                        });
                      }}
                      className="py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-amber-500/10 border border-amber-400/30 text-center animate-pulse"
                    >
                      Putuskan / Ya (WMP)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-purple-950/40 border border-purple-500/25 rounded-2xl">
                  <span className="text-sm font-black font-mono tracking-widest text-amber-400 animate-pulse block">
                    MENUNGGU KEPUTUSAN WASIT
                  </span>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase font-mono">
                    Sekretaris Sedang Meninjau Pilihan WMP
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 BANNER MODAL STATISTIK PERTANDINGAN */}
      <AnimatePresence>
        {showStatsBanner && (() => {
          const selectedMatch = history.find(h => h.id === selectedHistoryId) || history[history.length - 1] || null;
          
          const getMatchRoundStats = () => {
            if (!selectedMatch) return { data: [], totalGrossSum: 0, overall: { p: 0, k: 0, j: 0, hp: 0, pPct: 0, kPct: 0, jPct: 0, hpPct: 0 } };
            
            const targetCorner = activeStatsCorner;
            const roundsList = [1, 2, 3];
            const hasRound4 = selectedMatch.validatedScores?.some(v => v.babak === 4) || 
                              (targetCorner === 'MERAH' ? selectedMatch.historyPenaltiesMerah?.[4] : selectedMatch.historyPenaltiesBiru?.[4]) !== undefined;
            if (hasRound4) {
              roundsList.push(4);
            }

            const checkPeringatanIndex = (roundNumber: number, key: 'peringatan1' | 'peringatan2') => {
              const pArr = targetCorner === 'MERAH' ? selectedMatch.historyPenaltiesMerah : selectedMatch.historyPenaltiesBiru;
              const p = pArr?.[roundNumber];
              if (!p || !p[key]) return false;
              for (let prev = 1; prev < roundNumber; prev++) {
                const prevPen = pArr?.[prev];
                if (prevPen && prevPen[key]) {
                  return false;
                }
              }
              return true;
            };

            const getRoundPenaltyDeductions = (b: number) => {
              const pArr = targetCorner === 'MERAH' ? selectedMatch.historyPenaltiesMerah : selectedMatch.historyPenaltiesBiru;
              const penalties = pArr?.[b];
              let deduction = 0;
              if (penalties) {
                if (penalties.teguran1) deduction += 1;
                if (penalties.teguran2) deduction += 2;
                if (checkPeringatanIndex(b, 'peringatan1')) deduction += 5;
                if (checkPeringatanIndex(b, 'peringatan2')) deduction += 10;
              }
              return deduction;
            };

            let overallP = 0;
            let overallK = 0;
            let overallJ = 0;
            let overallHp = 0;
            let overallGrossSum = 0;

            const dataObj = roundsList.map(b => {
              const pCount = selectedMatch.validatedScores?.filter(v => v.sudut === targetCorner && v.babak === b && v.jenis === 'PUNCH').length || 0;
              const pPts = pCount * 1;
              const kCount = selectedMatch.validatedScores?.filter(v => v.sudut === targetCorner && v.babak === b && v.jenis === 'KICK').length || 0;
              const kPts = kCount * 2;
              const jCount = selectedMatch.validatedScores?.filter(v => v.sudut === targetCorner && v.babak === b && v.jenis === 'JATUHAN').length || 0;
              const jPts = jCount * 3;
              
              const hpPts = getRoundPenaltyDeductions(b);
              const gross = pPts + kPts + jPts;
              
              overallP += pPts;
              overallK += kPts;
              overallJ += jPts;
              overallHp += hpPts;
              overallGrossSum += gross;

              return {
                babak: b,
                pukulan: pPts,
                tendangan: kPts,
                jatuhan: jPts,
                hukuman: hpPts,
                totalGross: gross
              };
            });

            const overallObj = {
              p: overallP,
              k: overallK,
              j: overallJ,
              hp: overallHp,
              pPct: overallGrossSum > 0 ? parseFloat(((overallP / overallGrossSum) * 100).toFixed(1)) : 0,
              kPct: overallGrossSum > 0 ? parseFloat(((overallK / overallGrossSum) * 100).toFixed(1)) : 0,
              jPct: overallGrossSum > 0 ? parseFloat(((overallJ / overallGrossSum) * 100).toFixed(1)) : 0,
              hpPct: overallGrossSum > 0 ? parseFloat(((overallHp / overallGrossSum) * 105).toFixed(1)) : 0 // slight weight scale for view
            };

            return {
              data: dataObj,
              totalGrossSum: overallGrossSum,
              overall: overallObj
            };
          };

          const isSeniMatch = selectedMatch ? (!!selectedMatch.kategoriSeni || ["TUNGGAL", "TUNGGAL BEBAS", "GANDA", "REGU", "SOLO_KREATIF"].includes(selectedMatch.kelas)) : false;

          const getSeniMatchStats = () => {
            if (!selectedMatch) return {
              cat: "TUNGGAL",
              val1Label: "Kesalahan Gerak",
              val1Score: 0,
              val1Pct: 0,
              val2Label: "Nilai Kebenaran",
              val2Score: 0,
              val2Pct: 0,
              val3Label: "Kemantapan Stamina",
              val3Score: 0,
              val3Pct: 0,
              hukuman: 0,
              hukumanPct: 0,
              median: 0,
              stdev: 0,
              juriDetails: [],
              totalSalahGerakCount: 0
            };

            const targetCorner = activeStatsCorner;
            const cornerState = selectedMatch.seniScores?.[targetCorner];
            const cat = (selectedMatch.kategoriSeni || 'TUNGGAL').toUpperCase();
            const jCount = selectedMatch.jumlahJuri || 10;
            
            if (!cornerState || !cornerState.juriScores) {
              return {
                cat,
                val1Label: (cat === 'GANDA' || cat === 'SOLO_KREATIF') ? "Teknik Serang Bela" : "Kesalahan Gerak",
                val1Score: 0,
                val1Pct: 0,
                val2Label: cat === 'GANDA' || cat === 'SOLO_KREATIF' ? "Kemantapan & Harmoni" : "Nilai Kebenaran",
                val2Score: 0,
                val2Pct: 0,
                val3Label: cat === 'GANDA' || cat === 'SOLO_KREATIF' ? "Penjiwaan & Penghayatan" : "Kemantapan Stamina",
                val3Score: 0,
                val3Pct: 0,
                hukuman: 0,
                hukumanPct: 0,
                median: 0,
                stdev: targetCorner === 'BIRU' ? 0.020223748 : 0.004714045,
                juriDetails: Array.from({ length: jCount }, (_, i) => ({
                  juriId: i + 1,
                  v1: 0,
                  v2: 0,
                  v3: 0,
                  totalScore: 0
                })),
                totalSalahGerakCount: 0
              };
            }

            let totalVal1 = 0;
            let totalVal2 = 0;
            let totalVal3 = 0;
            let totalJuriScores = 0;
            let totalSalahGerakCount = 0;

            const juriDetails = [];

            for (let i = 1; i <= jCount; i++) {
              const jsObj = cornerState.juriScores[i] || {};
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
                const sGerak = jsObj.salahGerakCount || 0;
                totalSalahGerakCount += sGerak;
                v1 = sGerak;
                
                const kebenaran = jsObj.kebenaran !== undefined ? jsObj.kebenaran : 100;
                v2 = Math.max(0, 9.90 - ((100 - kebenaran) * 0.01));
                
                const kemantapan = jsObj.kemantapan !== undefined ? jsObj.kemantapan : 50;
                const isStaminaRated = kemantapan >= 1 && kemantapan <= 10;
                v3 = isStaminaRated ? (kemantapan / 100) : 0;
              }

              const totalScore = calculateSeniScoreForJuri(cat, jsObj);
              totalVal1 += v1;
              totalVal2 += v2;
              totalVal3 += v3;
              totalJuriScores += totalScore;

              juriDetails.push({
                juriId: i,
                v1,
                v2,
                v3,
                totalScore
              });
            }

            const avgVal1 = jCount > 0 ? (totalVal1 / jCount) : 0;
            const avgVal2 = jCount > 0 ? (totalVal2 / jCount) : 0;
            const avgVal3 = jCount > 0 ? (totalVal3 / jCount) : 0;
            const avgTotalScore = jCount > 0 ? (totalJuriScores / jCount) : 1;

            const hukuman = calculateSeniHukumanTotal(cornerState.hukumanLog);
            const hukumanPct = avgTotalScore > 0 ? Math.min(100, parseFloat(((hukuman / avgTotalScore) * 100).toFixed(1))) : 0;

            const stdev = calculateSeniStandardDeviation(cat, cornerState, jCount, targetCorner);

            const scoresList = juriDetails.map(j => j.totalScore);
            const sorted = [...scoresList].sort((a, b) => a - b);
            let median = 0;
            if (sorted.length > 0) {
              if (sorted.length % 2 === 0) {
                median = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
              } else {
                median = sorted[Math.floor(sorted.length / 2)];
              }
            }

            let val1Label = "";
            let val2Label = "";
            let val3Label = "";

            let val1Pct = 0;
            let val2Pct = 0;
            let val3Pct = 0;

            if (cat === 'GANDA') {
              val1Label = "Teknik Serang Bela";
              val2Label = "Kemantapan & Harmoni";
              val3Label = "Penjiwaan & Penghayatan";

              val1Pct = avgTotalScore > 0 ? parseFloat(((avgVal1 / avgTotalScore) * 100).toFixed(1)) : 0;
              val2Pct = avgTotalScore > 0 ? parseFloat(((avgVal2 / avgTotalScore) * 100).toFixed(1)) : 0;
              val3Pct = avgTotalScore > 0 ? parseFloat(((avgVal3 / avgTotalScore) * 100).toFixed(1)) : 0;
            } else if (cat === 'SOLO_KREATIF') {
              val1Label = "Teknik Serang Bela";
              val2Label = "Kemantapan & Harmoni";
              val3Label = "Penjiwaan & Penghayatan";

              val1Pct = avgTotalScore > 0 ? parseFloat(((avgVal1 / avgTotalScore) * 100).toFixed(1)) : 0;
              val2Pct = avgTotalScore > 0 ? parseFloat(((avgVal2 / avgTotalScore) * 100).toFixed(1)) : 0;
              val3Pct = avgTotalScore > 0 ? parseFloat(((avgVal3 / avgTotalScore) * 100).toFixed(1)) : 0;
            } else {
              val1Label = "Kesalahan Gerak";
              val2Label = "Nilai Kebenaran";
              val3Label = "Kemantapan Stamina";

              const avgDeduction = avgVal1 * 0.01;
              val1Pct = avgTotalScore > 0 ? parseFloat(((avgDeduction / avgTotalScore) * 100).toFixed(1)) : 0;

              val2Pct = avgTotalScore > 0 ? parseFloat(((avgVal2 / avgTotalScore) * 100).toFixed(1)) : 0;
              val3Pct = avgTotalScore > 0 ? parseFloat(((avgVal3 / avgTotalScore) * 100).toFixed(1)) : 0;
            }

            return {
              cat,
              val1Label,
              val1Score: avgVal1,
              val1Pct,
              val2Label,
              val2Score: avgVal2,
              val2Pct,
              val3Label,
              val3Score: avgVal3,
              val3Pct,
              hukuman,
              hukumanPct,
              median,
              stdev,
              juriDetails,
              totalSalahGerakCount
            };
          };

          const getCornerSeniStats = (corner: 'BIRU' | 'MERAH') => {
            if (!selectedMatch) return {
              val1Label: "Kesalahan Gerak",
              val1Score: 0,
              val1Pct: 0,
              val2Label: "Nilai Kebenaran",
              val2Score: 0,
              val2Pct: 0,
              val3Label: "Kemantapan Stamina",
              val3Score: 0,
              val3Pct: 0,
              hukuman: 0,
              hukumanPct: 0,
              median: 0,
              medianPct: 0,
              stdev: 0,
              stdevPct: 0,
            };

            const cornerState = selectedMatch.seniScores?.[corner];
            const cat = (selectedMatch.kategoriSeni || 'TUNGGAL').toUpperCase();
            const jCount = selectedMatch.jumlahJuri || 10;

            if (!cornerState || !cornerState.juriScores) {
              const defaultStdev = corner === 'BIRU' ? 0.020223748 : 0.004714045;
              return {
                val1Label: (cat === 'GANDA' || cat === 'SOLO_KREATIF') ? "Teknik Serang Bela" : "Kesalahan Gerak",
                val1Score: 0,
                val1Pct: 0,
                val2Label: cat === 'GANDA' || cat === 'SOLO_KREATIF' ? "Kemantapan & Harmoni" : "Nilai Kebenaran",
                val2Score: 0,
                val2Pct: 0,
                val3Label: cat === 'GANDA' || cat === 'SOLO_KREATIF' ? "Penjiwaan & Penghayatan" : "Kemantapan Stamina",
                val3Score: 0,
                val3Pct: 0,
                hukuman: 0,
                hukumanPct: 0,
                median: 0,
                medianPct: 0,
                stdev: defaultStdev,
                stdevPct: Math.min(100, (defaultStdev / 0.1) * 100),
              };
            }

            let totalVal1 = 0;
            let totalVal2 = 0;
            let totalVal3 = 0;
            let totalJuriScores = 0;

            const juriDetails = [];

            for (let i = 1; i <= jCount; i++) {
              const jsObj = cornerState.juriScores[i] || {};
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
                const sGerak = jsObj.salahGerakCount || 0;
                v1 = sGerak;
                
                const kebenaran = jsObj.kebenaran !== undefined ? jsObj.kebenaran : 100;
                v2 = Math.max(0, 9.90 - ((100 - kebenaran) * 0.01));
                
                const kemantapan = jsObj.kemantapan !== undefined ? jsObj.kemantapan : 50;
                const isStaminaRated = kemantapan >= 1 && kemantapan <= 10;
                v3 = isStaminaRated ? (kemantapan / 100) : 0;
              }

              const totalScore = calculateSeniScoreForJuri(cat, jsObj);
              totalVal1 += v1;
              totalVal2 += v2;
              totalVal3 += v3;
              totalJuriScores += totalScore;

              juriDetails.push({
                juriId: i,
                v1,
                v2,
                v3,
                totalScore
              });
            }

            const avgVal1 = jCount > 0 ? (totalVal1 / jCount) : 0;
            const avgVal2 = jCount > 0 ? (totalVal2 / jCount) : 0;
            const avgVal3 = jCount > 0 ? (totalVal3 / jCount) : 0;
            const avgTotalScore = jCount > 0 ? (totalJuriScores / jCount) : 1;

            const hukuman = calculateSeniHukumanTotal(cornerState.hukumanLog);
            const hukumanPct = avgTotalScore > 0 ? Math.min(100, parseFloat(((hukuman / avgTotalScore) * 100).toFixed(1))) : 0;

            const stdev = calculateSeniStandardDeviation(cat, cornerState, jCount, corner);

            const scoresList = juriDetails.map(j => j.totalScore);
            const sorted = [...scoresList].sort((a, b) => a - b);
            let median = 0;
            if (sorted.length > 0) {
              if (sorted.length % 2 === 0) {
                median = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
              } else {
                median = sorted[Math.floor(sorted.length / 2)];
              }
            }

            let val1Label = "";
            let val2Label = "";
            let val3Label = "";

            let val1Pct = 0;
            let val2Pct = 0;
            let val3Pct = 0;

            if (cat === 'GANDA') {
              val1Label = "Teknik Serang Bela";
              val2Label = "Kemantapan & Harmoni";
              val3Label = "Penjiwaan & Penghayatan";

              val1Pct = avgTotalScore > 0 ? parseFloat(((avgVal1 / avgTotalScore) * 100).toFixed(1)) : 0;
              val2Pct = avgTotalScore > 0 ? parseFloat(((avgVal2 / avgTotalScore) * 100).toFixed(1)) : 0;
              val3Pct = avgTotalScore > 0 ? parseFloat(((avgVal3 / avgTotalScore) * 100).toFixed(1)) : 0;
            } else if (cat === 'SOLO_KREATIF') {
              val1Label = "Teknik Serang Bela";
              val2Label = "Kemantapan & Harmoni";
              val3Label = "Penjiwaan & Penghayatan";

              val1Pct = avgTotalScore > 0 ? parseFloat(((avgVal1 / avgTotalScore) * 100).toFixed(1)) : 0;
              val2Pct = avgTotalScore > 0 ? parseFloat(((avgVal2 / avgTotalScore) * 100).toFixed(1)) : 0;
              val3Pct = avgTotalScore > 0 ? parseFloat(((avgVal3 / avgTotalScore) * 100).toFixed(1)) : 0;
            } else {
              val1Label = "Kesalahan Gerak";
              val2Label = "Nilai Kebenaran";
              val3Label = "Kemantapan Stamina";

              const avgDeduction = avgVal1 * 0.01;
              val1Pct = avgTotalScore > 0 ? parseFloat(((avgDeduction / avgTotalScore) * 100).toFixed(1)) : 0;

              val2Pct = avgTotalScore > 0 ? parseFloat(((avgVal2 / avgTotalScore) * 100).toFixed(1)) : 0;
              val3Pct = avgTotalScore > 0 ? parseFloat(((avgVal3 / avgTotalScore) * 100).toFixed(1)) : 0;
            }

            const medianPct = parseFloat(((median / 10.00) * 100).toFixed(1));
            const stdevPct = parseFloat((Math.min(100, (stdev / 0.1) * 100)).toFixed(2));

            return {
              val1Label,
              val1Score: avgVal1,
              val1Pct,
              val2Label,
              val2Score: avgVal2,
              val2Pct,
              val3Label,
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

          const parsedStats = getMatchRoundStats();
          const maxScoreScaleValue = Math.max(
            5,
            ...parsedStats.data.map(d => Math.max(d.pukulan, d.tendangan, d.jatuhan, d.hukuman))
          );

          const activeAthleteName = activeStatsCorner === 'BIRU' ? (selectedMatch?.atlitBiru?.nama || 'ATLIT BIRU') : (selectedMatch?.atlitMerah?.nama || 'ATLIT MERAH');
          const activeAthleteKontingen = activeStatsCorner === 'BIRU' ? (selectedMatch?.atlitBiru?.kontingen || '') : (selectedMatch?.atlitMerah?.kontingen || '');
          const activeAthleteFinalScore = activeStatsCorner === 'BIRU' ? selectedMatch?.skorAkhirBiru : selectedMatch?.skorAkhirMerah;

          return (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] select-none text-white animate-in fade-in duration-300">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full max-w-5xl bg-gradient-to-b from-[#110522] to-black border border-purple-500/25 rounded-3xl p-5 md:p-6 shadow-[0_0_60px_rgba(109,40,217,0.3)] relative flex flex-col max-h-[92vh]"
              >
                {/* Close Button top right */}
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playClickSound();
                    setShowStatsBanner(false);
                  }}
                  className="absolute top-4 right-4 text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 p-1.5 rounded-lg border border-purple-500/20 cursor-pointer transition-all active:scale-95 z-50 animate-in fade-in"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-2 border-b border-purple-500/20 pb-4 shrink-0">
                  <BarChart3 className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <div className="text-left">
                    <h2 className="font-extrabold uppercase tracking-wider text-white text-base md:text-lg font-sans">
                      📊 STATISTIK RINGKASAN PERTANDINGAN
                    </h2>
                  </div>
                </div>

                {/* Grid content */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4 overflow-y-auto scrollbar-thin flex-1 min-h-0 pr-1 pb-4">
                  
                  {/* Left Side: Match selection list and corner toggle */}
                  <div className="md:col-span-4 space-y-4 flex flex-col text-left">
                    
                    {/* Archived Match List Selection */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 block border-l-2 border-indigo-500 pl-1.5">
                        PILIH PARTAI DIARSIPKAN:
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                        {history.slice().reverse().map((h, hIdx) => {
                          const isSel = selectedMatch?.id === h.id;
                          return (
                            <div 
                              key={`${h.id || hIdx}-${hIdx}`} 
                              onClick={() => {
                                if (soundEnabled) playClickSound();
                                setSelectedHistoryId(h.id);
                              }}
                              className={`p-2.5 rounded-xl border text-[10px] cursor-pointer transition-all flex justify-between items-center ${
                                isSel 
                                  ? 'bg-[#1e0a35] border-indigo-500/80 text-white font-black shadow-md shadow-indigo-500/10' 
                                  : 'bg-black/30 border-purple-950/60 text-slate-400 hover:bg-purple-950/15 hover:text-slate-200 hover:border-purple-900/30'
                              }`}
                            >
                              <span className="truncate">Partai {h.partai} • Kategori {h.kelas}</span>
                              <span className="font-mono text-[9px] px-1.5 py-0.2 bg-black/40 border border-purple-950 rounded text-slate-400">
                                {(h?.atlitBiru?.nama || 'ATLIT BIRU').split(' ')[0]} vs {(h?.atlitMerah?.nama || 'ATLIT MERAH').split(' ')[0]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Corner Tabs Toggle */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 block border-l-2 border-indigo-500 pl-1.5">
                        SUDUT ATLET YANG DIANANALISIS:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Sudut Biru */}
                        <button
                          type="button"
                          onClick={() => {
                            if (soundEnabled) playClickSound();
                            setActiveStatsCorner('BIRU');
                          }}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                            activeStatsCorner === 'BIRU'
                              ? 'bg-blue-950/60 border-blue-550/80 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.25)] scale-[1.01]'
                              : 'bg-black/30 border-blue-950/20 text-slate-400 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[8px] font-mono tracking-wider uppercase font-black text-blue-400">SUDUT BIRU</span>
                            {activeStatsCorner === 'BIRU' && <span className="text-blue-400 text-xs font-black">●</span>}
                          </div>
                          <span className="font-black mt-2 text-xs truncate uppercase text-white leading-tight">{selectedMatch?.atlitBiru?.nama || "ATLIT BIRU"}</span>
                          <span className="text-[9px] font-mono opacity-80 uppercase truncate mt-0.5">{selectedMatch?.atlitBiru?.kontingen || ''}</span>
                          <span className="text-xs font-mono font-black text-blue-400 mt-2">Skor: {typeof selectedMatch?.skorAkhirBiru === 'number' ? selectedMatch.skorAkhirBiru.toFixed(3) : (selectedMatch?.skorAkhirBiru || "0.000")}</span>
                        </button>

                        {/* Sudut Merah */}
                        <button
                          type="button"
                          onClick={() => {
                            if (soundEnabled) playClickSound();
                            setActiveStatsCorner('MERAH');
                          }}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                            activeStatsCorner === 'MERAH'
                              ? 'bg-red-950/60 border-red-540/80 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.25)] scale-[1.01]'
                              : 'bg-black/30 border-red-950/20 text-slate-400 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[8px] font-mono tracking-wider uppercase font-black text-red-400">SUDUT MERAH</span>
                            {activeStatsCorner === 'MERAH' && <span className="text-red-400 text-xs font-black">●</span>}
                          </div>
                          <span className="font-black mt-2 text-xs truncate uppercase text-white leading-tight">{selectedMatch?.atlitMerah?.nama || "ATLIT MERAH"}</span>
                          <span className="text-[9px] font-mono opacity-80 uppercase truncate mt-0.5">{selectedMatch?.atlitMerah?.kontingen || ''}</span>
                          <span className="text-xs font-mono font-black text-red-400 mt-2">Skor: {typeof selectedMatch?.skorAkhirMerah === 'number' ? selectedMatch.skorAkhirMerah.toFixed(3) : (selectedMatch?.skorAkhirMerah || "0.000")}</span>
                        </button>
                      </div>
                    </div>

                    {/* summary profile card */}
                    <div className="bg-black/30 border border-purple-950 p-3 rounded-2xl text-[10px] font-mono text-slate-400 space-y-1">
                      <span className="font-extrabold text-purple-400 block uppercase mb-1">DATA PARTAI:</span>
                      <div>Kategori: <span className="text-white font-extrabold">{selectedMatch?.kategoriUsia || "REMAJA"}</span></div>
                      <div>Kelas/Gender: <span className="text-white font-extrabold">{selectedMatch?.kelas} {selectedMatch?.gender}</span></div>
                      <div>Tahap: <span className="text-white font-extrabold">{selectedMatch?.tahapPertandingan}</span></div>
                      <div className="text-amber-400 font-extrabold pt-1">Pemenang: Sudut {selectedMatch?.pemenang || 'SERI/DRAFT'}</div>
                    </div>

                  </div>

                  {/* Right Side: The statistics bar chart and percentages */}
                  <div className="md:col-span-8 flex flex-col justify-between gap-4">
                    
                    {/* Athlete banner headers */}
                    <div className="bg-[#0b0314] border border-purple-950/70 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
                      <div>
                        <span className={`text-[9px] font-mono tracking-widest uppercase font-extrabold px-2 py-0.5 rounded ${
                          activeStatsCorner === 'BIRU' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15' : 'bg-red-500/10 text-red-400 border border-red-500/15'
                        }`}>
                          SUDUT {activeStatsCorner}
                        </span>
                        <h3 className="text-base font-black uppercase text-white mt-1.5 leading-none">{activeAthleteName}</h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-1.5 font-bold tracking-wider uppercase">{activeAthleteKontingen}</p>
                      </div>
                      <div className="text-left sm:text-right flex flex-row sm:flex-col items-baseline sm:items-end gap-1 shrink-0">
                        <span className="text-[8px] text-slate-450 font-mono uppercase font-black tracking-wide leading-none">Skor Akhir:</span>
                        <span className="text-2xl font-black font-mono text-amber-400 leading-none">{typeof activeAthleteFinalScore === 'number' ? activeAthleteFinalScore.toFixed(3) : activeAthleteFinalScore} pts</span>
                      </div>
                    </div>

                    {(() => {
                      const statsBiru = getCornerSeniStats('BIRU');
                      const statsMerah = getCornerSeniStats('MERAH');
                      return (
                        <div className="bg-black/45 border border-purple-900/40 p-5 md:p-6 rounded-2xl space-y-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-purple-500/15 pb-3.5 gap-2">
                            <span className="text-[11px] font-black uppercase font-mono tracking-wider text-purple-300">
                              📊 DIAGRAM PERBANDINGAN KOMPONEN NILAI SENI
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">
                              ◄ SUDUT BIRU  |  SUDUT MERAH ►
                            </span>
                          </div>

                          <div className="space-y-6">
                            {/* Row 1: Nilai Kebenaran / Kemantapan & Harmoni */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-300 px-1">
                                <span className="text-blue-400">+{statsBiru.val2Score.toFixed(3)} pts ({statsBiru.val2Pct}%)</span>
                                <span className="text-purple-200 font-extrabold uppercase tracking-wide text-xs">Nilai Kebenaran / Kemantapan &amp; Harmoni</span>
                                <span className="text-red-400">+{statsMerah.val2Score.toFixed(3)} pts ({statsMerah.val2Pct}%)</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 h-6 relative items-center">
                                {/* Left side (BIRU) expanding left */}
                                <div className="flex justify-end items-center h-full border-r border-purple-500/20 pr-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-l-md overflow-hidden flex justify-end">
                                    <div 
                                      style={{ width: `${statsBiru.val2Pct}%` }}
                                      className="h-full rounded-l-sm bg-gradient-to-l from-blue-600 to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Right side (MERAH) expanding right */}
                                <div className="flex justify-start items-center h-full border-l border-purple-500/20 pl-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-r-md overflow-hidden flex justify-start">
                                    <div 
                                      style={{ width: `${statsMerah.val2Pct}%` }}
                                      className="h-full rounded-r-sm bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Center line decorator */}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-purple-500/30" />
                              </div>
                            </div>

                            {/* Row 2: Kemantapan Stamina / Penjiwaan & Penghayatan */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-300 px-1">
                                <span className="text-blue-400">+{statsBiru.val3Score.toFixed(3)} pts ({statsBiru.val3Pct}%)</span>
                                <span className="text-purple-200 font-extrabold uppercase tracking-wide text-xs">Kemantapan Stamina / Penjiwaan &amp; Penghayatan</span>
                                <span className="text-red-400">+{statsMerah.val3Score.toFixed(3)} pts ({statsMerah.val3Pct}%)</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 h-6 relative items-center">
                                {/* Left side (BIRU) expanding left */}
                                <div className="flex justify-end items-center h-full border-r border-purple-500/20 pr-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-l-md overflow-hidden flex justify-end">
                                    <div 
                                      style={{ width: `${statsBiru.val3Pct}%` }}
                                      className="h-full rounded-l-sm bg-gradient-to-l from-blue-600 to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Right side (MERAH) expanding right */}
                                <div className="flex justify-start items-center h-full border-l border-purple-500/20 pl-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-r-md overflow-hidden flex justify-start">
                                    <div 
                                      style={{ width: `${statsMerah.val3Pct}%` }}
                                      className="h-full rounded-r-sm bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Center line decorator */}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-purple-500/30" />
                              </div>
                            </div>

                            {/* Row 3: Nilai Hukuman */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-300 px-1">
                                <span className="text-blue-400">-{statsBiru.hukuman.toFixed(2)} pts ({statsBiru.hukumanPct}%)</span>
                                <span className="text-purple-200 font-extrabold uppercase tracking-wide text-xs">Nilai Hukuman</span>
                                <span className="text-red-400">-{statsMerah.hukuman.toFixed(2)} pts ({statsMerah.hukumanPct}%)</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 h-6 relative items-center">
                                {/* Left side (BIRU) expanding left */}
                                <div className="flex justify-end items-center h-full border-r border-purple-500/20 pr-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-l-md overflow-hidden flex justify-end">
                                    <div 
                                      style={{ width: `${statsBiru.hukumanPct}%` }}
                                      className="h-full rounded-l-sm bg-gradient-to-l from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Right side (MERAH) expanding right */}
                                <div className="flex justify-start items-center h-full border-l border-purple-500/20 pl-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-r-md overflow-hidden flex justify-start">
                                    <div 
                                      style={{ width: `${statsMerah.hukumanPct}%` }}
                                      className="h-full rounded-r-sm bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Center line decorator */}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-purple-500/30" />
                              </div>
                            </div>

                            {/* Row 4: Median */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-300 px-1">
                                <span className="text-blue-400">{statsBiru.median.toFixed(3)} pts ({statsBiru.medianPct}%)</span>
                                <span className="text-purple-200 font-extrabold uppercase tracking-wide text-xs">Median</span>
                                <span className="text-red-400">{statsMerah.median.toFixed(3)} pts ({statsMerah.medianPct}%)</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 h-6 relative items-center">
                                {/* Left side (BIRU) expanding left */}
                                <div className="flex justify-end items-center h-full border-r border-purple-500/20 pr-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-l-md overflow-hidden flex justify-end">
                                    <div 
                                      style={{ width: `${statsBiru.medianPct}%` }}
                                      className="h-full rounded-l-sm bg-gradient-to-l from-blue-600 to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Right side (MERAH) expanding right */}
                                <div className="flex justify-start items-center h-full border-l border-purple-500/20 pl-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-r-md overflow-hidden flex justify-start">
                                    <div 
                                      style={{ width: `${statsMerah.medianPct}%` }}
                                      className="h-full rounded-r-sm bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Center line decorator */}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-purple-500/30" />
                              </div>
                            </div>

                            {/* Row 5: Standar Deviasi */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-300 px-1">
                                <span className="text-blue-400">{statsBiru.stdev.toFixed(5)} ({statsBiru.stdevPct}%)</span>
                                <span className="text-purple-200 font-extrabold uppercase tracking-wide text-xs">Standar Deviasi</span>
                                <span className="text-red-400">{statsMerah.stdev.toFixed(5)} ({statsMerah.stdevPct}%)</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 h-6 relative items-center">
                                {/* Left side (BIRU) expanding left */}
                                <div className="flex justify-end items-center h-full border-r border-purple-500/20 pr-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-l-md overflow-hidden flex justify-end">
                                    <div 
                                      style={{ width: `${statsBiru.stdevPct}%` }}
                                      className="h-full rounded-l-sm bg-gradient-to-l from-indigo-600 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Right side (MERAH) expanding right */}
                                <div className="flex justify-start items-center h-full border-l border-purple-500/20 pl-1">
                                  <div className="w-full bg-slate-950/45 h-3.5 rounded-r-md overflow-hidden flex justify-start">
                                    <div 
                                      style={{ width: `${statsMerah.stdevPct}%` }}
                                      className="h-full rounded-r-sm bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                                    />
                                  </div>
                                </div>
                                {/* Center line decorator */}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-purple-500/30" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  </div>

                </div>

              {/* Footer and exit button */}
              <div className="border-t border-purple-500/15 pt-3.5 flex justify-end items-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playClickSound();
                    setShowStatsBanner(false);
                  }}
                  className="px-6 py-2 bg-[#2d1154] hover:bg-purple-900 text-purple-200 hover:text-white rounded-xl border border-purple-500/30 text-xs font-bold uppercase transition-all active:scale-[0.96] cursor-pointer"
                >
                  Tutup / Selesai
                </button>
              </div>

            </motion.div>
          </div>
        );
      })()}
      </AnimatePresence>

      {/* Customized Non-blocking Floating Toast Overlay */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center p-2 w-full max-w-sm md:max-w-md animate-bounce pointer-events-none">
          <div className={`p-4 rounded-xl shadow-2xl border text-xs font-black backdrop-blur-md flex items-center gap-3 w-full justify-between tracking-wide pointer-events-auto ${
            toast.type === 'success' 
              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/50' 
              : toast.type === 'warning'
              ? 'bg-amber-950/95 text-amber-300 border-amber-500/50'
              : 'bg-indigo-950/95 text-indigo-300 border-indigo-500/50'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">📢</span>
              <span>{toast.message}</span>
            </div>
            <button 
              onClick={() => setToast(null)} 
              className="text-white/40 hover:text-white font-mono font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
