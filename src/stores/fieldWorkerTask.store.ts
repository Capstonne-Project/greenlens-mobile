import { create } from 'zustand';

import type { AssignmentItem } from '@/types/cleanup-assignment.types';

interface FieldWorkerTaskStore {
  pendingByKey: Record<string, AssignmentItem>;
  setPendingItem: (item: AssignmentItem) => void;
  getPendingItem: (reportId: string, assignmentId?: string) => AssignmentItem | undefined;
  clearPendingItem: (reportId: string, assignmentId?: string) => void;
}

function pendingKey(reportId: string, assignmentId?: string): string {
  return reportId || assignmentId || '';
}

export const useFieldWorkerTaskStore = create<FieldWorkerTaskStore>((set, get) => ({
  pendingByKey: {},

  setPendingItem: (item) => {
    const key = pendingKey(item.reportId, item.assignmentId);
    if (!key) return;
    set((state) => ({
      pendingByKey: { ...state.pendingByKey, [key]: item },
    }));
  },

  getPendingItem: (reportId, assignmentId) => {
    const store = get().pendingByKey;
    return store[pendingKey(reportId, assignmentId)] ?? store[reportId] ?? store[assignmentId ?? ''];
  },

  clearPendingItem: (reportId, assignmentId) => {
    const key = pendingKey(reportId, assignmentId);
    if (!key) return;
    set((state) => {
      const next = { ...state.pendingByKey };
      delete next[key];
      if (reportId) delete next[reportId];
      if (assignmentId) delete next[assignmentId];
      return { pendingByKey: next };
    });
  },
}));
