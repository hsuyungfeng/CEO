import { z } from 'zod';

// 聯絡訊息查詢參數 Schema
export const contactMessageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isRead: z.coerce.boolean().optional(),
  startDate: z.string().datetime('開始時間格式不正確').optional(),
  endDate: z.string().datetime('結束時間格式不正確').optional(),
});

// 聯絡訊息標記已讀 Schema
export const markAsReadSchema = z.object({
  isRead: z.boolean(),
});

// TypeScript 類型
export type ContactMessageQuerySchema = z.infer<typeof contactMessageQuerySchema>;
export type MarkAsReadSchema = z.infer<typeof markAsReadSchema>;