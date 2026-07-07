export interface Athlete {
  nama: string;
  kontingen: string;
}

export interface ScoreEntry {
  id: string;
  juriId: number;
  sudut: 'MERAH' | 'BIRU';
  jenis: string;
  timestamp: number;
  babak: number;
  validated?: boolean;
  validatedGroupId?: string;
}

export interface ValidatedScore {
  id: string;
  sudut: 'MERAH' | 'BIRU';
  points: number;
  jenis: string;
  babak: number;
  timestamp: number;
}

export interface DewanPenalties {
  binaan1: boolean;
  binaan2: boolean;
  teguran1: boolean; // -1
  teguran2: boolean; // -2
  peringatan1: boolean; // -5
  peringatan2: boolean; // -10
}

export interface VerifikasiState {
  id: string; // unique ID of current verifikasi session
  status: 'IDLE' | 'PENDING' | 'RESOLVED';
  jenis: 'JATUHAN' | 'PELANGGARAN';
  juriVotes: {
    1?: 'MERAH' | 'BIRU' | 'TIDAK_SAH';
    2?: 'MERAH' | 'BIRU' | 'TIDAK_SAH';
    3?: 'MERAH' | 'BIRU' | 'TIDAK_SAH';
  };
  result: 'MERAH' | 'BIRU' | 'TIDAK_SAH' | null;
}

export interface VarCheckingState {
  status: 'IDLE' | 'CHECKING' | 'RESULT';
  sudut: 'MERAH' | 'BIRU' | null;
  result: 'SAH' | 'TIDAK_SAH' | null;
}

export interface PastMatch {
  id: string;
  eventName: string;
  partai: string;
  kelas: string;
  kategoriUsia?: string;
  tahapPertandingan?: string;
  gender: 'PUTRA' | 'PUTRI';
  atlitMerah: Athlete;
  atlitBiru: Athlete;
  skorAkhirMerah: number;
  skorAkhirBiru: number;
  pemenang: 'MERAH' | 'BIRU' | 'DISK_MERAH' | 'DISK_BIRU' | null;
  timestamp: number;
  tempatPelaksanaan?: string;
  waktuPelaksanaan?: string;
  rawScores?: ScoreEntry[];
  validatedScores?: ValidatedScore[];
  penaltiesMerah?: DewanPenalties;
  penaltiesBiru?: DewanPenalties;
  accumulatedPenaltyMerah?: number;
  accumulatedPenaltyBiru?: number;
  diskualifikasi?: 'MERAH' | 'BIRU' | 'BOTH' | null;
  historyPenaltiesMerah?: Record<number, DewanPenalties>;
  historyPenaltiesBiru?: Record<number, DewanPenalties>;
  logoKiri?: string;
  logoKanan?: string;
  wmpWon?: boolean;
  wmpPemenang?: 'MERAH' | 'BIRU' | null;
  kategoriSeni?: 'TUNGGAL' | 'GANDA' | 'REGU' | 'SOLO_KREATIF';
  seniScores?: any;
  durasiTampilMERAH?: number;
  durasiTampilBIRU?: number;
  durasiBabak?: number;
  sistemTanding?: 'POOL' | 'BATTLE';
  jumlahJuri?: number;
}

export interface CustomIcons {
  binaan1?: string;
  binaan2?: string;
  teguran1?: string;
  teguran2?: string;
  peringatan1?: string;
  peringatan2?: string;
  jatuhan?: string;
  jatuhanBatal?: string;
  punch?: string;
  kick?: string;
}

export interface JuriSeniScore {
  juriId: number;
  kebenaran: number; // Tunggal & Regu, starts at 100
  teknikSerangBela: number; // Ganda, starts at 50
  teknikSenjataKoreografi: number; // Solo Kreatif, starts at 50
  kemantapan: number; // all categories, starts at 50
  penjiwaan: number; // starts at 50
  salahGerakCount: number;
  salahSenjataCount: number;
  suaraCount: number;
  keluarGelanggangCount: number;
  pakaianAksesorisCount: number;
  isReady?: boolean;
  isLocked?: boolean;
}

export interface CornerSeniState {
  hukumanLog: {
    waktu: number;
    pakaian: number;
    suara: number;
    gelanggang: number;
    senjataJatuh: number;
    other: number;
  };
  juriScores: Record<number, JuriSeniScore>;
}

export interface MatchState {
  eventName: string;
  tempatPelaksanaan?: string;
  waktuPelaksanaan?: string;
  partai: string;
  kelas: string;
  kategoriUsia?: string;
  tahapPertandingan?: string;
  gender: 'PUTRA' | 'PUTRI';
  gelanggang?: string;
  atlitMerah: Athlete;
  atlitBiru: Athlete;
  
  babakAktif: 1 | 2 | 3 | 4;
  durasiBabak: number; // in seconds, e.g., 60, 120, 180
  sisaWaktu: number; // in seconds
  timer2Value?: number; // in seconds
  timerBerjalan: boolean;

  // Raw inputs for the 1.5s confirmation logic
  rawScores: ScoreEntry[];
  // Confirmed validated scores (Punches/Kicks confirmed, Jatuhan, Penalties)
  validatedScores: ValidatedScore[];

  // Dewan state
  penaltiesMerah: DewanPenalties;
  penaltiesBiru: DewanPenalties;
  accumulatedPenaltyMerah?: number;
  accumulatedPenaltyBiru?: number;
  historyPenaltiesMerah?: Record<number, DewanPenalties>;
  historyPenaltiesBiru?: Record<number, DewanPenalties>;
  diskualifikasi: 'MERAH' | 'BIRU' | 'BOTH' | null;
  diskualifikasiReason?: 'MELEBIHI_TOLERANSI_WAKTU' | 'MANUAL_DISKUALIFIKASI' | 'MANUAL_UNDUR_DIRI' | null;
  autoDiskReason?: string | null;

  // Verifikasi (Request inputs from Juri 1, 2, 3)
  verifikasi: VerifikasiState;

  // VAR Checking
  varChecking?: VarCheckingState;

  // WMP auto-pause fields
  wmpTriggered?: boolean;
  wmpBypassed?: boolean;
  wmpBypassedScoreDiff?: number;
  wmpWon?: boolean;
  wmpPemenang?: 'MERAH' | 'BIRU' | null;
  wmpBabak1Occurred?: boolean;

  // Pop-ups & Match flow status
  showRoundEndPopUp: boolean;
  showMatchEndPopUp: boolean;
  pemenang: 'MERAH' | 'BIRU' | null;
  victoryType?: 'TEKNIK' | 'MUTLAK' | 'WMP' | 'UNDUR_DIRI';
  statusPertandingan?: 'BELUM_MULAI' | 'BERJALAN' | 'SELESAI';
  logoKiri?: string;
  logoKanan?: string;
  activeJuriIds?: number[];
  jumlahJuri?: number;
  customIcons?: CustomIcons;
  version?: number;
  juriTerkunci?: boolean;
  umumkanPemenang?: boolean;
  silat_jadwal_lines?: any[];
  silat_excel_matches?: any[];

  // Seni (Artistic) specific fields
  kategoriSeni: 'TUNGGAL' | 'GANDA' | 'REGU' | 'SOLO_KREATIF';
  seniScores: {
    MERAH: CornerSeniState;
    BIRU: CornerSeniState;
  };
  juriPressHistory?: any[]; // Add this to prevent TS errors on list logs
  activeCorner?: 'MERAH' | 'BIRU';
  hasPerformedBIRU?: boolean;
  hasPerformedMERAH?: boolean;
  durasiTampilMERAH?: number;
  durasiTampilBIRU?: number;
  gongPlayedForCurrentRound?: boolean;
  timerPlayLocked?: boolean;
  dewanConfirmedLanjutPool?: boolean;
  sistemTanding?: 'POOL' | 'BATTLE';
}

export interface AppState {
  eventName: string;
  eventVenue: string;
  eventDate: string;
  logoLeft: string;
  logoRight: string;
  partai: string;
  babak: string;
  kategoriJurus: string;
  kategoriUsia: string;
  gender: 'PUTRA' | 'PUTRI' | 'Putra' | 'Putri' | string;
  waktuMenit: string;
  jumlahJuri: number;
  athleteName: string;
  athleteKontingen: string;
  athleteSudut: string;
  timer: {
    timeLeft: number;
    duration: number;
    isRunning: boolean;
    lastUpdated: number;
  };
  judges: Record<number, {
    score: number;
    wrongMoveCount: number;
    isReady: boolean;
    isFinished: boolean;
  }>;
  isDisqualified: boolean;
  matchSaved: boolean;
}

export interface MatchRecord {
  id: string;
  eventName: string;
  eventVenue: string;
  eventDate: string;
  partai: string;
  babak: string;
  kategoriJurus: string;
  kategoriUsia: string;
  gender: string;
  athleteName: string;
  athleteKontingen: string;
  athleteSudut: string;
  jumlahJuri: number;
  judgeScores: any;
  isDisqualified: boolean;
  status: string;
}


