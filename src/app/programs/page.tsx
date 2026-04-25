import { PageFrame } from "@/modules/layout/components/PageFrame";

const rows = [
  ["Bread and Pastry Production NC II", "Tourism", "High"],
  ["Computer Systems Servicing NC II", "ICT", "Very High"],
  ["Shielded Metal Arc Welding NC II", "Construction", "High"],
  ["Front Office Services NC II", "Hospitality", "Growing"],
];

export default function ProgramsPage() {
  return (
    <PageFrame
      eyebrow="Programs"
      title="Program intelligence"
      description="This page should become the main place for comparing TESDA offerings by category, area, scholarship type, and completion results."
    >
      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-[2rem] bg-[linear-gradient(180deg,#3159d3,#2248b2)] p-6 text-white shadow-[0_24px_60px_rgba(35,73,180,0.22)]">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/72">
            Why this page matters
          </p>
          <div className="mt-5 space-y-3 text-sm leading-7 text-white/88">
            <p>Programs are one of the most important dimensions users will compare across geography.</p>
            <p>This route should eventually support program search, category filters, top-demand areas, and gap analysis.</p>
            <p>It is also the cleanest place to expose scholar vs non-scholar trends by program.</p>
          </div>
        </article>

        <article className="rounded-[2rem] bg-white p-6 shadow-[0_24px_60px_rgba(45,73,138,0.1)]">
          <h2 className="font-display text-2xl font-bold text-[#20304d]">
            Starter table
          </h2>
          <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-[rgba(21,35,60,0.08)]">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#f4f8ff] text-sm uppercase tracking-[0.12em] text-[#8da0c0]">
                <tr>
                  <th className="px-4 py-4">Program</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Demand</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row[0]} className="border-t border-[rgba(21,35,60,0.06)]">
                    {row.map((cell) => (
                      <td key={cell} className="px-4 py-4 text-sm text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </PageFrame>
  );
}
