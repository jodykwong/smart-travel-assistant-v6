/**
 * 智游助手v6.2 - PostgreSQL数据库适配器
 * 实现用户认证系统的数据持久化
 */

import { Pool, PoolClient } from 'pg';
import { User, CreateUserData } from '../models/User';

export interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

export class PostgreSQLAdapter {
  private pool: Pool;
  private config: PostgreSQLConfig;

  constructor(config: PostgreSQLConfig) {
    this.config = config;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      max: config.maxConnections || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const client = await this.pool.connect();

      // 检查表是否已存在
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'users'
        );
      `);

      if (tableExists.rows[0].exists) {
        console.log('✅ 用户表已存在，跳过创建');
        client.release();
        return;
      }

      // 创建用户表
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20) UNIQUE,
          display_name VARCHAR(100) NOT NULL,
          username VARCHAR(50) UNIQUE,
          avatar_url VARCHAR(500),
          password_hash VARCHAR(255) NOT NULL,
          password_salt VARCHAR(32) NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          role VARCHAR(20) DEFAULT 'user',
          permissions TEXT[] DEFAULT ARRAY['user:read', 'user:update'],
          
          -- 安全相关字段
          last_login_at TIMESTAMP,
          last_login_ip VARCHAR(45),
          failed_login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP,
          login_count INTEGER DEFAULT 0,
          
          -- 验证相关
          email_verified BOOLEAN DEFAULT FALSE,
          phone_verified BOOLEAN DEFAULT FALSE,
          email_verification_token VARCHAR(255),
          phone_verification_token VARCHAR(10),
          
          -- 用户偏好设置 (JSON格式)
          preferences JSONB,
          
          -- 统计信息
          plan_count INTEGER DEFAULT 0,
          last_active_at TIMESTAMP,
          
          -- 元数据
          metadata JSONB,
          
          -- 时间戳
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      `);

      // 创建用户会话表
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          session_token VARCHAR(255) NOT NULL,
          refresh_token VARCHAR(255),
          ip_address VARCHAR(45),
          user_agent TEXT,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // 创建会话表索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
      `);

      client.release();
      console.log('✅ PostgreSQL数据库初始化成功');
    } catch (error) {
      console.error('❌ PostgreSQL数据库初始化失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`数据库初始化失败: ${errorMessage}`);
    }
  }

  async createUser(userData: CreateUserData & {
    id: string;
    passwordHash: string;
    passwordSalt: string;
  }): Promise<User> {
    const client = await this.pool.connect();

    try {
      // 开始事务
      await client.query('BEGIN');

      const query = `
        INSERT INTO users (
          id, email, phone, display_name, username, password_hash, password_salt,
          status, role, permissions, preferences, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const values = [
        userData.id,
        userData.email.toLowerCase(),
        userData.phone || null,
        userData.displayName,
        userData.username || null,
        userData.passwordHash,
        userData.passwordSalt,
        'active',
        'user',
        ['user:read', 'user:update', 'travel:create'],
        userData.preferences ? JSON.stringify(userData.preferences) : null,
        null, // metadata 字段暂时为空
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      const dbUser = result.rows[0];

      // 提交事务
      await client.query('COMMIT');

      return this.mapDbUserToUser(dbUser);
    } catch (error) {
      // 回滚事务
      await client.query('ROLLBACK');
      console.error('❌ 创建用户失败，事务已回滚:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`创建用户失败: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();

    try {
      const query = 'SELECT * FROM users WHERE email = $1 AND status != $2';
      const result = await client.query(query, [email.toLowerCase(), 'deleted']);



      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbUserToUser(result.rows[0]);
    } catch (error) {
      console.error('❌ 查找用户失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`查找用户失败: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  async findUserById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM users WHERE id = $1 AND status != $2';
      const result = await client.query(query, [id, 'deleted']);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbUserToUser(result.rows[0]);
    } catch (error) {
      console.error('❌ 查找用户失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`查找用户失败: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const client = await this.pool.connect();
    
    try {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      // 构建动态更新查询
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = this.mapUserKeyToDbKey(key);
          if (dbKey) {
            setClause.push(`${dbKey} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        }
      });

      if (setClause.length === 0) {
        throw new Error('没有要更新的字段');
      }

      setClause.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(id); // WHERE条件的参数

      const query = `
        UPDATE users 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('用户不存在');
      }

      return this.mapDbUserToUser(result.rows[0]);
    } catch (error) {
      console.error('❌ 更新用户失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`更新用户失败: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  async updateLoginInfo(userId: string, loginInfo: {
    lastLoginAt: Date;
    lastLoginIp: string;
    loginCount: number;
    lastActiveAt: Date;
    failedLoginAttempts?: number;
  }): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET 
          last_login_at = $1,
          last_login_ip = $2,
          login_count = $3,
          last_active_at = $4,
          failed_login_attempts = $5,
          updated_at = $6
        WHERE id = $7
      `;

      await client.query(query, [
        loginInfo.lastLoginAt,
        loginInfo.lastLoginIp,
        loginInfo.loginCount,
        loginInfo.lastActiveAt,
        loginInfo.failedLoginAttempts || 0,
        new Date(),
        userId
      ]);
    } catch (error) {
      console.error('❌ 更新登录信息失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`更新登录信息失败: ${errorMessage}`);
    } finally {
      client.release();
    }
  }

  private mapDbUserToUser(dbUser: any): User {
    const userProfile = {
      id: dbUser.id,
      email: dbUser.email,
      phone: dbUser.phone,
      displayName: dbUser.display_name,
      username: dbUser.username,
      avatar: dbUser.avatar_url,
      passwordHash: dbUser.password_hash,
      passwordSalt: dbUser.password_salt,
      passwordUpdatedAt: dbUser.updated_at, // 使用updated_at作为密码更新时间
      emailVerified: dbUser.email_verified,
      phoneVerified: dbUser.phone_verified,
      status: dbUser.status,
      role: dbUser.role,
      permissions: dbUser.permissions || [],
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      lastLoginAt: dbUser.last_login_at,
      lastActiveAt: dbUser.last_active_at,
      loginCount: dbUser.login_count || 0,
      planCount: dbUser.plan_count || 0,
      metadata: dbUser.metadata || {}
    };

    const preferences = dbUser.preferences ? (typeof dbUser.preferences === 'string' ? JSON.parse(dbUser.preferences) : dbUser.preferences) : undefined;

    return new User(userProfile, preferences);
  }

  private mapUserKeyToDbKey(key: string): string | null {
    const keyMap: { [key: string]: string } = {
      'displayName': 'display_name',
      'avatarUrl': 'avatar_url',
      'passwordHash': 'password_hash',
      'passwordSalt': 'password_salt',
      'emailVerified': 'email_verified',
      'phoneVerified': 'phone_verified',
      'lastLoginAt': 'last_login_at',
      'lastLoginIp': 'last_login_ip',
      'lastActiveAt': 'last_active_at',
      'loginCount': 'login_count',
      'planCount': 'plan_count',
      'failedLoginAttempts': 'failed_login_attempts',
      'lockedUntil': 'locked_until',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at'
    };

    return keyMap[key] || key;
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('✅ PostgreSQL连接池已关闭');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('❌ 数据库健康检查失败:', error);
      return false;
    }
  }
}
