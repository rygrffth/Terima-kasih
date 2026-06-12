"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { dbAdapter } from '../../../lib/dbAdapter';
import { ApproveDocumentCommand, RejectDocumentCommand } from '../../../lib/commands';
import { LhuDocument } from '../../../types';
import DocumentPreviewModal from '../../../components/DocumentPreviewModal';
import PdfAnnotatorModal from '../../../components/PdfAnnotatorModal';
import { logAudit } from '../../../lib/audit';
import { ShieldCheck } from 'lucide-react';

import StatsCards from '../components/StatsCards';
import BatchPanel from '../components/BatchPanel';
import PendingQueue from '../components/PendingQueue';

const CHECKLIST_ITEMS = [
  { id: 'identitas', label: 'Kesesuaian Identitas & ID Sampel dengan berkas fisik' },
  { id: 'metode', label: 'Metode pengujian sesuai dengan standar akreditasi KAN' },
  { id: 'nilai', label: 'Nilai hasil pengujian & ketidakpastian tercantum lengkap' },
  { id: 'ttd', label: 'Tanda tangan verifikasi pengaju lengkap' }
];

export default function PendingAuditPage() {
  const params = useParams();
  const activeDivisi = params?.divisi ? decodeURIComponent(params.divisi as string) : null;
  const [userName, setUserName] = useState('Supervisor PROLAB');
  const [supervisorDepartemen, setSupervisorDepartemen] = useState<string | null>(null);
  const [supervisorKomoditi, setSupervisorKomoditi] = useState<string | null>(null);
  const [allowedKomoditi, setAllowedKomoditi] = useState<string[] | null>(null);
  const [allowedDepartemen, setAllowedDepartemen] = useState<string[] | null>(null);
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [allDocuments, setAllDocuments] = useState<LhuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<LhuDocument | null>(null);
  const [annotatingDocId, setAnnotatingDocId] = useState<string | null>(null);
  const [checklistValues, setChecklistValues] = useState<Record<string, Record<string, boolean>>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [techFilter, setTechFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest');

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [batchNote, setBatchNote] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

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

    const loadTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('lhu_checklist_templates')
          .select('*');
        if (!error && data) {
          setChecklistTemplates(data);
        }
      } catch (err) {
        console.error('Failed to load checklist templates:', err);
      }
    };

    loadUserName();
    loadTemplates();
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
      const data = await dbAdapter.getAllDocuments();
      setAllDocuments(data);
    } catch (err) {
      console.error('Gagal mengambil data LHU untuk Supervisor:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getChecklistItemsForDoc = (doc: LhuDocument) => {
    if (!doc.komoditi) return CHECKLIST_ITEMS;
    const template = checklistTemplates.find(t => t.komoditi === doc.komoditi);
    if (template && template.checklist_items && template.checklist_items.length > 0) {
      return template.checklist_items.map((label: string, index: number) => ({
        id: `item_${index}`,
        label
      }));
    }
    return CHECKLIST_ITEMS;
  };

  const handleChecklistChange = (docId: string, itemId: string, val: boolean) => {
    setChecklistValues(prev => ({
      ...prev,
      [docId]: {
        ...(prev[docId] || {}),
        [itemId]: val
      }
    }));
  };

  const areAllChecklistChecked = (doc: LhuDocument) => {
    const docChecklist = checklistValues[doc.id] || {};
    const items = getChecklistItemsForDoc(doc);
    return items.every((item: any) => docChecklist[item.id] === true);
  };

  const handleNoteChange = (docId: string, value: string) => {
    setActionNotes(prev => ({ ...prev, [docId]: value }));
  };

  const handleSupervisorAction = async (docId: string, action: 'approve' | 'reject') => {
    const note = actionNotes[docId] || '';
    const nextStatus = action === 'approve' ? 'PENDING_NUMBERING' : 'PENDING_ADMIN';
    const docObj = allDocuments.find(d => d.id === docId);

    if (!docObj) {
      alert('Dokumen tidak ditemukan.');
      return;
    }

    const items = getChecklistItemsForDoc(docObj);
    const docChecklist = checklistValues[docId] || {};
    const checkedLabels = items
      .filter((item: any) => docChecklist[item.id] === true)
      .map((item: any) => item.label);

    try {
      let command;
      if (action === 'approve') {
        command = new ApproveDocumentCommand(docObj, nextStatus, note, userName, checkedLabels);
      } else {
        command = new RejectDocumentCommand(docObj, note, userName, checkedLabels);
      }

      await command.execute();

      setActionNotes(prev => ({ ...prev, [docId]: '' }));
      alert(action === 'approve' ? 'Dokumen disetujui, siap untuk diberi nomor.' : 'Dokumen dikembalikan ke Admin untuk direvisi.');
      fetchDocuments();
    } catch (err: any) {
      alert('Gagal memproses dokumen: ' + err.message);
    }
  };

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    if (selectedDocIds.length === 0) return;
    
    const confirmMsg = action === 'approve' 
      ? `Audit & setujui penomoran untuk ${selectedDocIds.length} berkas LHU terpilih?`
      : `Tolak ${selectedDocIds.length} berkas LHU terpilih?`;
      
    if (!window.confirm(confirmMsg)) return;

    setIsProcessingBatch(true);
    const nextStatus = action === 'approve' ? 'PENDING_NUMBERING' : 'PENDING_ADMIN';
    
    try {
      const promises = selectedDocIds.map(async (docId) => {
        const docObj = allDocuments.find(d => d.id === docId);
        const docNum = docObj ? (docObj.status === 'APPROVED' && docObj.kode_lhu ? docObj.kode_lhu : formatLhuNumber(docObj.nomor_lhu, docObj.tipe_dokumen)) : docId;
        const docTitle = docObj ? docObj.judul : '';

        const items = docObj ? getChecklistItemsForDoc(docObj) : [];
        const docChecklist = checklistValues[docId] || {};
        const checkedLabels = items
          .filter((item: any) => docChecklist[item.id] === true)
          .map((item: any) => item.label);
        const allCheckedLabels = items.map((item: any) => item.label);

        const { error } = await supabase
          .from('lhu_document')
          .update({
            status: nextStatus,
            catatan_spv: batchNote || (action === 'approve' ? 'Audit batch supervisor' : 'Ditolak via batch'),
            checked_supervisor_by: userName,
            spv_checklist: action === 'approve' ? allCheckedLabels : checkedLabels,
            updated_at: new Date().toISOString()
          })
          .eq('id', docId);

        if (error) throw error;

        await logAudit(
          userName, 
          'supervisor', 
          action === 'approve' ? 'BATCH_AUDIT_LHU_APPROVE' : 'BATCH_AUDIT_LHU_RETURN', 
          `Batch supervisor ${action === 'approve' ? 'menyetujui penomoran' : 'mengembalikan ke admin'}: ${docNum} - ${docTitle}`
        );
      });

      await Promise.all(promises);

      alert(`Sukses memproses batch untuk ${selectedDocIds.length} berkas.`);
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

  const calculateSla = (dateString: string) => {
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

  let filteredPending = pendingDocs.filter(doc => {
    const docNumStr = doc.kode_lhu || `LHU-${String(doc.nomor_lhu || '').padStart(3, '0')}`;
    const matchSearch = 
      (doc.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.uploaded_by || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      docNumStr.toLowerCase().includes(searchQuery.toLowerCase());
    
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
    const matchTech = techFilter === 'ALL' || doc.uploaded_by === techFilter;
    return matchSearch && matchDate && matchTech;
  });

  filteredPending = [...filteredPending].sort((a, b) => {
    const aUrgent = a.priority === 'urgent' ? 1 : 0;
    const bUrgent = b.priority === 'urgent' ? 1 : 0;
    if (aUrgent !== bUrgent) {
      return bUrgent - aUrgent;
    }
    if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortOrder === 'lhu_desc') return b.nomor_lhu - a.nomor_lhu;
    if (sortOrder === 'lhu_asc') return a.nomor_lhu - b.nomor_lhu;
    return 0;
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
        <PendingQueue
          loading={loading}
          filteredPending={filteredPending}
          pendingDocs={pendingDocs}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          techFilter={techFilter}
          setTechFilter={setTechFilter}
          selectedDocIds={selectedDocIds}
          setSelectedDocIds={setSelectedDocIds}
          checklistValues={checklistValues}
          handleChecklistChange={handleChecklistChange}
          areAllChecklistChecked={areAllChecklistChecked}
          actionNotes={actionNotes}
          handleNoteChange={handleNoteChange}
          handleSupervisorAction={handleSupervisorAction}
          formatLhuNumber={formatLhuNumber}
          calculateSla={calculateSla}
          setPreviewDoc={setPreviewDoc}
          getChecklistItemsForDoc={getChecklistItemsForDoc}
        />
      </div>

      <BatchPanel
        selectedDocIds={selectedDocIds}
        setSelectedDocIds={setSelectedDocIds}
        batchNote={batchNote}
        setBatchNote={setBatchNote}
        isProcessingBatch={isProcessingBatch}
        handleBatchAction={handleBatchAction}
      />

      {previewDoc && !annotatingDocId && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          formatLhuNumber={formatLhuNumber}
          getDownloadUrl={getDownloadUrl}
          renderStatusBadge={renderStatusBadge}
          onAnnotateClick={() => setAnnotatingDocId(previewDoc.id)}
        />
      )}

      {annotatingDocId && previewDoc && (
        <PdfAnnotatorModal
          fileUrl={getDownloadUrl(previewDoc.file_path)}
          documentId={annotatingDocId}
          onClose={() => setAnnotatingDocId(null)}
          onSaved={(annotatedPath) => {
            const updatedDoc = { ...previewDoc, annotated_file_path: annotatedPath };
            setPreviewDoc(updatedDoc);
            
            fetchDocuments();
            
            setAnnotatingDocId(null);
          }}
        />
      )}
    </div>
  );
}
