#!/bin/bash
#
# Set up the Hermes Archaeology Museum skill and cron job.
# Run this once after cloning the project.
#

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
HERMES_SKILLS_DIR="${HOME}/.hermes/skills"
SKILL_NAME="archaeology-museum"

echo "=== Hermes Archaeology Museum Setup ==="
echo ""

# 1. Install the skill
echo "[1/3] Installing skill to ${HERMES_SKILLS_DIR}/${SKILL_NAME}/"
mkdir -p "${HERMES_SKILLS_DIR}/${SKILL_NAME}/scripts"
cp "${PROJECT_DIR}/hermes-skill/SKILL.md" "${HERMES_SKILLS_DIR}/${SKILL_NAME}/SKILL.md"
cp "${PROJECT_DIR}/hermes-skill/scripts/check_new_releases.py" \
   "${HERMES_SKILLS_DIR}/${SKILL_NAME}/scripts/check_new_releases.py"
chmod +x "${HERMES_SKILLS_DIR}/${SKILL_NAME}/scripts/check_new_releases.py"
echo "  Done."

# 2. Install Python dependencies
echo ""
echo "[2/3] Installing Python dependencies"
pip3 install -q -r "${PROJECT_DIR}/requirements.txt"
echo "  Done."

# 3. Print cron setup instructions
echo ""
echo "[3/3] Cron job setup"
echo ""
echo "To set up daily automated artifact generation, run this in Hermes:"
echo ""
echo '  /cron add "0 0 * * *" "The check_new_releases script output tells you if there are'
echo '  new Hermes Agent releases without artifacts. If NEW_RELEASES_DETECTED, navigate to'
echo '  the project directory shown in the output, delete data/releases.json, and run'
echo '  python3 generators/orchestrator.py to generate new artifacts. If [SILENT], do nothing."'
echo "  --script ${HERMES_SKILLS_DIR}/${SKILL_NAME}/scripts/check_new_releases.py"
echo '  --skill archaeology-museum --name "archaeology-museum-daily"'
echo ""
echo "Or to test immediately:"
echo ""
echo "  ARCHAEOLOGY_PROJECT_DIR=${PROJECT_DIR} python3 ${HERMES_SKILLS_DIR}/${SKILL_NAME}/scripts/check_new_releases.py"
echo ""
echo "=== Setup complete ==="
