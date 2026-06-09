CREATE TYPE "AuditEntityType" AS ENUM (
    'SCAFFOLD',
    'INSPECTION',
    'DOCUMENT',
    'USER',
    'SIGNATURE',
    'PDF',
    'QR_CODE',
    'SETTINGS'
);

CREATE TYPE "AuditAction" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'STATUS_CHANGE',
    'SIGN',
    'COMPLETE',
    'UPLOAD',
    'DOWNLOAD',
    'GENERATE_PDF',
    'VIEW_QR',
    'LOGIN',
    'LOGOUT',
    'ROLE_CHANGE'
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "action" "AuditAction" NOT NULL,
    "description" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "workspaceId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");
