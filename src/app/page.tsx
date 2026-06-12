"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { LhuDocument } from '../types';
import { Search, Eye, Send, CornerUpLeft, QrCode, CheckSquare } from 'lucide-react';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import TimelineDrawer from '../components/TimelineDrawer';
import ResubmitModal from '../components/ResubmitModal';
import QrDocumentModal from '../components/QrDocumentModal';
import { Button } from 'antd';

export default function HomeDashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState<LhuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userName, setUserName] = useState('User PROLAB');
  const [loggedUser, setLoggedUser] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const [previewDoc, setPreviewDoc] = useState<LhuDocument | null>(null);
  const [timelineDoc, setTimelineDoc] = useState<LhuDocument | null>(null);
  const [resubmitDoc, setResubmitDoc] = useState<LhuDocument | null>(null);
  const [qrDoc, setQrDoc] = useState<LhuDocument | null>(null);

  useEffect(() => {
    fetchDocuments();
    const loadUserName = async () => {
      setUserName(localStorage.getItem('lhu_user_name') || 'User PROLAB');
      const userStr = localStorage.getItem('lhu_logged_user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        setLoggedUser(userObj);
        try {
          const { data, error } = await supabase
            .from('lhu_users')
            .select('role, komoditi, departemen, allowed_komoditi, allowed_departemen')
            .eq('username', userObj.username)
            .single();
          if (!error && data) {
            setLoggedUser({
              ...userObj,
              role: data.role,
              komoditi: data.komoditi,
              departemen: data.departemen,
              allowed_komoditi: data.allowed_komoditi,
              allowed_departemen: data.allowed_departemen
            });
          }
        } catch (e) {
          console.error('Failed to load user permissions in Home:', e);
        }
      } else {
        setLoggedUser(null);
      }
    };
    loadUserName();
    window.addEventListener('userNameChanged', loadUserName);
    const handleDocChanged = () => fetchDocuments(true);
    window.addEventListener('lhu_document_changed', handleDocChanged);
    return () => {
      window.removeEventListener('userNameChanged', loadUserName);
      window.removeEventListener('lhu_document_changed', handleDocChanged);
    };
  }, []);
  const canProcess = (doc: LhuDocument): boolean => {
    if (!loggedUser) return false;
    const role = loggedUser.role;
    
    const allowedCommodities = loggedUser.allowed_komoditi || [];
    const hasCommodityAccess = role === 'manager_mutu' || role === 'direktur' || allowedCommodities.includes(doc.komoditi);

    if (!hasCommodityAccess) return false;

    if (doc.status === 'PENDING_ADMIN' && (role === 'admin' || role === 'tester')) {
      return true;
    }
    if (doc.status === 'PENDING_SUPERVISOR' && (role === 'supervisor' || role === 'tester')) {
      return true;
    }
    if (doc.status === 'PENDING_MANAGER' && (role === 'manager_mutu' || role === 'direktur' || role === 'tester')) {
      return true;
    }
    return false;
  };

  const handleProcessRedirect = (doc: LhuDocument) => {
    if (!loggedUser) return;
    const role = loggedUser.role;
    const div = encodeURIComponent(doc.komoditi || '');

    if (doc.status === 'PENDING_ADMIN' && (role === 'admin' || role === 'tester')) {
      router.push(`/admin/${div}/pending`);
    } else if (doc.status === 'PENDING_SUPERVISOR' && (role === 'supervisor' || role === 'tester')) {
      router.push(`/supervisor/${div}/pending`);
    } else if (doc.status === 'PENDING_MANAGER' && (role === 'manager_mutu' || role === 'direktur' || role === 'tester')) {
      router.push(`/manager-mutu/lhu`);
    }
  };
  const fetchDocuments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lhu_document')
        .select('*')
        .order('nomor_lhu', { ascending: false });

      if (error) throw error;
      setDocuments((data as LhuDocument[]) || []);
    } catch (err) {
      console.error('Gagal mengambil berkas LHU:', err);
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

  const calculateSla = (dateString: string, status: string): { text: string; class: string } => {
    if (status === 'APPROVED' || status === 'REJECTED') {
      return { text: 'Proses Selesai', class: '' };
    }

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

  const handleWhatsAppNotify = (doc: LhuDocument, roleTarget: 'admin' | 'supervisor' | 'manager_lab') => {
    let defaultKey = 'lhu_admin_wa_number';
    if (roleTarget === 'supervisor') defaultKey = 'lhu_spv_wa_number';
    else if (roleTarget === 'manager_lab') defaultKey = 'lhu_manager_wa_number';

    const defaultPhone = localStorage.getItem(defaultKey) || '';
    
    let label = 'Admin';
    if (roleTarget === 'supervisor') label = 'Supervisor';
    else if (roleTarget === 'manager_lab') label = 'Manager QHSE';
    
    const phone = window.prompt(`Masukkan nomor WhatsApp ${label} Penerima:`, defaultPhone);
    if (phone === null) return; // cancelled
    
    if (!phone.trim()) {
      alert('Nomor WhatsApp harus diisi.');
      return;
    }
    
    localStorage.setItem(defaultKey, phone.trim());
    
    const docNumber = doc.status === 'APPROVED' && doc.kode_lhu ? doc.kode_lhu : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen);
    let message = '';
    if (roleTarget === 'admin') {
      message = `Halo Admin, mohon bantuan untuk mengecek dokumen *${docNumber}* ("${doc.judul}") yang baru saja saya unggah di aplikasi E-Dokumen. Terima kasih!`;
    } else if (roleTarget === 'supervisor') {
      message = `Halo Supervisor, mohon bantuannya untuk melakukan audit kelayakan pada dokumen *${docNumber}* ("${doc.judul}") yang telah selesai diverifikasi oleh Admin. Terima kasih!`;
    } else if (roleTarget === 'manager_lab') {
      message = `Halo Manager QHSE, mohon bantuannya untuk memberikan persetujuan akhir pada dokumen *${docNumber}* ("${doc.judul}") yang telah diaudit oleh Supervisor. Terima kasih!`;
    }
    
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('62') && cleaned.length > 0) {
      cleaned = '62' + cleaned;
    }
    
    const link = `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(message)}`;
    window.open(link, '_blank');
  };

  const filteredDocs = documents.filter(doc => {
    if (!doc) return false;

    if (loggedUser) {
      const isAllAccess = 
        loggedUser.role === 'manager_mutu' || 
        loggedUser.role === 'direktur' || 
        loggedUser.role === 'manager_lab' || 
        loggedUser.departemen === 'Direktur' || 
        loggedUser.departemen === 'Manager QHSE' ||
        loggedUser.departemen === 'direktur' ||
        loggedUser.departemen === 'manager_mutu' ||
        loggedUser.departemen === 'manager_qhse';

      if (!isAllAccess) {
        const allowedKomoditi = loggedUser.allowed_komoditi || (loggedUser.komoditi ? [loggedUser.komoditi] : []);
        if (allowedKomoditi.length > 0 && !allowedKomoditi.includes('ALL')) {
          if (!doc.komoditi || !allowedKomoditi.includes(doc.komoditi)) {
            return false;
          }
        }

        const allowedDepartemen = loggedUser.allowed_departemen || (loggedUser.departemen ? [loggedUser.departemen] : []);
        if (allowedDepartemen.length > 0 && !allowedDepartemen.includes('ALL')) {
          if (!doc.departemen || !allowedDepartemen.includes(doc.departemen)) {
            return false;
          }
        }
      }
    }

    const matchSearch =
      (doc.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatLhuNumber(doc.nomor_lhu || 0, doc.tipe_dokumen).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.uploaded_by || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'REJECTED'
        ? (doc.status === 'REJECTED' || (doc.status === 'PENDING_ADMIN' && doc.catatan_spv))
        : (statusFilter === 'PENDING_ADMIN'
          ? ((doc.status === 'PENDING_ADMIN' && !doc.catatan_spv) || doc.status === 'PENDING_NUMBERING')
          : doc.status === statusFilter));
    return matchSearch && matchStatus;
  });

  const totalItems = filteredDocs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocs = filteredDocs.slice(startIndex, startIndex + itemsPerPage);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_ADMIN':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-red-bg border border-status-red-border text-status-red-text">Perlu Direvisi</span>;
      case 'PENDING_SUPERVISOR':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-amber-bg border border-status-amber-border text-status-amber-text">Cek Supervisor</span>;
      case 'PENDING_NUMBERING':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-blue-bg border border-status-blue-border text-status-blue-text">Menunggu Penomoran</span>;
      case 'PENDING_MANAGER':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-orange-bg border border-status-orange-border text-status-orange-text">Cek Manager QHSE</span>;
      case 'APPROVED':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text">Disetujui</span>;
      case 'REJECTED':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-status-red-bg border border-status-red-border text-status-red-text">Ditolak</span>;
      default:
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-theme-hover text-theme-muted">{status}</span>;
    }
  };

  return (
    <div className="w-full">
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-theme-border pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-widest text-theme-text uppercase font-sans">ARSIP & DASHBOARD DOKUMEN</h2>
          <p className="text-sm text-theme-muted mt-1 font-light">
            Memantau riwayat pengajuan, persetujuan, dan penomoran dokumen PROLAB secara real-time.
          </p>
        </div>
        <img src="/logo2.png" alt="PROLAB Logo" className="h-10 object-contain prolab-logo" />
      </header>

      <div className="bg-theme-card border border-theme-border rounded-none p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider">ARSIP DOKUMEN TERBIT</h3>

          <div className="flex gap-1.5 flex-wrap">
            {['ALL', 'PENDING_ADMIN', 'PENDING_SUPERVISOR', 'APPROVED', 'REJECTED'].map(st => (
              <Button
                key={st}
                type={statusFilter === st ? 'primary' : 'default'}
                onClick={() => setStatusFilter(st)}
                className="text-xs font-bold uppercase tracking-wider rounded-none"
              >
                {st === 'ALL' ? 'Semua' : st.replace('PENDING_', '').replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        <div className="relative mb-6">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted" />
          <input
            type="text"
            className="w-full bg-theme-input border border-theme-border focus:border-theme-text rounded-none pl-10 pr-4 py-3.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
            placeholder="Cari berdasarkan Judul Dokumen, nomor urut, atau nama pengunggah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-theme-dim text-sm font-semibold animate-pulse">
            Memuat data arsip dokumen...
          </div>
        ) : (
          <div className="overflow-x-auto border border-theme-border rounded-none bg-theme-input">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-theme-card text-theme-muted border-b border-theme-border">
                  <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider w-[120px]">Nomor Dokumen</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Judul Dokumen</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Pengaju</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Waktu Unggah</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider">Catatan</th>
                  <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider w-[140px] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/60">
                {paginatedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-theme-dim text-xs">
                      Tidak ada dokumen yang ditemukan dalam arsip.
                    </td>
                  </tr>
                ) : (
                  paginatedDocs.map(doc => {
                    const sla = calculateSla(doc.status === 'PENDING_ADMIN' ? doc.created_at : doc.updated_at, doc.status);
                    const isWarning = sla.class === 'warning';
                    const isDanger = sla.class === 'danger';

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-theme-card transition-colors cursor-pointer group"
                        onClick={() => setTimelineDoc(doc)}
                      >
                        <td className="px-4 py-4 font-mono font-bold text-status-blue-text group-hover:text-theme-text transition-colors">
                          {doc.status === 'APPROVED' && doc.kode_lhu ? doc.kode_lhu : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-theme-text leading-tight">{doc.judul}</div>
                        </td>
                        <td className="px-4 py-4 text-theme-muted">{doc.uploaded_by}</td>
                        <td className="px-4 py-4 text-theme-muted">
                          <div className="text-[11px]">
                            {new Date(doc.created_at).toLocaleDateString('id-ID', { dateStyle: 'short' })}
                          </div>
                          {doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && (
                            <span className={`text-[9px] block mt-0.5 ${
                              isDanger ? 'text-status-red-text font-semibold animate-pulse' :
                              isWarning ? 'text-status-orange-text font-semibold' : 'text-theme-dim'
                            }`}>
                              {sla.text}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {renderStatusBadge(doc.status)}
                        </td>
                        <td className="px-4 py-4">
                          {doc.catatan_spv ? (
                            <div className="text-[11px] text-status-orange-text max-w-[180px] truncate" title={doc.catatan_spv}>
                              <strong>Supervisor:</strong> {doc.catatan_spv}
                            </div>
                          ) : doc.catatan_admin ? (
                            <div className="text-[11px] text-status-blue-text max-w-[180px] truncate" title={doc.catatan_admin}>
                              <strong>Admin:</strong> {doc.catatan_admin}
                            </div>
                          ) : (
                            <span className="text-theme-muted text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              size="small"
                              onClick={() => setPreviewDoc(doc)}
                              icon={<Eye size={13} />}
                              title="Pratinjau Langsung"
                            />

                            {canProcess(doc) && (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => handleProcessRedirect(doc)}
                                icon={<CheckSquare size={13} />}
                                title="Tindak Lanjuti Dokumen"
                                className="!bg-blue-600 !border-blue-600 hover:!bg-blue-700 hover:!border-blue-700"
                              />
                            )}

                            {(doc.status === 'APPROVED' || doc.kode_lhu || doc.kode_sertifikat) && (
                              <Button
                                size="small"
                                onClick={() => setQrDoc(doc)}
                                icon={<QrCode size={13} />}
                                title="Lihat QR Code"
                              />
                            )}

                            {doc.status === 'PENDING_ADMIN' && (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => handleWhatsAppNotify(doc, 'admin')}
                                icon={<Send size={13} />}
                                title="Notifikasi Admin"
                                className="!bg-status-emerald-bg !border-status-emerald-border hover:!bg-status-emerald-bg hover:!border-status-emerald-border"
                              />
                            )}

                            {doc.status === 'PENDING_SUPERVISOR' && (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => handleWhatsAppNotify(doc, 'supervisor')}
                                icon={<Send size={13} />}
                                title="Notifikasi Supervisor"
                                className="!bg-status-emerald-bg !border-status-emerald-border hover:!bg-status-emerald-bg hover:!border-status-emerald-border"
                              />
                            )}

                            {doc.status === 'PENDING_MANAGER' && (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => handleWhatsAppNotify(doc, 'manager_lab')}
                                icon={<Send size={13} />}
                                title="Notifikasi Manager QHSE"
                                className="!bg-status-emerald-bg !border-status-emerald-border hover:!bg-status-emerald-bg hover:!border-status-emerald-border"
                              />
                            )}

                            {(doc.status === 'REJECTED' || (doc.status === 'PENDING_ADMIN' && doc.catatan_spv)) && (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => setResubmitDoc(doc)}
                                icon={<CornerUpLeft size={13} />}
                                title="Ajukan Ulang Revisi"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 bg-theme-card border-t border-theme-border text-xs">
                <span className="text-theme-muted">
                  Menampilkan <strong className="text-theme-muted">{Math.min(startIndex + 1, totalItems)}</strong> - <strong className="text-theme-muted">{Math.min(startIndex + itemsPerPage, totalItems)}</strong> dari <strong className="text-theme-muted">{totalItems}</strong> dokumen
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    size="small"
                    className="rounded-none"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    size="small"
                    className="rounded-none"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
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

      {resubmitDoc && (
        <ResubmitModal
          document={resubmitDoc}
          onClose={() => setResubmitDoc(null)}
          onRefresh={fetchDocuments}
          formatLhuNumber={formatLhuNumber}
        />
      )}

      {timelineDoc && (
        <TimelineDrawer
          document={timelineDoc}
          onClose={() => setTimelineDoc(null)}
          formatLhuNumber={formatLhuNumber}
        />
      )}

      {qrDoc && (
        <QrDocumentModal
          document={qrDoc}
          onClose={() => setQrDoc(null)}
          formatLhuNumber={formatLhuNumber}
        />
      )}
    </div>
  );
}
