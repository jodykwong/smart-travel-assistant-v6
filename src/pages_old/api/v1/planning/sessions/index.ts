/**
 * 智游助手v5.0 - 规划会话API
 * 创建新的旅行规划会话
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getSessionManager } from '@/lib/database/session-manager';

// 请求验证Schema
const CreateSessionRequestSchema = z.object({
  preferences: z.object({
    destination: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    groupSize: z.number().min(1).max(20),
    budget: z.enum(['budget', 'mid-range', 'luxury', 'premium']),
    travelStyles: z.array(z.enum(['adventure', 'culture', 'relaxation', 'food', 'nature', 'shopping'])),
    accommodation: z.enum(['hotel', 'hostel', 'bnb', 'resort', 'camping', 'rv', 'other']),
    specialRequirements: z.string().optional(),
  }),
  userId: z.string().optional(),
});

// 统一响应格式
function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

function createErrorResponse(message: string, code: string, details?: any) {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      console.log('📝 创建规划会话请求:', req.body);

      // 验证请求体
      const validationResult = CreateSessionRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error('❌ 请求验证失败:', validationResult.error);
        return res.status(400).json(createErrorResponse(
          'Invalid request body',
          'VALIDATION_ERROR',
          validationResult.error.errors
        ));
      }

      const { preferences, userId = 'anonymous' } = validationResult.data;

      // 计算旅行天数
      const startDate = new Date(preferences.startDate);
      const endDate = new Date(preferences.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`📅 计算旅行天数: ${totalDays}天 (${preferences.startDate} 到 ${preferences.endDate})`);

      // 使用数据库持久化创建会话
      console.log('💾 创建数据库会话记录...');

      const sessionManager = getSessionManager();
      const session = sessionManager.createSession({
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        destination: preferences.destination,
        preferences: {
          ...preferences,
          totalDays,
        },
      });
      
      console.log('✅ 会话创建成功:', {
        sessionId: session.id,
        destination: session.destination,
        totalDays,
      });

      // 返回会话信息
      return res.status(201).json(createSuccessResponse({
        sessionId: session.id,
        destination: session.destination,
        totalDays,
        estimatedDuration: Math.min(totalDays * 30, 300), // 预计30秒/天，最多5分钟
      }, '会话创建成功'));

    } catch (error) {
      console.error('❌ 创建会话失败:', error);
      
      return res.status(500).json(createErrorResponse(
        'Failed to create session',
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5),
        } : undefined
      ));
    }
  }

  if (req.method === 'GET') {
    try {
      // 获取会话列表
      console.log('📋 获取会话列表');

      const sessionManager = getSessionManager();
      const sessions = sessionManager.getAllSessions(50); // 获取最近50个会话

      return res.status(200).json(createSuccessResponse({
        sessions: sessions.map(session => ({
          sessionId: session.id,
          destination: session.destination,
          status: session.status,
          progress: session.progress,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })),
      }));

    } catch (error) {
      console.error('❌ 获取会话列表失败:', error);
      
      return res.status(500).json(createErrorResponse(
        'Failed to get sessions',
        'INTERNAL_ERROR'
      ));
    }
  }

  // 不支持的方法
  return res.status(405).json(createErrorResponse(
    'Method not allowed',
    'METHOD_NOT_ALLOWED'
  ));
}
