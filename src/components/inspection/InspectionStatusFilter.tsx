import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { InspectionStatus } from '@/types/inspection.types';

/** `null` = tất cả. Nhóm theo giai đoạn xử lý, không liệt kê hết enum. */
export type InspectionFilterValue = InspectionStatus | null;

interface FilterOption {
  value: InspectionFilterValue;
  label: string;
}

const FILTERS: readonly FilterOption[] = [
  { value: null, label: 'Tất cả' },
  { value: 'Draft', label: 'Chờ nhận' },
  { value: 'InProgress', label: 'Đang điều tra' },
  { value: 'PenaltyIssued', label: 'Chờ nộp phạt' },
  { value: 'Overdue', label: 'Quá hạn' },
  { value: 'Paid', label: 'Chờ đóng' },
  { value: 'Closed', label: 'Đã đóng' },
] as const;

interface InspectionStatusFilterProps {
  value: InspectionFilterValue;
  onChange: (value: InspectionFilterValue) => void;
}

/** Tab trạng thái dạng gạch chân — giống ProfileTabButton bên Citizen. */
export function InspectionStatusFilter({ value, onChange }: InspectionStatusFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      {FILTERS.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.value)}
            className="items-center border-b-2 px-3 pb-2.5 pt-1"
            style={{ borderColor: isActive ? colors.primary : 'transparent' }}
          >
            <Text
              className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}
              style={{ color: isActive ? colors.primary : colors.textSecondary }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
