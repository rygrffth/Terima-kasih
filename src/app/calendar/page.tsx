"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LhuDocument } from '../../types';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Upload, CheckCircle, FileText, Filter, Eye, AlertCircle
} from 'lucide-react';

export default function DocumentCalendarPage() {
  const [documents, setDocuments] = useState<LhuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filtering states
  const [selectedDivisi, setSelectedDivisi] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<string>('ALL'); // 'ALL' | 'UPLOAD' | 'APPROVAL'

  // Selected Day Details panel
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<LhuDocument | null>(null);

  // Divisions list for filter
  const [divisions, setDivisions] = useState<string[]>([]);

  useEffect(() => {
    fetchDocuments();
    fetchDivisions();
  }, []);

  const fetchDivisions = async () => {
    try {
      const { data, error } = await supabase
        .from('lhu_divisions')
        .select('name');
      if (!error && data) {
        setDivisions(data.map(d => d.name));
      }
    } catch (e) {
      console.error('Gagal mengambil divisi:', e);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lhu_document')
        .select('*');
      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Gagal mengambil data dokumen untuk kalender:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper date functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const formatLhuNumber = (num: number, tipe_dokumen?: string | null): string => {
    const prefix = tipe_dokumen === 'Sertifikat' ? 'CERT' : 'LHU';
    return `${prefix}-${String(num).padStart(3, '0')}`;
  };

  const getDownloadUrl = (filePath: string): string => {
    if (filePath.startsWith('fallback_path/')) {
      return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    }
    const { data } = supabase.storage.from('lhu-documents').getPublicUrl(filePath);
    return data?.publicUrl || '#';
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_ADMIN':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-red-bg border border-status-red-border text-status-red-text">Perlu Revisi</span>;
      case 'PENDING_SUPERVISOR':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-amber-bg border border-status-amber-border text-status-amber-text">Cek Supervisor</span>;
      case 'PENDING_MANAGER':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-orange-bg border border-status-orange-border text-status-orange-text">Cek Manager QHSE</span>;
      case 'APPROVED':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-emerald-bg border border-status-emerald-border text-status-emerald-text">Disetujui</span>;
      case 'REJECTED':
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-red-bg border border-status-red-border text-status-red-text">Ditolak</span>;
      default:
        return null;
    }
  };

  // Filter documents based on division, type, and status
  const getFilteredDocs = () => {
    return documents.filter(doc => {
      if (selectedDivisi !== 'ALL' && doc.komoditi !== selectedDivisi) return false;
      if (selectedType !== 'ALL' && doc.tipe_dokumen !== selectedType) return false;
      return true;
    });
  };

  const filteredDocs = getFilteredDocs();

  // Find document events for a specific day
  const getDayEvents = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const uploads: LhuDocument[] = [];
    const approvals: LhuDocument[] = [];

    filteredDocs.forEach(doc => {
      // 1. Upload date match
      if (doc.created_at) {
        const uDate = new Date(doc.created_at);
        if (uDate.getFullYear() === year && uDate.getMonth() === month && uDate.getDate() === day) {
          if (selectedActivity === 'ALL' || selectedActivity === 'UPLOAD') {
            uploads.push(doc);
          }
        }
      }

      // 2. Approval date match (if approved)
      if (doc.status === 'APPROVED' && (doc.approved_at || doc.updated_at)) {
        const aDate = new Date(doc.approved_at || doc.updated_at);
        if (aDate.getFullYear() === year && aDate.getMonth() === month && aDate.getDate() === day) {
          if (selectedActivity === 'ALL' || selectedActivity === 'APPROVAL') {
            approvals.push(doc);
          }
        }
      }
    });

    return { uploads, approvals };
  };

  // Build Calendar Days
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayIndex = getFirstDayOfMonth(currentDate);
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const calendarDays = [];
  // Empty slots for days before the start of the month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Details of currently selected day
  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : { uploads: [], approvals: [] };
  const totalSelectedEventsCount = selectedDayEvents.uploads.length + selectedDayEvents.approvals.length;

  return (
    <div className="w-full text-theme-text animate-fade-in">
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-theme-border pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text flex items-center gap-2">
            <CalendarIcon className="text-status-orange-text" size={24} /> Kalender Aktivitas Dokumen
          </h2>
          <p className="text-sm text-theme-muted mt-1">
            Pantau linimasa unggahan draf LHU dan persetujuan sertifikat secara visual.
          </p>
        </div>
        <img src="/logo2.png" alt="PROLAB Logo" className="h-10 object-contain prolab-logo" />
      </header>

      {/* Filter Toolbar */}
      <div className="bg-theme-card border border-theme-border p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3.5 items-center">
          <span className="text-xs font-bold text-theme-muted flex items-center gap-1.5 uppercase tracking-wider">
            <Filter size={12} className="text-status-orange-text" /> Filter Kalender:
          </span>

          {/* Division Filter */}
          <div className="flex flex-col gap-1">
            <select
              value={selectedDivisi}
              onChange={(e) => { setSelectedDivisi(e.target.value); setSelectedDay(null); }}
              className="bg-theme-input border border-theme-border px-3 py-1.5 text-xs text-theme-text focus:border-status-orange-border outline-none transition-colors"
            >
              <option value="ALL">Semua Divisi (Komoditi)</option>
              {divisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>

          {/* Document Type Filter */}
          <div className="flex flex-col gap-1">
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setSelectedDay(null); }}
              className="bg-theme-input border border-theme-border px-3 py-1.5 text-xs text-theme-text focus:border-status-orange-border outline-none transition-colors"
            >
              <option value="ALL">Semua Tipe Dokumen</option>
              <option value="LHU">LHU (Laporan Hasil Uji)</option>
              <option value="Sertifikat">Sertifikat</option>
            </select>
          </div>

          {/* Activity Filter */}
          <div className="flex flex-col gap-1">
            <select
              value={selectedActivity}
              onChange={(e) => { setSelectedActivity(e.target.value); setSelectedDay(null); }}
              className="bg-theme-input border border-theme-border px-3 py-1.5 text-xs text-theme-text focus:border-status-orange-border outline-none transition-colors"
            >
              <option value="ALL">Semua Aktivitas</option>
              <option value="UPLOAD">Hanya Unggahan</option>
              <option value="APPROVAL">Hanya Persetujuan (Approved)</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-[10px] font-bold text-theme-muted uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-status-blue-text inline-block" />
            <span>Unggah Baru</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-status-emerald-text inline-block" />
            <span>Disetujui (Approved)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid Container */}
        <div className="lg:col-span-8 bg-theme-card border border-theme-border p-6 shadow-xl relative">
          
          {/* Month/Year Controller */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-theme-text flex items-center gap-2">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={prevMonth}
                className="p-1.5 bg-theme-input border border-theme-border hover:bg-theme-hover text-theme-text transition-colors cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => { setCurrentDate(new Date()); setSelectedDay(null); }}
                className="px-3 py-1.5 bg-theme-input border border-theme-border hover:bg-theme-hover text-xs font-bold text-theme-text transition-colors cursor-pointer uppercase tracking-wider"
              >
                Bulan Ini
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 bg-theme-input border border-theme-border hover:bg-theme-hover text-theme-text transition-colors cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
            {["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((day, idx) => (
              <div 
                key={day} 
                className={`py-2 text-[10px] font-bold uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? 'text-status-orange-text' : 'text-theme-muted'
                }`}
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          {loading ? (
            <div className="h-96 flex items-center justify-center text-xs text-theme-muted">
              Memuat data kalender...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-16 bg-theme-input/10 border border-transparent" />;
                }

                const { uploads, approvals } = getDayEvents(day);
                const hasEvents = uploads.length > 0 || approvals.length > 0;
                const isSelected = selectedDay === day;
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

                return (
                  <div
                    key={`day-${day}`}
                    onClick={() => setSelectedDay(day)}
                    className={`h-16 p-1.5 border flex flex-col justify-between transition-all cursor-pointer relative group ${
                      isSelected 
                        ? 'bg-status-orange-bg/25 border-status-orange-border' 
                        : isToday 
                          ? 'bg-theme-input/50 border-theme-text'
                          : 'bg-theme-input/20 border-theme-border/60 hover:bg-theme-input/40'
                    }`}
                  >
                    {/* Day Number */}
                    <span className={`text-[10px] font-mono font-bold ${
                      isToday ? 'text-theme-text bg-theme-input px-1 py-0.2 border border-theme-border' : 'text-theme-muted group-hover:text-theme-text'
                    }`}>
                      {day}
                    </span>

                    {/* Miniature Badges */}
                    {hasEvents && (
                      <div className="flex flex-col gap-0.5 mt-1">
                        {uploads.length > 0 && (
                          <div className="h-1.5 bg-status-blue-text rounded-none opacity-85" title={`${uploads.length} Dokumen Baru`} />
                        )}
                        {approvals.length > 0 && (
                          <div className="h-1.5 bg-status-emerald-text rounded-none opacity-85" title={`${approvals.length} Dokumen Disetujui`} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side Panel: Event List for Selected Day */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          <div className="bg-theme-card border border-theme-border p-6 shadow-xl min-h-[384px] flex flex-col justify-between">
            <div>
              <div className="border-b border-theme-border pb-3 mb-4 flex justify-between items-center">
                <h4 className="text-xs font-bold text-theme-text uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarIcon size={12} className="text-status-orange-text" /> Detail Aktivitas
                </h4>
                {selectedDay && (
                  <span className="text-[10px] font-bold text-status-orange-text bg-status-orange-bg px-2 py-0.5">
                    {selectedDay} {monthNames[currentDate.getMonth()]}
                  </span>
                )}
              </div>

              {!selectedDay ? (
                <div className="text-center py-12 text-theme-dim text-xs flex flex-col items-center justify-center h-full">
                  <CalendarIcon size={28} className="text-theme-muted mb-2 animate-pulse" />
                  <span>Silakan klik tanggal pada kalender untuk melihat detail dokumen masuk atau selesai.</span>
                </div>
              ) : totalSelectedEventsCount === 0 ? (
                <div className="text-center py-12 text-theme-dim text-xs flex flex-col items-center justify-center">
                  <AlertCircle size={24} className="text-theme-muted mb-2" />
                  <span>Tidak ada unggahan atau persetujuan dokumen pada tanggal ini.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
                  
                  {/* Uploads List */}
                  {selectedDayEvents.uploads.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-status-blue-text flex items-center gap-1 mb-2">
                        <Upload size={10} /> Unggahan Dokumen ({selectedDayEvents.uploads.length})
                      </h5>
                      <div className="flex flex-col gap-2">
                        {selectedDayEvents.uploads.map(doc => (
                          <div key={doc.id} className="p-2.5 bg-theme-input/40 border border-theme-border/60 hover:border-theme-border rounded-none flex items-start justify-between gap-2 transition-colors">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-theme-text truncate">{doc.judul}</p>
                              <p className="text-[9px] text-theme-muted mt-0.5 flex items-center gap-1">
                                <span>Oleh: {doc.uploaded_by}</span>
                                <span>•</span>
                                <span className="font-mono bg-theme-input px-1 py-0.1 border border-theme-border text-theme-dim text-[8px]">{doc.komoditi}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1 bg-theme-input border border-theme-border hover:bg-theme-hover hover:text-status-orange-text transition-all text-theme-muted cursor-pointer shrink-0"
                              title="Detail Berkas"
                            >
                              <Eye size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approvals List */}
                  {selectedDayEvents.approvals.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-status-emerald-text flex items-center gap-1 mb-2">
                        <CheckCircle size={10} /> Persetujuan Final ({selectedDayEvents.approvals.length})
                      </h5>
                      <div className="flex flex-col gap-2">
                        {selectedDayEvents.approvals.map(doc => (
                          <div key={doc.id} className="p-2.5 bg-theme-input/40 border border-theme-border/60 hover:border-theme-border rounded-none flex items-start justify-between gap-2 transition-colors">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-theme-text truncate">{doc.judul}</p>
                              <p className="text-[9px] text-theme-muted mt-0.5 flex items-center gap-1">
                                <span className="text-status-emerald-text font-bold">Approved</span>
                                <span>•</span>
                                <span className="font-mono bg-theme-input px-1 py-0.1 border border-theme-border text-theme-dim text-[8px]">{doc.komoditi}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1 bg-theme-input border border-theme-border hover:bg-theme-hover hover:text-status-orange-text transition-all text-theme-muted cursor-pointer shrink-0"
                              title="Detail Berkas"
                            >
                              <Eye size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
            {selectedDay && totalSelectedEventsCount > 0 && (
              <div className="border-t border-theme-border pt-3 mt-4 text-[10px] text-theme-dim italic text-right">
                Menampilkan {totalSelectedEventsCount} aktivitas dokumen.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Detail Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal 
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          formatLhuNumber={formatLhuNumber}
          getDownloadUrl={getDownloadUrl}
          renderStatusBadge={renderStatusBadge}
        />
      )}
    </div>
  );
}
