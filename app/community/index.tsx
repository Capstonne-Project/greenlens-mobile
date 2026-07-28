import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function EventCard({ item }: { item: CommunityCleanupListItem }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/community/[id]', params: { id: item.id } } as never)}
      className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white"
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
    >
      <View className="flex-row">
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={{ width: 92, height: 92 }} contentFit="cover" />
        ) : (
          <View className="items-center justify-center bg-surface" style={{ width: 92, height: 92 }}>
            <Ionicons name="leaf-outline" size={28} color={colors.primary} />
          </View>
        )}
        <View className="flex-1 justify-center px-3 py-2">
          <Text className="text-[11px] text-textSecondary">{item.reportCode}</Text>
          <Text className="mb-1 text-sm font-bold text-textPrimary" numberOfLines={2}>{item.title}</Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text className="text-[11px] text-textSecondary">{formatDateTime(item.startsAt)}</Text>
          </View>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="people-outline" size={12} color={colors.primary} />
            <Text className="text-[11px] font-semibold" style={{ color: colors.primary }}>
              Còn {item.spotsLeft} chỗ / {item.maxParticipants}
            </Text>
            {item.myParticipation ? (
              <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: '#ECFDF5' }}>
                <Text className="text-[10px] font-bold" style={{ color: colors.primary }}>Đã tham gia</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function CommunityListScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CommunityCleanupListItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await communityCleanupService.getOpen({ page: 1, pageSize: 30 });
      setItems(res.data.data.items);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải danh sách chương trình.'));
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
      <View className="flex-row items-center justify-between px-4 pb-3 pt-3">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-surface"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text className="text-xl font-bold text-textPrimary">Dọn cộng đồng</Text>
        </View>
        <Pressable
          onPress={() => router.push('/community/my' as never)}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="bookmark-outline" size={20} color={colors.textPrimary} />
        </Pressable>
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
          renderItem={({ item }) => <EventCard item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View className="flex-1 items-center justify-center py-24 px-6">
                <Ionicons name="leaf-outline" size={56} color={colors.textDisabled} />
                <Text className="mt-3 text-base font-semibold text-textPrimary">Chưa có chương trình nào</Text>
                <Text className="mt-1 text-center text-sm text-textSecondary">
                  Khi LEO mở chương trình dọn cộng đồng, bạn sẽ thấy ở đây.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
