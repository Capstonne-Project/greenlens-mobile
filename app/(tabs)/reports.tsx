import { SafeScreen } from '@/components/layout/SafeScreen';
import { TapScale } from '@/components/layout/TapScale';
import { MyReportListCard } from '@/components/report/MyReportListCard';
import { MyReportsEmptyState } from '@/components/report/MyReportsEmptyState';
import { MyReportsFilterBar } from '@/components/report/MyReportsFilterBar';
import {
  MyReportsHubHeader,
  type MyReportsTabCounts,
} from '@/components/report/MyReportsHubHeader';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/hooks/useAuth';
import { useMyReports } from '@/hooks/useMyReports';
import { colors } from '@/theme/colors';
import type { MyReportItem, MyReportsFilterKey } from '@/types/my-reports.types';
import { MY_REPORTS_FILTERS } from '@/types/my-reports.types';
import { resolveMyReportDetailTarget } from '@/utils/report-merge';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Redirect, router, type Href } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const LIST_CONTENT_STYLE = { paddingTop: 8, paddingBottom: 100, flexGrow: 1 as const };

function ReportCardSkeleton() {
  return (
    <View className="mb-2.5 bg-white px-4 py-3.5">
      <View className="mb-2.5 flex-row justify-between">
        <View className="h-4 w-36 rounded bg-surface" />
        <View className="h-4 w-20 rounded bg-border" />
      </View>
      <View className="mb-3 h-12 rounded-xl bg-surface" />
      <View className="flex-row">
        <View className="h-[72px] w-[72px] rounded-[10px] bg-surface" />
        <View className="ml-3 flex-1 justify-between py-1">
          <View className="h-4 w-4/5 rounded bg-border" />
          <View className="h-3 w-2/3 rounded bg-surface" />
          <View className="h-3 w-1/3 rounded bg-surface" />
        </View>
      </View>
      <View className="mt-3 h-9 flex-row justify-end gap-2 border-t border-border/50 pt-3">
        <View className="h-9 w-24 rounded-full bg-surface" />
        <View className="h-9 w-24 rounded-full bg-border" />
      </View>
    </View>
  );
}

interface NeedsConfirmBannerProps {
  count: number;
  onPress: () => void;
}

function NeedsConfirmBanner({ count, onPress }: NeedsConfirmBannerProps) {
  if (count <= 0) return null;
  return (
    <TapScale onPress={onPress}>
      <View className="mx-0 flex-row items-center justify-between border-b border-[#E8E4D9] bg-[#F7F4EC] px-4 py-2.5">
        <View className="flex-row items-center gap-2">
          <Ionicons name="notifications-outline" size={15} color="#78716C" />
          <Text className="text-[12px] text-[#57534E]">
            Bạn có <Text className="font-bold text-[#44403C]">{count}</Text> báo cáo cần xác nhận
          </Text>
        </View>
        <Text className="text-[12px] font-semibold text-primary">Xem ngay</Text>
      </View>
    </TapScale>
  );
}

function matchesSearch(item: MyReportItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.code.toLowerCase().includes(q) ||
    item.categoryName.toLowerCase().includes(q) ||
    item.address.toLowerCase().includes(q) ||
    item.status.toLowerCase().includes(q) ||
    (item.mergedIntoPrimaryReportCode?.toLowerCase().includes(q) ?? false)
  );
}

interface ReportsFilterPageProps {
  filterKey: MyReportsFilterKey;
  pageWidth: number;
  pageHeight: number;
  isAuthenticated: boolean;
  searchQuery: string;
  onOpenDetail: (item: MyReportItem) => void;
  onSwitchTab: (key: MyReportsFilterKey) => void;
  onRegisterRefetch: (filterKey: MyReportsFilterKey, refetch: () => Promise<void>) => void;
  onTotalCountChange: (filterKey: MyReportsFilterKey, count: number, isLoading: boolean) => void;
}

const ReportsFilterPage = memo(function ReportsFilterPage({
  filterKey,
  pageWidth,
  pageHeight,
  isAuthenticated,
  searchQuery,
  onOpenDetail,
  onSwitchTab,
  onRegisterRefetch,
  onTotalCountChange,
}: ReportsFilterPageProps) {
  const { items, totalCount, isLoading, isRefreshing, isFetchingMore, hasNextPage, errorMessage, refetch, loadMore } =
    useMyReports({ filterKey, pageSize: 20, enabled: isAuthenticated });

  const filteredItems = useMemo(
    () => items.filter((item) => matchesSearch(item, searchQuery)),
    [items, searchQuery],
  );

  useEffect(() => {
    onRegisterRefetch(filterKey, refetch);
  }, [filterKey, onRegisterRefetch, refetch]);

  useEffect(() => {
    onTotalCountChange(filterKey, totalCount, isLoading);
  }, [filterKey, isLoading, onTotalCountChange, totalCount]);

  const renderItem = useCallback(
    ({ item }: { item: MyReportItem }) => (
      <MyReportListCard
        item={item}
        onPress={() => onOpenDetail(item)}
        onOpenPrimary={() => onOpenDetail(item)}
      />
    ),
    [onOpenDetail],
  );

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <View style={{ width: pageWidth, height: pageHeight }}>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.surface }}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        nestedScrollEnabled
        removeClippedSubviews={false}
        onEndReachedThreshold={0.25}
        onEndReached={() => {
          if (hasNextPage && !hasSearch) void loadMore();
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void refetch()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View>
              {Array.from({ length: 4 }).map((_, index) => (
                <ReportCardSkeleton key={`report-skeleton-${filterKey}-${index}`} />
              ))}
            </View>
          ) : errorMessage ? (
            <View className="mx-4 mt-3 rounded-2xl bg-error/10 px-4 py-3">
              <Text className="text-sm text-error">{errorMessage}</Text>
            </View>
          ) : (
            <MyReportsEmptyState
              filterKey={filterKey}
              onSwitchTab={onSwitchTab}
              isSearchEmpty={hasSearch && items.length > 0}
            />
          )
        }
        ListFooterComponent={
          isFetchingMore ? (
            <View className="pb-4 pt-2">
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
  const [tabCounts, setTabCounts] = useState<MyReportsTabCounts>({});
  const [searchQuery, setSearchQuery] = useState('');
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
      void Haptics.selectionAsync();
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

  const openDetail = useCallback((item: MyReportItem) => {
    const target = resolveMyReportDetailTarget(item);
    const mergedThumb = item.imageUrl?.trim();
    router.push({
      pathname: '/report/[id]',
      params: {
        id: target.id,
        source: 'tab',
        ...(target.fromMergedReportId
          ? {
              fromMergedReportId: target.fromMergedReportId,
              // List vẫn có thumb; GET detail báo cáo Duplicate sau merge thường mất media (BE reassign)
              ...(mergedThumb ? { fromMergedReportImageUrl: mergedThumb } : {}),
            }
          : {}),
      },
    } as Href);
  }, []);

  const handleRegisterRefetch = useCallback((filterKey: MyReportsFilterKey, refetch: () => Promise<void>) => {
    refetchByFilterRef.current[filterKey] = refetch;
  }, []);

  const handleTotalCountChange = useCallback((filterKey: MyReportsFilterKey, count: number, isLoading: boolean) => {
    tabMetaByFilterRef.current[filterKey] = { count, isLoading };
    setTabCounts((prev) => (prev[filterKey] === count ? prev : { ...prev, [filterKey]: count }));
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
        <MyReportsHubHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreatePress={() => router.push('/report/create')}
        />

        <MyReportsFilterBar
          listRef={chipRef}
          activeFilter={activeFilter}
          activeCount={activeTabMeta.count}
          isCountLoading={activeTabMeta.isLoading}
          onSelectIndex={goToFilterIndex}
        />

        <NeedsConfirmBanner
          count={tabCounts.NEEDS_CONFIRM ?? 0}
          onPress={() => goToFilterKey('NEEDS_CONFIRM')}
        />
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
                searchQuery={searchQuery}
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
