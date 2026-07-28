export type CommunityCleanupStatus =
  | 'OpenForJoin'
  | 'JoinClosed'
  | 'InProgress'
  | 'PendingVerification'
  | 'Completed'
  | 'Cancelled';

export type CommunityCleanupParticipantStatus = 'Joined' | 'CheckedIn' | 'Withdrawn' | 'NoShow';

export type CommunityCleanupParticipantRole = 'Leader' | 'Member';

export type CommunityCleanupSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface CommunityCleanupLeader {
  userId: string;
  fullName: string;
  teamId: string;
  teamName: string;
}

export interface CommunityCleanupMediaSummary {
  beforeCount: number;
  progressCount: number;
  afterCount: number;
}

export interface CommunityCleanupMyParticipation {
  status: CommunityCleanupParticipantStatus;
  joinedAt: string;
  role: CommunityCleanupParticipantRole;
}

export interface CommunityCleanupEventDetail {
  id: string;
  reportId: string;
  reportCode: string;
  status: CommunityCleanupStatus;
  title: string;
  description: string | null;
  leader: CommunityCleanupLeader;
  joinOpensAt: string;
  joinClosesAt: string | null;
  startsAt: string;
  endsAt: string | null;
  maxParticipants: number;
  participantCount: number;
  spotsLeft: number;
  progressPercent: number;
  progressNote: string | null;
  meetingNote: string | null;
  meetingLatitude: number | null;
  meetingLongitude: number | null;
  reportLatitude: number;
  reportLongitude: number;
  reportAddress: string | null;
  categoryName: string;
  severity: CommunityCleanupSeverity;
  thumbnailUrl: string | null;
  myParticipation: CommunityCleanupMyParticipation | null;
  isLeader: boolean;
  mediaSummary: CommunityCleanupMediaSummary;
}

export interface CommunityCleanupListItem {
  id: string;
  reportId: string;
  reportCode: string;
  status: CommunityCleanupStatus;
  title: string;
  leaderUserId: string;
  leaderFullName: string;
  startsAt: string;
  joinClosesAt: string | null;
  maxParticipants: number;
  participantCount: number;
  spotsLeft: number;
  progressPercent: number;
  reportLatitude: number;
  reportLongitude: number;
  thumbnailUrl: string | null;
  myParticipation: CommunityCleanupMyParticipation | null;
}

export interface CommunityCleanupParticipant {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: CommunityCleanupParticipantRole;
  status: CommunityCleanupParticipantStatus;
  joinedAt: string;
  checkedInAt: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CommunityCleanupListResponse {
  items: CommunityCleanupListItem[];
  pagination: PaginationMeta;
}

export interface CommunityCleanupParticipantsResponse {
  items: CommunityCleanupParticipant[];
  pagination: PaginationMeta;
}

export interface CreateCommunityCleanupPayload {
  title: string;
  description?: string | null;
  leaderUserId: string;
  startsAt: string;
  endsAt?: string | null;
  joinClosesAt?: string | null;
  maxParticipants?: number;
  meetingNote?: string | null;
  meetingLatitude?: number | null;
  meetingLongitude?: number | null;
}

export interface GetOpenCommunityCleanupsParams {
  page?: number;
  pageSize?: number;
  nearLat?: number;
  nearLng?: number;
  radiusMeters?: number;
}

export interface UpdateCommunityProgressPayload {
  percent: number;
  note?: string | null;
  imageUrls?: string[];
}
