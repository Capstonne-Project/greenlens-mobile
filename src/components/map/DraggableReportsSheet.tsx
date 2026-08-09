import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Dimensions,
  FlatList as RNFlatList,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
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
/** Ước lượng ban đầu khi focus — onLayout sẽ chỉnh sát chiều cao card thật */
const FOCUS_HEIGHT_ESTIMATE = 360;

export type SheetSnapPoint = 'peek' | 'mid' | 'full';

const SNAP_HEIGHTS: Record<SheetSnapPoint, number> = {
  peek: PEEK_HEIGHT,
  mid: MID_HEIGHT,
  full: FULL_HEIGHT,
};

/**
 * Chiều cao thật của sheet — cố định để có thể trượt bằng `translateY` thay vì animate
 * `height`. Cộng thêm dư ra dưới đáy màn cho `bottomInset` và hiệu ứng bounce.
 */
const SHEET_CONTAINER_HEIGHT = FULL_HEIGHT + Math.round(SCREEN_HEIGHT * 0.12);

interface DraggableReportsSheetProps {
  pins: CitizenMapPin[];
  reportCount: number;
  isLoading: boolean;
  /** Pin đang focus từ marker — sheet fit 1 card, ẩn dòng đếm khu vực */
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
  const isFocusMode = useSharedValue(focusedPin ? 1 : 0);
  const lastFocusHeightRef = useRef(0);

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
    isFocusMode.value = 1;
    lastFocusHeightRef.current = 0;
    // Tạm theo estimate — onLayout sẽ spring sát chiều cao nội dung thật
    sheetHeight.value = withSpring(FOCUS_HEIGHT_ESTIMATE, {
      damping: 28,
      stiffness: 120,
      mass: 1.1,
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSnapChange?.('peek');
  }, [sheetHeight, onSnapChange, isFocusMode]);

  const onFocusContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!focusedPin) return;
      const h = Math.ceil(event.nativeEvent.layout.height);
      if (h < 120) return;
      if (Math.abs(h - lastFocusHeightRef.current) < 2) return;
      lastFocusHeightRef.current = h;
      sheetHeight.value = withSpring(h, { damping: 26, stiffness: 180, mass: 1 });
    },
    [focusedPin, sheetHeight],
  );

  const prevFocusedIdRef = useRef<string | null>(null);

  // Bấm marker → sheet fit card; xóa focus → mid + hiện lại dòng đếm
  useEffect(() => {
    const id = focusedPin?.id ?? null;
    if (id) {
      snapToFocus();
    } else if (prevFocusedIdRef.current) {
      isFocusMode.value = 0;
      snapTo('mid');
    }
    prevFocusedIdRef.current = id;
  }, [focusedPin?.id, snapToFocus, snapTo, isFocusMode]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Tham chiếu ổn định — arrow inline trong `renderItem` làm FlatList dựng lại toàn bộ
  // item mỗi lần component re-render (sheet re-render liên tục khi kéo).
  const keyExtractor = useCallback((item: CitizenMapPin) => item.id, []);
  const renderCard = useCallback(
    ({ item }: { item: CitizenMapPin }) => (
      <MapReportListCard pin={item} onPress={onOpenDetail} />
    ),
    [onOpenDetail],
  );

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

  /**
   * Sheet cao cố định `FULL_HEIGHT` rồi trượt xuống bằng `translateY` — animate `height`
   * bắt RN tính lại layout mỗi frame trên JS thread nên kéo bị giật; `transform` chỉ
   * compose trên UI thread, giữ được 60fps.
   */
  const animatedSheetStyle = useAnimatedStyle(() => {
    // Focus: không cộng bottomInset — tránh khoảng trắng dưới card
    const visibleHeight = sheetHeight.value + (isFocusMode.value ? 0 : bottomInset);
    return {
      transform: [{ translateY: SHEET_CONTAINER_HEIGHT - visibleHeight }],
    };
  });

  return (
    <Animated.View
      style={[animatedSheetStyle, { height: SHEET_CONTAINER_HEIGHT }]}
      className="absolute bottom-0 left-0 right-0 z-10 overflow-hidden rounded-t-3xl border border-border bg-white shadow-lg shadow-black/10"
    >
      {focusedPin ? (
        <View onLayout={onFocusContentLayout} collapsable={false}>
          <GestureDetector gesture={panGesture}>
            <View className="items-center pb-1 pt-2">
              <View className="mb-1 h-1.5 w-10 rounded-full bg-border" />
            </View>
          </GestureDetector>
          {/* -mb-4 hủy margin dưới của card để sheet khít sát mép dưới */}
          <View className="-mb-4">
            <MapReportListCard pin={focusedPin} onPress={onOpenDetail} />
          </View>
        </View>
      ) : (
        <>
          <GestureDetector gesture={panGesture}>
            <View className="items-center pb-3 pt-2">
              <View className="mb-2 h-1.5 w-10 rounded-full bg-border" />
              <Text className="text-sm font-semibold text-textSecondary">
                {isLoading
                  ? 'Đang tải…'
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
                keyExtractor={keyExtractor}
                renderItem={renderCard}
                contentContainerStyle={{
                  paddingTop: 4,
                  paddingBottom: bottomInset + 24,
                }}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                // Card có ảnh lớn — giới hạn số item dựng mỗi batch để không nghẽn
                // JS thread giữa lúc đang kéo sheet.
                removeClippedSubviews
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={7}
              />
            </GestureDetector>
          )}
        </>
      )}
    </Animated.View>
  );
}

export { SNAP_HEIGHTS };
export const REPORTS_SHEET_PEEK_HEIGHT = PEEK_HEIGHT;
