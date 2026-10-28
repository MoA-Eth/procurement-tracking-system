-- Amendments can now be edited after they are recorded and store the details
-- the officer enters (variation, effective date, approval reference, notes).
ALTER TABLE "ContractAmendment"
  ADD COLUMN "variationAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN "effectiveDate" TIMESTAMP(3),
  ADD COLUMN "approvalRef" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill existing rows: the variation is the value change, and the
-- effective date was previously stored in createdAt.
UPDATE "ContractAmendment"
SET "variationAmount" = "newValue" - "previousValue",
    "effectiveDate" = "createdAt";
