/** Matches BE `Greenlens.Domain.Enums.NotificationType` (+ planned assign types). */
export type NotificationType =
  | 'ReportStatusChanged'
  | 'NewComment'
  | 'BadgeEarned'
  | 'LevelUp'
  | 'SlaBreachWarning'
  | 'NearbyReport'
  | 'PenaltyIssued'
  | 'ContractExpiry'
  | 'ReportOverdue'
  | 'ReportUnassigned'
  | 'ReportAutoClosed'
  | 'DuplicateReviewNeeded'
  | 'CommunityCleanupOpened'
  /** Cleaner được LEO chỉ định làm Leader chương trình dọn cộng đồng (gửi cho fieldWorker) */
  | 'CommunityCleanupLeaderAssigned'
  /** Planned — LEO/CM assign cleanup task */
  | 'ReportAssigned'
  /** Planned — LEO assign inspection */
  | 'InspectionAssigned'
  /** Planned — team declines assignment */
  | 'AssignmentDeclined'
  /** LEO mời Citizen tham gia đội Cleaner/Inspector — cần action Accept/Decline */
  | 'StaffInvitationReceived'
  /** Citizen đã chấp nhận lời mời (gửi cho LEO) */
  | 'StaffInvitationAccepted'
  /** Citizen đã từ chối lời mời (gửi cho LEO) */
  | 'StaffInvitationDeclined'
  | (string & {});

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  /** Pollution category (NameVi) when linked to a report */
  categoryName?: string | null;
  /** First report image thumbnail when linked to a report */
  thumbnailUrl?: string | null;
}

export interface NotificationsListResponse {
  items: AppNotification[];
  totalCount: number;
  unreadCount: number;
}

export interface NotificationPreferenceItem {
  type: NotificationType;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export interface GetNotificationsParams {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
}

/** FCM / expo-notifications data payload from BE */
export interface PushNotificationData {
  type?: string;
  referenceId?: string;
  notificationId?: string;
  id?: string;
}
