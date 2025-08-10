/**
 * 智游助手v6.5 - 会话清理工具
 * 用于清理卡住的或失败的规划会话
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface CleanupSessionsResponse {
  success: boolean;
  data?: {
    cleanedSessions: string[];
    totalCleaned: number;
    message: string;
  };
  error?: {
    message: string;
    code: string;
  };
  timestamp: string;
}

// 模拟的会话存储（实际项目中应该使用数据库）
const sessions = new Map<string, any>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CleanupSessionsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      },
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('🧹 开始清理卡住的会话...');

    const { sessionId, cleanAll } = req.body;
    const cleanedSessions: string[] = [];

    if (sessionId) {
      // 清理特定会话
      console.log(`🎯 清理特定会话: ${sessionId}`);
      
      if (sessions.has(sessionId)) {
        sessions.delete(sessionId);
        cleanedSessions.push(sessionId);
        console.log(`✅ 已清理会话: ${sessionId}`);
      } else {
        console.log(`⚠️ 会话不存在: ${sessionId}`);
      }

    } else if (cleanAll) {
      // 清理所有失败或卡住的会话
      console.log('🧹 清理所有问题会话...');

      const currentTime = Date.now();
      const maxAge = 30 * 60 * 1000; // 30分钟

      for (const [id, session] of sessions.entries()) {
        const shouldClean = 
          session.status === 'failed' ||
          session.status === 'error' ||
          (session.status === 'processing' && (currentTime - session.createdAt) > maxAge);

        if (shouldClean) {
          sessions.delete(id);
          cleanedSessions.push(id);
          console.log(`🗑️ 已清理会话: ${id} (状态: ${session.status})`);
        }
      }

    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide sessionId or set cleanAll to true',
          code: 'INVALID_REQUEST'
        },
        timestamp: new Date().toISOString()
      });
    }

    const message = cleanedSessions.length > 0 
      ? `成功清理了 ${cleanedSessions.length} 个会话`
      : '没有找到需要清理的会话';

    console.log(`✅ 会话清理完成: ${message}`);

    return res.status(200).json({
      success: true,
      data: {
        cleanedSessions,
        totalCleaned: cleanedSessions.length,
        message
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 会话清理失败:', error);

    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to cleanup sessions',
        code: 'INTERNAL_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 获取会话统计信息
 */
export function getSessionStats() {
  const stats = {
    total: sessions.size,
    byStatus: {
      processing: 0,
      completed: 0,
      failed: 0,
      error: 0
    },
    oldSessions: 0
  };

  const currentTime = Date.now();
  const maxAge = 30 * 60 * 1000; // 30分钟

  for (const [id, session] of sessions.entries()) {
    const status = session.status || 'unknown';
    if (stats.byStatus[status] !== undefined) {
      stats.byStatus[status]++;
    }

    if ((currentTime - session.createdAt) > maxAge) {
      stats.oldSessions++;
    }
  }

  return stats;
}
