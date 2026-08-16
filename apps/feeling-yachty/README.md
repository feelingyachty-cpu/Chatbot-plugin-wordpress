# Feeling Yachty app (Android + iPhone)

Three tabs, live fleet, WooCommerce checkout, GHL inbox. No chatbot.

| Tab | What it shows |
| --- | --- |
| **Yachts** | All bookable boats except the promo set |
| **Promos** | Pink / promo yachts **only** — they do not appear in Yachts |
| **Talk** | Call, WhatsApp, SMS, live GHL form, and a message box that creates a GHL contact |

## Test the Android APK

The built APK is on this cloud run as **Feeling-Yachty.apk** (sideload / allow unknown sources).

On the phone:

1. Open **Yachts** — Miami fleet loads from feelingyachty.com
2. Open **Promos** — only the 12 pink boats
3. Tap a boat → **Book this yacht** — WooCommerce product (same Stripe/PayPal as the site)
4. Open **Talk** — Call / WhatsApp go to the GHL numbers; **Send to the team** upserts a GHL contact

## Rebuild the APK

```bash
export ANDROID_HOME=$HOME/android-sdk
cd apps/feeling-yachty
npm install
CI=1 npx expo prebuild --platform android
cd android && ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

Store accounts are only needed for Play / TestFlight, not for this APK.
