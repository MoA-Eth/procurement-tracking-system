import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

vi.mock('./integration-api-key.service.js', () => ({
  authenticateIntegrationApiKey: vi.fn(),
  requireIntegrationKeyHeader: (value?: string) => {
    if (!value) throw new Error('A valid X-API-Key header is required.');
    return value;
  },
}));
vi.mock('../executive-dashboard/executive-dashboard.service.js', () => ({
  getExecutiveSnapshot: vi.fn(async () => ({
    records: [],
    register: { columns: [{ key: 'no', label: 'No.' }], rows: [] },
    fetchedAt: '2026-11-01T00:00:00Z',
  })),
}));
import router from './integrations.routes.js';
import { authenticateIntegrationApiKey } from './integration-api-key.service.js';
import { getExecutiveSnapshot } from '../executive-dashboard/executive-dashboard.service.js';

let server: Server;
let origin: string;

beforeAll(async () => {
  const app = express();
  app.use('/integrations', router);
  app.use(
    (
      error: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      void _next;
      res
        .status(error.message.includes('API-Key') ? 401 : 500)
        .json({ message: error.message });
    },
  );
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}/integrations/executive-dashboard`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('external executive dashboard API', () => {
  it('requires an API key before reading dashboard data', async () => {
    vi.mocked(getExecutiveSnapshot).mockClear();
    const response = await fetch(origin);

    expect(response.status).toBe(401);
    expect(getExecutiveSnapshot).not.toHaveBeenCalled();
  });

  it('returns read-only executive snapshot data for a valid key', async () => {
    vi.mocked(authenticateIntegrationApiKey).mockResolvedValue(true);

    const response = await fetch(origin, {
      headers: { 'X-API-Key': 'valid-test-key' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      records: [],
      register: { columns: [{ key: 'no', label: 'No.' }], rows: [] },
      fetchedAt: '2026-11-01T00:00:00Z',
    });
    expect(authenticateIntegrationApiKey).toHaveBeenCalledWith(
      'valid-test-key',
    );
    expect(getExecutiveSnapshot).toHaveBeenCalledOnce();
  });

  it('rejects invalid keys without reading dashboard data', async () => {
    vi.mocked(authenticateIntegrationApiKey).mockResolvedValue(false);
    vi.mocked(getExecutiveSnapshot).mockClear();

    const response = await fetch(origin, {
      headers: { 'X-API-Key': 'invalid-test-key' },
    });

    expect(response.status).toBe(401);
    expect(getExecutiveSnapshot).not.toHaveBeenCalled();
  });
});
