import { TapScale } from '@/components/layout/TapScale';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { colors } from '@/theme/colors';
import { MAX_WASTE_TAG_SELECTION, type WasteTag } from '@/types/waste-tag.types';
import { resolveWasteTagIcon } from '@/utils/waste-tag-icon';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, View } from 'react-native';

interface WasteTagPickerProps {
  tags: WasteTag[];
  selectedIds: string[];
  isLoading: boolean;
  errorMessage?: string | null;
  limitMessage?: string | null;
  onToggle: (id: string) => void;
  onRetry?: () => void;
}

export function WasteTagPicker({
  tags,
  selectedIds,
  isLoading,
  errorMessage,
  limitMessage,
  onToggle,
  onRetry,
}: WasteTagPickerProps) {
  const atLimit = selectedIds.length >= MAX_WASTE_TAG_SELECTION;

  if (isLoading) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="gap-3 rounded-2xl bg-error/10 px-4 py-3">
        <Text className="text-sm text-error">{errorMessage}</Text>
        {onRetry ? (
          <TapScale onPress={onRetry}>
            <Text className="text-sm font-semibold text-primary">Thử lại</Text>
          </TapScale>
        ) : null}
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedIds.includes(tag.id);
          const isDisabled = atLimit && !isSelected;

          return (
            <TapScale key={tag.id} onPress={() => onToggle(tag.id)}>
              <View
                className={cn(
                  'flex-row items-center gap-1.5 rounded-full border px-3 py-2',
                  isSelected ? 'border-primary bg-primary' : 'border-border bg-white',
                  isDisabled ? 'opacity-45' : '',
                )}
              >
                {tag.iconUrl ? (
                  <Image source={{ uri: tag.iconUrl }} style={{ width: 16, height: 16 }} contentFit="contain" />
                ) : (
                  <Ionicons
                    name={resolveWasteTagIcon(tag.code)}
                    size={16}
                    color={isSelected ? colors.white : colors.textSecondary}
                  />
                )}
                <Text
                  className={cn('text-sm font-semibold', isSelected ? 'text-white' : 'text-textSecondary')}
                >
                  {tag.nameVi}
                </Text>
                {isSelected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
              </View>
            </TapScale>
          );
        })}
      </View>

      <Text className="px-1 text-xs text-textSecondary">
        Đã chọn {selectedIds.length}/{MAX_WASTE_TAG_SELECTION} loại
      </Text>

      {limitMessage ? <Text className="px-1 text-xs font-medium text-warning">{limitMessage}</Text> : null}
    </View>
  );
}
