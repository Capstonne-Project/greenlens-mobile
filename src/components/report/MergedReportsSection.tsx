import { Text } from '@/components/ui/text';
import { useReportsByIds } from '@/hooks/useReportsByIds';
import { colors } from '@/theme/colors';
import type { MergedReportRef, ReportDetail } from '@/types/report-detail.types';
import { formatRelativeTime } from '@/utils/formatters';
import {
  collectMergedReportIds,
  firstNonEmptyUrl,
  hasMergedReportSeed,
  isUuid,
  pickReportThumbUrl,
} from '@/utils/report-merge';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const MAX_DETAIL_FETCH = 24;

interface MergedReportsSectionProps {
  detail: ReportDetail;
  fromMergedReportId?: string | null;
  /** Thumb từ list “Báo cáo của tôi” — GET detail Duplicate sau merge thường mất media (BE reassign). */
  fromMergedReportImageUrl?: string | null;
  onOpenPrimary?: (primaryReportId: string) => void;
  /** Mở report con — truyền kèm thumb seed vì GET detail Duplicate thường mất media sau reassign */
  onOpenMergedReport?: (reportId: string, imageUrl?: string | null) => void;
}

interface MergedRowModel {
  id: string;
  item: MergedReportRef;
  isYours: boolean;
}

function Thumb({
  uri,
  size = 56,
  loading = false,
}: {
  uri: string | null;
  size?: number;
  loading?: boolean;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: 8 }}
        contentFit="cover"
        transition={120}
      />
    );
  }
  return (
    <View
      className="items-center justify-center rounded-lg bg-surface"
      style={{ width: size, height: size }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : (
        <Ionicons name="image-outline" size={20} color={colors.textDisabled} />
      )}
    </View>
  );
}

/** Section tiêu đề + thu gọn — không card lồng, không hướng dẫn kiểu AI */
function ExpandableSection({
  title,
  meta,
  defaultExpanded = false,
  children,
}: {
  title: string;
  meta?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotation = useSharedValue(defaultExpanded ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 180 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const setOpen = (next: boolean) => setExpanded(next);
  const toggle = () => setExpanded((v) => !v);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-16, 16])
        .failOffsetX([-24, 24])
        .onEnd((event) => {
          if (event.translationY > 40 || event.velocityY > 700) {
            runOnJS(setOpen)(true);
          } else if (event.translationY < -40 || event.velocityY < -700) {
            runOnJS(setOpen)(false);
          }
        }),
    [],
  );

  return (
    <View className="mb-5">
      <GestureDetector gesture={panGesture}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={toggle}
          className="flex-row items-center gap-2 py-1"
          hitSlop={6}
        >
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
              {title}
            </Text>
            {meta ? (
              <Text className="mt-1 text-[13px] leading-5 text-textPrimary" numberOfLines={expanded ? 5 : 2}>
                {meta}
              </Text>
            ) : null}
          </View>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </Animated.View>
        </Pressable>
      </GestureDetector>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(100)} className="mt-3">
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

function TextLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style} className="mt-3 self-start">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        className="flex-row items-center gap-1 py-1"
        hitSlop={8}
      >
        <Text className="text-[13px] font-semibold text-primary">{label}</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </Pressable>
    </Animated.View>
  );
}

/** Báo cáo của user bị trùng → mở báo cáo đang theo dõi */
function DuplicateNotice({
  primaryId,
  primaryCode,
  primaryImageUrl,
  primaryLoading,
  yourCode,
  yourImageUrl,
  onOpenPrimary,
}: {
  primaryId: string;
  primaryCode: string | null;
  primaryImageUrl: string | null;
  primaryLoading: boolean;
  yourCode: string | null;
  yourImageUrl: string | null;
  onOpenPrimary?: (primaryReportId: string) => void;
}) {
  const code = primaryCode?.trim();
  const yourLabel = yourCode?.trim() || 'Báo cáo của bạn';

  return (
    <ExpandableSection
      title="Trùng với báo cáo khác"
      meta={
        code
          ? `Báo cáo của bạn trùng với ${code}, nên được gộp vào báo cáo đó để theo dõi chung.`
          : 'Báo cáo của bạn trùng với một báo cáo đã có sẵn và được gộp vào để theo dõi chung.'
      }
      defaultExpanded
    >
      <View className="flex-row gap-4">
        <View className="flex-row items-center gap-2.5">
          <Thumb uri={yourImageUrl} size={52} />
          <View className="max-w-[110px]">
            <Text className="text-[11px] text-textSecondary">Bạn gửi</Text>
            <Text className="text-[12px] font-medium text-textPrimary" numberOfLines={1}>
              {yourLabel}
            </Text>
          </View>
        </View>

        <View className="justify-center">
          <Ionicons name="arrow-forward" size={14} color={colors.textDisabled} />
        </View>

        <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
          <Thumb uri={primaryImageUrl} size={52} loading={primaryLoading && !primaryImageUrl} />
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] text-textSecondary">Đang theo dõi</Text>
            <Text className="text-[12px] font-medium text-textPrimary" numberOfLines={1}>
              {code || 'Báo cáo gốc'}
            </Text>
          </View>
        </View>
      </View>

      {onOpenPrimary ? (
        <TextLink
          label={code ? `Mở ${code}` : 'Mở báo cáo đang theo dõi'}
          onPress={() => onOpenPrimary(primaryId)}
        />
      ) : null}
    </ExpandableSection>
  );
}

function RelatedReportRow({
  item,
  isYours,
  onPress,
}: {
  item: MergedReportRef;
  isYours: boolean;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const body = (
    <View className="flex-row items-center gap-3 py-2.5">
      <Thumb uri={item.imageUrl ?? null} size={48} />
      <View className="min-w-0 flex-1">
        <Text className="text-[13px] font-medium text-textPrimary" numberOfLines={1}>
          {item.code ?? 'Báo cáo'}
          {isYours ? ' · của bạn' : ''}
        </Text>
        <Text className="mt-0.5 text-[12px] text-textSecondary" numberOfLines={1}>
          {[item.categoryName, item.createdAt ? formatRelativeTime(item.createdAt) : null]
            .filter(Boolean)
            .join(' · ') || 'Đã gộp vào báo cáo này'}
        </Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} /> : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
      >
        {body}
      </Pressable>
    </Animated.View>
  );
}

/** Nhiều báo cáo → một báo cáo đang xem */
function RelatedReportsBlock({
  detail,
  rows,
  isLoading,
  yoursInList,
  onOpenMergedReport,
}: {
  detail: ReportDetail;
  rows: MergedRowModel[];
  isLoading: boolean;
  yoursInList: boolean;
  onOpenMergedReport?: (reportId: string, imageUrl?: string | null) => void;
}) {
  const count = rows.length > 0 ? rows.length : Math.max((detail.reporterCount ?? 1) - 1, 0);

  const meta = yoursInList
    ? count > 1
      ? `Báo cáo của bạn và ${count - 1} báo cáo khác trùng điểm này, đã được gộp vào đây.`
      : 'Báo cáo của bạn trùng điểm này và đã được gộp vào đây.'
    : count > 0
      ? `${count} báo cáo trùng điểm đã được gộp vào đây.`
      : `${detail.reporterCount ?? 0} người báo cáo tại điểm này.`;

  return (
    <ExpandableSection
      title={count > 0 ? `Báo cáo liên quan · ${count}` : 'Báo cáo liên quan'}
      meta={meta}
      defaultExpanded={yoursInList || count <= 4}
    >
      {rows.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
        >
          <View>
            <Thumb uri={detail.media?.[0]?.url ?? null} size={64} />
            <Text className="mt-1 text-[11px] text-textSecondary">Đang xem</Text>
          </View>
          {rows.map((row) => (
            <Pressable
              key={`t-${row.id}`}
              onPress={
                onOpenMergedReport
                  ? () => onOpenMergedReport(row.id, row.item.imageUrl)
                  : undefined
              }
            >
              <Thumb uri={row.item.imageUrl ?? null} size={64} />
              <Text className="mt-1 max-w-[64px] text-[11px] text-textSecondary" numberOfLines={1}>
                {row.isYours ? 'Của bạn' : row.item.code ?? '—'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {isLoading && rows.every((r) => !r.item.imageUrl && !r.item.code) ? (
        <View className="items-start py-3">
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      ) : null}

      {rows.length > 0 ? (
        <View className="mt-1 border-t border-border/70 pt-1">
          {rows.map((row) => (
            <RelatedReportRow
              key={row.id}
              item={row.item}
              isYours={row.isYours}
              onPress={
                onOpenMergedReport && row.id !== detail.id
                  ? () => onOpenMergedReport(row.id, row.item.imageUrl)
                  : undefined
              }
            />
          ))}
        </View>
      ) : null}
    </ExpandableSection>
  );
}

function MergedReportsSectionComponent({
  detail,
  fromMergedReportId,
  fromMergedReportImageUrl,
  onOpenPrimary,
  onOpenMergedReport,
}: MergedReportsSectionProps) {
  const isDuplicate = detail.status === 'Duplicate';
  const primaryId = isUuid(detail.mergedIntoPrimaryReportId)
    ? detail.mergedIntoPrimaryReportId.trim()
    : null;
  const primaryCode = detail.mergedIntoPrimaryReportCode?.trim() || null;
  const listThumb = fromMergedReportImageUrl?.trim() || null;
  // BE: top-level imageUrl (P1) / media / fallback list nav
  const yourImageUrl = firstNonEmptyUrl(
    detail.imageUrl,
    pickReportThumbUrl(detail.media),
    listThumb,
  );

  const seedRefs = useMemo(() => {
    const map = new Map<string, MergedReportRef>();
    for (const ref of detail.mergedReports ?? []) {
      if (!isUuid(ref.id)) continue;
      const id = ref.id.trim();
      map.set(id, {
        ...ref,
        id,
        imageUrl: firstNonEmptyUrl(ref.imageUrl),
      });
    }
    // Fallback nav từ list my-reports khi seed BE thiếu thumb của "báo cáo của bạn"
    const yoursId = fromMergedReportId?.trim();
    if (yoursId && listThumb && !map.get(yoursId)?.imageUrl?.trim()) {
      const existing = map.get(yoursId);
      map.set(yoursId, {
        id: yoursId,
        code: existing?.code ?? null,
        categoryName: existing?.categoryName ?? null,
        address: existing?.address ?? null,
        createdAt: existing?.createdAt ?? null,
        imageUrl: listThumb,
        status: existing?.status ?? 'Duplicate',
      });
    }
    return map;
  }, [detail.mergedReports, fromMergedReportId, listThumb]);

  const idsToFetch = useMemo(() => {
    const all = collectMergedReportIds({
      detail,
      fromMergedReportId,
      extraIds: isDuplicate && primaryId ? [primaryId] : [],
    }).filter((id) => id !== detail.id);

    const prioritized: string[] = [];
    const push = (id: string | null | undefined) => {
      if (!id || prioritized.includes(id) || id === detail.id) return;
      prioritized.push(id);
    };

    // Primary khi đang xem Duplicate — cần code/thumb báo cáo gốc
    if (isDuplicate && primaryId) push(primaryId);

    for (const id of all) {
      // Đủ seed từ BE mergedReports[].imageUrl → không GET detail (media con thường rỗng)
      if (hasMergedReportSeed(seedRefs.get(id))) continue;
      push(id);
      if (prioritized.length >= MAX_DETAIL_FETCH) break;
    }

    return prioritized.slice(0, MAX_DETAIL_FETCH);
  }, [detail, fromMergedReportId, seedRefs, isDuplicate, primaryId]);

  const { itemsById, isLoading } = useReportsByIds(idsToFetch, idsToFetch.length > 0);

  const primaryFetched = primaryId ? itemsById[primaryId] : undefined;
  const resolvedPrimaryCode = primaryFetched?.code?.trim() || primaryCode;
  const primaryImageUrl = firstNonEmptyUrl(primaryFetched?.imageUrl);

  const mergedRows = useMemo((): MergedRowModel[] => {
    const ids = collectMergedReportIds({
      detail,
      fromMergedReportId,
    }).filter((id) => id !== detail.id);

    const yoursId = fromMergedReportId?.trim();
    const ordered = yoursId
      ? [yoursId, ...ids.filter((id) => id !== yoursId)]
      : ids;

    return ordered.map((id) => {
      const fetched = itemsById[id];
      const seed = seedRefs.get(id);
      return {
        id,
        item: {
          id,
          code: fetched?.code?.trim() || seed?.code?.trim() || null,
          categoryName: fetched?.categoryName ?? seed?.categoryName ?? null,
          address: fetched?.address ?? seed?.address ?? null,
          createdAt: fetched?.createdAt ?? seed?.createdAt ?? null,
          // Ưu tiên seed BE (có thumb sau reassign); GET detail con thường media=[] nên không ghi đè
          imageUrl: firstNonEmptyUrl(
            seed?.imageUrl,
            fetched?.imageUrl,
            id === yoursId ? listThumb : null,
          ),
          status: fetched?.status ?? seed?.status ?? 'Duplicate',
        } satisfies MergedReportRef,
        isYours: id === yoursId,
      };
    });
  }, [detail, fromMergedReportId, itemsById, seedRefs, listThumb]);

  const showContributorHint =
    !isDuplicate && mergedRows.length === 0 && (detail.reporterCount ?? 0) > 1;

  if (isDuplicate && primaryId) {
    return (
      <DuplicateNotice
        primaryId={primaryId}
        primaryCode={resolvedPrimaryCode}
        primaryImageUrl={primaryImageUrl}
        primaryLoading={isLoading}
        yourCode={detail.code}
        yourImageUrl={yourImageUrl}
        onOpenPrimary={onOpenPrimary}
      />
    );
  }

  if (isDuplicate && !primaryId) {
    return (
      <ExpandableSection
        title="Trùng với báo cáo khác"
        meta="Báo cáo này trùng với một báo cáo đã có sẵn và đã được gộp. Tiến độ theo dõi ở báo cáo đó."
        defaultExpanded
      >
        <Text className="text-[13px] leading-5 text-textSecondary">
          Bạn không cần gửi lại.
        </Text>
      </ExpandableSection>
    );
  }

  if (mergedRows.length === 0 && !showContributorHint) {
    return null;
  }

  return (
    <RelatedReportsBlock
      detail={detail}
      rows={mergedRows}
      isLoading={isLoading}
      yoursInList={mergedRows.some((row) => row.isYours)}
      onOpenMergedReport={onOpenMergedReport}
    />
  );
}

export const MergedReportsSection = memo(MergedReportsSectionComponent);
