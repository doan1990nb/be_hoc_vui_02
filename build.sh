#!/bin/bash
# ══════════════════════════════════════════════════════════════
#  BUILD SCRIPT — Tự động build APK
#  Yêu cầu: Node.js 18+, JDK 17, Android Studio
# ══════════════════════════════════════════════════════════════
set -e

echo "🚀 Bắt đầu build Bé Học Vui..."

# 1. Cài dependencies
echo "📦 Cài đặt thư viện..."
npm install

# 2. Build web bundle
echo "🔨 Build web app..."
npm run build

# 3. Khởi tạo Android nếu chưa có
if [ ! -d "android" ]; then
  echo "📱 Khởi tạo Android project..."
  npx cap add android
fi

# 4. Sync code vào Android project
echo "🔄 Sync code..."
npx cap sync android

# 5. Build APK (debug — không cần ký)
echo "🔧 Build APK..."
cd android
./gradlew assembleDebug

# 6. Copy APK ra thư mục gốc cho dễ tìm
cd ..
cp android/app/build/outputs/apk/debug/app-debug.apk ./BeHocVui.apk

echo ""
echo "✅ XONG! APK đã tạo tại: BeHocVui.apk"
echo "📲 Cài đặt: copy file vào điện thoại và mở"
