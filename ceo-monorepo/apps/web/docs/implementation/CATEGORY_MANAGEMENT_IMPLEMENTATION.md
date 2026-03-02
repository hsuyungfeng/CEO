# 分類管理系統實現文檔

## 概述
已成功實現完整的樹狀分類管理系統，包含 API 端點、前端頁面和組件。

## 實現的功能

### 1. API 端點（管理員專用）
- ✅ `GET /api/admin/categories` - 獲取分類樹（包含停用分類）
- ✅ `POST /api/admin/categories` - 新增分類
- ✅ `GET /api/admin/categories/[id]` - 獲取分類詳情
- ✅ `PATCH /api/admin/categories/[id]` - 更新分類
- ✅ `DELETE /api/admin/categories/[id]` - 軟刪除分類（isActive: false）
- ✅ `PATCH /api/admin/categories/[id]/reorder` - 重新排序
- ✅ `PATCH /api/admin/categories/[id]/move` - 移動層級
- ✅ `PATCH /api/admin/categories/batch` - 批量操作（啟用/停用/刪除）

### 2. 數據驗證
- ✅ 分類名稱：必填，1-100字
- ✅ 父分類：防止循環引用
- ✅ 層級：最多3級（level: 1-3）
- ✅ 排序值：整數，可為負數
- ✅ 同級分類名稱不能重複

### 3. 前端頁面結構
```
src/app/admin/categories/
├── page.tsx              # 分類列表（樹狀顯示）
├── new/
│   └── page.tsx          # 新增分類
└── [id]/
    └── page.tsx          # 編輯分類
```

### 4. 組件實現
- ✅ `category-tree.tsx`：樹狀顯示分類，支援拖拽排序、展開/收合（使用 @dnd-kit）
- ✅ `category-tree-node.tsx`：分類樹節點組件
- ✅ `category-form.tsx`：分類表單（名稱、父分類、排序值、啟用狀態）
- ✅ `batch-category-actions.tsx`：批量操作組件（啟用/停用/刪除）

### 5. 技術特性
- **權限驗證**：使用現有的 `requireAdmin()` 中間件
- **錯誤處理**：完整的錯誤響應和用戶提示
- **響應式設計**：支援桌面和移動設備
- **實時反饋**：使用 `sonner` 顯示操作結果
- **數據一致性**：使用 Prisma 事務處理複雜操作

## 安裝的依賴
- `@dnd-kit/core` - 拖拽核心功能
- `@dnd-kit/sortable` - 排序功能
- `@dnd-kit/utilities` - 工具函數
- `@dnd-kit/modifiers` - 拖拽修飾器
- `@radix-ui/react-label` - 表單標籤
- `@radix-ui/react-slot` - 插槽組件

## 使用方法

### 1. 訪問分類管理頁面
```
/admin/categories
```

### 2. 主要功能
- **新增分類**：點擊"新增分類"按鈕
- **編輯分類**：點擊分類行的操作菜單中的"編輯"
- **刪除分類**：點擊操作菜單中的"刪除"
- **移動分類**：點擊操作菜單中的"移動"
- **重新排序**：拖拽分類或使用上下箭頭按鈕
- **批量操作**：選擇多個分類後使用批量操作菜單

### 3. 分類層級規則
- 最多支持3級分類
- 頂級分類：parentId = null
- 子分類：繼承父分類的層級 + 1
- 移動分類時會自動更新所有子分類的層級

### 4. 安全限制
- 不能將自己設為父分類
- 不能將子分類設為父分類（防止循環引用）
- 有商品的分类不能直接删除（需要先移除商品）
- 有子分類的分類不能直接刪除（需要先刪除或移動子分類）

## 測試方法

### 1. 使用 HTTP 文件測試
```bash
# 使用 VS Code REST Client 擴展
test-categories-api.http
```

### 2. 手動測試步驟
1. 登入管理員帳號
2. 訪問 `/admin/categories`
3. 測試新增、編輯、刪除功能
4. 測試拖拽排序功能
5. 測試批量操作功能
6. 驗證層級限制和循環引用檢查

## 注意事項

### 1. 性能考慮
- 分類樹使用遞歸構建，適合中小規模數據
- 大量分類時建議添加分頁或虛擬滾動

### 2. 數據完整性
- 刪除分類時會檢查關聯的商品和子分類
- 移動分類時會更新所有子分類的層級
- 使用事務確保複雜操作的原子性

### 3. 擴展性
- 可輕鬆添加更多批量操作
- 可添加分類圖標、顏色等擴展字段
- 可實現分類導入/導出功能

## 待改進項目

### 高優先級
1. 添加分類搜索功能
2. 實現分類過濾（按狀態、層級）
3. 添加分類導出功能

### 中優先級
1. 添加分類圖片上傳
2. 實現分類預覽功能
3. 添加操作日誌記錄

### 低優先級
1. 添加分類模板功能
2. 實現分類權限管理
3. 添加分類分析報表

## 相關文件
- `src/types/admin.ts` - 類型定義和 Zod schema
- `src/app/api/admin/categories/` - API 端點
- `src/components/admin/category-*` - 前端組件
- `src/app/admin/categories/` - 頁面組件