# 🦉 Bé Học Vui — Build APK Android

App học tiếng Việt cho trẻ 2–6 tuổi. Chạy hoàn toàn offline, **không cần internet**, **không xin quyền nào** trên điện thoại.

## ✅ Đặc điểm bảo mật

| Vấn đề | Tình trạng |
|---|---|
| 🌐 Kết nối internet | ❌ Không (chỉ load font lần đầu từ Google Fonts) |
| 📁 Truy cập file điện thoại | ❌ Không |
| 📷 Camera, micro, danh bạ | ❌ Không xin quyền |
| 📍 GPS, vị trí | ❌ Không |
| 🔔 Thông báo | ❌ Không |
| 💾 Lưu trữ | ✅ Chỉ `localStorage` trong app (~5MB max) |
| 📳 Rung điện thoại | ✅ Có (không cần xin quyền) |
| 🔊 Phát âm thanh | ✅ Có (không cần xin quyền) |

## 🛠️ Cách build APK

### Yêu cầu cài đặt trên máy tính

1. **Node.js 18+**: https://nodejs.org
2. **JDK 17**: https://adoptium.net (chọn JDK 17 LTS)
3. **Android Studio**: https://developer.android.com/studio
   - Sau khi cài, mở Android Studio → SDK Manager → cài "Android SDK Platform 34"

### Cấu hình biến môi trường

**Windows (PowerShell):**
```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17"
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
```

**Mac/Linux (bash):**
```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.zshrc
source ~/.zshrc
```

### Build APK

**Cách 1: Tự động bằng script**
```bash
chmod +x build.sh
./build.sh
```
→ File APK tạo ra ở `BeHocVui.apk`

**Cách 2: Thủ công từng bước**
```bash
# 1. Cài thư viện
npm install

# 2. Build web
npm run build

# 3. Tạo Android project (lần đầu)
npx cap add android

# 4. Sync code vào Android
npx cap sync android

# 5. Mở Android Studio để build
npx cap open android
```

Trong Android Studio:
- Đợi Gradle sync (5–10 phút lần đầu)
- Menu: **Build → Build Bundle(s)/APK(s) → Build APK(s)**
- APK sinh ra tại: `android/app/build/outputs/apk/debug/app-debug.apk`

## 📲 Cài lên điện thoại

1. Copy file `BeHocVui.apk` vào điện thoại (Bluetooth/USB/Drive)
2. Mở file APK trên điện thoại
3. Cho phép "Cài từ nguồn không xác định" nếu được hỏi
4. Cài đặt → Mở ứng dụng

## 🚀 Chạy thử trên máy tính (không cần build APK)

```bash
npm install
npm run dev
```

Mở http://localhost:5173 trong trình duyệt — chế độ phát triển có hot reload.

## 📋 Cấu trúc dự án

```
be-hoc-vui-build/
├── src/
│   ├── App.jsx          # Toàn bộ code app (1600+ dòng)
│   └── main.jsx         # Entry point React
├── index.html           # HTML wrapper + CSP
├── package.json         # Dependencies
├── vite.config.js       # Vite config
├── capacitor.config.ts  # Capacitor — KHÔNG xin quyền, KHÔNG internet
├── build.sh             # Script tự build
└── android/             # (tạo tự động) Android project
```

## ⚙️ Tùy chỉnh thêm

### Đổi tên app / package
Sửa trong `capacitor.config.ts`:
```typescript
appId: 'com.behocvui.app',     // Đổi thành package của bạn
appName: 'Bé Học Vui',          // Tên hiện trên điện thoại
```

### Đổi icon app
Thay thế file trong `android/app/src/main/res/mipmap-*/ic_launcher.png` bằng icon riêng (kích thước 48px → 192px tùy folder).

Hoặc dùng công cụ tự động: https://icon.kitchen → tải zip → copy vào thư mục `android/app/src/main/res/`

### Build APK để bán/phát hành (release)
```bash
# 1. Tạo keystore (1 lần duy nhất, giữ kỹ file này!)
keytool -genkey -v -keystore behocvui.keystore -alias behocvui -keyalg RSA -keysize 2048 -validity 10000

# 2. Sửa android/app/build.gradle thêm signing config
# (Xem tài liệu Android để biết chi tiết)

# 3. Build release
npm run android:release
```

## 🔍 Kiểm tra app không truy cập internet

Sau khi cài, vào **Cài đặt điện thoại → Ứng dụng → Bé Học Vui → Mạng** → tắt cả Wifi và Mobile Data → app vẫn chạy bình thường ✓

## ❓ Gặp lỗi

- **"Gradle sync failed"**: Mở Android Studio, vào File → Invalidate Caches → Restart
- **"SDK location not found"**: Tạo file `android/local.properties` với nội dung `sdk.dir=/path/to/Android/sdk`
- **"JAVA_HOME not set"**: Kiểm tra lại biến môi trường JDK 17

## 📞 Hỗ trợ

Mọi vấn đề khi build, gửi log lỗi đầy đủ và phiên bản:
- `node --version`
- `java --version`
- Hệ điều hành (Windows/Mac/Linux)
