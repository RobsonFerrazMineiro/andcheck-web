ALTER TYPE "AuditEntityType" ADD VALUE 'NON_CONFORMITY';

CREATE TYPE "NonConformityClassification" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TYPE "NonConformityStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'PENDING_VERIFICATION',
    'CLOSED',
    'CANCELLED'
);

CREATE TYPE "NonConformityEvidenceType" AS ENUM (
    'PHOTO',
    'PDF',
    'ART',
    'MEMORIAL_CALCULO',
    'CROQUI',
    'DOCUMENT',
    'OTHER'
);

CREATE TABLE "non_conformities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "classification" "NonConformityClassification" NOT NULL,
    "status" "NonConformityStatus" NOT NULL DEFAULT 'OPEN',
    "originInspectionId" TEXT NOT NULL,
    "scaffoldId" TEXT NOT NULL,
    "companyId" TEXT,
    "responsibleUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "non_conformities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "non_conformity_checklist_items" (
    "id" TEXT NOT NULL,
    "nonConformityId" TEXT NOT NULL,
    "checklistEntryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "non_conformity_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "non_conformity_evidences" (
    "id" TEXT NOT NULL,
    "nonConformityId" TEXT NOT NULL,
    "type" "NonConformityEvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedById" TEXT,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "non_conformity_evidences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "non_conformity_history" (
    "id" TEXT NOT NULL,
    "nonConformityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "non_conformity_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "non_conformities_code_key" ON "non_conformities"("code");
CREATE INDEX "non_conformities_originInspectionId_idx" ON "non_conformities"("originInspectionId");
CREATE INDEX "non_conformities_scaffoldId_idx" ON "non_conformities"("scaffoldId");
CREATE INDEX "non_conformities_companyId_idx" ON "non_conformities"("companyId");
CREATE INDEX "non_conformities_responsibleUserId_idx" ON "non_conformities"("responsibleUserId");
CREATE INDEX "non_conformities_classification_idx" ON "non_conformities"("classification");
CREATE INDEX "non_conformities_status_idx" ON "non_conformities"("status");
CREATE INDEX "non_conformities_dueDate_idx" ON "non_conformities"("dueDate");

CREATE UNIQUE INDEX "non_conformity_checklist_items_nonConformityId_checklistEntryId_key" ON "non_conformity_checklist_items"("nonConformityId", "checklistEntryId");
CREATE INDEX "non_conformity_checklist_items_checklistEntryId_idx" ON "non_conformity_checklist_items"("checklistEntryId");

CREATE INDEX "non_conformity_evidences_nonConformityId_idx" ON "non_conformity_evidences"("nonConformityId");
CREATE INDEX "non_conformity_evidences_type_idx" ON "non_conformity_evidences"("type");
CREATE INDEX "non_conformity_evidences_uploadedById_idx" ON "non_conformity_evidences"("uploadedById");

CREATE INDEX "non_conformity_history_nonConformityId_idx" ON "non_conformity_history"("nonConformityId");
CREATE INDEX "non_conformity_history_userId_idx" ON "non_conformity_history"("userId");
CREATE INDEX "non_conformity_history_createdAt_idx" ON "non_conformity_history"("createdAt");

ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_originInspectionId_fkey" FOREIGN KEY ("originInspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_scaffoldId_fkey" FOREIGN KEY ("scaffoldId") REFERENCES "scaffolds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "non_conformity_checklist_items" ADD CONSTRAINT "non_conformity_checklist_items_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "non_conformities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "non_conformity_checklist_items" ADD CONSTRAINT "non_conformity_checklist_items_checklistEntryId_fkey" FOREIGN KEY ("checklistEntryId") REFERENCES "checklist_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "non_conformity_evidences" ADD CONSTRAINT "non_conformity_evidences_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "non_conformities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "non_conformity_evidences" ADD CONSTRAINT "non_conformity_evidences_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "non_conformity_history" ADD CONSTRAINT "non_conformity_history_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "non_conformities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "non_conformity_history" ADD CONSTRAINT "non_conformity_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
