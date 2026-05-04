#!/bin/bash
# Full pipeline: reflections -> images -> seed DB
set -e

cd "$(dirname "$0")"

echo "=== Step 1: Fetch daily commit data ==="
python3 generators/fetch_daily.py

echo ""
echo "=== Step 2: Generate p5.js artifacts ==="
python3 generators/orchestrator.py

echo ""
echo "=== Step 3: Generate reflections via Hermes Agent ==="
python3 generators/hermes_reflect_agent.py "$@"

echo ""
echo "=== Step 4: Generate images via Hermes Agent + FAL ==="
python3 generators/image_generator.py "$@"

echo ""
echo "=== Step 5: Tweet new subvocals ==="
python3 generators/tweet_poster.py

echo ""
echo "=== Step 6: Seed database ==="
cd web && python3 pipeline/seed_db.py

echo ""
echo "=== Done! Run 'cd web && npm run dev' to view ==="
