export interface TemplateData {
  nomor: number;
  komoditi: string;
  departemen: string;
  date: Date;
}

export interface DynamicPlaceholder {
  key: string;
  description: string;
  formula: string;
  category?: string;
}

export function parseTemplate(
  template: string,
  data: TemplateData,
  placeholders?: DynamicPlaceholder[] | null
): string {
  const pad = (num: number, size: number) => {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  };
  
  const getRomanMonth = (month: number) => {
    const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return roman[month] || "";
  };

  const shortCommodity: Record<string, string> = {
    'Elektronik': 'EL',
    'Besi Baja': 'BB',
    'RF': 'RF'
  };

  const shortDept: Record<string, string> = {
    'Safety': 'SF',
    'SKEM': 'SK'
  };

  const evaluateFormula = (formula: string): string => {
    const nomor = data.nomor;
    const komoditi = data.komoditi || '';
    const departemen = data.departemen || '';
    const date = data.date;
    try {
      const fn = new Function(
        'nomor', 'komoditi', 'departemen', 'date', 'pad', 'getRomanMonth', 'shortCommodity', 'shortDept',
        `try { return String(${formula}); } catch(e) { return ''; }`
      );
      return fn(nomor, komoditi, departemen, date, pad, getRomanMonth, shortCommodity, shortDept);
    } catch (e) {
      console.error('Error evaluating formula:', formula, e);
      return '';
    }
  };

  let result = template;
  
  if (placeholders && placeholders.length > 0) {
    const sorted = [...placeholders].sort((a, b) => b.key.length - a.key.length);
    for (const p of sorted) {
      const val = evaluateFormula(p.formula);
      result = result.replaceAll(p.key, val);
    }
  } else {
    const values: Record<string, string> = {
      '{nomor}': pad(data.nomor, 3),
      '{nomor_2}': pad(data.nomor, 2),
      '{nomor_4}': pad(data.nomor, 4),
      '{nomor_5}': pad(data.nomor, 5),
      '{nomor_raw}': String(data.nomor),
      '{departemen}': data.komoditi || '',
      '{DEPARTEMEN}': (data.komoditi || '').toUpperCase(),
      '{departemen_kode}': shortCommodity[data.komoditi] || data.komoditi || '',
      '{DEPARTEMEN_KODE}': (shortCommodity[data.komoditi] || data.komoditi || '').toUpperCase(),
      '{jenis_dokumen}': data.departemen || '',
      '{JENIS_DOKUMEN}': (data.departemen || '').toUpperCase(),
      '{jenis_dokumen_kode}': shortDept[data.departemen] || data.departemen || '',
      '{JENIS_DOKUMEN_KODE}': (shortDept[data.departemen] || data.departemen || '').toUpperCase(),
      '{komoditi}': data.komoditi || '',
      '{KOMODITI}': (data.komoditi || '').toUpperCase(),
      '{komoditi_kode}': shortCommodity[data.komoditi] || data.komoditi || '',
      '{KOMODITI_KODE}': (shortCommodity[data.komoditi] || data.komoditi || '').toUpperCase(),
      '{hari}': pad(data.date.getDate(), 2),
      '{bulan}': pad(data.date.getMonth() + 1, 2),
      '{bulan_romawi}': getRomanMonth(data.date.getMonth()),
      '{tahun}': String(data.date.getFullYear()),
      '{tahun_2}': String(data.date.getFullYear()).slice(-2)
    };

    const sortedKeys = Object.keys(values).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      result = result.replaceAll(key, values[key]);
    }
  }

  return result;
}
