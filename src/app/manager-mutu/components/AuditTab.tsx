import React from 'react';
import { Activity, Download } from 'lucide-react';

interface AuditLogItem {
  id: string;
  created_at: string;
  actor?: string;
  username?: string;
  role: string;
  action_type?: string;
  action?: string;
  details: string;
}

interface AuditTabProps {
  auditLogs: AuditLogItem[];
  loadingAudit: boolean;
  searchAuditQuery: string;
  setSearchAuditQuery: (val: string) => void;
  filterAuditAction: string;
  setFilterAuditAction: (val: string) => void;
}

export default function AuditTab({
  auditLogs,
  loadingAudit,
  searchAuditQuery,
  setSearchAuditQuery,
  filterAuditAction,
  setFilterAuditAction
}: AuditTabProps) {

  const exportAuditToCsv = () => {
    if (auditLogs.length === 0) {
      alert('Tidak ada log audit untuk diekspor.');
      return;
    }
    const headers = ['Waktu', 'Pengguna', 'Role', 'Aksi', 'Keterangan'];
    const rows = auditLogs.map(log => [
      new Date(log.created_at).toLocaleString('id-ID'),
      log.username || log.actor || '-',
      log.role || '-',
      log.action || log.action_type || '-',
      `"${(log.details || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Logs_PROLAB_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text mb-2">
        <Activity size={18} className="text-status-orange-text animate-pulse" /> Log Audit Aktivitas Sistem
      </h3>
      <p className="text-xs text-theme-muted mb-6">
        Lacak riwayat perubahan berkas, aksi verifikasi admin, audit supervisor, keputusan manager qhse / direktur, dan registrasi biometrik secara real-time.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-theme-input p-4 border border-theme-border rounded-xl">
        <input 
          type="text"
          placeholder="Cari berdasarkan nama aktor atau detail pesan..."
          value={searchAuditQuery}
          onChange={(e) => setSearchAuditQuery(e.target.value)}
          className="flex-1 bg-theme-card border border-theme-border focus:border-status-blue-border rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
        />
        <select
          value={filterAuditAction}
          onChange={(e) => setFilterAuditAction(e.target.value)}
          className="bg-theme-card border border-theme-border focus:border-status-blue-border rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
        >
          <option value="ALL">Semua Aksi</option>
          <option value="UPLOAD_LHU">Upload LHU</option>
          <option value="REVISION_LHU">Revisi LHU</option>
          <option value="VERIFY_LHU_APPROVE">Admin Setujui</option>
          <option value="VERIFY_LHU_REJECT">Admin Tolak</option>
          <option value="AUDIT_LHU_APPROVE">Supervisor Setujui</option>
          <option value="AUDIT_LHU_REJECT">Supervisor Tolak</option>
          <option value="MANAGER_LHU_APPROVE">Persetujuan Manager</option>
          <option value="MANAGER_LHU_REJECT">Manager Tolak</option>
          <option value="MANAGER_UPDATE_TEMPLATE">Update Template Kode</option>
          <option value="BATCH_VERIFY_LHU_APPROVE">Admin Batch Setuju</option>
          <option value="BATCH_AUDIT_LHU_APPROVE">Supervisor Batch Setuju</option>
        </select>
        <button
          onClick={exportAuditToCsv}
          className="bg-status-emerald-bg hover:bg-status-emerald-bg text-theme-text font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <Download size={14} /> Ekspor CSV
        </button>
      </div>

      {loadingAudit ? (
        <div className="text-center py-12 text-xs text-theme-dim font-semibold animate-pulse">
          Memuat riwayat log audit...
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-theme-border rounded-xl text-xs text-theme-dim bg-theme-input">
          Belum ada aktivitas audit terekam di sistem.
        </div>
      ) : (() => {
        let filteredLogs = auditLogs.filter(log => {
          if (!log) return false;
          const actorName = log.username || log.actor || '';
          const actionName = log.action || log.action_type || '';
          
          const matchSearch = 
            actorName.toLowerCase().includes(searchAuditQuery.toLowerCase()) ||
            (log.details || '').toLowerCase().includes(searchAuditQuery.toLowerCase());
          
          const matchAction = filterAuditAction === 'ALL' || actionName === filterAuditAction;
          return matchSearch && matchAction;
        });

        if (filteredLogs.length === 0) {
          return (
            <div className="text-center py-12 border border-dashed border-theme-border rounded-xl text-xs text-theme-dim bg-theme-input">
              Tidak ada log audit yang cocok dengan kriteria pencarian.
            </div>
          );
        }

        return (
          <div className="overflow-x-auto border border-theme-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-theme-input text-theme-muted border-b border-theme-border">
                  <th className="p-3 font-semibold">Waktu</th>
                  <th className="p-3 font-semibold">Pengguna</th>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">Aksi</th>
                  <th className="p-3 font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/60 bg-theme-input/40">
                {filteredLogs.map((log) => {
                  let roleColor = 'text-theme-muted bg-theme-input border-theme-border';
                  if (log.role === 'manager_mutu' || log.role === 'direktur' || log.role === 'manager_lab') roleColor = 'text-status-purple-text bg-status-purple-bg border-status-purple-border';
                  else if (log.role === 'supervisor') roleColor = 'text-status-amber-text bg-status-amber-bg border-status-amber-border';
                  else if (log.role === 'spv') roleColor = 'text-status-orange-text bg-status-orange-bg border-status-orange-border';
                  else if (log.role === 'admin') roleColor = 'text-status-blue-text bg-status-blue-bg border-status-blue-border';
                  else if (log.role === 'teknisi') roleColor = 'text-status-indigo-text bg-status-indigo-bg border-status-indigo-border';

                  const actorName = log.username || log.actor || '-';
                  const actionName = log.action || log.action_type || '-';

                  return (
                    <tr key={log.id} className="hover:bg-theme-input/40 transition-colors">
                      <td className="p-3 font-mono text-[10px] text-theme-dim whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 font-semibold text-theme-muted">{actorName}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${roleColor}`}>
                          {log.role === 'manager_mutu' ? 'Manager QHSE' : 
                           log.role === 'direktur' ? 'Direktur' : 
                           log.role === 'manager_lab' ? 'Manager QHSE' : 
                           log.role === 'supervisor' ? 'Supervisor' : 
                           log.role === 'admin' ? 'Admin' : 
                           log.role === 'teknisi' ? 'Admin' : 
                           log.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] text-theme-muted font-semibold">{actionName}</span>
                      </td>
                      <td className="p-3 text-theme-muted max-w-sm truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
    </>
  );
}
