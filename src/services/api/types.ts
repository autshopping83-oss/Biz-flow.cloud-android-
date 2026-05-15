/**
 * Tipos da API interna do BizFlow Cloud
 */

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  userId?: string;
  params?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  timestamp: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ApiEndpoint = {
  method: ApiRequest['method'];
  path: string;
  handler: (req: ApiRequest) => Promise<ApiResponse>;
  description: string;
  auth: boolean;
};
