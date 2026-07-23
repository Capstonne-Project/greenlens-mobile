import { useCallback, useEffect, useMemo } from 'react';
import { Dimensions, FlatList as RNFlatList, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { MapReportListCard } from '@/components/map/MapReportListCard';
import type { CitizenMapPin } from '@/data/citizen-map-mock';

const AnimatedFlatList = Animated.createAnimatedComponent(RNFlatList<CitizenMapPin>);

const SCREEN_HEIGHT = Dimensions.get('window').height;

/** 3 mốc kéo — chiều cao sheet tính từ đáy màn hình lên */
const PEEK_HEIGHT = 132;
const MID_HEIGHT = Math.round(SCREEN_HEIGHT * 0.46);
const FULL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.88);
/** Khi focus 1 pin: thấp hơn mid để không che chấm đỏ trên map */
const FOCUS_HEIGHT = Math.round(SCREEN_HEIGHT * 0.32);

export type SheetSnapPoint = 'peek' | 'mid' | 'full';

const SNAP_HEIGHTS: Record<SheetSnapPoint, number> = {
  peek: PEEK_HEIGHT,
  mid: MID_HEIGHT,
  full: FULL_HEIGHT,
};

interface DraggableReportsSheetProps {
  pins: CitizenMapPin[];
  reportCount: number;
  isLoading: boolean;
  /** Pin đang focus từ marker — sheet chỉ hiện card này và nhảy lên mid */
  focusedPin?: CitizenMapPin | null;
  onOpenDetail: (pin: CitizenMapPin) => void;
  onSnapChange?: (snap: SheetSnapPoint) => void;
  bottomInset?: number;
}

function ListSkeleton() {
  return (
    <View>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={`sheet-skeleton-${index}`} className="mx-4 mb-4 overflow-hidden rounded-2xl bg-surface">
          <View className="h-[200px] w-full bg-border/40" />
          <View className="gap-2 p-4">
            <View className="h-3 w-24 rounded bg-border/60" />
            <View className="h-4 w-3/4 rounded bg-border/60" />
            <View className="h-3 w-1/2 rounded bg-border/60" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function DraggableReportsSheet({
  pins,
  reportCount,
  isLoading,
  focusedPin = null,
  onOpenDetail,
  onSnapChange,
  bottomInset = 0,
}: DraggableReportsSheetProps) {
  const sheetHeight = useSharedValue(SNAP_HEIGHTS.mid);
  const dragStartHeight = useSharedValue(SNAP_HEIGHTS.mid);
  /** Vị trí cuộn hiện tại của FlatList — pan chỉ được kéo sheet khi list đang ở đỉnh (<= 0) */
  const scrollY = useSharedValue(0);
  const isSheetDragging = useSharedValue(false);

  const displayPins = useMemo(
    () => (focusedPin ? [focusedPin] : pins),
    [focusedPin, pins],
  );

  const snapTo = useCallback(
    (point: SheetSnapPoint) => {
      sheetHeight.value = withSpring(SNAP_HEIGHTS[point], { damping: 20, stiffness: 220 });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSnapChange?.(point);
    },
    [sheetHeight, onSnapChange],
  );

  const snapToFocus = useCallback(() => {
    // Spring chậm hơn — sheet trồi lên từ từ, dừng ở mức thấp
    sheetHeight.value = withSpring(FOCUS_HEIGHT, { damping: 28, stiffness: 120, mass: 1.1 });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSnapChange?.('mid');
  }, [sheetHeight, onSnapChange]);

  // Bấm marker → sheet trồi lên từ từ (thấp) hiện đúng card report
  useEffect(() => {
    if (focusedPin) {
      snapToFocus();
    }
  }, [focusedPin?.id, snapToFocus]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          dragStartHeight.value = sheetHeight.value;
          isSheetDragging.value = false;
        })
        .onUpdate((event) => {
          // Dưới snap "full": toàn vùng luôn kéo sheet. Ở "full": chỉ kéo sheet khi list
          // đã ở đỉnh (scrollY <= 0) và đang kéo xuống — nếu không, nhường cho FlatList cuộn.
          const belowFull = sheetHeight.value < SNAP_HEIGHTS.full - 1;
          const atTop = scrollY.value <= 0;
          const draggingDown = event.translationY > 0;

          if (!isSheetDragging.value) {
            if (belowFull || (atTop && draggingDown)) {
              isSheetDragging.value = true;
            } else {
              return;
            }
          }

          const next = dragStartHeight.value - event.translationY;
          sheetHeight.value = Math.max(SNAP_HEIGHTS.peek, Math.min(SNAP_HEIGHTS.full, next));
        })
        .onEnd((event) => {
          if (!isSheetDragging.value) return;
          isSheetDragging.value = false;

          const current = sheetHeight.value;
          const velocity = event.velocityY;

          let target: SheetSnapPoint;
          if (velocity < -800) {
            target = 'full';
          } else if (velocity > 800) {
            target = current > SNAP_HEIGHTS.mid ? 'mid' : 'peek';
          } else {
            const distances: [SheetSnapPoint, number][] = [
              ['peek', Math.abs(current - SNAP_HEIGHTS.peek)],
              ['mid', Math.abs(current - SNAP_HEIGHTS.mid)],
              ['full', Math.abs(current - SNAP_HEIGHTS.full)],
            ];
            distances.sort((a, b) => a[1] - b[1]);
            target = distances[0][0];
          }

          runOnJS(snapTo)(target);
        }),
    [dragStartHeight, sheetHeight, scrollY, isSheetDragging, snapTo],
  );

  const nativeGesture = useMemo(() => Gesture.Native(), []);
  const composedGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, nativeGesture),
    [panGesture, nativeGesture],
  );

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value + bottomInset,
  }));

  return (
    <Animated.View
      style={animatedSheetStyle}
      className="absolute bottom-0 left-0 right-0 z-10 overflow-hidden rounded-t-3xl border border-border bg-white shadow-lg shadow-black/10"
    >
      <GestureDetector gesture={panGesture}>
        <View className="items-center pb-3 pt-2">
          <View className="mb-2 h-1.5 w-10 rounded-full bg-border" />
          <Text className="text-sm font-semibold text-textSecondary">
            {isLoading
              ? 'Đang tải…'
              : focusedPin
                ? 'Đang focus 1 báo cáo'
                : `${reportCount.toLocaleString('vi-VN')} báo cáo trong khu vực`}
          </Text>
        </View>
      </GestureDetector>

      {isLoading && displayPins.length === 0 ? (
        <ListSkeleton />
      ) : displayPins.length === 0 ? (
        <View className="items-center px-6 py-16">
          <Text className="text-center text-sm text-textSecondary">
            Không có báo cáo nào trong khu vực đang xem. Thử kéo bản đồ sang khu vực khác.
          </Text>
        </View>
      ) : (
        <GestureDetector gesture={composedGesture}>
          <AnimatedFlatList
            data={displayPins}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MapReportListCard pin={item} onPress={() => onOpenDetail(item)} />}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: bottomInset + 24 }}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          />
        </GestureDetector>
      )}
    </Animated.View>
  );
}

export { SNAP_HEIGHTS };
export const REPORTS_SHEET_PEEK_HEIGHT = PEEK_HEIGHT;
