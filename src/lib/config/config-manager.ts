/**
 * 智游助手v6.2 - 统一配置管理器
 * 遵循原则: [为失败而设计] + [KISS] + [DRY] + [纵深防御]
 * 
 * 解决问题:
 * 1. 配置缺失导致的系统不可用
 * 2. 环境变量验证和类型安全
 * 3. 敏感信息安全管理
 * 4. 配置热重载和降级策略
 */

import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============= 配置验证Schema =============

const WechatConfigSchema = z.object({
  appId: z.string().min(1, 'WeChat App ID is required'),
  mchId: z.string().min(1, 'WeChat Merchant ID is required'),
  apiKey: z.string().min(32, 'WeChat API Key must be at least 32 characters'),
  certPath: z.string().optional(),
  keyPath: z.string().optional(),
  sandbox: z.boolean().default(true)
});

const AlipayConfigSchema = z.object({
  appId: z.string().min(1, 'Alipay App ID is required'),
  privateKey: z.string().min(1, 'Alipay Private Key is required'),
  publicKey: z.string().min(1, 'Alipay Public Key is required'),
  gateway: z.string().url('Invalid Alipay Gateway URL'),
  sandbox: z.boolean().default(true)
});

const JWTConfigSchema = z.object({
  accessTokenSecret: z.string().min(32, 'JWT Access Secret must be at least 32 characters'),
  refreshTokenSecret: z.string().min(32, 'JWT Refresh Secret must be at least 32 characters'),
  accessTokenExpiry: z.string().default('15m'),
  refreshTokenExpiry: z.string().default('7d'),
  issuer: z.string().default('smart-travel-v6.2'),
  audience: z.string().default('smart-travel-users')
});

const DatabaseConfigSchema = z.object({
  url: z.string().url('Invalid Database URL'),
  maxConnections: z.number().default(10),
  ssl: z.boolean().default(false)
});

const AppConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.number().default(3004),
  apiBaseUrl: z.string().url('Invalid API Base URL'),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000', 'http://localhost:3004'])
});

const MCPConfigSchema = z.object({
  enabled: z.boolean().default(false),
  wechatEndpoint: z.string().url('Invalid WeChat MCP endpoint').optional(),
  alipayEndpoint: z.string().url('Invalid Alipay MCP endpoint').optional(),
  wechatApiKey: z.string().min(1, 'WeChat MCP API key is required').optional(),
  alipayApiKey: z.string().min(1, 'Alipay MCP API key is required').optional(),
  wechatMerchantId: z.string().min(1, 'WeChat MCP merchant ID is required').optional(),
  alipayMerchantId: z.string().min(1, 'Alipay MCP merchant ID is required').optional(),
  experienceMode: z.boolean().default(true),
  timeout: z.number().default(30000),
  retryCount: z.number().default(3)
});

// ============= 配置类型定义 =============

export type WechatConfig = z.infer<typeof WechatConfigSchema>;
export type AlipayConfig = z.infer<typeof AlipayConfigSchema>;
export type JWTConfig = z.infer<typeof JWTConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type MCPConfig = z.infer<typeof MCPConfigSchema>;

export interface SystemConfig {
  app: AppConfig;
  wechat: WechatConfig;
  alipay: AlipayConfig;
  jwt: JWTConfig;
  mcp: MCPConfig;
  database?: DatabaseConfig;
}

// ============= 配置错误类型 =============

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public suggestions?: string[]
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// ============= 配置管理器 =============

export class ConfigManager {
  private static instance: ConfigManager;
  private config: SystemConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = this.findConfigFile();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 加载并验证系统配置
   * 遵循原则: [为失败而设计] - 提供详细的错误信息和修复建议
   */
  async loadConfig(): Promise<SystemConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      console.log('🔧 Loading system configuration...');
      
      // 加载环境变量
      this.loadEnvironmentVariables();
      
      // 验证和构建配置
      const config = await this.buildAndValidateConfig();
      
      // 验证外部依赖连接
      await this.validateExternalConnections(config);
      
      this.config = config;
      console.log('✅ System configuration loaded successfully');
      
      return config;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        this.logConfigurationError(error);
      }
      throw error;
    }
  }

  /**
   * 构建和验证配置
   * 遵循原则: [KISS] - 简化配置构建流程
   */
  private async buildAndValidateConfig(): Promise<SystemConfig> {
    const errors: string[] = [];

    // 验证应用配置
    const appResult = AppConfigSchema.safeParse({
      nodeEnv: process.env.NODE_ENV,
      port: parseInt(process.env.PORT || '3004'),
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3004',
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || undefined
    });

    if (!appResult.success) {
      errors.push(`App Config: ${appResult.error.message}`);
    }

    // 验证JWT配置
    const jwtResult = JWTConfigSchema.safeParse({
      accessTokenSecret: process.env.JWT_ACCESS_SECRET,
      refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
      accessTokenExpiry: process.env.JWT_ACCESS_EXPIRES_IN,
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });

    if (!jwtResult.success) {
      errors.push(`JWT Config: ${jwtResult.error.message}`);
    }

    // 验证微信支付配置
    const wechatResult = WechatConfigSchema.safeParse({
      appId: process.env.WECHAT_PAY_APP_ID,
      mchId: process.env.WECHAT_PAY_MCH_ID,
      apiKey: process.env.WECHAT_PAY_API_KEY,
      certPath: process.env.WECHAT_PAY_CERT_PATH,
      keyPath: process.env.WECHAT_PAY_KEY_PATH,
      sandbox: process.env.WECHAT_PAY_SANDBOX === 'true'
    });

    if (!wechatResult.success) {
      errors.push(`WeChat Pay Config: ${wechatResult.error.message}`);
    }

    // 验证支付宝配置
    const alipayResult = AlipayConfigSchema.safeParse({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      publicKey: process.env.ALIPAY_PUBLIC_KEY,
      gateway: process.env.ALIPAY_GATEWAY_URL || 'https://openapi.alipaydev.com/gateway.do',
      sandbox: process.env.ALIPAY_SANDBOX === 'true'
    });

    if (!alipayResult.success) {
      errors.push(`Alipay Config: ${alipayResult.error.message}`);
    }

    // 验证MCP配置
    const mcpResult = MCPConfigSchema.safeParse({
      enabled: process.env.PAYMENT_MCP_ENABLED === 'true',
      wechatEndpoint: process.env.WECHAT_MCP_ENDPOINT,
      alipayEndpoint: process.env.ALIPAY_MCP_ENDPOINT,
      wechatApiKey: process.env.WECHAT_MCP_API_KEY,
      alipayApiKey: process.env.ALIPAY_MCP_API_KEY,
      wechatMerchantId: process.env.WECHAT_MCP_MERCHANT_ID,
      alipayMerchantId: process.env.ALIPAY_MCP_MERCHANT_ID,
      experienceMode: process.env.MCP_EXPERIENCE_MODE !== 'false',
      timeout: parseInt(process.env.MCP_TIMEOUT || '30000'),
      retryCount: parseInt(process.env.MCP_RETRY_COUNT || '3')
    });

    if (!mcpResult.success) {
      // MCP配置错误只记录警告，不阻止系统启动
      console.warn(`MCP Config Warning: ${mcpResult.error.message}`);
    }

    if (errors.length > 0) {
      throw new ConfigurationError(
        'Configuration validation failed',
        'multiple',
        [
          'Copy .env.example to .env.local',
          'Fill in all required environment variables',
          'Ensure API keys are properly formatted',
          'Run: npm run config:validate'
        ]
      );
    }

    return {
      app: appResult.data!,
      jwt: jwtResult.data!,
      wechat: wechatResult.data!,
      alipay: alipayResult.data!,
      mcp: mcpResult.success ? mcpResult.data! : {
        enabled: false,
        experienceMode: true,
        timeout: 30000,
        retryCount: 3
      }
    };
  }

  /**
   * 验证外部连接
   * 遵循原则: [为失败而设计] - 提前发现连接问题
   */
  private async validateExternalConnections(config: SystemConfig): Promise<void> {
    const validations = [];

    // 验证支付宝网关连接
    if (config.alipay.gateway) {
      validations.push(this.validateAlipayConnection(config.alipay.gateway));
    }

    // 验证微信支付证书文件
    if (config.wechat.certPath) {
      validations.push(this.validateWechatCertificates(config.wechat));
    }

    const results = await Promise.allSettled(validations);
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      console.warn('⚠️ Some external connections failed validation:', failures);
      // 在开发环境中，连接失败不阻止启动
      if (config.app.nodeEnv === 'production') {
        throw new ConfigurationError('External connection validation failed in production');
      }
    }
  }

  private async validateAlipayConnection(gateway: string): Promise<void> {
    try {
      const response = await fetch(gateway, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      console.log(`✅ Alipay gateway connection verified: ${response.status}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Alipay gateway connection failed: ${errorMessage}`);
    }
  }

  private validateWechatCertificates(config: WechatConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (config.certPath && !existsSync(config.certPath)) {
        reject(new Error(`WeChat certificate file not found: ${config.certPath}`));
      }
      if (config.keyPath && !existsSync(config.keyPath)) {
        reject(new Error(`WeChat key file not found: ${config.keyPath}`));
      }
      resolve();
    });
  }

  /**
   * 查找配置文件
   * 遵循原则: [KISS] - 简单的文件查找逻辑
   */
  private findConfigFile(): string {
    const possiblePaths = [
      '.env.local',
      '.env.development',
      '.env'
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    throw new ConfigurationError(
      'No configuration file found',
      'config-file',
      [
        'Copy .env.example to .env.local',
        'Ensure the file is in the project root',
        'Check file permissions'
      ]
    );
  }

  private loadEnvironmentVariables(): void {
    try {
      require('dotenv').config({ path: this.configPath });
      console.log(`📁 Loaded environment variables from: ${this.configPath}`);
    } catch (error) {
      throw new ConfigurationError(
        `Failed to load environment variables from ${this.configPath}`,
        'env-loading',
        ['Check if the file exists and is readable', 'Verify file format']
      );
    }
  }

  private logConfigurationError(error: ConfigurationError): void {
    console.error('❌ Configuration Error:', error.message);
    if (error.field) {
      console.error(`   Field: ${error.field}`);
    }
    if (error.suggestions) {
      console.error('   Suggestions:');
      error.suggestions.forEach(suggestion => {
        console.error(`   - ${suggestion}`);
      });
    }
  }

  /**
   * 获取特定配置部分
   * 遵循原则: [单一职责] - 提供专门的配置访问方法
   */
  getWechatConfig(): WechatConfig {
    if (!this.config) throw new Error('Configuration not loaded');
    return this.config.wechat;
  }

  getAlipayConfig(): AlipayConfig {
    if (!this.config) throw new Error('Configuration not loaded');
    return this.config.alipay;
  }

  getJWTConfig(): JWTConfig {
    if (!this.config) throw new Error('Configuration not loaded');
    return this.config.jwt;
  }

  getMCPConfig(): MCPConfig {
    if (!this.config) throw new Error('Configuration not loaded');
    return this.config.mcp;
  }

  /**
   * 配置热重载
   * 遵循原则: [为失败而设计] - 支持运行时配置更新
   */
  async reloadConfig(): Promise<SystemConfig> {
    this.config = null;
    return this.loadConfig();
  }
}

// 导出单例实例
export const configManager = ConfigManager.getInstance();
