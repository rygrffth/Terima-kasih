"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { LhuDocument } from '../../../types';
import DocumentPreviewModal from '../../../components/DocumentPreviewModal';
import { ShieldCheck } from 'lucide-react';

import StatsCards from '../components/StatsCards';
import HistoryList from '../components/HistoryList';

export default function HistoryAuditPage() {
  const params = useParams();
  const activeDivisi = params?.divisi ? decodeURIComponent(params.divisi as string) : null;
  const [userName, setUserName] = useState('Supervisor PROLAB');
  const [supervisorDepartemen, setSupervisorDepartemen] = useState<string | null>(null);
  const [supervisorKomoditi, setSupervisorKomoditi] = useState<string | null>(null);
  const [allowedKomoditi, setAllowedKomoditi] = useState<string[] | null>(null);
  const [allowedDepartemen, setAllowedDepartemen] = useState<string[] | null>(null);
  const [allDocuments, setAllDocuments] = useState<LhuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<LhuDocument | null>(null);

  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyTechFilter, setHistoryTechFilter] = useState('ALL');

  useEffect(() => {
    const loadUserName = async () => {
      setUserName(localStorage.getItem('lhu_user_name') || 'Supervisor PROLAB');
      const loggedUserStr = localStorage.getItem('lhu_logged_user');
      if (loggedUserStr) {
        const userObj = JSON.parse(loggedUserStr);
        setSupervisorDepartemen(userObj.departemen || null);
        try {
          const { data, error } = await supabase
            .from('lhu_users')
            .select('komoditi, departemen, allowed_komoditi, allowed_departemen')
            .eq('username', userObj.username)
            .single();
          if (!error && data) {
            setSupervisorDepartemen(data.departemen || null);
            setSupervisorKomoditi(data.komoditi || null);
            setAllowedKomoditi(data.allowed_komoditi || null);
            setAllowedDepartemen(data.allowed_departemen || null);
          }
        } catch (e) {
          console.error('Failed to load supervisor permissions from DB:', e);
        }
      }
    };

    loadUserName();
    fetchDocuments();
    window.addEventListener('userNameChanged', loadUserName);
    const handleDocChanged = () => fetchDocuments(true);
    window.addEventListener('lhu_document_changed', handleDocChanged);
    return () => {
      window.removeEventListener('userNameChanged', loadUserName);
      window.removeEventListener('lhu_document_changed', handleDocChanged);
    };
  }, []);

  const fetchDocuments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lhu_document')
        .select('*')
        .order('nomor_lhu', { ascending: false });

      if (error) throw error;
      setAllDocuments((data as LhuDocument[]) || []);
    } catch (err) {
      console.error('Gagal mengambil data LHU untuk Supervisor:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_ADMIN':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-red-bg border border-status-red-border text-status-red-text">Perlu Direvisi</span>;
      case 'PENDING_SUPERVISOR':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-amber-bg border border-status-amber-border text-status-amber-text">Cek Supervisor</span>;
      case 'PENDING_MANAGER':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-orange-bg border border-status-orange-border text-status-orange-text">Cek Manager QHSE</span>;
      case 'APPROVED':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text">Disetujui</span>;
      case 'REJECTED':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-red-bg border border-status-red-border text-status-red-text">Ditolak</span>;
      default:
        return null;
    }
  };

  const filterByPermissions = (docs: LhuDocument[]) => {
    const activeAllowedKomoditi = (allowedKomoditi && allowedKomoditi.length > 0) 
      ? allowedKomoditi 
      : (supervisorKomoditi ? [supervisorKomoditi] : []);

    const activeAllowedDepartemen = (allowedDepartemen && allowedDepartemen.length > 0)
      ? allowedDepartemen
      : (supervisorDepartemen ? [supervisorDepartemen] : []);

    return docs.filter(doc => {
      if (activeDivisi && activeDivisi !== 'ALL') {
        if (doc.komoditi !== activeDivisi) return false;
      }
      if (activeAllowedKomoditi.length > 0 && !activeAllowedKomoditi.includes('ALL')) {
        if (!doc.komoditi || !activeAllowedKomoditi.includes(doc.komoditi)) {
          return false;
        }
      }
      if (activeAllowedDepartemen.length > 0 && !activeAllowedDepartemen.includes('ALL')) {
        if (!doc.departemen || !activeAllowedDepartemen.includes(doc.departemen)) {
          return false;
        }
      }
      return true;
    });
  };

  const filteredAll = filterByPermissions(allDocuments);
  const pendingDocs = filteredAll.filter(d => d.status === 'PENDING_SUPERVISOR');
  
  const historyDocs = filteredAll.filter(d => {
    if (!d.checked_supervisor_by) return false;
    const dbSpv = d.checked_supervisor_by.toLowerCase().trim();
    const currentSpv = userName.toLowerCase().trim();
    
    if (dbSpv === currentSpv) return true;
    
    const dbBase = dbSpv.split(' ')[0];
    const currentBase = currentSpv.split(' ')[0];
    if (dbBase === currentBase && (dbSpv === 'asmawi' || currentSpv === 'asmawi')) {
      return true;
    }
    
    return false;
  });

  let filteredHistory = historyDocs.filter(doc => {
    const docNumStr = doc.kode_lhu || `LHU-${String(doc.nomor_lhu || '').padStart(3, '0')}`;
    const matchSearch = 
      (doc.judul || '').toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      (doc.uploaded_by || '').toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      docNumStr.toLowerCase().includes(historySearchQuery.toLowerCase());
    const matchTech = historyTechFilter === 'ALL' || doc.uploaded_by === historyTechFilter;
    return matchSearch && matchTech;
  });

  return (
    <div className="w-full animate-fade-in text-theme-text">
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-theme-border pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text flex items-center gap-2">
            <ShieldCheck className="text-status-orange-text" /> Halaman Audit Supervisor
          </h2>
          <p className="text-sm text-theme-muted mt-1">
            Auditor aktif: <span className="text-status-orange-text font-semibold">{userName}</span> 
            {supervisorDepartemen && (
              <> | Jenis Dokumen: <span className="text-status-blue-text font-semibold">{supervisorDepartemen}</span></>
            )}
          </p>
        </div>
        <img src="/logo2.png" alt="PROLAB Logo" className="h-10 object-contain prolab-logo" />
      </header>

      <StatsCards
        pendingCount={pendingDocs.length}
        historyCount={historyDocs.length}
        totalCount={filteredAll.length}
      />

      <div className="w-full text-theme-text mt-6">
        <HistoryList
          loading={loading}
          filteredHistory={filteredHistory}
          historyDocs={historyDocs}
          historySearchQuery={historySearchQuery}
          setHistorySearchQuery={setHistorySearchQuery}
          formatLhuNumber={formatLhuNumber}
          renderStatusBadge={renderStatusBadge}
          setPreviewDoc={setPreviewDoc}
        />
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          formatLhuNumber={formatLhuNumber}
          getDownloadUrl={getDownloadUrl}
          renderStatusBadge={renderStatusBadge}
        />
      )}
    </div>
  );
}
