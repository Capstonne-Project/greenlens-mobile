import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { ReportDetail, ReportDetailSource, ReportHistoryItem } from '@/types/report-detail.types';
import { formatDate, formatRelativeTime } from '@/utils/formatters';
import { getReportFooterActions, getReportStatusMeta } from '@/utils/report-status';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReportDetailViewProps {
  detail: ReportDetail | null;
  history: ReportHistoryItem[];
  isLoading: boolean;
  isActionBusy: boolean;
  errorMessage: string | null;
  source: ReportDetailSource;
  currentUserId?: string | null;
  onBack: () => void;
  onRetry: () => void;
  onClose: () => Promise<void>;
  onReopen: () => Promise<void>;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Low: { label: 'Thấp', color: '#166534', bg: '#DCFCE7' },
  Medium: { label: 'Trung bình', color: '#92400E', bg: '#FEF3C7' },
  High: { label: 'Cao', color: '#9A3412', bg: '#FFEDD5' },
  Critical: { label: 'Nghiêm trọng', color: '#991B1B', bg: '#FEE2E2' },
};

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
  subtitle?: string | null;
}

function TimelineStep({ label, time, done, isLast = false, subtitle }: TimelineStepProps) {
  return (
    <View className="flex-row items-start">
      <View className="mr-3 items-center" style={{ width: 20 }}>
        <View
          className="h-4 w-4 items-center justify-center rounded-full"
          style={{ backgroundColor: done ? colors.primary : colors.border }}
        >
          {done ? <Ionicons name="checkmark" size={10} color="#fff" /> : null}
        </View>
        {!isLast ? (
          <View className="mt-0.5 w-px flex-1" style={{ backgroundColor: colors.border, minHeight: 24 }} />
        ) : null}
      </View>
      <View className="flex-1 pb-4">
        <Text className="text-sm font-semibold" style={{ color: done ? colors.textPrimary : colors.textSecondary }}>
          {label}
        </Text>
        {time ? <Text className="text-xs text-textSecondary">{time}</Text> : null}
        {subtitle ? <Text className="mt-0.5 text-xs leading-5 text-textSecondary">{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function DetailSkeleton({ topInset }: { topInset: number }) {
  return (
    <View style={{ paddingTop: topInset, backgroundColor: colors.white }}>
      <View className="h-52 w-full bg-surface" />
      <View className="gap-3 p-4">
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

interface AnimatedButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: object;
  className?: string;
  children: ReactNode;
}

function AnimatedButton({ onPress, disabled, style, className, children }: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animStyle, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.96);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        className={className}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function ReportDetailView({
  detail,
  history,
  isLoading,
  isActionBusy,
  errorMessage,
  source,
  currentUserId,
  onBack,
  onRetry,
  onClose,
  onReopen,
}: ReportDetailViewProps) {
  const insets = useSafeAreaInsets();
  const [heroIndex, setHeroIndex] = useState(0);

  const isOwner = source === 'tab' || (detail?.reporterId != null && detail.reporterId === currentUserId);
  const footerActions = detail
    ? getReportFooterActions(detail.status, { isOwner, reopenedCount: detail.reopenedCount ?? 0 })
    : { showClose: false, showReopen: false };

  const statusMeta = detail ? getReportStatusMeta(detail.status) : null;
  const severity = SEVERITY_CONFIG[detail?.severity ?? 'Medium'] ?? SEVERITY_CONFIG.Medium;
  const firstImage = detail?.media[heroIndex]?.url ?? detail?.media[0]?.url ?? null;

  const rejectedReason =
    detail?.status === 'Rejected'
      ? history.find((item) => item.toStatus === 'Rejected')?.reason
      : null;

  const handleClosePress = () => {
    Alert.alert('Xác nhận đóng', 'Bạn xác nhận hài lòng với kết quả xử lý?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đóng báo cáo', onPress: () => void onClose() },
    ]);
  };

  const handleReopenPress = () => {
    const remaining = Math.max(0, 2 - (detail?.reopenedCount ?? 0));
    Alert.alert(
      'Mở lại báo cáo',
      `Báo cáo sẽ được gửi xử lý lại. Còn ${remaining} lần mở lại.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Mở lại', onPress: () => void onReopen() },
      ],
    );
  };

  const showFooterBar =
    !isLoading &&
    detail &&
    (footerActions.showClose ||
      footerActions.showReopen ||
      (footerActions.infoMessage &&
        ['Closed', 'ClosedNoViolation', 'Submitted', 'Verified', 'Dispatched', 'Assigned', 'InProgress'].includes(
          detail.status,
        )));

  return (
    <View className="flex-1 bg-background">
      {/* Back + status overlay */}
      <View
        className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={onBack}
          className="h-9 w-9 items-center justify-center rounded-full bg-white"
          style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        {statusMeta && detail ? (
          <View
            className="max-w-[58%] rounded-full px-3 py-1.5"
            style={{ backgroundColor: statusMeta.bgColor, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 }}
          >
            <Text className="text-[11px] font-semibold" style={{ color: statusMeta.textColor }} numberOfLines={2}>
              {statusMeta.label}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {isLoading ? (
          <DetailSkeleton topInset={insets.top} />
        ) : errorMessage && !detail ? (
          <View className="flex-1 items-center justify-center px-6 py-32">
            <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
            <Text className="mt-3 text-base font-semibold text-textPrimary">{errorMessage}</Text>
            <Pressable
              onPress={onRetry}
              className="mt-4 rounded-xl px-6 py-2.5"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="font-semibold text-white">Thử lại</Text>
            </Pressable>
          </View>
        ) : detail ? (
          <>
            <View style={{ paddingTop: insets.top, backgroundColor: colors.white }}>
              {firstImage ? (
                <Image source={{ uri: firstImage }} style={{ width: '100%', height: 220 }} contentFit="cover" />
              ) : (
                <View className="w-full items-center justify-center" style={{ height: 160, backgroundColor: severity.bg }}>
                  <Ionicons name="image-outline" size={48} color={severity.color} />
                </View>
              )}
            </View>

            {detail.media.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
                className="border-b border-border bg-white"
              >
                {detail.media.map((media, index) => (
                  <Pressable key={`${media.url}-${index}`} onPress={() => setHeroIndex(index)}>
                    <Image
                      source={{ uri: media.url }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        borderWidth: heroIndex === index ? 2 : 0,
                        borderColor: colors.primary,
                      }}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View className="px-4 pt-4">
              {!isOwner && source === 'map' ? (
                <View className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: '#ECFDF5' }}>
                  <Text className="text-sm" style={{ color: '#065F46' }}>
                    Đây là báo cáo từ cộng đồng
                  </Text>
                </View>
              ) : null}

              <View className="mb-2 flex-row flex-wrap items-center gap-2">
                <Text className="text-xs text-textSecondary">{detail.code}</Text>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: severity.bg }}>
                  <Text className="text-[11px] font-semibold" style={{ color: severity.color }}>
                    {severity.label}
                  </Text>
                </View>
                <View className="rounded-full bg-surface px-2 py-0.5">
                  <Text className="text-[11px] font-semibold text-textSecondary">
                    {detail.reporterCount} người báo cáo
                  </Text>
                </View>
              </View>

              <Text className="mb-1 text-xl font-bold text-textPrimary">{detail.categoryName}</Text>

              {detail.address ? (
                <View className="mb-4 flex-row items-start gap-1">
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-sm text-textSecondary">{detail.address}</Text>
                </View>
              ) : (
                <View className="mb-4" />
              )}

              <View className="mb-4 h-px bg-border" />

              {detail.description ? (
                <View className="mb-4">
                  <SectionTitle label="Mô tả hiện trường" />
                  <Text className="text-sm leading-5 text-textPrimary">{detail.description}</Text>
                </View>
              ) : null}

              {rejectedReason ? (
                <View className="mb-4">
                  <SectionTitle label="Lý do từ chối" />
                  <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#FEE2E2' }}>
                    <Text className="text-sm leading-5" style={{ color: '#991B1B' }}>
                      {rejectedReason}
                    </Text>
                  </View>
                </View>
              ) : null}

              {detail.assignments.length > 0 ? (
                <View className="mb-4">
                  <View className="mb-1 flex-row items-center justify-between">
                    <SectionTitle label="Tiến độ xử lý" />
                  </View>
                  {detail.assignments.map((assignment, index) => (
                    <View key={`${assignment.teamName}-${index}`} className="mb-3">
                      <View className="mb-1 flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-textPrimary">{assignment.teamName}</Text>
                        <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                          {assignment.progressPercent}%
                        </Text>
                      </View>
                      <View className="h-2 overflow-hidden rounded-full bg-surface">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${assignment.progressPercent}%` as `${number}%`,
                            backgroundColor: colors.primary,
                          }}
                        />
                      </View>
                      {assignment.progressNote ? (
                        <Text className="mt-1 text-xs text-textSecondary">{assignment.progressNote}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {detail.wasteTags.length > 0 ? (
                <View className="mb-4">
                  <SectionTitle label="Loại rác" />
                  <View className="flex-row flex-wrap gap-2">
                    {detail.wasteTags.map((tag) => (
                      <View key={tag.id} className="rounded-full px-3 py-1" style={{ backgroundColor: '#ECFDF5' }}>
                        <Text className="text-xs font-semibold" style={{ color: '#065F46' }}>
                          {tag.nameVi}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View className="mb-4 h-px bg-border" />

              <View className="mb-4">
                <SectionTitle label="Tiến trình" />
                <TimelineStep label="Gửi báo cáo" time={formatDate(detail.createdAt)} done />
                <TimelineStep
                  label="Xác minh"
                  time={detail.verifiedAt ? formatDate(detail.verifiedAt) : null}
                  done={Boolean(detail.verifiedAt)}
                />
                <TimelineStep
                  label="Bắt đầu xử lý"
                  time={detail.startedAt ? formatDate(detail.startedAt) : null}
                  done={Boolean(detail.startedAt)}
                />
                <TimelineStep
                  label="Xử lý xong"
                  time={detail.resolvedAt ? formatDate(detail.resolvedAt) : null}
                  done={Boolean(detail.resolvedAt)}
                />
                <TimelineStep
                  label="Đóng báo cáo"
                  time={detail.closedAt ? formatDate(detail.closedAt) : null}
                  done={Boolean(detail.closedAt)}
                  isLast={history.length === 0}
                />
                {history.map((item, index) => {
                  const meta = getReportStatusMeta(item.toStatus);
                  return (
                    <TimelineStep
                      key={`${item.createdAt}-${index}`}
                      label={meta.label}
                      time={formatRelativeTime(item.createdAt)}
                      subtitle={
                        item.reason
                          ? item.reason
                          : item.changedByName
                            ? `Bởi ${item.changedByName}`
                            : null
                      }
                      done
                      isLast={index === history.length - 1}
                    />
                  );
                })}
              </View>

              {detail.slaResolveDueAt ? (
                <View className="mb-2">
                  <SectionTitle label="Hạn xử lý (SLA)" />
                  <Text className="text-sm text-textSecondary">{formatDate(detail.slaResolveDueAt)}</Text>
                </View>
              ) : null}

              {detail.reopenedCount > 0 ? (
                <Text className="mb-4 text-xs text-textSecondary">
                  Đã mở lại {detail.reopenedCount}/2 lần
                </Text>
              ) : null}

              {errorMessage ? (
                <View className="mb-4 rounded-xl bg-error/10 px-3 py-2.5">
                  <Text className="text-sm text-error">{errorMessage}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      {showFooterBar ? (
        <View
          className="border-t border-border bg-white px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {footerActions.showClose || footerActions.showReopen ? (
            <View className="flex-row gap-3">
              {footerActions.showReopen ? (
                <AnimatedButton
                  onPress={handleReopenPress}
                  disabled={isActionBusy}
                  className="h-12 items-center justify-center rounded-xl border-2 border-primary"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="refresh" size={18} color={colors.primary} />
                    <Text className="font-bold text-primary">Mở lại</Text>
                  </View>
                </AnimatedButton>
              ) : null}
              {footerActions.showClose ? (
                <AnimatedButton
                  onPress={handleClosePress}
                  disabled={isActionBusy}
                  className="h-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.primary }}
                >
                  {isActionBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="checkmark-done" size={18} color="#fff" />
                      <Text className="font-bold text-white">Đóng báo cáo</Text>
                    </View>
                  )}
                </AnimatedButton>
              ) : null}
            </View>
          ) : footerActions.infoMessage ? (
            <View
              className="h-12 flex-row items-center justify-center gap-2 rounded-xl"
              style={{
                backgroundColor:
                  detail?.status === 'Closed' || detail?.status === 'ClosedNoViolation' ? '#ECFDF5' : colors.surface,
              }}
            >
              <Ionicons
                name={
                  detail?.status === 'Closed' || detail?.status === 'ClosedNoViolation'
                    ? 'checkmark-circle'
                    : 'time-outline'
                }
                size={20}
                color={detail?.status === 'Closed' || detail?.status === 'ClosedNoViolation' ? colors.primary : colors.textSecondary}
              />
              <Text
                className="font-semibold"
                style={{
                  color:
                    detail?.status === 'Closed' || detail?.status === 'ClosedNoViolation'
                      ? colors.primary
                      : colors.textSecondary,
                }}
              >
                {footerActions.infoMessage}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
