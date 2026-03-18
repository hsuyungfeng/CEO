import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EditProductForm from '@/components/admin/edit-product-form'

interface EditProductPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: {
      id: id,
    },
    include: {
      category: true,
      firm: true,
      priceTiers: {
        orderBy: {
          minQty: 'asc',
        },
      },
    },
  })

  if (!product) {
    notFound()
  }

  // 獲取分類和廠商列表
  const [categories, firms] = await Promise.all([
    prisma.category.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
    }),
    prisma.firm.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">編輯商品</h1>
        <p className="mt-2 text-gray-600">編輯商品資訊與定價</p>
      </div>

      <EditProductForm 
        product={product} 
        categories={categories} 
        firms={firms} 
      />
    </div>
  )
}