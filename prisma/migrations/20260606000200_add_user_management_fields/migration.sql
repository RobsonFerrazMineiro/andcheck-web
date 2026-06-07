-- AlterTable
ALTER TABLE "users" ADD COLUMN "company" TEXT,
ADD COLUMN "registration" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "position" TEXT,
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
