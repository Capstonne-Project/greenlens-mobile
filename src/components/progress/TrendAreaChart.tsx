import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Line } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

export interface TrendPoint {
  label: string;
  value: number;
}

interface TrendAreaChartProps {
  data: TrendPoint[];
  width: number;
  height?: number;
  /** Số nhãn trục X tối đa — dữ liệu dài (30 ngày) sẽ tự giãn nhãn. */
  maxLabels?: number;
}

const PADDING_TOP = 14;
const PADDING_BOTTOM = 6;

interface Point {
  x: number;
  y: number;
}

/** Catmull-Rom → cubic Bézier, kẹp control point trong khung để đường không tràn ra ngoài. */
function buildSmoothPath(points: Point[], top: number, bottom: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const clampY = (y: number) => Math.max(top, Math.min(bottom, y));
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clampY(p1.y + (p2.y - p0.y) / 6);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clampY(p2.y - (p3.y - p1.y) / 6);

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

export function TrendAreaChart({ data, width, height = 128, maxLabels = 7 }: TrendAreaChartProps) {
  const chartTop = PADDING_TOP;
  const chartBottom = height - PADDING_BOTTOM;
  const chartHeight = chartBottom - chartTop;
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  const points: Point[] = data.map((d, index) => ({
    x: data.length === 1 ? width / 2 : (index / (data.length - 1)) * width,
    y: chartBottom - (d.value / maxValue) * chartHeight,
  }));

  const linePath = buildSmoothPath(points, chartTop, chartBottom);
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`
      : '';

  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));
  const lastIndex = data.length - 1;

  return (
    <View>
      <View className="flex-row">
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.22} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Lưới ngang mờ — giúp đọc độ cao mà không gây nhiễu */}
          {[0, 0.5, 1].map((ratio) => (
            <Line
              key={ratio}
              x1={0}
              y1={chartTop + ratio * chartHeight}
              x2={width}
              y2={chartTop + ratio * chartHeight}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          ))}

          {areaPath ? <Path d={areaPath} fill="url(#trendFill)" /> : null}

          <Path
            d={linePath}
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {points.map((point, index) => {
            const isLast = index === lastIndex;
            if (!isLast && data[index].value === 0) return null;
            return (
              <Circle
                key={`${data[index].label}-${index}`}
                cx={point.x}
                cy={point.y}
                r={isLast ? 5 : 3}
                fill={isLast ? colors.primary : colors.white}
                stroke={colors.primary}
                strokeWidth={isLast ? 2.5 : 2}
              />
            );
          })}
        </Svg>
      </View>

      <View className="mt-1.5 flex-row" style={{ width }}>
        {data.map((point, index) => {
          const showLabel = index % labelStep === 0 || index === lastIndex;
          return (
            <View key={`${point.label}-label-${index}`} className="flex-1 items-center">
              {showLabel ? (
                <Text
                  className="text-[10px] font-semibold"
                  style={{ color: index === lastIndex ? colors.primary : colors.textSecondary }}
                >
                  {point.label}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
