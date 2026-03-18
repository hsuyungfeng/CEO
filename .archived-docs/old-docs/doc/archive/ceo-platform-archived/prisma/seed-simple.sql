-- CEO團購電商平台種子資料 - 簡單版本

-- 1. 建立管理員使用者（如果不存在）
INSERT INTO users (id, email, password, name, "taxId", phone, address, "contactPerson", points, role, "createdAt", "updatedAt")
SELECT 
  'admin001', 
  'admin@example.com', 
  '$2b$12$xFXyy72MFf3k4qTQ.vHj3OPfSMpfWoViV2zAq8/sWDTC2Z4WCSJ0q', 
  '系統管理員', 
  '12345678', 
  '0912345678', 
  '台北市信義區信義路五段7號', 
  '張經理', 
  1000, 
  'SUPER_ADMIN', 
  NOW(), 
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

-- 2. 建立分類樹
-- 第一級分類：藥品（如果不存在）
INSERT INTO categories (id, name, level, "sortOrder", "createdAt")
SELECT 'cat001', '藥品', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '藥品');

-- 第二級分類：感冒藥（如果不存在）
INSERT INTO categories (id, name, "parentId", level, "sortOrder", "createdAt")
SELECT 'cat002', '感冒藥', c.id, 2, 1, NOW()
FROM categories c WHERE c.name = '藥品'
AND NOT EXISTS (SELECT 1 FROM categories WHERE name = '感冒藥');

-- 第三級分類：綜合感冒藥（如果不存在）
INSERT INTO categories (id, name, "parentId", level, "sortOrder", "createdAt")
SELECT 'cat003', '綜合感冒藥', c.id, 3, 1, NOW()
FROM categories c WHERE c.name = '感冒藥'
AND NOT EXISTS (SELECT 1 FROM categories WHERE name = '綜合感冒藥');

-- 第三級分類：止咳藥（如果不存在）
INSERT INTO categories (id, name, "parentId", level, "sortOrder", "createdAt")
SELECT 'cat004', '止咳藥', c.id, 3, 2, NOW()
FROM categories c WHERE c.name = '感冒藥'
AND NOT EXISTS (SELECT 1 FROM categories WHERE name = '止咳藥');

-- 3. 建立廠商資料
INSERT INTO firms (id, name, phone, address, "createdAt")
SELECT 'firm001', '台灣製藥股份有限公司', '02-12345678', '新北市三重區重新路五段609號', NOW()
WHERE NOT EXISTS (SELECT 1 FROM firms WHERE name = '台灣製藥股份有限公司');

INSERT INTO firms (id, name, phone, address, "createdAt")
SELECT 'firm002', '中華藥業有限公司', '02-87654321', '台北市中山區南京東路三段219號', NOW()
WHERE NOT EXISTS (SELECT 1 FROM firms WHERE name = '中華藥業有限公司');

-- 4. 建立商品資料
-- 商品1：綜合感冒膠囊
INSERT INTO products (id, name, subtitle, description, unit, spec, "firmId", "categoryId", "isFeatured", "startDate", "endDate", "createdAt", "updatedAt")
SELECT 
  'prod001', 
  '綜合感冒膠囊', 
  '快速緩解感冒症狀', 
  '有效緩解頭痛、發燒、鼻塞、流鼻水等感冒症狀，不含嗜睡成分', 
  '盒', 
  '10顆/盒',
  f.id,
  c.id,
  true,
  NOW(),
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
FROM firms f, categories c 
WHERE f.name = '台灣製藥股份有限公司' AND c.name = '綜合感冒藥'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = '綜合感冒膠囊');

-- 商品1的階梯定價
INSERT INTO price_tiers (id, "productId", "minQty", price)
SELECT 
  gen_random_uuid(),
  p.id,
  t.min_qty,
  t.price
FROM products p,
(VALUES 
  (1, 150.00),
  (10, 135.00),
  (50, 120.00),
  (100, 100.00)
) AS t(min_qty, price)
WHERE p.name = '綜合感冒膠囊'
AND NOT EXISTS (SELECT 1 FROM price_tiers WHERE "productId" = p.id AND "minQty" = t.min_qty);

-- 商品2：止咳糖漿
INSERT INTO products (id, name, subtitle, description, unit, spec, "firmId", "categoryId", "isFeatured", "startDate", "endDate", "createdAt", "updatedAt")
SELECT 
  'prod002', 
  '止咳糖漿', 
  '天然草本配方', 
  '採用天然草本配方，有效緩解咳嗽症狀，適合全家大小使用', 
  '瓶', 
  '120ml/瓶',
  f.id,
  c.id,
  true,
  NOW(),
  NOW() + INTERVAL '60 days',
  NOW(),
  NOW()
FROM firms f, categories c 
WHERE f.name = '中華藥業有限公司' AND c.name = '止咳藥'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = '止咳糖漿');

-- 商品2的階梯定價
INSERT INTO price_tiers (id, "productId", "minQty", price)
SELECT 
  gen_random_uuid(),
  p.id,
  t.min_qty,
  t.price
FROM products p,
(VALUES 
  (1, 180.00),
  (5, 170.00),
  (20, 160.00),
  (50, 150.00)
) AS t(min_qty, price)
WHERE p.name = '止咳糖漿'
AND NOT EXISTS (SELECT 1 FROM price_tiers WHERE "productId" = p.id AND "minQty" = t.min_qty);

-- 商品3：感冒熱飲
INSERT INTO products (id, name, subtitle, description, unit, spec, "firmId", "categoryId", "startDate", "endDate", "createdAt", "updatedAt")
SELECT 
  'prod003', 
  '感冒熱飲', 
  '方便沖泡，快速見效', 
  '即溶顆粒，熱水沖泡即可飲用，快速緩解感冒初期症狀', 
  '盒', 
  '10包/盒',
  f.id,
  c.id,
  NOW(),
  NOW() + INTERVAL '90 days',
  NOW(),
  NOW()
FROM firms f, categories c 
WHERE f.name = '台灣製藥股份有限公司' AND c.name = '綜合感冒藥'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = '感冒熱飲');

-- 商品3的階梯定價
INSERT INTO price_tiers (id, "productId", "minQty", price)
SELECT 
  gen_random_uuid(),
  p.id,
  t.min_qty,
  t.price
FROM products p,
(VALUES 
  (1, 120.00),
  (10, 110.00),
  (30, 100.00),
  (100, 90.00)
) AS t(min_qty, price)
WHERE p.name = '感冒熱飲'
AND NOT EXISTS (SELECT 1 FROM price_tiers WHERE "productId" = p.id AND "minQty" = t.min_qty);

-- 5. 建立會員使用者
INSERT INTO users (id, email, password, name, "taxId", phone, address, "contactPerson", points, role, "createdAt", "updatedAt")
SELECT 
  'member001', 
  'member1@example.com', 
  '$2b$12$oWhImf8mXKBhQEmHT2Z6.eCxgYEA1KLQmc9JMhr9ySg5bTeOtKKi2', 
  '王小明', 
  '87654321', 
  '0922333444', 
  '台北市大安區忠孝東路四段123號', 
  '王小明', 
  500, 
  'MEMBER', 
  NOW(), 
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'member1@example.com');

INSERT INTO users (id, email, password, name, "taxId", phone, address, "contactPerson", points, role, "createdAt", "updatedAt")
SELECT 
  'member002', 
  'member2@example.com', 
  '$2b$12$5NBgKY.I0u/D2qcwtOeDHeFQrDlygdgynh6V0xLtfJuArMNg6FTJ6', 
  '李美麗', 
  '11223344', 
  '0933555777', 
  '新北市板橋區文化路一段456號', 
  '李美麗', 
  300, 
  'MEMBER', 
  NOW(), 
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'member2@example.com');

-- 6. 建立常見問題（總是插入，因為沒有唯一約束）
INSERT INTO faqs (id, question, answer, "sortOrder", "createdAt")
VALUES 
  (gen_random_uuid(), '如何成為會員？', '請點擊網站右上角的「註冊」按鈕，填寫基本資料並完成驗證即可成為會員。', 1, NOW()),
  (gen_random_uuid(), '訂單何時會出貨？', '一般訂單會在確認付款後1-3個工作天內出貨，特殊商品或大量訂購可能需較長時間。', 2, NOW()),
  (gen_random_uuid(), '如何查詢訂單狀態？', '登入會員後，點擊「我的訂單」即可查看所有訂單狀態及詳細資訊。', 3, NOW()),
  (gen_random_uuid(), '退換貨政策是什麼？', '商品到貨後7天內可申請退換貨，需保持商品完整包裝及發票。特殊商品請參考商品頁面說明。', 4, NOW()),
  (gen_random_uuid(), '如何累積點數？', '每消費100元可累積1點，點數可於下次購物時折抵現金（1點=1元）。', 5, NOW());

-- 7. 顯示插入結果
SELECT '種子資料插入完成！' as message;