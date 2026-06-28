import { SafeScreen } from '@/components/layout/SafeScreen';
import { TapScale } from '@/components/layout/TapScale';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useMyReports } from '@/hooks/useMyReports';
import { colors } from '@/theme/colors';
import type { MyReportItem, MyReportSeverity, MyReportsFilterKey } from '@/types/my-reports.types';
import { MY_REPORTS_FILTERS } from '@/types/my-reports.types';
import { formatRelativeTime } from '@/utils/formatters';
import { getReportStatusMeta } from '@/utils/report-status';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router, type Href } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

const CARD_SHADOW = {
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
} as const;

const LIST_CONTENT_STYLE = { paddingTop: 16, paddingBottom: 96, flexGrow: 1 as const };

interface ReportsScreenHeaderProps {
  count: number;
  isLoading: boolean;
  onCreatePress: () => void;
}

function ReportsScreenHeader({ count, isLoading, onCreatePress }: ReportsScreenHeaderProps) {
  return (
    <View className="px-4 pb-2 pt-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[26px] font-bold leading-8 text-textPrimary">Báo cáo của tôi</Text>
          <Text className="mt-1 text-sm text-textSecondary">Theo dõi tiến độ xử lý</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {!isLoading ? (
            <View className="min-w-[56px] items-center rounded-2xl bg-primaryLight px-3 py-2">
              <Text className="text-xl font-bold text-primary">{count}</Text>
              <Text className="text-[10px] font-semibold text-primaryDark">báo cáo</Text>
            </View>
          ) : (
            <View className="h-[52px] w-[56px] items-center justify-center rounded-2xl bg-surface">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          <TapScale onPress={onCreatePress}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primaryLight">
              <Ionicons name="add" size={22} color={colors.primary} />
            </View>
          </TapScale>
        </View>
      </View>
    </View>
  );
}

const SEVERITY_META: Record<MyReportSeverity, { label: string; textColor: string; bgColor: string; dotColor: string }> =
  {
    Low: { label: 'Thấp', textColor: '#166534', bgColor: '#DCFCE7', dotColor: colors.severityLow },
    Medium: { label: 'Trung bình', textColor: '#92400E', bgColor: '#FEF3C7', dotColor: colors.severityMedium },
    High: { label: 'Cao', textColor: '#9A3412', bgColor: '#FFEDD5', dotColor: colors.severityHigh },
    Critical: { label: 'Nghiêm trọng', textColor: '#991B1B', bgColor: '#FEE2E2', dotColor: colors.severityCritical },
  };

function FilterChip({
  label,
  count,
  isActive,
  onPress,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TapScale onPress={onPress}>
      <View className="mr-6 flex-row items-center gap-1.5 pb-3 pt-1">
        <Text
          className="text-[13px]"
          style={{
            color: isActive ? colors.primary : colors.textSecondary,
            fontWeight: isActive ? '700' : '500',
          }}
        >
          {label}
        </Text>
        {typeof count === 'number' ? (
          <View
            className="min-w-[20px] items-center rounded-full px-1.5 py-0.5"
            style={{ backgroundColor: isActive ? colors.primaryLight : colors.surface }}
          >
            <Text
              className="text-[11px] font-bold"
              style={{ color: isActive ? colors.primaryDark : colors.textSecondary }}
            >
              {count}
            </Text>
          </View>
        ) : null}
        {isActive ? (
          <View
            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
            style={{ backgroundColor: colors.primary }}
          />
        ) : null}
      </View>
    </TapScale>
  );
}

function ReportCard({ item, onPress }: { item: MyReportItem; onPress: () => void }) {
  const statusMeta = getReportStatusMeta(item.status);
  const severityMeta = SEVERITY_META[item.severity];

  return (
    <TapScale onPress={onPress}>
      <View className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white shadow-sm" style={CARD_SHADOW}>
        <View
          className="flex-row items-center justify-between px-3.5 py-2"
          style={{ backgroundColor: statusMeta.bgColor }}
        >
          <Text
            className="mr-2 flex-1 text-[11px] font-semibold"
            style={{ color: statusMeta.textColor }}
            numberOfLines={1}
          >
            {statusMeta.label}
          </Text>
          <Text className="text-[11px] font-medium" style={{ color: statusMeta.textColor, opacity: 0.85 }}>
            {item.code}
          </Text>
        </View>

        <View className="flex-row items-center p-3.5">
          <View
            className="mr-3 h-[72px] w-[72px] items-center justify-center rounded-xl"
            style={{ backgroundColor: severityMeta.bgColor }}
          >
            <Ionicons name="leaf-outline" size={26} color={severityMeta.textColor} />
          </View>

          <View className="flex-1">
            <Text className="mb-1.5 text-[15px] font-bold text-textPrimary" numberOfLines={2}>
              {item.categoryName}
            </Text>

            <View className="mb-2 flex-row items-center gap-1">
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text className="flex-1 text-xs text-textSecondary" numberOfLines={1}>
                {item.address}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View
                className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                style={{ backgroundColor: severityMeta.bgColor }}
              >
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: severityMeta.dotColor }} />
                <Text className="text-[11px] font-semibold" style={{ color: severityMeta.textColor }}>
                  {severityMeta.label}
                </Text>
              </View>

              <View className="flex-row items-center gap-1">
                <Text className="text-xs text-textSecondary">Gửi {formatRelativeTime(item.createdAt)}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} />
              </View>
            </View>

            {item.resolvedAt ? (
              <Text className="mt-1.5 text-xs font-medium text-primary">Đã xử lý xong</Text>
            ) : item.closedAt ? (
              <Text className="mt-1.5 text-xs text-textSecondary">Đã đóng</Text>
            ) : null}
          </View>
        </View>
      </View>
    </TapScale>
  );
}

function ReportCardSkeleton() {
  return (
    <View className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white shadow-sm" style={CARD_SHADOW}>
      <View className="h-8 bg-surface" />
      <View className="flex-row p-3.5">
        <View className="mr-3 h-[72px] w-[72px] rounded-xl bg-surface" />
        <View className="flex-1 justify-between py-0.5">
          <View className="h-4 w-3/4 rounded bg-border" />
          <View className="h-3 w-full rounded bg-surface" />
          <View className="mt-2 flex-row items-center justify-between">
            <View className="h-5 w-20 rounded-full bg-surface" />
            <View className="h-3 w-24 rounded bg-border" />
          </View>
        </View>
      </View>
    </View>
  );
}

interface EmptyReportsStateProps {
  filterKey: MyReportsFilterKey;
  onSwitchTab: (key: MyReportsFilterKey) => void;
}

function EmptyReportsState({ filterKey, onSwitchTab }: EmptyReportsStateProps) {
  if (filterKey === 'ALL') {
    return (
      <View className="flex-1 items-center justify-center px-8 py-16">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-primaryLight">
          <Ionicons name="document-text-outline" size={34} color={colors.primary} />
        </View>
        <Text className="mt-5 text-2xl font-bold text-textPrimary">Chưa có báo cáo nào</Text>
        <Text className="mt-2 text-center text-sm text-textSecondary">
          Gửi báo cáo đầu tiên để theo dõi trạng thái xử lý tại đây.
        </Text>
        <Button className="mt-6 h-12 w-full max-w-[280px] rounded-full" onPress={() => router.push('/report/create')}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text>Tạo báo cáo đầu tiên</Text>
        </Button>
      </View>
    );
  }

  if (filterKey === 'InProgress') {
    return (
      <View className="flex-1 items-center justify-center px-8 py-16">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-primaryLight">
          <Ionicons name="time-outline" size={34} color={colors.primary} />
        </View>
        <Text className="mt-5 text-xl font-bold text-textPrimary">Không có báo cáo đang xử lý</Text>
        <Text className="mt-2 text-center text-sm text-textSecondary">
          Báo cáo có thể đang chờ xác minh, cần bạn xác nhận, hoặc đã hoàn thành.
        </Text>
        <Button className="mt-6 h-12 w-full max-w-[280px] rounded-full" onPress={() => onSwitchTab('ALL')}>
          <Ionicons name="list-outline" size={18} color={colors.white} />
          <Text>Xem tất cả báo cáo</Text>
        </Button>
      </View>
    );
  }

  if (filterKey === 'NEEDS_CONFIRM') {
    return (
      <View className="flex-1 items-center justify-center px-8 py-16">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-primaryLight">
          <Ionicons name="hand-left-outline" size={34} color={colors.primary} />
        </View>
        <Text className="mt-5 text-xl font-bold text-textPrimary">Chưa có báo cáo cần xác nhận</Text>
        <Text className="mt-2 text-center text-sm text-textSecondary">
          Khi đội xử lý xong, báo cáo sẽ hiện ở đây để bạn xác nhận kết quả.
        </Text>
        <Button className="mt-6 h-12 w-full max-w-[280px] rounded-full" onPress={() => onSwitchTab('InProgress')}>
          <Ionicons name="arrow-back-outline" size={18} color={colors.white} />
          <Text>Quay về xem đang xử lý</Text>
        </Button>
      </View>
    );
  }

  if (filterKey === 'DONE') {
    return (
      <View className="flex-1 items-center justify-center px-8 py-16">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-primaryLight">
          <Ionicons name="checkmark-done-outline" size={34} color={colors.primary} />
        </View>
        <Text className="mt-5 text-xl font-bold text-textPrimary">Chưa có báo cáo đã hoàn thành</Text>
        <Text className="mt-2 text-center text-sm text-textSecondary">
          Báo cáo sẽ chuyển sang đây sau khi bạn xác nhận và đóng. Nếu chưa thấy, có thể báo cáo đang chờ bạn xác
          nhận ở tab khác.
        </Text>
        <Button
          className="mt-6 h-12 w-full max-w-[280px] rounded-full"
          onPress={() => onSwitchTab('NEEDS_CONFIRM')}
        >
          <Ionicons name="hand-left-outline" size={18} color={colors.white} />
          <Text>Xem cần xác nhận</Text>
        </Button>
        <Button
          className="mt-3 h-11 w-full max-w-[280px] rounded-full"
          variant="outline"
          onPress={() => onSwitchTab('InProgress')}
        >
          <Text className="text-primary">Xem đang xử lý</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-primaryLight">
        <Ionicons name="close-circle-outline" size={34} color={colors.primary} />
      </View>
      <Text className="mt-5 text-xl font-bold text-textPrimary">Không có báo cáo bị từ chối</Text>
      <Text className="mt-2 text-center text-sm text-textSecondary">
        Các báo cáo bị từ chối hoặc trùng lặp sẽ hiển thị tại đây.
      </Text>
      <Button className="mt-6 h-12 w-full max-w-[280px] rounded-full" onPress={() => onSwitchTab('ALL')}>
        <Ionicons name="list-outline" size={18} color={colors.white} />
        <Text>Xem tất cả báo cáo</Text>
      </Button>
    </View>
  );
}

interface ReportsFilterPageProps {
  filterKey: MyReportsFilterKey;
  pageWidth: number;
  pageHeight: number;
  isAuthenticated: boolean;
  onOpenDetail: (reportId: string) => void;
  onSwitchTab: (key: MyReportsFilterKey) => void;
  onRegisterRefetch: (filterKey: MyReportsFilterKey, refetch: () => Promise<void>) => void;
  onTotalCountChange: (filterKey: MyReportsFilterKey, count: number, isLoading: boolean) => void;
}

const ReportsFilterPage = memo(function ReportsFilterPage({
  filterKey,
  pageWidth,
  pageHeight,
  isAuthenticated,
  onOpenDetail,
  onSwitchTab,
  onRegisterRefetch,
  onTotalCountChange,
}: ReportsFilterPageProps) {
  const { items, totalCount, isLoading, isRefreshing, isFetchingMore, hasNextPage, errorMessage, refetch, loadMore } =
    useMyReports({ filterKey, pageSize: 20, enabled: isAuthenticated });

  useEffect(() => {
    onRegisterRefetch(filterKey, refetch);
  }, [filterKey, onRegisterRefetch, refetch]);

  useEffect(() => {
    onTotalCountChange(filterKey, totalCount, isLoading);
  }, [filterKey, isLoading, onTotalCountChange, totalCount]);

  const renderItem = useCallback(
    ({ item }: { item: MyReportItem }) => <ReportCard item={item} onPress={() => onOpenDetail(item.id)} />,
    [onOpenDetail],
  );

  return (
    <View style={{ width: pageWidth, height: pageHeight }}>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.surface }}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        nestedScrollEnabled
        removeClippedSubviews={false}
        onEndReachedThreshold={0.25}
        onEndReached={() => {
          if (hasNextPage) void loadMore();
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void refetch()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View>
              {Array.from({ length: 5 }).map((_, index) => (
                <ReportCardSkeleton key={`report-skeleton-${filterKey}-${index}`} />
              ))}
            </View>
          ) : errorMessage ? (
            <View className="mx-4 rounded-xl bg-error/10 px-3 py-2.5">
              <Text className="text-sm text-error">{errorMessage}</Text>
            </View>
          ) : (
            <EmptyReportsState filterKey={filterKey} onSwitchTab={onSwitchTab} />
          )
        }
        ListFooterComponent={
          isFetchingMore ? (
            <View className="pb-4 pt-1">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={LIST_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

export default function ReportsTabScreen() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { width: pageWidth } = useWindowDimensions();
  const [activeFilter, setActiveFilter] = useState<MyReportsFilterKey>('ALL');
  const [activeTabMeta, setActiveTabMeta] = useState({ count: 0, isLoading: true });
  const [pagerHeight, setPagerHeight] = useState(0);

  const pagerRef = useRef<ScrollView>(null);
  const chipRef = useRef<FlatList<(typeof MY_REPORTS_FILTERS)[number]>>(null);
  const refetchByFilterRef = useRef<Partial<Record<MyReportsFilterKey, () => Promise<void>>>>({});
  const tabMetaByFilterRef = useRef<Partial<Record<MyReportsFilterKey, { count: number; isLoading: boolean }>>>({});
  const activeFilterRef = useRef(activeFilter);
  activeFilterRef.current = activeFilter;

  const applyActiveTabMeta = useCallback((filterKey: MyReportsFilterKey) => {
    setActiveTabMeta(tabMetaByFilterRef.current[filterKey] ?? { count: 0, isLoading: true });
  }, []);

  const scrollChipIntoView = useCallback((index: number) => {
    chipRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }, []);

  const goToFilterIndex = useCallback(
    (index: number) => {
      const filter = MY_REPORTS_FILTERS[index];
      if (!filter) return;
      setActiveFilter(filter.key);
      applyActiveTabMeta(filter.key);
      pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true });
      scrollChipIntoView(index);
    },
    [applyActiveTabMeta, pageWidth, scrollChipIntoView],
  );

  const onPagerScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      const filter = MY_REPORTS_FILTERS[index];
      if (!filter || filter.key === activeFilter) return;
      setActiveFilter(filter.key);
      applyActiveTabMeta(filter.key);
      scrollChipIntoView(index);
    },
    [activeFilter, applyActiveTabMeta, pageWidth, scrollChipIntoView],
  );

  const goToFilterKey = useCallback(
    (key: MyReportsFilterKey) => {
      const index = MY_REPORTS_FILTERS.findIndex((filter) => filter.key === key);
      if (index >= 0) goToFilterIndex(index);
    },
    [goToFilterIndex],
  );

  const onPagerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setPagerHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const openDetail = useCallback((reportId: string) => {
    router.push({ pathname: '/report/[id]', params: { id: reportId, source: 'tab' } } as Href);
  }, []);

  const handleRegisterRefetch = useCallback((filterKey: MyReportsFilterKey, refetch: () => Promise<void>) => {
    refetchByFilterRef.current[filterKey] = refetch;
  }, []);

  const handleTotalCountChange = useCallback((filterKey: MyReportsFilterKey, count: number, isLoading: boolean) => {
    tabMetaByFilterRef.current[filterKey] = { count, isLoading };
    if (filterKey === activeFilterRef.current) {
      setActiveTabMeta({ count, isLoading });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      const refetch = refetchByFilterRef.current[activeFilter];
      if (refetch) void refetch();
    }, [activeFilter, isAuthenticated]),
  );

  if (!isAuthLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeScreen className="bg-surface" edges={['top']}>
      <View className="bg-white">
        <ReportsScreenHeader
          count={activeTabMeta.count}
          isLoading={activeTabMeta.isLoading}
          onCreatePress={() => router.push('/report/create')}
        />

        <View className="border-b border-border">
          <FlatList
            ref={chipRef}
            data={MY_REPORTS_FILTERS}
            horizontal
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item, index }) => (
              <FilterChip
                label={item.label}
                count={activeFilter === item.key && !activeTabMeta.isLoading ? activeTabMeta.count : undefined}
                isActive={activeFilter === item.key}
                onPress={() => goToFilterIndex(index)}
              />
            )}
          />
        </View>
      </View>

      <View className="flex-1" onLayout={onPagerLayout}>
        {pagerHeight > 0 ? (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            bounces={false}
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onPagerScrollEnd}
            directionalLockEnabled
            style={{ height: pagerHeight }}
          >
            {MY_REPORTS_FILTERS.map((filter) => (
              <ReportsFilterPage
                key={filter.key}
                filterKey={filter.key}
                pageWidth={pageWidth}
                pageHeight={pagerHeight}
                isAuthenticated={isAuthenticated}
                onOpenDetail={openDetail}
                onSwitchTab={goToFilterKey}
                onRegisterRefetch={handleRegisterRefetch}
                onTotalCountChange={handleTotalCountChange}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>
    </SafeScreen>
  );
}
