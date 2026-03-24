import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { logger } from '@/lib/logger'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaInstance: PrismaClient

if (!globalForPrisma.prisma) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // 連接池配置
    max: 20, // 最大連接數
    idleTimeoutMillis: 30000, // 空閒連接超時時間（30秒）
    connectionTimeoutMillis: 5000, // 連接超時時間（5秒）
  })

  const adapter = new PrismaPg(pool)

  // 根據環境配置日誌級別
  const getPrismaLogLevel = () => {
    const env = process.env.NODE_ENV
    const logLevel = process.env.PRISMA_LOG_LEVEL || 'error'
    
    if (env === 'test') {
      return [] // 測試環境不記錄日誌
    }
    
    if (env === 'production') {
      // 生產環境只記錄錯誤
      return ['error']
    }
    
    // 開發環境根據配置決定
    switch (logLevel.toLowerCase()) {
      case 'query':
        return ['query', 'error', 'warn']
      case 'info':
        return ['info', 'error', 'warn']
      case 'warn':
        return ['warn', 'error']
      case 'error':
        return ['error']
      default:
        return ['error']
    }
  }

  prismaInstance = new PrismaClient({
    adapter,
    log: getPrismaLogLevel(),
  })

  // 添加連接池監控中間件
  let totalQueries = 0
  let totalQueryTime = 0
  let activeQueries = 0
  let maxActiveQueries = 0
  
  // 定期報告連接池狀態
  if (process.env.NODE_ENV === 'development' || process.env.PRISMA_MONITOR_POOL === 'true') {
    setInterval(() => {
      const avgQueryTime = totalQueries > 0 ? totalQueryTime / totalQueries : 0
      logger.info({
        totalQueries,
        activeQueries,
        maxActiveQueries,
        avgQueryTime: Math.round(avgQueryTime),
        poolSize: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount
      }, 'Prisma 連接池狀態')
      
      // 重置計數器
      maxActiveQueries = Math.max(maxActiveQueries, activeQueries)
    }, 60000) // 每分鐘報告一次
  }

  // 添加查詢超時中間件（僅當 $use 方法存在時）
  if (prismaInstance.$use) {
    prismaInstance.$use(async (params: any, next: any) => {
      activeQueries++
      maxActiveQueries = Math.max(maxActiveQueries, activeQueries)
      const startTime = Date.now()
      const queryTimeout = parseInt(process.env.PRISMA_QUERY_TIMEOUT || '30000', 10) // 預設 30 秒
    
    try {
      // 設置查詢超時
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`查詢超時 (${queryTimeout}ms): ${params.model}.${params.action}`))
        }, queryTimeout)
      })

      // 執行查詢
      const result = await Promise.race([
        next(params),
        timeoutPromise,
      ])

      const duration = Date.now() - startTime
      
      // 記錄慢查詢（可配置閾值）
      const slowQueryThreshold = parseInt(process.env.PRISMA_SLOW_QUERY_THRESHOLD || '1000', 10)
      if (duration > slowQueryThreshold) {
        const logLevel = process.env.PRISMA_SLOW_QUERY_LOG_LEVEL || 'warn'
        const logData = {
          model: params.model,
          action: params.action,
          duration,
          threshold: slowQueryThreshold,
          args: JSON.stringify(params.args).substring(0, 500), // 限制日誌長度
          timestamp: new Date().toISOString()
        }
        
        // 根據配置記錄不同級別的日誌
        switch (logLevel.toLowerCase()) {
          case 'error':
            logger.error(logData, `慢查詢警告 (${duration}ms > ${slowQueryThreshold}ms)`)
            break
          case 'info':
            logger.info(logData, `慢查詢警告 (${duration}ms > ${slowQueryThreshold}ms)`)
            break
          default:
            logger.warn(logData, `慢查詢警告 (${duration}ms > ${slowQueryThreshold}ms)`)
        }
      }

      // 更新統計
      totalQueries++
      totalQueryTime += duration
      activeQueries--
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      // 更新統計（即使出錯）
      totalQueries++
      totalQueryTime += duration
      activeQueries--
      
      if (error instanceof Error && error.message.includes('查詢超時')) {
        logger.error({
          model: params.model,
          action: params.action,
          duration,
          timeout: queryTimeout,
          args: JSON.stringify(params.args).substring(0, 500),
        }, '查詢超時錯誤')
        
        // 拋出自定義錯誤
        throw new Error(`資料庫查詢超時: ${params.model}.${params.action} (${duration}ms)`)
      }
      
      logger.error({
        model: params.model,
        action: params.action,
        duration,
        error: error instanceof Error ? error.message : String(error),
      }, '資料庫查詢錯誤')
      
      throw error
    }
    })
  }

  // 添加連接池健康檢查（開發模式暫時禁用以測試 WebSocket）
  if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DB_HEALTH_CHECK === 'true') {
    setInterval(async () => {
      try {
        const poolStats = {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        }

        if (poolStats.waitingCount > 5) {
          logger.warn(poolStats, '資料庫連接池壓力過高')
        }

        // 執行簡單的健康檢查查詢
        await prismaInstance.$queryRaw`SELECT 1`
      } catch (error) {
        logger.error('資料庫健康檢查失敗:', error)
      }
    }, 60000) // 每分鐘檢查一次
  }

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance
  }
} else {
  prismaInstance = globalForPrisma.prisma
}

export const prisma = prismaInstance

// 導出連接池統計資訊函數
export async function getPoolStats() {
  const pool = (prisma as any).$adapter?.pool
  if (!pool) return null

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  }
}

// 導出健康檢查函數
export async function healthCheck() {
  try {
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const duration = Date.now() - startTime
    
    const poolStats = await getPoolStats()
    
    return {
      healthy: true,
      duration,
      poolStats,
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export default prisma