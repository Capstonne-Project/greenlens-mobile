export type PollutionSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type ReportImageUploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export type ReportCaptureSource = 'camera' | 'library';

export interface ReportImageDraft {
  localUri: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadStatus: ReportImageUploadStatus;
}

export interface ReportLocationDraft {
  latitude: number;
  longitude: number;
  address?: string;
  provinceCode?: string;
  wardCode?: string;
  capturedAt: string;
}

export interface PollutionCategoryOption {
  id: string;
  code: string;
  nameVi: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}

export interface UploadReportImageResult {
  url: string;
  key: string;
  message: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SubmitPollutionReportImage {
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SubmitPollutionReportPayload {
  categoryId: string;
  severity: PollutionSeverity;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  provinceCode?: string;
  wardCode?: string;
  isAnonymous: boolean;
  images: SubmitPollutionReportImage[];
}

export interface PollutionReportCategory {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  iconUrl: string | null;
}

export interface PollutionReportImageRecord {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SubmitPollutionReportResult {
  id: string;
  code: string;
  category: PollutionReportCategory;
  severity: PollutionSeverity;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  wardCode: string | null;
  provinceCode: string | null;
  isAnonymous: boolean;
  reporterId: string | null;
  status: string;
  createdAt: string;
  slaVerifyDueAt: string;
  aiPending: boolean;
  images: PollutionReportImageRecord[];
}
