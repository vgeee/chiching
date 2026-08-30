-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "isAutoImported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "merchant" TEXT,
ADD COLUMN     "sourceRef" TEXT;

-- CreateTable
CREATE TABLE "sync_state" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastEmailSync" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_sourceRef_key" ON "transactions"("sourceRef");

