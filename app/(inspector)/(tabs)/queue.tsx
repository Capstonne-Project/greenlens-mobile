import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useInspectionQueue } from '@/hooks/useInspectionQueue';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { SlaCountdown } from '@/shared/components/SlaCountdown';
import { colors } from '@/theme/colors';
import type { InspectionQueueItem } from '@/types/inspection.types';

function InspectionQueueCard({ item }: { item: InspectionQueueItem }) {
  return (
    <Pressable
      onPress={() => router.push(`/(inspector)/inspection/${item.id}` as never)}
      className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm"
      style={{ elevation: 2 }}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs text-textSecondary">{item.reportCode}</Text>
        <StatusBadge kind="inspection" status={item.status} />
      </View>
      <Text className="mb-1 text-base font-bold text-textPrimary">{item.violatorName}</Text>
      <Text className="mb-2 text-sm text-textSecondary" numberOfLines={2}>{item.address}</Text>
      {item.violationDescription ? (
        <Text className="mb-2 text-xs text-textSecondary" numberOfLines={2}>{item.violationDescription}</Text>
      ) : null}
      <View className="flex-row items-center justify-between">
        {item.slaInspectionDueAt ? (
          <SlaCountdown dueAt={item.slaInspectionDueAt} />
        ) : (
          <View />
        )}
        <Text className="text-xs text-textSecondary">
          {new Date(item.createdAt).toLocaleDateString('vi-VN')}
        </Text>
      </View>
    </Pressable>
  );
}

function QueueSkeleton() {
  return (
    <View className="mx-4 mb-3 h-28 rounded-2xl bg-surface" />
  );
}

export default function InspectorQueueScreen() {
  const insets = useSafeAreaInsets();
  const { items, isLoading, errorMessage, refetch } = useInspectionQueue();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold text-textPrimary">Hồ sơ thanh tra</Text>
        <Text className="mt-1 text-sm text-textSecondary">Queue từ LEO — không dùng resolve report</Text>
      </View>

      {errorMessage ? (
        <View className="mx-4 mb-3 rounded-xl bg-red-50 px-3 py-2">
          <Text className="text-sm text-error">{errorMessage}</Text>
          <Pressable onPress={() => void refetch()} className="mt-2">
            <Text className="text-sm font-semibold text-primary">Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={isLoading ? [] : items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <InspectionQueueCard item={item} />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refetch()} />}
        ListEmptyComponent={
          isLoading ? (
            <View>
              <QueueSkeleton />
              <QueueSkeleton />
            </View>
          ) : (
            <View className="items-center px-6 py-16">
              <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
              <Text className="mt-3 text-center text-textSecondary">Chưa có hồ sơ trong hàng đợi</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      />
    </View>
  );
}
