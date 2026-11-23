-- 15: rencana kegiatan dapat dilihat semua peran (tanpa mengubah), dokumen sesi dapat dibuka pemantau,
--     dan kop surat UPT yang seluruh barisnya dapat diisi manual.

-- 1. Kop surat: semua baris bisa diisi sendiri oleh UPT. Kolom kop_baris kosong = pakai susunan baku.
alter table public.master_upt add column if not exists kop_baris text[];
alter table public.master_upt add column if not exists website   text;
alter table public.master_upt add column if not exists faksimile text;
alter table public.master_upt add column if not exists kode_pos  text;
alter table public.master_upt drop constraint if exists master_upt_kop_baris_check;
alter table public.master_upt add constraint master_upt_kop_baris_check
  check (kop_baris is null or cardinality(kop_baris) <= 8);

create or replace function public.ubah_kop_upt_lengkap(
  p_kode text, p_baris text[], p_alamat text, p_telepon text, p_faks text,
  p_email text, p_website text, p_kodepos text, p_kota text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := (select private.app_role());
  v_baris text[];
begin
  if not (v_role = 'administrator'
          or (v_role in ('ka_upt', 'operator', 'kepala_pengamanan') and private.my_upt() = private.norm_upt(p_kode))) then
    raise exception 'Kop surat hanya bisa diubah oleh UPT yang bersangkutan atau Administrator.' using errcode = '42501';
  end if;
  select coalesce(array_agg(left(btrim(b), 150) order by n), '{}') into v_baris
    from unnest(coalesce(p_baris, '{}')) with ordinality as t(b, n) where btrim(coalesce(b, '')) <> '';
  if cardinality(v_baris) > 8 then raise exception 'Kop surat paling banyak 8 baris judul.' using errcode = '22023'; end if;
  update public.master_upt
     set kop_baris    = case when cardinality(v_baris) = 0 then null else v_baris end,
         alamat       = nullif(left(btrim(coalesce(p_alamat, '')), 300), ''),
         telepon      = nullif(left(btrim(coalesce(p_telepon, '')), 80), ''),
         faksimile    = nullif(left(btrim(coalesce(p_faks, '')), 80), ''),
         email_kantor = nullif(left(btrim(coalesce(p_email, '')), 120), ''),
         website      = nullif(left(btrim(coalesce(p_website, '')), 120), ''),
         kode_pos     = nullif(left(btrim(coalesce(p_kodepos, '')), 10), ''),
         kota_ttd     = nullif(left(btrim(coalesce(p_kota, '')), 80), '')
   where kode = private.norm_upt(p_kode);
  if not found then raise exception 'UPT tidak ditemukan.' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.ubah_kop_upt_lengkap(text, text[], text, text, text, text, text, text, text) from public, anon;
grant execute on function public.ubah_kop_upt_lengkap(text, text[], text, text, text, text, text, text, text) to authenticated;

-- 2. Dokumen sesi (surat perintah, rencana pengamanan) dapat dibuka semua peran yang berhak melihat sesinya.
drop policy if exists docs_select on storage.objects;
create policy docs_select on storage.objects for select to authenticated
  using (bucket_id = 'pas-siaga-documents'
         and (select private.app_role()) in ('administrator', 'pemantau_pusat', 'pemantau_kanwil', 'ka_upt', 'operator', 'kepala_pengamanan')
         and private.can_view_session_text((storage.foldername(name))[1]));

-- 3. Daftar rencana kegiatan untuk semua peran (hanya baca; hak lihat mengikuti RLS tabel asal).
create or replace view public.v_rencana_kegiatan with (security_invoker = true) as
select a.id as activity_id, a.kode_kegiatan, a.jenis_kegiatan, a.kode_upt, u.nama as upt_nama,
       u.kanwil_id, k.nama as kanwil_nama, a.lokasi_id, l.nama as lokasi_nama,
       a.tanggal_mulai, a.rencana_berakhir, a.luas_lahan_ha, a.nomor_surat_perintah, a.nomor_persetujuan,
       a.latihan, a.created_at,
       coalesce(s.jumlah, 0)::int as jumlah_sesi, s.tanggal_terakhir, s.sesi_terakhir_id,
       s.surat_sesi_id, s.rencana_sesi_id,
       coalesce(s.jumlah_surat, 0)::int as jumlah_surat, coalesce(s.jumlah_rencana, 0)::int as jumlah_rencana
  from public.activities a
  left join public.master_upt u on u.kode = a.kode_upt
  left join public.master_kanwil k on k.id = u.kanwil_id
  left join public.master_locations l on l.id = a.lokasi_id
  left join lateral (
    select count(*) as jumlah, max(d.tanggal_sesi) as tanggal_terakhir,
           (array_agg(d.id order by d.tanggal_sesi desc))[1] as sesi_terakhir_id,
           (array_agg(d.id order by d.tanggal_sesi desc) filter (where d.dokumen_surat_perintah is not null))[1] as surat_sesi_id,
           (array_agg(d.id order by d.tanggal_sesi desc) filter (where d.dokumen_rencana_pengamanan is not null))[1] as rencana_sesi_id,
           count(*) filter (where d.dokumen_surat_perintah is not null) as jumlah_surat,
           count(*) filter (where d.dokumen_rencana_pengamanan is not null) as jumlah_rencana
      from public.daily_sessions d where d.activity_id = a.id) s on true;
grant select on public.v_rencana_kegiatan to authenticated;
