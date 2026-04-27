import { NextResponse } from "next/server";
import type { CompendiumSelection } from "@/modules/dashboard/data/compendium";

type SelectedLevel = "nationwide" | "region" | "province" | "city_municipality";

type ChartsRequest = {
  selectedLevel: SelectedLevel;
  selection: CompendiumSelection;
};

type RawRow = {
  sector: string | null;
  region_clean: string | null;
  province_clean: string | null;
  municipality_clean: string | null;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function quoteIn(values: string[]) {
  return values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",");
}

function toUpperClean(value: string) {
  return value.toUpperCase().replace(/\s+/g, " ").trim();
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

function addSelectionFilters(query: URLSearchParams, selection: CompendiumSelection) {
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
}

async function fetchRows(
  url: string,
  key: string,
  selection: CompendiumSelection,
) {
  const query = new URLSearchParams({
    select: "sector,region_clean,province_clean,municipality_clean",
    limit: "200000",
  });
  addSelectionFilters(query, selection);

  const response = await fetch(
    `${url}/rest/v1/tesda_compendium_raw_2024?${query.toString()}`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as RawRow[];
}

function aggregateByKey(rows: RawRow[], key: keyof RawRow, fallbackLabel = "Unspecified") {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const rawValue = String(row[key] ?? "").trim();
    const label = rawValue || fallbackLabel;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, totalPrograms]) => ({ label, totalPrograms }))
    .sort((a, b) => b.totalPrograms - a.totalPrograms);
}

export async function POST(request: Request) {
  try {
    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json({ sectors: [], areas: [] });
    }

    const body = (await request.json()) as ChartsRequest;
    const { selectedLevel, selection } = body;

    let rows = await fetchRows(config.url, config.key, selection);
    if (!rows) {
      return NextResponse.json({ sectors: [], areas: [] });
    }

    // Graceful fallback while data is still mostly region-only.
    if (rows.length === 0 && selection.municipalityClean) {
      rows =
        (await fetchRows(config.url, config.key, {
          regionClean: selection.regionClean,
          provinceClean: selection.provinceClean,
        })) ?? [];
    }
    if (rows.length === 0 && selection.provinceClean) {
      rows =
        (await fetchRows(config.url, config.key, {
          regionClean: selection.regionClean,
        })) ?? [];
    }

    const sectors = aggregateByKey(rows, "sector", "Unspecified").map((item) => ({
      sector: item.label,
      totalPrograms: item.totalPrograms,
    }));

    const areaKey: keyof RawRow =
      selectedLevel === "nationwide"
        ? "region_clean"
        : selectedLevel === "region"
          ? "province_clean"
          : "municipality_clean";
    const areas =
      selectedLevel === "city_municipality"
        ? []
        : aggregateByKey(rows, areaKey, "Unspecified").map((item) => ({
            area: item.label,
            totalPrograms: item.totalPrograms,
          }));

    return NextResponse.json({ sectors, areas });
  } catch {
    return NextResponse.json({ sectors: [], areas: [] }, { status: 200 });
  }
}

