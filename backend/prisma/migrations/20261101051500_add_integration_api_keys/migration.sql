CREATE TABLE "IntegrationApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationApiKey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationApiKey_revokedAt_createdAt_idx"
    ON "IntegrationApiKey"("revokedAt", "createdAt");

ALTER TABLE "IntegrationApiKey"
    ADD CONSTRAINT "IntegrationApiKey_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
