"use client";

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, ExternalLink, Copy, Check, Send } from 'lucide-react';
import { LhuDocument } from '../types';

interface QrDocumentModalProps {
  document: LhuDocument;
  onClose: () => void;
  formatLhuNumber: (num: number, tipe_dokumen?: string | null) => string;
}

export default function QrDocumentModal({ document: doc, onClose, formatLhuNumber }: QrDocumentModalProps) {
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify?id=${doc.id}`
    : `/verify?id=${doc.id}`;

  const docCode = (doc.status === 'APPROVED' && (doc.kode_lhu || doc.kode_sertifikat)) ? (doc.kode_lhu || doc.kode_sertifikat) : formatLhuNumber(doc.nomor_lhu, doc.tipe_dokumen);

  const [techPhone, setTechPhone] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('lhu_teknisi_wa_number') || '628' : '628'));
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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

  const getWhatsAppLink = (): string => {
    const docNumber = docCode;
    const message = `Halo, Dokumen *${docNumber}* ("${doc.judul}") telah disetujui dan resmi diterbitkan di E-Dokumen PROLAB!\n\n` +
      `Silakan lakukan verifikasi keaslian dokumen melalui link berikut:\n` +
      `${verifyUrl}`;
    const formattedPhone = formatPhoneNumber(techPhone);
    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  const handleWaClick = () => {
    if (techPhone.trim() && typeof window !== 'undefined') {
      localStorage.setItem('lhu_teknisi_wa_number', techPhone);
    }
  };

  const handleDownload = () => {
    const svg = window.document.getElementById('qr-svg-export');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = window.document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 20, 20, 360, 360);
      const link = window.document.createElement('a');
      link.download = `QR-${docCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(blob);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-base/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-theme-card border border-theme-border rounded-3xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme-border">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold tracking-wider text-theme-dim">QR Verifikasi Dokumen</span>
            <span className="text-xs font-bold text-status-blue-text font-mono mt-0.5">{docCode}</span>
          </div>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-text transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 p-6">
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <QRCodeSVG
              id="qr-svg-export"
              value={verifyUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="text-center">
            <p className="text-xs font-bold text-theme-text">{doc.judul}</p>
            <p className="text-[10px] text-theme-muted mt-1">
              {doc.komoditi && <span className="mr-2">{doc.komoditi}</span>}
              {doc.departemen && <span>{doc.departemen}</span>}
            </p>
            <p className="text-[9px] text-theme-dim mt-1 font-mono">
              Diunggah: {new Date(doc.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="flex w-full bg-theme-input border border-theme-border rounded-xl overflow-hidden">
            <input 
              type="text" 
              readOnly 
              className="bg-transparent px-3 py-2 text-[10px] text-theme-muted outline-none flex-1 truncate"
              value={verifyUrl}
            />
            <button
              onClick={handleCopyLink}
              className="bg-theme-card hover:bg-theme-hover px-2.5 border-l border-theme-border text-theme-muted transition-all cursor-pointer"
              title="Salin Link"
            >
              {copiedLink ? <Check size={14} className="text-status-emerald-text" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="px-5 pb-3 pt-2.5 border-t border-theme-border/60 flex flex-col gap-1.5 text-left">
          <label className="text-[10px] font-bold text-theme-muted">Kirim Verifikasi ke WhatsApp</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-1 focus:ring-blue-500/20 rounded-xl px-3 py-1.5 text-theme-text text-xs outline-none transition-all"
              placeholder="Contoh: 08123456789"
              value={techPhone}
              onChange={(e) => setTechPhone(e.target.value)}
            />
            <a
              href={getWhatsAppLink()}
              onClick={handleWaClick}
              target="_blank"
              rel="noreferrer"
              className={`bg-status-emerald-bg hover:bg-status-emerald-bg text-theme-text font-semibold text-xs px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm ${
                techPhone.replace(/\D/g, '').length < 9 ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <Send size={11} /> Kirim
            </a>
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-theme-border/60 flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 bg-theme-input border border-theme-border hover:border-slate-600 text-theme-muted font-semibold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Download size={13} /> Unduh QR
          </button>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-status-blue-bg border border-status-blue-border text-theme-text font-semibold text-xs py-2.5 rounded-xl transition-all cursor-pointer hover:shadow-[0_0_12px_rgba(37,99,235,0.35)]"
          >
            <ExternalLink size={13} /> Buka Link
          </a>
        </div>
      </div>
    </div>
  );
}
