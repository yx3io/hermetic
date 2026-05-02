import Link from "next/link";
import { getAllArtifacts } from "@/lib/db";
import { getSpecimenTitle, getVerdictLine } from "@/lib/voice";

export const dynamic = "force-static";
export const revalidate = 3600;

export default function TimelinePage() {
  const artifacts = getAllArtifacts();

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-12 animate-in">
        <h1 className="text-[11px] tracking-[0.3em] uppercase text-[var(--color-muted)]">
          Timeline
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in-delay">
        {artifacts.map((art, idx) => {
          const chronologicalIndex = artifacts.length - 1 - idx;
          const title = art.title
            ? `${art.title} (${chronologicalIndex + 1})`
            : getSpecimenTitle(art.date, art.tag, chronologicalIndex);
          const verdict = getVerdictLine(art.date);
          const excerptLines = art.reflection
            ? art.reflection.split("\n").slice(0, 2)
            : [];

          return (
            <Link
              key={art.id}
              href={`/artifact/${art.date}`}
              className="group block bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-muted)] transition-all overflow-hidden"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Artwork preview */}
              <div className="relative w-full aspect-[16/10] bg-[#050508] overflow-hidden">
                <iframe
                  src={`/artifacts/${art.filename}`}
                  className="w-[300%] h-[300%] origin-top-left pointer-events-none"
                  style={{ transform: "scale(0.3333)" }}
                  loading="lazy"
                  sandbox="allow-scripts"
                  tabIndex={-1}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent opacity-60" />
              </div>

              {/* Meta */}
              <div className="p-5">
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-sm text-[var(--color-fg)] group-hover:text-white transition-colors">
                    {title}
                  </h2>
                  <time className="text-[10px] text-[var(--color-muted)] tabular-nums font-mono">
                    {art.date}
                  </time>
                </div>

                <div className="text-[10px] text-[var(--color-muted)] font-mono mb-3">
                  {art.tag}
                </div>

                <div className="font-mono text-[11px] leading-[1.8] text-[var(--color-dim)] mb-3">
                  {excerptLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[var(--color-muted)] italic">
                    {verdict}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)] group-hover:text-[var(--color-dim)] transition-colors">
                    &rarr;
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
