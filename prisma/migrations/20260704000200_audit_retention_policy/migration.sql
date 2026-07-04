CREATE TYPE "AuditRetentionPeriod" AS ENUM (
  'ONE_YEAR',
  'THREE_YEARS',
  'FIVE_YEARS',
  'PERMANENT'
);

CREATE TABLE "audit_retention_policies" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "period" "AuditRetentionPeriod" NOT NULL DEFAULT 'PERMANENT',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "audit_retention_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audit_retention_policies_workspaceId_key"
  ON "audit_retention_policies"("workspaceId");

CREATE INDEX "audit_retention_policies_period_idx"
  ON "audit_retention_policies"("period");

ALTER TABLE "audit_retention_policies"
  ADD CONSTRAINT "audit_retention_policies_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
