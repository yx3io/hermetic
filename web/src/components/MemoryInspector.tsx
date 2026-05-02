export function MemoryInspector({
  memoryMd,
  capacityPct,
  entriesCount,
}: {
  memoryMd: string;
  capacityPct: number;
  entriesCount: number;
}) {
  return (
    <div className="border border-[var(--color-border)]">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <span className="text-[10px] tracking-widest uppercase text-[var(--color-dim)]">
          Memory at Time of Creation
        </span>
        <span className="text-[10px] text-[var(--color-dim)] tabular-nums">
          {capacityPct}% — {entriesCount} entries
        </span>
      </div>
      <div className="p-4 bg-white">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1 h-1 bg-[var(--color-surface)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-fg)]"
              style={{ width: `${capacityPct}%` }}
            />
          </div>
        </div>
        <pre className="text-[12px] leading-[1.7] whitespace-pre-wrap font-[var(--font-mono)] text-[var(--color-fg)]">
          {memoryMd}
        </pre>
      </div>
    </div>
  );
}
