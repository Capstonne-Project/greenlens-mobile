import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  DeclineAssignmentDto,
  MyAssignmentsParams,
  MyAssignmentsResponse,
  MyProgressResponse,
  ResolveAssignmentDto,
  TaskDetail,
  TeamProfile,
  UpdateProgressDto,
  UpdateProgressResult,
} from '@/types/cleanup-assignment.types';
import { normalizeTaskDetail } from '@/utils/field-worker-task';

export const cleanupAssignmentService = {
  getMyTasks: (params?: MyAssignmentsParams) =>
    api.get<ApiEnvelope<MyAssignmentsResponse>>('/teams/my-tasks', { params }),

  /** Path param LUÔN là reportId — fe-company-staff-api-guide §7.3 */
  getMyTaskDetail: async (reportId: string) => {
    const res = await api.get<ApiEnvelope<TaskDetail>>(`/teams/my-tasks/${reportId}`);
    return { ...res, data: { ...res.data, data: normalizeTaskDetail(res.data.data) } };
  },

  accept: (reportId: string) => api.put<void>(`/teams/my-tasks/${reportId}/accept`, {}),

  decline: (reportId: string, dto: DeclineAssignmentDto) =>
    api.put<void>(`/teams/my-tasks/${reportId}/decline`, dto),

  updateProgress: (reportId: string, dto: UpdateProgressDto) => {
    const formData = new FormData();
    formData.append('progressPercent', String(dto.progressPercent));
    if (dto.progressNote) formData.append('progressNote', dto.progressNote);
    dto.images?.forEach((img) => {
      formData.append('images', {
        uri: img.uri,
        type: img.mimeType ?? 'image/jpeg',
        name: img.fileName ?? 'progress.jpg',
      } as unknown as Blob);
    });
    return api.put<ApiEnvelope<UpdateProgressResult>>(`/reports/${reportId}/progress`, formData);
  },

  uploadAfterImagesForResolve: async (
    reportId: string,
    images: NonNullable<UpdateProgressDto['images']>,
    progressPercent: number,
  ): Promise<string[]> => {
    const response = await cleanupAssignmentService.updateProgress(reportId, {
      progressPercent,
      images,
    });
    return response.data.data.uploadedImageUrls ?? [];
  },

  resolve: (reportId: string, dto: ResolveAssignmentDto) =>
    api.put<void>(`/reports/${reportId}/resolve`, dto),

  getMyProgress: (params?: MyAssignmentsParams) =>
    api.get<ApiEnvelope<MyProgressResponse>>('/teams/my-progress', { params }),

  getTeamProfile: () =>
    api.get<ApiEnvelope<TeamProfile>>('/teams/my-profile'),
};
