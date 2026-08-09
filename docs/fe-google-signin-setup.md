# Đăng nhập Google — setup & build

**Firebase project:** `greenlens-app` (project number `472273559472`)

> **Google login KHÔNG chạy trên Expo Go.** Cần development build — xem mục [Build](#build).
> Các tính năng khác vẫn quét QR bằng Expo Go bình thường.

## 🔴 Cần xử lý: service account key đã lộ

File `greenlens-polution-app-firebase-adminsdk-fbsvc-54fffc6fb5.json` **đã bị commit và push
lên `origin/main`** (commit `ccfeaf5`). Private key đó cấp quyền admin toàn bộ Firebase project.

Đã xử lý phần trong repo: gỡ khỏi git index, vá `.gitignore` (pattern cũ
`**/firebase-adminsdk*.json` trượt vì tên file có prefix là project id).

**Vẫn phải làm thủ công** — key còn trong lịch sử git đã push:
1. [Firebase Console → Service accounts](https://console.firebase.google.com/project/greenlens-polution-app/settings/serviceaccounts/adminsdk) của project **`greenlens-polution-app`**
2. Xoá key `54fffc6fb5`
3. Cân nhắc dọn lịch sử git (`git filter-repo` / BFG) — cần force push, phối hợp cả team

## Luồng

```
App → Google Sign-In (native SDK)          → google idToken
    → Firebase Identity Toolkit signInWithIdp → Firebase idToken
    → POST /v1/auth/google-login              → accessToken + refreshToken + user
```

Bước giữa bắt buộc: BE verify bằng **Firebase Admin SDK**, nên token Google thô không dùng
trực tiếp được.

## Trạng thái cấu hình

| | Trạng thái |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | ✅ đã điền, đã verify hợp lệ |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | ✅ đã điền |
| Google provider (Firebase Auth) | ✅ đã bật |
| BE `GoogleAuthService` verify thật | ✅ đã implement |
| **SHA-1 trong Firebase** | ❌ **cần thêm** |
| **Service account key BE khớp project** | ❌ **cần thay** |

## Còn phải làm

### 1. Thêm SHA-1 vào Firebase

**SHA-1 phụ thuộc keystore ký app — mỗi cách build một keystore khác nhau.**
Sai SHA-1 → `DEVELOPER_ERROR`.

#### Nếu build bằng EAS (khuyến nghị — không cần Android Studio/JDK 17)

EAS ký bằng keystore **trên cloud**, không phải debug keystore máy bạn. Lấy SHA-1 sau khi
đã chạy build lần đầu (build đầu tiên EAS sẽ hỏi tạo keystore — chọn Yes):

```bash
eas credentials
# → Android → development (hoặc production) → Keystore → xem "SHA1 Fingerprint"
```

#### Nếu build local (`npx expo run:android`)

Dùng debug keystore trên máy. SHA-1 hiện tại:
```
AB:F8:BA:6C:45:CA:75:AB:93:29:E4:EF:35:9A:E9:89:E4:53:95:FA
```
Lấy lại khi cần:
```powershell
& "C:\Program Files\Java\jdk-11\bin\keytool.exe" -list -v `
  -keystore "$env:USERPROFILE\.android\debug.keystore" `
  -alias androiddebugkey -storepass android -keypass android
```

#### Dán vào đâu

[Firebase Console → Project settings](https://console.firebase.google.com/project/greenlens-app/settings/general)
→ "Your apps" → Android app `greenlens.app` → **Add fingerprint** → Save

Kiểm tra **package name** phải là `com.anonymous.greenlensapp` (khớp `app.json` →
`android.package`).

> Thêm được **nhiều** SHA-1 cùng lúc — cứ thêm hết cả debug lẫn EAS keystore để build kiểu
> nào cũng chạy.

### 2. Thay service account key cho BE

BE đang cầm key của `greenlens-polution-app`, app phát token từ `greenlens-app`
→ Firebase Admin SDK sẽ từ chối mọi token.

1. [Firebase → Service accounts](https://console.firebase.google.com/project/greenlens-app/settings/serviceaccounts/adminsdk) của project **`greenlens-app`**
2. **Generate new private key** → tải file về
3. Copy vào `D:\CapsoneProject\Server\greenlens-service\src\Greenlens.Api\`
4. Sửa `appsettings.Development.json` → `Firebase:ServiceAccountKeyPath` thành tên file mới

## ⚠️ Plugin đã được gỡ khỏi `app.json`

Để Expo Go chạy được, `@react-native-google-signin/google-signin` **không** nằm trong
`expo.plugins`. Package vẫn còn trong `package.json`, và hook nạp nó bằng `require()` trong
hàm (không phải `import` top-level) — nên Expo Go chỉ thấy nút Google báo "cần bản build
riêng", các màn khác chạy bình thường.

**Khi build development build, phải thêm lại vào `app.json`:**

```json
"plugins": [
  ...,
  "expo-video",
  "@react-native-google-signin/google-signin"
]
```

> Bài học: để plugin đó trong `app.json` khi chạy Expo Go sẽ làm **cả app crash**
> ("unmatched route" / màn trắng), không chỉ riêng nút Google.

## Build

Native module không có trong Expo Go → phải tạo development build. **Làm 1 lần**, sau đó
workflow hàng ngày vẫn là quét QR + hot reload như cũ.

### EAS build — Android (khuyến nghị)

Build trên cloud, không cần Android Studio hay JDK 17 trên máy.

```bash
eas login                                              # lần đầu
eas build --profile development --platform android
```

Lần đầu EAS sẽ hỏi tạo keystore → chọn **Yes**. Build xong (~10–20 phút) có link tải APK,
mở link trên điện thoại Android để cài.

Sau khi build đầu tiên xong, lấy SHA-1 và thêm vào Firebase (xem mục 1) — **nếu chưa thêm
thì Google login sẽ lỗi `DEVELOPER_ERROR`**, các tính năng khác vẫn chạy.

### Local build (nếu muốn)

```bash
npx expo prebuild --clean
npx expo run:android
```

Yêu cầu: **JDK 17** (máy hiện có JDK 11 — không đủ cho SDK 54), Android Studio + SDK,
điện thoại bật USB debugging hoặc emulator image "Google APIs" (bản "AOSP" không có
Play Services → Google login không chạy).

### Sau khi cài development build

```bash
npx expo start --dev-client
```
Quét QR bằng chính app vừa cài (không phải Expo Go). Sửa code → hot reload y hệt.

**Chỉ build lại khi** thêm/gỡ native module hoặc đổi config trong `app.json`.
Sửa code JS/TS thì không cần.

## Files

**Mobile**

| File | Vai trò |
|---|---|
| [`useGoogleSignIn.ts`](../src/hooks/useGoogleSignIn.ts) | Native sign-in → đổi token → gọi BE |
| [`firebase-auth.service.ts`](../src/services/firebase-auth.service.ts) | `signInWithIdp` REST |
| [`useAuth.ts`](../src/hooks/useAuth.ts) | `loginWithGoogle` — lưu token, consent, push token |
| [`login.tsx`](<../app/(auth)/login.tsx>) | Nút Google + loading + hiện lỗi |

**BE** — `GoogleAuthService.cs` verify qua Firebase Admin SDK.

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân |
|---|---|
| `DEVELOPER_ERROR` | SHA-1 chưa thêm vào Firebase, hoặc package name lệch |
| `GOOGLE_AUTH_FAILED` từ BE | Service account key khác project với token (mục 2 ở trên) |
| `FIREBASE_TOKEN_EXCHANGE_FAILED` | Sai `EXPO_PUBLIC_FIREBASE_API_KEY`, hoặc chưa bật Google provider |
| `PLAY_SERVICES_NOT_AVAILABLE` | Emulator không có Google Play — dùng image "Google APIs" |
| Crash / module null khi mở app | Đang chạy Expo Go — cần development build |
| `idToken` null | Dùng nhầm Android client ID; `webClientId` phải là **Web** client ID |
