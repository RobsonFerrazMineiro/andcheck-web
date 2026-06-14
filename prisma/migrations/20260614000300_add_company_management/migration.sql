ALTER TYPE "AuditEntityType" ADD VALUE 'COMPANY';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_DEACTIVATED';

ALTER TABLE "companies"
ADD COLUMN "code" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "workspaceId" TEXT;

UPDATE "companies"
SET "code" = upper(regexp_replace(substring("name" from 1 for 12), '[^A-Za-z0-9]', '', 'g')) || '-' || substring(md5("id") from 1 for 6),
    "workspaceId" = 'workspace-hydro-murucupi';

ALTER TABLE "companies" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "companies" ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");
CREATE INDEX "companies_workspaceId_active_idx" ON "companies"("workspaceId", "active");

ALTER TABLE "companies" ADD CONSTRAINT "companies_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
