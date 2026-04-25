import { PageFrame } from "@/modules/layout/components/PageFrame";

export default function LocationsPage() {
  return (
    <PageFrame
      eyebrow="Locations"
      title="Geographic drilldown workspace"
      description="Use this page for deeper region, province, and city comparisons outside the presentation hero. This is the right place for sortable tables, rankings, PSGC-linked metadata, and detailed local filters."
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] bg-white p-6 shadow-[0_24px_60px_rgba(45,73,138,0.1)]">
          <h2 className="font-display text-2xl font-bold text-[#20304d]">
            Suggested sections
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Tile title="Region ranking" body="Rank regions by enrollment, institutions, and completion performance." />
            <Tile title="Province breakdown" body="Surface the selected region's provinces and their comparative metrics." />
            <Tile title="City detail" body="Show the final drilldown level with institution lists and program counts." />
            <Tile title="Boundary inspector" body="Bind region, province, and city GeoJSON with hover and click states." />
          </div>
        </article>

        <article className="rounded-[2rem] bg-[linear-gradient(180deg,#f7faff,#edf4ff)] p-6 shadow-[0_24px_60px_rgba(45,73,138,0.08)]">
          <h2 className="font-display text-2xl font-bold text-[#20304d]">
            Data model reminders
          </h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
            <li>`locations` should hold PSGC, parent ID, display name, level, and map geometry references.</li>
            <li>`location_metrics` should keep pre-aggregated counts for the selected area level.</li>
            <li>`location_programs` should support per-area program analysis and filtering.</li>
          </ul>
        </article>
      </section>
    </PageFrame>
  );
}

function Tile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[rgba(21,35,60,0.07)] bg-[#f8fbff] p-5">
      <p className="text-lg font-bold text-[#20304d]">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}
