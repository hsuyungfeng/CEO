'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GripVertical, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPriceTiers } from '@/lib/pricing'

// Dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface PriceTier {
  id?: string
  minQty: number
  price: number
}

interface PriceTierFormProps {
  tiers: PriceTier[]
  onChange: (tiers: PriceTier[]) => void
  errors?: {
    minQty?: string
    price?: string
    ordering?: string
    duplicates?: string
  }
}

interface ValidationResult {
  isValid: boolean
  errors: {
    minQty?: string
    price?: string
    ordering?: string
    duplicates?: string
  }
}

function validateTiers(tiers: PriceTier[]): ValidationResult {
  const errors: ValidationResult['errors'] = {}
  
  // Check for empty tiers
  if (tiers.length === 0) {
    return {
      isValid: false,
      errors: { minQty: '至少需要一個價格階梯' }
    }
  }

  // Check individual tier validation
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]
    
    if (tier.minQty <= 0) {
      errors.minQty = errors.minQty 
        ? `${errors.minQty}; 第 ${i + 1} 個階梯的最小數量必須大於 0`
        : `第 ${i + 1} 個階梯的最小數量必須大於 0`
    }
    
    if (tier.price <= 0) {
      errors.price = errors.price
        ? `${errors.price}; 第 ${i + 1} 個階梯的價格必須大於 0`
        : `第 ${i + 1} 個階梯的價格必須大於 0`
    }
  }

  // Check ordering (must be ascending)
  const sortedByMinQty = [...tiers].sort((a, b) => a.minQty - b.minQty)
  for (let i = 0; i < sortedByMinQty.length; i++) {
    if (sortedByMinQty[i].minQty !== tiers[i].minQty) {
      errors.ordering = '價格階梯必須按最小數量遞增排序'
      break
    }
  }

  // Check for duplicate minQty values
  const minQtys = tiers.map(tier => tier.minQty)
  const uniqueMinQtys = new Set(minQtys)
  if (uniqueMinQtys.size !== minQtys.length) {
    errors.duplicates = '價格階梯的最小數量不能重複'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

function SortablePriceTierItem({ 
  tier, 
  index, 
  onUpdate, 
  onRemove, 
  errors 
}: { 
  tier: PriceTier
  index: number
  onUpdate: (index: number, field: keyof PriceTier, value: number) => void
  onRemove: (index: number) => void
  errors?: {
    minQty?: string
    price?: string
  }
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tier.id || `tier-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-4 p-4 bg-white border rounded-lg',
        isDragging && 'opacity-50 shadow-lg',
        errors && Object.keys(errors).length > 0 && 'border-red-300 bg-red-50'
      )}
    >
      <div
        className="cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`minQty-${index}`} className="text-sm font-medium">
            最低數量
          </Label>
          <Input
            id={`minQty-${index}`}
            type="number"
            min="1"
            value={tier.minQty}
            onChange={(e) => onUpdate(index, 'minQty', parseInt(e.target.value) || 0)}
            className={cn(errors?.minQty && 'border-red-500')}
          />
          {errors?.minQty && (
            <p className="mt-1 text-sm text-red-600">{errors.minQty}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor={`price-${index}`} className="text-sm font-medium">
            單價 (NT$)
          </Label>
          <Input
            id={`price-${index}`}
            type="number"
            min="0"
            step="0.01"
            value={tier.price}
            onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)}
            className={cn(errors?.price && 'border-red-500')}
          />
          {errors?.price && (
            <p className="mt-1 text-sm text-red-600">{errors.price}</p>
          )}
        </div>
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function PriceTierForm({ tiers, onChange, errors }: PriceTierFormProps) {
  const [showValidation, setShowValidation] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Compute validation when tiers change
  const validation = useMemo(() => validateTiers(tiers), [tiers])

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1]
    const newTier: PriceTier = {
      id: `new-${Date.now()}`,
      minQty: lastTier ? lastTier.minQty + 10 : 1,
      price: 0
    }
    onChange([...tiers, newTier])
  }

  const handleRemoveTier = (index: number) => {
    if (tiers.length > 1) {
      const newTiers = tiers.filter((_, i) => i !== index)
      onChange(newTiers)
    }
  }

  const handleUpdateTier = (index: number, field: keyof PriceTier, value: number) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    onChange(newTiers)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = tiers.findIndex(tier => (tier.id || `tier-${tiers.indexOf(tier)}`) === active.id)
      const newIndex = tiers.findIndex(tier => (tier.id || `tier-${tiers.indexOf(tier)}`) === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTiers = arrayMove(tiers, oldIndex, newIndex)
        onChange(newTiers)
      }
    }
  }

  const formattedTiers = formatPriceTiers(tiers)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>階梯定價</CardTitle>
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  驗證通過
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  驗證失敗
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validation Summary */}
          {showValidation && !validation.isValid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {validation.errors.minQty && <li>{validation.errors.minQty}</li>}
                  {validation.errors.price && <li>{validation.errors.price}</li>}
                  {validation.errors.ordering && <li>{validation.errors.ordering}</li>}
                  {validation.errors.duplicates && <li>{validation.errors.duplicates}</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Price Range Preview */}
          {formattedTiers.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">價格區間預覽</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {formattedTiers.map((tier, index) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="text-sm font-medium text-gray-900">{tier.range} 個</div>
                    <div className="text-lg font-bold text-blue-600">NT$ {tier.price.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">每單位</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drag and Drop Tiers */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tiers.map(tier => tier.id || `tier-${tiers.indexOf(tier)}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {tiers.map((tier, index) => (
                  <SortablePriceTierItem
                    key={tier.id || `tier-${index}`}
                    tier={tier}
                    index={index}
                    onUpdate={handleUpdateTier}
                    onRemove={handleRemoveTier}
                    errors={{
                      minQty: validation.errors.minQty?.includes(`第 ${index + 1}`) ? validation.errors.minQty : undefined,
                      price: validation.errors.price?.includes(`第 ${index + 1}`) ? validation.errors.price : undefined,
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTier}
              >
                <Plus className="mr-2 h-4 w-4" />
                新增價格區間
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowValidation(!showValidation)}
              >
                {showValidation ? '隱藏驗證' : '顯示驗證'}
              </Button>
            </div>
            
            <div className="text-sm text-gray-500">
              {tiers.length} 個價格區間
            </div>
          </div>

          {/* Help Text */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p className="font-medium mb-1">使用說明：</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>價格階梯必須按最小數量遞增排序（例如：1, 5, 10）</li>
              <li>最小數量不能重複</li>
              <li>價格必須大於 0</li>
              <li>拖拽左側把手可重新排序</li>
              <li>購買數量會自動匹配符合條件的最高階梯</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* External Errors */}
      {errors && Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {errors.minQty && <li>{errors.minQty}</li>}
              {errors.price && <li>{errors.price}</li>}
              {errors.ordering && <li>{errors.ordering}</li>}
              {errors.duplicates && <li>{errors.duplicates}</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}