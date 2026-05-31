import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const CODE_ICON_MAP: Record<string, IoniconName> = {
  HOUSEHOLD: 'home-outline',
  FOOD_ORGANIC: 'nutrition-outline',
  RECYCLABLE: 'leaf-outline',
  MEDICAL: 'medkit-outline',
  ELECTRONIC: 'hardware-chip-outline',
  HAZARDOUS: 'warning-outline',
  CONSTRUCTION: 'construct-outline',
  BULKY: 'bed-outline',
  TIRE: 'disc-outline',
  ANIMAL_CARCASS: 'paw-outline',
  TEXTILE: 'shirt-outline',
  VEGETATION: 'flower-outline',
};

export function resolveWasteTagIcon(code: string): IoniconName {
  return CODE_ICON_MAP[code] ?? 'trash-outline';
}
