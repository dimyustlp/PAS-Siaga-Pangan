-- Operator UPT boleh membuat dan mengelola akun Ka.UPT, Kepala Pengamanan, dan Pengawal
-- hanya untuk UPT-nya sendiri. Tidak bisa membuat Operator lain, dan tidak bisa menyentuh UPT lain.

create or replace function private.boleh_kelola(p_role user_role, p_upt text, p_kanwil uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case (select private.app_role())
    when 'administrator' then true
    when 'pemantau_pusat' then p_role is distinct from 'administrator'
    when 'pemantau_kanwil' then p_role in ('ka_upt', 'kepala_pengamanan', 'operator', 'pengawal')
         and exists (select 1 from public.master_upt u where u.kode = private.norm_upt(p_upt) and u.kanwil_id = private.my_kanwil())
    when 'operator' then p_role in ('ka_upt', 'kepala_pengamanan', 'pengawal')
         and private.norm_upt(p_upt) = (select private.my_upt())
    else false end
$$;

create or replace function public.kelola_buat_akun(p_email text, p_password text, p_nama text, p_nip text, p_role user_role, p_kode_upt text, p_kanwil uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_kanwil uuid := p_kanwil; v_upt text := p_kode_upt;
begin
  if (select private.app_role()) not in ('administrator', 'pemantau_pusat', 'pemantau_kanwil', 'operator') then
    raise exception 'Anda tidak berwenang membuat akun.' using errcode = '42501';
  end if;
  if (select private.app_role()) = 'pemantau_kanwil' then v_kanwil := null; end if;
  if (select private.app_role()) = 'operator' then
    v_kanwil := null;
    v_upt := (select private.my_upt());
    if p_role not in ('ka_upt', 'kepala_pengamanan', 'pengawal') then
      raise exception 'Operator UPT hanya bisa membuat akun Ka.UPT, Kepala Pengamanan, dan Pengawal.' using errcode = '42501';
    end if;
  end if;
  if p_role in ('ka_upt', 'kepala_pengamanan', 'operator', 'pengawal') then v_kanwil := null; end if;
  if not private.boleh_kelola(p_role, v_upt, v_kanwil) then
    raise exception 'Peran atau UPT ini di luar wewenang Anda.' using errcode = '42501';
  end if;
  v_id := private.buat_akun_core(p_email, p_password, p_nama, p_nip, p_role,
            case when p_role in ('ka_upt', 'kepala_pengamanan', 'operator', 'pengawal') then v_upt end, v_kanwil, (select auth.uid()));
  insert into public.audit_events (aktor_id, aktor_nama, aksi, sasaran_id, sasaran_nama, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())), 'Akun dibuat', v_id, btrim(p_nama),
          jsonb_build_object('peran', p_role, 'upt', v_upt));
  return v_id;
end $$;

create or replace function public.kelola_daftar_akun()
returns table(id uuid, email text, full_name text, nip text, role user_role, kode_upt text, kanwil_id uuid, is_active boolean, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_role public.user_role := (select private.app_role());
begin
  if v_role not in ('administrator', 'pemantau_pusat', 'pemantau_kanwil', 'operator') then
    raise exception 'Anda tidak berwenang mengelola akun.' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.nip, p.role, p.kode_upt, p.kanwil_id, p.is_active, u.last_sign_in_at, p.created_at
      from public.profiles p join auth.users u on u.id = p.id
     where v_role in ('administrator', 'pemantau_pusat')
        or (v_role = 'pemantau_kanwil'
            and p.role in ('ka_upt', 'kepala_pengamanan', 'operator', 'pengawal')
            and exists (select 1 from public.master_upt m where m.kode = private.norm_upt(p.kode_upt) and m.kanwil_id = private.my_kanwil()))
        or (v_role = 'operator'
            and p.role in ('ka_upt', 'kepala_pengamanan', 'pengawal')
            and private.norm_upt(p.kode_upt) = (select private.my_upt()))
     order by p.full_name;
end $$;
