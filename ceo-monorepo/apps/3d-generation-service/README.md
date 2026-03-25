# TRELLIS.2 3D 生成微服務

一個 Flask 微服務，用於與 TRELLIS v1.3.1 模型互動，生成家具 3D 模型。

## 快速開始

### 前置條件

- Python 3.10 或更高版本
- GPU 支援（推薦 NVIDIA，至少 8GB VRAM）
- `huggingface-cli` 工具（用於下載模型）

### 安裝

1. 建立 Python 虛擬環境
```bash
python -m venv venv
source venv/bin/activate  # 在 Windows 上：venv\Scripts\activate
```

2. 安裝依賴項
```bash
pip install -r requirements.txt
```

3. 下載 TRELLIS.2 模型（9GB）
```bash
pip install huggingface-hub
huggingface-cli download VAST-AI-Research/TRELLIS-v1.3.1 --local-dir ./models
```

4. 建立環境檔案
```bash
cp .env.example .env
```

### 運行服務

```bash
python app.py
```

服務將在 `http://localhost:5001` 上啟動。

## API 端點

### 健康檢查
```
GET /health
```
返回服務狀態、模型載入情況、設備資訊。

### 生成 3D 模型
```
POST /generate
Content-Type: multipart/form-data

Request:
- image: 圖像檔案 (PNG/JPG)
- resolution: 輸出解析度（可選，預設 512）

Response:
{
  "status": "completed",
  "job_id": "abc12345",
  "glb_path": "/output/abc12345/model.glb",
  "usdz_path": "/output/abc12345/model.usdz",
  "metadata": {...}
}
```

### 查詢狀態
```
GET /status/<job_id>
```
返回指定任務的生成狀態與檔案路徑。

### 服務資訊
```
GET /info
```
返回詳細的服務資訊、模型詳情、可用端點。

## 本地測試

```bash
# 確保 app.py 正在運行，然後執行：
python test_local.py
```

測試會驗證：
- ✓ 健康檢查端點
- ✓ 服務資訊端點
- ✓ 生成端點
- ✓ 狀態查詢端點

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `TRELLIS_MODEL_PATH` | `./models` | 模型目錄 |
| `TRELLIS_OUTPUT_PATH` | `./output` | 輸出目錄 |
| `TRELLIS_SERVICE_PORT` | `5001` | 服務連接埠 |
| `TRELLIS_ENABLE_GPU` | `true` | 啟用 GPU |

## 架構

```
ceo-monorepo/apps/3d-generation-service/
├── app.py                  # Flask 主應用
├── requirements.txt        # Python 依賴項
├── .env.example           # 環境變數範例
├── test_local.py          # 本地測試指令碼
└── README.md              # 本檔案
```

## 模型資訊

- **名稱**: TRELLIS v1.3.1
- **來源**: https://huggingface.co/VAST-AI-Research/TRELLIS-v1.3.1
- **大小**: 約 9GB
- **輸入**: 單張家具圖像 (RGB)
- **輸出**: GLB (Web) + USDZ (iOS AR) 3D 模型

## 整合到主應用

主應用在 Task 15.3 (Bull Queue 整合) 中會呼叫此服務：

```typescript
// src/lib/services/3d-generation.service.ts
const response = await fetch(`${TRELLIS_SERVICE_URL}/generate`, {
  method: 'POST',
  body: formData  // 包含圖像
});
```

## 故障排除

**問題**: 模型不存在
```
❌ 模型不存在: ./models/trellis-v1.3.1
```
**解決方案**: 執行 `huggingface-cli download ...` 命令下載模型

**問題**: GPU 記憶體不足
**解決方案**: 使用 `TRELLIS_ENABLE_GPU=false` 改為 CPU 模式（較慢）

**問題**: 連接埠已被佔用
**解決方案**: 修改 `.env` 中的 `TRELLIS_SERVICE_PORT`

## 許可證

與 CEO 平台相同
