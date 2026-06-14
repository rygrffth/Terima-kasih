"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, AlertTriangle, FileText, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [allowedKomoditi, setAllowedKomoditi] = useState<string[]>([]);
  const [allowedDepartemen, setAllowedDepartemen] = useState<string[]>([]);
  const [adminKomoditi, setAdminKomoditi] = useState<string | null>(null);
  const [adminDepartemen, setAdminDepartemen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTasks = async () => {
    const loggedUserStr = localStorage.getItem('lhu_logged_user');
    if (!loggedUserStr) return;
    const userObj = JSON.parse(loggedUserStr);
    
    let role = userObj.role;
    if (role === 'manager_lab' && userObj.departemen === 'direktur') {
      role = 'direktur';
    } else if (role === 'manager_lab') {
      role = 'manager_mutu';
    }
    setUserRole(role);
    setAdminKomoditi(userObj.komoditi || null);
    setAdminDepartemen(userObj.departemen || null);

    try {
      const { data: userData, error: userErr } = await supabase
        .from('lhu_users')
        .select('allowed_komoditi, allowed_departemen')
        .eq('username', userObj.username)
        .single();
      
      const allowedK = userData?.allowed_komoditi || (userObj.komoditi ? [userObj.komoditi] : []);
      const allowedD = userData?.allowed_departemen || (userObj.departemen ? [userObj.departemen] : []);
      setAllowedKomoditi(allowedK);
      setAllowedDepartemen(allowedD);

      const { data: docs, error } = await supabase
        .from('lhu_document')
        .select('*')
        .in('status', ['PENDING_ADMIN', 'PENDING_SUPERVISOR', 'PENDING_NUMBERING', 'PENDING_MANAGER'])
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      if (!docs) return;

      const filtered = docs.filter((doc) => {
        // 1. Division filtering
        const activeAllowedK = allowedK.length > 0 ? allowedK : (userObj.komoditi ? [userObj.komoditi] : []);
        if (activeAllowedK.length > 0 && !activeAllowedK.includes('ALL')) {
          if (!doc.komoditi || !activeAllowedK.includes(doc.komoditi)) return false;
        }
        // 2. Department filtering
        const activeAllowedD = allowedD.length > 0 ? allowedD : (userObj.departemen ? [userObj.departemen] : []);
        if (activeAllowedD.length > 0 && !activeAllowedD.includes('ALL')) {
          if (!doc.departemen || !activeAllowedD.includes(doc.departemen)) return false;
        }

        // 3. Status Action filtering
        if (role === 'admin') {
          return doc.status === 'PENDING_NUMBERING' || (doc.status === 'PENDING_ADMIN' && doc.catatan_spv !== null);
        } else if (role === 'supervisor') {
          return doc.status === 'PENDING_SUPERVISOR';
        } else if (role === 'manager_mutu' || role === 'direktur') {
          return doc.status === 'PENDING_MANAGER';
        } else if (role === 'tester') {
          return true;
        }
        return false;
      });

      setNotifications(filtered);
    } catch (err) {
      console.error('Gagal mengambil tugas notifikasi:', err);
    }
  };

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lhu_document' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    const handleLhuChanged = () => fetchTasks();
    window.addEventListener('lhu_document_changed', handleLhuChanged);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('lhu_document_changed', handleLhuChanged);
    };
  }, []);

  const getDocTargetLink = (doc: any) => {
    const div = encodeURIComponent(doc.komoditi || 'ALL');
    if (userRole === 'admin') {
      return `/admin/${div}/pending`;
    } else if (userRole === 'supervisor') {
      return `/supervisor/${div}/pending`;
    } else if (userRole === 'manager_mutu' || userRole === 'direktur') {
      return `/manager-mutu/lhu`;
    }
    return '/';
  };

  const getTaskDescription = (doc: any) => {
    if (doc.status === 'PENDING_NUMBERING') {
      return 'Butuh penomoran dokumen';
    } else if (doc.status === 'PENDING_ADMIN') {
      return 'Butuh revisi (dikembalikan Supervisor)';
    } else if (doc.status === 'PENDING_SUPERVISOR') {
      return 'Butuh audit pemeriksaan';
    } else if (doc.status === 'PENDING_MANAGER') {
      return 'Butuh persetujuan & tanda tangan';
    }
    return 'Tugas tertunda';
  };

  const hasUnread = notifications.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2.5 rounded-none bg-theme-card border border-theme-border text-theme-text hover:bg-theme-input transition-all active:scale-95 cursor-pointer shadow-xl relative"
        title="Tugas & Notifikasi"
      >
        <Bell size={14} className={hasUnread ? "animate-pulse" : ""} />
        {hasUnread && (
          <>
            <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-status-orange-bg border border-status-orange-border text-[9px] font-extrabold text-status-orange-text">
              {notifications.length}
            </span>
            <span className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 rounded-full bg-status-orange-bg border border-status-orange-border animate-ping opacity-45 pointer-events-none" />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-theme-card border border-theme-border rounded-none shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-theme-border bg-theme-input/50 flex justify-between items-center">
            <span className="text-xs font-bold text-theme-text flex items-center gap-1.5">
              <Bell size={12} className="text-status-orange-text" /> Tugas Aktif Anda
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-theme-input border border-theme-border text-theme-muted">
              {notifications.length} Tertunda
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-theme-border/60">
            {notifications.length > 0 ? (
              notifications.map((doc) => (
                <Link
                  key={doc.id}
                  href={getDocTargetLink(doc)}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 hover:bg-theme-input transition-colors group"
                >
                  <div className="flex gap-2.5 items-start">
                    <div className="mt-0.5">
                      {doc.status === 'PENDING_ADMIN' ? (
                        <AlertTriangle size={14} className="text-status-red-text" />
                      ) : (
                        <FileText size={14} className="text-status-orange-text" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-theme-text truncate group-hover:text-status-orange-text transition-colors">
                        {doc.judul}
                      </p>
                      <p className="text-[10px] text-theme-muted mt-0.5 flex justify-between items-center">
                        <span className="truncate pr-2">{getTaskDescription(doc)}</span>
                        <span className="text-[8px] font-bold bg-theme-input px-1.5 py-0.5 border border-theme-border rounded-none text-theme-dim shrink-0">
                          {doc.komoditi}
                        </span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <CheckCircle size={24} className="text-status-emerald-text mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-bold text-theme-text">Semua Tugas Selesai!</p>
                <p className="text-[10px] text-theme-dim mt-0.5">Tidak ada dokumen yang butuh tindakan Anda.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
