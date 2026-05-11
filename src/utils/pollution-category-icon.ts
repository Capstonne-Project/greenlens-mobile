import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

const CODE_ICON_MAP: Record<string, IoniconName> = {
  DOMESTIC_WASTE: 'trash-outline',
  WASTE: 'trash-outline',
  WATER: 'water-outline',
  AIR: 'cloud-outline',
  NOISE: 'volume-high-outline',
  OTHER: 'ellipsis-horizontal-circle-outline',
};

export function resolvePollutionCategoryIcon(code: string, icon?: string | null): IoniconName {
  if (icon && icon in Ionicons.glyphMap) {
    return icon as IoniconName;
  }

  return CODE_ICON_MAP[code] ?? 'leaf-outline';
}
