---
name: component
description: Scaffold React Native UI component mới cho GreenLens theo design system, NativeWind, Reanimated animation và TypeScript. Dùng skill này bất cứ khi nào cần tạo component trong src/components/ — Button, Card, Input, Badge, Modal, Skeleton, MapMarker, ReportCard, SeverityBadge, hoặc bất kỳ UI component nào. Tự động chọn đúng domain (common/report/map/layout) dựa theo tên component.
argument-hint: <ComponentName> [domain?]
---

Tạo component `$1` cho GreenLens.

## Bước 1 — Xác định domain

Dựa vào tên `$1`, xác định đặt vào:
- `src/components/common/` — nếu dùng được ở nhiều nơi, không phụ thuộc domain
- `src/components/report/` — liên quan đến báo cáo ô nhiễm
- `src/components/map/` — liên quan đến bản đồ
- `src/components/layout/` — wrapper, header, container

## Bước 2 — Tạo file component

File path: `src/components/<domain>/$1.tsx`

Template bắt buộc:

```tsx
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface $1Props {
  // định nghĩa props đầy đủ — không dùng any
}

export function $1({ /* props */ }: $1Props) {
  // nếu có onPress → thêm scale animation
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        className="bg-white rounded-2xl border border-border p-4"
      >
        {/* content */}
      </Pressable>
    </Animated.View>
  );
}
```

## Bước 3 — Checklist trước khi xong

- [ ] Named export (`export function`, không phải `export default`)
- [ ] Props interface đầy đủ, không có `any`
- [ ] Dùng `Pressable` thay `TouchableOpacity`
- [ ] Có press animation nếu component có `onPress`
- [ ] Màu dùng token: `bg-primary`, `text-textPrimary`, không hard-code hex
- [ ] Border radius đúng: card `rounded-2xl`, button/input `rounded-xl`, badge `rounded-full`
- [ ] Không dùng `Animated` API cũ

## Bước 4 — Nếu component có loading state

Thêm skeleton pulse:

```tsx
import { useEffect } from 'react';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming,
} from 'react-native-reanimated';

export function $1Skeleton() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
  }, []);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={pulse} className="bg-surface rounded-2xl h-24 w-full" />
  );
}
```

## Performance Pattern — List Item Components

Nếu component được dùng trong FlatList → PHẢI wrap React.memo:

```tsx
// Memoized list item
export const ReportCard = React.memo(function ReportCard({
  report,
  onPress,
}: ReportCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => onPress(report.id)}
      >
        {/* content */}
      </Pressable>
    </Animated.View>
  );
});

// Khi dùng trong FlatList — onPress phải stable (useCallback ở parent)
const handlePress = useCallback((id: string) => {
  router.push(`/report/${id}`);
}, []);
```

## Security Pattern — Input Components

Mọi Input component kết nối form → phải hỗ trợ React Hook Form Controller:

```tsx
// Input component bảo mật
interface SecureInputProps {
  label: string;
  error?: string;          // từ Zod field error
  secureTextEntry?: boolean;
  // React Hook Form
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
}

export function AppInput({ label, error, secureTextEntry, ...fieldProps }: SecureInputProps) {
  return (
    <View>
      <Text className="text-sm text-textSecondary mb-1">{label}</Text>
      <TextInput
        className={`rounded-xl border px-4 py-3 text-base ${
          error ? 'border-error' : 'border-border'
        }`}
        secureTextEntry={secureTextEntry}
        autoCapitalize={secureTextEntry ? 'none' : undefined}
        autoCorrect={!secureTextEntry}
        {...fieldProps}
      />
      {error && <Text className="text-error text-xs mt-1">{error}</Text>}
    </View>
  );
}
```

Sau khi tạo xong, báo cáo: tên file, export name, props interface tóm tắt.
