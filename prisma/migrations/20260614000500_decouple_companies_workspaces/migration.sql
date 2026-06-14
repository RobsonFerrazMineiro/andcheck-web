CREATE TYPE "CompanyWorkspaceRole" AS ENUM (
    'OWNER',
    'HSE_MANAGER',
    'SCAFFOLD_COMPANY'
);

CREATE TABLE "company_workspaces" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "CompanyWorkspaceRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_workspaces_companyId_workspaceId_key"
    ON "company_workspaces"("companyId", "workspaceId");
CREATE INDEX "company_workspaces_workspaceId_role_active_idx"
    ON "company_workspaces"("workspaceId", "role", "active");
CREATE INDEX "company_workspaces_companyId_active_idx"
    ON "company_workspaces"("companyId", "active");

ALTER TABLE "company_workspaces" ADD CONSTRAINT "company_workspaces_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_workspaces" ADD CONSTRAINT "company_workspaces_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "company_workspaces" (
    "id", "companyId", "workspaceId", "role", "active"
)
SELECT
    'cw-' || substring(md5(workspace."ownerCompanyId" || ':' || workspace."id") from 1 for 24),
    workspace."ownerCompanyId",
    workspace."id",
    'OWNER'::"CompanyWorkspaceRole",
    true
FROM "workspaces" AS workspace
ON CONFLICT ("companyId", "workspaceId") DO UPDATE SET
    "role" = 'OWNER',
    "active" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

WITH existing_relations AS (
    SELECT company."id" AS "companyId", company."workspaceId"
    FROM "companies" AS company
    UNION
    SELECT "companyId", "workspaceId" FROM "users"
    UNION
    SELECT "companyId", "workspaceId" FROM "scaffolds"
    UNION
    SELECT "companyId", "workspaceId" FROM "inspections"
    UNION
    SELECT "companyId", "workspaceId" FROM "non_conformities"
)
INSERT INTO "company_workspaces" (
    "id", "companyId", "workspaceId", "role", "active"
)
SELECT
    'cw-' || substring(md5(relation."companyId" || ':' || relation."workspaceId") from 1 for 24),
    relation."companyId",
    relation."workspaceId",
    CASE company."type"
        WHEN 'CLIENT' THEN 'OWNER'::"CompanyWorkspaceRole"
        WHEN 'HSE_MANAGER' THEN 'HSE_MANAGER'::"CompanyWorkspaceRole"
        ELSE 'SCAFFOLD_COMPANY'::"CompanyWorkspaceRole"
    END,
    true
FROM existing_relations AS relation
JOIN "companies" AS company ON company."id" = relation."companyId"
JOIN "workspaces" AS workspace ON workspace."id" = relation."workspaceId"
ON CONFLICT ("companyId", "workspaceId") DO NOTHING;

DROP INDEX "companies_workspaceId_active_idx";
ALTER TABLE "companies" DROP CONSTRAINT "companies_workspaceId_fkey";
ALTER TABLE "companies" DROP COLUMN "workspaceId";
