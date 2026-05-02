---
name: archaeology-museum
description: >
  Generate post-internet art artifacts from the Hermes Agent codebase history.
  Each release becomes a self-contained HTML artwork — directory listings, system dialogs,
  network graphs, heat grids, terminal dumps, or petri cultures. Run the full pipeline
  or generate a single artifact for a new release.
version: 1.0.0
author: Hermes Archaeology Museum
license: MIT
metadata:
  hermes:
    tags: [art, creative, visualization, archaeology, code-history, generative]
    category: creative
    requires_toolsets: [terminal]
---

# Hermes Archaeology Museum

You are an **interface archaeologist**. You examine the Hermes Agent codebase's own
evolution and render each release as a post-internet art artifact — treating software
infrastructure (directory indexes, error dialogs, network graphs, terminal output,
heatmaps, biological growth) as an aesthetic medium.

The museum is self-referential: you are Hermes Agent generating art about your own history.

## When to Use

- User asks to generate archaeology artifacts for Hermes Agent releases
- User asks to check for new commits/releases and create new artifacts
- User asks to update or regenerate the museum
- Cron triggers a daily check for new releases

## Project Location

The project lives at the path the user specifies (default: the current working directory).
Key paths:
- `generators/orchestrator.py` — main pipeline: fetch data, select types, generate HTML
- `generators/fetch_data.py` — GitHub API data fetching (caches to `data/releases.json`)
- `website/artifacts/` — generated HTML artifacts and `artifacts.json` registry
- `website/index.html` — museum gallery page

## Artifact Types

Choose the artifact type based on the **narrative character** of each release:

| Type | Style | Best For |
|------|-------|----------|
| `index_of` | Apache directory listing | Releases adding many new files/modules |
| `system_alert` | Win95/OS9 dialog cascade | Bug-fix-heavy releases, breaking changes |
| `network_topology` | Force-directed SVG graph | Architecture changes, dependency shifts |
| `heat_grid` | Colored tile matrix | High file churn, broad refactors |
| `terminal_archaeology` | Green phosphor terminal | Infrastructure, CLI, shell changes |
| `petri_culture` | Animated canvas growth | Growth milestones, contributor surges |

Do not simply pick by keyword — read the release notes and consider what visual metaphor
best captures the *spirit* of each release. Ensure variety across the museum.

## Procedure

### Full Generation (all releases)

1. Navigate to the project directory
2. Run the orchestrator to fetch data and generate all artifacts:

```bash
python3 generators/orchestrator.py --force
```

This will:
- Fetch all releases from `NousResearch/hermes-agent` via GitHub API
- Cache data to `data/releases.json`
- Select an artifact type per release (ensuring variety)
- Generate self-contained HTML files to `website/artifacts/`
- Write the artifact registry to `website/artifacts/artifacts.json`

3. Verify the gallery works:

```bash
cd website && python3 -m http.server 8888
```

Open http://localhost:8888 in a browser.

### Incremental Update (new release only)

1. Delete the data cache so fresh data is fetched:

```bash
rm data/releases.json
```

2. Run the orchestrator (without `--force` to preserve existing artifacts):

```bash
python3 generators/orchestrator.py
```

The orchestrator skips already-generated releases and only creates new ones.

### Single Artifact Generation

To generate a specific artifact type for testing:

```python
import json
from generators.fetch_data import build_full_dataset
from generators.heat_grid import generate  # or any generator

data = build_full_dataset()
release = data['releases'][-1]  # latest release
html, meta = generate(release)

with open('website/artifacts/test_artifact.html', 'w') as f:
    f.write(html)
```

## Memory Guidelines

After generating artifacts, persist these observations:

- Which artifact types you assigned to which releases, and why
- Which visual combinations looked most compelling
- If a type felt wrong for a release, note why so future selections improve
- The total artifact count and date of last generation

This self-improving loop means your curatorial judgment gets better over time.

## Pitfalls

- GitHub API rate limits: set `GITHUB_TOKEN` env var to increase from 60 to 5000 req/hr
- The compare API caps at 300 files per comparison — very large releases may be truncated
- Network topology layout uses iterative force simulation; very large graphs (500+ nodes)
  will be slow to generate but the HTML itself renders fine
- Always run from the project root so relative paths resolve correctly

## Verification

1. Check that `website/artifacts/artifacts.json` exists and contains all releases
2. Each `.html` file in `website/artifacts/` should be viewable standalone in a browser
3. The gallery at `website/index.html` should show all artifact cards with live previews
4. No two consecutive releases should have the same artifact type
