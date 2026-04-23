import { PageFrame } from "@/components/pages/PageFrame";

const steps = [
  {
    title: "Google Sheets source cleanup",
    status: "In progress",
  },
  {
    title: "Supabase schema mapping",
    status: "Ready",
  },
  {
    title: "GeoJSON hierarchy binding",
    status: "Ready",
  },
  {
    title: "Automated refresh jobs",
    status: "Planned",
  },
];

export default function DataPipelinePage() {
  return (
    <PageFrame
      eyebrow="Data Pipeline"
      title="Source and ingestion readiness"
      description="This page should track your operational data flow from Google Sheets into Supabase, including schema mapping, validation, refresh status, and geometry binding."
    >
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[2rem] bg-white p-6 shadow-[0_24px_60px_rgba(45,73,138,0.1)]">
          <h2 className="font-display text-2xl font-bold text-[#20304d]">
            Pipeline stages
          </h2>
          <div className="mt-5 space-y-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="flex items-center justify-between rounded-[1.35rem] bg-[#f7faff] px-4 py-4"
              >
                <span className="font-medium text-slate-700">{step.title}</span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[var(--tesda-blue)]">
                  {step.status}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[linear-gradient(180deg,#3159d3,#2248b2)] p-6 text-white shadow-[0_24px_60px_rgba(35,73,180,0.22)]">
          <h2 className="font-display text-2xl font-bold">Suggested operational checks</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-white/88">
            <li>Validate every location row against PSGC and parent-child hierarchy.</li>
            <li>Normalize program names so category groupings stay reliable.</li>
            <li>Store load timestamps to show freshness on the dashboard.</li>
            <li>Separate raw ingest tables from curated dashboard tables.</li>
            <li>Track geometry file versions to avoid mismatched area boundaries.</li>
          </ul>
        </article>
      </section>
    </PageFrame>
  );
}
