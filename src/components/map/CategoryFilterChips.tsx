import { TapScale } from '@/components/layout/TapScale';
import { cn } from '@/lib/utils';
import type { CatalogPollutionCategory } from '@/types/catalog.types';
import { resolvePollutionCategoryIcon } from '@/utils/pollution-category-icon';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';

// 'all' hoặc category.id từ API
export type CategoryFilterId = 'all' | (string & {});

interface CategoryFilterChipsProps {
  selected: CategoryFilterId;
  categories: CatalogPollutionCategory[];
  onChange: (id: CategoryFilterId) => void;
}

export function CategoryFilterChips({ selected, categories, onChange }: CategoryFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      className="max-h-14 flex-grow-0"
    >
      {/* Chip "Tất cả" luôn đứng đầu */}
      <TapScale onPress={() => onChange('all')}>
        <View
          className={cn(
            'flex-row items-center gap-1.5 rounded-full border px-3 py-2',
            selected === 'all' ? 'border-primary bg-primary' : 'border-border bg-white',
          )}
        >
          <Ionicons name="apps-outline" size={16} color={selected === 'all' ? '#FFFFFF' : '#64748B'} />
          <Text className={cn('text-sm font-semibold', selected === 'all' ? 'text-white' : 'text-textSecondary')}>
            Tất cả
          </Text>
        </View>
      </TapScale>

      {categories.map((cat) => {
        const isActive = selected === cat.id;
        const icon = resolvePollutionCategoryIcon(cat.code, cat.icon);
        return (
          <TapScale key={cat.id} onPress={() => onChange(cat.id)}>
            <View
              className={cn(
                'flex-row items-center gap-1.5 rounded-full border px-3 py-2',
                isActive ? 'border-primary bg-primary' : 'border-border bg-white',
              )}
            >
              <Ionicons name={icon} size={16} color={isActive ? '#FFFFFF' : '#64748B'} />
              <Text className={cn('text-sm font-semibold', isActive ? 'text-white' : 'text-textSecondary')}>
                {cat.nameVi}
              </Text>
            </View>
          </TapScale>
        );
      })}
    </ScrollView>
  );
}
