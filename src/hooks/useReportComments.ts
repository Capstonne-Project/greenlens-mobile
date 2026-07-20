import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { commentService } from '@/services/comment.service';
import type { CommentThread, ReportCommentItem } from '@/types/comment.types';
import { getApiErrorMessage } from '@/utils/api-error-message';

interface UseReportCommentsResult {
  comments: ReportCommentItem[];
  threads: CommentThread[];
  isLoading: boolean;
  isSubmitting: boolean;
  likingCommentId: string | null;
  errorMessage: string | null;
  refetch: () => Promise<void>;
  addComment: (content: string, parentCommentId?: string | null) => Promise<boolean>;
  toggleLike: (commentId: string) => Promise<boolean>;
}

function buildThreads(items: ReportCommentItem[]): CommentThread[] {
  const byParent = new Map<string, ReportCommentItem[]>();
  const roots: ReportCommentItem[] = [];

  for (const item of items) {
    if (item.parentCommentId) {
      const list = byParent.get(item.parentCommentId) ?? [];
      list.push(item);
      byParent.set(item.parentCommentId, list);
    } else {
      roots.push(item);
    }
  }

  const sortAsc = (a: ReportCommentItem, b: ReportCommentItem) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  roots.sort(sortAsc);

  return roots.map((root) => ({
    root,
    replies: (byParent.get(root.id) ?? []).sort(sortAsc),
  }));
}

function normalizeComment(raw: ReportCommentItem): ReportCommentItem {
  return {
    ...raw,
    likeCount: raw.likeCount ?? 0,
    likedByMe: Boolean(raw.likedByMe),
    parentCommentId: raw.parentCommentId ?? null,
    images: raw.images ?? [],
  };
}

export function useReportComments(
  reportId: string | undefined,
  enabled = true,
): UseReportCommentsResult {
  const [comments, setComments] = useState<ReportCommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!reportId) return;

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await commentService.listByReport(reportId, 1, 50);
      if (requestId !== requestIdRef.current) return;
      setComments((res.data.data.items ?? []).map(normalizeComment));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setComments([]);
      setErrorMessage(getApiErrorMessage(error, 'Không tải được bình luận.'));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [reportId]);

  useEffect(() => {
    if (!enabled || !reportId) return;
    void refetch();
  }, [enabled, reportId, refetch]);

  const addComment = useCallback(
    async (content: string, parentCommentId?: string | null) => {
      if (!reportId) return false;
      const trimmed = content.trim();
      if (trimmed.length < 1 || trimmed.length > 500) return false;

      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        await commentService.add(reportId, {
          content: trimmed,
          parentCommentId: parentCommentId ?? undefined,
        });
        await refetch();
        return true;
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, 'Không gửi được phản hồi.'));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refetch, reportId],
  );

  const toggleLike = useCallback(
    async (commentId: string) => {
      if (!reportId) return false;

      // Optimistic update
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          const likedByMe = !c.likedByMe;
          return {
            ...c,
            likedByMe,
            likeCount: Math.max(0, c.likeCount + (likedByMe ? 1 : -1)),
          };
        }),
      );

      setLikingCommentId(commentId);
      try {
        const res = await commentService.toggleLike(commentId);
        const data = res.data.data;
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, likedByMe: data.liked, likeCount: data.likeCount }
              : c,
          ),
        );
        return true;
      } catch (error) {
        // Revert by refetch
        await refetch();
        setErrorMessage(getApiErrorMessage(error, 'Không thích được bình luận.'));
        return false;
      } finally {
        setLikingCommentId(null);
      }
    },
    [refetch, reportId],
  );

  const threads = useMemo(() => buildThreads(comments), [comments]);

  return useMemo(
    () => ({
      comments,
      threads,
      isLoading,
      isSubmitting,
      likingCommentId,
      errorMessage,
      refetch,
      addComment,
      toggleLike,
    }),
    [
      comments,
      threads,
      isLoading,
      isSubmitting,
      likingCommentId,
      errorMessage,
      refetch,
      addComment,
      toggleLike,
    ],
  );
}
