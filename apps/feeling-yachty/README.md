# Feeling Yachty app (Android + iPhone)

Four tabs, live fleet, WooCommerce checkout and customer accounts, GHL inbox. No chatbot.

| Tab | What it shows |
| --- | --- |
| **Yachts** | All bookable boats except the promo set |
| **Promos** | Pink / promo yachts **only** — they do not appear in Yachts |
| **Talk** | Call, WhatsApp, SMS, live GHL form, and a message box that creates a GHL contact |
| **Profile** | WooCommerce login/register, photo, billing, My Charters, experience settings, app colors |

## Test the Android APK + source

Always hand over both files:

- **APK:** `dist/Feeling-Yachty.apk` (sideload / allow unknown sources)
- **Source:** `dist/Feeling-Yachty-source.zip` (the code that built that APK)

Rebuild both with `scripts/package-app-release.sh`.

On the phone:

1. Open **Yachts** — Miami fleet loads from feelingyachty.com
2. Open **Promos** — only the pink boats
3. Tap a boat → **Book this yacht** — WooCommerce product (same Stripe/PayPal as the site)
4. Open **Talk** — Call / WhatsApp go to the GHL numbers; **Send to the team** upserts a GHL contact
5. Open **Profile** — create a WooCommerce customer account, add a photo, save billing, pick a color theme

Register creates a real customer on feelingyachty.com (same My Account / My Charters). Colors and settings stay on the phone and sync to that account.

## Rebuild the APK

```bash
export ANDROID_HOME=$HOME/android-sdk
cd apps/feeling-yachty
npm install
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
cd android && ./gradlew assembleRelease
# then from the repo root:
# scripts/package-app-release.sh
```

Use **release**, not debug. Debug has no JS bundle and opens to a red error.

APK: `android/app/build/outputs/apk/release/app-release.apk`

Store accounts are only needed for Play / TestFlight, not for this APK.
