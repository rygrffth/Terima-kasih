"use client";

import React, { useEffect, useState } from 'react';
import TemplateTab from '../components/TemplateTab';

export default function TemplatePage() {
  const [userName, setUserName] = useState('Manager QHSE PROLAB');
  const [userRole, setUserRole] = useState('');
  const [userDept, setUserDept] = useState('');

  useEffect(() => {
    const loadUserName = () => {
      setUserName(localStorage.getItem('lhu_user_name') || 'Manager QHSE PROLAB');
      const stored = localStorage.getItem('lhu_logged_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setUserRole(u.role || '');
          setUserDept(u.departemen || '');
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadUserName();
    window.addEventListener('userNameChanged', loadUserName);
    return () => window.removeEventListener('userNameChanged', loadUserName);
  }, []);

  const isDirektur = userRole === 'direktur' || userDept?.toLowerCase() === 'direktur';

  return (
    <div className="w-full text-theme-text animate-fade-in">
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4 border-b border-theme-border pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-theme-text flex items-center gap-2">
            ⚙️ Pengaturan Template Kode Dokumen
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border ${
              isDirektur 
                ? 'bg-status-purple-bg text-status-purple-text border-status-purple-border' 
                : 'bg-status-rose-bg text-status-rose-text border-status-rose-border'
            }`}>
              {isDirektur ? 'DIREKTUR ACCESS' : 'MANAGER QHSE ACCESS'}
            </span>
          </h2>
          <p className="text-sm text-theme-muted mt-1">
            {isDirektur ? 'Direktur aktif:' : 'Manager aktif:'} <span className={isDirektur ? 'text-status-purple-text font-semibold' : 'text-status-rose-text font-semibold'}>{userName}</span>
          </p>
        </div>
        <img src="/logo2.png" alt="PROLAB Logo" className="h-10 object-contain prolab-logo" />
      </header>

      <div className={`bg-theme-card border-t-2 ${isDirektur ? 'border-t-purple-500' : 'border-t-rose-500'} border-x border-b border-theme-border rounded-2xl p-6 shadow-xl relative`}>
        <TemplateTab userName={userName} />
      </div>
    </div>
  );
}
