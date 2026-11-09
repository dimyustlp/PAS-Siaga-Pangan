-- =====================================================================
-- PAS-SIAGA Pangan | FASE 1: skema database, aturan akses (RLS), storage
-- Jalankan SEKALI di Supabase > SQL Editor, pada proyek BARU yang masih kosong.
--
-- Peran: operator | pengawal | kepala_pengamanan
-- Prinsip: aturan penting dijaga di database, bukan hanya di tampilan.
--   * Pengawal hanya bisa MENAIKKAN status keamanan (lewat entri lapangan).
--   * Hanya Kepala Pengamanan yang bisa menurunkan ke HIJAU (wajib bukti foto,
--     semua gangguan sudah diverifikasi).
--   * Penutupan kegiatan ditolak otomatis bila rekonsiliasi tidak cocok.
--   * Entri lapangan dan keputusan tidak bisa diubah/dihapus (jejak audit).
--
-- KESEPAKATAN ISI payload (field_logs.payload) yang dipakai aturan di bawah:
--   Serah terima di blok : {"tahap":"keluar"|"kembali","jumlah_wbp":N,"jumlah_alat":N,
--                           "penggeledahan":true|false (wajib bila tahap=kembali),
--                           "penerima":"..."}
--   Naikkan status       : {"status_baru":"KUNING"|"MERAH"|"KRITIS","alasan":"..."}
--   Gangguan             : {"kategori":"...","tindakan_awal":"...","penanggung_jawab":"...",
--                           "status_baru":"KUNING"|"MERAH"|"KRITIS" (kosong = KUNING)}
--   Jenis entri lain     : bebas (jumlah orang, arah, temuan, selisih hitungan, dst.)
-- =====================================================================

-- ---------- 0. Schema pembantu (tidak terbuka lewat API) -------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------- 1. Tipe enum ---------------------------------------------
create type public.user_role as enum ('operator', 'pengawal', 'kepala_pengamanan');
create type public.activity_type as enum ('Pertanian', 'Peternakan', 'Perikanan');
create type public.readiness_status as enum ('Menunggu', 'Dapat Dimulai', 'Perbaiki Dulu', 'Ditunda');
create type public.security_status as enum ('HIJAU', 'KUNING', 'MERAH', 'KRITIS');
create type public.log_type as enum (
  'Serah terima di blok', 'P2U keluar atau masuk', 'Tiba di lokasi',
  'Pemeriksaan berkala', 'Pindah area atau ganti pengawal', 'Pihak luar dan kendaraan',
  'Pengembalian sebagian', 'Alarm gelang', 'Gangguan', 'Naikkan status'
);

-- ---------- 2. Tabel -------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  nip         text unique,
  kode_upt    text,
  role        public.user_role not null default 'pengawal',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.master_locations (
  id          uuid primary key default gen_random_uuid(),
  kode        text unique,
  nama        text not null,
  keterangan  text,
  latitude    numeric(9, 6),
  longitude   numeric(9, 6),
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.master_inmates (
  id                uuid primary key default gen_random_uuid(),
  nomor_registrasi  text not null unique,
  nama              text not null,
  aktif             boolean not null default true,
  created_at        timestamptz not null default now()
);

create table public.activities (
  id               uuid primary key default gen_random_uuid(),
  kode_kegiatan    text not null unique,  -- diisi otomatis: [KODE_UPT]-[YYYYMMDD]-[SEQ]
  jenis_kegiatan   public.activity_type not null,
  lokasi_id        uuid not null references public.master_locations (id),
  tanggal_mulai    date not null,
  rencana_berakhir date,
  kode_upt         text,
  created_by       uuid not null default auth.uid() references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint activities_tanggal_check
    check (rencana_berakhir is null or rencana_berakhir >= tanggal_mulai)
);

create table public.daily_sessions (
  id                          uuid primary key default gen_random_uuid(),
  activity_id                 uuid not null references public.activities (id) on delete restrict,
  tanggal_sesi                date not null,
  petugas_ids                 uuid[] not null default '{}',
  jumlah_narapidana           int not null check (jumlah_narapidana >= 0),
  jumlah_alat_kerja           int not null default 0 check (jumlah_alat_kerja >= 0),
  rincian_alat                text,
  interval_pemeriksaan        int not null default 60 check (interval_pemeriksaan between 5 and 480),
  pakai_gelang_monitor        boolean not null default false,
  dokumen_surat_perintah      text,   -- alamat berkas di bucket pas-siaga-documents
  dokumen_rencana_pengamanan  text,   -- alamat berkas di bucket pas-siaga-documents
  status_kesiapan             public.readiness_status not null default 'Menunggu',
  status_keamanan             public.security_status not null default 'HIJAU',
  ditutup_at                  timestamptz,
  ditutup_oleh                uuid references public.profiles (id),
  created_by                  uuid not null default auth.uid() references public.profiles (id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint daily_sessions_unik unique (activity_id, tanggal_sesi),
  constraint daily_sessions_petugas_check check (cardinality(petugas_ids) >= 1)
);

create table public.field_logs (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid unique,  -- dibuat oleh HP pengawal; mencegah entri ganda saat kirim ulang setelah offline
  session_id      uuid not null references public.daily_sessions (id) on delete restrict,
  pengawal_id     uuid not null default auth.uid() references public.profiles (id),
  waktu_kejadian  timestamptz not null,  -- jam kejadian sebenarnya, bukan jam kirim
  jenis_entri     public.log_type not null,
  payload         jsonb not null default '{}'::jsonb,
  bukti_url       text,
  dikirim_at      timestamptz not null default now(),
  constraint field_logs_payload_check check (jsonb_typeof(payload) = 'object')
);

create table public.incidents (
  id                              uuid primary key default gen_random_uuid(),
  log_id                          uuid not null unique references public.field_logs (id) on delete restrict,
  session_id                      uuid not null references public.daily_sessions (id) on delete restrict,
  kategori_gangguan               text not null,
  tindakan_awal                   text,
  penanggung_jawab_tindak_lanjut  text,
  status_penyelesaian             boolean not null default false,
  diverifikasi_at                 timestamptz,
  diverifikasi_oleh               uuid references public.profiles (id),
  created_at                      timestamptz not null default now()
);

create table public.decisions (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.daily_sessions (id) on delete restrict,
  pejabat_id        uuid not null default auth.uid() references public.profiles (id),
  jenis_keputusan   text not null check (jenis_keputusan in (
                      'Dapat Dimulai', 'Perbaiki Dulu', 'Ditunda',
                      'Verifikasi Gangguan', 'Penurunan Status', 'Tutup Kegiatan')),
  incident_id       uuid references public.incidents (id),
  catatan_keputusan text,
  bukti_url         text,
  created_at        timestamptz not null default now()
);

-- ---------- 3. Indeks -------------------------------------------------
create index activities_lokasi_idx       on public.activities (lokasi_id);
create index activities_created_by_idx   on public.activities (created_by);
create index sessions_petugas_idx        on public.daily_sessions using gin (petugas_ids);
create index sessions_activity_idx       on public.daily_sessions (activity_id);
create index sessions_created_by_idx     on public.daily_sessions (created_by);
create index field_logs_sesi_waktu_idx   on public.field_logs (session_id, waktu_kejadian desc);
create index field_logs_sesi_jenis_idx   on public.field_logs (session_id, jenis_entri, waktu_kejadian desc);
create index field_logs_pengawal_idx     on public.field_logs (pengawal_id);
create index incidents_sesi_terbuka_idx  on public.incidents (session_id) where not status_penyelesaian;
create index decisions_sesi_idx          on public.decisions (session_id, created_at desc);
create index decisions_incident_idx      on public.decisions (incident_id);
create index decisions_pejabat_idx       on public.decisions (pejabat_id);

-- ---------- 4. Fungsi pembantu ---------------------------------------
create function private.app_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.is_active
$$;

create function private.status_rank(s public.security_status)
returns int
language sql immutable set search_path = ''
as $$
  select case s when 'HIJAU' then 0 when 'KUNING' then 1 when 'MERAH' then 2 when 'KRITIS' then 3 end
$$;

create function private.pengawal_in_session(p_session uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
           select 1 from public.daily_sessions s
           where s.id = p_session and (select auth.uid()) = any (s.petugas_ids))
         and (select private.app_role()) = 'pengawal'
$$;

create function private.pengawal_in_session_text(p_session text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
           select 1 from public.daily_sessions s
           where s.id::text = p_session and (select auth.uid()) = any (s.petugas_ids))
         and (select private.app_role()) = 'pengawal'
$$;

create function private.pengawal_in_activity(p_activity uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
           select 1 from public.daily_sessions s
           where s.activity_id = p_activity and (select auth.uid()) = any (s.petugas_ids))
         and (select private.app_role()) = 'pengawal'
$$;

create function private.pengawal_can_log(p_session uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
           select 1 from public.daily_sessions s
           where s.id = p_session
             and (select auth.uid()) = any (s.petugas_ids)
             and s.status_kesiapan = 'Dapat Dimulai'
             and s.ditutup_at is null)
         and (select private.app_role()) = 'pengawal'
$$;

-- Rekonsiliasi penutupan: dipakai aturan penutupan dan tombol cek di dasbor.
create function private.hitung_rekonsiliasi(p_session uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_keluar   jsonb;
  v_kembali  jsonb;
  v_alasan   text[] := '{}';
  v_terbuka  int;
begin
  select l.payload into v_keluar
    from public.field_logs l
   where l.session_id = p_session and l.jenis_entri = 'Serah terima di blok' and l.payload->>'tahap' = 'keluar'
   order by l.waktu_kejadian desc, l.dikirim_at desc limit 1;

  select l.payload into v_kembali
    from public.field_logs l
   where l.session_id = p_session and l.jenis_entri = 'Serah terima di blok' and l.payload->>'tahap' = 'kembali'
   order by l.waktu_kejadian desc, l.dikirim_at desc limit 1;

  select count(*) into v_terbuka
    from public.incidents i where i.session_id = p_session and not i.status_penyelesaian;

  if v_keluar is null then
    v_alasan := array_append(v_alasan, 'belum ada serah terima keluar dari blok');
  end if;
  if v_kembali is null then
    v_alasan := array_append(v_alasan, 'belum ada serah terima kembali ke blok');
  end if;
  if v_keluar is not null and v_kembali is not null then
    if (v_kembali->>'jumlah_wbp')::int <> (v_keluar->>'jumlah_wbp')::int then
      v_alasan := array_append(v_alasan, 'jumlah WBP kembali tidak sama dengan jumlah saat keluar');
    end if;
    if (v_kembali->>'jumlah_alat')::int <> (v_keluar->>'jumlah_alat')::int then
      v_alasan := array_append(v_alasan, 'jumlah alat kerja kembali tidak sama dengan jumlah awal');
    end if;
    if coalesce((v_kembali->>'penggeledahan')::boolean, false) is not true then
      v_alasan := array_append(v_alasan, 'penggeledahan saat masuk blok belum dicentang Ya');
    end if;
  end if;
  if v_terbuka > 0 then
    v_alasan := array_append(v_alasan, v_terbuka::text || ' gangguan belum diverifikasi');
  end if;

  return jsonb_build_object(
    'siap_tutup', cardinality(v_alasan) = 0,
    'alasan', to_jsonb(v_alasan),
    'wbp_keluar', v_keluar->>'jumlah_wbp',
    'wbp_kembali', v_kembali->>'jumlah_wbp',
    'alat_keluar', v_keluar->>'jumlah_alat',
    'alat_kembali', v_kembali->>'jumlah_alat',
    'penggeledahan', v_kembali->>'penggeledahan',
    'gangguan_belum_diverifikasi', v_terbuka
  );
end
$$;

-- Dipanggil dari dasbor (supabase.rpc('rekonsiliasi_sesi', {p_session: ...})).
create function public.rekonsiliasi_sesi(p_session uuid)
returns jsonb
language plpgsql stable set search_path = ''
as $$
begin
  if (select private.app_role()) is distinct from 'operator'
     and (select private.app_role()) is distinct from 'kepala_pengamanan' then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;
  return private.hitung_rekonsiliasi(p_session);
end
$$;

-- ---------- 5. Pemicu (trigger) --------------------------------------
-- 5a. Profil otomatis saat akun dibuat. Peran dibaca dari app_metadata (hanya
--     bisa diisi server/admin), bukan dari data yang bisa diubah pengguna.
create function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  v_role := case
    when new.raw_app_meta_data->>'role' in ('operator', 'pengawal', 'kepala_pengamanan')
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- 5b. Penjaga tabel profiles: peran tidak bisa diubah dari aplikasi.
create function private.guard_profiles()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id or new.role is distinct from old.role then
      raise exception 'Peran tidak bisa diubah dari aplikasi.' using errcode = '42501';
    end if;
    if (new.nip is distinct from old.nip
        or new.kode_upt is distinct from old.kode_upt
        or new.is_active is distinct from old.is_active)
       and (select private.app_role()) is distinct from 'operator' then
      raise exception 'Hanya Operator yang boleh mengubah NIP, kode UPT, atau status aktif.' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function private.guard_profiles();

-- 5c. updated_at untuk activities
create function private.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger activities_touch
  before update on public.activities
  for each row execute function private.touch_updated_at();

-- 5d. Kode kegiatan otomatis: [KODE_UPT]-[YYYYMMDD]-[SEQ]
create function private.set_kode_kegiatan()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_upt    text;
  v_prefix text;
  v_seq    int;
begin
  if new.kode_kegiatan is not null and new.kode_kegiatan <> '' then
    return new;
  end if;
  select nullif(p.kode_upt, '') into v_upt from public.profiles p where p.id = new.created_by;
  v_upt := upper(regexp_replace(coalesce(v_upt, 'UPT'), '[^A-Za-z0-9]', '', 'g'));
  if v_upt = '' then v_upt := 'UPT'; end if;
  v_prefix := v_upt || '-' || to_char(new.tanggal_mulai, 'YYYYMMDD') || '-';
  perform pg_advisory_xact_lock(hashtext(v_prefix));
  select coalesce(max(substring(a.kode_kegiatan from '(\d+)$')::int), 0) + 1
    into v_seq
    from public.activities a
   where a.kode_kegiatan like v_prefix || '%';
  new.kode_upt := v_upt;
  new.kode_kegiatan := v_prefix || lpad(v_seq::text, 3, '0');
  return new;
end
$$;

create trigger activities_kode
  before insert on public.activities
  for each row execute function private.set_kode_kegiatan();

-- 5e. Penjaga sesi harian: status tidak bisa diubah langsung dari aplikasi.
create function private.guard_daily_sessions()
returns trigger
language plpgsql set search_path = ''
as $$
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
    if exists (
      select 1 from unnest(new.petugas_ids) as u (pid)
      where not exists (
        select 1 from public.profiles p
        where p.id = u.pid and p.role = 'pengawal' and p.is_active)
    ) then
      raise exception 'Semua petugas harus akun Pengawal yang aktif.' using errcode = '22023';
    end if;
  end if;
  return new;
end
$$;

create trigger daily_sessions_guard
  before insert or update on public.daily_sessions
  for each row execute function private.guard_daily_sessions();

-- 5f. Validasi entri lapangan
create function private.validate_field_log()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.waktu_kejadian > now() + interval '5 minutes' then
    raise exception 'Waktu kejadian tidak boleh di masa depan.' using errcode = '22023';
  end if;

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
    when 'Naikkan status' then
      if coalesce(new.payload->>'status_baru', '') not in ('KUNING', 'MERAH', 'KRITIS') then
        raise exception 'Status baru harus KUNING, MERAH, atau KRITIS.' using errcode = '22023';
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

create trigger field_logs_validate
  before insert on public.field_logs
  for each row execute function private.validate_field_log();

-- 5g. Akibat entri lapangan: naikkan status (hanya ke atas) dan catat gangguan.
create function private.apply_field_log_effects()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_target public.security_status;
begin
  if new.jenis_entri in ('Naikkan status', 'Gangguan') then
    v_target := coalesce((new.payload->>'status_baru')::public.security_status,
                         'KUNING'::public.security_status);
    update public.daily_sessions s
       set status_keamanan = v_target
     where s.id = new.session_id
       and private.status_rank(s.status_keamanan) < private.status_rank(v_target);
  end if;

  if new.jenis_entri = 'Gangguan' then
    insert into public.incidents (log_id, session_id, kategori_gangguan, tindakan_awal, penanggung_jawab_tindak_lanjut)
    values (
      new.id,
      new.session_id,
      btrim(new.payload->>'kategori'),
      nullif(btrim(coalesce(new.payload->>'tindakan_awal', '')), ''),
      nullif(btrim(coalesce(new.payload->>'penanggung_jawab', '')), '')
    );
  end if;
  return null;
end
$$;

create trigger field_logs_effects
  after insert on public.field_logs
  for each row execute function private.apply_field_log_effects();

-- 5h. Keputusan Kepala Pengamanan: semua aturan alur dijaga di sini.
create function private.apply_decision()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  s    public.daily_sessions%rowtype;
  rek  jsonb;
begin
  if (select private.app_role()) is distinct from 'kepala_pengamanan' then
    raise exception 'Hanya Kepala Pengamanan yang boleh membuat keputusan.' using errcode = '42501';
  end if;
  select * into s from public.daily_sessions where id = new.session_id for update;
  if not found then
    raise exception 'Sesi tidak ditemukan.' using errcode = '22023';
  end if;
  if s.ditutup_at is not null then
    raise exception 'Sesi sudah ditutup.' using errcode = '22023';
  end if;

  case new.jenis_keputusan
    when 'Dapat Dimulai', 'Perbaiki Dulu', 'Ditunda' then
      if s.status_kesiapan <> 'Menunggu' then
        raise exception 'Keputusan kesiapan hanya bisa diberikan saat status Menunggu.' using errcode = '22023';
      end if;
      if new.jenis_keputusan = 'Dapat Dimulai'
         and (s.dokumen_surat_perintah is null or s.dokumen_rencana_pengamanan is null) then
        raise exception 'Surat perintah dan rencana pengamanan belum diunggah Operator.' using errcode = '22023';
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
      if s.status_keamanan = 'HIJAU' then
        raise exception 'Status sudah HIJAU.' using errcode = '22023';
      end if;
      if btrim(coalesce(new.bukti_url, '')) = '' then
        raise exception 'Foto bukti pemulihan keadaan wajib diunggah.' using errcode = '22023';
      end if;
      if exists (select 1 from public.incidents i where i.session_id = s.id and not i.status_penyelesaian) then
        raise exception 'Masih ada gangguan yang belum diverifikasi.' using errcode = '22023';
      end if;
      update public.daily_sessions set status_keamanan = 'HIJAU' where id = s.id;

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

create trigger decisions_apply
  before insert on public.decisions
  for each row execute function private.apply_decision();

-- ---------- 6. Hak akses fungsi --------------------------------------
revoke all on function private.app_role()                          from public, anon, authenticated;
revoke all on function private.pengawal_in_session(uuid)           from public, anon, authenticated;
revoke all on function private.pengawal_in_session_text(text)      from public, anon, authenticated;
revoke all on function private.pengawal_in_activity(uuid)          from public, anon, authenticated;
revoke all on function private.pengawal_can_log(uuid)              from public, anon, authenticated;
revoke all on function private.hitung_rekonsiliasi(uuid)           from public, anon, authenticated;
revoke all on function private.status_rank(public.security_status) from public, anon, authenticated;
grant execute on function private.app_role()                          to authenticated;
grant execute on function private.pengawal_in_session(uuid)           to authenticated;
grant execute on function private.pengawal_in_session_text(text)      to authenticated;
grant execute on function private.pengawal_in_activity(uuid)          to authenticated;
grant execute on function private.pengawal_can_log(uuid)              to authenticated;
grant execute on function private.hitung_rekonsiliasi(uuid)           to authenticated;
grant execute on function private.status_rank(public.security_status) to authenticated;

revoke all on function public.rekonsiliasi_sesi(uuid) from public, anon;
grant execute on function public.rekonsiliasi_sesi(uuid) to authenticated;

-- ---------- 7. Row Level Security ------------------------------------
alter table public.profiles         enable row level security;
alter table public.master_locations enable row level security;
alter table public.master_inmates   enable row level security;
alter table public.activities       enable row level security;
alter table public.daily_sessions   enable row level security;
alter table public.field_logs       enable row level security;
alter table public.incidents        enable row level security;
alter table public.decisions        enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid())
         or (select private.app_role()) in ('operator', 'kepala_pengamanan'));
create policy profiles_update_sendiri on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_operator on public.profiles for update to authenticated
  using (role = 'pengawal' and (select private.app_role()) = 'operator')
  with check (role = 'pengawal' and (select private.app_role()) = 'operator');

-- master_locations
create policy locations_select on public.master_locations for select to authenticated
  using ((select private.app_role()) is not null);
create policy locations_insert on public.master_locations for insert to authenticated
  with check ((select private.app_role()) = 'operator');
create policy locations_update on public.master_locations for update to authenticated
  using ((select private.app_role()) = 'operator')
  with check ((select private.app_role()) = 'operator');
create policy locations_delete on public.master_locations for delete to authenticated
  using ((select private.app_role()) = 'operator');

-- master_inmates (data sensitif: pengawal tidak membaca daftar induk)
create policy inmates_select on public.master_inmates for select to authenticated
  using ((select private.app_role()) in ('operator', 'kepala_pengamanan'));
create policy inmates_insert on public.master_inmates for insert to authenticated
  with check ((select private.app_role()) = 'operator');
create policy inmates_update on public.master_inmates for update to authenticated
  using ((select private.app_role()) = 'operator')
  with check ((select private.app_role()) = 'operator');
create policy inmates_delete on public.master_inmates for delete to authenticated
  using ((select private.app_role()) = 'operator');

-- activities
create policy activities_select on public.activities for select to authenticated
  using ((select private.app_role()) in ('operator', 'kepala_pengamanan')
         or private.pengawal_in_activity(id));
create policy activities_insert on public.activities for insert to authenticated
  with check ((select private.app_role()) = 'operator' and created_by = (select auth.uid()));
create policy activities_update on public.activities for update to authenticated
  using ((select private.app_role()) = 'operator')
  with check ((select private.app_role()) = 'operator');
create policy activities_delete on public.activities for delete to authenticated
  using ((select private.app_role()) = 'operator');

-- daily_sessions
create policy sessions_select on public.daily_sessions for select to authenticated
  using ((select private.app_role()) in ('operator', 'kepala_pengamanan')
         or private.pengawal_in_session(id));
create policy sessions_insert on public.daily_sessions for insert to authenticated
  with check ((select private.app_role()) = 'operator' and created_by = (select auth.uid()));
create policy sessions_update on public.daily_sessions for update to authenticated
  using ((select private.app_role()) = 'operator'
         and status_kesiapan in ('Menunggu', 'Perbaiki Dulu', 'Ditunda')
         and ditutup_at is null)
  with check ((select private.app_role()) = 'operator' and ditutup_at is null);
create policy sessions_delete on public.daily_sessions for delete to authenticated
  using ((select private.app_role()) = 'operator'
         and status_kesiapan in ('Menunggu', 'Perbaiki Dulu', 'Ditunda'));

-- field_logs: tambah saja, tidak bisa diubah atau dihapus
create policy field_logs_select on public.field_logs for select to authenticated
  using ((select private.app_role()) in ('operator', 'kepala_pengamanan')
         or private.pengawal_in_session(session_id));
create policy field_logs_insert on public.field_logs for insert to authenticated
  with check (pengawal_id = (select auth.uid()) and private.pengawal_can_log(session_id));

-- incidents: dibuat otomatis dari entri Gangguan, ditutup lewat keputusan
create policy incidents_select on public.incidents for select to authenticated
  using ((select private.app_role()) in ('operator', 'kepala_pengamanan')
         or private.pengawal_in_session(session_id));

-- decisions: hanya Kepala Pengamanan yang menulis, tidak bisa diubah
create policy decisions_select on public.decisions for select to authenticated
  using ((select private.app_role()) in ('operator', 'kepala_pengamanan')
         or private.pengawal_in_session(session_id));
create policy decisions_insert on public.decisions for insert to authenticated
  with check ((select private.app_role()) = 'kepala_pengamanan' and pejabat_id = (select auth.uid()));

-- ---------- 8. Hak tabel ---------------------------------------------
revoke all on public.profiles, public.master_locations, public.master_inmates, public.activities,
              public.daily_sessions, public.field_logs, public.incidents, public.decisions
  from anon;
revoke truncate, references, trigger on public.profiles, public.master_locations, public.master_inmates,
              public.activities, public.daily_sessions, public.field_logs, public.incidents, public.decisions
  from authenticated;

-- ---------- 9. Storage ------------------------------------------------
-- Alamat berkas memakai pola: {id_sesi}/{nama_berkas}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('pas-siaga-documents', 'pas-siaga-documents', false, 20971520,
    array['application/pdf', 'image/jpeg', 'image/png',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('pas-siaga-evidence', 'pas-siaga-evidence', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pas-siaga-documents' and (select private.app_role()) = 'operator');
create policy docs_select on storage.objects for select to authenticated
  using (bucket_id = 'pas-siaga-documents'
         and (select private.app_role()) in ('operator', 'kepala_pengamanan'));
create policy docs_update on storage.objects for update to authenticated
  using (bucket_id = 'pas-siaga-documents' and (select private.app_role()) = 'operator')
  with check (bucket_id = 'pas-siaga-documents' and (select private.app_role()) = 'operator');
create policy docs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pas-siaga-documents' and (select private.app_role()) = 'operator');

create policy evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pas-siaga-evidence'
              and ((select private.app_role()) = 'kepala_pengamanan'
                   or ((select private.app_role()) = 'pengawal'
                       and private.pengawal_in_session_text((storage.foldername(name))[1]))));
create policy evidence_select on storage.objects for select to authenticated
  using (bucket_id = 'pas-siaga-evidence'
         and ((select private.app_role()) in ('operator', 'kepala_pengamanan')
              or private.pengawal_in_session_text((storage.foldername(name))[1])));

-- ---------- 10. Realtime ----------------------------------------------
alter publication supabase_realtime add table
  public.daily_sessions, public.field_logs, public.incidents, public.decisions;

-- =====================================================================
-- SELESAI. Langkah berikutnya (dikerjakan bersama saat Fase 2):
--   1. Buat akun pertama di Authentication > Users.
--   2. Jadikan akun itu Kepala/Operator dengan perintah seperti ini:
--        update public.profiles set role = 'kepala_pengamanan'
--         where id = (select id from auth.users where email = 'email@anda');
-- =====================================================================
