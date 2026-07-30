import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { AssignmentItem, AssignmentStatus } from '@/types/cleanup-assignment.types';

const STATUS_META: Record<
  AssignmentStatus,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; percent: number }
> = {
  Assigned: { label: 'Chờ nhận', color: '#1E40AF', bg: '#DBEAFE', icon: 'mail-unread-outline', percent: 10 },
  InProgress: { label: 'Đang xử lý', color: '#92400E', bg: '#FEF3C7', icon: 'construct-outline', percent: 55 },
  Completed: { label: 'Hoàn thành', color: '#065F46', bg: '#D1FAE5', icon: 'checkmark-circle', percent: 100 },
  Declined: { label: 'Từ chối', color: '#991B1B', bg: '#FEE2E2', icon: 'close-circle-outline', percent: 0 },
  Escalated: { label: 'Chuyển cấp', color: '#6D28D9', bg: '#EDE9FE', icon: 'arrow-up-circle-outline', percent: 55 },
};

const SEVERITY_ACCENT: Record<string, string> = {
  Low: colors.severityLow,
  Medium: colors.severityMedium,
  High: colors.severityHigh,
  Critical: colors.severityCritical,
};

const SEVERITY_LABEL: Record<string, string> = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
  Critical: 'Nghiêm trọng',
};

function formatSla(slaIso: string): { text: string; overdue: boolean } {
  const diff = new Date(slaIso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const compact = h > 0 ? `${h}h` : `${m}m`;
  return diff <= 0 ? { text: `Quá ${compact}`, overdue: true } : { text: `Còn ${compact}`, overdue: false };
}

interface TaskProgressCardProps {
  item: AssignmentItem;
  onPress: (item: AssignmentItem) => void;
}

/**
 * Thẻ nhiệm vụ trong danh sách tiến độ — gọn 1 khối, tiến độ thể hiện bằng
 * thanh mảnh thay vì stepper 3 chặng chiếm nhiều chiều cao.
 */
export const TaskProgressCard = React.memo(function TaskProgressCard({
  item,
  onPress,
}: TaskProgressCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const meta = STATUS_META[item.assignmentStatus];
  const accent = SEVERITY_ACCENT[item.severity] ?? colors.border;
  const sla =
    item.slaResolveDueAt && item.assignmentStatus !== 'Completed'
      ? formatSla(item.slaResolveDueAt)
      : null;

  const isBranch = item.assignmentStatus === 'Declined' || item.assignmentStatus === 'Escalated';

  return (
    <Animated.View style={animStyle} className="mb-2.5">
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress(item)}
        onPressIn={() => {
          scale.value = withSpring(0.985, { damping: 18, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 300 });
        }}
        className="overflow-hidden rounded-2xl bg-white"
        style={{
          elevation: 2,
          shadowColor: '#0F172A',
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
        }}
      >
        <View className="flex-row items-center gap-3 px-3.5 py-3">
          {/* Chấm mức độ — thay dải màu dọc, gọn hơn và vẫn đọc được mức độ */}
          <View className="items-center">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          </View>

          <View className="min-w-0 flex-1">
            {/* Hàng 1: tên loại + trạng thái */}
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-[14px] font-bold text-textPrimary" numberOfLines={1}>
                {item.categoryName}
              </Text>
              <View
                className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                style={{ backgroundColor: meta.bg }}
              >
                <Ionicons name={meta.icon} size={9} color={meta.color} />
                <Text className="text-[10px] font-bold" style={{ color: meta.color }}>
                  {meta.label}
                </Text>
              </View>
            </View>

            {/* Hàng 2: địa chỉ */}
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="location-outline" size={10} color={colors.textSecondary} />
              <Text className="flex-1 text-[11px] text-textSecondary" numberOfLines={1}>
                {item.address}
              </Text>
            </View>

            {/* Hàng 3: thanh tiến độ mảnh */}
            <View className="mt-2 h-1 overflow-hidden rounded-full" style={{ backgroundColor: colors.border }}>
              <View
                className="h-full rounded-full"
                style={{
                  width: `${meta.percent}%` as `${number}%`,
                  backgroundColor: isBranch ? meta.color : colors.primary,
                }}
              />
            </View>

            {/* Hàng 4: meta phụ */}
            <View className="mt-1.5 flex-row items-center gap-2">
              <Text className="text-[10px] text-textDisabled">{item.reportCode}</Text>
              <Text className="text-[10px] text-textDisabled">·</Text>
              <Text className="text-[10px] text-textDisabled">
                {SEVERITY_LABEL[item.severity] ?? item.severity}
              </Text>
              <View className="flex-1" />
              {sla ? (
                <View className="flex-row items-center gap-0.5">
                  <Ionicons
                    name={sla.overdue ? 'alert-circle' : 'time-outline'}
                    size={11}
                    color={sla.overdue ? colors.error : colors.textSecondary}
                  />
                  <Text
                    className="text-[10px] font-bold"
                    style={{ color: sla.overdue ? colors.error : colors.textSecondary }}
                  >
                    {sla.text}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <Ionicons name="chevron-forward" size={15} color={colors.textDisabled} />
        </View>
      </Pressable>
    </Animated.View>
  );
});
