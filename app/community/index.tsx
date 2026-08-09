import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { communityCleanupService } from '@/services/communityCleanup.service';
import { colors } from '@/theme/colors';
import { getApiErrorMessage } from '@/utils/api-error-message';
import type { CommunityCleanupListItem } from '@/types/community-cleanup.types';

type CommunityTabKey = 'ALL' | 'MINE';

const COMMUNITY_TABS: { key: CommunityTabKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả chương trình' },
  { key: 'MINE', label: 'Tôi tham gia' },
];

const CHECK_IN_REMINDER_WINDOW_MS = 30 * 60 * 1000;

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function isStartingSoonAndNotCheckedIn(item: CommunityCleanupListItem): boolean {
  if (!item.myParticipation || item.myParticipation.status !== 'Joined') return false;
  const diff = new Date(item.startsAt).getTime() - Date.now();
  return diff > 0 && diff <= CHECK_IN_REMINDER_WINDOW_MS;
}

function EventCard({ item, showParticipationBadge }: { item: CommunityCleanupListItem; showParticipationBadge: boolean }) {
  const needsCheckInSoon = isStartingSoonAndNotCheckedIn(item);

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
            {showParticipationBadge && item.myParticipation ? (
              <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: '#ECFDF5' }}>
                <Text className="text-[10px] font-bold" style={{ color: colors.primary }}>Đã tham gia</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {needsCheckInSoon ? (
        <View className="flex-row items-center gap-1.5 border-t border-border/60 bg-[#FFFBEB] px-3 py-2">
          <Ionicons name="alarm-outline" size={13} color="#B45309" />
          <Text className="text-[11px] font-semibold text-[#B45309]">
            Sắp đến giờ dọn dẹp — đừng quên check-in khi đến điểm hẹn!
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

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
  const needsCheckInSoon = isStartingSoonAndNotCheckedIn(item);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/community/[id]', params: { id: item.id } } as never)}
      className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white"
      style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
    >
      <View className="px-4 py-3.5">
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
          {formatDateTime(item.startsAt)}
        </Text>
      </View>

      {needsCheckInSoon ? (
        <View className="flex-row items-center gap-1.5 border-t border-border/60 bg-[#FFFBEB] px-3 py-2">
          <Ionicons name="alarm-outline" size={13} color="#B45309" />
          <Text className="text-[11px] font-semibold text-[#B45309]">
            Sắp đến giờ dọn dẹp — đừng quên check-in khi đến điểm hẹn!
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function CommunityListEmptyState({ tab }: { tab: CommunityTabKey }) {
  if (tab === 'MINE') {
    return (
      <View className="flex-1 items-center justify-center py-24 px-6">
        <Ionicons name="bookmark-outline" size={56} color={colors.textDisabled} />
        <Text className="mt-3 text-base font-semibold text-textPrimary">Chưa tham gia chương trình nào</Text>
        <Text className="mt-1 text-center text-sm text-textSecondary">
          Tham gia một chương trình ở tab &quot;Tất cả chương trình&quot; để bắt đầu.
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-1 items-center justify-center py-24 px-6">
      <Ionicons name="leaf-outline" size={56} color={colors.textDisabled} />
      <Text className="mt-3 text-base font-semibold text-textPrimary">Chưa có chương trình nào</Text>
      <Text className="mt-1 text-center text-sm text-textSecondary">
        Khi LEO mở chương trình dọn cộng đồng, bạn sẽ thấy ở đây.
      </Text>
    </View>
  );
}

export default function CommunityListScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<CommunityTabKey>('ALL');

  const [allItems, setAllItems] = useState<CommunityCleanupListItem[]>([]);
  const [myItems, setMyItems] = useState<CommunityCleanupListItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [openRes, myRes] = await Promise.all([
        communityCleanupService.getOpen({ page: 1, pageSize: 30 }),
        communityCleanupService.getMy({ page: 1, pageSize: 30 }),
      ]);
      setAllItems(openRes.data.data.items);
      setMyItems(myRes.data.data.items);
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

  const mineNeedingCheckInCount = useMemo(
    () => myItems.filter(isStartingSoonAndNotCheckedIn).length,
    [myItems],
  );

  const items = activeTab === 'ALL' ? allItems : myItems;

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
        <Text className="text-xl font-bold text-textPrimary">Dọn cộng đồng</Text>
      </View>

      <View className="flex-row border-b border-border px-4">
        {COMMUNITY_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                void Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
              className="mr-6 items-center pb-2.5 pt-1"
              style={{ borderBottomWidth: isActive ? 2 : 0, borderBottomColor: colors.primary }}
            >
              <View className="flex-row items-center gap-1.5">
                <Text
                  className={`text-sm ${isActive ? 'font-bold text-primary' : 'font-medium text-textSecondary'}`}
                >
                  {tab.label}
                </Text>
                {tab.key === 'MINE' && mineNeedingCheckInCount > 0 ? (
                  <View className="h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1">
                    <Text className="text-[10px] font-bold text-white">{mineNeedingCheckInCount}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
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
          key={activeTab}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            activeTab === 'ALL' ? (
              <EventCard item={item} showParticipationBadge />
            ) : (
              <JoinedCard item={item} />
            )
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32, flexGrow: 1, width }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={!isLoading ? <CommunityListEmptyState tab={activeTab} /> : null}
        />
      )}
    </View>
  );
}
