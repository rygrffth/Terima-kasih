import React from 'react';

interface StatsCardsProps {
  pendingCount: number;
  historyCount: number;
  totalCount: number;
}

export default function StatsCards({ pendingCount, historyCount, totalCount }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
      <div className="bg-theme-card border border-theme-border rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md">
        <span className="text-xs text-theme-muted block font-semibold uppercase tracking-wider">Antrean Audit</span>
        <span className="text-3xl font-extrabold text-theme-text mt-1 block">{pendingCount}</span>
      </div>
      <div className="bg-theme-card border border-theme-border rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md">
        <span className="text-xs text-theme-muted block font-semibold uppercase tracking-wider">Telah Diaudit</span>
        <span className="text-3xl font-extrabold text-status-emerald-text mt-1 block">{historyCount}</span>
      </div>
      <div className="bg-theme-card border border-theme-border rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md">
        <span className="text-xs text-theme-muted block font-semibold uppercase tracking-wider">Total LHU Terkait</span>
        <span className="text-3xl font-extrabold text-status-blue-text mt-1 block">{totalCount}</span>
      </div>
    </div>
  );
}
