-- Remove the problematic migration from the _prisma_migrations table
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20260202160000_add_batch_approval_workflow';
