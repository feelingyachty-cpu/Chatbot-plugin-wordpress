# Daily briefing refresh

Run this at the start of a social workday (or whenever the user says “update the dash”).

## Steps

1. Open `knowledge/daily-sources.md` and read the weekday must-read set.
2. Collect 6–12 articles that change how we post or buy ads.
3. Write `knowledge/daily-briefings/YYYY-MM-DD.md` using yesterday’s file as the template.
4. Update `dash/data/briefing.json`:
   - `generated_at` ISO timestamp
   - `date`
   - `items[]` with `title`, `url`, `source`, `published`, `summary`, `fy_action`, `tags`
5. If `dash/assets/app.js` embeds a copy of the briefing, update that copy too so `index.html` works from disk.
6. Commit: `Social briefing YYYY-MM-DD`.

## Quality bar

- Summary is 4–8 sentences and specific.
- `fy_action` is one concrete move for Feeling Yachty, or “no action.”
- URL is the original publisher, not a random aggregator scrape.
- No politics, no celebrity, no “AI will change everything” filler.
