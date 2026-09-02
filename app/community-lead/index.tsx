import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { communityCleanupService } from '@/services/communityCleanup.service';
import { colors } from '@/theme/colors';
import { getApiErrorMessage } from '@/utils/api-error-message';
import type { CommunityCleanupListItem } from '@/types/community-cleanup.types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OpenForJoin: { label: 'Đang mở đăng ký', color: '#065F46', bg: '#D1FAE5' },
  JoinClosed: { label: 'Đã đóng đăng ký', color: '#92400E', bg: '#FEF3C7' },
  InProgress: { label: 'Đang dọn dẹp', color: '#1E40AF', bg: '#DBEAFE' },
  PendingVerification: { label: 'Chờ LEO duyệt', color: '#6D28D9', bg: '#EDE9FE' },
  Completed: { label: 'Hoàn thành', color: '#374151', bg: '#F3F4F6' },
  Cancelled: { label: 'Đã hủy', color: '#991B1B', bg: '#FEE2E2' },
};

function LedCard({ item }: { item: CommunityCleanupListItem }) {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.OpenForJoin;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/community-lead/[id]', params: { id: item.id } } as never)}
      className="mx-4 mb-3 rounded-2xl bg-white px-4 py-3.5"
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs text-textSecondary">{item.reportCode}</Text>
        <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: statusCfg.bg }}>
          <Text className="text-[11px] font-bold" style={{ color: statusCfg.color }}>{statusCfg.label}</Text>
        </View>
      </View>
      <Text className="mb-2 text-sm font-bold text-textPrimary" numberOfLines={2}>{item.title}</Text>
      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1">
          <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
          <Text className="text-[11px] text-textSecondary">{item.participantCount}/{item.maxParticipants}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="trending-up-outline" size={13} color={colors.primary} />
          <Text className="text-[11px] font-semibold" style={{ color: colors.primary }}>{item.progressPercent}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function LedByMeScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CommunityCleanupListItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await communityCleanupService.getLedByMe({ page: 1, pageSize: 30 });
      // Chương trình mới nhất lên đầu — BE chưa trả createdAt nên dùng startsAt làm proxy.
      const sorted = [...res.data.data.items].sort(
        (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      );
      setItems(sorted);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải danh sách chương trình bạn dẫn dắt.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 pb-3 pt-3">
        <Pressable
          onPress={() => router.back()}
          className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-surface"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text className="text-xl font-bold text-textPrimary">Chương trình tôi dẫn</Text>
      </View>

      {errorMessage ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={52} color={colors.error} />
          <Text className="mt-3 text-base font-semibold text-textPrimary">{errorMessage}</Text>
          <Pressable onPress={load} className="mt-4 rounded-xl px-6 py-2.5" style={{ backgroundColor: colors.primary }}>
            <Text className="font-semibold text-white">Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LedCard item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View className="flex-1 items-center justify-center py-24 px-6">
                <Ionicons name="construct-outline" size={56} color={colors.textDisabled} />
                <Text className="mt-3 text-base font-semibold text-textPrimary">Chưa dẫn dắt chương trình nào</Text>
                <Text className="mt-1 text-center text-sm text-textSecondary">
                  LEO sẽ chỉ định bạn làm Leader khi mở chương trình dọn cộng đồng.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
