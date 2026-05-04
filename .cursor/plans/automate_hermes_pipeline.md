# Automate Hermes Museum Pipeline

## Current State
- Pipeline already works locally via `scripts/daily_pipeline.py`
- Hermes cron job exists (runs daily at 10am) but tied to laptop
- Website deploys on Vercel from git pushes
- Commit watcher + tweet poster exist but aren't automated yet

## Goal
Make the entire pipeline run without your laptop open. Two things need automation:
1. **Daily pipeline** (reflections, images, subvocals, verdicts, DB seed, git push → Vercel)
2. **Commit watcher** (poll for new commits every 15min, generate subvocal, tweet)

## Architecture Decision: GitHub Actions for BOTH

Railway is overkill. GitHub Actions gives you:
- Free 2000 min/month (plenty for this)
- Cron scheduling built-in
- Git access built-in (no deploy keys needed)
- Secrets management
- No server to maintain

The only tricky part: Hermes CLI installation + auth in CI.

---

## Task 1: Fix Hermes CLI Installation in CI

**File:** `.github/workflows/hermes-watch.yml`

The current `pip install hermes-agent` is wrong. Hermes installs via:
```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

But in CI we don't need the full agent — we just need to call the Nous API. 
**Better approach:** Use the Nous API directly via `curl` or a thin Python wrapper, skip Hermes CLI entirely in CI.

The generators already use `hermes chat -q` which calls the Nous API. In CI, we can either:
- Option A: Install Hermes CLI properly + inject auth (complex, fragile)
- Option B: Add a `--api-direct` flag to generators that uses `requests` + Nous API instead of `hermes chat -q` (clean, no CLI dependency)

**Recommended: Option B** — add a small `nous_api.py` helper:
```python
# generators/nous_api.py
"""Direct Nous API calls for CI — no Hermes CLI needed."""
import os, requests

def chat(prompt: str, model="Hermes-4-405B") -> str:
    resp = requests.post(
        "https://api.nous.sh/v1/chat/completions",
        headers={"Authorization": f"Bearer {os.environ['NOUS_API_KEY']}"},
        json={"model": model, "messages": [{"role": "user", "content": prompt}]}
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]
```

Then update `hermes_reflect_agent.py`, `subvocal_generator.py`, `image_generator.py` to check:
```python
if os.environ.get("CI"):
    from generators.nous_api import chat as hermes_chat
else:
    # use hermes CLI as before
```

This way: local dev uses full Hermes Agent (memory, skills, etc), CI uses direct API.

---

## Task 2: Create Daily Pipeline Workflow

**File:** `.github/workflows/daily-pipeline.yml`

```yaml
name: Daily Museum Pipeline

on:
  schedule:
    - cron: '0 10 * * *'  # 10am UTC daily
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  pipeline:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Run daily pipeline
        env:
          CI: true
          NOUS_API_KEY: ${{ secrets.NOUS_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          FAL_KEY: ${{ secrets.FAL_KEY }}
        run: python scripts/daily_pipeline.py
      
      - name: Commit and push
        run: |
          git config user.name "hermes-bot"
          git config user.email "hermes-bot@users.noreply.github.com"
          git add data/ web/db/
          git diff --staged --quiet || git commit -m "hermes: daily pipeline $(date +%Y-%m-%d)"
          git push
      
      - name: Trigger Vercel deploy
        if: env.VERCEL_DEPLOY_HOOK != ''
        env:
          VERCEL_DEPLOY_HOOK: ${{ secrets.VERCEL_DEPLOY_HOOK }}
        run: curl -s -X POST "$VERCEL_DEPLOY_HOOK"
```

---

## Task 3: Fix Commit Watcher Workflow

**File:** `.github/workflows/hermes-watch.yml`

Same pattern — use direct API, not Hermes CLI:

```yaml
name: Hermes Commit Watch

on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  watch:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Run commit watcher
        env:
          CI: true
          GITHUB_TOKEN: ${{ secrets.GH_PAT }}
          NOUS_API_KEY: ${{ secrets.NOUS_API_KEY }}
          TWITTER_API_KEY: ${{ secrets.TWITTER_API_KEY }}
          TWITTER_API_SECRET: ${{ secrets.TWITTER_API_SECRET }}
          TWITTER_ACCESS_TOKEN: ${{ secrets.TWITTER_ACCESS_TOKEN }}
          TWITTER_ACCESS_TOKEN_SECRET: ${{ secrets.TWITTER_ACCESS_TOKEN_SECRET }}
        run: python generators/commit_watcher.py
      
      - name: Commit updated data
        run: |
          git config user.name "hermes-bot"
          git config user.email "hermes-bot@users.noreply.github.com"
          git add data/subvocal.json data/tweet_log.json data/last_commit.txt
          git diff --staged --quiet || git commit -m "hermes: new subvocal reactions"
          git push
```

Note: Use `GH_PAT` (personal access token) not `GITHUB_TOKEN` for cross-repo API calls to NousResearch/hermes-agent.

---

## Task 4: Create `generators/nous_api.py`

The thin API wrapper that lets generators work in CI without Hermes CLI.
Needs to handle:
- Chat completions (reflections, subvocals, verdicts)
- Image generation via FAL (not Nous API — images go through FAL directly)

---

## Task 5: Update Generators for CI Mode

Files to modify:
- `generators/hermes_reflect_agent.py` — switch hermes CLI → nous_api in CI
- `generators/subvocal_generator.py` — same
- `generators/image_generator.py` — ensure FAL_KEY env var works in CI
- `scripts/daily_pipeline.py` — remove hardcoded `/Users/yyy` paths, use relative paths

---

## Task 6: GitHub Secrets to Configure

In your repo Settings > Secrets and variables > Actions:

| Secret | What | Where to get it |
|--------|------|-----------------|
| `NOUS_API_KEY` | Nous API bearer token | https://api.nous.sh or hermes auth |
| `GH_PAT` | GitHub personal access token | GitHub Settings > Developer settings > PATs |
| `FAL_KEY` | FAL image generation key | fal.ai dashboard |
| `TWITTER_API_KEY` | Twitter API key | Twitter developer portal |
| `TWITTER_API_SECRET` | Twitter API secret | Twitter developer portal |
| `TWITTER_ACCESS_TOKEN` | Twitter access token | Twitter developer portal |
| `TWITTER_ACCESS_TOKEN_SECRET` | Twitter access secret | Twitter developer portal |
| `VERCEL_DEPLOY_HOOK` | Vercel deploy hook URL | Vercel project > Settings > Git > Deploy Hooks |

---

## Task 7: Remove Hardcoded Paths

`scripts/daily_pipeline.py` has:
```python
PROJECT_DIR = Path("/Users/yyy/Documents/aaaaaaaa/hermetic")
```

Change to:
```python
PROJECT_DIR = Path(__file__).resolve().parent.parent
```

Same pattern for any other file with hardcoded paths.

---

## Order of Execution

1. Create `generators/nous_api.py` (the API wrapper)
2. Fix hardcoded paths in `daily_pipeline.py`
3. Update generators to support CI mode
4. Create `.github/workflows/daily-pipeline.yml`
5. Fix `.github/workflows/hermes-watch.yml`
6. Set up GitHub secrets
7. Test with `workflow_dispatch` (manual trigger)
8. Disable local Hermes cron job once CI is confirmed working

## What You Keep Locally

- Full Hermes Agent experience (memory, skills, session search)
- Manual `run_pipeline.sh` for testing
- The hermetic-museum skill for interactive use

## What Judges See

- GitHub Actions running autonomously
- Commits from "hermes-bot" appearing in the repo
- Twitter posting automatically
- Website updating daily with no human intervention
- The code clearly shows Hermes Agent integration (local) + CI automation (API)
