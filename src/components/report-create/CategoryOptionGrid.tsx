import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { TapScale } from '@/components/layout/TapScale';
import { POLLUTION_CATEGORIES } from '@/constants/pollution-categories';
import { colors } from '@/theme/colors';

interface CategoryOptionGridProps {
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
}

export function CategoryOptionGrid({ selectedId, onSelect }: CategoryOptionGridProps) {
  return (
    <View className="flex-row flex-wrap justify-between">
      {POLLUTION_CATEGORIES.map((category) => {
        const isSelected = selectedId === category.id;

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
                    name={category.icon}
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
