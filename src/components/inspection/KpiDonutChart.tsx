import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

interface KpiDonutChartProps {
  /** 0–100. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Nhãn nhỏ dưới số phần trăm, ví dụ "26/30 hồ sơ". */
  caption?: string;
  color?: string;
}

/** Donut tiến độ tĩnh — vẽ bằng SVG, không animation. */
export function KpiDonutChart({
  percent,
  size = 112,
  strokeWidth = 10,
  caption,
  color = colors.primary,
}: KpiDonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // Bắt đầu từ 12h thay vì 3h.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <Text className="text-2xl font-bold text-textPrimary">{Math.round(clamped)}%</Text>
      {caption ? (
        <Text className="mt-0.5 text-[11px] text-textSecondary">{caption}</Text>
      ) : null}
    </View>
  );
}
