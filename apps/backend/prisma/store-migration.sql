-- Store Module Schema Migration
-- Adds new columns and tables for multi-item purchases, requisitions, approvals, and reports

-- 1. StoreProduct: Add new columns
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "reorderLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "maxStock" INTEGER;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "store_products" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 2. StorePurchase: Add new columns (fields use camelCase - no @map in schema)
ALTER TABLE "store_purchases" ADD COLUMN IF NOT EXISTS "purchaseNumber" TEXT;
ALTER TABLE "store_purchases" ADD COLUMN IF NOT EXISTS "deliveryDate" TIMESTAMP(3);
ALTER TABLE "store_purchases" ADD COLUMN IF NOT EXISTS "createdBy" INTEGER;
ALTER TABLE "store_purchases" ADD COLUMN IF NOT EXISTS "rejectedBy" INTEGER;
ALTER TABLE "store_purchases" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "store_purchases" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "store_purchases" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);

-- Generate purchase numbers for existing rows
UPDATE "store_purchases" SET "purchaseNumber" = 'PO-' || LPAD(CAST(id AS TEXT), 5, '0') WHERE "purchaseNumber" IS NULL;

-- Make purchaseNumber NOT NULL after populating
ALTER TABLE "store_purchases" ALTER COLUMN "purchaseNumber" SET NOT NULL;

-- Add unique constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_purchases_organizationId_purchaseNumber_key') THEN
    ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_organizationId_purchaseNumber_key" UNIQUE ("organizationId", "purchaseNumber");
  END IF;
END $$;

-- Add FK for creator
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_purchases_createdBy_fkey') THEN
    ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add FK for rejector
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_purchases_rejectedBy_fkey') THEN
    ALTER TABLE "store_purchases" ADD CONSTRAINT "store_purchases_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Make old single-item columns nullable (they were required before)
-- Note: storeProductId, quantity, unitPrice are now moved to StorePurchaseItem
ALTER TABLE "store_purchases" ALTER COLUMN "quantity" DROP NOT NULL;
ALTER TABLE "store_purchases" ALTER COLUMN "unitPrice" DROP NOT NULL;
ALTER TABLE "store_purchases" ALTER COLUMN "receivedBy" DROP NOT NULL;

-- 3. Requisition: Add new columns
ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "requisitionNumber" TEXT;
ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "departmentId" INTEGER;
ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "purpose" TEXT;
ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "rejectedBy" INTEGER;
ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "issuedBy" INTEGER;
ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3);

-- Generate requisition numbers for existing rows
UPDATE "requisitions" SET "requisitionNumber" = 'REQ-' || LPAD(CAST(id AS TEXT), 5, '0') WHERE "requisitionNumber" IS NULL;

-- Make requisitionNumber NOT NULL after populating
ALTER TABLE "requisitions" ALTER COLUMN "requisitionNumber" SET NOT NULL;

-- Add unique constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requisitions_organizationId_requisitionNumber_key') THEN
    ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_organizationId_requisitionNumber_key" UNIQUE ("organizationId", "requisitionNumber");
  END IF;
END $$;

-- Add FK for department
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requisitions_departmentId_fkey') THEN
    ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add FK for rejector
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requisitions_rejectedBy_fkey') THEN
    ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Add FK for issuer
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requisitions_issuedBy_fkey') THEN
    ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Make old single-item columns nullable
ALTER TABLE "requisitions" ALTER COLUMN "quantity" DROP NOT NULL;

-- 4. Add isActive to departments and store_categories
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "store_categories" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 5. Create StorePurchaseItem table
CREATE TABLE IF NOT EXISTS "store_purchase_items" (
  "id" SERIAL PRIMARY KEY,
  "storePurchaseId" INTEGER NOT NULL,
  "storeProductId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "totalPrice" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_purchase_items_storePurchaseId_fkey" FOREIGN KEY ("storePurchaseId") REFERENCES "store_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "store_purchase_items_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Migrate existing store_purchase data to items (only if items table is empty)
INSERT INTO "store_purchase_items" ("storePurchaseId", "storeProductId", "quantity", "unitPrice", "totalPrice")
SELECT id, "storeProductId", COALESCE(quantity, 0), COALESCE("unitPrice", 0), COALESCE("totalAmount", 0)
FROM "store_purchases"
WHERE "storeProductId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "store_purchase_items" WHERE "storePurchaseId" = "store_purchases".id);

-- 6. Create RequisitionItem table
CREATE TABLE IF NOT EXISTS "requisition_items" (
  "id" SERIAL PRIMARY KEY,
  "requisitionId" INTEGER NOT NULL,
  "storeProductId" INTEGER NOT NULL,
  "quantityRequested" INTEGER NOT NULL,
  "quantityApproved" INTEGER,
  "quantityIssued" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "requisition_items_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "requisition_items_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "store_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Migrate existing requisition data to items (only if items table is empty)
INSERT INTO "requisition_items" ("requisitionId", "storeProductId", "quantityRequested")
SELECT id, "storeProductId", COALESCE(quantity, 0)
FROM "requisitions"
WHERE "storeProductId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "requisition_items" WHERE "requisitionId" = "requisitions".id);

-- Done!
SELECT 'Store module migration completed successfully' AS status;
