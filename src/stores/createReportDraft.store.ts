import { create } from 'zustand';
import type {
  PollutionSeverity,
  ReportCaptureSource,
  ReportImageDraft,
  ReportLocationDraft,
} from '@/types/pollution-report.types';

interface CreateReportDraftState {
  source: ReportCaptureSource | null;
  images: ReportImageDraft[];
  location: ReportLocationDraft | null;
  categoryId: string | null;
  severity: PollutionSeverity | null;
  description: string;
  tags: string[];
  isAnonymous: boolean;
  submittedReportCode: string | null;
  slaVerifyDueAt: string | null;
  setSource: (source: ReportCaptureSource) => void;
  setImages: (images: ReportImageDraft[]) => void;
  addImage: (image: ReportImageDraft) => void;
  removeImage: (localUri: string) => void;
  updateImage: (localUri: string, patch: Partial<ReportImageDraft>) => void;
  setLocation: (location: ReportLocationDraft | null) => void;
  patchLocation: (patch: Partial<ReportLocationDraft>) => void;
  setCategoryId: (categoryId: string) => void;
  setSeverity: (severity: PollutionSeverity) => void;
  setDescription: (description: string) => void;
  setTags: (tags: string[]) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setIsAnonymous: (isAnonymous: boolean) => void;
  setSubmissionResult: (code: string, slaVerifyDueAt: string) => void;
  reset: () => void;
}

const initialState = {
  source: null as ReportCaptureSource | null,
  images: [] as ReportImageDraft[],
  location: null as ReportLocationDraft | null,
  categoryId: null as string | null,
  severity: null as PollutionSeverity | null,
  description: '',
  tags: [] as string[],
  isAnonymous: true,
  submittedReportCode: null as string | null,
  slaVerifyDueAt: null as string | null,
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

  setIsAnonymous: (isAnonymous) => set({ isAnonymous }),

  setSubmissionResult: (code, slaVerifyDueAt) =>
    set({ submittedReportCode: code, slaVerifyDueAt }),

  reset: () => set({ ...initialState }),
}));
