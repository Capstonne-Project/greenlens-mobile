import type { CitizenMapPin } from '@/data/citizen-map-mock';
import type { PublicMapReportDto } from '@/types/public-map.types';
import type { ReportCategory } from '@/types/report.types';

/** Ảnh mặc định khi API không trả imageUrl */
export const PUBLIC_MAP_PIN_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1530587191325-a3d037fd194d?w=800&q=80';

const CATEGORY_CODE_MAP: Record<string, ReportCategory> = {
  TRASH: 'waste',
  WASTE: 'waste',
  DOMESTIC_WASTE: 'waste',
  waste: 'waste',
  WATER: 'water_pollution',
  WATER_POLLUTION: 'water_pollution',
  water_pollution: 'water_pollution',
  AIR: 'air_pollution',
  AIR_POLLUTION: 'air_pollution',
  air_pollution: 'air_pollution',
  NOISE: 'noise',
  noise: 'noise',
  OTHER: 'other',
  other: 'other',
};

export function mapCategoryCodeToReportCategory(code: string | null | undefined): ReportCategory {
  if (!code?.trim()) return 'other';
  const raw = code.trim();
  if (raw in CATEGORY_CODE_MAP) return CATEGORY_CODE_MAP[raw];
  const upper = raw.toUpperCase();
  if (upper in CATEGORY_CODE_MAP) return CATEGORY_CODE_MAP[upper];
  return 'other';
}

function fallbackTitle(dto: PublicMapReportDto): string {
  if (dto.title?.trim()) return dto.title.trim();
  if (dto.code?.trim()) return dto.code.trim();
  return `Báo cáo ${dto.id.slice(0, 8)}`;
}

function fallbackDescription(dto: PublicMapReportDto): string {
  if (dto.description?.trim()) return dto.description.trim();
  const parts: string[] = [];
  if (dto.severity?.trim()) parts.push(`Mức độ: ${dto.severity.trim()}`);
  if (dto.status?.trim()) parts.push(`Trạng thái: ${dto.status.trim()}`);
  return parts.length > 0 ? parts.join(' · ') : 'Điểm báo cáo trong khung nhìn';
}

/** Chuyển DTO GET /v1/map/reports (mode=detail) → pin + callout UI */
export function publicMapDtoToCitizenPin(dto: PublicMapReportDto): CitizenMapPin {
  const category = mapCategoryCodeToReportCategory(dto.categoryCode ?? undefined);
  const imageUrl = dto.imageUrl?.trim() ? dto.imageUrl.trim() : PUBLIC_MAP_PIN_PLACEHOLDER_IMAGE;

  return {
    id: dto.id,
    latitude: dto.latitude,
    longitude: dto.longitude,
    category,
    clusterCount: undefined,
    title: fallbackTitle(dto),
    description: fallbackDescription(dto),
    address: dto.address?.trim() || 'Khu vực hiển thị trên bản đồ',
    imageUrl,
    watchersCount: Math.max(0, dto.reporterCount ?? 0),
  };
}
