import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { SCENE_PHOTO_MINIMUM, type EvidenceCategory } from '@/types/inspection.types';
import type { ChecklistCategoryState } from '@/utils/inspection-checklist';

interface EvidenceCategoryContentProps {
  state: ChecklistCategoryState;
  uploading: boolean;
  errorMessage: string | null;
  readOnly: boolean;
  onPick: (category: EvidenceCategory, source: 'camera' | 'library') => void;
  /** Khối ghi âm — chỉ truyền cho category Audio. */
  recorderSlot?: ReactNode;
}

/**
 * Nội dung quản lý file của một category checklist — render inline ngay dưới
 * dòng checklist khi mở rộng, không phải modal/dialog riêng.
 */
export function EvidenceCategoryContent({
  state,
  uploading,
  errorMessage,
  readOnly,
  onPick,
  recorderSlot,
}: EvidenceCategoryContentProps) {
  const category = state.category as EvidenceCategory;
  const isImageCategory = category === 'ScenePhoto';
  const canUseCamera = category === 'ScenePhoto' || category === 'Video';
  const needMore = isImageCategory ? Math.max(0, SCENE_PHOTO_MINIMUM - state.files.length) : 0;

  return (
    <View>
      {needMore > 0 ? (
        <View className="mb-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#FEF3C7' }}>
          <Text className="text-xs font-semibold" style={{ color: '#92400E' }}>
            Cần thêm {needMore} ảnh để đạt yêu cầu tối thiểu.
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View className="mb-3 rounded-xl bg-red-50 px-3 py-2.5">
          <Text className="text-xs text-error">{errorMessage}</Text>
        </View>
      ) : null}

      {state.files.length === 0 ? (
        <View className="mb-3 items-center rounded-xl border border-dashed border-border bg-white px-5 py-6">
          <Ionicons name={state.icon} size={24} color={colors.textSecondary} />
          <Text className="mt-2 text-sm font-semibold text-textPrimary">Chưa có tệp</Text>
        </View>
      ) : (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {state.files.map((item, index) =>
            isImageCategory ? (
              <Image
                key={item.id}
                source={{ uri: item.mediaUrl! }}
                className="rounded-xl bg-surface"
                style={{ width: 84, height: 84 }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View
                key={item.id}
                className="flex-row items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5"
              >
                <Ionicons name={state.icon} size={16} color={colors.textSecondary} />
                <Text className="text-xs text-textPrimary" numberOfLines={1}>
                  {item.description?.trim() || `${state.label} ${index + 1}`}
                </Text>
              </View>
            ),
          )}
        </View>
      )}

      {readOnly ? (
        <View className="rounded-xl bg-white px-3 py-3">
          <Text className="text-center text-xs text-textSecondary">
            Biên bản đã chốt — không thể thay đổi bằng chứng.
          </Text>
        </View>
      ) : recorderSlot ? (
        recorderSlot
      ) : (
        <View className="flex-row gap-2">
          {canUseCamera ? (
            <Pressable
              accessibilityRole="button"
              disabled={uploading}
              onPress={() => onPick(category, 'camera')}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl"
              style={{ backgroundColor: uploading ? colors.textDisabled : colors.primary }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons
                  name={category === 'Video' ? 'videocam' : 'camera'}
                  size={18}
                  color={colors.white}
                />
              )}
              <Text className="text-sm font-bold text-white">
                {category === 'Video' ? 'Quay video' : 'Chụp ảnh'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={uploading}
            onPress={() => onPick(category, 'library')}
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-white"
            style={{ opacity: uploading ? 0.5 : 1 }}
          >
            <Ionicons name="folder-open-outline" size={18} color={colors.textPrimary} />
            <Text className="text-sm font-bold text-textPrimary">Chọn tệp</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
