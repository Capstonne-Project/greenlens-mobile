import type { UserRole } from '@/types/user.types';

export type InvitationStatus = 'Pending' | 'Accepted' | 'Declined' | 'Expired';

/** targetRole chỉ có 2 giá trị BE gán qua lời mời — subset của UserRole */
export type InvitationTargetRole = Extract<UserRole, 'Cleaner' | 'Inspector'>;

export interface InvitationDto {
  invitationId: string;
  invitedByUserId: string;
  invitedByName: string;
  targetRole: InvitationTargetRole;
  officeName: string;
  teamName: string | null;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface AcceptInvitationResponse {
  message?: string;
  role?: InvitationTargetRole;
  teamName?: string | null;
}
