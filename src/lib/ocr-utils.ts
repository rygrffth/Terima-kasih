import { createWorker } from 'tesseract.js';

export interface OcrResult {
  text: string;
  customerName?: string;
  sampleId?: string;
  judul?: string;
}

export function parseTextResult(text: string): OcrResult {
  let customerName = '';
  const customerRegexes = [
    /(?:nama\s+pelanggan|pelanggan|customer|kepada\s+yth|yth\.?)\s*[:=-]?\s*([^\n]+)/i,
    /(?:perusahaan|company)\s*[:=-]?\s*([^\n]+)/i
  ];
  for (const regex of customerRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      customerName = match[1].trim();
      break;
    }
  }

  let sampleId = '';
  const sampleRegexes = [
    /(?:no\.?\s+sampel|nomor\s+sampel|identitas\s+sampel|sample\s+id|kode\s+sampel)\s*[:=-]?\s*([^\n]+)/i,
    /(?:nama\s+sampel|deskripsi\s+sampel)\s*[:=-]?\s*([^\n]+)/i
  ];
  for (const regex of sampleRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      sampleId = match[1].trim();
      break;
    }
  }

  let judul = '';
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  const titleCandidates = lines.filter(line => 
    line.toUpperCase().includes('SERTIFIKAT') || 
    line.toUpperCase().includes('LHU') || 
    line.toUpperCase().includes('LAPORAN') || 
    line.toUpperCase().includes('HASIL')
  );
  if (titleCandidates.length > 0) {
    judul = titleCandidates[0];
  } else if (lines.length > 0) {
    judul = lines[0];
  }

  return {
    text,
    customerName: customerName || undefined,
    sampleId: sampleId || undefined,
    judul: judul || undefined
  };
}

export async function performOcr(imageFile: File | string): Promise<OcrResult> {
  const worker = await createWorker('eng+ind');
  try {
    const ret = await worker.recognize(imageFile);
    const text = ret.data.text;
    await worker.terminate();
    return parseTextResult(text);
  } catch (error) {
    await worker.terminate();
    throw error;
  }
}

export async function performOcrOrPdfText(file: File): Promise<OcrResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  
  if (isPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjs = await import('pdfjs-dist/build/pdf');
      
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '3.4.120'}/build/pdf.worker.min.js`;
      
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      
      let lastY = -1;
      let text = '';
      for (const item of textContent.items as any[]) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          text += '\n';
        }
        text += item.str + ' ';
        lastY = item.transform[5];
      }
      
      if (text.trim().length > 10) {
        return parseTextResult(text);
      } else {
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Gagal mendapatkan konteks canvas untuk render PDF.');
        }
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        const dataUrl = canvas.toDataURL('image/png');
        return performOcr(dataUrl);
      }
    } catch (err) {
      console.error('Error extracting PDF text directly, falling back to OCR:', err);
      throw err;
    }
  } else {
    return performOcr(file);
  }
}
