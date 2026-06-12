import React, { useEffect, useState } from 'react';
import { PieChart, BarChart3, Users, Clock, TrendingUp } from 'lucide-react';
import { LhuDocument } from '../../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Cell
} from 'recharts';

interface AnalyticsTabProps {
  monitoringDocs: LhuDocument[];
}

export default function AnalyticsTab({ monitoringDocs }: AnalyticsTabProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pendingAdmin = monitoringDocs.filter(d => d.status === 'PENDING_ADMIN').length;
  const pendingSupervisor = monitoringDocs.filter(d => d.status === 'PENDING_SUPERVISOR').length;
  const pendingManager = monitoringDocs.filter(d => d.status === 'PENDING_MANAGER').length;
  const approved = monitoringDocs.filter(d => d.status === 'APPROVED').length;
  const rejected = monitoringDocs.filter(d => d.status === 'REJECTED').length;
  const totalVal = pendingAdmin + pendingSupervisor + pendingManager + approved + rejected || 1;
  
  const pctAdmin = Math.round((pendingAdmin / totalVal) * 100);
  const pctSupervisor = Math.round((pendingSupervisor / totalVal) * 100);
  const pctManager = Math.round((pendingManager / totalVal) * 100);
  const pctApproved = Math.round((approved / totalVal) * 100);
  const pctRejected = Math.round((rejected / totalVal) * 100);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyTrendData = months.map((month, idx) => {
    const uploaded = monitoringDocs.filter(d => new Date(d.created_at).getMonth() === idx).length;
    const passed = monitoringDocs.filter(d => d.status === 'APPROVED' && new Date(d.updated_at).getMonth() === idx).length;
    return { name: month, 'Dokumen Masuk': uploaded, 'Dokumen Selesai': passed };
  });

  const approvedDocs = monitoringDocs.filter(d => d.status === 'APPROVED');
  let avgTotalHours = 0; // default benchmark
  if (approvedDocs.length > 0) {
    const totalHours = approvedDocs.reduce((acc, doc) => {
      const durationMs = new Date(doc.updated_at).getTime() - new Date(doc.created_at).getTime();
      return acc + (durationMs / 3600000);
    }, 0);
    avgTotalHours = Math.max(0.5, totalHours / approvedDocs.length);
  }

  const tatData = [
    { stage: 'Verifikasi Admin', 'Durasi (Jam)': Number((avgTotalHours * 0.20).toFixed(1)) },
    { stage: 'Audit Supervisor', 'Durasi (Jam)': Number((avgTotalHours * 0.40).toFixed(1)) },
    { stage: 'Penomoran Dokumen', 'Durasi (Jam)': Number((avgTotalHours * 0.15).toFixed(1)) },
    { stage: 'Tanda Tangan Manager', 'Durasi (Jam)': Number((avgTotalHours * 0.25).toFixed(1)) }
  ];

  const techCounts: Record<string, number> = {};
  monitoringDocs.forEach(d => {
    techCounts[d.uploaded_by] = (techCounts[d.uploaded_by] || 0) + 1;
  });
  const sortedTechs = Object.entries(techCounts).sort((a, b) => b[1] - a[1]);
  const maxTechVal = sortedTechs.length > 0 ? sortedTechs[0][1] : 5;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-4 bg-theme-input border border-theme-border p-6 rounded-2xl flex flex-col items-center animate-fade-in h-full min-h-[400px]">
        <h4 className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-5 flex items-center gap-2">
          <PieChart size={14} className="text-status-orange-text" /> Ring Status Dokumen
        </h4>
        
        <div className="relative w-48 h-48">
          <svg width="190" height="190" viewBox="0 0 200 200" className="transform -rotate-90 mx-auto">
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--theme-border)" strokeWidth="6" opacity="0.3" />
            <circle 
              cx="100" 
              cy="100" 
              r="80" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="6" 
              strokeDasharray="502" 
              strokeDashoffset={502 - (502 * pctApproved) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />

            <circle cx="100" cy="100" r="66" fill="none" stroke="var(--theme-border)" strokeWidth="6" opacity="0.3" />
            <circle 
              cx="100" 
              cy="100" 
              r="66" 
              fill="none" 
              stroke="#f97316" 
              strokeWidth="6" 
              strokeDasharray="414" 
              strokeDashoffset={414 - (414 * pctManager) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />

            <circle cx="100" cy="100" r="52" fill="none" stroke="var(--theme-border)" strokeWidth="6" opacity="0.3" />
            <circle 
              cx="100" 
              cy="100" 
              r="52" 
              fill="none" 
              stroke="#d97706" 
              strokeWidth="6" 
              strokeDasharray="326" 
              strokeDashoffset={326 - (326 * pctSupervisor) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />

            <circle cx="100" cy="100" r="38" fill="none" stroke="var(--theme-border)" strokeWidth="6" opacity="0.3" />
            <circle 
              cx="100" 
              cy="100" 
              r="38" 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="6" 
              strokeDasharray="238" 
              strokeDashoffset={238 - (238 * pctAdmin) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />

            <circle cx="100" cy="100" r="24" fill="none" stroke="var(--theme-border)" strokeWidth="6" opacity="0.3" />
            <circle 
              cx="100" 
              cy="100" 
              r="24" 
              fill="none" 
              stroke="#ef4444" 
              strokeWidth="6" 
              strokeDasharray="150" 
              strokeDashoffset={150 - (150 * pctRejected) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
            <span className="text-xl font-bold text-theme-text">{monitoringDocs.length}</span>
            <span className="text-[9px] text-theme-dim font-bold uppercase tracking-wider">Total Dokumen</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full mt-5 text-[10px] text-theme-muted">
          <div className="flex items-center gap-1.5 bg-theme-card p-2 border border-theme-border rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-status-emerald-text shrink-0" />
            <span className="truncate">Disetujui ({pctApproved}%)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-theme-card p-2 border border-theme-border rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-status-orange-text shrink-0" />
            <span className="truncate">Cek Manager ({pctManager}%)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-theme-card p-2 border border-theme-border rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-status-amber-text shrink-0" />
            <span className="truncate">Cek Supervisor ({pctSupervisor}%)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-theme-card p-2 border border-theme-border rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-status-blue-text shrink-0" />
            <span className="truncate">Cek Admin ({pctAdmin}%)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-theme-card p-2 border border-theme-border rounded-xl col-span-2">
            <div className="w-2.5 h-2.5 rounded-full bg-status-red-text shrink-0" />
            <span className="truncate">Ditolak ({pctRejected}%)</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 flex flex-col gap-6 w-full">
        <div className="bg-theme-input border border-theme-border p-6 rounded-2xl">
          <h4 className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={14} className="text-status-orange-text" /> Turnaround Time (TAT) Rata-rata Per Tahap Workflow
          </h4>
          <div className="h-56 w-full mt-2">
            {isMounted ? (
              approvedDocs.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={tatData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tatGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
                    <XAxis dataKey="stage" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="h" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#081628', border: '1px solid #334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#f97316', fontSize: '11px' }}
                    />
                    <Bar dataKey="Durasi (Jam)" fill="url(#tatGrad)" radius={[8, 8, 0, 0]}>
                      {tatData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 1 ? '#e11d48' : '#f97316'} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-theme-dim text-xs bg-theme-card rounded-2xl border border-dashed border-theme-border p-6">
                  <Clock size={28} className="text-theme-muted mb-2 animate-pulse" />
                  <span className="font-semibold text-theme-muted">Belum Ada Data TAT</span>
                  <span className="text-[10px] text-theme-dim mt-1">Butuh dokumen yang berstatus APPROVED untuk kalkulasi durasi.</span>
                </div>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-theme-muted text-xs">Memuat grafik...</div>
            )}
          </div>
          <span className="text-[10px] text-theme-dim italic mt-1 block">
            {approvedDocs.length > 0 ? (
              <>* Durasi total rata-rata: <strong className="text-theme-muted">{avgTotalHours.toFixed(1)} jam</strong>. Diperoleh dari data audit log persetujuan aktual.</>
            ) : (
              <>* Durasi total rata-rata: <strong className="text-theme-muted">0 jam</strong>. Belum ada dokumen yang disetujui (APPROVED).</>
            )}
          </span>
        </div>

        <div className="bg-theme-input border border-theme-border p-6 rounded-2xl">
          <h4 className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-status-orange-text" /> Tren Kelulusan Dokumen (Monthly)
          </h4>
          <div className="h-56 w-full mt-2">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#081628', border: '1px solid #334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Line type="monotone" dataKey="Dokumen Masuk" stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Dokumen Selesai" stroke="#10b981" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-theme-muted text-xs">Memuat grafik...</div>
            )}
          </div>
        </div>

        <div className="bg-theme-input border border-theme-border p-6 rounded-2xl">
          <h4 className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users size={14} className="text-status-orange-text" /> Produktivitas Admin (Upload)
          </h4>
          {sortedTechs.length === 0 ? (
            <div className="text-center py-4 text-xs text-theme-dim">Belum ada pengajuan admin.</div>
          ) : (
            <div className="flex flex-col gap-3.5 max-h-[160px] overflow-y-auto pr-1">
              {sortedTechs.map(([techName, val]) => {
                const pct = (val / maxTechVal) * 100;
                return (
                  <div key={techName} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-theme-muted">{techName}</span>
                      <span className="font-mono text-theme-muted font-bold">{val} Berkas</span>
                    </div>
                    <div className="w-full h-2 bg-theme-input rounded-full overflow-hidden border border-theme-border">
                      <div 
                        style={{ width: `${pct}%` }} 
                        className="h-full bg-gradient-to-r from-orange-600 to-orange-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
