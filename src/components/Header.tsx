/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Settings, Wifi, Trophy, HelpCircle, HardDrive } from 'lucide-react';
import { SistemPenilaian } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sistemPenilaian: SistemPenilaian;
  jumlahJuri: number;
  onOpenSettings: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  sistemPenilaian,
  jumlahJuri,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header className="bg-[#0b1c15] border-b border-[#1b3d2f] text-white py-3 px-4 sm:px-6 sticky top-0 z-40 shadow-md" id="app-header">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#aa841c] flex items-center justify-center shadow-lg shadow-[#000000a6]">
            <Shield className="w-6 h-6 text-[#0b1c15] stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-widest text-[#d4af37] font-semibold bg-[#214335] px-2 py-0.5 rounded">
                IPSI / PERSILAT DIGITAL
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                <Wifi className="w-3 h-3 animate-pulse" /> OFFLINE READY
              </span>
            </div>
            <h1 className="text-lg font-bold tracking-tight font-sans text-white">
              TandingSeni <span className="text-[#d4af37]">Digital Scoring</span>
            </h1>
          </div>
        </div>

        {/* Live System Info Card */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono bg-[#163326] px-4 py-1.5 rounded-md border border-[#254f3b]">
          <div className="flex flex-col">
            <span className="text-gray-400 text-[10px]">Sistem Nilai</span>
            <span className="text-[#d4af37] font-bold">
              {sistemPenilaian === 'Persilat_2022' ? 'PERSILAT 2022 (Desimal Baru)' : 'IPSI TRADISIONAL (100 Poin)'}
            </span>
          </div>
          <div className="w-px h-6 bg-[#254f3b]" />
          <div className="flex flex-col">
            <span className="text-gray-400 text-[10px]">Jumlah Juri</span>
            <span className="text-white font-bold">{jumlahJuri} Juri Aktif</span>
          </div>
          <div className="w-px h-6 bg-[#254f3b]" />
          <div className="flex flex-col">
            <span className="text-gray-400 text-[10px]">Penyimpanan</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <HardDrive className="w-3 h-3" /> Lokal / Browser
            </span>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <nav className="flex flex-wrap gap-1 bg-[#10271d] p-1 rounded-lg border border-[#1b3d2f]">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#aa841c] text-black shadow'
                : 'text-gray-300 hover:bg-[#163326] hover:text-white'
            }`}
          >
            Peserta & Panel
          </button>
          
          <button
            id="tab-skoring"
            onClick={() => setActiveTab('skoring')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'skoring'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#aa841c] text-black shadow'
                : 'text-gray-300 hover:bg-[#163326] hover:text-white'
            }`}
          >
            Konsol Skoring
          </button>
          
          <button
            id="tab-scoreboard"
            onClick={() => setActiveTab('scoreboard')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'scoreboard'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#aa841c] text-black shadow'
                : 'text-gray-300 hover:bg-[#163326] hover:text-white'
            }`}
          >
            Layar Skor Penonton
          </button>
          
          <button
            id="tab-history"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#aa841c] text-black shadow'
                : 'text-gray-300 hover:bg-[#163326] hover:text-white'
            }`}
          >
            Klasemen & Rekap
          </button>

          <button
            id="tab-help"
            onClick={() => setActiveTab('help')}
            className={`px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'help'
                ? 'bg-gradient-to-r from-[#d4af37] to-[#aa841c] text-black shadow'
                : 'text-gray-300 hover:bg-[#163326] hover:text-white'
            }`}
            title="Bantuan & Aturan"
          >
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 inline" />
          </button>
        </nav>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a4131] hover:bg-[#21533e] text-white border border-[#2d614b] rounded-lg transition-transform active:scale-95 text-xs font-mono cursor-pointer"
        >
          <Settings className="w-4 h-4 text-[#d4af37]" />
          <span>Pengaturan</span>
        </button>

      </div>
    </header>
  );
}
