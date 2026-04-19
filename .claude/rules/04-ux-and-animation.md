---
paths:
  - "src/components/**/*.tsx"
  - "app/**/*.tsx"
---

# UX Principles & Animation Rules

## UX Thân Thiện — BẮTBUỘC

**Phản hồi tức thì:**
- Mọi hành động người dùng phải có visual hoặc haptic feedback ngay lập tức.
- Không để app "im lặng" sau khi người dùng bấm — luôn có loading indicator hoặc animation.

**Loading states:**
- List / Feed: dùng **Skeleton loader** (pulse animation) — KHÔNG dùng spinner đơn thuần.
- Button đang xử lý: hiển thị `ActivityIndicator` bên trong, `disabled={true}` — ngăn double submit.
- Màn hình đầu tiên: skeleton toàn trang, không để màn hình trắng.

**Empty states:**
- Danh sách rỗng: icon minh họa + tiêu đề + mô tả ngắn + nút CTA gợi ý hành động.
- KHÔNG được để `null` hoặc màn hình trắng khi data rỗng.

**Form validation:**
- Validate **inline** khi `onBlur` — không chờ submit mới hiện lỗi.
- Thông báo lỗi bằng **tiếng Việt**, ngắn gọn, không dùng technical error code.

**Press feedback:**
- Dùng `Pressable` — KHÔNG dùng `TouchableOpacity`.
- Mọi card, button, list item đều phải có pressed state rõ ràng (scale hoặc opacity).

## Haptic Feedback — `expo-haptics`

```ts
import * as Haptics from 'expo-haptics';

// Press thông thường
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

// Hành động quan trọng (submit thành công, upvote)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

// Xóa / hành động destructive
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
```

Bắt buộc dùng haptic cho: submit form thành công · xóa item · upvote báo cáo.

## Animation — `react-native-reanimated` v4

**KHÔNG dùng `Animated` API cũ của React Native.** Chỉ dùng `react-native-reanimated`.

### Button press (scale)

```tsx
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const scale = useSharedValue(1);
const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

<Animated.View style={animStyle}>
  <Pressable
    onPressIn={() => { scale.value = withSpring(0.95); }}
    onPressOut={() => { scale.value = withSpring(1); }}
  >
```

### Tab icon (scale + bounce khi active)

```tsx
const scale = useSharedValue(1);
useEffect(() => {
  scale.value = withSpring(focused ? 1.2 : 1, { damping: 10 });
}, [focused]);
```

### List item xuất hiện (fade + slide stagger)

```tsx
const opacity    = useSharedValue(0);
const translateY = useSharedValue(20);

useEffect(() => {
  opacity.value    = withDelay(index * 60, withTiming(1, { duration: 300 }));
  translateY.value = withDelay(index * 60, withTiming(0, { duration: 300 }));
}, []);
```

### Toast / Snackbar

- Success: slide từ **trên xuống**.
- Error: slide từ **dưới lên**.
- Tự dismiss sau 3 giây: `withDelay(3000, withTiming(0))`.

### Bottom sheet

- Spring animation khi mở/đóng.
- Backdrop: `withTiming` opacity 0 → 0.5.

## Quy tắc Animation

| | Giá trị |
|---|---|
| Micro-interaction | 200–350ms |
| Screen transition | 400–600ms |
| Tối đa | 600ms (trừ onboarding/splash) |
| Scale / position | `withSpring` |
| Opacity / color | `withTiming` |

- Tất cả animation **chạy trên UI thread** (`useAnimatedStyle` + `useSharedValue`) — không block JS thread.
- Screen transition: dùng Expo Router built-in (`slide_from_right` cho stack, `modal` cho sheet).

## Input & Form UX

- **Debounce search inputs**: 300ms debounce trước khi gọi API search — không search mỗi keystroke
- **Inline validation on blur**: Hiện lỗi Zod khi user rời khỏi field — không đợi submit
- **Disable submit khi loading**: `disabled={isLoading}` + opacity giảm — tránh double-submit
- **Keyboard avoiding**: Dùng `KeyboardAvoidingView` trong form screens — không để bàn phím che input

## Error Feedback — Security-Aware

- **Generic errors cho user**: "Đã xảy ra lỗi, vui lòng thử lại" — không expose message từ server
- **Known errors có thể specific**: "Email đã được sử dụng", "Mật khẩu không đúng" — nếu BE trả về enum code
- **Network error**: "Không có kết nối mạng" — detect bằng `error.code === 'ECONNABORTED'` hoặc `!error.response`
- **401 redirect**: Tự động về login screen — không hỏi user, không hiện error toast
