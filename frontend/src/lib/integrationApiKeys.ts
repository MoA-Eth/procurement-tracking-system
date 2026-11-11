import { apiClient } from "./apiClient";

export interface IntegrationApiKeyMetadata {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export function fetchIntegrationApiKeyStatus() {
  return apiClient.get<{ activeKey: IntegrationApiKeyMetadata | null }>(
    "/admin/integration-api-key",
  );
}

export function rotateIntegrationApiKey() {
  return apiClient.post<{
    key: string;
    metadata: IntegrationApiKeyMetadata;
  }>("/admin/integration-api-key/rotate", {});
}

export function revokeIntegrationApiKey() {
  return apiClient.delete<void>("/admin/integration-api-key");
}
