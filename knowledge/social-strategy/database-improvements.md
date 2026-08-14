# How to keep Pac-Man’s database current

The user asked for ideas so this agent stays a social media expert without rereading the internet from scratch every time. These are the upgrades, in priority order.

## 1. Daily briefing as a file contract (do this now)

Already in place:

- Sources list: `knowledge/daily-sources.md`
- Briefing: `knowledge/daily-briefings/YYYY-MM-DD.md`
- Dashboard feed: `dash/data/briefing.json`

Rule: no article enters the dash without `title`, `url`, `source`, `published`, `summary`, `fy_action`, `tags`.

## 2. Cursor skill load order

On any social / ads task, the agent must read:

1. `.cursor/skills/social-media-manager/SKILL.md`
2. `.cursor/skills/meta-ads-agent/SKILL.md` or `google-ads-agent` as relevant
3. Latest `knowledge/daily-briefings/` file
4. Brand playbooks

This is how “I studied Blueprint” survives a new chat.

## 3. Training uploads drop-box

Create `knowledge/training-uploads/{meta-blueprint,google,hubspot,tiktok,other}/` when the first PDF arrives.

After each Skillshop or Blueprint module, drop:

- Certificate PDF
- 10-line “what changed in my practice” note

A weekly agent pass indexes new files into the dash “Library” tab.

## 4. Automated fetch (next engineering step)

A scheduled job (GitHub Action or Cursor automation) should:

1. Pull RSS / sitemap from Social Media Today, Search Engine Land, Meta news, Google Ads blog, Buffer, Hootsuite
2. Deduplicate by URL
3. Draft summaries into `dash/data/briefing.json`
4. Open a PR or Slack a digest to `#social-media-post-communications`

Until that exists, Pac-Man does it at the start of each working day.

Suggested feeds:

- https://www.socialmediatoday.com/rss.xml
- https://searchengineland.com/feed
- https://blog.google/products/ads-commerce/rss/
- https://buffer.com/resources/rss/
- https://blog.hootsuite.com/feed/

## 5. Performance database (the missing half)

Trend articles without account data make confident-sounding bad advice.

Connect, when credentials exist:

| Data | Why |
| --- | --- |
| Meta Ads insights (account, campaign, ad) | CPA, ROAS, frequency, creative winners |
| Google Ads API | Search terms, wasted spend, RSA assets |
| GA4 Data API | Funnel, landing pages, source/medium |
| Search Console API | Queries, pages, CTR |
| Instagram / Facebook organic insights | Reel 3s, saves |
| CRM / booked flags | Quality of leads |
| Slack inbox log | Response SLA |

Store nightly snapshots in `dash/data/performance/YYYY-MM-DD.json` (no raw PII). The ads agents should refuse to “optimize” without the latest snapshot if one exists.

## 6. Creative + offer inventory

A simple table the agent can read:

- Yacht name, guest cap, market, starting rate, hero clip path, live URL, bookable (y/n)
- Occasion offers (sunset, wedding, corporate)
- Usage rights (music, faces)

Without this, the agent will hallucinate inventory. The Drive listing copy and `fy-url-inventory.csv` are the seed.

## 7. Decision log

`knowledge/social-strategy/decisions.md` — dated notes: “Turned off Display,” “Excluded Audience Network,” “Killed bachelor creative.” Future Pac-Man must read this before reversing a choice.

## 8. Evaluation set

Keep 20 anonymized examples: good lead, junk lead, winning Reel hook, rejected ad, GSC query we should own. Use them to test the agent after knowledge updates.

## 9. Recertification calendar

Put exam expiry dates on the dash. Skillshop = 12 months. Blueprint Associate = 2 years. Professional = 1 year. A stale cert means the notes may be stale too — trigger a re-read of official Help.

## 10. Human override

Fernando can drop a URL into Slack: “add this to the dash.” The agent should summarize and file it the same day. The database should not be a closed club of publications.

## 11. Do not do

- Scrape and store entire copyrighted courses as verbatim dumps
- Keep 400 unread PDFs with no summary
- Let the dash become a news magazine with no FY action line
- Train on fake reviews or invented bookings
