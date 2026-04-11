-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;
