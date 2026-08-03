import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DashboardSkeleton,
  DISTRIBUTION_STATUSES,
  KpiHeroCard,
  KpiPeriodPicker,
  MetricRail,
  SlaAlertStrip,
  StatusDistributionCard,
} from '@/components/inspection';
import { Text } from '@/components/ui/text';
import { useInspectionKpi } from '@/hooks/useInspectionKpi';
import { useInspectionQueue } from '@/hooks/useInspectionQueue';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { KpiPeriod } from '@/types/inspection-kpi.types';
import type { InspectionStatus } from '@/types/inspection.types';

/** Lấy nhiều item để đếm phân bố trạng thái — BE cap pageSize ở 100. */
const DISTRIBUTION_PAGE_SIZE = 100;

const PERIOD_LABEL: Record<KpiPeriod, string> = {
  ThisMonth: 'Tháng này',
  LastMonth: 'Tháng trước',
  ThisQuarter: 'Quý này',
  LastQuarter: 'Quý trước',
  ThisYear: 'Năm nay',
  LastYear: 'Năm trước',
};

export default function InspectorOverviewScreen() {
  const insets = useSafeAreaInsets();
  const userName = useAuthStore((s) => s.user?.fullName);

  const [period, setPeriod] = useState<KpiPeriod>('ThisMonth');
  const { kpi, isLoading, errorMessage, refetch } = useInspectionKpi(period);

  // Phân bố trạng thái tính từ queue — KPI endpoint không trả breakdown này.
  const { items, refetch: refetchQueue } = useInspectionQueue({
    pageSize: DISTRIBUTION_PAGE_SIZE,
  });

  const distributionRows = useMemo(
    () =>
      DISTRIBUTION_STATUSES.map((meta) => ({
        ...meta,
        count: items.filter((item) => item.status === meta.status).length,
      })),
    [items],
  );

  const overdueCount = useMemo(
    () => items.filter((item) => item.status === 'Overdue').length,
    [items],
  );

  const urgentCount = overdueCount + (kpi?.slaBreach ?? 0);

  const goToQueue = (status?: InspectionStatus) => {
    router.push(
      status
        ? ({
            pathname: '/(inspector)/(inspector-tabs)/queue',
            params: { status },
          } as Href)
        : ('/(inspector)/(inspector-tabs)/queue' as Href),
    );
  };

  const refreshAll = async () => {
    await Promise.all([refetch(), refetchQueue()]);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4" style={{ paddingTop: insets.top + 12 }}>
        <View>
          <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
            Thanh tra môi trường
          </Text>
          <Text className="mt-0.5 text-lg font-bold text-textPrimary" numberOfLines={1}>
            {userName ? `Chào ${userName}` : 'Tổng quan'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && kpi !== null}
            onRefresh={() => void refreshAll()}
            tintColor={colors.primary}
          />
        }
      >
        {errorMessage ? (
          <View className="mx-4 mt-4 rounded-xl bg-red-50 px-3.5 py-3">
            <Text className="text-sm text-error">{errorMessage}</Text>
            <Pressable onPress={() => void refetch()} hitSlop={6} className="mt-1.5">
              <Text className="text-sm font-bold text-primary">Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading && !kpi ? (
          <DashboardSkeleton />
        ) : kpi ? (
          <View className="px-4 pt-4">
            {kpi.teamName ? (
              <View className="mb-4 flex-row items-center gap-1.5">
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text className="text-sm text-textSecondary" numberOfLines={1}>
                  {kpi.teamName}
                </Text>
              </View>
            ) : null}

            {urgentCount > 0 ? (
              <View className="mb-4">
                <SlaAlertStrip
                  overdueCount={overdueCount}
                  slaBreachCount={kpi.slaBreach}
                  onPress={() => goToQueue('Overdue')}
                />
              </View>
            ) : null}

            <View className="mb-2">
              <KpiPeriodPicker value={period} onChange={setPeriod} />
            </View>

            <View className="border-t border-border pt-5">
              <KpiHeroCard
                onTimePercent={kpi.penaltyIssuedOnTimePercent}
                onTimeCount={kpi.penaltyIssuedOnTime}
                totalCount={kpi.penaltyIssuedCount}
                paidOnTimePercent={kpi.paidOnTimePercent}
                totalInspections={kpi.totalInspections}
                periodLabel={PERIOD_LABEL[period]}
              />
            </View>

            <View className="border-t border-border pt-5">
              <Text className="mb-3 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
                Chỉ số khác
              </Text>
              <MetricRail
                items={[
                  { value: kpi.penaltyIssuedCount, label: 'Đã ban hành QĐ' },
                  { value: kpi.repeatOffenderCount, label: 'Tái phạm', tone: 'warning' },
                  { value: kpi.closedNoViolationCount, label: 'Đóng không vi phạm' },
                  { value: kpi.slaBreach, label: 'Vi phạm SLA', tone: 'danger' },
                ]}
              />
            </View>

            <View className="border-t border-border pt-5">
              <StatusDistributionCard
                rows={distributionRows}
                total={items.length}
                onSelectStatus={goToQueue}
              />
            </View>

            <Pressable
              onPress={() => goToQueue()}
              className="mt-5 flex-row items-center justify-center gap-2 rounded-xl border border-border py-3.5"
            >
              <Text className="text-sm font-bold text-textPrimary">Xem toàn bộ hồ sơ</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.textSecondary} />
            </Pressable>

            <Text className="mt-3 text-center text-[11px] text-textDisabled">
              Kỳ báo cáo: {new Date(kpi.periodFrom).toLocaleDateString('vi-VN')} —{' '}
              {new Date(kpi.periodTo).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        ) : (
          <View className="items-center px-6 py-16">
            <Ionicons name="stats-chart-outline" size={44} color={colors.textDisabled} />
            <Text className="mt-3 text-base font-bold text-textPrimary">Chưa có số liệu</Text>
            <Text className="mt-1 text-center text-sm leading-5 text-textSecondary">
              Số liệu KPI sẽ xuất hiện khi đoàn của bạn có hồ sơ được giao.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
