import type { PsgcSelection } from "@/modules/shared/types/data";

type AreaStatisticsRow = {
  total_institutions: number | null;
  total_programs: number | null;
  total_active_programs: number | null;
  total_expired_programs: number | null;
  total_enrolled_non_scholar_students: number | null;
};

export type AreaStatisticsSnapshot = {
  totalInstitutions: number;
  totalPrograms: number;
  totalActivePrograms: number;
  totalExpiredPrograms: number;
  totalEnrolledNonScholarStudents: number;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
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

async function fetchSingleIdByPsgc(
  table: "psgc_regions" | "psgc_provinces" | "psgc_cities_municipalities",
  psgcCode: string,
) {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  const candidates = buildPsgcCodeCandidates(psgcCode);
  if (candidates.length === 0) {
    return null;
  }

  const quotedCandidates = candidates
    .map((value) => `"${value}"`)
    .join(",");
  const query = new URLSearchParams({
    select: "id,psgc_code",
    psgc_code: `in.(${quotedCandidates})`,
    limit: "1",
  });

  const response = await fetch(`${config.url}/rest/v1/${table}?${query.toString()}`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as Array<{ id: number; psgc_code?: string }>;
  const row = rows[0];
  return row?.id ?? null;
}

function toSnapshot(row: AreaStatisticsRow): AreaStatisticsSnapshot {
  return {
    totalInstitutions: row.total_institutions ?? 0,
    totalPrograms: row.total_programs ?? 0,
    totalActivePrograms: row.total_active_programs ?? 0,
    totalExpiredPrograms: row.total_expired_programs ?? 0,
    totalEnrolledNonScholarStudents:
      row.total_enrolled_non_scholar_students ?? 0,
  };
}

export async function fetchAreaStatisticsByPsgcSelection(
  selection: PsgcSelection,
  year = 2024,
): Promise<AreaStatisticsSnapshot | null> {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  const areaLevel = selection.cityMunicipalityPsgc
    ? "city_municipality"
    : selection.provincePsgc
      ? "province"
      : selection.regionPsgc
        ? "region"
        : "nationwide";

  const baseQuery = new URLSearchParams({
    select:
      "total_institutions,total_programs,total_active_programs,total_expired_programs,total_enrolled_non_scholar_students",
    area_level: `eq.${areaLevel}`,
    limit: "1",
  });
  const query = new URLSearchParams(baseQuery);
  query.set("year", `eq.${year}`);

  if (areaLevel === "region" && selection.regionPsgc) {
    const regionId = await fetchSingleIdByPsgc("psgc_regions", selection.regionPsgc);
    if (!regionId) return null;
    query.set("region_id", `eq.${regionId}`);
    baseQuery.set("region_id", `eq.${regionId}`);
  }

  if (areaLevel === "province" && selection.provincePsgc) {
    const provinceId = await fetchSingleIdByPsgc("psgc_provinces", selection.provincePsgc);
    if (!provinceId) return null;
    query.set("province_id", `eq.${provinceId}`);
    baseQuery.set("province_id", `eq.${provinceId}`);
  }

  if (areaLevel === "city_municipality" && selection.cityMunicipalityPsgc) {
    const cityMunicipalityId = await fetchSingleIdByPsgc(
      "psgc_cities_municipalities",
      selection.cityMunicipalityPsgc,
    );
    if (!cityMunicipalityId) return null;
    query.set("city_municipality_id", `eq.${cityMunicipalityId}`);
    baseQuery.set("city_municipality_id", `eq.${cityMunicipalityId}`);
  }

  const response = await fetch(
    `${config.url}/rest/v1/area_statistics?${query.toString()}`,
    {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  let rows = (await response.json()) as AreaStatisticsRow[];
  let row = rows[0];

  // Fallback to latest available year for the same area scope.
  if (!row) {
    const latestQuery = new URLSearchParams(baseQuery);
    latestQuery.set("order", "year.desc");
    const latestResponse = await fetch(
      `${config.url}/rest/v1/area_statistics?${latestQuery.toString()}`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
        cache: "no-store",
      },
    );
    if (!latestResponse.ok) {
      return null;
    }
    rows = (await latestResponse.json()) as AreaStatisticsRow[];
    row = rows[0];
    if (!row) {
      return null;
    }
  }

  return toSnapshot(row);
}
