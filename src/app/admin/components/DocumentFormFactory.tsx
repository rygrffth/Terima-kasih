import React from 'react';

interface FactoryProps {
  komoditi?: string | null;
}

export function ElektronikForm({}: FactoryProps) {
  return (
    <div className="flex flex-col gap-1.5 p-3 bg-status-blue-bg border border-status-blue-border rounded-xl">
      <span className="text-xs font-semibold text-status-blue-text">Field Tambahan: Departemen Elektronik</span>
      <p className="text-[10px] text-theme-muted">
        Pastikan semua parameter pengukuran tegangan & arus telah dilampirkan dalam dokumen pendukung.
      </p>
    </div>
  );
}

export function LingkunganForm({}: FactoryProps) {
  return (
    <div className="flex flex-col gap-1.5 p-3 bg-status-emerald-bg border border-status-emerald-border rounded-xl">
      <span className="text-xs font-semibold text-status-emerald-text">Field Tambahan: Departemen Lingkungan</span>
      <p className="text-[10px] text-theme-muted">
        Pastikan lampiran form chain-of-custody (COC) sampel air/udara sudah terverifikasi.
      </p>
    </div>
  );
}

export function DefaultForm({}: FactoryProps) {
  return null;
}

export class DocumentFormFactory {
  static createForm(komoditi: string | null, props: FactoryProps) {
    if (!komoditi) {
      return <DefaultForm {...props} />;
    }

    const lowerKomoditi = komoditi.toLowerCase();
    
    if (lowerKomoditi.includes('elektronik')) {
      return <ElektronikForm {...props} />;
    } else if (lowerKomoditi.includes('lingkungan') || lowerKomoditi.includes('kimia')) {
      return <LingkunganForm {...props} />;
    }

    return <DefaultForm {...props} />;
  }
}
