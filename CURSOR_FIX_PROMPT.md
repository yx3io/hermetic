# Cursor Fix Prompt — All Outstanding Issues

## Context

This is the Hermes Archaeology Museum project. An AI agent (Hermes) examines its own source code's daily commits, writes reflections, and generates artwork. The site displays these as "artifacts" with memory state panels, dossier/autopsy notes, and a timeline.

The project currently has 4 bugs/inconsistencies that need fixing across the codebase.

---

## Issue 1: Wrong Source Links (about page + layout footer)

**Problem:** Two places link to `https://github.com/NousResearch/hermes-agent` (the upstream Hermes Agent repo). They should link to THIS project's repo.

**Files to fix:**

### `web/src/app/about/page.tsx` line 26
Change:
```tsx
href="https://github.com/NousResearch/hermes-agent"
```
To:
```tsx
href="https://github.com/yx3io/hermetic"
```

### `web/src/app/layout.tsx` line 62
Change:
```tsx
href="https://github.com/NousResearch/hermes-agent"
```
To:
```tsx
href="https://github.com/yx3io/hermetic"
```

---

## Issue 2: `skills_used` Is Always Empty — Populate It From Real Data

**Problem:** The "Autopsy notes" panel on each artifact page shows `skillsUsed` but it's always `[]` because `seed_db.py` hardcodes it. The project HAS a `web/src/data/skills.json` file that maps skill categories to the dates they first appeared. We should use this to populate skills_used realistically.

**What to do:**

### `web/pipeline/seed_db.py` — update `build_dossier()` function

Replace the current `build_dossier` function (lines 62-81) with one that:

1. Accepts `date` as a parameter (in addition to `day`)
2. Loads `web/src/data/skills.json` (path: `ROOT / "src" / "data" / "skills.json"`)
3. For each artifact date, finds which skill categories have `firstDate <= date`
4. Collects the individual skill names from those categories
5. Also scans commit messages for skill-related keywords to add `"archaeology-museum"` if any commit mentions "skill" or "museum"
6. Always includes `"archaeology-museum"` (since that's the skill driving the whole reflection pipeline)
7. Returns those as `skills_used`

Here's the exact replacement:

```python
# Load skills data once at module level
SKILLS_JSON = ROOT / "src" / "data" / "skills.json"

def _load_skills_by_date():
    """Build a map: date -> list of skill names available by that date."""
    if not SKILLS_JSON.exists():
        return {}
    data = json.loads(SKILLS_JSON.read_text())
    categories = data.get("categories", [])
    # Sort by firstDate so we can accumulate
    result = {}
    for cat in categories:
        first_date = cat.get("firstDate", "")  # e.g. "2026-03-17"
        skills = cat.get("skills", [])
        if first_date and skills:
            result[first_date] = skills
    return result

_SKILLS_BY_DATE = _load_skills_by_date()

def get_skills_available_on(date: str) -> list[str]:
    """Return all skill names that existed by a given date."""
    available = ["archaeology-museum"]  # always present — it drives the pipeline
    for first_date, skills in _SKILLS_BY_DATE.items():
        if first_date <= date:
            # Pick 1-3 representative skills from this category
            available.extend(skills[:2])
    return list(dict.fromkeys(available))  # deduplicate, preserve order


def build_dossier(day, date: str):
    commits = day.get("commits", [])
    commits_read = [
        {"sha": c.get("sha", ""), "message": c.get("message", ""), "author": c.get("author", "")}
        for c in commits[:20]
    ]
    themes = day.get("themes", []) or ["daily"]
    
    skills_used = get_skills_available_on(date)
    
    process_notes = (
        f"consumed {len(commits_read)} specimens. "
        f"dominant signals: {', '.join(themes)}. "
        f"skills loaded: {', '.join(skills_used[:4])}. "
        f"rendered in one pass."
    )
    return {
        "commits_read": commits_read,
        "skills_invented": [],
        "skills_used": skills_used,
        "references_pulled": [],
        "process_notes": process_notes,
        "iterations": 1,
    }
```

### Also update the call site in `seed()` (line 119):

Change:
```python
dossier = build_dossier(day)
```
To:
```python
dossier = build_dossier(day, date)
```

---

## Issue 3: Artifact Page — Hide Empty Skills Section, Show Skills as Links

**Problem:** On the artifact page (`web/src/app/artifact/[date]/page.tsx`), the Autopsy notes panel renders an empty `<div>` when skillsUsed is `[]`. After Issue 2 is fixed, skills will be populated — but we should also:

1. Hide the skills flex-wrap div entirely when there are no skills (defensive)
2. When skills ARE present, render each skill name as a pill/badge (already done) but also add a subtle subtitle "skills loaded" above them

### `web/src/app/artifact/[date]/page.tsx` — lines 200-209

Replace:
```tsx
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
```

With:
```tsx
{dossierData.skillsUsed.length > 0 && (
  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
    <div className="text-[9px] uppercase tracking-wider text-[var(--color-muted)] mb-2">
      skills loaded
    </div>
    <div className="flex flex-wrap gap-1.5">
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
)}
```

---

## Issue 4: Memory Panel — Add Explanatory Label

**Problem:** The "Agent Memory State" panel shows memory entries but doesn't explain what they are. Viewers might think these are real-time memories. We should add a one-line explanation.

### `web/src/app/artifact/[date]/page.tsx` — lines 158-161

After the "Agent Memory State" header div, add a description line. Replace:
```tsx
<div className="text-[9px] tracking-[0.2em] uppercase text-[var(--color-muted)] mb-4">
  Agent Memory State
</div>
<div className="text-[9px] text-[var(--color-muted)] mb-4 font-mono">
  {memoryCapacity}% capacity &middot; {memoryEntries.length} entries
</div>
```

With:
```tsx
<div className="text-[9px] tracking-[0.2em] uppercase text-[var(--color-muted)] mb-2">
  Agent Memory State
</div>
<div className="text-[8px] text-[var(--color-muted)] mb-3 leading-relaxed">
  cumulative memory at time of creation — oldest entries evicted at 2200 char capacity
</div>
<div className="text-[9px] text-[var(--color-muted)] mb-4 font-mono">
  {memoryCapacity}% capacity &middot; {memoryEntries.length} entries
</div>
```

---

## After All Code Changes

Run the database re-seed to pick up the skills_used changes:

```bash
cd web/pipeline && python3 seed_db.py
```

Then rebuild:

```bash
cd web && npm run build
```

Verify:
1. Footer "source" link goes to `https://github.com/yx3io/hermetic`
2. About page "source →" link goes to `https://github.com/yx3io/hermetic`  
3. Artifact pages show skill pills in autopsy notes (e.g. "archaeology-museum", "apple-notes", etc.)
4. Memory panel has the explanatory subtitle
5. `npm run build` completes with no errors

---

## Summary of files to modify

| File | What |
|------|------|
| `web/src/app/about/page.tsx` | Fix source link URL (line 26) |
| `web/src/app/layout.tsx` | Fix footer source link URL (line 62) |
| `web/pipeline/seed_db.py` | Populate skills_used from skills.json data + update build_dossier signature |
| `web/src/app/artifact/[date]/page.tsx` | Conditionally render skills section + add memory explanation label |
