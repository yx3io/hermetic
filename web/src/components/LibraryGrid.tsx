interface CategoryGroup {
  category: string;
  skills: string[];
  firstDay: number;
  firstDate: string;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function PixelIcon({ category }: { category: string }) {
  const seed = hash(category);
  const size = 8;
  const cells: boolean[][] = [];

  // Vertically symmetric pattern seeded by category name
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      const mx = x < size / 2 ? x : size - 1 - x;
      const v = ((seed * (y * 13 + mx * 7 + 3)) >>> 0) % 100;
      row.push(v < 42);
    }
    cells.push(row);
  }

  const hue = seed % 360;

  return (
    <div
      className="grid shrink-0"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        width: 28,
        height: 28,
        gap: 1,
      }}
    >
      {cells.flat().map((on, i) => (
        <div
          key={i}
          style={{
            background: on
              ? `hsl(${hue} 30% 55%)`
              : "transparent",
            borderRadius: 0.5,
          }}
        />
      ))}
    </div>
  );
}

export default function LibraryGrid({
  categories,
}: {
  categories: CategoryGroup[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in-delay">
      {categories.map((cat) => (
        <div
          key={cat.category}
          className="flex items-start gap-3 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-muted)] transition-colors group"
        >
          <PixelIcon category={cat.category} />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between mb-1.5">
              <code className="text-[12px] text-[var(--color-fg)]">
                {cat.category}
              </code>
              <span className="text-[9px] text-[var(--color-muted)] font-mono">
                {cat.skills.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {cat.skills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="text-[9px] font-mono px-1 py-0.5 text-[var(--color-dim)]"
                >
                  {skill}
                </span>
              ))}
              {cat.skills.length > 6 && (
                <span className="text-[9px] font-mono px-1 py-0.5 text-[var(--color-muted)]">
                  +{cat.skills.length - 6}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
