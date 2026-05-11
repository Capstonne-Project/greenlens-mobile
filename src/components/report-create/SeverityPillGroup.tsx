import { Text, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import { colors } from '@/theme/colors';
import type { PollutionSeverity } from '@/types/pollution-report.types';

interface SeverityPillGroupProps {
  value: PollutionSeverity | null;
  onChange: (severity: PollutionSeverity) => void;
}

const SEVERITY_OPTIONS: {
  value: PollutionSeverity;
  label: string;
  accent: string;
}[] = [
  { value: 'Low', label: 'Thấp', accent: colors.severityLow },
  { value: 'Medium', label: 'Trung bình', accent: colors.severityMedium },
  { value: 'High', label: 'Cao', accent: colors.severityHigh },
  { value: 'Critical', label: 'Khẩn cấp', accent: colors.severityCritical },
];

export function SeverityPillGroup({ value, onChange }: SeverityPillGroupProps) {
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        {SEVERITY_OPTIONS.slice(0, 2).map((option) => (
          <SeverityOption
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
      <View className="flex-row gap-2">
        {SEVERITY_OPTIONS.slice(2).map((option) => (
          <SeverityOption
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

interface SeverityOptionProps {
  option: (typeof SEVERITY_OPTIONS)[number];
  isSelected: boolean;
  onPress: () => void;
}

function SeverityOption({ option, isSelected, onPress }: SeverityOptionProps) {
  return (
    <View className="flex-1">
      <TapScale onPress={onPress}>
        <View
          className={`items-center rounded-2xl border px-3 py-3 ${
            isSelected ? 'border-primary bg-primary/10' : 'border-border bg-surface'
          }`}
        >
          <View
            className="mb-2 h-2 w-8 rounded-full"
            style={{ backgroundColor: option.accent }}
          />
          <Text
            className={`text-center text-sm font-semibold ${
              isSelected ? 'text-textPrimary' : 'text-textSecondary'
            }`}
          >
            {option.label}
          </Text>
        </View>
      </TapScale>
    </View>
  );
}
