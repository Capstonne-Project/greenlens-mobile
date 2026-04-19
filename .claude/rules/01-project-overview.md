# GreenLens — Project Overview

**Tên:** Ứng dụng cộng đồng báo cáo điểm rác thải và ô nhiễm môi trường  
**Mã:** SU26SE049 | **Lĩnh vực:** Quản lý môi trường · Crowdsourcing · Smart City  
**Quy mô:** ≥ 5.000 người dùng đồng thời · ≥ 100.000 báo cáo

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Navigation | Expo Router v6 (file-based routing) |
| Styling | NativeWind v4 (Tailwind CSS for RN) |
| Animation | `react-native-reanimated` v4 — KHÔNG dùng Animated API cũ |
| Haptics | `expo-haptics` |
| Language | TypeScript strict mode |
| State | Zustand (global) + React Query (server state) |
| HTTP | Axios |
| Forms | React Hook Form + Zod |
| Maps | `react-native-maps` |
| Camera | `expo-camera` + `expo-image-picker` |
| Notifications | `expo-notifications` |
| Storage | `expo-secure-store` (tokens) + AsyncStorage |
| Icons | `@expo/vector-icons` — ưu tiên Ionicons |

## Security Requirements (Non-Negotiable)

- **Token storage**: CHỈ dùng `expo-secure-store` — không bao giờ AsyncStorage cho token/credentials
- **Input validation**: Mọi form dùng `react-hook-form` + `Zod` schema — validate trước khi gửi API
- **HTTPS only**: `EXPO_PUBLIC_API_URL` phải là `https://` trong production — không có exception
- **No sensitive logs**: Không `console.log` token, password, PII — wrap toàn bộ log với `if (__DEV__)`
- **No hardcode credentials**: Không có API key, secret, password trong source code hay git history
- **Error messages**: UI chỉ hiện generic message — không expose stack trace, response body lỗi của server
- **401 handling**: Clear token ngay lập tức, redirect login — không retry với token hết hạn

## Performance Targets (Production SLA)

| Metric | Target |
|---|---|
| Animation | 60fps — UI thread only (Reanimated), không JS thread |
| Cold start | < 3 giây trên mid-range Android |
| Screen transition | < 400ms |
| API response + render | < 1.5 giây cho above-the-fold content |
| List scroll | 60fps với 1000+ items (FlatList virtualization) |
| Memory | < 150MB RAM steady state |
| Bundle size | < 5MB JS bundle (tree-shake, no wildcard imports) |

Nếu một feature vi phạm bất kỳ target nào, phải document lý do và plan optimize.

## Commands

```bash
npx expo start           # dev (chọn platform trong terminal)
npx expo start --android
npx expo start --ios
npm run lint
```

## Feature Checklist

**User:**
- [ ] Đăng ký / Đăng nhập / Quên mật khẩu
- [ ] Tạo báo cáo (ảnh, GPS, mô tả, mức độ)
- [ ] Bản đồ điểm ô nhiễm xung quanh
- [ ] Theo dõi trạng thái báo cáo
- [ ] Thông báo khi báo cáo được xử lý
- [ ] Leaderboard đóng góp cộng đồng
- [ ] Hồ sơ + lịch sử báo cáo

**Admin (Web Dashboard):**
- [ ] Danh sách & bản đồ toàn bộ báo cáo
- [ ] Phân công & cập nhật trạng thái
- [ ] Thống kê theo khu vực / thời gian
- [ ] Quản lý tài khoản người dùng
