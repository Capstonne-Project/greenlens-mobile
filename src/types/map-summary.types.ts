/** Query GET /v1/map/summary — docs/fe-citizen-map-viewport-summary.md */
export interface MapSummaryQuery {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  days?: number;
  categoryId?: string;
}

export interface MapSummaryDailyCount {
  date: string;
  count: number;
}

export interface MapViewportSummaryData {
  reportCount: number;
  days: number;
  periodStart: string;
  periodEnd: string;
  dailyCounts: MapSummaryDailyCount[];
}
