import { api } from './api';
import type { ApiEnvelope } from '@/types/api.types';
import type { AcceptInvitationResponse, InvitationDto } from '@/types/invitation.types';

export const invitationService = {
  getMy: () => api.get<ApiEnvelope<InvitationDto[]>>('/invitations/my'),

  accept: (invitationId: string) =>
    api.post<ApiEnvelope<AcceptInvitationResponse>>(`/invitations/${invitationId}/accept`),

  decline: (invitationId: string) => api.post<void>(`/invitations/${invitationId}/decline`),
};
