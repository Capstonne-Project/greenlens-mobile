import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgeDetailModal } from '@/components/badges/BadgeDetailModal';
import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { gamificationService } from '@/services/gamification.service';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { BadgeCatalogItem } from '@/types/gamification.types';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { formatDate } from '@/utils/formatters';

const CARD_3D_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 5 },
}) as object;

const FEATURED_GLOW = Platform.select({
  ios: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 6 },
}) as object;

function BadgeCell({
  item,
  isUpdating,
  onPress,
}: {
  item: BadgeCatalogItem;
  isUpdating: boolean;
  onPress: () => void;
}) {
  const locked = !item.isUnlocked;

  return (
    <View className="w-1/3 px-1.5 py-2">
      <Pressable disabled={isUpdating} onPress={onPress}>
        <View
          className="items-center rounded-2xl px-2 py-3.5"
          style={[
            {
              backgroundColor: item.isFeatured ? `${colors.primary}12` : colors.white,
              borderWidth: 1.5,
              borderColor: item.isFeatured ? colors.primary : colors.border,
            },
            item.isFeatured ? FEATURED_GLOW : undefined,
          ]}
        >
          <View className="relative">
            {item.isFeatured ? (
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.iconUrl ? (
                  <Image source={{ uri: item.iconUrl }} style={{ width: 34, height: 34 }} contentFit="contain" />
                ) : (
                  <Ionicons name="ribbon" size={28} color={colors.white} />
                )}
              </LinearGradient>
            ) : (
              <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{
                  backgroundColor: locked ? colors.surface : `${colors.primary}1A`,
                  opacity: locked ? 0.55 : 1,
                }}
              >
                {item.iconUrl ? (
                  <Image
                    source={{ uri: item.iconUrl }}
                    style={{ width: 34, height: 34, opacity: locked ? 0.5 : 1 }}
                    contentFit="contain"
                  />
                ) : (
                  <Ionicons
                    name={locked ? 'ribbon-outline' : 'ribbon'}
                    size={28}
                    color={locked ? colors.textSecondary : colors.primary}
                  />
                )}
              </View>
            )}

            {isUpdating ? (
              <View className="absolute inset-0 items-center justify-center rounded-full bg-black/35">
                <ActivityIndicator size="small" color={colors.white} />
              </View>
            ) : locked ? (
              <View
                className="absolute -right-0.5 -top-0.5 h-6 w-6 items-center justify-center rounded-full border-2 border-white"
                style={{ backgroundColor: colors.textSecondary }}
              >
                <Ionicons name="lock-closed" size={11} color={colors.white} />
              </View>
            ) : item.isFeatured ? (
              <View
                className="absolute -right-0.5 -top-0.5 h-6 w-6 items-center justify-center rounded-full border-2 border-white"
                style={{ backgroundColor: colors.warning }}
              >
                <Ionicons name="star" size={11} color={colors.white} />
              </View>
            ) : null}
          </View>

          <Text
            className="mt-2 text-center text-xs font-bold"
            style={{ color: locked ? colors.textSecondary : colors.textPrimary }}
            numberOfLines={2}
          >
            {item.nameVi}
          </Text>

          {item.isFeatured ? (
            <Text className="mt-1 text-center text-[10px] font-bold" style={{ color: colors.primary }}>
              Đang hiển thị
            </Text>
          ) : item.isUnlocked ? (
            // Đã unlock: `currentProgressValue` luôn null từ BE — không dùng nhánh
            // progress bên dưới kẻo hiện lại "0/Y" cho huy hiệu đã đạt từ lâu.
            <Text className="mt-1 text-center text-[10px] text-textSecondary" numberOfLines={1}>
              {item.awardedAt ? formatDate(item.awardedAt) : 'Đã đạt'}
            </Text>
          ) : item.requiredPoints ? (
            <Text className="mt-1 text-center text-[10px] text-textSecondary" numberOfLines={1}>
              {item.currentProgressValue ?? '?'}/{item.requiredPoints} điểm
            </Text>
          ) : item.requiredReportCount ? (
            <Text className="mt-1 text-center text-[10px] text-textSecondary" numberOfLines={1}>
              {item.currentProgressValue ?? '?'}/{item.requiredReportCount} báo cáo
            </Text>
          ) : item.requiredStreakDays ? (
            <Text className="mt-1 text-center text-[10px] text-textSecondary" numberOfLines={1}>
              {item.currentProgressValue ?? '?'}/{item.requiredStreakDays} ngày
            </Text>
          ) : (
            <Text className="mt-1 text-center text-[10px] text-textSecondary" numberOfLines={1}>
              Chưa đạt
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

function BadgeCellSkeleton() {
  return (
    <View className="w-1/3 px-1.5 py-2">
      <View className="items-center rounded-2xl border border-border px-2 py-3.5">
        <View className="h-14 w-14 rounded-full bg-surface" />
        <View className="mt-2 h-3 w-16 rounded bg-surface" />
        <View className="mt-1.5 h-2 w-10 rounded bg-surface" />
      </View>
    </View>
  );
}

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const setUser = useAuthStore((s) => s.setUser);
  const [badges, setBadges] = useState<BadgeCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailBadge, setDetailBadge] = useState<BadgeCatalogItem | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await gamificationService.getBadgeCatalog();
      setBadges(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải danh sách huy hiệu.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFeatured = useCallback(
    async (badge: BadgeCatalogItem | null, sourceId: string) => {
      if (updatingId) return;
      const nextBadgeId = badge?.badgeId ?? null;
      setUpdatingId(sourceId);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await gamificationService.setFeaturedBadge(nextBadgeId);
        setBadges((prev) => prev.map((b) => ({ ...b, isFeatured: b.badgeId === nextBadgeId })));
        // Đồng bộ lại hồ sơ để bubble huy hiệu trên trang Hồ sơ cập nhật ngay
        const { data: envelope } = await userService.getProfile();
        setUser(envelope.data);
      } catch (err) {
        Alert.alert('Không thể cập nhật', getApiErrorMessage(err, 'Vui lòng thử lại.'));
      } finally {
        setUpdatingId(null);
      }
    },
    [updatingId, setUser],
  );

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const featured = badges.find((b) => b.isFeatured);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 px-4 pb-1" style={{ paddingTop: insets.top + 12 }}>
        <TapScale onPress={() => router.back()}>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-surface">
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </View>
        </TapScale>
        <View className="flex-1">
          <Text className="text-lg font-bold text-textPrimary" numberOfLines={1}>
            Huy hiệu
          </Text>
          {!isLoading && !error ? (
            <Text className="text-xs text-textSecondary">
              Đã đạt {unlockedCount}/{badges.length}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View className="flex-row flex-wrap px-2.5 pt-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <BadgeCellSkeleton key={`badge-skeleton-${index}`} />
            ))}
          </View>
        ) : error ? (
          <View className="items-center px-6 py-16">
            <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
            <Text className="mt-3 text-center text-sm text-textSecondary">{error}</Text>
            <TapScale onPress={() => void load()}>
              <View className="mt-4 rounded-xl px-5 py-2.5" style={{ backgroundColor: colors.primary }}>
                <Text className="text-sm font-semibold text-white">Thử lại</Text>
              </View>
            </TapScale>
          </View>
        ) : badges.length === 0 ? (
          <View className="items-center px-6 py-16">
            <Ionicons name="ribbon-outline" size={28} color={colors.textSecondary} />
            <Text className="mt-3 text-center text-sm text-textSecondary">Chưa có huy hiệu nào.</Text>
          </View>
        ) : (
          <>
            {featured ? (
              <View className="mx-4 mt-2 overflow-hidden rounded-2xl" style={CARD_3D_SHADOW}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-white/25">
                    <Ionicons name="ribbon" size={20} color={colors.white} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] font-semibold text-white/80">Đang hiển thị trên hồ sơ</Text>
                    <Text className="text-sm font-bold text-white" numberOfLines={1}>
                      {featured.nameVi}
                    </Text>
                  </View>
                  <TapScale onPress={() => void applyFeatured(null, featured.badgeId)}>
                    <View className="rounded-full bg-white/25 px-3 py-1.5">
                      {updatingId === featured.badgeId ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text className="text-xs font-bold text-white">Bỏ chọn</Text>
                      )}
                    </View>
                  </TapScale>
                </LinearGradient>
              </View>
            ) : unlockedCount > 0 ? (
              <View
                className="mx-4 mt-2 flex-row items-center gap-2.5 rounded-2xl px-4 py-3"
                style={{ backgroundColor: colors.surface }}
              >
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                <Text className="flex-1 text-xs text-textSecondary">
                  Chạm vào một huy hiệu đã đạt để ghim lên hồ sơ của bạn.
                </Text>
              </View>
            ) : null}

            <View className="flex-row flex-wrap px-2.5 pt-2">
              {badges.map((badge) => (
                <BadgeCell
                  key={badge.badgeId}
                  item={badge}
                  isUpdating={updatingId === badge.badgeId}
                  onPress={() =>
                    badge.isUnlocked
                      ? void applyFeatured(badge.isFeatured ? null : badge, badge.badgeId)
                      : setDetailBadge(badge)
                  }
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <BadgeDetailModal badge={detailBadge} onClose={() => setDetailBadge(null)} />
    </View>
  );
}
