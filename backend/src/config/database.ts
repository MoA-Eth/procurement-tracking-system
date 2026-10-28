import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';
import { env } from './env.js';

import pg from 'pg';

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

// passwordHash is omitted from every query result so a relation include such as
// `creator: true` can never leak it into an API response. Code that genuinely
// needs the hash (login, change-password) opts back in with
// `omit: { passwordHash: false }`.
const createClient = () =>
  new PrismaClient({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapter: adapter as any,
    omit: { user: { passwordHash: true } },
  });

export const prisma = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
