const { PrismaClient } = require('@prisma/client');

async function setupTestData() {
  const prisma = new PrismaClient();

  try {
    console.log('Setting up test data...');

    // Create organizations
    const orgs = await Promise.all([
      prisma.organization.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          name: 'Main Organization',
          address: '123 Main St',
          contact: '+254700000001',
        },
      }),
      prisma.organization.upsert({
        where: { id: 2 },
        update: {},
        create: {
          id: 2,
          name: 'Branch Organization',
          address: '456 Branch Ave',
          contact: '+254700000002',
        },
      }),
    ]);

    // Create users
    const users = await Promise.all([
      prisma.user.upsert({
        where: { email: 'admin@test.com' },
        update: {},
        create: {
          organizationId: 1,
          email: 'admin@test.com',
          password: '$2b$10$hashedpassword1',
          fullName: 'Test Admin',
          username: 'testadmin',
          phone: '+254700000001',
          role: 'Admin',
        },
      }),
      prisma.user.upsert({
        where: { email: 'user@test.com' },
        update: {},
        create: {
          organizationId: 1,
          email: 'user@test.com',
          password: '$2b$10$hashedpassword2',
          fullName: 'Test User',
          username: 'testuser',
          phone: '+254700000002',
          role: 'User',
        },
      }),
    ]);

    // Grant organization access
    const accesses = await Promise.all([
      // Admin access to both orgs
      prisma.userOrganizationAccess.upsert({
        where: {
          userId_organizationId: {
            userId: users[0].id,
            organizationId: orgs[0].id,
          },
        },
        update: {},
        create: {
          userId: users[0].id,
          organizationId: orgs[0].id,
          role: 'Admin',
          permissions: {
            canTransferStock: true,
            canManageUsers: true,
            canViewReports: true,
          },
          isActive: true,
        },
      }),
      prisma.userOrganizationAccess.upsert({
        where: {
          userId_organizationId: {
            userId: users[0].id,
            organizationId: orgs[1].id,
          },
        },
        update: {},
        create: {
          userId: users[0].id,
          organizationId: orgs[1].id,
          role: 'Admin',
          permissions: {
            canTransferStock: true,
            canManageUsers: true,
            canViewReports: true,
          },
          isActive: true,
        },
      }),
      // User access to first org only
      prisma.userOrganizationAccess.upsert({
        where: {
          userId_organizationId: {
            userId: users[1].id,
            organizationId: orgs[0].id,
          },
        },
        update: {},
        create: {
          userId: users[1].id,
          organizationId: orgs[0].id,
          role: 'User',
          permissions: {
            canTransferStock: true,
            canViewReports: false,
          },
          isActive: true,
        },
      }),
    ]);

    console.log('✅ Test data setup completed successfully!');
    console.log(
      'Created organizations:',
      orgs.map((o) => o.name),
    );
    console.log(
      'Created users:',
      users.map((u) => u.email),
    );
    console.log('Created access records:', accesses.length);
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();
