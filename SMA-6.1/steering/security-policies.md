# 安全策略和指南

## 身份验证和授权

### JWT Token 安全
```typescript
// Token 配置要求
const JWT_CONFIG = {
  // 访问令牌短期有效，减少泄露风险
  accessTokenExpiry: '15m',
  // 刷新令牌长期有效，支持无缝体验
  refreshTokenExpiry: '7d',
  // 使用强随机密钥
  secret: process.env.JWT_SECRET, // 至少32字符
  // 指定安全算法
  algorithm: 'HS256'
};

// 安全的 Token 生成
const generateTokens = (user: User) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    // 不包含敏感信息如密码、个人详细信息
  };
  
  const accessToken = jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.accessTokenExpiry,
    issuer: 'smart-travel-assistant',
    audience: 'travel-app-users'
  });
  
  return { accessToken, refreshToken };
};
```

### 密码安全策略
```typescript
import bcrypt from 'bcrypt';

// 密码强度要求
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxLength: 128
};

// 安全的密码哈希
const hashPassword = async (password: string): Promise<string> => {
  // 使用高强度 salt rounds (12+)
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// 密码验证
const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`密码长度至少${PASSWORD_REQUIREMENTS.minLength}位`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母');
  }
  
  if (!/\d/.test(password)) {
    errors.push('密码必须包含数字');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含特殊字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

## 输入验证和清理

### 数据验证规范
```typescript
import { z } from 'zod';

// 使用 Zod 进行严格的数据验证
const UserRegistrationSchema = z.object({
  email: z.string()
    .email('无效的邮箱格式')
    .max(254, '邮箱长度不能超过254字符'),
  
  password: z.string()
    .min(8, '密码至少8位')
    .max(128, '密码不能超过128位')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, 
           '密码必须包含大小写字母、数字和特殊字符'),
  
  name: z.string()
    .min(1, '姓名不能为空')
    .max(100, '姓名不能超过100字符')
    .regex(/^[a-zA-Z\u4e00-\u9fa5\s]+$/, '姓名只能包含字母、汉字和空格'),
  
  phone: z.string()
    .regex(/^1[3-9]\d{9}$/, '无效的手机号码格式')
    .optional()
});

// SQL 注入防护
const sanitizeInput = (input: string): string => {
  // 移除潜在的 SQL 注入字符
  return input
    .replace(/['"\\;]/g, '') // 移除引号和分号
    .replace(/--/g, '') // 移除 SQL 注释
    .replace(/\/\*/g, '') // 移除多行注释开始
    .replace(/\*\//g, '') // 移除多行注释结束
    .trim();
};

// XSS 防护
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
```

### 文件上传安全
```typescript
const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp'],
  documents: ['application/pdf', 'text/plain'],
  maxSize: 5 * 1024 * 1024 // 5MB
};

const validateFileUpload = (file: File): ValidationResult => {
  const errors: string[] = [];
  
  // 检查文件类型
  if (!ALLOWED_FILE_TYPES.images.includes(file.type)) {
    errors.push('不支持的文件类型');
  }
  
  // 检查文件大小
  if (file.size > ALLOWED_FILE_TYPES.maxSize) {
    errors.push('文件大小超过限制');
  }
  
  // 检查文件名
  const filename = file.name;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    errors.push('文件名包含非法字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

## API 安全措施

### 速率限制
```typescript
import rateLimit from 'express-rate-limit';

// 全局速率限制
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 登录接口特殊限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次登录尝试
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many login attempts',
    retryAfter: '15 minutes'
  }
});

// API 密钥验证
const validateApiKey = (req: Request): boolean => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return false;
  }
  
  // 验证 API 密钥格式和有效性
  return /^[a-zA-Z0-9]{32}$/.test(apiKey as string);
};
```

### CORS 安全配置
```typescript
const corsOptions = {
  // 明确指定允许的域名，避免使用通配符
  origin: [
    'https://travel-assistant.com',
    'https://app.travel-assistant.com',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
  ],
  
  // 限制允许的 HTTP 方法
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  
  // 允许的请求头
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key'
  ],
  
  // 不允许携带凭据（除非必要）
  credentials: true,
  
  // 预检请求缓存时间
  maxAge: 86400 // 24小时
};
```

## 数据保护

### 敏感数据处理
```typescript
// 数据脱敏
const maskSensitiveData = (user: User): PublicUser => {
  return {
    id: user.id,
    name: user.name,
    email: maskEmail(user.email),
    // 不返回密码、手机号等敏感信息
    createdAt: user.createdAt
  };
};

const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@');
  const maskedUsername = username.length > 2 
    ? username.substring(0, 2) + '*'.repeat(username.length - 2)
    : username;
  return `${maskedUsername}@${domain}`;
};

// 数据加密存储
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32字节密钥
const ALGORITHM = 'aes-256-gcm';

const encryptSensitiveData = (text: string): EncryptedData => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};
```

### 数据库安全
```typescript
// 使用参数化查询防止 SQL 注入
const getUserById = async (userId: string): Promise<User | null> => {
  // ✅ 正确：使用参数化查询
  const result = await db.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  
  // ❌ 错误：字符串拼接容易导致 SQL 注入
  // const result = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);
  
  return result.rows[0] || null;
};

// 数据库连接安全
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // 启用 SSL 连接
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_SSL_CA
  } : false,
  
  // 连接池配置
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  }
};
```

## 日志和监控安全

### 安全日志记录
```typescript
// 安全事件日志
const logSecurityEvent = (event: SecurityEvent) => {
  const logData = {
    timestamp: new Date().toISOString(),
    eventType: event.type,
    userId: event.userId,
    ipAddress: hashIP(event.ipAddress), // 哈希处理IP地址
    userAgent: event.userAgent,
    success: event.success,
    // 不记录敏感信息如密码、token等
  };
  
  console.log(JSON.stringify(logData));
};

// IP地址哈希处理
const hashIP = (ip: string): string => {
  return crypto
    .createHash('sha256')
    .update(ip + process.env.IP_SALT)
    .digest('hex')
    .substring(0, 16);
};

// 错误日志脱敏
const logError = (error: Error, context: Record<string, any>) => {
  const sanitizedContext = { ...context };
  
  // 移除敏感字段
  delete sanitizedContext.password;
  delete sanitizedContext.token;
  delete sanitizedContext.apiKey;
  
  console.error({
    message: error.message,
    stack: error.stack,
    context: sanitizedContext,
    timestamp: new Date().toISOString()
  });
};
```

### 安全监控指标
```typescript
// 监控可疑活动
const monitorSuspiciousActivity = {
  // 监控失败登录尝试
  trackFailedLogins: (userId: string, ipAddress: string) => {
    // 记录失败登录，触发告警机制
  },
  
  // 监控异常API调用
  trackAbnormalApiUsage: (userId: string, endpoint: string, frequency: number) => {
    if (frequency > NORMAL_USAGE_THRESHOLD) {
      // 触发安全告警
    }
  },
  
  // 监控权限提升尝试
  trackPrivilegeEscalation: (userId: string, attemptedAction: string) => {
    // 记录未授权操作尝试
  }
};
```

## 环境和配置安全

### 环境变量管理
```typescript
// 环境变量验证
const validateEnvironment = () => {
  const requiredVars = [
    'JWT_SECRET',
    'DB_PASSWORD',
    'ENCRYPTION_KEY',
    'API_SECRET_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // 验证密钥强度
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
};

// 配置文件安全
const secureConfig = {
  // 生产环境配置
  production: {
    debug: false,
    logLevel: 'error',
    enableDevTools: false,
    exposeStackTrace: false
  },
  
  // 开发环境配置
  development: {
    debug: true,
    logLevel: 'debug',
    enableDevTools: true,
    exposeStackTrace: true
  }
};
```

## 第三方服务安全

### API 密钥管理
```typescript
// 安全的第三方服务配置
const externalServices = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: 'https://api.deepseek.com',
    timeout: 30000,
    // 限制请求频率
    rateLimit: {
      requests: 100,
      per: 'hour'
    }
  },
  
  gaodeMap: {
    apiKey: process.env.GAODE_API_KEY,
    baseUrl: 'https://restapi.amap.com',
    timeout: 15000,
    // 验证响应完整性
    validateResponse: true
  }
};

// 安全的HTTP客户端配置
const createSecureHttpClient = (config: ServiceConfig) => {
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    
    // 安全头部
    headers: {
      'User-Agent': 'SmartTravelAssistant/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    
    // 验证SSL证书
    httpsAgent: new https.Agent({
      rejectUnauthorized: true
    }),
    
    // 请求拦截器添加认证
    interceptors: {
      request: [(config) => {
        config.headers.Authorization = `Bearer ${config.apiKey}`;
        return config;
      }]
    }
  });
};
```

## 安全检查清单

### 代码审查安全检查
- [ ] 所有用户输入都经过验证和清理
- [ ] 使用参数化查询防止SQL注入
- [ ] 敏感数据已加密存储
- [ ] 密码使用强哈希算法
- [ ] JWT token配置安全
- [ ] API端点有适当的权限控制
- [ ] 错误信息不泄露敏感信息
- [ ] 文件上传有类型和大小限制
- [ ] 速率限制已实施
- [ ] CORS配置正确

### 部署安全检查
- [ ] 环境变量包含所有必需的密钥
- [ ] 生产环境禁用调试模式
- [ ] SSL/TLS证书配置正确
- [ ] 数据库连接使用加密
- [ ] 日志不包含敏感信息
- [ ] 监控和告警系统已配置
- [ ] 备份数据已加密
- [ ] 访问控制策略已实施