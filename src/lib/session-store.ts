/**
 * 智游助手v5.0 - 内存会话存储
 * 简化的会话管理，用于测试LLM调用
 */

interface SessionData {
  id: string;
  destination: string;
  preferences: any;
  status: 'created' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  createdAt: string;
  updatedAt: string;
}

class SessionStore {
  private sessions: Map<string, SessionData> = new Map();

  createSession(sessionData: Omit<SessionData, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'>): SessionData {
    const session: SessionData = {
      ...sessionData,
      id: sessionData.id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'created',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);
    console.log(`📝 会话已存储: ${session.id}`);
    return session;
  }

  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    console.log(`📋 获取会话: ${sessionId} - ${session ? '找到' : '未找到'}`);
    return session || null;
  }

  updateSession(sessionId: string, updates: Partial<SessionData>): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`❌ 更新失败，会话不存在: ${sessionId}`);
      return null;
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, updatedSession);
    console.log(`✅ 会话已更新: ${sessionId} - 状态: ${updatedSession.status}, 进度: ${updatedSession.progress}%`);
    return updatedSession;
  }

  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    console.log(`🗑️ 删除会话: ${sessionId} - ${deleted ? '成功' : '失败'}`);
    return deleted;
  }

  getAllSessions(): SessionData[] {
    return Array.from(this.sessions.values());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

// 全局单例实例
export const sessionStore = new SessionStore();
export type { SessionData };
