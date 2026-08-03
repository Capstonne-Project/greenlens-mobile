import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { InspectionStatus } from '@/types/inspection.types';

export interface StatusDistributionRow {
  status: InspectionStatus;
  label: string;
  count: number;
  color: string;
}

interface StatusDistributionCardProps {
  rows: StatusDistributionRow[];
  /** Mẫu số để tính chiều dài thanh. */
  total: number;
  onSelectStatus: (status: InspectionStatus) => void;
}

interface RowProps {
  row: StatusDistributionRow;
  total: number;
  onPress: () => void;
}

function DistributionRow({ row, total, onPress }: RowProps) {
  const width = total > 0 ? (row.count / total) * 100 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.label}: ${row.count} hồ sơ`}
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3"
    >
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
      <Text className="w-[86px] text-xs font-medium text-textSecondary" numberOfLines={1}>
        {row.label}
      </Text>
      <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
        <View style={{ width: `${width}%`, backgroundColor: row.color }} className="h-full rounded-full" />
      </View>
      <Text className="w-6 text-right text-sm font-bold text-textPrimary">{row.count}</Text>
    </Pressable>
  );
}

/** Phân bố hồ sơ theo trạng thái — tap một dòng để mở tab Hồ sơ đã lọc. */
export function StatusDistributionCard({
  rows,
  total,
  onSelectStatus,
}: StatusDistributionCardProps) {
  const hasData = rows.some((r) => r.count > 0);

  return (
    <View>
      <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
        Phân bố trạng thái
      </Text>

      {hasData ? (
        rows.map((row) => (
          <DistributionRow
            key={row.status}
            row={row}
            total={total}
            onPress={() => onSelectStatus(row.status)}
          />
        ))
      ) : (
        <Text className="py-2 text-xs text-textSecondary">Chưa có hồ sơ nào trong đoàn.</Text>
      )}
    </View>
  );
}

/** Màu và nhãn cho các trạng thái hiển thị trên biểu đồ phân bố. */
export const DISTRIBUTION_STATUSES: readonly {
  status: InspectionStatus;
  label: string;
  color: string;
}[] = [
  { status: 'Draft', label: 'Chờ nhận', color: colors.warning },
  { status: 'InProgress', label: 'Đang điều tra', color: colors.info },
  { status: 'PenaltyIssued', label: 'Chờ nộp phạt', color: '#8B5CF6' },
  { status: 'Overdue', label: 'Quá hạn', color: colors.error },
  { status: 'Paid', label: 'Chờ đóng', color: colors.primary },
  { status: 'Closed', label: 'Đã đóng', color: colors.textSecondary },
] as const;
