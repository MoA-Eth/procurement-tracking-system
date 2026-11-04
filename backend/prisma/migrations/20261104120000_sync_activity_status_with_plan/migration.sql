UPDATE "Activity" AS activity
SET "status" = CASE
  WHEN plan."status" = 'DRAFT' THEN 'DRAFT'::"ActivityStatus"
  WHEN plan."status" IN ('APPROVED', 'MANAGEMENT_APPROVED')
    THEN 'APPROVED'::"ActivityStatus"
  WHEN plan."status" = 'CANCELLED' THEN 'CANCELLED'::"ActivityStatus"
  ELSE 'PLANNED'::"ActivityStatus"
END
FROM "Plan" AS plan
WHERE activity."planId" = plan."id";
