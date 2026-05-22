# 📲 Hướng dẫn build APK trên GitHub (không cần cài gì trên máy)

Build APK Android **tự động trên cloud của GitHub** — bạn chỉ cần upload code, GitHub sẽ tự build và cho tải APK về.

**Thời gian:** ~10–15 phút cho lần build đầu tiên · **Hoàn toàn miễn phí** với tài khoản GitHub cá nhân.

---

## ✅ Bước 1: Tạo tài khoản GitHub

1. Mở https://github.com → **Sign up**
2. Nhập email + mật khẩu + tên người dùng
3. Xác minh email trong hộp thư của bạn

> 💡 Nếu đã có tài khoản GitHub, bỏ qua bước này.

---

## ✅ Bước 2: Tạo repository (kho chứa code)

1. Đăng nhập GitHub → bấm dấu **+** ở góc trên phải → **New repository**
2. Điền thông tin:
   - **Repository name**: `be-hoc-vui` (hoặc tên bạn thích)
   - **Public** hoặc **Private** đều được (Private cũng được build miễn phí với 2000 phút/tháng)
   - ❌ KHÔNG tick "Add a README file" (mình đã có sẵn)
3. Bấm **Create repository**

Sau khi tạo xong, GitHub sẽ hiện hướng dẫn — **đừng làm theo**, hãy theo bước 3 dưới đây.

---

## ✅ Bước 3: Upload code lên GitHub

### Cách 1: Upload qua giao diện web (đơn giản nhất, không cần cài Git)

1. Giải nén file `be-hoc-vui-source.zip` ra thư mục nào đó trên máy
2. Trên trang repository vừa tạo, bấm **uploading an existing file** (link xanh ở giữa trang)
3. Kéo thả **tất cả** file/thư mục bên trong `be-hoc-vui-build/` vào cửa sổ upload

   ⚠️ Quan trọng: kéo **nội dung bên trong** thư mục `be-hoc-vui-build`, KHÔNG kéo nguyên thư mục đó
4. Đợi upload xong (khoảng 30 giây – 2 phút tuỳ tốc độ mạng)
5. Cuộn xuống dưới, bấm **Commit changes**

### Cách 2: Upload qua Git CLI (nếu bạn biết Git)

```bash
cd /đường/dẫn/đến/be-hoc-vui-build
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/be-hoc-vui.git
git push -u origin main
```

> ⚠️ **Lưu ý quan trọng:** Kiểm tra thư mục `.github/workflows/build-apk.yml` phải có mặt trong upload. Nếu Windows ẩn folder bắt đầu bằng dấu chấm, vào File Explorer → View → Show → Hidden items.

---

## ✅ Bước 4: GitHub Actions tự động build

Ngay sau khi upload xong, GitHub sẽ **tự động chạy build** vì có file workflow trong `.github/workflows/`.

1. Trên trang repository, bấm tab **Actions** (gần đầu trang)
2. Bạn sẽ thấy 1 dòng đang chạy với icon vàng quay 🟡 — đó là quá trình build
3. Bấm vào dòng đó để xem chi tiết

Quá trình build sẽ chạy qua 13 bước:
```
📥 Checkout source         ✓ 5s
🟢 Setup Node.js           ✓ 15s
☕ Setup Java JDK 17       ✓ 30s
📱 Setup Android SDK       ✓ 3 phút (lần đầu)
📦 Install dependencies    ✓ 30s
🔨 Build web app           ✓ 10s
📲 Add Android platform    ✓ 1 phút
🔄 Sync Capacitor          ✓ 20s
🔓 Grant gradlew           ✓ 1s
🚀 Build APK               ✓ 5-8 phút (lần đầu)
📝 Rename APK              ✓ 1s
📤 Upload APK              ✓ 10s
```

**Tổng thời gian: ~10–15 phút lần đầu.** Lần build sau nhanh hơn (~5 phút) nhờ cache.

Khi build xong, dòng đang chạy chuyển thành dấu xanh ✅ **Build APK Android**.

---

## ✅ Bước 5: Tải APK về

1. Bấm vào dòng build vừa hoàn thành (có dấu ✅)
2. Cuộn xuống cuối trang đến phần **Artifacts**
3. Bấm vào **BeHocVui-APK** để tải về file zip
4. Giải nén → bạn sẽ có file `BeHocVui.apk` (~5–8MB)

> ⚠️ Artifact chỉ giữ trong **30 ngày** trên GitHub. Sau đó tải lại cũng được vì code vẫn còn — chỉ cần chạy lại workflow.

---

## ✅ Bước 6: Cài APK lên điện thoại Android

1. **Copy file APK qua điện thoại** bằng 1 trong các cách:
   - 📧 Gửi qua email cho chính mình → mở email trên điện thoại → tải file đính kèm
   - ☁️ Upload lên Google Drive → mở Drive trên điện thoại → tải về
   - 🔌 Cắm cáp USB → kéo thả vào điện thoại
   - 📱 Gửi qua Zalo cho chính mình

2. **Mở file APK trên điện thoại**:
   - Mở file BeHocVui.apk
   - Lần đầu sẽ hỏi: "Cho phép cài đặt từ nguồn không xác định"
   - Vào Cài đặt → Bảo mật → bật quyền cho ứng dụng vừa mở (Chrome/Files/Drive)
   - Quay lại file → bấm **Cài đặt**

3. **Mở app**: bấm Mở hoặc tìm icon Cú Tony 🦉 trong app drawer

---

## 🔄 Khi muốn cập nhật app

Mỗi lần thay đổi code → upload lại lên GitHub → workflow **tự chạy lại** → APK mới ra trong ~10 phút.

**Cách upload bản cập nhật qua web:**
1. Vào repository
2. Mở file cần sửa (ví dụ `src/App.jsx`)
3. Bấm icon ✏️ bên phải → sửa → cuộn xuống → **Commit changes**

Hoặc upload file mới:
1. Vào folder cần thay → **Add file** → **Upload files**
2. Kéo thả file mới → **Commit changes**

---

## 🚀 Tạo bản Release để dễ chia sẻ

Nếu bạn muốn có **link tải APK đẹp** để gửi cho bạn bè/người dùng:

1. Vào tab **Releases** (góc phải trang repository) → **Create a new release**
2. Click "Choose a tag" → gõ `v1.0.0` (hoặc số phiên bản bất kỳ) → "Create new tag"
3. Bấm **Publish release**

Workflow sẽ **tự động build APK và đính kèm vào release**. Link sẽ có dạng:
```
https://github.com/USERNAME/be-hoc-vui/releases/tag/v1.0.0
```

Gửi link này cho ai cũng tải được APK ngay, không cần đăng nhập GitHub.

---

## ❓ Xử lý lỗi thường gặp

### Build thất bại với dấu ❌ đỏ

1. Bấm vào dòng build bị lỗi
2. Bấm vào bước có dấu ❌ để xem log lỗi
3. Copy đoạn lỗi cuối cùng

**Lỗi phổ biến:**

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `File not found: capacitor.config.ts` | Quên upload file ẩn | Kiểm tra đã upload đủ file chưa, đặc biệt thư mục `.github/` |
| `Gradle build failed` | Bộ nhớ runner thiếu | Vào tab Actions → bấm "Re-run all jobs" để chạy lại |
| `JAVA_HOME is not set` | Lỗi tạm thời của GitHub | Re-run jobs |
| `npm install failed` | package-lock.json bị cũ | Xoá file `package-lock.json` rồi upload lại |

### Không thấy tab Actions
- Vào **Settings** → **Actions** → **General** → chọn **Allow all actions** → **Save**

### APK cài bị "App not installed"
- Đảm bảo điện thoại Android 7.0 trở lên
- Gỡ bản cài trước đó (nếu có) trước khi cài bản mới

---

## 💰 Chi phí

GitHub Actions miễn phí với:
- **Repository public**: Unlimited (build bao nhiêu cũng được)
- **Repository private**: 2000 phút/tháng (mỗi lần build ~10 phút → đủ build 200 lần/tháng)

Vì vậy thoải mái build nhé! 🎉

---

## 🔒 Tóm tắt bảo mật

App build ra sẽ:
- ✅ Chạy hoàn toàn offline (không gọi internet)
- ✅ Không xin quyền nào (camera, micro, vị trí...)
- ✅ Không đọc file trên máy
- ✅ Chỉ dùng localStorage (tối đa 5MB cho dữ liệu trong app)
- ✅ Có thể tắt hoàn toàn 3G/Wifi vẫn dùng được

---

## 📞 Cần hỗ trợ thêm?

Gửi screenshot lỗi + log build, mình sẽ giúp debug.
