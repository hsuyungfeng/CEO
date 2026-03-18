'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, TrendingDown, Clock, Shield, ArrowRight, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  unit: string;
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [featuredRes, latestRes] = await Promise.all([
          fetch('/api/products?featured=true&limit=4'),
          fetch('/api/products?sortBy=createdAt&order=desc&limit=4')
        ]);

        if (!featuredRes.ok || !latestRes.ok) {
          throw new Error('載入商品失敗');
        }

        const featuredData = await featuredRes.json();
        const latestData = await latestRes.json();

        setFeaturedProducts(featuredData.data || []);
        setLatestProducts(latestData.data || []);
      } catch (error) {
        toast.error('載入商品時發生錯誤');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground py-20 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-grid-white/5 opacity-20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-40 -mt-40" />

        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">CEO 團購電商平台</h1>
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto opacity-95 leading-relaxed">
            專為醫療機構打造的專業團購平台
            <br />
            享受量大價優的採購體驗
          </p>

          <form action="/products" method="get" className="max-w-2xl mx-auto">
            <div className="relative">
              <Input
                type="text"
                name="search"
                placeholder="搜尋商品..."
                className="py-4 px-6 text-base rounded-full shadow-xl bg-white text-foreground placeholder-muted-foreground"
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 rounded-full h-10 px-6"
              >
                <Search className="h-5 w-5 mr-2" />
                搜尋
              </Button>
            </div>
          </form>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="rounded-full">
              <Link href="/products">
                瀏覽全部商品
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Featured Products */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">熱門商品</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                 <Card key={product.id} className="overflow-hidden">
                   <div className="relative h-48 bg-gray-200">
                     {product.image ? (
                       <Image
                         src={product.image}
                         alt={product.name}
                         fill
                         className="object-cover"
                         sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                       />
                     ) : (
                       <div className="flex items-center justify-center h-full text-gray-400">
                         <Package className="h-12 w-12" />
                       </div>
                     )}
                   </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>
                      <span className="text-destructive font-bold">${product.price}</span>
                      <span className="ml-2 text-gray-600">/{product.unit}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" asChild>
                      <Link href={`/products/${product.id}`}>
                        查看詳情
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 py-8">
                暫無熱門商品
              </div>
            )}
          </div>
        </section>

        {/* Latest Products */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">最新商品</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {latestProducts.length > 0 ? (
              latestProducts.map((product) => (
                 <Card key={product.id}>
                   <div className="relative h-48 bg-gray-200">
                     {product.image ? (
                       <Image
                         src={product.image}
                         alt={product.name}
                         fill
                         className="object-cover"
                         sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                       />
                     ) : (
                       <div className="flex items-center justify-center h-full text-gray-400">
                         <Package className="h-12 w-12" />
                       </div>
                     )}
                   </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>
                      <span className="text-destructive font-bold">${product.price}</span>
                      <span className="ml-2 text-gray-600">/{product.unit}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" asChild>
                      <Link href={`/products/${product.id}`}>
                        查看詳情
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 py-8">
                暫無最新商品
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t">
          <h2 className="text-3xl font-bold mb-12 text-center">平台優勢</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-primary/10 rounded-full">
                <TrendingDown className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">量大價優</h3>
              <p className="text-gray-600">階梯式定價，採購越多價格越優惠</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-warning/10 rounded-full">
                <Clock className="h-7 w-7 text-warning" />
              </div>
              <h3 className="text-xl font-bold mb-3">限時團購</h3>
              <p className="text-gray-600">精選商品限時團購，把握最佳採購時機</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-success/10 rounded-full">
                <Shield className="h-7 w-7 text-success" />
              </div>
              <h3 className="text-xl font-bold mb-3">品質保證</h3>
              <p className="text-gray-600">嚴格篩選合作廠商，確保商品品質</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 opacity-20" />
        <div className="container relative mx-auto px-4 text-center">
          <Skeleton className="h-16 w-3/4 mx-auto mb-6 bg-primary/20 rounded-lg" />
          <Skeleton className="h-8 w-2/3 mx-auto mb-12 bg-primary/20 rounded-lg" />
          <Skeleton className="h-12 w-1/2 mx-auto rounded-full bg-primary/20" />
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">熱門商品</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">最新商品</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
