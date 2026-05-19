import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useMyProgress } from '@/hooks/useMyProgress';
import { colors } from '@/theme/colors';
import type { AssignmentStatus, ProgressHistoryItem } from '@/types/cleanup-assignment.types';

// ─── Configs ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Assigned:   { label: 'Mới giao',   color: '#1E40AF', bg: '#DBEAFE' },
  InProgress: { label: 'Đang xử lý', color: '#065F46', bg: '#D1FAE5' },
  Completed:  { label: 'Hoàn thành', color: '#374151', bg: '#F3F4F6' },
  Declined:   { label: 'Từ chối',    color: '#991B1B', bg: '#FEE2E2' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function FilterChip({ label, isActive, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mr-2 rounded-full border px-4 py-2"
      style={{
        borderColor: isActive ? colors.primary : colors.border,
        backgroundColor: isActive ? '#ECFDF5' : colors.background,
      }}
    >
      <Text
        className="text-sm font-semibold"
        style={{ color: isActive ? colors.primary : colors.textSecondary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────

interface HistoryCardProps {
  item: ProgressHistoryItem;
}

function HistoryCard({ item }: HistoryCardProps) {
  const statusCfg = STATUS_CONFIG[item.assignmentStatus] ?? STATUS_CONFIG.Completed;

  return (
    <View
      className="mx-4 mb-3 rounded-2xl bg-white px-4 py-3.5"
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
    >
      {/* Code + status badge */}
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-textSecondary">{item.reportCode}</Text>
        <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: statusCfg.bg }}>
          <Text className="text-[11px] font-bold" style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View className="mb-2">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-xs text-textSecondary">Tiến độ</Text>
          <Text className="text-xs font-bold" style={{ color: colors.primary }}>
            {item.progressPercent}%
          </Text>
        </View>
        <View className="h-1.5 overflow-hidden rounded-full bg-surface">
          <View
            className="h-full rounded-full"
            style={{
              width: `${item.progressPercent}%` as `${number}%`,
              backgroundColor: item.progressPercent === 100 ? colors.primary : '#F97316',
            }}
          />
        </View>
        {item.progressNote && (
          <Text className="mt-1 text-xs text-textSecondary" numberOfLines={2}>
            {item.progressNote}
          </Text>
        )}
      </View>

      {/* Timeline row */}
      <View className="mt-1 flex-row flex-wrap gap-x-4 gap-y-1">
        <View className="flex-row items-center gap-1">
          <Ionicons name="enter-outline" size={12} color={colors.textSecondary} />
          <Text className="text-[11px] text-textSecondary">
            Giao: {formatDateTime(item.assignedAt)}
          </Text>
        </View>
        {item.completedAt && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="checkmark-circle-outline" size={12} color={colors.primary} />
            <Text className="text-[11px] text-textSecondary">
              Xong: {formatDateTime(item.completedAt)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function HistoryCardSkeleton() {
  return (
    <View
      className="mx-4 mb-3 rounded-2xl bg-white px-4 py-3.5"
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <View className="h-3 w-24 rounded bg-border" />
        <View className="h-4 w-16 rounded-full bg-surface" />
      </View>
      <View className="h-1.5 w-full rounded-full bg-border" />
      <View className="mt-3 h-3 w-3/4 rounded bg-surface" />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type FilterOption = { label: string; value: AssignmentStatus | undefined };

const FILTERS: FilterOption[] = [
  { label: 'Tất cả',      value: undefined },
  { label: 'Đang làm',    value: 'InProgress' },
  { label: 'Hoàn thành',  value: 'Completed' },
  { label: 'Từ chối',     value: 'Declined' },
];

export default function ProgressHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setFilter] = useState<AssignmentStatus | undefined>(undefined);

  const { items, totalCount, isLoading, errorMessage, refetch } = useMyProgress({
    assignmentStatus: activeFilter,
    pageSize: 50,
  });

  const keyExtractor = useCallback((item: ProgressHistoryItem) => item.assignmentId, []);
  const renderItem   = useCallback(
    ({ item }: { item: ProgressHistoryItem }) => <HistoryCard item={item} />,
    [],
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 pb-3 pt-3">
        <Pressable
          onPress={() => router.back()}
          className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-surface"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <View>
          <Text className="text-xl font-bold text-textPrimary">Lịch sử tiến độ</Text>
          {!isLoading && (
            <Text className="text-xs text-textSecondary">{totalCount} task</Text>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
        style={{ flexGrow: 0 }}
      >
        {FILTERS.map((f) => (
          <FilterChip
            key={f.label}
            label={f.label}
            isActive={activeFilter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View>{[0, 1, 2, 3].map((n) => <HistoryCardSkeleton key={n} />)}</View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={52} color={colors.error} />
          <Text className="mt-3 text-base font-semibold text-textPrimary">{errorMessage}</Text>
          <Pressable
            onPress={refetch}
            className="mt-4 rounded-xl px-6 py-2.5"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="font-semibold text-white">Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          contentContainerStyle={{ paddingTop: 2, paddingBottom: 32, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 px-6">
              <Ionicons name="document-text-outline" size={56} color={colors.textDisabled} />
              <Text className="mt-3 text-base font-semibold text-textPrimary">Chưa có lịch sử</Text>
              <Text className="mt-1 text-center text-sm text-textSecondary">
                Các task đã hoàn thành sẽ hiển thị ở đây.
              </Text>
            </View>
          }
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
