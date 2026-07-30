import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  InspectionDossierCard,
  InspectionQueueSkeleton,
  InspectionStatusFilter,
  type InspectionFilterValue,
} from '@/components/inspection';
import { Text } from '@/components/ui/text';
import { useInspectionQueue } from '@/hooks/useInspectionQueue';
import { colors } from '@/theme/colors';
import type { InspectionQueueItem } from '@/types/inspection.types';

/** Hồ sơ chưa nhận / quá hạn cần nổi lên trước, sau đó theo SLA gần nhất. */
function sortByUrgency(items: InspectionQueueItem[]): InspectionQueueItem[] {
  const weight = (item: InspectionQueueItem) => {
    if (item.status === 'Overdue') return 0;
    if (item.status === 'Draft') return 1;
    if (item.status === 'InProgress') return 2;
    return 3;
  };
  return items.slice().sort((a, b) => {
    const byWeight = weight(a) - weight(b);
    if (byWeight !== 0) return byWeight;
    if (a.slaInspectionDueAt && b.slaInspectionDueAt) {
      return a.slaInspectionDueAt.localeCompare(b.slaInspectionDueAt);
    }
    if (a.slaInspectionDueAt) return -1;
    if (b.slaInspectionDueAt) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

interface HeaderStatProps {
  value: number;
  label: string;
  color?: string;
}

function HeaderStat({ value, label, color = colors.textPrimary }: HeaderStatProps) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-lg font-bold" style={{ color }}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[11px] text-textSecondary">{label}</Text>
    </View>
  );
}

export default function InspectorQueueScreen() {
  const insets = useSafeAreaInsets();
  const { status: statusParam } = useLocalSearchParams<{ status?: string }>();
  const [filter, setFilter] = useState<InspectionFilterValue>(null);

  // Deep-link từ tab Tổng quan: /(inspector)/queue?status=Overdue
  useEffect(() => {
    if (statusParam) setFilter(statusParam as InspectionFilterValue);
  }, [statusParam]);

  const { items, totalCount, isLoading, errorMessage, refetch } = useInspectionQueue({
    status: filter ?? undefined,
  });

  const sorted = useMemo(() => sortByUrgency(items), [items]);

  const overdueCount = useMemo(
    () => items.filter((item) => item.status === 'Overdue').length,
    [items],
  );
  const unclaimedCount = useMemo(
    () => items.filter((item) => item.status === 'Draft').length,
    [items],
  );

  const handlePress = useCallback((id: string) => {
    router.push(`/(inspector)/inspection/${id}` as never);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: InspectionQueueItem }) => (
      <InspectionDossierCard item={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  return (
    <View className="flex-1 bg-white">
      <View style={{ paddingTop: insets.top + 12 }} className="px-4 pb-4">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
          Thanh tra môi trường
        </Text>
        <Text className="mt-0.5 text-lg font-bold text-textPrimary">Hồ sơ xử lý</Text>

        <View className="mt-4 flex-row">
          <HeaderStat value={totalCount} label="Tổng hồ sơ" />
          <View className="w-px bg-border" />
          <HeaderStat value={unclaimedCount} label="Chờ nhận việc" color={colors.warning} />
          <View className="w-px bg-border" />
          <HeaderStat value={overdueCount} label="Quá hạn" color={colors.error} />
        </View>
      </View>

      <View className="border-t border-border bg-white pb-3 pt-3">
        <InspectionStatusFilter value={filter} onChange={setFilter} />
      </View>

      {errorMessage ? (
        <View className="mx-4 mt-3 rounded-xl bg-red-50 px-3.5 py-3">
          <Text className="text-sm text-error">{errorMessage}</Text>
          <Pressable onPress={() => void refetch()} hitSlop={6} className="mt-1.5">
            <Text className="text-sm font-bold text-primary">Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={isLoading ? [] : sorted}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && items.length > 0}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={<View className="h-3" />}
        ListEmptyComponent={
          isLoading ? (
            <InspectionQueueSkeleton />
          ) : (
            <View className="items-center px-6 py-16">
              <Ionicons name="folder-open-outline" size={44} color={colors.textDisabled} />
              <Text className="mt-3 text-base font-bold text-textPrimary">Không có hồ sơ</Text>
              <Text className="mt-1 text-center text-sm leading-5 text-textSecondary">
                {filter
                  ? 'Không có hồ sơ nào ở trạng thái này. Thử bộ lọc khác.'
                  : 'Hồ sơ mới do cán bộ LEO lập sẽ xuất hiện tại đây.'}
              </Text>
              {filter ? (
                <Pressable onPress={() => setFilter(null)} hitSlop={8} className="mt-3">
                  <Text className="text-sm font-bold text-primary">Xem tất cả</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        removeClippedSubviews
        initialNumToRender={8}
        windowSize={11}
      />
    </View>
  );
}
