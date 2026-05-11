import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import type { CatalogPollutionCategory } from '@/types/catalog.types';
import { colors } from '@/theme/colors';
import { resolvePollutionCategoryIcon } from '@/utils/pollution-category-icon';

interface CategoryOptionGridProps {
  categories: CatalogPollutionCategory[];
  selectedId: string | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onSelect: (categoryId: string) => void;
  onRetry?: () => void;
}

export function CategoryOptionGrid({
  categories,
  selectedId,
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
      <View className="gap-3">
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
    <View className="flex-row flex-wrap justify-between">
      {categories.map((category) => {
        const isSelected = selectedId === category.id;
        const iconName = resolvePollutionCategoryIcon(category.code, category.icon);

        return (
          <View key={category.id} className="mb-3 w-[48%]">
            <TapScale onPress={() => onSelect(category.id)}>
              <View
                className={`rounded-2xl border px-3 py-3 ${
                  isSelected ? 'border-primary bg-primary/10' : 'border-border bg-surface'
                }`}
              >
                <View
                  className={`mb-2 h-10 w-10 items-center justify-center rounded-xl ${
                    isSelected ? 'bg-primary' : 'bg-white'
                  }`}
                >
                  <Ionicons
                    name={iconName}
                    size={20}
                    color={isSelected ? colors.white : colors.primary}
                  />
                </View>
                <Text className="text-sm font-semibold text-textPrimary">{category.nameVi}</Text>
              </View>
            </TapScale>
          </View>
        );
      })}
    </View>
  );
}
