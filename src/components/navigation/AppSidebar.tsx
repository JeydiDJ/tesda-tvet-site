"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import tesdaLogo from "@/assets/logo/tesda-logo-white.png";

type IconProps = {
  className?: string;
};

function OverviewIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M3 10.5L12 3l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9.5V20h13V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LocationIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 21s6-5.6 6-11a6 6 0 10-12 0c0 5.4 6 11 6 11z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ProgramsIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4.5 5.5h8a3 3 0 013 3v10h-8a3 3 0 00-3 3v-16z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 5.5h-8a3 3 0 00-3 3v10h8a3 3 0 013 3v-16z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnalyticsIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4.5 19.5h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="6.5" y="11" width="3" height="6.5" rx="0.8" stroke="currentColor" strokeWidth="1.8" />
      <rect x="11" y="8.5" width="3" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.8" />
      <rect x="15.5" y="6" width="3" height="11.5" rx="0.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PipelineIcon({ className }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3.5" y="4.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14.5" y="4.5" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9" y="15" width="6" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.5 9v2.5h11V9M12 11.5V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navItems = [
  { href: "/", label: "Overview", icon: OverviewIcon },
  { href: "/locations", label: "Locations", icon: LocationIcon },
  { href: "/programs", label: "Programs", icon: ProgramsIcon },
  { href: "/analytics", label: "Analytics", icon: AnalyticsIcon },
  { href: "/data-pipeline", label: "Pipeline", icon: PipelineIcon },
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
          className="fixed left-4 top-4 z-[70] flex h-10 w-10 items-center justify-center rounded-xl border border-[#d3dcf1] bg-white text-slate-600 shadow-[0_12px_28px_rgba(35,63,126,0.16)] transition hover:text-[var(--tesda-blue)] lg:hidden"
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
          className="fixed inset-0 z-[55] bg-[rgba(15,23,42,0.08)] lg:hidden"
          aria-label="Close navigation overlay"
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-[60] flex h-dvh w-[292px] flex-col overflow-hidden border-r border-[#d7e0f2] bg-white px-4 py-5 shadow-[12px_0_42px_rgba(28,52,108,0.08)] transition-transform duration-300 ${
          collapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d5deef] bg-[#f4f7ff] text-slate-500 transition hover:text-[var(--tesda-blue)]"
          aria-label="Close navigation"
        >
          <span className="relative block h-4 w-4">
            <span className="absolute left-0 top-0 h-0.5 w-4 rounded-full bg-current" />
            <span className="absolute left-0 top-[6px] h-0.5 w-4 rounded-full bg-current" />
            <span className="absolute left-0 top-[12px] h-0.5 w-4 rounded-full bg-current" />
          </span>
        </button>

        <div className="mt-2 flex items-center gap-3 px-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f55cd] shadow-[0_12px_22px_rgba(31,85,205,0.26)]">
              <Image
                src={tesdaLogo}
                alt="TESDA"
                width={26}
                height={26}
                className="h-[26px] w-[26px] object-contain"
                priority
              />
            </div>
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-[#7f91b4]">
                TESDA IQ
              </p>
              <p className="font-display text-[38px] font-semibold leading-none tracking-[-0.03em] text-[#1d2f55]">
                Admin
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 h-px w-full bg-[#dde5f5]" />

        <nav className="mt-6 flex flex-col gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                  active
                    ? "bg-[#edf3ff] text-[var(--tesda-blue)]"
                    : "text-[#2d3f61] hover:bg-[#f5f8ff] hover:text-[var(--tesda-blue)]"
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 h-8 w-[4px] -translate-y-1/2 rounded-r-full transition ${
                    active ? "bg-[#2f63d7]" : "bg-transparent"
                  }`}
                />
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[#dce8ff]" : "bg-[#f2f6ff]"}`}>
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                </span>
                <span className="text-[17px] font-medium leading-none tracking-[0.01em]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

      </aside>
    </>
  );
}
