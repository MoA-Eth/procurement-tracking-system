-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlanStatus" ADD VALUE 'COMMITTEE_ENDORSED';
ALTER TYPE "PlanStatus" ADD VALUE 'COMMITTEE_REJECTED';
ALTER TYPE "PlanStatus" ADD VALUE 'RETURNED_FOR_REVISION';

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'INVITED';

-- DropEnum
DROP TYPE "Role";
