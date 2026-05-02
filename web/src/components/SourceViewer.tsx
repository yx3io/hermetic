"use client";

import { useState } from "react";

export function SourceViewer({ code, filename }: { code: string; filename: string }) {
  const [open, setOpen] = useState(false);

  function handleDownload() {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border border-[var(--color-border)]">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <span className="text-[10px] tracking-widest uppercase text-[var(--color-dim)]">
          Source Code
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="text-[11px] px-3 py-1 border border-[var(--color-border)] hover:border-[var(--color-fg)] transition-colors"
          >
            {open ? "Hide Source" : "View Source"}
          </button>
          <button
            onClick={handleDownload}
            className="text-[11px] px-3 py-1 border border-[var(--color-border)] hover:border-[var(--color-fg)] transition-colors"
          >
            Download .html
          </button>
        </div>
      </div>
      {open && (
        <div className="max-h-[500px] overflow-auto">
          <pre className="text-[11px] leading-relaxed p-4 text-[var(--color-dim)] whitespace-pre-wrap break-all">
            {code}
          </pre>
        </div>
      )}
    </div>
  );
}
