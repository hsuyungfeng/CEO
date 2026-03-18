# 郵件認證系統設計文檔

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目標：** 建立完整的郵件認證系統，支援郵件驗證、郵件登入、密碼重設和兩因素驗證

**架構：** 擴充現有User模型，新增EmailVerification模型，整合現有郵件服務，實作完整的郵件認證流程，支援Web和Mobile雙平台

**技術棧：** Next.js 15, Prisma, PostgreSQL, 現有郵件服務 (Resend/SMTP), TypeScript, React Native

---

## 實施計劃

### Phase 1：基礎架構（2天）
- **Task 1.1**：資料庫Schema擴充與遷移
- **Task 1.2**：郵件服務擴充與配置
- **Task 1.3**：令牌管理服務實現
- **Task 1.4**：環境變數配置

### Phase 2：核心API（3天）
- **Task 2.1**：郵件驗證API（發送/驗證）
- **Task 2.2**：郵件登入API
- **Task 2.3**：密碼重設API
- **Task 2.4**：兩因素驗證API
- **Task 2.5**：速率限制中間件

### Phase 3：Web前端（2天）
- **Task 3.1**：郵件驗證頁面
- **Task 3.2**：兩因素驗證頁面
- **Task 3.3**：密碼重設流程頁面
- **Task 3.4**：現有登入/註冊頁面整合

### Phase 4：Mobile整合（2天）
- **Task 4.1**：Mobile郵件驗證頁面
- **Task 4.2**：Mobile 2FA頁面
- **Task 4.3**：共用認證Hook
- **Task 4.4**：深層連結支援

### Phase 5：測試與部署（1天）
- **Task 5.1**：單元測試與整合測試
- **Task 5.2**：端到端測試
- **Task 5.3**：安全審計
- **Task 5.4**：生產環境部署

---

## 詳細設計

### 1. 資料庫Schema擴充

```prisma
// 郵件驗證令牌模型
model EmailVerification {
  id        String   @id @default(cuid())
  email     String   @unique
  token     String   @unique
  purpose   EmailVerificationPurpose @default(VERIFY_EMAIL)
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@index([email])
  @@map("email_verifications")
}

// 郵件驗證用途枚舉
enum EmailVerificationPurpose {
  VERIFY_EMAIL      // 郵件驗證
  RESET_PASSWORD    // 密碼重設
  TWO_FACTOR        // 兩因素驗證
  CHANGE_EMAIL      // 變更郵件地址
}

// 擴充現有 User 模型
model User {
  // ... 現有欄位保持不變
  emailVerified    Boolean @default(false)
  twoFactorEnabled Boolean @default(false)
  emailVerifications EmailVerification[]
}
```

### 2. API端點結構

```
/api/auth/email/
├── send-verify/route.ts      # 發送驗證郵件
├── verify/route.ts           # 驗證郵件令牌
├── login/route.ts            # 郵件登入
├── reset-password/           # 密碼重設
│   ├── request/route.ts      # 請求密碼重設
│   └── confirm/route.ts      # 確認密碼重設
└── 2fa/                      # 兩因素驗證
    ├── enable/route.ts       # 啟用 2FA
    ├── disable/route.ts      # 停用 2FA
    └── verify/route.ts       # 驗證 2FA 代碼
```

### 3. 安全性設計

- **速率限制**：防止濫用（每郵件每小時最多5次）
- **令牌過期**：驗證令牌24小時，密碼重設1小時，2FA 10分鐘
- **錯誤處理**：統一的錯誤響應格式
- **審計日誌**：記錄所有認證相關操作

### 4. 用戶體驗

- **Web頁面**：響應式設計，即時反饋
- **Mobile整合**：深層連結，自動填充OTP
- **離線處理**：網路錯誤友好提示
- **多語言支援**：中文錯誤訊息

---

## 技術決策

### 郵件服務選擇
1. **Resend**（推薦）：現代化API，React Email整合
2. **SendGrid**：企業級功能，可靠但較貴
3. **自建SMTP**：完全控制，但維護複雜

### 令牌儲存策略
- **短期令牌**：記憶體儲存（Redis）
- **長期令牌**：資料庫儲存（PostgreSQL）
- **安全令牌**：加密儲存 + 哈希

### 前端狀態管理
- **Web**：React Context + localStorage
- **Mobile**：Zustand + Secure Storage
- **共用**：自定義Hook抽象層

---

## 成功指標

### 技術指標
- ✅ API響應時間 < 200ms
- ✅ 郵件發送成功率 > 99%
- ✅ 令牌驗證準確率 100%
- ✅ 零安全漏洞（通過審計）

### 業務指標
- 📈 郵件驗證完成率 > 80%
- 📈 用戶註冊轉化率提升
- 📈 帳戶安全性提升（減少未授權訪問）
- 📈 用戶滿意度（NPS調查）

---

## 下一步行動

1. **創建git worktree**：使用`superpowers:using-git-worktrees`創建隔離工作空間
2. **開始Phase 1實施**：從資料庫Schema擴充開始
3. **逐步驗收**：每個Phase完成後進行測試驗收

**準備好開始實施時，請告訴我！**