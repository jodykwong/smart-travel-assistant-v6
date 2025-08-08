/**
 * 智游助手v5.0 - 本地数据库适配器
 * 遵循原则: 高内聚低耦合 + 为失败而设计
 * 
 * 设计理念:
 * 1. 数据库抽象层 - 支持SQLite/PostgreSQL无缝切换
 * 2. 渐进式迁移 - 本地开发 → 腾讯云生产
 * 3. 容错设计 - 连接失败自动降级
 */

import { Database } from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// ============= 数据库接口定义 =============

export interface DatabaseAdapter {
  // 用户管理
  createUser(user: CreateUserData): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // 会话管理
  createSession(session: CreateSessionData): Promise<TravelSession>;
  getSession(sessionId: string): Promise<TravelSession | null>;
  updateSession(sessionId: string, updates: Partial<TravelSession>): Promise<TravelSession>;
  deleteSession(sessionId: string): Promise<void>;
  
  // 旅行计划管理
  savePlan(plan: CreatePlanData): Promise<TravelPlan>;
  getUserPlans(userId: string): Promise<TravelPlan[]>;
  getPlan(planId: string): Promise<TravelPlan | null>;
  deletePlan(planId: string): Promise<void>;
  
  // 健康检查
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

// ============= 数据类型定义 =============

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  preferences?: Record<string, any>;
}

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  preferences: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface CreateSessionData {
  userId: string;
  destination: string;
  preferences: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface TravelSession {
  id: string;
  userId: string;
  destination: string;
  preferences: Record<string, any>;
  status: string;
  progress: number;
  result?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface CreatePlanData {
  userId: string;
  sessionId: string;
  title: string;
  destination: string;
  content: Record<string, any>;
  metadata: Record<string, any>;
}

interface TravelPlan {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  destination: string;
  content: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ============= SQLite适配器实现 =============

export class SQLiteAdapter implements DatabaseAdapter {
  private db!: Database;
  private dbPath: string;

  constructor(dbPath: string = './dev.db') {
    this.dbPath = path.resolve(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    try {
      // 确保数据库目录存在
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 初始化SQLite数据库
      const Database = require('better-sqlite3');
      this.db = new Database(this.dbPath);
      
      // 启用外键约束
      this.db.pragma('foreign_keys = ON');
      
      // 创建表结构
      this.createTables();
      
      console.log(`✅ SQLite数据库初始化成功: ${this.dbPath}`);
    } catch (error) {
      console.error('❌ SQLite数据库初始化失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`数据库初始化失败: ${errorMessage}`);
    }
  }

  private createTables(): void {
    // 用户表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 会话表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS travel_sessions (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT NOT NULL,
        destination TEXT NOT NULL,
        preferences TEXT DEFAULT '{}',
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        result TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 旅行计划表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS travel_plans (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        destination TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES travel_sessions (id) ON DELETE CASCADE
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON travel_sessions (user_id);
      CREATE INDEX IF NOT EXISTS idx_plans_user_id ON travel_plans (user_id);
      CREATE INDEX IF NOT EXISTS idx_plans_session_id ON travel_plans (session_id);
    `);
  }

  // ============= 用户管理实现 =============

  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (email, password, name, preferences)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        userData.email,
        userData.password,
        userData.name,
        JSON.stringify(userData.preferences || {})
      );

      const user = await this.getUserById(result.lastInsertRowid.toString());
      if (!user) {
        throw new Error('用户创建失败');
      }
      return user;
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('邮箱已被注册');
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`创建用户失败: ${errorMessage}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
      const row = stmt.get(email);
      
      return row ? this.mapRowToUser(row) : null;
    } catch (error) {
      console.error('获取用户失败:', error);
      return null;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const row = stmt.get(id);
      
      return row ? this.mapRowToUser(row) : null;
    } catch (error) {
      console.error('获取用户失败:', error);
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id')
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.keys(updates)
        .filter(key => key !== 'id')
        .map(key => {
          if (key === 'preferences') {
            return JSON.stringify(updates[key]);
          }
          return (updates as any)[key];
        });

      const stmt = this.db.prepare(`
        UPDATE users 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      stmt.run(...values, id);
      
      const user = await this.getUserById(id);
      if (!user) {
        throw new Error('用户不存在');
      }
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`更新用户失败: ${errorMessage}`);
    }
  }

  // ============= 会话管理实现 =============

  async createSession(sessionData: CreateSessionData): Promise<TravelSession> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO travel_sessions (user_id, destination, preferences, status)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        sessionData.userId,
        sessionData.destination,
        JSON.stringify(sessionData.preferences),
        sessionData.status
      );

      const session = await this.getSession(result.lastInsertRowid.toString());
      if (!session) {
        throw new Error('会话创建失败');
      }
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`创建会话失败: ${errorMessage}`);
    }
  }

  async getSession(sessionId: string): Promise<TravelSession | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM travel_sessions WHERE id = ?');
      const row = stmt.get(sessionId);
      
      return row ? this.mapRowToSession(row) : null;
    } catch (error) {
      console.error('获取会话失败:', error);
      return null;
    }
  }

  async updateSession(sessionId: string, updates: Partial<TravelSession>): Promise<TravelSession> {
    try {
      const setClause = Object.keys(updates)
        .filter(key => !['id', 'createdAt'].includes(key))
        .map(key => `${this.camelToSnake(key)} = ?`)
        .join(', ');
      
      const values = Object.keys(updates)
        .filter(key => !['id', 'createdAt'].includes(key))
        .map(key => {
          if (['preferences', 'result'].includes(key)) {
            return JSON.stringify((updates as any)[key]);
          }
          return (updates as any)[key];
        });

      const stmt = this.db.prepare(`
        UPDATE travel_sessions 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      stmt.run(...values, sessionId);
      
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('会话不存在');
      }
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`更新会话失败: ${errorMessage}`);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM travel_sessions WHERE id = ?');
      stmt.run(sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`删除会话失败: ${errorMessage}`);
    }
  }

  // ============= 工具方法 =============

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      name: row.name,
      preferences: JSON.parse(row.preferences || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToSession(row: any): TravelSession {
    return {
      id: row.id,
      userId: row.user_id,
      destination: row.destination,
      preferences: JSON.parse(row.preferences || '{}'),
      status: row.status,
      progress: row.progress,
      result: row.result ? JSON.parse(row.result) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }

  // 其他方法实现省略...
  async savePlan(plan: CreatePlanData): Promise<TravelPlan> {
    // 实现省略
    throw new Error('Method not implemented');
  }

  async getUserPlans(userId: string): Promise<TravelPlan[]> {
    // 实现省略
    throw new Error('Method not implemented');
  }

  async getPlan(planId: string): Promise<TravelPlan | null> {
    // 实现省略
    throw new Error('Method not implemented');
  }

  async deletePlan(planId: string): Promise<void> {
    // 实现省略
    throw new Error('Method not implemented');
  }
}
