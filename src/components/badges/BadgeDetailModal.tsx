import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { BadgeCatalogItem } from '@/types/gamification.types';
import { formatDate } from '@/utils/formatters';

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  android: { elevation: 8 },
}) as object;

interface BadgeDetailModalProps {
  badge: BadgeCatalogItem | null;
  onClose: () => void;
}

interface ProgressAxis {
  current: number;
  required: number;
  unit: string;
}

function getProgressAxis(badge: BadgeCatalogItem): ProgressAxis | null {
  const current = badge.currentProgressValue ?? 0;
  if (badge.requiredPoints != null) {
    return { current, required: badge.requiredPoints, unit: 'điểm' };
  }
  if (badge.requiredReportCount != null) {
    return { current, required: badge.requiredReportCount, unit: 'báo cáo' };
  }
  if (badge.requiredStreakDays != null) {
    return { current, required: badge.requiredStreakDays, unit: 'ngày liên tiếp' };
  }
  return null;
}

/** Modal chi tiết huy hiệu — hiện tiến độ "hiện tại/cần đạt" cho huy hiệu chưa mở khóa. */
export function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  if (!badge) return null;

  const locked = !badge.isUnlocked;
  const axis = locked ? getProgressAxis(badge) : null;
  const percent = axis ? Math.min(100, Math.round((axis.current / axis.required) * 100)) : 0;

  return (
    <Modal visible={!!badge} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 px-6" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm overflow-hidden rounded-3xl bg-white"
          style={CARD_SHADOW}
        >
          <View className="items-center px-6" style={{ paddingTop: 28, paddingBottom: 20 }}>
            <View className="relative">
              {!locked ? (
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 88, height: 88, borderRadius: 999,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {badge.iconUrl ? (
                    <Image source={{ uri: badge.iconUrl }} style={{ width: 54, height: 54 }} contentFit="contain" />
                  ) : (
                    <Ionicons name="ribbon" size={44} color={colors.white} />
                  )}
                </LinearGradient>
              ) : (
                <View
                  className="h-22 w-22 items-center justify-center rounded-full"
                  style={{ width: 88, height: 88, backgroundColor: colors.surface }}
                >
                  {badge.iconUrl ? (
                    <Image
                      source={{ uri: badge.iconUrl }}
                      style={{ width: 54, height: 54, opacity: 0.5 }}
                      contentFit="contain"
                    />
                  ) : (
                    <Ionicons name="ribbon-outline" size={44} color={colors.textSecondary} />
                  )}
                </View>
              )}

              {locked ? (
                <View
                  className="absolute -right-1 -top-1 h-8 w-8 items-center justify-center rounded-full border-2 border-white"
                  style={{ backgroundColor: colors.textSecondary }}
                >
                  <Ionicons name="lock-closed" size={14} color={colors.white} />
                </View>
              ) : null}
            </View>

            <Text className="mt-4 text-center text-lg font-extrabold text-textPrimary">
              {badge.nameVi}
            </Text>

            {badge.description ? (
              <Text className="mt-1.5 text-center text-sm leading-5 text-textSecondary">
                {badge.description}
              </Text>
            ) : null}

            {!locked && badge.awardedAt ? (
              <View className="mt-3 flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1.5">
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text className="text-xs font-semibold text-textSecondary">
                  Đạt được ngày {formatDate(badge.awardedAt)}
                </Text>
              </View>
            ) : axis ? (
              <View className="mt-5 w-full">
                <View className="mb-1.5 flex-row items-end justify-between">
                  <Text className="text-sm font-bold text-textPrimary">
                    {axis.current}/{axis.required} {axis.unit}
                  </Text>
                  <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                    {percent}%
                  </Text>
                </View>
                <View className="h-2.5 overflow-hidden rounded-full bg-surface">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${percent}%` as `${number}%`, backgroundColor: colors.primary }}
                  />
                </View>
                <Text className="mt-2 text-center text-xs text-textSecondary">
                  Còn {Math.max(0, axis.required - axis.current)} {axis.unit} nữa để đạt huy hiệu này
                </Text>
              </View>
            ) : locked ? (
              <View className="mt-4 rounded-xl bg-surface px-4 py-3">
                <Text className="text-center text-xs leading-5 text-textSecondary">
                  Điều kiện đạt huy hiệu này chưa thể theo dõi bằng số — hãy tiếp tục đóng góp cho cộng đồng!
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={onClose}
            className="items-center justify-center border-t border-border"
            style={{ height: 50 }}
          >
            <Text className="text-sm font-bold" style={{ color: colors.primary }}>
              Đóng
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
