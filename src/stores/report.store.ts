import { create } from 'zustand';
import type { ReportItem, ReportCategory, ReportSeverity } from '@/types/report.types';

interface ReportFilters {
  category: ReportCategory | null;
  severity: ReportSeverity | null;
}

interface ReportState {
  reports:    ReportItem[];
  filters:    ReportFilters;
  setReports: (reports: ReportItem[]) => void;
  addReport:  (report: ReportItem) => void;
  setFilters: (filters: Partial<ReportFilters>) => void;
  clearFilters: () => void;
}

export const useReportStore = create<ReportState>((set) => ({
  reports: [],
  filters: { category: null, severity: null },

  setReports:  (reports) => set({ reports }),
  addReport:   (report)  => set((s) => ({ reports: [report, ...s.reports] })),
  setFilters:  (f)       => set((s) => ({ filters: { ...s.filters, ...f } })),
  clearFilters: ()       => set({ filters: { category: null, severity: null } }),
}));
