-- Refine corporate document categories to the product taxonomy.
-- Old values are normalized before the enum is recreated without deprecated values.

ALTER TABLE "documents"
  ALTER COLUMN "category" TYPE TEXT
  USING "category"::TEXT;

UPDATE "documents"
SET "category" = CASE "category"
  WHEN 'PROCEDIMENTO' THEN 'PLANO_MONTAGEM'
  WHEN 'CERTIFICADO' THEN 'CERTIFICADO_TECNICO'
  WHEN 'NORMA' THEN 'OUTRO'
  WHEN 'LICENCA' THEN 'OUTRO'
  WHEN 'TREINAMENTO' THEN 'OUTRO'
  ELSE "category"
END;

DROP TYPE "DocumentCategory";

CREATE TYPE "DocumentCategory" AS ENUM (
  'ART',
  'RRT',
  'PROJETO_ESTRUTURAL',
  'MEMORIAL_CALCULO',
  'CROQUI',
  'PLANO_MONTAGEM',
  'CERTIFICADO_TECNICO',
  'OUTRO'
);

ALTER TABLE "documents"
  ALTER COLUMN "category" TYPE "DocumentCategory"
  USING "category"::"DocumentCategory";
