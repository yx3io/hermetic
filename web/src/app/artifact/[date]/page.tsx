import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllArtifacts,
  getArtifactByDate,
  getMemorySnapshot,
  getDossier,
} from "@/lib/db";
import { SourceViewer } from "@/components/SourceViewer";
import { getSpecimenTitle } from "@/lib/voice";


export function generateStaticParams() {
  return getAllArtifacts().map((a) => ({ date: a.date }));
}

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const artifact = getArtifactByDate(date);
  if (!artifact) notFound();

  const memory = getMemorySnapshot(artifact.id);
  const dossier = getDossier(artifact.id);

  const allArtifacts = getAllArtifacts().reverse();
  const currentIndex = allArtifacts.findIndex((a) => a.date === date);
  const prev = currentIndex > 0 ? allArtifacts[currentIndex - 1] : null;
  const next =
    currentIndex < allArtifacts.length - 1
      ? allArtifacts[currentIndex + 1]
      : null;

  const specimenTitle = artifact.title
    ? `${artifact.title} (${currentIndex + 1})`
    : getSpecimenTitle(artifact.date, artifact.tag, currentIndex);
  const reflection = artifact.reflection;

  const stats = JSON.parse(artifact.stats || "{}");
  const commits: { message?: string; sha?: string }[] = JSON.parse(artifact.commits || "[]");

  const topPaths = _getTopPaths(commits);
  const churn = {
    commits: stats.commits || commits.length || 0,
    prs: stats.merged_prs || 0,
    contributors: stats.contributors || 0,
  };

  const dossierData = dossier ? {
    commitsRead: JSON.parse(dossier.commits_read) as { sha: string; message: string }[],
    skillsUsed: JSON.parse(dossier.skills_used) as string[],
  } : null;

  const memoryCapacity = memory?.capacity_used_pct ?? 0;
  const memoryEntries = memory?.memory_md
    ? memory.memory_md.split("§").filter((s) => s.trim().length > 0)
    : [];

  return (
    <div>
      {/* Full-width artwork */}
      <section className="w-full h-[65vh] min-h-[450px] bg-[#050508] relative">
        <iframe
          src={`/artifacts/${artifact.filename}`}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
        />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
      </section>

      {/* Header overlay */}
      <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-10 mb-10">
        <div className="flex items-end justify-between">
          <div className="animate-in">
            <time className="text-[10px] text-[var(--color-muted)] tabular-nums font-mono">
              {date}
            </time>
            <h1 className="text-xl font-light mt-1 text-[var(--color-fg)]">
              {specimenTitle}
            </h1>
            <div className="text-[11px] text-[var(--color-dim)] mt-1 font-mono">
              {artifact.tag}
            </div>
          </div>
          <div className="flex gap-4 text-[11px] text-[var(--color-muted)] animate-in-delay">
            {prev && (
              <Link
                href={`/artifact/${prev.date}`}
                className="hover:text-[var(--color-dim)] transition-colors"
              >
                &larr; {prev.date}
              </Link>
            )}
            {next && (
              <Link
                href={`/artifact/${next.date}`}
                className="hover:text-[var(--color-dim)] transition-colors"
              >
                {next.date} &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-[1fr_280px] gap-12">
          {/* Left column: Reflection + Source */}
          <div className="space-y-10">
            {/* Reflection */}
            <section className="animate-in-delay">
              <div className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-muted)] mb-4">
                Reflection
              </div>
              <div className="font-mono text-[13px] leading-[2.4] text-[var(--color-dim)]">
                {reflection.split("\n").map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </section>


            {/* Source */}
            <section className="animate-in-delay-2">
              <SourceViewer code={artifact.source_code} filename={artifact.filename} />
            </section>
          </div>

          {/* Right column: Context + Autopsy */}
          <div className="space-y-8 animate-in-delay-2">
            {/* Context snapshot */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
              <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--color-muted)] mb-4">
                Context snapshot
              </div>
              <div className="font-mono text-[10px] text-[var(--color-dim)] space-y-3">
                <div className="space-y-1">
                  {churn.commits > 0 && <div>{churn.commits} commits</div>}
                  {churn.prs > 0 && <div>{churn.prs} PRs</div>}
                  {churn.contributors > 0 && <div>{churn.contributors} contributors</div>}
                </div>
                {topPaths.length > 0 && (
                  <div className="pt-3 border-t border-[var(--color-border)]">
                    <div className="text-[9px] uppercase tracking-wider text-[var(--color-muted)] mb-2">
                      top paths
                    </div>
                    {topPaths.map((p, i) => (
                      <div key={i} className="text-[var(--color-muted)]">{p}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Memory state at time of creation */}
            {memoryEntries.length > 0 && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--color-muted)] mb-1">
                  Memory state
                </div>
                <div className="text-[9px] text-[var(--color-muted)] mb-4 font-mono">
                  {memoryCapacity}% capacity &middot; {memoryEntries.length} entries
                </div>
                <div className="mb-3 h-1 bg-[var(--color-border)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-accent)] transition-all"
                    style={{ width: `${Math.min(100, memoryCapacity)}%` }}
                  />
                </div>
                <div className="font-mono text-[10px] text-[var(--color-dim)] space-y-2">
                  {memoryEntries.slice(-5).map((entry, i) => (
                    <div key={i} className="text-[var(--color-muted)] leading-relaxed">
                      <span className="text-[var(--color-accent)] mr-1">&sect;</span>
                      {entry.trim()}
                    </div>
                  ))}
                  {memoryEntries.length > 5 && (
                    <div className="text-[var(--color-muted)] italic pt-1">
                      +{memoryEntries.length - 5} earlier entries
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Autopsy notes */}
            {dossierData && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5">
                <div className="text-[9px] tracking-[0.2em] uppercase text-[var(--color-muted)] mb-4">
                  Autopsy notes
                </div>
                <div className="font-mono text-[10px] text-[var(--color-dim)] space-y-2">
                  <div>specimens consumed: {dossierData.commitsRead.length}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {dossierData.skillsUsed.map((s) => (
                      <span
                        key={s}
                        className="text-[9px] px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-10 mt-10 border-t border-[var(--color-border)] text-[11px]">
          {prev ? (
            <Link
              href={`/artifact/${prev.date}`}
              className="text-[var(--color-muted)] hover:text-[var(--color-dim)] transition-colors"
            >
              &larr; {prev.tag}
            </Link>
          ) : (
            <span />
          )}
          <Link
            href="/timeline"
            className="text-[var(--color-muted)] hover:text-[var(--color-dim)] transition-colors"
          >
            all fossils
          </Link>
          {next ? (
            <Link
              href={`/artifact/${next.date}`}
              className="text-[var(--color-muted)] hover:text-[var(--color-dim)] transition-colors"
            >
              {next.tag} &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}

function _getTopPaths(commits: { message?: string; sha?: string }[]): string[] {
  const paths: Record<string, number> = {};
  for (const c of commits) {
    const msg = c.message || "";
    const match = msg.match(/^(?:feat|fix|chore|refactor|docs|test)\(([^)]+)\)/);
    if (match) {
      paths[match[1] + "/"] = (paths[match[1] + "/"] || 0) + 1;
    }
  }
  return Object.entries(paths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p, n]) => `${p} (${n})`);
}
