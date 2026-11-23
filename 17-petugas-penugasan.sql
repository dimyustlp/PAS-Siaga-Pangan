-- 17: (a) nama petugas pengawal wajib dicatat sebelum berkas diunggah (satu akun dipakai banyak petugas),
--     (b) Operator UPT dapat mengubah penugasan pengawal pada sesi selama belum ditutup,
--     (c) perbaikan: sesi baru tidak bisa dibuat karena aturan baca memeriksa baris yang baru dimasukkan.

-- (c) Aturan baca sesi lewat kegiatan induk.
create or replace function private.can_view_activity_upt(p_activity uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.activities a where a.id = p_activity and private.can_view_upt(a.kode_upt))
$$;
revoke all on function private.can_view_activity_upt(uuid) from public, anon;
grant execute on function private.can_view_activity_upt(uuid) to authenticated;
drop policy if exists sessions_select on public.daily_sessions;
create policy sessions_select on public.daily_sessions for select to authenticated
  using (private.can_view_activity_upt(activity_id) or private.pengawal_in_session(id));

-- (a) Petugas pengawal per sesi.
create table if not exists public.petugas_sesi (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.daily_sessions(id) on delete cascade,
  nama        text not null check (char_length(btrim(nama)) between 3 and 120),
  nip         text check (nip is null or char_length(nip) <= 30),
  seksi       text check (seksi is null or char_length(seksi) <= 120),
  dicatat_oleh uuid default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now()
);
create unique index if not exists petugas_sesi_unik on public.petugas_sesi (session_id, lower(btrim(nama)));
alter table public.petugas_sesi enable row level security;
drop policy if exists petugas_sesi_select on public.petugas_sesi;
create policy petugas_sesi_select on public.petugas_sesi for select to authenticated
  using (private.can_view_session(session_id));
revoke insert, update, delete on public.petugas_sesi from authenticated, anon;
grant select on public.petugas_sesi to authenticated;

create or replace function public.catat_petugas_sesi(p_session uuid, p_nama text, p_nip text default null, p_seksi text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_nama text := regexp_replace(btrim(coalesce(p_nama, '')), '\s+', ' ', 'g');
begin
  if not private.pengawal_can_log(p_session) then
    raise exception 'Ditolak: sesi belum diizinkan mulai, sudah ditutup, atau Anda bukan pengawal sesi ini.' using errcode = '42501';
  end if;
  if char_length(v_nama) < 3 then raise exception 'Nama petugas wajib diisi lengkap (minimal 3 huruf).' using errcode = '22023'; end if;
  if (select count(*) from public.petugas_sesi where session_id = p_session) >= 20 then
    raise exception 'Petugas pada sesi ini sudah mencapai batas 20 orang.' using errcode = '22023';
  end if;
  insert into public.petugas_sesi (session_id, nama, nip, seksi)
  values (p_session, left(v_nama, 120), nullif(left(btrim(coalesce(p_nip, '')), 30), ''), nullif(left(btrim(coalesce(p_seksi, '')), 120), ''))
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Nama petugas ini sudah tercatat pada sesi.' using errcode = '22023';
end $$;
revoke all on function public.catat_petugas_sesi(uuid, text, text, text) from public, anon;
grant execute on function public.catat_petugas_sesi(uuid, text, text, text) to authenticated;

create or replace function public.hapus_petugas_sesi(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  select * into r from public.petugas_sesi where id = p_id;
  if not found then raise exception 'Petugas tidak ditemukan.' using errcode = 'P0002'; end if;
  if not private.pengawal_can_log(r.session_id) then
    raise exception 'Ditolak: sesi belum diizinkan mulai, sudah ditutup, atau Anda bukan pengawal sesi ini.' using errcode = '42501';
  end if;
  if exists (select 1 from public.tahap_pengawalan t where t.session_id = r.session_id and lower(btrim(t.isian->>'petugas')) = lower(btrim(r.nama))) then
    raise exception 'Petugas ini sudah tercatat melaksanakan tahap, jadi tidak bisa dihapus.' using errcode = '22023';
  end if;
  delete from public.petugas_sesi where id = p_id;
end $$;
revoke all on function public.hapus_petugas_sesi(uuid) from public, anon;
grant execute on function public.hapus_petugas_sesi(uuid) to authenticated;

-- Berkas persyaratan tidak boleh masuk sebelum ada petugas yang tercatat.
create or replace function private.wajib_petugas_lampiran() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.petugas_sesi p where p.session_id = new.session_id) then
    raise exception 'Catat dulu nama petugas pengawal pada sesi ini sebelum mengunggah berkas.' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists lampiran_wajib_petugas on public.lampiran_tahap;
create trigger lampiran_wajib_petugas before insert on public.lampiran_tahap for each row execute function private.wajib_petugas_lampiran();

-- Setiap tahap harus menyebut petugas pelaksananya (salah satu yang tercatat).
create or replace function private.wajib_petugas_tahap() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.petugas_sesi p where p.session_id = new.session_id and lower(btrim(p.nama)) = lower(btrim(coalesce(new.isian->>'petugas', '')))) then
    raise exception 'Pilih petugas pelaksana tahap ini dari daftar petugas yang tercatat.' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists tahap_wajib_petugas on public.tahap_pengawalan;
create trigger tahap_wajib_petugas before insert on public.tahap_pengawalan for each row execute function private.wajib_petugas_tahap();

-- (b) Penugasan pengawal dapat diubah Operator UPT selama sesi belum ditutup.
create or replace function public.ubah_penugasan_sesi(p_session uuid, p_petugas uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_upt text; v_ids uuid[];
begin
  if (select private.app_role()) is distinct from 'operator' then
    raise exception 'Hanya Operator UPT yang dapat menugaskan pengawal.' using errcode = '42501';
  end if;
  select a.kode_upt into v_upt from public.daily_sessions s join public.activities a on a.id = s.activity_id
   where s.id = p_session and s.ditutup_at is null;
  if v_upt is null then raise exception 'Sesi tidak ditemukan atau sudah ditutup.' using errcode = 'P0002'; end if;
  if private.my_upt() is distinct from private.norm_upt(v_upt) then
    raise exception 'Sesi ini milik UPT lain.' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_petugas, '{}')) x;
  if cardinality(v_ids) = 0 then raise exception 'Pilih minimal satu pengawal.' using errcode = '22023'; end if;
  if cardinality(v_ids) > 20 then raise exception 'Maksimal 20 pengawal.' using errcode = '22023'; end if;
  update public.daily_sessions set petugas_ids = v_ids where id = p_session;
end $$;
revoke all on function public.ubah_penugasan_sesi(uuid, uuid[]) from public, anon;
grant execute on function public.ubah_penugasan_sesi(uuid, uuid[]) to authenticated;
