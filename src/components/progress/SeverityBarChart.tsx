import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface SeverityBarChartProps {
  data: BarDatum[];
  height?: number;
}

const MIN_BAR_HEIGHT = 4;

/** Pha màu đậm hơn cho đáy cột — tạo chiều sâu nhẹ thay vì khối phẳng một màu. */
function shade(hex: string, amount = -0.18): string {
  const normalized = hex.replace('#', '');
  const num = parseInt(normalized, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((num >> 16) & 255) * (1 + amount));
  const g = clamp(((num >> 8) & 255) * (1 + amount));
  const b = clamp((num & 255) * (1 + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export function SeverityBarChart({ data, height = 116 }: SeverityBarChartProps) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  return (
    <View>
      <View style={{ height }} className="relative justify-end">
        {/* Lưới ngang mờ phía sau cột */}
        {[0, 0.5, 1].map((ratio) => (
          <View
            key={ratio}
            className="absolute left-0 right-0 h-px"
            style={{ bottom: ratio * height, backgroundColor: colors.border }}
          />
        ))}

        <View className="flex-row items-end justify-between">
          {data.map((datum) => {
            const barHeight =
              datum.value === 0 ? MIN_BAR_HEIGHT : Math.max(10, (datum.value / maxValue) * (height - 22));
            return (
              <View key={datum.key} className="flex-1 items-center">
                <Text
                  className="mb-1 text-[11px] font-bold"
                  style={{ color: datum.value === 0 ? colors.textDisabled : colors.textPrimary }}
                >
                  {datum.value}
                </Text>
                {datum.value === 0 ? (
                  <View
                    className="w-7 rounded-full"
                    style={{ height: MIN_BAR_HEIGHT, backgroundColor: colors.border }}
                  />
                ) : (
                  <LinearGradient
                    colors={[datum.color, shade(datum.color)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                      width: 28,
                      height: barHeight,
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      borderBottomLeftRadius: 3,
                      borderBottomRightRadius: 3,
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View className="mt-2 flex-row justify-between">
        {data.map((datum) => (
          <View key={`${datum.key}-label`} className="flex-1 items-center">
            <Text className="text-[10px] font-semibold text-textSecondary" numberOfLines={1}>
              {datum.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
