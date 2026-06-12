"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { LhuDocument } from '../../types';
import { CheckCircle2, AlertTriangle, ShieldCheck, Download, Clock } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const docId = searchParams.get('id');

  const [document, setDocument] = useState<LhuDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      setErrorMsg('Parameter ID dokumen tidak ditemukan.');
      return;
    }

    const fetchVerifiedDoc = async () => {
      try {
        const { data, error } = await supabase
          .from('lhu_document')
          .select('*')
          .eq('id', docId)
          .single();

        if (error) throw error;
        setDocument(data as LhuDocument);
      } catch (err: unknown) {
        console.error('Gagal memverifikasi dokumen:', err);
        setErrorMsg('Dokumen tidak ditemukan atau ID tidak terdaftar di sistem database PROLAB.');
      } finally {
        setLoading(false);
      }
    };

    fetchVerifiedDoc();
  }, [docId]);

  const formatLhuNumber = (num: number, tipe_dokumen?: string | null): string => {
    const prefix = tipe_dokumen === 'Sertifikat' ? 'CERT' : 'LHU';
    return `${prefix}-${String(num).padStart(3, '0')}`;
  };

  const getDownloadUrl = (filePath: string): string => {
    if (filePath.startsWith('fallback_path/')) {
      return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    }
    const { data } = supabase.storage.from('lhu-documents').getPublicUrl(filePath);
    return data?.publicUrl || '#';
  };

  const generateSecurityHash = (id: string) => {
    if (!id) return '';
    return `PRLB-${id.substring(0, 8).toUpperCase()}-${id.substring(9, 13).toUpperCase()}-SNI`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-theme-base text-theme-dim font-semibold animate-pulse text-sm">
        Memverifikasi kode tanda tangan digital...
      </div>
    );
  }

  if (errorMsg || !document) {
    return (
      <div className="min-h-screen bg-theme-base flex items-center justify-center p-4 text-theme-text">
        <div className="bg-theme-card border border-theme-border rounded-3xl w-full max-w-md p-6 shadow-2xl text-center">
          <div className="p-3 bg-status-red-bg border border-status-red-border text-status-red-text rounded-full w-fit mx-auto mb-4 animate-pulse">
            <AlertTriangle size={40} />
          </div>
          <h3 className="text-lg font-bold text-theme-text mb-2">Verifikasi Gagal</h3>
          <p className="text-xs text-theme-muted mb-6">
            {errorMsg || 'Berkas dokumen dengan identitas tersebut tidak valid atau palsu.'}
          </p>
          <div className="text-[9px] text-theme-muted font-mono tracking-widest">
            PROLAB SECURITY VERIFICATION SYSTEM
          </div>
        </div>
      </div>
    );
  }

  const isApproved = document.status === 'APPROVED';
  const isPending = document.status === 'PENDING_ADMIN' || document.status === 'PENDING_SUPERVISOR' || document.status === 'PENDING_MANAGER';
  const isRejected = document.status === 'REJECTED';

  return (
    <div className="min-h-screen bg-theme-base flex flex-col justify-center items-center p-4 md:p-8 text-slate-101">
      <div className="w-full max-w-2xl bg-theme-card border border-theme-border rounded-3xl overflow-hidden shadow-2xl">
        
        {isApproved && (
          <div className="bg-status-emerald-bg border-b border-status-emerald-border text-status-emerald-text p-6 flex flex-col items-center text-center gap-2">
            <CheckCircle2 size={48} className="text-status-emerald-text" />
            <h2 className="text-lg font-extrabold tracking-wide uppercase">NOMOR DOKUMEN RESMI TERBIT</h2>
            <p className="text-xs text-status-emerald-text opacity-90">Dokumen ini telah diterbitkan secara resmi di database E-Dokumen PROLAB.</p>
          </div>
        )}

        {isPending && (
          <div className="bg-status-orange-bg border-b border-status-orange-border text-status-orange-text p-6 flex flex-col items-center text-center gap-2">
            <Clock size={48} className="text-status-orange-text animate-pulse" />
            <h2 className="text-lg font-extrabold tracking-wide uppercase">DOKUMEN DALAM PROSES REVIEW</h2>
            <p className="text-xs text-status-orange-text opacity-90">Nomor dokumen telah terbit, berkas sedang divalidasi oleh Tim Pemeriksa.</p>
          </div>
        )}

        {isRejected && (
          <div className="bg-status-red-bg border-b border-status-red-border text-status-red-text p-6 flex flex-col items-center text-center gap-2">
            <AlertTriangle size={48} className="text-status-red-text" />
            <h2 className="text-lg font-extrabold tracking-wide uppercase">DOKUMEN DITOLAK / EXPIRED</h2>
            <p className="text-xs text-status-red-text opacity-90">Dokumen tidak lulus verifikasi dan memerlukan revisi teknis.</p>
          </div>
        )}

        <div className="p-6 md:p-8 flex flex-col gap-6">
          <div className="border-b border-theme-border pb-6">
            <span className="text-[9px] uppercase font-bold tracking-wider text-theme-dim block">Nomor Seri Dokumen</span>
            <span className="font-mono font-bold text-2xl text-status-blue-text">{document.status === 'APPROVED' && document.kode_lhu ? document.kode_lhu : formatLhuNumber(document.nomor_lhu, document.tipe_dokumen)}</span>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-theme-dim block">Judul Pengujian Laboratorium</span>
              <h4 className="text-sm font-bold text-theme-text mt-1 leading-tight">{document.judul}</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-theme-input p-4 rounded-2xl border border-theme-border mt-2">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-theme-dim block">Pengaju Dokumen</span>
                <span className="text-xs font-semibold text-theme-muted">{document.uploaded_by}</span>
              </div>
              {document.komoditi && (
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-theme-dim block">Departemen</span>
                  <span className="text-xs font-semibold text-status-blue-text">{document.komoditi}</span>
                </div>
              )}
              {document.departemen && (
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-theme-dim block">Jenis / Skema Dokumen</span>
                  <span className="text-xs font-semibold text-status-orange-text">{document.departemen}</span>
                </div>
              )}
            </div>

            {isApproved && (
              <div className="border-t border-theme-border pt-5 mt-2">
                <h5 className="text-[9px] uppercase font-bold tracking-wider text-theme-dim mb-3">Tanda Tangan Elektronik</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-theme-border rounded-2xl p-4 bg-theme-input flex flex-col justify-between min-h-[95px] relative overflow-hidden">
                    <span className="text-[9px] font-bold text-theme-muted uppercase">Pemeriksa Admin</span>
                    <span className="text-xs font-bold text-theme-muted z-10">{document.checked_by || '-'}</span>
                    <span className="text-[9px] text-theme-dim mt-1 font-mono">
                      {document.checked_at ? new Date(document.checked_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                    </span>
                    <div className="absolute -bottom-4 -right-4 opacity-[0.03] text-theme-text"><ShieldCheck size={72} /></div>
                  </div>
                  <div className="border border-theme-border rounded-2xl p-4 bg-theme-input flex flex-col justify-between min-h-[95px] relative overflow-hidden">
                    <span className="text-[9px] font-bold text-theme-muted uppercase">Auditor Supervisor</span>
                    <span className="text-xs font-bold text-theme-muted z-10">{document.checked_supervisor_by || '-'}</span>
                    <span className="text-[9px] text-theme-dim mt-1 font-mono">
                      {document.checked_supervisor_at ? new Date(document.checked_supervisor_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                    </span>
                    <div className="absolute -bottom-4 -right-4 opacity-[0.03] text-theme-text"><ShieldCheck size={72} /></div>
                  </div>
                  <div className="border border-theme-border rounded-2xl p-4 bg-theme-input flex flex-col justify-between min-h-[95px] relative overflow-hidden">
                    <span className="text-[9px] font-bold text-status-emerald-text uppercase flex items-center gap-1">
                      <ShieldCheck size={10} /> Nomor Diterbitkan
                    </span>
                    <span className="text-xs font-bold text-theme-muted z-10">{document.approved_by || '-'}</span>
                    <span className="text-[9px] text-status-emerald-text mt-1 font-mono">
                      {document.approved_at ? new Date(document.approved_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : new Date(document.updated_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-theme-border pt-6 mt-2 flex flex-col sm:flex-row gap-3">
            <a
              href={getDownloadUrl(document.file_path)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-status-blue-bg hover:bg-status-blue-bg text-theme-text font-semibold text-xs px-4 py-3.5 rounded-xl transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              Buka Berkas Asli
            </a>
          </div>

        </div>

        <footer className="bg-theme-input border-t border-theme-border px-6 py-4.5 flex justify-center items-center text-[10px] text-theme-dim">
          <span className="font-mono text-[9.5px] opacity-85">Dev by Naufal Rayhan Ali Rahman</span>
        </footer>

      </div>
    </div>
  );
}

export default function VerifyRoute() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-theme-base text-theme-dim font-semibold animate-pulse text-sm">
        Memuat verifikator...
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
