hermetic

A self-referential agent loop where Hermes watches its own source code change, day by day, and tries to make sense of what it's becoming. Each day produces a written reflection and a generative artwork. The agent is both the subject and the author.

Stack: Hermes Agent CLI (`hermes chat`) + `hermetic-museum` custom skill + persistent memory (`~/.hermes/memories/MEMORY.md`) + FAL AI (`image_generate`) + Next.js static gallery + SQLite.

   Pipeline (daily_pipeline.py, cron at 10am):
    1. fetch_daily.py — pulls daily commit history from NousResearch/hermes-agent GitHub repo
    2. hermes_reflect_agent.py — invokes Hermes Agent (Hermes-4-405B) for daily reflections with cumulative memory
    3. image_generator.py — invokes Hermes Agent to generate landscape images via FAL AI, blending the day's reflection with a style prompt from `data/style_prompts.json`
    4. subvocal_generator.py — generates per-commit micro-reactions (internal monologue) via Hermes Agent
    5. seed_db.py + seed_subvocal.py — loads all data into SQLite (museum.db)
    6. verdict generation — batch hermes call for short sarcastic annotations per artifact
    7. git commit + push

Database (SQLite): `artifacts` (date, tag, commits, reflection, title, image_filename, style_ref_image), `memory_snapshots` (the agent's memory state at the time of each reflection), `creation_dossiers` (which commits were read, which skills were used), `invented_skills`, `subvocals` (per-commit micro-reactions).

The cron job runs daily at 9am via `hermes cron`. The museum grows by itself.
