import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

// 設定環境變數
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ceo_admin:SecureDevPass_2026!@localhost:5432/ceo_platform';

const prisma = new PrismaClient();

async function main() {
  console.log('開始建立種子資料...');

  try {
    // 清除現有資料（可選，開發環境使用）
    console.log('清除現有資料...');
    await prisma.member.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.priceTier.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.firm.deleteMany({});
    await prisma.contactMessage.deleteMany({});
    await prisma.faq.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});

    // 1. 建立管理員使用者
    console.log('建立管理員使用者...');
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: adminPassword,
        name: '系統管理員',
        taxId: '12345678',
        phone: '0912345678',
        address: '台北市信義區信義路五段7號',
        contactPerson: '張經理',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        points: 1000,
      },
    });

    // 建立管理員的會員資料
    await prisma.member.create({
      data: {
        userId: admin.id,
        points: 1000,
        totalSpent: 0,
      },
    });
    console.log(`管理員建立完成: ${admin.email}`);

    // 2. 建立測試會員
    console.log('建立測試會員...');
    const memberPassword = await bcrypt.hash('member123', 12);
    const member = await prisma.user.create({
      data: {
        email: 'member@example.com',
        password: memberPassword,
        name: '測試公司',
        taxId: '87654321',
        phone: '0987654321',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        points: 500,
      },
    });

    // 建立會員的會員資料
    await prisma.member.create({
      data: {
        userId: member.id,
        points: 500,
        totalSpent: 0,
      },
    });
    console.log(`測試會員建立完成: ${member.email}`);

    // 3. 建立分類樹（三級分類）
    console.log('建立商品分類...');
    
    // 第一級分類：藥品
    const medicineCategory = await prisma.category.create({
      data: {
        name: '藥品',
        level: 1,
        sortOrder: 1,
      },
    });

    // 第二級分類：感冒藥
    const coldMedicineCategory = await prisma.category.create({
      data: {
        name: '感冒藥',
        level: 2,
        sortOrder: 1,
        parentId: medicineCategory.id,
      },
    });

    // 第三級分類：綜合感冒藥
    const coldMedicineCategory1 = await prisma.category.create({
      data: {
        name: '綜合感冒藥',
        level: 3,
        sortOrder: 1,
        parentId: coldMedicineCategory.id,
      },
    });

    // 第三級分類：止咳藥
    const coldMedicineCategory2 = await prisma.category.create({
      data: {
        name: '止咳藥',
        level: 3,
        sortOrder: 2,
        parentId: coldMedicineCategory.id,
      },
    });

    console.log('分類建立完成');

    // 4. 建立廠商
    console.log('建立廠商...');
    const firm1 = await prisma.firm.create({
      data: {
        name: '台灣製藥股份有限公司',
        phone: '02-12345678',
        address: '台北市南港區園區街3號',
      },
    });

    const firm2 = await prisma.firm.create({
      data: {
        name: '健康生技有限公司',
        phone: '02-87654321',
        address: '新北市中和區中山路二段123號',
      },
    });

    console.log('廠商建立完成');

    // 5. 建立商品與階梯定價
    console.log('建立商品與階梯定價...');

    // 商品1：綜合感冒膠囊
    const product1 = await prisma.product.create({
      data: {
        name: '綜合感冒膠囊',
        subtitle: '快速緩解感冒症狀',
        description: '有效緩解頭痛、發燒、鼻塞、咳嗽等感冒症狀，成人專用。',
        unit: '盒',
        spec: '10顆/盒',
        firmId: firm1.id,
        categoryId: coldMedicineCategory1.id,
        isFeatured: true,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-03-01'),
        totalSold: 150,
        sortOrder: 1,
      },
    });

    // 商品1的階梯定價
    await prisma.priceTier.createMany({
      data: [
        { productId: product1.id, minQty: 1, price: 350 },
        { productId: product1.id, minQty: 10, price: 320 },
        { productId: product1.id, minQty: 50, price: 300 },
        { productId: product1.id, minQty: 100, price: 280 },
      ],
    });

    // 商品2：止咳糖漿
    const product2 = await prisma.product.create({
      data: {
        name: '止咳糖漿',
        subtitle: '天然草本配方',
        description: '天然草本配方，溫和止咳，適合全家大小使用。',
        unit: '瓶',
        spec: '120ml/瓶',
        firmId: firm2.id,
        categoryId: coldMedicineCategory2.id,
        isFeatured: true,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-03-15'),
        totalSold: 89,
        sortOrder: 2,
      },
    });

    // 商品2的階梯定價
    await prisma.priceTier.createMany({
      data: [
        { productId: product2.id, minQty: 1, price: 250 },
        { productId: product2.id, minQty: 10, price: 230 },
        { productId: product2.id, minQty: 50, price: 210 },
        { productId: product2.id, minQty: 100, price: 190 },
      ],
    });

    // 商品3：維他命C發泡錠
    const product3 = await prisma.product.create({
      data: {
        name: '維他命C發泡錠',
        subtitle: '增強免疫力',
        description: '高濃度維他命C，增強免疫力，預防感冒。',
        unit: '盒',
        spec: '20錠/盒',
        firmId: firm1.id,
        categoryId: coldMedicineCategory1.id,
        isFeatured: false,
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-03-10'),
        totalSold: 45,
        sortOrder: 3,
      },
    });

    // 商品3的階梯定價
    await prisma.priceTier.createMany({
      data: [
        { productId: product3.id, minQty: 1, price: 180 },
        { productId: product3.id, minQty: 10, price: 170 },
        { productId: product3.id, minQty: 50, price: 160 },
        { productId: product3.id, minQty: 100, price: 150 },
      ],
    });

    console.log('商品建立完成');

    // 6. 建立常見問題
    console.log('建立常見問題...');
    await prisma.faq.createMany({
      data: [
        {
          question: '如何註冊成為會員？',
          answer: '請點擊網站右上角的「註冊」按鈕，填寫公司資訊和統一編號即可完成註冊。',
          sortOrder: 1,
        },
        {
          question: '訂單何時會出貨？',
          answer: '一般訂單會在確認付款後1-3個工作天內出貨，團購商品則依照團購結束時間統一出貨。',
          sortOrder: 2,
        },
        {
          question: '如何查詢訂單狀態？',
          answer: '登入後點擊「我的訂單」即可查看所有訂單狀態和詳細資訊。',
          sortOrder: 3,
        },
        {
          question: '可以取消訂單嗎？',
          answer: '在訂單狀態為「待確認」時可以取消訂單，已確認的訂單需聯繫客服處理。',
          sortOrder: 4,
        },
        {
          question: '如何累積會員點數？',
          answer: '每消費100元可累積1點，點數可折抵下次消費金額。',
          sortOrder: 5,
        },
      ],
    });

    console.log('常見問題建立完成');

    // 7. 建立測試訂單
    console.log('建立測試訂單...');
    const order = await prisma.order.create({
      data: {
        orderNo: `20260214-0001`,
        userId: member.id,
        status: 'COMPLETED',
        totalAmount: 350,
        note: '測試訂單',
        pointsEarned: 3,
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              unitPrice: 350,
              subtotal: 350,
            },
          ],
        },
      },
    });

    // 更新會員最後購買時間和消費總額
    await prisma.member.update({
      where: { userId: member.id },
      data: {
        lastPurchaseAt: new Date(),
        totalSpent: 350,
      },
    });

    console.log(`測試訂單建立完成: ${order.orderNo}`);

    console.log('🎉 種子資料建立完成！');
    console.log('========================================');
    console.log('測試帳號資訊：');
    console.log('1. 管理員帳號：');
    console.log('   - 統一編號: 12345678');
    console.log('   - 密碼: admin123');
    console.log('   - 電子郵件: admin@example.com');
    console.log('');
    console.log('2. 會員帳號：');
    console.log('   - 統一編號: 87654321');
    console.log('   - 密碼: member123');
    console.log('   - 電子郵件: member@example.com');
    console.log('========================================');

  } catch (error) {
    console.error('建立種子資料時發生錯誤:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });