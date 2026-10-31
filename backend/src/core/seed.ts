import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { seedSystemData } from './bootstrap.js';

try {
  await seedSystemData();
  logger.info('Database seed completed.');
} catch (err) {
  logger.error({ err }, 'Database seed failed.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
