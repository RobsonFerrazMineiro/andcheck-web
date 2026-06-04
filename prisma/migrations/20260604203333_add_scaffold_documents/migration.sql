-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ART', 'RRT', 'MEMORIAL_CALCULO', 'CROQUI', 'PROJETO', 'PROCEDIMENTO', 'CERTIFICADO', 'OUTRO');

-- CreateTable
CREATE TABLE "scaffold_documents" (
    "id" TEXT NOT NULL,
    "scaffold_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "observation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scaffold_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scaffold_documents" ADD CONSTRAINT "scaffold_documents_scaffold_id_fkey" FOREIGN KEY ("scaffold_id") REFERENCES "scaffolds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
