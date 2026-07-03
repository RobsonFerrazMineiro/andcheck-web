-- Performance indexes for high-volume enterprise dashboards and listings.

CREATE INDEX IF NOT EXISTS "scaffolds_companyId_status_code_idx"
  ON "scaffolds"("companyId", "status", "code");

CREATE INDEX IF NOT EXISTS "scaffolds_workspaceId_status_code_idx"
  ON "scaffolds"("workspaceId", "status", "code");

CREATE INDEX IF NOT EXISTS "scaffolds_companyId_created_at_idx"
  ON "scaffolds"("companyId", "created_at");

CREATE INDEX IF NOT EXISTS "scaffolds_workspaceId_created_at_idx"
  ON "scaffolds"("workspaceId", "created_at");

CREATE INDEX IF NOT EXISTS "scaffold_documents_companyId_expires_at_idx"
  ON "scaffold_documents"("companyId", "expires_at");

CREATE INDEX IF NOT EXISTS "scaffold_documents_workspaceId_expires_at_idx"
  ON "scaffold_documents"("workspaceId", "expires_at");

CREATE INDEX IF NOT EXISTS "documents_companyId_status_expiryDate_idx"
  ON "documents"("companyId", "status", "expiryDate");

CREATE INDEX IF NOT EXISTS "documents_workspaceId_status_expiryDate_idx"
  ON "documents"("workspaceId", "status", "expiryDate");

CREATE INDEX IF NOT EXISTS "inspections_companyId_date_idx"
  ON "inspections"("companyId", "date");

CREATE INDEX IF NOT EXISTS "inspections_workspaceId_date_idx"
  ON "inspections"("workspaceId", "date");

CREATE INDEX IF NOT EXISTS "inspections_scaffold_id_date_idx"
  ON "inspections"("scaffold_id", "date");

CREATE INDEX IF NOT EXISTS "non_conformities_companyId_createdAt_idx"
  ON "non_conformities"("companyId", "createdAt");

CREATE INDEX IF NOT EXISTS "non_conformities_workspaceId_createdAt_idx"
  ON "non_conformities"("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "non_conformities_companyId_status_closedAt_idx"
  ON "non_conformities"("companyId", "status", "closedAt");

CREATE INDEX IF NOT EXISTS "non_conformities_workspaceId_status_closedAt_idx"
  ON "non_conformities"("workspaceId", "status", "closedAt");

CREATE INDEX IF NOT EXISTS "notifications_userId_status_createdAt_idx"
  ON "notifications"("userId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "notifications_companyId_severity_createdAt_idx"
  ON "notifications"("companyId", "severity", "createdAt");

CREATE INDEX IF NOT EXISTS "audit_logs_companyId_createdAt_idx"
  ON "audit_logs"("companyId", "createdAt");

CREATE INDEX IF NOT EXISTS "audit_logs_workspaceId_createdAt_idx"
  ON "audit_logs"("workspaceId", "createdAt");
