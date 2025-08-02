/**
 * 智游助手v5.0 - 会话详情API
 * 获取和更新特定会话的状态
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json(createErrorResponse(
      'Invalid session ID',
      'INVALID_SESSION_ID'
    ));
  }

  if (req.method === 'GET') {
    try {
      console.log('📋 获取会话状态:', sessionId);

      // 从数据库获取会话信息
      const sessionManager = getSessionManager();
      const session = sessionManager.getSession(sessionId);

      if (!session) {
        return res.status(404).json(createErrorResponse(
          'Session not found',
          'SESSION_NOT_FOUND'
        ));
      }

      // 构建会话状态响应
      let sessionState = {
        sessionId: session.id,
        destination: session.destination,
        totalDays: session.preferences?.totalDays || 0,
        startDate: session.preferences?.startDate || '',
        endDate: session.preferences?.endDate || '',
        userPreferences: session.preferences || {},
        regions: [],
        currentRegionIndex: 0,
        currentPhase: session.status === 'completed' ? 'completed' :
                     session.status === 'failed' ? 'error' :
                     session.status === 'processing' ? 'plan_region' : 'analyze_complexity',
        realData: {},
        regionPlans: {},
        progress: session.progress || 0,
        errors: [],
        retryCount: 0,
        qualityScore: 0,
        tokensUsed: 0,
        tokensRemaining: 20000,
        masterPlan: null,
        htmlOutput: null,
        result: session.result,
      };

      console.log('✅ 会话状态获取成功:', {
        sessionId,
        destination: sessionState.destination,
        phase: sessionState.currentPhase,
        progress: sessionState.progress,
      });

      return res.status(200).json(createSuccessResponse(sessionState));

    } catch (error) {
      console.error('❌ 获取会话状态失败:', error);
      
      return res.status(500).json(createErrorResponse(
        'Failed to get session state',
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5),
        } : undefined
      ));
    }
  }

  if (req.method === 'PUT') {
    try {
      console.log('📝 更新会话状态:', sessionId, req.body);

      const updates = req.body;

      // 更新数据库中的会话
      const sessionManager = getSessionManager();
      const updatedSession = sessionManager.updateSession(sessionId, {
        status: updates.status,
        progress: updates.progress,
        result: updates.result,
      });

      if (!updatedSession) {
        return res.status(404).json(createErrorResponse(
          'Session not found',
          'SESSION_NOT_FOUND'
        ));
      }

      console.log('✅ 会话状态更新成功');

      return res.status(200).json(createSuccessResponse({
        sessionId: updatedSession.id,
        status: updatedSession.status,
        progress: updatedSession.progress,
      }, '会话状态更新成功'));

    } catch (error) {
      console.error('❌ 更新会话状态失败:', error);
      
      return res.status(500).json(createErrorResponse(
        'Failed to update session state',
        'INTERNAL_ERROR'
      ));
    }
  }

  if (req.method === 'DELETE') {
    try {
      console.log('🗑️ 删除会话:', sessionId);

      const sessionManager = getSessionManager();
      const deleted = sessionManager.deleteSession(sessionId);

      if (!deleted) {
        return res.status(404).json(createErrorResponse(
          'Session not found',
          'SESSION_NOT_FOUND'
        ));
      }

      console.log('✅ 会话删除成功');

      return res.status(200).json(createSuccessResponse(
        { sessionId },
        '会话删除成功'
      ));

    } catch (error) {
      console.error('❌ 删除会话失败:', error);
      
      return res.status(500).json(createErrorResponse(
        'Failed to delete session',
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
