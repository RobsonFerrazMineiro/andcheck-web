-- CreateTable
CREATE TABLE "operational_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_areas_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "scaffolds" ADD COLUMN "areaId" TEXT;
ALTER TABLE "scaffolds" ADD COLUMN "mountingCompanyId" TEXT;
ALTER TABLE "scaffolds" ADD COLUMN "responsibleUserId" TEXT;

-- Backfill operational areas from existing scaffold text areas.
INSERT INTO "operational_areas" (
    "id",
    "name",
    "normalizedName",
    "workspaceId",
    "createdAt",
    "updatedAt"
)
SELECT
    'oparea_' || md5("workspaceId" || ':' || "normalizedName"),
    "name",
    "normalizedName",
    "workspaceId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        "workspaceId",
        lower(btrim("area")) AS "normalizedName",
        min(btrim("area")) AS "name"
    FROM "scaffolds"
    WHERE btrim("area") <> ''
    GROUP BY "workspaceId", lower(btrim("area"))
) AS scaffold_areas;

UPDATE "scaffolds" AS scaffold
SET "areaId" = area."id"
FROM "operational_areas" AS area
WHERE scaffold."areaId" IS NULL
  AND area."workspaceId" = scaffold."workspaceId"
  AND area."normalizedName" = lower(btrim(scaffold."area"));

-- CreateIndex
CREATE UNIQUE INDEX "operational_areas_workspaceId_normalizedName_key" ON "operational_areas"("workspaceId", "normalizedName");
CREATE INDEX "operational_areas_workspaceId_idx" ON "operational_areas"("workspaceId");
CREATE INDEX "operational_areas_workspaceId_isActive_idx" ON "operational_areas"("workspaceId", "isActive");
CREATE INDEX "scaffolds_areaId_idx" ON "scaffolds"("areaId");
CREATE INDEX "scaffolds_mountingCompanyId_idx" ON "scaffolds"("mountingCompanyId");
CREATE INDEX "scaffolds_responsibleUserId_idx" ON "scaffolds"("responsibleUserId");

-- AddForeignKey
ALTER TABLE "operational_areas" ADD CONSTRAINT "operational_areas_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scaffolds" ADD CONSTRAINT "scaffolds_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "operational_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "scaffolds" ADD CONSTRAINT "scaffolds_mountingCompanyId_fkey" FOREIGN KEY ("mountingCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "scaffolds" ADD CONSTRAINT "scaffolds_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
