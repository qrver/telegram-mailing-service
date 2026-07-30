CREATE TYPE "MailingStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'PHOTO');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'BLOCKED', 'FAILED');

CREATE TABLE "Mailing" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "photoUrl" TEXT,
    "buttons" JSONB NOT NULL DEFAULT '[]',
    "sendAt" TIMESTAMP(3),
    "status" "MailingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    CONSTRAINT "Mailing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Recipient" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Delivery" (
    "id" SERIAL NOT NULL,
    "mailingId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Mailing_id_key" ON "Mailing"("id");
CREATE INDEX "Mailing_status_sendAt_idx" ON "Mailing"("status", "sendAt");
CREATE INDEX "Mailing_createdAt_idx" ON "Mailing"("createdAt");
CREATE UNIQUE INDEX "Recipient_telegramId_key" ON "Recipient"("telegramId");
CREATE UNIQUE INDEX "Delivery_mailingId_recipientId_key" ON "Delivery"("mailingId", "recipientId");
CREATE INDEX "Delivery_mailingId_status_idx" ON "Delivery"("mailingId", "status");

ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_mailingId_fkey" FOREIGN KEY ("mailingId") REFERENCES "Mailing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
