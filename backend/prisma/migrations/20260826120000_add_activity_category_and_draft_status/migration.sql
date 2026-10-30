ALTER TYPE "ActivityStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

ALTER TABLE "Activity"
ADD COLUMN "procurementCategory" TEXT;
