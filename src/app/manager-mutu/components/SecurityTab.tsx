"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ShieldAlert, RefreshCw, Smartphone, Laptop, LogOut, CheckCircle, XCircle } from 'lucide-react';
import { logAudit } from '../../../lib/audit';

interface SessionItem {
  id: string;
  username: string;
  login_method: 'face' | 'token' | 'tester';
  device_info: string;
  is_active: boolean;
  created_at: string;
  last_active_at: string;
}

export default function SecurityTab() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<'ALL' | 'face' | 'token' | 'tester'>('ALL');

  const fetchSessions = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await supabase
        .from('lhu_sessions')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('last_active_at', oneHourAgo);

      const { data, error } = await supabase
        .from('lhu_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions((data as SessionItem[]) || []);
    } catch (err: any) {
      console.error('Gagal mengambil sesi login:', err);
      setDbError(err.message || 'Gagal menghubungi database untuk data sesi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel('realtime-lhu-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lhu_sessions'
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleForceLogout = async (sessionId: string, targetUser: string) => {
    if (!confirm(`Apakah Anda yakin ingin melakukan Force Logout (keluar paksa) untuk user "${targetUser}"?`)) {
      return;
    }

    setTerminatingId(sessionId);
    try {
      const { error } = await supabase
        .from('lhu_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      const managerName = localStorage.getItem('lhu_user_name') || 'Manager QHSE';
      const userRole = (typeof window !== 'undefined' ? localStorage.getItem('lhu_user_role') : '') || 'manager_mutu';
      await logAudit(
        managerName,
        userRole,
        'FORCE_LOGOUT',
        `Melakukan remote force logout terhadap sesi aktif user: ${targetUser}`
      );

      await fetchSessions();
    } catch (err) {
      console.error('Gagal melakukan force logout:', err);
      alert('Gagal menonaktifkan sesi.');
    } finally {
      setTerminatingId(null);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
      return <Smartphone size={16} className="text-status-blue-text" />;
    }
    return <Laptop size={16} className="text-status-emerald-text" />;
  };

  const parseUserAgent = (userAgent: string) => {
    if (!userAgent) return 'Perangkat tidak dikenal';
    const ua = userAgent.toLowerCase();
    let browser = 'Browser Lain';
    if (ua.includes('chrome')) browser = 'Google Chrome';
    else if (ua.includes('firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Apple Safari';
    else if (ua.includes('edge')) browser = 'Microsoft Edge';

    let os = 'OS Lain';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
    else if (ua.includes('linux')) os = 'Linux';

    return `${browser} (${os})`;
  };

  const activeSessions = sessions.filter(s => s.is_active);
  const historicalLogs = sessions.filter(s => {
    const matchesSearch = s.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = filterMethod === 'ALL' || s.login_method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-theme-border pb-4">
        <div>
          <h3 className="text-base font-bold text-theme-text flex items-center gap-2">
            <ShieldAlert size={18} className="text-status-orange-text" /> Log Keamanan Biometrik & Sesi
          </h3>
          <p className="text-xs text-theme-muted mt-1">
            Pantau akses login aktif dan lakukan pemutusan sesi (Remote Force Logout) jika terdeteksi aktivitas mencurigakan.
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="bg-theme-hover hover:bg-slate-700 disabled:opacity-50 text-theme-muted px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Segarkan
        </button>
      </div>

      {dbError && (
        <div className="bg-status-red-bg border border-status-red-border text-status-red-text p-4 rounded-xl text-xs flex flex-col gap-2">
          <p className="font-bold flex items-center gap-1.5 text-sm">
            ⚠️ Tabel Sesi Belum Dibuat / Bermasalah di Database
          </p>
          <p>
            Fitur pemantauan sesi aktif dan Force Logout membutuhkan tabel baru di database Supabase Anda.
          </p>
          <div className="font-mono bg-theme-base/60 p-3 rounded-lg border border-theme-border overflow-x-auto text-[11px] text-theme-muted select-all">
            {dbError}
          </div>
          <p className="mt-1 text-theme-muted">
            Silakan jalankan script SQL migrasi terbaru (bagian <strong>10. Buat Tabel Sesi Keamanan & Log Login (lhu_sessions)</strong>) di SQL Editor Supabase Anda untuk mengaktifkan fitur keamanan ini.
          </p>
        </div>
      )}

      <div>
        <h4 className="text-sm font-bold text-theme-muted mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-status-emerald-bg rounded-full animate-pulse"></span>
          Sesi Login Aktif Sekarang ({activeSessions.length})
        </h4>

        {activeSessions.length === 0 ? (
          <div className="bg-theme-input border border-theme-border rounded-xl p-6 text-center text-xs text-theme-dim">
            Tidak ada sesi aktif lain saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map((session) => (
              <div 
                key={session.id} 
                className="bg-theme-input border border-theme-border rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all duration-200"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-theme-text block">{session.username}</span>
                      <span className="text-[10px] text-theme-dim block">ID: {session.id.substring(0, 8)}...</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      session.login_method === 'face' 
                        ? 'bg-status-emerald-bg text-status-emerald-text border border-status-emerald-border' 
                        : session.login_method === 'token'
                        ? 'bg-status-blue-bg text-status-blue-text border border-status-blue-border'
                        : 'bg-status-orange-bg text-status-orange-text border border-status-orange-border'
                    }`}>
                      {session.login_method === 'face' ? '📹 Biometrik Wajah' : session.login_method === 'token' ? '🔑 Token Akses' : '⚙️ Tester'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-theme-muted mt-2 bg-theme-input/40 p-2 rounded-lg border border-theme-border/40">
                    {getDeviceIcon(session.device_info)}
                    <span className="truncate flex-1 text-[11px]">{parseUserAgent(session.device_info)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-theme-border pt-3 mt-1">
                  <span className="text-[10px] text-theme-dim">
                    Masuk: {new Date(session.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
                  </span>
                  
                  <button
                    onClick={() => handleForceLogout(session.id, session.username)}
                    disabled={terminatingId === session.id}
                    className="bg-status-red-bg hover:bg-status-red-bg border border-status-red-border hover:border-status-red-border text-status-red-text text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <LogOut size={11} /> 
                    {terminatingId === session.id ? 'Memutus...' : 'Force Logout'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-theme-border pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h4 className="text-sm font-bold text-theme-muted">
            Riwayat Log Keamanan Login ({historicalLogs.length})
          </h4>

          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-theme-input border border-theme-border focus:border-status-blue-border focus:ring-1 focus:ring-blue-500/20 rounded-xl px-3 py-1.5 text-theme-text text-xs outline-none transition-all placeholder-slate-500 w-full sm:w-40"
            />
            <select
              value={filterMethod}
              onChange={(e: any) => setFilterMethod(e.target.value)}
              className="bg-theme-input border border-theme-border focus:border-status-blue-border rounded-xl px-3 py-1.5 text-theme-text text-xs outline-none cursor-pointer"
            >
              <option value="ALL">Semua Metode</option>
              <option value="face">Biometrik Wajah</option>
              <option value="token">Token Akses</option>
              <option value="tester">Tester</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-theme-border rounded-xl bg-theme-input">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-theme-input/60 border-b border-theme-border text-theme-muted font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3">Waktu Login</th>
                <th className="p-3">Nama Pengguna</th>
                <th className="p-3">Metode Login</th>
                <th className="p-3">Browser / Perangkat</th>
                <th className="p-3 text-center">Status Sesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/60 text-theme-muted">
              {historicalLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-theme-dim">
                    Tidak ada catatan log login ditemukan.
                  </td>
                </tr>
              ) : (
                historicalLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-theme-input/20 transition-all">
                    <td className="p-3 font-mono text-theme-muted">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 font-semibold text-theme-text">
                      {log.username}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.login_method === 'face' 
                          ? 'bg-status-emerald-bg text-status-emerald-text border border-status-emerald-border' 
                          : log.login_method === 'token'
                          ? 'bg-status-blue-bg text-status-blue-text border border-status-blue-border'
                          : 'bg-status-orange-bg text-status-orange-text border border-status-orange-border'
                      }`}>
                        {log.login_method === 'face' ? '📹 Wajah' : log.login_method === 'token' ? '🔑 Token' : '⚙️ Tester'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-theme-muted">
                      {log.device_info}
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1">
                        {log.is_active ? (
                          <>
                            <CheckCircle size={12} className="text-status-emerald-text" />
                            <span className="text-[10px] text-status-emerald-text font-bold">Aktif</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} className="text-theme-dim" />
                            <span className="text-[10px] text-theme-dim font-bold">Diputus / Keluar</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
