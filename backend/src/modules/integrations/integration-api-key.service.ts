import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/errors.js';

const KEY_PREFIX = 'moa_exec_';
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

export function isIntegrationSecretValid(secret: string, storedHash: string) {
  const actual = Buffer.from(hashSecret(secret), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function parseIntegrationApiKey(value: string) {
  const match = /^moa_exec_([0-9a-f-]{36})_([A-Za-z0-9_-]{43})$/.exec(value);
  const id = match?.[1];
  const secret = match?.[2];
  if (!id || !secret || !SECRET_PATTERN.test(secret)) return null;
  return { id, secret };
}

export async function getIntegrationApiKeyStatus() {
  const key = await prisma.integrationApiKey.findFirst({
    where: { revokedAt: null },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return key;
}

export async function rotateIntegrationApiKey(createdById: string) {
  const id = randomUUID();
  const secret = randomBytes(32).toString('base64url');
  const now = new Date();
  const name = 'Executive dashboard integration';

  await prisma.$transaction([
    prisma.integrationApiKey.updateMany({
      where: { revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.integrationApiKey.create({
      data: {
        id,
        name,
        secretHash: hashSecret(secret),
        createdById,
      },
    }),
  ]);

  return {
    key: `${KEY_PREFIX}${id}_${secret}`,
    metadata: { id, name, createdAt: now, lastUsedAt: null },
  };
}

export async function revokeIntegrationApiKey() {
  await prisma.integrationApiKey.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function authenticateIntegrationApiKey(value: string) {
  const parsed = parseIntegrationApiKey(value);
  if (!parsed) return false;

  const key = await prisma.integrationApiKey.findUnique({
    where: { id: parsed.id },
    select: { id: true, secretHash: true, revokedAt: true },
  });
  if (
    !key ||
    key.revokedAt ||
    !isIntegrationSecretValid(parsed.secret, key.secretHash)
  ) {
    return false;
  }

  const updated = await prisma.integrationApiKey.updateMany({
    where: { id: key.id, revokedAt: null, secretHash: key.secretHash },
    data: { lastUsedAt: new Date() },
  });
  return updated.count === 1;
}

export function requireIntegrationKeyHeader(value: string | undefined) {
  if (!value) {
    throw ApiError.unauthorized('A valid X-API-Key header is required.');
  }
  return value;
}
