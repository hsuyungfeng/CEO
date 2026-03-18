 
// 簡單的種子資料腳本 - 使用SQL直接插入
const { exec } = require('child_process');

// 設定環境變數
process.env.DATABASE_URL = 'postgresql://ceo_admin:SecureDevPass_2026!@localhost:5432/ceo_platform';

console.log('開始建立種子資料...');

// 使用psql執行SQL腳本
const sqlScript = `
-- 清除現有資料
DELETE FROM members;
DELETE FROM cart_items;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM price_tiers;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM firms;
DELETE FROM contact_messages;
DELETE FROM faqs;
DELETE FROM sessions;
DELETE FROM users;

-- 重設序列
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE categories_id_seq RESTART WITH 1;
ALTER SEQUENCE firms_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE price_tiers_id_seq RESTART WITH 1;
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE cart_items_id_seq RESTART WITH 1;
ALTER SEQUENCE members_id_seq RESTART WITH 1;
ALTER SEQUENCE faqs_id_seq RESTART WITH 1;
ALTER SEQUENCE contact_messages_id_seq RESTART WITH 1;
ALTER SEQUENCE sessions_id_seq RESTART WITH 1;

-- 1. 建立管理員使用者 (密碼: admin123)
INSERT INTO users (id, email, password, name, "taxId", phone, address, "contactPerson", points, role, status, "emailVerified", "loginAttempts", "createdAt", "updatedAt") VALUES
('admin_001', 'admin@example.com', '\\$2a\\$12\\$4N6Q8zX9vC7B2A1D3E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5', '系統管理員', '12345678', '0912345678', '台北市信義區信義路五段7號', '張經理', 1000, 'SUPER_ADMIN', 'ACTIVE', true, 0, NOW(), NOW());

-- 建立管理員的會員資料
INSERT INTO members (id, "userId", points, "totalSpent", "createdAt", "updatedAt") VALUES
('member_001', 'admin_001', 1000, 0, NOW(), NOW());

-- 2. 建立測試會員 (密碼: member123)
INSERT INTO users (id, email, password, name, "taxId", phone, points, role, status, "emailVerified", "loginAttempts", "createdAt", "updatedAt") VALUES
('member_002', 'member@example.com', '\\$2a\\$12\\$1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7', '測試公司', '87654321', '0987654321', 500, 'MEMBER', 'ACTIVE', true, 0, NOW(), NOW());

-- 建立會員的會員資料
INSERT INTO members (id, "userId", points, "totalSpent", "createdAt", "updatedAt") VALUES
('member_002', 'member_002', 500, 0, NOW(), NOW());

-- 3. 建立分類樹（三級分類）
-- 第一級分類：藥品
INSERT INTO categories (id, name, "parentId", level, "sortOrder", "isActive", "createdAt") VALUES
('cat_001', '藥品', NULL, 1, 1, true, NOW());

-- 第二級分類：感冒藥
INSERT INTO categories (id, name, "parentId", level, "sortOrder", "isActive", "createdAt") VALUES
('cat_002', '感冒藥', 'cat_001', 2, 1, true, NOW());

-- 第三級分類：綜合感冒藥
INSERT INTO categories (id, name, "parentId", level, "sortOrder", "isActive", "createdAt") VALUES
('cat_003', '綜合感冒藥', 'cat_002', 3, 1, true, NOW());

-- 第三級分類：止咳藥
INSERT INTO categories (id, name, "parentId", level, "sortOrder", "isActive", "createdAt") VALUES
('cat_004', '止咳藥', 'cat_002', 3, 2, true, NOW());

-- 4. 建立廠商
INSERT INTO firms (id, name, phone, address, "isActive", "createdAt") VALUES
('firm_001', '台灣製藥股份有限公司', '02-12345678', '台北市南港區園區街3號', true, NOW()),
('firm_002', '健康生技有限公司', '02-87654321', '新北市中和區中山路二段123號', true, NOW());

-- 5. 建立商品
-- 商品1：綜合感冒膠囊
INSERT INTO products (id, name, subtitle, description, unit, spec, "firmId", "categoryId", "isActive", "isFeatured", "startDate", "endDate", "totalSold", "sortOrder", "createdAt", "updatedAt") VALUES
('prod_001', '綜合感冒膠囊', '快速緩解感冒症狀', '有效緩解頭痛、發燒、鼻塞、咳嗽等感冒症狀，成人專用。', '盒', '10顆/盒', 'firm_001', 'cat_003', true, true, '2026-02-01', '2026-03-01', 150, 1, NOW(), NOW());

-- 商品1的階梯定價
INSERT INTO price_tiers (id, "productId", "minQty", price) VALUES
('price_001', 'prod_001', 1, 350.00),
('price_002', 'prod_001', 10, 320.00),
('price_003', 'prod_001', 50, 300.00),
('price_004', 'prod_001', 100, 280.00);

-- 商品2：止咳糖漿
INSERT INTO products (id, name, subtitle, description, unit, spec, "firmId", "categoryId", "isActive", "isFeatured", "startDate", "endDate", "totalSold", "sortOrder", "createdAt", "updatedAt") VALUES
('prod_002', '止咳糖漿', '天然草本配方', '天然草本配方，溫和止咳，適合全家大小使用。', '瓶', '120ml/瓶', 'firm_002', 'cat_004', true, true, '2026-02-01', '2026-03-15', 89, 2, NOW(), NOW());

-- 商品2的階梯定價
INSERT INTO price_tiers (id, "productId", "minQty", price) VALUES
('price_005', 'prod_002', 1, 250.00),
('price_006', 'prod_002', 10, 230.00),
('price_007', 'prod_002', 50, 210.00),
('price_008', 'prod_002', 100, 190.00);

-- 商品3：維他命C發泡錠
INSERT INTO products (id, name, subtitle, description, unit, spec, "firmId", "categoryId", "isActive", "isFeatured", "startDate", "endDate", "totalSold", "sortOrder", "createdAt", "updatedAt") VALUES
('prod_003', '維他命C發泡錠', '增強免疫力', '高濃度維他命C，增強免疫力，預防感冒。', '盒', '20錠/盒', 'firm_001', 'cat_003', true, false, '2026-02-10', '2026-03-10', 45, 3, NOW(), NOW());

-- 商品3的階梯定價
INSERT INTO price_tiers (id, "productId", "minQty", price) VALUES
('price_009', 'prod_003', 1, 180.00),
('price_010', 'prod_003', 10, 170.00),
('price_011', 'prod_003', 50, 160.00),
('price_012', 'prod_003', 100, 150.00);

-- 6. 建立常見問題
INSERT INTO faqs (id, question, answer, "sortOrder", "isActive", "createdAt") VALUES
('faq_001', '如何註冊成為會員？', '請點擊網站右上角的「註冊」按鈕，填寫公司資訊和統一編號即可完成註冊。', 1, true, NOW()),
('faq_002', '訂單何時會出貨？', '一般訂單會在確認付款後1-3個工作天內出貨，團購商品則依照團購結束時間統一出貨。', 2, true, NOW()),
('faq_003', '如何查詢訂單狀態？', '登入後點擊「我的訂單」即可查看所有訂單狀態和詳細資訊。', 3, true, NOW()),
('faq_004', '可以取消訂單嗎？', '在訂單狀態為「待確認」時可以取消訂單，已確認的訂單需聯繫客服處理。', 4, true, NOW()),
('faq_005', '如何累積會員點數？', '每消費100元可累積1點，點數可折抵下次消費金額。', 5, true, NOW());

-- 7. 建立測試訂單
INSERT INTO orders (id, "orderNo", "userId", status, "totalAmount", note, "pointsEarned", "createdAt", "updatedAt") VALUES
('order_001', '20260214-0001', 'member_002', 'COMPLETED', 350.00, '測試訂單', 3, NOW(), NOW());

INSERT INTO order_items (id, "orderId", "productId", quantity, "unitPrice", subtotal) VALUES
('item_001', 'order_001', 'prod_001', 1, 350.00, 350.00);

-- 更新會員最後購買時間和消費總額
UPDATE members SET "lastPurchaseAt" = NOW(), "totalSpent" = 350.00 WHERE "userId" = 'member_002';

SELECT '🎉 種子資料建立完成！' as message;
SELECT '========================================' as separator;
SELECT '測試帳號資訊：' as info;
SELECT '1. 管理員帳號：' as admin_header;
SELECT '   - 統一編號: 12345678' as admin_taxid;
SELECT '   - 密碼: admin123' as admin_password;
SELECT '   - 電子郵件: admin@example.com' as admin_email;
SELECT '' as space;
SELECT '2. 會員帳號：' as member_header;
SELECT '   - 統一編號: 87654321' as member_taxid;
SELECT '   - 密碼: member123' as member_password;
SELECT '   - 電子郵件: member@example.com' as member_email;
SELECT '========================================' as separator;
`;

// 執行SQL
const command = `psql "${process.env.DATABASE_URL}" -c "${sqlScript.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`執行錯誤: ${error}`);
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(stdout);
  console.log('✅ 種子資料建立完成！');
});