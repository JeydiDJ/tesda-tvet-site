import { NextResponse } from "next/server";
import type { PsgcSelection } from "@/modules/shared/types/data";

type CompendiumSelection = {
  regionClean?: string;
  provinceClean?: string;
  municipalityClean?: string;
};

type LiveStatsRequest = {
  psgcSelection: PsgcSelection;
  compendiumSelection: CompendiumSelection;
  year?: number;
};

type AreaStatisticsRow = {
  total_institutions: number | null;
  total_programs: number | null;
  total_enrolled_non_scholar_students: number | null;
};

type CompendiumRawRow = {
  uiid: string | null;
  institution_name: string | null;
  program: string | null;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

function buildPsgcCodeCandidates(psgcCode: string) {
  const raw = String(psgcCode ?? "").trim();
  if (!raw) return [];

  const digitsOnly = raw.replace(/\D/g, "");
  const deZeroed = digitsOnly.replace(/^0+/, "");
  const padded10 = digitsOnly.padStart(10, "0");

  return Array.from(
    new Set(
      [raw, digitsOnly, deZeroed, padded10]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function quoteIn(values: string[]) {
  return values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",");
}

function toUpperClean(value: string) {
  return value.toUpperCase().replace(/\s+/g, " ").trim();
}

function buildAreaNameCandidates(value: string) {
  const base = toUpperClean(value);
  return Array.from(
    new Set([
      base,
      base.replace(/^CITY OF\s+/, ""),
      `CITY OF ${base}`,
      base.replace(/^MUNICIPALITY OF\s+/, ""),
      `MUNICIPALITY OF ${base}`,
    ]),
  ).filter(Boolean);
}

function buildRegionCandidates(value: string) {
  const base = toUpperClean(value);
  const stripped = base.replace(/^REGION\s+/, "");
  const romanOrCode = stripped.replace(/^R/, "");

  return Array.from(
    new Set(
      [base, stripped, `REGION ${romanOrCode}`, `R${romanOrCode}`]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

async function fetchJson(
  path: string,
  url: string,
  key: string,
) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchSingleIdByPsgc(
  table: "psgc_regions" | "psgc_provinces" | "psgc_cities_municipalities",
  psgcCode: string,
  url: string,
  key: string,
) {
  const candidates = buildPsgcCodeCandidates(psgcCode);
  if (candidates.length === 0) return null;

  const query = new URLSearchParams({
    select: "id",
    psgc_code: `in.(${quoteIn(candidates)})`,
    limit: "1",
  });

  const rows = (await fetchJson(`${table}?${query.toString()}`, url, key)) as
    | Array<{ id: number }>
    | null;
  return rows?.[0]?.id ?? null;
}

async function fetchAreaStatistics(
  selection: PsgcSelection,
  year: number,
  url: string,
  key: string,
) {
  const areaLevel = selection.cityMunicipalityPsgc
    ? "city_municipality"
    : selection.provincePsgc
      ? "province"
      : selection.regionPsgc
        ? "region"
        : "nationwide";

  const baseQuery = new URLSearchParams({
    select:
      "total_institutions,total_programs,total_enrolled_non_scholar_students",
    area_level: `eq.${areaLevel}`,
    limit: "1",
  });
  const query = new URLSearchParams(baseQuery);
  query.set("year", `eq.${year}`);

  if (areaLevel === "region" && selection.regionPsgc) {
    const regionId = await fetchSingleIdByPsgc(
      "psgc_regions",
      selection.regionPsgc,
      url,
      key,
    );
    if (!regionId) return null;
    query.set("region_id", `eq.${regionId}`);
    baseQuery.set("region_id", `eq.${regionId}`);
  }

  if (areaLevel === "province" && selection.provincePsgc) {
    const provinceId = await fetchSingleIdByPsgc(
      "psgc_provinces",
      selection.provincePsgc,
      url,
      key,
    );
    if (!provinceId) return null;
    query.set("province_id", `eq.${provinceId}`);
    baseQuery.set("province_id", `eq.${provinceId}`);
  }

  if (areaLevel === "city_municipality" && selection.cityMunicipalityPsgc) {
    const cityMunicipalityId = await fetchSingleIdByPsgc(
      "psgc_cities_municipalities",
      selection.cityMunicipalityPsgc,
      url,
      key,
    );
    if (!cityMunicipalityId) return null;
    query.set("city_municipality_id", `eq.${cityMunicipalityId}`);
    baseQuery.set("city_municipality_id", `eq.${cityMunicipalityId}`);
  }

  let rows = (await fetchJson(
    `area_statistics?${query.toString()}`,
    url,
    key,
  )) as AreaStatisticsRow[] | null;
  let row = rows?.[0];

  if (!row) {
    const latestQuery = new URLSearchParams(baseQuery);
    latestQuery.set("order", "year.desc");
    rows = (await fetchJson(
      `area_statistics?${latestQuery.toString()}`,
      url,
      key,
    )) as AreaStatisticsRow[] | null;
    row = rows?.[0];
    if (!row) return null;
  }

  return {
    institutions: row.total_institutions ?? 0,
    registeredPrograms: row.total_programs ?? 0,
    enrolledNonScholars: row.total_enrolled_non_scholar_students ?? 0,
  };
}

async function fetchCompendiumRows(
  selection: CompendiumSelection,
  url: string,
  key: string,
) {
  const query = new URLSearchParams({
    select: "uiid,institution_name,program",
  });

  if (selection.regionClean) {
    query.set("region_clean", `in.(${quoteIn(buildRegionCandidates(selection.regionClean))})`);
  }
  if (selection.provinceClean) {
    query.set("province_clean", `in.(${quoteIn(buildAreaNameCandidates(selection.provinceClean))})`);
  }
  if (selection.municipalityClean) {
    query.set(
      "municipality_clean",
      `in.(${quoteIn(buildAreaNameCandidates(selection.municipalityClean))})`,
    );
  }

  return (await fetchJson(
    `tesda_compendium_raw_2024?${query.toString()}`,
    url,
    key,
  )) as CompendiumRawRow[] | null;
}

async function fetchCompendiumStats(
  selection: CompendiumSelection,
  url: string,
  key: string,
) {
  let rows = await fetchCompendiumRows(selection, url, key);
  if (!rows) return null;

  if (rows.length === 0 && selection.municipalityClean) {
    rows =
      (await fetchCompendiumRows(
        {
          regionClean: selection.regionClean,
          provinceClean: selection.provinceClean,
        },
        url,
        key,
      )) ?? [];
  }
  if (rows.length === 0 && selection.provinceClean) {
    rows =
      (await fetchCompendiumRows(
        { regionClean: selection.regionClean },
        url,
        key,
      )) ?? [];
  }

  const institutionKeys = new Set<string>();
  const programKeys = new Set<string>();
  rows.forEach((row) => {
    const institutionKey =
      (row.uiid && row.uiid.trim()) ||
      (row.institution_name && row.institution_name.trim());
    if (institutionKey) {
      institutionKeys.add(toUpperClean(institutionKey));
    }
    const programName = row.program?.trim();
    if (programName && institutionKey) {
      programKeys.add(`${toUpperClean(institutionKey)}::${toUpperClean(programName)}`);
    } else if (programName) {
      programKeys.add(toUpperClean(programName));
    }
  });

  return {
    institutions: institutionKeys.size,
    registeredPrograms: programKeys.size,
    enrolledNonScholars: 0,
  };
}

export async function POST(request: Request) {
  try {
    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json({ data: null, source: "none" });
    }

    const body = (await request.json()) as LiveStatsRequest;
    const year = body.year ?? 2024;

    const areaStats = await fetchAreaStatistics(
      body.psgcSelection,
      year,
      config.url,
      config.key,
    );
    if (areaStats) {
      return NextResponse.json({ data: areaStats, source: "area_statistics" });
    }

    const compendiumStats = await fetchCompendiumStats(
      body.compendiumSelection,
      config.url,
      config.key,
    );
    return NextResponse.json({
      data: compendiumStats,
      source: compendiumStats ? "compendium" : "none",
    });
  } catch {
    return NextResponse.json({ data: null, source: "none" }, { status: 200 });
  }
}

