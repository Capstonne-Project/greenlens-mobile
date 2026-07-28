import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/colors';

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  /** Nội dung giữa vòng — số tổng, nhãn… */
  children?: ReactNode;
}

/** Khoảng hở giữa 2 lát (độ) — làm vòng trông sạch và có nhịp hơn khối liền. */
const GAP_DEGREES = 3;

function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angleRad = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function DonutChart({ segments, size = 148, thickness = 14, children }: DonutChartProps) {
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  // Chỉ 1 lát chiếm toàn bộ → vẽ Circle, vì arc có start === end sẽ không render.
  const isSingleFullSegment = visible.length === 1;

  let cursor = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.surface}
          strokeWidth={thickness}
          fill="none"
        />

        {total > 0 && isSingleFullSegment ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={visible[0].color}
            strokeWidth={thickness}
            fill="none"
          />
        ) : (
          visible.map((segment) => {
            const sweep = (segment.value / total) * 360;
            const startAngle = cursor;
            const endAngle = cursor + sweep;
            cursor = endAngle;

            // Trừ khoảng hở nhưng luôn giữ lại một cung tối thiểu để lát nhỏ không biến mất.
            const gap = Math.min(GAP_DEGREES, sweep / 3);
            return (
              <Path
                key={segment.key}
                d={describeArc(center, center, radius, startAngle, endAngle - gap)}
                stroke={segment.color}
                strokeWidth={thickness}
                strokeLinecap="round"
                fill="none"
              />
            );
          })
        )}
      </Svg>

      {children ? (
        <View className="absolute inset-0 items-center justify-center">{children}</View>
      ) : null}
    </View>
  );
}
