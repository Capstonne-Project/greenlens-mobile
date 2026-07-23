import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TapScale } from '@/components/layout/TapScale';
import { colors } from '@/theme/colors';
import type { PollutionSeverity } from '@/types/pollution-report.types';

interface SeverityPillGroupProps {
  value: PollutionSeverity | null;
  suggestedValue?: PollutionSeverity | null;
  onChange: (severity: PollutionSeverity) => void;
}

const SEVERITY_OPTIONS: {
  value: PollutionSeverity;
  label: string;
  accent: string;
}[] = [
  { value: 'Low', label: 'Thấp', accent: colors.severityLow },
  { value: 'Medium', label: 'TB', accent: colors.severityMedium },
  { value: 'High', label: 'Cao', accent: colors.severityHigh },
  { value: 'Critical', label: 'Khẩn', accent: colors.severityCritical },
];

export function SeverityPillGroup({
  value,
  suggestedValue = null,
  onChange,
}: SeverityPillGroupProps) {
  return (
    <View className="flex-row" style={{ gap: 8 }}>
      {SEVERITY_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const isSuggested = suggestedValue === option.value;

        return (
          <View key={option.value} className="flex-1">
            <TapScale onPress={() => onChange(option.value)}>
              <View
                className={`items-center rounded-xl border px-1 py-2 ${
                  isSelected ? 'border-primary bg-primary/10' : 'border-border bg-surface'
                }`}
              >
                <View
                  className="mb-1.5 h-1.5 w-6 rounded-full"
                  style={{ backgroundColor: option.accent }}
                />
                <Text
                  className={`text-center text-[12px] font-semibold ${
                    isSelected ? 'text-textPrimary' : 'text-textSecondary'
                  }`}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                {isSuggested ? (
                  <Ionicons name="sparkles" size={10} color={colors.primary} style={{ marginTop: 2 }} />
                ) : (
                  <View style={{ height: 12 }} />
                )}
              </View>
            </TapScale>
          </View>
        );
      })}
    </View>
  );
}
