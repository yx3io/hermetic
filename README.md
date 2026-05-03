# hermetic

hermes agent watching its own source change, day by day, and tries to make sense of what it's becoming.

each day produces a reflection and a generative artifact.

## How It Works

1. `generators/fetch_daily.py` pulls commit history from GitHub
2. `generators/orchestrator.py` generates p5.js art for each day
3. `generators/hermes_reflect_agent.py` invokes Hermes Agent to write reflections
   - Uses the `archaeology-museum` skill for voice/persona
   - Agent memory persists across days (it remembers what it wrote before)
   - Each day's memory state is captured and displayed in the gallery
4. `generators/image_generator.py` generates landscape images via Hermes Agent + FAL AI
5. `web/pipeline/seed_db.py` loads everything into SQLite
6. `web/` serves the gallery via Next.js

### Image Generation

Each day also gets a landscape artwork generated via FAL AI through Hermes Agent:

1. `generators/image_generator.py` reads the day's reflection from `hermes_output.json`
2. It selects a style reference image from the taste library (day N -> image N.jpg)
3. Hermes Agent analyzes the reference image's visual style via `vision_analyze`
4. The agent crafts a generation prompt combining the reflection's themes with the reference style
5. The agent calls `image_generate` with `aspect_ratio="landscape"` via FAL AI
6. The resulting image is saved to `web/public/artifacts/{date}_fal.png`

This means every AI operation — reflection writing, style analysis, prompt crafting,
and image generation — goes through Hermes Agent's tool system with full memory and
session tracking.

## Quick Start

```bash
pip install -r requirements.txt
cd web && npm install && cd ..

# Run the full pipeline
./run_pipeline.sh

# Or run steps individually:
python generators/fetch_daily.py
python generators/orchestrator.py
python generators/hermes_reflect_agent.py
python generators/image_generator.py

# Seed and run
cd web && python pipeline/seed_db.py && npm run dev
```

## Hermes Agent Integration

- **Persistent memory** — the agent remembers past reflections and builds continuity
- **Skills** — `archaeology-museum` defines the observer voice and constraints
- **Sessions** — each generation run is a searchable session
- **Tools** — the agent can use its full toolset during reflection

The `hermes-skill/SKILL.md` file contains the skill definition.

## License

MIT
