-- CreateEnum
CREATE TYPE "ScaffoldStatus" AS ENUM ('liberado', 'pendente', 'em_montagem', 'reprovado', 'vencido');

-- CreateEnum
CREATE TYPE "ScaffoldType" AS ENUM ('tubular', 'fachadeiro', 'multidirecional', 'suspenso', 'torre');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('aprovado', 'aprovado_com_ressalvas', 'reprovado');

-- CreateEnum
CREATE TYPE "ChecklistValue" AS ENUM ('CL_OK', 'CL_FAIL', 'CL_WARN', 'CL_NA');

-- CreateTable
CREATE TABLE "scaffolds" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "type" "ScaffoldType" NOT NULL,
    "status" "ScaffoldStatus" NOT NULL DEFAULT 'pendente',
    "location" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "max_load" DOUBLE PRECISION,
    "responsible" TEXT NOT NULL,
    "notes" TEXT,
    "validity_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scaffolds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "scaffold_id" TEXT NOT NULL,
    "scaffold_code" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspector_name" TEXT NOT NULL,
    "result" "InspectionResult" NOT NULL,
    "validity_days" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_entries" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "item_label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" "ChecklistValue" NOT NULL,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "observation" TEXT,

    CONSTRAINT "checklist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scaffolds_code_key" ON "scaffolds"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scaffolds_tag_key" ON "scaffolds"("tag");

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_scaffold_id_fkey" FOREIGN KEY ("scaffold_id") REFERENCES "scaffolds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_entries" ADD CONSTRAINT "checklist_entries_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
