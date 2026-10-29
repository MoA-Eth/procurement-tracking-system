import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

vi.mock('../auth/auth.routes.js', () => ({
  loadSession: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const role = req.header('x-test-role');
    if (!role) return res.sendStatus(401);
    req.auth = {
      user: { role },
      sessionKind: req.header('x-test-kind') || 'AUTHENTICATED',
    } as typeof req.auth;
    next();
  },
  requireAuthenticated: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (req.auth?.sessionKind !== 'AUTHENTICATED') return res.sendStatus(403);
    next();
  },
}));
vi.mock('./executive-dashboard.service.js', () => ({
  getExecutiveSnapshot: vi.fn(async () => ({
    records: [],
    fetchedAt: '2026-10-15T00:00:00Z',
  })),
}));
import router from './executive-dashboard.routes.js';
import { getExecutiveSnapshot } from './executive-dashboard.service.js';

let server: Server;
let origin: string;
beforeAll(async () => {
  const app = express();
  app.use('/executive', router);
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}/executive`;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('executive module access', () => {
  it.each(['ADMIN', 'DIRECTOR', 'MANAGEMENT'])(
    'allows authenticated %s',
    async (role) => {
      const response = await fetch(origin, {
        headers: { 'x-test-role': role },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect((await response.json()).records).toEqual([]);
    },
  );
  it.each(['OFFICER', 'ENDORSING_COMMITTEE', 'UNKNOWN'])(
    'denies %s without reading procurement data',
    async (role) => {
      vi.mocked(getExecutiveSnapshot).mockClear();
      const response = await fetch(origin, {
        headers: { 'x-test-role': role },
      });
      expect(response.status).toBe(403);
      expect(getExecutiveSnapshot).not.toHaveBeenCalled();
    },
  );
  it('denies anonymous and password-change-only sessions', async () => {
    expect((await fetch(origin)).status).toBe(401);
    expect(
      (
        await fetch(origin, {
          headers: { 'x-test-role': 'ADMIN', 'x-test-kind': 'PASSWORD_CHANGE' },
        })
      ).status,
    ).toBe(403);
  });
});
