import React from 'react';
import { FileCheck2, FileSpreadsheet, Calendar, ArrowUpDown, QrCode, Eye, Send, XCircle, CheckCircle, Trash2 } from 'lucide-react';
import { LhuDocument } from '../../../types';

interface LhuTabProps {
  pendingDocs: LhuDocument[];
  approvedDocs: LhuDocument[];
  monitoringDocs: LhuDocument[];
  loading: boolean;
  lhuSubTab: 'pending' | 'approved' | 'all';
  setLhuSubTab: (tab: 'pending' | 'approved' | 'all') => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  techFilter: string;
  setTechFilter: (val: string) => void;
  commodityFilter: string;
  setCommodityFilter: (val: string) => void;
  deptFilter: string;
  setDeptFilter: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  sortOrder: string;
  setSortOrder: (val: string) => void;
  actionNotes: Record<string, string>;
  handleNoteChange: (id: string, note: string) => void;
  handleManagerAction: (id: string, action: 'approve' | 'reject') => void;
  exportToCsv: () => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
  setQrModalDoc: (doc: LhuDocument) => void;
  setPreviewDoc: (doc: LhuDocument) => void;
  handleFollowUp: (doc: LhuDocument) => void;
  handleDeleteDoc?: (doc: LhuDocument) => void;
}

export default function LhuTab({
  pendingDocs,
  approvedDocs,
  monitoringDocs,
  loading,
  lhuSubTab,
  setLhuSubTab,
  searchQuery,
  setSearchQuery,
  techFilter,
  setTechFilter,
  commodityFilter,
  setCommodityFilter,
  deptFilter,
  setDeptFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  sortOrder,
  setSortOrder,
  actionNotes,
  handleNoteChange,
  handleManagerAction,
  exportToCsv,
  formatLhuNumber,
  setQrModalDoc,
  setPreviewDoc,
  handleFollowUp,
  handleDeleteDoc
}: LhuTabProps) {
  return (
    <>
      <div className="flex gap-2 mb-6 bg-theme-input p-1 rounded-xl border border-theme-border w-fit flex-wrap">
        <button
          onClick={() => setLhuSubTab('pending')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            lhuSubTab === 'pending' ? 'bg-theme-card text-theme-text border border-theme-border' : 'text-theme-muted hover:text-theme-muted'
          }`}
        >
          Antrean Persetujuan ({pendingDocs.length})
        </button>
        <button
          onClick={() => setLhuSubTab('approved')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            lhuSubTab === 'approved' ? 'bg-theme-card text-theme-text border border-theme-border' : 'text-theme-muted hover:text-theme-muted'
          }`}
        >
          Arsip Disetujui ({approvedDocs.length})
        </button>
        <button
          onClick={() => setLhuSubTab('all')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            lhuSubTab === 'all' ? 'bg-theme-card text-theme-text border border-theme-border' : 'text-theme-muted hover:text-theme-muted'
          }`}
        >
          Semua Alur Berkas ({monitoringDocs.length})
        </button>
      </div>

      <div className="flex flex-col gap-3 mb-6 bg-theme-input p-4 border border-theme-border rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input 
            type="text"
            placeholder="Cari berdasarkan judul, nomor/kode LHU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:col-span-6 bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
          />
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="sm:col-span-2 bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
          >
            <option value="ALL">Semua Admin</option>
            {Array.from(new Set(monitoringDocs.map(d => d.uploaded_by))).map(tech => (
              <option key={tech} value={tech}>{tech}</option>
            ))}
          </select>
          <select
            value={commodityFilter}
            onChange={(e) => setCommodityFilter(e.target.value)}
            className="sm:col-span-2 bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
          >
            <option value="ALL">Semua Departemen</option>
            <option value="Elektronik">Elektronik</option>
            <option value="Besi Baja">Besi Baja</option>
            <option value="RF">RF</option>
          </select>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="sm:col-span-2 bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
          >
            <option value="ALL">Semua Jenis Dokumen</option>
            <option value="Safety">Safety</option>
            <option value="SKEM">SKEM</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 bg-theme-card border border-theme-border rounded-xl px-3 py-1.5">
            <Calendar size={14} className="text-theme-dim" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-theme-text text-xs outline-none w-full cursor-pointer text-theme-muted"
              title="Tanggal Mulai"
            />
          </div>
          <div className="flex items-center gap-2 bg-theme-card border border-theme-border rounded-xl px-3 py-1.5">
            <Calendar size={14} className="text-theme-dim" />
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-theme-text text-xs outline-none w-full cursor-pointer text-theme-muted"
              title="Tanggal Selesai"
            />
          </div>
          <div className="flex items-center gap-2 bg-theme-card border border-theme-border rounded-xl px-3 py-1.5">
            <ArrowUpDown size={14} className="text-theme-dim" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-transparent text-theme-text text-xs outline-none w-full cursor-pointer text-theme-muted"
            >
              <option value="newest">Terbaru Diperbarui</option>
              <option value="oldest">Terlama Diperbarui</option>
              <option value="lhu_desc">Nomor LHU Terbesar</option>
              <option value="lhu_asc">Nomor LHU Terkecil</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-theme-dim text-xs font-semibold animate-pulse">
          Memuat data berkas LHU...
        </div>
      ) : (() => {
        let docs = lhuSubTab === 'pending' ? pendingDocs 
                   : lhuSubTab === 'approved' ? approvedDocs 
                   : monitoringDocs;

        let filtered = docs.filter(doc => {
          if (!doc) return false;
          const docNumStr = doc.kode_lhu || `LHU-${String(doc.nomor_lhu || '').padStart(3, '0')}`;
          const matchSearch = 
            (doc.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            docNumStr.toLowerCase().includes(searchQuery.toLowerCase());
          
          const matchTech = techFilter === 'ALL' || doc.uploaded_by === techFilter;
          const matchCommodity = commodityFilter === 'ALL' || doc.komoditi === commodityFilter;
          const matchDept = deptFilter === 'ALL' || doc.departemen === deptFilter;

          let matchDate = true;
          if (startDate) {
            const start = new Date(startDate).getTime();
            const docTime = new Date(doc.created_at).getTime();
            matchDate = matchDate && docTime >= start;
          }
          if (endDate) {
            const end = new Date(endDate).getTime() + 86400000;
            const docTime = new Date(doc.created_at).getTime();
            matchDate = matchDate && docTime <= end;
          }

          return matchSearch && matchTech && matchCommodity && matchDept && matchDate;
        });

        filtered = [...filtered].sort((a, b) => {
          if (sortOrder === 'newest') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          if (sortOrder === 'oldest') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          if (sortOrder === 'lhu_desc') return b.nomor_lhu - a.nomor_lhu;
          if (sortOrder === 'lhu_asc') return a.nomor_lhu - b.nomor_lhu;
          return 0;
        });

        if (filtered.length === 0) {
          return (
            <div className="text-center py-12 border border-dashed border-theme-border rounded-2xl text-xs text-theme-dim bg-theme-input">
              Tidak ada berkas LHU yang cocok dengan kriteria pencarian Anda.
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-4">
            {lhuSubTab === 'approved' && (
              <div className="flex justify-between items-center pb-2 border-b border-theme-border">
                <span className="text-[10px] text-theme-muted font-bold uppercase tracking-wider">Berkas Laporan Terbit</span>
                <button
                  onClick={exportToCsv}
                  className="flex items-center gap-1.5 bg-status-emerald-bg hover:bg-status-emerald-bg text-theme-text text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm bg-status-emerald-bg"
                >
                  <FileSpreadsheet size={14} /> Ekspor CSV
                </button>
              </div>
            )}

            {filtered.map(doc => {
              let statusText = '';
              let statusColorClass = '';
              
              if (doc.status === 'PENDING_ADMIN') {
                statusText = 'Cek Admin';
                statusColorClass = 'bg-status-blue-bg text-status-blue-text border border-status-blue-border';
              } else if (doc.status === 'PENDING_SUPERVISOR') {
                statusText = 'Cek Supervisor';
                statusColorClass = 'bg-status-amber-bg text-status-amber-text border border-status-amber-border';
              } else if (doc.status === 'PENDING_MANAGER') {
                statusText = 'Cek Manager';
                statusColorClass = 'bg-status-orange-bg text-status-orange-text border border-status-orange-border';
              } else if (doc.status === 'APPROVED') {
                statusText = 'Disetujui / Valid';
                statusColorClass = 'bg-status-emerald-bg text-status-emerald-text border border-status-emerald-border';
              } else if (doc.status === 'REJECTED') {
                statusText = 'Ditolak';
                statusColorClass = 'bg-status-red-bg text-status-red-text border border-status-red-border';
              }

              return (
                <div key={doc.id} className="bg-theme-input border border-theme-border rounded-2xl p-5 flex flex-col gap-4 hover:border-slate-700 transition-all">
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-status-blue-bg border border-status-blue-border text-status-blue-text text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                          {doc.status === 'APPROVED' && doc.kode_lhu ? doc.kode_lhu : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen)}
                        </span>
                        {doc.komoditi && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-status-blue-bg border border-status-blue-border text-status-blue-text">{doc.komoditi}</span>
                        )}
                        {doc.departemen && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold bg-status-orange-bg border border-status-orange-border text-status-orange-text">{doc.departemen}</span>
                        )}
                        {doc.tipe_dokumen && (
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                            doc.tipe_dokumen === 'LHU' 
                              ? 'bg-status-purple-bg border-status-purple-border text-status-purple-text' 
                              : 'bg-status-teal-bg border-status-teal-border text-status-teal-text'
                          }`}>
                            {doc.tipe_dokumen}
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusColorClass}`}>
                          {statusText}
                        </span>
                        <h4 className="text-sm font-bold text-theme-text leading-tight ml-1">{doc.judul}</h4>
                      </div>
                      <div className="text-[11px] text-theme-muted mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Admin Pengunggah: <strong className="text-theme-muted">{doc.uploaded_by}</strong></span>
                        <span>Admin: <strong className="text-theme-muted">{doc.checked_by || '-'}</strong></span>
                        <span>Supervisor: <strong className="text-theme-muted">{doc.checked_supervisor_by || '-'}</strong></span>
                        <span>Manager QHSE: <strong className="text-theme-muted">{doc.approved_by || '-'}</strong></span>
                      </div>
                      {doc.catatan_admin && (
                        <div className="text-[11px] text-theme-muted bg-theme-card border border-theme-border/85 px-3 py-2 rounded-xl mt-3">
                          <strong>Catatan Admin:</strong> "{doc.catatan_admin}"
                        </div>
                      )}
                      {doc.catatan_spv && (
                        <div className="text-[11px] text-theme-muted bg-theme-card border border-theme-border/85 px-3 py-2 rounded-xl mt-2 italic">
                          <strong>Catatan Supervisor:</strong> "{doc.catatan_spv}"
                        </div>
                      )}
                      {doc.spv_checklist && doc.spv_checklist.length > 0 && (
                        <div className="text-[11px] text-theme-muted bg-theme-card border border-theme-border/85 px-3 py-2 rounded-xl mt-2">
                          <strong>Checklist Supervisor:</strong>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {doc.spv_checklist.map((item, idx) => (
                              <span key={idx} className="block text-[10px] text-theme-muted">✓ {item}</span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                    <div className="flex gap-2">
                      {doc.status === 'APPROVED' && (
                        <button
                          onClick={() => setQrModalDoc(doc)}
                          className="flex items-center gap-1.5 bg-status-blue-bg hover:bg-status-blue-bg text-theme-text font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          <QrCode size={14} /> QR Code & WhatsApp
                        </button>
                      )}
                      
                      <button 
                        onClick={() => setPreviewDoc(doc)}
                        className="flex items-center gap-1.5 bg-theme-card hover:bg-theme-hover text-theme-muted font-semibold text-xs px-3.5 py-2 rounded-xl border border-theme-border transition-all cursor-pointer"
                      >
                        <Eye size={14} /> Buka Berkas
                      </button>
                      
                      {doc.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleFollowUp(doc)}
                          className="flex items-center justify-center gap-1.5 bg-status-emerald-bg hover:bg-status-emerald-bg text-theme-text font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          <Send size={12} /> Follow Up
                        </button>
                      )}

                      {handleDeleteDoc && (
                        <button
                          onClick={() => handleDeleteDoc(doc)}
                          className="flex items-center gap-1.5 bg-status-red-bg hover:bg-status-red-bg text-status-red-text border border-status-red-border font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                          title="Hapus Dokumen secara Permanen"
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {lhuSubTab === 'pending' && doc.status === 'PENDING_MANAGER' && (
                    <div className="border-t border-theme-border pt-4 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-theme-muted">Catatan Persetujuan Manager QHSE (Opsional)</label>
                        <textarea 
                          className="w-full bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none transition-all resize-none placeholder-slate-500" 
                          placeholder="Masukkan instruksi penerbitan sertifikat atau catatan revisi..."
                          rows={2}
                          value={actionNotes[doc.id] || ''}
                          onChange={(e) => handleNoteChange(doc.id, e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button 
                          className="flex items-center gap-1.5 bg-status-red-bg hover:bg-status-red-bg text-status-red-text border border-status-red-border font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                          onClick={() => handleManagerAction(doc.id, 'reject')}
                        >
                          <XCircle size={14} /> Tolak Dokumen
                        </button>
                        <button 
                          className="btn-success flex items-center gap-1.5 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                          onClick={() => handleManagerAction(doc.id, 'approve')}
                        >
                          <CheckCircle size={14} /> Setujui & Terbitkan LHU
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </>
  );
}
