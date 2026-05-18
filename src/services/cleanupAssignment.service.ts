import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  AcceptAssignmentDto,
  DeclineAssignmentDto,
  MyAssignmentsParams,
  MyAssignmentsResponse,
  ReportDetail,
  ResolveAssignmentDto,
  UpdateProgressDto,
  UploadProgressImageDto,
  UploadProgressImageResult,
} from '@/types/cleanup-assignment.types';

export const cleanupAssignmentService = {
  getMyAssignments: (params?: MyAssignmentsParams) =>
    api.get<ApiEnvelope<MyAssignmentsResponse>>('/reports/my-assignments', { params }),

  getReportDetail: (reportId: string) =>
    api.get<ApiEnvelope<ReportDetail>>(`/reports/${reportId}`),

  accept: (reportId: string, dto: AcceptAssignmentDto) =>
    api.put<void>(`/reports/${reportId}/accept`, dto),

  decline: (reportId: string, dto: DeclineAssignmentDto) =>
    api.put<void>(`/reports/${reportId}/decline`, dto),

  uploadProgressImage: (reportId: string, dto: UploadProgressImageDto) => {
    const formData = new FormData();
    formData.append('teamId', dto.teamId);
    formData.append('image', {
      uri: dto.imageUri,
      type: dto.mimeType ?? 'image/jpeg',
      name: dto.fileName ?? 'progress.jpg',
    } as unknown as Blob);
    return api.post<ApiEnvelope<UploadProgressImageResult>>(
      `/reports/${reportId}/progress/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  updateProgress: (reportId: string, dto: UpdateProgressDto) =>
    api.put<void>(`/reports/${reportId}/progress`, dto),

  resolve: (reportId: string, dto: ResolveAssignmentDto) =>
    api.put<void>(`/reports/${reportId}/resolve`, dto),
};
