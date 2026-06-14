"use client";

import React from 'react';
import { LhuDocument } from '../types';
import { X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TimelineDrawerProps {
  document: LhuDocument;
  onClose: () => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
}

export default function TimelineDrawer({
  document,
  onClose,
  formatLhuNumber
}: TimelineDrawerProps) {
  const isPendingAdmin = document.status === 'PENDING_ADMIN';
  const isPendingSupervisor = document.status === 'PENDING_SUPERVISOR';
  const isPendingNumbering = document.status === 'PENDING_NUMBERING';
  const isApproved = document.status === 'APPROVED';
  const isRejected = document.status === 'REJECTED';

  const getDownloadUrl = (filePath: string): string => {
    if (filePath.startsWith('fallback_path/')) {
      return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    }
    const { data } = supabase.storage.from('lhu-documents').getPublicUrl(filePath);
    return data?.publicUrl || '#';
  };

  // Parse version history from previous_file_path JSON array
  let versions: any[] = [];
  if (document.previous_file_path) {
    try {
      const trimmedPrev = document.previous_file_path.trim();
      if (trimmedPrev.startsWith('[')) {
        versions = JSON.parse(trimmedPrev);
      } else {
        // Legacy single previous file path
        versions = [{
          version: 1,
          judul: document.judul,
          file_path: document.previous_file_path,
          catatan_admin: document.catatan_admin || 'Unggahan awal',
          catatan_spv: null,
          checked_supervisor_by: null,
          checked_supervisor_at: null,
          created_at: document.created_at
        }];
      }
    } catch (e) {
      console.error('Failed to parse previous_file_path history:', e);
    }
  }

  const getAdminStatusClass = () => {
    if (document.checked_by) return 'success';
    if (isRejected && !document.checked_supervisor_by && !document.kode_lhu && !document.kode_sertifikat) return 'danger';
    if (isPendingAdmin) return 'active';
    return 'pending';
  };

  const getSupervisorStatusClass = () => {
    if (document.checked_supervisor_by) {
      if (document.status === 'PENDING_ADMIN' && document.catatan_spv) return 'danger';
      return 'success';
    }
    if (isPendingSupervisor) return 'active';
    return 'pending';
  };

  const getNumberingStatusClass = () => {
    if (isApproved || document.kode_lhu || document.kode_sertifikat) return 'success';
    if (isPendingNumbering) return 'active';
    return 'pending';
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-theme-base/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-full w-[450px] max-w-full bg-theme-card border-l border-theme-border shadow-2xl z-50 flex flex-col p-6 animate-slide-in text-theme-text">
        <header className="flex justify-between items-center pb-4 border-b border-theme-border mb-6">
          <div>
            <span className="text-xs font-bold font-mono text-status-blue-text bg-status-blue-bg border border-status-blue-border px-2 py-0.5 rounded">
              {document.status === 'APPROVED' && document.kode_lhu ? document.kode_lhu : formatLhuNumber(document.nomor_lhu, document.tipe_dokumen)}
            </span>
            <h3 className="text-base font-bold text-theme-text mt-1.5">Riwayat Dokumen</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-theme-input text-theme-dim hover:text-theme-muted rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </header>

        <div className="bg-theme-input border border-theme-border rounded-2xl p-4 mb-6">
          <h4 className="text-sm font-bold text-theme-text mb-1.5">{document.judul}</h4>
          <div className="flex flex-wrap gap-2 text-[10px] text-theme-muted">
            <span>Diajukan oleh: <strong className="text-theme-muted">{document.uploaded_by}</strong></span>
            {document.komoditi && <span>| Departemen: <strong className="text-status-blue-text">{document.komoditi}</strong></span>}
            {document.departemen && <span>| Jenis Dokumen: <strong className="text-status-orange-text">{document.departemen}</strong></span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <h4 className="text-xs font-bold uppercase tracking-wider text-theme-dim mb-4 pl-1">Alur Persetujuan</h4>
          
          <div className="timeline-flow">
            <div className="timeline-node success">
              <div className="timeline-marker flex items-center justify-center">
                <Check size={10} className="text-theme-text" />
              </div>
              <div className="timeline-body">
                <span className="text-xs font-bold text-theme-text">Dokumen Berhasil Diunggah</span>
                <span className="text-[10px] text-theme-muted">Oleh: {document.uploaded_by}</span>
                <span className="timeline-time mt-1">
                  {new Date(document.created_at).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className={`timeline-node ${getAdminStatusClass()}`}>
              <div className="timeline-marker" />
              <div className="timeline-body">
                <span className="text-xs font-bold text-theme-text">Pemeriksaan Berkas oleh Admin</span>
                
                {document.checked_by ? (
                  <>
                    <span className="text-[10px] text-theme-muted">
                      Diselesaikan oleh: <strong className="text-theme-muted">{document.checked_by}</strong>
                    </span>
                    {document.catatan_admin && (
                      <div className="bg-theme-card border border-theme-border p-2.5 rounded-xl text-[11px] text-theme-muted mt-1.5 italic">
                        &ldquo;{document.catatan_admin}&rdquo;
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] text-theme-dim italic">
                    {isPendingAdmin ? 'Menunggu antrean validasi Admin...' : 'Tahap terlewati'}
                  </span>
                )}
              </div>
            </div>

            <div className={`timeline-node ${getSupervisorStatusClass()}`}>
              <div className="timeline-marker" />
              <div className="timeline-body">
                <span className="text-xs font-bold text-theme-text">Audit Kelayakan oleh Supervisor</span>
                
                {document.checked_supervisor_by ? (
                  <>
                    <span className="text-[10px] text-theme-muted">
                      Diaudit oleh: <strong className="text-theme-muted">{document.checked_supervisor_by}</strong>
                    </span>
                    {document.catatan_spv && !document.kode_lhu && !document.kode_sertifikat && (
                      <div className="bg-theme-card border border-theme-border p-2.5 rounded-xl text-[11px] text-theme-muted mt-1.5 italic">
                        &ldquo;{document.catatan_spv}&rdquo;
                      </div>
                    )}
                    <span className="timeline-time mt-1">
                      {new Date(document.checked_supervisor_at || document.updated_at).toLocaleString('id-ID')}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-theme-dim italic">
                    {isPendingSupervisor ? 'Menunggu audit kelayakan Supervisor...' : 'Belum diajukan'}
                  </span>
                )}
              </div>
            </div>

            <div className={`timeline-node ${getNumberingStatusClass()}`}>
              <div className="timeline-marker" />
              <div className="timeline-body">
                <span className="text-xs font-bold text-theme-text">Penomoran & Unggah Dokumen Final</span>
                
                {isApproved || document.kode_lhu || document.kode_sertifikat ? (
                  <>
                    <span className="text-[10px] text-status-emerald-text font-semibold flex items-center gap-1 mt-0.5">
                      Disetujui & Nomor Diterbitkan
                    </span>
                    <span className="text-[10px] text-theme-muted">
                      Oleh Admin: <strong className="text-theme-muted">{document.approved_by || document.checked_by || 'Staf Admin'}</strong>
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {document.kode_lhu && (
                        <span className="text-[10px] text-status-orange-text font-mono">
                          Kode LHU: {document.kode_lhu}
                        </span>
                      )}
                      {document.kode_sertifikat && (
                        <span className="text-[10px] text-status-emerald-text font-mono">
                          Kode Sertifikat: {document.kode_sertifikat}
                        </span>
                      )}
                    </div>
                    <span className="timeline-time mt-1">
                      {new Date(document.approved_at || document.updated_at).toLocaleString('id-ID')}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-theme-dim italic">
                    {isPendingNumbering ? 'Menunggu pemberian nomor & upload berkas final oleh Admin...' : 'Belum sampai tahap penomoran'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {versions.length > 0 && (
            <div className="mt-8 border-t border-theme-border pt-6 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-dim mb-4 pl-1">
                Riwayat Versi Berkas ({versions.length + 1})
              </h4>
              <div className="flex flex-col gap-3">
                {versions.map((ver: any, index: number) => (
                  <div key={index} className="bg-theme-input border border-theme-border rounded-2xl p-4 text-xs flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-status-blue-text font-mono bg-status-blue-bg/40 border border-status-blue-border/40 px-2 py-0.5 rounded text-[10px]">
                        Versi {ver.version || (index + 1)}
                      </span>
                      <span className="text-[10px] text-theme-dim">
                        {ver.created_at ? new Date(ver.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        }) : ''}
                      </span>
                    </div>
                    <p className="font-bold text-theme-text line-clamp-2">{ver.judul}</p>
                    {ver.catatan_admin && (
                      <div className="text-theme-muted text-[11px] bg-theme-card border border-theme-border p-2.5 rounded-xl italic">
                        <strong>Catatan Admin:</strong> &ldquo;{ver.catatan_admin}&rdquo;
                      </div>
                    )}
                    {ver.catatan_spv && (
                      <div className="text-status-red-text text-[11px] bg-status-red-bg border border-status-red-border p-2.5 rounded-xl italic">
                        <strong>Catatan Supervisor:</strong> &ldquo;{ver.catatan_spv}&rdquo;
                      </div>
                    )}
                    <div className="mt-1 flex justify-between items-center border-t border-theme-border/50 pt-2 text-[10px] text-theme-dim">
                      <span>Oleh: {ver.uploaded_by || document.uploaded_by}</span>
                      {ver.file_path === 'deleted' ? (
                        <span className="text-status-orange-text font-semibold flex items-center gap-1">
                          ⚠️ Berkas Kedaluwarsa (Telah Dihapus)
                        </span>
                      ) : (
                        <a
                          href={getDownloadUrl(ver.file_path)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-status-blue-text hover:underline"
                        >
                          📥 Unduh Berkas V{ver.version || (index + 1)}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Current Active Version */}
                <div className="bg-theme-input border border-status-emerald-border/45 rounded-2xl p-4 text-xs flex flex-col gap-2 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-status-emerald-text font-mono bg-status-emerald-bg/40 border border-status-emerald-border/40 px-2 py-0.5 rounded text-[10px]">
                      Versi {versions.length + 1} (Aktif)
                    </span>
                    <span className="text-[10px] text-theme-dim">
                      {document.updated_at ? new Date(document.updated_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : ''}
                    </span>
                  </div>
                  <p className="font-bold text-theme-text line-clamp-2">{document.judul}</p>
                  {document.catatan_admin && (
                    <div className="text-theme-muted text-[11px] bg-theme-card border border-theme-border p-2.5 rounded-xl italic">
                      <strong>Catatan Admin:</strong> &ldquo;{document.catatan_admin}&rdquo;
                    </div>
                  )}
                  <div className="mt-1 flex justify-between items-center border-t border-theme-border/50 pt-2 text-[10px] text-theme-dim">
                    <span>Oleh: {document.uploaded_by}</span>
                    <a
                      href={getDownloadUrl(document.file_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-status-emerald-text hover:underline"
                    >
                      📥 Unduh Berkas V{versions.length + 1}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="pt-4 border-t border-theme-border mt-6 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full bg-theme-input hover:bg-theme-card border border-theme-border text-theme-muted font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Tutup Pelacakan
          </button>
        </footer>
      </div>
    </>
  );
}
