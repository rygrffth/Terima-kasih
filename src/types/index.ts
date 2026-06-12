export type LhuStatus = 'PENDING_ADMIN' | 'PENDING_SUPERVISOR' | 'PENDING_NUMBERING' | 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED';

export interface LhuDocument {
  id: string;
  nomor_lhu: number;
  judul: string;
  file_path: string;
  uploaded_by: string;
  status: LhuStatus;
  catatan_admin: string | null;
  catatan_spv: string | null;
  checked_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  
  komoditi: 'Elektronik' | 'Besi Baja' | 'RF' | null;
  departemen: 'Safety' | 'SKEM' | null;
  tipe_dokumen: 'LHU' | 'Sertifikat' | null;
  kode_lhu: string | null;
  kode_sertifikat: string | null;
  checked_supervisor_by: string | null;
  
  priority?: 'normal' | 'urgent' | null;
  spv_checklist?: string[] | null;

  // Per-action timestamps (audit trail tanda tangan)
  checked_at?: string | null;
  checked_supervisor_at?: string | null;
  approved_at?: string | null;

  previous_file_path?: string | null;
  annotated_file_path?: string | null;
}

export type UserRole = 'teknisi' | 'admin' | 'supervisor' | 'manager_mutu' | 'direktur';

export interface LhuUser {
  id: string;
  username: string;
  role: UserRole;
  komoditi: string | null;
  departemen: string | null;
  login_token?: string | null;
  allowed_komoditi?: string[] | null;
  allowed_departemen?: string[] | null;
  created_at: string;
}

export interface LhuAttachment {
  id: string;
  doc_id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  komoditi: string;
  item_id: string;
  label: string;
  created_at: string;
}
