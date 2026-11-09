-- 08: memperketat perubahan profil.
-- 1) Operator, Kepala, dan Pengawal tidak bisa memindahkan UPT-nya sendiri (atau UPT akun lain) dan tidak bisa menonaktifkan dirinya.
-- 2) Saat Administrator memindahkan UPT akun, Kanwil akun ikut mengikuti UPT baru.
-- 3) Peran UPT wajib punya UPT terdaftar, dan Pemantau Kanwil wajib punya Kanwil.
create or replace function private.guard_profiles()
returns trigger
language plpgsql
set search_path = ''
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
      if new.kode_upt is not null and new.kode_upt is distinct from old.kode_upt then
        if not exists (select 1 from public.master_upt u where u.kode = private.norm_upt(new.kode_upt)) then
          raise exception 'Kode UPT belum terdaftar di data induk UPT.' using errcode = '22023';
        end if;
        new.kode_upt := private.norm_upt(new.kode_upt);
      end if;

      if new.role in ('operator', 'kepala_pengamanan', 'pengawal') then
        if (new.role is distinct from old.role or new.kode_upt is distinct from old.kode_upt)
           and (new.kode_upt is null
                or not exists (select 1 from public.master_upt u where u.kode = private.norm_upt(new.kode_upt))) then
          raise exception 'UPT wajib dipilih dari data induk UPT untuk peran ini.' using errcode = '22023';
        end if;
        if new.role is distinct from old.role or new.kode_upt is distinct from old.kode_upt then
          new.kanwil_id := (select u.kanwil_id from public.master_upt u where u.kode = private.norm_upt(new.kode_upt));
        end if;
      elsif new.role = 'pemantau_kanwil' then
        if (new.role is distinct from old.role or new.kanwil_id is distinct from old.kanwil_id) and new.kanwil_id is null then
          raise exception 'Kanwil wajib dipilih untuk Pemantau Kanwil.' using errcode = '22023';
        end if;
      end if;
      return new;
    end if;

    if new.role is distinct from old.role or new.kanwil_id is distinct from old.kanwil_id then
      raise exception 'Peran dan wilayah tidak bisa diubah dari aplikasi.' using errcode = '42501';
    end if;
    if new.kode_upt is distinct from old.kode_upt then
      raise exception 'UPT akun hanya bisa diubah oleh Administrator.' using errcode = '42501';
    end if;
    if new.is_active is distinct from old.is_active
       and (v_role is distinct from 'operator' or old.id = (select auth.uid())) then
      raise exception 'Status aktif hanya bisa diubah Operator untuk akun Pengawal UPT-nya.' using errcode = '42501';
    end if;
    if new.nip is distinct from old.nip and v_role is distinct from 'operator' then
      raise exception 'Hanya Operator yang boleh mengubah NIP.' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
