# B2B 团购系统（Group Buying）设计文档

> **Status**: ✅ 设计已批准
> **Architecture**: 方案 1 简化版 - 扩展 Order 模型
> **Timeline**: 3-4 周开发
> **Date**: 2026-02-28

---

## 1. 项目概述

### 目标
为 CEO Platform B2B 平台添加**团购聚合订购**功能，支持：
- 公司发起定期团购（限时截止）
- 小批发商自由加入选货
- 自动汇总计算并生成发票
- "先收最高额，结单回馈"的金流模式

### 核心特性
| 特性 | 说明 |
|------|------|
| **团购模式** | 限时团购 - 设置截止时间，时间到自动汇总 |
| **成员管理** | 公开团购 - 所有小批发商可见且自由加入 |
| **定价机制** | 阶梯优惠 - 利用现有 PriceTier，人多价便宜 |
| **发票生成** | 自动生成 - 时间到自动生成 DRAFT 发票供审核 |
| **返利机制** | 自动返利 - 按差额自动计算返点到账户 |
| **支付方式** | 现货现金 + 月结现金（继承 Phase 4） |

### 用户角色
- **公司（中盘商）**：发起团购、审核发票
- **小批发商**：加入团购、选货下单、接收返利

---

## 2. 数据库设计

### 2.1 Prisma Schema 修改

#### Order 模型扩展
```prisma
model Order {
  id              String    @id @default(cuid())
  userId          String
  totalAmount     Decimal   @db.Decimal(10, 2)
  status          OrderStatus
  paymentMethod   PaymentMethod
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // 团购相关字段（新增）
  groupId         String?   @db.String                    // 关联团购 ID
  groupStatus     GroupStatus?                            // INDIVIDUAL | GROUPED
  isGroupLeader   Boolean   @default(false)              // 是否是团长（公司）
  groupDeadline   DateTime?                               // 团购截止时间
  groupTotalItems Int?                                    // 该订单在团购中的件数
  groupRefund     Decimal?  @default(0) @db.Decimal(10,2) // 该订单应获返利

  // 关系
  user            User      @relation(fields: [userId], references: [id])
  items           OrderItem[]
  invoice         Invoice?  @relation(fields: [invoiceId], references: [id])
  invoiceId       String?

  @@index([groupId])
  @@index([userId])
  @@map("orders")
}

// 新增枚举
enum GroupStatus {
  INDIVIDUAL      // 个人订单
  GROUPED         // 团购订单
}
```

#### Invoice 模型扩展
```prisma
model Invoice {
  id              String    @id @default(cuid())
  // ... 现有字段 ...

  // 团购相关（新增）
  isGroupInvoice  Boolean   @default(false)              // 是否是团购汇总发票
  groupId         String?   @db.String                   // 关联团购 ID

  @@index([groupId])
  @@map("invoices")
}
```

### 2.2 数据关系图
```
Company (User)
    ↓
    └─ creates Group (Order with groupStatus=GROUPED, isGroupLeader=true)
       ↓
       ├─ Reseller 1 (User)
       │  └─ Order (groupStatus=GROUPED) → OrderItems → Invoice
       ├─ Reseller 2 (User)
       │  └─ Order (groupStatus=GROUPED) → OrderItems → Invoice
       └─ ...

Group汇总后生成：
       └─ Summary Invoice (isGroupInvoice=true) → [所有成员订单]
```

---

## 3. 核心业务流程

### 3.1 完整团购生命周期

```
┌─────────────────────────────────────────────────────────┐
│ 第一阶段：发起团购                                          │
└─────────────────────────────────────────────────────────┘
  1. 公司创建团购
     - POST /api/groups
     - groupStatus=GROUPED, isGroupLeader=true
     - 设置 groupDeadline（如当前时间+7天）
     - 返回 groupId

┌─────────────────────────────────────────────────────────┐
│ 第二阶段：成员加入（持续到截止时间）                        │
└─────────────────────────────────────────────────────────┘
  2. 小批发商查看进行中的团
     - GET /api/groups/active
     - 显示所有 groupDeadline > now() 的团

  3. 小批发商加入并下单
     - POST /api/groups/:groupId/join
     - Body: { items: [{productId, qty}, ...] }
     - 创建 Order: groupStatus=GROUPED, groupId=:groupId
     - 计算价格：按商品的分层价查询（考虑当前团的预期最高数量）
     - 按"最高额"预收
     - 返回 orderId, totalPrice

  4. 小批发商可修改订单（修改商品/数量）
     - PATCH /api/groups/:groupId/orders/:orderId
     - 重新计算价格
     - 调整预收金额

┌─────────────────────────────────────────────────────────┐
│ 第三阶段：自动汇总和发票生成                               │
└─────────────────────────────────────────────────────────┘
  5. 时间到自动汇总（或公司手动触发）
     - 触发机制：
       * (A) 定时任务：每分钟检查过期团购
       * (B) 手动触发：PATCH /api/groups/:groupId/finalize

     - 执行步骤：
       ① 查询所有 groupId=:groupId 的 Order
       ② 计算总件数：sum(groupTotalItems)
       ③ 按 PriceTier 重新计算实际应付金额
       ④ 计算返利：returnAmount = 预收总额 - 实际应付总额
       ⑤ 为每个成员的 Order 记录：groupRefund
       ⑥ 创建汇总 Invoice：isGroupInvoice=true
       ⑦ Invoice status=DRAFT（供公司审核）

  6. 公司审核发票
     - GET /api/groups/:groupId/invoice
     - 显示详细的汇总、返利明细
     - 确认无误则提交

┌─────────────────────────────────────────────────────────┐
│ 第四阶段：确认和返利                                       │
└─────────────────────────────────────────────────────────┘
  7. 公司确认发票
     - POST /api/groups/:groupId/invoice/confirm
     - Invoice status=SENT → CONFIRMED

  8. 自动返利到各成员账户
     - 返利机制：
       * 方式：自动返回差额到用户的"账户余额"或"积分"
       * 时机：发票确认后立即执行
       * 明细：每个成员可查看自己的 groupRefund

  9. 成员收到返利
     - 返利可用于：
       * 下次团购抵扣
       * 申请提现（如有此功能）
       * 积分兑换
```

### 3.2 金流示例

```
场景：5个批发商团购，商品价格阶梯如下
- 1-10件：$100/件
- 11-20件：$90/件
- 21+件：$80/件

预收阶段（各成员在各自不知道最终数量的情况下）：
  Reseller A: 3件 × $100 = $300 (按最高档预收)
  Reseller B: 5件 × $100 = $500
  Reseller C: 4件 × $100 = $400
  Reseller D: 6件 × $100 = $600
  Reseller E: 2件 × $100 = $200

  总预收：$2000

时间到汇总：
  总件数 = 3+5+4+6+2 = 20件 → 按 $90/件 计算
  实际应付 = 20 × $90 = $1800
  返利总额 = $2000 - $1800 = $200

返利分配（按件数比例）：
  Reseller A: 3/20 × $200 = $30
  Reseller B: 5/20 × $200 = $50
  Reseller C: 4/20 × $200 = $40
  Reseller D: 6/20 × $200 = $60
  Reseller E: 2/20 × $200 = $20
```

---

## 4. API 端点设计

### 4.1 团购管理（公司操作）

#### POST /api/groups
**创建团购**
```
Request:
  {
    "deadline": "2026-03-07T23:59:59Z",
    "description": "3月定期团购"
  }

Response:
  {
    "groupId": "group_001",
    "status": "ACTIVE",
    "deadline": "2026-03-07T23:59:59Z",
    "description": "3月定期团购",
    "createdAt": "2026-02-28T10:00:00Z",
    "memberCount": 0,
    "totalItems": 0
  }

Permission: 仅公司（ADMIN）可操作
```

#### GET /api/groups/:groupId
**查看团购详情**
```
Response:
  {
    "groupId": "group_001",
    "status": "ACTIVE|CLOSED|FINALIZED",
    "deadline": "...",
    "description": "...",
    "createdAt": "...",
    "memberCount": 5,
    "totalItems": 20,
    "estimatedTotalAmount": 2000,
    "members": [
      {
        "userId": "user_001",
        "name": "Reseller A",
        "orderId": "order_001",
        "itemCount": 3,
        "amount": 300,
        "status": "DRAFT"
      },
      ...
    ]
  }

Permission: 公司和团购成员可查看
```

#### PATCH /api/groups/:groupId/finalize
**手动结单（时间未到也可触发）**
```
Request: {}

Response:
  {
    "groupId": "group_001",
    "status": "FINALIZED",
    "totalItemsActual": 20,
    "totalAmountActual": 1800,
    "refundTotal": 200,
    "refundDistribution": [
      {
        "userId": "user_001",
        "refundAmount": 30
      },
      ...
    ],
    "invoiceId": "inv_001",
    "invoiceStatus": "DRAFT"
  }

Permission: 仅公司（ADMIN）可操作
```

### 4.2 批发商端点

#### GET /api/groups/active
**查看所有进行中的团**
```
Response:
  {
    "groups": [
      {
        "groupId": "group_001",
        "description": "3月定期团购",
        "deadline": "2026-03-07T23:59:59Z",
        "memberCount": 5,
        "totalItems": 20,
        "timeRemaining": "6 days"
      },
      ...
    ]
  }

Permission: 所有认证用户（小批发商）
```

#### POST /api/groups/:groupId/join
**加入团购，创建订单**
```
Request:
  {
    "items": [
      { "productId": "prod_001", "qty": 3 },
      { "productId": "prod_002", "qty": 2 }
    ]
  }

Response:
  {
    "orderId": "order_001",
    "groupId": "group_001",
    "items": [
      {
        "productId": "prod_001",
        "name": "商品A",
        "qty": 3,
        "unitPrice": 100,
        "subtotal": 300
      },
      ...
    ],
    "totalAmount": 500,
    "status": "DRAFT"
  }

Permission: 所有认证用户
Error:
  - groupId 不存在 → 404
  - groupId 已过期 → 409
  - 已经在该团中 → 409
```

#### PATCH /api/groups/:groupId/orders/:orderId
**修改订单内容**
```
Request:
  {
    "items": [
      { "productId": "prod_001", "qty": 5 },
      { "productId": "prod_003", "qty": 1 }
    ]
  }

Response:
  {
    "orderId": "order_001",
    "items": [...],
    "totalAmount": 600,
    "status": "DRAFT"
  }

Permission: 订单所有者或公司
Constraint: 仅可在 groupDeadline 之前修改
```

### 4.3 发票和结算

#### GET /api/groups/:groupId/invoice
**获取汇总发票（DRAFT 状态）**
```
Response:
  {
    "invoiceId": "inv_001",
    "groupId": "group_001",
    "status": "DRAFT",
    "isGroupInvoice": true,
    "lineItems": [
      {
        "groupMemberId": "user_001",
        "memberName": "Reseller A",
        "items": [
          {
            "productId": "prod_001",
            "name": "商品A",
            "qty": 3,
            "unitPrice": 100,
            "subtotal": 300,
            "finalUnitPrice": 90,
            "finalSubtotal": 270,
            "refund": 30
          }
        ],
        "memberTotal": 300,
        "memberFinal": 270,
        "memberRefund": 30
      },
      ...
    ],
    "totals": {
      "estimatedTotal": 2000,
      "actualTotal": 1800,
      "totalRefund": 200
    },
    "createdAt": "2026-03-08T00:00:00Z"
  }

Permission: 公司（ADMIN）
```

#### POST /api/groups/:groupId/invoice/confirm
**确认发票（状态 DRAFT → SENT）**
```
Request: {}

Response:
  {
    "invoiceId": "inv_001",
    "status": "SENT",
    "confirmedAt": "2026-03-08T10:30:00Z",
    "refundStatus": "PROCESSING"
  }

Side Effects:
  - Invoice status: DRAFT → SENT
  - 触发返利处理：为每个成员的 Order 记录 groupRefund
  - 可选：发送通知邮件给成员

Permission: 仅公司（ADMIN）
```

---

## 5. 数据流和状态管理

### 5.1 Order 状态机
```
DRAFT (个人订单)
  ↓
GROUPED (加入团购)
  ↓
CONFIRMED (团购汇总后确认)
  ↓
PAID (结算完成)
```

### 5.2 Invoice 状态机
```
DRAFT (汇总后，等公司审核)
  ↓
SENT (公司确认，准备结算)
  ↓
CONFIRMED (返利已发放)
  ↓
PAID (结算完成)
```

### 5.3 Group 状态机
```
ACTIVE (正常进行中)
  ↓
CLOSED (已超期或手动关闭)
  ↓
FINALIZED (汇总完成，发票已生成)
```

---

## 6. 关键业务规则

| 规则 | 说明 |
|------|------|
| **一次一团** | 小批发商在同一时间只能加入一个团购 |
| **不可重复加入** | 已加入的团不能再次加入 |
| **只有团长可确认** | 仅公司可确认发票，触发结算 |
| **自动超期** | 超过 deadline 的团自动转为 CLOSED |
| **阶梯自动计算** | 根据汇总后的总件数自动计算最终价格 |
| **返利自动分配** | 按件数比例自动分配返利金额 |
| **支付方式继承** | 保留现有的 CASH / MONTHLY_BILLING 选择 |

---

## 7. 技术实现清单

### 前端需求
- [ ] 公司端：团购创建表单（deadline 选择器）
- [ ] 公司端：团购管理页面（成员列表、实时统计）
- [ ] 公司端：发票审核和确认流程
- [ ] 批发商端：团购列表和详情页
- [ ] 批发商端：加入团购和修改订单的交互
- [ ] 批发商端：返利明细查看

### 后端需求
- [ ] Prisma migration：Order 和 Invoice 新增字段
- [ ] 团购 CRUD API：创建、查看、结单
- [ ] 成员加入 API：加入、修改订单
- [ ] 发票生成 API：自动汇总、计算返利
- [ ] 定时任务：每分钟检查并处理超期团购
- [ ] 权限控制：区分公司和批发商操作权限

### 测试需求
- [ ] 单元测试：价格计算、返利分配逻辑
- [ ] 集成测试：完整团购流程（5个成员）
- [ ] 边界测试：超期处理、重复加入、权限校验

---

## 8. 成功标准

- ✅ 团购功能完全独立，不影响现有订单流程
- ✅ 自动汇总和返利计算逻辑通过所有单元测试
- ✅ 完整团购流程（创建→加入→汇总→确认）可端到端运行
- ✅ 团长和成员的操作权限正确隔离
- ✅ 发票生成和状态转换符合规范
- ✅ 返利明细准确无误，支持多次验证

---

## 9. 技术架构决策

### 为什么选择方案 1（简化版）？
1. **复用现有 Order 和 Invoice 模型**：无需创建新表，减少破坏性变更
2. **快速实现**：3-4 周可完成，不阻塞其他工作
3. **充分支持业务需求**：团购逻辑在 Order 层实现，足以满足"先收后返"模式
4. **便于集成支付**：现有 CASH/MONTHLY_BILLING 选项继承使用
5. **降低测试成本**：利用现有的订单和发票测试基础设施

### 局限性和未来优化
- 如果团购功能后续需要高度定制化（如团购推荐、会员专属团等），建议升级到方案 2（独立模块）
- 如果并发性能成瓶颈（>1000并发成员），建议引入消息队列和事件驱动（方案 3）

---

## 10. 文档索引

- **实施计划**：见 `2026-02-28-group-buying-implementation.md`
- **API 文档**：见 `2026-02-28-group-buying-api.md`
- **测试计划**：见 `2026-02-28-group-buying-testing.md`

---

**Design Approved By**: User
**Design Date**: 2026-02-28
**Implementation Start**: 2026-03-01 (Target)
**Estimated Completion**: 2026-03-21 (3-4 weeks)
