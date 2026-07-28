---
name: security
description: Kiểm tra và vá lỗ hổng bảo mật cho GreenLens. Dùng skill này khi cần audit bảo mật, review code trước khi release, kiểm tra token storage, validate input, nghi ngờ có lỗ hổng trong bất kỳ phần nào của app, hoặc muốn hardening authentication. Bao gồm: React Native/Expo security, secure storage, API security, input validation, dependency vulnerabilities.
argument-hint: [component-or-feature?]
---

Bắt đầu security audit GreenLens. $ARGUMENTS

## 1. Secure Storage — Token & Sensitive Data

```ts
// ✅ ĐÚNG — expo-secure-store (encrypted, hardware-backed)
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('accessToken', token);
await SecureStore.getItemAsync('accessToken');

// ❌ SAI — AsyncStorage không mã hóa
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('accessToken', token); // plaintext trên disk

// ❌ SAI — hardcode credentials
const API_KEY = 'sk-1234abcd';
```

**Checklist:**
- [ ] Token (`accessToken`, `refreshToken`) dùng `expo-secure-store`
- [ ] Không có credentials, API keys trong source code
- [ ] `.env` không được commit — kiểm tra `.gitignore`
- [ ] `EXPO_PUBLIC_*` vars chỉ chứa non-sensitive data (URL public, feature flags)
- [ ] Sensitive data không log ra console trong production

---

## 2. API Security

```ts
// ✅ Authorization header tự động qua interceptor
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ Clear token khi 401
api.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401) {
    await SecureStore.deleteItemAsync('accessToken');
    // redirect to login
  }
  return Promise.reject(error);
});
```

**Checklist:**
- [ ] Tất cả API call dùng HTTPS (không có `http://` trong production URL)
- [ ] Token được refresh trước khi hết hạn, không lưu quá lâu
- [ ] Không gửi sensitive data qua query params (`?password=123`)
- [ ] API timeout được set (15s) — tránh hanging request
- [ ] 401/403 response xử lý đúng cách — không expose error details ra UI

---

## 3. Input Validation — Zod + React Hook Form

```ts
// ✅ Validate ở client trước khi gửi
import { z } from 'zod';

export const createReportSchema = z.object({
  title:       z.string().min(5).max(100).trim(),
  description: z.string().min(10).max(1000).trim(),
  // Không cho phép HTML/script injection qua trim + max length
});

// ✅ Sanitize location data
export const locationSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address:   z.string().max(255).trim(),
});
```

**Checklist:**
- [ ] Mọi form input có Zod schema validation
- [ ] String fields có `.trim()` và `.max()` để ngăn overflow
- [ ] Numeric fields có `.min()` / `.max()` range check
- [ ] File upload: kiểm tra `mimeType` và size trước khi gửi lên server
- [ ] Không dùng `eval()` hay `dangerouslySetInnerHTML`

---

## 4. Image & File Upload Security

```ts
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images, // chỉ images, không phải files
  quality: 0.8,
});

// ✅ Validate trước khi upload
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
if (result.assets[0].fileSize > MAX_SIZE) {
  throw new Error('File quá lớn, tối đa 5MB');
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
if (!ALLOWED_TYPES.includes(result.assets[0].mimeType)) {
  throw new Error('Chỉ hỗ trợ JPEG, PNG, WebP');
}
```

---

## 5. Authentication & Session

```ts
// ✅ Token expiry check trước khi dùng
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // parse lỗi → coi như hết hạn
  }
}

// ✅ Logout dọn dẹp hoàn toàn
async function logout() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  // clear Zustand store
  useAuthStore.getState().clearAuth();
  // clear React Query cache
  queryClient.clear();
  router.replace('/(auth)/login');
}
```

**Checklist:**
- [ ] Logout xóa cả token lẫn cache (React Query + Zustand)
- [ ] Deep link / URL scheme không expose sensitive params
- [ ] Biometric auth (nếu có) dùng `expo-local-authentication`
- [ ] Session không tự động gia hạn vô thời hạn

---

## 6. Permissions — Camera, Location, Notifications

```ts
import * as Location from 'expo-location';

// ✅ Request đúng lúc, giải thích lý do
async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    // Hiển thị message giải thích tại sao cần quyền
    // Không crash app nếu bị từ chối
    return null;
  }
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
}
```

**Checklist:**
- [ ] Chỉ request permission khi thực sự cần (không request hết khi app mở)
- [ ] Xử lý gracefully khi permission bị từ chối — không crash
- [ ] Background location chỉ dùng khi có lý do thực sự cần
- [ ] Không request WRITE_EXTERNAL_STORAGE trên Android 10+

---

## 7. Dependency Security

```bash
# Kiểm tra vulnerabilities
npm audit

# Fix tự động (non-breaking)
npm audit fix

# Xem packages outdated
npm outdated

# Kiểm tra Expo compatibility
npx expo install --fix
```

**Checklist:**
- [ ] Không có `critical` hoặc `high` severity vulnerabilities trong `npm audit`
- [ ] Không dùng package deprecated hoặc không còn maintain
- [ ] Không import trực tiếp từ GitHub raw URLs
- [ ] `package-lock.json` được commit để lock versions

---

## 8. Production Checklist trước khi release

- [ ] Tắt `__DEV__` logs: wrap `console.log` với `if (__DEV__)`
- [ ] Không có hardcoded `localhost` hay IP nội bộ trong code
- [ ] `EXPO_PUBLIC_API_URL` trỏ đúng production endpoint (HTTPS)
- [ ] Certificate pinning (nếu cần bảo mật cao)
- [ ] ProGuard/R8 enabled cho Android release build
- [ ] App Transport Security (ATS) không bị disable trên iOS

---

## Báo cáo kết quả

Nhóm theo mức độ:
- 🔴 **Critical** — lộ credentials, unencrypted token storage, no auth on API
- 🟠 **High** — missing input validation, improper permission handling
- 🟡 **Medium** — console.log sensitive data, outdated deps với known CVE
- 🟢 **Low / Info** — best practice improvements

Với mỗi vấn đề: mô tả lỗ hổng, file/line cụ thể, và code fix mẫu.
