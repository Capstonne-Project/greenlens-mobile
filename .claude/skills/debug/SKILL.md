---
name: debug
description: Systematic debugging guide cho React Native / Expo GreenLens. Dùng skill này bất cứ khi nào app crash, có error message, lỗi build, lỗi Metro bundler, lỗi NativeWind/styling không apply, lỗi Expo Router navigation, lỗi Reanimated animation, hoặc bất kỳ runtime error nào — kể cả khi người dùng chỉ paste stack trace hoặc mô tả triệu chứng mà không biết nguyên nhân.
argument-hint: [error-description?]
---

Bắt đầu debug GreenLens. $ARGUMENTS

## Bước 1 — Thu thập thông tin

Trả lời các câu hỏi sau:
1. Lỗi xảy ra khi nào? (build time / runtime / specific action)
2. Platform nào? (Android / iOS / cả hai)
3. Error message đầy đủ là gì? (copy stack trace nếu có)
4. Lần cuối app chạy được là sau thay đổi gì?

---

## Diagnostic trees

### A. Metro bundler lỗi

```
"Unable to resolve module" / "Module not found"
→ 1. Kiểm tra import path — @/ trỏ đến src/ không?
→ 2. Kiểm tra tsconfig.json: "paths": { "@/*": ["./src/*"] }
→ 3. npx expo start --clear
→ 4. rm -rf node_modules/.cache && npx expo start --clear

"Cannot find native module"
→ npx expo install <package> (đúng version với Expo SDK 54)
→ npx expo prebuild --clean (nếu dùng bare workflow)
```

### B. NativeWind className không apply

```
Kiểm tra theo thứ tự:
□ app/_layout.tsx có import '../global.css' không?
□ global.css có @tailwind base/components/utilities không?
□ babel.config.js: jsxImportSource: 'nativewind' + plugin 'nativewind/babel'
□ metro.config.js: withNativeWind(config, { input: './global.css' })
□ nativewind-env.d.ts: /// <reference types="nativewind/types" />
□ tsconfig.json include nativewind-env.d.ts
→ Fix xong: npx expo start --clear
```

### C. Expo Router navigation lỗi

```
"Unmatched route" / screen không render
→ Kiểm tra tên file trong app/ — lowercase, dùng dấu -
→ Dynamic route: [id].tsx — KHÔNG phải :id.tsx
→ Group: (auth)/ — không affect URL nhưng phải có _layout.tsx bên trong
→ Kiểm tra _layout.tsx cha đã khai báo <Stack.Screen name="..." /> chưa

"Cannot navigate to X"
→ Dùng router.push('/(tabs)/map') — phải có leading slash và đúng group
```

### D. Reanimated lỗi

```
"Reanimated 2 failed to create a worklet"
→ babel.config.js thiếu plugin 'react-native-reanimated/plugin'
→ Plugin này phải ở cuối danh sách plugins

"useAnimatedStyle returned undefined"
→ Worklet functions phải ở trong useAnimatedStyle, không gọi ngoài
→ Không gọi .value trực tiếp trong render — chỉ trong useAnimatedStyle

App crash khi import Reanimated
→ Kiểm tra react-native-reanimated version tương thích với RN 0.81
→ npx expo install react-native-reanimated
```

### E. TypeScript errors

```
"Property 'className' does not exist"
→ nativewind-env.d.ts thiếu hoặc chưa được include trong tsconfig
→ Ctrl+Shift+P → "TypeScript: Restart TS Server"

"Cannot find module '@/...'"
→ tsconfig.json paths: "@/*": ["./src/*"]
→ Restart TS Server
```

### F. Android build lỗi

```bash
# Xem log chi tiết
npx expo run:android 2>&1 | grep -E "error|Error|FAILURE"

# Gradle issues
cd android && ./gradlew clean && cd ..
npx expo start --clear

# SDK version mismatch
npx expo install --fix
```

---

## Commands hữu ích

```bash
npx expo start --clear          # clear Metro cache
npx expo install --fix          # fix package version mismatches
npx expo doctor                 # kiểm tra toàn bộ setup
npx react-native info           # thông tin môi trường
```

Sau khi chẩn đoán, đề xuất fix cụ thể kèm giải thích root cause.
