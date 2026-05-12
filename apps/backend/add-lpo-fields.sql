-- Safe migration to add new LPO fields without data loss
-- This adds all new columns with safe defaults

BEGIN;

-- Create LpoStatus enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LpoStatus') THEN
        CREATE TYPE "LpoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PURCHASE', 'CANCELLED');
    END IF;
END $$;

-- Add approval tracking fields
ALTER TABLE "local_purchase_orders" 
ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "approvedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "approvalNotes" TEXT;

-- Add purchase conversion tracking fields
ALTER TABLE "local_purchase_orders"
ADD COLUMN IF NOT EXISTS "isPurchaseConverted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "purchaseConvertedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "purchaseConvertedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "purchaseReference" TEXT;

-- Add rejection tracking fields
ALTER TABLE "local_purchase_orders"
ADD COLUMN IF NOT EXISTS "isRejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "rejectedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- Update existing approved LPOs (if status = 'approved')
UPDATE "local_purchase_orders"
SET "isApproved" = true
WHERE status = 'approved';

-- Update existing rejected LPOs (if status = 'rejected')
UPDATE "local_purchase_orders"
SET "isRejected" = true
WHERE status = 'rejected';

-- Now safely change the status column type to use the enum
-- First, create a temporary column
ALTER TABLE "local_purchase_orders"
ADD COLUMN IF NOT EXISTS "status_new" "LpoStatus";

-- Map old string values to new enum values
UPDATE "local_purchase_orders"
SET "status_new" = CASE 
    WHEN LOWER(status) = 'pending' THEN 'PENDING'::"LpoStatus"
    WHEN LOWER(status) = 'approved' THEN 'APPROVED'::"LpoStatus"
    WHEN LOWER(status) = 'rejected' THEN 'REJECTED'::"LpoStatus"
    ELSE 'PENDING'::"LpoStatus"
END;

-- Set default for new column
UPDATE "local_purchase_orders"
SET "status_new" = 'PENDING'::"LpoStatus"
WHERE "status_new" IS NULL;

-- Drop old column and rename new one
ALTER TABLE "local_purchase_orders"
DROP COLUMN IF EXISTS status,
ALTER COLUMN "status_new" SET NOT NULL,
ALTER COLUMN "status_new" SET DEFAULT 'PENDING'::"LpoStatus";

ALTER TABLE "local_purchase_orders"
RENAME COLUMN "status_new" TO status;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "local_purchase_orders_status_idx" ON "local_purchase_orders"(status);
CREATE INDEX IF NOT EXISTS "local_purchase_orders_isApproved_idx" ON "local_purchase_orders"("isApproved");
CREATE INDEX IF NOT EXISTS "local_purchase_orders_isPurchaseConverted_idx" ON "local_purchase_orders"("isPurchaseConverted");

COMMIT;
