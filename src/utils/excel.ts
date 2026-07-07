/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { PastMatch } from '../types';

/**
 * Parses uploaded Excel file sheets and returns rows as objects
 */
export function parseExcelImport(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve([]);
          return;
        }
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

/**
 * Decently styled export file downloader helper
 */
function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename);
}

export function exportHistoryToExcel(history: PastMatch[]): void {
  if (!history || history.length === 0) return;

  const data = history.map((h, i) => ({
    "No": i + 1,
    "Nama Event": h.eventName,
    "Tempat": h.tempatPelaksanaan || "",
    "Tanggal": h.waktuPelaksanaan || "",
    "Partai": h.partai,
    "Kelas / Kategori": h.kelas,
    "Kategori Usia": h.kategoriUsia || "",
    "Gender": h.gender,
    "Pesilat Biru": h.atlitBiru?.nama || "",
    "Kontingen Biru": h.atlitBiru?.kontingen || "",
    "Skor Akhir Biru": h.skorAkhirBiru,
    "Pesilat Merah": h.atlitMerah?.nama || "",
    "Kontingen Merah": h.atlitMerah?.kontingen || "",
    "Skor Akhir Merah": h.skorAkhirMerah,
    "Pemenang": h.pemenang || "TIDAK ADA"
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sejarah");
  downloadWorkbook(workbook, "RI_Pencak_Silat_Sejarah.xlsx");
}

export function downloadExcelTemplate(): void {
  const data = [
    {
      "Nama": "Asep Kurniawan",
      "Kontingen": "DKI JAKARTA"
    },
    {
      "Nama": "Budi Santoso",
      "Kontingen": "JAWA TIMUR"
    }
  ];
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Atlit");
  downloadWorkbook(workbook, "Template_Atlit_Seni.xlsx");
}

export function downloadJadwalExcelTemplate(): void {
  const data = [
    {
      "Partai": 1,
      "Babak": "PENYISIHAN",
      "Kategori": "TUNGGAL",
      "Usia": "Dewasa",
      "Gender": "PUTRA",
      "Nama Biru": "Aris Sajiwo",
      "Kontingen Biru": "JAWA TENGAH",
      "Nama Merah": "Gede Sastrawan",
      "Kontingen Merah": "BALI"
    },
    {
      "Partai": 2,
      "Babak": "FINAL",
      "Kategori": "TUNGGAL",
      "Usia": "Dewasa",
      "Gender": "PUTRI",
      "Nama Biru": "Siti Rahma",
      "Kontingen Biru": "DKI JAKARTA",
      "Nama Merah": "Sri Wahyuni",
      "Kontingen Merah": "JAWA BARAT"
    }
  ];
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Jadwal");
  downloadWorkbook(workbook, "Template_Jadwal_Tanding.xlsx");
}

export function downloadBaganExcelTemplate(): void {
  const data = [
    {
      "No": 1,
      "Nama": "Wayan Dirga",
      "Kontingen": "BALI"
    },
    {
      "No": 2,
      "Nama": "Ahmad Dani",
      "Kontingen": "SULAWESI SELATAN"
    },
    {
      "No": 3,
      "Nama": "Randi Pratama",
      "Kontingen": "SUMATERA UTARA"
    },
    {
      "No": 4,
      "Nama": "Irfan Hakim",
      "Kontingen": "JAWA BARAT"
    }
  ];
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Bagan");
  downloadWorkbook(workbook, "Template_Bagan_Seni.xlsx");
}

export function exportBaganToExcel(
  baganAthletes: any[],
  baganKelas: string,
  baganGender: string,
  baganUsia: string,
  baganStartingStage: string
): void {
  const data = baganAthletes.map((a, idx) => ({
    "Rank / Seed": idx + 1,
    "Nama Lengkap": a.nama || "",
    "Asal Kontingen / Daerah": a.kontingen || "",
    "Kategori Tanding": baganKelas,
    "Kelas Usia": baganUsia,
    "Jenis Kelamin": baganGender,
    "Babak Awal": baganStartingStage
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Bagan Ekspor");
  downloadWorkbook(workbook, `Ekspor_Bagan_${baganKelas}_${baganGender}.xlsx`);
}
