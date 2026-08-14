# Google Ads measurement

Official: [Google Ads Help — measurement](https://support.google.com/google-ads) · Skillshop Measurement certification

## Conversion actions we need

| Action | Type | Count | Value |
| --- | --- | --- | --- |
| Quote submitted | Primary | One | Estimated or 0 until CRM |
| WhatsApp / call click | Secondary | One | 0 or small |
| Deposit / booking | Primary | One | Actual USD |
| Newsletter | Observation only | | Do not bid on this |

Primary vs secondary matters. If every phone click is primary, Smart Bidding will buy cheap taps.

## Enhanced conversions

Pass hashed email/phone from the confirmation page. This recovers iOS and cross-device conversions. Same philosophy as Meta CAPI.

## Offline conversion import

When the desk marks a lead as **Booked** in the CRM, upload GCLID / GBRAID / WBRAID + conversion time + value. This is how Search stops worshipping form-fills from people who wanted a $200 jet ski.

## Attribution

Data-driven attribution is the default when eligible. Do not make strategy decisions from last-click only. A Demand Gen view + a brand Search click + a quote is one journey.

## Linking

- Google Ads ↔ GA4 (enable automatic key event import *selectively*)
- Google Ads ↔ Search Console (query + landing page diagnostics)
- Customer Match lists from bookers

## New vs returning

Use new-customer mode in PMax only after customer match is uploaded. Otherwise Google cannot know who already chartered.

## Diagnostics

- Conversions showing in Ads but not CRM → thank-you page firing twice or including tests
- CRM bookings with no Ads conversions → missing GCLID, blocked tags, or WhatsApp-only path
- Huge “view-through” Display conversions → cap frequency and demote Display if they do not book
