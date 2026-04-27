"use client";

import { useEffect, useMemo, useState } from "react";
import { DataBlueprint } from "@/modules/dashboard/components/DataBlueprint";
import { PhilippinesMapPanel } from "@/modules/map/components/PhilippinesMapPanel";
import { ProgramList } from "@/modules/dashboard/components/ProgramList";
import {
  getCompendiumSelection,
} from "@/modules/dashboard/data/compendium";
import {
  buildAreaIndex,
  getAreaPath,
  tesdaAtlas,
} from "@/modules/dashboard/data/mockData";
import type { PsgcSelection } from "@/modules/shared/types/data";

export function TesdaDashboard() {
  const [activeId, setActiveId] = useState("ph");
  const [psgcSelection, setPsgcSelection] = useState<PsgcSelection>({
    regionPsgc: null,
    provincePsgc: null,
    cityMunicipalityPsgc: null,
  });
  const [liveDashboardStats, setLiveDashboardStats] = useState<{
    institutions: number;
    registeredPrograms: number;
    enrolledNonScholars: number;
  } | null>(null);
  const areaIndex = useMemo(() => buildAreaIndex(tesdaAtlas), []);
  const activeArea = areaIndex.get(activeId) ?? tesdaAtlas;
  const path = useMemo(
    () => getAreaPath(tesdaAtlas, activeArea.id),
    [activeArea.id],
  );
  const compendiumSelection = useMemo(
    () => getCompendiumSelection(activeArea, path),
    [activeArea.id, path],
  );
  const effectiveArea = useMemo(
    () => ({
      ...activeArea,
      metrics: {
        ...activeArea.metrics,
        institutions:
          liveDashboardStats?.institutions ??
          activeArea.metrics.institutions,
        registeredPrograms:
          liveDashboardStats?.registeredPrograms ??
          activeArea.metrics.registeredPrograms,
        enrolledNonScholars:
          liveDashboardStats?.enrolledNonScholars ??
          activeArea.metrics.enrolledNonScholars,
      },
    }),
    [activeArea, liveDashboardStats],
  );

  const handleSelect = (id: string) => {
    setActiveId(id);
  };

  const handlePsgcSelectionChange = (selection: PsgcSelection) => {
    setPsgcSelection(selection);
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/live-stats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        psgcSelection,
        compendiumSelection,
        year: 2024,
      }),
      cache: "no-store",
    })
      .then((response) => response.json() as Promise<{
        data: {
          institutions: number;
          registeredPrograms: number;
          enrolledNonScholars: number;
        } | null;
      }>)
      .then((payload) => {
        if (cancelled) return;
        setLiveDashboardStats(payload.data ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveDashboardStats(null);
      });

    return () => {
      cancelled = true;
    };
  }, [psgcSelection, compendiumSelection, activeArea.id]);

  return (
    <main className="min-h-screen bg-transparent">
      <PhilippinesMapPanel
        activeArea={effectiveArea}
        path={path}
        onSelect={handleSelect}
        onInteractionStart={() => undefined}
        onPsgcSelectionChange={handlePsgcSelectionChange}
      />

      <div className="mx-auto flex w-full max-w-[1900px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DetailsPanel activeAreaName={effectiveArea.name} />
          <QuickCharts />
        </section>

        <ProgramList programs={effectiveArea.programs} />
        <DataBlueprint />
      </div>
    </main>
  );
}

function DetailsPanel({ activeAreaName }: { activeAreaName: string }) {
  return (
    <section className="rounded-[2rem] bg-white px-6 py-6 shadow-[0_24px_60px_rgba(45,73,138,0.12)]">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#8da0c0]">
        Strategic detail
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold text-[#20304d]">
        Why {activeAreaName} matters
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <InsightCard
          title="Demand pattern"
          value="High"
          description="Non-scholar demand remains the clearest indicator for local program relevance and repeatable training uptake."
        />
        <InsightCard
          title="Institution spread"
          value="Balanced"
          description="The current layout is ready for plotting centers, partner schools, and municipal access gaps later."
        />
        <InsightCard
          title="Program density"
          value="Growing"
          description="This section can later surface under-served categories and high-performing programs by area."
        />
      </div>
    </section>
  );
}

function QuickCharts() {
  return (
    <section className="rounded-[2rem] bg-[linear-gradient(180deg,#f7faff,#edf4ff)] px-6 py-6 shadow-[0_24px_60px_rgba(45,73,138,0.1)]">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#8da0c0]">
        Quick charts
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold text-[#20304d]">
        Enrollment and program trend
      </h2>
      <div className="mt-6 space-y-4">
        <ChartCard
          title="Enrollment mix"
          bars={[
            { label: "Scholars", width: "46%", tone: "bg-[#9fbaff]" },
            { label: "Non-scholars", width: "74%", tone: "bg-[#1e54cd]" },
          ]}
        />
        <ChartCard
          title="Program concentration"
          bars={[
            { label: "ICT", width: "63%", tone: "bg-[#77c4ff]" },
            { label: "Hospitality", width: "58%", tone: "bg-[#4b82ef]" },
            { label: "Construction", width: "49%", tone: "bg-[#244db2]" },
          ]}
        />
      </div>
    </section>
  );
}

function InsightCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-[1.4rem] border border-[rgba(21,35,60,0.07)] bg-[#f8fbff] p-5">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#8da0c0]">
        {title}
      </p>
      <p className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-[#20304d]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

function ChartCard({
  title,
  bars,
}: {
  title: string;
  bars: Array<{ label: string; width: string; tone: string }>;
}) {
  return (
    <article className="rounded-[1.5rem] bg-white p-5">
      <p className="text-lg font-bold text-[#20304d]">{title}</p>
      <div className="mt-5 space-y-4">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
              <span>{bar.label}</span>
              <span>{bar.width}</span>
            </div>
            <div className="h-3 rounded-full bg-[#e9f0fb]">
              <div className={`h-3 rounded-full ${bar.tone}`} style={{ width: bar.width }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
