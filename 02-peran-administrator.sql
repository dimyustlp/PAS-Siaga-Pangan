-- =====================================================================
-- PAS-SIAGA Pangan | MIGRASI 02: peran Administrator
-- Dijalankan di proyek yang sudah memakai 01-skema-pas-siaga-pangan.sql.
--
-- Administrator: melihat semua data, mengelola akun (peran, aktif/nonaktif, NIP, kode UPT)
-- dan data induk (lokasi, warga binaan). TIDAK ikut memutus: keputusan kesiapan, verifikasi
-- gangguan, penurunan status, dan penutupan tetap hanya milik Kepala Pengamanan.
-- Administrator juga tidak mengirim entri lapangan dan tidak menyiapkan kegiatan/sesi (tugas Operator).
-- Administrator tidak bisa mengubah peran atau menonaktifkan akunnya sendiri.
--
-- DUA BAGIAN. Jalankan BAGIAN A sendiri dulu sampai selesai, baru BAGIAN B.
-- (Postgres tidak mengizinkan nilai enum baru dipakai di transaksi yang sama dengan penambahannya.)
-- =====================================================================

-- ======================= BAGIAN A =======================
alter type public.user_role add value if not exists 'administrator';

-- ======================= BAGIAN B =======================

-- Penjaga tabel profiles: Administrator boleh mengatur akun lain.
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
      return new;
    end if;
    if new.role is distinct from old.role then
      raise exception 'Peran tidak bisa diubah dari aplikasi.' using errcode = '42501';
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

-- Profil otomatis saat akun dibuat: peran dibaca dari app_metadata (hanya bisa diisi server/admin).
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  v_role := case
    when new.raw_app_meta_data->>'role' in ('administrator', 'operator', 'pengawal', 'kepala_pengamanan')
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

-- Cek rekonsiliasi (hanya membaca): Administrator boleh melihat.
create or replace function public.rekonsiliasi_sesi(p_session uuid)
returns jsonb
language plpgsql stable set search_path = ''
as $$
begin
  if (select private.app_role()) is null
     or (select private.app_role()) = 'pengawal' then
    raise exception 'Tidak berwenang.' using errcode = '42501';
  end if;
  return private.hitung_rekonsiliasi(p_session);
end
$$;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid())
         or (select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan'));
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
  using ((select private.app_role()) = 'administrator')
  with check ((select private.app_role()) = 'administrator');

-- master_locations (baca sudah terbuka untuk semua peran)
drop policy if exists locations_insert on public.master_locations;
create policy locations_insert on public.master_locations for insert to authenticated
  with check ((select private.app_role()) in ('administrator', 'operator'));
drop policy if exists locations_update on public.master_locations;
create policy locations_update on public.master_locations for update to authenticated
  using ((select private.app_role()) in ('administrator', 'operator'))
  with check ((select private.app_role()) in ('administrator', 'operator'));
drop policy if exists locations_delete on public.master_locations;
create policy locations_delete on public.master_locations for delete to authenticated
  using ((select private.app_role()) in ('administrator', 'operator'));

-- master_inmates
drop policy if exists inmates_select on public.master_inmates;
create policy inmates_select on public.master_inmates for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan'));
drop policy if exists inmates_insert on public.master_inmates;
create policy inmates_insert on public.master_inmates for insert to authenticated
  with check ((select private.app_role()) in ('administrator', 'operator'));
drop policy if exists inmates_update on public.master_inmates;
create policy inmates_update on public.master_inmates for update to authenticated
  using ((select private.app_role()) in ('administrator', 'operator'))
  with check ((select private.app_role()) in ('administrator', 'operator'));
drop policy if exists inmates_delete on public.master_inmates;
create policy inmates_delete on public.master_inmates for delete to authenticated
  using ((select private.app_role()) in ('administrator', 'operator'));

-- Hak baca untuk data operasional
drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
         or private.pengawal_in_activity(id));

drop policy if exists sessions_select on public.daily_sessions;
create policy sessions_select on public.daily_sessions for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
         or private.pengawal_in_session(id));

drop policy if exists field_logs_select on public.field_logs;
create policy field_logs_select on public.field_logs for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
         or private.pengawal_in_session(session_id));

drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
         or private.pengawal_in_session(session_id));

drop policy if exists decisions_select on public.decisions;
create policy decisions_select on public.decisions for select to authenticated
  using ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
         or private.pengawal_in_session(session_id));

-- Storage: Administrator boleh membaca dokumen dan bukti
drop policy if exists docs_select on storage.objects;
create policy docs_select on storage.objects for select to authenticated
  using (bucket_id = 'pas-siaga-documents'
         and (select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan'));

drop policy if exists evidence_select on storage.objects;
create policy evidence_select on storage.objects for select to authenticated
  using (bucket_id = 'pas-siaga-evidence'
         and ((select private.app_role()) in ('administrator', 'operator', 'kepala_pengamanan')
              or private.pengawal_in_session_text((storage.foldername(name))[1])));
