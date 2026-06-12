"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { LhuDocument } from '../../../types';
import DocumentPreviewModal from '../../../components/DocumentPreviewModal';
import ResubmitModal from '../../../components/ResubmitModal';
import TimelineDrawer from '../../../components/TimelineDrawer';
import { logAudit } from '../../../lib/audit';

import StatsCards from '../components/StatsCards';
import HistoryList from '../components/HistoryList';
import AdminUploadStatsCards from '../components/AdminUploadStatsCards';
import AdminUploadHistoryList from '../components/AdminUploadHistoryList';

export default function HistoryPage() {
  const params = useParams();
  const activeDivisi = params?.divisi ? decodeURIComponent(params.divisi as string) : null;
  const [userName, setUserName] = useState('Admin PROLAB');
  const [allowedKomoditi, setAllowedKomoditi] = useState<string[] | null>(null);
  const [allowedDepartemen, setAllowedDepartemen] = useState<string[] | null>(null);
  const [adminKomoditi, setAdminKomoditi] = useState<string | null>(null);
  const [adminDepartemen, setAdminDepartemen] = useState<string | null>(null);
  const [allDocuments, setAllDocuments] = useState<LhuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<LhuDocument | null>(null);
  const [historyTab, setHistoryTab] = useState<'my_uploads' | 'all_history'>('my_uploads');

  const [notifications, setNotifications] = useState<LhuDocument[]>([]);
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  const [resubmitDoc, setResubmitDoc] = useState<LhuDocument | null>(null);
  const [trackingDoc, setTrackingDoc] = useState<LhuDocument | null>(null);

  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyTechFilter, setHistoryTechFilter] = useState('ALL');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    const loadUserName = async () => {
      setUserName(localStorage.getItem('lhu_user_name') || 'Admin PROLAB');
      const loggedUserStr = localStorage.getItem('lhu_logged_user');
      if (loggedUserStr) {
        const userObj = JSON.parse(loggedUserStr);
        setAdminKomoditi(userObj.komoditi || null);
        setAdminDepartemen(userObj.departemen || null);
        try {
          const { data, error } = await supabase
            .from('lhu_users')
            .select('komoditi, departemen, allowed_komoditi, allowed_departemen')
            .eq('username', userObj.username)
            .single();
          if (!error && data) {
            setAdminKomoditi(data.komoditi || null);
            setAdminDepartemen(data.departemen || null);
            setAllowedKomoditi(data.allowed_komoditi || null);
            setAllowedDepartemen(data.allowed_departemen || null);
          }
        } catch (e) {
          console.error('Failed to load user permissions from DB:', e);
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
  }, [activeDivisi]);

  useEffect(() => {
    if (allDocuments.length > 0 && userName) {
      const myDocs = filterByPermissions(allDocuments).filter(d => d.uploaded_by === userName);
      const lastCheckedStr = localStorage.getItem('lhu_admin_last_checked_notifs_time');
      if (lastCheckedStr) {
        const lastChecked = new Date(lastCheckedStr).getTime();
        const newNotifs = myDocs.filter(doc => {
          const updateTime = new Date(doc.updated_at).getTime();
          return updateTime > lastChecked && (doc.status === 'APPROVED' || doc.status === 'REJECTED');
        });
        if (newNotifs.length > 0) {
          setNotifications(newNotifs);
          setShowNotifBanner(true);
        }
      } else {
        localStorage.setItem('lhu_admin_last_checked_notifs_time', new Date().toISOString());
      }
    }
  }, [allDocuments, userName]);

  const clearNotifications = () => {
    localStorage.setItem('lhu_admin_last_checked_notifs_time', new Date().toISOString());
    setNotifications([]);
    setShowNotifBanner(false);
  };

  const handleDuplicate = (title: string) => {
    localStorage.setItem('lhu_admin_draft_title', title + ' - Copy');
    alert('Judul LHU berhasil diduplikasi ke draf. Mengalihkan ke halaman Unggah LHU...');
    logAudit(userName, 'admin', 'DUPLICATE_LHU', `Menduplikasi pengujian LHU: ${title}`);
    window.location.href = `/admin/${encodeURIComponent(activeDivisi || 'ALL')}/upload`;
  };

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
      console.error('Gagal mengambil data LHU:', err);
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

  const isDocSlaOverdue = (created_at: string) => {
    const uploadTime = new Date(created_at).getTime();
    const now = new Date().getTime();
    const durationHours = (now - uploadTime) / (1000 * 60 * 60);
    return durationHours > 24;
  };

  const filterByPermissions = (docs: LhuDocument[]) => {
    const activeAllowedKomoditi = (allowedKomoditi && allowedKomoditi.length > 0) 
      ? allowedKomoditi 
      : (adminKomoditi ? [adminKomoditi] : []);

    const activeAllowedDepartemen = (allowedDepartemen && allowedDepartemen.length > 0)
      ? allowedDepartemen
      : (adminDepartemen ? [adminDepartemen] : []);

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
  const pendingDocs = filteredAll.filter(d => d.status === 'PENDING_ADMIN');
  const historyDocs = filteredAll.filter(d => d.checked_by === userName || d.status === 'APPROVED' || d.status === 'REJECTED' || d.status === 'PENDING_MANAGER');
  
  const myUploadsDocs = filteredAll.filter(d => d.uploaded_by === userName);

  const totalSubmissions = myUploadsDocs.length;
  const pendingVerifications = myUploadsDocs.filter(d => d.status === 'PENDING_ADMIN' || d.status === 'PENDING_SUPERVISOR' || d.status === 'PENDING_NUMBERING').length;
  const approvedSubmissions = myUploadsDocs.filter(d => d.status === 'APPROVED').length;
  const rejectedSubmissions = myUploadsDocs.filter(d => d.status === 'REJECTED').length;

  const totalPending = pendingDocs.length;
  const overduePending = pendingDocs.filter(d => isDocSlaOverdue(d.created_at)).length;

  return (
    <div className="w-full text-theme-text animate-fade-in">
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-theme-border pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text">Riwayat Dokumen</h2>
          <p className="text-sm text-theme-muted mt-1">
            Pantau unggahan Anda dan lihat riwayat verifikasi. Admin aktif: <span className="text-status-blue-text font-semibold">{userName}</span>
          </p>
        </div>
        <img src="/logo2.png" alt="PROLAB Logo" className="h-10 object-contain prolab-logo" />
      </header>

      {showNotifBanner && notifications.length > 0 && (
        <div className="mb-6 bg-status-blue-bg border border-status-blue-border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-fade-in shadow-lg">
          <div className="flex gap-3">
            <span className="text-status-orange-text font-bold shrink-0 mt-0.5 animate-bounce">🔔</span>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-theme-text">Pemberitahuan Status Terbaru LHU</span>
              <p className="text-[11px] text-theme-muted">
                Ada {notifications.length} pembaruan status pada pengajuan Anda:
              </p>
              <ul className="list-disc pl-4 text-[10px] text-theme-muted mt-1 flex flex-col gap-0.5">
                {notifications.map((notif, idx) => (
                  <li key={idx}>
                    <span className="font-mono font-bold">{notif.status === 'APPROVED' && notif.kode_lhu ? notif.kode_lhu : formatLhuNumber(notif.nomor_lhu, notif.tipe_dokumen)}</span> - {notif.judul} ({notif.status === 'APPROVED' ? 'Disetujui' : 'Ditolak/Butuh Revisi'})
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button 
            onClick={clearNotifications}
            className="text-[10px] bg-status-blue-bg hover:bg-status-blue-bg text-theme-text font-bold px-3 py-1.5 rounded-lg transition-all self-end md:self-auto cursor-pointer"
          >
            Tandai Dibaca
          </button>
        </div>
      )}

      <div className="flex gap-2 border-b border-theme-border pb-3 mb-6">
        <button
          onClick={() => setHistoryTab('my_uploads')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            historyTab === 'my_uploads'
              ? 'bg-status-blue-bg text-status-blue-text border border-status-blue-border'
              : 'bg-theme-card hover:bg-theme-hover text-theme-muted border border-theme-border'
          }`}
        >
          📤 Unggahan Saya ({myUploadsDocs.length})
        </button>
        <button
          onClick={() => setHistoryTab('all_history')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            historyTab === 'all_history'
              ? 'bg-status-emerald-bg text-status-emerald-text border border-status-emerald-border'
              : 'bg-theme-card hover:bg-theme-hover text-theme-muted border border-theme-border'
          }`}
        >
          📋 Riwayat Divisi {activeDivisi && activeDivisi !== 'ALL' ? activeDivisi : (adminKomoditi && adminKomoditi !== 'ALL' ? adminKomoditi : 'Semua')} ({historyDocs.length})
        </button>
      </div>

      {historyTab === 'my_uploads' ? (
        <>
          <AdminUploadStatsCards 
            total={totalSubmissions}
            pending={pendingVerifications}
            approved={approvedSubmissions}
            rejected={rejectedSubmissions}
          />
          <div className="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xl relative mt-6">
            <AdminUploadHistoryList 
              historyDocs={myUploadsDocs}
              loadingHistory={loading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              formatLhuNumber={formatLhuNumber}
              renderStatusBadge={renderStatusBadge}
              isDocSlaOverdue={isDocSlaOverdue}
              handleDuplicate={handleDuplicate}
              setTrackingDoc={setTrackingDoc}
              setResubmitDoc={setResubmitDoc}
              getDownloadUrl={getDownloadUrl}
            />
          </div>
        </>
      ) : (
        <>
          <StatsCards 
            totalPending={totalPending}
            overduePending={overduePending}
          />
          <div className="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xl relative mt-6">
            <HistoryList 
              historyDocs={historyDocs}
              historySearchQuery={historySearchQuery}
              setHistorySearchQuery={setHistorySearchQuery}
              historyTechFilter={historyTechFilter}
              setHistoryTechFilter={setHistoryTechFilter}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              formatLhuNumber={formatLhuNumber}
              renderStatusBadge={renderStatusBadge}
              setPreviewDoc={setPreviewDoc}
            />
          </div>
        </>
      )}

      {previewDoc && (
        <DocumentPreviewModal 
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          formatLhuNumber={formatLhuNumber}
          getDownloadUrl={getDownloadUrl}
          renderStatusBadge={renderStatusBadge}
        />
      )}

      {resubmitDoc && (
        <ResubmitModal
          document={resubmitDoc}
          onClose={() => setResubmitDoc(null)}
          onRefresh={fetchDocuments}
          formatLhuNumber={formatLhuNumber}
        />
      )}

      {trackingDoc && (
        <TimelineDrawer
          document={trackingDoc}
          onClose={() => setTrackingDoc(null)}
          formatLhuNumber={formatLhuNumber}
        />
      )}
    </div>
  );
}
