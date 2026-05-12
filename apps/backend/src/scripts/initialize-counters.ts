import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Initialize document counters for existing data
 * This script analyzes existing invoices, quotations, and LPOs
 * and sets the counter to the highest value found
 */
async function initializeCounters() {
  console.log('🚀 Starting counter initialization...\n');

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    console.log(`Found ${organizations.length} organizations\n`);

    for (const org of organizations) {
      console.log(`\n📊 Processing Organization: ${org.name} (ID: ${org.id})`);

      // Initialize Invoice Counters
      await initializeInvoiceCounters(org.id, org.name);

      // Initialize Quotation Counters
      await initializeQuotationCounters(org.id, org.name);

      // Initialize LPO Counters
      await initializeLPOCounters(org.id, org.name);
    }

    console.log('\n\n✅ Counter initialization completed successfully!');
  } catch (error) {
    console.error('\n❌ Error initializing counters:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function initializeInvoiceCounters(orgId: number, orgName: string) {
  console.log('  📄 Analyzing invoices...');

  // Get all invoices for this organization grouped by year
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: orgId },
    select: {
      invoiceNumber: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (invoices.length === 0) {
    console.log('     No invoices found. Counter will start at 1.');
    return;
  }

  // Group invoices by year and find max sequence
  const yearlyCounters = new Map<number, number>();

  for (const invoice of invoices) {
    // Parse invoice number (format: INV-2026-00001)
    const match = invoice.invoiceNumber.match(/INV-(\d{4})-(\d+)/);
    if (match) {
      const year = parseInt(match[1], 10);
      const sequence = parseInt(match[2], 10);

      const currentMax = yearlyCounters.get(year) || 0;
      if (sequence > currentMax) {
        yearlyCounters.set(year, sequence);
      }
    }
  }

  // Set counters for each year
  for (const [year, maxSequence] of yearlyCounters) {
    await prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId: orgId,
          documentType: 'INVOICE',
          year,
          month: null,
        },
      },
      update: {
        currentValue: maxSequence,
      },
      create: {
        organizationId: orgId,
        documentType: 'INVOICE',
        year,
        month: null,
        currentValue: maxSequence,
      },
    });

    console.log(`     ✓ Year ${year}: Set counter to ${maxSequence}`);
  }
}

async function initializeQuotationCounters(orgId: number, orgName: string) {
  console.log('  📝 Analyzing quotations...');

  const quotations = await prisma.quotation.findMany({
    where: { organizationId: orgId },
    select: {
      referenceNumber: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (quotations.length === 0) {
    console.log('     No quotations found. Counter will start at 1.');
    return;
  }

  // Group quotations by year
  const yearlyCounters = new Map<number, number>();

  for (const quotation of quotations) {
    // Try to parse new format (QUO-2026-00001)
    let match = quotation.referenceNumber.match(/QUO-(\d{4})-(\d+)/);

    if (match) {
      const year = parseInt(match[1], 10);
      const sequence = parseInt(match[2], 10);

      const currentMax = yearlyCounters.get(year) || 0;
      if (sequence > currentMax) {
        yearlyCounters.set(year, sequence);
      }
    } else {
      // Old format: QT-{timestamp}-{random}
      // Just count these for the current year
      const year = quotation.createdAt.getFullYear();
      const currentMax = yearlyCounters.get(year) || 0;
      yearlyCounters.set(year, currentMax + 1);
    }
  }

  // Set counters for each year
  for (const [year, maxSequence] of yearlyCounters) {
    await prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId: orgId,
          documentType: 'QUOTATION',
          year,
          month: null,
        },
      },
      update: {
        currentValue: maxSequence,
      },
      create: {
        organizationId: orgId,
        documentType: 'QUOTATION',
        year,
        month: null,
        currentValue: maxSequence,
      },
    });

    console.log(`     ✓ Year ${year}: Set counter to ${maxSequence}`);
  }
}

async function initializeLPOCounters(orgId: number, orgName: string) {
  console.log('  📋 Analyzing LPOs...');

  const lpos = await prisma.localPurchaseOrder.findMany({
    where: { organizationId: orgId },
    select: {
      referenceNumber: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (lpos.length === 0) {
    console.log('     No LPOs found. Counter will start at 1.');
    return;
  }

  // Group LPOs by year
  const yearlyCounters = new Map<number, number>();

  for (const lpo of lpos) {
    // Try to parse new format (LPO-2026-00001)
    let match = lpo.referenceNumber.match(/LPO-(\d{4})-(\d+)/);

    if (match) {
      const year = parseInt(match[1], 10);
      const sequence = parseInt(match[2], 10);

      const currentMax = yearlyCounters.get(year) || 0;
      if (sequence > currentMax) {
        yearlyCounters.set(year, sequence);
      }
    } else {
      // Old format: LPO-YYYYMMDD-HHMMSS-RRR
      // Extract year from the date part
      const dateMatch = lpo.referenceNumber.match(/LPO-(\d{4})\d{4}/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        const currentMax = yearlyCounters.get(year) || 0;
        yearlyCounters.set(year, currentMax + 1);
      }
    }
  }

  // Set counters for each year
  for (const [year, maxSequence] of yearlyCounters) {
    await prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId: orgId,
          documentType: 'LPO',
          year,
          month: null,
        },
      },
      update: {
        currentValue: maxSequence,
      },
      create: {
        organizationId: orgId,
        documentType: 'LPO',
        year,
        month: null,
        currentValue: maxSequence,
      },
    });

    console.log(`     ✓ Year ${year}: Set counter to ${maxSequence}`);
  }
}

// Run the script
initializeCounters()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
