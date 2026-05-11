import type { PollutionCategoryOption } from '@/types/pollution-report.types';

export const POLLUTION_CATEGORIES: PollutionCategoryOption[] = [
  {
    id: process.env.EXPO_PUBLIC_CATEGORY_WASTE_ID ?? '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    code: 'WASTE',
    nameVi: 'Rác thải',
    icon: 'trash-outline',
  },
  {
    id: process.env.EXPO_PUBLIC_CATEGORY_WATER_ID ?? '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    code: 'WATER',
    nameVi: 'Ô nhiễm nước',
    icon: 'water-outline',
  },
  {
    id: process.env.EXPO_PUBLIC_CATEGORY_AIR_ID ?? '9b2c3d4e-5f60-4781-9a2b-3c4d5e6f7081',
    code: 'AIR',
    nameVi: 'Ô nhiễm không khí',
    icon: 'cloud-outline',
  },
  {
    id: process.env.EXPO_PUBLIC_CATEGORY_NOISE_ID ?? 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    code: 'NOISE',
    nameVi: 'Tiếng ồn',
    icon: 'volume-high-outline',
  },
  {
    id: process.env.EXPO_PUBLIC_CATEGORY_OTHER_ID ?? 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    code: 'OTHER',
    nameVi: 'Khác',
    icon: 'ellipsis-horizontal-circle-outline',
  },
];
