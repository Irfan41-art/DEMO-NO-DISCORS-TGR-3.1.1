/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Peserta, KategoriSeni } from '../types';
import { Plus, Trash2, Edit2, Check, UserCheck, ShieldAlert, Award, Search, RefreshCw } from 'lucide-react';

interface DaftarPesertaProps {
  pesertaList: Peserta[];
  activePeserta: Peserta | null;
  onSelectActive: (peserta: Peserta) => void;
  onAddPeserta: (peserta: Omit<Peserta, 'id'>) => void;
  onDeletePeserta: (id: string) => void;
  onResetSamples: () => void;
}

export default function DaftarPeserta({
  pesertaList,
  activePeserta,
  onSelectActive,
  onAddPeserta,
  onDeletePeserta,
  onResetSamples,
}: DaftarPesertaProps) {
  // Filters & State
  const [filterKategori, setFilterKategori] = useState<KategoriSeni | 'Semua'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Competitor Form State
  const [nama, setNama] = useState('');
  const [kontingen, setKontingen] = useState('');
  const [kategori, setKategori] = useState<KategoriSeni>('Tunggal');
  const [noUndian, setNoUndian] = useState('');
  const [pool, setPool] = useState('');
  const [gender, setGender] = useState<'Putra' | 'Putri'>('Putra');
  const [kelas, setKelas] = useState<'Usia Dini' | 'Pra Remaja' | 'Remaja' | 'Dewasa' | 'Master'>('Dewasa');
  
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !kontingen || !noUndian) {
      alert('Mohon lengkapi data Nama, Kontingen, dan Nomor Undian!');
      return;
    }
    onAddPeserta({
      nama,
      kontingen,
      kategori,
      noUndian,
      pool: pool || 'A',
      gender,
      kelas,
    });
    // Reset Form
    setNama('');
    setKontingen('');
    setNoUndian('');
    setPool('');
    setShowAddForm(false);
  };

  const filteredPeserta = pesertaList.filter((p) => {
    const matchKategori = filterKategori === 'Semua' || p.kategori === filterKategori;
    const matchSearch =
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kontingen.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.noUndian.includes(searchQuery);
    return matchKategori && matchSearch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto p-4 sm:p-6" id="competitor-panel">
      
      {/* Left Columns - Form Entry and Shortcuts */}
      <div className="space-y-6 lg:col-span-1">
        
        {/* Active Competitor Summary Screen (Status Deck) */}
        <div className="bg-gradient-to-br from-[#0c2e21] to-[#04150e] p-5 rounded-2xl border-2 border-[#d4af37] shadow-xl text-white relative overflow-hidden" id="active-deck-status">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#d4af37]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#d4af37] uppercase tracking-wider mb-3">
            <Award className="w-5 h-5 text-[#d4af37] stroke-[2]" />
            <span>Peserta Bertanding Aktif</span>
          </div>
          {activePeserta ? (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/20">
                  NO. UNDIAN {activePeserta.noUndian}
                </span>
                <h3 className="text-xl font-bold mt-1 text-white tracking-tight leading-tight">
                  {activePeserta.nama}
                </h3>
                <p className="text-sm text-gray-300 font-mono mt-0.5">{activePeserta.kontingen}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1b3d2f] text-xs font-mono">
                <div>
                  <span className="text-gray-400 block text-[9px] uppercase">Kategori</span>
                  <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/30">
                    Seni {activePeserta.kategori}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[9px] uppercase">Kelas / Gender</span>
                  <span className="font-semibold text-gray-200">
                    {activePeserta.kelas} • {activePeserta.gender === 'Putra' ? 'PA' : 'PI'}
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <div className="text-[11px] text-[#d4af37] flex items-center gap-1.5 bg-[#f0d473]/10 p-2 rounded border border-[#d4af37]/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Siap dinilai di tab <strong>&apos;Konsol Skoring&apos;</strong> atau dipaparkan di <strong>&apos;Scoreboard&apos;</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <ShieldAlert className="w-10 h-10 text-gray-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Belum ada atlet yang dipilih.</p>
              <p className="text-xs text-gray-500 mt-1">Pilih atlet dari tabel di sebelah kanan untuk memulai penilaian.</p>
            </div>
          )}
        </div>

        {/* Add New Competitor Widget Form */}
        <div className="bg-[#10241b] rounded-2xl border border-[#1e4434] shadow-lg overflow-hidden">
          <div className="bg-[#163326] px-5 py-3.5 border-b border-[#214c38] flex justify-between items-center">
            <h3 className="font-semibold text-white text-sm sm:text-base flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#d4af37]" /> Tambah Peserta Baru
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-2.5 py-1 text-xs bg-[#22503a] hover:bg-[#2b644a] text-white border border-[#2d684d] rounded-md transition-colors"
            >
              {showAddForm ? 'Sembunyikan' : 'Buka Form'}
            </button>
          </div>
          
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-white text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-300">Nama Lengkap Atlet / Tim</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Putu Gede Alit"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full bg-[#163326] border border-[#2a5b44] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-300">No. Undian</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 05"
                    value={noUndian}
                    onChange={(e) => setNoUndian(e.target.value)}
                    className="w-full bg-[#163326] border border-[#2a5b44] rounded-lg px-3 py-2 text-white text-center font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-300">Pool (Grup)</label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={pool}
                    onChange={(e) => setPool(e.target.value)}
                    className="w-full bg-[#163326] border border-[#2a5b44] rounded-lg px-3 py-2 text-white text-center font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-300">Kontingen / Klub / Provinsi</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IPSI Bali"
                  value={kontingen}
                  onChange={(e) => setKontingen(e.target.value)}
                  className="w-full bg-[#163326] border border-[#2a5b44] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-300">Kategori Seni</label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as KategoriSeni)}
                    className="w-full bg-[#163326] border border-[#2a5b44] rounded-lg px-2.5 py-2 text-white"
                  >
                    <option value="Tunggal">Tunggal (Satu)</option>
                    <option value="Ganda">Ganda (Duo)</option>
                    <option value="Regu">Regu (Tiga)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-gray-300 font-sans">Kelas Tanding</label>
                  <select
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value as any)}
                    className="w-full bg-[#163326] border border-[#2a5b44] rounded-lg px-2.5 py-2 text-white"
                  >
                    <option value="Usia Dini">Usia Dini</option>
                    <option value="Pra Remaja">Pra Remaja</option>
                    <option value="Remaja">Remaja</option>
                    <option value="Dewasa">Dewasa</option>
                    <option value="Master">Master</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-300 mb-1">Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('Putra')}
                    className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      gender === 'Putra'
                        ? 'bg-[#d4af37] text-black font-bold border-[#d4af37]'
                        : 'bg-[#163326] text-gray-300 border-[#2a5b44]'
                    }`}
                  >
                    Putra (PA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('Putri')}
                    className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      gender === 'Putri'
                        ? 'bg-[#d4af37] text-black font-bold border-[#d4af37]'
                        : 'bg-[#163326] text-gray-300 border-[#2a5b44]'
                    }`}
                  >
                    Putri (PI)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#d4af37] hover:bg-[#aa841c] text-black font-bold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all font-sans active:scale-[0.98] mt-2 cursor-pointer"
              >
                Daunmasi & Tambah Peserta
              </button>
            </form>
          )}

          {!showAddForm && (
            <div className="p-4 text-center text-xs text-gray-400">
              Isi data atlet di sini jika Anda menyelenggarakan turnamen sirkuit mandiri.
            </div>
          )}
        </div>

        {/* Diagnostic Actions & Presets */}
        <div className="bg-[#10241b] rounded-2xl border border-[#1e4434] p-4 flex flex-col gap-2 shadow text-xs">
          <span className="text-[#d4af37] font-mono block mb-1">PILIHAN LAIN:</span>
          <button
            onClick={onResetSamples}
            className="flex items-center justify-center gap-2 w-full py-2 bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-lg transition-transform active:scale-95 font-semibold cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Reset ke Peserta Sampel IPSI
          </button>
          <p className="text-[10px] text-gray-400 text-justify leading-relaxed mt-1">
            Jika menginginkan pembersihan database laskar loka, semua data atlet dan file juri dapat diset kembali ke default standar.
          </p>
        </div>

      </div>

      {/* Right Table Section - Competitors Directory list */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Search & Filter Header */}
        <div className="bg-[#10241b] rounded-2xl border border-[#1e4434] p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
          
          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4 text-[#d4af37]" />
            </span>
            <input
              type="text"
              placeholder="Cari Nama / Kontingen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b1c15] border border-[#2a5b44] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
            />
          </div>

          <div className="flex bg-[#0b1c15] p-1 rounded-lg border border-[#2a5b44] w-full md:w-auto">
            {(['Semua', 'Tunggal', 'Ganda', 'Regu'] as const).map((kat) => (
              <button
                key={kat}
                onClick={() => setFilterKategori(kat)}
                className={`flex-1 md:flex-none px-3.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  filterKategori === kat
                    ? 'bg-[#d4af37] text-black shadow'
                    : 'text-gray-300 hover:text-white hover:bg-[#163326]'
                }`}
              >
                {kat}
              </button>
            ))}
          </div>

        </div>

        {/* Competitors List Grid Card */}
        <div className="bg-[#10241b] rounded-2xl border border-[#1e4434] overflow-hidden shadow-lg">
          <div className="p-4 sm:px-6 bg-[#163326] border-b border-[#214c38] flex justify-between items-center">
            <h3 className="font-semibold text-white text-sm sm:text-base">
              Daftar Peserta Kompetisi ({filteredPeserta.length})
            </h3>
            <span className="text-[11px] font-mono bg-[#112d1f]/90 text-[#d4af37] py-0.5 px-2.5 rounded border border-[#1b4e33]">
              Offline Database
            </span>
          </div>

          {filteredPeserta.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-base font-semibold">Tidak Ada Peserta yang Ditemukan</p>
              <p className="text-xs text-gray-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter kategori seni.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm text-white">
                <thead>
                  <tr className="border-b border-[#1b3d2f] bg-[#0c1e15] font-semibold text-gray-300 uppercase tracking-wider text-[11px] font-mono">
                    <th className="py-3 px-4 text-center w-16">Undian</th>
                    <th className="py-3 px-4">Nama Atlet</th>
                    <th className="py-3 px-4">Klub / Kontingen</th>
                    <th className="py-3 px-4">Kategori / Gender</th>
                    <th className="py-3 px-4 text-center w-36">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1b3d2f]">
                  {filteredPeserta.map((peserta, idx) => {
                    const isSelectedAndActive = activePeserta?.id === peserta.id;
                    return (
                      <tr
                        key={`${peserta.id || idx}-${idx}`}
                        className={`transition-colors hover:bg-[#152e22] ${
                          isSelectedAndActive ? 'bg-[#18392a]' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#d4af37]">
                          <span className="inline-block bg-[#1f3f2d] border border-[#d4af37]/30 px-2.5 py-0.5 rounded-full">
                            {peserta.noUndian}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div>
                            {peserta.nama}
                            <div className="lg:hidden text-[10px] text-gray-400 font-mono mt-0.5">
                              {peserta.kontingen}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300 hidden lg:table-cell font-mono">
                          {peserta.kontingen}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                              Seni {peserta.kategori}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {peserta.kelas} • {peserta.gender}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isSelectedAndActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono text-[11px] rounded-md leading-none font-bold">
                                <UserCheck className="w-3.5 h-3.5" /> AKTIF
                              </span>
                            ) : (
                              <button
                                onClick={() => onSelectActive(peserta)}
                                className="group relative flex items-center gap-1 px-3 py-1 bg-[#d4af37] hover:bg-[#aa841c] text-black font-semibold text-[11px] rounded-md transition-all active:scale-95 shadow cursor-pointer"
                              >
                                Pilih Atlet
                              </button>
                            )}
                            <button
                              onClick={() => onDeletePeserta(peserta.id)}
                              disabled={isSelectedAndActive}
                              className={`p-1.5 rounded text-gray-400 hover:text-rose-400 transition-colors ${
                                isSelectedAndActive ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-rose-950/40'
                              }`}
                              title={isSelectedAndActive ? 'Atlet aktif tidak bisa dihapus' : 'Hapus Peserta'}
                            >
                              <Trash2 className="w-4 h-4" />
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
      
    </div>
  );
}
