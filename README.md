# Hermes Archaeology Museum

An AI examines its own source code and renders each day as a generative artifact.

The Hermes Agent reads daily commit history from its own repo, writes reflections
using persistent memory and a custom skill, and generates p5.js visualizations.
A Next.js gallery displays the growing collection.

Built for the Nous Research Hermes Agent Creative Hackathon.

## How It Works

1. `generators/fetch_daily.py` pulls commit history from GitHub
2. `generators/orchestrator.py` generates p5.js art for each day
3. `generators/hermes_reflect_agent.py` invokes Hermes Agent to write reflections
   - Uses the `archaeology-museum` skill for voice/persona
   - Agent memory persists across days (it remembers what it wrote before)
   - Each day's memory state is captured and displayed in the gallery
4. `web/pipeline/seed_db.py` loads everything into SQLite
5. `web/` serves the gallery via Next.js

## Setup

```bash
pip install -r requirements.txt
cd web && npm install

# Generate data
python generators/fetch_daily.py
python generators/orchestrator.py
python generators/hermes_reflect_agent.py

# Seed database
cd web && python pipeline/seed_db.py

# Run
cd web && npm run dev
```

## Hermes Agent Integration

This project uses Hermes Agent (not raw API calls) because the agent provides:

- **Persistent memory** — the agent remembers past reflections and builds continuity
- **Skills** — `archaeology-museum` defines the observer voice and constraints
- **Sessions** — each generation run is a searchable session
- **Tools** — the agent can use its full toolset during reflection

The `hermes-skill/SKILL.md` file contains the skill definition.

## License

MIT
