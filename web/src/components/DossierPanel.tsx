"use client";

import { useState } from "react";

interface Commit {
  sha: string;
  message: string;
  author: string;
}

interface DossierData {
  commitsRead: Commit[];
  skillsInvented: string[];
  skillsUsed: string[];
  referencesPulled: string[];
  processNotes: string;
  iterations: number;
}

export function DossierPanel({ data }: { data: DossierData }) {
  const [commitsOpen, setCommitsOpen] = useState(false);

  return (
    <div className="border border-[var(--color-border)]">
      <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <span className="text-[10px] tracking-widest uppercase text-[var(--color-dim)]">
          Creation Dossier
        </span>
      </div>
      <div className="p-4 space-y-5 text-[12px]">
        {/* Process Notes */}
        <Field label="Process Notes">
          <p className="text-[var(--color-fg)] leading-relaxed">{data.processNotes}</p>
        </Field>

        {/* Iterations */}
        <Field label="Iterations">
          <span className="tabular-nums">{data.iterations}</span>
        </Field>

        {/* Skills Used */}
        <Field label="Skills Applied">
          <div className="flex flex-wrap gap-2">
            {data.skillsUsed.map((s) => (
              <code
                key={s}
                className="text-[11px] px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)]"
              >
                {s}
              </code>
            ))}
          </div>
        </Field>

        {/* Skills Invented */}
        {data.skillsInvented.length > 0 && (
          <Field label="Skills Invented">
            <div className="flex flex-wrap gap-2">
              {data.skillsInvented.map((s) => (
                <code
                  key={s}
                  className="text-[11px] px-2 py-0.5 bg-yellow-50 border border-yellow-200"
                >
                  {s} (new)
                </code>
              ))}
            </div>
          </Field>
        )}

        {/* Commits Read */}
        <Field label={`Commits Read (${data.commitsRead.length})`}>
          <button
            onClick={() => setCommitsOpen(!commitsOpen)}
            className="text-[11px] text-[var(--color-dim)] hover:text-[var(--color-fg)] underline"
          >
            {commitsOpen ? "Collapse" : "Expand"}
          </button>
          {commitsOpen && (
            <div className="mt-2 space-y-1 max-h-[300px] overflow-auto">
              {data.commitsRead.map((c) => (
                <div key={c.sha} className="flex gap-3 text-[11px]">
                  <code className="text-[var(--color-dim)] shrink-0">{c.sha}</code>
                  <span className="text-[var(--color-fg)] truncate">{c.message}</span>
                </div>
              ))}
            </div>
          )}
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-widest uppercase text-[var(--color-dim)] mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
