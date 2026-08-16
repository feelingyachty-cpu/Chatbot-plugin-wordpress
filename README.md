# Feeling Yachty Suite

Living documentation for **feeling-yachty-suite 3.65.0**, the fleet plugin on [feelingyachty.com](https://feelingyachty.com/).

This repo does **not** ship a website chatbot. **GoHighLevel** handles SMS, WhatsApp, email, and calls.

## Guest app (iPhone + Android)

One Expo codebase: [apps/feeling-yachty](apps/feeling-yachty). **Android test APK:** [dist/Feeling-Yachty.apk](dist/Feeling-Yachty.apk).

Tabs: **Yachts** (browse) · **Promos** (pink boats only — not in browse) · **Talk** (GHL live: call / WhatsApp / SMS / form / inbox message).

Full plan: [docs/app-ghl-woocommerce-plan.md](docs/app-ghl-woocommerce-plan.md).

Upload to WordPress when ready:

- [feeling-yachty-mobile-api](feeling-yachty-mobile-api/) — `fy-app/v1` catalog + quote
- [feeling-yachty-no-chatbot](feeling-yachty-no-chatbot/) — hides Suite Support Bot menus/scripts

## How the fleet plugin works

Read and **keep updating** [docs/feeling-yachty-suite.md](docs/feeling-yachty-suite.md) on every Suite upgrade.

**Staff training PDF** (add a yacht first, then where it appears, settings last): [docs/Feeling-Yachty-Add-a-Yacht-Staff-Guide.pdf](docs/Feeling-Yachty-Add-a-Yacht-Staff-Guide.pdf). Editable source: [docs/guides/add-a-yacht-staff-guide.html](docs/guides/add-a-yacht-staff-guide.html).

Client-ease audit (bugs and fixes): [docs/suite-audit-2026-08-14.md](docs/suite-audit-2026-08-14.md).

The Suite source zip is not in git yet. Production already exposes:

| Endpoint | Role |
| --- | --- |
| `/wp-json/fy/v1/yachts` | Full yacht records (size, capacity, pink, pricing rows, marina, Woo product URL) |
| `/wp-json/fy/v1/fleets` | Fleet slugs (`miami-yacht-rental`, `miami-yacht-rentals`, `panama-yacht-rentals`) |
| `/wp-json/fy/v1/fleets/{slug}/yachts` | Yachts in one fleet |
