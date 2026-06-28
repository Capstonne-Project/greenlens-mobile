import { useCallback, useEffect, useMemo, useState } from 'react';
import { wasteTagService } from '@/services/wasteTag.service';
import type { WasteTag } from '@/types/waste-tag.types';

interface UseWasteTagsResult {
  tags: WasteTag[];
  isLoading: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
}

export function useWasteTags(enabled = true): UseWasteTagsResult {
  const [tags, setTags] = useState<WasteTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await wasteTagService.getTags();
      const items = response.data.data.tags ?? [];
      setTags([...items].sort((a, b) => a.displayOrder - b.displayOrder));
    } catch {
      setTags([]);
      setErrorMessage('Không tải được loại rác thải. Vui lòng thử lại.');
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
      tags,
      isLoading,
      errorMessage,
      refetch,
    }),
    [tags, errorMessage, isLoading, refetch],
  );
}
