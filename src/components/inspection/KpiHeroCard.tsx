import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { KpiDonutChart } from './KpiDonutChart';

interface KpiHeroCardProps {
  onTimePercent: number;
  onTimeCount: number;
  totalCount: number;
  paidOnTimePercent: number;
  totalInspections: number;
  periodLabel: string;
}

interface MiniMetricProps {
  value: string;
  label: string;
}

function MiniMetric({ value, label }: MiniMetricProps) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-lg font-bold text-textPrimary">{value}</Text>
      <Text className="mt-0.5 text-[11px] text-textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Khối KPI trung tâm — donut là tín hiệu chính (ban hành QĐ đúng hạn),
 * 2 mini-metric phụ đặt cùng khối. Không card/shadow — section phẳng.
 */
export function KpiHeroCard({
  onTimePercent,
  onTimeCount,
  totalCount,
  paidOnTimePercent,
  totalInspections,
  periodLabel,
}: KpiHeroCardProps) {
  const accent = onTimePercent >= 80 ? colors.primary : onTimePercent >= 50 ? colors.warning : colors.error;

  return (
    <View>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-textPrimary">Ban hành QĐ đúng hạn</Text>
        <Text className="text-xs font-semibold text-textSecondary">{periodLabel}</Text>
      </View>

      <View className="flex-row items-center">
        <KpiDonutChart
          percent={onTimePercent}
          size={104}
          strokeWidth={9}
          caption={`${onTimeCount}/${totalCount} hồ sơ`}
          color={accent}
        />

        <View className="ml-5 flex-1">
          <Text className="text-xs font-semibold" style={{ color: accent }}>
            {onTimePercent >= 80 ? 'Đúng tiến độ' : 'Cần cải thiện'}
          </Text>
          <Text className="mt-1.5 text-xs leading-[18px] text-textSecondary">
            {onTimePercent >= 80
              ? 'Đoàn đang ban hành quyết định xử phạt đúng hạn SLA.'
              : 'Một số hồ sơ ban hành QĐ trễ hạn SLA — ưu tiên xử lý.'}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row border-t border-border pt-4">
        <MiniMetric value={String(totalInspections)} label="Tổng hồ sơ" />
        <View className="w-px bg-border" />
        <MiniMetric value={`${Math.round(paidOnTimePercent)}%`} label="Nộp phạt đúng hạn" />
      </View>
    </View>
  );
}
