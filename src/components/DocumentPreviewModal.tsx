"use client";

import React, { useEffect, useState } from 'react';
import { LhuDocument, LhuAttachment } from '../types';
import { X, Download, FileText, User, Calendar, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DocumentPreviewModalProps {
  document: LhuDocument;
  onClose: () => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
  getDownloadUrl: (filePath: string) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
  onAnnotateClick?: () => void;
}

export default function DocumentPreviewModal({
  document,
  onClose,
  formatLhuNumber,
  getDownloadUrl,
  renderStatusBadge,
  onAnnotateClick
}: DocumentPreviewModalProps) {
  const [attachments, setAttachments] = useState<LhuAttachment[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [showAnnotated, setShowAnnotated] = useState(!!document.annotated_file_path);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const { data, error } = await supabase
          .from('lhu_attachments')
          .select('*')
          .eq('doc_id', document.id);
        if (!error && data) {
          setAttachments(data);
        }
      } catch (err) {
        console.error('Gagal mengambil lampiran:', err);
      }
    };
    fetchAttachments();
  }, [document.id]);

  useEffect(() => {
    const fetchChecklistTemplate = async () => {
      const defaultItems = [
        'Kesesuaian Identitas & ID Sampel dengan berkas fisik',
        'Metode pengujian sesuai dengan standar akreditasi KAN',
        'Nilai hasil pengujian & ketidakpastian tercantum lengkap',
        'Tanda tangan verifikasi pengaju lengkap'
      ];
      
      if (!document.komoditi) {
        setChecklistItems(defaultItems);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('lhu_checklist_templates')
          .select('checklist_items')
          .eq('komoditi', document.komoditi)
          .single();
          
        if (!error && data && data.checklist_items && data.checklist_items.length > 0) {
          setChecklistItems(data.checklist_items);
        } else {
          setChecklistItems(defaultItems);
        }
      } catch (err) {
        console.error('Gagal mengambil template checklist:', err);
        setChecklistItems(defaultItems);
      }
    };
    fetchChecklistTemplate();
  }, [document.komoditi]);

  const fileUrl = getDownloadUrl(document.file_path);
  const isPdf = (document.file_path || '').toLowerCase().endsWith('.pdf') || (document.file_path || '').startsWith('fallback_path/');

  const previousFileUrl = document.previous_file_path ? getDownloadUrl(document.previous_file_path) : null;
  const isPreviousPdf = (document.previous_file_path || '').toLowerCase().endsWith('.pdf') || (document.previous_file_path || '').startsWith('fallback_path/');

  const annotatedFileUrl = document.annotated_file_path ? getDownloadUrl(document.annotated_file_path) : null;

  const getAttachmentUrl = (path: string) => {
    return getDownloadUrl(path);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-theme-base/60 backdrop-blur-sm animate-fade-in text-theme-text">
      <div className="bg-theme-card border border-theme-border rounded-none w-full max-w-[95vw] h-[92vh] flex flex-col p-6 shadow-2xl relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-theme-dim hover:text-theme-muted transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <header className="mb-4 pr-10">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="bg-status-blue-bg border border-status-blue-border text-status-blue-text font-mono font-bold text-xs px-2.5 py-0.5 rounded-none">
              {document.status === 'APPROVED' && document.kode_lhu ? document.kode_lhu : formatLhuNumber(document.nomor_lhu, document.tipe_dokumen)}
            </span>
            {document.komoditi && (
              <span className="inline-flex px-2 py-0.5 rounded-none text-[10px] font-bold bg-status-blue-bg border border-status-blue-border text-status-blue-text">{document.komoditi}</span>
            )}
            {document.departemen && (
              <span className="inline-flex px-2 py-0.5 rounded-none text-[10px] font-bold bg-status-orange-bg border border-status-orange-border text-status-orange-text">{document.departemen}</span>
            )}
            {renderStatusBadge(document.status)}
          </div>
          <h3 className="text-lg font-bold text-theme-text truncate">{document.judul}</h3>
          <div className="mt-2 flex items-center gap-2">
            {document.previous_file_path && (
              <button
                onClick={() => {
                  const newComparing = !isComparing;
                  setIsComparing(newComparing);
                  if (newComparing) {
                    setShowAnnotated(false);
                  }
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isComparing 
                    ? 'bg-status-blue-bg border-status-blue-border text-status-blue-text' 
                    : 'bg-theme-card border-theme-border text-theme-dim hover:text-theme-muted'
                }`}
              >
                {isComparing ? 'Tutup Perbandingan Versi' : 'Bandingkan dengan Versi Lama'}
              </button>
            )}

            {onAnnotateClick && isPdf && (
              <button
                onClick={onAnnotateClick}
                className="bg-status-red-bg border border-status-red-border text-status-red-text hover:bg-red-500 hover:text-white transition-all text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                📝 Beri Coretan Revisi
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-y-auto md:overflow-hidden">
          <div className="flex-[4] min-h-[300px] md:min-h-0 bg-theme-input border border-theme-border rounded-none overflow-hidden relative flex flex-col">
            {annotatedFileUrl && (
              <div className="bg-theme-card border-b border-theme-border p-2 flex gap-2 justify-center shrink-0">
                <button
                  onClick={() => {
                    setShowAnnotated(true);
                    setIsComparing(false);
                  }}
                  className={`text-[10px] font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    showAnnotated 
                      ? 'bg-status-red-bg border-status-red-border text-status-red-text' 
                      : 'bg-theme-input border-theme-border text-theme-dim hover:text-theme-muted'
                  }`}
                >
                  📝 Tampilkan Coretan Revisi
                </button>
                <button
                  onClick={() => setShowAnnotated(false)}
                  className={`text-[10px] font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    !showAnnotated 
                      ? 'bg-status-blue-bg border-status-blue-border text-status-blue-text' 
                      : 'bg-theme-input border-theme-border text-theme-dim hover:text-theme-muted'
                  }`}
                >
                  📄 Tampilkan Dokumen Asli
                </button>
              </div>
            )}
            
            <div className={`flex-1 flex ${isComparing && !showAnnotated ? 'flex-row gap-2 bg-theme-base p-2' : showAnnotated ? 'overflow-y-auto justify-center bg-theme-base p-4' : 'items-center justify-center relative'}`}>
              {showAnnotated && annotatedFileUrl ? (
                <div className="w-full max-w-3xl flex flex-col items-center gap-4">
                  <img
                    src={annotatedFileUrl}
                    alt="Coretan Revisi"
                    className="w-full h-auto object-contain shadow-lg border border-theme-border bg-white"
                  />
                </div>
              ) : isComparing && previousFileUrl ? (
                <>
                  <div className="flex-1 flex flex-col border border-status-red-border/50 rounded-lg overflow-hidden bg-theme-card relative">
                    <div className="bg-status-red-bg/30 text-status-red-text text-[10px] font-bold text-center py-1 uppercase tracking-wider absolute top-0 w-full z-10">Versi Lama (Sebelum Direvisi)</div>
                    <div className="flex-1 mt-6">
                      {isPreviousPdf ? (
                        <iframe src={`${previousFileUrl}#toolbar=0&navpanes=0&view=Fit`} className="w-full h-full border-0" title={`Versi Lama - ${document.judul}`} />
                      ) : (
                        <img src={previousFileUrl} alt="Versi Lama" className="w-full h-full object-contain p-2" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col border border-status-emerald-border/50 rounded-lg overflow-hidden bg-theme-card relative">
                    <div className="bg-status-emerald-bg/30 text-status-emerald-text text-[10px] font-bold text-center py-1 uppercase tracking-wider absolute top-0 w-full z-10">Versi Baru (Revisi Terkini)</div>
                    <div className="flex-1 mt-6">
                      {isPdf ? (
                        <iframe src={`${fileUrl}#toolbar=0&navpanes=0&view=Fit`} className="w-full h-full border-0" title={`Versi Baru - ${document.judul}`} />
                      ) : (
                        <img src={fileUrl} alt="Versi Baru" className="w-full h-full object-contain p-2" />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                isPdf ? (
                  <iframe
                    src={`${fileUrl}#toolbar=0&navpanes=0&view=Fit`}
                    className="w-full h-full border-0"
                    title={document.judul}
                  />
                ) : (
                  <img
                    src={fileUrl}
                    alt={document.judul}
                    className="max-w-full max-h-full object-contain p-2"
                  />
                )
              )}
            </div>
          </div>

          <div className="flex-[1.5] flex flex-col gap-4 md:overflow-y-auto border-t md:border-t-0 md:border-l border-theme-border pt-4 md:pt-0 md:pl-5 w-full shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-theme-dim mb-1">Informasi Dokumen</h4>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <FileText size={16} className="text-theme-dim mt-0.5" />
                <div>
                  <span className="text-[10px] text-theme-dim block font-semibold uppercase">Judul Pengujian</span>
                  <span className="text-xs font-semibold text-theme-muted leading-tight">{document.judul}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <User size={16} className="text-theme-dim mt-0.5" />
                <div>
                  <span className="text-[10px] text-theme-dim block font-semibold uppercase">Pengunggah (Admin)</span>
                  <span className="text-xs font-semibold text-theme-muted">{document.uploaded_by}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar size={16} className="text-theme-dim mt-0.5" />
                <div>
                  <span className="text-[10px] text-theme-dim block font-semibold uppercase">Tanggal Pengajuan</span>
                  <span className="text-xs font-semibold text-theme-muted">
                    {new Date(document.created_at).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {document.checked_by && (
                <div className="flex items-start gap-2.5">
                  <User size={16} className="text-theme-dim mt-0.5" />
                  <div>
                    <span className="text-[10px] text-theme-dim block font-semibold uppercase">Verifikator Admin</span>
                    <span className="text-xs font-semibold text-theme-muted">{document.checked_by}</span>
                  </div>
                </div>
              )}

              {document.checked_supervisor_by && (
                <div className="flex items-start gap-2.5">
                  <User size={16} className="text-theme-dim mt-0.5" />
                  <div>
                    <span className="text-[10px] text-theme-dim block font-semibold uppercase">Verifikator Supervisor</span>
                    <span className="text-xs font-semibold text-theme-muted">{document.checked_supervisor_by}</span>
                  </div>
                </div>
              )}

              {document.approved_by && (
                <div className="flex items-start gap-2.5">
                  <User size={16} className="text-theme-dim mt-0.5" />
                  <div>
                    <span className="text-[10px] text-theme-dim block font-semibold uppercase">Penerbit Nomor (Admin)</span>
                    <span className="text-xs font-semibold text-theme-muted">{document.approved_by}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-theme-border pt-4 mt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-dim mb-3">Status Alur Dokumen</h4>
              <div className="flex flex-col gap-4 pl-2 relative before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-[2px] before:bg-theme-border">
                <div className="flex gap-3 relative items-start">
                  <div className="w-6 h-6 rounded-none flex items-center justify-center border text-[10px] font-bold z-10 shrink-0 bg-status-emerald-bg border-status-emerald-border text-status-emerald-text">
                    1
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-theme-muted">Dokumen Diunggah (Admin)</span>
                    <span className="text-[10px] text-theme-muted">Oleh: {document.uploaded_by}</span>
                    <span className="text-[10px] text-theme-dim mt-0.5">
                      {new Date(document.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {(() => {
                  let stepClass = 'bg-theme-input border-theme-border text-theme-dim';
                  let subText = 'Menunggu audit Supervisor';
                  const title = 'Audit Supervisor';

                  const isApproved = ['PENDING_NUMBERING', 'APPROVED'].includes(document.status);
                  const isReturnedForRevision = document.status === 'PENDING_ADMIN' && document.checked_supervisor_by !== null;
                  const isCurrent = document.status === 'PENDING_SUPERVISOR';

                  if (isApproved) {
                    stepClass = 'bg-status-emerald-bg border-status-emerald-border text-status-emerald-text';
                    subText = `Disetujui oleh ${document.checked_supervisor_by || 'Supervisor'}`;
                  } else if (isReturnedForRevision) {
                    stepClass = 'bg-status-red-bg border-status-red-border text-status-red-text';
                    subText = `Dikembalikan ke Admin untuk revisi oleh ${document.checked_supervisor_by}`;
                  } else if (isCurrent) {
                    stepClass = 'bg-status-amber-bg border-status-amber-border text-status-amber-text animate-pulse';
                    subText = 'Sedang dalam antrian audit Supervisor';
                  }

                  return (
                    <div className="flex gap-3 relative items-start">
                      <div className={`w-6 h-6 rounded-none flex items-center justify-center border text-[10px] font-bold z-10 shrink-0 ${stepClass}`}>
                        2
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-theme-muted">{title}</span>
                        <span className="text-[10px] text-theme-muted">{subText}</span>
                        {document.checked_supervisor_at && (
                          <span className="text-[10px] text-theme-dim mt-0.5">
                            {new Date(document.checked_supervisor_at).toLocaleString('id-ID')}
                          </span>
                        )}
                        {isReturnedForRevision && document.catatan_spv && (
                          <span className="text-[10px] text-status-red-text italic mt-0.5">Catatan: {document.catatan_spv}</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  let stepClass = 'bg-theme-input border-theme-border text-theme-dim';
                  let subText = 'Menunggu penomoran & cetak oleh Admin';
                  const title = 'Penomoran & Cetak Nomor (Admin)';

                  const isApproved = document.status === 'APPROVED';
                  const isCurrent = document.status === 'PENDING_NUMBERING';

                  if (isApproved) {
                    stepClass = 'bg-status-emerald-bg border-status-emerald-border text-status-emerald-text';
                    subText = `Nomor terbit: ${document.kode_lhu || document.kode_sertifikat || '-'}`;
                  } else if (isCurrent) {
                    stepClass = 'bg-status-blue-bg border-status-blue-border text-status-blue-text animate-pulse';
                    subText = 'Siap untuk diberi nomor & dicetak';
                  }

                  return (
                    <div className="flex gap-3 relative items-start">
                      <div className={`w-6 h-6 rounded-none flex items-center justify-center border text-[10px] font-bold z-10 shrink-0 ${stepClass}`}>
                        3
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-theme-muted">{title}</span>
                        <span className="text-[10px] text-theme-muted">{subText}</span>
                        {isApproved && document.approved_at && (
                          <span className="text-[10px] text-theme-dim mt-0.5">
                            {new Date(document.approved_at).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="border-t border-theme-border pt-4 mt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-dim mb-2">Riwayat Catatan Pemeriksaan</h4>
              <div className="flex flex-col gap-2.5">
                {document.catatan_admin && (
                  <div className="bg-theme-input border border-theme-border p-3.5 rounded-none">
                    <span className="text-[10px] font-bold text-status-blue-text block uppercase mb-1">Hasil Evaluasi Admin ({document.checked_by})</span>
                    <p className="text-xs text-theme-muted italic">&ldquo;{document.catatan_admin}&rdquo;</p>
                  </div>
                )}
                {document.checked_supervisor_by && (document.catatan_spv || (document.spv_checklist && document.spv_checklist.length > 0)) && (
                  <div className="bg-theme-input border border-theme-border p-3.5 rounded-none">
                    <span className="text-[10px] font-bold text-status-amber-text block uppercase mb-1">Hasil Audit Supervisor ({document.checked_supervisor_by})</span>
                    {document.catatan_spv && (
                      <p className="text-xs text-theme-muted italic mb-2">&ldquo;{document.catatan_spv}&rdquo;</p>
                    )}
                    {checklistItems.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-theme-border/60">
                        <span className="font-semibold text-[10px] text-theme-dim uppercase block mb-1">Checklist Audit:</span>
                        <div className="flex flex-col gap-0.5 text-xs text-theme-muted">
                          {checklistItems.map((item, idx) => {
                            const isChecked = document.spv_checklist?.includes(item);
                            return (
                              <span 
                                key={idx} 
                                className={`flex items-center gap-1.5 ${isChecked ? 'text-status-emerald-text' : 'text-status-red-text font-medium'}`}
                              >
                                <span>{isChecked ? '✓' : '✗'}</span>
                                <span>{item}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!document.catatan_admin && !document.catatan_spv && (!document.spv_checklist || document.spv_checklist.length === 0) && (
                  <div className="text-xs text-theme-dim italic py-2">Tidak ada catatan pada dokumen ini.</div>
                )}
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="border-t border-theme-border pt-4 mt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-theme-dim mb-2">Lampiran Tambahan</h4>
                <div className="flex flex-col gap-1.5">
                  {attachments.map((att) => (
                    <a
                      key={att.id}
                      href={getAttachmentUrl(att.file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-2 bg-theme-input hover:bg-theme-hover border border-theme-border rounded-none text-xs transition-all group/att"
                    >
                      <Paperclip size={13} className="text-theme-dim shrink-0 group-hover/att:text-status-blue-text" />
                      <span className="truncate flex-1 text-theme-muted group-hover/att:text-theme-text">{att.file_name}</span>
                      <Download size={12} className="text-theme-dim shrink-0 group-hover/att:text-status-blue-text" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-4 border-t border-theme-border flex flex-col gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-status-blue-bg hover:bg-status-blue-bg text-theme-text font-semibold text-xs px-4 py-2.5 rounded-none transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                <Download size={16} /> Buka Tab Baru / Unduh
              </a>
              <button
                onClick={onClose}
                className="w-full bg-theme-input hover:bg-theme-card border border-theme-border text-theme-muted font-semibold text-xs px-4 py-2.5 rounded-none transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
