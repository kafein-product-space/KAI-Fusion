import { API_ENDPOINTS } from '../lib/config';
import { apiClient } from '../lib/api-client';
import type { ApiKey, ApiKeyCreateRequest, ApiKeyUpdateRequest, ApiKeyCreateResponse } from '../types/api';

const ApiKeyService = {
  async list(): Promise<ApiKey[]> {
    return apiClient.get<ApiKey[]>(API_ENDPOINTS.API_KEYS.LIST);
  },
  async create(data: ApiKeyCreateRequest): Promise<ApiKeyCreateResponse> {
    return apiClient.post<ApiKeyCreateResponse>(API_ENDPOINTS.API_KEYS.CREATE, data);
  },
  async update(id: string, data: ApiKeyUpdateRequest): Promise<ApiKey> {
    return apiClient.put<ApiKey>(API_ENDPOINTS.API_KEYS.UPDATE(id), data);
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.API_KEYS.DELETE(id));
  },
};

export default ApiKeyService; 