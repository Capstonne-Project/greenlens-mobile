import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Toast, useToast } from '@/components/common/Toast';
import { AssignmentActionButton } from '@/components/assignment/AssignmentActionButton';
import { BeforeImagesNextStepCard } from '@/components/assignment/BeforeImagesNextStepCard';
import { TimerCard } from '@/components/assignment/TimerCard';
import { ReportCommentsSection } from '@/components/report/ReportCommentsSection';
import { ReportSatisfactionCard } from '@/components/report/ReportSatisfactionCard';
import { useReportComments } from '@/hooks/useReportComments';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { reportDetailService } from '@/services/reportDetail.service';
import { useAuthStore } from '@/stores/auth.store';
import { useFieldWorkerTaskStore } from '@/stores/fieldWorkerTask.store';
import { colors } from '@/theme/colors';
import { getApiErrorMessage } from '@/utils/api-error-message';
import {
  resolveDeclineDeadline,
  resolveProgressRequiredBy,
} from '@/utils/countdown';
import { firstRouteParam } from '@/utils/field-worker-task';
import type { TaskDetail } from '@/types/cleanup-assignment.types';
import type { ReportSatisfaction } from '@/types/report-detail.types';

// ─── Configs ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Low:      { label: 'Thấp',         color: '#166534', bg: '#DCFCE7' },
  Medium:   { label: 'Trung bình',   color: '#92400E', bg: '#FEF3C7' },
  High:     { label: 'Cao',          color: '#9A3412', bg: '#FFEDD5' },
  Critical: { label: 'Nghiêm trọng', color: '#991B1B', bg: '#FEE2E2' },
};

const ASSIGNMENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Assigned:   { label: 'Mới giao',   color: '#1E40AF', bg: '#DBEAFE' },
  InProgress: { label: 'Đang xử lý', color: '#065F46', bg: '#D1FAE5' },
  Completed:  { label: 'Hoàn thành', color: '#374151', bg: '#F3F4F6' },
  Declined:   { label: 'Từ chối',    color: '#991B1B', bg: '#FEE2E2' },
  Escalated:  { label: 'Đã chuyển cấp', color: '#6D28D9', bg: '#EDE9FE' },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_HEIGHT = 320;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatSlaRemaining(slaStr: string): { text: string; overdue: boolean } {
  const diff = new Date(slaStr).getTime() - Date.now();
  if (diff <= 0) {
    const over = Math.abs(diff);
    const h    = Math.floor(over / 3_600_000);
    const m    = Math.floor((over % 3_600_000) / 60_000);
    return { text: `Quá ${h > 0 ? `${h}h ` : ''}${m}m`, overdue: true };
  }
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return { text: `${h}h ${m}m`, overdue: false };
}

function hoursAgoSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return (
    <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
      {label}
    </Text>
  );
}

interface TimelineStepProps {
  label: string;
  time: string | null;
  done: boolean;
  active?: boolean;
  isLast?: boolean;
}

function TimelineStep({ label, time, done, active = false, isLast = false }: TimelineStepProps) {
  const dotColor = done ? colors.primary : active ? colors.warning : colors.border;
  const labelColor = active ? '#92400E' : done ? colors.textPrimary : colors.textSecondary;

  return (
    <View className="flex-row items-start">
      <View className="mr-3 items-center" style={{ width: 20 }}>
        <View
          className="h-4 w-4 items-center justify-center rounded-full"
          style={{ backgroundColor: dotColor }}
        >
          {done ? <Ionicons name="checkmark" size={10} color="#fff" /> : null}
        </View>
        {!isLast && (
          <View className="mt-0.5 w-px flex-1" style={{ backgroundColor: colors.border, minHeight: 24 }} />
        )}
      </View>
      <View className="flex-1 pb-4">
        <Text
          className="text-sm"
          style={{ color: labelColor, fontWeight: active ? '700' : '600' }}
        >
          {label}
        </Text>
        {time ? <Text className="text-xs text-textSecondary">{time}</Text> : null}
        {active && !done ? (
          <Text className="mt-0.5 text-xs font-medium" style={{ color: colors.warning }}>
            Bước tiếp theo
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface TaskDetailGalleryProps {
  images: { url: string }[];
  severityBg: string;
  severityColor: string;
}

/** Gallery ảnh hiện trường nhiều ảnh — cùng format viền/overlay như report detail của USER. */
function TaskDetailGallery({ images, severityBg, severityColor }: TaskDetailGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const items = images.length > 0 ? images : [{ url: '' }];

  return (
    <View style={{ height: GALLERY_HEIGHT, backgroundColor: '#000' }}>
      <FlatList
        data={items}
        keyExtractor={(item, index) => item.url || `placeholder-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIndex(Math.max(0, Math.min(items.length - 1, index)));
        }}
        renderItem={({ item }) =>
          item.url ? (
            <Image
              source={{ uri: item.url }}
              style={{ width: SCREEN_WIDTH, height: GALLERY_HEIGHT }}
              contentFit="cover"
            />
          ) : (
            <View
              className="items-center justify-center"
              style={{ width: SCREEN_WIDTH, height: GALLERY_HEIGHT, backgroundColor: severityBg }}
            >
              <Ionicons name="image-outline" size={48} color={severityColor} />
            </View>
          )
        }
      />

      {images.length > 1 ? (
        <>
          <View pointerEvents="none" className="absolute bottom-4 left-4 flex-row gap-1.5">
            {images.map((_, index) => (
              <View
                key={`dot-${index}`}
                className="rounded-full"
                style={{
                  width: activeIndex === index ? 7 : 5,
                  height: activeIndex === index ? 7 : 5,
                  backgroundColor: activeIndex === index ? '#fff' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </View>
          <View pointerEvents="none" className="absolute bottom-4 right-4 rounded-full bg-black/45 px-2.5 py-1">
            <Text className="text-[11px] font-semibold text-white">
              {activeIndex + 1}/{images.length}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View>
      <View className="h-56 w-full bg-surface" />
      <View className="p-4 gap-3">
        <View className="h-3 w-24 rounded bg-border" />
        <View className="h-6 w-3/4 rounded bg-border" />
        <View className="h-4 w-full rounded bg-surface" />
        <View className="h-4 w-2/3 rounded bg-surface" />
        <View className="mt-4 h-3 w-20 rounded bg-border" />
        <View className="h-16 rounded-xl bg-surface" />
        <View className="mt-4 h-3 w-20 rounded bg-border" />
        <View className="h-24 rounded-xl bg-surface" />
      </View>
    </View>
  );
}

// ─── Animated press button ────────────────────────────────────────────────────

interface AnimatedButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: object;
  className?: string;
  /** false = không chiếm flex:1 (CTA full-width đơn) */
  grow?: boolean;
  children: ReactNode;
}

const FOOTER_BUTTON_HEIGHT = 52;

function AnimatedButton({
  onPress,
  disabled,
  style,
  className,
  grow = true,
  children,
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animStyle, grow ? { flex: 1 } : { width: '100%' }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(0.96); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        className={className}
        style={[
          {
            height: FOOTER_BUTTON_HEIGHT,
            justifyContent: 'center',
            alignItems: 'center',
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AssignmentDetailScreen() {
  const params = useLocalSearchParams<{
    id: string | string[];
    assignmentId?: string | string[];
  }>();
  const reportIdParam = firstRouteParam(params.id);
  const assignmentIdParam = firstRouteParam(params.assignmentId);
  const insets  = useSafeAreaInsets();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [task, setTask]           = useState<TaskDetail | null>(null);
  const [satisfaction, setSatisfaction] = useState<ReportSatisfaction | null>(null);
  const [isLoading, setLoading]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const { toastState, show: showToast, hide: hideToast } = useToast();
  const {
    isLeader,
    isLoading: isAccessLoading,
    errorMessage: accessError,
  } = useTeamAccess();

  const showFeedbackBlock =
    task != null &&
    (task.assignmentStatus === 'Completed' ||
      task.reportStatus === 'Resolved' ||
      task.reportStatus === 'Closed' ||
      task.reportStatus === 'ClosedNoViolation');

  const {
    threads,
    isLoading: isCommentsLoading,
    isSubmitting: isCommentSubmitting,
    likingCommentId,
    errorMessage: commentsError,
    refetch: refetchComments,
    addComment,
    toggleLike,
  } = useReportComments(task?.reportId, Boolean(showFeedbackBlock && task?.reportId));

  const loadDetail = useCallback(async () => {
    const reportId = reportIdParam;
    if (!reportId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await cleanupAssignmentService.getMyTaskDetail(reportId);
      const nextTask = res.data.data;
      setTask(nextTask);
      useFieldWorkerTaskStore.getState().clearPendingItem(reportId, assignmentIdParam);

      const shouldLoadSatisfaction =
        nextTask.assignmentStatus === 'Completed' ||
        nextTask.reportStatus === 'Resolved' ||
        nextTask.reportStatus === 'Closed' ||
        nextTask.reportStatus === 'ClosedNoViolation';

      if (shouldLoadSatisfaction) {
        try {
          const reportRes = await reportDetailService.getById(reportId);
          setSatisfaction(reportRes.data.data.satisfaction ?? null);
        } catch {
          setSatisfaction(null);
        }
      } else {
        setSatisfaction(null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải chi tiết nhiệm vụ.'));
      setSatisfaction(null);
    } finally {
      setLoading(false);
    }
  }, [reportIdParam, assignmentIdParam]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail().catch(() => undefined);
    }, [loadDetail]),
  );

  const handleAccept = useCallback(async () => {
    const reportId = task?.reportId ?? reportIdParam;
    if (!reportId || accepting) return;
    setAccepting(true);
    try {
      await cleanupAssignmentService.accept(reportId);
      const detailResponse = await cleanupAssignmentService.getMyTaskDetail(reportId);
      const refreshedTask = detailResponse.data.data;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!refreshedTask.hasBeforeImages) {
        router.replace({
          pathname: '/assignment/before-images',
          params: {
            reportId,
            reportCode: refreshedTask.reportCode,
          },
        } as never);
        return;
      }
      setTask(refreshedTask);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Không thể nhận nhiệm vụ. Thử lại.', 'error');
    } finally {
      setAccepting(false);
    }
  }, [task, reportIdParam, accepting, showToast]);

  const handleOpenBeforeImages = useCallback(() => {
    if (!task) return;
    router.push({
      pathname: '/assignment/before-images',
      params: {
        reportId: task.reportId,
        reportCode: task.reportCode,
      },
    } as never);
  }, [task]);

  const handleOpenProgress = useCallback(() => {
    if (!task) return;
    const hours = hoursAgoSince(task.progressUpdatedAt);
    router.push({
      pathname: '/assignment/progress',
      params: {
        reportId: task.reportId,
        currentPercent: String(task.progressPercent),
        lastUpdatedHoursAgo: hours !== null ? String(hours) : '',
        // Today's history — from progressNote as single entry if available
        historyJson: task.progressNote && task.progressUpdatedAt
          ? JSON.stringify([{
              time: new Date(task.progressUpdatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              note: task.progressNote,
              percent: task.progressPercent,
            }])
          : '[]',
      },
    } as never);
  }, [task]);

  const handleOpenComplete = useCallback(() => {
    if (!task) return;
    router.push({
      pathname: '/assignment/complete',
      params: {
        reportId: task.reportId,
        reportCode: task.reportCode,
        currentPercent: String(task.progressPercent),
      },
    } as never);
  }, [task]);

  const handleOpenEscalate = useCallback(() => {
    if (!task) return;
    router.push({
      pathname: '/assignment/escalate',
      params: {
        reportId: task.reportId,
        reportCode: task.reportCode,
      },
    } as never);
  }, [task]);

  const severity     = SEVERITY_CONFIG[task?.severity ?? 'Medium'] ?? SEVERITY_CONFIG.Medium;
  const assignStatus = task
    ? (ASSIGNMENT_STATUS_CONFIG[task.assignmentStatus] ?? ASSIGNMENT_STATUS_CONFIG.Assigned)
    : null;
  const sla = task?.slaResolveDueAt ? formatSlaRemaining(task.slaResolveDueAt) : null;
  const hasBeforeImages = task?.hasBeforeImages === true;
  const awaitingBeforeImages =
    task?.assignmentStatus === 'InProgress' && !hasBeforeImages;
  const declineDeadline = task
    ? resolveDeclineDeadline(task.declineDeadlineAt, task.assignedAt)
    : null;
  const progressDue = task
    ? resolveProgressRequiredBy(
        task.progressRequiredByAt,
        task.progressUpdatedAt,
        task.startedAt,
        task.assignedAt,
      )
    : null;
  return (
    <View className="flex-1 bg-background">
      {/* Back + SLA overlay */}
      <View
        className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-black/40"
        >
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>

        {task ? (
          <View className="flex-row items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5">
            {sla ? (
              <>
                <Ionicons name="time" size={14} color={sla.overdue ? '#FCA5A5' : colors.white} />
                <Text className="text-xs font-bold text-white">
                  SLA {sla.text}
                </Text>
              </>
            ) : assignStatus ? (
              <Text className="text-[11px] font-bold text-white">
                {assignStatus.label}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {isLoading ? (
          <DetailSkeleton />
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6 py-32">
            <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
            <Text className="mt-3 text-base font-semibold text-textPrimary">{error}</Text>
            <Pressable
              onPress={loadDetail}
              className="mt-4 rounded-xl px-6 py-2.5"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="font-semibold text-white">Thử lại</Text>
            </Pressable>
          </View>
        ) : task ? (
          <>
            {/* Gallery ảnh hiện trường — nhiều ảnh, cùng format với report detail của USER */}
            <TaskDetailGallery
              images={task.reportImages}
              severityBg={severity.bg}
              severityColor={severity.color}
            />

            {/* Dialog bao ngoài — bo góc trên, chồng lên gallery */}
            <View
              className="-mt-6 rounded-t-[28px] bg-white"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: -4 },
                elevation: 18,
              }}
            >
              <View className="items-center pt-2.5">
                <View className="h-1.5 w-10 rounded-full bg-border" />
              </View>

              <View className="px-4 pt-3">
              {/* Code + badges */}
              <View className="mb-2 flex-row flex-wrap items-center gap-2">
                <Text className="text-xs text-textSecondary">{task.reportCode}</Text>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: severity.bg }}>
                  <Text className="text-[11px] font-semibold" style={{ color: severity.color }}>{severity.label}</Text>
                </View>
                {assignStatus && (
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: assignStatus.bg }}>
                    <Text className="text-[11px] font-semibold" style={{ color: assignStatus.color }}>{assignStatus.label}</Text>
                  </View>
                )}
              </View>

              <Text className="mb-1 text-xl font-bold text-textPrimary">{task.categoryName}</Text>

              <View className="mb-4 flex-row items-start gap-1">
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sm text-textSecondary">{task.address}</Text>
              </View>

              {awaitingBeforeImages ? (
                <BeforeImagesNextStepCard
                  onPressPrimary={handleOpenBeforeImages}
                />
              ) : null}

              <View className="mb-4 h-px bg-border" />

              {/* Description */}
              {task.description ? (
                <View className="mb-4">
                  <SectionTitle label="Mô tả hiện trường" />
                  <Text className="text-sm leading-5 text-textPrimary">{task.description}</Text>
                </View>
              ) : null}

              {/* Officer note */}
              {task.assignmentNote ? (
                <View className="mb-4">
                  <SectionTitle label="Ghi chú officer" />
                  <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#ECFDF5' }}>
                    <Text className="text-sm leading-5" style={{ color: '#065F46' }}>{task.assignmentNote}</Text>
                  </View>
                </View>
              ) : null}

              {/* Waste tags */}
              {task.wasteTags && task.wasteTags.length > 0 ? (
                <View className="mb-4">
                  <SectionTitle label="Loại rác" />
                  <View className="flex-row flex-wrap gap-2">
                    {task.wasteTags.map((tag) => (
                      <View
                        key={tag.code}
                        className="rounded-full px-3 py-1"
                        style={{ backgroundColor: '#ECFDF5' }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: '#065F46' }}>
                          {tag.nameVi}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Progress — chỉ hiện khi đã có before (tránh 0% gây hiểu nhầm) */}
              {task.assignmentStatus === 'InProgress' && hasBeforeImages ? (
                <View className="mb-4">
                  <View className="mb-1 flex-row items-center justify-between">
                    <SectionTitle label="Tiến độ" />
                    <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                      {task.progressPercent}%
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-surface">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${task.progressPercent}%` as `${number}%`,
                        backgroundColor: colors.primary,
                      }}
                    />
                  </View>
                  {task.progressNote ? (
                    <Text className="mt-1 text-xs text-textSecondary">{task.progressNote}</Text>
                  ) : null}
                  {task.progressUpdatedAt ? (
                    <Text className="mt-1 text-xs text-textSecondary">
                      Cập nhật lúc {formatDateTime(task.progressUpdatedAt)}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Countdown timers */}
              <View className="mb-4 gap-3">
                <SectionTitle label="Thời gian" />
                <View className="flex-row gap-3">
                  <TimerCard
                    icon="timer-outline"
                    title="SLA xử lý"
                    subtitle={task.slaResolveDueAt ? formatDateTime(task.slaResolveDueAt) : undefined}
                    deadlineIso={task.slaResolveDueAt}
                    tone="warning"
                    emptyLabel="Không có"
                  />
                  {task.assignmentStatus === 'Assigned' ? (
                    <TimerCard
                      icon="hourglass-outline"
                      title="Hạn từ chối"
                      subtitle="Còn thời gian để từ chối"
                      deadlineIso={declineDeadline}
                      tone="danger"
                      emptyLabel="—"
                    />
                  ) : task.assignmentStatus === 'InProgress' && hasBeforeImages ? (
                    <TimerCard
                      icon="refresh-outline"
                      title="Cập nhật tiến độ"
                      subtitle="Nên cập nhật mỗi 24 giờ"
                      deadlineIso={progressDue}
                      tone="primary"
                      emptyLabel="—"
                    />
                  ) : null}
                </View>
              </View>

              <View className="mb-4 h-px bg-border" />

              {/* Timeline */}
              <View className="mb-4">
                <SectionTitle label="Tiến trình" />
                <TimelineStep
                  label="Giao cho đội"
                  time={formatTime(task.assignedAt)}
                  done
                />
                <TimelineStep
                  label="Chấp nhận / Check-in"
                  time={task.startedAt ? formatTime(task.startedAt) : null}
                  done={!!task.startedAt || task.assignmentStatus === 'InProgress'}
                />
                <TimelineStep
                  label="Ảnh hiện trạng trước dọn"
                  time={hasBeforeImages ? 'Đã gửi' : null}
                  done={hasBeforeImages}
                  active={awaitingBeforeImages}
                />
                <TimelineStep
                  label="Xử lý hiện trường"
                  time={
                    task.progressUpdatedAt
                      ? `Cập nhật ${formatDateTime(task.progressUpdatedAt)}`
                      : 'Cập nhật tiến độ là tùy chọn'
                  }
                  done={task.assignmentStatus === 'Completed'}
                  active={task.assignmentStatus === 'InProgress' && hasBeforeImages}
                />
                <TimelineStep
                  label="Hoàn thành"
                  time={task.completedAt ? formatDateTime(task.completedAt) : null}
                  done={task.assignmentStatus === 'Completed'}
                  isLast
                />
              </View>

              {/* Coordinates */}
              <View className="mb-4">
                <SectionTitle label="Tọa độ" />
                <Text className="text-sm text-textSecondary">
                  {task.latitude.toFixed(6)}°N, {task.longitude.toFixed(6)}°E
                </Text>
              </View>

              {/* SLA */}
              {task.slaResolveDueAt && (
                <View className="mb-2">
                  <SectionTitle label="Hạn xử lý (SLA)" />
                  <Text className="text-sm text-textSecondary">{formatDateTime(task.slaResolveDueAt)}</Text>
                </View>
              )}

              {showFeedbackBlock ? (
                <View className="mb-2 mt-2">
                  <View className="mb-4 h-px bg-border" />
                  {satisfaction ? (
                    <ReportSatisfactionCard satisfaction={satisfaction} />
                  ) : (
                    <View className="mb-4 rounded-2xl bg-surface px-4 py-3">
                      <Text className="text-sm text-textSecondary">
                        Người báo cáo chưa gửi đánh giá chất lượng xử lý.
                      </Text>
                    </View>
                  )}
                  <ReportCommentsSection
                    threads={threads}
                    isLoading={isCommentsLoading}
                    isSubmitting={isCommentSubmitting}
                    likingCommentId={likingCommentId}
                    errorMessage={commentsError}
                    composerLabel="Phản hồi đánh giá"
                    composerPlaceholder="Cảm ơn / phản hồi người báo cáo…"
                    emptyLabel="Chưa có phản hồi. Gửi lời cảm ơn hoặc giải thích khi có đánh giá."
                    onSubmit={async (content, parentCommentId) => {
                      const ok = await addComment(content, parentCommentId);
                      if (ok) {
                        showToast('Đã gửi phản hồi.', 'success');
                      }
                      return ok;
                    }}
                    onToggleLike={toggleLike}
                    onRetry={() => void refetchComments()}
                    onOpenUserProfile={(userId) => {
                      // Staff shell không có màn hồ sơ cá nhân — bấm vào chính mình thì bỏ qua.
                      if (userId === currentUserId) return;
                      router.push({ pathname: '/user/[id]', params: { id: userId } } as Href);
                    }}
                  />
                </View>
              ) : null}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Bottom action bar */}
      {!isLoading && !error && task && (
        <SafeAreaView
          edges={['bottom']}
          className="border-t border-border bg-white px-4 pt-3"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -2 },
            elevation: 8,
          }}
        >
          {isAccessLoading ? (
            <View className="h-12 flex-row items-center justify-center gap-2">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-sm text-textSecondary">Đang kiểm tra quyền thao tác</Text>
            </View>
          ) : !isLeader ? (
            <View className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-surface px-4 py-3">
              <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
              <Text className="flex-1 text-center text-sm text-textSecondary">
                {accessError ?? 'Bạn đang xem nhiệm vụ. Chỉ trưởng nhóm được cập nhật trạng thái.'}
              </Text>
            </View>
          ) : task.assignmentStatus === 'Assigned' ? (
            <View className="flex-row gap-3">
              {task.canDecline && (
                <AnimatedButton
                  onPress={() =>
                    router.push({
                      pathname: '/assignment/decline',
                      params: {
                        reportId: task.reportId,
                        reportCode: task.reportCode,
                        assignedAt: task.assignedAt,
                        declineDeadlineAt: task.declineDeadlineAt ?? '',
                      },
                    } as never)
                  }
                  className="rounded-xl border-2 border-error"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="close" size={18} color={colors.error} />
                    <Text className="font-bold" style={{ color: colors.error }}>Từ chối</Text>
                  </View>
                </AnimatedButton>
              )}
              <AnimatedButton
                onPress={handleAccept}
                disabled={accepting}
                className="rounded-xl"
                style={{ backgroundColor: colors.primary }}
              >
                {accepting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text className="font-bold text-white">Nhận nhiệm vụ</Text>
                  </View>
                )}
              </AnimatedButton>
            </View>
          ) : task.assignmentStatus === 'InProgress' ? (
            awaitingBeforeImages ? (
              <View className="gap-2">
                <Text className="text-center text-xs text-textSecondary">
                  Đã nhận nhiệm vụ · Cần ảnh hiện trạng để tiếp tục
                </Text>
                <AnimatedButton
                  onPress={handleOpenBeforeImages}
                  grow={false}
                  className="rounded-xl"
                  style={{ backgroundColor: colors.primary }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="camera" size={18} color="#fff" />
                    <Text className="font-bold text-white">Chụp ảnh hiện trạng ngay</Text>
                  </View>
                </AnimatedButton>
              </View>
            ) : (
              <View className="gap-2.5">
                <View className="flex-row items-stretch gap-3">
                  {task.canUpdateProgress ? (
                    <View style={{ flex: 1 }}>
                      <AssignmentActionButton
                        label="Cập nhật"
                        icon="create-outline"
                        variant="secondary"
                        onPress={handleOpenProgress}
                      />
                    </View>
                  ) : null}
                  {task.canResolve ? (
                    <View style={{ flex: 1 }}>
                      <AssignmentActionButton
                        label="Hoàn thành"
                        icon="checkmark-done"
                        variant="primary"
                        onPress={handleOpenComplete}
                      />
                    </View>
                  ) : null}
                </View>
                <Pressable
                  onPress={handleOpenEscalate}
                  className="flex-row items-center justify-center gap-1.5 py-1"
                  hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                >
                  <Ionicons name="arrow-up-circle-outline" size={16} color={colors.textSecondary} />
                  <Text className="text-xs font-semibold text-textSecondary">
                    Vượt khả năng xử lý? Chuyển cấp
                  </Text>
                </Pressable>
              </View>
            )
          ) : task.assignmentStatus === 'Completed' ? (
            <View className="h-12 flex-row items-center justify-center gap-2 rounded-xl" style={{ backgroundColor: '#ECFDF5' }}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text className="font-bold" style={{ color: colors.primary }}>Đã hoàn thành</Text>
            </View>
          ) : task.assignmentStatus === 'Declined' ? (
            <View className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-surface">
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              <Text className="font-semibold text-textSecondary">Đã từ chối</Text>
            </View>
          ) : task.assignmentStatus === 'Escalated' ? (
            <View className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-surface">
              <Ionicons name="arrow-up-circle-outline" size={20} color={colors.textSecondary} />
              <Text className="font-semibold text-textSecondary">Đã chuyển cấp xử lý</Text>
            </View>
          ) : null}
        </SafeAreaView>
      )}

      <Toast
        visible={toastState.visible}
        type={toastState.type}
        message={toastState.message}
        onHide={hideToast}
      />
    </View>
  );
}
