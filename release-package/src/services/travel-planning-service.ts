/**
 * 智游助手v5.0 - 旅行规划服务
 * 与LangGraph后端集成的核心业务逻辑
 */

import { api } from './api-client';
import type {
  TravelPreferencesForm,
  TravelPlanningState,
  PlanningProgress,
  CompleteTravelPlan,
  SessionId,
  APIResponse,
  RegionData,
  RegionPlan,
} from '@/types/travel-planning';

// ============= 服务接口定义 =============

export interface TravelPlanningService {
  // 会话管理
  createSession(preferences: TravelPreferencesForm): Promise<SessionId>;
  getSessionStatus(sessionId: SessionId): Promise<TravelPlanningState>;
  
  // 规划生成
  startPlanning(sessionId: SessionId): Promise<void>;
  cancelPlanning(sessionId: SessionId): Promise<void>;
  
  // 进度监控
  subscribeToProgress(
    sessionId: SessionId,
    callback: (progress: PlanningProgress) => void
  ): () => void;
  
  // 结果获取
  getPlanningResult(sessionId: SessionId): Promise<CompleteTravelPlan>;
  getRegionData(sessionId: SessionId, regionName: string): Promise<RegionData>;
  getRegionPlan(sessionId: SessionId, regionName: string): Promise<RegionPlan>;
  
  // 计划管理
  savePlan(plan: CompleteTravelPlan): Promise<string>;
  getUserPlans(userId: string): Promise<CompleteTravelPlan[]>;
  deletePlan(planId: string): Promise<void>;
}

// ============= 请求/响应类型 =============

interface CreateSessionRequest {
  preferences: TravelPreferencesForm;
  userId?: string;
}

interface CreateSessionResponse {
  sessionId: SessionId;
  estimatedDuration: number;
}

interface StartPlanningRequest {
  sessionId: SessionId;
  options?: {
    priority?: 'speed' | 'quality' | 'balanced';
    maxTokens?: number;
  };
}

interface PlanningStatusResponse {
  sessionId: SessionId;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentPhase: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

// ============= WebSocket管理器 =============

class WebSocketManager {
  private connections = new Map<SessionId, WebSocket>();
  private callbacks = new Map<SessionId, Set<(progress: PlanningProgress) => void>>();

  subscribe(
    sessionId: SessionId,
    callback: (progress: PlanningProgress) => void
  ): () => void {
    // 获取或创建WebSocket连接
    let ws = this.connections.get(sessionId);
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      ws = this.createConnection(sessionId);
      this.connections.set(sessionId, ws);
    }

    // 添加回调
    if (!this.callbacks.has(sessionId)) {
      this.callbacks.set(sessionId, new Set());
    }
    this.callbacks.get(sessionId)!.add(callback);

    // 返回取消订阅函数
    return () => {
      const callbacks = this.callbacks.get(sessionId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(sessionId);
          this.closeConnection(sessionId);
        }
      }
    };
  }

  private createConnection(sessionId: SessionId): WebSocket {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/ws/planning/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`WebSocket connected for session ${sessionId}`);
    };

    ws.onmessage = (event) => {
      try {
        const progress: PlanningProgress = JSON.parse(event.data);
        const callbacks = this.callbacks.get(sessionId);
        if (callbacks) {
          callbacks.forEach(callback => callback(progress));
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected for session ${sessionId}`);
      this.connections.delete(sessionId);
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
    };

    return ws;
  }

  private closeConnection(sessionId: SessionId): void {
    const ws = this.connections.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    this.connections.delete(sessionId);
  }

  cleanup(): void {
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.connections.clear();
    this.callbacks.clear();
  }
}

// ============= 服务实现 =============

class TravelPlanningServiceImpl implements TravelPlanningService {
  private readonly wsManager = new WebSocketManager();

  async createSession(preferences: TravelPreferencesForm): Promise<SessionId> {
    const response = await api.post<CreateSessionResponse>('/v1/planning/sessions', {
      preferences,
      userId: this.getCurrentUserId(),
    });

    if (!response.success || !response.data) {
      throw new Error('Failed to create planning session');
    }

    return response.data.sessionId;
  }

  async getSessionStatus(sessionId: SessionId): Promise<TravelPlanningState> {
    const response = await api.get<TravelPlanningState>(`/v1/planning/sessions/${sessionId}`);

    if (!response.success || !response.data) {
      throw new Error('Failed to get session status');
    }

    return response.data;
  }

  async startPlanning(sessionId: SessionId): Promise<void> {
    const response = await api.post<void>(`/v1/planning/sessions/${sessionId}/start`, {
      options: {
        priority: 'balanced',
        maxTokens: 8000, // DeepSeek API限制为8192，保留一些余量
      },
    });

    if (!response.success) {
      throw new Error('Failed to start planning');
    }
  }

  async cancelPlanning(sessionId: SessionId): Promise<void> {
    const response = await api.post<void>(`/v1/planning/sessions/${sessionId}/cancel`);

    if (!response.success) {
      throw new Error('Failed to cancel planning');
    }
  }

  subscribeToProgress(
    sessionId: SessionId,
    callback: (progress: PlanningProgress) => void
  ): () => void {
    return this.wsManager.subscribe(sessionId, callback);
  }

  async getPlanningResult(sessionId: SessionId): Promise<CompleteTravelPlan> {
    const response = await api.get<CompleteTravelPlan>(`/v1/planning/sessions/${sessionId}/result`);

    if (!response.success || !response.data) {
      throw new Error('Failed to get planning result');
    }

    return response.data;
  }

  async getRegionData(sessionId: SessionId, regionName: string): Promise<RegionData> {
    const response = await api.get<RegionData>(
      `/v1/planning/sessions/${sessionId}/regions/${encodeURIComponent(regionName)}/data`
    );

    if (!response.success || !response.data) {
      throw new Error(`Failed to get data for region: ${regionName}`);
    }

    return response.data;
  }

  async getRegionPlan(sessionId: SessionId, regionName: string): Promise<RegionPlan> {
    const response = await api.get<RegionPlan>(
      `/v1/planning/sessions/${sessionId}/regions/${encodeURIComponent(regionName)}/plan`
    );

    if (!response.success || !response.data) {
      throw new Error(`Failed to get plan for region: ${regionName}`);
    }

    return response.data;
  }

  async savePlan(plan: CompleteTravelPlan): Promise<string> {
    const response = await api.post<{ planId: string }>('/v1/plans', {
      ...plan,
      userId: this.getCurrentUserId(),
    });

    if (!response.success || !response.data) {
      throw new Error('Failed to save plan');
    }

    return response.data.planId;
  }

  async getUserPlans(userId: string): Promise<CompleteTravelPlan[]> {
    const response = await api.get<CompleteTravelPlan[]>(`/v1/users/${userId}/plans`);

    if (!response.success || !response.data) {
      throw new Error('Failed to get user plans');
    }

    return response.data;
  }

  async deletePlan(planId: string): Promise<void> {
    const response = await api.delete<void>(`/v1/plans/${planId}`);

    if (!response.success) {
      throw new Error('Failed to delete plan');
    }
  }

  private getCurrentUserId(): string {
    // 从认证上下文获取用户ID
    // 这里简化处理，实际应该从认证状态获取
    return 'current-user-id';
  }

  cleanup(): void {
    this.wsManager.cleanup();
  }
}

// ============= 导出实例 =============

export const travelPlanningService = new TravelPlanningServiceImpl();

// 清理资源（在应用卸载时调用）
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    travelPlanningService.cleanup();
  });
}
