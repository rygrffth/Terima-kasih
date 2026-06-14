"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { 
  Home, FileText, BarChart3, Activity, Users, Settings, Shield,
  Upload, Clock, Hash, ClipboardList, ShieldCheck, User,
  X, Menu, LogOut, ChevronRight, Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarPanel({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName] = useState('User PROLAB');
  const [userRole, setUserRole] = useState('teknisi');
  const [userKomoditi, setUserKomoditi] = useState<string | null>(null);
  const [allowedDivisions, setAllowedDivisions] = useState<string[]>([]);
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    dokumen: true,
    monitoring: true,
    admin: false
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };
  
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadUser = async () => {
      const loggedUserStr = localStorage.getItem('lhu_logged_user');
      if (loggedUserStr) {
        const user = JSON.parse(loggedUserStr);
        setUserName(user.username);
        
        if (user.role === 'manager_lab' && user.departemen === 'direktur') {
          setUserRole('direktur');
        } else if (user.role === 'manager_lab') {
          setUserRole('manager_mutu');
        } else {
          setUserRole(user.role);
        }
        
        setUserKomoditi(user.komoditi || null);

        try {
          const { data: userData, error } = await supabase
            .from('lhu_users')
            .select('komoditi, allowed_komoditi')
            .eq('username', user.username)
            .single();

          if (!error && userData) {
            let userAllowed = userData.allowed_komoditi || [];
            if (userAllowed.length === 0 && userData.komoditi) {
              userAllowed = [userData.komoditi];
            }
            if (userAllowed.includes('ALL')) {
              const { data: divData } = await supabase.from('lhu_divisions').select('name');
              if (divData) {
                const names = divData.map(d => d.name);
                setAllowedDivisions(names);
                if (names.length > 0) {
                  setExpandedDivisions(prev => ({ ...prev, [names[0]]: true }));
                }
              }
            } else {
              setAllowedDivisions(userAllowed);
              if (userAllowed.length > 0) {
                setExpandedDivisions(prev => ({ ...prev, [userAllowed[0]]: true }));
              }
            }
          } else {
            let userAllowed = user.allowed_komoditi || [];
            if (userAllowed.length === 0 && user.komoditi) {
              userAllowed = [user.komoditi];
            }
            setAllowedDivisions(userAllowed);
            if (userAllowed.length > 0) {
              setExpandedDivisions(prev => ({ ...prev, [userAllowed[0]]: true }));
            }
          }
        } catch (err) {
          console.error('Failed to load allowed divisions:', err);
        }
      } else {
        setUserName('User PROLAB');
        setUserRole('guest');
        setUserKomoditi(null);
        setAllowedDivisions([]);
      }
    };
    loadUser();
    window.addEventListener('userNameChanged', loadUser);
    return () => window.removeEventListener('userNameChanged', loadUser);

  }, []);

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('lhu_session_id');
    if (sessionId) {
      try {
        await supabase
          .from('lhu_sessions')
          .update({ is_active: false })
          .eq('id', sessionId);
      } catch (e) {
        console.error('Logout session update error:', e);
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
    window.location.href = '/login';
  };

  const isActive = (path: string) => pathname === path;

  const roleLabel: Record<string, string> = {
    teknisi: 'Admin',
    admin: 'Administrator',
    supervisor: 'Supervisor',
    manager_mutu: 'Manager QHSE',
    direktur: 'Direktur',
    tester: 'Tester',
    guest: 'Tamu',
  };

  const roleBadgeColor: Record<string, string> = {
    teknisi: 'bg-status-indigo-bg text-status-indigo-text border-status-indigo-border',
    admin: 'bg-status-blue-bg text-status-blue-text border-status-blue-border',
    supervisor: 'bg-status-orange-bg text-status-orange-text border-status-orange-border',
    manager_mutu: 'bg-status-rose-bg text-status-rose-text border-status-rose-border',
    direktur: 'bg-status-purple-bg text-status-purple-text border-status-purple-border',
    tester: 'bg-status-emerald-bg text-status-emerald-text border-status-emerald-border',
    guest: 'bg-slate-500/15 text-theme-muted border-slate-500/30',
  };

  const toggleDivision = (name: string) => {
    setExpandedDivisions(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-theme-base/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-theme-base border-r border-theme-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-white/10 border border-theme-border flex items-center justify-center">
              <FileText className="text-theme-text" size={16} />
            </div>
            <span className="text-sm font-bold tracking-widest text-theme-text uppercase">
              DOKUMEN PROLAB
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-none bg-theme-card hover:bg-theme-input border border-theme-border text-theme-muted hover:text-theme-text flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="prolab-stripe" />

        <div className="px-5 py-4 border-b border-theme-border">
          <div className="bg-theme-card border border-theme-border rounded-none p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-white/10 flex items-center justify-center text-theme-text font-bold text-sm shrink-0 border border-theme-border">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-theme-text truncate">{userName}</p>
              <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-none border uppercase tracking-wider ${roleBadgeColor[userRole] || roleBadgeColor.guest}`}>
                {userRole === 'guest' ? 'Tamu' : `${roleLabel[userRole] || userRole} ${userKomoditi || ''}`.trim()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-5 overflow-y-auto">
          <label className="text-[10px] font-bold text-theme-dim uppercase tracking-widest block mb-3 px-2">
            Navigasi Menu
          </label>
          <nav className="flex flex-col gap-1">
            <Link href="/" onClick={onClose}>
              <span className={`flex items-center gap-3 px-4 py-3 rounded-none text-sm font-semibold transition-all cursor-pointer group ${
                isActive('/')
                  ? 'bg-theme-input border-l-2 border-theme-text text-theme-text'
                  : 'text-theme-muted hover:text-theme-text hover:bg-theme-card border-l-2 border-transparent'
              }`}>
                <Home size={17} className={isActive('/') ? 'text-theme-text' : 'text-theme-dim group-hover:text-theme-muted'} />
                <span className="flex-1">Arsip & Dashboard Dokumen</span>
                {isActive('/') && <ChevronRight size={14} className="text-theme-text" />}
              </span>
            </Link>

            {(userRole === 'admin' || userRole === 'supervisor' || userRole === 'tester') && allowedDivisions.map((divName) => {
              const isExpanded = !!expandedDivisions[divName];
              
              const divItems = [];
              if (userRole === 'admin' || userRole === 'tester') {
                divItems.push(
                  { href: `/admin/${encodeURIComponent(divName)}/upload`, label: 'Unggah Dokumen', icon: Upload },
                  { href: `/admin/${encodeURIComponent(divName)}/pending`, label: 'Tugas Admin', icon: ClipboardList },
                  { href: `/admin/${encodeURIComponent(divName)}/history`, label: 'Riwayat Dokumen', icon: Clock }
                );
              }
              if (userRole === 'supervisor' || userRole === 'tester') {
                divItems.push(
                  { href: `/supervisor/${encodeURIComponent(divName)}/pending`, label: 'Antrean Audit', icon: ShieldCheck },
                  { href: `/supervisor/${encodeURIComponent(divName)}/history`, label: 'Riwayat Audit', icon: Clock }
                );
              }

              return (
                <div key={divName} className="flex flex-col mt-2 border border-theme-border/60 bg-theme-input/10">
                  <button
                    onClick={() => toggleDivision(divName)}
                    className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-theme-muted hover:text-theme-text hover:bg-theme-input/20 border-b border-theme-border/60 transition-all text-left cursor-pointer"
                  >
                    <span>Divisi {divName}</span>
                    <ChevronRight size={14} className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90 text-theme-text' : 'text-theme-dim'}`} />
                  </button>
                  
                  <div className={`flex flex-col transition-all duration-200 overflow-hidden ${isExpanded ? 'max-h-[300px] opacity-100 py-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    {divItems.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link key={item.href} href={item.href} onClick={onClose}>
                          <span className={`flex items-center gap-3 pl-8 pr-4 py-2 rounded-none text-xs font-semibold transition-all cursor-pointer group ${
                            active
                              ? 'bg-theme-input border-l-2 border-theme-text text-theme-text'
                              : 'text-theme-muted hover:text-theme-text hover:bg-theme-input/20 border-l-2 border-transparent'
                          }`}>
                            <item.icon size={14} className={active ? 'text-theme-text' : 'text-theme-muted group-hover:text-theme-muted'} />
                            <span className="flex-1">{item.label}</span>
                            {active && <ChevronRight size={12} className="text-theme-text" />}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {(userRole === 'manager_mutu' || userRole === 'direktur' || userRole === 'tester') && (() => {
              const prefix = '/manager-mutu';
              
              const docGroup = [
                { href: `${prefix}/lhu`, label: 'Berkas Dokumen', icon: FileText },
                { href: `${prefix}/template`, label: 'Pengaturan Template', icon: Settings }
              ];
              
              const reportGroup = [
                { href: `${prefix}/analytics`, label: 'Analitik Dashboard', icon: BarChart3 },
                { href: `${prefix}/audit`, label: 'Audit Log Aktivitas', icon: Activity }
              ];
              
              const systemGroup = [
                { href: `${prefix}/users`, label: 'Manajemen Anggota', icon: Users },
                { href: `${prefix}/security`, label: 'Keamanan Sesi', icon: Shield }
              ];

              const groups = [
                {
                  key: 'dokumen',
                  label: '📁 Manajemen Dokumen',
                  items: docGroup
                },
                {
                  key: 'monitoring',
                  label: '📊 Laporan & Monitoring',
                  items: reportGroup
                },
                {
                  key: 'admin',
                  label: '⚙️ Administrasi Sistem',
                  items: systemGroup
                }
              ];

              return (
                <div className="flex flex-col gap-2 mt-2">
                  {groups.map((grp) => {
                    const isExpanded = !!expandedGroups[grp.key];
                    return (
                      <div key={grp.key} className="flex flex-col border border-theme-border/60 bg-theme-input/10">
                        <button
                          onClick={() => toggleGroup(grp.key)}
                          className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-theme-muted hover:text-theme-text hover:bg-theme-input/20 border-b border-theme-border/60 transition-all text-left cursor-pointer"
                        >
                          <span>{grp.label}</span>
                          <ChevronRight size={14} className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90 text-theme-text' : 'text-theme-dim'}`} />
                        </button>
                        
                        <div className={`flex flex-col transition-all duration-200 overflow-hidden ${isExpanded ? 'max-h-[300px] opacity-100 py-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                          {grp.items.map((item) => {
                            const active = isActive(item.href);
                            return (
                              <Link key={item.href} href={item.href} onClick={onClose}>
                                <span className={`flex items-center gap-3 pl-8 pr-4 py-2 rounded-none text-xs font-semibold transition-all cursor-pointer group ${
                                  active
                                    ? 'bg-theme-input border-l-2 border-theme-text text-theme-text'
                                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-input/20 border-l-2 border-transparent'
                                }`}>
                                  <item.icon size={14} className={active ? 'text-theme-text' : 'text-theme-muted group-hover:text-theme-muted'} />
                                  <span className="flex-1">{item.label}</span>
                                  {active && <ChevronRight size={12} className="text-theme-text" />}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </nav>
        </div>

        <div className="px-5 py-5 border-t border-theme-border">
          {userRole !== 'guest' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center justify-center gap-2 bg-theme-input border border-theme-border hover:bg-theme-hover text-theme-text font-bold text-xs px-4 py-3 rounded-none transition-all cursor-pointer tracking-wider"
              >
                {mounted && resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                {mounted && resolvedTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-status-red-bg border border-status-red-border hover:bg-status-red-bg text-status-red-text font-bold text-xs px-4 py-3 rounded-none transition-all cursor-pointer uppercase tracking-wider"
              >
                <LogOut size={14} />
                Keluar (Log Out)
              </button>
            </div>
          )}
          <p className="text-center text-[10px] text-theme-muted mt-4">
            © {new Date().getFullYear()} PT PROLAB Sertifikasi Indonesia<br />
            <span className="font-mono">Naufal Rayhan Ali Rahman</span>
          </p>
        </div>
      </aside>
    </>
  );
}

export function SidebarTrigger({ onClick }: { onClick: () => void }) {
  const [userRole, setUserRole] = useState('');
  const [userKomoditi, setUserKomoditi] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = () => {
      const loggedUserStr = localStorage.getItem('lhu_logged_user');
      if (loggedUserStr) {
        const user = JSON.parse(loggedUserStr);
        if (user.role === 'manager_lab' && user.departemen === 'direktur') {
          setUserRole('direktur');
        } else if (user.role === 'manager_lab') {
          setUserRole('manager_mutu');
        } else {
          setUserRole(user.role);
        }
        setUserKomoditi(user.komoditi || null);
      }
    };
    loadUser();
    window.addEventListener('userNameChanged', loadUser);
    return () => window.removeEventListener('userNameChanged', loadUser);
  }, []);

  const roleLabel: Record<string, string> = {
    teknisi: 'Admin',
    admin: 'Admin',
    supervisor: 'Supervisor',
    manager_mutu: 'Manager QHSE',
    direktur: 'Direktur',
    tester: 'Tester',
  };

  const roleIcon: Record<string, React.ReactNode> = {
    teknisi: <User size={14} />,
    admin: <Users size={14} />,
    supervisor: <Shield size={14} />,
    manager_mutu: <ShieldCheck size={14} />,
    direktur: <ShieldCheck size={14} />,
    tester: <ShieldCheck size={14} />,
  };

  const roleColor: Record<string, string> = {
    teknisi: 'text-status-indigo-text border-status-indigo-border',
    admin: 'text-status-blue-text border-status-blue-border',
    supervisor: 'text-status-orange-text border-status-orange-border',
    manager_mutu: 'text-status-rose-text border-status-rose-border',
    direktur: 'text-status-purple-text border-status-purple-border',
    tester: 'text-status-emerald-text border-status-emerald-border',
  };

  if (!userRole) return null;

  return (
    <button
      onClick={onClick}
      className={`fixed top-4 left-4 z-30 flex items-center gap-1.5 sm:gap-2.5 p-2.5 sm:pl-3 sm:pr-4 sm:py-2.5 rounded-none bg-theme-card border border-theme-border text-theme-text font-bold text-xs shadow-xl transition-all hover:bg-theme-input active:scale-95 cursor-pointer group uppercase tracking-wider`}
    >
      <div className="flex items-center gap-1.5">
        <span className={roleColor[userRole] || 'text-theme-text'}>
          {roleIcon[userRole]}
        </span>
        <span className="tracking-widest hidden sm:inline">
          {`${roleLabel[userRole] || userRole} ${userKomoditi || ''}`.trim()}
        </span>
      </div>
      <div className="w-px h-3.5 bg-theme-border hidden sm:block" />
      <Menu size={13} className="opacity-80 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function Sidebar() {
  return null;
}
