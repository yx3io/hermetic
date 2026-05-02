import Link from "next/link";

interface Props {
  date: string;
  tag: string;
  filename: string;
  reflection: string;
  aestheticUsed: string[];
  releaseName: string;
}

export function ArtifactCard({
  date,
  tag,
  filename,
  reflection,
  aestheticUsed,
  releaseName,
}: Props) {
  return (
    <article className="border-b border-[var(--color-border)] py-10 first:pt-6">
      <Link href={`/artifact/${date}`} className="block group">
        <div className="flex items-baseline gap-4 mb-4">
          <time className="text-xs text-[var(--color-dim)] tabular-nums">{date}</time>
          <span className="text-xs text-[var(--color-dim)]">{tag}</span>
          <span className="text-[10px] text-[var(--color-dim)] uppercase tracking-widest">
            {aestheticUsed.map((a) => a.replace(/_/g, " ")).join(" + ")}
          </span>
        </div>

        {/* Live preview */}
        <div className="relative w-full h-[280px] bg-[#080810] border border-[var(--color-border)] overflow-hidden mb-5">
          <iframe
            src={`/artifacts/${filename}`}
            className="w-[300%] h-[300%] origin-top-left pointer-events-none"
            style={{ transform: "scale(0.3333)" }}
            loading="lazy"
            sandbox="allow-scripts"
            tabIndex={-1}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/60 group-hover:to-white/40 transition-all" />
        </div>

        {/* Monologue excerpt */}
        <div className="font-mono text-xs leading-[2] text-[var(--color-dim)] max-w-2xl italic">
          {reflection.split("\n").slice(0, 2).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <div className="mt-3 text-[10px] text-[var(--color-dim)] uppercase tracking-wider">
          View artifact &rarr;
        </div>
      </Link>
    </article>
  );
}
