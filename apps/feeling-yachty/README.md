# Feeling Yachty guest app (iPhone + Android)

One Expo / React Native codebase. Both stores ship from `src/`.

## What it does today

- Loads the **live** Miami / Panama fleets from Suite `fy/v1` (or `fy-app/v1` after you upload the companion plugin)
- Shows **trip totals** from `pricing[]`, not hourly × hours
- **Book** opens the yacht’s existing WooCommerce product (same Stripe / PayPal / Apple Pay as the website)
- Contact is Call / WhatsApp / SMS only. **GoHighLevel owns the inbox. No chatbot.**

## Run

```bash
cd apps/feeling-yachty
npm install
npx expo start
```

Scan the QR code with Expo Go on a phone.

## Do not put secrets here

Woo, WordPress, and GHL keys stay in n8n / WordPress. The app only calls public catalog URLs and the guest checkout page.
