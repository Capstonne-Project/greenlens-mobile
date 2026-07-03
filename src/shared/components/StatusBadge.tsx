import { Text, View } from 'react-native';

import { getReportStatusMeta } from '@/utils/report-status';
import { getInspectionStatusMeta } from '@/utils/inspection-status';
import type { AssignmentStatus } from '@/types/cleanup-assignment.types';

export type StatusBadgeKind = 'report' | 'assignment' | 'inspection';

interface StatusBadgeProps {
  kind: StatusBadgeKind;
  status: string;
  className?: string;
}

const ASSIGNMENT_META: Record<AssignmentStatus, { label: string; textColor: string; bgColor: string }> = {
  Assigned: { label: 'Mới giao', textColor: '#1E40AF', bgColor: '#DBEAFE' },
  InProgress: { label: 'Đang xử lý', textColor: '#065F46', bgColor: '#D1FAE5' },
  Completed: { label: 'Hoàn thành', textColor: '#374151', bgColor: '#F3F4F6' },
  Declined: { label: 'Từ chối', textColor: '#991B1B', bgColor: '#FEE2E2' },
};

function resolveMeta(kind: StatusBadgeKind, status: string) {
  if (kind === 'report') return getReportStatusMeta(status);
  if (kind === 'inspection') return getInspectionStatusMeta(status);
  return ASSIGNMENT_META[status as AssignmentStatus] ?? {
    label: status,
    textColor: '#6B7280',
    bgColor: '#F3F4F6',
  };
}

export function StatusBadge({ kind, status, className }: StatusBadgeProps) {
  const meta = resolveMeta(kind, status);
  return (
    <View className={`rounded-full px-2.5 py-1 ${className ?? ''}`} style={{ backgroundColor: meta.bgColor }}>
      <Text className="text-[11px] font-semibold" style={{ color: meta.textColor }}>
        {meta.label}
      </Text>
    </View>
  );
}
