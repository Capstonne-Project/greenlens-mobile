import { useCallback, useEffect, useRef, useState } from 'react';

import { userService } from '@/services/user.service';
import type { PublicUserProfile, PublicUserReportItem } from '@/types/user.types';
import { getApiErrorMessage } from '@/utils/api-error-message';

const PAGE_SIZE = 21; // chia hết cho lưới 3 cột

interface UsePublicUserProfileResult {
  profile: PublicUserProfile | null;
  reports: PublicUserReportItem[];
  isLoading: boolean;
  isLoadingReports: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  errorMessage: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/** Hồ sơ công khai + báo cáo công khai của người dùng khác — màn `app/user/[id]`. */
export function usePublicUserProfile(userId: string | undefined): UsePublicUserProfileResult {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [reports, setReports] = useState<PublicUserReportItem[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isLoadingReports, setLoadingReports] = useState(false);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setError] = useState<string | null>(null);

  const pageRef = useRef(1);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadingReports(true);
    setError(null);
    pageRef.current = 1;

    try {
      const profileRes = await userService.getPublicProfile(userId);
      setProfile(profileRes.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải hồ sơ người dùng.'));
      setLoading(false);
      setLoadingReports(false);
      return;
    }
    setLoading(false);

    // Lỗi danh sách báo cáo không nên chặn hiển thị hồ sơ.
    try {
      const res = await userService.getPublicReports(userId, { page: 1, pageSize: PAGE_SIZE });
      const { items, pagination } = res.data.data;
      setReports(items);
      setHasMore(pagination.hasNext);
    } catch {
      setReports([]);
      setHasMore(false);
    } finally {
      setLoadingReports(false);
    }
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || isLoadingMore || isLoadingReports) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const res = await userService.getPublicReports(userId, {
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      const { items, pagination } = res.data.data;
      setReports((prev) => [...prev, ...items]);
      setHasMore(pagination.hasNext);
      pageRef.current = nextPage;
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, hasMore, isLoadingMore, isLoadingReports]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    profile,
    reports,
    isLoading,
    isLoadingReports,
    isLoadingMore,
    hasMore,
    errorMessage,
    refetch: load,
    loadMore,
  };
}
