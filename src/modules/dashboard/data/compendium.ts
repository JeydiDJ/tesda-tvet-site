import type { AreaNode } from "@/modules/shared/types/data";

type CompendiumRawRow = {
  uiid: string | null;
  institution_name: string | null;
  program: string | null;
};

export type CompendiumSelection = {
  regionClean?: string;
  provinceClean?: string;
  municipalityClean?: string;
};

export type CompendiumStats = {
  totalInstitutions: number;
  totalPrograms: number;
};

function toUpperClean(value: string) {
  return value
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function quoteIn(values: string[]) {
  return values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",");
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

function regionCodeToClean(regionCode: string) {
  const normalized = String(regionCode ?? "").trim().toUpperCase();
  const aliases: Record<string, string> = {
    NCR: "NCR",
    CAR: "CAR",
    BARMM: "BARMM",
    MIMAROPA: "IV-B",
    CARAGA: "CARAGA",
    NIR: "NIR",
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  const match = normalized.match(/^R(\d{1,2})$/);
  if (!match) return normalized;
  const regionNumber = Number(match[1]);
  if (!Number.isFinite(regionNumber) || regionNumber < 1) {
    return normalized;
  }

  const roman = [
    "",
    "I",
    "II",
    "III",
    "IV-A",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
    "XIII",
    "XIV",
    "XV",
    "XVI",
    "XVII",
    "XVIII",
  ];
  if (regionNumber === 16) return "CARAGA";
  if (regionNumber === 17) return "IV-B";
  return roman[regionNumber] ?? normalized;
}

async function fetchRows(
  supabaseUrl: string,
  supabaseAnonKey: string,
  selection: CompendiumSelection,
) {
  const query = new URLSearchParams({
    select: "uiid,institution_name,program",
  });
  if (selection.regionClean) {
    const regionCandidates = buildRegionCandidates(selection.regionClean);
    query.set("region_clean", `in.(${quoteIn(regionCandidates)})`);
  }
  if (selection.provinceClean) {
    const provinceCandidates = buildAreaNameCandidates(selection.provinceClean);
    query.set("province_clean", `in.(${quoteIn(provinceCandidates)})`);
  }
  if (selection.municipalityClean) {
    const municipalityCandidates = buildAreaNameCandidates(selection.municipalityClean);
    query.set("municipality_clean", `in.(${quoteIn(municipalityCandidates)})`);
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/tesda_compendium_raw_2024?${query.toString()}`,
    {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as CompendiumRawRow[];
}

export function getCompendiumSelection(activeArea: AreaNode, path: AreaNode[]) {
  if (activeArea.level === "country") {
    return {};
  }

  const regionNode =
    activeArea.level === "region"
      ? activeArea
      : path.find((node) => node.level === "region");
  const provinceNode =
    activeArea.level === "province"
      ? activeArea
      : path.find((node) => node.level === "province");
  const cityNode = activeArea.level === "city" ? activeArea : undefined;

  const selection: CompendiumSelection = {};

  if (regionNode) {
    selection.regionClean = regionCodeToClean(regionNode.code);
  }
  if (provinceNode) {
    selection.provinceClean = toUpperClean(provinceNode.name);
  }
  if (cityNode) {
    selection.municipalityClean = toUpperClean(cityNode.name);
  }

  return selection;
}

export async function fetchCompendiumStatsBySelection(
  selection: CompendiumSelection,
): Promise<CompendiumStats | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  let rows = await fetchRows(supabaseUrl, supabaseAnonKey, selection);
  if (!rows) {
    return null;
  }

  // Imported data may be region-level only (province/municipality null),
  // so progressively relax filters to keep stats visible while drilling down.
  if (rows.length === 0 && selection.municipalityClean) {
    rows =
      (await fetchRows(supabaseUrl, supabaseAnonKey, {
        regionClean: selection.regionClean,
        provinceClean: selection.provinceClean,
      })) ?? [];
  }
  if (rows.length === 0 && selection.provinceClean) {
    rows =
      (await fetchRows(supabaseUrl, supabaseAnonKey, {
        regionClean: selection.regionClean,
      })) ?? [];
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
    totalInstitutions: institutionKeys.size,
    totalPrograms: programKeys.size,
  };
}
