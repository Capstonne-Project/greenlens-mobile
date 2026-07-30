import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DonutChart, type DonutSegment } from '@/components/progress/DonutChart';
import { SeverityBarChart, type BarDatum } from '@/components/progress/SeverityBarChart';
import { TaskProgressCard } from '@/components/progress/TaskProgressCard';
import { TrendAreaChart, type TrendPoint } from '@/components/progress/TrendAreaChart';
import { Text } from '@/components/ui/text';
import { useMyAssignments } from '@/hooks/useMyAssignments';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { communityCleanupService } from '@/services/communityCleanup.service';
import { useFieldWorkerTaskStore } from '@/stores/fieldWorkerTask.store';
import { colors } from '@/theme/colors';
import type {
  AssignmentItem,
  AssignmentStatus,
  MyTaskProgressStats,
} from '@/types/cleanup-assignment.types';
import type { CommunityCleanupListItem } from '@/types/community-cleanup.types';
import { getTaskRouteParams } from '@/utils/field-worker-task';

const CARD_STYLE = {
  elevation: 3,
  shadowColor: '#0F172A',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
} as const;

/** Bề rộng vùng vẽ = màn hình − padding màn (16×2) − padding card (16×2) */
const CHART_WIDTH = Dimensions.get('window').width - 64;

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const TASK_LIST_PAGE_SIZE = 5;
const END_REACHED_MARGIN_PX = 120;

const SEVERITY_META: Record<string, { label: string; color: string }> = {
  Low: { label: 'Thấp', color: colors.severityLow },
  Medium: { label: 'Trung bình', color: colors.severityMedium },
  High: { label: 'Cao', color: colors.severityHigh },
  Critical: { label: 'Nghiêm trọng', color: colors.severityCritical },
};

type TrendRange = 7 | 30;

/** BE trả `date` dạng "yyyy-MM-dd" (DateOnly) — parse thủ công để tránh lệch múi giờ. */
function toTrendPoints(trend: MyTaskProgressStats['completionTrend'], range: TrendRange): TrendPoint[] {
  return trend.slice(-range).map((item) => {
    const [year, month, day] = item.date.split('-').map(Number);
    const dateObj = new Date(year, (month ?? 1) - 1, day ?? 1);
    const label = range === 7 ? (WEEKDAY_SHORT[dateObj.getDay()] ?? '') : String(day);
    return { label, value: item.count };
  });
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
      {text}
    </Text>
  );
}

/** Tiêu đề cho 2 danh sách dưới — có icon nhận diện và số lượng. */
function ListHeader({
  icon,
  text,
  count,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  count: number;
}) {
  return (
    <View className="mb-2 flex-row items-center gap-1.5">
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
        {text}
      </Text>
      <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: colors.border }}>
        <Text className="text-[10px] font-bold text-textSecondary">{count}</Text>
      </View>
    </View>
  );
}

function LegendRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View className="flex-row items-center gap-2 py-1">
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="flex-1 text-xs text-textSecondary" numberOfLines={1}>
        {label}
      </Text>
      <Text className="text-xs font-bold text-textPrimary">{value}</Text>
      <Text className="w-9 text-right text-[11px] text-textSecondary">{percent}%</Text>
    </View>
  );
}

function RangeToggle({ value, onChange }: { value: TrendRange; onChange: (next: TrendRange) => void }) {
  const options: TrendRange[] = [7, 30];
  return (
    <View className="flex-row rounded-full p-0.5" style={{ backgroundColor: colors.surface }}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(option);
            }}
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: active ? colors.white : 'transparent' }}
          >
            <Text
              className="text-[11px] font-bold"
              style={{ color: active ? colors.textPrimary : colors.textSecondary }}
            >
              {option} ngày
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const COMMUNITY_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  OpenForJoin: { label: 'Đang mở đăng ký', color: '#075985', bg: '#E0F2FE' },
  JoinClosed: { label: 'Đã đóng đăng ký', color: '#3730A3', bg: '#E0E7FF' },
  InProgress: { label: 'Đang dọn', color: '#5B21B6', bg: '#EDE9FE' },
  PendingVerification: { label: 'Chờ xác minh', color: '#86198F', bg: '#FAE8FF' },
};

function CommunityProgressCard({
  item,
  onPress,
}: {
  item: CommunityCleanupListItem;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const percent = Math.max(0, Math.min(100, item.progressPercent));
  const meta = COMMUNITY_STATUS_META[item.status] ?? COMMUNITY_STATUS_META.OpenForJoin;
  const isFull = item.spotsLeft <= 0;

  return (
    <Animated.View style={animStyle} className="mb-2.5">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.985, { damping: 18, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 300 });
        }}
        className="overflow-hidden rounded-2xl bg-white"
        style={CARD_STYLE}
      >
        <View className="flex-row items-center gap-3 px-3.5 py-3">
          <View className="items-center">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-[14px] font-bold text-textPrimary" numberOfLines={1}>
                {item.title}
              </Text>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: meta.bg }}>
                <Text className="text-[10px] font-bold" style={{ color: meta.color }}>
                  {meta.label}
                </Text>
              </View>
            </View>

            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="people-outline" size={10} color={colors.textSecondary} />
              <Text className="text-[11px] text-textSecondary">
                {item.participantCount}/{item.maxParticipants} người
              </Text>
              {isFull ? (
                <Text className="text-[11px] font-semibold" style={{ color: colors.warning }}>
                  · Đã đủ
                </Text>
              ) : (
                <Text className="text-[11px] text-textSecondary">
                  · còn {item.spotsLeft} chỗ
                </Text>
              )}
            </View>

            <View
              className="mt-2 h-1 overflow-hidden rounded-full"
              style={{ backgroundColor: colors.border }}
            >
              <View
                className="h-full rounded-full"
                style={{ width: `${percent}%` as `${number}%`, backgroundColor: meta.color }}
              />
            </View>

            <View className="mt-1.5 flex-row items-center gap-2">
              <Text className="text-[10px] text-textDisabled">{item.reportCode}</Text>
              <View className="flex-1" />
              <Text className="text-[10px] font-bold" style={{ color: meta.color }}>
                {percent}%
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={15} color={colors.textDisabled} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function TaskListLoadingFooter({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View className="items-center py-4">
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

function ProgressSkeleton() {
  return (
    <View className="p-4">
      <View className="mb-4 h-[188px] rounded-2xl bg-white" style={CARD_STYLE} />
      <View className="mb-4 h-[190px] rounded-2xl bg-white" style={CARD_STYLE} />
      <View className="h-[178px] rounded-2xl bg-white" style={CARD_STYLE} />
    </View>
  );
}

export default function StaffProgressScreen() {
  const insets = useSafeAreaInsets();

  // Số liệu biểu đồ được BE tính sẵn (GET /teams/my-tasks/progress-stats) — không tự tổng hợp ở FE.
  const [statsData, setStatsData] = useState<MyTaskProgressStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const loadStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await cleanupAssignmentService.getMyTaskProgressStats();
      setStatsData(res.data.data);
    } catch {
      setStatsData(null);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch riêng, phân trang thật từ BE (5 phần tử/lần) chỉ cho phần "Theo từng nhiệm vụ".
  const {
    items: taskListItems,
    isLoading: isTaskListLoading,
    isLoadingMore: isLoadingMoreTasks,
    hasMore: hasMoreTasks,
    refetch: refetchTaskList,
    loadMore: loadMoreTasks,
  } = useMyAssignments({ pageSize: TASK_LIST_PAGE_SIZE });

  const [trendRange, setTrendRange] = useState<TrendRange>(7);

  const [ledItems, setLedItems] = useState<CommunityCleanupListItem[]>([]);
  const loadLed = useCallback(async () => {
    try {
      const res = await communityCleanupService.getLedByMe({ page: 1, pageSize: 50 });
      setLedItems(
        res.data.data.items.filter((i) => i.status !== 'Cancelled' && i.status !== 'Completed'),
      );
    } catch {
      setLedItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([loadStats(), refetchTaskList(), loadLed()]);
    }, [loadStats, refetchTaskList, loadLed]),
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceToBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceToBottom < END_REACHED_MARGIN_PX) {
        void loadMoreTasks();
      }
    },
    [loadMoreTasks],
  );

  const countOfStatus = useCallback(
    (status: AssignmentStatus) => statsData?.statusCounts.find((s) => s.status === status)?.count ?? 0,
    [statsData],
  );

  const stats = useMemo(() => {
    const total = statsData?.totalCount ?? 0;
    const completed = countOfStatus('Completed');
    const inProgress = countOfStatus('InProgress');
    const assigned = countOfStatus('Assigned');
    const others = total - completed - inProgress - assigned;
    return {
      total,
      completed,
      inProgress,
      assigned,
      others,
      overdue: statsData?.overdueCount ?? 0,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [statsData, countOfStatus]);

  const donutSegments: DonutSegment[] = useMemo(
    () =>
      [
        { key: 'completed', value: stats.completed, color: colors.primary },
        { key: 'inProgress', value: stats.inProgress, color: colors.warning },
        { key: 'assigned', value: stats.assigned, color: colors.info },
        { key: 'others', value: stats.others, color: colors.textDisabled },
      ].filter((s) => s.value > 0),
    [stats],
  );

  const severityData: BarDatum[] = useMemo(() => {
    const order = ['Low', 'Medium', 'High', 'Critical'];
    return order.map((key) => {
      const meta = SEVERITY_META[key];
      const value = statsData?.severityCounts.find((s) => s.severity === key)?.count ?? 0;
      return { key, label: meta.label, value, color: meta.color };
    });
  }, [statsData]);

  const trendData = useMemo(
    () => toTrendPoints(statsData?.completionTrend ?? [], trendRange),
    [statsData, trendRange],
  );
  const trendTotal = trendData.reduce((sum, p) => sum + p.value, 0);

  // Việc cần chú ý trước: chờ nhận / đang xử lý lên đầu, hoàn thành xuống cuối.
  // Chỉ sort trong phạm vi các trang đã tải (phân trang thật từ BE, 5 phần tử/lần).
  const sortedTasks = useMemo(() => {
    const weight: Record<string, number> = { InProgress: 0, Assigned: 1, Escalated: 2, Declined: 3, Completed: 4 };
    return [...taskListItems].sort(
      (a, b) => (weight[a.assignmentStatus] ?? 9) - (weight[b.assignmentStatus] ?? 9),
    );
  }, [taskListItems]);

  const handleTaskPress = useCallback((item: AssignmentItem) => {
    const params = getTaskRouteParams(item);
    if (!params.id) return;
    useFieldWorkerTaskStore.getState().setPendingItem(item);
    router.push({ pathname: '/assignment/[id]', params } as never);
  }, []);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-end justify-between border-b border-border px-5 pb-4 pt-2">
        <View>
          <Text
            className="text-[11px] font-bold uppercase text-textSecondary"
            style={{ letterSpacing: 1.5 }}
          >
            Hiệu suất
          </Text>
          <Text className="mt-0.5 text-2xl font-bold text-textPrimary">Tiến độ</Text>
        </View>
        {stats.overdue > 0 ? (
          <View
            className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <Ionicons name="alert-circle" size={12} color={colors.error} />
            <Text className="text-[11px] font-bold" style={{ color: colors.error }}>
              {stats.overdue} quá hạn
            </Text>
          </View>
        ) : null}
      </View>

      {isStatsLoading && !statsData ? (
        <View style={{ backgroundColor: colors.surface }} className="flex-1">
          <ProgressSkeleton />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.surface }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          refreshControl={
            <RefreshControl
              refreshing={isStatsLoading}
              onRefresh={() => {
                void loadStats();
                void refetchTaskList();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {stats.total === 0 && ledItems.length === 0 ? (
            <View className="items-center rounded-2xl bg-white px-6 py-14" style={CARD_STYLE}>
              <Ionicons name="trending-up-outline" size={40} color={colors.textDisabled} />
              <Text className="mt-3 text-base font-semibold text-textPrimary">Chưa có dữ liệu</Text>
              <Text className="mt-1 text-center text-sm leading-5 text-textSecondary">
                Nhận nhiệm vụ đầu tiên để bắt đầu theo dõi tiến độ và hiệu suất của bạn.
              </Text>
            </View>
          ) : (
            <>
              {/* Vòng phân bổ trạng thái */}
              <View className="mb-4 rounded-2xl bg-white p-4" style={CARD_STYLE}>
                <SectionLabel text="Tổng quan nhiệm vụ" />
                <View className="flex-row items-center gap-4">
                  <DonutChart segments={donutSegments} size={132} thickness={13}>
                    <Text className="text-[26px] font-extrabold leading-7 text-textPrimary">
                      {stats.total}
                    </Text>
                    <Text className="text-[10px] font-semibold text-textSecondary">nhiệm vụ</Text>
                  </DonutChart>

                  <View className="flex-1">
                    <LegendRow color={colors.primary} label="Hoàn thành" value={stats.completed} total={stats.total} />
                    <LegendRow color={colors.warning} label="Đang xử lý" value={stats.inProgress} total={stats.total} />
                    <LegendRow color={colors.info} label="Chờ nhận" value={stats.assigned} total={stats.total} />
                    {stats.others > 0 ? (
                      <LegendRow color={colors.textDisabled} label="Khác" value={stats.others} total={stats.total} />
                    ) : null}
                  </View>
                </View>

                <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
                  <Text className="text-xs text-textSecondary">Tỉ lệ hoàn thành</Text>
                  <Text className="text-base font-extrabold" style={{ color: colors.primary }}>
                    {stats.rate}%
                  </Text>
                </View>
              </View>

              {/* Đường xu hướng hoàn thành */}
              <View className="mb-4 rounded-2xl bg-white p-4" style={CARD_STYLE}>
                <View className="mb-3 flex-row items-start justify-between">
                  <View>
                    <SectionLabel text="Xu hướng hoàn thành" />
                    <Text className="text-lg font-bold text-textPrimary">
                      {trendTotal} <Text className="text-xs font-normal text-textSecondary">việc xong</Text>
                    </Text>
                  </View>
                  <RangeToggle value={trendRange} onChange={setTrendRange} />
                </View>
                <TrendAreaChart data={trendData} width={CHART_WIDTH} height={124} />
              </View>

              {/* Cột theo mức độ */}
              <View className="mb-4 rounded-2xl bg-white p-4" style={CARD_STYLE}>
                <SectionLabel text="Khối lượng theo mức độ" />
                <SeverityBarChart data={severityData} height={112} />
              </View>

              {/* Chương trình cộng đồng */}
              {ledItems.length > 0 ? (
                <View className="mb-4 mt-2">
                  <ListHeader icon="people-outline" text="Chương trình đang dẫn" count={ledItems.length} />
                  {ledItems.map((item) => (
                    <CommunityProgressCard
                      key={item.id}
                      item={item}
                      onPress={() =>
                        router.push({ pathname: '/community-lead/[id]', params: { id: item.id } } as never)
                      }
                    />
                  ))}
                </View>
              ) : null}

              {/* Từng nhiệm vụ — phân trang 5 phần tử/lần, tự tải thêm khi cuộn gần cuối */}
              {sortedTasks.length > 0 ? (
                <View className="mt-2">
                  <ListHeader
                    icon="clipboard-outline"
                    text="Theo từng nhiệm vụ"
                    count={stats.total || sortedTasks.length}
                  />
                  {sortedTasks.map((item) => (
                    <TaskProgressCard key={item.assignmentId} item={item} onPress={handleTaskPress} />
                  ))}
                  <TaskListLoadingFooter visible={isLoadingMoreTasks && hasMoreTasks} />
                  {!hasMoreTasks && sortedTasks.length > TASK_LIST_PAGE_SIZE ? (
                    <Text className="py-2 text-center text-[11px] text-textDisabled">
                      Đã hiển thị tất cả nhiệm vụ
                    </Text>
                  ) : null}
                </View>
              ) : isTaskListLoading ? (
                <View className="mt-2">
                  <ListHeader icon="clipboard-outline" text="Theo từng nhiệm vụ" count={0} />
                  <TaskListLoadingFooter visible />
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
