/** Kỳ báo cáo KPI — khớp enum `KpiPeriod` của BE. */
export type KpiPeriod =
  | 'ThisMonth'
  | 'ThisQuarter'
  | 'ThisYear'
  | 'LastMonth'
  | 'LastQuarter'
  | 'LastYear';

/** `GET /v1/inspections/kpi` — BR-INS-032. */
export interface InspectionTeamKpi {
  teamId: string;
  teamName: string;
  periodFrom: string;
  periodTo: string;

  totalInspections: number;
  penaltyIssuedCount: number;
  penaltyIssuedOnTime: number;
  /** BE đã tính sẵn, làm tròn 1 chữ số thập phân. */
  penaltyIssuedOnTimePercent: number;
  closedNoViolationCount: number;

  totalPaid: number;
  paidOnTime: number;
  paidOnTimePercent: number;

  repeatOffenderCount: number;
  slaBreach: number;
}

export interface InspectionKpiParams {
  teamId?: string;
  period?: KpiPeriod;
  from?: string;
  to?: string;
}
