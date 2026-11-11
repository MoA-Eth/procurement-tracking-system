import { describe, expect, it } from 'vitest';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  isIntegrationSecretValid,
  parseIntegrationApiKey,
} from './integration-api-key.service.js';

describe('executive dashboard integration API key', () => {
  it('parses a generated key into its identifier and secret', () => {
    const id = randomUUID();
    const secret = randomBytes(32).toString('base64url');

    expect(parseIntegrationApiKey(`moa_exec_${id}_${secret}`)).toEqual({
      id,
      secret,
    });
  });

  it('rejects malformed or truncated keys', () => {
    expect(parseIntegrationApiKey('')).toBeNull();
    expect(parseIntegrationApiKey('moa_exec_not-a-uuid_short')).toBeNull();
  });

  it('compares the key secret to its stored hash', () => {
    const secret = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(secret).digest('hex');

    expect(isIntegrationSecretValid(secret, hash)).toBe(true);
    expect(isIntegrationSecretValid('incorrect-secret', hash)).toBe(false);
    expect(isIntegrationSecretValid(secret, 'invalid-hash')).toBe(false);
  });
});
