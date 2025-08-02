/**
 * 智游助手v5.0 - 数据库服务重构示例
 * 重构前: 直接依赖Supabase，配置硬编码
 * 重构后: 抽象数据库层，支持渐进式迁移
 * 
 * 遵循原则:
 * - 高内聚低耦合: 数据库操作封装在统一服务中
 * - DRY: 消除重复的数据库连接和错误处理代码
 * - SOLID: 依赖倒置，面向接口编程
 */

import { DatabaseAdapter, SQLiteAdapter } from '@/lib/database/local-db-adapter';
import { envManager } from '@/lib/config/environment-manager';
import type { User, TravelSession, TravelPlan } from '@/types/travel-planning';

// ============= 重构前的问题代码 =============
/*
❌ 问题1: 硬编码依赖Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

❌ 问题2: 重复的错误处理
async function createUser(userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert(userData);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Create user failed:', error);
    throw error;
  }
}

❌ 问题3: 配置分散，难以管理
const DATABASE_URL = process.env.DATABASE_URL;
const MAX_CONNECTIONS = parseInt(process.env.DB_MAX_CONNECTIONS || '10');
*/

// ============= 重构后的优化代码 =============

interface DatabaseServiceConfig {
  adapter: DatabaseAdapter;
  retryAttempts: number;
  retryDelay: number;
}

export class DatabaseService {
  private adapter: DatabaseAdapter;
  private config: DatabaseServiceConfig;

  constructor(config?: Partial<DatabaseServiceConfig>) {
    // ✅ 优化1: 依赖注入，支持多种数据库适配器
    this.adapter = config?.adapter || this.createDefaultAdapter();
    
    this.config = {
      adapter: this.adapter,
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 1000,
    };
  }

  private createDefaultAdapter(): DatabaseAdapter {
    const dbConfig = envManager.getDatabaseConfig();
    
    switch (dbConfig.type) {
      case 'sqlite':
        return new SQLiteAdapter(dbConfig.url.replace('file:', ''));
      
      case 'postgresql':
        // 未来扩展: PostgreSQL适配器
        throw new Error('PostgreSQL适配器尚未实现');
      
      case 'tencent-cloud':
        // 未来扩展: 腾讯云数据库适配器
        throw new Error('腾讯云数据库适配器尚未实现');
      
      default:
        throw new Error(`不支持的数据库类型: ${dbConfig.type}`);
    }
  }

  // ============= 用户管理服务 =============

  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    preferences?: Record<string, any>;
  }): Promise<User> {
    // ✅ 优化2: 统一的重试机制和错误处理
    return this.withRetry(async () => {
      try {
        return await this.adapter.createUser(userData);
      } catch (error) {
        // ✅ 优化3: 结构化错误处理
        throw this.handleDatabaseError(error, 'createUser', userData.email);
      }
    });
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    return this.withRetry(async () => {
      try {
        const user = await this.adapter.getUserByEmail(email);
        
        if (!user) {
          return null;
        }

        // 暂时简化密码验证（生产环境需要使用bcrypt）
        const isValidPassword = user.password === password;
        
        return isValidPassword ? user : null;
      } catch (error) {
        throw this.handleDatabaseError(error, 'authenticateUser', email);
      }
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.withRetry(async () => {
      try {
        return await this.adapter.getUserById(userId);
      } catch (error) {
        throw this.handleDatabaseError(error, 'getUserById', userId);
      }
    });
  }

  async updateUserPreferences(
    userId: string, 
    preferences: Record<string, any>
  ): Promise<User> {
    return this.withRetry(async () => {
      try {
        return await this.adapter.updateUser(userId, { preferences });
      } catch (error) {
        throw this.handleDatabaseError(error, 'updateUserPreferences', userId);
      }
    });
  }

  // ============= 会话管理服务 =============

  async createTravelSession(sessionData: {
    userId: string;
    destination: string;
    preferences: Record<string, any>;
  }): Promise<TravelSession> {
    return this.withRetry(async () => {
      try {
        return await this.adapter.createSession({
          ...sessionData,
          status: 'pending',
        });
      } catch (error) {
        throw this.handleDatabaseError(error, 'createTravelSession', sessionData.userId);
      }
    });
  }

  async updateSessionProgress(
    sessionId: string,
    updates: {
      status?: string;
      progress?: number;
      result?: Record<string, any>;
    }
  ): Promise<TravelSession> {
    return this.withRetry(async () => {
      try {
        return await this.adapter.updateSession(sessionId, updates);
      } catch (error) {
        throw this.handleDatabaseError(error, 'updateSessionProgress', sessionId);
      }
    });
  }

  async getTravelSession(sessionId: string): Promise<TravelSession | null> {
    return this.withRetry(async () => {
      try {
        return await this.adapter.getSession(sessionId);
      } catch (error) {
        throw this.handleDatabaseError(error, 'getTravelSession', sessionId);
      }
    });
  }

  async getUserSessions(userId: string): Promise<TravelSession[]> {
    return this.withRetry(async () => {
      try {
        // 注意: 这里需要在适配器中实现getUserSessions方法
        // 暂时返回空数组
        return [];
      } catch (error) {
        throw this.handleDatabaseError(error, 'getUserSessions', userId);
      }
    });
  }

  // ============= 旅行计划管理服务 =============

  async saveTravelPlan(planData: {
    userId: string;
    sessionId: string;
    title: string;
    destination: string;
    content: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<TravelPlan> {
    return this.withRetry(async () => {
      try {
        return await this.adapter.savePlan({
          ...planData,
          metadata: planData.metadata || {},
        });
      } catch (error) {
        throw this.handleDatabaseError(error, 'saveTravelPlan', planData.userId);
      }
    });
  }

  async getUserTravelPlans(userId: string): Promise<TravelPlan[]> {
    return this.withRetry(async () => {
      try {
        return await this.adapter.getUserPlans(userId);
      } catch (error) {
        throw this.handleDatabaseError(error, 'getUserTravelPlans', userId);
      }
    });
  }

  async getTravelPlan(planId: string): Promise<TravelPlan | null> {
    return this.withRetry(async () => {
      try {
        return await this.adapter.getPlan(planId);
      } catch (error) {
        throw this.handleDatabaseError(error, 'getTravelPlan', planId);
      }
    });
  }

  async deleteTravelPlan(planId: string): Promise<void> {
    return this.withRetry(async () => {
      try {
        await this.adapter.deletePlan(planId);
      } catch (error) {
        throw this.handleDatabaseError(error, 'deleteTravelPlan', planId);
      }
    });
  }

  // ============= 工具方法 =============

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // 不重试的错误类型
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // 最后一次尝试
        if (attempt === this.config.retryAttempts) {
          break;
        }
        
        // 等待后重试
        await this.delay(this.config.retryDelay * attempt);
        console.warn(`数据库操作重试 ${attempt}/${this.config.retryAttempts}:`, error);
      }
    }
    
    throw lastError!;
  }

  private isNonRetryableError(error: any): boolean {
    // 不重试的错误类型
    const nonRetryableErrors = [
      'UNIQUE_CONSTRAINT_VIOLATION',
      'INVALID_INPUT',
      'PERMISSION_DENIED',
    ];
    
    return nonRetryableErrors.some(type => 
      error.message?.includes(type) || error.code?.includes(type)
    );
  }

  private handleDatabaseError(error: any, operation: string, context: string): Error {
    const errorMessage = `数据库操作失败 [${operation}] [${context}]: ${error.message}`;
    
    // 记录详细错误信息
    console.error(errorMessage, {
      operation,
      context,
      error: error.stack || error,
      timestamp: new Date().toISOString(),
    });
    
    // 返回用户友好的错误
    if (error.message?.includes('UNIQUE')) {
      return new Error('数据已存在，请检查输入');
    }
    
    if (error.message?.includes('NOT_FOUND')) {
      return new Error('请求的数据不存在');
    }
    
    return new Error('数据库操作失败，请稍后重试');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============= 健康检查和维护 =============

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const isHealthy = await this.adapter.healthCheck();
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          adapter: this.adapter.constructor.name,
          timestamp: new Date().toISOString(),
          config: envManager.exportConfiguration().database,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async close(): Promise<void> {
    try {
      await this.adapter.close();
      console.log('✅ 数据库连接已关闭');
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error);
    }
  }
}

// ============= 导出单例实例 =============

export const databaseService = new DatabaseService();

// 应用关闭时清理资源
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await databaseService.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await databaseService.close();
    process.exit(0);
  });
}
