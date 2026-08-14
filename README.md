# Feeling Yachty WordPress chatbot

WordPress plugin that chats with guests and recommends **live** boats from the fleet plugin.

## How the fleet plugin works

Read and **keep updating** [docs/feeling-yachty-suite.md](docs/feeling-yachty-suite.md). That file is the living manual for **feeling-yachty-suite 3.65.0** (yachts, Woo shortcodes, `fy-*` UI, REST, webhooks). Update it in the same PR as any Suite upgrade.

## The fleet plugin

**`feeling-yachty-suite` 3.65.0** is the fleet plugin. It is already running on [feelingyachty.com](https://feelingyachty.com/) and exposes:

| Endpoint | Role |
| --- | --- |
| `/wp-json/fy/v1/yachts` | Full yacht records (size, capacity, pink, pricing rows, marina, Woo product URL) |
| `/wp-json/fy/v1/fleets` | Fleet slugs (`miami-yacht-rental`, `miami-yacht-rentals`, `panama-yacht-rentals`) |
| `/wp-json/fy/v1/fleets/{slug}/yachts` | Yachts in one fleet |

This repository does **not** contain the Suite 3.65.0 source zip. That plugin stays on the production WordPress site. This repo is the chatbot that sits on top of it.

## What this plugin does

- Floating site widget (EN/ES)
- Asks Miami vs Panama, then guests / hours
- Matches only published Suite records (pink, size, capacity, budget, free-hour)
- Quotes prices from Suite `pricing[]` rows — never invented
- Optional n8n webhook (Mom Bot / Support Receptionist). Fleet cards still come from Suite.
- Handoff copy for Karen + configurable SMS number (default `+1-754-325-3827`)

## Install

1. Activate **feeling-yachty-suite 3.65.0** on the same WordPress site.
2. Copy `feeling-yachty-chatbot/` into `wp-content/plugins/`.
3. Activate **Feeling Yachty Fleet Chatbot**.
4. **Settings → FY Fleet Chatbot**.

Shortcode: `[fy_fleet_chat]`

Chat REST: `POST /wp-json/fy-chatbot/v1/chat`  
Health (admins): `GET /wp-json/fy-chatbot/v1/health`

## Tests

```bash
php feeling-yachty-chatbot/tests/test-intent-and-match.php
```
