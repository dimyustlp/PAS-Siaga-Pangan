-- 14: Hasil ketahanan pangan disesuaikan dengan laporan "Detail Ketahanan Pangan" pada SDP Ditjenpas.
-- Menambah nilai produksi (omset), jumlah WBP terlibat, dan premi pada catatan hasil, lalu menyediakan
-- satu fungsi rekap yang mengikuti hak akses pemanggil (RLS) untuk indikator, grafik bulanan, peta, dan peringkat.

alter table public.hasil_pangan
  add column if not exists nilai_rp numeric(16, 0) check (nilai_rp is null or nilai_rp >= 0),
  add column if not exists wbp_terlibat integer check (wbp_terlibat is null or wbp_terlibat >= 0),
  add column if not exists premi_rp numeric(16, 0) check (premi_rp is null or premi_rp >= 0);

create or replace view public.v_hasil_pangan with (security_invoker = true) as
select h.id, h.kode_upt, u.nama as upt_nama, k.id as kanwil_id, k.nama as kanwil_nama, h.activity_id,
       h.jenis, h.komoditas, h.tanggal, h.volume, h.satuan, h.luas_ha, h.catatan, h.created_at,
       h.nilai_rp, h.wbp_terlibat, h.premi_rp
  from public.hasil_pangan h
  join public.master_upt u on u.kode = h.kode_upt
  left join public.master_kanwil k on k.id = u.kanwil_id;
grant select on public.v_hasil_pangan to authenticated;

create or replace function public.rekap_pangan_sdp(p_dari date, p_sampai date, p_kanwil uuid default null, p_upt text default null)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_hari int;
  v_prev_dari date;
  v_prev_sampai date;
  v jsonb;
begin
  if p_dari is null or p_sampai is null or p_sampai < p_dari or p_sampai - p_dari > 3660 then
    raise exception 'Periode tidak valid.';
  end if;
  v_hari := (p_sampai - p_dari) + 1;
  v_prev_sampai := p_dari - 1;
  v_prev_dari := p_dari - v_hari;

  with dasar as (
    select x.*,
           case x.satuan when 'kg' then x.volume / 1000 when 'kwintal' then x.volume / 10 when 'ton' then x.volume else 0 end as ton,
           lower(btrim(x.komoditas)) as kom
      from public.v_hasil_pangan x
     where (p_kanwil is null or x.kanwil_id = p_kanwil)
       and (p_upt is null or x.kode_upt = p_upt)
       and x.tanggal between v_prev_dari and p_sampai
  ),
  skrg as (select * from dasar where tanggal >= p_dari),
  lalu as (select * from dasar where tanggal <= v_prev_sampai),
  bln as (select generate_series(date_trunc('month', p_dari)::date, date_trunc('month', p_sampai)::date, interval '1 month')::date as b),
  kpi as (
    select coalesce(sum(ton), 0) as ton,
           coalesce(sum(nilai_rp), 0) as nilai,
           coalesce(sum(luas_ha), 0) * 10000 as luas_m2,
           coalesce(round(sum(wbp_terlibat)::numeric / nullif(count(distinct date_trunc('month', tanggal)) filter (where wbp_terlibat is not null), 0)), 0) as wbp_rata,
           count(distinct kode_upt) as upt,
           count(distinct kom) as komoditas,
           count(*) as catatan
      from skrg
  ),
  kpi_lalu as (select coalesce(sum(ton), 0) as ton, coalesce(sum(nilai_rp), 0) as nilai from lalu),
  per_bulan as (
    select to_char(b.b, 'YYYY-MM') as bulan,
           coalesce(sum(s.ton), 0) as ton,
           coalesce(sum(s.nilai_rp), 0) as nilai,
           coalesce(sum(s.wbp_terlibat), 0) as wbp,
           coalesce(sum(s.premi_rp), 0) as premi
      from bln b left join skrg s on date_trunc('month', s.tanggal)::date = b.b
     group by b.b order by b.b
  ),
  kunci as (
    select case when p_upt is not null then null when p_kanwil is not null then s.kode_upt else s.kanwil_id::text end as k,
           case when p_upt is not null then null when p_kanwil is not null then s.upt_nama else s.kanwil_nama end as nama,
           s.*
      from skrg s
  ),
  peringkat as (
    select k, max(nama) as nama,
           coalesce(sum(ton), 0) as ton,
           coalesce(sum(nilai_rp), 0) as nilai,
           coalesce(round(sum(wbp_terlibat)::numeric / nullif(count(distinct date_trunc('month', tanggal)) filter (where wbp_terlibat is not null), 0)), 0) as wbp,
           coalesce(sum(luas_ha), 0) * 10000 as luas_m2
      from kunci where k is not null group by k
  ),
  per_kom as (
    select kom, jenis::text as jenis, coalesce(sum(ton), 0) as ton, coalesce(sum(nilai_rp), 0) as nilai, count(*) as catatan, count(distinct kode_upt) as upt
      from skrg group by kom, jenis
     order by coalesce(sum(nilai_rp), 0) desc, coalesce(sum(ton), 0) desc, count(*) desc
     limit 12
  ),
  upt_kom as (
    select s.kode_upt, s.kom, s.jenis::text as jenis, sum(s.ton) as ton, sum(coalesce(s.nilai_rp, 0)) as nilai, count(*) as catatan,
           sum(sum(s.ton)) over (partition by s.kode_upt) as ton_upt,
           sum(sum(coalesce(s.nilai_rp, 0))) over (partition by s.kode_upt) as nilai_upt
      from skrg s group by s.kode_upt, s.kom, s.jenis
  ),
  upt_atas as (
    select distinct on (kode_upt) kode_upt, kom, jenis, ton_upt, nilai_upt
      from upt_kom order by kode_upt, nilai desc, ton desc, catatan desc
  ),
  upt_peta as (
    select a.kode_upt as kode, u.nama, k.nama as kanwil, u.latitude::float8 as lat, u.longitude::float8 as lng,
           a.kom, a.jenis, a.ton_upt as ton, a.nilai_upt as nilai
      from upt_atas a
      join public.master_upt u on u.kode = a.kode_upt
      left join public.master_kanwil k on k.id = u.kanwil_id
     where u.latitude is not null and u.longitude is not null
  )
  select jsonb_build_object(
    'kpi', (select to_jsonb(kpi) from kpi),
    'sebelumnya', (select to_jsonb(kpi_lalu) from kpi_lalu),
    'bulanan', coalesce((select jsonb_agg(to_jsonb(per_bulan) order by bulan) from per_bulan), '[]'::jsonb),
    'peringkat', coalesce((select jsonb_agg(jsonb_build_object('nama', nama, 'ton', ton, 'nilai', nilai, 'wbp', wbp, 'luas_m2', luas_m2)) from peringkat), '[]'::jsonb),
    'komoditas', coalesce((select jsonb_agg(to_jsonb(per_kom)) from per_kom), '[]'::jsonb),
    'upt', coalesce((select jsonb_agg(to_jsonb(upt_peta)) from upt_peta), '[]'::jsonb)
  ) into v;
  return v;
end $$;
revoke all on function public.rekap_pangan_sdp(date, date, uuid, text) from public, anon;
grant execute on function public.rekap_pangan_sdp(date, date, uuid, text) to authenticated;
