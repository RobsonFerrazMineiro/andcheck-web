/*
  Warnings:

  - The values [pendente] on the enum `ScaffoldStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ScaffoldStatus_new" AS ENUM ('em_montagem', 'pendente_liberacao', 'liberado', 'reprovado', 'interditado', 'vencido', 'desmontado');
ALTER TABLE "public"."scaffolds" ALTER COLUMN "status" DROP DEFAULT;
-- Migrar dados: pendente → pendente_liberacao antes do CAST
UPDATE "scaffolds" SET "status" = 'pendente' WHERE "status" = 'pendente'; -- noop para garantir existência
ALTER TABLE "scaffolds" ALTER COLUMN "status" TYPE "ScaffoldStatus_new" USING (
  CASE "status"::text
    WHEN 'pendente' THEN 'pendente_liberacao'
    ELSE "status"::text
  END::"ScaffoldStatus_new"
);
ALTER TYPE "ScaffoldStatus" RENAME TO "ScaffoldStatus_old";
ALTER TYPE "ScaffoldStatus_new" RENAME TO "ScaffoldStatus";
DROP TYPE "public"."ScaffoldStatus_old";
ALTER TABLE "scaffolds" ALTER COLUMN "status" SET DEFAULT 'em_montagem';
COMMIT;

-- AlterTable
ALTER TABLE "scaffolds" ADD COLUMN     "assembly_completed_at" TIMESTAMP(3),
ADD COLUMN     "dismantled_at" TIMESTAMP(3),
ADD COLUMN     "released_at" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'em_montagem';
