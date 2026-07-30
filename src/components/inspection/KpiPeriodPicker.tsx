import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/ui/text';
import type { KpiPeriod } from '@/types/inspection-kpi.types';

const PERIODS: readonly { value: KpiPeriod; label: string }[] = [
  { value: 'ThisMonth', label: 'Tháng này' },
  { value: 'LastMonth', label: 'Tháng trước' },
  { value: 'ThisQuarter', label: 'Quý này' },
  { value: 'LastQuarter', label: 'Quý trước' },
  { value: 'ThisYear', label: 'Năm nay' },
  { value: 'LastYear', label: 'Năm trước' },
] as const;

interface KpiPeriodPickerProps {
  value: KpiPeriod;
  onChange: (value: KpiPeriod) => void;
}

export function KpiPeriodPicker({ value, onChange }: KpiPeriodPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      {PERIODS.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(option.value);
            }}
            className={`rounded-full border px-3.5 py-2 ${
              isActive ? 'border-primary bg-primary' : 'border-border bg-white'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-textSecondary'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
