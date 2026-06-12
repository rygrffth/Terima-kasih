import React from 'react';

interface StatsCardsProps {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function AdminUploadStatsCards({ total, pending, approved, rejected }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-md">
        <span className="text-[10px] uppercase font-bold text-theme-dim block">Total Pengajuan</span>
        <span className="text-xl font-bold text-theme-text block mt-1">{total}</span>
      </div>
      <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-md">
        <span className="text-[10px] uppercase font-bold text-theme-dim block">Menunggu Verifikasi</span>
        <span className="text-xl font-bold text-status-blue-text block mt-1">{pending}</span>
      </div>
      <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-md">
        <span className="text-[10px] uppercase font-bold text-theme-dim block">Telah Disetujui</span>
        <span className="text-xl font-bold text-status-emerald-text block mt-1">{approved}</span>
      </div>
      <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-md">
        <span className="text-[10px] uppercase font-bold text-theme-dim block">Perlu Revisi</span>
        <span className="text-xl font-bold text-status-red-text block mt-1">{rejected}</span>
      </div>
    </div>
  );
}
