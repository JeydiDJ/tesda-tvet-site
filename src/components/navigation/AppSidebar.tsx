"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview", icon: "O" },
  { href: "/locations", label: "Locations", icon: "L" },
  { href: "/programs", label: "Programs", icon: "P" },
  { href: "/analytics", label: "Analytics", icon: "A" },
  { href: "/data-pipeline", label: "Pipeline", icon: "D" },
];

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {collapsed ? (
        <button
          type="button"
          onClick={onToggle}
          className="fixed left-4 top-4 z-[70] flex h-11 w-11 items-center justify-center rounded-xl bg-white/92 text-slate-600 shadow-[0_12px_30px_rgba(45,73,138,0.16)] backdrop-blur-xl transition hover:bg-white hover:text-[var(--tesda-blue)]"
          aria-label="Open navigation"
        >
          <span className="relative block h-4 w-4">
            <span className="absolute left-0 top-0 h-0.5 w-4 rounded-full bg-current" />
            <span className="absolute left-0 top-[6px] h-0.5 w-4 rounded-full bg-current" />
            <span className="absolute left-0 top-[12px] h-0.5 w-4 rounded-full bg-current" />
          </span>
        </button>
      ) : null}

      {!collapsed ? (
        <button
          type="button"
          onClick={onToggle}
          className="fixed inset-0 z-[55] bg-[rgba(15,23,42,0.16)] backdrop-blur-[2px]"
          aria-label="Close navigation overlay"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-[60] flex h-dvh w-[248px] flex-col border-r border-[rgba(21,35,60,0.08)] bg-[rgba(248,251,255,0.96)] px-3 py-4 backdrop-blur-xl transition-transform duration-300 ${
          collapsed ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-slate-500 transition hover:bg-white hover:text-[var(--tesda-blue)]"
          aria-label="Close navigation"
        >
          ✕
        </button>

        <div className="mt-14 flex items-center gap-3 px-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--tesda-blue)] text-white shadow-[0_12px_28px_rgba(21,69,179,0.2)]">
              <span className="font-display text-lg font-extrabold">T</span>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--tesda-blue)]">
                TESDA
              </p>
              <p className="text-sm text-slate-500">Navigator</p>
            </div>
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                className={`flex items-center gap-3 rounded-[1.1rem] px-3 py-3 transition ${
                  active
                    ? "bg-[linear-gradient(180deg,#3159d3,#2248b2)] text-white shadow-[0_18px_34px_rgba(35,73,180,0.18)]"
                    : "bg-white/66 text-slate-700 hover:bg-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold ${
                    active ? "bg-white/14 text-white" : "bg-[#eef3ff] text-[var(--tesda-blue)]"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex justify-center">
          <div className="rounded-2xl bg-white/70 px-3 py-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#8ea0bf]">
            TESDA GIS
          </div>
        </div>
      </aside>
    </>
  );
}
