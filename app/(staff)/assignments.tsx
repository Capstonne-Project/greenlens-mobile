import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useMyAssignments } from '@/hooks/useMyAssignments';
import { colors } from '@/theme/colors';
import type { AssignmentItem, AssignmentStatus } from '@/types/cleanup-assignment.types';

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

  return (
    <Animated.View style={animStyle} className="mx-4 mb-3">
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={() => onPress(item)}
        className="flex-row rounded-2xl bg-white p-3 shadow-sm"
        style={{ elevation: 2 }}
      >
        {/* Thumbnail */}
        <View
          className="mr-3 h-16 w-16 items-center justify-center rounded-xl"
          style={{ backgroundColor: thumbBg }}
        >
          {item.firstImageUrl ? (
            // eslint-disable-next-line @typescript-eslint/no-require-imports
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
          {/* Code + severity badge */}
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-xs text-textSecondary">{item.reportCode}</Text>
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: severity.bg }}>
              <Text className="text-[11px] font-semibold" style={{ color: severity.color }}>
                {severity.label}
              </Text>
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
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1 px-4 py-2"
      style={{ borderBottomWidth: 2, borderBottomColor: isActive ? colors.primary : 'transparent' }}
    >
      <Text
        className="text-sm font-semibold"
        style={{ color: isActive ? colors.primary : colors.textSecondary }}
      >
        {tab.label}
      </Text>
      {tab.count !== undefined && tab.count > 0 && (
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
      )}
    </Pressable>
  );
}

// ─── Sort label ───────────────────────────────────────────────────────────────

function SortLabel({ count, label }: { count: number; label: string }) {
  return (
    <View className="mx-4 mb-3 flex-row items-center gap-1">
      <Text className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
        Sắp xếp: {label} · {count} task
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<AssignmentStatus | undefined>('Assigned');

  // Fetch tất cả để đếm count cho từng tab
  const { items: allItems } = useMyAssignments({ pageSize: 200 });
  const { items, isLoading, refetch } = useMyAssignments({
    assignmentStatus: activeFilter,
    pageSize: 50,
  });

  const countOf = useCallback(
    (status: AssignmentStatus) => allItems.filter((i) => i.assignmentStatus === status).length,
    [allItems],
  );

  const FILTER_TABS: FilterTab[] = [
    { label: 'Mới giao',   value: 'Assigned',   count: countOf('Assigned') },
    { label: 'Chờ nhận',   value: undefined,    count: 0 },
    { label: 'Đang xử lý', value: 'InProgress', count: countOf('InProgress') },
    { label: 'Sắp hết SLA', value: undefined,   count: 0 },
  ];

  const handleCardPress = useCallback((item: AssignmentItem) => {
    router.push(`/assignment/${item.reportId}` as never);
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
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <Text className="text-2xl font-bold text-primary">GreenLens</Text>
        <View className="flex-row items-center gap-3">
          <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-surface">
            <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-surface">
            <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        className="border-b border-border"
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

      {/* Sub-filter chips row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        style={{ flexGrow: 0 }}
      >
        {['Severity', 'Loại', 'Khu vực', 'SLA'].map((label) => (
          <Pressable
            key={label}
            className="flex-row items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5"
          >
            <Text className="text-xs font-medium text-textPrimary">{label}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort label */}
      {!isLoading && items.length > 0 && (
        <SortLabel count={items.length} label={`GẤP NHẤT · ${activeTabLabel.toUpperCase()}`} />
      )}

      {/* List */}
      {isLoading && items.length === 0 ? (
        <View>{[0, 1, 2, 3].map((n) => <AssignmentCardSkeleton key={n} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          contentContainerStyle={{ paddingTop: 2, paddingBottom: 24, flexGrow: 1 }}
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
