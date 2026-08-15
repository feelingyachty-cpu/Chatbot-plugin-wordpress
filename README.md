# Feeling Yachty Suite

Living documentation for **feeling-yachty-suite 3.65.0**, the fleet plugin on [feelingyachty.com](https://feelingyachty.com/).

This repo does **not** ship a website chatbot. That work was removed; chat is handled elsewhere.

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
