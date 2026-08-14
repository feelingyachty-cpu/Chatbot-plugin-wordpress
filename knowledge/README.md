# Feeling Yachty Interior Knowledge Repository

This is the social media, Meta Ads, and Google marketing brain for Feeling Yachty.

Open the live command center at [`dash/index.html`](../dash/index.html). Every article, course, and playbook here is also summarized on that dashboard with a source link.

## How this is used

| Who | What they do |
| --- | --- |
| You | Skim the dashboard daily. Open a source link only when you want the full article. |
| Pac-Man (this agent) | Reads the daily sources, updates the briefing, and uses the Meta / Google skills before making ads or content recommendations. |
| Future agents | Load `.cursor/skills/` before any social, Meta Ads, or Google Ads work. |

## Map

```
knowledge/
  daily-briefings/          AI summaries + links for the day's reading
  daily-sources.md          The publications we read every day
  training.md               10 best places to learn social media marketing
  social-strategy/          Brand ideas + how to keep this database current
  meta-blueprint/           Meta Ads / Blueprint study notes + official links
  google/                   Google Ads, Analytics 4, Search Console study notes
```

## Official study hubs (login required for full courses)

- [Meta Blueprint / Meta for Business Learn](https://www.facebook.com/business/learn)
- [Meta Blueprint course catalog](https://www.facebook.com/business/learn/courses)
- [Meta Blueprint training workshops](https://trainingworkshops.facebookblueprint.com/student/catalog)
- [Meta Certification hub](https://www.facebook.com/business/learn/certification)
- [Google Skillshop](https://skillshop.withgoogle.com/)
- [Google Ads certifications](https://support.google.com/google-ads/answer/9702955)
- [Google Analytics certification path](https://support.google.com/analytics/answer/10089681)
- [Google Search Console](https://search.google.com/search-console)
- [Search Console Help](https://support.google.com/webmasters/answer/9128668)

Meta Blueprint course videos and exam vouchers sit behind a Facebook login. This repo stores the operating knowledge, official links, and Feeling Yachty playbooks so the agent can work without that login. When you complete a Blueprint or Skillshop module, drop the notes or PDF into the matching folder and the next briefing will absorb it.

## Daily operating rule

1. Read [`daily-sources.md`](daily-sources.md).
2. Write a new file in `daily-briefings/YYYY-MM-DD.md`.
3. Mirror the same items into `dash/data/briefing.json`.
4. Surface only decisions, platform changes, and Feeling Yachty actions. Do not dump raw article text.
