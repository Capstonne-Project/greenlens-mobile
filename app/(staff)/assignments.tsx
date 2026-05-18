import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useMyAssignments } from '@/hooks/useMyAssignments';
import { colors } from '@/theme/colors';
import type { AssignmentItem, AssignmentStatus } from '@/types/cleanup-assignment.types';

// --- Filter tabs ---
type FilterTab = { label: string; value: AssignmentStatus | undefined };

const FILTER_TABS: FilterTab[] = [
  { label: 'Tất cả',     value: undefined },
  { label: 'Mới giao',   value: 'Assigned' },
  { label: 'Đang xử lý', value: 'InProgress' },
  { label: 'Hoàn thành', value: 'Completed' },
];

// --- Severity badge ---
const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Low:      { label: 'Thấp',    color: '#166534', bg: '#DCFCE7' },
  Medium:   { label: 'Trung bình', color: '#92400E', bg: '#FEF3C7' },
  High:     { label: 'Cao',     color: '#9A3412', bg: '#FFEDD5' },
  Critical: { label: 'Nghiêm trọng', color: '#991B1B', bg: '#FEE2E2' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Assigned:   { label: 'Mới giao',   color: '#1E40AF', bg: '#DBEAFE' },
  InProgress: { label: 'Đang xử lý', color: '#065F46', bg: '#D1FAE5' },
  Completed:  { label: 'Hoàn thành', color: '#374151', bg: '#F3F4F6' },
  Declined:   { label: 'Từ chối',    color: '#991B1B', bg: '#FEE2E2' },
};

// --- Assignment card ---
interface AssignmentCardProps {
  item: AssignmentItem;
  index: number;
  onPress: (item: AssignmentItem) => void;
}

const AssignmentCard = React.memo(function AssignmentCard({ item, onPress }: AssignmentCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const severity = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.Medium;
  const status   = STATUS_CONFIG[item.assignmentStatus] ?? STATUS_CONFIG.Assigned;

  const assignedDate = item.assignedAt
    ? new Date(item.assignedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  const isSlaWarning = item.slaResolveDueAt
    ? new Date(item.slaResolveDueAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
    : false;

  return (
    <Animated.View style={animStyle} className="mx-4 mb-3">
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 16, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 280 }); }}
        onPress={() => onPress(item)}
        className="rounded-2xl bg-white p-4 shadow-sm"
        style={{ elevation: 2 }}
      >
        {/* Header row */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-semibold text-textSecondary">{item.reportCode}</Text>
          <View className="flex-row items-center gap-2">
            {isSlaWarning && (
              <View className="flex-row items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5">
                <Ionicons name="warning-outline" size={11} color="#F97316" />
                <Text className="text-[10px] font-semibold" style={{ color: '#F97316' }}>SLA</Text>
              </View>
            )}
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: status.bg }}>
              <Text className="text-[11px] font-semibold" style={{ color: status.color }}>{status.label}</Text>
            </View>
          </View>
        </View>

        {/* Category + severity */}
        <View className="mb-2 flex-row items-center gap-2">
          <Text className="flex-1 text-base font-semibold text-textPrimary" numberOfLines={1}>
            {item.categoryName}
          </Text>
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: severity.bg }}>
            <Text className="text-[11px] font-semibold" style={{ color: severity.color }}>{severity.label}</Text>
          </View>
        </View>

        {/* Address */}
        <View className="mb-2 flex-row items-start gap-1.5">
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-xs text-textSecondary" numberOfLines={2}>{item.address}</Text>
        </View>

        {/* Note */}
        {!!item.note && (
          <View className="mb-2 flex-row items-start gap-1.5">
            <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-xs text-textSecondary" numberOfLines={1}>{item.note}</Text>
          </View>
        )}

        {/* Footer */}
        <View className="mt-1 flex-row items-center justify-between border-t border-border pt-2">
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text className="text-xs text-textSecondary">Giao lúc {assignedDate}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

// --- Skeleton card ---
function AssignmentCardSkeleton() {
  return (
    <View className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm" style={{ elevation: 2 }}>
      <View className="mb-3 flex-row items-center justify-between">
        <View className="h-3 w-28 rounded bg-border" />
        <View className="h-5 w-20 rounded-full bg-border" />
      </View>
      <View className="mb-2 h-5 w-3/4 rounded bg-border" />
      <View className="mb-1 h-3 w-full rounded bg-surface" />
      <View className="h-3 w-2/3 rounded bg-surface" />
    </View>
  );
}

// --- Empty state ---
function EmptyState({ filter }: { filter: AssignmentStatus | undefined }) {
  const label = filter ? STATUS_CONFIG[filter]?.label ?? filter : 'nhiệm vụ';
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

// --- Main screen ---
export default function AssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<AssignmentStatus | undefined>(undefined);

  const { items, isLoading, refetch } = useMyAssignments({
    assignmentStatus: activeFilter,
    pageSize: 50,
  });

  const handleCardPress = useCallback((item: AssignmentItem) => {
    router.push(`/assignment/${item.reportId}` as never);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: AssignmentItem; index: number }) => (
      <AssignmentCard item={item} index={index} onPress={handleCardPress} />
    ),
    [handleCardPress],
  );

  const keyExtractor = useCallback((item: AssignmentItem) => item.assignmentId, []);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text className="flex-1 text-xl font-bold text-textPrimary">Nhiệm vụ của tôi</Text>
        {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Filter tabs */}
      <View className="mb-2">
        <FlatList
          data={FILTER_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          keyExtractor={(tab) => tab.label}
          renderItem={({ item: tab }) => {
            const isActive = activeFilter === tab.value;
            return (
              <Pressable
                onPress={() => setActiveFilter(tab.value)}
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: isActive ? colors.primary : colors.surface }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: isActive ? colors.white : colors.textSecondary }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List */}
      {isLoading && items.length === 0 ? (
        <View>
          {[0, 1, 2, 3].map((n) => <AssignmentCardSkeleton key={n} />)}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 24, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState filter={activeFilter} />}
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
