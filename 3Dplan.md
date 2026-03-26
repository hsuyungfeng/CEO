# CEO 平台 - 3D 家具演示整合計畫 (TRELLIS.2)

**建立日期**: 2026-03-25
**狀態**: 初期規劃
**目標**: 集成 Microsoft TRELLIS.2 用於實時家具 3D 模型生成和預覽

---

## 1. TRELLIS.2 技術概述

### 核心特性
- **模型規模**: 40 億參數的生成式 AI 模型
- **輸入**: 家具產品圖片
- **輸出**: 完整紋理化 3D 模型 (512³ 分辨率 ~3 秒，1536³ ~60 秒)
- **材質支持**: PBR 物理基礎渲染（基礎色、粗糙度、金屬度、透明度）
- **幾何表示**: O-Voxel (開放式體素) - 支持非流形幾何、開放表面

### 技術架構
```
產品圖片 (JPG/PNG)
    ↓
[Sparse Structure Flow] → 基礎 3D 結構
    ↓
[Shape Latent Flow] → 幾何細節優化
    ↓
[Texture Latent Flow] → PBR 材質生成
    ↓
完整 3D 模型 (OBJ/GLB/USDZ)
```

### 推理性能
| 分辨率 | 生成時間 | GPU 要求 |
|--------|---------|---------|
| 512³ | ~3 秒 | RTX 4090 / H100 |
| 1024³ | ~15 秒 | H100 |
| 1536³ | ~60 秒 | H100 |

---

## 2. CEO 平台整合架構

### 2.1 系統架構圖

```
┌─────────────────────────────────────────────────────────┐
│                    CEO B2B 平台                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐     ┌──────────────┐    ┌──────────┐  │
│  │ 供應商後台   │────▶│ 產品管理     │───▶│3D生成   │  │
│  │ (上傳家具圖) │     │ (產品圖片)   │    │服務     │  │
│  └──────────────┘     └──────────────┘    └────┬─────┘  │
│                                                  │       │
│  ┌──────────────┐     ┌──────────────┐    ┌────▼─────┐  │
│  │ 採購會員     │────▶│ 產品詳情頁   │◀───│ TRELLIS. │  │
│  │ (瀏覽家具)   │     │ (3D 預覽)    │    │ 2 API    │  │
│  └──────────────┘     └──────────────┘    └──────────┘  │
│                                                  ▲       │
│                         ┌──────────────────────┴──────┐  │
│                         │   3D 模型快取與最佳化       │  │
│                         │   (Redis / 本地存儲)        │  │
│                         └──────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 微服務組件

**A. 3D 生成服務** (`3d-generation-service`)
- 調用 TRELLIS.2 API
- 隊列管理 (非同步處理)
- 模型轉換與最佳化
- 快取管理

**B. 3D 渲染服務** (`3d-viewer-service`)
- Three.js / Babylon.js 集成
- 模型加載與顯示
- 材質應用與交互
- 性能優化

**C. 存儲服務** (`3d-storage-service`)
- 模型文件存儲 (S3/本地)
- 預生成縮圖
- 版本管理

---

## 3. 實施計畫 (Phases 15-17)

### Phase 15: TRELLIS.2 集成基礎 (1-2 周)

#### 15.1 環境設置
```bash
# Python 虛擬環境
python -m venv trellis-env
source trellis-env/bin/activate
pip install trellis-core huggingface-hub pillow numpy torch

# 模型下載 (9GB)
huggingface-cli download JeffreyXiang/TRELLIS-v1.3.1 \
  --repo-type model --local-dir ./models/trellis
```

#### 15.2 API 服務設置
```typescript
// ceo-monorepo/apps/3d-service/src/services/trellis-service.ts

interface TrellisRequest {
  imageUrl: string;
  productId: string;
  resolution: '512' | '1024' | '1536'; // default 512
  priority: 'low' | 'normal' | 'high';
}

interface TrellisResponse {
  modelUrl: string;
  textureUrls: {
    baseColor: string;
    roughness: string;
    metallic: string;
    opacity: string;
  };
  processingTime: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class TrellisService {
  async generateModel(request: TrellisRequest): Promise<TrellisResponse> {
    // 1. 驗證圖片
    // 2. 入隊處理
    // 3. 調用 TRELLIS.2
    // 4. 轉換格式 (GLB/USDZ)
    // 5. 存儲與快取
    // 6. 返回 URL
  }

  async generateTexture(modelId: string): Promise<PBRTextures> {
    // 生成 PBR 材質貼圖
  }

  async optimizeModel(modelPath: string): Promise<OptimizedModel> {
    // 網格優化、自動 LOD
  }
}
```

#### 15.3 資料庫模式擴展
```prisma
// schema.prisma 新增

model Product3DModel {
  id              String   @id @default(cuid())
  productId       String   @unique
  sourceImageUrl  String

  // 生成的模型
  modelFileUrl    String   @db.Text
  modelFormat     String   // 'glb', 'usdz', 'obj'

  // PBR 材質
  baseColorUrl    String   @db.Text
  roughnessUrl    String   @db.Text
  metallicUrl     String   @db.Text
  opacityUrl      String   @db.Text

  // 性能指標
  resolution      String   // '512', '1024', '1536'
  processingTime  Int      // milliseconds
  fileSize        Int      // bytes

  // 狀態追蹤
  status          String   @default("pending") // pending, processing, completed, failed
  generatedAt     DateTime @updatedAt

  product         Product  @relation(fields: [productId], references: [id])
}

model 3DGenerationQueue {
  id          String   @id @default(cuid())
  productId   String
  priority    String   @default("normal")
  status      String   @default("queued")

  // 重試機制
  attempts    Int      @default(0)
  maxRetries  Int      @default(3)
  lastError   String?

  createdAt   DateTime @default(now())
  startedAt   DateTime?
  completedAt DateTime?
}
```

---

### Phase 16: 前端整合與 UI/UX (1-2 周)

#### 16.1 產品詳情頁面擴展
```typescript
// apps/web/src/app/(auth)/products/[id]/page.tsx

export default function ProductDetailPage() {
  const [model3D, setModel3D] = useState<Product3DModel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 左側: 產品信息 */}
      <div>
        <ProductInfo product={product} />
        <PricingSection product={product} />
        <SpecsSection product={product} />
      </div>

      {/* 右側: 3D 模型預覽 */}
      <div className="sticky top-0 h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        {model3D ? (
          <Model3DViewer
            model={model3D}
            onTextureApplied={handleTextureApplied}
          />
        ) : (
          <GenerateModelButton
            productId={product.id}
            isLoading={isGenerating}
            onGenerate={handleGenerateModel}
            progress={loadingProgress}
          />
        )}
      </div>
    </div>
  );
}
```

#### 16.2 3D 查看器組件
```typescript
// apps/web/src/components/3d/Model3DViewer.tsx

interface Model3DViewerProps {
  model: Product3DModel;
  onTextureApplied?: () => void;
}

export function Model3DViewer({ model }: Model3DViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    // Three.js 場景設置
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    // 加載 GLB 模型
    new GLTFLoader().load(model.modelFileUrl, (gltf) => {
      const modelMesh = gltf.scene;

      // 應用 PBR 材質
      modelMesh.traverse((node) => {
        if (node instanceof THREE.Mesh && node.material) {
          const material = node.material as THREE.MeshStandardMaterial;

          // 加載貼圖
          new TextureLoader().load(model.baseColorUrl, (texture) => {
            material.map = texture;
            material.needsUpdate = true;
          });

          new TextureLoader().load(model.roughnessUrl, (texture) => {
            material.roughnessMap = texture;
            material.needsUpdate = true;
          });

          new TextureLoader().load(model.metallicUrl, (texture) => {
            material.metalnessMap = texture;
            material.needsUpdate = true;
          });
        }
      });

      scene.add(modelMesh);
    });

    // 光照設置
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // 渲染循環
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 交互控制
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;

    sceneRef.current = scene;
    mountRef.current?.appendChild(renderer.domElement);

    return () => {
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [model]);

  return <div ref={mountRef} className="w-full h-full" />;
}
```

#### 16.3 UI 組件
```typescript
// GenerateModelButton 組件
// - 顯示生成進度
// - 估計生成時間
// - 加載動畫
// - 錯誤重試

// ModelPresets 組件
// - 預設家具類型
// - 快速生成選項
// - 品質選擇 (512/1024/1536)
```

---

### Phase 17: 性能優化與生產部署 (1 周)

#### 17.1 性能最佳化
```typescript
// 1. 模型壓縮
//    - 自動 LOD 生成
//    - Draco 網格壓縮
//    - 紋理縮小

// 2. CDN 部署
//    - CloudFront / Cloudflare
//    - 邊緣緩存
//    - 地理位置優化

// 3. 隊列管理
//    - Bull Queue (Redis)
//    - 優先級排隊
//    - 自動重試
```

#### 17.2 監控與日誌
```typescript
// Sentry 集成
// - 錯誤追蹤
// - 性能監控

// CloudWatch 日誌
// - 生成時間統計
// - API 調用日誌
// - GPU 使用率
```

---

## 4. 技術棧決策

| 組件 | 選項 | 決策 | 原因 |
|-----|------|------|------|
| 3D 渲染 | Three.js / Babylon.js | Three.js | 生態系統豐富，家具渲染案例多 |
| 模型格式 | GLB / USDZ / OBJ | GLB + USDZ | 網頁標準 + iOS 支持 |
| 隊列系統 | Bull / RabbitMQ | Bull (Redis) | 現有 Redis 基礎設施 |
| GPU 部署 | AWS / GCP / 本地 | AWS (p3.2xlarge) | 靈活擴展，按使用付費 |
| 快取 | Redis / Memcached | Redis | 現有系統 |

---

## 5. 成本分析

### 基礎設施成本 (月度)
```
GPU 計算 (AWS p3.2xlarge):
  - 運行 8 小時/天: $600/月
  - 平均每個模型成本: $0.05 (512³ 分辨率)

存儲 (S3):
  - 10,000 模型 × 15MB: $150/月

CDN (CloudFront):
  - 1TB 傳輸: $85/月

總計: ~$835/月
```

### ROI 預期
```
新功能吸引: +15-20% 供應商上傳率
用戶轉化提升: +25% 採購會員購買轉化
訂閱升級: Premium 3D 家具預覽功能
```

---

## 6. 時程表

```
Week 1-2  (Phase 15): 環境設置、API 服務開發
Week 3-4  (Phase 16): 前端整合、UI 開發、測試
Week 5    (Phase 17): 性能優化、監控、生產部署

總時間: 5 周
關鍵里程碑:
  - Day 10: API 服務可用
  - Day 20: 功能完整、測試通過
  - Day 35: 生產環境上線
```

---

## 7. 依賴與風險

### 依賴
- ✅ 現有 PostgreSQL、Redis 基礎設施
- ⚠️ AWS 帳戶配置 + GPU 資源配額
- ⚠️ TRELLIS.2 模型授權 (MIT License ✅)

### 風險與緩解

| 風險 | 影響 | 緩解方案 |
|-----|------|---------|
| GPU 顯存不足 | 模型加載失敗 | 模型量化、分片加載、降級到 512³ |
| 生成速度慢 | 用戶體驗差 | 隊列 + 進度通知、預估等待時間 |
| 模型質量差 | 用戶滿意度低 | 圖片預處理、模型驗證、人工審核 |
| 成本超支 | 預算溢出 | 按需擴展、使用量限制、分級服務 |

---

## 8. 下一步行動

### 立即行動 (本周) ✅ 完成
- [x] 測試 TRELLIS.2 本地部署框架
- [x] 設計 API 契約與數據模型
- [x] 完成 Phase 15 實施 (Task 15.1-15.5)
- [x] 建立 E2E 測試 (11 個測試案例)

### 短期行動 (本周 - 下周)
- [ ] 執行 `pnpm db:push` 套用新 schema
- [ ] 啟動 Redis + Bull Queue worker
- [ ] 下載 TRELLIS.2 9GB 模型 (實際推論)
- [ ] 進行本地端到端測試

### Phase 16 準備 (下周)
- [ ] 開始 Phase 16: 前端整合與 UI/UX
- [ ] 實裝 3D 查看器元件 (Three.js)
- [ ] 產品詳情頁面 3D 預覽區域
- [ ] 生成進度顯示與交互

---

**狀態**: Phase 15 完成 ✅，準備進行 Phase 16
**責任人**: 開發團隊
**最後更新**: 2026-03-26
**下次審查**: 2026-03-31
