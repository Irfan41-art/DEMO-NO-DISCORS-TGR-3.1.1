/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Pertandingan, KategoriSeni } from '../types';
import { Trophy, Clock, Medal, FileText, Search, Trash2, Printer, Plus, AlertCircle, RefreshCw } from 'lucide-react';

interface RekapSeniProps {
  history: Pertandingan[];
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
}

export default function RekapSeni({
  history,
  onDeleteHistoryItem,
  onClearHistory,
}: RekapSeniProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<KategoriSeni | 'Semua'>('Semua');

  const filteredHistory = history.filter((item) => {
    const pName = item.peserta?.nama || 'Unknown';
    const pContingent = item.peserta?.kontingen || '';
    const matchSearch =
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pContingent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchKategori = filterKategori === 'Semua' || item.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  // Calculate medals/ranking standings for each category based on high total score!
  const getStandings = (kat: KategoriSeni): Pertandingan[] => {
    return history
      .filter((item) => item.kategori === kat && item.status === 'SELESAI')
      .sort((a, b) => b.totalSkorAkhir - a.totalSkorAkhir);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 text-white space-y-6" id="recapital-container">
      
      {/* Header toolbars with quick action buttons */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#10241b] rounded-xl p-4 border border-[#23513d] gap-4" id="recap-header">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-1.5 font-sans text-white uppercase tracking-tight">
            <Trophy className="w-5 h-5 text-[#d4af37]" /> Tabulasi Rekap dan Klasemen Kontingen
          </h2>
          <p className="text-xs text-gray-400">
            Hasil perolehan nilai atlet yang telah disimpan dari gelanggang juri direkapitulasi secara otomatis di halaman ini.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1b4332] hover:bg-[#235741] text-gray-100 border border-[#2t6247] rounded-lg text-xs font-mono transition-transform active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#d4af37]" />
            <span>CETAK PIAGAM HASIL</span>
          </button>
          <button
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat perolehan nilai atlet? Tindakan ini tidak bisa dibatalkan!')) {
                onClearHistory();
              }
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-950/40 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-mono transition-transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-rose-400" />
            <span>HAPUS SEMUA DATA</span>
          </button>
        </div>
      </div>

      {/* Bento Grid: 2 columns wide Left is Podiums (Standings), Right is general Log */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Side: Medal Standings per Category (occupies 1 column) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="border-b border-[#23513d] pb-2">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5 text-[#d4af37] font-sans">
              <Medal className="w-5 h-5 text-[#d4af37]" /> Podium Raking Teratas (Medali)
            </h3>
          </div>

          {(['Tunggal', 'Ganda', 'Regu'] as const).map((kat) => {
            const standings = getStandings(kat);
            return (
              <div key={kat} className="bg-[#10241b] rounded-2xl border border-[#224e39] overflow-hidden shadow-md">
                <div className="bg-[#153225] py-2 px-4 border-b border-[#214c38] flex justify-between items-center font-mono">
                  <span className="font-bold text-white text-xs uppercase tracking-wider">
                    Seni {kat}
                  </span>
                  <span className="text-[10px] text-gray-400">PERSILAT STANDARD</span>
                </div>

                {standings.length === 0 ? (
                  <div className="p-5 text-center text-xs text-gray-400">
                    Belum ada pertandingan tanding kategori ini yang terekam.
                  </div>
                ) : (
                  <div className="divide-y divide-[#1b3d2f] p-1">
                    {standings.slice(0, 3).map((item, idx) => {
                      const athleteName = item.peserta?.nama || 'Unknown Athlete';
                      const contingent = item.peserta?.kontingen || '';
                      
                      // Medal color classes for index 0, 1, 2
                      const medalStyles = [
                        { text: 'text-amber-400', bg: 'bg-amber-950/80 border-amber-800' }, // Gold
                        { text: 'text-slate-300', bg: 'bg-slate-950/80 border-slate-800' }, // Silver
                        { text: 'text-amber-600', bg: 'bg-amber-950/30 border-amber-900' }, // Bronze
                      ];
                      const style = medalStyles[idx] || { text: 'text-gray-400', bg: 'bg-zinc-950 border-zinc-800' };

                      return (
                        <div key={`${item.id || idx}-${idx}`} className="flex items-center justify-between p-3 transition-colors hover:bg-[#152e22]">
                          <div className="flex items-center gap-3">
                            {/* Medal spot badge */}
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono font-bold text-sm ${style.bg} ${style.text}`}>
                              {idx + 1}
                            </div>
                            
                            <div>
                              <div className="text-xs font-bold text-white leading-tight">
                                {athleteName}
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {contingent} • Undian {item.peserta?.noUndian}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-mono font-extrabold text-[#d4af37]">
                              {item.totalSkorAkhir.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-gray-500 block uppercase">Total Nilai</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Log History table (occupies 2 columns) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="border-b border-[#23513d] pb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-1.5 text-white font-sans">
              <FileText className="w-5 h-5 text-[#d4af37]" /> Jurnal Riwayat Pertandingan Seluruhnya ({filteredHistory.length})
            </h3>

            {/* In-tab search & filter row */}
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Cari..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0b1c15] border border-[#2a5b44] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#d4af37] w-full sm:w-44"
              />
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value as any)}
                className="bg-[#0b1c15] border border-[#2a5b44] rounded-lg py-1 px-2 text-xs text-white"
              >
                <option value="Semua">Kategori Seni</option>
                <option value="Tunggal">Tunggal</option>
                <option value="Ganda">Ganda</option>
                <option value="Regu">Regu</option>
              </select>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-[#10241b] rounded-2xl p-12 border border-[#23513d] text-center text-gray-400">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="font-semibold text-white">Tidak ada jurnal riwayat tanding</p>
              <p className="text-xs text-gray-500 mt-1">Gunakan Konsol Skoring untuk melakukan penilaian dan menyimpan data atlet.</p>
            </div>
          ) : (
            <div className="bg-[#10241b] rounded-2xl border border-[#224e39] overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs sm:text-sm text-white font-sans">
                  <thead>
                    <tr className="border-b border-[#1b3d2f] bg-[#0c1e15] font-semibold text-gray-400 uppercase text-[10px] sm:text-[11px] font-mono tracking-wider">
                      <th className="py-3 px-4 text-center">No</th>
                      <th className="py-3 px-4">Nama Atlet</th>
                      <th className="py-3 px-4">Kontingen</th>
                      <th className="py-3 px-4">Kategori Seni</th>
                      <th className="py-3 px-4 text-center">Skor Akhir</th>
                      <th className="py-3 px-4 text-center">Sistem</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b3d2f]">
                    {filteredHistory.map((item, index) => {
                      const athleteName = item.peserta?.nama || 'Unknown Athlete';
                      const contingent = item.peserta?.kontingen || '';
                      
                      return (
                        <tr key={`${item.id || index}-${index}`} className="transition-colors hover:bg-[#152e22]">
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-400">
                            {index + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">
                              {athleteName}
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono block sm:hidden">
                              {contingent}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-300 font-mono hidden sm:table-cell">
                            {contingent}
                          </td>
                          <td className="py-3.5 px-4 text-gray-300">
                            <span className="text-[10px] bg-[#112d1f]/90 text-emerald-300 py-0.5 px-2 rounded border border-emerald-800 uppercase font-mono">
                              {item.kategori}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-extrabold text-[#d4af37]">
                            {item.totalSkorAkhir.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-[10px] text-gray-400">
                            {item.sistemPenilaian === 'Persilat_2022' ? 'PERSILAT 2022' : 'IPSI LAMA'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => {
                                if (confirm(`Hapus pertandingan untuk ${athleteName}?`)) {
                                  onDeleteHistoryItem(item.id);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-rose-400 transition-colors hover:bg-[#18392a] rounded cursor-pointer"
                              title="Hapus Jurnal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
