import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { MyReportItem, MyReportSeverity } from '@/types/my-reports.types';
import { formatRelativeTime } from '@/utils/formatters';
import { getReportStatusMeta } from '@/utils/report-status';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface MyReportListCardProps {
  item: MyReportItem;
  onPress: () => void;
}

const SEVERITY_META: Record<MyReportSeverity, { label: string; textColor: string }> = {
  Low: { label: 'Mức thấp', textColor: '#166534' },
  Medium: { label: 'Mức trung bình', textColor: '#92400E' },
  High: { label: 'Mức cao', textColor: '#9A3412' },
  Critical: { label: 'Nghiêm trọng', textColor: '#991B1B' },
};

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  waste: 'trash-outline',
  water_pollution: 'water-outline',
  air_pollution: 'cloud-outline',
  noise: 'volume-high-outline',
  other: 'leaf-outline',
};

function isNeedsConfirm(status: string): boolean {
  return status === 'Resolved' || status === 'PenaltyIssued';
}

function isActiveWork(status: string): boolean {
  return ['Submitted', 'Verified', 'Dispatched', 'Assigned', 'InProgress'].includes(status);
}

function isClosed(status: string): boolean {
  return status === 'Closed' || status === 'ClosedNoViolation';
}

function isRejected(status: string): boolean {
  return status === 'Rejected' || status === 'Duplicate';
}

function statusTone(status: string): string {
  if (isNeedsConfirm(status)) return '#B45309';
  if (isActiveWork(status)) return colors.primaryDark;
  if (isClosed(status)) return colors.textSecondary;
  if (isRejected(status)) return colors.error;
  return colors.textSecondary;
}

function timelineCopy(item: MyReportItem): { icon: keyof typeof Ionicons.glyphMap; text: string } {
  if (isNeedsConfirm(item.status)) {
    return { icon: 'checkmark-circle-outline', text: 'Đội đã xử lý xong — chờ bạn xác nhận kết quả' };
  }
  if (item.status === 'InProgress') {
    return { icon: 'sync-outline', text: 'Đang được đội xử lý tại hiện trường' };
  }
  if (item.status === 'Verified' || item.status === 'Assigned' || item.status === 'Dispatched') {
    return { icon: 'people-outline', text: 'Đã xác minh / phân công — chờ triển khai' };
  }
  if (item.status === 'Submitted') {
    return { icon: 'time-outline', text: 'Đã gửi — đang chờ xác minh' };
  }
  if (isClosed(item.status)) {
    return { icon: 'checkmark-done-outline', text: 'Báo cáo đã kết thúc' };
  }
  if (isRejected(item.status)) {
    return { icon: 'close-circle-outline', text: 'Báo cáo không được tiếp nhận' };
  }
  return { icon: 'information-circle-outline', text: getReportStatusMeta(item.status).label };
}

interface ActionBtnProps {
  label: string;
  variant: 'primary' | 'outline' | 'ghost';
  onPress: () => void;
}

function ActionBtn({ label, variant, onPress }: ActionBtnProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base =
    variant === 'primary'
      ? { bg: colors.primary, border: colors.primary, text: '#FFFFFF' }
      : variant === 'outline'
        ? { bg: colors.white, border: colors.primary, text: colors.primary }
        : { bg: colors.white, border: colors.border, text: colors.textPrimary };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        className="h-9 items-center justify-center rounded-full px-4"
        style={{ backgroundColor: base.bg, borderWidth: 1, borderColor: base.border }}
      >
        <Text className="text-[13px] font-semibold" style={{ color: base.text }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function MyReportListCardComponent({ item, onPress }: MyReportListCardProps) {
  const statusMeta = getReportStatusMeta(item.status);
  const severityMeta = SEVERITY_META[item.severity] ?? SEVERITY_META.Medium;
  const needsConfirm = isNeedsConfirm(item.status);
  const activeWork = isActiveWork(item.status);
  const categoryKey = (item.categoryCode ?? 'other').toLowerCase();
  const iconName = CATEGORY_ICON[categoryKey] ?? 'leaf-outline';
  const timeline = timelineCopy(item);
  const tone = statusTone(item.status);

  return (
    <View className="mb-2.5 bg-white px-4 py-3.5">
      <TapScale onPress={onPress}>
        <View>
          {/* Header — shop row style */}
          <View className="mb-2.5 flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
              <Ionicons name="leaf-outline" size={14} color={colors.textSecondary} />
              <Text className="flex-1 text-[13px] font-semibold text-textPrimary" numberOfLines={1}>
                {item.categoryName}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
            </View>
            <Text
              className="max-w-[42%] text-right text-[12px] font-semibold"
              style={{ color: tone }}
              numberOfLines={1}
            >
              {statusMeta.label}
            </Text>
          </View>

          {/* Timeline update — TikTok style, muted EU */}
          <View className="mb-3 flex-row items-start gap-2 rounded-xl bg-surface px-3 py-2">
            <Ionicons name={timeline.icon} size={14} color={tone} style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-[12px] font-medium text-textPrimary">
                {formatRelativeTime(item.createdAt)}
                {item.resolvedAt && needsConfirm ? ' · Đã xử lý' : ''}
              </Text>
              <Text className="mt-0.5 text-[11px] leading-4 text-textSecondary" numberOfLines={2}>
                {timeline.text}
              </Text>
            </View>
          </View>

          {/* Item row */}
          <View className="flex-row">
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: 72, height: 72, borderRadius: 10 }}
                contentFit="cover"
                transition={160}
              />
            ) : (
              <View className="h-[72px] w-[72px] items-center justify-center rounded-[10px] bg-surface">
                <Ionicons name={iconName} size={26} color={colors.textSecondary} />
              </View>
            )}

            <View className="ml-3 flex-1 justify-between py-0.5">
              <View>
                <Text className="text-[14px] font-semibold leading-5 text-textPrimary" numberOfLines={2}>
                  {item.address || item.categoryName}
                </Text>
                <Text className="mt-1 text-[12px] text-textSecondary" numberOfLines={1}>
                  {severityMeta.label} · {item.code}
                </Text>
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-[12px] text-textSecondary">
                  Gửi {formatRelativeTime(item.createdAt)}
                </Text>
                {item.reporterCount && item.reporterCount > 1 ? (
                  <Text className="text-[12px] font-medium text-textSecondary">
                    {item.reporterCount} người báo
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Summary */}
          <View className="mt-3 flex-row items-center justify-end border-t border-border/60 pt-2.5">
            <Text className="text-[12px] text-textSecondary">Trạng thái: </Text>
            <Text className="text-[13px] font-semibold" style={{ color: tone }}>
              {needsConfirm ? 'Cần xác nhận' : activeWork ? 'Đang xử lý' : statusMeta.label}
            </Text>
          </View>
        </View>
      </TapScale>

      {/* Actions ngoài TapScale — tránh double press */}
      <View className="mt-3 flex-row items-center justify-end gap-2">
        {needsConfirm ? (
          <>
            <ActionBtn label="Xem chi tiết" variant="ghost" onPress={onPress} />
            <ActionBtn label="Xác nhận" variant="primary" onPress={onPress} />
          </>
        ) : activeWork ? (
          <ActionBtn label="Theo dõi" variant="outline" onPress={onPress} />
        ) : isRejected(item.status) ? (
          <ActionBtn label="Xem lý do" variant="ghost" onPress={onPress} />
        ) : (
          <ActionBtn label="Xem lại" variant="outline" onPress={onPress} />
        )}
      </View>
    </View>
  );
}

export const MyReportListCard = memo(MyReportListCardComponent);
