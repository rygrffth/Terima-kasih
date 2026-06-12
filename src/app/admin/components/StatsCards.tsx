import React from 'react';
import { Clock, FileCheck } from 'lucide-react';

interface StatsCardsProps {
  totalPending: number;
  overduePending: number;
}

export default function StatsCards({ totalPending, overduePending }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-md flex justify-between items-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-theme-dim block">Total Berkas Mengantre</span>
          <span className="text-xl font-bold text-theme-text block mt-1">{totalPending} berkas</span>
        </div>
        <Clock size={28} className="text-status-blue-text" />
      </div>
      <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-md flex justify-between items-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-theme-dim block">Antrean Kritis (&gt;24 Jam)</span>
          <span className="text-xl font-bold text-status-red-text block mt-1">{overduePending} berkas</span>
        </div>
        <FileCheck size={28} className="text-status-red-text animate-pulse" />
      </div>
    </div>
  );
}
