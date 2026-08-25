import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  DeclineAssignmentDto,
  EscalateAssignmentDto,
  LocalImageUpload,
  MyAssignmentsParams,
  MyAssignmentsResponse,
  MyProgressResponse,
  MyTaskProgressStats,
  ResolveAssignmentDto,
  TaskDetail,
  TeamProfile,
  UpdateProgressDto,
  UpdateProgressResult,
  UploadBeforeImagesDto,
  UploadBeforeImagesResult,
} from '@/types/cleanup-assignment.types';
import { compressImageForUpload } from '@/utils/compress-image';
import { normalizeTaskDetail } from '@/utils/field-worker-task';
import { uploadReportImage } from '@/services/pollutionReport.service';
import type { MediaUploadPurpose } from '@/types/pollution-report.types';

async function compressUploadImages(
  images: LocalImageUpload[],
  baseName: string,
): Promise<LocalImageUpload[]> {
  return Promise.all(
    images.map(async (img, index) => {
      const compressed = await compressImageForUpload(img.uri, `${baseName}_${index + 1}`);
      return {
        uri: compressed.uri,
        mimeType: compressed.mimeType,
        fileName: compressed.fileName,
      };
    }),
  );
}

async function uploadDirectImages(
  images: LocalImageUpload[],
  purpose: MediaUploadPurpose,
  fallbackName: string,
  reportId?: string,
): Promise<string[]> {
  const urls: string[] = [];

  // Limit concurrency to two so weak mobile connections remain stable.
  for (let index = 0; index < images.length; index += 2) {
    const batch = images.slice(index, index + 2);
    const uploaded = await Promise.all(
      batch.map((image, batchIndex) =>
        uploadReportImage({
          uri: image.uri,
          mimeType: image.mimeType ?? 'image/jpeg',
          fileName: image.fileName ?? `${fallbackName}_${index + batchIndex + 1}.jpg`,
          purpose,
          reportId,
        }),
      ),
    );
    urls.push(...uploaded.map((item) => item.url));
  }

  return urls;
}

export const cleanupAssignmentService = {
  getMyTasks: (params?: MyAssignmentsParams) =>
    api.get<ApiEnvelope<MyAssignmentsResponse>>('/teams/my-tasks', { params }),

  /** GET /teams/my-tasks/progress-stats — số liệu tổng hợp cho dashboard "Tiến độ" (tính sẵn ở BE). */
  getMyTaskProgressStats: () =>
    api.get<ApiEnvelope<MyTaskProgressStats>>('/teams/my-tasks/progress-stats'),

  /** Path param LUÔN là reportId — fe-company-staff-api-guide §7.3 */
  getMyTaskDetail: async (reportId: string) => {
    const res = await api.get<ApiEnvelope<TaskDetail>>(`/teams/my-tasks/${reportId}`);
    return { ...res, data: { ...res.data, data: normalizeTaskDetail(res.data.data) } };
  },

  accept: (reportId: string) => api.put<void>(`/teams/my-tasks/${reportId}/accept`, {}),

  decline: (reportId: string, dto: DeclineAssignmentDto) =>
    api.put<void>(`/teams/my-tasks/${reportId}/decline`, dto),

  /** POST /teams/my-tasks/{reportId}/escalate — leader, InProgress → Escalated */
  escalate: (reportId: string, dto: EscalateAssignmentDto) =>
    api.post<void>(`/teams/my-tasks/${reportId}/escalate`, dto),

  /** POST /reports/{reportId}/before-images — bắt buộc sau accept, trước resolve */
  uploadBeforeImages: async (reportId: string, dto: UploadBeforeImagesDto) => {
    const images = await compressUploadImages(dto.images, 'before');
    const imageUrls = await uploadDirectImages(images, 'Before', 'before', reportId);
    return api.post<ApiEnvelope<UploadBeforeImagesResult>>(
      `/reports/${reportId}/before-images`,
      { imageUrls },
    );
  },

  updateProgress: async (reportId: string, dto: UpdateProgressDto) => {
    const images = dto.images?.length
      ? await compressUploadImages(dto.images, 'progress')
      : [];
    const imageUrls = images.length
      ? await uploadDirectImages(images, 'Progress', 'progress', reportId)
      : [];

    return api.put<ApiEnvelope<UpdateProgressResult>>(`/reports/${reportId}/progress`, {
      progressPercent: dto.progressPercent,
      progressNote: dto.progressNote ?? null,
      imageUrls,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  },

  uploadAfterImagesForResolve: async (
    images: NonNullable<UpdateProgressDto['images']>,
  ): Promise<string[]> => {
    const compressedImages = await compressUploadImages(images, 'after');
    return uploadDirectImages(compressedImages, 'After', 'after');
  },

  resolve: (reportId: string, dto: ResolveAssignmentDto) =>
    api.put<void>(`/reports/${reportId}/resolve`, dto),

  getMyProgress: (params?: MyAssignmentsParams) =>
    api.get<ApiEnvelope<MyProgressResponse>>('/teams/my-progress', { params }),

  getTeamProfile: () =>
    api.get<ApiEnvelope<TeamProfile>>('/teams/my-profile'),
};
