/**
 * 智游助手v6.2 - 环境变量验证和安全管理
 * 确保所有必需的环境变量都已正确配置
 */

import { z } from 'zod';

// 环境变量验证Schema
const envSchema = z.object({
  // 基础配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url('APP_URL必须是有效的URL'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1, 'APP_NAME不能为空'),
  
  // API密钥 - 必需
  DEEPSEEK_API_KEY: z.string().min(10, 'DEEPSEEK_API_KEY必须至少10个字符'),
  AMAP_MCP_API_KEY: z.string().min(10, 'AMAP_MCP_API_KEY必须至少10个字符'),
  
  // JWT配置 - 安全要求
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET必须至少32个字符'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET必须至少32个字符'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // 数据库配置
  DATABASE_URL: z.string().min(1, 'DATABASE_URL不能为空'),
  
  // 可选配置
  REDIS_URL: z.string().optional(),
  SILICONFLOW_API_KEY: z.string().optional(),
  
  // 安全配置
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default('12'),
  
  // CORS配置
  CORS_ORIGIN: z.string().optional(),
  
  // 支付配置 - 当前禁用
  ENABLE_PAYMENT: z.string().transform(Boolean).default('false'),
  ENABLE_WECHAT_PAY: z.string().transform(Boolean).default('false'),
  ENABLE_ALIPAY: z.string().transform(Boolean).default('false'),
});

// 环境变量类型
export type EnvConfig = z.infer<typeof envSchema>;

// 验证环境变量
export function validateEnv(): EnvConfig {
  try {
    const env = envSchema.parse(process.env);
    
    // 生产环境额外检查
    if (env.NODE_ENV === 'production') {
      validateProductionEnv(env);
    }
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`环境变量验证失败:\n${errorMessages}`);
    }
    throw error;
  }
}

// 生产环境额外验证
function validateProductionEnv(env: EnvConfig): void {
  const productionChecks = [
    {
      condition: env.NEXT_PUBLIC_APP_URL.includes('localhost'),
      message: '生产环境不能使用localhost URL'
    },
    {
      condition: env.JWT_ACCESS_SECRET.length < 64,
      message: '生产环境JWT密钥应至少64个字符'
    },
    {
      condition: env.DATABASE_URL.includes('dev.db'),
      message: '生产环境不应使用开发数据库'
    },
    {
      condition: !env.REDIS_URL,
      message: '生产环境建议配置Redis缓存'
    }
  ];

  const failures = productionChecks
    .filter(check => check.condition)
    .map(check => check.message);

  if (failures.length > 0) {
    console.warn('⚠️ 生产环境配置警告:');
    failures.forEach(warning => console.warn(`  - ${warning}`));
  }
}

// 敏感数据脱敏
export function sanitizeEnvForLogging(env: Partial<EnvConfig>): Record<string, string> {
  const sensitiveKeys = [
    'DEEPSEEK_API_KEY',
    'AMAP_MCP_API_KEY', 
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'REDIS_URL'
  ];

  const sanitized: Record<string, string> = {};
  
  Object.entries(env).forEach(([key, value]) => {
    if (sensitiveKeys.includes(key) && typeof value === 'string') {
      // 只显示前3个和后3个字符
      sanitized[key] = value.length > 6 
        ? `${value.slice(0, 3)}***${value.slice(-3)}`
        : '***';
    } else {
      sanitized[key] = String(value);
    }
  });

  return sanitized;
}

// 检查环境变量是否已更改默认值
export function checkDefaultValues(): string[] {
  const warnings: string[] = [];
  
  const defaultChecks = [
    {
      key: 'DEEPSEEK_API_KEY',
      defaultValue: 'your_deepseek_api_key_here',
      message: 'DEEPSEEK_API_KEY仍使用默认值'
    },
    {
      key: 'AMAP_MCP_API_KEY', 
      defaultValue: 'your_amap_key_here',
      message: 'AMAP_MCP_API_KEY仍使用默认值'
    },
    {
      key: 'JWT_ACCESS_SECRET',
      defaultValue: 'your_super_secret_jwt_access_key_at_least_32_characters_long',
      message: 'JWT_ACCESS_SECRET仍使用默认值'
    }
  ];

  defaultChecks.forEach(check => {
    if (process.env[check.key] === check.defaultValue) {
      warnings.push(check.message);
    }
  });

  return warnings;
}

// 导出验证后的环境变量
export const env = validateEnv();

// 启动时检查
if (typeof window === 'undefined') {
  const warnings = checkDefaultValues();
  if (warnings.length > 0) {
    console.warn('⚠️ 环境变量配置警告:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  console.log('✅ 环境变量验证通过');
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 当前配置:', sanitizeEnvForLogging(env));
  }
}
