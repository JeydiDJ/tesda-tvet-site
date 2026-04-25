import { ReactNode } from "react";

type PageFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: PageFrameProps) {
  return (
    <main className="min-h-dvh px-5 py-6 sm:px-8 lg:px-10">
      <section className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.72))] px-6 py-6 shadow-[0_24px_60px_rgba(45,73,138,0.1)] backdrop-blur-md lg:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#8da0c0]">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#20304d] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
          {description}
        </p>
      </section>

      <div className="mt-6">{children}</div>
    </main>
  );
}
