import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationBell } from '@/components/common/NotificationBell';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { gamificationService } from '@/services/gamification.service';
import { colors } from '@/theme/colors';
import type { LeaderboardEntry, LeaderboardPeriod } from '@/types/gamification.types';
import { getApiErrorMessage } from '@/utils/api-error-message';

const PERIOD_OPTIONS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'AllTime', label: 'Tất cả' },
  { key: 'Weekly', label: 'Tuần' },
  { key: 'Monthly', label: 'Tháng' },
  { key: 'Yearly', label: 'Năm' },
];

const CARD_3D_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 4 },
}) as object;

/** Bục 1 cao nhất, 2 và 3 thấp dần — tạo hình biểu đồ cột */
const PODIUM_META = {
  1: { height: 96, avatar: 76, pill: ['#10B981', '#059669'] as const, medal: '#F59E0B' },
  2: { height: 70, avatar: 60, pill: ['#A7B3C4', '#64748B'] as const, medal: '#94A3B8' },
  3: { height: 54, avatar: 60, pill: ['#F5B33C', '#B45309'] as const, medal: '#B45309' },
} as const;

function PodiumColumn({
  entry,
  place,
  isCurrentUser,
}: {
  entry: LeaderboardEntry | undefined;
  place: 1 | 2 | 3;
  isCurrentUser: boolean;
}) {
  const meta = PODIUM_META[place];

  if (!entry) {
    return (
      <View className="flex-1 items-center justify-end">
        <View
          className="w-full rounded-t-2xl bg-surface"
          style={{ height: meta.height, opacity: 0.5 }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-end">
      {place === 1 ? (
        <Ionicons name="trophy" size={22} color={meta.medal} style={{ marginBottom: 4 }} />
      ) : null}

      <View className="relative">
        <View
          className="items-center justify-center overflow-hidden rounded-full bg-surface"
          style={{
            width: meta.avatar,
            height: meta.avatar,
            borderWidth: isCurrentUser ? 2.5 : 2,
            borderColor: isCurrentUser ? colors.primary : colors.white,
          }}
        >
          {entry.avatarUrl ? (
            <Image source={{ uri: entry.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Text className="text-2xl font-bold text-textPrimary">
              {entry.displayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          )}
        </View>

        {place !== 1 ? (
          <View
            className="absolute -right-1 -top-0.5 h-6 w-6 items-center justify-center rounded-full border-2 border-white"
            style={{ backgroundColor: meta.medal }}
          >
            <Text className="text-[11px] font-bold text-white">{place}</Text>
          </View>
        ) : null}
      </View>

      <Text className="mt-1.5 px-1 text-center text-xs font-bold text-textPrimary" numberOfLines={1}>
        {entry.displayName}
        {isCurrentUser ? ' (Bạn)' : ''}
      </Text>

      <LinearGradient
        colors={meta.pill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 }}
      >
        <Text className="text-xs font-bold text-white">{entry.points.toLocaleString('vi-VN')}</Text>
      </LinearGradient>

      <LinearGradient
        colors={['#F1F5F9', '#DFE5EC'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          height: meta.height,
          width: '100%',
          marginTop: 8,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text className="text-3xl font-bold" style={{ color: '#B6C2D2' }}>
          {place}
        </Text>
      </LinearGradient>
    </View>
  );
}

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  return (
    <View
      className="mb-2 flex-row items-center gap-3 rounded-xl bg-white px-4 py-3"
      style={[CARD_3D_SHADOW, isCurrentUser ? { borderWidth: 1.5, borderColor: colors.primary } : undefined]}
    >
      <View className="w-8 flex-row items-center gap-1">
        <Ionicons name="trophy-outline" size={13} color={colors.textSecondary} />
        <Text className="text-sm font-bold text-textSecondary">{entry.rank}</Text>
      </View>

      <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface">
        {entry.avatarUrl ? (
          <Image source={{ uri: entry.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Text className="text-base font-bold text-textPrimary">{entry.displayName?.[0]?.toUpperCase() ?? '?'}</Text>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-sm font-bold text-textPrimary" numberOfLines={1}>
          {entry.displayName}
          {isCurrentUser ? ' (Bạn)' : ''}
        </Text>
        <Text className="mt-0.5 text-xs text-textSecondary">Cấp {entry.level}</Text>
      </View>

      <View className="flex-row items-center gap-1">
        <Ionicons name="star" size={14} color={colors.warning} />
        <Text className="text-sm font-bold text-textPrimary">{entry.points.toLocaleString('vi-VN')}</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('AllTime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selectedPeriod: LeaderboardPeriod) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await gamificationService.getLeaderboard({ period: selectedPeriod, top: 50 });
      setEntries(res.data.data.entries);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải bảng xếp hạng.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [period, load]);

  const [first, second, third] = entries;
  const restEntries = entries.slice(3);

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text className="text-2xl font-bold text-textPrimary">Bảng xếp hạng</Text>
        <NotificationBell />
      </View>

      <View className="mt-3 flex-row border-b border-border px-2">
        {PERIOD_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setPeriod(opt.key)}
            className="flex-1 items-center border-b-2 py-3"
            style={{ borderColor: period === opt.key ? colors.primary : 'transparent' }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: period === opt.key ? colors.primary : colors.textSecondary }}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View className="px-4 pt-4">
            <View className="mb-4 h-52 rounded-2xl bg-surface" />
            {Array.from({ length: 5 }).map((_, index) => (
              <View key={`leaderboard-skeleton-${index}`} className="mb-2 h-16 rounded-xl bg-surface" />
            ))}
          </View>
        ) : error ? (
          <View className="items-center px-6 py-16">
            <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
            <Text className="mt-3 text-center text-sm text-textSecondary">{error}</Text>
          </View>
        ) : entries.length === 0 ? (
          <View className="items-center px-6 py-16">
            <Ionicons name="trophy-outline" size={28} color={colors.textSecondary} />
            <Text className="mt-3 text-center text-sm text-textSecondary">
              Chưa có ai trên bảng xếp hạng ở kỳ này. Hãy là người đầu tiên!
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row items-end gap-2 px-4 pt-5">
              <PodiumColumn entry={second} place={2} isCurrentUser={second?.userId === user?.id} />
              <PodiumColumn entry={first} place={1} isCurrentUser={first?.userId === user?.id} />
              <PodiumColumn entry={third} place={3} isCurrentUser={third?.userId === user?.id} />
            </View>

            <View className="px-4 pt-5">
              {restEntries.length === 0 ? (
                <View className="items-center px-6 py-10">
                  <Text className="text-center text-sm text-textSecondary">
                    Chưa có thêm người tham gia ngoài top {entries.length}.
                  </Text>
                </View>
              ) : (
                restEntries.map((entry) => (
                  <LeaderboardRow key={entry.userId} entry={entry} isCurrentUser={entry.userId === user?.id} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
