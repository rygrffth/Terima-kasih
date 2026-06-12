-- =========================================================================
-- SCRIPT SETUP & MIGRASI DATABASE UTUH E-LHU PROLAB
-- Menyiapkan/memperbarui tabel dokumen, tabel pengguna (biometrik), serta bypass RLS 
-- secara non-destruktif (aman dijalankan berulang kali tanpa mereset data).
-- =========================================================================

-- 1. BUAT TABEL LHU DOCUMENT JIKA BELUM ADA
create table if not exists lhu_document (
  id uuid default gen_random_uuid() primary key,
  nomor_lhu serial unique,
  judul text not null,
  file_path text not null,
  uploaded_by text not null,
  status text not null default 'PENDING_ADMIN',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tambah kolom-kolom baru jika belum ada
alter table lhu_document add column if not exists catatan_admin text;
alter table lhu_document add column if not exists catatan_spv text;
alter table lhu_document add column if not exists checked_by text;
alter table lhu_document add column if not exists approved_by text;
alter table lhu_document add column if not exists checked_supervisor_by text;
alter table lhu_document add column if not exists komoditi text;
alter table lhu_document add column if not exists departemen text;
alter table lhu_document add column if not exists kode_lhu text;
alter table lhu_document add column if not exists kode_sertifikat text;
alter table lhu_document add column if not exists tipe_dokumen text check (tipe_dokumen in ('LHU', 'Sertifikat'));
alter table lhu_document add column if not exists spv_checklist text[];
alter table lhu_document add column if not exists priority text check (priority in ('normal', 'urgent')) default 'normal';

-- Kolom timestamp per aksi (untuk audit trail tanda tangan)
alter table lhu_document add column if not exists checked_at timestamp with time zone;
alter table lhu_document add column if not exists checked_supervisor_at timestamp with time zone;
alter table lhu_document add column if not exists approved_at timestamp with time zone;

-- Kolom tambahan untuk fitur Version Comparison dan PDF Annotation
alter table lhu_document add column if not exists previous_file_path text;
alter table lhu_document add column if not exists annotated_file_path text;



-- Hapus check constraint status lama agar bisa ditambahkan kembali dengan status baru
alter table lhu_document drop constraint if exists lhu_document_status_check;
alter table lhu_document add constraint lhu_document_status_check 
  check (status in ('PENDING_ADMIN', 'PENDING_SUPERVISOR', 'PENDING_NUMBERING', 'PENDING_MANAGER', 'APPROVED', 'REJECTED'));


-- 2. BUAT TABEL LHU USERS JIKA BELUM ADA
create table if not exists lhu_users (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  role text not null check (role in ('teknisi', 'admin', 'supervisor', 'manager_mutu', 'direktur')),
  face_descriptor double precision[], -- Mendukung registrasi Token (nullable)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Pastikan kolom face_descriptor bisa bernilai NULL (jika sebelumnya didesain NOT NULL)
alter table lhu_users alter column face_descriptor drop not null;

-- Tambah kolom-kolom baru ke lhu_users jika belum ada
alter table lhu_users add column if not exists komoditi text;
alter table lhu_users add column if not exists departemen text;
alter table lhu_users add column if not exists login_token text;
alter table lhu_users add column if not exists allowed_komoditi text[];
alter table lhu_users add column if not exists allowed_departemen text[];

-- Hapus check constraint role lama agar bisa diperbarui
alter table lhu_users drop constraint if exists lhu_users_role_check;
alter table lhu_users add constraint lhu_users_role_check 
  check (role in ('teknisi', 'admin', 'supervisor', 'manager_mutu', 'direktur'));


-- 3. BUAT TABEL SETTINGS JIKA BELUM ADA
create table if not exists lhu_settings (
  key text primary key,
  value text not null
);

-- Isi template default jika belum ada
insert into lhu_settings (key, value) values 
('lhu_code_template', 'LHU/{komoditi_kode}/{tahun}/{nomor}'),
('cert_code_template', 'CERT/{komoditi_kode}/{tahun}/{nomor}')
on conflict (key) do nothing;


-- 4. BUAT TABEL SESI JIKA BELUM ADA
create table if not exists lhu_sessions (
  id uuid primary key,
  username text not null,
  login_method text not null check (login_method in ('face', 'token', 'tester')),
  device_info text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  last_active_at timestamp with time zone default now()
);

create index if not exists idx_lhu_sessions_username on lhu_sessions(username);
create index if not exists idx_lhu_sessions_is_active on lhu_sessions(is_active);


-- 5. BUAT TABEL LAMPIRAN JIKA BELUM ADA
create table if not exists lhu_attachments (
  id uuid default gen_random_uuid() primary key,
  doc_id uuid not null references lhu_document(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 6. BUAT TABEL CHECKLIST TEMPLATES JIKA BELUM ADA
create table if not exists lhu_checklist_templates (
  id uuid default gen_random_uuid() primary key,
  komoditi text not null unique,
  checklist_items text[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Isi checklist default awal
insert into lhu_checklist_templates (komoditi, checklist_items) values
('Elektronik', array[
  'Kesesuaian Identitas & ID Sampel dengan berkas fisik',
  'Metode pengujian sesuai dengan standar akreditasi KAN',
  'Nilai hasil pengujian & ketidakpastian tercantum lengkap',
  'Tanda tangan verifikasi teknisi pengaju lengkap'
]),
('Besi Baja', array[
  'Kesesuaian Identitas & ID Sampel dengan berkas fisik',
  'Metode pengujian besi baja sesuai ASTM / ISO',
  'Nilai hasil uji tarik & ketebalan tercantum lengkap',
  'Tanda tangan verifikasi teknisi pengaju lengkap'
]),
('RF', array[
  'Kesesuaian Identitas & ID Sampel dengan berkas fisik',
  'Metode pengujian RF sesuai standar frekuensi SDPPI',
  'Nilai daya pancar & gain antena tercantum lengkap',
  'Tanda tangan verifikasi teknisi pengaju lengkap'
])
on conflict (komoditi) do update
set checklist_items = excluded.checklist_items;


-- 7. BUAT TABEL AUDIT LOGS JIKA BELUM ADA
create table if not exists lhu_audit_logs (
  id uuid default gen_random_uuid() primary key,
  username text not null,
  role text not null,
  action text not null,
  details text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 8. BYPASS RLS DATABASE (Menonaktifkan Row Level Security)
alter table lhu_document disable row level security;
alter table lhu_users disable row level security;
alter table lhu_settings disable row level security;
alter table lhu_sessions disable row level security;
alter table lhu_attachments disable row level security;
alter table lhu_checklist_templates disable row level security;
alter table lhu_audit_logs disable row level security;


-- 9. SETUP & BYPASS RLS STORAGE BUCKET 'lhu-documents'
insert into storage.buckets (id, name, public)
values ('lhu-documents', 'lhu-documents', true)
on conflict (id) do nothing;

drop policy if exists "Akses Membaca Publik LHU" on storage.objects;
drop policy if exists "Akses Mengunggah Publik LHU" on storage.objects;
drop policy if exists "Akses Memperbarui Publik LHU" on storage.objects;
drop policy if exists "Akses Menghapus Publik LHU" on storage.objects;

create policy "Akses Membaca Publik LHU" on storage.objects for select using (bucket_id = 'lhu-documents');
create policy "Akses Mengunggah Publik LHU" on storage.objects for insert with check (bucket_id = 'lhu-documents');
create policy "Akses Memperbarui Publik LHU" on storage.objects for update using (bucket_id = 'lhu-documents');
create policy "Akses Menghapus Publik LHU" on storage.objects for delete using (bucket_id = 'lhu-documents');


-- 10. DINAMIS & RELASIONAL: TABEL DIVISI & PIVOT TABLE
create table if not exists lhu_divisions (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  code varchar(10) not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Isi divisi default jika belum ada
insert into lhu_divisions (name, code) values
('Elektronik', 'EL'),
('Besi Baja', 'BB'),
('RF', 'RF')
on conflict (name) do nothing;

create table if not exists lhu_user_divisions (
  user_id uuid references lhu_users(id) on delete cascade,
  division_id uuid references lhu_divisions(id) on delete cascade,
  primary key (user_id, division_id)
);

-- Matikan RLS untuk tabel-tabel baru ini (konsisten dengan arsitektur saat ini)
alter table lhu_divisions disable row level security;
alter table lhu_user_divisions disable row level security;

-- Migrasi data user yang ada ke tabel pivot
insert into lhu_user_divisions (user_id, division_id)
select u.id, d.id
from lhu_users u
join lhu_divisions d on d.name = any(u.allowed_komoditi)
on conflict do nothing;

-- 11. SISTEM SYNC BIDIRECTIONAL UNTUK BACKWARD COMPATIBILITY
-- A. Fungsi sinkronisasi lhu_users.allowed_komoditi jika tabel pivot berubah
create or replace function sync_allowed_komoditi_array()
returns trigger as $$
declare
  current_array text[];
  new_array text[];
begin
  select allowed_komoditi into current_array
  from lhu_users
  where id = coalesce(new.user_id, old.user_id);

  select array_agg(d.name) into new_array
  from lhu_user_divisions ud
  join lhu_divisions d on ud.division_id = d.id
  where ud.user_id = coalesce(new.user_id, old.user_id);

  -- Jika array sudah sama, tidak perlu update untuk mencegah infinite loop
  if current_array is not distinct from new_array then
    return null;
  end if;

  update lhu_users
  set allowed_komoditi = new_array
  where id = coalesce(new.user_id, old.user_id);
  
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_allowed_komoditi_array on lhu_user_divisions;
create trigger trg_sync_allowed_komoditi_array
after insert or delete or update on lhu_user_divisions
for each row execute function sync_allowed_komoditi_array();

-- B. Fungsi sinkronisasi lhu_user_divisions pivot jika lhu_users.allowed_komoditi berubah
create or replace function sync_user_divisions_pivot()
returns trigger as $$
begin
  -- Hanya jalan jika kolom allowed_komoditi berubah
  if (tg_op = 'UPDATE' and old.allowed_komoditi is not distinct from new.allowed_komoditi) then
    return new;
  end if;

  -- Hapus relasi lama yang tidak ada di array baru
  delete from lhu_user_divisions
  where user_id = new.id
    and division_id not in (
      select id from lhu_divisions where name = any(new.allowed_komoditi)
    );

  -- Pastikan semua divisi dalam array ada di tabel master master_divisions
  if new.allowed_komoditi is not null then
    insert into lhu_divisions (name, code)
    select distinct val, upper(substring(val from 1 for 2))
    from unnest(new.allowed_komoditi) as val
    on conflict (name) do nothing;

    -- Hubungkan relasi baru ke tabel pivot
    insert into lhu_user_divisions (user_id, division_id)
    select new.id, d.id
    from lhu_divisions d
    where d.name = any(new.allowed_komoditi)
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_user_divisions_pivot on lhu_users;
create trigger trg_sync_user_divisions_pivot
after insert or update of allowed_komoditi on lhu_users
for each row execute function sync_user_divisions_pivot();


-- ==========================================
-- AKTIFKAN REALTIME UNTUK TABEL LHU_DOCUMENT
-- ==========================================
-- Jalankan query ini di SQL Editor Supabase untuk mengaktifkan realtime:
--
-- alter publication supabase_realtime add table lhu_document;
--
-- Jika publikasi belum ada, buat terlebih dahulu:
-- CREATE PUBLICATION supabase_realtime;
-- ALTER PUBLICATION supabase_realtime ADD TABLE lhu_document;


-- 12. HAPUS CONSTRAINT UNIQUE PADA nomor_lhu (LHU & SERTIFIKAT DIPISAH)
-- Menghapus constraint UNIQUE agar LHU dan Sertifikat dapat memiliki nomor induk terpisah 
-- (misal LHU-001 dan CERT-001 dapat terbit bersamaan).
ALTER TABLE lhu_document DROP CONSTRAINT IF EXISTS lhu_document_nomor_lhu_key;


