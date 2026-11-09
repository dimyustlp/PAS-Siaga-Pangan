-- 07: penerima alarm gelang (notifikasi dari sistem pemantauan gelang) dan konfirmasi oleh petugas.
-- Sistem ini hanya MENERIMA alarm. Tidak ada pemantauan posisi terus-menerus.

-- 1. Tabel
create table public.gelang_unit (
  id         uuid primary key default gen_random_uuid(),
  kode_upt   text not null references public.master_upt(kode),
  kode_unit  text not null unique check (kode_unit ~ '^[A-Za-z0-9-]{1,30}$'),
  nama_unit  text check (nama_unit is null or char_length(nama_unit) <= 150),
  inmate_id  uuid references public.master_inmates(id) on delete set null,
  aktif      boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.gelang_alarm (
  id                uuid primary key default gen_random_uuid(),
  kode_upt          text references public.master_upt(kode),
  session_id        uuid references public.daily_sessions(id) on delete set null,
  unit_nama         text not null check (char_length(unit_nama) between 1 and 200),
  unit_kode         text,
  inmate_id         uuid references public.master_inmates(id) on delete set null,
  jenis             text not null check (jenis in ('Keluar zona', 'Perangkat dilepas atau dirusak', 'Baterai lemah', 'Sinyal terputus', 'Lainnya')),
  waktu             timestamptz not null default now(),
  lokasi            text check (lokasi is null or char_length(lokasi) <= 300),
  baterai           text check (baterai is null or char_length(baterai) <= 50),
  payload           jsonb not null default '{}'::jsonb,
  status            text not null default 'Menunggu' check (status in ('Menunggu', 'Dikonfirmasi', 'Bukan gangguan')),
  dikonfirmasi_oleh uuid references public.profiles(id),
  dikonfirmasi_at   timestamptz,
  tindakan          text check (tindakan is null or char_length(tindakan) <= 1000),
  created_at        timestamptz not null default now()
);
create index gelang_alarm_status_idx on public.gelang_alarm (status, created_at desc);
create index gelang_alarm_upt_idx on public.gelang_alarm (kode_upt, created_at desc);

-- Satu baris; hanya sidik jari (SHA-256) kunci yang disimpan. Tanpa kebijakan RLS: diakses lewat fungsi saja.
create table public.pengaturan_gelang (
  id          boolean primary key default true check (id),
  kunci_hash  text not null,
  diatur_at   timestamptz not null default now(),
  diatur_oleh uuid references public.profiles(id)
);

alter table public.gelang_unit enable row level security;
alter table public.gelang_alarm enable row level security;
alter table public.pengaturan_gelang enable row level security;

create policy gelang_unit_select on public.gelang_unit for select to authenticated
  using (private.can_view_berkas(kode_upt));
create policy gelang_unit_write on public.gelang_unit for all to authenticated
  using ((select private.app_role()) in ('administrator', 'operator') and private.can_view_upt(kode_upt))
  with check ((select private.app_role()) in ('administrator', 'operator') and private.can_view_upt(kode_upt));
create policy gelang_alarm_select on public.gelang_alarm for select to authenticated
  using ((kode_upt is null and (select private.app_role()) = 'administrator')
      or (kode_upt is not null and private.can_view_berkas(kode_upt)));

grant select, insert, update, delete on public.gelang_unit to authenticated;
grant select on public.gelang_alarm to authenticated;

create view public.v_gelang_alarm with (security_invoker = true) as
select a.id, a.kode_upt, u.nama as upt_nama, a.session_id, ac.kode_kegiatan, a.unit_nama, a.unit_kode,
       a.inmate_id, i.nama as wb_nama, i.nomor_registrasi, a.jenis, a.waktu, a.lokasi, a.baterai, a.status,
       a.dikonfirmasi_oleh, p.full_name as dikonfirmasi_nama, a.dikonfirmasi_at, a.tindakan, a.created_at
  from public.gelang_alarm a
  left join public.master_upt u on u.kode = a.kode_upt
  left join public.daily_sessions s on s.id = a.session_id
  left join public.activities ac on ac.id = s.activity_id
  left join public.master_inmates i on i.id = a.inmate_id
  left join public.profiles p on p.id = a.dikonfirmasi_oleh;
grant select on public.v_gelang_alarm to authenticated;

alter publication supabase_realtime add table public.gelang_alarm;

-- 2. Fungsi
create or replace function public.admin_atur_kunci_gelang(p_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh mengatur kunci penerima.' using errcode = '42501';
  end if;
  if p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Format kunci tidak valid.' using errcode = '22023';
  end if;
  insert into public.pengaturan_gelang (id, kunci_hash, diatur_at, diatur_oleh)
  values (true, p_hash, now(), (select auth.uid()))
  on conflict (id) do update set kunci_hash = excluded.kunci_hash, diatur_at = now(), diatur_oleh = excluded.diatur_oleh;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Kunci penerima gelang diganti', '{}'::jsonb);
end
$$;

create or replace function public.admin_status_kunci_gelang()
returns timestamptz language plpgsql stable security definer set search_path = '' as $$
declare v timestamptz;
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh melihat pengaturan ini.' using errcode = '42501';
  end if;
  select diatur_at into v from public.pengaturan_gelang limit 1;
  return v;
end
$$;

-- Dipanggil tanpa login pengguna oleh /api/gelang/alarm; keamanannya ada pada kunci.
create or replace function public.terima_alarm_gelang(
  p_kunci text, p_unit text, p_jenis text, p_waktu timestamptz default null,
  p_lokasi text default null, p_baterai text default null, p_payload jsonb default '{}'::jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_hash   text;
  v_unit   text := left(btrim(coalesce(p_unit, '')), 200);
  v_kode   text;
  v_map    public.gelang_unit%rowtype;
  v_jenis  text;
  v_sesi   uuid;
  v_waktu  timestamptz := least(coalesce(p_waktu, now()), now());
  v_teks   text := lower(coalesce(p_jenis, ''));
begin
  select kunci_hash into v_hash from public.pengaturan_gelang where id;
  if v_hash is null or p_kunci is null
     or encode(extensions.digest(p_kunci, 'sha256'), 'hex') <> v_hash then
    raise exception 'Kunci tidak sah.' using errcode = '28000';
  end if;
  if v_unit = '' then
    raise exception 'Nama unit wajib diisi.' using errcode = '22023';
  end if;

  v_jenis := case
    when v_teks ~ 'lepas|rusak|tamper|strap|bongkar|sabot' then 'Perangkat dilepas atau dirusak'
    when v_teks ~ 'baterai|battery|batt|daya' then 'Baterai lemah'
    when v_teks ~ 'sinyal|signal|offline|putus|connection|koneksi|gsm|gps' then 'Sinyal terputus'
    when v_teks ~ 'zona|geofence|keluar|exit|area|batas' then 'Keluar zona'
    else 'Lainnya' end;

  v_kode := split_part(v_unit, '_', 1);
  select * into v_map from public.gelang_unit where kode_unit = v_kode and aktif;

  if exists (select 1 from public.gelang_alarm
              where unit_nama = v_unit and jenis = v_jenis and status = 'Menunggu'
                and created_at > now() - interval '5 minutes') then
    return 'duplikat';
  end if;

  if v_map.id is not null then
    select s.id into v_sesi
      from public.daily_sessions s
      join public.activities a on a.id = s.activity_id
     where a.kode_upt = v_map.kode_upt
       and s.status_kesiapan = 'Dapat Dimulai'
       and s.ditutup_at is null
       and s.pakai_gelang_monitor
     order by (v_map.inmate_id is not null and exists (
                 select 1 from public.session_inmates si
                  where si.session_id = s.id and si.inmate_id = v_map.inmate_id)) desc,
              s.tanggal_sesi desc
     limit 1;
  end if;

  insert into public.gelang_alarm (kode_upt, session_id, unit_nama, unit_kode, inmate_id, jenis, waktu, lokasi, baterai, payload)
  values (v_map.kode_upt, v_sesi, v_unit, nullif(v_kode, ''), v_map.inmate_id, v_jenis, v_waktu,
          left(nullif(btrim(coalesce(p_lokasi, '')), ''), 300),
          left(nullif(btrim(coalesce(p_baterai, '')), ''), 50),
          case when length(coalesce(p_payload, '{}'::jsonb)::text) > 4000 then '{}'::jsonb else coalesce(p_payload, '{}'::jsonb) end);

  return case when v_map.id is null then 'tercatat-tanpa-pemetaan' when v_sesi is null then 'tercatat-tanpa-sesi' else 'tercatat' end;
end
$$;

create or replace function public.konfirmasi_alarm_gelang(p_id uuid, p_status text, p_tindakan text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := (select private.app_role());
  v_a    public.gelang_alarm%rowtype;
begin
  if v_role is null or v_role not in ('pengawal', 'operator', 'kepala_pengamanan', 'administrator') then
    raise exception 'Peran Anda tidak boleh mengonfirmasi alarm gelang.' using errcode = '42501';
  end if;
  if p_status not in ('Dikonfirmasi', 'Bukan gangguan') then
    raise exception 'Pilih hasil konfirmasi.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_tindakan, ''))) < 3 then
    raise exception 'Tindakan atau keterangan konfirmasi wajib diisi.' using errcode = '22023';
  end if;
  select * into v_a from public.gelang_alarm where id = p_id;
  if not found then raise exception 'Alarm tidak ditemukan.' using errcode = '22023'; end if;
  if v_role <> 'administrator' and (v_a.kode_upt is null or not private.can_view_berkas(v_a.kode_upt)) then
    raise exception 'Alarm ini di luar cakupan Anda.' using errcode = '42501';
  end if;
  if v_a.status <> 'Menunggu' then
    raise exception 'Alarm ini sudah dikonfirmasi.' using errcode = '22023';
  end if;
  update public.gelang_alarm
     set status = p_status, tindakan = left(btrim(p_tindakan), 1000),
         dikonfirmasi_oleh = (select auth.uid()), dikonfirmasi_at = now()
   where id = p_id;
end
$$;

revoke all on function public.admin_atur_kunci_gelang(text) from public, anon;
revoke all on function public.admin_status_kunci_gelang() from public, anon;
revoke all on function public.konfirmasi_alarm_gelang(uuid, text, text) from public, anon;
grant execute on function public.admin_atur_kunci_gelang(text) to authenticated;
grant execute on function public.admin_status_kunci_gelang() to authenticated;
grant execute on function public.konfirmasi_alarm_gelang(uuid, text, text) to authenticated;
grant execute on function public.terima_alarm_gelang(text, text, text, timestamptz, text, text, jsonb) to anon, authenticated;
