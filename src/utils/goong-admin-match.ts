import { catalogService } from '@/services/catalog.service';
import { goongService } from '@/services/goong.service';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';
import type { ReportLocationDraft } from '@/types/pollution-report.types';

function normalizeAdminName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(tinh|thanh pho|tp\.?|quan|huyen|thi xa|phuong|xa|thi tran)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchByName<T extends { name: string }>(items: T[], targetName?: string): T | undefined {
  if (!targetName?.trim()) {
    return undefined;
  }

  const normalizedTarget = normalizeAdminName(targetName);
  return items.find((item) => {
    const normalizedItem = normalizeAdminName(item.name);
    return (
      normalizedItem === normalizedTarget ||
      normalizedItem.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedItem)
    );
  });
}

export async function enrichLocationWithGoong(
  location: ReportLocationDraft,
  provinces: CatalogProvince[],
  { overwriteAddress = true }: { overwriteAddress?: boolean } = {},
): Promise<ReportLocationDraft> {
  const goong = await goongService.reverseGeocode(location.latitude, location.longitude);
  if (!goong) {
    return location;
  }

  let provinceCode = location.provinceCode;
  let wardCode = location.wardCode;
  // Khi overwriteAddress=true (map tap): luôn dùng địa chỉ Goong trả về
  // Khi overwriteAddress=false (seed lần đầu): chỉ điền nếu chưa có
  let address = overwriteAddress ? (goong.addressLine ?? location.address) : (location.address ?? goong.addressLine);

  const matchedProvince = matchByName(provinces, goong.provinceName);
  if (matchedProvince) {
    provinceCode = matchedProvince.code;

    try {
      const wardsResponse = await catalogService.getWardsByProvince(matchedProvince.code);
      const wards = wardsResponse.data.data.items as CatalogWard[];
      const matchedWard = matchByName(wards, goong.communeName);
      if (matchedWard) {
        wardCode = matchedWard.code;
      }
    } catch {
      // Giữ province nếu không tải được danh sách phường.
    }
  }

  return {
    ...location,
    address,
    provinceCode,
    wardCode,
  };
}
