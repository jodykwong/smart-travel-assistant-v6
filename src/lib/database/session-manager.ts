/**
 * 智游助手v5.0 - 数据库会话管理器
 * 提供持久化的会话管理功能
 */

import Database from 'better-sqlite3';
import path from 'path';

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

class DatabaseSessionManager {
  private db!: Database.Database;
  private dbPath: string;

  constructor() {
    // 使用项目根目录下的数据库文件
    this.dbPath = path.join(process.cwd(), 'data', 'sessions.db');
    this.initializeDatabase();
  }

  private initializeDatabase() {
    try {
      // 确保数据目录存在
      const fs = require('fs');
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new Database(this.dbPath);
      
      // 创建会话表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          destination TEXT NOT NULL,
          preferences TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'created',
          progress INTEGER NOT NULL DEFAULT 0,
          result TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建索引
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
        CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
      `);

      console.log('✅ 数据库会话管理器初始化成功');
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  createSession(sessionData: Omit<SessionData, 'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'>): SessionData {
    try {
      const session: SessionData = {
        ...sessionData,
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'created',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, destination, preferences, status, progress, result, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        session.id,
        session.destination,
        JSON.stringify(session.preferences),
        session.status,
        session.progress,
        session.result ? JSON.stringify(session.result) : null,
        session.createdAt,
        session.updatedAt
      );

      console.log(`📝 会话已创建: ${session.id}`);
      return session;
    } catch (error) {
      console.error('❌ 创建会话失败:', error);
      throw error;
    }
  }

  getSession(sessionId: string): SessionData | null {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM sessions WHERE id = ?
      `);

      const row = stmt.get(sessionId) as any;
      
      if (!row) {
        console.log(`📋 会话不存在: ${sessionId}`);
        return null;
      }

      const session: SessionData = {
        id: row.id,
        destination: row.destination,
        preferences: JSON.parse(row.preferences),
        status: row.status,
        progress: row.progress,
        result: row.result ? JSON.parse(row.result) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      console.log(`📋 获取会话: ${sessionId} - 状态: ${session.status}`);
      return session;
    } catch (error) {
      console.error('❌ 获取会话失败:', error);
      return null;
    }
  }

  updateSession(sessionId: string, updates: Partial<SessionData>): SessionData | null {
    try {
      const existingSession = this.getSession(sessionId);
      if (!existingSession) {
        console.log(`❌ 更新失败，会话不存在: ${sessionId}`);
        return null;
      }

      const updatedSession = {
        ...existingSession,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const stmt = this.db.prepare(`
        UPDATE sessions 
        SET destination = ?, preferences = ?, status = ?, progress = ?, result = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        updatedSession.destination,
        JSON.stringify(updatedSession.preferences),
        updatedSession.status,
        updatedSession.progress,
        updatedSession.result ? JSON.stringify(updatedSession.result) : null,
        updatedSession.updatedAt,
        sessionId
      );

      console.log(`✅ 会话已更新: ${sessionId} - 状态: ${updatedSession.status}, 进度: ${updatedSession.progress}%`);
      return updatedSession;
    } catch (error) {
      console.error('❌ 更新会话失败:', error);
      return null;
    }
  }

  deleteSession(sessionId: string): boolean {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM sessions WHERE id = ?
      `);

      const result = stmt.run(sessionId);
      const deleted = result.changes > 0;
      
      console.log(`🗑️ 删除会话: ${sessionId} - ${deleted ? '成功' : '失败'}`);
      return deleted;
    } catch (error) {
      console.error('❌ 删除会话失败:', error);
      return false;
    }
  }

  getAllSessions(limit: number = 100): SessionData[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM sessions 
        ORDER BY created_at DESC 
        LIMIT ?
      `);

      const rows = stmt.all(limit) as any[];
      
      return rows.map(row => ({
        id: row.id,
        destination: row.destination,
        preferences: JSON.parse(row.preferences),
        status: row.status,
        progress: row.progress,
        result: row.result ? JSON.parse(row.result) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('❌ 获取会话列表失败:', error);
      return [];
    }
  }

  getSessionsByStatus(status: string): SessionData[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM sessions 
        WHERE status = ?
        ORDER BY created_at DESC
      `);

      const rows = stmt.all(status) as any[];
      
      return rows.map(row => ({
        id: row.id,
        destination: row.destination,
        preferences: JSON.parse(row.preferences),
        status: row.status,
        progress: row.progress,
        result: row.result ? JSON.parse(row.result) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('❌ 按状态获取会话失败:', error);
      return [];
    }
  }

  getSessionCount(): number {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM sessions
      `);

      const result = stmt.get() as any;
      return result.count;
    } catch (error) {
      console.error('❌ 获取会话数量失败:', error);
      return 0;
    }
  }

  cleanup() {
    try {
      if (this.db) {
        this.db.close();
        console.log('✅ 数据库连接已关闭');
      }
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error);
    }
  }
}

// 全局单例实例
let sessionManager: DatabaseSessionManager | null = null;

export function getSessionManager(): DatabaseSessionManager {
  if (!sessionManager) {
    sessionManager = new DatabaseSessionManager();
  }
  return sessionManager;
}

export type { SessionData };
export { DatabaseSessionManager };
