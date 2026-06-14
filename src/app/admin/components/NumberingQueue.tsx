import React, { useState, useEffect } from 'react';
import { Clock, Hash, FileUp, ShieldAlert, CheckCircle2, Download, Eye, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { LhuDocument } from '../../../types';
import { parseTemplate } from '../../../lib/template';
import { logAudit } from '../../../lib/audit';

interface NumberingQueueProps {
  numberingDocs: LhuDocument[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  techFilter: string;
  setTechFilter: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
  calculateSla: (createdAt: string) => { text: string; class: string };
  setPreviewDoc: (doc: LhuDocument) => void;
  getDownloadUrl: (filePath: string) => string;
  onRefresh: () => void;
  userName: string;
}

export default function NumberingQueue({
  numberingDocs,
  loading,
  searchQuery,
  setSearchQuery,
  techFilter,
  setTechFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  formatLhuNumber,
  calculateSla,
  setPreviewDoc,
  getDownloadUrl,
  onRefresh,
  userName
}: NumberingQueueProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedDoc, setSelectedDoc] = useState<LhuDocument | null>(null);
  const [docType, setDocType] = useState<'LHU' | 'Sertifikat'>('LHU');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [skipUpload, setSkipUpload] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [lhuTemplate, setLhuTemplate] = useState('{nomor_2}.PROLAB/LHU-HOUSEHOLD/{bulan_romawi}/{tahun}');
  const [certTemplate, setCertTemplate] = useState('CERT/{departemen_kode}/{tahun}/{nomor}');
  const [placeholders, setPlaceholders] = useState<any[]>([]);
  const [previewCode, setPreviewCode] = useState('');

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase.from('lhu_settings').select('*');
      if (!error && data) {
        const lhuT = data.find(s => s.key === 'lhu_code_template')?.value;
        const certT = data.find(s => s.key === 'cert_code_template')?.value;
        if (lhuT) setLhuTemplate(lhuT);
        if (certT) setCertTemplate(certT);

        const placeholdersVal = data.find(s => s.key === 'lhu_placeholders')?.value;
        if (placeholdersVal) {
          setPlaceholders(JSON.parse(placeholdersVal));
        }
      }
    } catch (err) {
      console.error('Gagal mengambil template:', err);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      const activeTemplate = docType === 'LHU' ? lhuTemplate : certTemplate;
      const code = parseTemplate(activeTemplate, {
        nomor: selectedDoc.nomor_lhu,
        komoditi: selectedDoc.komoditi || '',
        departemen: selectedDoc.departemen || '',
        date: new Date(selectedDoc.created_at)
      }, placeholders);
      setPreviewCode(code);
    }
  }, [selectedDoc, docType, lhuTemplate, certTemplate, placeholders]);

  const openNumberingModal = (doc: LhuDocument) => {
    loadTemplates();
    setSelectedDoc(doc);
    setDocType(doc.tipe_dokumen || 'LHU');
    setSelectedFile(null);
    setSkipUpload(false);
    setModalError('');
    setModalSuccess('');
  };

  const closeNumberingModal = () => {
    setSelectedDoc(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmitNumbering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!skipUpload && !selectedFile) {
      setModalError('Silakan pilih berkas Certificate/LHU final, atau aktifkan opsi "Nomor Tanpa Dokumen".');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    setModalSuccess('');

    try {
      // 1. Validasi Unik (SOP 12): Sistem memastikan nomor belum pernah digunakan sebelumnya
      let checkQuery = supabase.from('lhu_document').select('id, judul');
      if (docType === 'LHU') {
        checkQuery = checkQuery.eq('kode_lhu', previewCode);
      } else {
        checkQuery = checkQuery.eq('kode_sertifikat', previewCode);
      }
      
      const { data: existingDocs, error: checkErr } = await checkQuery;
      if (checkErr) throw checkErr;
      
      if (existingDocs && existingDocs.length > 0) {
        throw new Error(`Nomor dokumen "${previewCode}" sudah digunakan sebelumnya oleh LHU: "${existingDocs[0].judul}". Harap sesuaikan template pengaturan atau nomor.`);
      }

      // 2. Upload file final (opsional jika skipUpload)
      let finalFilePath = selectedDoc.file_path;
      if (!skipUpload && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const uniqueFileName = `${selectedDoc.nomor_lhu}_final_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('lhu-documents')
          .upload(`final/${uniqueFileName}`, selectedFile);
        if (uploadErr) throw uploadErr;
        finalFilePath = uploadData.path;
      }

      // 3. Simpan nomor dokumen & ubah status ke APPROVED (Direct approval)
      const updateFields: any = {
        status: 'APPROVED',
        file_path: finalFilePath,
        approved_by: userName,
        approved_at: new Date().toISOString(),
        checked_by: userName,
        updated_at: new Date().toISOString()
      };
      
      if (docType === 'LHU') {
        updateFields.kode_lhu = previewCode;
      } else {
        updateFields.kode_sertifikat = previewCode;
      }

      const { error: dbErr } = await supabase
        .from('lhu_document')
        .update(updateFields)
        .eq('id', selectedDoc.id);

      if (dbErr) throw dbErr;

      // Clean up/delete old draft version files from storage to save database space
      try {
        let filesToDelete: string[] = [];
        
        // 1. Gather files from previous versions array (if any)
        if (selectedDoc.previous_file_path) {
          const trimmedPrev = selectedDoc.previous_file_path.trim();
          if (trimmedPrev.startsWith('[')) {
            const parsedVersions = JSON.parse(trimmedPrev);
            const versionPaths = parsedVersions
              .map((v: any) => v.file_path)
              .filter((path: string) => path && !path.startsWith('fallback_path/'));
            filesToDelete.push(...versionPaths);
          } else {
            if (!trimmedPrev.startsWith('fallback_path/')) {
              filesToDelete.push(trimmedPrev);
            }
          }
        }

        // 2. Gather active draft file if we just uploaded a new final file
        if (!skipUpload && selectedDoc.file_path && !selectedDoc.file_path.startsWith('fallback_path/')) {
          filesToDelete.push(selectedDoc.file_path);
        }

        // 3. Remove gathered files from Supabase storage
        if (filesToDelete.length > 0) {
          console.log('Menghapus file draf versi lama dari storage:', filesToDelete);
          const { error: removeErr } = await supabase.storage
            .from('lhu-documents')
            .remove(filesToDelete);
          if (removeErr) {
            console.warn('Gagal menghapus file versi lama dari storage:', removeErr);
          }
        }
      } catch (cleanErr) {
        console.error('Error saat membersihkan file draf versi lama:', cleanErr);
      }

      await logAudit(
        userName,
        'admin',
        'NUMBERING_AND_UPLOAD_FINAL',
        `Menerbitkan nomor ${docType}: ${previewCode} dan menyetujui dokumen secara langsung (APPROVED).`
      );

      setModalSuccess(`Sukses! Nomor ${previewCode} berhasil disimpan dan dokumen disetujui (APPROVED).`);
      setTimeout(() => {
        const sendWa = window.confirm('Apakah Anda ingin mengirimkan pemberitahuan hasil nomor dokumen ke WhatsApp?');
        
        if (sendWa) {
          const defaultPhone = localStorage.getItem('lhu_numbering_recipient_wa') || '';
          const phoneInput = window.prompt(
            `Nomor dokumen berhasil diterbitkan: ${previewCode}\n\nMasukkan nomor WhatsApp penerima (contoh: 08123456789 atau 628123456789):`,
            defaultPhone
          );

          if (phoneInput && phoneInput.trim()) {
            const cleanedPhone = phoneInput.trim();
            localStorage.setItem('lhu_numbering_recipient_wa', cleanedPhone);

            let formattedPhone = cleanedPhone.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) {
              formattedPhone = '62' + formattedPhone.substring(1);
            }
            if (!formattedPhone.startsWith('62') && formattedPhone.length > 0) {
              formattedPhone = '62' + formattedPhone;
            }

            const verifyLink = `${window.location.origin}/verify?id=${selectedDoc.id}`;
            const waMessage = `Halo, dokumen *${docType}* dengan nomor *${previewCode}* ("${selectedDoc.judul}") telah berhasil disetujui dan diterbitkan secara resmi.\n\nDetail Dokumen: ${verifyLink}\n\nTerima kasih!`;

            const waLink = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(waMessage)}`;
            window.open(waLink, '_blank');
          }
        }

        closeNumberingModal();
        onRefresh();
      }, 1000);

    } catch (err: any) {
      setModalError(err.message || 'Gagal memproses penomoran dokumen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  let filtered = numberingDocs.filter(doc => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      doc.judul.toLowerCase().includes(searchLower) ||
      String(doc.nomor_lhu).includes(searchLower);

    const matchesTech = techFilter === 'ALL' || doc.uploaded_by === techFilter;

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(doc.created_at) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(doc.created_at) <= new Date(endDate + 'T23:59:59');
    }

    return matchesSearch && matchesTech && matchesDate;
  });

  filtered = [...filtered].sort((a, b) => {
    const aUrgent = a.priority === 'urgent' ? 1 : 0;
    const bUrgent = b.priority === 'urgent' ? 1 : 0;
    if (aUrgent !== bUrgent) {
      return bUrgent - aUrgent;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const uniqueTechs = Array.from(new Set(numberingDocs.map(d => d.uploaded_by)));

  return (
    <>
      <h3 className="text-lg font-bold flex items-center gap-2 text-theme-text mb-2">
        <Hash size={18} className="text-status-orange-text" /> Penomoran & Unggah Berkas Final (SOP 8-15)
      </h3>
      <p className="text-xs text-theme-muted mb-6">
        Supervisor telah menyetujui draf berikut. Silakan beri nomor dokumen, unggah file PDF final yang berkode, lalu klik cetak nomor. Dokumen akan langsung terbit (APPROVED).
      </p>

      {numberingDocs.length > 0 && (
        <div className="flex flex-col gap-3 mb-6 bg-theme-input p-4 border border-theme-border/85 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text"
              placeholder="Cari draf berdasarkan judul atau nomor induk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
            />
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all cursor-pointer"
            >
              <option value="ALL">Semua Pengunggah</option>
              {uniqueTechs.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-theme-muted uppercase">Mulai</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-theme-card border border-theme-border rounded-lg px-2.5 py-1.5 text-theme-text text-[10px] outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-theme-muted uppercase">Selesai</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-theme-card border border-theme-border rounded-lg px-2.5 py-1.5 text-theme-text text-[10px] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-theme-muted">
          <div className="w-8 h-8 border-4 border-t-orange-500 border-theme-border rounded-full animate-spin"></div>
          <span className="text-xs">Memuat antrean penomoran...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-theme-input/40 border border-theme-border rounded-2xl p-6">
          <CheckCircle2 size={36} className="text-theme-dim mb-3" />
          <h4 className="text-theme-text font-semibold text-sm">Tidak Ada Antrean Penomoran</h4>
          <p className="text-xs text-theme-dim max-w-sm mt-1">
            Belum ada berkas draf yang disetujui oleh Supervisor untuk diberi nomor.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
          {paginated.map(doc => {
            const sla = calculateSla(doc.created_at);
            return (
              <div 
                key={doc.id}
                className="bg-theme-input border border-theme-border hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all group relative overflow-hidden"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-status-amber-bg border border-status-amber-border text-status-amber-text font-mono text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Draf: {formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen)}
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      sla.class === 'danger' ? 'bg-status-red-bg border border-status-red-border text-status-red-text' :
                      sla.class === 'warning' ? 'bg-status-amber-bg border border-status-amber-border text-status-amber-text' :
                      'bg-theme-input/50 border border-theme-border text-theme-muted'
                    }`}>
                      ⏳ {sla.text}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-theme-text group-hover:text-status-orange-text transition-colors line-clamp-1">
                      {doc.judul}
                    </h4>
                    <p className="text-[11px] text-theme-muted mt-1">
                      Pengunggah: <span className="text-theme-muted font-semibold">{doc.uploaded_by}</span>
                    </p>
                    <p className="text-[10px] text-theme-dim mt-0.5">
                      Departemen: {doc.komoditi} | Jenis Dokumen: {doc.departemen} {doc.tipe_dokumen && `| Tipe: ${doc.tipe_dokumen}`}
                    </p>
                  </div>

                  <div className="bg-theme-card border border-theme-border rounded-xl p-2.5 text-[10px] text-theme-muted flex flex-col gap-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>Auditor Supervisor:</span>
                      <span className="text-status-amber-text">{doc.checked_supervisor_by || 'Staf Supervisor'}</span>
                    </div>
                    {doc.catatan_spv && (
                      <p className="italic text-theme-muted border-t border-theme-border/85 pt-1 mt-1">
                        💬 "{doc.catatan_spv}"
                      </p>
                    )}
                    {doc.spv_checklist && doc.spv_checklist.length > 0 && (
                      <div className="border-t border-theme-border/85 pt-1.5 mt-1">
                        <span className="font-semibold text-theme-muted block mb-1">Checklist Audit:</span>
                        <div className="flex flex-col gap-0.5 text-theme-muted max-h-[100px] overflow-y-auto pr-1">
                          {doc.spv_checklist.map((item, idx) => (
                            <span key={idx} className="block truncate text-[9px]">✓ {item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-theme-border">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="flex-1 bg-theme-input hover:bg-theme-hover text-theme-muted font-semibold text-xs py-2 px-3 rounded-xl border border-theme-border hover:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye size={13} /> Draf
                  </button>
                  <a
                    href={getDownloadUrl(doc.file_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-theme-input hover:bg-theme-hover text-theme-muted font-semibold text-xs py-2 px-3.5 rounded-xl border border-theme-border hover:border-slate-700 transition-all flex items-center justify-center cursor-pointer"
                    title="Unduh Draf Dokumen"
                  >
                    <Download size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => openNumberingModal(doc)}
                    className="btn-primary flex-[2] font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Hash size={13} /> Beri Nomor & Upload
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-theme-border pt-5 mt-5">
            <span className="text-xs text-theme-muted">
              Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} berkas
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1.5 bg-theme-card border border-theme-border hover:border-slate-705 text-theme-muted disabled:opacity-40 disabled:hover:border-theme-border rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCurrentPage(p);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === p
                        ? 'bg-status-blue-bg text-theme-text shadow-md shadow-blue-500/20'
                        : 'bg-theme-card border border-theme-border text-theme-muted hover:text-theme-muted'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1.5 bg-theme-card border border-theme-border hover:border-slate-705 text-theme-muted disabled:opacity-40 disabled:hover:border-theme-border rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </>
    )}

      {selectedDoc && (
        <div className="fixed inset-0 bg-theme-card backdrop-blur-sm z-50 flex items-center justify-center p-3 lg:p-6">
          <form 
            onSubmit={handleSubmitNumbering}
            className="bg-theme-card border border-theme-border rounded-3xl w-full max-w-lg lg:max-w-4xl p-5 shadow-2xl flex flex-col gap-4 max-h-[95vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-theme-border">
              <h3 className="text-base font-bold text-theme-text flex items-center gap-2">
                <Hash size={18} className="text-status-orange-text" /> Penomoran & Unggah Final
              </h3>
              <button 
                type="button"
                onClick={closeNumberingModal}
                className="text-theme-muted hover:text-theme-text text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {modalError && (
              <div className="bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text text-xs px-3.5 py-2.5 rounded-xl flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">

              <div className="flex flex-col gap-4">
                <div className="bg-theme-input p-3.5 border border-theme-border rounded-2xl flex flex-col gap-1.5">
                  <div className="flex justify-between text-theme-muted">
                    <span>Judul Dokumen:</span>
                    <span className="text-theme-text font-semibold text-right max-w-[55%] line-clamp-2">{selectedDoc.judul}</span>
                  </div>
                  <div className="flex justify-between text-theme-muted">
                    <span>Nomor Induk:</span>
                    <span className="text-theme-text font-mono">{formatLhuNumber(selectedDoc.nomor_lhu, docType)}</span>
                  </div>
                  <div className="flex justify-between text-theme-muted">
                    <span>Dept / Jenis Dokumen:</span>
                    <span className="text-theme-text">{selectedDoc.komoditi} / {selectedDoc.departemen}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-theme-dim uppercase font-bold tracking-wider">Format Penerbitan (SOP 9)</span>
                  <div className="bg-theme-card border border-theme-border p-3.5 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-theme-text">
                      {docType === 'LHU' ? '📝 LHU (Hasil Pengujian)' : '📜 Sertifikat'}
                    </span>
                    <span className="text-[10px] bg-status-blue-bg border border-status-blue-border text-status-blue-text font-semibold px-2.5 py-0.5 rounded-full uppercase">
                      Otomatis
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 bg-theme-input border border-theme-border p-4 rounded-2xl">
                  <label className="font-bold text-theme-muted flex items-center gap-1">⚙️ Kode Penomoran Otomatis (SOP 11)</label>
                  <div className="flex justify-between text-[10px] mb-2">
                    <span className="text-theme-muted">Template:</span>
                    <span className="text-theme-muted font-mono">{docType === 'LHU' ? lhuTemplate : certTemplate}</span>
                  </div>
                  <label className="text-theme-muted font-semibold text-[10px]">Nomor Kode Final (Dapat Disesuaikan):</label>
                  <input
                    type="text"
                    value={previewCode}
                    onChange={(e) => setPreviewCode(e.target.value)}
                    required
                    className="w-full bg-theme-card border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2 text-status-orange-text font-mono font-bold text-xs outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <label className={`flex items-start gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all ${
                  skipUpload ? 'border-status-blue-border bg-status-blue-bg' : 'border-theme-border bg-theme-input hover:border-slate-700'
                }`}>
                  <input
                    type="checkbox"
                    checked={skipUpload}
                    onChange={(e) => { setSkipUpload(e.target.checked); if (e.target.checked) setSelectedFile(null); }}
                    className="mt-0.5 accent-blue-500 w-4 h-4 shrink-0"
                  />
                  <div>
                    <span className={`font-bold block ${skipUpload ? 'text-status-blue-text' : 'text-theme-muted'}`}>Beri Nomor Tanpa Unggah Dokumen</span>
                    <span className="text-[10px] text-theme-dim mt-0.5 block">Gunakan jika berkas final belum siap. Nomor tetap tercatat dan dokumen draf lama dipertahankan.</span>
                  </div>
                </label>

                {/* 2. Upload Dokumen (disembunyikan jika skip) */}
                {!skipUpload ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-theme-muted">2. Unggah Dokumen Final (SOP 10)</label>
                    <div className="relative border-2 border-dashed border-theme-border hover:border-status-orange-border bg-theme-input rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2 transition-all min-h-[140px]">
                      <FileUp size={28} className="text-status-orange-text" />
                      <span className="text-[10px] text-theme-muted">Pilih berkas PDF final berkode nomor</span>
                      <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {selectedFile ? (
                        <span className="text-[10px] text-status-emerald-text font-semibold bg-status-emerald-bg border border-status-emerald-border px-2.5 py-1 rounded-lg flex items-center gap-1.5 mt-1">
                          <FileText size={12} /> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      ) : (
                        <span className="text-[10px] text-theme-dim">Belum ada berkas dipilih...</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-status-blue-bg border border-status-blue-border rounded-2xl p-4 flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-status-blue-text">ℹ️ Mode Nomor Tanpa Dokumen Aktif</span>
                    <span className="text-[10px] text-theme-muted">Dokumen akan disetujui langsung menggunakan berkas draf yang ada. Anda dapat mengunggah berkas final nanti melalui tab Riwayat.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-theme-border pt-4 mt-2">
              <button
                type="button"
                onClick={closeNumberingModal}
                disabled={isSubmitting}
                className="bg-theme-hover hover:bg-slate-700 text-theme-muted font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!skipUpload && !selectedFile)}
                className="btn-primary font-bold text-xs px-5 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? 'Memproses...' : skipUpload ? 'Beri Nomor & Cetak (Tanpa Upload)' : 'Simpan Nomor & Cetak'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
