import { AreaMetrics, AreaNode } from "@/components/types/data";

type StatsCardsProps = {
  activeArea: AreaNode;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH").format(value);
}

function toCards(metrics: AreaMetrics, level: AreaNode["level"]) {
  const localityLabel =
    level === "country"
      ? "Provinces"
      : level === "region"
        ? "Provinces"
        : level === "province"
          ? "Cities"
          : "Institutions";
  const localityValue =
    level === "country" || level === "region"
      ? metrics.provinces
      : level === "province"
        ? metrics.cities
        : metrics.institutions;

  return [
    { label: localityLabel, value: localityValue, tone: "bg-[#fff8ea]" },
    {
      label: level === "city" ? "Programs" : "Cities",
      value: level === "city" ? metrics.registeredPrograms : metrics.cities,
      tone: "bg-[#eef8f7]",
    },
    {
      label: "Non-scholar enrollees",
      value: metrics.enrolledNonScholars,
      tone: "bg-[#fff0ea]",
    },
    {
      label: "TVET graduates",
      value: metrics.tvetGraduates,
      tone: "bg-[#edf1ff]",
    },
  ];
}

export function StatsCards({ activeArea }: StatsCardsProps) {
  const cards = toCards(activeArea.metrics, activeArea.level);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`rounded-[1.6rem] border border-white/70 p-5 shadow-[0_18px_40px_rgba(65,54,21,0.08)] ${card.tone}`}
        >
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(card.value)}
          </p>
        </article>
      ))}
    </section>
  );
}
