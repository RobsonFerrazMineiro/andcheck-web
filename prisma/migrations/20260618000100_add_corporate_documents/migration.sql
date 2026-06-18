-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('ART', 'RRT', 'PROJETO_ESTRUTURAL', 'MEMORIAL_CALCULO', 'CROQUI', 'PROCEDIMENTO', 'NORMA', 'CERTIFICADO', 'LICENCA', 'TREINAMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_DOWNLOADED';

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "companyId" TEXT,
    "workspaceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_companyId_idx" ON "documents"("companyId");

-- CreateIndex
CREATE INDEX "documents_workspaceId_idx" ON "documents"("workspaceId");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_expiryDate_idx" ON "documents"("expiryDate");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
