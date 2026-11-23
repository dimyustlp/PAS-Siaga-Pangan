-- 13. Berita berjalan (umpan berita ketahanan pangan Pemasyarakatan) dan ringkasan data SDP Ketahanan Pangan.
-- Jalankan setelah 12-peran-tahap-drive.sql.

-- ---------- 1. Berita luar (judul + tautan dari Google News, diperbarui otomatis tiap jam) ----------
create table if not exists public.berita_luar (
  id          bigint generated always as identity primary key,
  judul       text not null,
  sumber      text,
  url         text not null unique,
  terbit_at   timestamptz,
  diambil_at  timestamptz not null default now(),
  disembunyikan boolean not null default false
);
create index if not exists berita_luar_terbit_idx on public.berita_luar (terbit_at desc);
alter table public.berita_luar enable row level security;
drop policy if exists berita_luar_baca on public.berita_luar;
create policy berita_luar_baca on public.berita_luar for select to authenticated using (not disembunyikan);
grant select on public.berita_luar to authenticated;

create table if not exists private.antrean_berita (req_id bigint primary key, dibuat_at timestamptz not null default now());

create or replace function private.tarik_berita_luar()
returns void language plpgsql security definer set search_path = '' as $$
declare r record; v_xml xml; it xml; v_judul text; v_sumber text; v_url text; v_tgl timestamptz;
begin
  -- olah jawaban permintaan sebelumnya
  for r in select a.req_id, h.status_code, h.content from private.antrean_berita a
           join net._http_response h on h.id = a.req_id loop
    if r.status_code = 200 then
      begin
        v_xml := r.content::xml;
        foreach it in array xpath('//item', v_xml) loop
          v_judul  := (xpath('/item/title/text()', it))[1]::text;
          v_sumber := (xpath('/item/source/text()', it))[1]::text;
          v_url    := (xpath('/item/link/text()', it))[1]::text;
          begin v_tgl := ((xpath('/item/pubDate/text()', it))[1]::text)::timestamptz; exception when others then v_tgl := now(); end;
          if v_judul is null or v_url is null then continue; end if;
          v_judul := replace(replace(replace(replace(v_judul, '&amp;', '&'), '&quot;', '"'), '&#39;', ''''), '&lt;', '<');
          if v_sumber is not null and right(v_judul, length(v_sumber) + 3) = ' - ' || v_sumber then
            v_judul := left(v_judul, length(v_judul) - length(v_sumber) - 3);
          end if;
          -- hanya berita pangan di lingkungan Pemasyarakatan
          if v_judul !~* '(pangan|panen|tanam|budidaya|pertanian|peternakan|perikanan|SAE|hidroponik|ikan|jagung|padi|sayur)' then continue; end if;
          if v_judul !~* '(lapas|rutan|lpka|lpp|bapas|pemasyarakatan|warga binaan|wbp|narapidana|ditjenpas|kemenimipas|imipas|nusakambangan)' then continue; end if;
          insert into public.berita_luar (judul, sumber, url, terbit_at)
          values (left(v_judul, 300), left(v_sumber, 120), v_url, v_tgl)
          on conflict (url) do nothing;
        end loop;
      exception when others then null;
      end;
    end if;
    delete from private.antrean_berita where req_id = r.req_id;
  end loop;
  delete from private.antrean_berita where dibuat_at < now() - interval '1 day';
  -- simpan 150 berita terbaru saja
  delete from public.berita_luar where id in (select id from public.berita_luar order by terbit_at desc nulls last offset 150);
  -- kirim permintaan baru (dijawab secara asinkron, diolah pada putaran berikutnya)
  insert into private.antrean_berita (req_id)
  select net.http_get(
    'https://news.google.com/rss/search?q=%22ketahanan+pangan%22+(lapas+OR+rutan+OR+pemasyarakatan+OR+%22warga+binaan%22)&hl=id&gl=ID&ceid=ID:id',
    headers := '{"User-Agent":"Mozilla/5.0"}'::jsonb, timeout_milliseconds := 30000);
end
$$;
revoke all on function private.tarik_berita_luar() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname in ('berita-luar', 'berita-luar-olah');
select cron.schedule('berita-luar', '17 * * * *', 'select private.tarik_berita_luar()');
select cron.schedule('berita-luar-olah', '19 * * * *', 'select private.tarik_berita_luar()');

-- Admin dapat menyembunyikan berita luar yang tidak relevan
create or replace function public.admin_sembunyikan_berita_luar(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select private.app_role()) not in ('administrator', 'pemantau_pusat') then
    raise exception 'Hanya Administrator atau Pemantau Pusat.' using errcode = '42501';
  end if;
  update public.berita_luar set disembunyikan = true where id = p_id;
end $$;
revoke all on function public.admin_sembunyikan_berita_luar(bigint) from public, anon;
grant execute on function public.admin_sembunyikan_berita_luar(bigint) to authenticated;

-- ---------- 2. Ringkasan data SDP Ketahanan Pangan ----------
-- Dasbor SDP (data.ditjenpas.go.id) hanya dapat dibaca setelah masuk dengan akun SDP,
-- sehingga angka ringkasnya disalin oleh Pusat dari laporan cetak SDP dan ditampilkan untuk semua tingkat.
create table if not exists public.sdp_ringkasan (
  tahun        int primary key,
  data         jsonb not null,
  tanggal_data timestamptz,
  diubah_at    timestamptz not null default now(),
  diubah_oleh  uuid references public.profiles(id) on delete set null
);
alter table public.sdp_ringkasan enable row level security;
drop policy if exists sdp_baca on public.sdp_ringkasan;
create policy sdp_baca on public.sdp_ringkasan for select to authenticated using (true);
grant select on public.sdp_ringkasan to authenticated;

create or replace function public.simpan_sdp(p_tahun int, p_data jsonb, p_tanggal timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select private.app_role()) not in ('administrator', 'pemantau_pusat') then
    raise exception 'Hanya Administrator atau Pemantau Pusat yang boleh memperbarui data SDP.' using errcode = '42501';
  end if;
  if p_tahun is null or p_tahun not between 2024 and 2100 then
    raise exception 'Tahun tidak sah.' using errcode = '22023';
  end if;
  insert into public.sdp_ringkasan (tahun, data, tanggal_data, diubah_at, diubah_oleh)
  values (p_tahun, p_data, p_tanggal, now(), (select auth.uid()))
  on conflict (tahun) do update set data = excluded.data, tanggal_data = excluded.tanggal_data,
    diubah_at = now(), diubah_oleh = excluded.diubah_oleh;
  insert into public.audit_events (aktor_id, aktor_nama, aksi, detail)
  values ((select auth.uid()), (select full_name from public.profiles where id = (select auth.uid())),
          'Data SDP ketahanan pangan diperbarui', jsonb_build_object('tahun', p_tahun));
end $$;
revoke all on function public.simpan_sdp(int, jsonb, timestamptz) from public, anon;
grant execute on function public.simpan_sdp(int, jsonb, timestamptz) to authenticated;
