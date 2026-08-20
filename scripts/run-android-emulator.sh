#!/usr/bin/env bash
# Boot the Feeling Yachty AVD and install dist/Feeling-Yachty.apk
# Requires: Android SDK emulator + KVM that can actually run a guest.
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

AVD="${1:-fy-atd}"
APK="${2:-$(cd "$(dirname "$0")/.." && pwd)/dist/Feeling-Yachty.apk}"

if ! emulator -accel-check | grep -q 'usable'; then
  echo "KVM is not usable on this machine. Sideload the APK on a phone instead."
  exit 1
fi

if ! avdmanager list avd | grep -q "Name: $AVD"; then
  echo "AVD $AVD not found. Create it with:"
  echo "  sdkmanager 'emulator' 'system-images;android-34;aosp_atd;x86_64'"
  echo "  echo no | avdmanager create avd -n $AVD -k 'system-images;android-34;aosp_atd;x86_64' --device pixel_5"
  exit 1
fi

chmod 666 /dev/kvm 2>/dev/null || true

emulator -avd "$AVD" -gpu swiftshader_indirect -no-boot-anim -no-audio -no-metrics -accel on >/tmp/fy-emulator.log 2>&1 &
echo "Waiting for emulator..."
adb wait-for-device
for _ in $(seq 1 90); do
  if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
    break
  fi
  sleep 2
done

adb install -r "$APK"
adb shell monkey -p com.feelingyachty.app -c android.intent.category.LAUNCHER 1
echo "Installed and launched Feeling Yachty."
