import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SlaCountdown } from '@/shared/components/SlaCountdown';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { colors } from '@/theme/colors';
import type { InspectionQueueItem } from '@/types/inspection.types';

interface InspectionDossierCardProps {
  item: InspectionQueueItem;
  onPress: (id: string) => void;
}

/**
 * Card hồ sơ thanh tra — viền trái theo trạng thái, mã hồ sơ dạng mono,
 * nhấn mạnh tái phạm & quá hạn.
 */
function InspectionDossierCardBase({ item, onPress }: InspectionDossierCardProps) {
  const isOverdue = item.status === 'Overdue';
  const isUnclaimed = item.status === 'Draft';
  const accent = isOverdue ? colors.error : isUnclaimed ? colors.warning : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Hồ sơ ${item.reportCode}`}
      onPress={() => onPress(item.id)}
      className="mx-4 mb-3 flex-row overflow-hidden rounded-2xl border border-border bg-white"
    >
      <View style={{ width: 4, backgroundColor: accent }} />

      <View className="flex-1 p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-mono text-xs tracking-wide text-textSecondary">
            {item.reportCode}
          </Text>
          <StatusBadge kind="inspection" status={item.status} />
        </View>

        <Text className="mb-1 text-base font-bold leading-5 text-textPrimary" numberOfLines={2}>
          {item.violatorName || 'Chưa xác định đối tượng'}
        </Text>

        <View className="mb-2 flex-row items-start gap-1.5">
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} style={{ marginTop: 2 }} />
          <Text className="flex-1 text-xs leading-4 text-textSecondary" numberOfLines={2}>
            {item.address ?? 'Chưa có địa chỉ'}
          </Text>
        </View>

        {item.isRepeatOffender ? (
          <View className="mb-2 flex-row items-center gap-1">
            <Ionicons name="alert-circle" size={13} color={colors.error} />
            <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ color: colors.error }}>
              Tái phạm
            </Text>
          </View>
        ) : null}

        {item.penaltyAmount != null ? (
          <Text className="mb-2 text-sm font-bold text-textPrimary">
            {item.penaltyAmount.toLocaleString('vi-VN')} ₫
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between border-t border-border pt-2.5">
          {item.slaInspectionDueAt ? (
            <SlaCountdown dueAt={item.slaInspectionDueAt} />
          ) : (
            <Text className="text-[11px] text-textDisabled">Không có SLA</Text>
          )}
          <Text className="text-[11px] text-textSecondary">
            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const InspectionDossierCard = memo(InspectionDossierCardBase);
