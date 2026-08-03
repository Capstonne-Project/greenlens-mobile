import { create } from 'zustand';
import type {
  AiAnalyzeResult,
  AiSuggestedCategory,
  PollutionSeverity,
  ReportCaptureSource,
  ReportImageDraft,
  ReportLocationDraft,
} from '@/types/pollution-report.types';
import { MAX_WASTE_TAG_SELECTION } from '@/types/waste-tag.types';

interface CreateReportDraftState {
  source: ReportCaptureSource | null;
  images: ReportImageDraft[];
  location: ReportLocationDraft | null;
  /** Toạ độ GPS gốc đọc từ EXIF ảnh — dùng để phát hiện khi user đổi vị trí báo cáo ra xa vị trí ảnh. */
  exifLocation: { latitude: number; longitude: number } | null;
  categoryId: string | null;
  severity: PollutionSeverity | null;
  description: string;
  tags: string[];
  wasteTagIds: string[];
  isAnonymous: boolean;
  submittedReportCode: string | null;
  slaVerifyDueAt: string | null;
  // AI analysis
  useAi: boolean;
  tempImageId: string | null;
  /** localUri của ảnh đã được AI phân tích (khớp tempImageId) — BE dùng images[0] để verify với tempImageId,
   * nên ảnh này phải luôn đứng đầu payload submit, bất kể thứ tự user pick từ thư viện. */
  analyzedImageLocalUri: string | null;
  aiResult: AiAnalyzeResult | null;
  aiSuggestedCategory: AiSuggestedCategory | null;
  setSource: (source: ReportCaptureSource) => void;
  setImages: (images: ReportImageDraft[]) => void;
  addImage: (image: ReportImageDraft) => void;
  removeImage: (localUri: string) => void;
  updateImage: (localUri: string, patch: Partial<ReportImageDraft>) => void;
  setLocation: (location: ReportLocationDraft | null) => void;
  patchLocation: (patch: Partial<ReportLocationDraft>) => void;
  setExifLocation: (coords: { latitude: number; longitude: number } | null) => void;
  setCategoryId: (categoryId: string) => void;
  setSeverity: (severity: PollutionSeverity) => void;
  setDescription: (description: string) => void;
  setTags: (tags: string[]) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  toggleWasteTag: (tagId: string) => void;
  setIsAnonymous: (isAnonymous: boolean) => void;
  setSubmissionResult: (code: string, slaVerifyDueAt: string | null) => void;
  setUseAi: (useAi: boolean) => void;
  setAiResult: (
    tempImageId: string,
    aiResult: AiAnalyzeResult,
    suggestedCategory?: AiSuggestedCategory | null,
    analyzedImageLocalUri?: string | null,
  ) => void;
  clearAiResult: () => void;
  reset: () => void;
}

const initialState = {
  source: null as ReportCaptureSource | null,
  images: [] as ReportImageDraft[],
  location: null as ReportLocationDraft | null,
  exifLocation: null as { latitude: number; longitude: number } | null,
  categoryId: null as string | null,
  severity: null as PollutionSeverity | null,
  description: '',
  tags: [] as string[],
  wasteTagIds: [] as string[],
  // Mặc định TẮT ẩn danh — người dùng chủ động bật nếu muốn giấu danh tính.
  isAnonymous: false,
  submittedReportCode: null as string | null,
  slaVerifyDueAt: null as string | null,
  useAi: true,
  tempImageId: null as string | null,
  analyzedImageLocalUri: null as string | null,
  aiResult: null as AiAnalyzeResult | null,
  aiSuggestedCategory: null as AiSuggestedCategory | null,
};

export const useCreateReportDraftStore = create<CreateReportDraftState>((set) => ({
  ...initialState,

  setSource: (source) => set({ source }),

  setImages: (images) => set({ images }),

  addImage: (image) =>
    set((state) => ({
      images: [...state.images, image].slice(0, 5),
    })),

  removeImage: (localUri) =>
    set((state) => ({
      images: state.images.filter((image) => image.localUri !== localUri),
    })),

  updateImage: (localUri, patch) =>
    set((state) => ({
      images: state.images.map((image) =>
        image.localUri === localUri ? { ...image, ...patch } : image,
      ),
    })),

  setLocation: (location) => set({ location }),

  patchLocation: (patch) =>
    set((state) => ({
      location: state.location ? { ...state.location, ...patch } : null,
    })),

  setExifLocation: (coords) => set({ exifLocation: coords }),

  setCategoryId: (categoryId) => set({ categoryId }),

  setSeverity: (severity) => set({ severity }),

  setDescription: (description) => set({ description }),

  setTags: (tags) => set({ tags }),

  addTag: (tag) =>
    set((state) => {
      const value = tag.trim().replace(/\s+/g, ' ');
      if (!value) return state;
      const normalized = value.toLowerCase();
      if (state.tags.some((t) => t.toLowerCase() === normalized)) return state;
      return { tags: [...state.tags, value].slice(0, 8) };
    }),

  removeTag: (tag) =>
    set((state) => ({
      tags: state.tags.filter((t) => t !== tag),
    })),

  toggleWasteTag: (tagId) =>
    set((state) => {
      if (state.wasteTagIds.includes(tagId)) {
        return { wasteTagIds: state.wasteTagIds.filter((id) => id !== tagId) };
      }
      if (state.wasteTagIds.length >= MAX_WASTE_TAG_SELECTION) {
        return state;
      }
      return { wasteTagIds: [...state.wasteTagIds, tagId] };
    }),

  setIsAnonymous: (isAnonymous) => set({ isAnonymous }),

  setSubmissionResult: (code, slaVerifyDueAt) =>
    set({ submittedReportCode: code, slaVerifyDueAt }),

  setUseAi: (useAi) => set({ useAi }),

  setAiResult: (tempImageId, aiResult, suggestedCategory = null, analyzedImageLocalUri = null) =>
    set({ tempImageId, aiResult, aiSuggestedCategory: suggestedCategory, analyzedImageLocalUri }),

  clearAiResult: () => set({ tempImageId: null, aiResult: null, aiSuggestedCategory: null, analyzedImageLocalUri: null }),

  reset: () => set({ ...initialState }),
}));
