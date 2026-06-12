import React from 'react';
import { History, Calendar, ArrowUpDown, Copy } from 'lucide-react';
import { LhuDocument } from '../../../types';

interface HistoryListProps {
  historyDocs: LhuDocument[];
  loadingHistory: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  sortOrder: string;
  setSortOrder: (val: string) => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
  isDocSlaOverdue: (createdAt: string) => boolean;
  handleDuplicate: (title: string) => void;
  setTrackingDoc: (doc: LhuDocument) => void;
  setResubmitDoc: (doc: LhuDocument) => void;
  getDownloadUrl: (filePath: string) => string;
}

export default function AdminUploadHistoryList({
  historyDocs,
  loadingHistory,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  sortOrder,
  setSortOrder,
  formatLhuNumber,
  renderStatusBadge,
  isDocSlaOverdue,
  handleDuplicate,
  setTrackingDoc,
  setResubmitDoc,
  getDownloadUrl
}: HistoryListProps) {
  const filteredDocs = historyDocs
    .filter((doc) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        doc.judul.toLowerCase().includes(searchLower) ||
        formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen).toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'REJECTED'
          ? (doc.status === 'REJECTED' || (doc.status === 'PENDING_ADMIN' && doc.catatan_spv))
          : (statusFilter === 'PENDING_ADMIN'
            ? (doc.status === 'PENDING_ADMIN' && !doc.catatan_spv)
            : doc.status === statusFilter));

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && new Date(doc.created_at) >= new Date(startDate);
      }
      if (endDate) {
        matchesDate = matchesDate && new Date(doc.created_at) <= new Date(endDate + 'T23:59:59');
      }

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  return (
    <div className="lg:col-span-7 bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
      <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text mb-2">
        <History size={18} className="text-status-orange-text animate-pulse" /> Riwayat Pengajuan Saya
      </h3>
      <p className="text-xs text-theme-muted mb-6">
        Daftar seluruh dokumen LHU yang pernah Anda ajukan beserta perkembangannya.
      </p>

      {historyDocs.length > 0 && (
        <div className="flex flex-col gap-3 mb-5 bg-theme-input p-4 border border-theme-border/85 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              placeholder="Cari LHU berdasarkan judul/nomor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING_ADMIN">Menunggu Admin</option>
              <option value="PENDING_SUPERVISOR">Menunggu Supervisor</option>
              <option value="PENDING_NUMBERING">Menunggu Penomoran</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
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
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center justify-center gap-2 bg-theme-card hover:bg-theme-hover border border-theme-border hover:border-slate-700 rounded-xl px-4 py-2 text-theme-muted hover:text-theme-text text-xs font-semibold transition-all cursor-pointer"
            >
              <ArrowUpDown size={14} />
              Urutkan: {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
            </button>
          </div>
        </div>
      )}

      {loadingHistory ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-status-orange-border border-t-orange-500 rounded-full animate-spin"></div>
          <span className="text-xs text-theme-muted">Memuat riwayat pengajuan...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-theme-input border border-theme-border rounded-2xl">
          <span className="text-theme-dim text-xs">Tidak ada dokumen LHU yang cocok dengan filter.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredDocs.map((doc) => {
            const isOverdue = doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && isDocSlaOverdue(doc.created_at);
            return (
              <div 
                key={doc.id}
                onClick={() => setTrackingDoc(doc)}
                className={`bg-theme-input hover:bg-theme-input border ${
                  isOverdue 
                    ? 'border-status-red-border hover:border-status-red-border' 
                    : 'border-theme-border hover:border-theme-border'
                } rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center cursor-pointer transition-all duration-200 group`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-theme-text font-mono bg-theme-input px-2 py-0.5 border border-theme-border">
                      {formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen)}
                    </span>
                    {renderStatusBadge(doc.status)}
                    {isOverdue && (
                      <span className="text-[10px] font-bold bg-status-red-bg text-status-red-text border border-status-red-border px-2 py-0.5 animate-pulse">
                        MELEWATI SLA (2 HARI)
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-theme-muted group-hover:text-theme-text transition-colors line-clamp-2">
                    {doc.judul}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] text-theme-dim">
                    <span>Dibuat: {new Date(doc.created_at).toLocaleDateString('id-ID')}</span>
                    {doc.departemen && (
                      <span>&bull; Jenis Dokumen: {doc.departemen}</span>
                    )}
                  </div>
                  {doc.checked_supervisor_by && (
                    <div className="mt-2 text-[10px] bg-theme-input border border-theme-border p-2 rounded-lg text-theme-muted max-w-md">
                      <div className="flex justify-between font-bold text-theme-muted">
                        <span>Supervisor: {doc.checked_supervisor_by}</span>
                      </div>
                      {doc.catatan_spv && (
                        <div className="mt-1">
                          <p className="italic text-theme-muted">
                            💬 "{doc.catatan_spv}"
                          </p>
                          {doc.annotated_file_path && (
                            <a 
                              href={getDownloadUrl(doc.annotated_file_path)} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 bg-status-red-bg hover:bg-red-500 border border-status-red-border text-status-red-text hover:text-white mt-2 px-2 py-1 rounded text-[9px] font-bold uppercase transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              📝 Lihat Gambar Coretan Revisi
                            </a>
                          )}
                        </div>
                      )}
                      {doc.spv_checklist && doc.spv_checklist.length > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5 border-t border-theme-border pt-1">
                          <span className="font-semibold text-theme-muted block mb-0.5">Checklist Audit:</span>
                          <div className="flex flex-col gap-0.5 text-theme-muted">
                            {doc.spv_checklist.map((item, idx) => (
                              <span key={idx} className="block truncate text-[9px]">✓ {item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                <div className="flex gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDuplicate(doc.judul)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-theme-card hover:bg-theme-hover border border-theme-border text-theme-muted hover:text-theme-text text-[10px] font-bold px-3 py-2 rounded-lg transition-all cursor-pointer"
                    title="Duplikat pengajuan"
                  >
                    <Copy size={12} /> Duplikat
                  </button>
                  {(doc.status === 'REJECTED' || (doc.status === 'PENDING_ADMIN' && doc.catatan_spv)) && (
                    <button
                      onClick={() => setResubmitDoc(doc)}
                      className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-[10px] font-bold px-3.5 py-2 rounded-lg cursor-pointer"
                    >
                      Ajukan Ulang
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
