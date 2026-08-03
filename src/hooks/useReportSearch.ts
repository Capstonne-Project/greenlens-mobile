import { useEffect, useRef, useState } from 'react';

import { reportSearchService } from '@/services/reportSearch.service';
import type { ReportSearchItem } from '@/types/report-search.types';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 5;

interface UseReportSearchResult {
  results: ReportSearchItem[];
  isSearching: boolean;
}

/**
 * Search báo cáo theo keyword qua `GET /v1/reports?keyword=`.
 *
 * Khác với search địa giới (lọc client-side, tức thì), đây là gọi mạng nên phải
 * debounce 300ms và bỏ qua kết quả của request cũ khi người dùng gõ tiếp.
 */
export function useReportSearch(query: string, enabled = true): UseReportSearchResult {
  const [results, setResults] = useState<ReportSearchItem[]>([]);
  const [isSearching, setSearching] = useState(false);

  /** Tăng mỗi lần gõ — chỉ nhận kết quả của request mới nhất. */
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (!enabled || trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await reportSearchService.search({
          keyword: trimmed,
          page: 1,
          pageSize: MAX_RESULTS,
        });
        if (requestIdRef.current !== requestId) return; // đã có query mới hơn
        setResults(res.data.data.items);
      } catch {
        if (requestIdRef.current !== requestId) return;
        setResults([]);
      } finally {
        if (requestIdRef.current === requestId) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, enabled]);

  return { results, isSearching };
}
