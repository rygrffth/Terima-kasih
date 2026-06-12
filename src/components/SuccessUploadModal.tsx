"use client";

import React, { useState } from 'react';
import { LhuDocument } from '../types';
import { CheckCircle, X, Send } from 'lucide-react';

interface SuccessUploadModalProps {
  document: LhuDocument;
  onClose: () => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
}

export default function SuccessUploadModal({
  document,
  onClose,
  formatLhuNumber
}: SuccessUploadModalProps) {
  const [phone, setPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lhu_admin_wa_number') || '';
    }
    return '';
  });

  const formatPhoneNumber = (num: string): string => {
    let cleaned = num.replace(/\D/g, ''); // keep only digits
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('62') && cleaned.length > 0) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  const handleWaClick = () => {
    if (phone.trim()) {
      localStorage.setItem('lhu_admin_wa_number', phone);
    }
  };

  const getWhatsAppLink = (): string => {
    const docNumber = formatLhuNumber(document.nomor_lhu, document.tipe_dokumen);
    const message = `Halo Admin, mohon bantuan untuk mengecek dokumen *${docNumber}* ("${document.judul}") yang baru saja saya unggah di aplikasi E-Dokumen. Terima kasih!`;
    const formattedPhone = formatPhoneNumber(phone);
    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const isPhoneValid = phone.replace(/\D/g, '').length >= 9;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-base/60 backdrop-blur-sm animate-fade-in text-theme-text">
      <div className="bg-theme-card border border-theme-border rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-theme-dim hover:text-theme-muted transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text rounded-full mb-4">
            <CheckCircle size={40} />
          </div>
          
          <h3 className="text-xl font-bold text-theme-text mb-1.5">Dokumen Berhasil Diunggah!</h3>
          <p className="text-xs text-theme-muted mb-5">
            Sistem telah menerbitkan nomor induk dokumen resmi secara berurutan.
          </p>

          <div className="w-full bg-theme-input border border-theme-border rounded-2xl p-4 mb-5 text-left flex flex-col gap-3">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-theme-dim block">Nomor Induk Dokumen Anda</span>
              <span className="font-mono font-bold text-lg text-status-blue-text">{formatLhuNumber(document.nomor_lhu, document.tipe_dokumen)}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-theme-dim block">Judul Dokumen</span>
              <span className="text-xs font-semibold text-theme-muted line-clamp-2 leading-tight">{document.judul}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold tracking-wider text-theme-dim block">Pengunggah</span>
              <span className="text-xs font-semibold text-theme-muted">{document.uploaded_by}</span>
            </div>
          </div>

          <div className="w-full text-left mb-5 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-theme-muted">Nomor WhatsApp Admin Penerima</label>
            <input 
              type="text" 
              className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500"
              placeholder="Contoh: 08123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <span className="text-[10px] text-theme-dim">
              Pesan WhatsApp notifikasi pemeriksaan akan dikirimkan langsung ke nomor ini.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <a
              href={getWhatsAppLink()}
              onClick={handleWaClick}
              target="_blank"
              rel="noreferrer"
              className={`btn-success flex-1 flex items-center justify-center gap-2 font-semibold text-xs px-4 py-3 rounded-xl cursor-pointer ${
                !isPhoneValid ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <Send size={14} /> Kirim Notifikasi (WhatsApp)
            </a>
            <button
              onClick={onClose}
              className="btn-secondary flex-1 font-semibold text-xs px-4 py-3 rounded-xl cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
