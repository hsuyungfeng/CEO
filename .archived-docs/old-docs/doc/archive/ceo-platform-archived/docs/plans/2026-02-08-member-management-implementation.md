# 會員管理功能完善實施計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實現完整的會員管理系統，包括API端點、搜尋篩選、點數調整、操作日誌等功能

**Architecture:** 基於現有的Next.js + Prisma架構，擴展UserLog和PointTransaction模型，實現完整的REST API，並完善前端頁面

**Tech Stack:** Next.js 14, Prisma, PostgreSQL, TypeScript, Zod, Tailwind CSS, shadcn/ui

---

## 第1部分：數據模型擴展

### Task 1: 更新Prisma Schema

**Files:**
- Modify: `ceo-platform/prisma/schema.prisma`

**步驟：**
1. 添加UserAction和PointTransactionType枚舉
2. 添加UserLog模型
3. 添加PointTransaction模型
4. 執行遷移並生成Prisma Client

---

## 第2部分：類型定義和驗證Schema

### Task 2: 擴展管理員類型定義

**Files:**
- Modify: `ceo-platform/src/types/admin.ts`

**步驟：**
1. 添加會員查詢參數Schema
2. 添加會員狀態更新Schema
3. 添加點數調整Schema
4. 添加會員資訊更新Schema
5. 添加API響應類型

---

## 第3部分：會員管理API實現

### Task 3: 創建會員列表API

**Files:**
- Create: `ceo-platform/src/app/api/admin/users/route.ts`

**步驟：**
1. 創建文件並導入依賴
2. 實現GET方法（搜尋、篩選、分頁）
3. 測試API

### Task 4: 創建會員詳情API

**Files:**
- Create: `ceo-platform/src/app/api/admin/users/[id]/route.ts`

**步驟：**
1. 創建文件並導入依賴
2. 實現GET方法（會員詳情）
3. 實現PATCH方法（更新會員）
4. 測試API

### Task 5: 創建點數調整API

**Files:**
- Create: `ceo-platform/src/app/api/admin/users/[id]/points/route.ts`

**步驟：**
1. 創建文件並導入依賴
2. 實現POST方法（調整點數）
3. 測試API

### Task 6: 創建操作日誌API

**Files:**
- Create: `ceo-platform/src/app/api/admin/users/[id]/logs/route.ts`

**步驟：**
1. 創建文件並導入依賴
2. 實現GET方法（操作日誌）
3. 測試API

---

## 第4部分：前端頁面擴展

### Task 7: 擴展會員列表頁面

**Files:**
- Modify: `ceo-platform/src/app/admin/members/page.tsx`

**步驟：**
1. 轉換為客戶端組件
2. 添加搜尋和篩選功能
3. 添加分頁功能
4. 使用API獲取數據

### Task 8: 擴展會員詳情頁面

**Files:**
- Modify: `ceo-platform/src/app/admin/members/[id]/page.tsx`

**步驟：**
1. 添加點數調整對話框
2. 添加操作日誌顯示
3. 修復現有狀態更新組件

### Task 9: 創建點數調整對話框組件

**Files:**
- Create: `ceo-platform/src/components/admin/adjust-points-dialog.tsx`

**步驟：**
1. 創建對話框組件
2. 實現點數調整邏輯
3. 集成到會員詳情頁面

### Task 10: 創建操作日誌組件

**Files:**
- Create: `ceo-platform/src/components/admin/user-logs.tsx`

**步驟：**
1. 創建日誌顯示組件
2. 實現分頁和篩選
3. 集成到會員詳情頁面

---

## 實施時間估計

**總計：** 2-3小時
- 數據模型擴展：30分鐘
- API實現：60分鐘
- 前端擴展：60-90分鐘
- 測試和調試：30分鐘

**優先級：**
1. 數據模型和API（核心功能）
2. 會員列表頁面擴展
3. 會員詳情頁面擴展
4. 輔助組件

**風險：**
- 現有會員狀態更新組件依賴不存在的API
- 需要處理客戶端/伺服器組件轉換
- 需要確保與現有設計模式一致