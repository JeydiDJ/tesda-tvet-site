"use client";

import { AreaNode } from "@/components/types/data";

type BreadcrumbsProps = {
  path: AreaNode[];
  onSelect: (id: string) => void;
};

export function Breadcrumbs({ path, onSelect }: BreadcrumbsProps) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
      {path.map((node, index) => (
        <div key={node.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className="rounded-full border border-[color:var(--line)] bg-white/60 px-3 py-1 transition hover:border-slate-800 hover:bg-white"
          >
            {node.name}
          </button>
          {index < path.length - 1 ? <span>/</span> : null}
        </div>
      ))}
    </nav>
  );
}
