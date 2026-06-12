import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { LhuDocument } from '../../../types';
import { Button } from 'antd';

const QUICK_NOTES = [
  "Audited: Berkas sesuai standar mutu pengujian.",
  "Revisi: Kode dokumen tidak sesuai dengan format skema.",
  "Audited: Lampiran kalibrasi alat sudah diverifikasi.",
  "Revisi: Nilai ketidakpastian pengukuran tidak dicantumkan."
];

interface PendingQueueProps {
  loading: boolean;
  filteredPending: LhuDocument[];
  pendingDocs: LhuDocument[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  techFilter: string;
  setTechFilter: (val: string) => void;
  selectedDocIds: string[];
  setSelectedDocIds: (val: string[]) => void;
  checklistValues: Record<string, Record<string, boolean>>;
  handleChecklistChange: (docId: string, itemId: string, val: boolean) => void;
  areAllChecklistChecked: (doc: LhuDocument) => boolean;
  actionNotes: Record<string, string>;
  handleNoteChange: (docId: string, val: string) => void;
  handleSupervisorAction: (docId: string, action: 'approve' | 'reject') => Promise<void>;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
  calculateSla: (dateString: string) => { text: string; class: string };
  setPreviewDoc: (doc: LhuDocument) => void;
  getChecklistItemsForDoc: (doc: LhuDocument) => { id: string; label: string; }[];
}

export default function PendingQueue({
  loading,
  filteredPending,
  pendingDocs,
  searchQuery,
  setSearchQuery,
  techFilter,
  setTechFilter,
  selectedDocIds,
  setSelectedDocIds,
  checklistValues,
  handleChecklistChange,
  areAllChecklistChecked,
  actionNotes,
  handleNoteChange,
  handleSupervisorAction,
  formatLhuNumber,
  calculateSla,
  setPreviewDoc,
  getChecklistItemsForDoc
}: PendingQueueProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  return (
    <div className="bg-theme-card border border-theme-border rounded-none p-6 shadow-xl">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
        <h3 className="text-base font-bold text-theme-text flex items-center gap-2">
          <Clock size={16} className="text-status-orange-text" /> Berkas Menunggu Audit
        </h3>
        {pendingDocs.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Cari..."
              className="bg-theme-input border border-theme-border rounded-none px-3 py-1.5 text-theme-text text-xs outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="bg-theme-input border border-theme-border rounded-none px-3 py-1.5 text-theme-text text-xs outline-none cursor-pointer"
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
            >
              <option value="ALL">Semua Pengunggah</option>
              {Array.from(new Set(pendingDocs.map(d => d.uploaded_by))).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-theme-dim text-xs font-semibold animate-pulse">
          Memuat antrean berkas...
        </div>
      ) : filteredPending.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-theme-border rounded-none bg-theme-input text-theme-dim text-xs">
          Tidak ada berkas yang menunggu audit.
        </div>
      ) : (() => {
        const totalItems = filteredPending.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginated = filteredPending.slice(startIndex, startIndex + itemsPerPage);

        if (totalItems === 0) {
          return (
            <div className="text-center py-12 border border-dashed border-theme-border rounded-none bg-theme-input text-theme-dim text-xs">
              Tidak ada berkas yang menunggu audit.
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-4">
            <div className="bg-status-orange-bg border-l-2 border-status-orange-border p-3.5 text-xs text-theme-muted rounded-none flex flex-col gap-1">
              <span className="text-status-orange-text font-bold uppercase tracking-wider text-[10px]">Tips Audit Massal (Batch Audit):</span>
              <span>Anda dapat menyetujui atau menolak beberapa berkas sekaligus. Centang berkas yang diinginkan dari daftar di bawah untuk memunculkan panel tindakan massal di bagian bawah layar.</span>
            </div>

            <div className="flex items-center gap-2 pl-2 pb-2 border-b border-theme-border/60">
              <input
                type="checkbox"
                checked={selectedDocIds.length === filteredPending.length && filteredPending.length > 0}
                onChange={() => {
                  if (selectedDocIds.length === filteredPending.length) {
                    setSelectedDocIds([]);
                  } else {
                    setSelectedDocIds(filteredPending.map(d => d.id));
                  }
                }}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-theme-muted font-bold">Pilih Semua ({selectedDocIds.length} terpilih)</span>
            </div>

            {paginated.map(doc => {
            const sla = calculateSla(doc.created_at);
            return (
              <div key={doc.id} className="bg-theme-input border border-theme-border rounded-none p-5 flex flex-col gap-4 hover:border-slate-700 transition-all">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => {
                        if (selectedDocIds.includes(doc.id)) {
                          setSelectedDocIds(selectedDocIds.filter(id => id !== doc.id));
                        } else {
                          setSelectedDocIds([...selectedDocIds, doc.id]);
                        }
                      }}
                      className="w-4 h-4 mt-1 cursor-pointer shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-status-orange-bg border border-status-orange-border text-status-orange-text text-xs font-mono font-bold px-2 py-0.5 rounded-none">
                          {doc.status === 'APPROVED' && doc.kode_lhu ? doc.kode_lhu : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen)}
                        </span>
                        {doc.komoditi && (
                          <span className="inline-flex px-2 py-0.5 rounded-none text-[10px] font-bold bg-status-blue-bg border border-status-blue-border text-status-blue-text">{doc.komoditi}</span>
                        )}
                        {doc.departemen && (
                          <span className="inline-flex px-2 py-0.5 rounded-none text-[10px] font-bold bg-status-orange-bg border border-status-orange-border text-status-orange-text">{doc.departemen}</span>
                        )}
                        {doc.tipe_dokumen && (
                          <span className={`inline-flex px-2 py-0.5 rounded-none text-[10px] font-bold border ${
                            doc.tipe_dokumen === 'LHU' 
                              ? 'bg-status-purple-bg border-status-purple-border text-status-purple-text' 
                              : 'bg-status-teal-bg border-status-teal-border text-status-teal-text'
                          }`}>
                            {doc.tipe_dokumen}
                          </span>
                        )}
                        <h4 className="text-base font-bold text-theme-text ml-1">{doc.judul}</h4>
                      </div>
                      <div className="text-xs text-theme-muted mt-1.5">
                        Diajukan oleh: <strong className="text-theme-muted">{doc.uploaded_by}</strong> | Diperiksa Admin: <strong className="text-status-blue-text">{doc.checked_by || '-'}</strong>
                      </div>
                      {doc.catatan_admin && (
                        <div className="text-[11px] text-theme-muted mt-1 bg-status-blue-bg border border-status-blue-border p-2 rounded-none italic">
                          Catatan Admin: &ldquo;{doc.catatan_admin}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="bg-theme-card hover:bg-theme-hover border border-theme-border px-3 py-1.5 rounded-none text-xs text-theme-muted cursor-pointer"
                    >
                      Tinjau Berkas
                    </button>
                  </div>
                </div>

                <div className="border-t border-theme-border pt-4 flex flex-col gap-3">
                  <div className="bg-theme-card border border-theme-border p-4 rounded-none flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-status-orange-text flex items-center gap-1">
                      📋 Checklist Wajib Verifikasi Supervisor (SOP 7)
                    </span>
                    <div className="flex flex-col gap-2 mt-1">
                      {getChecklistItemsForDoc(doc).map(item => {
                        const isChecked = !!(checklistValues[doc.id] && checklistValues[doc.id][item.id]);
                        return (
                          <label key={item.id} className="flex items-center gap-2.5 text-xs text-theme-muted hover:text-theme-muted cursor-pointer select-none">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleChecklistChange(doc.id, item.id, e.target.checked)}
                              className="w-4 h-4 rounded-none border-theme-border text-status-orange-text focus:ring-orange-500/20 bg-theme-input cursor-pointer"
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {!areAllChecklistChecked(doc) && (
                      <span className="text-[10px] text-status-amber-text font-semibold italic mt-1">
                        ⚠️ Seluruh checklist di atas wajib dicentang sebelum menyetujui berkas.
                      </span>
                    )}
                  </div>

                  <label className="text-xs font-semibold text-theme-muted">Catatan Audit Supervisor</label>
                  <textarea
                    className="w-full bg-theme-card border border-theme-border focus:border-status-blue-border rounded-none px-4 py-2.5 text-theme-text text-xs outline-none resize-none"
                    placeholder="Masukkan hasil audit atau rekomendasi perbaikan..."
                    rows={2}
                    value={actionNotes[doc.id] || ''}
                    onChange={(e) => handleNoteChange(doc.id, e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_NOTES.map((qn, idx) => (
                      <Button
                        key={idx}
                        size="small"
                        onClick={() => handleNoteChange(doc.id, qn)}
                        className="text-[10px] rounded-none"
                      >
                        + {qn.replace(/\.$/, '')}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end mt-2">
                    <Button
                      danger
                      onClick={() => handleSupervisorAction(doc.id, 'reject')}
                      className="rounded-none"
                    >
                      Tolak Dokumen
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => handleSupervisorAction(doc.id, 'approve')}
                      disabled={!areAllChecklistChecked(doc)}
                      className="font-bold rounded-none"
                    >
                      Setujui Audit
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-theme-border pt-5 mt-5">
              <span className="text-xs text-theme-dim">
                Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} berkas
              </span>
              <div className="flex gap-2">
                <Button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-none"
                >
                  Sebelumnya
                </Button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <Button
                      key={p}
                      type={currentPage === p ? 'primary' : 'default'}
                      onClick={() => {
                        setCurrentPage(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-7 h-7 flex items-center justify-center p-0 font-bold rounded-none"
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                <Button
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-none"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    })()}
    </div>
  );
}
