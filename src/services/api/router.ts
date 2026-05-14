/**
 * Router da API - Responsável por registrar e fazer match de endpoints
 */

import { ApiEndpoint, ApiRequest, ApiResponse } from './types';

export class ApiRouter {
  private endpoints: Map<string, ApiEndpoint> = new Map();

  register(endpoint: ApiEndpoint): void {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }

  match(method: string, path: string): { endpoint: ApiEndpoint; params: Record<string, string> } | null {
    for (const [, endpoint] of this.endpoints) {
      if (endpoint.method !== method) continue;

      const endpointParts = endpoint.path.split('/');
      const requestParts = path.split('/');

      if (endpointParts.length !== requestParts.length) continue;

      const params: Record<string, string> = {};
      let match = true;

      for (let i = 0; i < endpointParts.length; i++) {
        if (endpointParts[i].startsWith(':')) {
          params[endpointParts[i].slice(1)] = requestParts[i];
        } else if (endpointParts[i] !== requestParts[i]) {
          match = false;
          break;
        }
      }

      if (match) return { endpoint, params };
    }

    return null;
  }

  listEndpoints(): ApiEndpoint[] {
    return Array.from(this.endpoints.values());
  }
}
