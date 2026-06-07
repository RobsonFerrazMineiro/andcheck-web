-- CreateTable
CREATE TABLE "inspection_signature_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "company" TEXT,
    "area" TEXT,
    "scaffold_type" "ScaffoldType",
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_signature_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_signature_requirements" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "role_code" TEXT NOT NULL,
    "label" TEXT,
    "min_count" INTEGER NOT NULL DEFAULT 1,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_signature_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_signatures" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "user_id" TEXT,
    "role_code" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_company" TEXT,
    "signer_position" TEXT,
    "signature_image_url" TEXT,
    "signature_data" TEXT,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspection_signature_policies_is_active_is_default_idx" ON "inspection_signature_policies"("is_active", "is_default");

-- CreateIndex
CREATE INDEX "inspection_signature_policies_company_idx" ON "inspection_signature_policies"("company");

-- CreateIndex
CREATE INDEX "inspection_signature_policies_area_idx" ON "inspection_signature_policies"("area");

-- CreateIndex
CREATE INDEX "inspection_signature_policies_scaffold_type_idx" ON "inspection_signature_policies"("scaffold_type");

-- CreateIndex
CREATE INDEX "inspection_signature_requirements_role_code_idx" ON "inspection_signature_requirements"("role_code");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_signature_requirements_policy_id_role_code_key" ON "inspection_signature_requirements"("policy_id", "role_code");

-- CreateIndex
CREATE INDEX "inspection_signatures_inspection_id_idx" ON "inspection_signatures"("inspection_id");

-- CreateIndex
CREATE INDEX "inspection_signatures_user_id_idx" ON "inspection_signatures"("user_id");

-- CreateIndex
CREATE INDEX "inspection_signatures_role_code_idx" ON "inspection_signatures"("role_code");

-- AddForeignKey
ALTER TABLE "inspection_signature_requirements" ADD CONSTRAINT "inspection_signature_requirements_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "inspection_signature_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_signature_requirements" ADD CONSTRAINT "inspection_signature_requirements_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "roles"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_signatures" ADD CONSTRAINT "inspection_signatures_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_signatures" ADD CONSTRAINT "inspection_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_signatures" ADD CONSTRAINT "inspection_signatures_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "roles"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
