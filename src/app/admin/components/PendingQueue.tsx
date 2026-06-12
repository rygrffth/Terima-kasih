import React, { useState, useEffect } from 'react';
import { Clock, FileCheck, Calendar, ArrowUpDown, Eye, Download, AlertCircle, XCircle, CheckCircle } from 'lucide-react';
import { LhuDocument } from '../../../types';
import { supabase } from '../../../lib/supabase';

function PendingQueueChecklist({ doc }: { doc: any }) {
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchChecklistTemplate = async () => {
      const defaultItems = [
        "Kesesuaian Identitas & ID Sampel dengan berkas fisik",
        "Metode pengujian RF sesuai standar frekuensi SDPPI",
        "Nilai daya pancar & gain antena tercantum lengkap",
        "Tidak ada kesalahan pengetikan",
        "Format dokumen sesuai"
      ];

      try {
        if (!doc.komoditi) {
          if (active) {
            setChecklistItems(defaultItems);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('lhu_checklist_templates')
          .select('checklist_items')
          .eq('komoditi', doc.komoditi)
          .single();

        if (active) {
          if (!error && data && data.checklist_items && data.checklist_items.length > 0) {
            setChecklistItems(data.checklist_items);
          } else {
            setChecklistItems(defaultItems);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Gagal mengambil template checklist di queue:', err);
        if (active) {
          setChecklistItems(defaultItems);
          setLoading(false);
        }
      }
    };

    fetchChecklistTemplate();
    return () => {
      active = false;
    };
  }, [doc.komoditi]);

  if (loading) {
    return <div className="text-[11px] text-theme-muted mt-2.5 pt-2 border-t border-status-red-border/35 animate-pulse">Memuat checklist...</div>;
  }

  if (checklistItems.length === 0) return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-status-red-border/30">
      <span className="font-bold text-[10px] text-theme-muted uppercase block mb-1">Checklist Audit:</span>
      <div className="flex flex-col gap-1 text-[11px]">
        {checklistItems.map((item, idx) => {
          const isChecked = doc.spv_checklist?.includes(item);
          return (
            <span 
              key={idx} 
              className={`flex items-center gap-1.5 font-medium ${
                isChecked ? 'text-status-emerald-text' : 'text-status-red-text'
              }`}
            >
              <span>{isChecked ? '✓' : '✗'}</span>
              <span>{item}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

const QUICK_NOTES = [
  "Berkas sudah lengkap dan terisi seluruh kolom pemeriksaan fisik.",
  "Kurang tanda tangan basah pada lembar pengesahan.",
  "Data hasil uji tidak terbaca dengan jelas.",
  "Revisi nomor LHU agar disesuaikan dengan log buku induk.",
  "Lampiran penunjang belum terunggah."
];

interface PendingQueueProps {
  pendingDocs: LhuDocument[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  techFilter: string;
  setTechFilter: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  sortOrder: string;
  setSortOrder: (val: string) => void;
  selectedDocIds: string[];
  setSelectedDocIds: (ids: string[]) => void;
  actionNotes: { [key: string]: string };
  handleNoteChange: (id: string, note: string) => void;
  handleAdminAction: (id: string, action: 'approve') => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
  calculateSla: (createdAt: string) => { text: string; class: string };
  setPreviewDoc: (doc: LhuDocument) => void;
  getDownloadUrl: (filePath: string) => string;
  setResubmitDoc?: (doc: LhuDocument) => void;
}

export default function PendingQueue({
  pendingDocs,
  loading,
  searchQuery,
  setSearchQuery,
  techFilter,
  setTechFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  sortOrder,
  setSortOrder,
  selectedDocIds,
  setSelectedDocIds,
  actionNotes,
  handleNoteChange,
  handleAdminAction,
  formatLhuNumber,
  calculateSla,
  setPreviewDoc,
  getDownloadUrl,
  setResubmitDoc
}: PendingQueueProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSelectAll = (filtered: LhuDocument[]) => {
    if (selectedDocIds.length === filtered.length && filtered.length > 0) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filtered.map(d => d.id));
    }
  };

  const toggleSelectDoc = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter(x => x !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  return (
    <>
      <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text mb-2">
        <Clock size={18} className="text-status-orange-text" /> Antrean Revisi Berkas
      </h3>
      <p className="text-xs text-theme-muted mb-6">
        Berikut adalah berkas LHU yang dikembalikan oleh Supervisor untuk diperbaiki/direvisi.
      </p>

      {pendingDocs.length > 0 && (
        <div className="flex flex-col gap-3 mb-6 bg-theme-input p-4 border border-theme-border/85 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              placeholder="Cari berdasarkan judul, nomor LHU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
            />
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
            >
              <option value="ALL">Semua Pengunggah</option>
              {Array.from(new Set(pendingDocs.map(d => d.uploaded_by))).sort().map(tech => (
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
                <option value="newest">Terbaru Diunggah</option>
                <option value="oldest">Terlama Diunggah</option>
                <option value="lhu_desc">Nomor LHU Terbesar</option>
                <option value="lhu_asc">Nomor LHU Terkecil</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-theme-dim text-xs font-semibold animate-pulse">
          Memuat antrean berkas...
        </div>
      ) : pendingDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-theme-border rounded-2xl text-theme-dim bg-theme-input">
          <FileCheck size={40} className="mb-2 text-theme-muted" />
          <p className="text-xs">Tidak ada dokumen LHU yang menunggu pemeriksaan.</p>
        </div>
      ) : (() => {
        let filtered = pendingDocs.filter(doc => {
          if (!doc) return false;
          const docNumStr = doc.kode_lhu || `LHU-${String(doc.nomor_lhu || '').padStart(3, '0')}`;
          const matchSearch = 
            (doc.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.uploaded_by || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            docNumStr.toLowerCase().includes(searchQuery.toLowerCase());
          const matchTech = techFilter === 'ALL' || doc.uploaded_by === techFilter;
          
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
          return matchSearch && matchTech && matchDate;
        });

        filtered = [...filtered].sort((a, b) => {
          if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
              <p className="text-xs">Tidak ada dokumen yang cocok dengan kriteria pencarian.</p>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-4">
            <div className="bg-status-blue-bg border-l-2 border-status-blue-border p-3.5 text-xs text-theme-muted rounded-none flex flex-col gap-1">
              <span className="text-status-blue-text font-bold uppercase tracking-wider text-[10px]">Tips Verifikasi Massal (Batch Verification):</span>
              <span>Anda dapat menyetujui atau menolak beberapa berkas sekaligus. Centang berkas yang diinginkan dari daftar di bawah untuk memunculkan panel tindakan massal di bagian bawah layar.</span>
            </div>

            <div className="flex items-center gap-2 pl-2 pb-2 border-b border-theme-border/60">
              <input 
                type="checkbox"
                checked={selectedDocIds.length === filtered.length && filtered.length > 0}
                onChange={() => handleSelectAll(filtered)}
                className="w-4 h-4 rounded-none border-theme-border text-status-blue-text focus:ring-blue-500 bg-theme-input cursor-pointer"
                id="select-all-checkbox"
              />
              <label htmlFor="select-all-checkbox" className="text-xs font-bold text-theme-muted cursor-pointer select-none">
                Pilih Semua Berkas di Halaman Ini ({selectedDocIds.length} Terpilih)
              </label>
            </div>

            {paginated.map(doc => {
              const sla = calculateSla(doc.created_at);
              const isWarning = sla.class === 'warning';
              const isDanger = sla.class === 'danger';

              return (
                <div key={doc.id} className="bg-theme-input border border-theme-border rounded-none p-5 flex flex-col gap-4 hover:border-slate-700 transition-all">
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleSelectDoc(doc.id)}
                        className="w-4 h-4 mt-1 rounded-none border-theme-border text-status-blue-text focus:ring-blue-500 bg-theme-input cursor-pointer shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-status-blue-bg border border-status-blue-border text-status-blue-text text-xs font-mono font-bold px-2 py-0.5 rounded-none">
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
                          Diunggah oleh: <strong className="text-theme-muted">{doc.uploaded_by}</strong> | Tanggal: {new Date(doc.created_at).toLocaleString('id-ID')}
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-theme-dim">
                          <Clock size={12} className="text-theme-dim" />
                          <span className={`${
                            isDanger ? 'text-status-red-text font-semibold animate-pulse' : 
                            isWarning ? 'text-status-orange-text font-semibold' : 'text-theme-dim'
                          }`}>
                            {sla.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPreviewDoc(doc)}
                        className="flex items-center gap-1.5 bg-theme-card hover:bg-theme-hover text-theme-muted font-semibold text-xs px-3.5 py-2 rounded-none border border-theme-border transition-all cursor-pointer"
                      >
                        <Eye size={14} /> Baca Berkas
                      </button>
                      <a 
                        href={getDownloadUrl(doc.file_path)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-1.5 bg-theme-card hover:bg-theme-hover text-theme-muted font-semibold text-xs px-3.5 py-2 rounded-none border border-theme-border transition-all cursor-pointer"
                      >
                        <Download size={14} /> Unduh
                      </a>
                    </div>
                  </div>

                  {doc.catatan_spv && (
                    <div className="bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-3.5 py-2.5 rounded-none flex items-start gap-2.5 mt-1">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div className="w-full">
                        <span className="font-bold">⚠️ Catatan Revisi dari Supervisor ({doc.checked_supervisor_by || 'Supervisor'})</span>
                        <p className="mt-0.5 text-[11px] text-theme-muted leading-relaxed">
                          Harap perbaiki berkas sesuai catatan berikut: <strong className="text-status-red-text font-semibold">"{doc.catatan_spv}"</strong>
                        </p>
                        {doc.annotated_file_path && (
                          <div className="mt-2 mb-1">
                            <a 
                              href={getDownloadUrl(doc.annotated_file_path)} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 bg-status-red-bg hover:bg-red-500 border border-status-red-border text-status-red-text hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                            >
                              📝 Lihat Gambar Coretan Revisi
                            </a>
                          </div>
                        )}
                        <PendingQueueChecklist doc={doc} />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-theme-border pt-4 flex gap-2 justify-end">
                    {setResubmitDoc ? (
                      <button 
                        className="btn-primary flex items-center gap-1.5 font-semibold text-xs px-4 py-2.5 transition-all cursor-pointer"
                        onClick={() => setResubmitDoc(doc)}
                      >
                        <CheckCircle size={14} /> 📝 Perbaiki & Ajukan Ulang Ke Supervisor
                      </button>
                    ) : (
                      <button 
                        className="flex items-center gap-1.5 bg-status-blue-bg hover:bg-status-blue-bg text-theme-text font-semibold text-xs px-4 py-2 rounded-none transition-all cursor-pointer"
                        onClick={() => handleAdminAction(doc.id, 'approve')}
                      >
                        <CheckCircle size={14} /> Selesai Cek, Ajukan ke Supervisor
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

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
                    className="px-3 py-1.5 bg-theme-card border border-theme-border hover:border-slate-705 text-theme-muted disabled:opacity-40 disabled:hover:border-theme-border rounded-none text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed"
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
                        className={`w-7 h-7 flex items-center justify-center rounded-none text-xs font-bold transition-all cursor-pointer ${
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
                    className="px-3 py-1.5 bg-theme-card border border-theme-border hover:border-slate-705 text-theme-muted disabled:opacity-40 disabled:hover:border-theme-border rounded-none text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
