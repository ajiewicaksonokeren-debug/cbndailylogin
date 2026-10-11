-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('multiplier', 'time_window', 'challenge');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'marketing', 'cs');

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(28) NOT NULL,
    "type" "EventType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "start" TIMESTAMP(3),
    "end" TIMESTAMP(3),
    "windowFrom" TEXT,
    "windowTo" TEXT,
    "targetDays" INTEGER,
    "segments" TEXT[],
    "pushStart" BOOLEAN NOT NULL DEFAULT true,
    "push3h" BOOLEAN NOT NULL DEFAULT true,
    "draft" BOOLEAN NOT NULL DEFAULT true,
    "bannerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "customerId" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastDay" TEXT,
    "lastCheckInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streak" INTEGER NOT NULL,
    "mult" DOUBLE PRECISION NOT NULL,
    "base" INTEGER NOT NULL,
    "levelBonus" INTEGER NOT NULL,
    "cycleBonus" INTEGER NOT NULL,
    "milestone" INTEGER NOT NULL,
    "eventBonus" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "device" TEXT NOT NULL,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInEvent" (
    "checkInId" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "bonus" INTEGER NOT NULL,

    CONSTRAINT "CheckInEvent_pkey" PRIMARY KEY ("checkInId","eventId")
);

-- CreateTable
CREATE TABLE "PointTx" (
    "id" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "checkInId" INTEGER,

    CONSTRAINT "PointTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyOpen" (
    "customerId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DailyOpen_pkey" PRIMARY KEY ("customerId","day")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckIn_day_idx" ON "CheckIn"("day");

-- CreateIndex
CREATE INDEX "CheckIn_at_idx" ON "CheckIn"("at");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_customerId_day_key" ON "CheckIn"("customerId", "day");

-- CreateIndex
CREATE INDEX "CheckInEvent_eventId_idx" ON "CheckInEvent"("eventId");

-- CreateIndex
CREATE INDEX "PointTx_customerId_at_idx" ON "PointTx"("customerId", "at");

-- CreateIndex
CREATE INDEX "PointTx_at_idx" ON "PointTx"("at");

-- CreateIndex
CREATE INDEX "DailyOpen_day_idx" ON "DailyOpen"("day");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Member"("customerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInEvent" ADD CONSTRAINT "CheckInEvent_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInEvent" ADD CONSTRAINT "CheckInEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTx" ADD CONSTRAINT "PointTx_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
