CREATE TYPE "CompanyType" AS ENUM (
    'CONTRACTOR',
    'HSE_MANAGER',
    'SCAFFOLD_COMPANY',
    'CLIENT'
);

CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "cnpj" TEXT,
    "type" "CompanyType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ownerCompanyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");
CREATE UNIQUE INDEX "companies_cnpj_key" ON "companies"("cnpj");
CREATE INDEX "companies_type_active_idx" ON "companies"("type", "active");
CREATE UNIQUE INDEX "workspaces_name_key" ON "workspaces"("name");
CREATE UNIQUE INDEX "workspaces_code_key" ON "workspaces"("code");
CREATE INDEX "workspaces_ownerCompanyId_active_idx" ON "workspaces"("ownerCompanyId", "active");

INSERT INTO "companies" ("id", "name", "type") VALUES
    ('company-hydro-alunorte', 'Hydro Alunorte', 'CLIENT'),
    ('company-tuv-rheinland', 'TÜV Rheinland', 'HSE_MANAGER'),
    ('company-arcadis', 'Arcadis', 'HSE_MANAGER'),
    ('company-bloson', 'Bloson', 'HSE_MANAGER'),
    ('company-araujo', 'Araújo', 'HSE_MANAGER'),
    ('company-kw-brasil', 'KW Brasil', 'SCAFFOLD_COMPANY'),
    ('company-superus', 'Superus', 'SCAFFOLD_COMPANY'),
    ('company-montisol', 'Montisol', 'SCAFFOLD_COMPANY'),
    ('company-omega', 'Omega', 'SCAFFOLD_COMPANY'),
    ('company-montcalm', 'Montcalm', 'SCAFFOLD_COMPANY')
ON CONFLICT ("name") DO UPDATE SET
    "type" = EXCLUDED."type",
    "active" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "workspaces" (
    "id", "name", "code", "city", "state", "ownerCompanyId"
) VALUES (
    'workspace-hydro-murucupi',
    'Hydro Alunorte — Murucupi',
    'HYD-ALU-001',
    'Barcarena',
    'PA',
    (SELECT "id" FROM "companies" WHERE "name" = 'Hydro Alunorte')
)
ON CONFLICT ("name") DO UPDATE SET
    "code" = EXCLUDED."code",
    "city" = EXCLUDED."city",
    "state" = EXCLUDED."state",
    "ownerCompanyId" = EXCLUDED."ownerCompanyId",
    "active" = true,
    "updatedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_ownerCompanyId_fkey"
    FOREIGN KEY ("ownerCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scaffolds" ADD COLUMN "companyId" TEXT DEFAULT 'company-hydro-alunorte';
ALTER TABLE "scaffolds" ADD COLUMN "workspaceId" TEXT DEFAULT 'workspace-hydro-murucupi';
ALTER TABLE "users" ADD COLUMN "companyId" TEXT DEFAULT 'company-hydro-alunorte';
ALTER TABLE "users" ADD COLUMN "workspaceId" TEXT DEFAULT 'workspace-hydro-murucupi';
ALTER TABLE "inspections" ADD COLUMN "companyId" TEXT DEFAULT 'company-hydro-alunorte';
ALTER TABLE "inspections" ADD COLUMN "workspaceId" TEXT DEFAULT 'workspace-hydro-murucupi';
ALTER TABLE "scaffold_documents" ADD COLUMN "companyId" TEXT DEFAULT 'company-hydro-alunorte';
ALTER TABLE "scaffold_documents" ADD COLUMN "workspaceId" TEXT DEFAULT 'workspace-hydro-murucupi';
ALTER TABLE "non_conformities" ADD COLUMN "workspaceId" TEXT DEFAULT 'workspace-hydro-murucupi';
ALTER TABLE "non_conformity_evidences" ADD COLUMN "companyId" TEXT DEFAULT 'company-hydro-alunorte';
ALTER TABLE "non_conformity_evidences" ADD COLUMN "workspaceId" TEXT DEFAULT 'workspace-hydro-murucupi';
ALTER TABLE "non_conformity_item_evidences" ADD COLUMN "companyId" TEXT DEFAULT 'company-hydro-alunorte';
ALTER TABLE "non_conformity_item_evidences" ADD COLUMN "workspaceId" TEXT DEFAULT 'workspace-hydro-murucupi';
ALTER TABLE "inspection_signatures" ADD COLUMN "companyId" TEXT DEFAULT 'company-hydro-alunorte';
ALTER TABLE "inspection_signatures" ADD COLUMN "workspaceId" TEXT DEFAULT 'workspace-hydro-murucupi';

UPDATE "scaffolds" AS scaffold
SET "companyId" = COALESCE(
    (SELECT company."id" FROM "companies" AS company
     WHERE lower(company."name") = lower(scaffold."company")
        OR lower(COALESCE(company."tradeName", '')) = lower(scaffold."company")
     LIMIT 1),
    'company-hydro-alunorte'
);

UPDATE "users" AS app_user
SET "companyId" = COALESCE(
    (SELECT company."id" FROM "companies" AS company
     WHERE lower(company."name") = lower(app_user."company")
        OR lower(COALESCE(company."tradeName", '')) = lower(app_user."company")
     LIMIT 1),
    'company-hydro-alunorte'
);

UPDATE "inspections" AS inspection
SET "companyId" = scaffold."companyId",
    "workspaceId" = scaffold."workspaceId"
FROM "scaffolds" AS scaffold
WHERE scaffold."id" = inspection."scaffold_id";

UPDATE "scaffold_documents" AS document
SET "companyId" = scaffold."companyId",
    "workspaceId" = scaffold."workspaceId"
FROM "scaffolds" AS scaffold
WHERE scaffold."id" = document."scaffold_id";

UPDATE "non_conformities" AS nc
SET "companyId" = scaffold."companyId",
    "workspaceId" = scaffold."workspaceId"
FROM "scaffolds" AS scaffold
WHERE scaffold."id" = nc."scaffoldId";

UPDATE "non_conformity_evidences" AS evidence
SET "companyId" = nc."companyId",
    "workspaceId" = nc."workspaceId"
FROM "non_conformities" AS nc
WHERE nc."id" = evidence."nonConformityId";

UPDATE "non_conformity_item_evidences" AS evidence
SET "companyId" = nc."companyId",
    "workspaceId" = nc."workspaceId"
FROM "non_conformity_checklist_items" AS item
JOIN "non_conformities" AS nc ON nc."id" = item."nonConformityId"
WHERE item."id" = evidence."nonConformityItemId";

UPDATE "inspection_signatures" AS signature
SET "companyId" = inspection."companyId",
    "workspaceId" = inspection."workspaceId"
FROM "inspections" AS inspection
WHERE inspection."id" = signature."inspection_id";

UPDATE "audit_logs" AS audit
SET "companyId" = COALESCE(
        (SELECT company."id" FROM "companies" AS company
         WHERE lower(company."name") = lower(audit."companyId")
            OR lower(COALESCE(company."tradeName", '')) = lower(audit."companyId")
         LIMIT 1),
        'company-hydro-alunorte'
    ),
    "workspaceId" = 'workspace-hydro-murucupi';

ALTER TABLE "scaffolds" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "scaffolds" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "inspections" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "inspections" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "scaffold_documents" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "scaffold_documents" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "non_conformities" ALTER COLUMN "companyId" SET DEFAULT 'company-hydro-alunorte';
ALTER TABLE "non_conformities" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "non_conformities" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "non_conformity_evidences" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "non_conformity_evidences" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "non_conformity_item_evidences" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "non_conformity_item_evidences" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "inspection_signatures" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "inspection_signatures" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "companyId" SET DEFAULT 'company-hydro-alunorte';
ALTER TABLE "audit_logs" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "workspaceId" SET DEFAULT 'workspace-hydro-murucupi';
ALTER TABLE "audit_logs" ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX "scaffolds_companyId_idx" ON "scaffolds"("companyId");
CREATE INDEX "scaffolds_workspaceId_idx" ON "scaffolds"("workspaceId");
CREATE INDEX "scaffolds_workspaceId_companyId_idx" ON "scaffolds"("workspaceId", "companyId");
CREATE INDEX "users_companyId_idx" ON "users"("companyId");
CREATE INDEX "users_workspaceId_idx" ON "users"("workspaceId");
CREATE INDEX "inspections_companyId_idx" ON "inspections"("companyId");
CREATE INDEX "inspections_workspaceId_idx" ON "inspections"("workspaceId");
CREATE INDEX "inspections_workspaceId_companyId_idx" ON "inspections"("workspaceId", "companyId");
CREATE INDEX "scaffold_documents_companyId_idx" ON "scaffold_documents"("companyId");
CREATE INDEX "scaffold_documents_workspaceId_idx" ON "scaffold_documents"("workspaceId");
CREATE INDEX "non_conformities_workspaceId_idx" ON "non_conformities"("workspaceId");
CREATE INDEX "non_conformities_workspaceId_companyId_idx" ON "non_conformities"("workspaceId", "companyId");
CREATE INDEX "non_conformity_evidences_companyId_idx" ON "non_conformity_evidences"("companyId");
CREATE INDEX "non_conformity_evidences_workspaceId_idx" ON "non_conformity_evidences"("workspaceId");
CREATE INDEX "non_conformity_item_evidences_companyId_idx" ON "non_conformity_item_evidences"("companyId");
CREATE INDEX "non_conformity_item_evidences_workspaceId_idx" ON "non_conformity_item_evidences"("workspaceId");
CREATE INDEX "inspection_signatures_companyId_idx" ON "inspection_signatures"("companyId");
CREATE INDEX "inspection_signatures_workspaceId_idx" ON "inspection_signatures"("workspaceId");
CREATE INDEX "audit_logs_workspaceId_idx" ON "audit_logs"("workspaceId");

ALTER TABLE "scaffolds" ADD CONSTRAINT "scaffolds_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scaffolds" ADD CONSTRAINT "scaffolds_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scaffold_documents" ADD CONSTRAINT "scaffold_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scaffold_documents" ADD CONSTRAINT "scaffold_documents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_conformity_evidences" ADD CONSTRAINT "non_conformity_evidences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_conformity_evidences" ADD CONSTRAINT "non_conformity_evidences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_conformity_item_evidences" ADD CONSTRAINT "non_conformity_item_evidences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "non_conformity_item_evidences" ADD CONSTRAINT "non_conformity_item_evidences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_signatures" ADD CONSTRAINT "inspection_signatures_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inspection_signatures" ADD CONSTRAINT "inspection_signatures_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
