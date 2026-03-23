"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export function LegalDocument({
  title,
  titleAccent,
  intro,
  lastUpdated,
  sections,
}: {
  title: string;
  titleAccent: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  const toc = useMemo(
    () => sections.map((s, i) => ({ id: s.id, label: `${i + 1}. ${s.title}` })),
    [sections],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.2, 0.45, 0.7] },
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-0 flex-1 bg-black text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="mb-6 inline-flex text-xs uppercase tracking-wider text-zinc-400 transition hover:text-zinc-100"
        >
          ← Back to home
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ml-gold)]">
              Legal
            </p>
            <h1 className="mt-2 ml-font-heading text-4xl font-semibold text-zinc-50 sm:text-5xl">
              {title.replace(titleAccent, "").trim()}{" "}
              <em className="text-[var(--ml-gold)] italic">{titleAccent}</em>
            </h1>
            <p className="mt-3 text-sm text-zinc-500">Last updated: {lastUpdated}</p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#e7dfcf]">{intro}</p>

            <div className="mt-10 space-y-10">
              {sections.map((section, idx) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="ml-font-heading text-2xl font-semibold text-[var(--ml-gold)]">
                    {idx + 1}. {section.title}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {section.paragraphs.map((p) => (
                      <p key={p} className="text-base leading-8 text-[#e7dfcf]">
                        {p}
                      </p>
                    ))}
                    {section.bullets?.length ? (
                      <ul className="space-y-2 pl-5 text-base leading-8 text-[#e7dfcf]">
                        {section.bullets.map((b) => (
                          <li key={b} className="list-disc">
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                On this page
              </p>
              <nav className="space-y-1">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block rounded-md px-2 py-1.5 text-xs leading-relaxed transition ${
                      activeId === item.id
                        ? "bg-[var(--ml-gold)]/15 text-[var(--ml-gold)]"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
