"""
本地測試指令碼
========================================

用途：
- 驗證 TRELLIS.2 服務本地運行
- 測試生成端點
- 檢查模型輸出

使用方法：
  1. 確保 app.py 伺服器正在運行 (localhost:5001)
  2. 執行: python test_local.py
"""

import requests
import json
from pathlib import Path
from PIL import Image
import io
import sys

SERVICE_URL = "http://localhost:5001"

def test_health_check():
    """測試健康檢查端點"""
    print("\n✓ 測試健康檢查...")
    try:
        response = requests.get(f"{SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"  狀態: {data['status']}")
            print(f"  模型已載入: {data['model_loaded']}")
            print(f"  設備: {data['device']}")
            return True
        else:
            print(f"  ❌ 失敗: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ 連接失敗: {str(e)}")
        return False

def test_info():
    """測試服務資訊端點"""
    print("\n✓ 測試服務資訊...")
    try:
        response = requests.get(f"{SERVICE_URL}/info", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"  服務: {data['service']}")
            print(f"  版本: {data['version']}")
            print(f"  模型: {data['model_info']['name']}")
            print(f"  模型已下載: {data['model_info']['downloaded']}")
            return True
        else:
            print(f"  ❌ 失敗: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ 連接失敗: {str(e)}")
        return False

def create_test_image():
    """建立測試圖像"""
    img = Image.new('RGB', (256, 256), color='blue')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes

def test_generate():
    """測試生成端點"""
    print("\n✓ 測試 3D 生成...")
    try:
        test_image = create_test_image()
        files = {'image': ('test.png', test_image, 'image/png')}
        data = {'resolution': 512}

        response = requests.post(
            f"{SERVICE_URL}/generate",
            files=files,
            data=data,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            print(f"  狀態: {result['status']}")
            print(f"  Job ID: {result.get('job_id', 'N/A')}")
            print(f"  GLB 路徑: {result.get('glb_path', 'N/A')}")
            print(f"  USDZ 路徑: {result.get('usdz_path', 'N/A')}")

            # 驗證檔案是否存在
            if result.get('glb_path'):
                glb_exists = Path(result['glb_path']).exists()
                usdz_exists = Path(result.get('usdz_path', '')).exists()
                print(f"  GLB 檔案存在: {glb_exists}")
                print(f"  USDZ 檔案存在: {usdz_exists}")

            return result.get('job_id')
        else:
            print(f"  ❌ 失敗: {response.status_code}")
            print(f"  回應: {response.text}")
            return None
    except Exception as e:
        print(f"  ❌ 錯誤: {str(e)}")
        return None

def test_status(job_id):
    """測試狀態查詢端點"""
    print(f"\n✓ 測試狀態查詢 ({job_id})...")
    try:
        response = requests.get(f"{SERVICE_URL}/status/{job_id}", timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"  狀態: {result['status']}")
            print(f"  GLB 路徑: {result.get('glb_path', 'N/A')}")
            return True
        else:
            print(f"  ❌ 失敗: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ 錯誤: {str(e)}")
        return False

def main():
    """主測試流程"""
    print("=" * 60)
    print("🧪 TRELLIS.2 服務本地測試")
    print("=" * 60)

    print(f"\n📍 服務 URL: {SERVICE_URL}")

    # 執行測試
    if not test_health_check():
        print("\n❌ 無法連接到服務。請確保:")
        print("  1. app.py 伺服器正在運行")
        print("  2. 連接埠為 5001")
        sys.exit(1)

    test_info()

    job_id = test_generate()
    if job_id:
        test_status(job_id)
    else:
        print("\n⚠️  生成測試失敗")

    print("\n" + "=" * 60)
    print("✅ 測試完成")
    print("=" * 60)

if __name__ == "__main__":
    main()
