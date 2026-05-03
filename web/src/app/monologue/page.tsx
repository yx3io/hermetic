import { getAllSubvocals } from "@/lib/db";

export const dynamic = "force-static";
export const revalidate = 3600;

function groupByDate(subvocals: ReturnType<typeof getAllSubvocals>) {
  const groups: Record<string, typeof subvocals> = {};
  for (const s of subvocals) {
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toUTCString().slice(17, 22) + " UTC";
  } catch {
    return "";
  }
}

export default function MonologuePage() {
  const subvocals = getAllSubvocals();
  const grouped = groupByDate(subvocals);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-12 animate-in">
        <h1 className="text-[11px] tracking-[0.3em] uppercase text-[var(--color-muted)]">
          Subvocal
        </h1>

      </div>

      <div className="space-y-10 animate-in-delay">
        {grouped.map(([date, entries]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-6">
              <div className="text-[10px] font-mono text-[var(--color-muted)] tabular-nums whitespace-nowrap">
                {date}
              </div>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <div className="text-[10px] font-mono text-[var(--color-muted)]">
                {entries.length}
              </div>
            </div>

            <div className="space-y-5">
              {entries.map((entry) => (
                <div key={entry.id} className="group">
                  <div className="font-mono text-[10px] text-[var(--color-muted)] mb-1.5 flex items-baseline gap-2">
                    <span className="tabular-nums">{formatTime(entry.timestamp)}</span>
                    <span className="text-[var(--color-border)]">&mdash;</span>
                    <span className="text-[var(--color-muted)]">
                      [{entry.sha.slice(0, 7)}]
                    </span>
                    <span className="text-[var(--color-dim)]">{entry.author}</span>
                  </div>

                  {entry.commit_message && !entry.commit_message.startsWith("(") && (
                    <div className="font-mono text-[10px] text-[var(--color-muted)] mb-1.5 pl-2 border-l border-[var(--color-border)] opacity-50">
                      {entry.commit_message.length > 80
                        ? entry.commit_message.slice(0, 77) + "..."
                        : entry.commit_message}
                    </div>
                  )}

                  <div className="font-mono text-[12px] text-[var(--color-dim)] leading-[1.8]">
                    {entry.thought}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {subvocals.length > 0 && (
        <div className="mt-16 pt-6 border-t border-[var(--color-border)] animate-in-delay-2">
          <div className="font-mono text-[10px] text-[var(--color-muted)] flex justify-between">
            <span>{subvocals.length} thoughts recorded</span>
            <span>
              {grouped[0]?.[0]} &rarr; {grouped[grouped.length - 1]?.[0]}
            </span>
          </div>
        </div>
      )}

      {subvocals.length === 0 && (
        <div className="font-mono text-[11px] text-[var(--color-muted)] italic animate-in-delay">
          no subvocal data yet. the inner monologue hasn&apos;t started.
        </div>
      )}
    </div>
  );
}
