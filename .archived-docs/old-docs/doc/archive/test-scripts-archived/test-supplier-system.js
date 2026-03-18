// 测试供应商系统
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('开始测试供应商系统...');
  
  // 清理现有数据
  await prisma.supplierApplication.deleteMany({});
  await prisma.supplierProduct.deleteMany({});
  await prisma.supplierTransaction.deleteMany({});
  await prisma.supplierInvoice.deleteMany({});
  await prisma.supplierAccount.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('清理完成');
  
  // 创建测试用户
  const hashedPassword = await bcrypt.hash('test1234', 12);
  
  const user = await prisma.user.create({
    data: {
      email: 'supplier@test.com',
      password: hashedPassword,
      name: '測試供應商用戶',
      role: 'SUPPLIER',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
  });
  
  console.log('用户创建成功:', user.email);
  
  // 创建供应商
  const supplier = await prisma.supplier.create({
    data: {
      companyName: '測試供應商有限公司',
      taxId: '12345678',
      contactPerson: '張三',
      contactEmail: 'supplier@test.com',
      contactPhone: '0912345678',
      address: '台北市信義區',
      status: 'ACTIVE',
      users: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
      account: {
        create: {
          balance: 5000.00,
          billingRate: 0.002, // 0.2%
          totalSpent: 0,
          isSuspended: false,
          isLowBalance: false,
        },
      },
    },
  });
  
  console.log('供应商创建成功:', supplier.companyName);
  
  // 创建供应商产品
  const product = await prisma.supplierProduct.create({
    data: {
      supplierId: supplier.id,
      name: '測試產品',
      SKU: 'TEST-001',
      category: '電子產品',
      unit: '個',
      price: 1000.00,
      moq: 10,
      stock: 100,
      length: 10.5,
      width: 5.2,
      height: 3.1,
      weight: 0.5,
      isActive: true,
    },
  });
  
  console.log('产品创建成功:', product.name);
  
  // 创建交易记录
  const transaction = await prisma.supplierTransaction.create({
    data: {
      supplierId: supplier.id,
      type: 'DEPOSIT',
      amount: 5000.00,
      balanceBefore: 0,
      balanceAfter: 5000.00,
      note: '初始儲值',
    },
  });
  
  console.log('交易记录创建成功');
  
  // 创建发票
  const invoice = await prisma.supplierInvoice.create({
    data: {
      invoiceNo: `INV-${Date.now()}`,
      supplierId: supplier.id,
      type: 'MONTHLY_FEE',
      amount: 100.00,
      totalAmount: 100.00,
      status: 'UNPAID',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后到期
      note: '測試月費帳單',
    },
  });
  
  console.log('发票创建成功:', invoice.invoiceNo);
  
  console.log('\n=== 测试数据创建完成 ===');
  console.log('用户ID:', user.id);
  console.log('供应商ID:', supplier.id);
  console.log('产品ID:', product.id);
  console.log('账户余额:', 'NT$ 5,000');
  
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});