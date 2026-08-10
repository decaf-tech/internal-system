-- =====================================================================
-- Decaf Internal System — Skema Database
-- =====================================================================
-- Cara pakai: buka Supabase Dashboard > SQL Editor > New query,
-- paste seluruh isi file ini, lalu Run.
--
-- Prinsip RLS di sini: tim ini cuma bertiga dan semuanya saling
-- percaya + perlu lihat semua data. Jadi policy-nya "semua user yang
-- sudah login boleh akses", BUKAN per-user isolation. Yang penting:
-- anon (belum login) ditolak total — default-deny.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ENUM — status-status yang dipakai di seluruh sistem
-- ---------------------------------------------------------------------

create type user_role as enum ('founder', 'coo', 'admin');

create type client_status as enum ('lead', 'negotiation', 'active', 'on_hold', 'done', 'lost');

create type project_status as enum ('planning', 'in_progress', 'review', 'delivered', 'cancelled');

-- 'operational' = jalur The Kitchen, 'branding' = jalur The Storefront
create type project_track as enum ('operational', 'branding', 'other');

create type task_status as enum ('todo', 'in_progress', 'review', 'done');

create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create type expense_status as enum ('pending', 'approved', 'paid', 'rejected');

create type expense_category as enum (
  'transport', 'meals', 'equipment', 'software', 'marketing', 'office', 'other'
);

-- ---------------------------------------------------------------------
-- 2. PROFILES — data tim, terhubung ke auth.users bawaan Supabase
-- ---------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text        not null,
  role        user_role   not null default 'admin',
  created_at  timestamptz not null default now()
);

-- Begitu user baru dibuat lewat Supabase Auth, profile-nya otomatis ada.
-- full_name diambil dari metadata kalau diisi saat invite, kalau tidak
-- pakai bagian depan email sebagai fallback sementara.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- 3. CLIENTS
-- ---------------------------------------------------------------------

create table clients (
  id              uuid primary key default gen_random_uuid(),
  name            text          not null,
  company         text,
  contact_person  text,
  email           text,
  phone           text,
  status          client_status not null default 'lead',
  notes           text,
  -- ID folder Google Drive milik klien ini. Diisi otomatis oleh
  -- StorageProvider saat dokumen pertama diupload (lazy-create).
  drive_folder_id text,
  created_by      uuid          references profiles (id) on delete set null,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create index clients_status_idx on clients (status);

-- ---------------------------------------------------------------------
-- 4. PROJECTS — satu klien bisa punya beberapa project
-- ---------------------------------------------------------------------

create table projects (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid           not null references clients (id) on delete cascade,
  name            text           not null,
  description     text,
  status          project_status not null default 'planning',
  track           project_track  not null default 'other',
  start_date      date,
  target_date     date,
  drive_folder_id text,
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

create index projects_client_id_idx on projects (client_id);
create index projects_status_idx on projects (status);

-- ---------------------------------------------------------------------
-- 5. TASKS — inti sistem: kanban + calendar
-- ---------------------------------------------------------------------

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text          not null,
  description text,
  status      task_status   not null default 'todo',
  priority    task_priority not null default 'medium',
  assignee_id uuid          references profiles (id) on delete set null,
  client_id   uuid          references clients (id) on delete set null,
  project_id  uuid          references projects (id) on delete set null,
  due_date    date,
  -- Urutan kartu di dalam satu kolom kanban. Sengaja numeric (bukan int)
  -- supaya kartu bisa diselipkan di antara dua kartu lain tanpa perlu
  -- menulis ulang posisi semua kartu: cukup rata-rata dua tetangganya.
  position    numeric       not null default 0,
  created_by  uuid          references profiles (id) on delete set null,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now(),
  completed_at timestamptz
);

create index tasks_status_position_idx on tasks (status, position);
create index tasks_assignee_id_idx on tasks (assignee_id);
create index tasks_due_date_idx on tasks (due_date);
create index tasks_client_id_idx on tasks (client_id);

-- ---------------------------------------------------------------------
-- 6. EXPENSES — pengeluaran & reimburse
-- ---------------------------------------------------------------------

create table expenses (
  id           uuid primary key default gen_random_uuid(),
  title        text             not null,
  -- numeric(14,2): presisi eksak untuk uang (jangan pernah pakai float).
  -- 14 digit cukup sampai ratusan miliar rupiah.
  amount       numeric(14, 2)   not null check (amount > 0),
  category     expense_category not null default 'other',
  description  text,
  expense_date date             not null default current_date,
  status       expense_status   not null default 'pending',
  -- true = uang pribadi yang perlu diganti, false = pengeluaran kas bisnis
  is_reimbursement boolean      not null default true,
  submitted_by uuid             references profiles (id) on delete set null,
  reviewed_by  uuid             references profiles (id) on delete set null,
  reviewed_at  timestamptz,
  client_id    uuid             references clients (id) on delete set null,
  project_id   uuid             references projects (id) on delete set null,
  created_at   timestamptz      not null default now(),
  updated_at   timestamptz      not null default now()
);

create index expenses_status_idx on expenses (status);
create index expenses_expense_date_idx on expenses (expense_date);
create index expenses_submitted_by_idx on expenses (submitted_by);

-- ---------------------------------------------------------------------
-- 7. DOCUMENTS — metadata file. File fisiknya ada di Google Drive.
-- ---------------------------------------------------------------------
-- Tabel ini yang jadi sumber kebenaran untuk pencarian & relasi.
-- Drive murni penyimpanan blob; jangan pernah andalkan struktur folder
-- Drive sebagai sumber data.

create table documents (
  id             uuid primary key default gen_random_uuid(),
  name           text        not null,
  mime_type      text,
  size_bytes     bigint,
  -- ID file di Google Drive — kunci untuk download/hapus lewat API
  drive_file_id  text        not null unique,
  drive_web_link text,
  -- Dokumen bisa nempel ke salah satu entitas berikut (boleh semua null
  -- kalau dokumen umum, mis. template atau dokumen legal perusahaan)
  client_id      uuid        references clients (id) on delete set null,
  project_id     uuid        references projects (id) on delete set null,
  task_id        uuid        references tasks (id) on delete set null,
  expense_id     uuid        references expenses (id) on delete cascade,
  uploaded_by    uuid        references profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index documents_client_id_idx on documents (client_id);
create index documents_project_id_idx on documents (project_id);
create index documents_task_id_idx on documents (task_id);
create index documents_expense_id_idx on documents (expense_id);

-- ---------------------------------------------------------------------
-- 8. updated_at otomatis
-- ---------------------------------------------------------------------

create function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_touch_updated_at
  before update on clients
  for each row execute function touch_updated_at();

create trigger projects_touch_updated_at
  before update on projects
  for each row execute function touch_updated_at();

create trigger tasks_touch_updated_at
  before update on tasks
  for each row execute function touch_updated_at();

create trigger expenses_touch_updated_at
  before update on expenses
  for each row execute function touch_updated_at();

-- Isi/kosongkan completed_at otomatis mengikuti perpindahan status,
-- supaya laporan "selesai bulan ini" tidak bergantung pada aplikasi
-- yang ingat mengisinya.
create function sync_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and coalesce(old.status, 'todo') <> 'done' then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_sync_completed_at
  before insert or update on tasks
  for each row execute function sync_task_completed_at();

-- ---------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
-- Nyalakan RLS di semua tabel. Tanpa policy, artinya default-deny —
-- termasuk untuk anon key yang dipakai di browser.

alter table profiles  enable row level security;
alter table clients   enable row level security;
alter table projects  enable row level security;
alter table tasks     enable row level security;
alter table expenses  enable row level security;
alter table documents enable row level security;

-- Semua anggota tim yang sudah login boleh baca & tulis semua data.
-- Kalau nanti tim membesar dan perlu pembatasan per-role, policy di
-- bawah ini yang diganti — struktur tabel tidak perlu berubah.

create policy "team can read profiles"
  on profiles for select to authenticated using (true);

create policy "user can update own profile"
  on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "team can read clients"
  on clients for select to authenticated using (true);
create policy "team can write clients"
  on clients for insert to authenticated with check (true);
create policy "team can update clients"
  on clients for update to authenticated using (true) with check (true);
create policy "team can delete clients"
  on clients for delete to authenticated using (true);

create policy "team can read projects"
  on projects for select to authenticated using (true);
create policy "team can write projects"
  on projects for insert to authenticated with check (true);
create policy "team can update projects"
  on projects for update to authenticated using (true) with check (true);
create policy "team can delete projects"
  on projects for delete to authenticated using (true);

create policy "team can read tasks"
  on tasks for select to authenticated using (true);
create policy "team can write tasks"
  on tasks for insert to authenticated with check (true);
create policy "team can update tasks"
  on tasks for update to authenticated using (true) with check (true);
create policy "team can delete tasks"
  on tasks for delete to authenticated using (true);

create policy "team can read expenses"
  on expenses for select to authenticated using (true);
create policy "team can write expenses"
  on expenses for insert to authenticated with check (true);
create policy "team can update expenses"
  on expenses for update to authenticated using (true) with check (true);
create policy "team can delete expenses"
  on expenses for delete to authenticated using (true);

create policy "team can read documents"
  on documents for select to authenticated using (true);
create policy "team can write documents"
  on documents for insert to authenticated with check (true);
create policy "team can update documents"
  on documents for update to authenticated using (true) with check (true);
create policy "team can delete documents"
  on documents for delete to authenticated using (true);
