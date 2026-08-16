# Feeling Yachty — full-stack audit and improvement plan

**Date:** 2026-08-16  
**Scope:** Android/iOS Expo app (`apps/feeling-yachty` v1.2.1), WordPress plugin (`feeling-yachty-mobile-api` v1.1.1), n8n Talk + Accounts workflows, live Suite `fy/v1` + WooCommerce.  
**Rule that does not change:** GoHighLevel owns all guest communication. No chatbot. WooCommerce is the only payment system. One yacht = one existing Woo product. Never invent prices; use `pricing[]` trip totals, never hourly `price` × hours.

This is a **plan**, not a build log. Items are ordered by impact. Phases are technical slices, not calendar estimates.

---

## 1. What is working today (do not break)

| Area | Live proof (2026-08-16) |
| --- | --- |
| Miami catalog | `GET /wp-json/fy/v1/fleets/miami-yacht-rental/yachts` returns **178** boats. Every boat has `product_id`, `product_url`, `image_url`, `pricing[]`, `marina`. |
| Pricing | `starting` is null on Suite listing. App correctly falls back to the first `type=price` row. On all 178 boats that first row **is** the cheapest trip total. Field `price` is hourly (e.g. Custom Lime `3583.33` hourly vs `10749.99` for 3 hours). |
| Pink fleet | `is_pink` = **12**. Badge-text promo heuristic currently matches **0** extra boats. |
| Talk | n8n `Feeling Yachty - App Talk to GHL` (`daYlfNdHhDtuGdIe`) is active. Webhook upserts a GHL contact, adds a note, sends an SMS confirm. |
| Accounts | n8n `Feeling Yachty - App WooCommerce Accounts` (`SykZaBRn9EAtZbDW`) is active. Register creates a real Woo customer (form-urlencoded + `fy_region`). Login/me/update/logout work against data table `FY App Accounts`. |
| Checkout attributes | Woo Store API on Custom Lime: `pa_charter-duration` slugs are `3-hours`…`8-hours`. App `durationSlug("3 Hours")` → `3-hours`. Passenger slugs are `"1"`…`"13"`. |
| Plugin | `fy-app/v1` is **not on production** (`rest_no_route` 404). App already falls back to Suite. |

Current APK: `dist/Feeling-Yachty.apk` (1.2.1, debug, arm64-v8a).

---

## 2. Confirmed bugs (fix these first)

### P0 — money, catalog, or login can fail for a real guest

**B1. Forty-nine Miami boats are invisible.**  
Old fleet slug `miami-yacht-rentals` still has **49 boats with zero overlap** against `miami-yacht-rental`. Those include mega yachts (80ft Uniesse “Regal”) and pink boats (Pink Maxum “Hello Kitty”). The app only loads the new slug, so guests never see them.

- **Backend / WP:** Move those 49 CPTs onto `miami-yacht-rental` (or a single canonical fleet). Do not leave two Miami slugs.
- **Frontend fallback (until WP is cleaned):** `fetchFleet('miami')` should request the new slug, then the leftover slug, and merge by `id`. Never show duplicates.

**B2. Existing website customers cannot log in until the plugin is uploaded.**  
n8n login only checks HMAC `email:password` in the `FY App Accounts` table. A guest who already booked on feelingyachty.com has a Woo password and **no n8n row**. The app tries `fy-app/v1` first (404), then n8n, then shows “Email or password is not correct.”

- **Immediate:** Upload `feeling-yachty-mobile-api`. PHP `wp_authenticate` + email fallback already exists.
- **n8n bridge:** On failed table lookup, authenticate against Woo (`/wp-json/wc/v3/customers` cannot check passwords). Better: after plugin is live, retire n8n auth. Until then, login copy should say “New here? Create an account with the same email” more loudly, and offer “Forgot password → website My Account.”

**B3. WebView checkout can false-fail.**  
`CheckoutWeb` sets `failed` on **any HTTP status ≥ 400**. Woo/Stripe/PayPal pages load tracking pixels, 3DS iframes, and font files that 404. One of those kills the in-app checkout and shows the error screen even when the product page is fine.

- Only fail on **main-frame** document errors, or ignore 4xx from non-feelingyachty / non-stripe hosts.
- Keep the Browser button (already correct).
- `setSupportMultipleWindows={false}` blocks PayPal / 3DS popups. Allow a new window **or** always offer Browser when the URL leaves the product page.

**B4. `fy-app/v1` catalog cards drop `pricing[]`.**  
Plugin `FY_App_REST::card()` returns `starting` but not `pricing`. The day the plugin is uploaded, the app prefers `fy-app` and **hours expand, 2-hour filter, and “lowest total” highlight all go empty** until the guest opens a yacht (detail still uses Suite `shape()`).

- Add `pricing` (price rows only) to `card()`.
- Include `marina`, `badges`, `is_free_hour`, `rating`, `reviews` count, `captain_included`.
- App: if a catalog yacht has no `pricing`, do not claim “View hours & pricing.”

**B5. Register can create a Woo customer and still fail the app session.**  
n8n creates the Woo customer first, then inserts the data-table row. If the email already exists in Woo, create fails (good). If Woo succeeds and the table insert fails, the guest has a website account they cannot log into from the app (HMAC row missing).

- Guard: look up table **and** Woo by email before create.
- If Woo exists and password matches (plugin path) or guest proves email, attach a table row instead of creating a second customer.

### P1 — wrong UX, broken filters, data loss

**B6. “2-hour trips” filter is a dead chip.**  
Live Miami fleet has **zero** 2-hour price rows. Tapping it always shows an empty list. Replace with something that exists: “Under $500”, “50ft+”, “Captain included” (`captain_included` is true on 156 boats), or “Highest rated.”

**B7. Copy says “lowest trip total” but code uses the first price row.**  
`startingTotal()` returns `yacht.starting` or the **first** `type=price` row. YachtCard highlights that amount as “best.” Today first === min on all 178 boats. The moment a boat lists 8 hours first, cards lie.

- Compute `lowestTotal(yacht)` = min of price rows.
- Plugin `starting_total()` should also take the minimum, not the first.

**B8. Panama looks broken.**  
`panama-yacht-rentals` and `panama-yacht-rental` both return **0**. City switch still sits in the header. Guests think the app failed.

- Empty state: photo, “Panama charters are booked with the team,” primary **WhatsApp / Call +507 202-1729**, secondary Talk form with city=Panama prefilled.
- Do not show Miami boats under a Panama header.
- When Panama inventory exists, keep the same filters.

**B9. Profile updates cannot clear fields (n8n).**  
`Shape Session` uses `req.notes || stored.notes` and `req.typical_guests || stored.typical_guests`. Setting guests to `0` or clearing notes is ignored. Use nullish checks (`??`) and treat empty string as a real clear.

**B10. Theme / settings spam the account API.**  
Every swatch and toggle calls `patchSettings(..., true)` → `updateAccount`. Logged-out users throw “Please log in” (caught). Logged-in users write the data table (and sometimes Woo) on every tap.

- Debounce remote persist (800ms).
- Persist local immediately; remote on blur / “Save colors.”

**B11. Duration slug for “1 Hour” becomes `1-hours`.**  
`durationSlug` always pluralizes. Current fleet starts at 3 hours so it is latent. Fix: `1-hour` vs `N-hours`, or map from Woo attribute slugs when the plugin is live.

**B12. Checkout fallback URL is always Miami.**  
`checkoutUrl` falls back to `${API_BASE}/miami-yacht-rental/` if `product_url` is missing. Use the yacht’s city / current city. Today every Miami boat has a URL, so this is latent.

**B13. `onHttpError` + passenger attribute.**  
App sends `attribute_pa_passenger-count={typical_guests}`. Variations often have passenger `value: null` (duration-only). A guest count that is not a term can make Woo show “choose options” instead of a ready variation. Only append passenger when the yacht actually has that attribute.

**B14. Talk has no yacht context.**  
Guest opens a yacht → Talk. The GHL note is only name/phone/message. Prefill: yacht title, id, product URL, selected duration, city. Shape Lead already builds `note`; add those fields.

**B15. Logout on one device kills every device (plugin).**  
One `_fy_app_token_sha` per user. Second phone login invalidates the first. Store a small list of hashed tokens, or accept that and say “signed in on this phone only.”

### P2 — polish, performance, hygiene

**B16. Every fleet load pays a 404.**  
`fetchFleet` always hits `/wp-json/fy-app/v1/catalog` first. Production 404s, then Suite. Cache “plugin missing” for the process lifetime (or 10 minutes) so browse is one request.

**B17. Token lookup is `get_users` by meta.**  
Unindexed. Fine at hundreds of customers; slow at tens of thousands. Custom table or `usermeta` index when the plugin is the real auth.

**B18. CORS `Access-Control-Allow-Origin: *` on auth routes.**  
Needed for a mobile app, but pair with rate limits on `/auth/login` and `/auth/register` (IP + email). n8n webhook has only a shared app key that is **inside the APK**.

**B19. Photo is a data URL in the n8n string column.**  
`photo_url: req.photo_data` writes ~400KB into `photoUrl` **and** `profileJson`. Every `me` / `update` ships it back. After plugin upload, photos go to Media Library (`_fy_avatar_id`) — prefer that. For n8n, store a hosted URL or skip photo until the plugin is live.

**B20. Filter chips and some chrome are English-only.**  
`SIZE_CHIPS` / `STYLE_CHIPS` / `SORT_CHIPS` and Checkout “‹ Yacht” ignore `language`. i18n already covers tabs and profile.

**B21. Hardcoded pink highlight `#ffe3f0`.**  
Yacht detail selected row and compact search highlight ignore the active theme (Midnight gold, Ocean teal). Derive a 15% tint of `colors.pink`.

**B22. Android Talk keyboard covers the send button.**  
`KeyboardAvoidingView` is iOS-only. Use `android:windowSoftInputMode=adjustResize` or `KeyboardAvoidingView` with `behavior="height"` on Android.

**B23. Header / FAB vs system insets.**  
`SafeAreaView` is inconsistent on Android gesture nav. Last cards sit under the FAB + tab bar (`paddingBottom: 88` helps; FAB still covers hearts on the last card). Add `useSafeAreaInsets` and extra list padding.

**B24. Plugin config WhatsApp fallback is the wrong number.**  
`FY_App_REST::config()` Miami WhatsApp fallback is `17543253827`. App config uses `19542463636`. When the plugin is uploaded and Suite settings are empty, Talk would open the wrong WhatsApp. Align fallbacks with the live GHL lines.

**B25. HTML entities in leftover titles.**  
Old-slug titles still contain `&#8216;` / `&amp;`. Decode on the client (`SEARAY 'KIR ROYALE'`).

**B26. `fetchMe` effect is incomplete.**  
Depends on `settings.prefillTalk` but not `applyRemote`. Harmless today; fix when splitting screens.

**B27. No password reset, no email verify, no session expiry UX.**  
Plugin tokens last one year. App has no “Forgot password.” Send guests to `https://feelingyachty.com/my-account/lost-password/`.

**B28. Debug APK, arm64 only.**  
Fine for sideload on modern Pixels. 32-bit / older tablets will not install. Store build should be a signed release AAB with the default ABI set.

---

## 3. Backend plan

### 3.1 WordPress — upload and finish `fy-app/v1`

This is the single highest-leverage backend action. The plugin is already in the repo.

1. Upload `feeling-yachty-mobile-api` (and keep `feeling-yachty-no-chatbot`).
2. Confirm `GET /wp-json/fy-app/v1/config` and `/catalog` on production.
3. Then fix `card()` (B4) and WhatsApp fallback (B24) in a 1.1.2 zip before or right after upload.
4. Auth: keep `wp_authenticate` + `get_user_by('email')`. Add:
   - Rate limit (transient per IP, 10 login attempts / 15 min).
   - `POST /auth/forgot` that triggers Woo / WP lost-password email (do not reset in the app).
   - Bookings already use `wc_get_orders`. Add order status labels the guest understands (`processing` → “Deposit received”).
5. Catalog: optional `?q=`, `?min_price=`, `?size=` so the phone does not download 178 full Suite objects if we later slim the payload. Not required while the fleet is < 300.
6. Quote: `POST /quote` exists and the app **never calls it**. Either wire Book to a server quote (date + duration + guests → deposit) **or** delete the route from the “app contract” docs so we do not pretend it is live.
7. Saved yachts: Suite already has `[fy_saved_yachts]`. Add `POST /me/saved` user meta so hearts sync across phones (today `fy.saved` is device-only).
8. Do **not** create products. Read `_fy_product_id` only.

### 3.2 WordPress / Suite content (Nala or staff, not app code)

| Task | Why |
| --- | --- |
| Merge `miami-yacht-rentals` (49) into `miami-yacht-rental` | App + site browse the same canonical fleet |
| Publish Panama yachts or hide the Panama pill until there are ≥ 1 | Stops “empty app” reports |
| Keep pink as `_fy_is_pink` only | App promo heuristic that also matches “new yacht” will hide new boats from Browse the day someone adds that badge |
| Confirm every leftover boat still has a live Woo product | Some old listings may be retired |

### 3.3 n8n — Talk (`daYlfNdHhDtuGdIe`)

Keep GHL as the inbox. Improve the payload, do not add a bot.

| Change | Why |
| --- | --- |
| Accept `yacht_id`, `yacht_title`, `product_url`, `duration`, `guests`, `source_screen` | Staff see which boat the guest was looking at |
| Rate limit per phone (e.g. 5 / hour) | Shared app key is in the APK; anyone can POST |
| Make **GHL SMS Confirm** optional or only on first contact | Every Talk tap currently texts the guest; that can feel like spam if they already have a thread |
| Normalize phone to E.164 (`+1` / `+507`) | GHL upsert is more reliable |
| On GHL HTTP failure, still `Respond OK` only if a note was stored; otherwise return 502 so the app shows WhatsApp | Silent loss of leads |
| Tag `app-live-talk` + city (already done) + `yacht-{id}` | Filtering in GHL |

### 3.4 n8n — Accounts (`SykZaBRn9EAtZbDW`)

Treat this as a **temporary bridge** until `fy-app/v1` is on the site.

| Change | Why |
| --- | --- |
| Email lookup before Woo create (B5) | No orphan Woo customers |
| Nullish field updates (B9) | Notes / guests save correctly |
| Stop storing base64 photos (B19) | Table size + payload |
| Login miss: respond with a distinct error `no_app_row` so the app can say “Use the same email to create an app login” vs “Wrong password” | Today both look the same |
| Do not PUT Woo on theme-only updates | Settings JSON is enough |
| After plugin is live: disable the webhook or leave it as fallback only | One password source (Woo / WP) |

**Do not** put Woo REST keys, GHL tokens, or the HMAC booking secret in the app. The `x-fy-app-key` is a gate, not a secret — plan for it to leak.

### 3.5 WooCommerce / payment backend

Stay on the linked product. Next backend steps that make payment *feel* native without a second cart:

1. **Deep link success.** Woo thank-you URL → app reads `order-received` in the WebView and shows “You’re booked” + My Charters + Talk. Today Back just returns to the yacht.
2. **Optional Store API add-to-cart** (later): `POST /wc/store/v1/cart/add-item` with variation id, then open checkout. Still Woo, still one product, no Stripe keys in the app.
3. **Native Payment Sheet** is Slice D in the existing plan — only after success detection and store builds. Do not start it while WebView + Browser already charge cards.
4. Prefill Woo checkout from the logged-in customer cookie. WebView is anonymous today, so guests retype billing they already saved in Profile. After plugin upload, a short-lived login cookie or `?billing` query is enough.

### 3.6 Security backend checklist

- Rate-limit Talk and login.
- Rotate `fy-app-talk-2026` when the plugin can issue per-install tokens.
- Plugin: permission callbacks should use `FY_App_Auth::permission` on `/me*` (behavior stays the same, intent is documented).
- Never log raw passwords in n8n execution data (Parse Request currently keeps `password` on the item — pin/redact executions).
- Photo upload: MIME + size already capped in PHP (2MB) and app (~400KB). Keep it.

---

## 4. Frontend / app architecture plan

`App.tsx` is ~670 lines and owns fleet, filters, overlays, Talk, and profile wiring. That is the main frontend risk: every new screen will keep piling onto one file.

### 4.1 Split into screens (no behavior change)

```
App.tsx                 boot + ThemeProvider + tab shell
src/screens/YachtsScreen.tsx
src/screens/PromosScreen.tsx
src/screens/TalkScreen.tsx
src/screens/ProfileScreen.tsx   (move ProfileTab)
src/state/useFleet.ts           load / refresh / city
src/state/useSession.ts         token / user / bookings
src/api/catalog.ts
src/api/account.ts
src/api/talk.ts
```

Keep `ThemeProvider`. Add a tiny `CityProvider` so header city and Talk numbers stay in sync.

### 4.2 Catalog client

- Probe `fy-app` once; remember the result (B16).
- Merge leftover Miami slug until WP is cleaned (B1).
- Persist last successful fleet JSON in AsyncStorage (stale-while-revalidate). Opening the app offline should show yesterday’s boats with a banner, not a blank shimmer forever.
- `fetchYacht` already hydrates detail. Prefetch the next 3 visible cards’ details on scroll idle so Book opens instantly.
- Fast Image or Expo Image: 178 full-bleed photos will jank on mid phones. Recycle with `windowSize` (already 7) and a smaller catalog image size from the plugin (`medium_large` vs `large`).

### 4.3 Account client

- Forgot-password link to Woo.
- After plugin upload, stop sending passwords to n8n.
- Sync `savedIds` when `user` is present.
- Refresh bookings on pull-to-refresh in Profile and after checkout success.
- Distinguish network errors vs bad password vs “create an account.”

### 4.4 Checkout client

- Fix `onHttpError` (B3).
- Detect `/checkout/order-received/`, `/order-received/`, and Woo `order-pay`.
- Pass duration slug only; passenger only if valid (B13).
- If the guest is logged in, append email as a hint, not a security token.
- Always keep Browser as the escape hatch.

### 4.5 i18n

- Translate filter chips, checkout chrome, empty Panama, order statuses.
- Do **not** machine-translate yacht titles or `special_desc` in the app. Those are merchandising copy from WP. Optional later: Suite Spanish fields.

### 4.6 Quality bar

- Add a few Node tests for `startingTotal` / `lowestTotal`, `durationSlug`, `filterAndSort`, `isPromoYacht`, `checkoutUrl`. No device needed.
- One Detox / Maestro path later: open Miami → tap first boat → Book → see product title. Not required for the next APK.
- TypeScript is already on. Keep `strict` as files are split.

---

## 5. UI / UX plan (make it feel like the website, addictive like a consumer app)

The 1.2.x browse (cinematic cards, snap reel, hearts, hours, sticky Book) is the right direction. The site’s unused payload is the next visual leap: **ratings, reviews, captain, marina, trip story.**

### 5.1 Yacht cards (Browse + Promos)

- **Stars on the photo.** 153 boats have `rating` (often `"5"`). Show `★ 5.0 · 12 reviews` even when the reviews array is empty (use `reviews.length` or a count field when we add it).
- **Captain chip** when `captain_included`.
- **Marina line** on the full card, not only compact mode.
- **Heart animation** (scale + color), not only a static heart glyph.
- **Price chip** stays the cheapest trip total + duration (`From $975 · 3 Hours`).
- Compact mode: keep photo + price; it is the “scan 178 boats” mode. Default can stay cinematic.

### 5.2 Filters that match real inventory

Replace or add chips using live data:

| Chip | Why it works on this fleet |
| --- | --- |
| Under $500 / Under $1,400 / $1,400+ | 109 boats are under $1,400; cheapest is $330 (Sundeck) |
| 50ft+ / 70ft+ | Size bands already exist; 70ft+ is the “wow” reel |
| Captain included | 156 boats |
| Top rated | `rating === '5'` |
| Saved | already exists |
| Drop **2-hour trips** until Suite has those rows | empty filter kills trust |

Add a **guest-count** chip (1–6, 7–12, 13+) using `capacity_max`.

### 5.3 Yacht page (the money screen)

This should feel like the desktop product page, not a short card.

1. **Full-bleed hero** (have) + **horizontal gallery** if Suite detail returns more images (`gallery_id` is 0 on listing; check `shape()` / attachments on detail).
2. **Review strip** — 1–2 quotes from `reviews[]` (12 boats already have text). “Incredible day on the water…” is exactly the social proof the site uses.
3. **Duration pills + totals** (have). Default the cheapest. Sticky bar (have).
4. **Meet at {marina}** + map link (`maps://` / Google Maps query on `marina.address`).
5. **What’s included** from existing fields: captain, fuel_rate, crew_rate, service_fee — as short chips, not a spreadsheet. Do not invent fees; hide a chip if the field is empty.
6. **Blackout dates** — if `blackout_dates` is present, disable those days on a simple calendar. If empty, skip. Do not block Book; Woo is still the source of truth.
7. **Share** — native share sheet with product URL (WhatsApp the boat to the group chat). High conversion, almost no code.
8. **Save** heart on the detail hero (missing today — only on the card).
9. Talk from detail should **carry the boat** (B14) and switch tab with a prefilled message: “I want Custom Lime, Saturday, 10 guests.”

### 5.4 Checkout UI

- Keep the navy bar + Browser.
- Add a one-line summary: `Custom Lime · 3 Hours · From $10,750` so the WebView does not feel like “we left the app.”
- On success: confetti-lite (one pink burst), “Deposit received,” **View My Charters**, **Talk to the crew.**
- On fail: one button, one sentence, Browser. No stack of errors.

### 5.5 Talk tab

- Big live status (“Specialists in Miami · usually replies in minutes”) — static copy, not a fake chatbot typing indicator.
- Preferred contact as the primary pink button (have).
- Collapse Call / WhatsApp / SMS into that primary + two ghosts so it is not four identical navy blocks.
- GHL form stays as a text link (have). Give that WebView the same Chrome UA + Browser fallback as checkout.
- After send: keep the success line, and show “We texted this number” only if the SMS confirm stays on.

### 5.6 Profile / account UI

- Guest gate: two clear cards — **Log in** / **Create account** — plus “Booked on the website? Use that email.”
- Logged-in hero: photo, name, Woo #, **next charter** (first non-completed order) as a large card, not a dump of fields.
- Move the long billing form under “Edit billing.”
- My Charters: status color (pink = awaiting, green = confirmed), tap → yacht if `yacht_id` is on the line, or the Woo order URL.
- Colors: live preview swatches that recolor the header immediately (already) but save once (B10).

### 5.7 Engagement loops (habit, not a chatbot)

Consumer apps keep people by **progress, social proof, and unfinished business.** Use what we already store.

| Loop | Implementation |
| --- | --- |
| Continue browsing | Have (12 recents). Add “Because you saved X” row. |
| Saved collection | Sync to account (3.1.7). Empty saved: “Tap the heart on a boat you like.” |
| Social proof | Stars + one review on cards / detail. |
| Share to the group | Native share of `product_url`. |
| Unfinished Book | If they opened checkout and left, banner: “Still thinking about Custom Lime?” |
| Live help FAB | Have. Don’t show it on the last 80px of a card press target; hide while scrolling down, show on scroll up (common feed pattern). |
| Promos badge | Have. Animate once when new pink boats appear after refresh. |
| City trust line | Have (`2,500+ reviews`). Make `{n}` the real browse count (already). |
| Push (later) | Only via GHL / store push for “your charter is tomorrow.” No in-app chat thread. |

Avoid: streaks, coins, fake scarcity, or a bot that “helps pick a yacht.”

### 5.8 Motion and visual system

- Keep `PressScale` and shimmer.
- Featured reel: paging dots or a peek of the next card (already peeked via width).
- Hero parallax on detail (image moves slower than the sheet) — small, expensive if overdone; one screen only.
- Theme: Ivory / Midnight need a `StatusBar` that follows header luminance (light content on navy, dark on ivory).
- Replace unicode tab icons with simple PNGs or vector icons so Android OEM fonts do not break them.
- Logo + wordmark already match the site. Keep navy/pink as default; themes are a delight, not the brand.

### 5.9 Empty and error states (trust)

| State | Instead of |
| --- | --- |
| Panama 0 boats | Talk + WhatsApp (B8) |
| Search no match | “Clear filters” + 3 featured boats |
| Fleet network fail | Last cached list + Retry |
| Talk send fail | WhatsApp deep link with the same message |
| Login fail | Specific copy (B2) |
| Checkout fail | Browser (have) |

---

## 6. Suggested build order

Do these in order. Each slice is shippable (APK + PR) without waiting on stores.

### Phase 1 — Correctness (no new features)

1. Merge leftover Miami 49 boats in WP **or** dual-fetch in `fetchFleet`.
2. Fix WebView `onHttpError` + popup / Browser.
3. Fix `lowestTotal`, duration slug, checkout fallback city.
4. Panama empty state.
5. Replace 2-hour chip.
6. Cache “fy-app missing.”
7. Talk payload includes yacht.
8. n8n nullish updates + register-exists guard.
9. Forgot-password link.

**You click:** upload `feeling-yachty-mobile-api` + `feeling-yachty-no-chatbot`. That turns website logins on.

### Phase 2 — Plugin contract + accounts

1. `card()` includes `pricing` + rating + marina.
2. Config phones match GHL.
3. Saved hearts sync.
4. Checkout success screen + refresh bookings.
5. Prefill Talk from profile + yacht.
6. Debounced theme save.
7. Rate limits on login / Talk.

### Phase 3 — UI that uses data we already have

1. Stars, captain, marina, reviews on cards and detail.
2. Share sheet + detail heart.
3. Guest-count filter; price bands that match inventory.
4. Split `App.tsx` into screens.
5. i18n leftover chrome.
6. Gallery swipe if images exist on detail.
7. Map link to marina.

### Phase 4 — Habit and stores

1. Hide-FAB-on-scroll, unfinished-book banner.
2. Offline fleet cache.
3. Signed Play AAB + TestFlight (needs store accounts).
4. Expo OTA for JS-only fixes.
5. Only then: Store API cart or native Payment Sheet.

---

## 7. What not to do

- Do not add a chatbot, Suite Support Bot, or in-app agent thread.
- Do not create a second Woo product per yacht.
- Do not multiply hourly `price` by hours.
- Do not put Woo / WP / GHL secrets in the APK.
- Do not show Panama Miami boats to “fill” an empty city.
- Do not treat n8n as the long-term catalog or auth server.
- Do not start native Apple Pay until WebView success detection and the plugin are live.

---

## 8. Decision needed from Nala

1. **Leftover 49 boats** — merge in WordPress, or should the app union both Miami slugs?
2. **Upload the two plugin zips** — this is the switch that makes website passwords work in the app.
3. **Panama** — hide the pill until there is inventory, or keep it as a Talk-only city?
4. **Talk SMS confirm** — keep auto-text on every app message, or only the first time?
5. **Next APK** — Phase 1 only, or Phase 1+3 (visible UI) together?

Once those are chosen, implementation can start at Phase 1 without revisiting architecture.
