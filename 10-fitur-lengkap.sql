-- 10: melengkapi fitur sesuai materi rancangan:
--   1. Data induk lengkap: lokasi (rincian), kelompok kerja, petugas dan tanggal habituasi, inventaris (alat kerja, sarana)
--   2. Notifikasi Telegram per grup (UPT, Kanwil, Direktorat) dan rekap harian terjadwal
--   3. Kondisi awal (garis dasar) untuk perbandingan sebelum dan sesudah
--   4. Mode Latihan (data latihan tidak dihitung pada evaluasi)
--   5. Status unit gelang (zona, baterai, sinyal)
--   6. Rekap hasil ketahanan pangan dan portal berita
-- Token bot Telegram disimpan di Vault, tidak pernah terbaca dari aplikasi.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------- 0. Pembantu ------------------------------------------------------------------------
create or replace function private.bisa_kelola_upt(p_upt text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case (select private.app_role())
    when 'administrator' then true
    when 'operator' then private.my_upt() = private.norm_upt(p_upt)
    else false end
$$;
revoke all on function private.bisa_kelola_upt(text) from public, anon;
grant execute on function private.bisa_kelola_upt(text) to authenticated;

create or replace function private.h(p text)
returns text language sql immutable set search_path = '' as $$
  select replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

-- ---------- 1. Data induk lengkap --------------------------------------------------------------
alter table public.master_locations
  add column if not exists jenis_lahan text check (jenis_lahan is null or char_length(jenis_lahan) <= 60),
  add column if not exists status_lahan text check (status_lahan is null or status_lahan in ('Milik UPT', 'Pinjam pakai', 'Kerja sama', 'Lainnya')),
  add column if not exists komoditas_utama text check (komoditas_utama is null or char_length(komoditas_utama) <= 120),
  add column if not exists jarak_km numeric(7, 2) check (jarak_km is null or jarak_km >= 0),
  add column if not exists daya_tampung_wbp int check (daya_tampung_wbp is null or daya_tampung_wbp >= 0),
  add column if not exists pj_lokasi text check (pj_lokasi is null or char_length(pj_lokasi) <= 150);

create table if not exists public.kelompok_kerja (
  id             uuid primary key default gen_random_uuid(),
  kode_upt       text not null default 'UPT' references public.master_upt (kode),
  nama           text not null check (char_length(btrim(nama)) between 2 and 120),
  jenis_kegiatan public.activity_type,
  lokasi_id      uuid references public.master_locations (id) on delete set null,
  pembimbing     text check (pembimbing is null or char_length(pembimbing) <= 150),
  keterangan     text check (keterangan is null or char_length(keterangan) <= 500),
  aktif          boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (kode_upt, nama)
);
create table if not exists public.kelompok_kerja_anggota (
  kelompok_id uuid not null references public.kelompok_kerja (id) on delete cascade,
  inmate_id   uuid not null references public.master_inmates (id) on delete cascade,
  primary key (kelompok_id, inmate_id)
);
create index if not exists kelompok_anggota_inmate_idx on public.kelompok_kerja_anggota (inmate_id);
create index if not exists kelompok_lokasi_idx on public.kelompok_kerja (lokasi_id);

create table if not exists public.petugas_upt (
  id                uuid primary key default gen_random_uuid(),
  kode_upt          text not null default 'UPT' references public.master_upt (kode),
  nama              text not null check (char_length(btrim(nama)) between 2 and 150),
  nip               text check (nip is null or nip ~ '^[0-9]{8,24}$'),
  jabatan           text check (jabatan is null or char_length(jabatan) <= 120),
  regu              text check (regu is null or char_length(regu) <= 60),
  profile_id        uuid references public.profiles (id) on delete set null,
  tanggal_habituasi date,
  materi_habituasi  text check (materi_habituasi is null or char_length(materi_habituasi) <= 300),
  aktif             boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (kode_upt, nip)
);
create index if not exists petugas_profile_idx on public.petugas_upt (profile_id);

create table if not exists public.inventaris_upt (
  id             uuid primary key default gen_random_uuid(),
  kode_upt       text not null default 'UPT' references public.master_upt (kode),
  golongan       text not null check (golongan in ('Alat kerja', 'Sarana dan prasarana')),
  kategori       text check (kategori is null or char_length(kategori) <= 80),
  nama           text not null check (char_length(btrim(nama)) between 2 and 150),
  kode_inventaris text check (kode_inventaris is null or char_length(kode_inventaris) <= 60),
  jumlah         int not null default 1 check (jumlah >= 0),
  kondisi        text not null default 'Baik' check (kondisi in ('Baik', 'Rusak ringan', 'Rusak berat', 'Hilang')),
  lokasi_simpan  text check (lokasi_simpan is null or char_length(lokasi_simpan) <= 150),
  keterangan     text check (keterangan is null or char_length(keterangan) <= 500),
  aktif          boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists inventaris_upt_idx on public.inventaris_upt (kode_upt, golongan);

create trigger kelompok_upt before insert on public.kelompok_kerja for each row execute function private.set_upt_default();
create trigger petugas_upt_default before insert on public.petugas_upt for each row execute function private.set_upt_default();
create trigger inventaris_upt_default before insert on public.inventaris_upt for each row execute function private.set_upt_default();

create or replace function private.kelompok_upt(p_kelompok uuid)
returns text language sql stable security definer set search_path = '' as $$
  select kode_upt from public.kelompok_kerja where id = p_kelompok
$$;
revoke all on function private.kelompok_upt(uuid) from public, anon;
grant execute on function private.kelompok_upt(uuid) to authenticated;

alter table public.kelompok_kerja enable row level security;
alter table public.kelompok_kerja_anggota enable row level security;
alter table public.petugas_upt enable row level security;
alter table public.inventaris_upt enable row level security;

create policy kelompok_select on public.kelompok_kerja for select to authenticated using (private.can_view_berkas(kode_upt));
create policy kelompok_write on public.kelompok_kerja for all to authenticated
  using (private.bisa_kelola_upt(kode_upt)) with check (private.bisa_kelola_upt(kode_upt));
create policy kelompok_anggota_select on public.kelompok_kerja_anggota for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan', 'pemantau_kanwil', 'pemantau_pusat')
         and private.can_view_upt(private.kelompok_upt(kelompok_id)));
create policy kelompok_anggota_write on public.kelompok_kerja_anggota for all to authenticated
  using (private.bisa_kelola_upt(private.kelompok_upt(kelompok_id)))
  with check (private.bisa_kelola_upt(private.kelompok_upt(kelompok_id)));
create policy petugas_select on public.petugas_upt for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan', 'pemantau_kanwil', 'pemantau_pusat')
         and private.can_view_upt(kode_upt));
create policy petugas_write on public.petugas_upt for all to authenticated
  using (private.bisa_kelola_upt(kode_upt)) with check (private.bisa_kelola_upt(kode_upt));
create policy inventaris_select on public.inventaris_upt for select to authenticated using (private.can_view_berkas(kode_upt));
create policy inventaris_write on public.inventaris_upt for all to authenticated
  using (private.bisa_kelola_upt(kode_upt)) with check (private.bisa_kelola_upt(kode_upt));

revoke all on public.kelompok_kerja, public.kelompok_kerja_anggota, public.petugas_upt, public.inventaris_upt from anon;
revoke truncate, references, trigger on public.kelompok_kerja, public.kelompok_kerja_anggota, public.petugas_upt, public.inventaris_upt from authenticated;
grant select, insert, update, delete on public.kelompok_kerja, public.kelompok_kerja_anggota, public.petugas_upt, public.inventaris_upt to authenticated;

-- ---------- 2. Pengaturan aplikasi dan Telegram ------------------------------------------------
create table if not exists public.pengaturan_aplikasi (
  id             boolean primary key default true check (id),
  mode_latihan   boolean not null default false,
  telegram_aktif boolean not null default false,
  rekap_jam_wib  int not null default 17 check (rekap_jam_wib between 0 and 23),
  rekap_terakhir date,
  diubah_at      timestamptz not null default now(),
  diubah_oleh    uuid references public.profiles (id)
);
insert into public.pengaturan_aplikasi (id) values (true) on conflict do nothing;
alter table public.pengaturan_aplikasi enable row level security;
create policy pengaturan_select on public.pengaturan_aplikasi for select to authenticated using ((select private.app_role()) is not null);
revoke all on public.pengaturan_aplikasi from anon;
revoke insert, update, delete, truncate, references, trigger on public.pengaturan_aplikasi from authenticated;
grant select on public.pengaturan_aplikasi to authenticated;

create table if not exists public.grup_telegram (
  id             uuid primary key default gen_random_uuid(),
  nama           text not null check (char_length(btrim(nama)) between 2 and 120),
  chat_id        text not null check (chat_id ~ '^-?[0-9]{5,20}$' or chat_id ~ '^@[A-Za-z0-9_]{5,64}$'),
  tingkat        text not null check (tingkat in ('UPT', 'Kanwil', 'Direktorat')),
  kode_upt       text references public.master_upt (kode),
  kanwil_id      uuid references public.master_kanwil (id),
  minimal_status public.security_status not null default 'KUNING',
  kirim_rekap    boolean not null default true,
  ikut_latihan   boolean not null default true,
  aktif          boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint grup_telegram_tingkat_ok check (
    (tingkat = 'UPT' and kode_upt is not null and kanwil_id is null)
    or (tingkat = 'Kanwil' and kanwil_id is not null and kode_upt is null)
    or (tingkat = 'Direktorat' and kode_upt is null and kanwil_id is null))
);
create index if not exists grup_telegram_upt_idx on public.grup_telegram (kode_upt);
create index if not exists grup_telegram_kanwil_idx on public.grup_telegram (kanwil_id);
alter table public.grup_telegram enable row level security;
create policy grup_telegram_admin on public.grup_telegram for all to authenticated
  using ((select private.app_role()) = 'administrator') with check ((select private.app_role()) = 'administrator');
revoke all on public.grup_telegram from anon;
revoke truncate, references, trigger on public.grup_telegram from authenticated;
grant select, insert, update, delete on public.grup_telegram to authenticated;

create table if not exists public.notif_log (
  id         uuid primary key default gen_random_uuid(),
  waktu      timestamptz not null default now(),
  grup_id    uuid references public.grup_telegram (id) on delete set null,
  grup_nama  text,
  jenis      text not null,
  pesan      text not null,
  request_id bigint,
  hasil      text not null check (hasil in ('Diantrekan', 'Dilewati'))
);
create index if not exists notif_log_waktu_idx on public.notif_log (waktu desc);
alter table public.notif_log enable row level security;
revoke all on public.notif_log from anon, authenticated;

-- 2a. Pengiriman
create or replace function private.kirim_telegram(p_grup uuid, p_nama text, p_chat text, p_teks text, p_jenis text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_set public.pengaturan_aplikasi%rowtype;
  v_tok text;
  v_req bigint;
begin
  select * into v_set from public.pengaturan_aplikasi where id;
  select decrypted_secret into v_tok from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1;
  if v_set.telegram_aktif is not true or v_tok is null then
    insert into public.notif_log (grup_id, grup_nama, jenis, pesan, hasil) values (p_grup, p_nama, p_jenis, left(p_teks, 4000), 'Dilewati');
    return;
  end if;
  v_req := net.http_post(
    url := 'https://api.telegram.org/bot' || v_tok || '/sendMessage',
    body := jsonb_build_object('chat_id', p_chat, 'text', left(p_teks, 4000), 'parse_mode', 'HTML', 'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000);
  insert into public.notif_log (grup_id, grup_nama, jenis, pesan, request_id, hasil)
  values (p_grup, p_nama, p_jenis, left(p_teks, 4000), v_req, 'Diantrekan');
end
$$;
revoke all on function private.kirim_telegram(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function private.notif_ke_grup(p_upt text, p_jenis text, p_teks text, p_status public.security_status, p_latihan boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g record;
  v_kw uuid;
  v_pesan text;
begin
  if p_upt is not null then
    select kanwil_id into v_kw from public.master_upt where kode = private.norm_upt(p_upt);
  end if;
  v_pesan := case when p_latihan then '<b>[LATIHAN]</b> ' else '' end || p_teks;
  for g in
    select * from public.grup_telegram t
     where t.aktif
       and (not p_latihan or t.ikut_latihan)
       and (p_status is null or private.status_rank(p_status) >= private.status_rank(t.minimal_status))
       and ((t.tingkat = 'UPT' and p_upt is not null and t.kode_upt = private.norm_upt(p_upt))
         or (t.tingkat = 'Kanwil' and v_kw is not null and t.kanwil_id = v_kw)
         or t.tingkat = 'Direktorat')
  loop
    perform private.kirim_telegram(g.id, g.nama, g.chat_id, v_pesan, p_jenis);
  end loop;
end
$$;
revoke all on function private.notif_ke_grup(text, text, text, public.security_status, boolean) from public, anon, authenticated;

-- 2b. Pemicu: perubahan status, gangguan, alarm gelang. Galat notifikasi tidak boleh menggagalkan pencatatan.
create or replace function private.waktu_wib(p timestamptz)
returns text language sql stable set search_path = '' as $$
  select to_char(p at time zone 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI') || ' WIB'
$$;

create or replace function private.notif_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s record; v_teks text; v_atas public.security_status;
begin
  select a.kode_kegiatan, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi
    into s
    from public.daily_sessions ds
    join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt
    left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;
  v_atas := case when private.status_rank(new.ke) >= private.status_rank(new.dari) then new.ke else new.dari end;
  v_teks := format('<b>Status keamanan %s: %s ke %s</b>' || E'\n' || '%s | %s | %s' || E'\n' || 'Alasan: %s' || E'\n' || '%s',
    case when private.status_rank(new.ke) > private.status_rank(new.dari) then 'naik' else 'turun' end,
    new.dari, new.ke, private.h(s.kode_kegiatan), private.h(coalesce(s.upt, s.kode_upt)), private.h(coalesce(s.lokasi, '-')),
    private.h(left(new.alasan, 400)), private.waktu_wib(new.waktu));
  perform private.notif_ke_grup(s.kode_upt, 'Status keamanan', v_teks, v_atas, s.latihan);
  return new;
exception when others then
  return new;
end
$$;
revoke all on function private.notif_status() from public, anon, authenticated;
drop trigger if exists status_history_notif on public.status_history;
create trigger status_history_notif after insert on public.status_history for each row execute function private.notif_status();

create or replace function private.notif_gangguan()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s record; v_teks text;
begin
  select a.kode_kegiatan, a.kode_upt, a.latihan, u.nama as upt, l.nama as lokasi
    into s
    from public.daily_sessions ds
    join public.activities a on a.id = ds.activity_id
    left join public.master_upt u on u.kode = a.kode_upt
    left join public.master_locations l on l.id = a.lokasi_id
   where ds.id = new.session_id;
  if not found then return new; end if;
  v_teks := format('<b>Gangguan baru: %s</b>' || E'\n' || '%s | %s | %s' || E'\n' || 'Tindakan awal: %s' || E'\n' || '%s',
    private.h(new.kategori_gangguan), private.h(s.kode_kegiatan), private.h(coalesce(s.upt, s.kode_upt)), private.h(coalesce(s.lokasi, '-')),
    private.h(coalesce(left(new.tindakan_awal, 300), '-')), private.waktu_wib(new.created_at));
  perform private.notif_ke_grup(s.kode_upt, 'Gangguan', v_teks, 'KUNING', s.latihan);
  return new;
exception when others then
  return new;
end
$$;
revoke all on function private.notif_gangguan() from public, anon, authenticated;
drop trigger if exists incidents_notif on public.incidents;
create trigger incidents_notif after insert on public.incidents for each row execute function private.notif_gangguan();

create or replace function private.notif_alarm_gelang()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_upt text; v_latihan boolean := false; v_teks text; v_wb text;
begin
  select nama into v_upt from public.master_upt where kode = new.kode_upt;
  if new.session_id is not null then
    select a.latihan into v_latihan from public.daily_sessions ds join public.activities a on a.id = ds.activity_id where ds.id = new.session_id;
  end if;
  select i.nama into v_wb from public.master_inmates i where i.id = new.inmate_id;
  v_teks := format('<b>Alarm gelang: %s</b>' || E'\n' || 'Unit %s%s | %s' || E'\n' || '%s%s%s',
    private.h(new.jenis), private.h(new.unit_nama), case when v_wb is null then '' else ' (' || private.h(v_wb) || ')' end,
    private.h(coalesce(v_upt, 'UPT belum terpetakan')),
    private.waktu_wib(new.waktu),
    case when new.lokasi is null then '' else E'\n' || 'Lokasi: ' || private.h(new.lokasi) end,
    case when new.baterai is null then '' else E'\n' || 'Baterai: ' || private.h(new.baterai) end);
  perform private.notif_ke_grup(new.kode_upt, 'Alarm gelang', v_teks,
    case when new.jenis in ('Keluar zona', 'Perangkat dilepas atau dirusak') then 'MERAH'::public.security_status else 'KUNING'::public.security_status end,
    coalesce(v_latihan, false));
  return new;
exception when others then
  return new;
end
$$;
revoke all on function private.notif_alarm_gelang() from public, anon, authenticated;
drop trigger if exists gelang_alarm_notif on public.gelang_alarm;
create trigger gelang_alarm_notif after insert on public.gelang_alarm for each row execute function private.notif_alarm_gelang();

-- 2c. Rekap harian
create or replace function private.dalam_cakupan(p_tingkat text, p_upt text, p_kanwil uuid, p_kode text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_tingkat
    when 'UPT' then p_kode = p_upt
    when 'Kanwil' then exists (select 1 from public.master_upt u where u.kode = p_kode and u.kanwil_id = p_kanwil)
    else true end
$$;
revoke all on function private.dalam_cakupan(text, text, uuid, text) from public, anon, authenticated;

create or replace function private.susun_rekap(p_tingkat text, p_upt text, p_kanwil uuid, p_tanggal date)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_sesi int; v_jalan int; v_tutup int; v_wb int; v_h int; v_k int; v_m int; v_r int;
  v_gangguan int; v_alarm int; v_tl int; v_daftar text; v_judul text;
begin
  select count(*), count(*) filter (where s.status_kesiapan = 'Dapat Dimulai'),
         count(*) filter (where s.ditutup_at is not null),
         coalesce(sum(s.jumlah_narapidana) filter (where s.status_kesiapan = 'Dapat Dimulai'), 0),
         count(*) filter (where s.status_kesiapan = 'Dapat Dimulai' and s.status_keamanan = 'HIJAU'),
         count(*) filter (where s.status_kesiapan = 'Dapat Dimulai' and s.status_keamanan = 'KUNING'),
         count(*) filter (where s.status_kesiapan = 'Dapat Dimulai' and s.status_keamanan = 'MERAH'),
         count(*) filter (where s.status_kesiapan = 'Dapat Dimulai' and s.status_keamanan = 'KRITIS')
    into v_sesi, v_jalan, v_tutup, v_wb, v_h, v_k, v_m, v_r
    from public.daily_sessions s join public.activities a on a.id = s.activity_id
   where s.tanggal_sesi = p_tanggal and not a.latihan and private.dalam_cakupan(p_tingkat, p_upt, p_kanwil, a.kode_upt);

  select count(*) into v_gangguan
    from public.incidents i join public.daily_sessions s on s.id = i.session_id join public.activities a on a.id = s.activity_id
   where not i.status_penyelesaian and not a.latihan and private.dalam_cakupan(p_tingkat, p_upt, p_kanwil, a.kode_upt);
  select count(*) into v_alarm from public.gelang_alarm g
   where g.status = 'Menunggu' and g.kode_upt is not null and private.dalam_cakupan(p_tingkat, p_upt, p_kanwil, g.kode_upt);
  select count(*) into v_tl
    from public.follow_ups f join public.daily_sessions s on s.id = f.session_id join public.activities a on a.id = s.activity_id
   where f.status in ('Terbuka', 'Dikerjakan') and f.tenggat < now() and not a.latihan
     and private.dalam_cakupan(p_tingkat, p_upt, p_kanwil, a.kode_upt);

  if v_sesi = 0 and v_gangguan = 0 and v_alarm = 0 and v_tl = 0 then return null; end if;

  select string_agg(x.baris, E'\n') into v_daftar from (
    select private.h(coalesce(u.nama, a.kode_upt)) || ' | ' || private.h(a.kode_kegiatan) || ' | ' || s.status_keamanan as baris
      from public.daily_sessions s join public.activities a on a.id = s.activity_id left join public.master_upt u on u.kode = a.kode_upt
     where s.tanggal_sesi = p_tanggal and not a.latihan and s.status_kesiapan = 'Dapat Dimulai'
       and s.status_keamanan in ('MERAH', 'KRITIS') and private.dalam_cakupan(p_tingkat, p_upt, p_kanwil, a.kode_upt)
     order by s.status_keamanan desc, a.kode_kegiatan limit 10) x;

  v_judul := case p_tingkat
    when 'UPT' then (select nama from public.master_upt where kode = p_upt)
    when 'Kanwil' then (select nama from public.master_kanwil where id = p_kanwil)
    else 'Seluruh Indonesia' end;

  return format('<b>Rekap harian %s</b>' || E'\n' || '%s' || E'\n\n'
    || 'Kegiatan: %s sesi (%s berjalan, %s ditutup)' || E'\n'
    || 'WB dalam kegiatan: %s' || E'\n'
    || 'Status berjalan: hijau %s, kuning %s, merah %s, kritis %s' || E'\n'
    || 'Gangguan belum diverifikasi: %s' || E'\n'
    || 'Alarm gelang menunggu: %s' || E'\n'
    || 'Tindak lanjut terlambat: %s%s',
    to_char(p_tanggal, 'DD/MM/YYYY'), private.h(v_judul), v_sesi, v_jalan, v_tutup, v_wb, v_h, v_k, v_m, v_r,
    v_gangguan, v_alarm, v_tl,
    case when v_daftar is null then '' else E'\n\n' || '<b>Perlu perhatian</b>' || E'\n' || v_daftar end);
end
$$;
revoke all on function private.susun_rekap(text, text, uuid, date) from public, anon, authenticated;

create or replace function private.kirim_rekap_semua(p_tanggal date)
returns int language plpgsql security definer set search_path = '' as $$
declare g record; v_teks text; n int := 0;
begin
  for g in select * from public.grup_telegram where aktif and kirim_rekap loop
    v_teks := private.susun_rekap(g.tingkat, g.kode_upt, g.kanwil_id, p_tanggal);
    if v_teks is not null then
      perform private.kirim_telegram(g.id, g.nama, g.chat_id, v_teks, 'Rekap harian');
      n := n + 1;
    end if;
  end loop;
  return n;
end
$$;
revoke all on function private.kirim_rekap_semua(date) from public, anon, authenticated;

create or replace function private.rekap_terjadwal()
returns void language plpgsql security definer set search_path = '' as $$
declare p public.pengaturan_aplikasi%rowtype; v_hari date := (now() at time zone 'Asia/Jakarta')::date;
begin
  select * into p from public.pengaturan_aplikasi where id;
  if not found or not p.telegram_aktif or p.mode_latihan then return; end if;
  if extract(hour from now() at time zone 'Asia/Jakarta')::int <> p.rekap_jam_wib then return; end if;
  if p.rekap_terakhir = v_hari then return; end if;
  update public.pengaturan_aplikasi set rekap_terakhir = v_hari where id;
  perform private.kirim_rekap_semua(v_hari);
end
$$;
revoke all on function private.rekap_terjadwal() from public, anon, authenticated;

do $$ begin perform cron.unschedule('rekap-harian-telegram'); exception when others then null; end $$;
select cron.schedule('rekap-harian-telegram', '0 * * * *', 'select private.rekap_terjadwal()');

-- 2d. Fungsi Administrator
create or replace function public.admin_simpan_token_telegram(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh mengatur token Telegram.' using errcode = '42501';
  end if;
  if p_token is null or btrim(p_token) !~ '^[0-9]{6,14}:[A-Za-z0-9_-]{30,60}$' then
    raise exception 'Format token bot tidak dikenali. Salin utuh dari BotFather.' using errcode = '22023';
  end if;
  select id into v_id from vault.secrets where name = 'telegram_bot_token';
  if v_id is null then
    perform vault.create_secret(btrim(p_token), 'telegram_bot_token', 'Token bot Telegram PAS-SIAGA Pangan');
  else
    perform vault.update_secret(v_id, btrim(p_token));
  end if;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Token bot Telegram diganti', '{}'::jsonb);
end
$$;

create or replace function public.admin_status_telegram()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_at timestamptz; v_set public.pengaturan_aplikasi%rowtype;
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh melihat pengaturan ini.' using errcode = '42501';
  end if;
  select updated_at into v_at from vault.secrets where name = 'telegram_bot_token';
  select * into v_set from public.pengaturan_aplikasi where id;
  return jsonb_build_object('token_ada', v_at is not null, 'token_diatur_at', v_at,
    'telegram_aktif', v_set.telegram_aktif, 'rekap_jam_wib', v_set.rekap_jam_wib, 'rekap_terakhir', v_set.rekap_terakhir);
end
$$;

create or replace function public.admin_atur_pengaturan(p_latihan boolean, p_telegram boolean, p_rekap_jam int)
returns void language plpgsql security definer set search_path = '' as $$
declare v_lama public.pengaturan_aplikasi%rowtype;
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh mengubah pengaturan aplikasi.' using errcode = '42501';
  end if;
  if p_rekap_jam is null or p_rekap_jam not between 0 and 23 then
    raise exception 'Jam rekap harus antara 0 dan 23.' using errcode = '22023';
  end if;
  select * into v_lama from public.pengaturan_aplikasi where id;
  update public.pengaturan_aplikasi
     set mode_latihan = coalesce(p_latihan, mode_latihan), telegram_aktif = coalesce(p_telegram, telegram_aktif),
         rekap_jam_wib = p_rekap_jam, diubah_at = now(), diubah_oleh = (select auth.uid())
   where id;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Pengaturan aplikasi diubah',
          jsonb_build_object('mode_latihan', p_latihan, 'telegram_aktif', p_telegram, 'rekap_jam_wib', p_rekap_jam,
                             'sebelumnya_latihan', v_lama.mode_latihan, 'sebelumnya_telegram', v_lama.telegram_aktif));
end
$$;

create or replace function public.admin_tes_telegram(p_grup uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare g public.grup_telegram%rowtype; v_set public.pengaturan_aplikasi%rowtype; v_ada boolean;
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh mengirim pesan uji.' using errcode = '42501';
  end if;
  select * into g from public.grup_telegram where id = p_grup;
  if not found then raise exception 'Grup tidak ditemukan.' using errcode = '22023'; end if;
  select * into v_set from public.pengaturan_aplikasi where id;
  select exists (select 1 from vault.secrets where name = 'telegram_bot_token') into v_ada;
  if not v_ada then raise exception 'Token bot belum diisi.' using errcode = '22023'; end if;
  if not v_set.telegram_aktif then raise exception 'Aktifkan notifikasi Telegram lebih dulu.' using errcode = '22023'; end if;
  perform private.kirim_telegram(g.id, g.nama, g.chat_id,
    '<b>Pesan uji PAS-SIAGA Pangan</b>' || E'\n' || 'Grup ini terhubung. Waktu: ' || private.waktu_wib(now()), 'Pesan uji');
  return 'diantrekan';
end
$$;

create or replace function public.admin_kirim_rekap_sekarang()
returns int language plpgsql security definer set search_path = '' as $$
declare v_set public.pengaturan_aplikasi%rowtype;
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh mengirim rekap.' using errcode = '42501';
  end if;
  select * into v_set from public.pengaturan_aplikasi where id;
  if not v_set.telegram_aktif then raise exception 'Aktifkan notifikasi Telegram lebih dulu.' using errcode = '22023'; end if;
  return private.kirim_rekap_semua((now() at time zone 'Asia/Jakarta')::date);
end
$$;

create or replace function public.admin_daftar_notif(p_limit int default 50)
returns table (id uuid, waktu timestamptz, grup_nama text, jenis text, pesan text, hasil text, kode_http int, galat text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh melihat log notifikasi.' using errcode = '42501';
  end if;
  return query
    select n.id, n.waktu, n.grup_nama, n.jenis, n.pesan, n.hasil, r.status_code,
           left(coalesce(r.error_msg, case when r.status_code is not null and r.status_code <> 200 then r.content end), 200)
      from public.notif_log n
      left join net._http_response r on r.id = n.request_id
     order by n.waktu desc
     limit least(greatest(coalesce(p_limit, 50), 1), 200);
end
$$;

revoke all on function public.admin_simpan_token_telegram(text), public.admin_status_telegram(),
  public.admin_atur_pengaturan(boolean, boolean, int), public.admin_tes_telegram(uuid),
  public.admin_kirim_rekap_sekarang(), public.admin_daftar_notif(int) from public, anon;
grant execute on function public.admin_simpan_token_telegram(text), public.admin_status_telegram(),
  public.admin_atur_pengaturan(boolean, boolean, int), public.admin_tes_telegram(uuid),
  public.admin_kirim_rekap_sekarang(), public.admin_daftar_notif(int) to authenticated;

-- ---------- 3. Mode Latihan -------------------------------------------------------------------------
alter table public.activities add column if not exists latihan boolean not null default false;

create or replace function private.set_latihan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.latihan := coalesce((select mode_latihan from public.pengaturan_aplikasi where id), false);
  return new;
end
$$;
revoke all on function private.set_latihan() from public, anon, authenticated;
drop trigger if exists activities_latihan on public.activities;
create trigger activities_latihan before insert on public.activities for each row execute function private.set_latihan();

-- Tampilan ringkasan: kolom latihan ditambahkan di akhir.
create or replace view public.v_session_overview with (security_invoker = true) as
 SELECT s.id AS session_id, s.activity_id, a.kode_kegiatan, a.jenis_kegiatan, a.kode_upt, u.nama AS upt_nama,
    a.lokasi_id, l.nama AS lokasi_nama, a.luas_lahan_ha, s.tanggal_sesi, s.status_kesiapan, s.status_keamanan,
    s.ditutup_at, s.jumlah_narapidana, s.jumlah_alat_kerja, cardinality(s.petugas_ids) AS jumlah_petugas,
    s.interval_pemeriksaan, s.pakai_gelang_monitor, k.waktu_kejadian AS keluar_at,
    (k.payload ->> 'jumlah_wbp')::integer AS wbp_keluar, b.waktu_kejadian AS kembali_at,
    (b.payload ->> 'jumlah_wbp')::integer AS wbp_kembali, t.waktu_kejadian AS tiba_at,
    h.waktu_kejadian AS hitung_terakhir_at, (h.payload ->> 'jumlah_wbp')::integer AS wbp_terakhir_dihitung,
        CASE
            WHEN s.ditutup_at IS NOT NULL THEN 'Selesai'
            WHEN s.status_kesiapan = 'Menunggu' THEN 'Menunggu keputusan kesiapan'
            WHEN s.status_kesiapan = 'Perbaiki Dulu' THEN 'Perlu diperbaiki'
            WHEN s.status_kesiapan = 'Ditunda' THEN 'Ditunda'
            WHEN b.id IS NOT NULL AND (k.id IS NULL OR b.waktu_kejadian >= k.waktu_kejadian) THEN 'Sudah kembali ke blok'
            WHEN t.id IS NOT NULL THEN 'Di lokasi'
            WHEN k.id IS NOT NULL THEN 'Dalam perjalanan'
            ELSE 'Siap, belum berangkat'
        END AS fase,
    GREATEST(s.updated_at, lg.terakhir_kirim, dc.terakhir) AS diperbarui_at,
    COALESCE(gi.n, 0) AS gangguan_terbuka, COALESCE(fu.terbuka, 0) AS tindak_lanjut_terbuka,
    COALESCE(fu.terlambat, 0) AS tindak_lanjut_terlambat,
    COALESCE(s.ditutup_at IS NULL AND s.status_kesiapan = 'Dapat Dimulai' AND t.id IS NOT NULL
      AND (b.id IS NULL OR k.id IS NOT NULL AND b.waktu_kejadian < k.waktu_kejadian)
      AND now() > (h.waktu_kejadian + make_interval(mins => s.interval_pemeriksaan)), false) AS terlambat_periksa,
    h.waktu_kejadian + make_interval(mins => s.interval_pemeriksaan) AS batas_periksa_berikut,
    a.latihan
   FROM daily_sessions s
     JOIN activities a ON a.id = s.activity_id
     LEFT JOIN master_locations l ON l.id = a.lokasi_id
     LEFT JOIN master_upt u ON u.kode = a.kode_upt
     LEFT JOIN LATERAL ( SELECT x.id, x.waktu_kejadian, x.payload FROM field_logs x
          WHERE x.session_id = s.id AND x.jenis_entri = 'Serah terima di blok' AND (x.payload ->> 'tahap') = 'keluar'
          ORDER BY x.waktu_kejadian DESC, x.dikirim_at DESC LIMIT 1) k ON true
     LEFT JOIN LATERAL ( SELECT x.id, x.waktu_kejadian, x.payload FROM field_logs x
          WHERE x.session_id = s.id AND x.jenis_entri = 'Serah terima di blok' AND (x.payload ->> 'tahap') = 'kembali'
          ORDER BY x.waktu_kejadian DESC, x.dikirim_at DESC LIMIT 1) b ON true
     LEFT JOIN LATERAL ( SELECT x.id, x.waktu_kejadian FROM field_logs x
          WHERE x.session_id = s.id AND x.jenis_entri = 'Tiba di lokasi' ORDER BY x.waktu_kejadian LIMIT 1) t ON true
     LEFT JOIN LATERAL ( SELECT x.waktu_kejadian, x.payload FROM field_logs x
          WHERE x.session_id = s.id AND x.jenis_entri = ANY (ARRAY['Tiba di lokasi', 'Pemeriksaan berkala', 'Pindah area atau ganti pengawal']::log_type[])
          ORDER BY x.waktu_kejadian DESC, x.dikirim_at DESC LIMIT 1) h ON true
     LEFT JOIN LATERAL ( SELECT max(x.dikirim_at) AS terakhir_kirim FROM field_logs x WHERE x.session_id = s.id) lg ON true
     LEFT JOIN LATERAL ( SELECT max(x.created_at) AS terakhir FROM decisions x WHERE x.session_id = s.id) dc ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS n FROM incidents x WHERE x.session_id = s.id AND NOT x.status_penyelesaian) gi ON true
     LEFT JOIN LATERAL ( SELECT count(*) FILTER (WHERE x.status = ANY (ARRAY['Terbuka', 'Dikerjakan']))::integer AS terbuka,
            count(*) FILTER (WHERE (x.status = ANY (ARRAY['Terbuka', 'Dikerjakan'])) AND x.tenggat < now())::integer AS terlambat
           FROM follow_ups x WHERE x.session_id = s.id) fu ON true;
grant select on public.v_session_overview to authenticated;

-- Evaluasi dan tren tidak menghitung kegiatan latihan.
create or replace function public.indikator_evaluasi(p_dari date, p_sampai date)
returns jsonb language sql stable set search_path = '' as $$
  with s as (
    select ds.* from public.daily_sessions ds join public.activities ac on ac.id = ds.activity_id
     where ds.tanggal_sesi between p_dari and p_sampai and not ac.latihan
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

create or replace function public.tren_mingguan(p_dari date, p_sampai date)
returns jsonb language sql stable set search_path = '' as $$
  with s as (
    select ds.* from public.daily_sessions ds join public.activities ac on ac.id = ds.activity_id
     where ds.tanggal_sesi between p_dari and p_sampai and not ac.latihan),
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

-- ---------- 4. Kondisi awal (garis dasar) -----------------------------------------------------------------
create table if not exists public.kondisi_awal (
  id                         uuid primary key default gen_random_uuid(),
  kode_upt                   text not null unique references public.master_upt (kode),
  periode_dari               date,
  periode_sampai             date,
  kegiatan_per_bulan         numeric(7, 2) check (kegiatan_per_bulan is null or kegiatan_per_bulan >= 0),
  pct_catatan_lengkap        numeric(5, 2) check (pct_catatan_lengkap is null or pct_catatan_lengkap between 0 and 100),
  pct_serah_terima_cocok     numeric(5, 2) check (pct_serah_terima_cocok is null or pct_serah_terima_cocok between 0 and 100),
  pct_temuan_tindak_lanjut   numeric(5, 2) check (pct_temuan_tindak_lanjut is null or pct_temuan_tindak_lanjut between 0 and 100),
  pct_tindak_lanjut_selesai  numeric(5, 2) check (pct_tindak_lanjut_selesai is null or pct_tindak_lanjut_selesai between 0 and 100),
  menit_pelaporan_kejadian   numeric(8, 2) check (menit_pelaporan_kejadian is null or menit_pelaporan_kejadian >= 0),
  gangguan_per_bulan         numeric(7, 2) check (gangguan_per_bulan is null or gangguan_per_bulan >= 0),
  sumber_data                text check (sumber_data is null or char_length(sumber_data) <= 300),
  catatan                    text check (catatan is null or char_length(catatan) <= 1000),
  dicatat_oleh               uuid default auth.uid() references public.profiles (id),
  updated_at                 timestamptz not null default now(),
  constraint kondisi_awal_periode_ok check (periode_dari is null or periode_sampai is null or periode_sampai >= periode_dari)
);
alter table public.kondisi_awal enable row level security;
create policy kondisi_awal_select on public.kondisi_awal for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan', 'pemantau_kanwil', 'pemantau_pusat')
         and private.can_view_upt(kode_upt));
create policy kondisi_awal_write on public.kondisi_awal for all to authenticated
  using (private.bisa_kelola_upt(kode_upt)) with check (private.bisa_kelola_upt(kode_upt));
revoke all on public.kondisi_awal from anon;
revoke truncate, references, trigger on public.kondisi_awal from authenticated;
grant select, insert, update, delete on public.kondisi_awal to authenticated;

-- Nilai "sesudah" yang tidak ada di indikator_evaluasi: median selang antara kejadian dan pelaporan gangguan.
create or replace function public.pembanding_sesudah(p_dari date, p_sampai date)
returns jsonb language sql stable set search_path = '' as $$
  with s as (
    select ds.id from public.daily_sessions ds join public.activities ac on ac.id = ds.activity_id
     where ds.tanggal_sesi between p_dari and p_sampai and not ac.latihan)
  select jsonb_build_object(
    'menit_pelaporan_median',
      (select round((percentile_cont(0.5) within group (order by greatest(extract(epoch from (l.dikirim_at - l.waktu_kejadian)) / 60, 0)))::numeric, 1)
         from public.field_logs l where l.session_id in (select id from s) and l.jenis_entri = 'Gangguan'),
    'jumlah_gangguan',
      (select count(*) from public.incidents i where i.session_id in (select id from s)))
$$;
revoke all on function public.pembanding_sesudah(date, date) from public, anon;
grant execute on function public.pembanding_sesudah(date, date) to authenticated;

-- ---------- 5. Status unit gelang -------------------------------------------------------------------------
alter table public.gelang_unit
  add column if not exists zona_nama text check (zona_nama is null or char_length(zona_nama) <= 150),
  add column if not exists zona_radius_m int check (zona_radius_m is null or zona_radius_m between 10 and 100000),
  add column if not exists ambang_baterai int not null default 20 check (ambang_baterai between 1 and 90);

create or replace view public.v_gelang_unit_status with (security_invoker = true) as
select g.id, g.kode_upt, u.nama as upt_nama, g.kode_unit, g.nama_unit, g.inmate_id, i.nama as wb_nama,
       i.nomor_registrasi, g.aktif, g.zona_nama, g.zona_radius_m, g.ambang_baterai,
       z.waktu as zona_terakhir_at, z.status as zona_status,
       bt.waktu as baterai_terakhir_at, bt.baterai as baterai_nilai,
       sg.waktu as sinyal_terakhir_at, sg.status as sinyal_status,
       coalesce(m.n, 0)::int as alarm_menunggu
  from public.gelang_unit g
  left join public.master_upt u on u.kode = g.kode_upt
  left join public.master_inmates i on i.id = g.inmate_id
  left join lateral (select a.waktu, a.status from public.gelang_alarm a
                      where a.unit_kode = g.kode_unit and a.jenis = 'Keluar zona' order by a.waktu desc limit 1) z on true
  left join lateral (select a.waktu, a.baterai from public.gelang_alarm a
                      where a.unit_kode = g.kode_unit and a.baterai is not null order by a.waktu desc limit 1) bt on true
  left join lateral (select a.waktu, a.status from public.gelang_alarm a
                      where a.unit_kode = g.kode_unit and a.jenis = 'Sinyal terputus' order by a.waktu desc limit 1) sg on true
  left join lateral (select count(*) as n from public.gelang_alarm a
                      where a.unit_kode = g.kode_unit and a.status = 'Menunggu') m on true;
grant select on public.v_gelang_unit_status to authenticated;

-- ---------- 6. Hasil ketahanan pangan ---------------------------------------------------------------------
create table if not exists public.hasil_pangan (
  id           uuid primary key default gen_random_uuid(),
  kode_upt     text not null default 'UPT' references public.master_upt (kode),
  activity_id  uuid references public.activities (id) on delete set null,
  jenis        public.activity_type not null,
  komoditas    text not null check (char_length(btrim(komoditas)) between 2 and 100),
  tanggal      date not null default current_date,
  volume       numeric(12, 2) not null check (volume >= 0),
  satuan       text not null check (satuan in ('kg', 'kwintal', 'ton', 'liter', 'ekor', 'butir')),
  luas_ha      numeric(10, 2) check (luas_ha is null or luas_ha >= 0),
  catatan      text check (catatan is null or char_length(catatan) <= 500),
  dicatat_oleh uuid not null default auth.uid() references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index if not exists hasil_pangan_upt_idx on public.hasil_pangan (kode_upt, tanggal desc);
create index if not exists hasil_pangan_activity_idx on public.hasil_pangan (activity_id);
create trigger hasil_pangan_default before insert on public.hasil_pangan for each row execute function private.set_upt_default();
alter table public.hasil_pangan enable row level security;
create policy hasil_pangan_select on public.hasil_pangan for select to authenticated using (private.can_view_berkas(kode_upt));
create policy hasil_pangan_insert on public.hasil_pangan for insert to authenticated
  with check (private.bisa_kelola_upt(kode_upt) and dicatat_oleh = (select auth.uid()));
create policy hasil_pangan_update on public.hasil_pangan for update to authenticated
  using (private.bisa_kelola_upt(kode_upt)) with check (private.bisa_kelola_upt(kode_upt));
create policy hasil_pangan_delete on public.hasil_pangan for delete to authenticated using (private.bisa_kelola_upt(kode_upt));
revoke all on public.hasil_pangan from anon;
revoke truncate, references, trigger on public.hasil_pangan from authenticated;
grant select, insert, update, delete on public.hasil_pangan to authenticated;

create or replace view public.v_hasil_pangan with (security_invoker = true) as
select h.id, h.kode_upt, u.nama as upt_nama, k.id as kanwil_id, k.nama as kanwil_nama, h.activity_id,
       h.jenis, h.komoditas, h.tanggal, h.volume, h.satuan, h.luas_ha, h.catatan, h.created_at
  from public.hasil_pangan h
  join public.master_upt u on u.kode = h.kode_upt
  left join public.master_kanwil k on k.id = u.kanwil_id;
grant select on public.v_hasil_pangan to authenticated;

-- ---------- 7. Portal berita -----------------------------------------------------------------------------
create table if not exists public.berita_pangan (
  id          uuid primary key default gen_random_uuid(),
  kode_upt    text references public.master_upt (kode),
  kategori    text not null check (kategori in ('Panen', 'Program', 'Kunjungan', 'Capaian', 'Pengumuman')),
  judul       text not null check (char_length(btrim(judul)) between 5 and 200),
  ringkasan   text check (ringkasan is null or char_length(ringkasan) <= 400),
  isi         text not null check (char_length(btrim(isi)) between 10 and 8000),
  tanggal     date not null default current_date,
  foto_path   text,
  diterbitkan boolean not null default true,
  penulis     uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists berita_tanggal_idx on public.berita_pangan (tanggal desc, created_at desc);
create index if not exists berita_upt_idx on public.berita_pangan (kode_upt);

create or replace function private.bisa_kelola_berita(p_upt text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case (select private.app_role())
    when 'administrator' then true
    when 'operator' then p_upt is not null and private.my_upt() = private.norm_upt(p_upt)
    else false end
$$;
revoke all on function private.bisa_kelola_berita(text) from public, anon;
grant execute on function private.bisa_kelola_berita(text) to authenticated;

alter table public.berita_pangan enable row level security;
create policy berita_select on public.berita_pangan for select to authenticated
  using ((select private.app_role()) is not null and (diterbitkan or private.bisa_kelola_berita(kode_upt)));
create policy berita_insert on public.berita_pangan for insert to authenticated
  with check (private.bisa_kelola_berita(kode_upt) and penulis = (select auth.uid()));
create policy berita_update on public.berita_pangan for update to authenticated
  using (private.bisa_kelola_berita(kode_upt)) with check (private.bisa_kelola_berita(kode_upt));
create policy berita_delete on public.berita_pangan for delete to authenticated using (private.bisa_kelola_berita(kode_upt));
revoke all on public.berita_pangan from anon;
revoke truncate, references, trigger on public.berita_pangan from authenticated;
grant select, insert, update, delete on public.berita_pangan to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pas-siaga-berita', 'pas-siaga-berita', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists berita_obj_select on storage.objects;
create policy berita_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'pas-siaga-berita' and (select private.app_role()) is not null);
drop policy if exists berita_obj_insert on storage.objects;
create policy berita_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pas-siaga-berita'
    and ((select private.app_role()) = 'administrator'
         or ((select private.app_role()) = 'operator' and private.bisa_kelola_berita((storage.foldername(name))[1]))));
drop policy if exists berita_obj_delete on storage.objects;
create policy berita_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pas-siaga-berita'
    and ((select private.app_role()) = 'administrator'
         or ((select private.app_role()) = 'operator' and private.bisa_kelola_berita((storage.foldername(name))[1]))));
