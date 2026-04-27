---
name: screen
description: Scaffold màn hình React Native hoàn chỉnh cho GreenLens. Dùng skill này khi cần tạo bất kỳ màn hình mới nào — login, register, home, map, profile, report detail, notifications, và bất kỳ screen nào trong app/. Tạo đồng thời screen file (app/), component UI (src/components/), và data hook (src/hooks/) theo đúng Expo Router convention và GreenLens architecture.
argument-hint: <ScreenName> [group?]
---

Tạo màn hình `$1` cho GreenLens.

## Bước 1 — Xác định group và path

Dựa vào tên `$1`:
- Auth screens → `app/(auth)/$1.tsx`
- Tab screens → `app/(tabs)/$1.tsx`
- Detail/modal → `app/$1/[id].tsx` hoặc `app/$1.tsx`

## Bước 2 — Tạo hook data (nếu cần fetch)

File: `src/hooks/use$1.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { xxxService } from '@/services/xxx.service';

export function use$1() {
  const query = useQuery({
    queryKey: ['$1-key'],
    queryFn: () => xxxService.getXxx().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data:      query.data?.data ?? [],
    isLoading: query.isLoading,
    error:     query.error,
    refetch:   query.refetch,
  };
}
```

## Bước 3 — Tạo screen file

File: `app/<group>/$1.tsx`

```tsx
import { SafeScreen } from '@/components/layout/SafeScreen';

export default function $1Screen() {
  // gọi hook ở đây nếu cần
  // KHÔNG đặt logic business hay fetch trực tiếp ở đây

  return (
    <SafeScreen className="px-4">
      {/* content */}
    </SafeScreen>
  );
}
```

**Quy tắc screen file:**
- `export default` (Expo Router yêu cầu)
- Chỉ gọi hooks và render — không có business logic
- Luôn wrap bằng `SafeScreen`

## Bước 4 — Loading & Empty state (bắt buộc với list screen)

```tsx
// List screen bắt buộc có đủ 3 state:
if (isLoading) return <SkeletonList count={5} />;
if (error)     return (
  <View className="flex-1 items-center justify-center px-4">
    <Text className="text-error text-base text-center">
      Đã xảy ra lỗi. Vui lòng thử lại.
    </Text>
    <Pressable onPress={() => refetch()} className="mt-3">
      <Text className="text-primary font-medium">Thử lại</Text>
    </Pressable>
  </View>
);
if (!data.length) return (
  <EmptyState
    icon="leaf-outline"
    title="Chưa có dữ liệu"
    description="Mô tả ngắn gọn"
    action={{ label: 'Hành động', onPress: () => {} }}
  />
);
```

**Lưu ý:** Error display luôn dùng generic message — KHÔNG expose `error.message` từ API ra UI.

Với list screen, FlatList phải có optimization props:

```tsx
<FlatList
  data={data}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemComponent item={item} onPress={handlePress} />}
  removeClippedSubviews
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

## Bước 5 — Form screen (auth / create report)

```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginForm } from '@/utils/validators';
import * as Haptics from 'expo-haptics';

const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
  resolver: zodResolver(loginSchema),
});

const onSubmit = async (data: LoginForm) => {
  try {
    await someAction(data);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};
```

## Checklist trước khi xong

- [ ] Screen file dùng `export default`
- [ ] Wrapped bằng `SafeScreen`
- [ ] List screen có skeleton + empty state + error state
- [ ] Form screen có loading button + haptic feedback
- [ ] Hook trả về object (không array)
- [ ] Không fetch API trực tiếp trong screen component

## Security & Performance Checklist (mỗi screen)

**Security:**
- [ ] Error display: generic message, không phải `error.message` từ API
- [ ] Form screen: có Zod schema + React Hook Form validation
- [ ] Màn hình có sensitive data (profile, payment): không screenshot-able nếu cần
- [ ] Deep link params: validate và sanitize trước khi dùng

**Performance:**
- [ ] Data fetch screen: skeleton loader (không spinner)
- [ ] List screen: FlatList với `removeClippedSubviews`, `keyExtractor` stable ID
- [ ] List item component: `React.memo` wrapped
- [ ] Tránh `useEffect` + `setState` gây extra re-render — dùng React Query trực tiếp
- [ ] Image: dùng `expo-image` với `cachePolicy="memory-disk"` và `placeholder={blurhash}`

Sau khi tạo xong, liệt kê các file đã tạo và file nào cần tạo thêm (service, component).
