import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

// 設定環境變數
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ceo_admin:SecureDevPass_2026!@localhost:5432/ceo_platform';

const prisma = new PrismaClient();

async function main() {
  console.log('開始建立種子資料...');

  // 1. 建立管理員使用者
  console.log('建立管理員使用者...');
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: '系統管理員',
      taxId: '12345678',
      phone: '0912345678',
      address: '台北市信義區信義路五段7號',
      contactPerson: '張經理',
      role: UserRole.SUPER_ADMIN,
      points: 1000,
    },
  });
  console.log(`管理員建立完成: ${admin.email}`);

  // 2. 建立分類樹（三級分類）
  console.log('建立商品分類...');
  
  // 第一級分類：藥品
  const medicineCategory = await prisma.category.upsert({
    where: { name: '藥品' },
    update: {},
    create: {
      name: '藥品',
      level: 1,
      sortOrder: 1,
    },
  });

  // 第二級分類：感冒藥
  const coldMedicineCategory = await prisma.category.upsert({
    where: { name: '感冒藥' },
    update: {},
    create: {
      name: '感冒藥',
      parentId: medicineCategory.id,
      level: 2,
      sortOrder: 1,
    },
  });

  // 第三級分類：綜合感冒藥
  const generalColdMedicineCategory = await prisma.category.upsert({
    where: { name: '綜合感冒藥' },
    update: {},
    create: {
      name: '綜合感冒藥',
      parentId: coldMedicineCategory.id,
      level: 3,
      sortOrder: 1,
    },
  });

  // 第三級分類：止咳藥
  const coughMedicineCategory = await prisma.category.upsert({
    where: { name: '止咳藥' },
    update: {},
    create: {
      name: '止咳藥',
      parentId: coldMedicineCategory.id,
      level: 3,
      sortOrder: 2,
    },
  });

  console.log('分類樹建立完成');

  // 3. 建立廠商資料
  console.log('建立廠商資料...');
  
  const firm1 = await prisma.firm.upsert({
    where: { name: '台灣製藥股份有限公司' },
    update: {},
    create: {
      name: '台灣製藥股份有限公司',
      phone: '02-12345678',
      address: '新北市三重區重新路五段609號',
    },
  });

  const firm2 = await prisma.firm.upsert({
    where: { name: '中華藥業有限公司' },
    update: {},
    create: {
      name: '中華藥業有限公司',
      phone: '02-87654321',
      address: '台北市中山區南京東路三段219號',
    },
  });

  console.log(`廠商建立完成: ${firm1.name}, ${firm2.name}`);

  // 4. 建立商品資料（含階梯定價）
  console.log('建立商品資料...');

  // 商品1：綜合感冒膠囊
  const product1 = await prisma.product.upsert({
    where: { name: '綜合感冒膠囊' },
    update: {},
    create: {
      name: '綜合感冒膠囊',
      subtitle: '快速緩解感冒症狀',
      description: '有效緩解頭痛、發燒、鼻塞、流鼻水等感冒症狀，不含嗜睡成分',
      unit: '盒',
      spec: '10顆/盒',
      firmId: firm1.id,
      categoryId: generalColdMedicineCategory.id,
      isFeatured: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天後
    },
  });

  // 商品1的階梯定價
  await prisma.priceTier.createMany({
    data: [
      { productId: product1.id, minQty: 1, price: 150.00 },
      { productId: product1.id, minQty: 10, price: 135.00 },
      { productId: product1.id, minQty: 50, price: 120.00 },
      { productId: product1.id, minQty: 100, price: 100.00 },
    ],
  });

  // 商品2：止咳糖漿
  const product2 = await prisma.product.upsert({
    where: { name: '止咳糖漿' },
    update: {},
    create: {
      name: '止咳糖漿',
      subtitle: '天然草本配方',
      description: '採用天然草本配方，有效緩解咳嗽症狀，適合全家大小使用',
      unit: '瓶',
      spec: '120ml/瓶',
      firmId: firm2.id,
      categoryId: coughMedicineCategory.id,
      isFeatured: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60天後
    },
  });

  // 商品2的階梯定價
  await prisma.priceTier.createMany({
    data: [
      { productId: product2.id, minQty: 1, price: 180.00 },
      { productId: product2.id, minQty: 5, price: 170.00 },
      { productId: product2.id, minQty: 20, price: 160.00 },
      { productId: product2.id, minQty: 50, price: 150.00 },
    ],
  });

  // 商品3：感冒熱飲
  const product3 = await prisma.product.upsert({
    where: { name: '感冒熱飲' },
    update: {},
    create: {
      name: '感冒熱飲',
      subtitle: '方便沖泡，快速見效',
      description: '即溶顆粒，熱水沖泡即可飲用，快速緩解感冒初期症狀',
      unit: '盒',
      spec: '10包/盒',
      firmId: firm1.id,
      categoryId: generalColdMedicineCategory.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90天後
    },
  });

  // 商品3的階梯定價
  await prisma.priceTier.createMany({
    data: [
      { productId: product3.id, minQty: 1, price: 120.00 },
      { productId: product3.id, minQty: 10, price: 110.00 },
      { productId: product3.id, minQty: 30, price: 100.00 },
      { productId: product3.id, minQty: 100, price: 90.00 },
    ],
  });

  console.log(`商品建立完成: ${product1.name}, ${product2.name}, ${product3.name}`);

  // 5. 建立會員使用者
  console.log('建立會員使用者...');

  const member1Password = await bcrypt.hash('member123', 12);
  const member1 = await prisma.user.upsert({
    where: { email: 'member1@example.com' },
    update: {},
    create: {
      email: 'member1@example.com',
      password: member1Password,
      name: '王小明',
      taxId: '87654321',
      phone: '0922333444',
      address: '台北市大安區忠孝東路四段123號',
      contactPerson: '王小明',
      role: UserRole.MEMBER,
      points: 500,
    },
  });

  const member2Password = await bcrypt.hash('member456', 12);
  const member2 = await prisma.user.upsert({
    where: { email: 'member2@example.com' },
    update: {},
    create: {
      email: 'member2@example.com',
      password: member2Password,
      name: '李美麗',
      taxId: '11223344',
      phone: '0933555777',
      address: '新北市板橋區文化路一段456號',
      contactPerson: '李美麗',
      role: UserRole.MEMBER,
      points: 300,
    },
  });

  console.log(`會員建立完成: ${member1.email}, ${member2.email}`);

  // 6. 建立常見問題
  console.log('建立常見問題...');

  await prisma.faq.createMany({
    data: [
      {
        question: '如何成為會員？',
        answer: '請點擊網站右上角的「註冊」按鈕，填寫基本資料並完成驗證即可成為會員。',
        sortOrder: 1,
      },
      {
        question: '訂單何時會出貨？',
        answer: '一般訂單會在確認付款後1-3個工作天內出貨，特殊商品或大量訂購可能需較長時間。',
        sortOrder: 2,
      },
      {
        question: '如何查詢訂單狀態？',
        answer: '登入會員後，點擊「我的訂單」即可查看所有訂單狀態及詳細資訊。',
        sortOrder: 3,
      },
      {
        question: '退換貨政策是什麼？',
        answer: '商品到貨後7天內可申請退換貨，需保持商品完整包裝及發票。特殊商品請參考商品頁面說明。',
        sortOrder: 4,
      },
      {
        question: '如何累積點數？',
        answer: '每消費100元可累積1點，點數可於下次購物時折抵現金（1點=1元）。',
        sortOrder: 5,
      },
    ],
  });

  console.log('常見問題建立完成');

  console.log('種子資料建立完成！');
}

main()
  .catch((e) => {
    console.error('種子資料建立失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });