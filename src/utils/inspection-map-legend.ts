import { colors } from '@/theme/colors';
import type { InspectionStatus } from '@/types/inspection.types';

/** Màu pin theo giai đoạn xử lý — dùng chung cho marker và legend trên map. */
export const INSPECTION_STATUS_MAP_COLOR: Record<InspectionStatus, string> = {
  Draft: colors.warning,
  InProgress: colors.info,
  PenaltyIssued: '#8B5CF6',
  PartiallyPaid: '#8B5CF6',
  Overdue: colors.error,
  Paid: colors.primary,
  Closed: colors.textSecondary,
  ClosedNoViolation: colors.textSecondary,
};

export interface MapLegendItem {
  status: InspectionStatus;
  label: string;
  color: string;
}

/** Rút gọn — gộp PartiallyPaid vào PenaltyIssued, Closed/ClosedNoViolation vào một dòng. */
export const MAP_LEGEND_ITEMS: readonly MapLegendItem[] = [
  { status: 'Draft', label: 'Chờ nhận', color: INSPECTION_STATUS_MAP_COLOR.Draft },
  { status: 'InProgress', label: 'Đang điều tra', color: INSPECTION_STATUS_MAP_COLOR.InProgress },
  { status: 'PenaltyIssued', label: 'Chờ nộp phạt', color: INSPECTION_STATUS_MAP_COLOR.PenaltyIssued },
  { status: 'Overdue', label: 'Quá hạn', color: INSPECTION_STATUS_MAP_COLOR.Overdue },
  { status: 'Paid', label: 'Chờ đóng', color: INSPECTION_STATUS_MAP_COLOR.Paid },
  { status: 'Closed', label: 'Đã đóng', color: INSPECTION_STATUS_MAP_COLOR.Closed },
] as const;
