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

const PARTICIPATION_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  Joined: { label: 'Đã tham gia', color: '#065F46', bg: '#D1FAE5' },
  CheckedIn: { label: 'Đã check-in', color: '#1E40AF', bg: '#DBEAFE' },
  Withdrawn: { label: 'Đã rút', color: '#6B7280', bg: '#F3F4F6' },
  NoShow: { label: 'Vắng mặt', color: '#991B1B', bg: '#FEE2E2' },
};

function JoinedCard({ item }: { item: CommunityCleanupListItem }) {
  const participation = item.myParticipation
    ? (PARTICIPATION_LABEL[item.myParticipation.status] ?? PARTICIPATION_LABEL.Joined)
    : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/community/[id]', params: { id: item.id } } as never)}
      className="mx-4 mb-3 rounded-2xl bg-white px-4 py-3.5"
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
    >
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-xs text-textSecondary">{item.reportCode}</Text>
        {participation ? (
          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: participation.bg }}>
            <Text className="text-[11px] font-bold" style={{ color: participation.color }}>{participation.label}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-sm font-bold text-textPrimary" numberOfLines={2}>{item.title}</Text>
      <Text className="mt-1 text-xs text-textSecondary">
        {new Date(item.startsAt).toLocaleDateString('vi-VN')}
      </Text>
    </Pressable>
  );
}

export default function MyCommunityCleanupsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CommunityCleanupListItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await communityCleanupService.getMy({ page: 1, pageSize: 30 });
      setItems(res.data.data.items);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải danh sách chương trình đã tham gia.'));
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
        <Text className="text-xl font-bold text-textPrimary">Chương trình của tôi</Text>
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
          renderItem={({ item }) => <JoinedCard item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View className="flex-1 items-center justify-center py-24 px-6">
                <Ionicons name="bookmark-outline" size={56} color={colors.textDisabled} />
                <Text className="mt-3 text-base font-semibold text-textPrimary">Chưa tham gia chương trình nào</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
