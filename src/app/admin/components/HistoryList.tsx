import React, { useState } from 'react';
import { FileCheck, Calendar, ArrowUpDown, Eye, QrCode } from 'lucide-react';
import { LhuDocument } from '../../../types';
import QrDocumentModal from '../../../components/QrDocumentModal';

interface HistoryListProps {
  historyDocs: LhuDocument[];
  historySearchQuery: string;
  setHistorySearchQuery: (val: string) => void;
  historyTechFilter: string;
  setHistoryTechFilter: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  sortOrder: string;
  setSortOrder: (val: string) => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
  setPreviewDoc: (doc: LhuDocument) => void;
}

export default function HistoryList({
  historyDocs,
  historySearchQuery,
  setHistorySearchQuery,
  historyTechFilter,
  setHistoryTechFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  sortOrder,
  setSortOrder,
  formatLhuNumber,
  renderStatusBadge,
  setPreviewDoc
}: HistoryListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [qrDoc, setQrDoc] = useState<LhuDocument | null>(null);

  return (
    <>
      <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text mb-2">
        <FileCheck size={18} className="text-status-emerald-text animate-pulse" /> Riwayat Pemeriksaan Admin
      </h3>
      <p className="text-xs text-theme-muted mb-6">
        Daftar seluruh dokumen LHU yang sudah pernah Anda periksa dan berikan verifikasi sebelumnya.
      </p>

      {historyDocs.length > 0 && (
        <div className="flex flex-col gap-3 mb-6 bg-theme-input p-4 border border-theme-border rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              placeholder="Cari berdasarkan judul, nomor LHU..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="flex-1 bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
            />
            <select
              value={historyTechFilter}
              onChange={(e) => setHistoryTechFilter(e.target.value)}
              className="bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
            >
              <option value="ALL">Semua Pengunggah</option>
              {Array.from(new Set(historyDocs.map(d => d.uploaded_by))).sort().map(tech => (
                <option key={tech} value={tech}>{tech}</option>
              ))}
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
      )}

      {historyDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-theme-border rounded-2xl text-theme-dim bg-theme-input">
          <FileCheck size={40} className="mb-2 text-theme-muted" />
          <p className="text-xs">Anda belum pernah menyelesaikan pemeriksaan berkas LHU.</p>
        </div>
      ) : (() => {
        let filtered = historyDocs.filter(doc => {
          if (!doc) return false;
          const docNumStr = doc.kode_lhu || `LHU-${String(doc.nomor_lhu || '').padStart(3, '0')}`;
          const matchSearch = 
            (doc.judul || '').toLowerCase().includes(historySearchQuery.toLowerCase()) ||
            (doc.uploaded_by || '').toLowerCase().includes(historySearchQuery.toLowerCase()) ||
            docNumStr.toLowerCase().includes(historySearchQuery.toLowerCase());
          const matchTech = historyTechFilter === 'ALL' || doc.uploaded_by === historyTechFilter;
          
          let matchDate = true;
          if (startDate) {
            const start = new Date(startDate).getTime();
            const docTime = new Date(doc.updated_at).getTime();
            matchDate = matchDate && docTime >= start;
          }
          if (endDate) {
            const end = new Date(endDate).getTime() + 86400000;
            const docTime = new Date(doc.updated_at).getTime();
            matchDate = matchDate && docTime <= end;
          }
          return matchSearch && matchTech && matchDate;
        });

        filtered = [...filtered].sort((a, b) => {
          if (sortOrder === 'newest') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          if (sortOrder === 'oldest') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          if (sortOrder === 'lhu_desc') return b.nomor_lhu - a.nomor_lhu;
          if (sortOrder === 'lhu_asc') return a.nomor_lhu - b.nomor_lhu;
          return 0;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

        if (filtered.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-theme-border rounded-2xl text-theme-dim bg-theme-input">
              <p className="text-xs">Tidak ada riwayat berkas yang cocok dengan kriteria pencarian.</p>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-4">
            {paginated.map(doc => (
              <div key={doc.id} className="bg-theme-input border border-theme-border rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-status-blue-bg border border-status-blue-border text-status-blue-text text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                        {doc.status === 'APPROVED' && doc.kode_lhu ? doc.kode_lhu : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen)}
                      </span>
                      {doc.komoditi && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-blue-bg border border-status-blue-border text-status-blue-text">{doc.komoditi}</span>
                      )}
                      {doc.departemen && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-orange-bg border border-status-orange-border text-status-orange-text">{doc.departemen}</span>
                      )}
                      {doc.tipe_dokumen && (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          doc.tipe_dokumen === 'LHU' 
                            ? 'bg-status-purple-bg border-status-purple-border text-status-purple-text' 
                            : 'bg-status-teal-bg border-status-teal-border text-status-teal-text'
                        }`}>
                          {doc.tipe_dokumen}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-theme-text ml-1">{doc.judul}</h4>
                      {renderStatusBadge(doc.status)}
                    </div>
                    <div className="text-[11px] text-theme-muted mt-2">
                      Pengunggah: <strong className="text-theme-muted">{doc.uploaded_by}</strong> | Diperiksa: {new Date(doc.updated_at).toLocaleString('id-ID')}
                    </div>
                    {doc.catatan_admin && (
                      <div className="text-[11px] text-theme-muted mt-2 italic bg-theme-card border border-theme-border p-2.5 rounded-lg">
                        Catatan Anda: "{doc.catatan_admin}"
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(doc.kode_lhu || doc.kode_sertifikat || doc.status === 'APPROVED') && (
                      <button
                        onClick={() => setQrDoc(doc)}
                        className="bg-theme-card hover:bg-theme-hover border border-theme-border/80 px-4 py-2 text-xs font-bold text-theme-text rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        title="Lihat QR Verifikasi"
                      >
                        <QrCode size={13} className="text-status-blue-text" /> QR
                      </button>
                    )}
                    <button 
                      onClick={() => setPreviewDoc(doc)}
                      className="bg-theme-card hover:bg-theme-hover border border-theme-border/80 px-4 py-2 text-xs font-bold text-theme-text rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <Eye size={13} className="text-status-emerald-text" /> Lihat Berkas
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-theme-border pt-4 mt-2">
                <span className="text-xs text-theme-dim">
                  Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} berkas
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 bg-theme-card border border-theme-border hover:border-slate-705 text-theme-muted disabled:opacity-40 disabled:hover:border-theme-border rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setCurrentPage(p);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === p
                            ? 'bg-status-blue-bg text-theme-text shadow-md shadow-blue-500/20'
                            : 'bg-theme-card border border-theme-border text-theme-muted hover:text-theme-muted'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 bg-theme-card border border-theme-border hover:border-slate-705 text-theme-muted disabled:opacity-40 disabled:hover:border-theme-border rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {qrDoc && (
        <QrDocumentModal
          document={qrDoc}
          onClose={() => setQrDoc(null)}
          formatLhuNumber={formatLhuNumber}
        />
      )}
    </>
  );
}
