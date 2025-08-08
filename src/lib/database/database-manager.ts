/**
 * 智游助手v6.2 - 数据库管理器
 * 统一管理数据库连接和操作
 */

import { PostgreSQLAdapter, PostgreSQLConfig } from './postgresql-adapter';
import { User, CreateUserData } from '../models/User';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private adapter!: PostgreSQLAdapter;
  private initialized = false;

  private constructor() {
    // 私有构造函数，确保单例
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 从环境变量解析数据库配置
      const config = this.parseConnectionString(process.env.DATABASE_URL || '');
      
      // 创建PostgreSQL适配器
      this.adapter = new PostgreSQLAdapter(config);
      
      // 测试连接
      const isHealthy = await this.adapter.healthCheck();
      if (!isHealthy) {
        throw new Error('数据库连接健康检查失败');
      }

      this.initialized = true;
      console.log('✅ 数据库管理器初始化成功');
    } catch (error) {
      console.error('❌ 数据库管理器初始化失败:', error);
      throw error;
    }
  }

  private parseConnectionString(connectionString: string): PostgreSQLConfig {
    try {
      const url = new URL(connectionString);
      
      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // 移除开头的 '/'
        username: url.username,
        password: url.password,
        ssl: url.searchParams.get('ssl') === 'true',
        maxConnections: parseInt(url.searchParams.get('maxConnections') || '10')
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`无效的数据库连接字符串: ${errorMessage}`);
    }
  }

  // ============= 用户相关操作 =============

  public async createUser(userData: CreateUserData & {
    id: string;
    passwordHash: string;
    passwordSalt: string;
  }): Promise<User> {
    await this.ensureInitialized();
    return this.adapter.createUser(userData);
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    await this.ensureInitialized();
    return this.adapter.findUserByEmail(email);
  }

  public async findUserById(id: string): Promise<User | null> {
    await this.ensureInitialized();
    return this.adapter.findUserById(id);
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await this.ensureInitialized();
    return this.adapter.updateUser(id, updates);
  }

  public async updateLoginInfo(userId: string, loginInfo: {
    lastLoginAt: Date;
    lastLoginIp: string;
    loginCount: number;
    lastActiveAt: Date;
    failedLoginAttempts?: number;
  }): Promise<void> {
    await this.ensureInitialized();
    return this.adapter.updateLoginInfo(userId, loginInfo);
  }

  // ============= 工具方法 =============

  public async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }
    return this.adapter.healthCheck();
  }

  public async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.close();
    }
    this.initialized = false;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

// 导出单例实例
export const databaseManager = DatabaseManager.getInstance();

// 用户仓库接口
export interface UserRepository {
  create(userData: CreateUserData & {
    id: string;
    passwordHash: string;
    passwordSalt: string;
  }): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  update(id: string, updates: Partial<User>): Promise<User>;
  updateLoginInfo(userId: string, loginInfo: {
    lastLoginAt: Date;
    lastLoginIp: string;
    loginCount: number;
    lastActiveAt: Date;
    failedLoginAttempts?: number;
  }): Promise<void>;
}

// 用户仓库实现
export class DatabaseUserRepository implements UserRepository {
  constructor(private dbManager: DatabaseManager) {}

  async create(userData: CreateUserData & {
    id: string;
    passwordHash: string;
    passwordSalt: string;
  }): Promise<User> {
    return this.dbManager.createUser(userData);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.dbManager.findUserByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.dbManager.findUserById(id);
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    return this.dbManager.updateUser(id, updates);
  }

  async updateLoginInfo(userId: string, loginInfo: {
    lastLoginAt: Date;
    lastLoginIp: string;
    loginCount: number;
    lastActiveAt: Date;
    failedLoginAttempts?: number;
  }): Promise<void> {
    return this.dbManager.updateLoginInfo(userId, loginInfo);
  }
}

// 导出用户仓库实例
export const userRepository = new DatabaseUserRepository(databaseManager);
