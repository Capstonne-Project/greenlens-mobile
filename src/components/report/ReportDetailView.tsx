import { ReportDetailBody, SEVERITY_CONFIG } from '@/components/report/ReportDetailBody';
import { Text } from '@/components/ui/text';
import { useReportComments } from '@/hooks/useReportComments';
import { colors } from '@/theme/colors';
import type {
  RateReportDto,
  ReportDetail,
  ReportDetailSource,
  ReportHistoryItem,
  ReportMediaItem,
} from '@/types/report-detail.types';
import { formatRelativeTime } from '@/utils/formatters';
import { splitReportMedia } from '@/utils/report-media';
import { getReportFooterActions, getReportStatusMeta } from '@/utils/report-status';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  View,
  type ViewToken,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReportDetailViewProps {
  detail: ReportDetail | null;
  history: ReportHistoryItem[];
  isLoading: boolean;
  isActionBusy: boolean;
  errorMessage: string | null;
  source: ReportDetailSource;
  currentUserId?: string | null;
  onBack: () => void;
  onRetry: () => void;
  onClose: () => Promise<void>;
  onReopen: () => Promise<void>;
  onRate?: (dto: RateReportDto) => Promise<void>;
  /** Bật block bình luận / phản hồi (citizen + đội ngũ) */
  enableComments?: boolean;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

/** Sheet peek (~28%) — summary luôn thấy; expanded 80% sticky rồi scroll nội dung */
const PEEK_HEIGHT = Math.round(SCREEN_HEIGHT * 0.28);
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.8);

type SheetSnap = 'peek' | 'expanded';

const SNAP_HEIGHTS: Record<SheetSnap, number> = {
  peek: PEEK_HEIGHT,
  expanded: EXPANDED_HEIGHT,
};

const SPRING = { damping: 22, stiffness: 240, mass: 0.85 };

interface AnimatedButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: object;
  className?: string;
  children: ReactNode;
}

function AnimatedButton({ onPress, disabled, style, className, children }: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animStyle, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.96);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        className={className}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function DetailSkeleton() {
  return (
    <View className="flex-1 bg-black">
      <View className="flex-1 bg-neutral-800" />
      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white px-4 pt-3"
        style={{ height: PEEK_HEIGHT }}
      >
        <View className="mb-3 items-center">
          <View className="h-1.5 w-10 rounded-full bg-border" />
        </View>
        <View className="mb-2 h-3 w-24 rounded bg-border" />
        <View className="mb-2 h-7 w-3/4 rounded bg-border" />
        <View className="h-4 w-1/2 rounded bg-surface" />
      </View>
    </View>
  );
}

interface GalleryProps {
  media: ReportMediaItem[];
  severityBg: string;
  severityColor: string;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onReachLastImage: () => void;
  scrollEnabled: boolean;
}

function ReportDetailGallery({
  media,
  severityBg,
  severityColor,
  activeIndex,
  onIndexChange,
  onReachLastImage,
  scrollEnabled,
}: GalleryProps) {
  const lastIndexRef = useRef(0);
  const items = media.length > 0 ? media : [{ url: '', id: 'placeholder' }];
  const lastItemIndex = items.length - 1;

  const onIndexChangeRef = useRef(onIndexChange);
  const onReachLastImageRef = useRef(onReachLastImage);
  onIndexChangeRef.current = onIndexChange;
  onReachLastImageRef.current = onReachLastImage;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const index = viewableItems[0]?.index;
    if (typeof index !== 'number') return;
    if (index !== lastIndexRef.current) {
      lastIndexRef.current = index;
      onIndexChangeRef.current(index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
    const clamped = Math.max(0, Math.min(lastItemIndex, index));
    if (clamped !== lastIndexRef.current) {
      lastIndexRef.current = clamped;
      onIndexChangeRef.current(clamped);
    }
    if (clamped === lastItemIndex && media.length > 0) {
      onReachLastImageRef.current();
    }
  };

  return (
    <View className="absolute inset-0 bg-black">
      <FlatList
        data={items}
        keyExtractor={(item, index) => item.id ?? `media-${item.url}-${index}`}
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled && items.length > 1}
        onMomentumScrollEnd={handleScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        renderItem={({ item }) =>
          item.url ? (
            <Image
              source={{ uri: item.url }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              className="items-center justify-center"
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: severityBg }}
            >
              <Ionicons name="image-outline" size={64} color={severityColor} />
              <Text className="mt-3 text-sm font-medium" style={{ color: severityColor }}>
                Chưa có ảnh hiện trường
              </Text>
            </View>
          )
        }
      />

      {media.length > 1 ? (
        <View
          pointerEvents="none"
          className="absolute right-4 items-center gap-1.5"
          style={{ top: SCREEN_HEIGHT * 0.35 }}
        >
          {media.map((_, index) => (
            <View
              key={`dot-${index}`}
              className="rounded-full"
              style={{
                width: activeIndex === index ? 7 : 5,
                height: activeIndex === index ? 7 : 5,
                backgroundColor: activeIndex === index ? colors.white : 'rgba(255,255,255,0.45)',
              }}
            />
          ))}
        </View>
      ) : null}

      {media.length > 0 ? (
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-4 rounded-full bg-black/45 px-2.5 py-1"
          style={{ marginBottom: PEEK_HEIGHT + 12 }}
        >
          <Text className="text-[11px] font-semibold text-white">
            {activeIndex + 1}/{media.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ReportDetailView({
  detail,
  history,
  isLoading,
  isActionBusy,
  errorMessage,
  source,
  currentUserId,
  onBack,
  onRetry,
  onClose,
  onReopen,
  onRate,
  enableComments = true,
}: ReportDetailViewProps) {
  const insets = useSafeAreaInsets();
  const [heroIndex, setHeroIndex] = useState(0);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');
  const autoExpandedForIndex = useRef(-1);

  const sheetHeight = useSharedValue(SNAP_HEIGHTS.peek);
  const dragStartHeight = useSharedValue(SNAP_HEIGHTS.peek);
  const scrollY = useSharedValue(0);
  const isSheetDragging = useSharedValue(false);

  const isOwner = source === 'tab' || (detail?.reporterId != null && detail.reporterId === currentUserId);
  const footerActions = detail
    ? getReportFooterActions(detail.status, { isOwner, reopenedCount: detail.reopenedCount ?? 0 })
    : { showClose: false, showReopen: false };

  const statusMeta = detail ? getReportStatusMeta(detail.status) : null;
  const severity = SEVERITY_CONFIG[detail?.severity ?? 'Medium'] ?? SEVERITY_CONFIG.Medium;

  const {
    threads,
    isLoading: isCommentsLoading,
    isSubmitting: isCommentSubmitting,
    likingCommentId,
    errorMessage: commentsError,
    refetch: refetchComments,
    addComment,
    toggleLike,
  } = useReportComments(detail?.id, Boolean(enableComments && detail?.id));

  const showFooterBar =
    !isLoading &&
    detail &&
    (footerActions.showClose ||
      footerActions.showReopen ||
      (footerActions.infoMessage &&
        [
          'Closed',
          'ClosedNoViolation',
          'Submitted',
          'Verified',
          'Dispatched',
          'Assigned',
          'InProgress',
        ].includes(detail.status)));

  const footerHeight = showFooterBar ? 64 + insets.bottom : insets.bottom + 8;

  const citizenMedia = useMemo(
    () => splitReportMedia(detail?.media).citizen,
    [detail?.media],
  );

  const snapTo = useCallback(
    (point: SheetSnap) => {
      sheetHeight.value = withSpring(SNAP_HEIGHTS[point], SPRING);
      setSheetSnap(point);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [sheetHeight],
  );

  const expandSheet = useCallback(() => {
    sheetHeight.value = withSpring(SNAP_HEIGHTS.expanded, SPRING);
    setSheetSnap('expanded');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [sheetHeight]);

  const handleReachLastImage = useCallback(() => {
    const mediaCount = citizenMedia.length;
    if (mediaCount <= 1) return;
    const last = mediaCount - 1;
    if (autoExpandedForIndex.current === last) return;
    autoExpandedForIndex.current = last;
    expandSheet();
  }, [citizenMedia.length, expandSheet]);

  const handleIndexChange = useCallback(
    (index: number) => {
      setHeroIndex(index);
      if (index < citizenMedia.length - 1) {
        autoExpandedForIndex.current = -1;
      }
    },
    [citizenMedia.length],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .onStart(() => {
          dragStartHeight.value = sheetHeight.value;
          isSheetDragging.value = false;
        })
        .onUpdate((event) => {
          const belowExpanded = sheetHeight.value < SNAP_HEIGHTS.expanded - 1;
          const atTop = scrollY.value <= 1;
          const draggingDown = event.translationY > 0;

          if (!isSheetDragging.value) {
            if (belowExpanded || (atTop && draggingDown)) {
              isSheetDragging.value = true;
            } else {
              return;
            }
          }

          const next = dragStartHeight.value - event.translationY;
          sheetHeight.value = Math.max(SNAP_HEIGHTS.peek, Math.min(SNAP_HEIGHTS.expanded, next));
        })
        .onEnd((event) => {
          if (!isSheetDragging.value) return;
          isSheetDragging.value = false;

          const current = sheetHeight.value;
          const velocity = event.velocityY;
          let target: SheetSnap;

          if (velocity < -650) {
            target = 'expanded';
          } else if (velocity > 650) {
            target = 'peek';
          } else {
            const mid = (SNAP_HEIGHTS.peek + SNAP_HEIGHTS.expanded) / 2;
            target = current >= mid ? 'expanded' : 'peek';
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
    height: sheetHeight.value,
  }));

  const overlayFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      sheetHeight.value,
      [SNAP_HEIGHTS.peek, SNAP_HEIGHTS.expanded],
      [0, 0.35],
      Extrapolation.CLAMP,
    ),
  }));

  const handleClosePress = () => {
    Alert.alert('Xác nhận đóng', 'Bạn xác nhận hài lòng với kết quả xử lý?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đóng báo cáo', onPress: () => void onClose() },
    ]);
  };

  const handleReopenPress = () => {
    const remaining = Math.max(0, 2 - (detail?.reopenedCount ?? 0));
    Alert.alert('Mở lại báo cáo', `Báo cáo sẽ được gửi xử lý lại. Còn ${remaining} lần mở lại.`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Mở lại', onPress: () => void onReopen() },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black">
        <StatusBar style="light" />
        <DetailSkeleton />
        <View className="absolute left-4 z-20" style={{ top: insets.top + 8 }}>
          <Pressable
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/40"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  if (errorMessage && !detail) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <StatusBar style="dark" />
        <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
        <Text className="mt-3 text-base font-semibold text-textPrimary">{errorMessage}</Text>
        <Pressable
          onPress={onRetry}
          className="mt-4 rounded-xl px-6 py-2.5"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="font-semibold text-white">Thử lại</Text>
        </Pressable>
        <Pressable onPress={onBack} className="mt-3 px-4 py-2">
          <Text className="text-sm font-medium text-textSecondary">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  if (!detail) return null;

  const scrollEnabledInSheet = sheetSnap === 'expanded';

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <ReportDetailGallery
        media={citizenMedia}
        severityBg={severity.bg}
        severityColor={severity.color}
        activeIndex={heroIndex}
        onIndexChange={handleIndexChange}
        onReachLastImage={handleReachLastImage}
        scrollEnabled={sheetSnap === 'peek'}
      />

      {/* Dim overlay when sheet expands */}
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0 bg-black"
        style={overlayFadeStyle}
      />

      {/* Floating chrome */}
      <View
        className="absolute left-0 right-0 z-20 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full bg-black/40"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>

        {statusMeta ? (
          <View
            className="max-w-[62%] rounded-full px-3 py-1.5"
            style={{ backgroundColor: statusMeta.bgColor }}
          >
            <Text
              className="text-[11px] font-semibold"
              style={{ color: statusMeta.textColor }}
              numberOfLines={2}
            >
              {statusMeta.label}
            </Text>
          </View>
        ) : (
          <View />
        )}

        <View className="h-10 w-10" />
      </View>

      {/* Bottom detail sheet */}
      <Animated.View
        style={[
          animatedSheetStyle,
          {
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: -6 },
            elevation: 18,
          },
        ]}
        className="absolute bottom-0 left-0 right-0 z-30 overflow-hidden rounded-t-[28px] bg-white"
      >
        <GestureDetector gesture={panGesture}>
          <View className="px-4 pb-1 pt-2">
            <View className="mb-3 items-center">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>

            <View className="mb-1 flex-row flex-wrap items-center gap-2">
              <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: severity.bg }}>
                <Text className="text-[11px] font-bold" style={{ color: severity.color }}>
                  {severity.label}
                </Text>
              </View>
              <Text className="text-xs text-textSecondary">{formatRelativeTime(detail.createdAt)}</Text>
            </View>

            <Text className="text-[22px] font-bold leading-7 text-textPrimary" numberOfLines={2}>
              {detail.categoryName}
            </Text>

            {detail.address ? (
              <View className="mt-1.5 flex-row items-start gap-1">
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={colors.textSecondary}
                  style={{ marginTop: 2 }}
                />
                <Text className="flex-1 text-sm leading-5 text-textSecondary" numberOfLines={2}>
                  {detail.address}
                </Text>
              </View>
            ) : null}

            {sheetSnap === 'peek' ? (
              <Pressable onPress={expandSheet} className="mt-3 flex-row items-center gap-1">
                <Text className="text-sm font-semibold text-primary">Xem chi tiết</Text>
                <Ionicons name="chevron-up" size={16} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        </GestureDetector>

        <GestureDetector gesture={composedGesture}>
          <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            scrollEnabled={scrollEnabledInSheet}
            showsVerticalScrollIndicator={false}
            bounces={scrollEnabledInSheet}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: footerHeight + 24,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <ReportDetailBody
              detail={detail}
              history={history}
              isOwner={isOwner}
              source={source}
              isActionBusy={isActionBusy}
              errorMessage={errorMessage}
              onRate={onRate}
              enableComments={enableComments}
              comments={{
                threads,
                isLoading: isCommentsLoading,
                isSubmitting: isCommentSubmitting,
                likingCommentId,
                errorMessage: commentsError,
                onSubmit: addComment,
                onToggleLike: toggleLike,
                onRetry: () => void refetchComments(),
              }}
            />
          </Animated.ScrollView>
        </GestureDetector>

        {showFooterBar ? (
          <View
            className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 10 }}
          >
            {footerActions.showClose || footerActions.showReopen ? (
              <View className="flex-row gap-3">
                {footerActions.showReopen ? (
                  <AnimatedButton
                    onPress={handleReopenPress}
                    disabled={isActionBusy}
                    className="h-12 items-center justify-center rounded-xl border-2 border-primary"
                  >
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="refresh" size={18} color={colors.primary} />
                      <Text className="font-bold text-primary">Mở lại</Text>
                    </View>
                  </AnimatedButton>
                ) : null}
                {footerActions.showClose ? (
                  <AnimatedButton
                    onPress={handleClosePress}
                    disabled={isActionBusy}
                    className="h-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {isActionBusy ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="checkmark-done" size={18} color="#fff" />
                        <Text className="font-bold text-white">Đóng báo cáo</Text>
                      </View>
                    )}
                  </AnimatedButton>
                ) : null}
              </View>
            ) : footerActions.infoMessage ? (
              <View
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
                style={{
                  backgroundColor:
                    detail.status === 'Closed' || detail.status === 'ClosedNoViolation'
                      ? '#ECFDF5'
                      : colors.surface,
                }}
              >
                <Ionicons
                  name={
                    detail.status === 'Closed' || detail.status === 'ClosedNoViolation'
                      ? 'checkmark-circle'
                      : 'time-outline'
                  }
                  size={20}
                  color={
                    detail.status === 'Closed' || detail.status === 'ClosedNoViolation'
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  className="font-semibold"
                  style={{
                    color:
                      detail.status === 'Closed' || detail.status === 'ClosedNoViolation'
                        ? colors.primary
                        : colors.textSecondary,
                  }}
                >
                  {footerActions.infoMessage}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}
