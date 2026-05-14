-- AlterTable: add zapiClientToken to Settings
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "zapiClientToken" TEXT;
