import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { AssignmentItem, AssignmentStatus } from '@/types/cleanup-assignment.types';

const STATUS_META: Record<AssignmentStatus, { label: string; color: string; bg: string }> = {
  Assigned: { label: 'Chờ nhận', color: '#1E40AF', bg: '#DBEAFE' },
  InProgress: { label: 'Đang xử lý', color: '#92400E', bg: '#FEF3C7' },
  Completed: { label: 'Hoàn thành', color: '#065F46', bg: '#D1FAE5' },
  Declined: { label: 'Từ chối', color: '#991B1B', bg: '#FEE2E2' },
  Escalated: { label: 'Chuyển cấp', color: '#6D28D9', bg: '#EDE9FE' },
};

const SEVERITY_ACCENT: Record<string, string> = {
  Low: colors.severityLow,
  Medium: colors.severityMedium,
  High: colors.severityHigh,
  Critical: colors.severityCritical,
};

/** Chặng hiện tại trên chuỗi Giao → Xử lý → Xong. Declined/Escalated là nhánh rẽ, dừng tại chặng đang đứng. */
const STAGE_OF: Record<AssignmentStatus, number> = {
  Assigned: 1,
  InProgress: 2,
  Completed: 3,
  Declined: 1,
  Escalated: 2,
};

const STAGE_LABELS = ['Giao', 'Xử lý', 'Xong'];

function formatSla(slaIso: string): { text: string; overdue: boolean } {
  const diff = new Date(slaIso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const compact = h > 0 ? `${h}h` : `${m}m`;
  return diff <= 0 ? { text: `Quá ${compact}`, overdue: true } : { text: `Còn ${compact}`, overdue: false };
}

function StageNode({ state }: { state: 'done' | 'current' | 'todo' }) {
  if (state === 'done') {
    return (
      <View
        className="h-5 w-5 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.primary }}
      >
        <Ionicons name="checkmark" size={12} color={colors.white} />
      </View>
    );
  }

  if (state === 'current') {
    return (
      <View
        className="h-5 w-5 items-center justify-center rounded-full border-2"
        style={{ borderColor: colors.primary, backgroundColor: colors.white }}
      >
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
      </View>
    );
  }

  return (
    <View
      className="h-5 w-5 rounded-full border-2"
      style={{ borderColor: colors.border, backgroundColor: colors.white }}
    />
  );
}

function StageStepper({ status }: { status: AssignmentStatus }) {
  const stage = STAGE_OF[status];
  const isBranch = status === 'Declined' || status === 'Escalated';

  const stateFor = (step: number): 'done' | 'current' | 'todo' => {
    if (isBranch) return step < stage ? 'done' : step === stage ? 'current' : 'todo';
    if (step < stage) return 'done';
    if (step === stage) return stage === 3 ? 'done' : 'current';
    return 'todo';
  };

  return (
    <View>
      <View className="flex-row items-center">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <StageNode state={stateFor(step)} />
            {step < 3 ? (
              <View
                className="h-0.5 flex-1 rounded-full"
                style={{ backgroundColor: step < stage ? colors.primary : colors.border }}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      <View className="mt-1 flex-row">
        {STAGE_LABELS.map((label, index) => (
          <Text
            key={label}
            className="flex-1 text-[10px] font-semibold"
            style={{
              color: index + 1 <= stage && !isBranch ? colors.textPrimary : colors.textSecondary,
              textAlign: index === 0 ? 'left' : index === 1 ? 'center' : 'right',
            }}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

interface TaskProgressCardProps {
  item: AssignmentItem;
  onPress: (item: AssignmentItem) => void;
}

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

  return (
    <Animated.View style={animStyle} className="mb-3">
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress(item)}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 300 });
        }}
        className="flex-row overflow-hidden rounded-2xl bg-white"
        style={{
          elevation: 2,
          shadowColor: '#0F172A',
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <View style={{ width: 4, backgroundColor: accent }} />

        <View className="flex-1 p-3.5">
          <View className="flex-row items-start gap-2">
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-textPrimary" numberOfLines={1}>
                {item.categoryName}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
                <Text className="flex-1 text-xs text-textSecondary" numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            </View>
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: meta.bg }}>
              <Text className="text-[10px] font-bold" style={{ color: meta.color }}>
                {meta.label}
              </Text>
            </View>
          </View>

          <View className="mt-3">
            <StageStepper status={item.assignmentStatus} />
          </View>

          <View className="mt-2.5 flex-row items-center justify-between border-t border-border pt-2.5">
            <Text className="text-[10px] text-textSecondary">{item.reportCode}</Text>
            <View className="flex-row items-center gap-2">
              {sla ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons
                    name={sla.overdue ? 'alert-circle' : 'time-outline'}
                    size={12}
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
              <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});
