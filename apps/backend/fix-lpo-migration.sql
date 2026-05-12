-- Fix for LPO migration enum issues
-- Run this BEFORE running prisma migrate dev

-- 1. Add PENDING to BatchStatus enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PENDING' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BatchStatus')
    ) THEN
        ALTER TYPE "BatchStatus" ADD VALUE 'PENDING';
    END IF;
END $$;

-- 2. Create LpoStatus enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LpoStatus') THEN
        CREATE TYPE "LpoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PURCHASE', 'CANCELLED');
    END IF;
END $$;

-- Commit the transaction
COMMIT;
