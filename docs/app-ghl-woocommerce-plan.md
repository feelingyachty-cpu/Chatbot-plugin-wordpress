# Feeling Yachty — WordPress + WooCommerce + GHL + mobile apps

**Status:** build started in this repo. Suite **3.65.0** is live on [feelingyachty.com](https://feelingyachty.com/).  
**Rule:** GoHighLevel owns **all** guest communication (SMS, WhatsApp, email, calls, inbox). There is **no** in-app chatbot and **no** Suite Support Bot in this product.

Last checked against production: **2026-08-16**.

---

## What you already have (do not rebuild)

| System | Already doing | n8n credential / workflow |
| --- | --- | --- |
| **Feeling Yachty Suite 3.65.0** | Yacht CPT `fy_yacht`, prices, marinas, deposit math, Woo product sync | — |
| **WooCommerce** | One product per yacht (`_fy_product_id` ↔ `_fy_yacht_id`). Cards, Apple Pay, Google Pay, PayPal via official gateways | `WooCommerce Account` `P6FR64A8v095SrLJ` |
| **Woo Store API** | Public catalog (`/wp-json/wc/store/v1/products`) | — |
| **Suite REST** | Public `fy/v1` yachts / fleets / marinas | `Wordpress account` `KGm37ZnRNDgXh023` |
| **Paid booking → GHL** | HMAC `booking.paid` + Woo `order.updated` router (Miami / Panama) | `Feeling Yachty - WordPress to GHL Sync`, `WooCommerce Order Paid to GHL Router` |
| **GHL** | Contacts, opportunities, SMS AI, reminders, ID forms, charter agreements | `GHL API Token`, `GHL Agency PIT` |

Live proof (2026-08-16): yacht **Custom Lime** `id=64202` is Woo product **64203** at `/miami-yacht-rental/custom-lime/`. Current Miami fleet: **178** boats on `miami-yacht-rental`. Use that slug only for new Miami boats.

---

## The product we are building

**One guest app** (iPhone + Android) that:

1. Browses the **same** Suite yachts the website uses
2. Opens the **same** Woo product to take payment (Stripe / PayPal already on that product)
3. After pay, does **nothing extra for CRM** — existing n8n → GHL flows already fire
4. Has **Call / WhatsApp / SMS / Email** buttons only. Those numbers are the GHL lines. No chat widget.

Staff keep using GHL + WordPress. Do not build a second staff chat app.

---

## Architecture (stable, easy to change)

```
                    ┌─────────────────────────┐
   iPhone / Android │  ONE Expo (React Native) │
                    │  TypeScript screens      │
                    └────────────┬────────────┘
                                 │ HTTPS only
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     Suite fy/v1          Woo product URL      GHL numbers
     + fy-app/v1          (WebView checkout)   tel / sms / wa
     catalog + quote      Stripe / PayPal
              │                  │
              └────────┬─────────┘
                       ▼
              Woo order paid
                       │
          ┌────────────┼────────────┐
          ▼                         ▼
   Suite webhook              Woo trigger
   booking.paid               order.updated
          └────────────┬────────────┘
                       ▼
                     n8n
                       ▼
              GHL contact + opportunity
              SMS / email / WhatsApp
```

### Why one Expo app (not two native codebases)

A change to a card, a price row, or a Book button is **one TypeScript file**. Expo ships iOS and Android from that file. Two separate Swift + Kotlin apps doubles every change and every bug.

### Why WordPress + Woo stay the source of truth

Suite already computes quotes (`FY_Fleet_Pricing::quote`) and puts the deposit on the linked product (`FY_Fleet_Woo::add_quote_to_cart`). The app must not invent totals. If a yacht is added or a price changes in WP, the app shows it on the next refresh.

### Why n8n is the bus, not the app server

n8n already has Woo + WP + GHL keys. It is perfect for **CRM sync**. It is a poor catalog host (timeouts, the 200-yacht cap, harder versioning). Catalog and quote stay on WordPress. n8n keeps doing what it does after money moves.

### Why checkout is the existing Woo product (first ship)

The plugin already linked every listing to a product. Fastest stable pay path:

1. App shows Suite yacht
2. Guest taps **Book**
3. In-app browser opens `product_url` (same page as the website)
4. Guest pays with the same Stripe / PayPal / Apple Pay / Google Pay the site uses
5. Woo status `processing`/`completed` → n8n → GHL

### Guest accounts (WooCommerce customers)

Each app login is a real WooCommerce customer (same My Account / My Charters as the website). Register/login hit `fy-app/v1` when that plugin is on the site; until then they use the n8n webhook `fy-app-account`, which creates the Woo customer with Suite’s required `fy_region` (Miami or Panama). Profile photo, billing, theme, and experience settings save on that account. No chatbot.

Later we can swap the WebView for a native Stripe Payment Sheet **without rewriting the catalog**. The Book button stays `openCheckout(productUrl)`. That is the stability rule: **UI talks to a tiny API client; payment method is swappable.**

Do **not** put Woo consumer keys in the iPhone/Android binary.

---

## Communication (GHL only)

| Guest action in the app | What happens |
| --- | --- |
| Call | `tel:+19542463636` (Miami) or `+5072021729` (Panama) |
| WhatsApp / SMS | Same numbers — GHL / Twilio already own the inbox |
| Email | Office email already in GHL |
| After they pay | Existing SMS AI, reminders, ID form, charter agreement workflows |

**Out of scope forever unless you change this rule:**

- Suite Support Bot (`class-fy-support-bot.php` is still inside the 3.65.0 zip)
- Any in-app chat thread
- A second website chatbot plugin

A tiny companion plugin in this repo (`feeling-yachty-no-chatbot`) hides the Support Bot menus and scripts. Upload it if the bot is still visible on the site.

---

## App screens (guest)

1. **City** — Miami or Panama
2. **Fleet** — cards from `GET /fy/v1/fleets/{slug}/yachts` (not `/yachts`, which hard-caps at 200 and drops boats)
3. **Yacht** — photos, `pricing[]` **trip totals**, marina, badges, pink / free-hour
4. **Book** — WebView of the linked Woo `product_url`
5. **Contact** — call / WhatsApp / SMS only (GHL)

Filters (size, pink, price) run on the phone against the fleet JSON so we do not wait on a new search API.

---

## WordPress companion: `fy-app/v1`

Ships as **Feeling Yachty Mobile API** — a small plugin next to Suite, so a Suite zip upload does not wipe app routes.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/wp-json/fy-app/v1/config` | public | Cities, phones, feature flags (`chatbot: false`) |
| GET | `/wp-json/fy-app/v1/catalog` | public | Paginated cards (`fleet`, `pink`, `page`, `per_page`) |
| GET | `/wp-json/fy-app/v1/yachts/{id}` | public | Suite `shape()` + `form_data` + Woo `product_id` / `product_url` |
| POST | `/wp-json/fy-app/v1/quote` | public | Server quote via `FY_Fleet_Pricing::quote` |
| GET | `/wp-json/fy-app/v1/me/bookings` | logged-in customer | Woo orders for this email / user |

Until that plugin is uploaded to production, the Expo app uses **live `fy/v1` + `product_url`**, which already works today.

---

## Payment rules (do not break these)

- Money is charged only by **official Woo Stripe / PayPal** gateways (Suite Payments hub).
- Deposit / dock balance is Suite math (`FY_Fleet_Pricing`). The app never multiplies hourly `price` × hours.
- `price` on a yacht is **hourly**. Cards must show a `pricing[]` row total (or the Woo product page).
- One yacht = one Woo product. Never create a second product for the same boat.

---

## What still lives in Suite 3.65.0 (from the zip)

| File | Role |
| --- | --- |
| `feeling-yachty-suite.php` | Boot, version 3.65.0 |
| `includes/class-fy-cpt.php` | `fy_yacht`, fleets, tags |
| `includes/class-fy-pricing.php` | Money engine + `quote()` + `form_data()` |
| `includes/class-fy-woo.php` | Product sync, deposit cart, `booking.paid` webhook |
| `includes/class-fy-checkout.php` | Bareboat form gate |
| `includes/class-fy-payments.php` | Stripe + PayPal status screen (does not process cards itself) |
| `includes/class-fy-rest.php` | `fy/v1` |
| `includes/class-fy-account.php` | My Charters / documents / tickets |
| `includes/class-fy-settings.php` | Webhook URL/secret, GHL form embed, phones |
| `includes/class-fy-support-bot.php` | **Do not use.** GHL replaced this. |

Shortcodes: `[fy_yacht_fleet]`, `[fy_yacht_info]`, `[fy_yacht_details]`, `[fy_yacht_layout]`, `[fy_saved_yachts]`, `[fy_yacht_marina]`, `[fy_yacht_gallery]`.

---

## ETA (clock times)

Today is **Sunday 16 Aug 2026**. These are how long each slice takes **me** (this agent) plus what **you** must click. Store review is Apple/Google, not me.

| Slice | What you get | My work time | You must do | Earliest you can use it |
| --- | --- | --- | --- | --- |
| **A — done** | Browse live boats + Book on the real Woo product + Call/WhatsApp (GHL). No chatbot. | **Done now** (~3 hours already spent) | `npm install && npx expo start` on a phone (15 min) | **Today**, in Expo Go |
| **B — next** | `fy-app/v1` on the site, in-app quote, My Charters after login, n8n order lookup | **4 hours** | Upload the 2 plugin zips (10 min) + one Stripe test booking (15 min) | **Same day** if you upload the zips before I start B. If you upload tonight, B is done **Sunday night / Monday morning**. |
| **C — stores** | TestFlight (iPhone) + Play internal track (Android) | **3 hours** (EAS config, icons, first builds) | Apple Developer ($99/year) + Google Play ($25, one-time). If you already have them: 30 min to invite me / run EAS. If you do not: **1–2 days** for Apple to approve the account. | **~24 hours after** accounts are active (first TestFlight). **Apple App Store public review: 1–3 days** after you submit. **Play production: ~1–3 days** (often faster on internal track: same day). |
| **D — optional** | Native Apple Pay / Google Pay sheet (no WebView) | **8 hours** | Stripe test keys confirmed, one more TestFlight | **1 extra day** of my work after C, then another TestFlight (~2 hours for you to install) |

### Simple version

- **Use the app on a phone today:** 15 minutes (Expo Go). Slice A is already built.
- **Finish the real app features (quote + my bookings):** **4 hours** after you upload the two zips.
- **Put it on TestFlight / Play for staff:** **3 hours** of my work + your store accounts. First installable store build: **same day** if accounts exist, **1–2 days** if Apple is still approving the developer account.
- **Public in the App Store / Play Store:** **1–3 days of store review** after you tap Submit. I cannot skip that.
- **Whole thing, you already have Apple + Google accounts:** about **1 working day** of my time (B + C), then **1–3 days** of Apple/Google review.
- **Whole thing, you still need store accounts:** **2–4 days** end-to-end (account wait + my build + review).
- **Native Apple Pay later:** add **1 day** of my time.

**Android APK (ready to sideload):** `dist/Feeling-Yachty.apk` and the cloud-run artifact `Feeling-Yachty.apk`. Three tabs: Yachts (browse, no pink boats), Promos (pink boats only), Talk (GHL live). No store account needed to install this APK.

I am ready to start **Slice B as soon as the two zips are on feelingyachty.com**. That is the only blocker for the next 4 hours.

---

## How we keep Android and iPhone in sync

| Change | Where you edit | Both stores get it |
| --- | --- | --- |
| New yacht / price | WordPress Yachts (or the price sheet → n8n) | Next app refresh |
| Card layout, filters | `apps/feeling-yachty/src/` | One OTA or store build |
| Deposit rule | Suite settings | Website + app WebView |
| SMS copy after pay | GHL / n8n | Not in the app at all |
| Phone numbers | Suite booking settings → `fy-app/v1/config` | Contact screen |

OTA (Expo Updates) can ship JS fixes without a store review. Native payment-sheet or permission changes still need a store build.

---

## Security

- No Woo / WP / GHL secrets in the app binary or this git repo
- App only calls public catalog + the guest’s own checkout session
- Existing HMAC on `booking.paid` stays as-is
- If we add an n8n app webhook, it requires `x-fy-app-key`

---

## Upload checklist (when you are ready)

1. Zip `feeling-yachty-mobile-api/` → WP Admin → Plugins → Upload
2. Zip `feeling-yachty-no-chatbot/` → Upload (hides Support Bot)
3. Confirm Suite webhook URL still points at **WordPress to GHL Sync**
4. `npx expo start` in `apps/feeling-yachty` and book a **Stripe test** charter
5. Confirm GHL contact + Google Chat ping (same as a website booking)
