import { useCallback, useState } from 'react';

import type { AreaFocus, PlaceSuggestion } from '@/types/place-search.types';
import { prepareAreaShape } from '@/utils/area-boundary-shape';
import {
  fetchProvinceBoundaryGroups,
  fetchWardBoundaryGroups,
} from '@/utils/ward-boundary';

interface UseAreaBoundaryResult {
  areaFocus: AreaFocus | null;
  isLoading: boolean;
  /** True khi vùng được chọn nhưng BE chưa có dữ liệu ranh giới */
  hasNoBoundary: boolean;
  focusArea: (suggestion: PlaceSuggestion) => Promise<AreaFocus | null>;
  clearFocus: () => void;
}

/**
 * Nạp ranh giới GeoJSON của vùng được chọn.
 *
 * GeoJSON đã được cache in-memory trong `ward-boundary.ts` nên chọn lại cùng một tỉnh
 * không tải lại mạng.
 */
export function useAreaBoundary(): UseAreaBoundaryResult {
  const [areaFocus, setAreaFocus] = useState<AreaFocus | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [hasNoBoundary, setHasNoBoundary] = useState(false);

  const focusArea = useCallback(async (suggestion: PlaceSuggestion) => {
    setLoading(true);
    setHasNoBoundary(false);

    const emptyFocus: AreaFocus = {
      kind: suggestion.kind,
      code: suggestion.code,
      name: suggestion.name,
      polygonGroups: [],
      fitCoords: [],
    };

    try {
      const raw =
        suggestion.kind === 'province'
          ? await fetchProvinceBoundaryGroups(suggestion.code)
          : await fetchWardBoundaryGroups(suggestion.code);

      // Bỏ đảo/mảnh vụn xa bờ + lọc thưa điểm, nếu không map zoom quá rộng và tụt FPS.
      const { groups, fitCoords } = prepareAreaShape(raw);

      const focus: AreaFocus = {
        kind: suggestion.kind,
        code: suggestion.code,
        name: suggestion.name,
        polygonGroups: groups,
        fitCoords,
      };
      setAreaFocus(focus);
      // GeoJSON tải được nhưng không có polygon nào → coi như chưa có ranh giới.
      setHasNoBoundary(groups.length === 0);
      return focus;
    } catch {
      setAreaFocus(emptyFocus);
      setHasNoBoundary(true);
      return emptyFocus;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearFocus = useCallback(() => {
    setAreaFocus(null);
    setHasNoBoundary(false);
  }, []);

  return { areaFocus, isLoading, hasNoBoundary, focusArea, clearFocus };
}
