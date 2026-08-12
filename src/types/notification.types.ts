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
  /** Leader check-in / event bắt đầu — gửi cho participants còn lại (citizen) */
  | 'CommunityCleanupStarted'
  /** Leader cập nhật % tiến độ dọn dẹp — gửi cho participants (citizen) */
  | 'CommunityCleanupProgressUpdated'
  /** Leader nộp minh chứng hoàn thành — gửi cho LEO (chỉ xử lý ở web) */
  | 'CommunityCleanupVerificationSubmitted'
  /** LEO từ chối minh chứng — gửi cho Leader (fieldWorker) */
  | 'CommunityCleanupVerificationRejected'
  /** LEO duyệt hoàn thành chương trình — gửi cho participants (citizen) */
  | 'CommunityCleanupVerified'
  /** Nhắc check-in trước giờ dọn dẹp ~15 phút — gửi cho participants (citizen) */
  | 'CommunityCleanupCheckInReminder'
  /** Sắp đạt huy hiệu (tiến độ gần ngưỡng) */
  | 'BadgeProgressNear'
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
  /** LEO đã ghi nhận nộp phạt đủ và đóng hồ sơ — gửi cho Inspector đã ban hành QĐ */
  | 'InspectionPenaltyPaidAndClosed'
  /** BR-REP-015: citizen gửi yêu cầu mở lại báo cáo — gửi cho LEO của office */
  | 'ReopenReviewNeeded'
  /** BR-REP-015: LEO đã chấp nhận/từ chối yêu cầu mở lại — gửi cho citizen */
  | 'ReopenRequestDecided'
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
