import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SlaCountdown } from '@/shared/components/SlaCountdown';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { colors } from '@/theme/colors';
import type { InspectionDetail } from '@/types/inspection.types';

interface InspectionCaseHeaderProps {
  detail: InspectionDetail;
}

interface FactRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

function FactRow({ label, value, isLast = false }: FactRowProps) {
  return (
    <View
      className="flex-row justify-between gap-3 py-2.5"
      style={!isLast ? { borderBottomWidth: 1, borderBottomColor: colors.border } : undefined}
    >
      <Text className="text-xs text-textSecondary">{label}</Text>
      <Text className="flex-1 text-right text-xs font-semibold text-textPrimary">{value}</Text>
    </View>
  );
}

/** Khối nhận dạng hồ sơ — section phẳng, dữ kiện dạng bảng. */
export function InspectionCaseHeader({ detail }: InspectionCaseHeaderProps) {
  const facts: FactRowProps[] = [
    { label: 'Đoàn phụ trách', value: detail.assignedTeamName ?? 'Chưa gán đoàn' },
  ];
  if (detail.violatorAddress) facts.push({ label: 'Địa chỉ hiện trường', value: detail.violatorAddress });
  if (detail.violatorIdentity) facts.push({ label: 'Mã số / CCCD', value: detail.violatorIdentity });
  if (detail.createdByOfficerName) facts.push({ label: 'Cán bộ lập hồ sơ', value: detail.createdByOfficerName });
  if (detail.penaltyDecisionNumber) facts.push({ label: 'Số quyết định', value: detail.penaltyDecisionNumber });
  if (detail.penaltyAmount != null) {
    facts.push({ label: 'Tiền phạt', value: `${detail.penaltyAmount.toLocaleString('vi-VN')} ₫` });
  }
  if (detail.paidAmount != null) {
    facts.push({ label: 'Đã nộp', value: `${detail.paidAmount.toLocaleString('vi-VN')} ₫` });
  }
  if (detail.penaltyDueDate) {
    facts.push({ label: 'Hạn nộp phạt', value: new Date(detail.penaltyDueDate).toLocaleDateString('vi-VN') });
  }

  return (
    <View>
      <View className="mb-2.5 flex-row items-center justify-between">
        <Text className="font-mono text-xs tracking-wide text-textSecondary">
          {detail.reportCode}
        </Text>
        <StatusBadge kind="inspection" status={detail.status} />
      </View>

      <Text className="text-lg font-bold leading-6 text-textPrimary">
        {detail.violatorName || 'Chưa xác định đối tượng'}
      </Text>

      {detail.isRepeatOffender ? (
        <View className="mt-1.5 flex-row items-center gap-1">
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ color: colors.error }}>
            Đối tượng tái phạm
          </Text>
        </View>
      ) : null}

      {detail.slaInspectionDueAt ? (
        <View className="mt-3">
          <SlaCountdown dueAt={detail.slaInspectionDueAt} />
        </View>
      ) : null}

      <View className="mt-3">
        {facts.map((fact, index) => (
          <FactRow key={fact.label} {...fact} isLast={index === facts.length - 1} />
        ))}
      </View>
    </View>
  );
}
