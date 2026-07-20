import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AssignmentActionButton } from '@/components/assignment/AssignmentActionButton';
import { Text } from '@/components/ui/text';
import { useMyAssignments } from '@/hooks/useMyAssignments';
import { useFieldWorkerTaskStore } from '@/stores/fieldWorkerTask.store';
import { colors } from '@/theme/colors';
import type { AssignmentItem, AssignmentStatus } from '@/types/cleanup-assignment.types';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

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

// ─── Assignment Card ──────────────────────────────────────────────────────────

interface AssignmentCardProps {
  item: AssignmentItem;
  onPress: (item: AssignmentItem) => void;
}

const AssignmentCard = React.memo(function AssignmentCard({ item, onPress }: AssignmentCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const severity = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.Medium;
  const thumbBg  = SEVERITY_THUMB_BG[item.severity] ?? '#F7F8FA';
  const statusChip = ASSIGNMENT_STATUS_CHIP[item.assignmentStatus];

  const assignedTime = item.assignedAt
    ? new Date(item.assignedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  const assignedDateLabel = item.assignedAt
    ? (() => {
        const d = new Date(item.assignedAt);
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();
        return isToday ? assignedTime : 'Hôm qua';
      })()
    : '';

  const sla = item.slaResolveDueAt ? formatSlaRemaining(item.slaResolveDueAt) : null;

  // Extract officer name từ note hoặc dùng placeholder
  const officerLabel = `Officer · ${assignedDateLabel}`;
  const nextStepHint =
    item.assignmentStatus === 'InProgress'
      ? 'Tiếp tục · ảnh hiện trạng / tiến độ'
      : item.assignmentStatus === 'Assigned'
        ? 'Chạm để xem & nhận nhiệm vụ'
        : null;

  return (
    <Animated.View style={animStyle} className="mx-4 mb-3">
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={() => onPress(item)}
        className="flex-row rounded-2xl bg-white p-3 shadow-sm"
        style={{
          elevation: 2,
          borderWidth: item.assignmentStatus === 'InProgress' ? 1 : 0,
          borderColor: item.assignmentStatus === 'InProgress' ? '#FDE68A' : 'transparent',
        }}
      >
        {/* Thumbnail */}
        <View
          className="mr-3 h-16 w-16 items-center justify-center rounded-xl"
          style={{ backgroundColor: thumbBg }}
        >
          {item.firstImageUrl ? (
            <Animated.Image
              source={{ uri: item.firstImageUrl }}
              className="h-16 w-16 rounded-xl"
              style={{ resizeMode: 'cover' }}
            />
          ) : (
            <Ionicons name="image-outline" size={28} color={severity.color} />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Code + badges */}
          <View className="mb-1 flex-row items-center justify-between gap-2">
            <Text className="text-xs text-textSecondary">{item.reportCode}</Text>
            <View className="flex-row items-center gap-1">
              {statusChip ? (
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: statusChip.bg }}>
                  <Text className="text-[11px] font-semibold" style={{ color: statusChip.color }}>
                    {statusChip.label}
                  </Text>
                </View>
              ) : null}
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: severity.bg }}>
                <Text className="text-[11px] font-semibold" style={{ color: severity.color }}>
                  {severity.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Category name */}
          <Text className="mb-1 text-[15px] font-semibold text-textPrimary" numberOfLines={1}>
            {item.categoryName}
          </Text>

          {/* Address */}
          <View className="mb-1.5 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text className="flex-1 text-xs text-textSecondary" numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          {nextStepHint ? (
            <Text
              className="mb-1 text-[11px] font-medium"
              style={{ color: item.assignmentStatus === 'InProgress' ? '#92400E' : colors.primary }}
              numberOfLines={1}
            >
              {nextStepHint}
            </Text>
          ) : null}

          {/* Footer: officer · time | SLA */}
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-textSecondary">{officerLabel}</Text>
            {sla ? (
              <View className="flex-row items-center gap-0.5">
                {sla.overdue && (
                  <Ionicons name="time" size={13} color={colors.error} />
                )}
                <Text
                  className="text-xs font-semibold"
                  style={{ color: sla.overdue ? colors.error : colors.textSecondary }}
                >
                  {sla.text}
                </Text>
              </View>
            ) : item.assignedAt ? (
              <View className="flex-row items-center gap-0.5">
                <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                <Text className="text-xs text-textSecondary">{formatTimeAgo(item.assignedAt)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AssignmentCardSkeleton() {
  return (
    <View className="mx-4 mb-3 flex-row rounded-2xl bg-white p-3 shadow-sm" style={{ elevation: 2 }}>
      <View className="mr-3 h-16 w-16 rounded-xl bg-surface" />
      <View className="flex-1 justify-between py-1">
        <View className="flex-row items-center justify-between">
          <View className="h-3 w-20 rounded bg-border" />
          <View className="h-4 w-16 rounded-full bg-border" />
        </View>
        <View className="h-4 w-3/4 rounded bg-border" />
        <View className="h-3 w-full rounded bg-surface" />
        <View className="h-3 w-1/2 rounded bg-surface" />
      </View>
    </View>
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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        }}
        className="flex-row items-center gap-1 rounded-full px-4 py-2"
        style={{ backgroundColor: isActive ? colors.textPrimary : colors.surface }}
      >
        <Text
          className="text-sm font-semibold"
          style={{ color: isActive ? colors.white : colors.textSecondary }}
        >
          {tab.label}
        </Text>
        {tab.count !== undefined && tab.count > 0 ? (
          <View
            className="h-5 min-w-5 items-center justify-center rounded-full px-1"
            style={{ backgroundColor: isActive ? colors.primary : colors.border }}
          >
            <Text
              className="text-[11px] font-bold"
              style={{ color: isActive ? colors.white : colors.textSecondary }}
            >
              {tab.count}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ─── Sort label ───────────────────────────────────────────────────────────────

function SortLabel({ count, label }: { count: number; label: string }) {
  return (
    <View className="mx-4 mb-3 flex-row items-center justify-between">
      <Text className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
        {count} nhiệm vụ
      </Text>
      <Text className="text-xs text-textSecondary">
        {label}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<AssignmentStatus | undefined>(undefined);

  // Fetch tất cả để đếm count cho từng tab
  const { items: allItems, refetch: refetchAll } = useMyAssignments({ pageSize: 100 });
  const { items, isLoading, errorMessage, refetch } = useMyAssignments({
    assignmentStatus: activeFilter,
    pageSize: 50,
  });

  const countOf = useCallback(
    (status: AssignmentStatus) => allItems.filter((i) => i.assignmentStatus === status).length,
    [allItems],
  );

  useFocusEffect(
    useCallback(() => {
      void Promise.all([refetchAll(), refetch()]);
    }, [refetch, refetchAll]),
  );

  const FILTER_TABS: FilterTab[] = [
    { label: 'Tất cả',      value: undefined,    count: allItems.length },
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

  const renderItem = useCallback(
    ({ item }: { item: AssignmentItem }) => (
      <AssignmentCard item={item} onPress={handleCardPress} />
    ),
    [handleCardPress],
  );

  const keyExtractor = useCallback((item: AssignmentItem) => item.assignmentId, []);

  const activeTabLabel = FILTER_TABS.find((t) => t.value === activeFilter)?.label ?? 'Tất cả';

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pb-4 pt-3">
        <Text className="text-2xl font-bold text-textPrimary">Nhiệm vụ</Text>
        <Text className="mt-1 text-sm text-textSecondary">
          Theo dõi công việc của đội theo từng trạng thái.
        </Text>
      </View>

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}
        style={{ flexGrow: 0 }}
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

      {/* Sort label */}
      {!isLoading && items.length > 0 && (
        <SortLabel count={items.length} label="Ưu tiên theo SLA" />
      )}

      {/* List */}
      {errorMessage && items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
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
      ) : isLoading && items.length === 0 ? (
        <View>{[0, 1, 2, 3].map((n) => <AssignmentCardSkeleton key={n} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          contentContainerStyle={{ paddingTop: 2, paddingBottom: insets.bottom + 100, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState label={activeTabLabel.toLowerCase()} />}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}
