import { ReportCommentsSection } from '@/components/report/ReportCommentsSection';
import { ReportSatisfactionCard } from '@/components/report/ReportSatisfactionCard';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import type { CommentThread } from '@/types/comment.types';
import type {
  RateReportDto,
  ReportDetail,
  ReportHistoryItem,
  ReportMediaItem,
} from '@/types/report-detail.types';
import { formatDate, formatRelativeTime } from '@/utils/formatters';
import { splitReportMedia } from '@/utils/report-media';
import { getReportStatusMeta } from '@/utils/report-status';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Low: { label: 'Thấp', color: '#166534', bg: '#DCFCE7' },
  Medium: { label: 'Trung bình', color: '#92400E', bg: '#FEF3C7' },
  High: { label: 'Cao', color: '#9A3412', bg: '#FFEDD5' },
  Critical: { label: 'Nghiêm trọng', color: '#991B1B', bg: '#FEE2E2' },
};

export interface ReportDetailBodyProps {
  detail: ReportDetail;
  history: ReportHistoryItem[];
  isOwner: boolean;
  source: 'tab' | 'map';
  isActionBusy: boolean;
  errorMessage: string | null;
  onRate?: (dto: RateReportDto) => Promise<void>;
  enableComments?: boolean;
  comments: {
    threads: CommentThread[];
    isLoading: boolean;
    isSubmitting: boolean;
    likingCommentId?: string | null;
    errorMessage: string | null;
    onSubmit: (content: string, parentCommentId?: string | null) => Promise<boolean>;
    onToggleLike: (commentId: string) => Promise<boolean>;
    onRetry: () => void;
  };
}

function SectionTitle({ label }: { label: string }) {
  return (
    <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
      {label}
    </Text>
  );
}

function MediaThumbRow({ items }: { items: ReportMediaItem[] }) {
  if (items.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-2"
      contentContainerStyle={{ gap: 8 }}
    >
      {items.map((item, index) => (
        <Image
          key={item.id ?? `${item.url}-${index}`}
          source={{ uri: item.url }}
          style={{ width: 72, height: 72, borderRadius: 10 }}
          contentFit="cover"
          transition={150}
        />
      ))}
    </ScrollView>
  );
}

interface TimelineStepProps {
  label: string;
  time: string | null;
  done: boolean;
  isLast?: boolean;
  subtitle?: string | null;
  media?: ReportMediaItem[];
}

function TimelineStep({
  label,
  time,
  done,
  isLast = false,
  subtitle,
  media = [],
}: TimelineStepProps) {
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
        <MediaThumbRow items={media} />
      </View>
    </View>
  );
}

function StarRow({
  value,
  onChange,
  size = 30,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
}) {
  return (
    <View className="flex-row gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={onChange ? () => onChange(star) : undefined}
          disabled={!onChange}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? '#F59E0B' : colors.border}
          />
        </Pressable>
      ))}
    </View>
  );
}

interface RateSectionProps {
  detail: ReportDetail;
  isActionBusy: boolean;
  onRate: (dto: RateReportDto) => Promise<void>;
}

function RateSection({ detail, isActionBusy, onRate }: RateSectionProps) {
  const alreadyRated = Boolean(detail.hasCurrentUserRated || detail.satisfaction);
  const [isSatisfied, setIsSatisfied] = useState<boolean | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (alreadyRated && detail.satisfaction) {
    return <ReportSatisfactionCard satisfaction={detail.satisfaction} title="Đánh giá của bạn" />;
  }

  if (alreadyRated) {
    return (
      <View className="mb-4 rounded-2xl bg-surface px-4 py-3">
        <Text className="text-sm text-textSecondary">Bạn đã gửi đánh giá cho báo cáo này.</Text>
      </View>
    );
  }

  const canSubmit = isSatisfied !== null && !isActionBusy;

  const handleSubmit = () => {
    if (isSatisfied === null) return;
    void onRate({
      isSatisfied,
      rating: rating > 0 ? rating : undefined,
      comment: comment.trim() ? comment.trim() : undefined,
    });
  };

  return (
    <View className="mb-4">
      <SectionTitle label="Đánh giá chất lượng xử lý" />
      <View className="rounded-2xl border border-border px-4 py-4">
        <View className="mb-3 flex-row gap-3">
          <Pressable
            onPress={() => setIsSatisfied(true)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-2.5"
            style={{
              borderColor: isSatisfied === true ? colors.primary : colors.border,
              backgroundColor: isSatisfied === true ? '#ECFDF5' : colors.white,
            }}
          >
            <Ionicons
              name="thumbs-up"
              size={18}
              color={isSatisfied === true ? colors.primary : colors.textSecondary}
            />
            <Text
              className="text-sm font-semibold"
              style={{ color: isSatisfied === true ? colors.primary : colors.textSecondary }}
            >
              Hài lòng
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIsSatisfied(false)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-2.5"
            style={{
              borderColor: isSatisfied === false ? colors.error : colors.border,
              backgroundColor: isSatisfied === false ? '#FEE2E2' : colors.white,
            }}
          >
            <Ionicons
              name="thumbs-down"
              size={18}
              color={isSatisfied === false ? colors.error : colors.textSecondary}
            />
            <Text
              className="text-sm font-semibold"
              style={{ color: isSatisfied === false ? colors.error : colors.textSecondary }}
            >
              Chưa hài lòng
            </Text>
          </Pressable>
        </View>

        <Text className="mb-1.5 text-xs font-semibold text-textSecondary">Chấm điểm (tuỳ chọn)</Text>
        <StarRow value={rating} onChange={setRating} />

        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Nhận xét thêm (tuỳ chọn)"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
          className="mt-3 rounded-xl border border-border px-3 py-2.5 text-sm text-textPrimary"
          style={{ minHeight: 64, textAlignVertical: 'top' }}
        />

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="mt-3 h-11 flex-row items-center justify-center gap-2 rounded-xl"
          style={{ backgroundColor: canSubmit ? colors.primary : colors.border }}
        >
          {isActionBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#fff" />
              <Text className="text-sm font-bold text-white">Gửi đánh giá</Text>
            </>
          )}
        </Pressable>

        {isSatisfied === false ? (
          <Text className="mt-2 text-xs leading-5 text-textSecondary">
            Chưa hài lòng? Đánh giá không tự mở lại báo cáo — dùng nút “Mở lại” nếu cần xử lý tiếp.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Nội dung chi tiết báo cáo — dùng chung trong sheet mọi entry point */
export function ReportDetailBody({
  detail,
  history,
  isOwner,
  source,
  isActionBusy,
  errorMessage,
  onRate,
  enableComments = true,
  comments,
}: ReportDetailBodyProps) {
  const severity = SEVERITY_CONFIG[detail.severity] ?? SEVERITY_CONFIG.Medium;
  const canRateStatus =
    detail.status === 'Resolved' ||
    detail.status === 'Closed' ||
    detail.status === 'ClosedNoViolation';

  const rejectedReason =
    detail.status === 'Rejected'
      ? history.find((item) => item.toStatus === 'Rejected')?.reason
      : null;

  const mediaByType = useMemo(() => splitReportMedia(detail.media), [detail.media]);
  const progressNotes = detail.assignments
    .map((a) => a.progressNote?.trim())
    .filter((note): note is string => Boolean(note));
  const latestProgressNote = progressNotes.length > 0 ? progressNotes[progressNotes.length - 1] : null;
  const latestProgressUpdated = detail.assignments
    .map((a) => a.progressUpdatedAt)
    .filter((value): value is string => Boolean(value))
    .at(-1);

  return (
    <View>
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
          <SectionTitle label="Tiến độ xử lý" />
          {detail.assignments.map((assignment, index) => (
            <View
              key={assignment.id ?? `${assignment.teamId ?? assignment.teamName}-${index}`}
              className="mb-3"
            >
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
            {detail.wasteTags.map((tag, index) => (
              <View
                key={tag.id || tag.tagId || tag.code || `waste-${index}`}
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
          label="Ảnh hiện trạng (Before)"
          time={detail.startedAt ? formatDate(detail.startedAt) : null}
          done={mediaByType.before.length > 0 || Boolean(detail.startedAt)}
          subtitle={
            mediaByType.before.length > 0
              ? `Team đã chụp ${mediaByType.before.length} ảnh trước khi dọn`
              : detail.startedAt
                ? 'Đang chờ team upload ảnh hiện trạng'
                : null
          }
          media={mediaByType.before}
        />
        <TimelineStep
          label="Cập nhật tiến độ"
          time={
            latestProgressUpdated
              ? formatRelativeTime(latestProgressUpdated)
              : mediaByType.progress.length > 0
                ? 'Đã cập nhật'
                : null
          }
          done={mediaByType.progress.length > 0 || (detail.assignments.some((a) => a.progressPercent > 0) && Boolean(detail.startedAt))}
          subtitle={
            latestProgressNote ??
            (mediaByType.progress.length > 0
              ? `${mediaByType.progress.length} ảnh tiến độ từ team`
              : null)
          }
          media={mediaByType.progress}
        />
        <TimelineStep
          label="Xử lý xong (After)"
          time={detail.resolvedAt ? formatDate(detail.resolvedAt) : null}
          done={Boolean(detail.resolvedAt) || mediaByType.after.length > 0}
          subtitle={
            mediaByType.after.length > 0
              ? `${mediaByType.after.length} ảnh sau khi dọn`
              : null
          }
          media={mediaByType.after}
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
              key={`history-${item.toStatus}-${item.createdAt}-${index}`}
              label={meta.label}
              time={formatRelativeTime(item.createdAt)}
              subtitle={
                item.reason ? item.reason : item.changedByName ? `Bởi ${item.changedByName}` : null
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
        <Text className="mb-4 text-xs text-textSecondary">Đã mở lại {detail.reopenedCount}/2 lần</Text>
      ) : null}

      {onRate && isOwner && canRateStatus ? (
        <RateSection detail={detail} isActionBusy={isActionBusy} onRate={onRate} />
      ) : null}

      {!isOwner && detail.satisfaction ? (
        <ReportSatisfactionCard satisfaction={detail.satisfaction} />
      ) : null}

      {enableComments ? (
        <ReportCommentsSection
          threads={comments.threads}
          isLoading={comments.isLoading}
          isSubmitting={comments.isSubmitting}
          likingCommentId={comments.likingCommentId}
          errorMessage={comments.errorMessage}
          composerLabel={isOwner ? 'Bình luận' : 'Phản hồi đánh giá'}
          composerPlaceholder={isOwner ? 'Thêm bình luận…' : 'Cảm ơn / phản hồi người báo cáo…'}
          emptyLabel={
            isOwner
              ? 'Chưa có bình luận. Hãy để lại lời nhắn!'
              : 'Chưa có phản hồi. Gửi lời cảm ơn hoặc giải thích.'
          }
          onSubmit={comments.onSubmit}
          onToggleLike={comments.onToggleLike}
          onRetry={comments.onRetry}
        />
      ) : null}

      {errorMessage ? (
        <View className="mb-4 rounded-xl bg-error/10 px-3 py-2.5">
          <Text className="text-sm text-error">{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

export { SEVERITY_CONFIG };
