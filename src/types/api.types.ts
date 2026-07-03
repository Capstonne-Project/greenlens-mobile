/** Body JSON từ backend GreenLens (Swagger) */
export interface ApiEnvelope<T> {
  code: string;
  message: string;
  status: number;
  data: T;
}

/** Legacy / services chưa chuyển envelope — giữ khi gọi endpoint cũ */
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
}

/** Pagination chuẩn BE v3 — `{ items, pagination }` */
export interface ApiPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedItems<T> {
  items: T[];
  pagination: ApiPagination;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
