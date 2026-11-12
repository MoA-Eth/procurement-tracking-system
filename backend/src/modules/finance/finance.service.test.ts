import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SmsSettingsSchema } from './finance.schema.js';

const { systemSettingsStore, prismaMock } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    systemSettingsStore: store,
    prismaMock: {
      systemSetting: {
        findUnique: vi.fn(async ({ where }: { where: { key: string } }) => {
          const value = store.get(where.key);
          return value === undefined ? null : { key: where.key, value };
        }),
        upsert: vi.fn(
          async ({
            where,
            update,
          }: {
            where: { key: string };
            update: { value: string };
            create: { key: string; value: string };
          }) => {
            store.set(where.key, update.value);
            return { key: where.key, value: update.value };
          },
        ),
      },
      payment: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      smsLog: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('../../config/database.js', () => ({ prisma: prismaMock }));
vi.mock('../../config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  MASKED_GATEWAY_API_KEY,
  buildGatewayHeaders,
  getSmsSettings,
  sendSmsToGateway,
  sendTestSms,
  updateSmsSettings,
} from './finance.service.js';

describe('finance SMS gateway service', () => {
  beforeEach(() => {
    systemSettingsStore.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('buildGatewayHeaders', () => {
    it('formats Bearer authorization by default', () => {
      expect(buildGatewayHeaders('  secret-123  ')).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret-123',
      });
    });

    it('formats raw authorization header for RAW auth format', () => {
      expect(buildGatewayHeaders('  raw-gateway-token  ', 'RAW')).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'raw-gateway-token',
      });
    });

    it('omits Authorization header when apiKey is empty', () => {
      expect(buildGatewayHeaders('   ', 'RAW')).toEqual({
        'Content-Type': 'application/json',
      });
    });
  });

  describe('sendSmsToGateway', () => {
    it('dispatches POST payload with raw token and handles empty 200 body', async () => {
      let capturedHeaders = new Headers();
      let capturedBody: unknown;
      const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
        capturedHeaders = new Headers(init?.headers);
        capturedBody = JSON.parse(String(init?.body));
        return new Response('', { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const res = await sendSmsToGateway(
        '+251911234567',
        'Hello MoA',
        'http://172.16.166.186:8080/',
        'my-raw-token',
        'RAW',
      );

      expect(res).toEqual({ success: true, response: 'HTTP 200 OK' });
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://172.16.166.186:8080/');
      expect(capturedHeaders.get('authorization')).toBe('my-raw-token');
      expect(capturedHeaders.get('content-type')).toBe('application/json');
      expect(capturedBody).toEqual({ to: '+251911234567', message: 'Hello MoA' });
    });

    it('includes HTTP status when gateway rejects with empty or text body', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>().mockResolvedValue(
          new Response('', { status: 401, statusText: 'Unauthorized' }),
        ),
      );

      const res = await sendSmsToGateway(
        '+251911234567',
        'Hello',
        'http://192.168.1.45:8082/',
        'bad-token',
        'RAW',
      );

      expect(res).toEqual({
        success: false,
        response: 'HTTP 401: Unauthorized',
      });
    });

    it('includes nested cause message when fetch throws a connection error', async () => {
      const error = new TypeError('fetch failed', {
        cause: new Error('connect ECONNREFUSED 192.168.1.45:8082'),
      });
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(error));

      const res = await sendSmsToGateway(
        '+251911234567',
        'Hello',
        'http://192.168.1.45:8082/',
        'token',
        'RAW',
      );

      expect(res).toEqual({
        success: false,
        response: 'fetch failed (connect ECONNREFUSED 192.168.1.45:8082)',
      });
    });
  });

  describe('updateSmsSettings & getSmsSettings', () => {
    it('preserves existing API key when masked sentinel or undefined is submitted', async () => {
      await updateSmsSettings({
        smsEnabled: true,
        gatewayUrl: 'http://192.168.1.45:8082/',
        gatewayApiKey: 'real-gateway-token',
        gatewayAuthFormat: 'RAW',
        thresholdEtb: 20_000_000,
        recipients: [{ name: 'Director', phone: '+251911234567' }],
        mockMode: false,
      });

      await updateSmsSettings({
        smsEnabled: true,
        gatewayUrl: 'http://192.168.1.45:8082/',
        gatewayApiKey: MASKED_GATEWAY_API_KEY,
        gatewayAuthFormat: 'RAW',
        thresholdEtb: 30_000_000,
        recipients: [{ name: 'Director', phone: '+251911234567' }],
        mockMode: false,
      });

      await updateSmsSettings({
        smsEnabled: true,
        gatewayUrl: 'http://192.168.1.45:8082/',
        gatewayAuthFormat: 'RAW',
        thresholdEtb: 30_000_000,
        recipients: [{ name: 'Director', phone: '+251911234567' }],
        mockMode: false,
      });

      const saved = await getSmsSettings();
      expect(saved.gatewayApiKey).toBe('real-gateway-token');
      expect(saved.gatewayAuthFormat).toBe('RAW');
      expect(saved.thresholdEtb).toBe(30_000_000);
    });

    it('clears the API key when an empty string is submitted explicitly', async () => {
      await updateSmsSettings({
        smsEnabled: true,
        gatewayUrl: 'http://192.168.1.45:8082/',
        gatewayApiKey: 'initial-token',
        gatewayAuthFormat: 'RAW',
        thresholdEtb: 20_000_000,
        recipients: [],
        mockMode: false,
      });

      await updateSmsSettings({
        smsEnabled: true,
        gatewayUrl: 'http://192.168.1.45:8082/',
        gatewayApiKey: '',
        gatewayAuthFormat: 'BEARER',
        thresholdEtb: 20_000_000,
        recipients: [],
        mockMode: false,
      });

      const saved = await getSmsSettings();
      expect(saved.gatewayApiKey).toBe('');
      expect(saved.gatewayAuthFormat).toBe('BEARER');
    });

    it('uses saved RAW auth format in sendTestSms', async () => {
      systemSettingsStore.set('sms_mock_mode', 'false');
      systemSettingsStore.set('sms_gateway_url', 'http://192.168.1.45:8082/');
      systemSettingsStore.set('sms_gateway_api_key', 'phone-token');
      systemSettingsStore.set('sms_gateway_auth_format', 'RAW');

      let capturedAuth = '';
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
          capturedAuth = new Headers(init?.headers).get('authorization') ?? '';
          return new Response('Queued', { status: 200 });
        }),
      );

      const res = await sendTestSms('+251911234567');
      expect(res).toEqual({ success: true, message: 'Queued' });
      expect(capturedAuth).toBe('phone-token');
    });
  });

  describe('SmsSettingsSchema', () => {
    it('validates internal HTTP gateway URLs, blank URLs, optional API keys, and auth formats', () => {
      const valid = SmsSettingsSchema.safeParse({
        smsEnabled: true,
        gatewayUrl: '  http://192.168.1.45:8082/  ',
        gatewayAuthFormat: 'RAW',
        thresholdEtb: 20_000_000,
        recipients: [{ name: 'Finance Head', phone: '+251911234567' }],
        mockMode: false,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.gatewayUrl).toBe('http://192.168.1.45:8082/');
      }

      const emptyUrl = SmsSettingsSchema.safeParse({
        smsEnabled: false,
        gatewayUrl: '   ',
        gatewayApiKey: '',
        thresholdEtb: 20_000_000,
        recipients: [],
      });
      expect(emptyUrl.success).toBe(true);
      if (emptyUrl.success) {
        expect(emptyUrl.data.gatewayUrl).toBe('');
      }

      const badUrl = SmsSettingsSchema.safeParse({
        smsEnabled: false,
        gatewayUrl: 'not-a-url',
        thresholdEtb: 20_000_000,
        recipients: [],
      });
      expect(badUrl.success).toBe(false);
    });
  });
});
