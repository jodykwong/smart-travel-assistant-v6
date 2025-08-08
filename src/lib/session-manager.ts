/**
 * 会话管理器
 * 负责管理用户会话状态和进度广播
 */

import { TravelPlanningState, SessionId } from '@/types/travel-planning';
import { WebSocketManager } from '@/lib/websocket-manager';

// 会话状态存储
const sessionStates = new Map<string, TravelPlanningState>();

// WebSocket管理器实例
let wsManager: WebSocketManager | null = null;

/**
 * 初始化会话管理器
 */
export function initializeSessionManager(webSocketManager?: WebSocketManager): void {
  wsManager = webSocketManager || new WebSocketManager();
  console.log('📋 会话管理器已初始化');
}

/**
 * 更新会话状态
 */
export async function updateSessionState(
  sessionId: SessionId,
  updates: Partial<TravelPlanningState>
): Promise<void> {
  try {
    const currentState = sessionStates.get(sessionId) || createInitialState(sessionId);
    
    // 合并更新
    const newState: TravelPlanningState = {
      ...currentState,
      ...updates,
      updatedAt: new Date()
    };

    // 保存状态
    sessionStates.set(sessionId, newState);

    console.log(`📋 会话状态已更新: ${sessionId}`, {
      step: newState.currentStep,
      progress: newState.progress
    });

    // 广播状态更新
    if (wsManager) {
      await wsManager.broadcastToSession(sessionId, {
        type: 'state_update',
        sessionId,
        data: {
          currentStep: newState.currentStep,
          progress: newState.progress,
          status: newState.status,
          updatedAt: newState.updatedAt
        },
        timestamp: new Date()
      });
    }

  } catch (error) {
    console.error(`❌ 更新会话状态失败 (${sessionId}):`, error);
    throw error;
  }
}

/**
 * 广播进度更新
 */
export async function broadcastProgress(
  sessionId: SessionId,
  progress: {
    step: string;
    percentage: number;
    message: string;
    details?: any;
  }
): Promise<void> {
  try {
    console.log(`📡 广播进度更新: ${sessionId}`, progress);

    // 更新会话状态中的进度
    await updateSessionState(sessionId, {
      currentStep: progress.step,
      progress: progress.percentage,
      lastMessage: progress.message
    });

    // 发送进度广播
    if (wsManager) {
      await wsManager.broadcastToSession(sessionId, {
        type: 'progress_update',
        sessionId,
        data: {
          step: progress.step,
          percentage: progress.percentage,
          message: progress.message,
          details: progress.details,
          timestamp: new Date()
        },
        timestamp: new Date()
      });
    }

  } catch (error) {
    console.error(`❌ 广播进度失败 (${sessionId}):`, error);
    throw error;
  }
}

/**
 * 获取会话状态
 */
export function getSessionState(sessionId: SessionId): TravelPlanningState | null {
  return sessionStates.get(sessionId) || null;
}

/**
 * 创建初始会话状态
 */
function createInitialState(sessionId: SessionId): TravelPlanningState {
  return {
    sessionId,
    currentStep: 'initialization',
    progress: 0,
    status: 'active',
    userPreferences: {},
    regionData: [],
    regionPlans: [],
    finalPlan: null,
    errors: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      version: '1.0',
      source: 'session-manager'
    }
  };
}

/**
 * 删除会话状态
 */
export function removeSessionState(sessionId: SessionId): boolean {
  const existed = sessionStates.has(sessionId);
  sessionStates.delete(sessionId);
  
  if (existed) {
    console.log(`🗑️ 会话状态已删除: ${sessionId}`);
  }
  
  return existed;
}

/**
 * 获取所有活跃会话
 */
export function getActiveSessions(): string[] {
  return Array.from(sessionStates.keys());
}

/**
 * 清理过期会话
 */
export function cleanupExpiredSessions(maxAgeHours: number = 24): number {
  const now = new Date();
  const maxAge = maxAgeHours * 60 * 60 * 1000; // 转换为毫秒
  
  let cleanedCount = 0;
  
  for (const [sessionId, state] of sessionStates.entries()) {
    const age = now.getTime() - state.updatedAt.getTime();
    
    if (age > maxAge) {
      sessionStates.delete(sessionId);
      cleanedCount++;
      console.log(`🧹 清理过期会话: ${sessionId} (${Math.round(age / 1000 / 60 / 60)}小时前)`);
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 已清理 ${cleanedCount} 个过期会话`);
  }
  
  return cleanedCount;
}

/**
 * 广播错误信息
 */
export async function broadcastError(
  sessionId: SessionId,
  error: {
    code: string;
    message: string;
    details?: any;
  }
): Promise<void> {
  try {
    console.error(`❌ 会话错误 (${sessionId}):`, error);

    // 更新会话状态
    const currentState = getSessionState(sessionId);
    if (currentState) {
      await updateSessionState(sessionId, {
        errors: [...(currentState.errors || []), {
          ...error,
          timestamp: new Date()
        }],
        status: 'error'
      });
    }

    // 广播错误
    if (wsManager) {
      await wsManager.broadcastToSession(sessionId, {
        type: 'error',
        sessionId,
        data: {
          ...error,
          timestamp: new Date()
        },
        timestamp: new Date()
      });
    }

  } catch (broadcastError) {
    console.error(`❌ 广播错误失败 (${sessionId}):`, broadcastError);
  }
}

/**
 * 广播完成信息
 */
export async function broadcastCompletion(
  sessionId: SessionId,
  result: {
    type: 'plan_generated' | 'step_completed' | 'process_finished';
    data: any;
    message?: string;
  }
): Promise<void> {
  try {
    console.log(`✅ 会话完成 (${sessionId}):`, result.type);

    // 更新会话状态
    await updateSessionState(sessionId, {
      status: 'completed',
      progress: 100,
      lastMessage: result.message || '处理完成'
    });

    // 广播完成
    if (wsManager) {
      await wsManager.broadcastToSession(sessionId, {
        type: 'completion',
        sessionId,
        data: {
          ...result,
          timestamp: new Date()
        },
        timestamp: new Date()
      });
    }

  } catch (error) {
    console.error(`❌ 广播完成失败 (${sessionId}):`, error);
  }
}

/**
 * 获取会话统计信息
 */
export function getSessionStats(): {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  errorSessions: number;
} {
  let activeSessions = 0;
  let completedSessions = 0;
  let errorSessions = 0;

  for (const state of sessionStates.values()) {
    switch (state.status) {
      case 'active':
        activeSessions++;
        break;
      case 'completed':
        completedSessions++;
        break;
      case 'error':
        errorSessions++;
        break;
    }
  }

  return {
    totalSessions: sessionStates.size,
    activeSessions,
    completedSessions,
    errorSessions
  };
}
