import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type {
  CommunityCleanupEventDetail,
  CommunityCleanupListResponse,
  CommunityCleanupParticipantsResponse,
  CommunityCleanupStatus,
  CreateCommunityCleanupPayload,
  GetOpenCommunityCleanupsParams,
  UpdateCommunityProgressPayload,
} from '@/types/community-cleanup.types';

export const communityCleanupService = {
  // ── LEO — Web (kept here for completeness; not used by mobile screens) ──
  create: (reportId: string, payload: CreateCommunityCleanupPayload) =>
    api.post<ApiEnvelope<CommunityCleanupEventDetail>>(
      `/reports/${reportId}/community-cleanups`,
      payload,
    ),

  // ── Citizen ──
  getOpen: (params?: GetOpenCommunityCleanupsParams) =>
    api.get<ApiEnvelope<CommunityCleanupListResponse>>('/community-cleanups', { params }),

  getById: (eventId: string) =>
    api.get<ApiEnvelope<CommunityCleanupEventDetail>>(`/community-cleanups/${eventId}`),

  join: (eventId: string) => api.post<void>(`/community-cleanups/${eventId}/join`, {}),

  withdraw: (eventId: string) => api.post<void>(`/community-cleanups/${eventId}/withdraw`, {}),

  getMy: (params?: { page?: number; pageSize?: number }) =>
    api.get<ApiEnvelope<CommunityCleanupListResponse>>('/community-cleanups/my', { params }),

  checkIn: (eventId: string, latitude: number, longitude: number) =>
    api.post<void>(`/community-cleanups/${eventId}/check-in`, { latitude, longitude }),

  // ── Leader ──
  getLedByMe: (params?: { page?: number; pageSize?: number; status?: CommunityCleanupStatus }) =>
    api.get<ApiEnvelope<CommunityCleanupListResponse>>('/community-cleanups/led-by-me', { params }),

  getParticipants: (eventId: string, params?: { page?: number; pageSize?: number }) =>
    api.get<ApiEnvelope<CommunityCleanupParticipantsResponse>>(
      `/community-cleanups/${eventId}/participants`,
      { params },
    ),

  start: (eventId: string) => api.post<void>(`/community-cleanups/${eventId}/start`, {}),

  uploadBeforeImages: (eventId: string, imageUrls: string[]) =>
    api.post<ApiEnvelope<{ savedImageUrls: string[] }>>(
      `/community-cleanups/${eventId}/before-images`,
      { imageUrls },
    ),

  updateProgress: (eventId: string, payload: UpdateCommunityProgressPayload) =>
    api.put<ApiEnvelope<{ savedImageUrls: string[] }>>(
      `/community-cleanups/${eventId}/progress`,
      payload,
    ),

  submitVerification: (eventId: string, imageUrls: string[]) =>
    api.post<void>(`/community-cleanups/${eventId}/submit-verification`, { imageUrls }),
};
