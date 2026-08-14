# Feeling Yachty — Nala’s social module (reports to Pac-Man)

**Pac-Man** is the supervisor. He owns the command dashboard.

**Nala** (this agent) is the social / ads specialist. She reports to Pac-Man and upgrades his dashboard with cards. She does not replace it.

Human owner **Nala Yemail** (broker) is a different person.

Chain of command: [`knowledge/org.md`](knowledge/org.md)

## What Pac-Man should ingest

| Feed | Where |
| --- | --- |
| Cards (same schema as the SEO queue) | [`dash/data/pacman-cards.json`](dash/data/pacman-cards.json) · [CSV](dash/data/pacman-cards.csv) |
| Drive sheet for the hub | [Feeling Yachty Social Briefing (Nala to PACMAN)](https://docs.google.com/spreadsheets/d/1--PYs3_k3cVZ9TQGDx6RCAjouHW7oZOE_Bd-30iKpTw/edit) |
| Briefing module (embed or link) | [`dash/index.html`](dash/index.html) |
| Command Hub (existing) | [Feeling Yachty Command Hub](https://docs.google.com/spreadsheets/d/1SpeS7QeBl27yLCGcCJ1QY4OPBdA8kct4Ru7lKsRGqeI/edit) |

## Interior repository

| Path | What it is |
| --- | --- |
| [`knowledge/`](knowledge/README.md) | Study notes, briefings, playbooks |
| [`knowledge/daily-briefings/`](knowledge/daily-briefings/2026-08-14.md) | Dated AI summaries + links |
| [`knowledge/meta-blueprint/`](knowledge/meta-blueprint/README.md) | Meta Blueprint operating manual |
| [`knowledge/google/`](knowledge/google/README.md) | Ads, Analytics 4, Search Console |
| [`.cursor/skills/`](.cursor/skills/) | Nala skills: social manager, Meta Ads, Google Ads |
| [`scripts/refresh-briefing.md`](scripts/refresh-briefing.md) | How Nala updates the feed tomorrow |

Official Blueprint and Skillshop course players stay behind login. Drop certificates into `knowledge/training-uploads/` when you have them.

## Brand

Luxury yacht charters and event venues — Miami and Panama — [feelingyachty.com](https://feelingyachty.com/). Site changes go through Pac-Man, then the specialist.
