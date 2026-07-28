import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssignmentActionButton } from '@/components/assignment/AssignmentActionButton';
import { Text } from '@/components/ui/text';
import { useMyAssignments } from '@/hooks/useMyAssignments';
import { communityCleanupService } from '@/services/communityCleanup.service';
import { useFieldWorkerTaskStore } from '@/stores/fieldWorkerTask.store';
import { colors } from '@/theme/colors';
import type { AssignmentItem, AssignmentStatus } from '@/types/cleanup-assignment.types';
import type { CommunityCleanupListItem, CommunityCleanupStatus } from '@/types/community-cleanup.types';
import { getTaskRouteParams } from '@/utils/field-worker-task';

// ─── Configs ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Low:      { label: 'Thấp',         color: '#166534', bg: '#DCFCE7' },
  Medium:   { label: 'Trung bình',   color: '#92400E', bg: '#FEF3C7' },
  High:     { label: 'Cao',          color: '#9A3412', bg: '#FFEDD5' },
  Critical: { label: 'Nghiêm trọng', color: '#991B1B', bg: '#FEE2E2' },
};

// Màu ảnh thumbnail placeholder theo severity
const SEVERITY_THUMB_BG: Record<string, string> = {
  Low:      '#DCFCE7',
  Medium:   '#FEF3C7',
  High:     '#FFEDD5',
  Critical: '#FEE2E2',
};

const ASSIGNMENT_STATUS_CHIP: Record<
  AssignmentStatus,
  { label: string; color: string; bg: string } | null
> = {
  Assigned:   { label: 'Chờ nhận',   color: '#1E40AF', bg: '#DBEAFE' },
  InProgress: { label: 'Đang làm',   color: '#92400E', bg: '#FEF3C7' },
  Completed:  { label: 'Xong',       color: '#065F46', bg: '#D1FAE5' },
  Declined:   { label: 'Từ chối',    color: '#991B1B', bg: '#FEE2E2' },
  Escalated:  { label: 'Đã báo vượt khả năng', color: '#7C3AED', bg: '#EDE9FE' },
};

type FilterTab = { label: string; value: AssignmentStatus | undefined; count?: number };

// ─── Community-led task (Leader) merge ────────────────────────────────────────

const COMMUNITY_STATUS_CHIP: Record<CommunityCleanupStatus, { label: string; color: string; bg: string }> = {
  OpenForJoin: { label: 'Đang mở đăng ký', color: '#065F46', bg: '#D1FAE5' },
  JoinClosed: { label: 'Đã đóng đăng ký', color: '#92400E', bg: '#FEF3C7' },
  InProgress: { label: 'Đang dọn dẹp', color: '#1E40AF', bg: '#DBEAFE' },
  PendingVerification: { label: 'Chờ LEO duyệt', color: '#6D28D9', bg: '#EDE9FE' },
  Completed: { label: 'Hoàn thành', color: '#374151', bg: '#F3F4F6' },
  Cancelled: { label: 'Đã hủy', color: '#991B1B', bg: '#FEE2E2' },
};

/** Gộp trạng thái chương trình cộng đồng về bucket filter chung của "Nhiệm vụ" — để 1 tab lọc cả 2 loại. */
function communityStatusToFilterBucket(status: CommunityCleanupStatus): AssignmentStatus {
  switch (status) {
    case 'OpenForJoin':
    case 'JoinClosed':
      return 'Assigned';
    case 'InProgress':
    case 'PendingVerification':
      return 'InProgress';
    case 'Completed':
      return 'Completed';
    case 'Cancelled':
      return 'Declined';
    default:
      return 'Assigned';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSlaRemaining(slaStr: string): { text: string; overdue: boolean } {
  const diff = new Date(slaStr).getTime() - Date.now();
  if (diff <= 0) {
    const over = Math.abs(diff);
    const h = Math.floor(over / 3_600_000);
    const m = Math.floor((over % 3_600_000) / 60_000);
    return { text: `Quá ${h > 0 ? `${h}h ` : ''}${m}m`, overdue: true };
  }
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return { text: `${h}h ${m}m`, overdue: false };
}

// ─── Cinema poster card sizing ────────────────────────────────────────────────

const POSTER_WIDTH = 152;
const POSTER_HEIGHT = 216;

// ─── Assignment poster card ("Công việc") ──────────────────────────────────────

interface AssignmentCardProps {
  item: AssignmentItem;
  onPress: (item: AssignmentItem) => void;
}

const AssignmentCard = React.memo(function AssignmentCard({ item, onPress }: AssignmentCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const severity = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.Medium;
  const thumbBg = SEVERITY_THUMB_BG[item.severity] ?? '#F7F8FA';
  const statusChip = ASSIGNMENT_STATUS_CHIP[item.assignmentStatus];
  const sla = item.slaResolveDueAt ? formatSlaRemaining(item.slaResolveDueAt) : null;

  return (
    <Animated.View style={[animStyle, { width: POSTER_WIDTH }]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={() => onPress(item)}
        className="overflow-hidden rounded-2xl bg-white shadow-sm"
        style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT, elevation: 3 }}
      >
        {item.firstImageUrl ? (
          <Animated.Image
            source={{ uri: item.firstImageUrl }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
          />
        ) : (
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: thumbBg }}
          >
            <Ionicons name="image-outline" size={36} color={severity.color} />
          </View>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.82)']}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' }}
        />

        <View className="absolute left-2 right-2 top-2 flex-row items-center justify-between gap-1">
          {statusChip ? (
            <View className="shrink rounded-full px-2 py-0.5" style={{ backgroundColor: statusChip.bg }}>
              <Text className="text-[10px] font-bold" style={{ color: statusChip.color }} numberOfLines={1}>
                {statusChip.label}
              </Text>
            </View>
          ) : <View />}
          <View className="shrink rounded-full px-2 py-0.5" style={{ backgroundColor: severity.bg }}>
            <Text className="text-[10px] font-bold" style={{ color: severity.color }} numberOfLines={1}>
              {severity.label}
            </Text>
          </View>
        </View>

        <View className="absolute bottom-0 left-0 right-0 p-2.5">
          <Text className="text-[13px] font-bold text-white" numberOfLines={2}>
            {item.categoryName}
          </Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.85)" />
            <Text
              className="flex-1 text-[10px]"
              style={{ color: 'rgba(255,255,255,0.85)' }}
              numberOfLines={1}
            >
              {item.address}
            </Text>
          </View>
          <View className="mt-1.5 flex-row items-center gap-1">
            <Text
              className="flex-1 text-[10px]"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              numberOfLines={1}
            >
              {item.reportCode}
            </Text>
            {sla ? (
              <View className="flex-row shrink-0 items-center gap-0.5">
                <Ionicons name="time" size={11} color={sla.overdue ? '#FCA5A5' : 'rgba(255,255,255,0.85)'} />
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: sla.overdue ? '#FCA5A5' : '#fff' }}
                >
                  {sla.text}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Community-led poster card ("Cộng đồng") ───────────────────────────────────

interface CommunityLedCardProps {
  item: CommunityCleanupListItem;
  onPress: (item: CommunityCleanupListItem) => void;
}

const CommunityLedCard = React.memo(function CommunityLedCard({ item, onPress }: CommunityLedCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const statusChip = COMMUNITY_STATUS_CHIP[item.status] ?? COMMUNITY_STATUS_CHIP.OpenForJoin;

  return (
    <Animated.View style={[animStyle, { width: POSTER_WIDTH }]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={() => onPress(item)}
        className="overflow-hidden rounded-2xl bg-white shadow-sm"
        style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT, elevation: 3, borderWidth: 1, borderColor: '#111827' }}
      >
        {item.thumbnailUrl ? (
          <Animated.Image
            source={{ uri: item.thumbnailUrl }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
          />
        ) : (
          <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
            <Ionicons name="people-outline" size={36} color="#111827" />
          </View>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.82)']}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' }}
        />

        <View className="absolute left-2 right-2 top-2 flex-row items-center justify-between gap-1">
          <View
            className="flex-row shrink items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: '#111827' }}
          >
            <Ionicons name="people" size={10} color="#fff" />
            <Text className="text-[10px] font-bold text-white" numberOfLines={1}>Cộng đồng</Text>
          </View>
          <View className="shrink rounded-full px-2 py-0.5" style={{ backgroundColor: statusChip.bg }}>
            <Text className="text-[10px] font-bold" style={{ color: statusChip.color }} numberOfLines={1}>
              {statusChip.label}
            </Text>
          </View>
        </View>

        <View className="absolute bottom-0 left-0 right-0 p-2.5">
          <Text className="text-[13px] font-bold text-white" numberOfLines={2}>
            {item.title}
          </Text>
          <View className="mt-1.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-0.5">
              <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.85)" />
              <Text className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {item.participantCount}/{item.maxParticipants}
              </Text>
            </View>
            <View className="flex-row items-center gap-0.5">
              <Ionicons name="trending-up-outline" size={11} color="#fff" />
              <Text className="text-[10px] font-bold text-white">{item.progressPercent}%</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AssignmentCardSkeleton() {
  return (
    <View
      className="overflow-hidden rounded-2xl bg-surface"
      style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT }}
    />
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-16">
      <Ionicons name="checkmark-circle-outline" size={56} color={colors.textDisabled} />
      <Text className="mt-3 text-base font-semibold text-textPrimary">Không có {label}</Text>
      <Text className="mt-1 text-center text-sm text-textSecondary">
        Không tìm thấy nhiệm vụ nào trong danh mục này.
      </Text>
    </View>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

interface FilterChipProps {
  tab: FilterTab;
  isActive: boolean;
  onPress: () => void;
}

function FilterChip({ tab, isActive, onPress }: FilterChipProps) {
  const underline = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    underline.value = withTiming(isActive ? 1 : 0, { duration: 220 });
  }, [isActive, underline]);

  const underlineStyle = useAnimatedStyle(() => ({
    opacity: underline.value,
    transform: [{ scaleX: underline.value }],
  }));

  return (
    <Pressable onPress={onPress} className="mr-6 items-center pb-2.5 pt-1">
      <View className="flex-row items-center gap-1.5">
        <Text
          className="text-sm font-semibold"
          style={{ color: isActive ? colors.textPrimary : colors.textSecondary }}
        >
          {tab.label}
        </Text>
        {tab.count !== undefined && tab.count > 0 ? (
          <View
            className="h-4 min-w-4 items-center justify-center rounded-full px-1"
            style={{ backgroundColor: isActive ? colors.primary : colors.border }}
          >
            <Text
              className="text-[10px] font-bold"
              style={{ color: isActive ? colors.white : colors.textSecondary }}
            >
              {tab.count}
            </Text>
          </View>
        ) : null}
      </View>
      <Animated.View
        style={[
          underlineStyle,
          {
            position: 'absolute',
            bottom: 0,
            height: 2.5,
            width: '100%',
            backgroundColor: colors.primary,
          },
        ]}
      />
    </Pressable>
  );
}

// ─── Poster section (horizontal card row) ──────────────────────────────────────

function PosterLoadingFooter({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View className="items-center justify-center" style={{ width: 60, height: POSTER_HEIGHT }}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

function TaskPosterRow({
  data,
  onPress,
  onEndReached,
  isLoadingMore,
}: {
  data: AssignmentItem[];
  onPress: (item: AssignmentItem) => void;
  onEndReached: () => void;
  isLoadingMore: boolean;
}) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => item.assignmentId}
      renderItem={({ item }) => <AssignmentCard item={item} onPress={onPress} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      onEndReachedThreshold={0.4}
      onEndReached={onEndReached}
      ListFooterComponent={<PosterLoadingFooter visible={isLoadingMore} />}
    />
  );
}

function CommunityPosterRow({
  data,
  onPress,
  onEndReached,
  isLoadingMore,
}: {
  data: CommunityCleanupListItem[];
  onPress: (item: CommunityCleanupListItem) => void;
  onEndReached: () => void;
  isLoadingMore: boolean;
}) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CommunityLedCard item={item} onPress={onPress} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      onEndReachedThreshold={0.4}
      onEndReached={onEndReached}
      ListFooterComponent={<PosterLoadingFooter visible={isLoadingMore} />}
    />
  );
}

function PosterSectionSkeleton() {
  return (
    <FlatList
      horizontal
      data={[0, 1, 2]}
      keyExtractor={(n) => String(n)}
      renderItem={() => <AssignmentCardSkeleton />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    />
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<AssignmentStatus | undefined>(undefined);

  const POSTER_PAGE_SIZE = 5;

  // Fetch tất cả để đếm count cho từng tab
  const { items: allItems, refetch: refetchAll } = useMyAssignments({ pageSize: 100 });
  const {
    items,
    isLoading,
    isLoadingMore: isLoadingMoreTasks,
    hasMore: hasMoreTasks,
    errorMessage,
    refetch,
    loadMore: loadMoreTasks,
  } = useMyAssignments({
    assignmentStatus: activeFilter,
    pageSize: POSTER_PAGE_SIZE,
  });

  // Chương trình dọn cộng đồng mà user hiện tại là Leader — gộp chung 1 danh sách
  // "Nhiệm vụ" với assignment thường, đánh dấu bằng badge "Cộng đồng".
  const [ledItems, setLedItems] = useState<CommunityCleanupListItem[]>([]);
  const [ledPage, setLedPage] = useState(1);
  const [ledHasMore, setLedHasMore] = useState(false);
  const [isLoadingMoreLed, setIsLoadingMoreLed] = useState(false);

  const refetchLed = useCallback(async () => {
    try {
      const res = await communityCleanupService.getLedByMe({ page: 1, pageSize: POSTER_PAGE_SIZE });
      setLedItems(res.data.data.items.filter((i) => i.status !== 'Cancelled'));
      setLedPage(1);
      setLedHasMore(res.data.data.pagination.hasNext);
    } catch {
      // Không có quyền/không phải Leader nào — bỏ qua, danh sách assignment thường vẫn hoạt động.
      setLedItems([]);
      setLedHasMore(false);
    }
  }, []);

  const loadMoreLed = useCallback(async () => {
    if (isLoadingMoreLed || !ledHasMore) return;
    setIsLoadingMoreLed(true);
    try {
      const nextPage = ledPage + 1;
      const res = await communityCleanupService.getLedByMe({ page: nextPage, pageSize: POSTER_PAGE_SIZE });
      setLedItems((prev) => [...prev, ...res.data.data.items.filter((i) => i.status !== 'Cancelled')]);
      setLedPage(nextPage);
      setLedHasMore(res.data.data.pagination.hasNext);
    } catch {
      // Giữ nguyên danh sách hiện tại — không báo lỗi để không gián đoạn cuộn.
    } finally {
      setIsLoadingMoreLed(false);
    }
  }, [isLoadingMoreLed, ledHasMore, ledPage]);

  const countOf = useCallback(
    (status: AssignmentStatus) =>
      allItems.filter((i) => i.assignmentStatus === status).length +
      ledItems.filter((i) => communityStatusToFilterBucket(i.status) === status).length,
    [allItems, ledItems],
  );

  useFocusEffect(
    useCallback(() => {
      void Promise.all([refetchAll(), refetch(), refetchLed()]);
    }, [refetch, refetchAll, refetchLed]),
  );

  const FILTER_TABS: FilterTab[] = [
    { label: 'Tất cả',      value: undefined,    count: allItems.length + ledItems.length },
    { label: 'Chờ nhận',     value: 'Assigned',  count: countOf('Assigned') },
    { label: 'Đang xử lý',   value: 'InProgress', count: countOf('InProgress') },
    { label: 'Hoàn thành',  value: 'Completed',  count: countOf('Completed') },
  ];

  const handleCardPress = useCallback((item: AssignmentItem) => {
    const params = getTaskRouteParams(item);
    if (!params.id) return;
    useFieldWorkerTaskStore.getState().setPendingItem(item);
    router.push({
      pathname: '/assignment/[id]',
      params,
    } as never);
  }, []);

  const handleLedCardPress = useCallback((item: CommunityCleanupListItem) => {
    router.push({ pathname: '/community-lead/[id]', params: { id: item.id } } as never);
  }, []);

  const filteredCommunity = ledItems.filter(
    (i) => activeFilter === undefined || communityStatusToFilterBucket(i.status) === activeFilter,
  );
  const totalCount = items.length + filteredCommunity.length;
  const activeTabLabel = FILTER_TABS.find((t) => t.value === activeFilter)?.label ?? 'Tất cả';

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pb-10 pt-5">
        <Text className="text-2xl font-bold text-textPrimary">Nhiệm vụ</Text>
        <Text className="mt-1 text-sm text-textSecondary">
          Theo dõi công việc của đội theo từng trạng thái.
        </Text>
      </View>

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
        className="border-b border-border"
        style={{ flexGrow: 0, paddingTop: 20 }}
      >
        {FILTER_TABS.map((tab) => (
          <FilterChip
            key={tab.label}
            tab={tab}
            isActive={activeFilter === tab.value}
            onPress={() => setActiveFilter(tab.value)}
          />
        ))}
      </ScrollView>

      {/* Content */}
      {errorMessage && totalCount === 0 ? (
        <View className="flex-1 items-center justify-center pt-20 px-8">
          <Ionicons name="cloud-offline-outline" size={42} color={colors.textDisabled} />
          <Text className="mt-3 text-center text-sm leading-5 text-textSecondary">
            {errorMessage}
          </Text>
          <View className="mt-4 w-40">
            <AssignmentActionButton
              label="Thử lại"
              icon="refresh"
              onPress={() => void refetch()}
              variant="secondary"
              compact
            />
          </View>
        </View>
      ) : isLoading && totalCount === 0 ? (
        <View className="gap-6">
          <View>
            <Text className="mb-3 px-4 text-lg font-bold text-textPrimary">Công việc</Text>
            <PosterSectionSkeleton />
          </View>
          <View>
            <Text className="mb-3 px-4 text-lg font-bold text-textPrimary">Cộng đồng</Text>
            <PosterSectionSkeleton />
          </View>
        </View>
      ) : totalCount === 0 ? (
        <EmptyState label={activeTabLabel.toLowerCase()} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {items.length > 0 ? (
            <View className="mb-8">
              <Text className="mb-3 px-4 text-lg font-bold text-textPrimary">Công việc</Text>
              <TaskPosterRow
                data={items}
                onPress={handleCardPress}
                onEndReached={loadMoreTasks}
                isLoadingMore={isLoadingMoreTasks && hasMoreTasks}
              />
            </View>
          ) : null}

          {filteredCommunity.length > 0 ? (
            <View className="mb-6 pt-1">
              <Text className="mb-3 px-4 text-lg font-bold text-textPrimary">Cộng đồng</Text>
              <CommunityPosterRow
                data={filteredCommunity}
                onPress={handleLedCardPress}
                onEndReached={loadMoreLed}
                isLoadingMore={isLoadingMoreLed && ledHasMore}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
