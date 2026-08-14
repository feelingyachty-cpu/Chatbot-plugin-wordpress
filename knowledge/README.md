# Feeling Yachty Interior Knowledge Repository

This is the social media, Meta Ads, and Google marketing brain for Feeling Yachty.

Nala’s briefing module is [`dash/index.html`](../dash/index.html). Pac-Man owns the command dashboard. Nala upgrades it with cards in [`dash/data/pacman-cards.json`](../dash/data/pacman-cards.json). Chain of command: [`org.md`](org.md).

## How this is used

| Who | What they do |
| --- | --- |
| Pac-Man (supervisor) | Owns the command dashboard. Approves cards. Routes work. |
| Nala (this agent) | Reads daily sources, writes briefings, submits Pac-Man cards, uses Meta / Google skills. Reports to Pac-Man. |
| You | Skim Pac-Man’s dash (or Nala’s module). Open a source link only when you want the full article. |

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
3. Mirror the same items into `dash/data/briefing.json` and Pac-Man cards into `dash/data/pacman-cards.json`.
4. Surface only decisions, platform changes, and Feeling Yachty actions. Do not dump raw article text.
5. Do not publish site or ads changes. Submit a card to Pac-Man.
