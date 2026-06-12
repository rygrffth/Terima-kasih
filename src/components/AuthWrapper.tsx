"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { SidebarPanel, SidebarTrigger } from './Sidebar';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Subscribe to real-time changes on the lhu_document table
    const channel = supabase
      .channel('realtime-lhu-document-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lhu_document'
        },
        (payload) => {
          console.log('Realtime LHU Document change detected:', payload);
          // Dispatch a global event so any active page/component knows to refresh its data
          window.dispatchEvent(new Event('lhu_document_changed'));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isPublicRoute = pathname === '/login' || pathname === '/register' || pathname.startsWith('/verify');
  const isVerifyRoute = pathname.startsWith('/verify');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const loggedUserStr = localStorage.getItem('lhu_logged_user');
        
        if (!loggedUserStr) {
          if (!isPublicRoute) {
            router.push('/login');
          } else {
            setLoading(false);
          }
          return;
        }

        // Check Session Validity in Database (Remote Force Logout)
        if (!isPublicRoute) {
          const sessionId = localStorage.getItem('lhu_session_id');
          if (sessionId) {
            try {
              const { data: sessData, error: sessErr } = await supabase
                .from('lhu_sessions')
                .select('is_active')
                .eq('id', sessionId)
                .single();
              
              if (!sessErr && sessData && sessData.is_active === false) {
                localStorage.removeItem('lhu_logged_user');
                localStorage.removeItem('lhu_user_name');
                localStorage.removeItem('lhu_session_id');
                document.cookie = "lhu_logged_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                document.cookie = "lhu_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                window.dispatchEvent(new Event('userNameChanged'));
                alert('Sesi login Anda telah dinonaktifkan secara jarak jauh oleh Manager QHSE.');
                router.push('/login');
                return;
              }
            } catch (e) {
              console.error('Gagal memverifikasi status sesi aktif:', e);
            }
          }
        }

        let user;
        try {
          user = JSON.parse(loggedUserStr);
        } catch (e) {
          console.error("Gagal mengurai loggedUserStr dari localStorage:", e);
          // Jika data di localStorage rusak/invalid, bersihkan dan biarkan login ulang
          localStorage.removeItem('lhu_logged_user');
          localStorage.removeItem('lhu_user_name');
          localStorage.removeItem('lhu_session_id');
          if (!isPublicRoute) {
            router.push('/login');
          } else {
            setLoading(false);
          }
          return;
        }

        setIsAuthenticated(true);

        // Role Permission Guard:
        if (pathname.startsWith('/teknisi') && user.role !== 'tester') {
          alert('Akses Ditolak: Halaman Teknisi telah dinonaktifkan.');
          redirectToRolePage(user.role);
          return;
        }

        if (pathname.startsWith('/admin') && user.role !== 'admin' && user.role !== 'tester') {
          alert(`Akses Ditolak: Halaman ini khusus untuk Admin. Akun Anda adalah ${user.role.toUpperCase()}.`);
          redirectToRolePage(user.role);
          return;
        }

        if (pathname.startsWith('/supervisor') && user.role !== 'supervisor' && user.role !== 'tester') {
          alert(`Akses Ditolak: Halaman ini khusus untuk Supervisor. Akun Anda adalah ${user.role.toUpperCase()}.`);
          redirectToRolePage(user.role);
          return;
        }

        // Dynamic Division Access Guard:
        const adminDivisiMatch = pathname.match(/^\/admin\/([^/]+)\/(pending|history|numbering|upload|list)/);
        const spvDivisiMatch = pathname.match(/^\/supervisor\/([^/]+)\/(pending|history)/);
        
        if (adminDivisiMatch && user.role !== 'tester') {
          const routeDivisi = decodeURIComponent(adminDivisiMatch[1]);
          let userAllowed = user.allowed_komoditi || [];
          if (userAllowed.length === 0 && user.komoditi) {
            userAllowed = [user.komoditi];
          }
          if (!userAllowed.includes('ALL') && !userAllowed.includes(routeDivisi)) {
            alert(`Akses Ditolak: Anda tidak memiliki hak akses ke Divisi ${routeDivisi}.`);
            redirectToRolePage(user.role);
            return;
          }
        }

        if (spvDivisiMatch && user.role !== 'tester') {
          const routeDivisi = decodeURIComponent(spvDivisiMatch[1]);
          let userAllowed = user.allowed_komoditi || [];
          if (userAllowed.length === 0 && user.komoditi) {
            userAllowed = [user.komoditi];
          }
          if (!userAllowed.includes('ALL') && !userAllowed.includes(routeDivisi)) {
            alert(`Akses Ditolak: Anda tidak memiliki hak akses ke Divisi ${routeDivisi}.`);
            redirectToRolePage(user.role);
            return;
          }
        }

        if (pathname.startsWith('/direktur')) {
          const newPath = pathname.replace('/direktur', '/manager-mutu');
          router.replace(newPath);
          return;
        }

        if (pathname.startsWith('/manager-mutu')) {
          const isAuthorized = 
            user.role === 'manager_mutu' || 
            user.role === 'direktur' || 
            user.role === 'manager_lab' || 
            user.role === 'spv' || 
            user.role === 'tester';
          
          if (!isAuthorized) {
            alert('Akses Ditolak: Halaman ini khusus untuk Pimpinan.');
            redirectToRolePage(user.role);
            return;
          }
        }

        // If user is logged in but goes to /login or /register only, redirect to dashboard
        // /verify is always accessible regardless of login state
        if ((pathname === '/login' || pathname === '/register')) {
          redirectToRolePage(user.role);
          // Pastikan status loading dinonaktifkan agar jika redirect gagal/lambat, halaman login tetap bisa dirender
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error("Terjadi error di checkAuth:", err);
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, isPublicRoute, router]);

  // Activity Tracker & Auto Logout (1 Hour)
  useEffect(() => {
    if (isPublicRoute) return;

    // Initialize activity timestamp on mount if not exists
    if (!localStorage.getItem('lhu_last_activity')) {
      localStorage.setItem('lhu_last_activity', Date.now().toString());
    }

    const updateActivity = () => {
      localStorage.setItem('lhu_last_activity', Date.now().toString());
    };

    // Events to watch
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, updateActivity));

    // Periodically check inactivity (every 10 seconds)
    const interval = setInterval(async () => {
      const loggedUser = localStorage.getItem('lhu_logged_user');
      if (!loggedUser) return;

      const lastActivity = Number(localStorage.getItem('lhu_last_activity') || Date.now());
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1 hour in ms

      if (now - lastActivity > oneHour) {
        // Inactive for more than 1 hour -> trigger logout!
        clearInterval(interval);
        
        const sessionId = localStorage.getItem('lhu_session_id');
        if (sessionId) {
          try {
            await supabase
              .from('lhu_sessions')
              .update({ is_active: false })
              .eq('id', sessionId);
          } catch (e) {
            console.error('Inactivity logout error:', e);
          }
        }

        localStorage.removeItem('lhu_logged_user');
        localStorage.removeItem('lhu_user_name');
        localStorage.removeItem('lhu_session_id');
        localStorage.removeItem('lhu_last_activity');
        localStorage.removeItem('lhu_last_db_update');
        document.cookie = "lhu_logged_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "lhu_session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.dispatchEvent(new Event('userNameChanged'));
        
        alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 1 jam. Silakan login kembali.');
        router.push('/login');
      } else {
        // Update last_active_at in database if active (heartbeat)
        // Only update database at most once every 5 minutes (300,000 ms) to avoid spamming Supabase
        const lastDbUpdate = Number(localStorage.getItem('lhu_last_db_update') || '0');
        if (now - lastDbUpdate > 5 * 60 * 1000) {
          const sessionId = localStorage.getItem('lhu_session_id');
          if (sessionId) {
            try {
              await supabase
                .from('lhu_sessions')
                .update({ last_active_at: new Date().toISOString() })
                .eq('id', sessionId);
              localStorage.setItem('lhu_last_db_update', now.toString());
            } catch (e) {
              console.error('Failed to update session heartbeat:', e);
            }
          }
        }
      }
    }, 10000);

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [isPublicRoute, router]);

  const redirectToRolePage = (role: string) => {
    if (role === 'teknisi') {
      router.push('/admin/numbering');
    } else if (role === 'admin') {
      router.push('/admin/numbering');
    } else if (role === 'supervisor') {
      router.push('/supervisor/pending');
    } else if (role === 'direktur') {
      router.push('/manager-mutu/lhu');
    } else if (role === 'manager_mutu') {
      router.push('/manager-mutu/lhu');
    } else if (role === 'manager_lab' || role === 'spv') {
      router.push('/manager-mutu/lhu');
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-4 text-theme-muted font-semibold animate-pulse text-sm">
        <div className="fixed top-0 left-0 right-0 z-50 prolab-stripe" />
        {isVerifyRoute ? 'Memuat Sistem Verifikasi PROLAB...' : 'Memeriksa hak akses biometrik Anda...'}
      </div>
    );
  }

  if (isPublicRoute) {
    return (
      <div className="w-full min-h-screen bg-theme-base relative">
        <div className="fixed top-0 left-0 right-0 z-50 prolab-stripe" />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-base w-full relative">
      <div className="fixed top-0 left-0 right-0 z-50 prolab-stripe" />

      <SidebarTrigger onClick={() => setSidebarOpen(true)} />

      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-30 flex items-center justify-center p-2.5 rounded-none bg-theme-card border border-theme-border text-theme-text hover:bg-theme-input transition-all active:scale-95 cursor-pointer shadow-xl"
        title={mounted && resolvedTheme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
      >
        {mounted && resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      <SidebarPanel isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="w-full min-h-screen px-4 sm:px-6 md:px-8 lg:px-12 pt-24 pb-10">
        <div className="max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );

}
