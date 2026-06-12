import React, { useState } from 'react';
import { FileCheck, QrCode, Eye } from 'lucide-react';
import { LhuDocument } from '../../../types';
import QrDocumentModal from '../../../components/QrDocumentModal';

interface HistoryListProps {
  loading: boolean;
  filteredHistory: LhuDocument[];
  historyDocs: LhuDocument[];
  historySearchQuery: string;
  setHistorySearchQuery: (val: string) => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
  setPreviewDoc: (doc: LhuDocument) => void;
}

export default function HistoryList({
  loading,
  filteredHistory,
  historyDocs,
  historySearchQuery,
  setHistorySearchQuery,
  formatLhuNumber,
  renderStatusBadge,
  setPreviewDoc
}: HistoryListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [qrDoc, setQrDoc] = useState<LhuDocument | null>(null);

  const totalItems = filteredHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
        <h3 className="text-base font-bold text-theme-text flex items-center gap-2">
          <FileCheck size={16} className="text-status-emerald-text" /> Riwayat Audit Saya
        </h3>
        {historyDocs.length > 0 && (
          <input
            type="text"
            placeholder="Cari riwayat..."
            className="bg-theme-input border border-theme-border rounded-xl px-3 py-1.5 text-theme-text text-xs outline-none"
            value={historySearchQuery}
            onChange={(e) => setHistorySearchQuery(e.target.value)}
          />
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-theme-dim text-xs font-semibold animate-pulse">
          Memuat riwayat...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-theme-border rounded-2xl bg-theme-input text-theme-dim text-xs">
          Anda belum pernah menyelesaikan audit berkas.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {paginated.map(doc => (
            <div key={doc.id} className="bg-theme-input border border-theme-border rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-status-orange-bg border border-status-orange-border text-status-orange-text text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                      {doc.status === 'APPROVED' && doc.kode_lhu ? doc.kode_lhu : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen)}
                    </span>
                    {doc.komoditi && (
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-status-blue-bg border border-status-blue-border text-status-blue-text">{doc.komoditi}</span>
                    )}
                    {doc.departemen && (
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-status-orange-bg border border-status-orange-border text-status-orange-text">{doc.departemen}</span>
                    )}
                    {doc.tipe_dokumen && (
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                        doc.tipe_dokumen === 'LHU' 
                          ? 'bg-status-purple-bg border-status-purple-border text-status-purple-text' 
                          : 'bg-status-teal-bg border-status-teal-border text-status-teal-text'
                      }`}>{doc.tipe_dokumen}</span>
                    )}
                    <h4 className="text-sm font-bold text-theme-text">{doc.judul}</h4>
                    {renderStatusBadge(doc.status)}
                  </div>
                  <div className="text-[11px] text-theme-muted mt-2">
                    Pengunggah: <strong className="text-theme-muted">{doc.uploaded_by}</strong> | Diperiksa SPV: <strong className="text-status-blue-text">{doc.checked_supervisor_by || '-'}</strong> | Diaudit: {new Date(doc.updated_at).toLocaleString('id-ID')}
                  </div>
                  {doc.catatan_spv && (
                    <div className="text-[11px] text-theme-muted mt-2 italic bg-theme-card border border-theme-border p-2.5 rounded-lg">
                      Catatan Audit Anda: "{doc.catatan_spv}"
                    </div>
                  )}
                  {doc.spv_checklist && doc.spv_checklist.length > 0 && (
                    <div className="text-[10px] text-theme-muted mt-2 bg-theme-card border border-theme-border p-2.5 rounded-lg">
                      <span className="font-semibold text-theme-muted block mb-1">Checklist Audit Anda:</span>
                      <div className="flex flex-col gap-0.5">
                        {doc.spv_checklist.map((item, idx) => (
                          <span key={idx} className="block truncate text-[9px]">✓ {item}</span>
                        ))}
                      </div>
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
            <div className="flex items-center justify-between border-t border-theme-border pt-5 mt-5">
              <span className="text-xs text-theme-muted">
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
                          ? 'btn-primary shadow-md'
                          : 'bg-theme-card border border-theme-border text-theme-muted hover:text-theme-text'
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
      )}

      {qrDoc && (
        <QrDocumentModal
          document={qrDoc}
          onClose={() => setQrDoc(null)}
          formatLhuNumber={formatLhuNumber}
        />
      )}
    </div>
  );
}
