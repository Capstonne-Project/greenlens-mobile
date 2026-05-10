import { Text, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import { AREA_STATS_BAR_HEIGHTS } from '@/data/citizen-map-mock';

interface AreaSummaryBottomPanelProps {
  areaTitle?: string;
  reportCount?: number;
  hotspotCount?: number;
  days?: number;
  onSeeAll?: () => void;
}

export function AreaSummaryBottomPanel({
  areaTitle = 'Khu vực Quận 1, TP.HCM',
  reportCount = 27,
  hotspotCount = 3,
  days = 30,
  onSeeAll,
}: AreaSummaryBottomPanelProps) {
  const maxBar = Math.max(...AREA_STATS_BAR_HEIGHTS, 1);

  return (
    <View className="absolute bottom-0 left-0 right-0 z-10 rounded-t-3xl border border-border bg-white px-4 pb-3 pt-4 shadow-lg shadow-black/10">
      <View className="mb-3 flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-textPrimary">{areaTitle}</Text>
          <Text className="mt-1 text-sm text-textSecondary">
            {reportCount} báo cáo · {hotspotCount} hotspot · {days} ngày qua
          </Text>
        </View>
        <TapScale onPress={onSeeAll ?? (() => {})}>
          <Text className="text-sm font-semibold text-primary">Xem tất cả {'>'}</Text>
        </TapScale>
      </View>

      <View className="flex-row items-end gap-0.5 overflow-hidden rounded-xl bg-surface px-1 pb-2 pt-4">
        <TapScale onPress={() => {}}>
          <View className="mr-1 h-10 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Text className="text-lg font-bold text-primary">+</Text>
          </View>
        </TapScale>

        <View className="flex-1 flex-row items-end justify-between gap-0.5">
          {AREA_STATS_BAR_HEIGHTS.map((h, i) => {
            const barHeight = Math.max(6, (h / maxBar) * 56);
            const isHighlight = i === AREA_STATS_BAR_HEIGHTS.length - 1;
            return (
              <View key={`bar-${i}`} className="flex-1 items-center justify-end" style={{ height: 72 }}>
                <View
                  className={isHighlight ? 'w-full rounded-sm bg-primary' : 'w-full rounded-sm bg-primary/25'}
                  style={{ height: barHeight }}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View className="mt-2 flex-row justify-between px-0.5">
        <Text className="text-[10px] text-textSecondary">{days} ngày trước</Text>
        <Text className="text-[10px] font-medium text-textPrimary">Hôm nay</Text>
      </View>
    </View>
  );
}
