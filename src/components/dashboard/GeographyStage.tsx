"use client";

import { AreaNode } from "@/components/types/data";

type GeographyStageProps = {
  activeArea: AreaNode;
  onSelect: (id: string) => void;
  onBack: () => void;
};

export function GeographyStage({
  activeArea,
  onSelect,
  onBack,
}: GeographyStageProps) {
  const children = activeArea.children ?? [];
  const hasChildren = children.length > 0;

  return (
    <section className="glass-panel rounded-[2rem] border border-white/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-500">
            Interactive atlas
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-slate-950">
            {hasChildren
              ? `Select a ${children[0]?.level ?? "location"}`
              : "Deepest available placeholder level"}
          </h2>
        </div>
        {activeArea.parentId ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-[color:var(--line)] bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:bg-white"
          >
            Step back
          </button>
        ) : null}
      </div>

      <div className="atlas-grid relative mt-6 overflow-hidden rounded-[1.8rem] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(246,240,229,0.88))] p-4">
        <div className="mesh-orb left-[12%] top-[4%] h-24 w-24 bg-amber-200/60" />
        <div className="mesh-orb right-[15%] top-[22%] h-24 w-24 bg-teal-200/70" />
        <svg
          viewBox="0 0 720 430"
          className="relative z-10 h-[430px] w-full"
          role="img"
          aria-label="Placeholder geographic visualization for the selected TESDA area"
        >
          <defs>
            <linearGradient id="waterGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fffaf0" />
              <stop offset="100%" stopColor="#f3ebda" />
            </linearGradient>
          </defs>
          <rect width="720" height="430" rx="28" fill="url(#waterGradient)" />

          {children.map((child) => {
            const geometry = child.geometry;

            if (!geometry) return null;

            return (
              <g key={child.id}>
                <polygon
                  points={geometry.points}
                  fill={geometry.color}
                  fillOpacity={0.92}
                  stroke={geometry.accent}
                  strokeWidth={4}
                  className="cursor-pointer transition duration-300 hover:fill-opacity-100"
                  onClick={() => onSelect(child.id)}
                />
                <text
                  x={geometry.labelX}
                  y={geometry.labelY}
                  textAnchor="middle"
                  className="fill-white text-[11px] font-semibold uppercase tracking-[0.28em]"
                >
                  {child.code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {children.map((child) => (
          <button
            key={child.id}
            type="button"
            onClick={() => onSelect(child.id)}
            className="rounded-[1.4rem] border border-[color:var(--line)] bg-white/75 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-900 hover:bg-white"
          >
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-500">
              {child.level}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {child.name}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {child.summary}
            </p>
          </button>
        ))}
        {!hasChildren ? (
          <div className="rounded-[1.4rem] border border-dashed border-[color:var(--line)] bg-white/50 p-4 text-sm leading-6 text-slate-600">
            City level is the deepest placeholder state in this first build. Next step is swapping these nodes for live GeoJSON and database-driven metrics.
          </div>
        ) : null}
      </div>
    </section>
  );
}
