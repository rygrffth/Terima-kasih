import React from 'react';
import { X } from 'lucide-react';
import { LhuDocument } from '../../../types';

interface AdminVerifyModalProps {
  document: LhuDocument;
  onClose: () => void;
  actionNotes: Record<string, string>;
  handleNoteChange: (docId: string, value: string) => void;
  handleAdminAction: (docId: string, action: 'approve' | 'reject') => Promise<void>;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
  getDownloadUrl: (filePath: string) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
}

export default function AdminVerifyModal({
  document: previewDoc,
  onClose,
  actionNotes,
  handleNoteChange,
  handleAdminAction,
  formatLhuNumber,
  getDownloadUrl,
  renderStatusBadge
}: AdminVerifyModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-base/60 backdrop-blur-sm animate-fade-in text-theme-text">
      <div className="bg-theme-card border border-theme-border rounded-3xl w-full max-w-7xl h-[90vh] flex flex-col p-6 shadow-2xl relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-theme-muted hover:text-theme-text transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <header className="mb-4 pr-10">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="bg-status-blue-bg border border-status-blue-border text-status-blue-text font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
              {previewDoc.status === 'APPROVED' && previewDoc.kode_lhu ? previewDoc.kode_lhu : formatLhuNumber(previewDoc.nomor_lhu, previewDoc.tipe_dokumen)}
            </span>
            {previewDoc.komoditi && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-blue-bg border border-status-blue-border text-status-blue-text">
                {previewDoc.komoditi}
              </span>
            )}
            {previewDoc.departemen && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-orange-bg border border-status-orange-border text-status-orange-text">
                {previewDoc.departemen}
              </span>
            )}
            {renderStatusBadge(previewDoc.status)}
          </div>
          <h3 className="text-lg font-bold text-theme-text truncate">{previewDoc.judul}</h3>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          <div className="flex-[3] bg-theme-card border border-theme-border rounded-2xl overflow-hidden relative flex items-center justify-center h-full">
            {previewDoc.file_path.toLowerCase().endsWith('.pdf') || previewDoc.file_path.startsWith('fallback_path/') ? (
              <iframe
                src={`${getDownloadUrl(previewDoc.file_path)}#toolbar=0`}
                className="w-full h-full border-0"
                title={previewDoc.judul}
              />
            ) : (
              <img
                src={getDownloadUrl(previewDoc.file_path)}
                alt={previewDoc.judul}
                className="max-w-full max-h-full object-contain p-2"
              />
            )}
          </div>

          <div className="flex-[2] flex flex-col gap-4 overflow-y-auto border-t lg:border-t-0 lg:border-l border-theme-border pt-4 lg:pt-0 lg:pl-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-dim mb-2">Metadata Dokumen</h4>
              <div className="bg-theme-input border border-theme-border p-4 rounded-2xl flex flex-col gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-theme-dim uppercase font-semibold">Judul Pengujian</span>
                  <p className="font-semibold text-theme-muted">{previewDoc.judul}</p>
                </div>
                <div className="flex justify-between">
                  <div>
                    <span className="text-[10px] text-theme-dim uppercase font-semibold block">Pengaju Dokumen</span>
                    <p className="font-semibold text-theme-muted">{previewDoc.uploaded_by}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-theme-dim uppercase font-semibold block">Tanggal Upload</span>
                    <p className="font-semibold text-theme-muted">
                      {new Date(previewDoc.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-dim">
                Tindakan Pemeriksaan Administratif
              </h4>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-theme-muted font-semibold">
                  Catatan Evaluasi Admin (Opsional / Wajib jika tolak)
                </label>
                <textarea
                  className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none transition-all resize-none placeholder-slate-500"
                  placeholder="Masukkan catatan evaluasi berkas..."
                  rows={3}
                  value={actionNotes[previewDoc.id] || ''}
                  onChange={(e) => handleNoteChange(previewDoc.id, e.target.value)}
                />
                
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['Berkas lengkap.', 'Kurang Tanda Tangan.', 'Data tidak terbaca.', 'Revisi nomor LHU.', 'Lampiran belum ada.'].map((note, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleNoteChange(previewDoc.id, note)}
                      className="text-[9px] font-semibold bg-theme-input hover:bg-theme-hover text-theme-muted hover:text-theme-muted border border-theme-border px-2.5 py-1 rounded-full transition-all cursor-pointer"
                    >
                      + {note}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-theme-border flex gap-3">
              <button
                onClick={async () => {
                  await handleAdminAction(previewDoc.id, 'approve');
                  onClose();
                }}
                className="btn-blue w-full flex items-center justify-center gap-1.5 font-bold text-xs py-3 rounded-xl cursor-pointer"
              >
                Setujui & Ajukan ke Supervisor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
