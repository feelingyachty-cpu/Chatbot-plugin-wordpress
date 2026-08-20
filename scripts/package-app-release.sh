#!/usr/bin/env bash
# Always ship the installable APK together with the app source zip.
# Usage:
#   scripts/package-app-release.sh
#   scripts/package-app-release.sh /path/to/app-release.apk
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/apps/feeling-yachty"
DIST="$ROOT/dist"
VERSION="$(node -p "require('$APP/package.json').version" 2>/dev/null || echo unknown)"
APK_SRC="${1:-$APP/android/app/build/outputs/apk/release/app-release.apk}"
APK_OUT="$DIST/Feeling-Yachty.apk"
SRC_OUT="$DIST/Feeling-Yachty-source.zip"
STAGE="$(mktemp -d)"
NAME="Feeling-Yachty-source-v${VERSION}"

cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

mkdir -p "$DIST"

if [[ -f "$APK_SRC" ]]; then
  src_real="$(readlink -f "$APK_SRC")"
  out_real="$(readlink -f "$APK_OUT" 2>/dev/null || echo "$APK_OUT")"
  if [[ "$src_real" != "$out_real" ]]; then
    cp -f "$APK_SRC" "$APK_OUT"
  fi
  echo "apk  $APK_OUT  ($(wc -c < "$APK_OUT") bytes)"
else
  echo "warn: no release APK at $APK_SRC — source zip only" >&2
fi

mkdir -p "$STAGE/$NAME"
tar -C "$APP" \
  --exclude=node_modules \
  --exclude=.expo \
  --exclude=dist \
  --exclude=android/app/build \
  --exclude=android/build \
  --exclude=android/.gradle \
  --exclude=android/local.properties \
  --exclude=android/.idea \
  --exclude='*.apk' \
  --exclude='*.aab' \
  --exclude='*.jks' \
  --exclude='*.keystore' \
  --exclude=.env \
  --exclude='.env.*' \
  -cf - . | tar -C "$STAGE/$NAME" -xf -

cat > "$STAGE/$NAME/HOW-TO-OPEN.txt" <<EOF
Feeling Yachty app source  v${VERSION}
=====================================

This zip is the source code that builds Feeling-Yachty.apk.

Open the UI code
  App.tsx
  src/

Open in Android Studio
  1. Install Node 20 and Android Studio (Android SDK 34).
  2. In a terminal:
       cd Feeling-Yachty-source-v${VERSION}
       npm install
       echo "sdk.dir=YOUR_ANDROID_SDK_PATH" > android/local.properties
  3. Open the android/ folder in Android Studio.
  4. Build a release APK (Debug has no JS bundle and will show a red error):
       cd android && ./gradlew assembleRelease
  5. APK:
       android/app/build/outputs/apk/release/app-release.apk

Preview without Android Studio
  npm install
  npm run web

Do not commit secrets. WooCommerce is the only payment path. No chatbot.
EOF

rm -f "$SRC_OUT"
(cd "$STAGE" && zip -qry "$SRC_OUT" "$NAME")
echo "src  $SRC_OUT  ($(wc -c < "$SRC_OUT") bytes)"
echo "done  apk + source for v${VERSION}"
