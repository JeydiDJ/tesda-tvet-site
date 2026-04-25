import { PageFrame } from "@/modules/layout/components/PageFrame";

export default function AnalyticsPage() {
  return (
    <PageFrame
      eyebrow="Analytics"
      title="TESDA performance analytics"
      description="Use this route for trend charts, benchmark comparisons, and deeper KPI analysis that would crowd the presentation hero if kept on the landing page."
    >
      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Enrollment trend"
          subtitle="Example placeholder for monthly enrollment growth."
          bars={[
            { label: "Jan", width: "44%" },
            { label: "Feb", width: "50%" },
            { label: "Mar", width: "61%" },
            { label: "Apr", width: "72%" },
          ]}
        />
        <ChartCard
          title="Completion by category"
          subtitle="Example placeholder for category-level completion ratios."
          bars={[
            { label: "ICT", width: "82%" },
            { label: "Tourism", width: "76%" },
            { label: "Construction", width: "64%" },
            { label: "Manufacturing", width: "57%" },
          ]}
        />
      </section>
    </PageFrame>
  );
}

function ChartCard({
  title,
  subtitle,
  bars,
}: {
  title: string;
  subtitle: string;
  bars: Array<{ label: string; width: string }>;
}) {
  return (
    <article className="rounded-[2rem] bg-white p-6 shadow-[0_24px_60px_rgba(45,73,138,0.1)]">
      <h2 className="font-display text-2xl font-bold text-[#20304d]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      <div className="mt-6 space-y-4">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
              <span>{bar.label}</span>
              <span>{bar.width}</span>
            </div>
            <div className="h-3 rounded-full bg-[#e9f0fb]">
              <div
                className="h-3 rounded-full bg-[linear-gradient(90deg,#8fb7ff,#2950c8)]"
                style={{ width: bar.width }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
