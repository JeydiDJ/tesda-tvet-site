import { ProgramStat } from "@/modules/shared/types/data";

type ProgramListProps = {
  programs: ProgramStat[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

export function ProgramList({ programs }: ProgramListProps) {
  return (
    <section className="rounded-[2rem] bg-white px-6 py-6 shadow-[0_24px_60px_rgba(45,73,138,0.12)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#8da0c0]">
            Registered programs
          </p>
          <h3 className="mt-2 font-display text-3xl font-bold text-[#20304d]">
            Priority training tracks
          </h3>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-500">
          Placeholder figures only for now, but the card structure is already shaped for Supabase-backed program metrics.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {programs.map((program) => (
          <article
            key={program.name}
            className="rounded-[1.6rem] border border-[rgba(21,35,60,0.07)] bg-[#f8fbff] p-5"
          >
            <p className="text-lg font-bold text-[#20304d]">{program.name}</p>
            <p className="mt-1 text-sm font-medium text-[#6f82a3]">{program.category}</p>

            <div className="mt-5 grid gap-3">
              <MetricBox label="Scholars" value={formatNumber(program.scholars)} />
              <MetricBox
                label="Non-scholars"
                value={formatNumber(program.nonScholars)}
              />
              <MetricBox
                label="Completion rate"
                value={`${program.completionRate}%`}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8da0c0]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#20304d]">
        {value}
      </p>
    </div>
  );
}
