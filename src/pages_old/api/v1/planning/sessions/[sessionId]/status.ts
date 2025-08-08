/**
 * 智游助手v6.0 - 会话状态API
 * 专门用于获取会话状态的轻量级端点
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionManager } from '@/lib/database/session-manager';

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
  const { sessionId } = req.query;

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse(
      'Method not allowed',
      'METHOD_NOT_ALLOWED'
    ));
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json(createErrorResponse(
      'Invalid session ID',
      'INVALID_SESSION_ID'
    ));
  }

  try {
    console.log('📊 获取会话状态 (轻量级):', sessionId);

    // 从数据库获取会话信息
    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json(createErrorResponse(
        'Session not found',
        'SESSION_NOT_FOUND'
      ));
    }

    // 构建轻量级状态响应
    const statusResponse = {
      sessionId: session.id,
      status: session.status,
      progress: session.progress || 0,
      currentPhase: session.status === 'completed' ? 'completed' :
                   session.status === 'failed' ? 'error' :
                   session.status === 'processing' ? 'plan_region' : 'analyze_complexity',
      destination: session.destination,
      totalDays: session.preferences?.totalDays || 0,
      isCompleted: session.status === 'completed',
      hasError: session.status === 'failed',
      lastUpdated: session.updatedAt,
    };

    // 避免重复日志 - 只在状态变化时记录
    const currentTime = Date.now();
    const lastLogTime = global.lastStatusLogTime || 0;
    const timeDiff = currentTime - lastLogTime;
    
    if (timeDiff > 5000) { // 5秒内不重复记录
      console.log('✅ 状态获取成功:', {
        sessionId,
        status: statusResponse.status,
        progress: statusResponse.progress,
        phase: statusResponse.currentPhase,
      });
      global.lastStatusLogTime = currentTime;
    }

    return res.status(200).json(createSuccessResponse(statusResponse));

  } catch (error) {
    console.error('❌ 获取会话状态失败:', error);
    
    return res.status(500).json(createErrorResponse(
      'Failed to get session status',
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5),
      } : undefined
    ));
  }
}
