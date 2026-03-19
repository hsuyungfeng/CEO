/**
 * 游標分頁工具
 * 用於處理大量數據的分批次處理，避免記憶體爆炸
 */

import { Prisma, PrismaClient } from '@prisma/client'

/**
 * 游標分頁配置
 */
export interface CursorPaginationConfig<T> {
  /** 批次大小（每批次處理的記錄數） */
  batchSize: number
  /** 游標字段（通常是 id 或 createdAt） */
  cursorField: keyof T
  /** 初始游標值 */
  initialCursor?: string | number | Date
  /** 排序方向 */
  order: 'asc' | 'desc'
  /** 最大批次數（防止無限循環） */
  maxBatches?: number
  /** 批次處理回調函數 */
  processBatch: (batch: T[], batchIndex: number) => Promise<void>
  /** 批次處理前的回調函數 */
  beforeBatch?: (batchIndex: number) => Promise<void>
  /** 批次處理後的回調函數 */
  afterBatch?: (batch: T[], batchIndex: number) => Promise<void>
  /** 進度回調函數 */
  onProgress?: (processed: number, totalBatches: number, currentBatch: number) => void
}

/**
 * 通用游標分頁處理器
 */
export class CursorPagination<T> {
  private config: CursorPaginationConfig<T>
  private processedCount = 0
  private batchIndex = 0

  constructor(config: CursorPaginationConfig<T>) {
    this.config = {
      maxBatches: 1000, // 默認最大批次數
      ...config,
    }
  }

  /**
   * 執行游標分頁處理
   */
  async process(
    fetchBatch: (cursor: string | number | Date | undefined, batchSize: number) => Promise<T[]>
  ): Promise<{
    totalProcessed: number
    totalBatches: number
    success: boolean
    error?: Error
  }> {
    let cursor: string | number | Date | undefined = this.config.initialCursor
    let hasMore = true

    try {
      while (hasMore && this.batchIndex < (this.config.maxBatches || 1000)) {
        // 批次處理前回調
        if (this.config.beforeBatch) {
          await this.config.beforeBatch(this.batchIndex)
        }

        // 獲取當前批次數據
        const batch = await fetchBatch(cursor, this.config.batchSize)

        if (batch.length === 0) {
          hasMore = false
          break
        }

        // 處理當前批次
        await this.config.processBatch(batch, this.batchIndex)

        // 批次處理後回調
        if (this.config.afterBatch) {
          await this.config.afterBatch(batch, this.batchIndex)
        }

        // 更新游標（使用最後一條記錄的游標字段）
        const lastItem = batch[batch.length - 1]
        cursor = lastItem[this.config.cursorField] as string | number | Date

        // 更新計數器
        this.processedCount += batch.length
        this.batchIndex++

        // 進度回調
        if (this.config.onProgress) {
          this.config.onProgress(this.processedCount, this.batchIndex, this.batchIndex)
        }

        // 如果批次大小小於請求的大小，表示沒有更多數據
        if (batch.length < this.config.batchSize) {
          hasMore = false
        }
      }

      return {
        totalProcessed: this.processedCount,
        totalBatches: this.batchIndex,
        success: true,
      }
    } catch (error) {
      return {
        totalProcessed: this.processedCount,
        totalBatches: this.batchIndex,
        success: false,
        error: error as Error,
      }
    }
  }
}

/**
 * Prisma 游標分頁輔助函數
 */
export class PrismaCursorPagination {
  /**
   * 使用游標分頁處理供應商
   */
  static async processSuppliers(
    prisma: PrismaClient,
    where: Prisma.SupplierWhereInput,
    processBatch: (suppliers: Prisma.SupplierGetPayload<object>[]) => Promise<void>,
    options: {
      batchSize?: number
      include?: Prisma.SupplierInclude
      maxBatches?: number
      onProgress?: (processed: number, totalBatches: number, currentBatch: number) => void
    } = {}
  ) {
    const {
      batchSize = 100,
      include,
      maxBatches = 1000,
      onProgress,
    } = options

    const pagination = new CursorPagination<Prisma.SupplierGetPayload<object>>({
      batchSize,
      cursorField: 'id',
      order: 'asc',
      maxBatches,
      processBatch,
      onProgress,
    })

    return await pagination.process(async (cursor, limit) => {
      const whereClause: Prisma.SupplierWhereInput = {
        ...where,
        ...(cursor ? { id: { gt: cursor as string } } : {}),
      }

      return await prisma.supplier.findMany({
        where: whereClause,
        include,
        orderBy: { id: 'asc' },
        take: limit,
      })
    })
  }

  /**
   * 使用游標分頁處理供應商發票
   */
  static async processSupplierInvoices(
    prisma: PrismaClient,
    where: Prisma.SupplierInvoiceWhereInput,
    processBatch: (invoices: Prisma.SupplierInvoiceGetPayload<object>[]) => Promise<void>,
    options: {
      batchSize?: number
      include?: Prisma.SupplierInvoiceInclude
      maxBatches?: number
      onProgress?: (processed: number, totalBatches: number, currentBatch: number) => void
    } = {}
  ) {
    const {
      batchSize = 100,
      include,
      maxBatches = 1000,
      onProgress,
    } = options

    const pagination = new CursorPagination<Prisma.SupplierInvoiceGetPayload<object>>({
      batchSize,
      cursorField: 'id',
      order: 'asc',
      maxBatches,
      processBatch,
      onProgress,
    })

    return await pagination.process(async (cursor, limit) => {
      const whereClause: Prisma.SupplierInvoiceWhereInput = {
        ...where,
        ...(cursor ? { id: { gt: cursor as string } } : {}),
      }

      return await prisma.supplierInvoice.findMany({
        where: whereClause,
        include,
        orderBy: { id: 'asc' },
        take: limit,
      })
    })
  }

  /**
   * 使用游標分頁處理任何 Prisma 模型
   */
  static async processModel<T>(
    prisma: PrismaClient,
    model: string,
    where: Record<string, unknown>,
    processBatch: (items: T[]) => Promise<void>,
    options: {
      batchSize?: number
      include?: Record<string, unknown>
      maxBatches?: number
      cursorField?: string
      order?: 'asc' | 'desc'
      onProgress?: (processed: number, totalBatches: number, currentBatch: number) => void
    } = {}
  ) {
    const {
      batchSize = 100,
      include,
      maxBatches = 1000,
      cursorField = 'id',
      order = 'asc',
      onProgress,
    } = options

    const pagination = new CursorPagination<T>({
      batchSize,
      cursorField: cursorField as keyof T,
      order,
      maxBatches,
      processBatch,
      onProgress,
    })

    return await pagination.process(async (cursor, limit) => {
      const whereClause = {
        ...where,
        ...(cursor ? { [cursorField]: order === 'asc' ? { gt: cursor } : { lt: cursor } } : {}),
      }

      const orderBy = { [cursorField]: order }

      return await (prisma[model as keyof PrismaClient] as unknown as { findMany: (args: unknown) => Promise<T[]> }).findMany({
        where: whereClause,
        include,
        orderBy,
        take: limit,
      })
    })
  }
}

/**
 * 批次處理統計
 */
export interface BatchProcessingStats {
  totalProcessed: number
  totalBatches: number
  successCount: number
  errorCount: number
  errors: Array<{ itemId: string; error: string }>
  startTime: Date
  endTime?: Date
  durationMs?: number
}

/**
 * 批次處理器（帶錯誤處理和統計）
 */
export class BatchProcessor<T> {
  private stats: BatchProcessingStats = {
    totalProcessed: 0,
    totalBatches: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    startTime: new Date(),
  }

  /**
   * 批次處理項目
   */
  async processItems(
    items: T[],
    processItem: (item: T, index: number) => Promise<void>,
    options: {
      continueOnError?: boolean
      maxErrors?: number
      onItemProcessed?: (item: T, success: boolean, error?: Error) => void
    } = {}
  ) {
    const {
      continueOnError = true,
      maxErrors = 100,
      onItemProcessed,
    } = options

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      try {
        await processItem(item, i)
        this.stats.successCount++
        
        if (onItemProcessed) {
          onItemProcessed(item, true)
        }
      } catch (error) {
        this.stats.errorCount++
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.stats.errors.push({
          itemId: (item as Record<string, unknown>)['id'] as string || `item-${i}`,
          error: errorMsg,
        })

        if (onItemProcessed) {
          onItemProcessed(item, false, error as Error)
        }

        if (!continueOnError || this.stats.errorCount >= maxErrors) {
          throw error
        }
      }
    }

    this.stats.totalProcessed += items.length
    return this.stats
  }

  /**
   * 獲取處理統計
   */
  getStats(): BatchProcessingStats {
    const now = new Date()
    const durationMs = now.getTime() - this.stats.startTime.getTime()
    
    return {
      ...this.stats,
      endTime: now,
      durationMs,
    }
  }

  /**
   * 重置統計
   */
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      totalBatches: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      startTime: new Date(),
    }
  }
}

/**
 * 記憶體使用監控
 */
export class MemoryMonitor {
  private startMemory: NodeJS.MemoryUsage
  private peakMemory = 0

  constructor() {
    this.startMemory = process.memoryUsage()
    this.peakMemory = this.startMemory.heapUsed
  }

  /**
   * 檢查當前記憶體使用
   */
  checkMemory(): {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
    heapUsedMB: number
    heapTotalMB: number
    increaseSinceStart: number
    increaseSinceStartMB: number
    peakMemory: number
    peakMemoryMB: number
  } {
    const memory = process.memoryUsage()
    this.peakMemory = Math.max(this.peakMemory, memory.heapUsed)

    return {
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      rss: memory.rss,
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024 * 100) / 100,
      increaseSinceStart: memory.heapUsed - this.startMemory.heapUsed,
      increaseSinceStartMB: Math.round((memory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024 * 100) / 100,
      peakMemory: this.peakMemory,
      peakMemoryMB: Math.round(this.peakMemory / 1024 / 1024 * 100) / 100,
    }
  }

  /**
   * 檢查是否超過記憶體限制
   */
  isOverLimit(limitMB: number = 500): boolean {
    const memory = this.checkMemory()
    return memory.heapUsedMB > limitMB
  }

  /**
   * 強制垃圾回收（僅在 Node.js 中有效）
   */
  forceGC() {
    if (global.gc) {
      global.gc()
    }
  }
}

/**
 * 批次處理配置
 */
export interface BatchProcessingConfig {
  /** 批次大小 */
  batchSize: number
  /** 最大記憶體限制（MB） */
  maxMemoryMB?: number
  /** 批次間延遲（毫秒） */
  delayBetweenBatches?: number
  /** 是否啟用記憶體監控 */
  enableMemoryMonitoring?: boolean
  /** 是否在批次間強制垃圾回收 */
  forceGCBetweenBatches?: boolean
}

/**
 * 批次處理管理器
 */
export class BatchProcessingManager {
  private memoryMonitor?: MemoryMonitor
  private config: BatchProcessingConfig

  constructor(config: BatchProcessingConfig) {
    this.config = {
      maxMemoryMB: 500,
      delayBetweenBatches: 0,
      enableMemoryMonitoring: true,
      forceGCBetweenBatches: false,
      ...config,
    }

    if (this.config.enableMemoryMonitoring) {
      this.memoryMonitor = new MemoryMonitor()
    }
  }

  /**
   * 執行批次處理
   */
  async process<T>(
    fetchBatch: (skip: number, take: number) => Promise<T[]>,
    processBatch: (batch: T[], batchIndex: number) => Promise<void>,
    onProgress?: (processed: number, batchIndex: number) => void
  ): Promise<{
    totalProcessed: number
    totalBatches: number
    success: boolean
    memoryStats?: ReturnType<MemoryMonitor['checkMemory']>
  }> {
    let processed = 0
    let batchIndex = 0
    let hasMore = true

    try {
      while (hasMore) {
        // 檢查記憶體使用
        if (this.memoryMonitor && this.config.maxMemoryMB) {
          if (this.memoryMonitor.isOverLimit(this.config.maxMemoryMB)) {
            console.warn(`記憶體使用超過 ${this.config.maxMemoryMB}MB，暫停處理`)
            if (this.config.forceGCBetweenBatches) {
              this.memoryMonitor.forceGC()
            }
          }
        }

        // 獲取批次數據
        const batch = await fetchBatch(processed, this.config.batchSize)

        if (batch.length === 0) {
          hasMore = false
          break
        }

        // 處理批次
        await processBatch(batch, batchIndex)

        // 更新計數器
        processed += batch.length
        batchIndex++

        // 進度回調
        if (onProgress) {
          onProgress(processed, batchIndex)
        }

        // 批次間延遲
        if (this.config.delayBetweenBatches && this.config.delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches))
        }

        // 強制垃圾回收
        if (this.config.forceGCBetweenBatches && this.memoryMonitor) {
          this.memoryMonitor.forceGC()
        }

        // 如果批次大小小於請求的大小，表示沒有更多數據
        if (batch.length < this.config.batchSize) {
          hasMore = false
        }
      }

      return {
        totalProcessed: processed,
        totalBatches: batchIndex,
        success: true,
        memoryStats: this.memoryMonitor?.checkMemory(),
      }
    } catch (error) {
      return {
        totalProcessed: processed,
        totalBatches: batchIndex,
        success: false,
        memoryStats: this.memoryMonitor?.checkMemory(),
      }
    }
  }
}