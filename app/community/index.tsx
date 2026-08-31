import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { TapScale } from '@/components/layout/TapScale';
import { communityCleanupService } from '@/services/communityCleanup.service';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { getApiErrorMessage } from '@/utils/api-error-message';
import type { CommunityCleanupListItem } from '@/types/community-cleanup.types';

type CommunityTabKey = 'ALL' | 'MINE';

const COMMUNITY_TABS: { key: CommunityTabKey; label: string; eyebrow: string }[] = [
  { key: 'ALL', label: 'Tất cả', eyebrow: 'Nhật ký' },
  { key: 'MINE', label: 'Tôi tham gia', eyebrow: 'Của tôi' },
];

/** Field-journal ink — kem ấm thay trắng lạnh, không đụng theme trắng của các màn hình khác. */
const INK = '#0F1B14';
const PAPER = '#FFFFFF';
const PAPER_RAISED = '#F5F5F3';
const HAIRLINE = 'rgba(15, 27, 20, 0.10)';
const CLAY = '#C2703F';

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

/** Số thứ tự log dạng mono, 2 chữ số — encode thứ tự entry trong "sổ tay" hôm nay. */
function LogIndex({ index }: { index: number }) {
  return (
    <Text style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.5, color: 'rgba(15,27,20,0.38)' }}>
      {String(index + 1).padStart(2, '0')}
    </Text>
  );
}

const PARTICIPATION_LABEL: Record<string, { label: string; color: string }> = {
  Joined: { label: 'Đã tham gia', color: colors.primaryDark },
  CheckedIn: { label: 'Đã check-in', color: '#1E40AF' },
  Withdrawn: { label: 'Đã rút', color: '#6B7280' },
  NoShow: { label: 'Vắng mặt', color: '#991B1B' },
};

/**
 * 1 dòng trong "sổ tay hiện trường" — ảnh vuông nhỏ như polaroid ghim lề trái, nội dung xếp
 * theo hàng ngang có hairline ngăn cách phía dưới thay vì bọc card riêng biệt từng ô. Đây là
 * signature layout: nhìn cả danh sách như một trang nhật ký, không phải grid card lặp lại.
 */
function LogEntry({
  item,
  index,
  showParticipationBadge,
}: {
  item: CommunityCleanupListItem;
  index: number;
  showParticipationBadge: boolean;
}) {
  const needsCheckInSoon = isStartingSoonAndNotCheckedIn(item);
  const participation = item.myParticipation
    ? (PARTICIPATION_LABEL[item.myParticipation.status] ?? PARTICIPATION_LABEL.Joined)
    : null;

  return (
    <Animated.View entering={FadeInDown.delay(index * 45).duration(360)} layout={LinearTransition.springify()}>
      <TapScale onPress={() => router.push({ pathname: '/community/[id]', params: { id: item.id } } as never)}>
        <View className="flex-row px-5 py-4" style={{ borderBottomWidth: 1, borderBottomColor: HAIRLINE }}>
          <LogIndex index={index} />

          <View className="ml-3 overflow-hidden" style={{ width: 64, height: 64, borderRadius: 4, transform: [{ rotate: index % 2 === 0 ? '-1.5deg' : '1.2deg' }] }}>
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center" style={{ backgroundColor: PAPER_RAISED }}>
                <Ionicons name="leaf-outline" size={22} color={colors.primaryDark} />
              </View>
            )}
          </View>

          <View className="ml-3.5 flex-1 justify-center">
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(15,27,20,0.42)', letterSpacing: 0.4 }}>
              {item.reportCode}
            </Text>
            <Text
              numberOfLines={2}
              style={{ fontFamily: fonts.display, fontSize: 16.5, color: INK, marginTop: 2, lineHeight: 21 }}
            >
              {item.title}
            </Text>

            <View className="mt-1.5 flex-row items-center flex-wrap gap-x-3 gap-y-1">
              <View className="flex-row items-center gap-1">
                <Ionicons name="time-outline" size={12} color="rgba(15,27,20,0.5)" />
                <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: 'rgba(15,27,20,0.55)' }}>
                  {formatDateTime(item.startsAt)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="people-outline" size={12} color={colors.primaryDark} />
                <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.primaryDark }}>
                  còn {item.spotsLeft}/{item.maxParticipants}
                </Text>
              </View>
              {showParticipationBadge && participation ? (
                <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 11, color: participation.color }}>
                  · {participation.label}
                </Text>
              ) : null}
            </View>

            {needsCheckInSoon ? (
              <View className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(194, 112, 63, 0.14)' }}>
                <Ionicons name="alarm-outline" size={11} color={CLAY} />
                <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 10.5, color: CLAY }}>
                  Sắp đến giờ — check-in ngay
                </Text>
              </View>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={16} color="rgba(15,27,20,0.28)" style={{ alignSelf: 'center' }} />
        </View>
      </TapScale>
    </Animated.View>
  );
}

function CommunityListEmptyState({ tab }: { tab: CommunityTabKey }) {
  const copy =
    tab === 'MINE'
      ? {
          icon: 'bookmark-outline' as const,
          title: 'Sổ tay còn trống',
          body: 'Chọn một chương trình ở tab "Tất cả" để bắt đầu ghi tên mình vào đây.',
        }
      : {
          icon: 'leaf-outline' as const,
          title: 'Chưa có mục nào',
          body: 'Khi LEO mở chương trình dọn cộng đồng, trang này sẽ ghi lại từng chương trình.',
        };
  return (
    <Animated.View entering={FadeIn.duration(300)} className="flex-1 items-center justify-center px-8 py-24">
      <Ionicons name={copy.icon} size={44} color="rgba(15,27,20,0.22)" />
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: INK, marginTop: 14 }}>{copy.title}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: 'rgba(15,27,20,0.5)', textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
        {copy.body}
      </Text>
    </Animated.View>
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
  const activeCount = activeTab === 'ALL' ? allItems.length : myItems.length;

  return (
    <View className="flex-1" style={{ backgroundColor: PAPER, paddingTop: insets.top }}>
      {/* Header — eyebrow mono nhỏ phía trên tiêu đề serif lớn, đúng giọng "trang bìa sổ tay" */}
      <View className="px-5 pb-2 pt-4">
        <View className="flex-row items-center justify-between">
          <TapScale onPress={() => router.back()}>
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: PAPER_RAISED }}>
              <Ionicons name="chevron-back" size={20} color={INK} />
            </View>
          </TapScale>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10.5, color: 'rgba(15,27,20,0.4)', letterSpacing: 1.2 }}>
            {activeCount} MỤC
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.displayBlack, fontSize: 30, color: INK, marginTop: 10, letterSpacing: -0.3 }}>
          Dọn cộng đồng
        </Text>
        <Text style={{ fontFamily: fonts.displayItalic, fontSize: 14, color: 'rgba(15,27,20,0.5)', marginTop: 2 }}>
          Ghi lại từng buổi ra quân, từng bàn tay góp sức.
        </Text>
      </View>

      {/* Tabs — kiểu "field label" bấm chọn, không dùng underline mảnh nhàm chán */}
      <View className="mt-3 flex-row gap-2 px-5">
        {COMMUNITY_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TapScale key={tab.key} onPress={() => { void Haptics.selectionAsync(); setActiveTab(tab.key); }}>
              <View
                className="flex-row items-center gap-1.5 rounded-full px-4 py-2"
                style={{ backgroundColor: isActive ? INK : 'transparent', borderWidth: 1, borderColor: isActive ? INK : HAIRLINE }}
              >
                <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: isActive ? PAPER : 'rgba(15,27,20,0.6)' }}>
                  {tab.label}
                </Text>
                {tab.key === 'MINE' && mineNeedingCheckInCount > 0 ? (
                  <View className="h-4 min-w-[16px] items-center justify-center rounded-full px-1" style={{ backgroundColor: CLAY }}>
                    <Text style={{ fontFamily: fonts.monoSemiBold, fontSize: 9.5, color: PAPER }}>{mineNeedingCheckInCount}</Text>
                  </View>
                ) : null}
              </View>
            </TapScale>
          );
        })}
      </View>

      {errorMessage ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={44} color={CLAY} />
          <Text style={{ fontFamily: fonts.display, fontSize: 17, color: INK, marginTop: 12, textAlign: 'center' }}>
            {errorMessage}
          </Text>
          <TapScale onPress={load}>
            <View className="mt-4 rounded-full px-6 py-2.5" style={{ backgroundColor: INK }}>
              <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: PAPER }}>Thử lại</Text>
            </View>
          </TapScale>
        </View>
      ) : (
        <FlatList
          key={activeTab}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <LogEntry item={item} index={index} showParticipationBadge={activeTab === 'ALL'} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 18, paddingBottom: 32, flexGrow: 1, width }}
          ItemSeparatorComponent={null}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={load} tintColor={colors.primaryDark} colors={[colors.primaryDark]} />
          }
          ListEmptyComponent={!isLoading ? <CommunityListEmptyState tab={activeTab} /> : null}
        />
      )}
    </View>
  );
}
