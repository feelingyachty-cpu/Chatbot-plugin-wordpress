# Suite 3.65.0 audit — bugs, confusion, and client-ease fixes

Audited **2026-08-14** against live feelingyachty.com (`fy/v1`, Woo products, hub HTML).  
The PHP zip is still not in git, so this is a **behavior audit**, not a line-by-line code review.

“Clients” here means **guests booking a charter**. Staff notes are separate at the end — if the back office is messy, guests feel it.

---

## What is already working

- Hub cards can show a real **charter total** (Fendi card: `$800` / `4 Hours`), not only an hourly rate.
- New Miami fleet (`miami-yacht-rental`, 178 boats) has marinas, brands, and captain flags filled in.
- Pink filter data exists (`is_pink`, `data-feature="pink"`).
- Woo products are paired 1:1 (`product_id` present on every yacht in the dump).
- Panama hub page is a real page (not an empty Suite fleet).

---

## P0 — guests can book the wrong boat, wrong price, or a dead path

### 1. The same yacht is for sale on two live URLs

On the older 49-boat list, **button** and **product** point at different pages. Both return HTTP 200. Example:

| Yacht | Page A | Page B |
| --- | --- | --- |
| 26ft Pink Bayliner “Fendi” | `/fleet/miami/26ft-bayliner-fendi/` | `/miami-yacht-rentals/26ft-pink-bayliner-fendi-4/` |
| 45ft Galeon | `/fleet/miami/45ft-galeon-yacht-rental-miami-beach/` | `/miami-yacht-rentals/45ft-galeon-4/` |

A guest can text one link, a friend opens the other, prices or photos can drift, and Google splits the listing.

**Fix:** Pick one public URL per yacht (recommend `/fleet/miami/{slug}/`). 301 the other. Make `button_url` and `product_url` the same field in admin.

### 2. `/fleet/miami/` is not a catalog — it is the homepage

Cards send people to `/fleet/miami/{slug}/`, but `/fleet/miami/` **redirects to `/`**. Anyone who shortens the link, or hits “up one folder,” lands on the home page instead of “all Miami boats.”

**Fix:** `/fleet/miami/` should be the Miami grid (or 301 to `/miami-yacht-rental/`). Never the homepage.

### 3. Two Miami catalogs, zero overlap

| Fleet slug | Boats | Guest experience |
| --- | --- | --- |
| `miami-yacht-rental` | 178 | Current catalog |
| `miami-yacht-rentals` | 49 | Separate boats, not in the new list |
| `panama-yacht-rentals` | **0** in Suite | Panama is not in the yacht admin at all |

Hub `/miami-yacht-rentals/` already 301s to `/miami-yacht-rental/`. The **49 boats do not**. Guests on the “new” hub never see those 49. Staff think they added a boat and it “doesn’t show.”

**Fix:** One Miami fleet. Merge or 301 the 49. Rename the admin fleet label from the slug `miami-yacht-rental` to **Miami**. Put Panama boats into Suite so staff have one list, two cities.

### 4. Price label can be read as “$3,583 for 3 hours” when that is the hourly rate

API contract:

- `price` = **per hour** (Custom Lime `3583.33`)
- `duration_label` = `3 Hours`
- `pricing[0].price` = **charter total** (`10749.99` for 3 hours)

If any card, SMS, or Woo block prints `price` next to `duration_label`, the guest thinks the day is $3,583 when it is $10,750.

Hub HTML for Fendi does this correctly (`data-starting-price="800"` for 4 hours). Do not assume every surface does.

**Fix:** In admin and on every guest card, show one number: **“4 hours · $800 total”**. Hide hourly unless a staff toggle says “show per hour.” Never pair the hourly field with a duration label.

### 5. Default `/fy/v1/yachts` silently drops 27 boats

There are **227** `fy_yacht` posts. `GET /wp-json/fy/v1/yachts` always returns **200** and ignores `page` / `per_page` (page 2 is the same 200). Twenty-seven current Miami boats never appear in that dump, including Venture, Zeus, Victoria, Sunreef, The Godfather.

n8n price push and any “sync the fleet” job will **never update those 27**.

**Fix:** Paginate (`X-WP-Total`, `page`, `per_page`) or return all. Until then, automations must call `/fleets/{slug}/yachts` per fleet.

---

## P1 — looks sloppy or untrustworthy to a guest

### 6. Tiny boats listed for 13 guests

**194 / 200** boats in the default dump say `capacity_max: 13`. The entire old fleet is 13. That includes 26ft Fendi, 26ft Sundeck, 28ft Rinker.

USCG six-pack vs 13-passenger is a safety and legal story. Guests planning a 12-person birthday on a 26ft boat will have a bad day at the dock.

**Fix:** Capacity is required and validated by length (e.g. warn if &lt;35ft and guests &gt; 10). Default empty, not 13.

### 7. “Captain included” is off for 70 boats, including pink party boats

Old fleet: **0 / 49** have captain on. New fleet is better (156 / 178). Guests on Feeling Yachty expect a captain. A “no” here looks like a bareboat they can drive.

**Fix:** Default **captain included = yes**. Only uncheck for true bareboat. Show a green “Captain included” chip on every card that is yes.

### 8. Titles that look like leftover ads or broken HTML

- `50ft Four Winns Yacht Rental Miami 🌊 | Sandbar &#038; Bay Cruise from $1000`
- `SEARAY &#8216;KIR ROYALE&#8217;`
- `Aqua &#8211; Sunseeker`
- Two different boats both named **Azimut** (53ft vs 68ft)

**Fix:** Title formula for guests: **`{size}ft {Brand} “{Nickname}”`**. Strip HTML entities. Block emoji and `|` in the title field. Require nickname if brand is reused.

### 9. Pink boats whose names are not pink

Flagged pink but named Victoria, Lady G, Last Fling, Maxum, Liam, Escape, Melissa, Sarah Marie, Rose. A guest filtering “pink” will not recognize the card.

**Fix:** If `is_pink`, show the pink badge on the image (you already have `fy-badge` / style `pink`). Optionally prefix the card title with “Pink.”

### 10. Duplicate identical reviews

Custom Lime has the same 5-star paragraph twice, same guest, two order IDs, same day. Looks fake.

**Fix:** One review per guest per yacht. Deduplicate on `user_id` + text.

### 11. Woo product body is only `<!--fy-auto-->`

If the Suite injector fails (plugin off, cache, theme swap), the product page is **blank**. Guests hit Add to cart on an empty page.

**Fix:** Keep a fallback: title, one photo, starting price, “Book this yacht” even without Suite CSS. Do not rely on a comment node.

### 12. Every yacht SEO object is empty

All 200 dumped yachts have blank `seo.*`. Hubs inject schema; listing pages often have no H1 (already flagged in your SEO sheet). Guests land from Google on a thin page.

**Fix:** Auto-fill meta from title + size + marina + starting total. One H1 = the yacht name.

---

## P2 — make it obvious to touch (guest + staff)

These are the “nothing is confusing” upgrades. Do them after P0/P1.

### Guest catalog

1. **One search bar** on Miami: size chips (Under 40 / 40–55 / 55–70 / 70+), guest stepper, pink toggle, “free hour” toggle, price ceiling. You already have `fy-filter-*` and `data-size`. Make them the only way to browse — no second hub with different cards.
2. **One price language:** “From $X for Y hours, all fees included. Tip extra.” Put that sentence on every card and product page. Stop mixing hourly and total.
3. **Boarding line on the card:** marina name + “See map.” Old 49 boats have **no marina**. Guests always ask “where do we go?”
4. **What’s included chip row:** Captain · Fuel · Ice · Water · Speaker. Same chips on every Miami boat unless a box is unchecked. Reduces “is fuel extra?” texts.
5. **Book CTA = one button.** “Check dates” or “Book.” Secondary: WhatsApp. Do not offer three equal buttons (call / WA / schedule) that feel like a maze.
6. **Saved boats** (`fy-save-toggle`) should persist and offer “text these to me.” Right now a heart with no follow-through is decoration.
7. **Spanish:** Panama and Miami guests switch language. Card chrome (From, hours, guests, captain) should follow the page language, not stay English on `/es/`.

### Staff adding a yacht (the “touch” test)

Build the add-yacht screen as a **5-step wizard**, one column, big preview card on the right that updates as they type:

1. City (Miami / Panama) — not a taxonomy slug
2. Name (size + brand + nickname) + 5 photos
3. Guests, length, captain, pink, marina (map picker from the 58 marinas)
4. Prices as a simple table: hours → **total $**. Weekday/weekend as two columns if needed. No “hourly + duration label”
5. Publish → creates the Woo product and **one** public URL. Show the link and a QR.

Hard rules in that wizard:

- Cannot publish without photo, marina, guests, and at least one price row
- Warn if title already exists (“Azimut is taken — add the nickname”)
- Warn if 26ft + 13 guests
- Fleet is chosen by city, not by `miami-yacht-rental` vs `miami-yacht-rentals`

Admin fleet list should show **human names** (`Miami`, `Panama`), counts, and a “view as guest” button.

---

## Suggested order of work

| Order | Change | Why |
| --- | --- | --- |
| 1 | One URL per yacht + 301 duplicates | Stops split listings today |
| 2 | `/fleet/miami/` → real catalog | Stops the homepage trap |
| 3 | Merge or hide the 49-boat old fleet | One Miami list |
| 4 | Price UI = totals only | Stops $3,583 vs $10,750 mistakes |
| 5 | Paginate `/fy/v1/yachts` | Fixes the 27 missing boats in sync |
| 6 | Capacity + captain defaults | Safety and “is a captain included?” |
| 7 | Clean titles / pink badges / reviews | Trust |
| 8 | Add-yacht wizard | Staff stop creating the next mess |
| 9 | Panama into Suite | One plugin for both cities |
| 10 | `<!--fy-auto-->` fallback | Product page never blank |

---

## Evidence snapshot (2026-08-14)

- `fy_yacht` CPT total: **227**
- `GET /fy/v1/yachts`: **200**, no pagination headers
- Missing from that dump: **27** current Miami boats
- Dual live URLs: **49** (old fleet)
- Empty marina / brand / captain: **49** (same old fleet)
- Empty SEO: **200 / 200** in the dump
- Capacity 13: **194 / 200** dump; **49 / 49** old fleet
- Panama Suite fleet: **0**
- `/fleet/miami/` → homepage
- `/miami-yacht-rentals/` hub → `/miami-yacht-rental/` (boats themselves do not redirect)

When the 3.65.0 zip is in the repo, re-audit shortcode names and the add-yacht admin screens and attach screenshots to this file.
