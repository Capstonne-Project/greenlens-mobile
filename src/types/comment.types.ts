export interface CommentImageItem {
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ReportCommentItem {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string | null;
  isHidden: boolean;
  canEdit: boolean;
  canDelete: boolean;
  parentCommentId?: string | null;
  likeCount: number;
  likedByMe: boolean;
  images: CommentImageItem[];
}

export interface ReportCommentsPage {
  items: ReportCommentItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AddCommentDto {
  content: string;
  images?: CommentImageItem[];
  parentCommentId?: string | null;
}

export interface AddCommentResult {
  id: string;
  reportId: string;
  content: string;
  createdAt: string;
  canEdit: boolean;
  parentCommentId?: string | null;
  images: CommentImageItem[];
}

export interface ToggleCommentLikeResult {
  commentId: string;
  liked: boolean;
  likeCount: number;
}

export interface CommentThread {
  root: ReportCommentItem;
  replies: ReportCommentItem[];
}
