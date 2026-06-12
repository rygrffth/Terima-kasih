"use client";

import React from 'react';
import { LhuDocument } from '../types';
import { X, Check } from 'lucide-react';

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
