import type { ApiEnvelope } from '@/types/api.types';

/** Trích `data` từ envelope chuẩn BE `{ code, message, status, data }` */
export function unwrapApiEnvelope<T>(envelope: ApiEnvelope<T>): T {
  return envelope.data;
}
