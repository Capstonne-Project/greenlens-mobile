export type PollutionSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type AiDecision =
  | 'ACCEPTABLE_REPORT_IMAGE'
  | 'NEED_MANUAL_REVIEW'
  | 'IRRELEVANT_OR_SUSPECTED_ABUSIVE';

export type AiPrimaryClass = 'TRASH' | 'WATER' | 'SMOKE' | 'CHEMICAL' | null;

export type AiSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AiImageRelevance =
  | 'POLLUTION_LIKELY'
  | 'NOT_POLLUTION_OR_UNRELATED'
  | 'UNCLEAR_NEED_MANUAL_REVIEW';

export type AiTrashSubtype =
  | 'CONSTRUCTION'
  | 'ELECTRONIC'
  | 'HAZARDOUS'
  | 'HOUSEHOLD'
  | 'MEDICAL'
  | 'ORGANIC'
  | 'RECYCLABLE';

export interface AiTrashSubtypePrediction {
  subtype: AiTrashSubtype;
  count: number;
  confidence: number;
}

/** Toạ độ pixel tuyệt đối (xyxy) theo kích thước ảnh gốc đã upload. */
export interface AiDetectedBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  /** Chỉ có khi box thuộc prediction TRASH và model subtype đã load. */
  subtype?: AiTrashSubtype | null;
  subtypeConfidence?: number | null;
}

export interface AiPrediction {
  class: string;
  confidence: number;
  bboxCount: number;
  /** Chỉ có khi `class === 'TRASH'` và model subtype đã load ở AI Service. */
  subtypes?: AiTrashSubtypePrediction[] | null;
  boxes?: AiDetectedBox[] | null;
}

export interface AiClassifyResult {
  primaryClass: AiPrimaryClass;
  confidence: number;
  severity: AiSeverity;
  imageRelevance: AiImageRelevance;
  pollutionCoverageRatio: number;
  predictions: AiPrediction[];
  inferenceTimeMs: number;
  yoloActive: boolean;
  sceneClassifierActive: boolean;
  modelVersion?: string;
  noiseSupported?: boolean;
}

export interface AiAnalyzeResult {
  decision: AiDecision;
  reason: string;
  classify: AiClassifyResult;
}

export interface AiSuggestedCategory {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  iconUrl: string | null;
}

export interface AiAnalyzeResponse {
  tempImageId: string;
  expiresInSeconds: number;
  aiResult: AiAnalyzeResult;
  suggestedCategory: AiSuggestedCategory | null;
  /** Mô tả tiếng Việt do LLM soạn sẵn từ category/severity/subtype — null nếu LLM không khả dụng. */
  suggestedDescription: string | null;
}

export type ReportImageUploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export type ReportCaptureSource = 'camera' | 'library';

export interface ReportImageDraft {
  localUri: string;
  url?: string;
  key?: string;
  mimeType?: string;
  fileName?: string;
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

export interface UploadReportImageResult {
  url: string;
  key: string;
  message: string;
  mimeType: string;
  sizeBytes: number;
}

export type CheckExifLocationRequest =
  | {
      latitude: number;
      longitude: number;
      tempImageId: string;
    }
  | {
      latitude: number;
      longitude: number;
      publicUrl: string;
      key: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
    };

export interface CheckExifLocationData {
  hasExifGps: boolean;
  exifLatitude: number | null;
  exifLongitude: number | null;
  selectedLatitude: number;
  selectedLongitude: number;
  distanceMeters: number | null;
  thresholdMeters: number;
  shouldWarn: boolean;
}

export type MediaUploadPurpose =
  | 'ReportImage'
  | 'Before'
  | 'Progress'
  | 'After'
  | 'Comment'
  | 'Avatar'
  | 'ReopenEvidence'
  | 'InspectionEvidence';

export interface PresignMediaUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  contentType: string;
  requiredHeaders: Record<string, string>;
  expiresInSeconds: number;
  maxSizeBytes: number;
  purpose: MediaUploadPurpose;
}

export interface SubmitPollutionReportImage {
  url: string;
  key?: string;
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
  hideReporterName: boolean;
  images: SubmitPollutionReportImage[];
  wasteTagIds?: string[];
  tempImageId?: string;
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
  slaVerifyDueAt: string | null;
  aiPending: boolean;
  images: PollutionReportImageRecord[];
}
