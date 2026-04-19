import { View, Text } from 'react-native';
import type { ReportSeverity, ReportStatus } from '@/types/report.types';

const severityConfig: Record<ReportSeverity, { bg: string; text: string; label: string }> = {
  low:      { bg: 'bg-[#86EFAC]', text: 'text-[#166534]', label: 'Thấp' },
  medium:   { bg: 'bg-[#FDE047]', text: 'text-[#713F12]', label: 'Trung bình' },
  high:     { bg: 'bg-[#FB923C]', text: 'text-white',     label: 'Cao' },
  critical: { bg: 'bg-error',     text: 'text-white',     label: 'Nghiêm trọng' },
};

const statusConfig: Record<ReportStatus, { bg: string; text: string; label: string }> = {
  pending:     { bg: 'bg-[#FDE047]', text: 'text-[#713F12]', label: 'Chờ xác minh' },
  verified:    { bg: 'bg-primary-light', text: 'text-primary', label: 'Đã xác minh' },
  in_progress: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]', label: 'Đang xử lý' },
  resolved:    { bg: 'bg-primary-light', text: 'text-primary-dark', label: 'Đã giải quyết' },
  rejected:    { bg: 'bg-[#FEE2E2]', text: 'text-error', label: 'Từ chối' },
};

interface SeverityBadgeProps { severity: ReportSeverity }
interface StatusBadgeProps   { status: ReportStatus }

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const c = severityConfig[severity];
  return (
    <View className={`${c.bg} px-2 py-0.5 rounded-full`}>
      <Text className={`${c.text} text-xs font-medium`}>{c.label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = statusConfig[status];
  return (
    <View className={`${c.bg} px-2 py-0.5 rounded-full`}>
      <Text className={`${c.text} text-xs font-medium`}>{c.label}</Text>
    </View>
  );
}
