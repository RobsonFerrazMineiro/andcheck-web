ALTER TABLE "audit_logs"
  ADD COLUMN "sessionId" TEXT,
  ADD COLUMN "browserName" TEXT,
  ADD COLUMN "osName" TEXT,
  ADD COLUMN "deviceType" TEXT;

CREATE INDEX "audit_logs_sessionId_idx" ON "audit_logs"("sessionId");
CREATE INDEX "audit_logs_companyId_entityType_createdAt_idx" ON "audit_logs"("companyId", "entityType", "createdAt");
CREATE INDEX "audit_logs_workspaceId_entityType_createdAt_idx" ON "audit_logs"("workspaceId", "entityType", "createdAt");
CREATE INDEX "audit_logs_entityType_action_createdAt_idx" ON "audit_logs"("entityType", "action", "createdAt");
