-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'SCAFFOLD_CREATED',
  'SCAFFOLD_RELEASED',
  'SCAFFOLD_REJECTED',
  'SCAFFOLD_INTERDICTED',
  'SCAFFOLD_DISASSEMBLED',
  'SCAFFOLD_EXPIRED',
  'SCAFFOLD_EXPIRING_SOON',
  'INSPECTION_PENDING',
  'INSPECTION_COMPLETED',
  'INSPECTION_APPROVED',
  'INSPECTION_REJECTED',
  'INSPECTION_WITH_REMARKS',
  'NONCONFORMITY_OPENED',
  'NONCONFORMITY_IN_PROGRESS',
  'NONCONFORMITY_CORRECTED',
  'NONCONFORMITY_CLOSED',
  'NONCONFORMITY_EXPIRED',
  'NONCONFORMITY_EXPIRING_SOON',
  'DOCUMENT_ATTACHED',
  'DOCUMENT_EXPIRED',
  'DOCUMENT_EXPIRING_SOON'
);

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('INTERNAL', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ', 'ARCHIVED');

-- CreateTable
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "userId" TEXT,
  "type" "NotificationType" NOT NULL,
  "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "channels" "NotificationChannel"[],
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "readAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "error" TEXT,
  "metadata" JSONB,
  "dedupeKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "internal" BOOLEAN NOT NULL DEFAULT true,
  "email" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_delivery_logs" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "providerMessageId" TEXT,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupeKey_key" ON "notifications"("dedupeKey");
CREATE INDEX "notifications_companyId_idx" ON "notifications"("companyId");
CREATE INDEX "notifications_workspaceId_idx" ON "notifications"("workspaceId");
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_status_idx" ON "notifications"("status");
CREATE INDEX "notifications_severity_idx" ON "notifications"("severity");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");
CREATE INDEX "notifications_companyId_userId_status_idx" ON "notifications"("companyId", "userId", "status");
CREATE UNIQUE INDEX "notification_preferences_userId_companyId_type_key" ON "notification_preferences"("userId", "companyId", "type");
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");
CREATE INDEX "notification_preferences_companyId_idx" ON "notification_preferences"("companyId");
CREATE INDEX "email_delivery_logs_notificationId_idx" ON "email_delivery_logs"("notificationId");
CREATE INDEX "email_delivery_logs_recipientEmail_idx" ON "email_delivery_logs"("recipientEmail");
CREATE INDEX "email_delivery_logs_status_idx" ON "email_delivery_logs"("status");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
