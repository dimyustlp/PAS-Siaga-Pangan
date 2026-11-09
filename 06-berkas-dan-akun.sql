-- 06: penampungan berkas per UPT/Kanwil, tautan Google Form per Kanwil, dan pengelolaan akun oleh Administrator.

-- 1. Tautan penampungan Google Form dan folder Drive per Kanwil
alter table public.master_kanwil add column if not exists tautan_form   text;
alter table public.master_kanwil add column if not exists tautan_folder text;

-- 2. Hak lihat berkas: sama dengan hak lihat UPT, ditambah Pengawal untuk UPT-nya sendiri
create or replace function private.can_view_berkas(p_upt text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_view_upt(p_upt)
      or ((select private.app_role()) = 'pengawal' and private.my_upt() = private.norm_upt(p_upt))
$$;
revoke all on function private.can_view_berkas(text) from public, anon;
grant execute on function private.can_view_berkas(text) to authenticated;

-- 3. Tabel berkas
create table if not exists public.berkas (
  id            uuid primary key default gen_random_uuid(),
  kode_upt      text not null references public.master_upt(kode),
  kategori      text not null check (kategori in (
                  'Surat Perintah', 'Rencana Pengamanan', 'Daftar Nominatif', 'Laporan Kegiatan',
                  'Berita Acara', 'Dokumentasi', 'Data Dukung', 'Lainnya')),
  judul         text not null check (char_length(btrim(judul)) between 3 and 200),
  keterangan    text check (char_length(keterangan) <= 1000),
  tanggal       date not null default current_date,
  sumber        text not null check (sumber in ('unggah', 'tautan')),
  storage_path  text,
  nama_berkas   text,
  ukuran_byte   bigint check (ukuran_byte is null or ukuran_byte >= 0),
  mime          text,
  tautan        text check (tautan is null or tautan ~* '^https://'),
  diunggah_oleh uuid not null default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now(),
  constraint berkas_sumber_ok check (
    (sumber = 'unggah' and storage_path is not null)
    or (sumber = 'tautan' and tautan is not null))
);
create index if not exists berkas_upt_idx on public.berkas (kode_upt, tanggal desc);
create index if not exists berkas_kategori_idx on public.berkas (kategori);

alter table public.berkas enable row level security;

drop policy if exists berkas_select on public.berkas;
create policy berkas_select on public.berkas for select to authenticated
  using (private.can_view_berkas(kode_upt));

drop policy if exists berkas_insert on public.berkas;
create policy berkas_insert on public.berkas for insert to authenticated
  with check (
    (select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
    and private.can_view_upt(kode_upt)
    and diunggah_oleh = (select auth.uid()));

drop policy if exists berkas_delete on public.berkas;
create policy berkas_delete on public.berkas for delete to authenticated
  using (
    (select private.app_role()) = 'administrator'
    or ((select private.app_role()) = 'operator' and private.can_view_upt(kode_upt)));

grant select, insert, delete on public.berkas to authenticated;

-- 4. Tampilan gabungan dengan UPT dan Kanwil (mengikuti RLS pemanggil)
create or replace view public.v_berkas with (security_invoker = true) as
select b.id, b.kode_upt, u.nama as upt_nama, k.id as kanwil_id, k.nama as kanwil_nama,
       b.kategori, b.judul, b.keterangan, b.tanggal, b.sumber, b.nama_berkas, b.ukuran_byte,
       b.tautan, b.diunggah_oleh, p.full_name as pengunggah, b.created_at
  from public.berkas b
  join public.master_upt u on u.kode = b.kode_upt
  left join public.master_kanwil k on k.id = u.kanwil_id
  left join public.profiles p on p.id = b.diunggah_oleh;
grant select on public.v_berkas to authenticated;

-- 5. Penyimpanan berkas
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pas-siaga-berkas', 'pas-siaga-berkas', false, 20971520,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

drop policy if exists berkas_obj_select on storage.objects;
create policy berkas_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'pas-siaga-berkas' and private.can_view_berkas((storage.foldername(name))[1]));

drop policy if exists berkas_obj_insert on storage.objects;
create policy berkas_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pas-siaga-berkas'
    and (select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
    and private.can_view_upt((storage.foldername(name))[1]));

drop policy if exists berkas_obj_delete on storage.objects;
create policy berkas_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pas-siaga-berkas'
    and ((select private.app_role()) = 'administrator'
         or ((select private.app_role()) = 'operator' and private.can_view_upt((storage.foldername(name))[1]))));

-- 6. Pengelolaan akun (hanya Administrator)
create or replace function public.admin_daftar_akun()
returns table (id uuid, email text, full_name text, nip text, role public.user_role, kode_upt text,
               kanwil_id uuid, is_active boolean, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh melihat daftar akun.' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.nip, p.role, p.kode_upt, p.kanwil_id, p.is_active,
           u.last_sign_in_at, p.created_at
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.full_name;
end
$$;

create or replace function public.admin_ubah_akun(p_id uuid, p_nama text, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_nama  text := btrim(coalesce(p_nama, ''));
  v_lama  text;
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh mengubah akun.' using errcode = '42501';
  end if;
  if v_nama = '' then raise exception 'Nama lengkap wajib diisi.' using errcode = '22023'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Alamat email tidak valid.' using errcode = '22023'; end if;
  select email into v_lama from auth.users where id = p_id;
  if not found then raise exception 'Akun tidak ditemukan.' using errcode = 'P0002'; end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email and u.id <> p_id) then
    raise exception 'Email ini sudah dipakai akun lain.' using errcode = '23505';
  end if;

  update public.profiles set full_name = v_nama where id = p_id;
  if lower(v_lama) is distinct from v_email then
    update auth.users set email = v_email, updated_at = now() where id = p_id;
    update auth.identities
       set identity_data = identity_data || jsonb_build_object('email', v_email), updated_at = now()
     where user_id = p_id and provider = 'email';
    insert into public.audit_events (aktor_id, aktor_nama, aksi, sasaran_id, sasaran_nama, detail)
    values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())),
            'Email akun diubah', p_id, v_nama, jsonb_build_object('email', jsonb_build_array(v_lama, v_email)));
  end if;
end
$$;

create or replace function public.admin_hapus_akun(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text;
  v_role public.user_role;
  v_aktif boolean;
begin
  if (select private.app_role()) is distinct from 'administrator' then
    raise exception 'Hanya Administrator yang boleh menghapus akun.' using errcode = '42501';
  end if;
  if p_id = (select auth.uid()) then
    raise exception 'Akun sendiri tidak bisa dihapus.' using errcode = '42501';
  end if;
  select full_name, role, is_active into v_nama, v_role, v_aktif from public.profiles where id = p_id;
  if not found then raise exception 'Akun tidak ditemukan.' using errcode = 'P0002'; end if;
  if v_role = 'administrator' and v_aktif
     and (select count(*) from public.profiles where role = 'administrator' and is_active) <= 1 then
    raise exception 'Administrator aktif terakhir tidak bisa dihapus.' using errcode = '42501';
  end if;

  begin
    delete from auth.users where id = p_id;
  exception when foreign_key_violation then
    raise exception 'Akun ini sudah punya catatan di sistem (kegiatan atau berkas), jadi tidak dihapus demi jejak audit. Nonaktifkan saja.' using errcode = '23503';
  end;

  insert into public.audit_events (aktor_id, aktor_nama, aksi, sasaran_id, sasaran_nama, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())),
          'Akun dihapus', p_id, v_nama, jsonb_build_object('peran', v_role));
end
$$;

revoke all on function public.admin_daftar_akun() from public, anon;
revoke all on function public.admin_ubah_akun(uuid, text, text) from public, anon;
revoke all on function public.admin_hapus_akun(uuid) from public, anon;
grant execute on function public.admin_daftar_akun() to authenticated;
grant execute on function public.admin_ubah_akun(uuid, text, text) to authenticated;
grant execute on function public.admin_hapus_akun(uuid) to authenticated;
