import React from 'react';
import { XCircle, CheckCircle } from 'lucide-react';
import { Button } from 'antd';

interface BatchPanelProps {
  selectedDocIds: string[];
  setSelectedDocIds: (ids: string[]) => void;
  batchNote: string;
  setBatchNote: (val: string) => void;
  isProcessingBatch: boolean;
  handleBatchAction: (action: 'approve') => void;
}

export default function BatchPanel({
  selectedDocIds,
  setSelectedDocIds,
  batchNote,
  setBatchNote,
  isProcessingBatch,
  handleBatchAction
}: BatchPanelProps) {
  if (selectedDocIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[500px] bg-theme-card/95 border-2 border-status-blue-border rounded-none p-5 shadow-2xl z-50 animate-fade-in flex flex-col gap-4 backdrop-blur-md">
      <div className="flex justify-between items-center pb-2.5 border-b border-theme-border">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-status-blue-bg animate-ping rounded-none shrink-0" />
          <span className="text-xs font-bold text-theme-text uppercase tracking-wider">
            Tindakan Massal (Batch Verification)
          </span>
        </div>
        <span className="bg-status-blue-bg text-status-blue-text border border-status-blue-border text-[10px] font-bold px-2 py-0.5 rounded-none uppercase">
          {selectedDocIds.length} Berkas Terpilih
        </span>
      </div>
      
      <p className="text-[11px] text-theme-muted leading-relaxed">
        Verifikasi seluruh berkas yang Anda centang secara bersamaan dan ajukan ke Supervisor. Catatan di bawah akan diterapkan ke setiap dokumen.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-theme-muted font-bold uppercase tracking-wider">Catatan Pemeriksaan Batch</label>
        <textarea 
          value={batchNote}
          onChange={(e) => setBatchNote(e.target.value)}
          placeholder="Masukkan catatan massal untuk seluruh berkas..."
          className="w-full bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-1 focus:ring-blue-500/20 rounded-none px-3 py-2 text-theme-text text-xs outline-none resize-none transition-all placeholder-slate-400 dark:placeholder-slate-500"
          rows={2}
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button 
          onClick={() => { setSelectedDocIds([]); setBatchNote(''); }}
          className="h-10 border border-theme-border hover:bg-theme-hover text-theme-muted font-bold text-xs px-4 py-2 rounded-none transition-all cursor-pointer uppercase tracking-wider"
        >
          Batal
        </button>
        <Button 
          type="primary"
          disabled={isProcessingBatch}
          onClick={() => handleBatchAction('approve')}
          icon={<CheckCircle size={14} />}
          className="h-10 font-bold rounded-none uppercase tracking-wider bg-status-blue-bg border-status-blue-border hover:bg-status-blue-bg hover:border-status-blue-border"
        >
          Setujui ({selectedDocIds.length})
        </Button>
      </div>
    </div>
  );
}
