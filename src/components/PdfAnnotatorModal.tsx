"use client";

import React, { useEffect, useRef, useState } from 'react';
import { X, Save, Undo, Trash2, ChevronLeft, ChevronRight, PenTool } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfAnnotatorModalProps {
  fileUrl: string;
  documentId: string;
  onClose: () => void;
  onSaved: (annotatedFilePath: string) => void;
}

export default function PdfAnnotatorModal({ fileUrl, documentId, onClose, onSaved }: PdfAnnotatorModalProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [color, setColor] = useState('#ef4444'); // Default red
  const [lineWidth, setLineWidth] = useState(3);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<any[]>([]); // To store paths for undo
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const annotationsRef = useRef<Record<number, any[]>>({});

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
      } catch (err) {
        console.error('Error loading PDF:', err);
        alert('Gagal memuat PDF untuk anotasi.');
        onClose();
      }
    };
    loadPdf();
  }, [fileUrl, onClose]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, [pdfDoc, pageNum]);

  const renderPage = async (num: number) => {
    if (!pdfDoc || isRendering) return;
    setIsRendering(true);

    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: 1.5 }); // Scale 1.5 for better quality

      const canvas = canvasRef.current;
      const drawCanvas = drawCanvasRef.current;
      if (!canvas || !drawCanvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      drawCanvas.height = viewport.height;
      drawCanvas.width = viewport.width;
      
      const drawCtx = drawCanvas.getContext('2d');
      if (drawCtx) {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        
        const pagePaths = annotationsRef.current[num] || [];
        setPaths(pagePaths);
        
        pagePaths.forEach(path => {
          drawCtx.beginPath();
          drawCtx.strokeStyle = path.color;
          drawCtx.lineWidth = path.lineWidth;
          drawCtx.lineCap = 'round';
          drawCtx.lineJoin = 'round';
          
          if (path.points.length > 0) {
            drawCtx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
              drawCtx.lineTo(path.points[i].x, path.points[i].y);
            }
            drawCtx.stroke();
          }
        });
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    } finally {
      setIsRendering(false);
    }
  };

  const changePage = (offset: number) => {
    annotationsRef.current[pageNum] = paths;

    let newPage = pageNum + offset;
    if (newPage <= 0) newPage = 1;
    if (newPage > numPages) newPage = numPages;
    setPageNum(newPage);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawCanvasRef.current) return { x: 0, y: 0 };
    const rect = drawCanvasRef.current.getBoundingClientRect();
    
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const coords = getCoordinates(e);
    setCurrentPath([coords]);
    
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    
    setCurrentPath(prev => [...prev, coords]);

    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentPath.length > 0) {
      const newPaths = [...paths, { color, lineWidth, points: currentPath }];
      setPaths(newPaths);
      annotationsRef.current[pageNum] = newPaths; // Save immediately
    }
    setCurrentPath([]);
  };

  const clearCanvas = () => {
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx && drawCanvasRef.current) {
      ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
    }
    setPaths([]);
    annotationsRef.current[pageNum] = []; // Clear immediately
  };

  const undo = () => {
    if (paths.length === 0) return;
    
    const newPaths = [...paths];
    newPaths.pop();
    setPaths(newPaths);
    annotationsRef.current[pageNum] = newPaths; // Update immediately
    
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx && drawCanvasRef.current) {
      ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
      
      newPaths.forEach(path => {
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (path.points.length > 0) {
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        }
      });
    }
  };

  const handleSave = async () => {
    if (!pdfDoc) return;
    setIsSaving(true);

    try {
      annotationsRef.current[pageNum] = paths;

      // Get list of pages that have drawings from the ref
      const pagesWithDrawings = Object.keys(annotationsRef.current)
        .filter(p => annotationsRef.current[Number(p)] && annotationsRef.current[Number(p)].length > 0)
        .map(Number)
        .sort((a, b) => a - b);

      if (pagesWithDrawings.length === 0) {
        alert("Silakan buat coretan terlebih dahulu sebelum menyimpan.");
        setIsSaving(false);
        return;
      }

      const renderedPagesData: { canvas: HTMLCanvasElement, height: number, width: number }[] = [];

      for (const pNum of pagesWithDrawings) {
        const page = await pdfDoc.getPage(pNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) continue;

        await page.render({
          canvasContext: tempCtx,
          viewport: viewport
        }).promise;

        const pagePaths = annotationsRef.current[pNum] || [];
        tempCtx.lineCap = 'round';
        tempCtx.lineJoin = 'round';

        pagePaths.forEach(path => {
          tempCtx.beginPath();
          tempCtx.strokeStyle = path.color;
          tempCtx.lineWidth = path.lineWidth;
          if (path.points.length > 0) {
            tempCtx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
              tempCtx.lineTo(path.points[i].x, path.points[i].y);
            }
            tempCtx.stroke();
          }
        });

        renderedPagesData.push({
          canvas: tempCanvas,
          width: viewport.width,
          height: viewport.height
        });
      }

      if (renderedPagesData.length === 0) {
        throw new Error("Gagal me-render halaman bertanda.");
      }

      const finalCanvas = document.createElement('canvas');
      const maxWidth = Math.max(...renderedPagesData.map(d => d.width));
      const totalHeight = renderedPagesData.reduce((sum, d) => sum + d.height, 0);

      finalCanvas.width = maxWidth;
      finalCanvas.height = totalHeight;

      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) throw new Error("Gagal memuat context canvas gabungan.");

      let currentY = 0;
      for (const data of renderedPagesData) {
        finalCtx.drawImage(data.canvas, 0, currentY);
        currentY += data.height;
      }

      finalCanvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Gagal membuat gambar gabungan.");
        
        const fileName = `annotation_${documentId}_${Date.now()}.png`;
        const filePath = `annotations/${fileName}`;
        
        const { error: uploadErr } = await supabase.storage
          .from('lhu-documents')
          .upload(filePath, blob);
          
        if (uploadErr) throw uploadErr;

        const { error: dbErr } = await supabase
          .from('lhu_document')
          .update({ annotated_file_path: filePath })
          .eq('id', documentId);
          
        if (dbErr) throw dbErr;

        alert('Coretan berhasil disimpan! Anda sekarang bisa menolak (Reject) dokumen ini.');
        onSaved(filePath);
        onClose();
      }, 'image/png');

    } catch (err: any) {
      console.error('Save annotation error:', err);
      alert('Gagal menyimpan coretan: ' + err.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-theme-base/90 backdrop-blur-md animate-fade-in text-theme-text">
      <div className="h-16 bg-theme-card border-b border-theme-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-theme-border pr-4">
            <PenTool size={18} className="text-status-blue-text" />
            <h3 className="font-bold text-sm">Mode Coretan Revisi</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setColor('#ef4444')} className={`w-6 h-6 rounded-full bg-red-500 border-2 ${color === '#ef4444' ? 'border-white' : 'border-transparent'}`} title="Merah"></button>
            <button onClick={() => setColor('#3b82f6')} className={`w-6 h-6 rounded-full bg-blue-500 border-2 ${color === '#3b82f6' ? 'border-white' : 'border-transparent'}`} title="Biru"></button>
            <button onClick={() => setColor('#10b981')} className={`w-6 h-6 rounded-full bg-green-500 border-2 ${color === '#10b981' ? 'border-white' : 'border-transparent'}`} title="Hijau"></button>
            <button onClick={() => setColor('#eab308')} className={`w-6 h-6 rounded-full bg-yellow-500 border-2 ${color === '#eab308' ? 'border-white' : 'border-transparent'}`} title="Kuning"></button>
          </div>
          
          <div className="h-6 w-px bg-theme-border mx-2"></div>
          
          <div className="flex items-center gap-3">
            <button onClick={undo} disabled={paths.length === 0} className="flex items-center gap-1.5 text-xs font-semibold text-theme-muted hover:text-theme-text disabled:opacity-50 disabled:cursor-not-allowed">
              <Undo size={14} /> Undo
            </button>
            <button onClick={clearCanvas} className="flex items-center gap-1.5 text-xs font-semibold text-status-red-text hover:text-red-400">
              <Trash2 size={14} /> Hapus Semua
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-theme-input px-3 py-1.5 rounded-lg border border-theme-border">
            <button onClick={() => changePage(-1)} disabled={pageNum <= 1 || isRendering} className="text-theme-dim hover:text-theme-text disabled:opacity-50">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold font-mono">Halaman {pageNum} / {numPages || '-'}</span>
            <button onClick={() => changePage(1)} disabled={pageNum >= numPages || isRendering} className="text-theme-dim hover:text-theme-text disabled:opacity-50">
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary font-semibold text-xs px-4 py-2 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || paths.length === 0}
            className="btn-primary flex items-center gap-1.5 font-bold text-xs px-5 py-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Menyimpan...' : <><Save size={14} /> Simpan Coretan</>}
          </button>
        </div>
      </div>

      <div 
        className="flex-1 overflow-auto flex items-start justify-center p-8 bg-theme-base"
        ref={containerRef}
      >
        <div className="relative shadow-2xl bg-white select-none">
          {isRendering && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
              <div className="text-sm font-bold text-slate-800 animate-pulse">Memuat halaman...</div>
            </div>
          )}
          
          <canvas 
            ref={canvasRef} 
            className="block"
          />
          <canvas 
            ref={drawCanvasRef}
            className="absolute top-0 left-0 w-full h-full z-10 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
}
