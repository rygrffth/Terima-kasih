import { supabase } from './supabase';

export async function logAudit(username: string, role: string, action: string, details: string) {
  try {
    const { error } = await supabase
      .from('lhu_audit_logs')
      .insert([
        { username, role, action, details }
      ]);
    if (error) {
      console.warn('Gagal menyimpan audit log ke database:', error.message);
      const fallbackLogs = JSON.parse(localStorage.getItem('lhu_local_audit_logs') || '[]');
      fallbackLogs.push({
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        username,
        role,
        action,
        details,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('lhu_local_audit_logs', JSON.stringify(fallbackLogs.slice(-200)));
    }
  } catch (err) {
    console.error('Error saat logAudit:', err);
  }
}

export async function getAuditLogs() {
  try {
    const { data, error } = await supabase
      .from('lhu_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.warn('Gagal membaca audit log dari database:', error.message);
      const localLogs = JSON.parse(localStorage.getItem('lhu_local_audit_logs') || '[]');
      return [...localLogs].reverse();
    }
    return data || [];
  } catch (err) {
    console.error('Error saat getAuditLogs:', err);
    const localLogs = JSON.parse(localStorage.getItem('lhu_local_audit_logs') || '[]');
    return [...localLogs].reverse();
  }
}
