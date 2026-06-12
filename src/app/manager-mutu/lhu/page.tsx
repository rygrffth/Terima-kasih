"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { LhuDocument } from '../../../types';
import { logAudit } from '../../../lib/audit';
import DocumentPreviewModal from '../../../components/DocumentPreviewModal';
import LhuTab from '../components/LhuTab';
import { XCircle, Copy, Check, Send } from 'lucide-react';

export default function LhuPage() {
  const [userName, setUserName] = useState('Manager QHSE PROLAB');
  const [userRole, setUserRole] = useState('');
  const [userDept, setUserDept] = useState('');
  const [pendingDocs, setPendingDocs] = useState<LhuDocument[]>([]);
  const [approvedDocs, setApprovedDocs] = useState<LhuDocument[]>([]);
  const [monitoringDocs, setMonitoringDocs] = useState<LhuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  
  const [previewDoc, setPreviewDoc] = useState<LhuDocument | null>(null);
  const [qrModalDoc, setQrModalDoc] = useState<LhuDocument | null>(null);
  
  const [techPhone, setTechPhone] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [lhuSubTab, setLhuSubTab] = useState<'pending' | 'approved' | 'all'>('pending');

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [techFilter, setTechFilter] = useState('ALL');
  const [commodityFilter, setCommodityFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  useEffect(() => {
    fetchDocuments();
    const loadUserName = () => {
      setUserName(localStorage.getItem('lhu_user_name') || 'Manager QHSE PROLAB');
      const stored = localStorage.getItem('lhu_logged_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setUserRole(u.role || '');
          setUserDept(u.departemen || '');
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadUserName();
    window.addEventListener('userNameChanged', loadUserName);
    const handleDocChanged = () => fetchDocuments(true);
    window.addEventListener('lhu_document_changed', handleDocChanged);
    setTechPhone(localStorage.getItem('lhu_teknisi_wa_number') || '');

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
      const documents = (data as LhuDocument[]) || [];
      setMonitoringDocs(documents);
      setPendingDocs(documents.filter(d => d.status === 'PENDING_MANAGER'));
      setApprovedDocs(documents.filter(d => d.status === 'APPROVED'));
    } catch (err) {
      console.error('Gagal mengambil berkas Manager QHSE:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleNoteChange = (docId: string, value: string) => {
    setActionNotes(prev => ({ ...prev, [docId]: value }));
  };

  const handleManagerAction = async (docId: string, action: 'approve' | 'reject') => {
    const note = actionNotes[docId] || '';
    const nextStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const docObj = monitoringDocs.find(d => d.id === docId);
    const docNum = docObj ? (docObj.status === 'APPROVED' && docObj.kode_lhu ? docObj.kode_lhu : formatLhuNumber(docObj.nomor_lhu, docObj.tipe_dokumen)) : docId;
    const docTitle = docObj ? docObj.judul : '';

    try {
      const { error } = await supabase
        .from('lhu_document')
        .update({
          status: nextStatus,
          catatan_spv: note,
          approved_by: userName,
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      await logAudit(
        userName, 
        'manager_mutu', 
        action === 'approve' ? 'MANAGER_LHU_APPROVE' : 'MANAGER_LHU_REJECT', 
        `Persetujuan akhir Manager QHSE: ${docNum} - ${docTitle} (${action === 'approve' ? 'Disetujui / Terbit' : 'Ditolak'})`
      );

      setActionNotes(prev => ({ ...prev, [docId]: '' }));
      alert(action === 'approve' ? 'Dokumen berhasil disetujui dan diterbitkan.' : 'Dokumen ditolak.');
      fetchDocuments();
    } catch (err: any) {
      alert('Gagal memproses persetujuan Manager QHSE: ' + err.message);
    }
  };

  const handleDeleteDoc = async (doc: LhuDocument) => {
    const docCode = doc.status === 'APPROVED' && doc.kode_lhu ? doc.kode_lhu : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen);
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus dokumen "${docCode} - ${doc.judul}" secara permanen? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    try {
      const { data: attachments } = await supabase
        .from('lhu_attachments')
        .select('file_path')
        .eq('doc_id', doc.id);

      const { error: deleteError } = await supabase
        .from('lhu_document')
        .delete()
        .eq('id', doc.id);

      if (deleteError) throw deleteError;

      if (doc.file_path && !doc.file_path.startsWith('fallback_path/')) {
        await supabase.storage
          .from('lhu-documents')
          .remove([doc.file_path]);
      }

      if (attachments && attachments.length > 0) {
        const filePaths = attachments.map(att => att.file_path).filter(p => p && !p.startsWith('fallback_path/'));
        if (filePaths.length > 0) {
          await supabase.storage
            .from('lhu-documents')
            .remove(filePaths);
        }
      }

      await logAudit(
        userName,
        'manager_mutu',
        'MANAGER_LHU_DELETE',
        `Menghapus dokumen LHU secara permanen: ${docCode} - ${doc.judul}`
      );

      alert('Dokumen berhasil dihapus secara permanen.');
      fetchDocuments();
    } catch (err: any) {
      console.error('Gagal menghapus dokumen:', err);
      alert('Gagal menghapus dokumen: ' + err.message);
    }
  };

  const exportToCsv = () => {
    if (approvedDocs.length === 0) {
      alert('Tidak ada berkas yang disetujui untuk diekspor.');
      return;
    }
    const headers = ['Nomor LHU', 'Kode LHU', 'Judul LHU', 'Departemen', 'Jenis Dokumen', 'Pengaju Dokumen', 'Tanggal Pengajuan', 'Verifikator Admin', 'Auditor Supervisor', 'Penerbit Nomor', 'Tanggal Terbit'];
    const rows = approvedDocs.map(doc => [
      formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen),
      doc.kode_lhu || '-',
      `"${doc.judul.replace(/"/g, '""')}"`,
      doc.komoditi || '-',
      doc.departemen || '-',
      doc.uploaded_by,
      new Date(doc.created_at).toLocaleString('id-ID'),
      doc.checked_by || '-',
      doc.checked_supervisor_by || '-',
      doc.approved_by || '-',
      new Date(doc.updated_at).toLocaleString('id-ID')
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Approved_LHU_PROLAB_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-red-bg border border-status-red-border text-status-red-text">Perlu Direvisi</span>;
      case 'PENDING_SUPERVISOR':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-amber-bg border border-status-amber-border text-status-amber-text">Cek Supervisor</span>;
      case 'PENDING_MANAGER':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-orange-bg border border-status-orange-border text-status-orange-text">Cek Manager QHSE</span>;
      case 'APPROVED':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text">Disetujui (Valid)</span>;
      case 'REJECTED':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-red-bg border border-status-red-border text-status-red-text">Ditolak</span>;
      default:
        return null;
    }
  };

  const formatPhoneNumber = (num: string): string => {
    let cleaned = num.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('62') && cleaned.length > 0) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  const getWhatsAppLink = (doc: LhuDocument): string => {
    const docNumber = doc.status === 'APPROVED' && doc.kode_lhu ? doc.kode_lhu : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen);
    const message = `Halo, Dokumen *${docNumber}* ("${doc.judul}") telah disetujui oleh Manager QHSE dan resmi diterbitkan di E-Dokumen! Silakan cek di dasbor atau scan kode validasi Anda. Terima kasih!`;
    const formattedPhone = formatPhoneNumber(techPhone);
    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const handleWaClick = () => {
    if (techPhone.trim()) {
      localStorage.setItem('lhu_teknisi_wa_number', techPhone);
    }
  };

  const handleFollowUp = (doc: LhuDocument) => {
    const defaultPhone = localStorage.getItem('lhu_followup_wa') || '';
    const phone = window.prompt('Masukkan nomor WhatsApp tujuan (Admin/Supervisor):', defaultPhone);
    if (phone === null) return;
    
    if (!phone.trim()) {
      alert('Nomor WhatsApp harus diisi.');
      return;
    }
    localStorage.setItem('lhu_followup_wa', phone);
    
    let message = '';
    const docCode = doc.status === 'APPROVED' && doc.kode_lhu ? doc.kode_lhu : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen);
    
    if (doc.status === 'PENDING_ADMIN') {
      message = `Halo, mohon bantuan untuk memeriksa berkas dokumen ${docCode} ("${doc.judul}") yang diunggah oleh ${doc.uploaded_by} agar dapat diteruskan ke Supervisor. Terima kasih!`;
    } else if (doc.status === 'PENDING_SUPERVISOR') {
      message = `Halo, mohon bantuan untuk melakukan audit berkas dokumen ${docCode} ("${doc.judul}") agar dapat diteruskan ke Manager QHSE. Terima kasih!`;
    } else if (doc.status === 'PENDING_MANAGER') {
      message = `Halo, mohon bantuan untuk menyetujui berkas dokumen ${docCode} ("${doc.judul}") yang telah diaudit oleh Supervisor.`;
    } else if (doc.status === 'REJECTED') {
      message = `Halo, berkas dokumen ${docCode} ("${doc.judul}") ditolak. Mohon periksa catatan penolakan dan segera diperbaiki. Terima kasih!`;
    } else {
      message = `Halo, berkas dokumen ${docCode} ("${doc.judul}") telah disetujui dan diterbitkan di aplikasi E-Dokumen.`;
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    const link = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.open(link, '_blank');
  };

  const getVerificationUrl = (docId: string): string => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/verify?id=${docId}`;
    }
    return '';
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    copiedLinkHelper();
  };

  const copiedLinkHelper = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isPhoneValid = techPhone.replace(/\D/g, '').length >= 9;

  const isDirektur = userRole === 'direktur' || userDept?.toLowerCase() === 'direktur';

  return (
    <div className="w-full text-theme-text animate-fade-in">
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-theme-border pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text flex items-center gap-2">
            🛡️ {isDirektur ? 'Halaman Dashboard Direktur' : 'Halaman Dashboard Manager QHSE'}
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border ${
              isDirektur 
                ? 'bg-status-purple-bg text-status-purple-text border-status-purple-border' 
                : 'bg-status-rose-bg text-status-rose-text border-status-rose-border'
            }`}>
              {isDirektur ? 'DIREKTUR ACCESS' : 'MANAGER QHSE ACCESS'}
            </span>
          </h2>
          <p className="text-sm text-theme-muted mt-1">
            {isDirektur ? 'Direktur aktif:' : 'Manager aktif:'} <span className={isDirektur ? 'text-status-purple-text font-semibold' : 'text-status-rose-text font-semibold'}>{userName}</span>
          </p>
        </div>
        <img src="/logo2.png" alt="PROLAB Logo" className="h-10 object-contain prolab-logo" />
      </header>

      <div className={`bg-theme-card border-t-2 ${isDirektur ? 'border-t-purple-500' : 'border-t-rose-500'} border-x border-b border-theme-border rounded-2xl p-6 shadow-xl relative`}>
        <LhuTab 
          pendingDocs={pendingDocs}
          approvedDocs={approvedDocs}
          monitoringDocs={monitoringDocs}
          loading={loading}
          lhuSubTab={lhuSubTab}
          setLhuSubTab={setLhuSubTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          techFilter={techFilter}
          setTechFilter={setTechFilter}
          commodityFilter={commodityFilter}
          setCommodityFilter={setCommodityFilter}
          deptFilter={deptFilter}
          setDeptFilter={setDeptFilter}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          actionNotes={actionNotes}
          handleNoteChange={handleNoteChange}
          handleManagerAction={handleManagerAction}
          exportToCsv={exportToCsv}
          formatLhuNumber={formatLhuNumber}
          setQrModalDoc={setQrModalDoc}
          setPreviewDoc={setPreviewDoc}
          handleFollowUp={handleFollowUp}
          handleDeleteDoc={handleDeleteDoc}
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

      {qrModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-base/80 backdrop-blur-sm">
          <div className="bg-theme-card border border-theme-border rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl">
            <button 
              onClick={() => setQrModalDoc(null)}
              className="absolute top-4 right-4 text-theme-muted hover:text-theme-text transition-all"
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-md font-bold text-theme-text mb-2">QR Code Validasi Dokumen</h3>
            <p className="text-xs text-theme-muted mb-6">
              Scan QR code ini untuk memverifikasi keaslian dokumen secara online.
            </p>
            <div className="bg-white p-5 rounded-2xl inline-block mb-6 shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getVerificationUrl(qrModalDoc.id))}`}
                alt="Verification QR Code"
                className="w-40 h-40 object-contain"
              />
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <div className="flex w-full bg-theme-input border border-theme-border rounded-xl overflow-hidden mb-2">
                <input 
                  type="text" 
                  readOnly 
                  className="bg-transparent px-4 py-2.5 text-[10px] text-theme-muted outline-none flex-1 truncate"
                  value={getVerificationUrl(qrModalDoc.id)}
                />
                <button
                  onClick={() => handleCopyLink(getVerificationUrl(qrModalDoc.id))}
                  className="bg-theme-card hover:bg-theme-hover p-2.5 border-l border-theme-border text-theme-muted transition-all cursor-pointer"
                  title="Salin Link"
                >
                  {copiedLink ? <Check size={14} className="text-status-emerald-text" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="w-full text-left mb-6 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-theme-muted">Nomor WhatsApp Penerima (Pengaju)</label>
                <input 
                  type="text" 
                  className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
                  placeholder="Contoh: 08123456789"
                  value={techPhone}
                  onChange={(e) => setTechPhone(e.target.value)}
                />
                <span className="text-[10px] text-theme-dim">
                  Notifikasi persetujuan akan dikirimkan langsung ke pengaju dokumen.
                </span>
              </div>

              <div className="flex gap-2.5 w-full">
                <a
                  href={getWhatsAppLink(qrModalDoc)}
                  onClick={handleWaClick}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex-1 flex items-center justify-center gap-2 bg-status-emerald-bg hover:bg-status-emerald-bg text-theme-text font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                    !isPhoneValid ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  <Send size={14} /> Kirim Notifikasi (WhatsApp)
                </a>
                <button
                  onClick={() => setQrModalDoc(null)}
                  className="bg-theme-input hover:bg-theme-hover border border-theme-border text-theme-muted font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
