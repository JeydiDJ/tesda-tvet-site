export function DataBlueprint() {
  return (
    <section className="rounded-[2rem] bg-[linear-gradient(180deg,#1848b8,#10378f)] px-6 py-6 text-white shadow-[0_24px_60px_rgba(20,69,179,0.28)]">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-white/70">
        Database-ready structure
      </p>
      <h3 className="mt-2 font-display text-3xl font-bold">
        Supabase migration path
      </h3>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <BlueprintCard
          title="locations"
          description="PSGC-linked rows for country, region, province, and city, including parent-child relationships and display labels."
        />
        <BlueprintCard
          title="location_metrics"
          description="Aggregated counts for enrollees, institutions, provinces, cities, municipalities, graduates, and other dashboard totals."
        />
        <BlueprintCard
          title="location_programs"
          description="Program name, category, scholar and non-scholar counts, completion rate, and time-based trend fields."
        />
      </div>
    </section>
  );
}

function BlueprintCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[1.6rem] border border-white/12 bg-white/10 p-5">
      <p className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-white">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/76">{description}</p>
    </article>
  );
}
