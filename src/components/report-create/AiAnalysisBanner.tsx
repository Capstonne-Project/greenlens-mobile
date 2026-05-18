import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { AiAnalyzeResult, AiDecision } from '@/types/pollution-report.types';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

interface AiAnalysisBannerProps {
  aiResult: AiAnalyzeResult;
}

const DECISION_META: Record<AiDecision, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ACCEPTABLE_REPORT_IMAGE: {
    label: 'Ảnh hợp lệ',
    color: colors.success,
    icon: 'checkmark-circle',
  },
  NEED_MANUAL_REVIEW: {
    label: 'Cần xem xét thêm',
    color: colors.warning,
    icon: 'alert-circle',
  },
  IRRELEVANT_OR_SUSPECTED_ABUSIVE: {
    label: 'Ảnh không phù hợp',
    color: colors.error,
    icon: 'close-circle',
  },
};

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Khẩn cấp',
};

const SEVERITY_COLOR: Record<string, string> = {
  LOW: colors.severityLow,
  MEDIUM: colors.severityMedium,
  HIGH: colors.severityHigh,
  CRITICAL: colors.severityCritical,
};

export function AiAnalysisBanner({ aiResult }: AiAnalysisBannerProps) {
  const meta = DECISION_META[aiResult.decision];
  const { classify } = aiResult;

  return (
    <View className="overflow-hidden rounded-2xl bg-white">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text className="flex-1 text-sm font-semibold text-textPrimary">Phân tích AI</Text>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name={meta.icon} size={16} color={meta.color} />
          <Text className="text-sm font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row px-4 py-3 gap-4">
        {/* Confidence */}
        <View className="flex-1">
          <Text className="text-xs text-textSecondary">Độ tin cậy</Text>
          <Text className="mt-0.5 text-base font-bold text-textPrimary">
            {Math.round(classify.confidence * 100)}%
          </Text>
        </View>

        {/* Severity */}
        <View className="flex-1">
          <Text className="text-xs text-textSecondary">Mức độ gợi ý</Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SEVERITY_COLOR[classify.severity] ?? colors.border }}
            />
            <Text className="text-sm font-semibold text-textPrimary">
              {SEVERITY_LABEL[classify.severity] ?? classify.severity}
            </Text>
          </View>
        </View>

        {/* Coverage */}
        <View className="flex-1">
          <Text className="text-xs text-textSecondary">Vùng phủ</Text>
          <Text className="mt-0.5 text-base font-bold text-textPrimary">
            {Math.round(classify.pollutionCoverageRatio * 100)}%
          </Text>
        </View>
      </View>

      {/* Reason */}
      {aiResult.reason ? (
        <View className="px-4 pb-3">
          <Text className="text-xs text-textSecondary">{aiResult.reason}</Text>
        </View>
      ) : null}
    </View>
  );
}
