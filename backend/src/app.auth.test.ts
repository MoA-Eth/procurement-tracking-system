import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from './app.js';

// Every data endpoint must reject a request that carries no session.
// These requests are refused by the auth middleware before any database
// access, so the suite runs without Postgres.
const PROTECTED_ROUTES: Array<[method: string, path: string]> = [
  ['GET', '/api/activities'],
  ['GET', '/api/activities/some-id'],
  ['POST', '/api/activities'],
  ['GET', '/api/alerts'],
  ['GET', '/api/alerts?userId=someone-else'],
  ['POST', '/api/alerts'],
  ['GET', '/api/alerts/some-id'],
  ['PATCH', '/api/alerts/some-id'],
  ['PATCH', '/api/alerts/some-id/read'],
  ['PATCH', '/api/alerts/read-all'],
  ['DELETE', '/api/alerts/some-id'],
  ['GET', '/api/dashboard/summary'],
  ['GET', '/api/dashboard/by-sector'],
  ['GET', '/api/plans'],
  ['GET', '/api/projects'],
  ['GET', '/api/contracts'],
  ['GET', '/api/suppliers'],
  ['GET', '/api/users'],
  ['GET', '/api/audit-logs'],
  ['GET', '/api/reports/officer-summary'],
  ['GET', '/api/documents'],
  ['GET', '/api/excel/templates/projects'],
  ['GET', '/api/admin/users/some-id/invitation-link'],
  ['GET', '/api/me'],
];

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('API routes require authentication', () => {
  it.each(PROTECTED_ROUTES)(
    '%s %s returns 401 without a session',
    async (method, path) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        ...(method === 'GET' ? {} : { body: '{}' }),
      });

      expect(response.status).toBe(401);
    },
  );

  it('keeps the health check public', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
  });
});
