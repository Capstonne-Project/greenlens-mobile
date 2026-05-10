import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import type { ReportCategory } from '@/types/report.types';
import { TapScale } from '@/components/layout/TapScale';
import { cn } from '@/lib/utils';

export type CategoryFilterId = 'all' | ReportCategory;

interface ChipItem {
  id: CategoryFilterId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CHIPS: ChipItem[] = [
  { id: 'all', label: 'Tất cả', icon: 'apps-outline' },
  { id: 'waste', label: 'Rác', icon: 'trash-outline' },
  { id: 'water_pollution', label: 'Nước', icon: 'water-outline' },
  { id: 'air_pollution', label: 'Khí', icon: 'cloud-outline' },
  { id: 'noise', label: 'Ồn', icon: 'volume-high-outline' },
];

interface CategoryFilterChipsProps {
  selected: CategoryFilterId;
  onChange: (id: CategoryFilterId) => void;
}

export function CategoryFilterChips({ selected, onChange }: CategoryFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      className="max-h-14 flex-grow-0"
    >
      {CHIPS.map((chip) => {
        const isActive = selected === chip.id;
        return (
          <TapScale key={chip.id} onPress={() => onChange(chip.id)}>
            <View
              className={cn(
                'flex-row items-center gap-1.5 rounded-full border px-3 py-2',
                isActive ? 'border-primary bg-primary' : 'border-border bg-white'
              )}
            >
              <Ionicons name={chip.icon} size={16} color={isActive ? '#FFFFFF' : '#64748B'} />
              <Text
                className={cn('text-sm font-semibold', isActive ? 'text-white' : 'text-textSecondary')}
              >
                {chip.label}
              </Text>
            </View>
          </TapScale>
        );
      })}
    </ScrollView>
  );
}
