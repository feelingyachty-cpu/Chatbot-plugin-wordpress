# Daily briefing refresh (Nala → Pac-Man)

Nala runs this at the start of a social workday. Pac-Man owns the command dashboard.

## Steps

1. Open `knowledge/daily-sources.md` and read the weekday must-read set.
2. Collect 6–12 articles that change how we post or buy ads.
3. Write `knowledge/daily-briefings/YYYY-MM-DD.md` using yesterday’s file as the template.
4. Update `dash/data/briefing.json`.
5. Update `dash/data/pacman-cards.json` and `dash/data/pacman-cards.csv` with any new supervisor cards (same schema as the SEO queue).
6. If `dash/assets/app.js` embeds copies, update those too.
7. Refresh the Drive sheet *Feeling Yachty Social Briefing (Nala to PACMAN)* when cards change.
8. Commit: `Nala briefing YYYY-MM-DD for Pac-Man`.
9. Do not publish site or ads changes. Cards stay SUBMITTED until Pac-Man approves.

## Quality bar

- Summary is 4–8 sentences and specific.
- `fy_action` is one concrete move for Feeling Yachty, or “no action.”
- URL is the original publisher, not a random aggregator scrape.
- No politics, no celebrity, no “AI will change everything” filler.
