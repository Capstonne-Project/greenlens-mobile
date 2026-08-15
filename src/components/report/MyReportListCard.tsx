import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { MyReportItem, MyReportSeverity } from '@/types/my-reports.types';
import { formatRelativeTime } from '@/utils/formatters';
import { isMergedDuplicateReport } from '@/utils/report-merge';
import { getReportStatusMeta } from '@/utils/report-status';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface MyReportListCardProps {
  item: MyReportItem;
  onPress: () => void;
  /** Tap riêng vào link báo cáo gốc (Duplicate) */
  onOpenPrimary?: () => void;
  /** Deep-link từ map: viền pulse vài giây để người dùng nhận ra đúng báo cáo vừa xem */
  highlighted?: boolean;
}

const SEVERITY_META: Record<MyReportSeverity, { label: string; textColor: string }> = {
  Low: { label: 'Mức thấp', textColor: '#166534' },
  Medium: { label: 'Mức trung bình', textColor: '#92400E' },
  High: { label: 'Mức cao', textColor: '#9A3412' },
  Critical: { label: 'Nghiêm trọng', textColor: '#991B1B' },
};

/**
 * Badge cho `Resolved` + `hasPendingReopenRequest` — tách khỏi `STATUS_META['Resolved']`
 * ("Cần xác nhận") vì lúc này người dùng không cần làm gì, đang chờ LEO xem xét.
 */
const PENDING_REOPEN_META = {
  label: 'Chờ duyệt mở lại',
  textColor: '#7C2D12',
  bgColor: '#FFEDD5',
  highlight: true,
};

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  waste: 'trash-outline',
  water_pollution: 'water-outline',
  air_pollution: 'cloud-outline',
  noise: 'volume-high-outline',
  other: 'leaf-outline',
};

/**
 * BR-REP-015: khi có yêu cầu mở lại đang chờ LEO, status vẫn là `Resolved` — nhưng người
 * dùng không cần xác nhận gì nữa (đã tự yêu cầu xử lý lại), nên tách riêng khỏi
 * "cần xác nhận" để không hiện nhầm nút Đóng/Mở lại.
 */
function isPendingReopenReview(item: MyReportItem): boolean {
  return item.status === 'Resolved' && Boolean(item.hasPendingReopenRequest);
}

function isNeedsConfirm(item: MyReportItem): boolean {
  if (isPendingReopenReview(item)) return false;
  return item.status === 'Resolved' || item.status === 'PenaltyIssued';
}

function isActiveWork(status: string): boolean {
  return ['Submitted', 'Verified', 'Dispatched', 'Assigned', 'InProgress', 'Reopened'].includes(
    status,
  );
}

function isClosed(status: string): boolean {
  return status === 'Closed' || status === 'ClosedNoViolation';
}

function isRejectedOnly(status: string): boolean {
  return status === 'Rejected';
}

function timelineCopy(item: MyReportItem): { icon: keyof typeof Ionicons.glyphMap; text: string } {
  if (isMergedDuplicateReport(item)) {
    const code = item.mergedIntoPrimaryReportCode?.trim();
    return {
      icon: 'link-outline',
      text: code
        ? `Trùng với ${code} — theo dõi tiến độ ở báo cáo đó`
        : 'Trùng với báo cáo khác — theo dõi tiến độ ở báo cáo đó',
    };
  }
  if (item.status === 'Duplicate') {
    return {
      icon: 'link-outline',
      text: 'Trùng với báo cáo khác và đã được gộp',
    };
  }
  if (isPendingReopenReview(item)) {
    return {
      icon: 'hourglass-outline',
      text: 'Yêu cầu mở lại đã gửi — đang chờ cán bộ xem xét',
    };
  }
  if (isNeedsConfirm(item)) {
    return { icon: 'checkmark-circle-outline', text: 'Đã hoàn thành — chờ bạn xác nhận' };
  }
  if (item.status === 'Reopened') {
    // BR-REP-015: yêu cầu mở lại đã được LEO duyệt — phân biệt với "Đang được xử lý"
    // thông thường để người dùng nhận ra đây là kết quả họ vừa yêu cầu.
    return { icon: 'refresh-circle-outline', text: 'Yêu cầu mở lại đã được chấp nhận — đang xử lý lại' };
  }
  if (item.status === 'InProgress') {
    return { icon: 'sync-outline', text: 'Đang được xử lý' };
  }
  if (item.status === 'Verified' || item.status === 'Assigned' || item.status === 'Dispatched') {
    return { icon: 'shield-checkmark-outline', text: 'Đã xác minh — chờ xử lý' };
  }
  if (item.status === 'Submitted') {
    return { icon: 'time-outline', text: 'Đã gửi — chờ xác minh' };
  }
  if (isClosed(item.status)) {
    return { icon: 'checkmark-done-outline', text: 'Đã hoàn thành' };
  }
  if (isRejectedOnly(item.status)) {
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

function MyReportListCardComponent({ item, onPress, onOpenPrimary, highlighted }: MyReportListCardProps) {
  const highlightOpacity = useSharedValue(0);

  useEffect(() => {
    if (!highlighted) {
      highlightOpacity.value = 0;
      return;
    }
    // Pulse 3 lần rồi tắt — đủ để mắt bắt được đúng card, không gây rối mắt kéo dài.
    highlightOpacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 400 })),
      3,
      false,
    );
  }, [highlighted, highlightOpacity]);

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  const pendingReopenReview = isPendingReopenReview(item);
  // `getReportStatusMeta('Resolved')` luôn trả label "Cần xác nhận" — sai khi đang chờ LEO
  // duyệt yêu cầu mở lại, lúc đó người dùng không cần làm gì cả nên phải ghi đè riêng.
  const statusMeta = pendingReopenReview ? PENDING_REOPEN_META : getReportStatusMeta(item.status);
  const severityMeta = SEVERITY_META[item.severity] ?? SEVERITY_META.Medium;
  const needsConfirm = isNeedsConfirm(item);
  const activeWork = isActiveWork(item.status) || pendingReopenReview;
  const merged = isMergedDuplicateReport(item);
  const categoryKey = (item.categoryCode ?? 'other').toLowerCase();
  const iconName = CATEGORY_ICON[categoryKey] ?? 'leaf-outline';
  const timeline = timelineCopy(item);
  // Dùng chung màu với badge (statusMeta) thay vì gọi lại statusTone(item.status) riêng —
  // hai nguồn tách biệt từng khiến badge và icon/timeline lệch màu khi pending reopen.
  const tone = statusMeta.textColor;
  const primaryCode = item.mergedIntoPrimaryReportCode?.trim();

  return (
    <View className="relative mb-2.5 overflow-hidden rounded-2xl bg-white px-4 py-3.5">
      {highlighted ? (
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 rounded-2xl border-2"
          style={[{ borderColor: colors.primary, backgroundColor: colors.primaryLight }, highlightStyle]}
        />
      ) : null}
      <TapScale onPress={onPress}>
        <View>
          <View className="mb-2.5 flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
              <Ionicons name="leaf-outline" size={14} color={colors.textSecondary} />
              <Text className="flex-1 text-[13px] font-semibold text-textPrimary" numberOfLines={1}>
                {item.categoryName}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
            </View>
            <View
              className="max-w-[46%] shrink-0 rounded-full px-2.5 py-1"
              style={{ backgroundColor: statusMeta.bgColor }}
            >
              <Text
                className="text-[11px] font-bold"
                style={{ color: statusMeta.textColor }}
                numberOfLines={1}
              >
                {statusMeta.label}
              </Text>
            </View>
          </View>

          <View className="mb-3 flex-row items-start gap-2 rounded-xl bg-surface px-3 py-2">
            <Ionicons name={timeline.icon} size={14} color={tone} style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-[12px] font-medium text-textPrimary">
                {formatRelativeTime(item.createdAt)}
                {item.resolvedAt && needsConfirm ? ' · Đã xử lý' : ''}
              </Text>
              <Text className="mt-0.5 text-[11px] leading-4 text-textSecondary" numberOfLines={3}>
                {timeline.text}
              </Text>
            </View>
          </View>

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

          {/*
            Badge ở đầu card đã nói rõ trạng thái — chân card chỉ nhắc việc người dùng
            cần làm, tránh lặp lại cùng một thông tin hai lần.
          */}
          {needsConfirm ? (
            <View className="mt-3 flex-row items-center justify-end gap-1 border-t border-border/60 pt-2.5">
              <Text className="text-[13px] font-bold" style={{ color: statusMeta.textColor }}>
                Xác nhận kết quả
              </Text>
              <Ionicons name="arrow-forward" size={14} color={statusMeta.textColor} />
            </View>
          ) : null}
        </View>
      </TapScale>

      {merged && primaryCode ? (
        <Pressable
          onPress={onOpenPrimary ?? onPress}
          className="mt-3 flex-row items-center gap-1.5"
          hitSlop={6}
        >
          <Text className="text-[12px] font-medium text-primary" numberOfLines={1}>
            Mở {primaryCode}
          </Text>
          <Ionicons name="arrow-forward" size={13} color={colors.primary} />
        </Pressable>
      ) : null}

      <View className="mt-3 flex-row items-center justify-end gap-2">
        {needsConfirm ? (
          <>
            <ActionBtn label="Xem chi tiết" variant="ghost" onPress={onPress} />
            <ActionBtn label="Xác nhận" variant="primary" onPress={onPress} />
          </>
        ) : activeWork ? (
          <ActionBtn label="Theo dõi" variant="outline" onPress={onPress} />
        ) : merged ? (
          <ActionBtn
            label={primaryCode ? `Mở ${primaryCode}` : 'Mở báo cáo gốc'}
            variant="outline"
            onPress={onOpenPrimary ?? onPress}
          />
        ) : isRejectedOnly(item.status) ? (
          <ActionBtn label="Xem lý do" variant="ghost" onPress={onPress} />
        ) : item.status === 'Duplicate' ? (
          <ActionBtn label="Xem chi tiết" variant="ghost" onPress={onPress} />
        ) : (
          <ActionBtn label="Xem lại" variant="outline" onPress={onPress} />
        )}
      </View>
    </View>
  );
}

export const MyReportListCard = memo(MyReportListCardComponent);
