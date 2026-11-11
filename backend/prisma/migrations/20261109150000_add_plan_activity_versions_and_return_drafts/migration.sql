ALTER TABLE "Plan"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Activity"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "Plan"
SET "version" = 2
WHERE "status" = 'RETURNED_FOR_REVISION'
  AND "version" = 1;

UPDATE "Activity" AS activity
SET "status" = 'DRAFT'::"ActivityStatus",
    "version" = 2
FROM "Plan" AS plan
WHERE activity."planId" = plan."id"
  AND plan."status" = 'RETURNED_FOR_REVISION'
  AND activity."version" = 1;
