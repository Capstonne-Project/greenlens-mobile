---
name: build-app
description: Build APK Android hoặc IPA iOS cho GreenLens. Dùng skill này khi cần tạo build để test trên device thật, share APK nội bộ, hoặc submit lên Google Play / App Store — development build, preview, hoặc production release. Hỗ trợ cả EAS Build (cloud, không cần Xcode/Android Studio) và local build.
argument-hint: <android|ios> [dev|preview|production]
---

Build GreenLens cho **$1** — profile: **$2**.

## Chuẩn bị trước khi build

```bash
# 1. Kiểm tra môi trường
npx expo doctor

# 2. Đảm bảo dependencies đúng version
npx expo install --fix

# 3. Kiểm tra app.json
# - version, buildNumber (iOS), versionCode (Android) đã tăng chưa?
# - bundleIdentifier (iOS) và package (Android) đúng chưa?
```

---

## EAS Build (khuyến nghị — cloud build, không cần Xcode/Android Studio)

```bash
# Cài EAS CLI nếu chưa có
npm install -g eas-cli

# Login
eas login

# Cấu hình lần đầu
eas build:configure
```

### Android

```bash
# Development build (dùng với Expo Go custom)
eas build --platform android --profile development

# Preview APK (test nội bộ, không cần sign store)
eas build --platform android --profile preview

# Production AAB (submit Google Play)
eas build --platform android --profile production
```

### iOS

```bash
# Development build
eas build --platform ios --profile development

# Preview IPA (TestFlight internal)
eas build --platform ios --profile preview

# Production IPA (App Store)
eas build --platform ios --profile production
```

---

## Local Build

### Android local

```bash
# Tạo native project
npx expo prebuild --platform android --clean

# Debug APK
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Release APK (cần keystore)
cd android && ./gradlew assembleRelease
```

### iOS local (macOS only)

```bash
npx expo prebuild --platform ios --clean
cd ios && pod install
# Mở Xcode: open ios/GreenLensApp.xcworkspace
```

---

## eas.json (cấu hình profiles)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": { "buildType": "apk" },
      "distribution": "internal"
    },
    "production": {
      "android": { "buildType": "aab" },
      "autoIncrement": true
    }
  }
}
```

---

## Environment variables

```bash
# Set secret cho EAS
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://api.greenlens.vn

# Local .env (không commit)
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

---

## Checklist trước production build

- [ ] `app.json` version và buildNumber/versionCode đã tăng
- [ ] `EXPO_PUBLIC_API_URL` trỏ đúng production API
- [ ] Không có `console.log` debug còn sót
- [ ] Splash screen và icon đã đúng
- [ ] Android: keystore đã được cấu hình trong EAS
- [ ] iOS: certificates và provisioning profile còn hạn

---

## Troubleshooting build lỗi

```bash
# Xem log build EAS
eas build:view          # xem build gần nhất
eas build:list          # danh sách builds

# Clear cache EAS
eas build --clear-cache --platform $1

# Gradle issues (Android local)
cd android && ./gradlew clean && cd ..
npx expo start --clear
```
