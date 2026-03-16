'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Trash2, Plus, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ProductImage {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string;
  alt: string;
  sortOrder: number;
  isMain: boolean;
  uploadedAt: string;
}

interface Product {
  id: string;
  name: string;
}

export default function ProductImagesPage() {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageAlt, setImageAlt] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchImages();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products?limit=999');
      const result = await response.json();

      if (result.success && result.data.products) {
        setProducts(result.data.products);
        if (result.data.products.length > 0) {
          setSelectedProductId(result.data.products[0].id);
        }
      }
    } catch (error) {
      console.error('載入商品列表錯誤:', error);
    }
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/product-images');
      const result = await response.json();

      if (result.success) {
        setImages(result.data);
      } else {
        toast.error(result.error || '載入圖片失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('載入圖片錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('請選擇圖片文件');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('圖片大小不能超過 5MB');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUploadImage = async () => {
    if (!uploadFile || !selectedProductId) {
      toast.error('請選擇商品和圖片');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('productId', selectedProductId);
    formData.append('alt', imageAlt || uploadFile.name);

    try {
      const response = await fetch('/api/admin/product-images/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success('圖片上傳成功');
        setShowUploadDialog(false);
        setUploadFile(null);
        setImageAlt('');
        fetchImages();
      } else {
        toast.error(result.error || '上傳圖片失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('上傳圖片錯誤:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm('確認刪除此圖片？')) return;

    try {
      const response = await fetch(`/api/admin/product-images/${imageId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('圖片刪除成功');
        fetchImages();
      } else {
        toast.error(result.error || '刪除圖片失敗');
      }
    } catch (error) {
      toast.error('網絡錯誤，請稍後再試');
      console.error('刪除圖片錯誤:', error);
    }
  };

  const filteredImages = selectedProductId
    ? images.filter(img => img.productId === selectedProductId)
    : images;

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">載入圖片資料中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">產品圖片管理</h1>
          <p className="mt-2 text-gray-600">管理商品圖片庫</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchImages} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            上傳圖片
          </Button>
        </div>
      </div>

      {/* 篩選區域 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="product-select" className="text-sm mb-2 block">
                選擇商品
              </Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇商品" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 圖片統計 */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">總圖片數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">當前商品圖片</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredImages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">主圖片</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredImages.filter(img => img.isMain).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 圖片網格 */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedProductId
              ? `${products.find(p => p.id === selectedProductId)?.name} 的圖片`
              : '所有圖片'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredImages.map((image) => (
                <div key={image.id} className="group relative">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.imageUrl}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"%3E%3Cpath stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m2.5 12.5 7-7 7 7m0 0 7-7v9m0 0v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3m14-7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2.5"/%3E%3C/svg%3E';
                      }}
                    />
                  </div>

                  {/* 主圖片標籤 */}
                  {image.isMain && (
                    <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      主圖片
                    </div>
                  )}

                  {/* 操作按鈕（懸停時顯示） */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 圖片資訊 */}
                  <div className="mt-2 text-xs text-gray-600 truncate">
                    <p title={image.alt}>{image.alt}</p>
                    <p className="text-gray-400">
                      {new Date(image.uploadedAt).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {selectedProductId ? '此商品暫無圖片' : '暫無圖片'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 上傳圖片對話框 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上傳產品圖片</DialogTitle>
            <DialogDescription>
              選擇商品並上傳圖片（最大 5MB，支持 JPG、PNG、WebP）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 商品選擇 */}
            <div>
              <Label htmlFor="upload-product" className="mb-2 block">
                選擇商品 *
              </Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇商品" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 圖片上傳 */}
            <div>
              <Label htmlFor="image-file" className="mb-2 block">
                選擇圖片 *
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
                <input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="image-file" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {uploadFile ? uploadFile.name : '點擊或拖拽圖片到此'}
                  </p>
                </label>
              </div>
            </div>

            {/* 圖片描述 */}
            <div>
              <Label htmlFor="image-alt" className="mb-2 block">
                圖片描述（可選）
              </Label>
              <Input
                id="image-alt"
                placeholder="例如：產品正面圖"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
              />
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2">
              <Button
                onClick={handleUploadImage}
                disabled={!uploadFile || uploadingImage}
                className="flex-1"
              >
                {uploadingImage ? '上傳中...' : '上傳'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadFile(null);
                  setImageAlt('');
                }}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
