import { api } from '@/services/api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  AddCommentDto,
  AddCommentResult,
  ReportCommentsPage,
  ToggleCommentLikeResult,
} from '@/types/comment.types';

export const commentService = {
  listByReport: (reportId: string, page = 1, pageSize = 50) =>
    api.get<ApiEnvelope<ReportCommentsPage>>(`/reports/${reportId}/comments`, {
      params: { page, pageSize },
    }),

  add: (reportId: string, dto: AddCommentDto) =>
    api.post<ApiEnvelope<AddCommentResult>>(`/reports/${reportId}/comments`, {
      content: dto.content,
      images: dto.images,
      parentCommentId: dto.parentCommentId ?? undefined,
    }),

  toggleLike: (commentId: string) =>
    api.post<ApiEnvelope<ToggleCommentLikeResult>>(`/comments/${commentId}/like`),
};
