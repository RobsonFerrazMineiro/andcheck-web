ALTER TYPE "NonConformityStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "NonConformityStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

CREATE TABLE "non_conformity_item_evidences" (
    "id" TEXT NOT NULL,
    "nonConformityItemId" TEXT NOT NULL,
    "type" "NonConformityEvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedById" TEXT,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "non_conformity_item_evidences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "non_conformity_item_evidences_nonConformityItemId_idx" ON "non_conformity_item_evidences"("nonConformityItemId");
CREATE INDEX "non_conformity_item_evidences_type_idx" ON "non_conformity_item_evidences"("type");
CREATE INDEX "non_conformity_item_evidences_uploadedById_idx" ON "non_conformity_item_evidences"("uploadedById");

ALTER TABLE "non_conformity_item_evidences" ADD CONSTRAINT "non_conformity_item_evidences_nonConformityItemId_fkey" FOREIGN KEY ("nonConformityItemId") REFERENCES "non_conformity_checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "non_conformity_item_evidences" ADD CONSTRAINT "non_conformity_item_evidences_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
