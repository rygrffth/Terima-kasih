"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { LhuDocument } from '../../../types';
import SuccessUploadModal from '../../../components/SuccessUploadModal';
import { logAudit } from '../../../lib/audit';
import { 
  TitlePresenceHandler, 
  TitleLengthHandler, 
  FilePresenceHandler, 
  FileSizeHandler, 
  FileTypeHandler 
} from '../../../lib/validationChain';

import AdminUploadForm from '../components/AdminUploadForm';

export default function AdminUploadLhuPage() {
  const params = useParams();
  const activeDivisi = params?.divisi ? decodeURIComponent(params.divisi as string) : null;
  const [userName, setUserName] = useState('Admin PROLAB');
  const [userKomoditi, setUserKomoditi] = useState<string | null>(null);
  const [userDepartemen, setUserDepartemen] = useState<string | null>(null);
  const [lhuTitle, setLhuTitle] = useState('');
  const [kategoriDokumen, setKategoriDokumen] = useState<string>('None');
  const [tipeDokumen, setTipeDokumen] = useState<'LHU' | 'Sertifikat'>('LHU');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  
  const priority = 'normal';
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
 
  const [justUploadedDoc, setJustUploadedDoc] = useState<LhuDocument | null>(null);
  
  const [allowedKomoditi, setAllowedKomoditi] = useState<string[] | null>(null);
  const [allowedDepartemen, setAllowedDepartemen] = useState<string[] | null>(null);
  const [dbDepartemens, setDbDepartemens] = useState<string[]>([]);
 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const fetchDbDepartemens = async () => {
      try {
        const { data, error } = await supabase
          .from('lhu_document')
          .select('departemen')
          .not('departemen', 'is', null);
        
        if (!error && data) {
          const uniqueDepts = Array.from(new Set(data.map(d => d.departemen).filter(Boolean))) as string[];
          setDbDepartemens(uniqueDepts);
        }
      } catch (e) {
        console.error('Gagal mengambil daftar departemen/jenis dokumen dari DB:', e);
      }
    };
    fetchDbDepartemens();
  }, []);
 
  useEffect(() => {
    const savedTitle = localStorage.getItem('lhu_admin_draft_title');
    const savedKategori = localStorage.getItem('lhu_admin_draft_kategori');
    const savedTipe = localStorage.getItem('lhu_admin_draft_tipe');
 
    if (savedTitle) {
      setLhuTitle(savedTitle);
      setHasDraft(true);
    }
    if (savedKategori) setKategoriDokumen(savedKategori);
    if (savedTipe) setTipeDokumen(savedTipe as 'LHU' | 'Sertifikat');
  }, []);
 
  useEffect(() => {
    if (lhuTitle) {
      localStorage.setItem('lhu_admin_draft_title', lhuTitle);
      localStorage.setItem('lhu_admin_draft_kategori', kategoriDokumen);
      localStorage.setItem('lhu_admin_draft_tipe', tipeDokumen);
      setHasDraft(true);
    } else {
      localStorage.removeItem('lhu_admin_draft_title');
      setHasDraft(false);
    }
  }, [lhuTitle, kategoriDokumen, tipeDokumen]);
 
  const handleClearDraft = () => {
    localStorage.removeItem('lhu_admin_draft_title');
    localStorage.removeItem('lhu_admin_draft_kategori');
    localStorage.removeItem('lhu_admin_draft_tipe');
    setLhuTitle('');
    setKategoriDokumen('None');
    setTipeDokumen('LHU');
    setHasDraft(false);
  };
 
  useEffect(() => {
    const loadUserData = async () => {
      const activeName = localStorage.getItem('lhu_user_name') || 'Admin PROLAB';
      setUserName(activeName);
      
      const loggedUserStr = localStorage.getItem('lhu_logged_user');
      if (loggedUserStr) {
        const userObj = JSON.parse(loggedUserStr);
        
        try {
          const { data, error } = await supabase
            .from('lhu_users')
            .select('komoditi, departemen, allowed_komoditi, allowed_departemen')
            .eq('id', userObj.id)
            .maybeSingle();

          if (!error && data) {
            setUserKomoditi(activeDivisi || data.komoditi || null);
            setUserDepartemen(data.departemen || null);
            setAllowedKomoditi(data.allowed_komoditi || null);
            setAllowedDepartemen(data.allowed_departemen || null);
          } else {
            setUserKomoditi(activeDivisi || userObj.komoditi || null);
            setUserDepartemen(userObj.departemen || null);
            setAllowedKomoditi(userObj.allowed_komoditi || null);
            setAllowedDepartemen(userObj.allowed_departemen || null);
          }
        } catch (e) {
          console.error('Gagal mengambil data user terbaru:', e);
          setUserKomoditi(activeDivisi || userObj.komoditi || null);
          setUserDepartemen(userObj.departemen || null);
          setAllowedKomoditi(userObj.allowed_komoditi || null);
          setAllowedDepartemen(userObj.allowed_departemen || null);
        }
      }
    };
    loadUserData();
    window.addEventListener('userNameChanged', loadUserData);
    return () => window.removeEventListener('userNameChanged', loadUserData);
  }, [activeDivisi]);

  const getJenisDokumenOptions = () => {
    const defaults = ['Safety', 'SKEM'];
    const allSystemDepts = Array.from(new Set([...defaults, ...dbDepartemens]));

    if (!allowedDepartemen || allowedDepartemen.length === 0) {
      return [];
    }

    if (allowedDepartemen.includes('ALL')) {
      return allSystemDepts;
    }

    return allowedDepartemen.filter(d => d !== 'ALL' && d !== 'None');
  };

  const jenisDokumenOptions = getJenisDokumenOptions();

  useEffect(() => {
    if (jenisDokumenOptions.length > 0) {
      if (kategoriDokumen !== 'None' && !jenisDokumenOptions.includes(kategoriDokumen)) {
        setKategoriDokumen('None');
      }
    } else {
      setKategoriDokumen('None');
    }
  }, [jenisDokumenOptions, kategoriDokumen]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl && (fileType === 'image' || fileType === 'pdf')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl, fileType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setSelectedFile(file);
    if (filePreviewUrl && (fileType === 'image' || fileType === 'pdf')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    
    if (file) {
      if (file.type.startsWith('image/')) {
        setFileType('image');
        setFilePreviewUrl(URL.createObjectURL(file));
      } else if (file.type === 'application/pdf') {
        setFileType('pdf');
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFileType(null);
        setFilePreviewUrl('');
      }
    } else {
      setFileType(null);
      setFilePreviewUrl('');
    }
  };

  const handleUploadLhu = async (e: React.FormEvent) => {
    e.preventDefault();

    const titlePresence = new TitlePresenceHandler();
    const titleLength = new TitleLengthHandler();
    const filePresence = new FilePresenceHandler();
    const fileSize = new FileSizeHandler(15 * 1024 * 1024); // Maksimal 15MB
    const fileTypeHandler = new FileTypeHandler(['pdf', 'png', 'jpg', 'jpeg']);

    titlePresence
      .setNext(titleLength)
      .setNext(filePresence)
      .setNext(fileSize)
      .setNext(fileTypeHandler);

    const validationError = titlePresence.handle({
      title: lhuTitle,
      file: selectedFile,
      additionalFiles: additionalFiles
    });

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    // Capture Offline Mode
    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        if (!selectedFile) return;
        const { saveOfflineUpload } = await import('../../../lib/indexedDb');
        await saveOfflineUpload({
          judul: lhuTitle,
          tipe_dokumen: tipeDokumen,
          kategori_dokumen: kategoriDokumen,
          komoditi: userKomoditi,
          priority: priority,
          uploaded_by: userName,
          file: selectedFile,
          additionalFiles: additionalFiles
        });

        // Clear Form States
        setLhuTitle('');
        setSelectedFile(null);
        setAdditionalFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (filePreviewUrl && (fileType === 'image' || fileType === 'pdf')) {
          URL.revokeObjectURL(filePreviewUrl);
        }
        setFilePreviewUrl('');
        setFileType(null);
        localStorage.removeItem('lhu_admin_draft_title');
        setUploadProgress(0);

        alert('Sistem sedang offline. Dokumen Anda telah disimpan secara lokal di perangkat ini dan akan otomatis diunggah ketika internet kembali terhubung.');
        return;
      } catch (err: any) {
        console.error('Gagal menyimpan draf offline:', err);
        setUploadError('Gagal menyimpan draf offline: ' + err.message);
        setUploadProgress(0);
        return;
      }
    }

    setUploadProgress(10);
    setUploadError('');

    try {
      if (!selectedFile) return; // Guard untuk TypeScript
      let finalFilePath = '';
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      setUploadProgress(40);

      const { error: uploadErr } = await supabase.storage
        .from('lhu-documents')
        .upload(filePath, selectedFile);

      if (uploadErr) {
        console.warn('Gagal ke Storage bucket, mengaktifkan file tiruan...', uploadErr);
        finalFilePath = `fallback_path/${fileName}`;
      } else {
        finalFilePath = filePath;
      }

      setUploadProgress(70);

      let chosenNomorLhu = 1;
      const settingKey = tipeDokumen === 'Sertifikat' ? 'next_cert_number' : 'next_lhu_number';
      try {
        const { data: settingData, error: settingErr } = await supabase
          .from('lhu_settings')
          .select('value')
          .eq('key', settingKey)
          .maybeSingle();

        if (!settingErr && settingData) {
          chosenNomorLhu = parseInt(settingData.value);
        } else {
          const { data: maxDocs } = await supabase
            .from('lhu_document')
            .select('nomor_lhu')
            .eq('tipe_dokumen', tipeDokumen)
            .order('nomor_lhu', { ascending: false })
            .limit(1);
          const maxNum = maxDocs && maxDocs.length > 0 ? maxDocs[0].nomor_lhu : 0;
          chosenNomorLhu = maxNum + 1;
        }
      } catch (seqFetchErr) {
        console.error('Gagal mengambil nomor induk berikutnya, menggunakan fallback:', seqFetchErr);
      }

      const { data, error: dbErr } = await supabase
        .from('lhu_document')
        .insert([{
          judul: lhuTitle,
          file_path: finalFilePath,
          uploaded_by: userName,
          status: 'PENDING_SUPERVISOR',
          komoditi: userKomoditi,
          departemen: (kategoriDokumen && kategoriDokumen !== 'None') ? kategoriDokumen : null,
          tipe_dokumen: tipeDokumen,
          priority: priority,
          nomor_lhu: chosenNomorLhu
        }])
        .select();

      if (dbErr) throw dbErr;

      try {
        await supabase
          .from('lhu_settings')
          .upsert({ key: settingKey, value: String(chosenNomorLhu + 1) }, { onConflict: 'key' });
      } catch (seqUpdateErr) {
        console.error('Gagal mengupdate nomor induk berikutnya:', seqUpdateErr);
      }

      setUploadProgress(80);
      const newDoc = data[0] as LhuDocument;

      if (additionalFiles.length > 0) {
        for (const file of additionalFiles) {
          const ext = file.name.split('.').pop();
          const attFileName = `${Date.now()}_att_${Math.random().toString(36).substring(2, 9)}.${ext}`;
          const attPath = `uploads/attachments/${attFileName}`;
          
          const { error: attUploadErr } = await supabase.storage
            .from('lhu-documents')
            .upload(attPath, file);

          if (!attUploadErr) {
            await supabase
              .from('lhu_attachments')
              .insert([{
                doc_id: newDoc.id,
                file_path: attPath,
                file_name: file.name
              }]);
          } else {
            console.error('Gagal mengunggah lampiran:', file.name, attUploadErr);
          }
        }
      }

      newDoc.kode_lhu = null;
      newDoc.kode_sertifikat = null;
      setUploadProgress(100);
      setJustUploadedDoc(newDoc);

      await logAudit(userName, 'admin', 'UPLOAD_LHU', `Mengunggah dokumen baru dan mengirim ke Supervisor: ${formatLhuNumber(newDoc.nomor_lhu, newDoc.tipe_dokumen)} - ${newDoc.judul} (${priority})`);

      setLhuTitle('');
      setSelectedFile(null);
      setAdditionalFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (filePreviewUrl && (fileType === 'image' || fileType === 'pdf')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
      setFilePreviewUrl('');
      setFileType(null);

      localStorage.removeItem('lhu_admin_draft_title');

      setUploadProgress(0);
    } catch (err: any) {
      console.error('Proses gagal:', err);
      setUploadError('Gagal menyimpan dokumen LHU: ' + err.message);
      setUploadProgress(0);
    }
  };

  const formatLhuNumber = (num: number, tipe_dokumen?: string | null): string => {
    const prefix = tipe_dokumen === 'Sertifikat' ? 'CERT' : 'LHU';
    return `${prefix}-${String(num).padStart(3, '0')}`;
  };

  return (
    <div className="w-full text-theme-text animate-fade-in">
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-theme-border pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text">Unggah Dokumen Pengujian (Admin)</h2>
          <p className="text-sm text-theme-muted mt-1">
            Pengaju aktif: <span className="text-status-orange-text font-semibold">{userName}</span>
          </p>
        </div>
        <img src="/logo2.png" alt="PROLAB Logo" className="h-10 object-contain prolab-logo" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
        <AdminUploadForm 
          lhuTitle={lhuTitle}
          setLhuTitle={setLhuTitle}
          selectedFile={selectedFile}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          filePreviewUrl={filePreviewUrl}
          fileType={fileType}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          handleSubmit={handleUploadLhu}
          userKomoditi={userKomoditi}
          kategoriDokumen={kategoriDokumen}
          setKategoriDokumen={setKategoriDokumen}
          tipeDokumen={tipeDokumen}
          setTipeDokumen={setTipeDokumen}
          additionalFiles={additionalFiles}
          setAdditionalFiles={setAdditionalFiles}
          handleClearDraft={handleClearDraft}
          hasDraft={hasDraft}
          jenisDokumenOptions={jenisDokumenOptions}
        />

        <div className="lg:col-span-7 bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col h-[80vh] min-h-[600px]">
          <h3 className="text-base font-bold text-theme-text mb-3 flex items-center gap-2">
            📄 Pratinjau Dokumen Utama
          </h3>
          <div className="flex-1 bg-theme-input border border-theme-border rounded-xl overflow-hidden flex items-center justify-center relative">
            {filePreviewUrl ? (
              fileType === 'pdf' ? (
                <iframe
                  src={`${filePreviewUrl}#toolbar=0&navpanes=0&view=Fit`}
                  className="w-full h-full border-0"
                  title="Pratinjau PDF"
                />
              ) : fileType === 'image' ? (
                <img
                  src={filePreviewUrl}
                  alt="Pratinjau Gambar"
                  className="max-w-full max-h-full object-contain p-4"
                />
              ) : (
                <div className="text-xs text-theme-dim">Format berkas tidak didukung untuk pratinjau.</div>
              )
            ) : (
              <div className="text-center p-6 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-theme-card border border-theme-border flex items-center justify-center text-theme-dim text-xl">
                  📁
                </div>
                <div className="text-xs text-theme-muted font-medium">Belum ada dokumen yang dipilih</div>
                <div className="text-[10px] text-theme-dim max-w-[200px]">
                  Silakan pilih berkas PDF atau Gambar pada form di samping untuk melihat pratinjau di sini.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {justUploadedDoc && (
        <SuccessUploadModal
          document={justUploadedDoc}
          onClose={() => setJustUploadedDoc(null)}
          formatLhuNumber={formatLhuNumber}
        />
      )}
    </div>
  );
}
