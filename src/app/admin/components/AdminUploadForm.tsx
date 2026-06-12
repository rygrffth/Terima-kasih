import React, { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { DocumentFormFactory } from './DocumentFormFactory';

interface UploadFormProps {
  lhuTitle: string;
  setLhuTitle: (val: string) => void;
  selectedFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filePreviewUrl: string;
  fileType: 'image' | 'pdf' | null;
  uploadProgress: number;
  uploadError: string;
  handleSubmit: (e: React.FormEvent) => void;
  userKomoditi: string | null;
  kategoriDokumen: string;
  setKategoriDokumen: (val: string) => void;
  tipeDokumen: 'LHU' | 'Sertifikat';
  setTipeDokumen: (val: 'LHU' | 'Sertifikat') => void;
  additionalFiles: File[];
  setAdditionalFiles: (files: File[]) => void;
  handleClearDraft: () => void;
  hasDraft: boolean;
  jenisDokumenOptions?: string[];
}

export default function AdminUploadForm({
  lhuTitle,
  setLhuTitle,
  selectedFile,
  fileInputRef,
  handleFileChange,
  filePreviewUrl,
  fileType,
  uploadProgress,
  uploadError,
  handleSubmit,
  userKomoditi,
  kategoriDokumen,
  setKategoriDokumen,
  tipeDokumen,
  setTipeDokumen,
  additionalFiles,
  setAdditionalFiles,
  handleClearDraft,
  hasDraft,
  jenisDokumenOptions
}: UploadFormProps) {
  return (
    <div className="lg:col-span-5 bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
      <h3 className="text-lg font-bold flex items-center gap-2 text-status-orange-text mb-2">
        <Upload size={18} /> Unggah Pengajuan Baru
      </h3>
      <p className="text-xs text-theme-muted mb-4">
        Nomor LHU urut akan diterbitkan otomatis setelah dokumen disimpan ke database.
      </p>

      <div className="flex gap-6 p-3.5 bg-theme-input border border-theme-border rounded-2xl mb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase font-bold text-theme-dim tracking-wider">Departemen Terdaftar</span>
          <span className="text-xs font-bold text-status-blue-text">
            {userKomoditi || 'Semua'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {hasDraft && (
          <div className="flex items-center justify-between bg-status-blue-bg border border-status-blue-border px-3.5 py-2.5 rounded-xl text-xs text-status-blue-text">
            <span className="font-semibold">✨ Draf pengisian tersimpan otomatis</span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-[10px] font-bold text-status-red-text hover:text-status-red-text hover:underline bg-transparent border-0 cursor-pointer"
            >
              Hapus Draf
            </button>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-3 py-2.5 rounded-lg">
            <AlertCircle size={16} /> {uploadError}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-theme-muted">Judul Pengujian</label>
          <input 
            type="text" 
            className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none transition-all placeholder-slate-500" 
            placeholder="Contoh: Pengujian Kimia Udara Ambien - PT Maju Jaya"
            required
            value={lhuTitle}
            onChange={(e) => setLhuTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-theme-muted">Jenis Dokumen</label>
          <select
            value={kategoriDokumen}
            onChange={(e) => setKategoriDokumen(e.target.value)}
            disabled={!jenisDokumenOptions || jenisDokumenOptions.length === 0}
            className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          >
            <option value="None">None (Tanpa Jenis Dokumen)</option>
            {jenisDokumenOptions?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-theme-muted">Format Dokumen</label>
          <select
            value={tipeDokumen}
            onChange={(e) => setTipeDokumen(e.target.value as 'LHU' | 'Sertifikat')}
            className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none transition-all cursor-pointer"
          >
            <option value="LHU">LHU</option>
            <option value="Sertifikat">Sertifikat</option>
          </select>
        </div>

        {DocumentFormFactory.createForm(userKomoditi, {})}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-theme-muted">File Dokumen Utama (PDF atau Gambar)</label>
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".pdf, image/*"
            className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2 text-theme-muted text-xs outline-none transition-all file:mr-3 file:py-0.5 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-theme-card file:text-theme-muted hover:file:bg-theme-hover file:cursor-pointer"
            onChange={handleFileChange}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-theme-muted">Lampiran Tambahan (Opsional, PDF/Gambar)</label>
          <input
            type="file"
            multiple
            accept=".pdf, image/*"
            className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2 text-theme-muted text-xs outline-none transition-all file:mr-3 file:py-0.5 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-theme-card file:text-theme-muted hover:file:bg-theme-hover file:cursor-pointer"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              setAdditionalFiles(files);
            }}
          />
        </div>

        {uploadProgress > 0 && (
          <div className="w-full bg-theme-input rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-status-orange-bg h-1.5 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={uploadProgress > 0}
          className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs"
        >
          {uploadProgress > 0 ? `Mengunggah (${uploadProgress}%)` : 'Simpan & Ajukan Dokumen'}
        </button>
      </form>
    </div>
  );
}
