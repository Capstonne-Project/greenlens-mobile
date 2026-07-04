import type { InspectionStatus } from '@/types/inspection.types';

export interface StatusMeta {
  label: string;
  textColor: string;
  bgColor: string;
}

const INSPECTION_STATUS_META: Record<InspectionStatus, StatusMeta> = {
  Draft: { label: 'Nháp', textColor: '#374151', bgColor: '#F3F4F6' },
  PenaltyIssued: { label: 'Đã ban hành QĐ phạt', textColor: '#92400E', bgColor: '#FEF3C7' },
  Paid: { label: 'Đã nộp phạt', textColor: '#065F46', bgColor: '#D1FAE5' },
  PartiallyPaid: { label: 'Nộp một phần', textColor: '#1D4ED8', bgColor: '#DBEAFE' },
  Overdue: { label: 'Quá hạn nộp phạt', textColor: '#991B1B', bgColor: '#FEE2E2' },
  Closed: { label: 'Đã đóng hồ sơ', textColor: '#374151', bgColor: '#F3F4F6' },
  ClosedNoViolation: { label: 'Không đủ căn cứ', textColor: '#374151', bgColor: '#F3F4F6' },
};

export function getInspectionStatusMeta(status: string): StatusMeta {
  return INSPECTION_STATUS_META[status as InspectionStatus] ?? {
    label: status,
    textColor: '#6B7280',
    bgColor: '#F3F4F6',
  };
}
