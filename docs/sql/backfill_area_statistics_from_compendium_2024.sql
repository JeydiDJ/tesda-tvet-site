-- Backfill PSGC regions + area_statistics from tesda_compendium_raw_2024
-- Scope: nationwide + region-level only (province/municipality currently null)

begin;

create temporary table tmp_region_map (
  region_clean text,
  psgc_code text,
  region_name text
) on commit drop;

insert into tmp_region_map (region_clean, psgc_code, region_name) values
  ('I',      '0100000000', 'Region I (Ilocos Region)'),
  ('II',     '0200000000', 'Region II (Cagayan Valley)'),
  ('III',    '0300000000', 'Region III (Central Luzon)'),
  ('IV-A',   '0400000000', 'Region IV-A (CALABARZON)'),
  ('V',      '0500000000', 'Region V (Bicol Region)'),
  ('VI',     '0600000000', 'Region VI (Western Visayas)'),
  ('VII',    '0700000000', 'Region VII (Central Visayas)'),
  ('VIII',   '0800000000', 'Region VIII (Eastern Visayas)'),
  ('IX',     '0900000000', 'Region IX (Zamboanga Peninsula)'),
  ('X',      '1000000000', 'Region X (Northern Mindanao)'),
  ('XI',     '1100000000', 'Region XI (Davao Region)'),
  ('XII',    '1200000000', 'Region XII (SOCCSKSARGEN)'),
  ('NCR',    '1300000000', 'National Capital Region (NCR)'),
  ('CAR',    '1400000000', 'Cordillera Administrative Region (CAR)'),
  ('CARAGA', '1600000000', 'Region XIII (Caraga)'),
  ('IV-B',   '1700000000', 'MIMAROPA Region'),
  ('BARMM',  '1900000000', 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)');

-- 1) Ensure psgc_regions has rows for regions present in raw import
insert into public.psgc_regions (psgc_code, name)
select rm.psgc_code, rm.region_name
from tmp_region_map rm
join (
  select distinct upper(trim(region_clean)) as region_clean
  from public.tesda_compendium_raw_2024
  where region_clean is not null and trim(region_clean) <> ''
) seen on seen.region_clean = rm.region_clean
on conflict (psgc_code) do update
set name = excluded.name;

-- 2) Reset 2024 nationwide + region stats (safe rerun)
delete from public.area_statistics
where year = 2024
  and area_level in ('nationwide', 'region');

-- 3) Nationwide aggregate
insert into public.area_statistics (
  year,
  area_level,
  total_institutions,
  total_programs,
  total_active_programs,
  total_expired_programs,
  total_enrolled_non_scholar_students
)
select
  2024,
  'nationwide',
  count(distinct nullif(trim(uiid), '')),
  count(*),
  count(*) filter (
    where upper(coalesce(status, '')) like '%ACTIVE%'
      and upper(coalesce(status, '')) not like '%INACTIVE%'
  ),
  count(*) filter (
    where upper(coalesce(status, '')) like '%EXPIRED%'
      or upper(coalesce(status, '')) like '%LAPSED%'
  ),
  0
from public.tesda_compendium_raw_2024;

-- 4) Region aggregates
insert into public.area_statistics (
  year,
  area_level,
  region_id,
  total_institutions,
  total_programs,
  total_active_programs,
  total_expired_programs,
  total_enrolled_non_scholar_students
)
select
  2024,
  'region',
  r.id,
  count(distinct nullif(trim(raw.uiid), '')),
  count(*),
  count(*) filter (
    where upper(coalesce(raw.status, '')) like '%ACTIVE%'
      and upper(coalesce(raw.status, '')) not like '%INACTIVE%'
  ),
  count(*) filter (
    where upper(coalesce(raw.status, '')) like '%EXPIRED%'
      or upper(coalesce(raw.status, '')) like '%LAPSED%'
  ),
  0
from public.tesda_compendium_raw_2024 raw
join tmp_region_map rm
  on upper(trim(raw.region_clean)) = rm.region_clean
join public.psgc_regions r
  on r.psgc_code = rm.psgc_code
group by r.id;

commit;

-- Verify:
-- select count(*) from public.psgc_regions;
-- select year, area_level, count(*) from public.area_statistics group by year, area_level order by year, area_level;
-- select r.psgc_code, r.name, a.total_institutions, a.total_programs
-- from public.area_statistics a
-- join public.psgc_regions r on r.id = a.region_id
-- where a.year = 2024 and a.area_level = 'region'
-- order by r.psgc_code;
