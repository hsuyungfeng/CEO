const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔐 Generating test accounts for staging...\n');

    // Hash passwords
    const adminHash = await bcrypt.hash('AdminTest123!', 12);
    const empHash = await bcrypt.hash('EmployeeTest123!', 12);

    // Admin account
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@staging.test' },
      update: {},
      create: {
        id: 'admin-test-001',
        taxId: '12345678',
        email: 'admin@staging.test',
        password: adminHash,
        name: 'Admin Test User',
        status: 'ACTIVE',
        role: 'ADMIN',
        emailVerified: true,
        firmName: 'Test Admin Firm',
      },
    });
    console.log('✅ Admin account created:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Tax ID: ${adminUser.taxId}`);
    console.log(`   Role: ${adminUser.role}\n`);

    // Employee account
    const empUser = await prisma.user.upsert({
      where: { email: 'employee@staging.test' },
      update: {},
      create: {
        id: 'employee-test-001',
        taxId: '87654321',
        email: 'employee@staging.test',
        password: empHash,
        name: 'Employee Test User',
        status: 'ACTIVE',
        role: 'MEMBER',
        emailVerified: true,
        firmName: 'Test Employee Firm',
      },
    });
    console.log('✅ Employee account created:');
    console.log(`   Email: ${empUser.email}`);
    console.log(`   Tax ID: ${empUser.taxId}`);
    console.log(`   Role: ${empUser.role}\n`);

    console.log('📋 Test Accounts Summary:');
    console.log('─'.repeat(60));
    console.log('Admin:');
    console.log('  Email:    admin@staging.test');
    console.log('  Password: AdminTest123!');
    console.log('  Tax ID:   12345678');
    console.log('');
    console.log('Employee:');
    console.log('  Email:    employee@staging.test');
    console.log('  Password: EmployeeTest123!');
    console.log('  Tax ID:   87654321');
    console.log('─'.repeat(60));
    console.log('\n✨ Test accounts ready for staging deployment!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating test accounts:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if PostgreSQL is running');
    console.error('2. Verify DATABASE_URL environment variable');
    console.error('3. Ensure Prisma migrations have been applied');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
