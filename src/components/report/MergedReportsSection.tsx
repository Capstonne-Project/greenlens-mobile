import { Text } from '@/components/ui/text';
import { useReportsByIds } from '@/hooks/useReportsByIds';
import { colors } from '@/theme/colors';
import type { MergedReportRef, ReportDetail } from '@/types/report-detail.types';
import { formatRelativeTime } from '@/utils/formatters';
import { collectMergedReportIds, isUuid } from '@/utils/report-merge';
import { getReportStatusMeta } from '@/utils/report-status';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface MergedReportsSectionProps {
  detail: ReportDetail;
  /** Id báo cáo của user bị gộp (từ list / deep-link param) */
  fromMergedReportId?: string | null;
  onOpenPrimary?: (primaryReportId: string) => void;
  onOpenMergedReport?: (reportId: string) => void;
}

interface MergedRowProps {
  item: MergedReportRef;
  isYours: boolean;
  onPress?: () => void;
}

function MergedRow({ item, isYours, onPress }: MergedRowProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const statusMeta = item.status ? getReportStatusMeta(String(item.status)) : null;

  const content = (
    <View className="flex-row items-center gap-3 py-3">
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: 48, height: 48, borderRadius: 8 }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-lg bg-surface">
          <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
        </View>
      )}

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-[13px] font-semibold text-textPrimary" numberOfLines={1}>
            {item.code ?? 'Báo cáo'}
          </Text>
          {isYours ? (
            <Text className="text-[11px] font-medium text-textSecondary">Của bạn</Text>
          ) : null}
        </View>
        <Text className="mt-0.5 text-[12px] text-textSecondary" numberOfLines={1}>
          {item.categoryName || item.address || 'Đã gộp vào báo cáo này'}
        </Text>
        <Text className="mt-0.5 text-[11px] text-textDisabled">
          {item.createdAt ? formatRelativeTime(item.createdAt) : null}
          {statusMeta ? ` · ${statusMeta.label}` : ''}
        </Text>
      </View>

      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} /> : null}
    </View>
  );

  if (!onPress) {
    return <View className="border-t border-border/50">{content}</View>;
  }

  return (
    <Animated.View style={animStyle} className="border-t border-border/50">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

function MergedReportsSectionComponent({
  detail,
  fromMergedReportId,
  onOpenPrimary,
  onOpenMergedReport,
}: MergedReportsSectionProps) {
  const isDuplicate = detail.status === 'Duplicate';
  const primaryId = isUuid(detail.mergedIntoPrimaryReportId)
    ? detail.mergedIntoPrimaryReportId.trim()
    : null;
  const primaryCode = detail.mergedIntoPrimaryReportCode?.trim() || null;

  const seedRefs = useMemo(() => {
    const map = new Map<string, MergedReportRef>();
    for (const ref of detail.mergedReports ?? []) {
      if (isUuid(ref.id)) map.set(ref.id.trim(), ref);
    }
    return map;
  }, [detail.mergedReports]);

  const idsToFetch = useMemo(() => {
    const all = collectMergedReportIds({
      detail,
      fromMergedReportId,
    }).filter((id) => id !== detail.id);

    // Chỉ fetch những id chưa có đủ code/category trong payload
    return all.filter((id) => {
      const seed = seedRefs.get(id);
      return !seed?.code || !seed.categoryName;
    });
  }, [detail, fromMergedReportId, seedRefs]);

  const { itemsById, isLoading } = useReportsByIds(idsToFetch, idsToFetch.length > 0);

  const mergedRows = useMemo(() => {
    const ids = collectMergedReportIds({
      detail,
      fromMergedReportId,
    }).filter((id) => id !== detail.id);

    return ids.map((id) => {
      const fetched = itemsById[id];
      const seed = seedRefs.get(id);
      return {
        id,
        item: {
          id,
          code: fetched?.code ?? seed?.code ?? null,
          categoryName: fetched?.categoryName ?? seed?.categoryName ?? null,
          address: fetched?.address ?? seed?.address ?? null,
          createdAt: fetched?.createdAt ?? seed?.createdAt ?? null,
          imageUrl: fetched?.imageUrl ?? seed?.imageUrl ?? null,
          status: fetched?.status ?? seed?.status ?? 'Duplicate',
        } satisfies MergedReportRef,
        isYours: id === fromMergedReportId?.trim(),
      };
    });
  }, [detail, fromMergedReportId, itemsById, seedRefs]);

  const showContributorHint =
    !isDuplicate && mergedRows.length === 0 && (detail.reporterCount ?? 0) > 1;

  if (isDuplicate && primaryId) {
    return (
      <View className="mb-4">
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
          Báo cáo gốc
        </Text>
        <View className="rounded-2xl bg-surface px-4 py-3.5">
          <Text className="text-[13px] leading-5 text-textPrimary">
            Báo cáo của bạn đã được gộp vì trùng với một báo cáo hiện có.
          </Text>
          <Text className="mt-1 text-[12px] text-textSecondary">
            Theo dõi tiến độ tại {primaryCode ?? 'báo cáo gốc'}.
          </Text>
          {onOpenPrimary ? (
            <Pressable
              onPress={() => onOpenPrimary(primaryId)}
              className="mt-3 flex-row items-center self-start"
              hitSlop={8}
            >
              <Text className="text-[13px] font-semibold text-primary">
                Xem báo cáo gốc
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  if (isDuplicate && !primaryId) {
    return (
      <View className="mb-4 rounded-2xl bg-surface px-4 py-3.5">
        <Text className="text-[13px] leading-5 text-textPrimary">
          Báo cáo này đã được xác định là trùng lặp và gộp vào báo cáo khác.
        </Text>
      </View>
    );
  }

  if (mergedRows.length === 0 && !showContributorHint) {
    return null;
  }

  return (
    <View className="mb-4">
      <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
        Báo cáo đã gộp
      </Text>

      <View className="rounded-2xl bg-surface px-4">
        <View className="py-3">
          <Text className="text-[13px] leading-5 text-textPrimary">
            {mergedRows.length > 0
              ? 'Các báo cáo trùng điểm đã được gộp vào đây để theo dõi chung.'
              : `${detail.reporterCount} người đã báo cáo tại điểm này.`}
          </Text>
        </View>

        {isLoading && mergedRows.every((row) => !row.item.code) ? (
          <View className="items-center border-t border-border/50 py-4">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}

        {mergedRows.map((row) => (
          <MergedRow
            key={row.id}
            item={row.item}
            isYours={row.isYours}
            onPress={
              onOpenMergedReport && row.id !== detail.id
                ? () => onOpenMergedReport(row.id)
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}

export const MergedReportsSection = memo(MergedReportsSectionComponent);
