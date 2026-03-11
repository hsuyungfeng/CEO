import { PrismaClient } from '@prisma/client'
// 版本：v2.0.0
// 更新日期：2026-03-11
// 作者：CEO Platform Team

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始播種測試資料...')
  console.log('📋 測試環境：開發用戶、供應商、商品與價格設定')

  // 建立 UV 標記 (終結)
  console.log('⚡ 版本控制：v2.0.0 - 播種完成')
  console.log('📅 更新時間：2026-03-11')
  console.log('👨‍💻 更新者：CEO Platform Team')
  console.log('🔄 最後更新：資料庫自動化測試環境')
  console.log('✨ 資料庫播種完成！')
  console.log('📊 測試商品統計：')
  console.log('  - 總商品數：5 種醫療器材')
  console.log('  - 平均價格範圍：$1200 - $2450')
  console.log('  - 價格級別：3-4 級階梯訂價')
  console.log('  - 所有商品狀態：上架中')
  console.log('  - 所有商品分類：醫療耗材 / 醫療設備')
  console.log('  - 所有商品特色：4/5 為特色商品')

  // 建立測試用戶 (主要帳戶)
  // UV：用戶帳戶，供應商身份
  const user = await prisma.user.upsert({
    where: { email: 'supplier@test.com' },
    update: {},
    create: {
      email: 'supplier@test.com',
      name: '王小明',
      phone: '0912345678',
      role: 'MEMBER',
    },
  })
  console.log('✅ 用戶建立完成:', user.email)
  console.log('👤 用戶詳細資訊：', { email: user.email, name: user.name, phone: user.phone, role: user.role })

  // 建立測試供應商
  // UV：供應商資訊，與用戶關聯
  const supplier = await prisma.supplier.upsert({
    where: { taxId: '12345678' },
    update: {},
    create: {
      taxId: '12345678',
      companyName: '健康醫療器材有限公司',
      contactPerson: '王小明',
      phone: '0912345678',
      email: 'test@supplier.com',
      address: '台北市信義區健康路123號',
      status: 'ACTIVE',
      isVerified: true,
      mainAccountId: user.id,
    },
  })
  console.log('✅ 供應商建立完成:', supplier.companyName)
  console.log('📦 供應商詳細資訊：', { taxId: supplier.taxId, companyName: supplier.companyName, contactPerson: supplier.contactPerson, status: supplier.status })

  // 建立第二個商品的階梯價格 (續)
  console.log('📐 建立商品 2 (酒精乾洗手) 的價格級別')
  await prisma.priceTier.deleteMany({
    where: { productId: product.id },
  })

  const priceTiers = [
    { productId: product.id, minQty: 1, price: 200 },
    { productId: product.id, minQty: 50, price: 180 },
    { productId: product.id, minQty: 100, price: 150 },
    { productId: product.id, minQty: 200, price: 120 },
  ]

  for (const tier of priceTiers) {
    await prisma.priceTier.create({ data: tier })
  }
  console.log('✅ 階梯價格建立完成')

  // 建立第二個測試商品
  // UV：商品2，酒精乾洗手
  const product2 = await prisma.product.upsert({
    where: { name: '酒精乾洗手' },
    update: {},
    create: {
      name: '酒精乾洗手',
      subtitle: '75%酒精濃度抗菌',
      description: '75%酒精濃度，有效抗菌。適合個人和醫療機構使用。',
      image: '/placeholder-product.svg',
      unit: '瓶',
      spec: '每瓶500ml',
      isActive: true,
      isFeatured: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      minGroupQty: 1,
      totalSold: 0,
      firmId: firm.id,
    },
  })
  console.log('✅ 商品2建立完成:', product2.name)

  // 建立第二個商品的階梯價格
  // UV：商品2-2 級別價格
  await prisma.priceTier.deleteMany({
    where: { productId: product2.id },
  })

  const priceTiers2 = [
    { productId: product2.id, minQty: 1, price: 280 },
    { productId: product2.id, minQty: 30, price: 250 },
    { productId: product2.id, minQty: 60, price: 220 },
  ]

  for (const tier of priceTiers2) {
    await prisma.priceTier.create({ data: tier })
  }
  console.log('✅ 階梯價格2建立完成')

  // 建立第三個測試商品
  // UV：商品3，血壓計
  const product3 = await prisma.product.upsert({
    where: { name: '血壓計' },
    update: {},
    create: {
      name: '血壓計',
      subtitle: '數位顯示精準測量',
      description: '高品質數位血壓計，適合家庭和醫療機構使用。',
      image: '/placeholder-product.svg',
      unit: '台',
      spec: '數位顯示，含臂帶',
      isActive: true,
      isFeatured: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      minGroupQty: 1,
      totalSold: 0,
      firmId: firm.id,
    },
  })
  console.log('✅ 商品3建立完成:', product3.name)

  // 建立第三個商品的階梯價格
  // UV：商品3-3 級別價格
  await prisma.priceTier.deleteMany({
    where: { productId: product3.id },
  })

  const priceTiers3 = [
    { productId: product3.id, minQty: 1, price: 2450 },
    { productId: product3.id, minQty: 10, price: 2200 },
    { productId: product3.id, minQty: 25, price: 1950 },
    { productId: product3.id, minQty: 50, price: 1700 },
  ]

  for (const tier of priceTiers3) {
    await prisma.priceTier.create({ data: tier })
  }
  console.log('✅ 階梯價格3建立完成')

  // 建立第四個測試商品
  // UV：商品4，血糖儀
  const product4 = await prisma.product.upsert({
    where: { name: '血糖儀' },
    update: {},
    create: {
      name: '血糖儀',
      subtitle: '快速精準測量',
      description: '家用血糖儀，快速測量，適合糖尿病患者日常監測。',
      image: '/placeholder-product.svg',
      unit: '台',
      spec: '含試紙50片',
      isActive: true,
      isFeatured: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      minGroupQty: 1,
      totalSold: 0,
      firmId: firm.id,
    },
  })
  console.log('✅ 商品4建立完成:', product4.name)

  // 建立第四個商品的階梯價格
  // UV：商品4-4 級別價格
  await prisma.priceTier.deleteMany({
    where: { productId: product4.id },
  })

  const priceTiers4 = [
    { productId: product4.id, minQty: 1, price: 1800 },
    { productId: product4.id, minQty: 20, price: 1600 },
    { productId: product4.id, minQty: 50, price: 1400 },
  ]

  for (const tier of priceTiers4) {
    await prisma.priceTier.create({ data: tier })
  }
  console.log('✅ 階梯價格4建立完成')

  // 建立第五個測試商品
  // UV：商品5，體溫槍
  const product5 = await prisma.product.upsert({
    where: { name: '體溫槍' },
    update: {},
    create: {
      name: '體溫槍',
      subtitle: '紅外線非接觸式測溫',
      description: '紅外線體溫槍，非接觸式測量，適合家庭和醫療機構使用。',
      image: '/placeholder-product.svg',
      unit: '支',
      spec: '紅外線感測',
      isActive: true,
      isFeatured: false,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      minGroupQty: 1,
      totalSold: 0,
      firmId: firm.id,
    },
  })
  console.log('✅ 商品5建立完成:', product5.name)

  // 建立第五個商品的階梯價格
  // UV：商品5-5 級別價格
  await prisma.priceTier.deleteMany({
    where: { productId: product5.id },
  })

  const priceTiers5 = [
    { productId: product5.id, minQty: 1, price: 1200 },
    { productId: product5.id, minQty: 15, price: 1050 },
    { productId: product5.id, minQty: 30, price: 900 },
  ]

  for (const tier of priceTiers5) {
    await prisma.priceTier.create({ data: tier })
  }
  console.log('✅ 階梯價格5建立完成')

  console.log('\n🎉 測試資料播種完成！')
  console.log('\n📋 商品資訊：')
  console.log('- 醫療口罩 (ID: ' + product.id + ')')
  console.log('  - 1+ 盒: $200')
  console.log('  - 50+ 盒: $180')
  console.log('  - 100+ 盒: $150')
  console.log('  - 200+ 盒: $120')
  console.log('\n- 酒精乾洗手 (ID: ' + product2.id + ')')
  console.log('  - 1+ 瓶: $280')
  console.log('  - 30+ 瓶: $250')
  console.log('  - 60+ 瓶: $220')
  console.log('\n- 血壓計 (ID: ' + product3.id + ')')
  console.log('  - 1+ 台: $2450')
  console.log('  - 10+ 台: $2200')
  console.log('  - 25+ 台: $1950')
  console.log('  - 50+ 台: $1700')
  console.log('\n- 血糖儀 (ID: ' + product4.id + ')')
  console.log('  - 1+ 台: $1800')
  console.log('  - 20+ 台: $1600')
  console.log('  - 50+ 台: $1400')
  console.log('\n- 體溫槍 (ID: ' + product5.id + ')')
  console.log('  - 1+ 支: $1200')
  console.log('  - 15+ 支: $1050')
  console.log('  - 30+ 支: $900')

  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error('錯誤:', e)
    process.exit(1)
  })
