import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceSuggestionRow } from '@/components/map/PlaceSuggestionRow';
import { Text } from '@/components/ui/text';
import type { UsePlaceSearchResult } from '@/hooks/usePlaceSearch';
import { useReportSearch } from '@/hooks/useReportSearch';
import { colors } from '@/theme/colors';
import type { PlaceSuggestion } from '@/types/place-search.types';
import type { ReportSearchItem } from '@/types/report-search.types';

interface PlaceSearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (suggestion: PlaceSuggestion) => void;
  /** Chọn 1 báo cáo trong kết quả tìm kiếm */
  onSelectReport: (report: ReportSearchItem) => void;
  /**
   * State search do màn cha giữ (qua `usePlaceSearch`) — cha cần `loadWardsFor`
   * sau khi người dùng chọn tỉnh, nên hook không thể nằm trong overlay.
   */
  search: UsePlaceSearchResult;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-widest text-textSecondary">
      {label}
    </Text>
  );
}

function ReportResultRow({
  report,
  onPress,
}: {
  report: ReportSearchItem;
  onPress: (report: ReportSearchItem) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(report)}
      className="flex-row items-center gap-3 px-4 py-3"
    >
      <Ionicons name="document-text-outline" size={19} color={colors.textSecondary} />
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold text-textPrimary" numberOfLines={1}>
          {report.categoryName}
        </Text>
        <Text className="mt-0.5 text-xs text-textSecondary" numberOfLines={1}>
          {report.code}
          {report.address ? ` · ${report.address}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
    </Pressable>
  );
}

export function PlaceSearchOverlay({
  visible,
  onClose,
  onSelect,
  onSelectReport,
  search,
}: PlaceSearchOverlayProps) {
  const insets = useSafeAreaInsets();
  const { query, setQuery, suggestions, isLoadingProvinces, errorMessage, retry } = search;

  const isSearching = query.trim().length > 0;
  const { results: reportResults, isSearching: isSearchingReports } = useReportSearch(
    query,
    visible,
  );

  const { provinceResults, wardResults } = useMemo(
    () => ({
      provinceResults: suggestions.filter((s) => s.kind === 'province'),
      wardResults: suggestions.filter((s) => s.kind === 'ward'),
    }),
    [suggestions],
  );

  if (!visible) return null;

  const handleSelect = (suggestion: PlaceSuggestion) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setQuery('');
    onSelect(suggestion);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    setQuery('');
    onClose();
  };

  return (
    /**
     * Dùng Modal (không phải View absolute) để overlay che được CẢ bottom tab bar
     * và bottom sheet — View absolute chỉ nằm trong phạm vi screen nên bị tab bar đè.
     */
    <Modal visible animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(200)}
        className="flex-1 bg-white"
        style={{ paddingTop: insets.top }}
      >
        {/* Thanh nhập */}
        <View className="flex-row items-center gap-2 px-3 py-2">
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <View className="h-11 flex-1 flex-row items-center gap-2 rounded-full border border-border bg-surface px-3">
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm tỉnh, thành phố, phường/xã…"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              className="flex-1 py-0 text-sm text-textPrimary"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={colors.textDisabled} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="h-px" style={{ backgroundColor: colors.border }} />

        {/* Kết quả — chỉ chờ nạp tỉnh khi người dùng đã gõ, không chặn màn lúc mới mở */}
        {isSearching && isLoadingProvinces ? (
          <View className="py-8">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : isSearching && errorMessage ? (
          <View className="items-center px-8 py-10">
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textDisabled} />
            <Text className="mt-3 text-center text-sm text-textSecondary">{errorMessage}</Text>
            <Pressable onPress={() => void retry()} className="mt-3">
              <Text className="text-sm font-semibold text-primary">Thử lại</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!isSearching ? (
              /* Chưa gõ gì → KHÔNG liệt kê sẵn tỉnh/thành. Chỉ gợi ý người dùng gõ. */
              <View className="items-center px-8 py-12">
                <Ionicons name="search-outline" size={40} color={colors.textDisabled} />
                <Text className="mt-3 text-center text-sm font-semibold text-textPrimary">
                  Nhập tên địa điểm cần tìm
                </Text>
                <Text className="mt-1 text-center text-xs text-textSecondary">
                  Ví dụ: “Bình Dương”, “da nang”, “hcm” — hoặc mã báo cáo.
                </Text>
              </View>
            ) : suggestions.length === 0 && reportResults.length === 0 && !isSearchingReports ? (
              <View className="items-center px-8 py-12">
                <Ionicons name="search-outline" size={40} color={colors.textDisabled} />
                <Text className="mt-3 text-center text-sm font-semibold text-textPrimary">
                  Không tìm thấy kết quả
                </Text>
                <Text className="mt-1 text-center text-xs text-textSecondary">
                  Thử tên tỉnh/thành khác, hoặc bỏ dấu — ví dụ “da nang”, “hcm”.
                </Text>
              </View>
            ) : (
              <>
                {provinceResults.length > 0 ? (
                  <>
                    <SectionHeader label="Tỉnh / Thành phố" />
                    {provinceResults.map((item) => (
                      <PlaceSuggestionRow
                        key={`${item.kind}-${item.code}`}
                        suggestion={item}
                        onPress={handleSelect}
                      />
                    ))}
                  </>
                ) : null}

                {wardResults.length > 0 ? (
                  <>
                    <SectionHeader label="Phường / Xã" />
                    {wardResults.map((item) => (
                      <PlaceSuggestionRow
                        key={`${item.kind}-${item.code}`}
                        suggestion={item}
                        onPress={handleSelect}
                      />
                    ))}
                  </>
                ) : null}

                {/* Báo cáo — gọi mạng nên có debounce, hiện sau địa giới */}
                {isSearchingReports || reportResults.length > 0 ? (
                  <>
                    <View className="flex-row items-center gap-2 px-4 pb-1 pt-3">
                      <Text className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
                        Báo cáo
                      </Text>
                      {isSearchingReports ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                      ) : null}
                    </View>
                    {reportResults.map((report) => (
                      <ReportResultRow
                        key={report.id}
                        report={report}
                        onPress={(item) => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          Keyboard.dismiss();
                          setQuery('');
                          onSelectReport(item);
                        }}
                      />
                    ))}
                  </>
                ) : null}
              </>
            )}

              <View style={{ height: insets.bottom + 24 }} />
            </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}
