/**
 * 数据库配置
 * 支持开发、测试、生产三套环境
 * 基于Phase 1架构扩展
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  charset: string;
  timezone: string;
  ssl?: boolean;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
  pool: {
    min: number;
    max: number;
    idle: number;
  };
}

export interface DatabaseEnvironmentConfig {
  development: DatabaseConfig;
  test: DatabaseConfig;
  production: DatabaseConfig;
}

/**
 * 数据库环境配置
 */
export const databaseConfig: DatabaseEnvironmentConfig = {
  // 开发环境配置
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'smart_travel_dev',
    password: process.env.DB_PASSWORD || 'dev_password_123',
    database: process.env.DB_DATABASE || 'smart_travel_dev',
    charset: 'utf8mb4',
    timezone: '+08:00',
    ssl: false,
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    pool: {
      min: 2,
      max: 10,
      idle: 10000
    }
  },

  // 测试环境配置
  test: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    username: process.env.TEST_DB_USERNAME || 'smart_travel_test',
    password: process.env.TEST_DB_PASSWORD || 'test_password_123',
    database: process.env.TEST_DB_DATABASE || 'smart_travel_test',
    charset: 'utf8mb4',
    timezone: '+08:00',
    ssl: false,
    connectionLimit: 5,
    acquireTimeout: 30000,
    timeout: 30000,
    reconnect: true,
    pool: {
      min: 1,
      max: 5,
      idle: 10000
    }
  },

  // 生产环境配置
  production: {
    host: process.env.PROD_DB_HOST || 'prod-db.smarttravel.com',
    port: parseInt(process.env.PROD_DB_PORT || '3306'),
    username: process.env.PROD_DB_USERNAME || 'smart_travel_prod',
    password: process.env.PROD_DB_PASSWORD || '',
    database: process.env.PROD_DB_DATABASE || 'smart_travel_prod',
    charset: 'utf8mb4',
    timezone: '+08:00',
    ssl: true,
    connectionLimit: 50,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    pool: {
      min: 10,
      max: 50,
      idle: 10000
    }
  }
};

/**
 * 获取当前环境的数据库配置
 */
export function getCurrentDatabaseConfig(): DatabaseConfig {
  const env = process.env.NODE_ENV || 'development';
  return databaseConfig[env as keyof DatabaseEnvironmentConfig];
}

/**
 * 数据库连接字符串生成
 */
export function generateConnectionString(config: DatabaseConfig): string {
  const { host, port, username, password, database, charset, timezone } = config;
  
  return `mysql://${username}:${password}@${host}:${port}/${database}?charset=${charset}&timezone=${encodeURIComponent(timezone)}`;
}

/**
 * 数据库迁移配置
 */
export interface MigrationConfig {
  migrationsDir: string;
  seedsDir: string;
  tableName: string;
  schemaName?: string;
}

export const migrationConfig: MigrationConfig = {
  migrationsDir: './database/migrations',
  seedsDir: './database/seeds',
  tableName: 'migrations'
};

/**
 * 数据库健康检查配置
 */
export interface HealthCheckConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
}

export const healthCheckConfig: HealthCheckConfig = {
  timeout: 5000,
  retries: 3,
  retryDelay: 1000
};

/**
 * 数据库监控配置
 */
export interface MonitoringConfig {
  slowQueryThreshold: number; // 慢查询阈值(毫秒)
  connectionPoolMonitoring: boolean;
  queryLogging: boolean;
  errorLogging: boolean;
}

export const monitoringConfig: MonitoringConfig = {
  slowQueryThreshold: 1000, // 1秒
  connectionPoolMonitoring: true,
  queryLogging: process.env.NODE_ENV === 'development',
  errorLogging: true
};

/**
 * 数据库备份配置
 */
export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron表达式
  retention: number; // 保留天数
  compression: boolean;
  encryption: boolean;
  storageLocation: string;
}

export const backupConfig: BackupConfig = {
  enabled: process.env.NODE_ENV === 'production',
  schedule: '0 2 * * *', // 每天凌晨2点
  retention: 30, // 保留30天
  compression: true,
  encryption: true,
  storageLocation: process.env.BACKUP_STORAGE_LOCATION || './backups'
};

/**
 * 数据库安全配置
 */
export interface SecurityConfig {
  enableQueryWhitelist: boolean;
  maxQueryLength: number;
  preventSqlInjection: boolean;
  auditLogging: boolean;
  encryptSensitiveFields: boolean;
}

export const securityConfig: SecurityConfig = {
  enableQueryWhitelist: process.env.NODE_ENV === 'production',
  maxQueryLength: 10000,
  preventSqlInjection: true,
  auditLogging: true,
  encryptSensitiveFields: true
};

/**
 * 环境变量验证
 */
export function validateDatabaseEnvironment(): void {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // 生产环境额外检查
  if (process.env.NODE_ENV === 'production') {
    const prodRequiredVars = [
      'PROD_DB_HOST',
      'PROD_DB_USERNAME',
      'PROD_DB_PASSWORD',
      'PROD_DB_DATABASE'
    ];

    const missingProdVars = prodRequiredVars.filter(varName => !process.env[varName]);
    
    if (missingProdVars.length > 0) {
      throw new Error(`Missing required production environment variables: ${missingProdVars.join(', ')}`);
    }
  }
}

/**
 * 数据库配置验证
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  if (!config.host) {
    throw new Error('Database host is required');
  }

  if (!config.username) {
    throw new Error('Database username is required');
  }

  if (!config.password && process.env.NODE_ENV === 'production') {
    throw new Error('Database password is required in production');
  }

  if (!config.database) {
    throw new Error('Database name is required');
  }

  if (config.port < 1 || config.port > 65535) {
    throw new Error('Database port must be between 1 and 65535');
  }

  if (config.connectionLimit < 1) {
    throw new Error('Connection limit must be at least 1');
  }

  if (config.pool.min > config.pool.max) {
    throw new Error('Pool min connections cannot be greater than max connections');
  }
}

/**
 * 导出默认配置
 */
export default {
  databaseConfig,
  migrationConfig,
  healthCheckConfig,
  monitoringConfig,
  backupConfig,
  securityConfig,
  getCurrentDatabaseConfig,
  generateConnectionString,
  validateDatabaseEnvironment,
  validateDatabaseConfig
};
