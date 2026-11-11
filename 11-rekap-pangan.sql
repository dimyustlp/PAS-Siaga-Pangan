-- 11: rekap hasil ketahanan pangan per Kanwil atau per UPT (mengikuti RLS pemanggil).
create or replace function public.rekap_pangan(p_dari date, p_sampai date, p_kanwil uuid default null, p_upt text default null)
returns table (kanwil_id uuid, kanwil_nama text, kode_upt text, upt_nama text, jenis public.activity_type,
               komoditas text, satuan text, volume numeric, luas_ha numeric, jumlah bigint)
language sql stable set search_path = '' as $$
  select v.kanwil_id, v.kanwil_nama,
         case when p_kanwil is null and p_upt is null then null else v.kode_upt end,
         case when p_kanwil is null and p_upt is null then null else v.upt_nama end,
         v.jenis, lower(btrim(v.komoditas)), v.satuan,
         sum(v.volume), sum(coalesce(v.luas_ha, 0)), count(*)
    from public.v_hasil_pangan v
   where v.tanggal between p_dari and p_sampai
     and (p_kanwil is null or v.kanwil_id = p_kanwil)
     and (p_upt is null or v.kode_upt = p_upt)
   group by 1, 2, 3, 4, 5, 6, 7
$$;
revoke all on function public.rekap_pangan(date, date, uuid, text) from public, anon;
grant execute on function public.rekap_pangan(date, date, uuid, text) to authenticated;
