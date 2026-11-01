CREATE TABLE "AmendmentCommitteeVote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "decision" "VoteDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmendmentCommitteeVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AmendmentCommitteeVote_requestId_memberId_key"
    ON "AmendmentCommitteeVote"("requestId", "memberId");
CREATE INDEX "AmendmentCommitteeVote_memberId_idx"
    ON "AmendmentCommitteeVote"("memberId");

ALTER TABLE "AmendmentCommitteeVote"
    ADD CONSTRAINT "AmendmentCommitteeVote_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "AmendmentRequest"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
