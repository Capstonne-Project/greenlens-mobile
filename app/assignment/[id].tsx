import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { cleanupAssignmentService } from '@/services/cleanupAssignment.service';
import { colors } from '@/theme/colors';
import type { ReportDetail } from '@/types/cleanup-assignment.types';

// ─── Configs ─────────────────────────────────────────────────────────────────

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
  const d = new Date(dateStr);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
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

// ─── Section ──────────────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return (
    <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
      {label}
    </Text>
  );
}

// ─── Timeline step ───────────────────────────────────────────────────────────

interface TimelineStepProps {
  label: string;
  time: string | null;
  done: boolean;
  isLast?: boolean;
}

function TimelineStep({ label, time, done, isLast = false }: TimelineStepProps) {
  return (
    <View className="flex-row items-start">
      {/* Dot + line */}
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

      {/* Content */}
      <View className="flex-1 pb-4">
        <Text
          className="text-sm font-semibold"
          style={{ color: done ? colors.textPrimary : colors.textSecondary }}
        >
          {label}
        </Text>
        {time && (
          <Text className="text-xs text-textSecondary">{time}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets  = useSafeAreaInsets();

  const [report, setReport]     = useState<ReportDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    cleanupAssignmentService.getReportDetail(id)
      .then((res) => setReport(res.data.data))
      .catch(() => setError('Không thể tải chi tiết báo cáo'))
      .finally(() => setLoading(false));
  }, [id]);

  const severity = SEVERITY_CONFIG[report?.severity ?? 'Medium'] ?? SEVERITY_CONFIG.Medium;

  // My team's assignment (first Cleanup assignment)
  const myAssignment = report?.assignments.find((a) => a.teamType === 'Cleanup') ?? null;
  const assignStatus = myAssignment
    ? (ASSIGNMENT_STATUS_CONFIG[myAssignment.status] ?? ASSIGNMENT_STATUS_CONFIG.Assigned)
    : null;

  const sla = report?.slaVerifyDueAt ? formatSlaRemaining(report.slaVerifyDueAt) : null;

  const firstImage = report?.media.find((m) => m.mediaType === 'Image')?.url ?? null;

  return (
    <View className="flex-1 bg-background">
      {/* Back button overlay */}
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

        {report && (
          <View
            className="flex-row items-center gap-1.5 rounded-full bg-white px-3 py-1.5"
            style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 }}
          >
            {sla && (
              <Ionicons name="time" size={14} color={sla.overdue ? colors.error : colors.warning} />
            )}
            {sla && (
              <Text
                className="text-xs font-bold"
                style={{ color: sla.overdue ? colors.error : colors.warning }}
              >
                SLA {sla.text}
              </Text>
            )}
            {!sla && assignStatus && (
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: assignStatus.bg }}>
                <Text className="text-[11px] font-semibold" style={{ color: assignStatus.color }}>
                  {assignStatus.label}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {isLoading ? (
          <DetailSkeleton />
        ) : error ? (
          <View className="flex-1 items-center justify-center px-6 py-32">
            <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
            <Text className="mt-3 text-base font-semibold text-textPrimary">{error}</Text>
            <Pressable
              onPress={() => {
                setError(null);
                setLoading(true);
                cleanupAssignmentService.getReportDetail(id!)
                  .then((res) => setReport(res.data.data))
                  .catch(() => setError('Không thể tải chi tiết báo cáo'))
                  .finally(() => setLoading(false));
              }}
              className="mt-4 rounded-xl px-6 py-2.5"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="font-semibold text-white">Thử lại</Text>
            </Pressable>
          </View>
        ) : report ? (
          <>
            {/* Hero image */}
            {firstImage ? (
              <Image
                source={{ uri: firstImage }}
                style={{ width: '100%', height: 240 }}
                contentFit="cover"
              />
            ) : (
              <View
                className="w-full items-center justify-center"
                style={{ height: 180, backgroundColor: severity.bg }}
              >
                <Ionicons name="image-outline" size={48} color={severity.color} />
              </View>
            )}

            <View className="px-4 pt-4">
              {/* Code + badges */}
              <View className="mb-2 flex-row flex-wrap items-center gap-2">
                <Text className="text-xs text-textSecondary">{report.code}</Text>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: severity.bg }}>
                  <Text className="text-[11px] font-semibold" style={{ color: severity.color }}>
                    {severity.label}
                  </Text>
                </View>
                {assignStatus && (
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: assignStatus.bg }}>
                    <Text className="text-[11px] font-semibold" style={{ color: assignStatus.color }}>
                      {assignStatus.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Category title */}
              <Text className="mb-1 text-xl font-bold text-textPrimary">
                {report.categoryName}
              </Text>

              {/* Address */}
              <View className="mb-4 flex-row items-start gap-1">
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sm text-textSecondary">
                  {report.address}
                </Text>
              </View>

              {/* Divider */}
              <View className="mb-4 h-px bg-border" />

              {/* Officer */}
              <View className="mb-4">
                <SectionTitle label="Officer" />
                <View
                  className="flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
                      <Text className="text-sm font-bold text-white">O</Text>
                    </View>
                    <View>
                      <Text className="text-sm font-semibold text-textPrimary">Officer</Text>
                      {myAssignment?.assignedAt && (
                        <Text className="text-xs text-textSecondary">
                          Giao {formatTime(myAssignment.assignedAt)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-primaryLight">
                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              </View>

              {/* Description */}
              {report.description && (
                <View className="mb-4">
                  <SectionTitle label="Mô tả hiện trường" />
                  <Text className="text-sm leading-5 text-textPrimary">{report.description}</Text>
                </View>
              )}

              {/* Officer note */}
              {myAssignment?.note && (
                <View className="mb-4">
                  <SectionTitle label="Ghi chú Officer" />
                  <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#ECFDF5' }}>
                    <Text className="text-sm leading-5" style={{ color: '#065F46' }}>
                      {myAssignment.note}
                    </Text>
                  </View>
                </View>
              )}

              {/* Divider */}
              <View className="mb-4 h-px bg-border" />

              {/* Timeline */}
              <View className="mb-4">
                <SectionTitle label="Tiến trình" />
                <View>
                  <TimelineStep
                    label="Giao cho đội"
                    time={myAssignment?.assignedAt ? formatTime(myAssignment.assignedAt) : null}
                    done={!!myAssignment?.assignedAt}
                  />
                  <TimelineStep
                    label="Đã đọc"
                    time={null}
                    done={myAssignment?.status !== 'Assigned'}
                  />
                  <TimelineStep
                    label="Check-in"
                    time={myAssignment?.startedAt ? formatTime(myAssignment.startedAt) : null}
                    done={!!myAssignment?.startedAt}
                  />
                  <TimelineStep
                    label="Resolved"
                    time={myAssignment?.completedAt ? formatDateTime(myAssignment.completedAt) : null}
                    done={myAssignment?.status === 'Completed'}
                    isLast
                  />
                </View>
              </View>

              {/* Coordinates */}
              <View className="mb-4">
                <SectionTitle label="Tọa độ" />
                <Text className="text-sm text-textSecondary">
                  {report.latitude.toFixed(6)}°N, {report.longitude.toFixed(6)}°E · {report.address}
                </Text>
              </View>

              {/* Created at */}
              <View className="mb-2">
                <SectionTitle label="Thời gian tạo" />
                <Text className="text-sm text-textSecondary">{formatDateTime(report.createdAt)}</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Bottom action bar — only shown when loaded */}
      {!isLoading && !error && report && myAssignment && (
        <View
          className="border-t border-border bg-white px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {myAssignment.status === 'Assigned' ? (
            <View className="flex-row gap-3">
              {/* Decline */}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/assignment/decline',
                    params: {
                      reportId:   report.id,
                      reportCode: report.code,
                      assignedAt: myAssignment.assignedAt,
                    },
                  } as never)
                }
                className="h-12 flex-1 items-center justify-center rounded-xl border-2 border-error"
              >
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="close" size={18} color={colors.error} />
                  <Text className="font-bold" style={{ color: colors.error }}>Từ chối</Text>
                </View>
              </Pressable>

              {/* Accept */}
              <Pressable
                className="h-12 flex-1 items-center justify-center rounded-xl"
                style={{ backgroundColor: colors.primary }}
              >
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text className="font-bold text-white">Nhận nhiệm vụ</Text>
                </View>
              </Pressable>
            </View>
          ) : myAssignment.status === 'InProgress' ? (
            <View className="flex-row gap-3">
              {/* Upload */}
              <Pressable
                className="h-12 flex-1 items-center justify-center rounded-xl border border-primary"
              >
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  <Text className="font-semibold text-primary">Cập nhật ảnh</Text>
                </View>
              </Pressable>

              {/* Resolve */}
              <Pressable
                className="h-12 flex-1 items-center justify-center rounded-xl"
                style={{ backgroundColor: colors.primary }}
              >
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text className="font-bold text-white">Hoàn thành</Text>
                </View>
              </Pressable>
            </View>
          ) : myAssignment.status === 'Completed' ? (
            <View
              className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
              style={{ backgroundColor: '#ECFDF5' }}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text className="font-bold" style={{ color: colors.primary }}>Đã hoàn thành</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
