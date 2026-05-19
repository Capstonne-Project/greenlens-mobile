import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Toast, useToast } from '@/components/common/Toast';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';
import type { TaskDetail } from '@/types/cleanup-assignment.types';

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
};

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
  isLast?: boolean;
}

function TimelineStep({ label, time, done, isLast = false }: TimelineStepProps) {
  return (
    <View className="flex-row items-start">
      <View className="mr-3 items-center" style={{ width: 20 }}>
        <View
          className="h-4 w-4 items-center justify-center rounded-full"
          style={{ backgroundColor: done ? colors.primary : colors.border }}
        >
          {done && <Ionicons name="checkmark" size={10} color="#fff" />}
        </View>
        {!isLast && (
          <View className="mt-0.5 w-px flex-1" style={{ backgroundColor: colors.border, minHeight: 24 }} />
        )}
      </View>
      <View className="flex-1 pb-4">
        <Text className="text-sm font-semibold" style={{ color: done ? colors.textPrimary : colors.textSecondary }}>
          {label}
        </Text>
        {time && <Text className="text-xs text-textSecondary">{time}</Text>}
      </View>
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
  children: React.ReactNode;
}

function AnimatedButton({ onPress, disabled, style, className, children }: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animStyle, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(0.96); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        className={className}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── Resolve Confirm Modal ────────────────────────────────────────────────────

interface ResolveModalProps {
  reportId: string;
  teamId: string;
  afterImageUrls: string[];
  onSuccess: () => void;
  onClose: () => void;
}

function ResolveModal({ reportId, teamId, afterImageUrls, onSuccess, onClose }: ResolveModalProps) {
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const canResolve = afterImageUrls.length >= 2;

  const handleResolve = useCallback(async () => {
    if (!canResolve) return;
    setSubmit(true);
    setError(null);
    try {
      await cleanupAssignmentService.resolve(reportId, { teamId, afterImageUrls });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch {
      setError('Không thể hoàn thành. Vui lòng thử lại.');
      setSubmit(false);
    }
  }, [canResolve, reportId, teamId, afterImageUrls, onSuccess]);

  return (
    <View
      className="absolute inset-0 items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <View className="mx-6 w-full rounded-2xl bg-white p-6">
        <View
          className="mb-3 h-14 w-14 items-center justify-center self-center rounded-full"
          style={{ backgroundColor: '#D1FAE5' }}
        >
          <Ionicons name="checkmark-done" size={28} color={colors.primary} />
        </View>
        <Text className="mb-2 text-center text-lg font-bold text-textPrimary">Hoàn thành nhiệm vụ?</Text>
        <Text className="mb-1 text-center text-sm text-textSecondary">
          Xác nhận đã xử lý xong điểm ô nhiễm này.
        </Text>

        {!canResolve && (
          <View className="mb-3 mt-2 flex-row items-start gap-2 rounded-xl bg-amber-50 px-3 py-2">
            <Ionicons name="warning-outline" size={16} color="#92400E" style={{ marginTop: 1 }} />
            <Text className="flex-1 text-xs" style={{ color: '#92400E' }}>
              Cần ít nhất 2 ảnh minh chứng. Hãy cập nhật tiến độ với ảnh trước.
            </Text>
          </View>
        )}

        {canResolve && (
          <Text className="mb-4 text-center text-xs text-textSecondary">
            {afterImageUrls.length} ảnh after sẽ được gửi.
          </Text>
        )}

        {error && (
          <Text className="mb-3 text-center text-sm" style={{ color: colors.error }}>{error}</Text>
        )}

        <View className="flex-row gap-3">
          <Pressable
            onPress={onClose}
            className="flex-1 h-11 items-center justify-center rounded-xl border border-border"
          >
            <Text className="font-semibold text-textSecondary">Hủy</Text>
          </Pressable>
          <Pressable
            onPress={handleResolve}
            disabled={!canResolve || submitting}
            className="flex-1 h-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: canResolve && !submitting ? colors.primary : colors.border }}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text className="font-bold text-white">Xác nhận</Text>
            }
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets  = useSafeAreaInsets();
  const teamId  = useAuthStore((s) => s.user?.teamId ?? '');

  const [task, setTask]           = useState<TaskDetail | null>(null);
  const [isLoading, setLoading]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const { toastState, show: showToast, hide: hideToast } = useToast();

  // Accumulated after-image URLs from progress updates
  const afterUrlsRef = useRef<string[]>([]);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cleanupAssignmentService.getMyTaskDetail(id);
      setTask(res.data.data);
    } catch {
      setError('Không thể tải chi tiết nhiệm vụ.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  const handleAccept = useCallback(async () => {
    if (!id || accepting) return;
    setAccepting(true);
    try {
      await cleanupAssignmentService.accept(id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Đã nhận nhiệm vụ thành công!');
      await loadDetail();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Không thể nhận nhiệm vụ. Thử lại.', 'error');
    } finally {
      setAccepting(false);
    }
  }, [id, accepting, loadDetail, showToast]);

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

  const handleResolveSuccess = useCallback(() => {
    setShowResolve(false);
    showToast('Hoàn thành nhiệm vụ!');
    setTimeout(() => router.back(), 1400);
  }, [showToast]);

  const severity     = SEVERITY_CONFIG[task?.severity ?? 'Medium'] ?? SEVERITY_CONFIG.Medium;
  const assignStatus = task
    ? (ASSIGNMENT_STATUS_CONFIG[task.assignmentStatus] ?? ASSIGNMENT_STATUS_CONFIG.Assigned)
    : null;
  const sla = task?.slaResolveDueAt ? formatSlaRemaining(task.slaResolveDueAt) : null;
  const firstImage = task?.reportImages?.[0]?.url ?? null;

  return (
    <View className="flex-1 bg-background">
      {/* Back + SLA overlay */}
      <View
        className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full bg-white"
          style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        {task && (
          <View
            className="flex-row items-center gap-1.5 rounded-full bg-white px-3 py-1.5"
            style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 }}
          >
            {sla ? (
              <>
                <Ionicons name="time" size={14} color={sla.overdue ? colors.error : colors.warning} />
                <Text className="text-xs font-bold" style={{ color: sla.overdue ? colors.error : colors.warning }}>
                  SLA {sla.text}
                </Text>
              </>
            ) : assignStatus ? (
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: assignStatus.bg }}>
                <Text className="text-[11px] font-semibold" style={{ color: assignStatus.color }}>
                  {assignStatus.label}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
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
            {/* Hero image */}
            {firstImage ? (
              <Image source={{ uri: firstImage }} style={{ width: '100%', height: 240 }} contentFit="cover" />
            ) : (
              <View className="w-full items-center justify-center" style={{ height: 180, backgroundColor: severity.bg }}>
                <Ionicons name="image-outline" size={48} color={severity.color} />
              </View>
            )}

            <View className="px-4 pt-4">
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

              {/* Progress bar (InProgress) */}
              {task.assignmentStatus === 'InProgress' && (
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
                </View>
              )}

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
                  done={!!task.startedAt}
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
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Bottom action bar */}
      {!isLoading && !error && task && (
        <View
          className="border-t border-border bg-white px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {task.assignmentStatus === 'Assigned' ? (
            <View className="flex-row gap-3">
              {task.canDecline && (
                <AnimatedButton
                  onPress={() =>
                    router.push({
                      pathname: '/assignment/decline',
                      params: {
                        reportId:   task.reportId,
                        reportCode: task.reportCode,
                        assignedAt: task.assignedAt,
                      },
                    } as never)
                  }
                  className="h-12 items-center justify-center rounded-xl border-2 border-error"
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
                className="h-12 items-center justify-center rounded-xl"
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
            <View className="flex-row gap-3">
              {task.canUpdateProgress && (
                <AnimatedButton
                  onPress={handleOpenProgress}
                  className="h-12 items-center justify-center rounded-xl border border-primary"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="camera-outline" size={18} color={colors.primary} />
                    <Text className="font-semibold text-primary">Cập nhật</Text>
                  </View>
                </AnimatedButton>
              )}
              {task.canResolve && (
                <AnimatedButton
                  onPress={() => setShowResolve(true)}
                  className="h-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.primary }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text className="font-bold text-white">Hoàn thành</Text>
                  </View>
                </AnimatedButton>
              )}
            </View>
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
          ) : null}
        </View>
      )}

      {/* Resolve confirm overlay */}
      {showResolve && task && (
        <ResolveModal
          reportId={task.reportId}
          teamId={teamId}
          afterImageUrls={afterUrlsRef.current}
          onSuccess={handleResolveSuccess}
          onClose={() => setShowResolve(false)}
        />
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
