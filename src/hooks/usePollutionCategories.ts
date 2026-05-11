import { useCallback, useEffect, useMemo, useState } from 'react';
import { catalogService } from '@/services/catalog.service';
import type { CatalogPollutionCategory } from '@/types/catalog.types';

interface UsePollutionCategoriesResult {
  categories: CatalogPollutionCategory[];
  isLoading: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
}

export function usePollutionCategories(enabled = true): UsePollutionCategoriesResult {
  const [categories, setCategories] = useState<CatalogPollutionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await catalogService.getPollutionCategories();
      setCategories(response.data.data.items);
    } catch {
      setCategories([]);
      setErrorMessage('Không tải được loại ô nhiễm. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void refetch();
  }, [enabled, refetch]);

  return useMemo(
    () => ({
      categories,
      isLoading,
      errorMessage,
      refetch,
    }),
    [categories, errorMessage, isLoading, refetch],
  );
}
