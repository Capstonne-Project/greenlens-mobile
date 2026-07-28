---
name: performance
description: Kiểm tra và tối ưu performance React Native cho GreenLens. Dùng skill này khi app bị lag, scroll không mượt, animation giật, FlatList chậm, nghi ngờ memory leak, hoặc muốn audit performance toàn bộ trước khi release. Phát hiện JS thread blocking, re-render thừa, và trả về danh sách vấn đề ưu tiên kèm code fix cụ thể.
argument-hint: [component-or-screen?]
---

Bắt đầu performance audit GreenLens. $ARGUMENTS

## 1. JS Thread — Không được block

**Dấu hiệu:** UI lag khi có heavy computation, animation giật đúng lúc fetch data.

Kiểm tra:
```ts
// SAI — heavy loop trên JS thread trong render
const data = items.map(i => expensiveTransform(i)); // trong component

// ĐÚNG — useMemo
const data = useMemo(() => items.map(i => expensiveTransform(i)), [items]);

// ĐÚNG — tính toán trong service/util, không trong component
```

- `useAnimatedStyle` và `useSharedValue` phải chạy trên UI thread — không dùng `Animated` API cũ.
- Không dùng `console.log` dày đặc trong production.

## 2. Re-render thừa

**Dấu hiệu:** Component render lại khi không cần thiết, list scroll chậm.

Checklist:
```tsx
// Memoize component nếu props ít thay đổi
export const ReportCard = React.memo(function ReportCard({ report, onPress }: ReportCardProps) {
  // ...
});

// useCallback cho handlers truyền vào list items
const handlePress = useCallback((id: string) => {
  router.push(`/report/${id}`);
}, []);

// Zustand — chỉ subscribe selector cần thiết, không subscribe toàn store
const user = useAuthStore(s => s.user);           // ĐÚNG
const store = useAuthStore();                      // SAI — re-render khi bất kỳ field nào đổi
```

## 3. FlatList optimization

**Dấu hiệu:** Scroll lag, blank items khi scroll nhanh.

```tsx
<FlatList
  data={reports}
  keyExtractor={(item) => item.id}            // bắt buộc, dùng id ổn định
  renderItem={({ item }) => (
    <ReportCard report={item} onPress={...} />
  )}

  // Performance props
  removeClippedSubviews={true}                // Android: unmount offscreen items
  maxToRenderPerBatch={10}                    // số items render mỗi batch
  windowSize={5}                              // số viewport render trước/sau
  initialNumToRender={8}                      // render ban đầu
  getItemLayout={(_, index) => ({             // nếu item có fixed height
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}

  // Không đặt inline style/function trong renderItem
  // Không tạo object mới trong keyExtractor
/>
```

## 4. Image optimization

```tsx
import { Image } from 'expo-image'; // dùng expo-image thay Image của RN

<Image
  source={{ uri: report.imageUrls[0] }}
  style={{ width: '100%', height: 160 }}
  contentFit="cover"
  transition={200}       // fade-in animation
  cachePolicy="memory-disk"
  placeholder={blurhash} // hiện blur trong khi load
/>
```

## 5. Animation — UI thread

```ts
// ĐÚNG — chạy trên UI thread
const scale = useSharedValue(1);
const style = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }]
}));

// SAI — setState trong animation callback = JS thread
const [scale, setScale] = useState(1); // gây re-render
```

## 6. Memory leaks

```ts
// Cleanup subscription trong useEffect
useEffect(() => {
  const subscription = someEmitter.addListener('event', handler);
  return () => subscription.remove(); // PHẢI có cleanup
}, []);

// Cleanup timer
useEffect(() => {
  const timer = setTimeout(callback, 3000);
  return () => clearTimeout(timer);
}, []);
```

## 7. Bundle size

```bash
npx expo export --dump-sourcemap
npx react-native-bundle-visualizer  # visualize bundle
```

- Không import toàn bộ thư viện: `import { format } from 'date-fns'` thay vì `import * as dateFns`
- Lazy load màn hình ít dùng với `React.lazy` (web) hoặc Expo Router dynamic import.

---

## Báo cáo kết quả

Sau khi audit `$ARGUMENTS`, trả về:

**Vấn đề tìm thấy:**
- 🔴 Critical: [ảnh hưởng trực tiếp đến UX]
- 🟡 Warning: [cần fix trước release]
- 🟢 OK: [đã tốt]

**Fix ưu tiên theo thứ tự tác động.**
