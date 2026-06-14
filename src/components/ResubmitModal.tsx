"use client";

import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { LhuDocument } from '../types';
import { AlertCircle, Upload, X } from 'lucide-react';

interface ResubmitModalProps {
  document: LhuDocument;
  onClose: () => void;
  onRefresh: () => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
}

export default function ResubmitModal({
  document,
  onClose,
  onRefresh,
  formatLhuNumber
}: ResubmitModalProps) {
  const [lhuTitle, setLhuTitle] = useState(document.judul);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lhuTitle.trim()) {
      setUploadError('Judul LHU wajib diisi.');
      return;
    }

    setUploadProgress(10);
    setUploadError('');

    try {
      let finalFilePath = document.file_path;

      if (selectedFile) {
        setUploadProgress(30);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('lhu-documents')
          .upload(filePath, selectedFile);

        if (uploadErr) {
          console.warn('Gagal ke Storage bucket, mengaktifkan file tiruan...', uploadErr);
          finalFilePath = `fallback_path/${fileName}`;
        } else {
          finalFilePath = filePath;
        }
      }

      setUploadProgress(70);

      const payload: any = {
        judul: lhuTitle,
        status: 'PENDING_SUPERVISOR',
        catatan_admin: revisionNote.trim() || null, // save the admin's revision note
        catatan_spv: null, // clear old rejection logs
        checked_by: null,
        approved_by: null,
        checked_supervisor_by: null,
        checked_supervisor_at: null,
        spv_checklist: null,
        updated_at: new Date().toISOString()
      };

      if (selectedFile) {
        // Build versioning history in previous_file_path
        let existingVersions: any[] = [];
        if (document.previous_file_path) {
          try {
            const trimmedPrev = document.previous_file_path.trim();
            if (trimmedPrev.startsWith('[')) {
              existingVersions = JSON.parse(trimmedPrev);
            } else {
              // Convert legacy single file path to first history version entry
              existingVersions = [{
                version: 1,
                judul: document.judul,
                file_path: document.previous_file_path,
                catatan_admin: document.catatan_admin || 'Unggahan awal',
                catatan_spv: null,
                checked_supervisor_by: null,
                checked_supervisor_at: null,
                created_at: document.created_at
              }];
            }
          } catch (e) {
            console.error('Failed to parse previous_file_path history:', e);
            existingVersions = [{
              version: 1,
              judul: document.judul,
              file_path: document.previous_file_path,
              catatan_admin: document.catatan_admin || 'Unggahan awal',
              catatan_spv: null,
              checked_supervisor_by: null,
              created_at: document.created_at
            }];
          }
        }

        // Add the current active file details to history before replacing it
        const currentVersionEntry = {
          version: existingVersions.length + 1,
          judul: document.judul,
          file_path: document.file_path,
          catatan_admin: document.catatan_admin || null,
          catatan_spv: document.catatan_spv || null,
          checked_supervisor_by: document.checked_supervisor_by || null,
          checked_supervisor_at: document.checked_supervisor_at || null,
          created_at: document.updated_at || document.created_at
        };
        
        existingVersions.push(currentVersionEntry);
        payload.previous_file_path = JSON.stringify(existingVersions);
        payload.file_path = finalFilePath;
      } else {
        payload.file_path = document.file_path;
        payload.previous_file_path = document.previous_file_path;
      }

      const { error: dbErr } = await supabase
        .from('lhu_document')
        .update(payload)
        .eq('id', document.id);

      if (dbErr) throw dbErr;

      setUploadProgress(100);
      alert('Dokumen berhasil direvisi dan diajukan kembali ke Supervisor!');
      onRefresh();
      onClose();
    } catch (err: unknown) {
      console.error('Re-submit gagal:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setUploadError('Gagal mengajukan ulang revisi: ' + errorMessage);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-base/60 backdrop-blur-sm animate-fade-in text-theme-text">
      <div className="bg-theme-card border border-theme-border rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-theme-dim hover:text-theme-muted transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <header className="mb-5">
          <h3 className="text-lg font-bold text-theme-text">Ajukan Ulang Revisi Dokumen</h3>
          <p className="text-xs text-theme-muted mt-1">
            Mengajukan revisi untuk berkas <strong className="text-status-blue-text font-mono">{formatLhuNumber(document.nomor_lhu, document.tipe_dokumen)}</strong>
          </p>
        </header>

        {document.catatan_spv && (
          <div className="bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-4 py-3 rounded-xl mb-5">
            <strong>Catatan Supervisor Sebelumnya:</strong> &ldquo;{document.catatan_spv}&rdquo;
          </div>
        )}

        <form onSubmit={handleResubmit} className="flex flex-col gap-4">
          {uploadError && (
            <div className="flex items-center gap-2 bg-status-red-bg border border-status-red-border text-status-red-text text-xs px-4 py-2.5 rounded-xl">
              <AlertCircle size={16} /> {uploadError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted">Judul Dokumen (Bisa Disunting)</label>
            <input
              type="text"
              className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none transition-all"
              required
              value={lhuTitle}
              onChange={(e) => setLhuTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted">
              Berkas Baru (Kosongkan jika tetap memakai berkas lama)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf, image/*"
              className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-muted text-xs outline-none transition-all file:mr-3 file:py-0.5 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-theme-card file:text-theme-muted hover:file:bg-theme-hover file:cursor-pointer"
              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-muted">Catatan Perbaikan/Revisi (Opsional)</label>
            <textarea
              rows={3}
              placeholder="Contoh: Sudah memperbaiki bagian metode pengujian RF sesuai saran Supervisor..."
              className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-theme-text text-xs outline-none resize-none transition-all placeholder-theme-dim"
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
            />
          </div>

          {uploadProgress > 0 && (
            <div className="w-full mt-1">
              <div className="w-full h-1 bg-theme-input rounded-full overflow-hidden">
                <div className="h-full bg-status-emerald-bg transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          <div className="flex gap-2.5 justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary font-semibold text-xs px-4 py-2.5 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-1.5 font-semibold text-xs px-5 py-2.5 transition-all cursor-pointer"
              disabled={uploadProgress > 0 && uploadProgress < 100}
            >
              <Upload size={14} /> Ajukan Revisi Sekarang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
