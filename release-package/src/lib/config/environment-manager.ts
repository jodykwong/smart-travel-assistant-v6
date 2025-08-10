/**
 * 智游助手v5.0 - 环境配置管理器
 * 遵循原则: 单一数据源 + 配置即代码 + 为失败而设计
 * 
 * 核心功能:
 * 1. 统一配置管理 - 本地开发 → 腾讯云生产的渐进式迁移
 * 2. 配置验证 - 启动时自动检查必需配置
 * 3. 降级策略 - 配置缺失时的优雅降级
 */

import { z } from 'zod';

// ============= 配置Schema定义 =============

const DatabaseConfigSchema = z.object({
  type: z.enum(['sqlite', 'postgresql', 'tencent-cloud']),
  url: z.string(),
  maxConnections: z.number().default(10),
  timeout: z.number().default(30000),
});

const AIServiceConfigSchema = z.object({
  provider: z.enum(['openai', 'deepseek', 'tencent-cloud']),
  apiKey: z.string(),
  model: z.string().default('gpt-4-turbo-preview'),
  maxTokens: z.number().default(20000),
  temperature: z.number().min(0).max(2).default(0.7),
});

const MCPConfigSchema = z.object({
  enabled: z.boolean().default(true),
  serverUrl: z.string().url().default('https://mcp.amap.com/sse'),
  apiKey: z.string().min(1),
  transport: z.enum(['sse', 'http']).default('sse'),
  timeout: z.number().default(30000),
  retryAttempts: z.number().default(3),
});

const AuthConfigSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('7d'),
  bcryptRounds: z.number().default(12),
});

const AppConfigSchema = z.object({
  // 应用基础配置
  nodeEnv: z.enum(['development', 'test', 'production']),
  port: z.number().default(3000),
  appUrl: z.string().url(),
  
  // 数据库配置
  database: DatabaseConfigSchema,
  
  // AI服务配置
  ai: AIServiceConfigSchema,
  
  // MCP配置
  mcp: MCPConfigSchema,
  
  // 认证配置
  auth: AuthConfigSchema,
  
  // 可选服务配置
  redis: z.object({
    url: z.string().optional(),
    enabled: z.boolean().default(false),
  }).optional(),
  
  monitoring: z.object({
    sentryDsn: z.string().optional(),
    vercelAnalyticsId: z.string().optional(),
  }).optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// ============= 环境配置管理器 =============

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: AppConfig;
  private isValidated = false;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  // ============= 配置加载 =============

  private loadConfiguration(): AppConfig {
    try {
      const rawConfig = {
        // 应用基础配置
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000'),
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        
        // 数据库配置
        database: this.loadDatabaseConfig(),
        
        // AI服务配置
        ai: this.loadAIConfig(),
        
        // MCP配置
        mcp: this.loadMCPConfig(),
        
        // 认证配置
        auth: this.loadAuthConfig(),
        
        // 可选服务配置
        redis: this.loadRedisConfig(),
        monitoring: this.loadMonitoringConfig(),
      };

      return AppConfigSchema.parse(rawConfig);
    } catch (error) {
      console.error('❌ 配置加载失败:', error);
      throw new Error(`环境配置无效: ${error.message}`);
    }
  }

  private loadDatabaseConfig() {
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    switch (dbType) {
      case 'sqlite':
        return {
          type: 'sqlite' as const,
          url: process.env.DATABASE_URL || 'file:./dev.db',
          maxConnections: 1, // SQLite单连接
          timeout: 30000,
        };
        
      case 'postgresql':
        return {
          type: 'postgresql' as const,
          url: process.env.DATABASE_URL || 'postgresql://localhost:5432/smart_travel_dev',
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
          timeout: parseInt(process.env.DB_TIMEOUT || '30000'),
        };
        
      case 'tencent-cloud':
        return {
          type: 'tencent-cloud' as const,
          url: process.env.TENCENT_CLOUD_DB_URL || '',
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
          timeout: parseInt(process.env.DB_TIMEOUT || '30000'),
        };
        
      default:
        throw new Error(`不支持的数据库类型: ${dbType}`);
    }
  }

  private loadAIConfig() {
    // 优先级: OpenAI > DeepSeek > 腾讯云
    if (process.env.OPENAI_API_KEY) {
      return {
        provider: 'openai' as const,
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        maxTokens: parseInt(process.env.TOKEN_LIMIT_PER_SESSION || '20000'),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      };
    }
    
    if (process.env.DEEPSEEK_API_KEY) {
      return {
        provider: 'deepseek' as const,
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: 'deepseek-chat',
        maxTokens: parseInt(process.env.TOKEN_LIMIT_PER_SESSION || '20000'),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      };
    }
    
    if (process.env.TENCENT_CLOUD_AI_KEY) {
      return {
        provider: 'tencent-cloud' as const,
        apiKey: process.env.TENCENT_CLOUD_AI_KEY,
        model: 'hunyuan-lite',
        maxTokens: parseInt(process.env.TOKEN_LIMIT_PER_SESSION || '20000'),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      };
    }
    
    throw new Error('未配置任何AI服务提供商');
  }

  private loadMCPConfig() {
    const apiKey = process.env.AMAP_MCP_API_KEY;
    if (!apiKey) {
      throw new Error('AMAP_MCP_API_KEY 环境变量未配置');
    }

    return {
      enabled: process.env.MCP_AMAP_ENABLED !== 'false',
      serverUrl: process.env.AMAP_MCP_SERVER_URL || 'https://mcp.amap.com/sse',
      apiKey: apiKey,
      transport: (process.env.MCP_TRANSPORT_TYPE as 'sse' | 'http') || 'sse',
      timeout: parseInt(process.env.MCP_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.MCP_RETRY_ATTEMPTS || '3'),
    };
  }

  private loadAuthConfig() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET必须至少32个字符');
    }
    
    return {
      jwtSecret,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    };
  }

  private loadRedisConfig() {
    const redisUrl = process.env.REDIS_URL;
    return {
      url: redisUrl,
      enabled: !!redisUrl,
    };
  }

  private loadMonitoringConfig() {
    return {
      sentryDsn: process.env.SENTRY_DSN,
      vercelAnalyticsId: process.env.VERCEL_ANALYTICS_ID,
    };
  }

  // ============= 配置访问方法 =============

  public getConfig(): AppConfig {
    if (!this.isValidated) {
      this.validateConfiguration();
    }
    return this.config;
  }

  public getDatabaseConfig() {
    return this.getConfig().database;
  }

  public getAIConfig() {
    return this.getConfig().ai;
  }

  public getMCPConfig() {
    return this.getConfig().mcp;
  }

  public getAuthConfig() {
    return this.getConfig().auth;
  }

  public isProduction(): boolean {
    return this.getConfig().nodeEnv === 'production';
  }

  public isDevelopment(): boolean {
    return this.getConfig().nodeEnv === 'development';
  }

  // ============= 配置验证 =============

  public validateConfiguration(): void {
    try {
      // 验证必需的配置项
      this.validateRequiredConfig();
      
      // 验证配置的一致性
      this.validateConfigConsistency();
      
      // 验证外部服务连接
      this.validateExternalServices();
      
      this.isValidated = true;
      console.log('✅ 环境配置验证通过');
    } catch (error) {
      console.error('❌ 环境配置验证失败:', error);
      throw error;
    }
  }

  private validateRequiredConfig(): void {
    const config = this.config;
    
    // 验证数据库配置
    if (!config.database.url) {
      throw new Error('数据库URL未配置');
    }
    
    // 验证AI服务配置
    if (!config.ai.apiKey) {
      throw new Error('AI服务API密钥未配置');
    }
    
    // 验证认证配置
    if (!config.auth.jwtSecret) {
      throw new Error('JWT密钥未配置');
    }
  }

  private validateConfigConsistency(): void {
    const config = this.config;
    
    // 验证生产环境配置
    if (config.nodeEnv === 'production') {
      if (config.database.type === 'sqlite') {
        console.warn('⚠️ 生产环境使用SQLite数据库，建议使用PostgreSQL');
      }
      
      if (!config.monitoring?.sentryDsn) {
        console.warn('⚠️ 生产环境未配置错误监控');
      }
    }
    
    // 验证MCP配置一致性
    if (config.mcp.enabled && !config.mcp.serverUrl) {
      throw new Error('MCP已启用但未配置服务器URL');
    }
  }

  private async validateExternalServices(): Promise<void> {
    // 这里可以添加外部服务连接测试
    // 例如: 测试数据库连接、AI服务可用性等
    console.log('🔍 外部服务连接验证...');
  }

  // ============= 配置热更新 =============

  public reloadConfiguration(): void {
    console.log('🔄 重新加载配置...');
    this.config = this.loadConfiguration();
    this.isValidated = false;
    this.validateConfiguration();
  }

  // ============= 配置导出 =============

  public exportConfiguration(): Record<string, any> {
    const config = this.getConfig();
    
    // 脱敏处理
    return {
      nodeEnv: config.nodeEnv,
      database: {
        type: config.database.type,
        // 隐藏敏感信息
        url: config.database.url.replace(/\/\/.*@/, '//***:***@'),
      },
      ai: {
        provider: config.ai.provider,
        model: config.ai.model,
        // 隐藏API密钥
        apiKey: config.ai.apiKey.substring(0, 8) + '...',
      },
      mcp: {
        enabled: config.mcp.enabled,
        serverUrl: config.mcp.serverUrl,
      },
      features: {
        redis: config.redis?.enabled || false,
        monitoring: !!(config.monitoring?.sentryDsn),
      },
    };
  }
}

// ============= 导出单例实例 =============

export const envManager = EnvironmentManager.getInstance();

// ============= 便捷访问方法 =============

export const getConfig = () => envManager.getConfig();
export const getDatabaseConfig = () => envManager.getDatabaseConfig();
export const getAIConfig = () => envManager.getAIConfig();
export const getMCPConfig = () => envManager.getMCPConfig();
export const getAuthConfig = () => envManager.getAuthConfig();
