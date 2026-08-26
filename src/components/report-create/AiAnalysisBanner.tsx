import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { AiAnalyzeResult, AiDecision } from '@/types/pollution-report.types';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

interface AiAnalysisBannerProps {
  aiResult: AiAnalyzeResult;
  /** Compact one-row chip for accordion sections. */
  compact?: boolean;
}

const DECISION_META: Record<AiDecision, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ACCEPTABLE_REPORT_IMAGE: {
    label: 'Hợp lệ',
    color: colors.success,
    icon: 'checkmark-circle',
  },
  NEED_MANUAL_REVIEW: {
    label: 'Cần xem xét',
    color: colors.warning,
    icon: 'alert-circle',
  },
  IRRELEVANT_OR_SUSPECTED_ABUSIVE: {
    label: 'Không phù hợp',
    color: colors.error,
    icon: 'close-circle',
  },
};

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'TB',
  HIGH: 'Cao',
  CRITICAL: 'Khẩn',
};

const TRASH_SUBTYPE_LABEL: Record<string, string> = {
  CONSTRUCTION: 'Rác xây dựng',
  ELECTRONIC: 'Rác điện tử',
  HAZARDOUS: 'Rác nguy hại',
  HOUSEHOLD: 'Rác sinh hoạt',
  MEDICAL: 'Rác y tế',
  ORGANIC: 'Rác hữu cơ',
  RECYCLABLE: 'Rác tái chế',
};

export function AiAnalysisBanner({ aiResult, compact = false }: AiAnalysisBannerProps) {
  const meta = DECISION_META[aiResult.decision];
  const { classify } = aiResult;
  const confidencePct = Math.round(classify.confidence * 100);
  const severityLabel = SEVERITY_LABEL[classify.severity] ?? classify.severity;
  const topSubtype = classify.predictions
    ?.find((p) => p.class === 'TRASH')
    ?.subtypes?.[0];

  if (compact) {
    return (
      <View className="flex-row items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
        <Ionicons name="sparkles" size={14} color={colors.primary} />
        <Text className="flex-1 text-[12px] text-textSecondary" numberOfLines={1}>
          AI · {confidencePct}% · {severityLabel}
        </Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name={meta.icon} size={14} color={meta.color} />
          <Text className="text-[12px] font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-white">
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

      <View className="flex-row gap-4 px-4 py-3">
        <View className="flex-1">
          <Text className="text-xs text-textSecondary">Độ tin cậy</Text>
          <Text className="mt-0.5 text-base font-bold text-textPrimary">{confidencePct}%</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-textSecondary">Mức độ gợi ý</Text>
          <Text className="mt-0.5 text-sm font-semibold text-textPrimary">{severityLabel}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-textSecondary">Vùng phủ</Text>
          <Text className="mt-0.5 text-base font-bold text-textPrimary">
            {Math.round(classify.pollutionCoverageRatio * 100)}%
          </Text>
        </View>
      </View>

      {topSubtype ? (
        <View className="flex-row items-center gap-1.5 px-4 pb-3">
          <Ionicons name="pricetag" size={12} color={colors.primary} />
          <Text className="text-xs font-semibold text-primary">
            {TRASH_SUBTYPE_LABEL[topSubtype.subtype] ?? topSubtype.subtype}
          </Text>
          <Text className="text-xs text-textSecondary">
            ({Math.round(topSubtype.confidence * 100)}%)
          </Text>
        </View>
      ) : null}

      {aiResult.reason ? (
        <View className="px-4 pb-3">
          <Text className="text-xs text-textSecondary">{aiResult.reason}</Text>
        </View>
      ) : null}
    </View>
  );
}
