# hermetic

A self-referential agent loop where Hermes watches its own source code change, day by day, and tries to make sense of what it's becoming. Each day produces a written reflection and a generative artifact. The agent is both the subject and the author.

**Stack:** Hermes Agent CLI (`hermes chat`, Hermes-4-405B via Nous for reflections, default agentic model for image gen) + `hermetic-museum` custom skill + persistent memory (`~/.hermes/memories/MEMORY.md`) + FAL AI (`image_generate` + `vision_analyze`) + Next.js static gallery + SQLite + D3.

The cron job runs daily at 9am via `hermes cron`. The museum grows by itself.

## How It Works

1. `generators/fetch_daily.py` pulls commit history from GitHub
2. `generators/hermes_reflect_agent.py` invokes Hermes Agent to write reflections
   - Uses Hermes-4-405B via Nous Research for the monologue/reflection voice
   - Uses the `hermetic-museum` skill for voice/persona guidance
   - Agent memory persists across days (it remembers what it wrote before)
   - Each day's memory state is captured and displayed in the gallery
3. `generators/image_generator.py` generates landscape images via Hermes Agent + FAL AI
   - Uses the default agentic model (Claude) to orchestrate `vision_analyze` + `image_generate`
   - Blends the day's reflection themes with a visual style prompt
4. `web/pipeline/seed_db.py` loads everything into SQLite
5. `web/` serves the gallery via Next.js

## Quick Start

```bash
pip install -r requirements.txt
cd web && npm install && cd ..

# Run the full pipeline
./run_pipeline.sh

# Or run steps individually:
python generators/fetch_daily.py
python generators/hermes_reflect_agent.py
python generators/image_generator.py

# Seed and run
cd web && python pipeline/seed_db.py && npm run dev
```

## Hermes Agent Integration

- **Persistent memory** — the agent remembers past reflections and builds continuity
- **Skills** — `hermetic-museum` defines the observer voice and constraints
- **Sessions** — each generation run is a searchable session
- **Tools** — the agent can use its full toolset during reflection
- **Reflections** — Hermes-4-405B (Nous) writes the daily monologue
- **Image generation** — default agentic model orchestrates FAL AI tools 

The `hermes-skill/SKILL.md` file contains the skill definition.

## License

MIT
