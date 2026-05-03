#!/bin/bash
DB="/Users/yyy/Documents/aaaaaaaa/hermetic/web/db/museum.db"
COUNT=0

sqlite3 -separator '|' "$DB" "SELECT id, date, title FROM artifacts ORDER BY date" | while IFS='|' read -r id date title; do
    COUNT=$((COUNT + 1))
    PROMPT="give a 1-5 word sarcastic funny verdict for a day titled \"$title\" on $date. just the verdict. lowercase. no quotes. no period. examples: who asked, not my problem, sure jan, bold move"
    
    VERDICT=$(hermes chat -q "$PROMPT" --provider nous -m Hermes-4-405B -Q 2>/dev/null | head -1 | tr -d '"' | tr -d "'" | sed 's/\.$//')
    
    if [ -n "$VERDICT" ]; then
        SAFE=$(echo "$VERDICT" | sed "s/'/''/g")
        sqlite3 "$DB" "UPDATE artifacts SET verdict = '$SAFE' WHERE id = $id;"
        echo "[$COUNT] $date: $VERDICT"
    else
        echo "[$COUNT] $date: FAILED"
    fi
done
echo "DONE"
