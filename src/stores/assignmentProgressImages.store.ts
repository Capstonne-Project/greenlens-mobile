import { create } from 'zustand';

/** Stable empty reference — avoid infinite re-renders in selectors */
export const EMPTY_PROGRESS_IMAGE_URLS: string[] = [];

interface AssignmentProgressImagesState {
  byReportId: Record<string, string[]>;
  appendUrls: (reportId: string, urls: string[]) => void;
  getUrls: (reportId: string) => string[];
  clearReport: (reportId: string) => void;
  reset: () => void;
}

export const useAssignmentProgressImagesStore = create<AssignmentProgressImagesState>((set, get) => ({
  byReportId: {},

  appendUrls: (reportId, urls) => {
    if (!reportId || urls.length === 0) return;
    set((state) => {
      const existing = state.byReportId[reportId] ?? [];
      const merged = [...existing];
      urls.forEach((url) => {
        if (!merged.includes(url)) merged.push(url);
      });
      return {
        byReportId: {
          ...state.byReportId,
          [reportId]: merged,
        },
      };
    });
  },

  getUrls: (reportId) => get().byReportId[reportId] ?? EMPTY_PROGRESS_IMAGE_URLS,

  clearReport: (reportId) =>
    set((state) => {
      if (!state.byReportId[reportId]) return state;
      const next = { ...state.byReportId };
      delete next[reportId];
      return { byReportId: next };
    }),

  reset: () => set({ byReportId: {} }),
}));
