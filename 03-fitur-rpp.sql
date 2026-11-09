-- =====================================================================
-- PAS-SIAGA Pangan | MIGRASI 03: fitur sesuai dokumen RPP final
-- Dijalankan setelah 01-skema-pas-siaga-pangan.sql dan 02-peran-administrator.sql.
--
-- Isi (nomor tabel merujuk RPP):
--   * Akses bertingkat UPT, Kanwil, Pusat; peran Pemantau Kanwil dan Pemantau Pusat
--   * Rencana kegiatan lebih lengkap (luas lahan, batas area, rute, titik komunikasi, akses warga)
--   * Daftar nominatif WB per sesi dan indikator kesiapan a-f (Bab III, indikator kesiapan)
--   * Status keamanan HIJAU/KUNING/MERAH/KRITIS dengan riwayat perubahan dan alasannya (Tabel 3.3)
--   * Penghitungan WB di setiap perpindahan; selisih otomatis menaikkan status ke MERAH
--   * Entri gelang pemantau: pemeriksaan perangkat dan konfirmasi alarm langsung (Tabel 3.4)
--   * Tindak lanjut dengan penanggung jawab, tenggat, pemeriksaan ulang, dan verifikasi
--   * Catatan susulan saat jaringan terputus ditandai
--   * Ringkasan dasbor (view), indikator evaluasi uji coba (Bab II dan IV), tren mingguan
--   * Catatan evaluasi mingguan, catatan pembekalan petugas, daftar risiko dan mitigasi (Tabel 4.3)
--   * Jejak audit pengelolaan akun, pembuatan akun oleh Administrator
--
-- DUA BAGIAN. Jalankan BAGIAN A sendiri dulu sampai selesai, baru BAGIAN B.
-- =====================================================================

-- ======================= BAGIAN A =======================
alter type public.user_role add value if not exists 'pemantau_kanwil';
alter type public.user_role add value if not exists 'pemantau_pusat';
alter type public.log_type  add value if not exists 'Pemeriksaan gelang';

-- ======================= BAGIAN B =======================

-- ---------- 1. Wilayah: Kanwil dan UPT ----------------------------------
create table public.master_kanwil (
  id    uuid primary key default gen_random_uuid(),
  kode  text not null unique check (kode ~ '^[A-Z0-9]{2,30}$'),
  nama  text not null
);
create table public.master_upt (
  id        uuid primary key default gen_random_uuid(),
  kode      text not null unique check (kode ~ '^[A-Z0-9]{2,30}$'),
  nama      text not null,
  jenis     text,
  kanwil_id uuid references public.master_kanwil (id)
);
create index master_upt_kanwil_idx on public.master_upt (kanwil_id);

insert into public.master_kanwil (kode, nama) values ('BANTEN', 'Kantor Wilayah Ditjenpas Banten');
insert into public.master_upt (kode, nama, jenis, kanwil_id)
  select 'CIANGIR', 'Lapas Terbuka Kelas IIB Ciangir', 'Lapas Terbuka', k.id
    from public.master_kanwil k where k.kode = 'BANTEN';

alter table public.profiles          add column kanwil_id uuid references public.master_kanwil (id);
alter table public.master_locations  add column kode_upt text not null default 'UPT';
alter table public.master_locations  add column luas_ha numeric(10, 2) check (luas_ha is null or luas_ha >= 0);
alter table public.master_inmates    add column kode_upt text not null default 'UPT';
create index locations_upt_idx on public.master_locations (kode_upt);
create index inmates_upt_idx   on public.master_inmates (kode_upt);
create index profiles_kanwil_idx on public.profiles (kanwil_id);

-- ---------- 2. Kolom tambahan kegiatan dan sesi ---------------------------
alter table public.activities
  add column luas_lahan_ha        numeric(10, 2) check (luas_lahan_ha is null or luas_lahan_ha >= 0),
  add column batas_area           text,
  add column rute                 text,
  add column titik_komunikasi     text,
  add column akses_warga          text,
  add column nomor_persetujuan    text,
  add column nomor_surat_perintah text;

alter table public.daily_sessions
  add column bimker_penanggung_jawab text,
  add column petugas_blok            text,
  add column petugas_p2u             text;

alter table public.field_logs
  add column susulan boolean not null default false;

alter table public.decisions
  add column status_baru public.security_status;
alter table public.decisions drop constraint decisions_jenis_keputusan_check;
alter table public.decisions add constraint decisions_jenis_keputusan_check
  check (jenis_keputusan in (
    'Dapat Dimulai', 'Perbaiki Dulu', 'Ditunda',
    'Verifikasi Gangguan', 'Penurunan Status', 'Arahan Tindakan', 'Tutup Kegiatan'));

-- ---------- 3. Tabel baru -------------------------------------------------
create table public.session_inmates (
  session_id uuid not null references public.daily_sessions (id) on delete cascade,
  inmate_id  uuid not null references public.master_inmates (id) on delete restrict,
  primary key (session_id, inmate_id)
);
create index session_inmates_inmate_idx on public.session_inmates (inmate_id);

create table public.session_readiness (
  session_id     uuid not null references public.daily_sessions (id) on delete cascade,
  kode           text not null check (kode in ('a', 'b', 'c', 'd', 'e', 'f')),
  terpenuhi      boolean not null default false,
  catatan        text,
  diperiksa_oleh uuid references public.profiles (id),
  diperiksa_at   timestamptz,
  primary key (session_id, kode)
);

create table public.status_history (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.daily_sessions (id) on delete restrict,
  dari        public.security_status not null,
  ke          public.security_status not null,
  sumber      text not null check (sumber in ('Entri lapangan', 'Otomatis (selisih hitungan)', 'Keputusan Kepala')),
  alasan      text not null,
  log_id      uuid references public.field_logs (id),
  decision_id uuid,
  oleh        uuid references public.profiles (id),
  waktu       timestamptz not null default now()
);
create index status_history_sesi_idx on public.status_history (session_id, waktu desc);

create table public.follow_ups (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.daily_sessions (id) on delete restrict,
  incident_id           uuid references public.incidents (id),
  sumber                text not null check (sumber in
                          ('Gangguan', 'Status keamanan', 'Kesiapan', 'Alarm gelang', 'Evaluasi', 'Lainnya')),
  uraian                text not null check (btrim(uraian) <> ''),
  penanggung_jawab_id   uuid references public.profiles (id),
  penanggung_jawab_nama text not null check (btrim(penanggung_jawab_nama) <> ''),
  tenggat               timestamptz not null,
  pemeriksaan_ulang_at  timestamptz,
  status                text not null default 'Terbuka' check (status in ('Terbuka', 'Dikerjakan', 'Selesai', 'Terverifikasi')),
  catatan_selesai       text,
  bukti_url             text,
  selesai_at            timestamptz,
  diverifikasi_oleh     uuid references public.profiles (id),
  diverifikasi_at       timestamptz,
  dibuat_oleh           uuid not null default auth.uid() references public.profiles (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index follow_ups_sesi_idx on public.follow_ups (session_id, status);
create index follow_ups_pj_idx   on public.follow_ups (penanggung_jawab_id);
create index follow_ups_incident_idx on public.follow_ups (incident_id);

create table public.audit_events (
  id          uuid primary key default gen_random_uuid(),
  waktu       timestamptz not null default now(),
  aktor_id    uuid,
  aktor_nama  text,
  aksi        text not null,
  sasaran_id  uuid,
  sasaran_nama text,
  detail      jsonb not null default '{}'::jsonb
);
create index audit_events_waktu_idx on public.audit_events (waktu desc);

create table public.weekly_notes (
  id            uuid primary key default gen_random_uuid(),
  kode_upt      text not null default 'UPT',
  minggu_mulai  date not null,
  kendala       text not null check (btrim(kendala) <> ''),
  tindak_lanjut text,
  ditulis_oleh  uuid not null default auth.uid() references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index weekly_notes_idx on public.weekly_notes (kode_upt, minggu_mulai desc);

create table public.trainings (
  id             uuid primary key default gen_random_uuid(),
  kode_upt       text not null default 'UPT',
  judul          text not null check (btrim(judul) <> ''),
  tanggal        date not null,
  sasaran        text,
  metode         text,
  jumlah_peserta int not null check (jumlah_peserta >= 0),
  keterangan     text,
  dibuat_oleh    uuid not null default auth.uid() references public.profiles (id),
  created_at     timestamptz not null default now()
);
create index trainings_idx on public.trainings (kode_upt, tanggal desc);

create table public.risk_register (
  id          uuid primary key default gen_random_uuid(),
  nomor       int not null unique,
  risiko      text not null,
  mitigasi    text not null,
  status      text not null default 'Dipantau' check (status in ('Dipantau', 'Terjadi', 'Terkendali')),
  catatan     text,
  diperbarui_oleh uuid references public.profiles (id),
  updated_at  timestamptz not null default now()
);

insert into public.risk_register (nomor, risiko, mitigasi) values
 (1, 'Jaringan di lokasi kegiatan tidak stabil sehingga data pemantauan terputus',
     'Penyimpanan data sementara saat jaringan terputus; pencatatan manual pada log pengawalan; penanganan sinyal terputus diatur dalam SOP penggunaan gelang.'),
 (2, 'Dokumen dan format pencatatan di UPT berbeda dengan format dalam SOP',
     'Format disusun dari dokumen yang sudah dipakai UPT; nomenklatur jabatan dan formulir boleh disesuaikan tanpa menghilangkan fungsi persetujuan, pemeriksaan, pencatatan, dan serah terima.'),
 (3, 'Petugas enggan menerapkan karena merasa beban kerja bertambah dan khawatir disalahkan',
     'Format pencatatan dibuat ringkas dan waktu pengisiannya diuji; alur pelaporan dan dokumentasi diperjelas; petugas dilibatkan sejak penyusunan.'),
 (4, 'Perangkat pemantau tidak tersedia tepat waktu',
     'Permintaan diajukan secara tertulis sejak minggu pertama; perangkat dinas petugas dipakai sebagai cadangan.'),
 (5, 'Jumlah kegiatan yang dapat diuji kurang dari rencana',
     'Jadwal disusun bersama Kepala Lapas sejak awal; kegiatan peternakan dan perikanan ikut dihitung.'),
 (6, 'Data pribadi WB tersebar melebihi keperluan',
     'Pemantauan hanya pada jam kegiatan resmi; hak akses bertingkat; sistem membaca data yang sudah ada tanpa menyalinnya.'),
 (7, 'Pelaksanaan terlalu bergantung pada Pemimpin Proyek',
     'Setiap subtim memiliki wakil; setiap keputusan didokumentasikan.'),
 (8, 'Terjadi gangguan kamtib selama uji coba',
     'Pengawalan langsung oleh petugas tetap menjadi dasar; kewenangan menghentikan kegiatan ditegaskan; prosedur pelaporan berjenjang disiapkan.'),
 (9, 'Pedoman dan SOP dinilai tumpang tindih dengan ketentuan yang dikelola direktorat lain',
     'Rancangan dibahas bersama Direktorat Pembinaan Narapidana dan Anak Binaan sejak tahap jangka pendek; pedoman hanya mengatur aspek pengamanan dan merujuk ketentuan asimilasi yang berlaku.');

-- ---------- 4. Fungsi pembantu akses bertingkat -----------------------------
create function private.norm_upt(p text)
returns text
language sql immutable set search_path = ''
as $$
  select coalesce(nullif(upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')), ''), 'UPT')
$$;

create function private.my_upt()
returns text
language sql stable security definer set search_path = ''
as $$
  select private.norm_upt(p.kode_upt) from public.profiles p
   where p.id = (select auth.uid()) and p.is_active
$$;

create function private.my_kanwil()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.kanwil_id from public.profiles p where p.id = (select auth.uid()) and p.is_active
$$;

-- Apakah pengguna boleh melihat data milik UPT tertentu (bukan untuk Pengawal, yang dibatasi penugasan).
create function private.can_view_upt(p_upt text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case (select private.app_role())
    when 'administrator'      then true
    when 'pemantau_pusat'     then true
    when 'operator'           then private.my_upt() = private.norm_upt(p_upt)
    when 'kepala_pengamanan'  then private.my_upt() = private.norm_upt(p_upt)
    when 'pemantau_kanwil'    then exists (
        select 1 from public.master_upt u
         where u.kode = private.norm_upt(p_upt)
           and u.kanwil_id is not null
           and u.kanwil_id = private.my_kanwil())
    else false
  end
$$;

create function private.can_view_activity(p_activity uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.activities a
     where a.id = p_activity
       and (private.can_view_upt(a.kode_upt) or private.pengawal_in_activity(a.id)))
$$;

create function private.can_view_session(p_session uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.daily_sessions s
      join public.activities a on a.id = s.activity_id
     where s.id = p_session
       and (private.can_view_upt(a.kode_upt) or private.pengawal_in_session(s.id)))
$$;

create function private.can_view_session_text(p_session text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case when p_session ~ '^[0-9a-fA-F-]{36}$' then private.can_view_session(p_session::uuid) else false end
$$;

-- Sesi masih boleh diubah Operator (belum disetujui dan belum ditutup).
create function private.session_editable(p_session uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.daily_sessions s
     where s.id = p_session
       and s.status_kesiapan in ('Menunggu', 'Perbaiki Dulu', 'Ditunda')
       and s.ditutup_at is null)
$$;

create function private.session_upt(p_session uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select a.kode_upt from public.daily_sessions s join public.activities a on a.id = s.activity_id
   where s.id = p_session
$$;

-- Menaikkan status keamanan (hanya ke atas) dan mencatat riwayatnya.
create function private.naikkan_status(
  p_session uuid, p_target public.security_status, p_sumber text, p_alasan text,
  p_log uuid, p_decision uuid, p_oleh uuid, p_waktu timestamptz default now())
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_dari public.security_status;
begin
  select s.status_keamanan into v_dari from public.daily_sessions s where s.id = p_session for update;
  if v_dari is null then return; end if;
  if private.status_rank(v_dari) < private.status_rank(p_target) then
    update public.daily_sessions set status_keamanan = p_target where id = p_session;
    insert into public.status_history (session_id, dari, ke, sumber, alasan, log_id, decision_id, oleh, waktu)
    values (p_session, v_dari, p_target, p_sumber, coalesce(nullif(btrim(p_alasan), ''), '-'), p_log, p_decision, p_oleh, p_waktu);
  end if;
end
$$;

-- Penjaga tabel profiles (menggantikan versi 02): Administrator mengatur akun lain.
create or replace function private.guard_profiles()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  new.updated_at := now();
  if current_user in ('authenticated', 'anon') then
    v_role := (select private.app_role());
    if new.id is distinct from old.id then
      raise exception 'Identitas akun tidak bisa diubah.' using errcode = '42501';
    end if;
    if v_role = 'administrator' then
      if old.id = (select auth.uid())
         and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
        raise exception 'Administrator tidak bisa mengubah peran atau menonaktifkan akunnya sendiri.' using errcode = '42501';
      end if;
      if new.kode_upt is not null and new.kode_upt is distinct from old.kode_upt
         and not exists (select 1 from public.master_upt u where u.kode = private.norm_upt(new.kode_upt)) then
        raise exception 'Kode UPT belum terdaftar di data induk UPT.' using errcode = '22023';
      end if;
      return new;
    end if;
    if new.role is distinct from old.role or new.kanwil_id is distinct from old.kanwil_id then
      raise exception 'Peran dan wilayah tidak bisa diubah dari aplikasi.' using errcode = '42501';
    end if;
    if (new.nip is distinct from old.nip
        or new.kode_upt is distinct from old.kode_upt
        or new.is_active is distinct from old.is_active)
       and v_role is distinct from 'operator' then
      raise exception 'Hanya Operator yang boleh mengubah NIP, kode UPT, atau status aktif.' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

-- Profil otomatis saat akun dibuat (menggantikan versi 02): peran baru ikut dikenali.
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  v_role := case
    when new.raw_app_meta_data->>'role' in
         ('administrator', 'operator', 'pengawal', 'kepala_pengamanan', 'pemantau_kanwil', 'pemantau_pusat')
      then (new.raw_app_meta_data->>'role')::public.user_role
    else 'pengawal'::public.user_role
  end;
  insert into public.profiles (id, full_name, nip, kode_upt, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), new.email, 'Tanpa nama'),
    nullif(btrim(new.raw_user_meta_data->>'nip'), ''),
    nullif(btrim(new.raw_app_meta_data->>'kode_upt'), ''),
    v_role
  );
  return new;
end
$$;

-- ---------- 5. Pemicu -------------------------------------------------------
-- 5a. Kode UPT bawaan untuk data induk, catatan mingguan, dan pembekalan.
create function private.set_upt_default()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.kode_upt is null or new.kode_upt = 'UPT' then
    new.kode_upt := coalesce(private.my_upt(), 'UPT');
  end if;
  new.kode_upt := private.norm_upt(new.kode_upt);
  return new;
end
$$;

create trigger locations_upt before insert on public.master_locations
  for each row execute function private.set_upt_default();
create trigger inmates_upt before insert on public.master_inmates
  for each row execute function private.set_upt_default();
create trigger weekly_notes_upt before insert on public.weekly_notes
  for each row execute function private.set_upt_default();
create trigger trainings_upt before insert on public.trainings
  for each row execute function private.set_upt_default();

-- 5b. Penjaga sesi harian (menggantikan versi 01): Pengawal harus dari UPT yang sama dengan kegiatan.
create or replace function private.guard_daily_sessions()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_upt text;
begin
  if tg_op = 'INSERT' then
    if current_user in ('authenticated', 'anon') then
      new.status_kesiapan := 'Menunggu';
      new.status_keamanan := 'HIJAU';
      new.ditutup_at := null;
      new.ditutup_oleh := null;
    end if;
  else
    new.updated_at := now();
    if current_user in ('authenticated', 'anon') then
      if new.activity_id is distinct from old.activity_id
         or new.status_keamanan is distinct from old.status_keamanan
         or new.ditutup_at is distinct from old.ditutup_at
         or new.ditutup_oleh is distinct from old.ditutup_oleh
         or new.created_by is distinct from old.created_by then
        raise exception 'Kolom ini tidak boleh diubah langsung.' using errcode = '42501';
      end if;
      if new.status_kesiapan is distinct from old.status_kesiapan
         and not (old.status_kesiapan in ('Perbaiki Dulu', 'Ditunda') and new.status_kesiapan = 'Menunggu') then
        raise exception 'Status kesiapan hanya diubah lewat keputusan Kepala Pengamanan.' using errcode = '42501';
      end if;
    end if;
  end if;

  if tg_op = 'INSERT' or new.petugas_ids is distinct from old.petugas_ids then
    select a.kode_upt into v_upt from public.activities a where a.id = new.activity_id;
    if exists (
      select 1 from unnest(new.petugas_ids) as u (pid)
      where not exists (
        select 1 from public.profiles p
        where p.id = u.pid and p.role = 'pengawal' and p.is_active
          and private.norm_upt(p.kode_upt) = private.norm_upt(v_upt))
    ) then
      raise exception 'Semua petugas harus akun Pengawal aktif dari UPT yang sama dengan kegiatan.' using errcode = '22023';
    end if;
  end if;
  return new;
end
$$;

-- 5c. Enam indikator kesiapan dibuat otomatis untuk setiap sesi baru.
create function private.init_session_readiness()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.session_readiness (session_id, kode)
  select new.id, k from unnest(array['a', 'b', 'c', 'd', 'e', 'f']) as k;
  return null;
end
$$;
create trigger daily_sessions_readiness after insert on public.daily_sessions
  for each row execute function private.init_session_readiness();

create function private.guard_session_readiness()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.session_id is distinct from old.session_id or new.kode is distinct from old.kode then
    raise exception 'Kolom ini tidak boleh diubah.' using errcode = '42501';
  end if;
  new.diperiksa_oleh := (select auth.uid());
  new.diperiksa_at := now();
  return new;
end
$$;
create trigger session_readiness_guard before update on public.session_readiness
  for each row execute function private.guard_session_readiness();

-- 5d. Daftar nominatif: hanya saat sesi masih bisa diubah; WB harus dari UPT yang sama; jumlah ikut otomatis.
create function private.guard_session_inmates()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_sid uuid := coalesce(new.session_id, old.session_id);
  v_upt text;
begin
  if tg_op = 'INSERT' then
    select a.kode_upt into v_upt
      from public.daily_sessions s join public.activities a on a.id = s.activity_id where s.id = v_sid;
    if not exists (select 1 from public.master_inmates m where m.id = new.inmate_id and m.aktif and m.kode_upt = private.norm_upt(v_upt)) then
      raise exception 'Warga binaan harus aktif dan berasal dari UPT yang sama dengan kegiatan.' using errcode = '22023';
    end if;
  end if;
  if current_user in ('authenticated', 'anon') and not private.session_editable(v_sid) then
    raise exception 'Daftar nominatif tidak bisa diubah setelah sesi disetujui atau ditutup.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;
create trigger session_inmates_guard before insert or delete on public.session_inmates
  for each row execute function private.guard_session_inmates();

create function private.sync_jumlah_nominatif()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_sid uuid := coalesce(new.session_id, old.session_id);
begin
  update public.daily_sessions s
     set jumlah_narapidana = (select count(*) from public.session_inmates i where i.session_id = v_sid)
   where s.id = v_sid;
  return null;
end
$$;
create trigger session_inmates_sync after insert or delete on public.session_inmates
  for each row execute function private.sync_jumlah_nominatif();

-- 5e. Validasi entri lapangan (menggantikan versi 01) + penanda catatan susulan.
create or replace function private.validate_field_log()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.waktu_kejadian > now() + interval '5 minutes' then
    raise exception 'Waktu kejadian tidak boleh di masa depan.' using errcode = '22023';
  end if;
  new.susulan := (now() - new.waktu_kejadian) > interval '10 minutes';

  case new.jenis_entri
    when 'Serah terima di blok' then
      if coalesce(new.payload->>'tahap', '') not in ('keluar', 'kembali') then
        raise exception 'Serah terima: tahap harus keluar atau kembali.' using errcode = '22023';
      end if;
      if coalesce(new.payload->>'jumlah_wbp', '') !~ '^\d{1,6}$'
         or coalesce(new.payload->>'jumlah_alat', '') !~ '^\d{1,6}$' then
        raise exception 'Serah terima: jumlah WBP dan jumlah alat wajib berupa angka.' using errcode = '22023';
      end if;
      if new.payload->>'tahap' = 'kembali'
         and jsonb_typeof(new.payload->'penggeledahan') is distinct from 'boolean' then
        raise exception 'Serah terima kembali: status penggeledahan wajib diisi.' using errcode = '22023';
      end if;
    when 'Tiba di lokasi', 'Pemeriksaan berkala', 'Pengembalian sebagian' then
      if coalesce(new.payload->>'jumlah_wbp', '') !~ '^\d{1,6}$' then
        raise exception '%: jumlah WBP hasil penghitungan wajib berupa angka.', new.jenis_entri using errcode = '22023';
      end if;
    when 'Pindah area atau ganti pengawal' then
      if coalesce(new.payload->>'jumlah_wbp', '') !~ '^\d{1,6}$' then
        raise exception 'Perpindahan: jumlah WBP hasil penghitungan wajib berupa angka.' using errcode = '22023';
      end if;
      if btrim(coalesce(new.payload->>'area_baru', '')) = '' and btrim(coalesce(new.payload->>'pengawal_baru', '')) = '' then
        raise exception 'Perpindahan: isi area baru atau nama pengawal pengganti.' using errcode = '22023';
      end if;
    when 'P2U keluar atau masuk' then
      if coalesce(new.payload->>'arah', '') not in ('keluar', 'masuk') then
        raise exception 'P2U: arah harus keluar atau masuk.' using errcode = '22023';
      end if;
    when 'Alarm gelang' then
      if btrim(coalesce(new.payload->>'jenis_alarm', '')) = '' then
        raise exception 'Alarm gelang: jenis alarm wajib diisi.' using errcode = '22023';
      end if;
      if jsonb_typeof(new.payload->'dikonfirmasi_langsung') is distinct from 'boolean' then
        raise exception 'Alarm gelang: isi apakah alarm sudah dikonfirmasi langsung kepada petugas di lokasi.' using errcode = '22023';
      end if;
    when 'Pemeriksaan gelang' then
      if coalesce(new.payload->>'jumlah_diperiksa', '') !~ '^\d{1,6}$'
         or coalesce(new.payload->>'jumlah_berfungsi', '') !~ '^\d{1,6}$'
         or (new.payload->>'jumlah_berfungsi')::int > (new.payload->>'jumlah_diperiksa')::int then
        raise exception 'Pemeriksaan gelang: jumlah berfungsi tidak boleh melebihi jumlah yang diperiksa.' using errcode = '22023';
      end if;
    when 'Naikkan status' then
      if coalesce(new.payload->>'status_baru', '') not in ('KUNING', 'MERAH', 'KRITIS') then
        raise exception 'Status baru harus KUNING, MERAH, atau KRITIS.' using errcode = '22023';
      end if;
      if btrim(coalesce(new.payload->>'alasan', '')) = '' then
        raise exception 'Alasan kenaikan status wajib diisi.' using errcode = '22023';
      end if;
    when 'Gangguan' then
      if btrim(coalesce(new.payload->>'kategori', '')) = '' then
        raise exception 'Kategori gangguan wajib diisi.' using errcode = '22023';
      end if;
      if new.payload->>'status_baru' is not null
         and new.payload->>'status_baru' not in ('KUNING', 'MERAH', 'KRITIS') then
        raise exception 'Status baru harus KUNING, MERAH, atau KRITIS.' using errcode = '22023';
      end if;
    else
      null;
  end case;
  return new;
end
$$;

-- 5f. Akibat entri lapangan (menggantikan versi 01): kenaikan status + riwayat, gangguan, selisih hitungan.
create or replace function private.apply_field_log_effects()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_target  public.security_status;
  v_alasan  text;
  s         public.daily_sessions%rowtype;
  v_keluar  jsonb;
  v_partial int;
  v_exp     int;
  v_hit     int;
  v_selisih text;
begin
  if new.jenis_entri in ('Naikkan status', 'Gangguan') then
    v_target := coalesce((new.payload->>'status_baru')::public.security_status, 'KUNING'::public.security_status);
    v_alasan := coalesce(nullif(btrim(new.payload->>'alasan'), ''), 'Gangguan: ' || btrim(coalesce(new.payload->>'kategori', '')));
    perform private.naikkan_status(new.session_id, v_target, 'Entri lapangan', v_alasan,
                                   new.id, null, new.pengawal_id, new.waktu_kejadian);
  end if;

  if new.jenis_entri = 'Gangguan' then
    insert into public.incidents (log_id, session_id, kategori_gangguan, tindakan_awal, penanggung_jawab_tindak_lanjut)
    values (
      new.id, new.session_id, btrim(new.payload->>'kategori'),
      nullif(btrim(coalesce(new.payload->>'tindakan_awal', '')), ''),
      nullif(btrim(coalesce(new.payload->>'penanggung_jawab', '')), '')
    );
  end if;

  -- Penghitungan WB di setiap perpindahan lokasi dicocokkan dengan jumlah yang keluar dari blok.
  if new.jenis_entri in ('Tiba di lokasi', 'Pemeriksaan berkala', 'Pindah area atau ganti pengawal') then
    select * into s from public.daily_sessions where id = new.session_id;
    select l.payload into v_keluar
      from public.field_logs l
     where l.session_id = new.session_id and l.jenis_entri = 'Serah terima di blok'
       and l.payload->>'tahap' = 'keluar' and l.waktu_kejadian <= new.waktu_kejadian
     order by l.waktu_kejadian desc, l.dikirim_at desc limit 1;
    select coalesce(sum((l.payload->>'jumlah_wbp')::int), 0) into v_partial
      from public.field_logs l
     where l.session_id = new.session_id and l.jenis_entri = 'Pengembalian sebagian'
       and l.waktu_kejadian <= new.waktu_kejadian;
    v_exp := coalesce((v_keluar->>'jumlah_wbp')::int, s.jumlah_narapidana) - v_partial;
    v_hit := (new.payload->>'jumlah_wbp')::int;
    if v_hit <> v_exp then
      v_selisih := format('Selisih jumlah WB: dihitung %s, seharusnya %s (%s)', v_hit, v_exp, new.jenis_entri);
      insert into public.incidents (log_id, session_id, kategori_gangguan, tindakan_awal)
      values (new.id, new.session_id, 'Selisih jumlah WB', v_selisih);
      perform private.naikkan_status(new.session_id, 'MERAH', 'Otomatis (selisih hitungan)', v_selisih,
                                     new.id, null, new.pengawal_id, new.waktu_kejadian);
    end if;
  end if;

  -- Serah terima kembali: jumlah WB atau alat berbeda dari saat keluar.
  if new.jenis_entri = 'Serah terima di blok' and new.payload->>'tahap' = 'kembali' then
    select l.payload into v_keluar
      from public.field_logs l
     where l.session_id = new.session_id and l.jenis_entri = 'Serah terima di blok'
       and l.payload->>'tahap' = 'keluar' and l.waktu_kejadian <= new.waktu_kejadian
     order by l.waktu_kejadian desc, l.dikirim_at desc limit 1;
    if v_keluar is not null
       and ((new.payload->>'jumlah_wbp')::int <> (v_keluar->>'jumlah_wbp')::int
            or (new.payload->>'jumlah_alat')::int <> (v_keluar->>'jumlah_alat')::int) then
      v_selisih := format('Selisih saat kembali ke blok: WB %s dari %s, alat %s dari %s',
                          new.payload->>'jumlah_wbp', v_keluar->>'jumlah_wbp',
                          new.payload->>'jumlah_alat', v_keluar->>'jumlah_alat');
      insert into public.incidents (log_id, session_id, kategori_gangguan, tindakan_awal)
      values (new.id, new.session_id, 'Selisih saat serah terima kembali', v_selisih);
      perform private.naikkan_status(new.session_id, 'MERAH', 'Otomatis (selisih hitungan)', v_selisih,
                                     new.id, null, new.pengawal_id, new.waktu_kejadian);
    end if;
  end if;
  return null;
end
$$;

-- 5g. Keputusan Kepala Pengamanan (menggantikan versi 01 dan 02).
create or replace function private.apply_decision()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  s        public.daily_sessions%rowtype;
  rek      jsonb;
  v_target public.security_status;
  v_kurang text;
  v_nominatif int;
begin
  if (select private.app_role()) is distinct from 'kepala_pengamanan' then
    raise exception 'Hanya Kepala Pengamanan yang boleh membuat keputusan.' using errcode = '42501';
  end if;
  select * into s from public.daily_sessions where id = new.session_id for update;
  if not found then
    raise exception 'Sesi tidak ditemukan.' using errcode = '22023';
  end if;
  if not private.can_view_upt(private.session_upt(s.id)) then
    raise exception 'Sesi ini berada di luar UPT Anda.' using errcode = '42501';
  end if;
  if s.ditutup_at is not null then
    raise exception 'Sesi sudah ditutup.' using errcode = '22023';
  end if;

  case new.jenis_keputusan
    when 'Dapat Dimulai', 'Perbaiki Dulu', 'Ditunda' then
      if s.status_kesiapan <> 'Menunggu' then
        raise exception 'Keputusan kesiapan hanya bisa diberikan saat status Menunggu.' using errcode = '22023';
      end if;
      if new.jenis_keputusan = 'Dapat Dimulai' then
        if s.dokumen_surat_perintah is null or s.dokumen_rencana_pengamanan is null then
          raise exception 'Surat perintah dan rencana pengamanan belum diunggah Operator.' using errcode = '22023';
        end if;
        select count(*) into v_nominatif from public.session_inmates i where i.session_id = s.id;
        if v_nominatif = 0 or v_nominatif <> s.jumlah_narapidana then
          raise exception 'Daftar nominatif belum lengkap atau jumlahnya tidak sama dengan jumlah WB pada rencana.' using errcode = '22023';
        end if;
        select string_agg(r.kode, ', ' order by r.kode) into v_kurang
          from public.session_readiness r
         where r.session_id = s.id and not r.terpenuhi and (r.kode <> 'f' or s.pakai_gelang_monitor);
        if v_kurang is not null then
          raise exception 'Indikator kesiapan belum terpenuhi: %.', v_kurang using errcode = '22023';
        end if;
      end if;
      if new.jenis_keputusan in ('Perbaiki Dulu', 'Ditunda')
         and btrim(coalesce(new.catatan_keputusan, '')) = '' then
        raise exception 'Catatan wajib diisi untuk keputusan Perbaiki Dulu atau Ditunda.' using errcode = '22023';
      end if;
      update public.daily_sessions
         set status_kesiapan = new.jenis_keputusan::public.readiness_status
       where id = s.id;

    when 'Verifikasi Gangguan' then
      if new.incident_id is null then
        raise exception 'Pilih gangguan yang diverifikasi.' using errcode = '22023';
      end if;
      if btrim(coalesce(new.catatan_keputusan, '')) = '' then
        raise exception 'Catatan verifikasi wajib diisi.' using errcode = '22023';
      end if;
      update public.incidents
         set status_penyelesaian = true, diverifikasi_at = now(), diverifikasi_oleh = new.pejabat_id
       where id = new.incident_id and session_id = s.id and not status_penyelesaian;
      if not found then
        raise exception 'Gangguan tidak ditemukan pada sesi ini atau sudah diverifikasi.' using errcode = '22023';
      end if;

    when 'Penurunan Status' then
      v_target := coalesce(new.status_baru, 'HIJAU'::public.security_status);
      if s.status_keamanan = 'HIJAU' then
        raise exception 'Status sudah HIJAU.' using errcode = '22023';
      end if;
      if private.status_rank(v_target) >= private.status_rank(s.status_keamanan) then
        raise exception 'Status baru harus lebih rendah dari status sekarang (%).', s.status_keamanan using errcode = '22023';
      end if;
      if btrim(coalesce(new.catatan_keputusan, '')) = '' then
        raise exception 'Alasan penurunan status wajib dicatat.' using errcode = '22023';
      end if;
      if btrim(coalesce(new.bukti_url, '')) = '' then
        raise exception 'Foto bukti pemulihan keadaan wajib diunggah.' using errcode = '22023';
      end if;
      if v_target = 'HIJAU'
         and exists (select 1 from public.incidents i where i.session_id = s.id and not i.status_penyelesaian) then
        raise exception 'Masih ada gangguan yang belum diverifikasi.' using errcode = '22023';
      end if;
      new.status_baru := v_target;
      update public.daily_sessions set status_keamanan = v_target where id = s.id;
      insert into public.status_history (session_id, dari, ke, sumber, alasan, decision_id, oleh)
      values (s.id, s.status_keamanan, v_target, 'Keputusan Kepala', btrim(new.catatan_keputusan), new.id, new.pejabat_id);

    when 'Arahan Tindakan' then
      if s.status_kesiapan <> 'Dapat Dimulai' or s.status_keamanan = 'HIJAU' then
        raise exception 'Arahan tindakan dicatat saat kegiatan berjalan dengan status KUNING, MERAH, atau KRITIS.' using errcode = '22023';
      end if;
      if btrim(coalesce(new.catatan_keputusan, '')) = '' then
        raise exception 'Isi arahan tindakan wajib dicatat.' using errcode = '22023';
      end if;

    when 'Tutup Kegiatan' then
      if s.status_kesiapan <> 'Dapat Dimulai' then
        raise exception 'Kegiatan yang belum dimulai tidak bisa ditutup.' using errcode = '22023';
      end if;
      rek := private.hitung_rekonsiliasi(s.id);
      if not (rek->>'siap_tutup')::boolean then
        raise exception 'Kegiatan belum bisa ditutup: %',
          array_to_string(array(select jsonb_array_elements_text(rek->'alasan')), '; ')
          using errcode = '22023';
      end if;
      update public.daily_sessions
         set ditutup_at = now(), ditutup_oleh = new.pejabat_id
       where id = s.id;

    else
      raise exception 'Jenis keputusan tidak dikenal.' using errcode = '22023';
  end case;
  return new;
end
$$;

-- 5h. Tindak lanjut: aturan siapa boleh mengubah apa.
create function private.guard_follow_ups()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_role public.user_role := (select private.app_role());
  v_uid  uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if current_user in ('authenticated', 'anon') then
      new.status := 'Terbuka';
      new.selesai_at := null; new.catatan_selesai := null; new.bukti_url := null;
      new.diverifikasi_oleh := null; new.diverifikasi_at := null;
      new.dibuat_oleh := v_uid;
      if new.tenggat <= now() - interval '1 minute' then
        raise exception 'Tenggat harus di masa depan.' using errcode = '22023';
      end if;
    end if;
    if new.penanggung_jawab_id is not null then
      new.penanggung_jawab_nama := coalesce(
        nullif(btrim(new.penanggung_jawab_nama), ''),
        (select p.full_name from public.profiles p where p.id = new.penanggung_jawab_id));
    end if;
    return new;
  end if;

  new.updated_at := now();
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.session_id is distinct from old.session_id or new.incident_id is distinct from old.incident_id
     or new.sumber is distinct from old.sumber or new.dibuat_oleh is distinct from old.dibuat_oleh
     or new.created_at is distinct from old.created_at then
    raise exception 'Kolom ini tidak boleh diubah.' using errcode = '42501';
  end if;
  if old.status = 'Terverifikasi' then
    raise exception 'Tindak lanjut yang sudah diverifikasi tidak bisa diubah.' using errcode = '22023';
  end if;

  if v_role = 'kepala_pengamanan' then
    if new.status is distinct from old.status then
      if not (old.status = 'Selesai' and new.status = 'Terverifikasi') then
        raise exception 'Kepala Pengamanan hanya memverifikasi tindak lanjut yang sudah berstatus Selesai.' using errcode = '22023';
      end if;
      if btrim(coalesce(new.catatan_selesai, '')) = '' then
        raise exception 'Hasil pemeriksaan wajib dicatat saat verifikasi.' using errcode = '22023';
      end if;
      new.diverifikasi_oleh := v_uid;
      new.diverifikasi_at := now();
    elsif new.selesai_at is distinct from old.selesai_at or new.bukti_url is distinct from old.bukti_url then
      raise exception 'Isian penyelesaian hanya diubah oleh pelaksana.' using errcode = '42501';
    end if;
  else
    -- Pelaksana (Operator, atau Pengawal yang ditunjuk): hanya mengerjakan dan menyelesaikan.
    if v_role = 'pengawal' and old.penanggung_jawab_id is distinct from v_uid then
      raise exception 'Tindak lanjut ini bukan tugas Anda.' using errcode = '42501';
    end if;
    if new.uraian is distinct from old.uraian or new.penanggung_jawab_id is distinct from old.penanggung_jawab_id
       or new.penanggung_jawab_nama is distinct from old.penanggung_jawab_nama
       or new.tenggat is distinct from old.tenggat or new.pemeriksaan_ulang_at is distinct from old.pemeriksaan_ulang_at
       or new.diverifikasi_oleh is distinct from old.diverifikasi_oleh or new.diverifikasi_at is distinct from old.diverifikasi_at then
      raise exception 'Isian ini hanya diatur Kepala Pengamanan.' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      if not ((old.status = 'Terbuka' and new.status in ('Dikerjakan', 'Selesai'))
              or (old.status = 'Dikerjakan' and new.status = 'Selesai')) then
        raise exception 'Perubahan status tindak lanjut tidak sesuai alur.' using errcode = '22023';
      end if;
      if new.status = 'Selesai' then
        if btrim(coalesce(new.catatan_selesai, '')) = '' then
          raise exception 'Catatan penyelesaian wajib diisi.' using errcode = '22023';
        end if;
        new.selesai_at := now();
      end if;
    end if;
  end if;
  return new;
end
$$;
create trigger follow_ups_guard before insert or update on public.follow_ups
  for each row execute function private.guard_follow_ups();

-- 5i. Jejak audit untuk pengelolaan akun.
create function private.audit_profiles()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_aktor uuid := (select auth.uid());
  v_detail jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.audit_events (aktor_id, aktor_nama, aksi, sasaran_id, sasaran_nama, detail)
    values (v_aktor, (select p.full_name from public.profiles p where p.id = v_aktor),
            'Akun dibuat', new.id, new.full_name,
            jsonb_build_object('peran', new.role, 'kode_upt', new.kode_upt));
    return null;
  end if;
  if new.role is distinct from old.role then
    v_detail := v_detail || jsonb_build_object('peran', jsonb_build_array(old.role, new.role));
  end if;
  if new.is_active is distinct from old.is_active then
    v_detail := v_detail || jsonb_build_object('aktif', jsonb_build_array(old.is_active, new.is_active));
  end if;
  if new.kode_upt is distinct from old.kode_upt then
    v_detail := v_detail || jsonb_build_object('kode_upt', jsonb_build_array(old.kode_upt, new.kode_upt));
  end if;
  if new.nip is distinct from old.nip then
    v_detail := v_detail || jsonb_build_object('nip', jsonb_build_array(old.nip, new.nip));
  end if;
  if new.kanwil_id is distinct from old.kanwil_id then
    v_detail := v_detail || jsonb_build_object('kanwil', jsonb_build_array(old.kanwil_id, new.kanwil_id));
  end if;
  if v_detail <> '{}'::jsonb then
    insert into public.audit_events (aktor_id, aktor_nama, aksi, sasaran_id, sasaran_nama, detail)
    values (v_aktor, (select p.full_name from public.profiles p where p.id = v_aktor),
            'Akun diubah', new.id, new.full_name, v_detail);
  end if;
  return null;
end
$$;
create trigger profiles_audit after insert or update on public.profiles
  for each row execute function private.audit_profiles();

-- 5j. updated_at dan pencatat pembaruan daftar risiko.
create function private.touch_risk()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.diperbarui_oleh := (select auth.uid());
  return new;
end
$$;
create trigger risk_touch before update on public.risk_register
  for each row execute function private.touch_risk();

-- ---------- 6. Rekonsiliasi dan daftar nominatif (RPC) ---------------------------
create or replace function public.rekonsiliasi_sesi(p_session uuid)
returns jsonb
language plpgsql stable set search_path = ''
as $$
begin
  if (select private.app_role()) is null
     or (select private.app_role()) = 'pengawal'
     or not private.can_view_session(p_session) then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;
  return private.hitung_rekonsiliasi(p_session);
end
$$;

-- Daftar nominatif untuk satu sesi. Pengawal hanya melihatnya saat sesi aktif dan ditugaskan kepadanya.
create function public.daftar_nominatif(p_session uuid)
returns table (inmate_id uuid, nomor_registrasi text, nama text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_role public.user_role := (select private.app_role());
begin
  if v_role is null or v_role in ('pemantau_kanwil', 'pemantau_pusat') then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;
  if v_role = 'pengawal' then
    if not private.pengawal_can_log(p_session) then
      raise exception 'Tidak berwenang.' using errcode = '42501';
    end if;
  elsif not private.can_view_session(p_session) then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;
  return query
    select m.id, m.nomor_registrasi, m.nama
      from public.session_inmates i join public.master_inmates m on m.id = i.inmate_id
     where i.session_id = p_session
     order by m.nama;
end
$$;

-- ---------- 7. Ringkasan dasbor ------------------------------------------------------
create view public.v_session_overview with (security_invoker = true) as
select
  s.id                        as session_id,
  s.activity_id,
  a.kode_kegiatan,
  a.jenis_kegiatan,
  a.kode_upt,
  u.nama                      as upt_nama,
  a.lokasi_id,
  l.nama                      as lokasi_nama,
  a.luas_lahan_ha,
  s.tanggal_sesi,
  s.status_kesiapan,
  s.status_keamanan,
  s.ditutup_at,
  s.jumlah_narapidana,
  s.jumlah_alat_kerja,
  cardinality(s.petugas_ids)  as jumlah_petugas,
  s.interval_pemeriksaan,
  s.pakai_gelang_monitor,
  k.waktu_kejadian            as keluar_at,
  (k.payload->>'jumlah_wbp')::int as wbp_keluar,
  b.waktu_kejadian            as kembali_at,
  (b.payload->>'jumlah_wbp')::int as wbp_kembali,
  t.waktu_kejadian            as tiba_at,
  h.waktu_kejadian            as hitung_terakhir_at,
  (h.payload->>'jumlah_wbp')::int as wbp_terakhir_dihitung,
  case
    when s.ditutup_at is not null then 'Selesai'
    when s.status_kesiapan = 'Menunggu' then 'Menunggu keputusan kesiapan'
    when s.status_kesiapan = 'Perbaiki Dulu' then 'Perlu diperbaiki'
    when s.status_kesiapan = 'Ditunda' then 'Ditunda'
    when b.id is not null and (k.id is null or b.waktu_kejadian >= k.waktu_kejadian) then 'Sudah kembali ke blok'
    when t.id is not null then 'Di lokasi'
    when k.id is not null then 'Dalam perjalanan'
    else 'Siap, belum berangkat'
  end                         as fase,
  greatest(s.updated_at, lg.terakhir_kirim, dc.terakhir) as diperbarui_at,
  coalesce(gi.n, 0)           as gangguan_terbuka,
  coalesce(fu.terbuka, 0)     as tindak_lanjut_terbuka,
  coalesce(fu.terlambat, 0)   as tindak_lanjut_terlambat,
  coalesce(s.ditutup_at is null and s.status_kesiapan = 'Dapat Dimulai' and t.id is not null
     and (b.id is null or (k.id is not null and b.waktu_kejadian < k.waktu_kejadian))
     and now() > h.waktu_kejadian + make_interval(mins => s.interval_pemeriksaan), false) as terlambat_periksa,
  (h.waktu_kejadian + make_interval(mins => s.interval_pemeriksaan)) as batas_periksa_berikut
from public.daily_sessions s
  join public.activities a on a.id = s.activity_id
  left join public.master_locations l on l.id = a.lokasi_id
  left join public.master_upt u on u.kode = a.kode_upt
  left join lateral (
    select x.id, x.waktu_kejadian, x.payload from public.field_logs x
     where x.session_id = s.id and x.jenis_entri = 'Serah terima di blok' and x.payload->>'tahap' = 'keluar'
     order by x.waktu_kejadian desc, x.dikirim_at desc limit 1) k on true
  left join lateral (
    select x.id, x.waktu_kejadian, x.payload from public.field_logs x
     where x.session_id = s.id and x.jenis_entri = 'Serah terima di blok' and x.payload->>'tahap' = 'kembali'
     order by x.waktu_kejadian desc, x.dikirim_at desc limit 1) b on true
  left join lateral (
    select x.id, x.waktu_kejadian from public.field_logs x
     where x.session_id = s.id and x.jenis_entri = 'Tiba di lokasi'
     order by x.waktu_kejadian asc limit 1) t on true
  left join lateral (
    select x.waktu_kejadian, x.payload from public.field_logs x
     where x.session_id = s.id
       and x.jenis_entri in ('Tiba di lokasi', 'Pemeriksaan berkala', 'Pindah area atau ganti pengawal')
     order by x.waktu_kejadian desc, x.dikirim_at desc limit 1) h on true
  left join lateral (
    select max(x.dikirim_at) as terakhir_kirim from public.field_logs x where x.session_id = s.id) lg on true
  left join lateral (
    select max(x.created_at) as terakhir from public.decisions x where x.session_id = s.id) dc on true
  left join lateral (
    select count(*)::int as n from public.incidents x where x.session_id = s.id and not x.status_penyelesaian) gi on true
  left join lateral (
    select count(*) filter (where x.status in ('Terbuka', 'Dikerjakan'))::int as terbuka,
           count(*) filter (where x.status in ('Terbuka', 'Dikerjakan') and x.tenggat < now())::int as terlambat
      from public.follow_ups x where x.session_id = s.id) fu on true;

-- ---------- 8. Indikator evaluasi uji coba (Bab II dan IV) --------------------------------
create function public.indikator_evaluasi(p_dari date, p_sampai date)
returns jsonb
language sql stable set search_path = ''
as $$
  with s as (
    select * from public.daily_sessions where tanggal_sesi between p_dari and p_sampai
  ),
  jalan as (select * from s where status_kesiapan = 'Dapat Dimulai'),
  rek as (
    select j.id,
      (select x.payload from public.field_logs x where x.session_id = j.id
         and x.jenis_entri = 'Serah terima di blok' and x.payload->>'tahap' = 'keluar'
         order by x.waktu_kejadian desc limit 1) as k,
      (select x.payload from public.field_logs x where x.session_id = j.id
         and x.jenis_entri = 'Serah terima di blok' and x.payload->>'tahap' = 'kembali'
         order by x.waktu_kejadian desc limit 1) as b
    from jalan j
  ),
  lengkap as (
    select j.id, j.ditutup_at,
      (j.dokumen_surat_perintah is not null and j.dokumen_rencana_pengamanan is not null
        and (select count(*) from public.session_inmates i where i.session_id = j.id) = j.jumlah_narapidana
        and j.jumlah_narapidana > 0
        and not exists (select 1 from public.session_readiness r where r.session_id = j.id and not r.terpenuhi
                         and (r.kode <> 'f' or j.pakai_gelang_monitor))
        and r.k is not null and (r.b is not null or (j.ditutup_at is null and j.tanggal_sesi >= current_date))) as ok,
      (j.ditutup_at is not null or j.tanggal_sesi < current_date) as dinilai
    from jalan j join rek r on r.id = j.id
  ),
  logs as (
    select l.* from public.field_logs l where l.session_id in (select id from s)
  ),
  inc as (select * from public.incidents where session_id in (select id from s)),
  fu as (select * from public.follow_ups where session_id in (select id from s)),
  sh as (select * from public.status_history where session_id in (select id from s))
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_dari, 'sampai', p_sampai),
    'total_sesi', (select count(*) from s),
    'sesi_dijalankan', (select count(*) from jalan),
    'sesi_ditutup', (select count(*) from s where ditutup_at is not null),
    'sesi_sesuai_sop', (select count(*) from lengkap where ok and ditutup_at is not null),
    'serah_terima_lengkap', (select count(*) from rek where k is not null and b is not null),
    'serah_terima_cocok', (select count(*) from rek where k is not null and b is not null
        and (k->>'jumlah_wbp') = (b->>'jumlah_wbp') and (k->>'jumlah_alat') = (b->>'jumlah_alat')),
    'catatan_dinilai', (select count(*) from lengkap where dinilai),
    'catatan_lengkap', (select count(*) from lengkap where dinilai and ok),
    'perubahan_status', (select count(*) from sh),
    'perubahan_status_beralasan', (select count(*) from sh where btrim(alasan) <> '' and alasan <> '-'),
    'temuan_total', (select count(*) from inc),
    'temuan_terverifikasi', (select count(*) from inc where status_penyelesaian),
    'temuan_dengan_tindak_lanjut', (select count(*) from inc i where exists (select 1 from fu where fu.incident_id = i.id)),
    'tindak_lanjut_total', (select count(*) from fu),
    'tindak_lanjut_selesai', (select count(*) from fu where status in ('Selesai', 'Terverifikasi')),
    'tindak_lanjut_terverifikasi', (select count(*) from fu where status = 'Terverifikasi'),
    'tindak_lanjut_terlambat', (select count(*) from fu where status in ('Terbuka', 'Dikerjakan') and tenggat < now()),
    'alarm_total', (select count(*) from logs where jenis_entri = 'Alarm gelang'),
    'alarm_dikonfirmasi', (select count(*) from logs where jenis_entri = 'Alarm gelang'
        and payload->>'dikonfirmasi_langsung' = 'true'),
    'entri_total', (select count(*) from logs),
    'entri_susulan', (select count(*) from logs where susulan),
    'status', jsonb_build_object(
      'HIJAU',  (select count(*) from jalan where status_keamanan = 'HIJAU' and ditutup_at is null),
      'KUNING', (select count(*) from jalan where status_keamanan = 'KUNING' and ditutup_at is null),
      'MERAH',  (select count(*) from jalan where status_keamanan = 'MERAH' and ditutup_at is null),
      'KRITIS', (select count(*) from jalan where status_keamanan = 'KRITIS' and ditutup_at is null))
  )
$$;

create function public.tren_mingguan(p_dari date, p_sampai date)
returns jsonb
language sql stable set search_path = ''
as $$
  with s as (select * from public.daily_sessions where tanggal_sesi between p_dari and p_sampai),
  w as (
    select date_trunc('week', s.tanggal_sesi)::date as minggu,
           count(*) as sesi,
           count(*) filter (where s.ditutup_at is not null) as ditutup,
           count(*) filter (where s.status_keamanan in ('MERAH', 'KRITIS')) as merah_kritis
      from s group by 1
  ),
  g as (
    select date_trunc('week', s.tanggal_sesi)::date as minggu, count(i.id) as gangguan
      from s join public.incidents i on i.session_id = s.id group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'minggu', w.minggu, 'sesi', w.sesi, 'ditutup', w.ditutup,
      'merah_kritis', w.merah_kritis, 'gangguan', coalesce(g.gangguan, 0)) order by w.minggu), '[]'::jsonb)
    from w left join g on g.minggu = w.minggu
$$;

-- ---------- 9. Pembuatan akun oleh Administrator ---------------------------------------------
create function private.buat_akun_core(
  p_email text, p_password text, p_nama text, p_nip text,
  p_role public.user_role, p_kode_upt text, p_kanwil uuid, p_aktor uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id    uuid := gen_random_uuid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_upt   text := nullif(private.norm_upt(p_kode_upt), 'UPT');
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Alamat email tidak valid.' using errcode = '22023';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Kata sandi minimal 8 karakter.' using errcode = '22023';
  end if;
  if btrim(coalesce(p_nama, '')) = '' then
    raise exception 'Nama lengkap wajib diisi.' using errcode = '22023';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'Email ini sudah terdaftar.' using errcode = '23505';
  end if;
  if nullif(btrim(coalesce(p_nip, '')), '') is not null
     and exists (select 1 from public.profiles p where p.nip = btrim(p_nip)) then
    raise exception 'NIP ini sudah terdaftar pada akun lain.' using errcode = '23505';
  end if;
  if p_role in ('operator', 'kepala_pengamanan', 'pengawal') then
    if v_upt is null or not exists (select 1 from public.master_upt u where u.kode = v_upt) then
      raise exception 'UPT wajib dipilih dari data induk UPT untuk peran ini.' using errcode = '22023';
    end if;
  end if;
  if p_role = 'pemantau_kanwil' and p_kanwil is null then
    raise exception 'Kanwil wajib dipilih untuk Pemantau Kanwil.' using errcode = '22023';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, reauthentication_token, phone_change, phone_change_token)
  values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'),
                       'role', p_role::text, 'kode_upt', v_upt),
    jsonb_build_object('full_name', btrim(p_nama), 'nip', nullif(btrim(coalesce(p_nip, '')), ''), 'email_verified', true),
    now(), now(), '', '', '', '', '', '', '', '');

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, 'email',
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', false, 'phone_verified', false),
          now(), now(), now());

  if p_kanwil is not null then
    update public.profiles set kanwil_id = p_kanwil where id = v_id;
  elsif v_upt is not null then
    update public.profiles set kanwil_id = (select u.kanwil_id from public.master_upt u where u.kode = v_upt) where id = v_id;
  end if;
  return v_id;
end
$$;

create function public.admin_buat_akun(
  p_email text, p_password text, p_nama text, p_nip text,
  p_role public.user_role, p_kode_upt text, p_kanwil uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh membuat akun.' using errcode = '42501';
  end if;
  return private.buat_akun_core(p_email, p_password, p_nama, p_nip, p_role, p_kode_upt, p_kanwil, (select auth.uid()));
end
$$;

create function public.admin_atur_kata_sandi(p_user uuid, p_password text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_nama text;
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh mengatur ulang kata sandi.' using errcode = '42501';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Kata sandi minimal 8 karakter.' using errcode = '22023';
  end if;
  select p.full_name into v_nama from public.profiles p where p.id = p_user;
  if v_nama is null then
    raise exception 'Akun tidak ditemukan.' using errcode = '22023';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = p_user;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, sasaran_id, sasaran_nama)
  values ((select auth.uid()), (select p.full_name from public.profiles p where p.id = (select auth.uid())),
          'Kata sandi diatur ulang', p_user, v_nama);
end
$$;

-- ---------- 10. Hak akses fungsi ------------------------------------------------------------------
revoke all on function private.norm_upt(text)                       from public, anon, authenticated;
revoke all on function private.my_upt()                             from public, anon, authenticated;
revoke all on function private.my_kanwil()                          from public, anon, authenticated;
revoke all on function private.can_view_upt(text)                   from public, anon, authenticated;
revoke all on function private.can_view_activity(uuid)              from public, anon, authenticated;
revoke all on function private.can_view_session(uuid)               from public, anon, authenticated;
revoke all on function private.can_view_session_text(text)          from public, anon, authenticated;
revoke all on function private.session_editable(uuid)               from public, anon, authenticated;
revoke all on function private.session_upt(uuid)                    from public, anon, authenticated;
revoke all on function private.buat_akun_core(text, text, text, text, public.user_role, text, uuid, uuid) from public, anon, authenticated;
grant execute on function private.norm_upt(text)                    to authenticated;
grant execute on function private.my_upt()                          to authenticated;
grant execute on function private.my_kanwil()                       to authenticated;
grant execute on function private.can_view_upt(text)                to authenticated;
grant execute on function private.can_view_activity(uuid)           to authenticated;
grant execute on function private.can_view_session(uuid)            to authenticated;
grant execute on function private.can_view_session_text(text)       to authenticated;
grant execute on function private.session_editable(uuid)            to authenticated;
grant execute on function private.session_upt(uuid)                 to authenticated;

revoke all on function public.rekonsiliasi_sesi(uuid)               from public, anon;
revoke all on function public.daftar_nominatif(uuid)                from public, anon;
revoke all on function public.indikator_evaluasi(date, date)        from public, anon;
revoke all on function public.tren_mingguan(date, date)             from public, anon;
revoke all on function public.admin_buat_akun(text, text, text, text, public.user_role, text, uuid) from public, anon;
revoke all on function public.admin_atur_kata_sandi(uuid, text)     from public, anon;
grant execute on function public.rekonsiliasi_sesi(uuid)            to authenticated;
grant execute on function public.daftar_nominatif(uuid)             to authenticated;
grant execute on function public.indikator_evaluasi(date, date)     to authenticated;
grant execute on function public.tren_mingguan(date, date)          to authenticated;
grant execute on function public.admin_buat_akun(text, text, text, text, public.user_role, text, uuid) to authenticated;
grant execute on function public.admin_atur_kata_sandi(uuid, text)  to authenticated;

-- ---------- 11. Row Level Security ----------------------------------------------------------------------
alter table public.master_kanwil    enable row level security;
alter table public.master_upt       enable row level security;
alter table public.session_inmates  enable row level security;
alter table public.session_readiness enable row level security;
alter table public.status_history   enable row level security;
alter table public.follow_ups       enable row level security;
alter table public.audit_events     enable row level security;
alter table public.weekly_notes     enable row level security;
alter table public.trainings        enable row level security;
alter table public.risk_register    enable row level security;

-- wilayah: terbaca semua peran, diatur Administrator
create policy kanwil_select on public.master_kanwil for select to authenticated
  using ((select private.app_role()) is not null);
create policy kanwil_write on public.master_kanwil for all to authenticated
  using ((select private.app_role()) = 'administrator') with check ((select private.app_role()) = 'administrator');
create policy upt_select on public.master_upt for select to authenticated
  using ((select private.app_role()) is not null);
create policy upt_write on public.master_upt for all to authenticated
  using ((select private.app_role()) = 'administrator') with check ((select private.app_role()) = 'administrator');

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid())
         or (select private.app_role()) in ('administrator', 'pemantau_pusat')
         or ((select private.app_role()) in ('operator', 'kepala_pengamanan')
             and private.norm_upt(kode_upt) = (select private.my_upt()))
         or ((select private.app_role()) = 'pemantau_kanwil'
             and kanwil_id is not null and kanwil_id = (select private.my_kanwil())));
drop policy if exists profiles_update_operator on public.profiles;
create policy profiles_update_operator on public.profiles for update to authenticated
  using (role = 'pengawal' and (select private.app_role()) = 'operator'
         and private.norm_upt(kode_upt) = (select private.my_upt()))
  with check (role = 'pengawal' and (select private.app_role()) = 'operator'
         and private.norm_upt(kode_upt) = (select private.my_upt()));

-- data induk, dibatasi per UPT
drop policy if exists locations_select on public.master_locations;
create policy locations_select on public.master_locations for select to authenticated
  using (private.can_view_upt(kode_upt)
         or ((select private.app_role()) = 'pengawal' and kode_upt = (select private.my_upt())));
drop policy if exists locations_insert on public.master_locations;
create policy locations_insert on public.master_locations for insert to authenticated
  with check ((select private.app_role()) = 'administrator'
              or ((select private.app_role()) = 'operator' and kode_upt = (select private.my_upt())));
drop policy if exists locations_update on public.master_locations;
create policy locations_update on public.master_locations for update to authenticated
  using ((select private.app_role()) = 'administrator'
         or ((select private.app_role()) = 'operator' and kode_upt = (select private.my_upt())))
  with check ((select private.app_role()) = 'administrator'
              or ((select private.app_role()) = 'operator' and kode_upt = (select private.my_upt())));
drop policy if exists locations_delete on public.master_locations;
create policy locations_delete on public.master_locations for delete to authenticated
  using ((select private.app_role()) = 'administrator'
         or ((select private.app_role()) = 'operator' and kode_upt = (select private.my_upt())));

drop policy if exists inmates_select on public.master_inmates;
create policy inmates_select on public.master_inmates for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
         and private.can_view_upt(kode_upt));
drop policy if exists inmates_insert on public.master_inmates;
create policy inmates_insert on public.master_inmates for insert to authenticated
  with check ((select private.app_role()) = 'administrator'
              or ((select private.app_role()) = 'operator' and kode_upt = (select private.my_upt())));
drop policy if exists inmates_update on public.master_inmates;
create policy inmates_update on public.master_inmates for update to authenticated
  using ((select private.app_role()) = 'administrator'
         or ((select private.app_role()) = 'operator' and kode_upt = (select private.my_upt())))
  with check ((select private.app_role()) = 'administrator'
              or ((select private.app_role()) = 'operator' and kode_upt = (select private.my_upt())));
drop policy if exists inmates_delete on public.master_inmates;
create policy inmates_delete on public.master_inmates for delete to authenticated
  using ((select private.app_role()) = 'administrator'
         or ((select private.app_role()) = 'operator' and kode_upt = (select private.my_upt())));

-- kegiatan dan sesi
drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities for select to authenticated
  using (private.can_view_upt(kode_upt) or private.pengawal_in_activity(id));
drop policy if exists activities_update on public.activities;
create policy activities_update on public.activities for update to authenticated
  using ((select private.app_role()) = 'operator' and private.can_view_upt(kode_upt))
  with check ((select private.app_role()) = 'operator' and private.can_view_upt(kode_upt));
drop policy if exists activities_delete on public.activities;
create policy activities_delete on public.activities for delete to authenticated
  using ((select private.app_role()) = 'operator' and private.can_view_upt(kode_upt));

drop policy if exists sessions_select on public.daily_sessions;
create policy sessions_select on public.daily_sessions for select to authenticated
  using (private.can_view_session(id));
drop policy if exists sessions_insert on public.daily_sessions;
create policy sessions_insert on public.daily_sessions for insert to authenticated
  with check ((select private.app_role()) = 'operator' and created_by = (select auth.uid())
              and private.can_view_activity(activity_id));
drop policy if exists sessions_update on public.daily_sessions;
create policy sessions_update on public.daily_sessions for update to authenticated
  using ((select private.app_role()) = 'operator' and private.can_view_session(id)
         and status_kesiapan in ('Menunggu', 'Perbaiki Dulu', 'Ditunda') and ditutup_at is null)
  with check ((select private.app_role()) = 'operator' and ditutup_at is null);
drop policy if exists sessions_delete on public.daily_sessions;
create policy sessions_delete on public.daily_sessions for delete to authenticated
  using ((select private.app_role()) = 'operator' and private.can_view_session(id)
         and status_kesiapan in ('Menunggu', 'Perbaiki Dulu', 'Ditunda'));

drop policy if exists field_logs_select on public.field_logs;
create policy field_logs_select on public.field_logs for select to authenticated
  using (private.can_view_session(session_id));
drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents for select to authenticated
  using (private.can_view_session(session_id));
drop policy if exists decisions_select on public.decisions;
create policy decisions_select on public.decisions for select to authenticated
  using (private.can_view_session(session_id));

-- nominatif, kesiapan, riwayat status
create policy session_inmates_select on public.session_inmates for select to authenticated
  using (private.can_view_session(session_id));
create policy session_inmates_insert on public.session_inmates for insert to authenticated
  with check ((select private.app_role()) = 'operator' and private.can_view_session(session_id));
create policy session_inmates_delete on public.session_inmates for delete to authenticated
  using ((select private.app_role()) = 'operator' and private.can_view_session(session_id));

create policy readiness_select on public.session_readiness for select to authenticated
  using (private.can_view_session(session_id));
create policy readiness_update on public.session_readiness for update to authenticated
  using ((select private.app_role()) = 'operator' and private.can_view_session(session_id)
         and private.session_editable(session_id))
  with check ((select private.app_role()) = 'operator');

create policy status_history_select on public.status_history for select to authenticated
  using (private.can_view_session(session_id));

-- tindak lanjut
create policy follow_ups_select on public.follow_ups for select to authenticated
  using (private.can_view_session(session_id));
create policy follow_ups_insert on public.follow_ups for insert to authenticated
  with check ((select private.app_role()) = 'kepala_pengamanan' and private.can_view_session(session_id)
              and dibuat_oleh = (select auth.uid()));
create policy follow_ups_update on public.follow_ups for update to authenticated
  using ((select private.app_role()) in ('kepala_pengamanan', 'operator', 'pengawal')
         and private.can_view_session(session_id))
  with check ((select private.app_role()) in ('kepala_pengamanan', 'operator', 'pengawal')
              and private.can_view_session(session_id));

-- jejak audit: hanya Administrator yang membaca; tidak ada yang menulis langsung
create policy audit_select on public.audit_events for select to authenticated
  using ((select private.app_role()) = 'administrator');

-- catatan mingguan dan pembekalan
create policy weekly_notes_select on public.weekly_notes for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan', 'pemantau_kanwil', 'pemantau_pusat')
         and private.can_view_upt(kode_upt));
create policy weekly_notes_insert on public.weekly_notes for insert to authenticated
  with check (((select private.app_role()) = 'administrator'
               or ((select private.app_role()) in ('operator', 'kepala_pengamanan') and kode_upt = (select private.my_upt())))
              and ditulis_oleh = (select auth.uid()));
create policy trainings_select on public.trainings for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan', 'pemantau_kanwil', 'pemantau_pusat')
         and private.can_view_upt(kode_upt));
create policy trainings_insert on public.trainings for insert to authenticated
  with check (((select private.app_role()) = 'administrator'
               or ((select private.app_role()) in ('operator', 'kepala_pengamanan') and kode_upt = (select private.my_upt())))
              and dibuat_oleh = (select auth.uid()));

-- daftar risiko: terbaca peran non-lapangan; status dan catatan diubah Administrator atau Kepala
create policy risk_select on public.risk_register for select to authenticated
  using ((select private.app_role()) is not null and (select private.app_role()) <> 'pengawal');
create policy risk_update on public.risk_register for update to authenticated
  using ((select private.app_role()) in ('administrator', 'kepala_pengamanan'))
  with check ((select private.app_role()) in ('administrator', 'kepala_pengamanan'));

-- ---------- 12. Hak tabel ------------------------------------------------------------------------------------------
revoke all on public.master_kanwil, public.master_upt, public.session_inmates, public.session_readiness,
              public.status_history, public.follow_ups, public.audit_events, public.weekly_notes,
              public.trainings, public.risk_register, public.v_session_overview
  from anon;
revoke truncate, references, trigger on public.master_kanwil, public.master_upt, public.session_inmates,
              public.session_readiness, public.status_history, public.follow_ups, public.audit_events,
              public.weekly_notes, public.trainings, public.risk_register
  from authenticated;
-- tabel yang hanya ditulis oleh pemicu atau fungsi
revoke insert, update, delete on public.status_history, public.audit_events from authenticated;
revoke insert, delete on public.session_readiness from authenticated;
revoke update, delete on public.weekly_notes, public.trainings from authenticated;
revoke insert, delete on public.risk_register from authenticated;
revoke update on public.risk_register from authenticated;
grant update (status, catatan) on public.risk_register to authenticated;
revoke delete on public.follow_ups from authenticated;
revoke update on public.session_readiness from authenticated;
grant update (terpenuhi, catatan) on public.session_readiness to authenticated;
grant select on public.v_session_overview to authenticated;

-- ---------- 13. Storage: akses mengikuti UPT --------------------------------------------------------------------------
drop policy if exists docs_insert on storage.objects;
create policy docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pas-siaga-documents' and (select private.app_role()) = 'operator'
              and private.can_view_session_text((storage.foldername(name))[1]));
drop policy if exists docs_select on storage.objects;
create policy docs_select on storage.objects for select to authenticated
  using (bucket_id = 'pas-siaga-documents'
         and (select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
         and private.can_view_session_text((storage.foldername(name))[1]));
drop policy if exists docs_update on storage.objects;
create policy docs_update on storage.objects for update to authenticated
  using (bucket_id = 'pas-siaga-documents' and (select private.app_role()) = 'operator'
         and private.can_view_session_text((storage.foldername(name))[1]))
  with check (bucket_id = 'pas-siaga-documents' and (select private.app_role()) = 'operator'
              and private.can_view_session_text((storage.foldername(name))[1]));
drop policy if exists docs_delete on storage.objects;
create policy docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pas-siaga-documents' and (select private.app_role()) = 'operator'
         and private.can_view_session_text((storage.foldername(name))[1]));

drop policy if exists evidence_insert on storage.objects;
create policy evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pas-siaga-evidence'
              and (((select private.app_role()) in ('kepala_pengamanan', 'operator')
                    and private.can_view_session_text((storage.foldername(name))[1]))
                   or ((select private.app_role()) = 'pengawal'
                       and private.pengawal_in_session_text((storage.foldername(name))[1]))));
drop policy if exists evidence_select on storage.objects;
create policy evidence_select on storage.objects for select to authenticated
  using (bucket_id = 'pas-siaga-evidence' and private.can_view_session_text((storage.foldername(name))[1]));

-- ---------- 14. Realtime ----------------------------------------------------------------------------------------------------
alter publication supabase_realtime add table public.follow_ups, public.status_history;
