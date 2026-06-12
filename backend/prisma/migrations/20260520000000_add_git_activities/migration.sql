-- CreateEnum
CREATE TYPE "GitActivityType" AS ENUM ('COMMIT', 'PUSH');

-- CreateTable
CREATE TABLE "GitActivity" (
    "id" SERIAL NOT NULL,
    "type" "GitActivityType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "groupId" INTEGER NOT NULL,
    "userId" INTEGER,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "authorUsername" TEXT,
    "message" TEXT,
    "loc" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitActivity_externalId_key" ON "GitActivity"("externalId");

-- CreateIndex
CREATE INDEX "GitActivity_groupId_type_idx" ON "GitActivity"("groupId", "type");

-- CreateIndex
CREATE INDEX "GitActivity_userId_type_idx" ON "GitActivity"("userId", "type");

-- CreateIndex
CREATE INDEX "GitActivity_occurredAt_idx" ON "GitActivity"("occurredAt");

-- AddForeignKey
ALTER TABLE "GitActivity" ADD CONSTRAINT "GitActivity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitActivity" ADD CONSTRAINT "GitActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
