import { TapScale } from '@/components/layout/TapScale';
import { colors } from '@/theme/colors';
import type { MapSummaryDailyCount } from '@/types/map-summary.types';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface AreaSummaryBottomPanelProps {
  areaTitle?: string;
  reportCount?: number;
  days?: number;
  dailyCounts?: MapSummaryDailyCount[];
  periodStart?: string;
  periodEnd?: string;
  isLoading?: boolean;
  onSeeAll?: () => void;
}

const CHART_HEIGHT = 72;
const MAX_BAR_HEIGHT = 56;
const MIN_BAR_HEIGHT = 3;

function formatChartAxisDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
}

function formatSelectedDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
}

function isTodayIso(isoDate: string): boolean {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
}

function ChartSkeleton() {
  return (
    <View className="flex-row items-end gap-0.5 px-1">
      {Array.from({ length: 30 }).map((_, index) => (
        <View key={`summary-bar-skeleton-${index}`} className="flex-1 items-center justify-end" style={{ height: CHART_HEIGHT }}>
          <View
            className="w-full rounded-sm bg-border/60"
            style={{ height: 8 + (index % 5) * 4 }}
          />
        </View>
      ))}
    </View>
  );
}

interface ChartBarProps {
  count: number;
  maxBar: number;
  isSelected: boolean;
  hasSelection: boolean;
  onPress: () => void;
}

function ChartBar({ count, maxBar, isSelected, hasSelection, onPress }: ChartBarProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const barHeight =
    count > 0 ? Math.max(8, (count / maxBar) * MAX_BAR_HEIGHT) : MIN_BAR_HEIGHT;

  const backgroundColor = (() => {
    if (isSelected) return colors.primary;
    if (count > 0) return `${colors.primary}88`;
    return `${colors.primary}22`;
  })();

  const opacity = hasSelection && !isSelected ? 0.45 : 1;

  return (
    <View className="flex-1">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 18, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 280 });
        }}
        style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'stretch' }}
      >
        <Animated.View
          style={[
            animatedStyle,
            {
              height: CHART_HEIGHT,
              justifyContent: 'flex-end',
              alignItems: 'stretch',
              opacity,
            },
          ]}
        >
          <View
            className="w-full rounded-sm"
            style={{
              height: barHeight,
              backgroundColor,
            }}
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function AreaSummaryBottomPanel({
  areaTitle = 'Khu vực đang xem',
  reportCount = 0,
  days = 30,
  dailyCounts = [],
  periodStart,
  periodEnd,
  isLoading = false,
  onSeeAll,
}: AreaSummaryBottomPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [dailyCounts]);

  const counts = useMemo(() => dailyCounts.map((item) => item.count), [dailyCounts]);
  const maxBar = Math.max(...counts, 1);
  const startLabel = periodStart ? formatChartAxisDate(periodStart) : `${days} ngày trước`;
  const endLabel = periodEnd ? (isTodayIso(periodEnd) ? 'Hôm nay' : formatChartAxisDate(periodEnd)) : 'Hôm nay';

  const selectedItem = selectedIndex != null ? dailyCounts[selectedIndex] : null;
  const hasSelection = selectedIndex != null && selectedItem != null;

  const onSelectBar = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View className="absolute bottom-0 left-0 right-0 z-10 rounded-t-3xl border border-border bg-white px-4 pb-3 pt-4 shadow-lg shadow-black/10">
      <View className="mb-3 flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-textPrimary">{areaTitle}</Text>
          {isLoading && dailyCounts.length === 0 ? (
            <Text className="mt-1 text-sm text-textSecondary">Đang tải thống kê...</Text>
          ) : hasSelection ? (
            <View className="mt-1">
              <Text className="text-[28px] font-bold leading-8 text-primary">
                {selectedItem.count} báo cáo
              </Text>
              <Text className="mt-0.5 text-sm font-medium text-textPrimary">
                {isTodayIso(selectedItem.date) ? 'Hôm nay' : formatSelectedDate(selectedItem.date)}
              </Text>
            </View>
          ) : (
            <View className="mt-1">
              <Text className="text-[28px] font-bold leading-8 text-primary">{reportCount} báo cáo</Text>
              <Text className="mt-0.5 text-sm text-textSecondary">{days} ngày qua · bấm cột để xem từng ngày</Text>
            </View>
          )}
        </View>
        <TapScale onPress={onSeeAll ?? (() => {})}>
          <Text className="text-sm font-semibold text-primary">Xem tất cả {'>'}</Text>
        </TapScale>
      </View>

      <View className="overflow-hidden rounded-xl bg-surface px-1 pb-2 pt-4">
        {isLoading && dailyCounts.length === 0 ? (
          <ChartSkeleton />
        ) : dailyCounts.length === 0 ? (
          <View className="h-[72px] items-center justify-center">
            <Text className="text-xs text-textSecondary">Chưa có dữ liệu thống kê</Text>
          </View>
        ) : (
          <View className="flex-row items-end gap-0.5">
            {dailyCounts.map((item, index) => (
              <ChartBar
                key={item.date}
                count={item.count}
                maxBar={maxBar}
                isSelected={index === selectedIndex}
                hasSelection={hasSelection}
                onPress={() => onSelectBar(index)}
              />
            ))}
          </View>
        )}
      </View>

      <View className="mt-2 flex-row justify-between px-0.5">
        <Text className="text-[10px] text-textSecondary">{startLabel}</Text>
        <Text className="text-[10px] font-medium text-textPrimary">{endLabel}</Text>
      </View>
    </View>
  );
}
