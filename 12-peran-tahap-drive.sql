-- =====================================================================
-- 12. Peran Ka.UPT, pengelolaan akun berjenjang (Pusat/Kanwil), alur 4 tahap
--     pengawalan, lampiran ke Google Drive (atau Supabase sebagai cadangan),
--     pengesahan laporan, kop surat UPT, dan notifikasi Telegram tambahan.
-- Jalankan SETELAH: alter type public.user_role add value 'ka_upt';
-- =====================================================================

-- ---------- 1. Peran Ka.UPT ikut membaca data UPT-nya ----------
do $$
declare d text;
begin
  d := pg_get_functiondef('private.can_view_upt'::regproc);
  if d not like '%ka_upt%' then
    d := replace(d, $q$when 'pemantau_kanwil'$q$, $q$when 'ka_upt'             then private.my_upt() = private.norm_upt(p_upt)
    when 'pemantau_kanwil'$q$);
    execute d;
  end if;

  d := pg_get_functiondef('private.handle_new_user'::regproc);
  if d not like '%ka_upt%' then
    d := replace(d, $q$'pemantau_kanwil', 'pemantau_pusat')$q$, $q$'pemantau_kanwil', 'pemantau_pusat', 'ka_upt')$q$);
    execute d;
  end if;

  d := pg_get_functiondef('private.buat_akun_core'::regproc);
  if d not like '%ka_upt%' then
    d := replace(d, $q$('operator', 'kepala_pengamanan', 'pengawal')$q$, $q$('operator', 'kepala_pengamanan', 'pengawal', 'ka_upt')$q$);
    execute d;
  end if;

  d := pg_get_functiondef('private.guard_profiles'::regproc);
  if d not like '%ka_upt%' then
    d := replace(d, $q$('operator', 'kepala_pengamanan', 'pengawal')$q$, $q$('operator', 'kepala_pengamanan', 'pengawal', 'ka_upt')$q$);
    execute d;
  end if;
end $$;

-- Aturan baca yang menyebut Kepala Pengamanan juga berlaku untuk Ka.UPT.
do $$
declare p record; v_baru text;
begin
  for p in
    select schemaname, tablename, policyname, qual from pg_policies
     where cmd = 'SELECT' and qual like '%''kepala_pengamanan''::user_role%' and qual not like '%ka_upt%'
  loop
    v_baru := replace(p.qual, $q$'kepala_pengamanan'::user_role$q$, $q$'kepala_pengamanan'::user_role, 'ka_upt'::user_role$q$);
    execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, v_baru);
  end loop;
end $$;

-- ---------- 2. Kolom baru ----------
alter table public.master_upt
  add column if not exists alamat text,
  add column if not exists telepon text,
  add column if not exists email_kantor text,
  add column if not exists kota_ttd text;

alter table public.daily_sessions
  add column if not exists disahkan_oleh uuid references public.profiles (id),
  add column if not exists disahkan_at timestamptz,
  add column if not exists catatan_pengesahan text;

alter table public.pengaturan_aplikasi
  add column if not exists drive_url text,
  add column if not exists drive_aktif boolean not null default false,
  add column if not exists drive_diatur_at timestamptz,
  add column if not exists batas_foto_mb integer not null default 5 check (batas_foto_mb between 1 and 20),
  add column if not exists batas_berkas_mb integer not null default 10 check (batas_berkas_mb between 1 and 40);

create or replace function private.guard_pengesahan()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.disahkan_oleh is distinct from old.disahkan_oleh
          or new.disahkan_at is distinct from old.disahkan_at
          or new.catatan_pengesahan is distinct from old.catatan_pengesahan) then
    raise exception 'Pengesahan laporan hanya lewat tombol Sahkan.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists daily_sessions_pengesahan on public.daily_sessions;
create trigger daily_sessions_pengesahan before update on public.daily_sessions
  for each row execute function private.guard_pengesahan();

-- ---------- 3. Tahap pengawalan dan lampiran ----------
create table if not exists public.tahap_pengawalan (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.daily_sessions (id) on delete cascade,
  tahap smallint not null check (tahap between 1 and 4),
  jumlah_wb integer not null check (jumlah_wb between 0 and 100000),
  jumlah_alat integer check (jumlah_alat between 0 and 100000),
  isian jsonb not null default '{}'::jsonb,
  pengawal_id uuid not null references public.profiles (id),
  waktu_sistem timestamptz not null default now(),
  unique (session_id, tahap)
);
create index if not exists tahap_pengawalan_sesi on public.tahap_pengawalan (session_id);

create table if not exists public.lampiran_tahap (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.daily_sessions (id) on delete cascade,
  tahap smallint not null check (tahap between 1 and 4),
  butir text not null,
  jenis text not null check (jenis in ('foto', 'berkas')),
  nama_berkas text not null,
  mime text not null,
  ukuran_byte bigint not null check (ukuran_byte > 0),
  sumber text not null check (sumber in ('drive', 'supabase')),
  drive_file_id text unique,
  drive_url text,
  storage_path text unique,
  diunggah_oleh uuid not null references public.profiles (id),
  waktu_sistem timestamptz not null default now()
);
create index if not exists lampiran_tahap_sesi on public.lampiran_tahap (session_id, tahap);

alter table public.tahap_pengawalan enable row level security;
alter table public.lampiran_tahap enable row level security;
drop policy if exists tahap_select on public.tahap_pengawalan;
create policy tahap_select on public.tahap_pengawalan for select to authenticated using (private.can_view_session(session_id));
drop policy if exists lampiran_select on public.lampiran_tahap;
create policy lampiran_select on public.lampiran_tahap for select to authenticated using (private.can_view_session(session_id));
grant select on public.tahap_pengawalan, public.lampiran_tahap to authenticated;

-- Butir lampiran tiap tahap. Disalin juga di src/lib/domain/tahap.ts (tampilan).
create or replace function private.butir_tahap()
returns table (tahap smallint, butir text, jenis text, wajib boolean, maks integer, judul text)
language sql immutable set search_path = '' as $$
  values
    (1::smallint, 'foto_p2u',       'foto',   true,  5, 'Foto penghitungan dan pemeriksaan WB di P2U'),
    (1::smallint, 'ba_pengeluaran', 'berkas', true,  2, 'Berita acara / surat pengeluaran WB'),
    (2::smallint, 'foto_berangkat', 'foto',   true,  5, 'Foto keberangkatan dan kendaraan pengawalan'),
    (2::smallint, 'dok_perjalanan', 'berkas', false, 2, 'Dokumen perjalanan (bila ada)'),
    (3::smallint, 'foto_kegiatan',  'foto',   true,  5, 'Foto pelaksanaan kegiatan pangan'),
    (3::smallint, 'daftar_hadir',   'berkas', true,  2, 'Daftar hadir WB di lokasi kegiatan'),
    (4::smallint, 'foto_kembali',   'foto',   true,  5, 'Foto penghitungan dan penggeledahan saat kembali'),
    (4::smallint, 'ba_kembali',     'berkas', true,  2, 'Berita acara serah terima kembali ke blok')
$$;

create or replace function private.nama_tahap(p smallint)
returns text language sql immutable set search_path = '' as $$
  select case p when 1 then 'Pengeluaran melalui P2U' when 2 then 'Pengawalan menuju lokasi'
                when 3 then 'Pelaksanaan kegiatan pangan' when 4 then 'Kembali ke UPT' end
$$;

-- Rahasia penanda tangan tiket (dibagi dengan Apps Script Google Drive).
create or replace function private.rahasia_drive()
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  select decrypted_secret into v from vault.decrypted_secrets where name = 'drive_gateway_secret' limit 1;
  if v is null then
    v := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(v, 'drive_gateway_secret', 'Kunci tiket unggah Google Drive PAS-SIAGA Pangan');
  end if;
  return v;
end $$;

create or replace function private.tanda(p text)
returns text language sql security definer set search_path = '' as $$
  select encode(extensions.hmac(p, private.rahasia_drive(), 'sha256'), 'hex')
$$;

create or replace function private.b64(p jsonb)
returns text language sql immutable set search_path = '' as $$
  select replace(encode(convert_to(p::text, 'UTF8'), 'base64'), E'\n', '')
$$;

-- Tiket unggah: diminta browser sebelum mengirim berkas. Waktu, batas ukuran, dan hak dicek di sini.
create or replace function public.tiket_unggah(p_session uuid, p_tahap integer, p_butir text, p_nama text, p_mime text, p_ukuran bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  b record; s record; v_set public.pengaturan_aplikasi%rowtype;
  v_batas bigint; v_jumlah int; v_payload jsonb; v_tiket text; v_nama text;
begin
  if not private.pengawal_can_log(p_session) then
    raise exception 'Unggahan ditolak: sesi belum diizinkan mulai, sudah ditutup, atau Anda bukan pengawal sesi ini.' using errcode = '42501';
  end if;
  select * into b from private.butir_tahap() x where x.tahap = p_tahap and x.butir = p_butir;
  if not found then raise exception 'Jenis lampiran tidak dikenal.' using errcode = '22023'; end if;
  if exists (select 1 from public.tahap_pengawalan t where t.session_id = p_session and t.tahap = p_tahap) then
    raise exception 'Tahap ini sudah diselesaikan. Lampiran tidak bisa ditambah lagi.' using errcode = '22023';
  end if;
  if p_tahap > 1 and not exists (select 1 from public.tahap_pengawalan t where t.session_id = p_session and t.tahap = p_tahap - 1) then
    raise exception 'Selesaikan tahap sebelumnya lebih dulu.' using errcode = '22023';
  end if;

  select * into v_set from public.pengaturan_aplikasi where id;
  if b.jenis = 'foto' then
    if p_mime not in ('image/jpeg', 'image/png', 'image/webp') then
      raise exception 'Foto harus berformat JPG, PNG, atau WEBP.' using errcode = '22023';
    end if;
    v_batas := v_set.batas_foto_mb::bigint * 1024 * 1024;
  else
    if p_mime not in ('application/pdf', 'image/jpeg', 'image/png') then
      raise exception 'Berkas harus berformat PDF (atau hasil pindai JPG/PNG).' using errcode = '22023';
    end if;
    v_batas := v_set.batas_berkas_mb::bigint * 1024 * 1024;
  end if;
  if p_ukuran is null or p_ukuran <= 0 or p_ukuran > v_batas then
    raise exception 'Ukuran % maksimal % MB.', case b.jenis when 'foto' then 'foto' else 'berkas' end, v_batas / 1024 / 1024 using errcode = '22023';
  end if;
  select count(*) into v_jumlah from public.lampiran_tahap l where l.session_id = p_session and l.tahap = p_tahap and l.butir = p_butir;
  if v_jumlah >= b.maks then
    raise exception 'Lampiran "%" paling banyak % berkas.', b.judul, b.maks using errcode = '22023';
  end if;

  select a.kode_kegiatan, a.kode_upt, u.nama as upt_nama, k.nama as kanwil_nama, ds.tanggal_sesi
    into s
    from public.daily_sessions ds
    join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt
    left join public.master_kanwil k on k.id = u.kanwil_id
   where ds.id = p_session;

  v_nama := left(regexp_replace(coalesce(p_nama, 'berkas'), '[^A-Za-z0-9._-]+', '_', 'g'), 80);
  v_payload := jsonb_build_object(
    'aksi', 'unggah', 's', p_session, 't', p_tahap, 'tn', private.nama_tahap(p_tahap::smallint), 'b', p_butir, 'bj', b.judul,
    'j', b.jenis, 'u', (select auth.uid()), 'un', (select full_name from public.profiles where id = (select auth.uid())),
    'upt', coalesce(s.upt_nama, s.kode_upt), 'kw', coalesce(s.kanwil_nama, '-'), 'kode', s.kode_kegiatan,
    'tgl', s.tanggal_sesi, 'nm', v_nama, 'mime', p_mime, 'sz', p_ukuran,
    'exp', extract(epoch from now() + interval '60 minutes')::bigint, 'n', gen_random_uuid());
  v_tiket := private.b64(v_payload);

  if v_set.drive_aktif and coalesce(v_set.drive_url, '') <> '' then
    return jsonb_build_object('mode', 'drive', 'url', v_set.drive_url, 'tiket', v_tiket, 'sig', private.tanda(v_tiket));
  end if;
  return jsonb_build_object('mode', 'supabase', 'tiket', v_tiket, 'sig', private.tanda(v_tiket),
    'path', p_session::text || '/tahap' || p_tahap || '/' || extract(epoch from now())::bigint || '-' || v_nama);
end $$;

-- Mencatat lampiran setelah berkas tersimpan. Bukti dari Apps Script (atau objek Storage) diverifikasi.
create or replace function public.catat_lampiran(p_tiket text, p_sig text, p_sumber text, p_file_id text, p_url text, p_path text, p_ukuran bigint, p_bukti text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v jsonb; b record; v_id uuid; v_uk bigint; v_jumlah int;
begin
  if p_sig is distinct from private.tanda(p_tiket) then
    raise exception 'Tiket unggah tidak sah.' using errcode = '42501';
  end if;
  v := convert_from(decode(p_tiket, 'base64'), 'UTF8')::jsonb;
  if (v->>'u')::uuid is distinct from (select auth.uid()) then raise exception 'Tiket milik akun lain.' using errcode = '42501'; end if;
  if (v->>'exp')::bigint + 1800 < extract(epoch from now()) then raise exception 'Tiket unggah kedaluwarsa. Unggah ulang.' using errcode = '22023'; end if;
  if not private.pengawal_can_log((v->>'s')::uuid) then raise exception 'Sesi tidak lagi menerima lampiran.' using errcode = '42501'; end if;
  if exists (select 1 from public.tahap_pengawalan t where t.session_id = (v->>'s')::uuid and t.tahap = (v->>'t')::int) then
    raise exception 'Tahap ini sudah diselesaikan.' using errcode = '22023';
  end if;
  select * into b from private.butir_tahap() x where x.tahap = (v->>'t')::int and x.butir = v->>'b';
  select count(*) into v_jumlah from public.lampiran_tahap l where l.session_id = (v->>'s')::uuid and l.tahap = (v->>'t')::int and l.butir = v->>'b';
  if v_jumlah >= b.maks then raise exception 'Jumlah lampiran sudah penuh.' using errcode = '22023'; end if;

  if p_sumber = 'drive' then
    if coalesce(p_file_id, '') !~ '^[A-Za-z0-9_-]{10,100}$' then raise exception 'Pengenal berkas Drive tidak valid.' using errcode = '22023'; end if;
    if p_bukti is distinct from private.tanda(p_sig || '|' || p_file_id || '|' || p_ukuran) then
      raise exception 'Bukti penyimpanan Google Drive tidak cocok.' using errcode = '42501';
    end if;
    v_uk := p_ukuran;
  elsif p_sumber = 'supabase' then
    if p_path is null or p_path not like (v->>'s') || '/tahap' || (v->>'t') || '/%' then
      raise exception 'Alamat berkas tidak sesuai tiket.' using errcode = '22023';
    end if;
    select (o.metadata->>'size')::bigint into v_uk from storage.objects o where o.bucket_id = 'pas-siaga-evidence' and o.name = p_path;
    if v_uk is null then raise exception 'Berkas belum ditemukan di penyimpanan.' using errcode = '22023'; end if;
  else
    raise exception 'Sumber tidak dikenal.' using errcode = '22023';
  end if;
  if v_uk > (v->>'sz')::bigint + 1024 then raise exception 'Ukuran berkas berbeda dari yang diajukan.' using errcode = '22023'; end if;

  insert into public.lampiran_tahap (session_id, tahap, butir, jenis, nama_berkas, mime, ukuran_byte, sumber, drive_file_id, drive_url, storage_path, diunggah_oleh)
  values ((v->>'s')::uuid, (v->>'t')::int, v->>'b', v->>'j', v->>'nm', v->>'mime', v_uk, p_sumber,
          case when p_sumber = 'drive' then p_file_id end, case when p_sumber = 'drive' then left(p_url, 500) end,
          case when p_sumber = 'supabase' then p_path end, (select auth.uid()))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.hapus_lampiran(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare l public.lampiran_tahap%rowtype;
begin
  select * into l from public.lampiran_tahap where id = p_id;
  if not found then raise exception 'Lampiran tidak ditemukan.' using errcode = 'P0002'; end if;
  if l.diunggah_oleh is distinct from (select auth.uid()) or not private.pengawal_can_log(l.session_id) then
    raise exception 'Hanya pengunggah yang bisa menghapus, selama sesi berjalan.' using errcode = '42501';
  end if;
  if exists (select 1 from public.tahap_pengawalan t where t.session_id = l.session_id and t.tahap = l.tahap) then
    raise exception 'Tahap sudah diselesaikan; lampiran terkunci.' using errcode = '22023';
  end if;
  delete from public.lampiran_tahap where id = p_id;
end $$;

-- Menyelesaikan satu tahap: cek urutan dan lampiran wajib, catat tahap, buat entri lapangan, kirim notifikasi.
create or replace function public.selesaikan_tahap(p_session uuid, p_tahap integer, p_isian jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid; v_uid uuid := (select auth.uid()); v_wb int; v_alat int; v_geledah boolean; b record; s record;
  v_kurang text[] := '{}'; v_teks text; v_isian jsonb := coalesce(p_isian, '{}'::jsonb);
begin
  if not private.pengawal_can_log(p_session) then
    raise exception 'Ditolak: sesi belum diizinkan mulai, sudah ditutup, atau Anda bukan pengawal sesi ini.' using errcode = '42501';
  end if;
  if p_tahap not between 1 and 4 then raise exception 'Tahap tidak dikenal.' using errcode = '22023'; end if;
  if exists (select 1 from public.tahap_pengawalan t where t.session_id = p_session and t.tahap = p_tahap) then
    raise exception 'Tahap ini sudah diselesaikan.' using errcode = '22023';
  end if;
  if p_tahap > 1 and not exists (select 1 from public.tahap_pengawalan t where t.session_id = p_session and t.tahap = p_tahap - 1) then
    raise exception 'Selesaikan tahap sebelumnya lebih dulu.' using errcode = '22023';
  end if;
  for b in select * from private.butir_tahap() x where x.tahap = p_tahap and x.wajib loop
    if not exists (select 1 from public.lampiran_tahap l where l.session_id = p_session and l.tahap = p_tahap and l.butir = b.butir) then
      v_kurang := v_kurang || b.judul;
    end if;
  end loop;
  if cardinality(v_kurang) > 0 then
    raise exception 'Lampiran wajib belum diunggah: %.', array_to_string(v_kurang, '; ') using errcode = '22023';
  end if;

  if coalesce(v_isian->>'jumlah_wb', '') !~ '^\d{1,6}$' then raise exception 'Jumlah WB wajib diisi angka.' using errcode = '22023'; end if;
  v_wb := (v_isian->>'jumlah_wb')::int;
  if p_tahap in (1, 4) then
    if coalesce(v_isian->>'jumlah_alat', '') !~ '^\d{1,6}$' then raise exception 'Jumlah alat kerja wajib diisi angka.' using errcode = '22023'; end if;
    v_alat := (v_isian->>'jumlah_alat')::int;
  end if;
  if p_tahap = 3 and btrim(coalesce(v_isian->>'uraian', '')) = '' then
    raise exception 'Uraian kegiatan pangan wajib diisi.' using errcode = '22023';
  end if;
  if p_tahap = 4 then
    if jsonb_typeof(v_isian->'penggeledahan') is distinct from 'boolean' then
      raise exception 'Isi apakah penggeledahan sudah dilakukan.' using errcode = '22023';
    end if;
    v_geledah := (v_isian->>'penggeledahan')::boolean;
  end if;

  insert into public.tahap_pengawalan (session_id, tahap, jumlah_wb, jumlah_alat, isian, pengawal_id)
  values (p_session, p_tahap, v_wb, v_alat, v_isian, v_uid) returning id into v_id;

  if p_tahap = 1 then
    insert into public.field_logs (client_id, session_id, pengawal_id, waktu_kejadian, jenis_entri, payload) values
      (gen_random_uuid(), p_session, v_uid, now(), 'Serah terima di blok', jsonb_build_object('tahap', 'keluar', 'jumlah_wbp', v_wb, 'jumlah_alat', v_alat)),
      (gen_random_uuid(), p_session, v_uid, now(), 'P2U keluar atau masuk', jsonb_build_object('arah', 'keluar', 'jumlah', v_wb, 'catatan', nullif(btrim(coalesce(v_isian->>'catatan', '')), '')));
  elsif p_tahap = 2 then
    insert into public.field_logs (client_id, session_id, pengawal_id, waktu_kejadian, jenis_entri, payload) values
      (gen_random_uuid(), p_session, v_uid, now(), 'Pindah area atau ganti pengawal',
       jsonb_build_object('jumlah_wbp', v_wb, 'area_baru', 'Perjalanan menuju lokasi kegiatan',
                          'catatan', nullif(btrim(concat_ws(' · ', v_isian->>'kendaraan', v_isian->>'catatan')), '')));
  elsif p_tahap = 3 then
    insert into public.field_logs (client_id, session_id, pengawal_id, waktu_kejadian, jenis_entri, payload) values
      (gen_random_uuid(), p_session, v_uid, now(), 'Tiba di lokasi', jsonb_build_object('jumlah_wbp', v_wb, 'catatan', left(btrim(v_isian->>'uraian'), 500)));
  else
    insert into public.field_logs (client_id, session_id, pengawal_id, waktu_kejadian, jenis_entri, payload) values
      (gen_random_uuid(), p_session, v_uid, now(), 'P2U keluar atau masuk', jsonb_build_object('arah', 'masuk', 'jumlah', v_wb)),
      (gen_random_uuid(), p_session, v_uid, now() + interval '1 second', 'Serah terima di blok',
       jsonb_build_object('tahap', 'kembali', 'jumlah_wbp', v_wb, 'jumlah_alat', v_alat, 'penggeledahan', v_geledah));
  end if;

  begin
    select a.kode_kegiatan, a.kode_upt, a.latihan, u.nama as upt, ds.status_keamanan, ds.jumlah_narapidana
      into s from public.daily_sessions ds join public.activities a on a.id = ds.activity_id
      left join public.master_upt u on u.kode = a.kode_upt where ds.id = p_session;
    v_teks := format('<b>Tahap %s/4 selesai: %s</b>' || E'\n' || '%s | %s' || E'\n' || 'Jumlah WB: %s (rencana %s) · Status %s' || E'\n' || 'Pengawal: %s' || E'\n' || '%s',
      p_tahap, private.nama_tahap(p_tahap::smallint), private.h(s.kode_kegiatan), private.h(coalesce(s.upt, s.kode_upt)),
      v_wb, s.jumlah_narapidana, s.status_keamanan,
      private.h((select full_name from public.profiles where id = v_uid)), private.waktu_wib(now()));
    perform private.notif_ke_grup(s.kode_upt, 'Tahap pengawalan', v_teks, s.status_keamanan, s.latihan);
  exception when others then null;
  end;
  return v_id;
end $$;

-- Pengesahan berkas laporan oleh Kepala Pengamanan atau Ka.UPT setelah 4 tahap lengkap.
create or replace function public.sahkan_laporan(p_session uuid, p_catatan text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_role public.user_role := (select private.app_role()); s record;
begin
  if v_role not in ('kepala_pengamanan', 'ka_upt') or not private.can_view_session(p_session) then
    raise exception 'Hanya Kepala Pengamanan atau Ka.UPT dari UPT ini yang dapat mengesahkan.' using errcode = '42501';
  end if;
  if (select count(*) from public.tahap_pengawalan t where t.session_id = p_session) < 4 then
    raise exception 'Keempat tahap pengawalan belum lengkap.' using errcode = '22023';
  end if;
  if exists (select 1 from public.daily_sessions where id = p_session and disahkan_at is not null) then
    raise exception 'Laporan sudah disahkan.' using errcode = '22023';
  end if;
  update public.daily_sessions set disahkan_oleh = (select auth.uid()), disahkan_at = now(),
         catatan_pengesahan = nullif(btrim(coalesce(p_catatan, '')), '') where id = p_session;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Laporan kegiatan disahkan',
          jsonb_build_object('session_id', p_session));
  begin
    select a.kode_kegiatan, a.kode_upt, a.latihan, u.nama as upt, ds.status_keamanan into s
      from public.daily_sessions ds join public.activities a on a.id = ds.activity_id
      left join public.master_upt u on u.kode = a.kode_upt where ds.id = p_session;
    perform private.notif_ke_grup(s.kode_upt, 'Pengesahan laporan',
      format('<b>Laporan kegiatan disahkan</b>' || E'\n' || '%s | %s' || E'\n' || 'Oleh: %s' || E'\n' || '%s',
        private.h(s.kode_kegiatan), private.h(coalesce(s.upt, s.kode_upt)),
        private.h((select full_name from public.profiles where id = (select auth.uid()))), private.waktu_wib(now())),
      s.status_keamanan, s.latihan);
  exception when others then null;
  end;
end $$;

-- Tiket membaca isi lampiran (pratinjau dan laporan PDF), hanya untuk yang berhak melihat sesi.
create or replace function public.tiket_ambil(p_lampiran uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare l public.lampiran_tahap%rowtype; v_set public.pengaturan_aplikasi%rowtype; v_tiket text;
begin
  select * into l from public.lampiran_tahap where id = p_lampiran;
  if not found or not private.can_view_session(l.session_id) then
    raise exception 'Lampiran tidak ditemukan.' using errcode = 'P0002';
  end if;
  if l.sumber = 'supabase' then
    return jsonb_build_object('sumber', 'supabase', 'path', l.storage_path, 'mime', l.mime, 'nama', l.nama_berkas, 'ukuran', l.ukuran_byte);
  end if;
  select * into v_set from public.pengaturan_aplikasi where id;
  v_tiket := private.b64(jsonb_build_object('aksi', 'ambil', 'id', l.drive_file_id, 'exp', extract(epoch from now() + interval '10 minutes')::bigint));
  return jsonb_build_object('sumber', 'drive', 'url', v_set.drive_url, 'tiket', v_tiket, 'sig', private.tanda(v_tiket),
    'mime', l.mime, 'nama', l.nama_berkas, 'ukuran', l.ukuran_byte, 'drive_url', l.drive_url);
end $$;

-- ---------- 4. Pengaturan Google Drive (Administrator) ----------
create or replace function public.admin_drive_kunci()
returns text language plpgsql security definer set search_path = '' as $$
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator.' using errcode = '42501';
  end if;
  return private.rahasia_drive();
end $$;

create or replace function public.admin_atur_drive(p_url text, p_aktif boolean, p_batas_foto integer, p_batas_berkas integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator.' using errcode = '42501';
  end if;
  if p_aktif and coalesce(p_url, '') !~ '^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec$' then
    raise exception 'Alamat harus berupa alamat aplikasi web Apps Script (https://script.google.com/macros/s/.../exec).' using errcode = '22023';
  end if;
  update public.pengaturan_aplikasi
     set drive_url = nullif(btrim(coalesce(p_url, '')), ''), drive_aktif = coalesce(p_aktif, false), drive_diatur_at = now(),
         batas_foto_mb = coalesce(p_batas_foto, batas_foto_mb), batas_berkas_mb = coalesce(p_batas_berkas, batas_berkas_mb),
         diubah_at = now(), diubah_oleh = (select auth.uid())
   where id;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Pengaturan Google Drive diubah',
          jsonb_build_object('aktif', p_aktif, 'batas_foto_mb', p_batas_foto, 'batas_berkas_mb', p_batas_berkas));
end $$;

create or replace function public.pemakaian_lampiran()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when (select private.app_role()) in ('administrator', 'pemantau_pusat') then
    jsonb_build_object('jumlah', count(*), 'byte', coalesce(sum(ukuran_byte), 0),
                       'drive_byte', coalesce(sum(ukuran_byte) filter (where sumber = 'drive'), 0),
                       'supabase_byte', coalesce(sum(ukuran_byte) filter (where sumber = 'supabase'), 0))
  end from public.lampiran_tahap
$$;

-- ---------- 5. Kop surat UPT ----------
create or replace function public.ubah_kop_upt(p_kode text, p_alamat text, p_telepon text, p_email text, p_kota text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_role public.user_role := (select private.app_role());
begin
  if not (v_role = 'administrator'
          or (v_role in ('ka_upt', 'operator', 'kepala_pengamanan') and private.my_upt() = private.norm_upt(p_kode))) then
    raise exception 'Kop surat hanya bisa diubah oleh UPT yang bersangkutan atau Administrator.' using errcode = '42501';
  end if;
  update public.master_upt
     set alamat = nullif(btrim(coalesce(p_alamat, '')), ''), telepon = nullif(btrim(coalesce(p_telepon, '')), ''),
         email_kantor = nullif(btrim(coalesce(p_email, '')), ''), kota_ttd = nullif(btrim(coalesce(p_kota, '')), '')
   where kode = private.norm_upt(p_kode);
  if not found then raise exception 'UPT tidak ditemukan.' using errcode = 'P0002'; end if;
end $$;

-- ---------- 6. Pengelolaan akun berjenjang ----------
create or replace function private.boleh_kelola(p_role public.user_role, p_upt text, p_kanwil uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case (select private.app_role())
    when 'administrator' then true
    when 'pemantau_pusat' then p_role is distinct from 'administrator'
    when 'pemantau_kanwil' then p_role in ('ka_upt', 'kepala_pengamanan', 'operator', 'pengawal')
         and exists (select 1 from public.master_upt u where u.kode = private.norm_upt(p_upt) and u.kanwil_id = private.my_kanwil())
    else false end
$$;

create or replace function public.kelola_daftar_akun()
returns table (id uuid, email text, full_name text, nip text, role public.user_role, kode_upt text, kanwil_id uuid,
               is_active boolean, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_role public.user_role := (select private.app_role());
begin
  if v_role not in ('administrator', 'pemantau_pusat', 'pemantau_kanwil') then
    raise exception 'Anda tidak berwenang mengelola akun.' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.nip, p.role, p.kode_upt, p.kanwil_id, p.is_active, u.last_sign_in_at, p.created_at
      from public.profiles p join auth.users u on u.id = p.id
     where v_role in ('administrator', 'pemantau_pusat')
        or (p.role in ('ka_upt', 'kepala_pengamanan', 'operator', 'pengawal')
            and exists (select 1 from public.master_upt m where m.kode = private.norm_upt(p.kode_upt) and m.kanwil_id = private.my_kanwil()))
     order by p.full_name;
end $$;

create or replace function public.kelola_buat_akun(p_email text, p_password text, p_nama text, p_nip text, p_role public.user_role, p_kode_upt text, p_kanwil uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_kanwil uuid := p_kanwil;
begin
  if (select private.app_role()) not in ('administrator', 'pemantau_pusat', 'pemantau_kanwil') then
    raise exception 'Anda tidak berwenang membuat akun.' using errcode = '42501';
  end if;
  if (select private.app_role()) = 'pemantau_kanwil' then v_kanwil := null; end if;
  if p_role in ('ka_upt', 'kepala_pengamanan', 'operator', 'pengawal') then v_kanwil := null; end if;
  if not private.boleh_kelola(p_role, p_kode_upt, v_kanwil) then
    raise exception 'Peran atau UPT ini di luar wewenang Anda.' using errcode = '42501';
  end if;
  v_id := private.buat_akun_core(p_email, p_password, p_nama, p_nip, p_role,
            case when p_role in ('ka_upt', 'kepala_pengamanan', 'operator', 'pengawal') then p_kode_upt end, v_kanwil, (select auth.uid()));
  insert into public.audit_events (aktor_id, aktor_nama, aksi, sasaran_id, sasaran_nama, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Akun dibuat', v_id, btrim(p_nama),
          jsonb_build_object('peran', p_role, 'upt', p_kode_upt));
  return v_id;
end $$;

create or replace function public.kelola_ubah_akun(p_id uuid, p_nama text, p_nip text, p_role public.user_role, p_kode_upt text, p_kanwil uuid, p_aktif boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.profiles%rowtype; v_upt text; v_kanwil uuid; v_role public.user_role;
begin
  select * into t from public.profiles where id = p_id;
  if not found then raise exception 'Akun tidak ditemukan.' using errcode = 'P0002'; end if;
  if not private.boleh_kelola(t.role, t.kode_upt, t.kanwil_id) then
    raise exception 'Akun ini di luar wewenang Anda.' using errcode = '42501';
  end if;
  v_role := coalesce(p_role, t.role);
  if p_id = (select auth.uid()) and (v_role is distinct from t.role or coalesce(p_aktif, t.is_active) is distinct from t.is_active) then
    raise exception 'Peran dan status akun sendiri tidak bisa diubah.' using errcode = '42501';
  end if;
  if v_role in ('ka_upt', 'kepala_pengamanan', 'operator', 'pengawal') then
    v_upt := private.norm_upt(coalesce(nullif(btrim(coalesce(p_kode_upt, '')), ''), t.kode_upt));
    if v_upt is null or not exists (select 1 from public.master_upt u where u.kode = v_upt) then
      raise exception 'UPT wajib dipilih untuk peran ini.' using errcode = '22023';
    end if;
    select kanwil_id into v_kanwil from public.master_upt where kode = v_upt;
  elsif v_role = 'pemantau_kanwil' then
    v_kanwil := coalesce(p_kanwil, t.kanwil_id);
    if v_kanwil is null then raise exception 'Kanwil wajib dipilih untuk Pemantau Kanwil.' using errcode = '22023'; end if;
  end if;
  if not private.boleh_kelola(v_role, v_upt, v_kanwil) then
    raise exception 'Perubahan ini di luar wewenang Anda.' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_nip, '')), '') is not null
     and exists (select 1 from public.profiles p where p.nip = btrim(p_nip) and p.id <> p_id) then
    raise exception 'NIP ini sudah dipakai akun lain.' using errcode = '23505';
  end if;
  update public.profiles
     set full_name = coalesce(nullif(btrim(coalesce(p_nama, '')), ''), full_name),
         nip = case when p_nip is null then nip else nullif(btrim(p_nip), '') end,
         role = v_role, kode_upt = v_upt, kanwil_id = v_kanwil,
         is_active = coalesce(p_aktif, is_active)
   where id = p_id;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, sasaran_id, sasaran_nama, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Akun diubah', p_id, t.full_name,
          jsonb_build_object('peran', v_role, 'upt', v_upt, 'aktif', coalesce(p_aktif, t.is_active)));
end $$;

create or replace function public.kelola_atur_kata_sandi(p_id uuid, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.profiles%rowtype;
begin
  select * into t from public.profiles where id = p_id;
  if not found or not private.boleh_kelola(t.role, t.kode_upt, t.kanwil_id) then
    raise exception 'Akun ini di luar wewenang Anda.' using errcode = '42501';
  end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Kata sandi minimal 8 karakter.' using errcode = '22023'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), updated_at = now() where id = p_id;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, sasaran_id, sasaran_nama)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Kata sandi diatur ulang', p_id, t.full_name);
end $$;

-- ---------- 7. Notifikasi keputusan kesiapan ----------
create or replace function private.notif_keputusan()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  select a.kode_kegiatan, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi, ds.status_keamanan, ds.jumlah_narapidana
    into s from public.daily_sessions ds join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;
  perform private.notif_ke_grup(s.kode_upt, 'Keputusan',
    format('<b>Keputusan: %s</b>' || E'\n' || '%s | %s | %s' || E'\n' || 'Rencana %s WB · Status %s' || E'\n' || '%s%s',
      private.h(new.jenis_keputusan::text), private.h(s.kode_kegiatan), private.h(coalesce(s.upt, s.kode_upt)), private.h(coalesce(s.lokasi, '-')),
      s.jumlah_narapidana, coalesce(new.status_baru::text, s.status_keamanan::text),
      case when nullif(btrim(coalesce(new.catatan_keputusan, '')), '') is not null then 'Catatan: ' || private.h(left(new.catatan_keputusan, 300)) || E'\n' else '' end,
      private.waktu_wib(now())),
    s.status_keamanan, s.latihan);
  return new;
exception when others then return new;
end $$;
drop trigger if exists decisions_notif on public.decisions;
create trigger decisions_notif after insert on public.decisions for each row execute function private.notif_keputusan();

-- ---------- 8. Hak eksekusi ----------
revoke all on function public.tiket_unggah(uuid, integer, text, text, text, bigint) from public, anon;
revoke all on function public.catat_lampiran(text, text, text, text, text, text, bigint, text) from public, anon;
revoke all on function public.hapus_lampiran(uuid) from public, anon;
revoke all on function public.selesaikan_tahap(uuid, integer, jsonb) from public, anon;
revoke all on function public.sahkan_laporan(uuid, text) from public, anon;
revoke all on function public.tiket_ambil(uuid) from public, anon;
revoke all on function public.admin_drive_kunci() from public, anon;
revoke all on function public.admin_atur_drive(text, boolean, integer, integer) from public, anon;
revoke all on function public.pemakaian_lampiran() from public, anon;
revoke all on function public.ubah_kop_upt(text, text, text, text, text) from public, anon;
revoke all on function public.kelola_daftar_akun() from public, anon;
revoke all on function public.kelola_buat_akun(text, text, text, text, public.user_role, text, uuid) from public, anon;
revoke all on function public.kelola_ubah_akun(uuid, text, text, public.user_role, text, uuid, boolean) from public, anon;
revoke all on function public.kelola_atur_kata_sandi(uuid, text) from public, anon;
grant execute on function public.tiket_unggah(uuid, integer, text, text, text, bigint),
  public.catat_lampiran(text, text, text, text, text, text, bigint, text), public.hapus_lampiran(uuid),
  public.selesaikan_tahap(uuid, integer, jsonb), public.sahkan_laporan(uuid, text), public.tiket_ambil(uuid),
  public.admin_drive_kunci(), public.admin_atur_drive(text, boolean, integer, integer), public.pemakaian_lampiran(),
  public.ubah_kop_upt(text, text, text, text, text), public.kelola_daftar_akun(),
  public.kelola_buat_akun(text, text, text, text, public.user_role, text, uuid),
  public.kelola_ubah_akun(uuid, text, text, public.user_role, text, uuid, boolean),
  public.kelola_atur_kata_sandi(uuid, text) to authenticated;

-- Bucket bukti menerima PDF hasil pindai (tahap pengawalan) sampai 10 MB.
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
 where id = 'pas-siaga-evidence';
