const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Initialize document counters for existing data
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

      // Initialize Sales Order Counters
      await initializeSalesCounters(org.id, org.name);
    }

    console.log('\n\n✅ Counter initialization completed successfully!');
  } catch (error) {
    console.error('\n❌ Error initializing counters:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function initializeInvoiceCounters(orgId, orgName) {
  console.log('  📄 Analyzing invoices...');

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

  const yearlyCounters = new Map();

  for (const invoice of invoices) {
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

  for (const [year, maxSequence] of yearlyCounters) {
    await prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId: orgId,
          documentType: 'INVOICE',
          year,
          month: 0,
        },
      },
      update: {
        currentValue: maxSequence,
      },
      create: {
        organizationId: orgId,
        documentType: 'INVOICE',
        year,
        month: 0,
        currentValue: maxSequence,
      },
    });

    console.log(`     ✓ Year ${year}: Set counter to ${maxSequence}`);
  }
}

async function initializeQuotationCounters(orgId, orgName) {
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

  const yearlyCounters = new Map();

  for (const quotation of quotations) {
    let match = quotation.referenceNumber.match(/QUO-(\d{4})-(\d+)/);

    if (match) {
      const year = parseInt(match[1], 10);
      const sequence = parseInt(match[2], 10);

      const currentMax = yearlyCounters.get(year) || 0;
      if (sequence > currentMax) {
        yearlyCounters.set(year, sequence);
      }
    } else {
      const year = quotation.createdAt.getFullYear();
      const currentMax = yearlyCounters.get(year) || 0;
      yearlyCounters.set(year, currentMax + 1);
    }
  }

  for (const [year, maxSequence] of yearlyCounters) {
    await prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId: orgId,
          documentType: 'QUOTATION',
          year,
          month: 0,
        },
      },
      update: {
        currentValue: maxSequence,
      },
      create: {
        organizationId: orgId,
        documentType: 'QUOTATION',
        year,
        month: 0,
        currentValue: maxSequence,
      },
    });

    console.log(`     ✓ Year ${year}: Set counter to ${maxSequence}`);
  }
}

async function initializeLPOCounters(orgId, orgName) {
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

  const yearlyCounters = new Map();

  for (const lpo of lpos) {
    let match = lpo.referenceNumber.match(/LPO-(\d{4})-(\d+)/);

    if (match) {
      const year = parseInt(match[1], 10);
      const sequence = parseInt(match[2], 10);

      const currentMax = yearlyCounters.get(year) || 0;
      if (sequence > currentMax) {
        yearlyCounters.set(year, sequence);
      }
    } else {
      const dateMatch = lpo.referenceNumber.match(/LPO-(\d{4})\d{4}/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        const currentMax = yearlyCounters.get(year) || 0;
        yearlyCounters.set(year, currentMax + 1);
      }
    }
  }

  for (const [year, maxSequence] of yearlyCounters) {
    await prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId: orgId,
          documentType: 'LPO',
          year,
          month: 0,
        },
      },
      update: {
        currentValue: maxSequence,
      },
      create: {
        organizationId: orgId,
        documentType: 'LPO',
        year,
        month: 0,
        currentValue: maxSequence,
      },
    });

    console.log(`     ✓ Year ${year}: Set counter to ${maxSequence}`);
  }
}

async function initializeSalesCounters(orgId, orgName) {
  console.log('  🛒 Analyzing sales orders...');

  const orders = await prisma.order.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (orders.length === 0) {
    console.log('     No sales orders found. Counter will start at 1.');
    return;
  }

  // Group orders by year and count them
  const yearlyCounters = new Map();

  for (const order of orders) {
    const year = order.createdAt.getFullYear();
    const currentCount = yearlyCounters.get(year) || 0;
    yearlyCounters.set(year, currentCount + 1);
  }

  // Set counters for each year
  for (const [year, count] of yearlyCounters) {
    await prisma.documentCounter.upsert({
      where: {
        organizationId_documentType_year_month: {
          organizationId: orgId,
          documentType: 'SALE',
          year,
          month: 0,
        },
      },
      update: {
        currentValue: count,
      },
      create: {
        organizationId: orgId,
        documentType: 'SALE',
        year,
        month: 0,
        currentValue: count,
      },
    });

    console.log(`     ✓ Year ${year}: Set counter to ${count} (${count} existing orders)`);
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
