import { AreaNode } from "@/components/types/data";

type HeaderProps = {
  activeArea: AreaNode;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

export function Header({ activeArea }: HeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,251,242,0.92),rgba(255,245,221,0.76))] p-8 shadow-[0_24px_70px_rgba(82,59,15,0.12)] lg:p-10">
      <div className="mesh-orb left-[-72px] top-[-48px] h-44 w-44 bg-teal-300/40" />
      <div className="mesh-orb bottom-[-70px] right-[-20px] h-52 w-52 bg-amber-300/40" />
      <div className="relative grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">
            TESDA Geographic Intelligence Dashboard
          </div>
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-teal-800">
              {activeArea.heroLabel}
            </p>
            <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Explore TESDA data by region, province, and city.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              {activeArea.summary}
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-[1.6rem] border border-white/70 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-500">
            Active snapshot
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-4">
              <p className="text-sm text-slate-500">Non-scholar enrollees</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatNumber(activeArea.metrics.enrolledNonScholars)}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-4">
              <p className="text-sm text-slate-500">Registered programs</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {formatNumber(activeArea.metrics.registeredPrograms)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {activeArea.spotlight}
          </p>
        </div>
      </div>
    </section>
  );
}
