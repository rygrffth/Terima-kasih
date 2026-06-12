"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { LhuDocument } from '../../../types';
import DocumentPreviewModal from '../../../components/DocumentPreviewModal';
import ResubmitModal from '../../../components/ResubmitModal';
import { logAudit } from '../../../lib/audit';

import StatsCards from '../components/StatsCards';
import BatchPanel from '../components/BatchPanel';
import PendingQueue from '../components/PendingQueue';
import NumberingQueue from '../components/NumberingQueue';

export default function PendingVerificationPage() {
  const params = useParams();
  const activeDivisi = params?.divisi ? decodeURIComponent(params.divisi as string) : null;
  const [userName, setUserName] = useState('Admin PROLAB');
   const [allowedKomoditi, setAllowedKomoditi] = useState<string[] | null>(null);
  const [allowedDepartemen, setAllowedDepartemen] = useState<string[] | null>(null);
  const [adminKomoditi, setAdminKomoditi] = useState<string | null>(null);
  const [adminDepartemen, setAdminDepartemen] = useState<string | null>(null);
  const [allDocuments, setAllDocuments] = useState<LhuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<LhuDocument | null>(null);
  const [resubmitDoc, setResubmitDoc] = useState<LhuDocument | null>(null);
  const [taskTab, setTaskTab] = useState<'numbering' | 'revision'>('numbering');

  const [searchQuery, setSearchQuery] = useState('');
  const [techFilter, setTechFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [batchNote, setBatchNote] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

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
      console.error('Gagal mengambil data LHU:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleNoteChange = (docId: string, value: string) => {
    setActionNotes(prev => ({ ...prev, [docId]: value }));
  };

  const handleAdminAction = async (docId: string, action: 'approve') => {
    const note = actionNotes[docId] || '';
    const nextStatus = 'PENDING_SUPERVISOR';
    const docObj = allDocuments.find(d => d.id === docId);
    const docNum = docObj ? (docObj.status === 'APPROVED' && docObj.kode_lhu ? docObj.kode_lhu : formatLhuNumber(docObj.nomor_lhu, docObj.tipe_dokumen)) : docId;
    const docTitle = docObj ? docObj.judul : '';
    
    try {
      const { error } = await supabase
        .from('lhu_document')
        .update({
          status: nextStatus,
          catatan_admin: note,
          checked_by: userName,
          checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      await logAudit(
        userName,
        'admin',
        'VERIFY_LHU_APPROVE',
        `Memeriksa LHU: ${docNum} - ${docTitle} (Disetujui)`
      );

      setActionNotes(prev => ({ ...prev, [docId]: '' }));
      alert('Revisi berhasil dikirim kembali ke Supervisor.');
      fetchDocuments();
    } catch (err: any) {
      alert('Gagal menyimpan hasil pemeriksaan: ' + err.message);
    }
  };

  const handleBatchAction = async (action: 'approve') => {
    if (selectedDocIds.length === 0) return;
    
    const confirmMsg = `Setujui & ajukan ${selectedDocIds.length} berkas LHU terpilih ke Supervisor?`;
      
    if (!window.confirm(confirmMsg)) return;

    setIsProcessingBatch(true);
    const nextStatus = 'PENDING_SUPERVISOR';
    
    try {
      const promises = selectedDocIds.map(async (docId) => {
        const docObj = allDocuments.find(d => d.id === docId);
        const docNum = docObj ? (docObj.status === 'APPROVED' && docObj.kode_lhu ? docObj.kode_lhu : formatLhuNumber(docObj.nomor_lhu, docObj.tipe_dokumen)) : docId;
        const docTitle = docObj ? docObj.judul : '';

        const { error } = await supabase
          .from('lhu_document')
          .update({
            status: nextStatus,
            catatan_admin: batchNote || 'Pemeriksaan batch admin',
            checked_by: userName,
            checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', docId);

        if (error) throw error;

        await logAudit(
          userName, 
          'admin', 
          action === 'approve' ? 'BATCH_VERIFY_LHU_APPROVE' : 'BATCH_VERIFY_LHU_REJECT', 
          `Batch ${action === 'approve' ? 'menyetujui' : 'menolak'} berkas LHU: ${docNum} - ${docTitle}`
        );
      });

      await Promise.all(promises);

      alert(`Sukses memproses ${selectedDocIds.length} berkas secara batch.`);
      setSelectedDocIds([]);
      setBatchNote('');
      fetchDocuments();
    } catch (err: any) {
      alert('Gagal memproses batch: ' + err.message);
    } finally {
      setIsProcessingBatch(false);
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

  const calculateSla = (dateString: string): { text: string; class: string } => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return { text: 'Baru saja', class: '' };
    if (diffMins < 60) return { text: `Menunggu ${diffMins} mnt`, class: '' };
    if (diffHours < 24) {
      return { text: `Menunggu ${diffHours} jam`, class: diffHours >= 4 ? 'warning' : '' };
    }
    return { text: `Menunggu ${diffDays} hari`, class: 'danger' };
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
  const numberingDocs = filteredAll.filter(d => d.status === 'PENDING_NUMBERING');
  const totalPending = pendingDocs.length + numberingDocs.length;
  const overduePending = pendingDocs.filter(d => isDocSlaOverdue(d.updated_at || d.created_at)).length + numberingDocs.filter(d => isDocSlaOverdue(d.created_at)).length;

  return (
    <div className="w-full text-theme-text animate-fade-in">
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-theme-border pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text">Tugas Aktif Admin</h2>
          <p className="text-sm text-theme-muted mt-1">
            Kelola penomoran berkas baru dan perbaikan revisi. Admin aktif: <span className="text-status-blue-text font-semibold">{userName}</span>
          </p>
        </div>
        <img src="/logo2.png" alt="PROLAB Logo" className="h-10 object-contain prolab-logo" />
      </header>

      <StatsCards 
        totalPending={totalPending}
        overduePending={overduePending}
      />

      <div className="flex gap-2 border-b border-theme-border pb-3 mb-6">
        <button
          onClick={() => setTaskTab('numbering')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            taskTab === 'numbering'
              ? 'bg-status-blue-bg text-status-blue-text border border-status-blue-border'
              : 'bg-theme-card hover:bg-theme-hover text-theme-muted border border-theme-border'
          }`}
        >
          🔢 Belum Ada Nomor ({numberingDocs.length})
        </button>
        <button
          onClick={() => setTaskTab('revision')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            taskTab === 'revision'
              ? 'bg-status-red-bg text-status-red-text border border-status-red-border'
              : 'bg-theme-card hover:bg-theme-hover text-theme-muted border border-theme-border'
          }`}
        >
          ⚠️ Perlu Revisi ({pendingDocs.length})
        </button>
      </div>

      <div className="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xl relative">
        {taskTab === 'numbering' ? (
          <NumberingQueue 
            numberingDocs={numberingDocs}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            techFilter={techFilter}
            setTechFilter={setTechFilter}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            formatLhuNumber={formatLhuNumber}
            calculateSla={calculateSla}
            setPreviewDoc={setPreviewDoc}
            getDownloadUrl={getDownloadUrl}
            onRefresh={fetchDocuments}
            userName={userName}
          />
        ) : (
          <PendingQueue 
            pendingDocs={pendingDocs}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            techFilter={techFilter}
            setTechFilter={setTechFilter}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            selectedDocIds={selectedDocIds}
            setSelectedDocIds={setSelectedDocIds}
            actionNotes={actionNotes}
            handleNoteChange={handleNoteChange}
            handleAdminAction={handleAdminAction}
            formatLhuNumber={formatLhuNumber}
            calculateSla={calculateSla}
            setPreviewDoc={setPreviewDoc}
            getDownloadUrl={getDownloadUrl}
            setResubmitDoc={setResubmitDoc}
          />
        )}
      </div>

      {taskTab === 'revision' && (
        <BatchPanel 
          selectedDocIds={selectedDocIds}
          setSelectedDocIds={setSelectedDocIds}
          batchNote={batchNote}
          setBatchNote={setBatchNote}
          isProcessingBatch={isProcessingBatch}
          handleBatchAction={handleBatchAction}
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
