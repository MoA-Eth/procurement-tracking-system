CREATE TYPE "AmendmentRequestStatus" AS ENUM (
    'PENDING_DIRECTOR',
    'PENDING_COMMITTEE',
    'PENDING_MANAGEMENT',
    'RETURNED',
    'REJECTED',
    'APPROVED',
    'COMPLETED'
);

CREATE TYPE "AmendmentEntityType" AS ENUM ('PLAN', 'ACTIVITY');

CREATE TABLE "AmendmentRequest" (
    "id" TEXT NOT NULL,
    "entityType" "AmendmentEntityType" NOT NULL,
    "status" "AmendmentRequestStatus" NOT NULL DEFAULT 'PENDING_DIRECTOR',
    "planId" TEXT,
    "activityId" TEXT,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "directorId" TEXT,
    "directorComment" TEXT,
    "directorAt" TIMESTAMP(3),
    "committeeId" TEXT,
    "committeeComment" TEXT,
    "committeeAt" TIMESTAMP(3),
    "managementId" TEXT,
    "managementComment" TEXT,
    "managementAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmendmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AmendmentRequest_status_createdAt_idx" ON "AmendmentRequest"("status", "createdAt");
CREATE INDEX "AmendmentRequest_planId_idx" ON "AmendmentRequest"("planId");
CREATE INDEX "AmendmentRequest_activityId_idx" ON "AmendmentRequest"("activityId");
CREATE INDEX "AmendmentRequest_requestedById_idx" ON "AmendmentRequest"("requestedById");

ALTER TABLE "AmendmentRequest" ADD CONSTRAINT "AmendmentRequest_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AmendmentRequest" ADD CONSTRAINT "AmendmentRequest_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AmendmentRequest" ADD CONSTRAINT "AmendmentRequest_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AmendmentRequest"
    ADD CONSTRAINT "AmendmentRequest_exactly_one_target_check"
    CHECK (
      ("entityType" = 'PLAN' AND "planId" IS NOT NULL AND "activityId" IS NULL) OR
      ("entityType" = 'ACTIVITY' AND "activityId" IS NOT NULL AND "planId" IS NULL)
    );

INSERT INTO "AmendmentRequest" (
    "id",
    "entityType",
    "status",
    "planId",
    "requestedById",
    "reason",
    "createdAt",
    "updatedAt"
)
SELECT
    md5('legacy-plan-amendment:' || plan."id"),
    'PLAN',
    'PENDING_DIRECTOR',
    plan."id",
    plan."createdBy",
    'Legacy amendment request migrated from the previous plan status workflow.',
    plan."updatedAt",
    CURRENT_TIMESTAMP
FROM "Plan" AS plan
WHERE plan."status" = 'UPDATE_REQUESTED'
  AND plan."isActive" = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM "AmendmentRequest" AS request
      WHERE request."planId" = plan."id"
        AND request."status" IN (
            'PENDING_DIRECTOR',
            'PENDING_COMMITTEE',
            'PENDING_MANAGEMENT'
        )
  );
