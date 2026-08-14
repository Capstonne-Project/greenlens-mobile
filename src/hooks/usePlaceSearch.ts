import { useCallback, useEffect, useMemo, useState } from 'react';

import { catalogService } from '@/services/catalog.service';
import type { CatalogProvince, CatalogWard } from '@/types/catalog.types';
import type { PlaceSuggestion } from '@/types/place-search.types';
import {
  compactKey,
  getInitialsKey,
  normalizeAdminName,
} from '@/utils/normalize-vietnamese';

const MAX_PROVINCE_RESULTS = 6;
const MAX_WARD_RESULTS = 12;
const PROVINCE_SUBTITLE = 'Tỉnh / Thành phố';

/**
 * Điểm càng nhỏ càng khớp tốt. `null` = không khớp.
 *
 * Khớp ngay từ ký tự đầu tiên người dùng gõ — không đặt ngưỡng độ dài tối thiểu,
 * để gợi ý hiện dần theo từng chữ.
 */
function scoreName(name: string, query: string): number | null {
  const target = normalizeAdminName(name);
  const compactQuery = query.replace(/\s+/g, '');
  const compactTarget = compactKey(name);
  const initials = getInitialsKey(name);

  if (target === query || compactTarget === compactQuery) return 0;
  if (target.startsWith(query) || compactTarget.startsWith(compactQuery)) return 1;

  // Khớp đầu một từ bất kỳ: "tre" khớp "ben tre", "nghe" khớp "ben nghe".
  if (target.split(' ').some((word) => word.startsWith(query))) return 2;

  if (target.includes(query) || compactTarget.includes(compactQuery)) return 3;
  if (initials === compactQuery || initials.startsWith(compactQuery)) return 4;
  return null;
}

export interface UsePlaceSearchResult {
  query: string;
  setQuery: (next: string) => void;
  /** Gợi ý đã xếp hạng — tỉnh luôn trước phường. Rỗng khi chưa gõ gì. */
  suggestions: PlaceSuggestion[];
  isLoadingProvinces: boolean;
  isLoadingWards: boolean;
  errorMessage: string | null;
  /** Nạp phường của 1 tỉnh vào bộ gợi ý (gọi sau khi người dùng chọn tỉnh) */
  loadWardsFor: (provinceCode: string) => Promise<void>;
  retry: () => Promise<void>;
}

/**
 * Search địa giới hành chính, lọc hoàn toàn client-side.
 *
 * Tỉnh/thành chỉ vài chục bản ghi nên tải 1 lần rồi lọc trong bộ nhớ — không debounce,
 * kết quả tức thì. Phường thì khác: toàn quốc ~10.000 bản ghi và endpoint bắt buộc
 * `provinceCode`, nên chỉ nạp phường của tỉnh mà người dùng đã chọn.
 */
export function usePlaceSearch(): UsePlaceSearchResult {
  const [query, setQuery] = useState('');
  const [provinces, setProvinces] = useState<CatalogProvince[]>([]);
  const [isLoadingProvinces, setLoadingProvinces] = useState(true);
  const [isLoadingWards, setLoadingWards] = useState(false);
  const [errorMessage, setError] = useState<string | null>(null);

  /** Phường theo mã tỉnh — giữ nhiều tỉnh để không phải tải lại khi quay lại tỉnh cũ. */
  const [wardsByProvince, setWardsByProvince] = useState<Record<string, CatalogWard[]>>({});

  const loadProvinces = useCallback(async () => {
    setLoadingProvinces(true);
    setError(null);
    try {
      const res = await catalogService.getProvinces();
      setProvinces(res.data.data.items);
    } catch {
      setError('Không tải được danh sách tỉnh/thành. Vui lòng thử lại.');
    } finally {
      setLoadingProvinces(false);
    }
  }, []);

  const loadWardsFor = useCallback(
    async (provinceCode: string) => {
      if (!provinceCode || wardsByProvince[provinceCode]) return;
      setLoadingWards(true);
      try {
        const res = await catalogService.getWardsByProvince(provinceCode);
        setWardsByProvince((prev) => ({ ...prev, [provinceCode]: res.data.data.items }));
      } catch {
        // Không set error chung — thiếu phường vẫn search được tỉnh.
        setWardsByProvince((prev) => ({ ...prev, [provinceCode]: [] }));
      } finally {
        setLoadingWards(false);
      }
    },
    [wardsByProvince],
  );

  useEffect(() => {
    void loadProvinces();
  }, [loadProvinces]);

  /**
   * Nạp phường của TẤT CẢ tỉnh ngay khi có danh sách tỉnh.
   *
   * Lý do bắt buộc: sau sáp nhập 2025, nhiều tên tỉnh cũ trở thành tên **phường**
   * (vd. "Bến Tre" giờ là phường thuộc Vĩnh Long). Người dùng vẫn gõ tên cũ, nên nếu
   * chỉ nạp phường sau khi chọn tỉnh thì gõ "Bến Tre" sẽ không ra gì.
   *
   * Chi phí đo thật: 34 tỉnh ≈ 3.400 phường, ~0.4s tải song song — chấp nhận được.
   */
  useEffect(() => {
    if (provinces.length === 0) return;

    let cancelled = false;
    setLoadingWards(true);

    void (async () => {
      const results = await Promise.all(
        provinces.map(async (province) => {
          try {
            const res = await catalogService.getWardsByProvince(province.code);
            return [province.code, res.data.data.items] as const;
          } catch {
            return [province.code, [] as CatalogWard[]] as const;
          }
        }),
      );

      if (cancelled) return;
      setWardsByProvince(Object.fromEntries(results));
      setLoadingWards(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [provinces]);

  const provinceSuggestions = useMemo<PlaceSuggestion[]>(
    () =>
      provinces.map((p) => ({
        kind: 'province' as const,
        code: p.code,
        name: p.name,
        subtitle: PROVINCE_SUBTITLE,
        provinceCode: p.code,
      })),
    [provinces],
  );

  const wardSuggestions = useMemo<PlaceSuggestion[]>(() => {
    const provinceNameByCode = new Map(provinces.map((p) => [p.code, p.name]));
    return Object.entries(wardsByProvince).flatMap(([provinceCode, wards]) =>
      wards.map((w) => ({
        kind: 'ward' as const,
        code: w.code,
        name: w.unitAbbreviation ? `${w.unitAbbreviation} ${w.name}` : w.name,
        subtitle: provinceNameByCode.get(provinceCode) ?? '',
        provinceCode,
      })),
    );
  }, [wardsByProvince, provinces]);

  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeAdminName(query);
    if (!normalizedQuery) return [];

    const rank = (items: PlaceSuggestion[]) =>
      items
        .map((item) => ({ item, score: scoreName(item.name, normalizedQuery) }))
        .filter((entry): entry is { item: PlaceSuggestion; score: number } => entry.score !== null)
        .sort(
          (a, b) =>
            a.score - b.score ||
            normalizeAdminName(a.item.name).localeCompare(
              normalizeAdminName(b.item.name),
              'vi',
            ),
        )
        .map((entry) => entry.item);

    // Tỉnh luôn xếp trước phường. Giới hạn riêng từng nhóm để phường không đẩy tỉnh ra ngoài.
    return [
      ...rank(provinceSuggestions).slice(0, MAX_PROVINCE_RESULTS),
      ...rank(wardSuggestions).slice(0, MAX_WARD_RESULTS),
    ];
  }, [query, provinceSuggestions, wardSuggestions]);

  return {
    query,
    setQuery,
    suggestions,
    isLoadingProvinces,
    isLoadingWards,
    errorMessage,
    loadWardsFor,
    retry: loadProvinces,
  };
}
