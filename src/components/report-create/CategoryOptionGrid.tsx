import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import type { CatalogPollutionCategory } from '@/types/catalog.types';
import { colors } from '@/theme/colors';
import { resolvePollutionCategoryIcon } from '@/utils/pollution-category-icon';

interface CategoryOptionGridProps {
  categories: CatalogPollutionCategory[];
  selectedId: string | null;
  suggestedId?: string | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onSelect: (categoryId: string) => void;
  onRetry?: () => void;
}

export function CategoryOptionGrid({
  categories,
  selectedId,
  suggestedId = null,
  isLoading = false,
  errorMessage = null,
  onSelect,
  onRetry,
}: CategoryOptionGridProps) {
  if (isLoading) {
    return <Text className="text-sm text-textSecondary">Đang tải loại ô nhiễm...</Text>;
  }

  if (errorMessage) {
    return (
      <View className="gap-2">
        <Text className="text-sm text-error">{errorMessage}</Text>
        {onRetry ? (
          <TapScale onPress={onRetry}>
            <Text className="text-sm font-semibold text-primary">Thử lại</Text>
          </TapScale>
        ) : null}
      </View>
    );
  }

  if (!categories.length) {
    return <Text className="text-sm text-textSecondary">Chưa có loại ô nhiễm khả dụng.</Text>;
  }

  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {categories.map((category) => {
        const isSelected = selectedId === category.id;
        const isSuggested = suggestedId === category.id;
        const iconName = resolvePollutionCategoryIcon(category.code, category.icon);

        return (
          <View key={category.id} style={{ width: '48.5%' }}>
            <TapScale onPress={() => onSelect(category.id)}>
              <View
                className={`flex-row items-center gap-2 rounded-xl border px-2.5 py-2 ${
                  isSelected ? 'border-primary bg-primary/10' : 'border-border bg-white'
                }`}
              >
                <Ionicons
                  name={iconName}
                  size={18}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] font-semibold text-textPrimary" numberOfLines={2}>
                    {category.nameVi}
                  </Text>
                  {isSuggested ? (
                    <View className="mt-0.5 flex-row items-center gap-0.5">
                      <Ionicons name="sparkles" size={10} color={colors.primary} />
                      <Text className="text-[10px] font-medium text-primary">AI</Text>
                    </View>
                  ) : null}
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                ) : null}
              </View>
            </TapScale>
          </View>
        );
      })}
    </View>
  );
}
