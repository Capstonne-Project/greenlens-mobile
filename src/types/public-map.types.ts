import type { ReportCategory } from '@/types/report.types';

/** Query GET /v1/map/reports — theo docs/PUBLIC_MAP_VIEWPORT_PLAN.md §3.2 */
export interface PublicMapReportsQuery {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  mode: 'detail' | 'aggregate';
  limit?: number;
  gridLevel?: number;
  /** UUID category — khi BE có catalog client có thể truyền */
  categoryId?: string;
}

/**
 * Một dòng từ BE — field có thể khác PascalCase tùy serializer.
 * Xác nhận BE (docs/mobile-home-map-list-sheet-api-confirmation.md):
 * - `title` = Category.NameVi (report không có field tiêu đề riêng) — luôn có giá trị khi category active.
 * - `address` là chuỗi tự do do citizen nhập, KHÔNG được BE rút gọn về cấp phường/quận.
 * - `imageUrl` là ảnh đầu tiên (ThumbnailUrl ưu tiên), chỉ 1 URL.
 */
export interface PublicMapReportDto {
  id: string;
  code?: string | null;
  latitude: number;
  longitude: number;
  severity?: string | null;
  categoryCode?: string | null;
  categoryIconUrl?: string | null;
  title?: string | null;
  description?: string | null;
  address?: string | null;
  reporterCount?: number | null;
  imageUrl?: string | null;
  status?: string | null;
  createdAt?: string | null;
  /** True khi báo cáo có chương trình dọn cộng đồng đang mở/chạy — pin hiển thị màu đen kèm nhãn "Cộng đồng". */
  hasActiveCommunityCleanup?: boolean | null;
  /** Id chương trình dọn cộng đồng đang active, chỉ có khi hasActiveCommunityCleanup = true. */
  communityCleanupEventId?: string | null;
}

export interface PublicMapDetailMeta {
  limit: number;
  returned: number;
}

export interface PublicMapDetailPayload {
  mode?: 'detail' | 'aggregate';
  items: PublicMapReportDto[];
  meta: PublicMapDetailMeta;
}

/** Ô aggregate — dùng sau khi bật mode aggregate */
export interface PublicMapAggregateCellDto {
  centerLat: number;
  centerLng: number;
  count: number;
  maxSeverity?: string | null;
}

export interface PublicMapAggregatePayload {
  cells: PublicMapAggregateCellDto[];
  meta: { gridLevel?: number };
}

/** Map categoryCode API → filter UI `ReportCategory` */
export type CategoryCodeMapping = Record<string, ReportCategory>;
