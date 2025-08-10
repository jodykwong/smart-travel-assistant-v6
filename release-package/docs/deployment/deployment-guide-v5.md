# 智游助手v5.0 - 部署指南

## 🚀 快速开始

### 环境要求
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Git**: 最新版本
- **操作系统**: macOS, Linux, Windows

### 本地开发环境搭建

#### 1. 克隆项目
```bash
git clone https://github.com/your-org/smart-travel-assistant-v5.git
cd smart-travel-assistant-v5
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 环境变量配置
创建 `.env.local` 文件：
```bash
cp .env.example .env.local
```

编辑 `.env.local`：
```env
# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# 数据库配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis配置
REDIS_URL=redis://localhost:6379

# OpenAI配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4-turbo-preview

# 高德地图配置
AMAP_API_KEY=your_amap_api_key
AMAP_SECRET_KEY=your_amap_secret_key

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 监控配置
SENTRY_DSN=your_sentry_dsn
VERCEL_ANALYTICS_ID=your_vercel_analytics_id

# 开发环境配置
NODE_ENV=development
LOG_LEVEL=debug
```

#### 4. 数据库初始化
```bash
# 运行数据库迁移
npm run db:migrate

# 填充测试数据
npm run db:seed
```

#### 5. 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:3000` 查看应用。

## 🏗️ 生产环境部署

### Vercel部署 (推荐)

#### 1. 准备工作
- 确保代码已推送到GitHub
- 注册Vercel账号并连接GitHub

#### 2. 部署配置
创建 `vercel.json`：
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/pages/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

#### 3. 环境变量设置
在Vercel Dashboard中设置环境变量：
```env
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key
REDIS_URL=your_production_redis_url
OPENAI_API_KEY=your_openai_api_key
AMAP_API_KEY=your_amap_api_key
JWT_SECRET=your_production_jwt_secret
SENTRY_DSN=your_sentry_dsn
```

#### 4. 部署命令
```bash
# 安装Vercel CLI
npm i -g vercel

# 登录Vercel
vercel login

# 部署到生产环境
vercel --prod
```

### Docker部署

#### 1. 创建Dockerfile
```dockerfile
# 多阶段构建
FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. 创建docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AMAP_API_KEY=${AMAP_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

#### 3. 部署命令
```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

## 🔧 配置管理

### 环境变量说明

#### 必需配置
```env
# 数据库 (必需)
SUPABASE_URL=              # Supabase项目URL
SUPABASE_ANON_KEY=         # Supabase匿名密钥
SUPABASE_SERVICE_ROLE_KEY= # Supabase服务角色密钥

# AI服务 (必需)
OPENAI_API_KEY=            # OpenAI API密钥

# 地图服务 (必需)
AMAP_API_KEY=              # 高德地图API密钥

# 认证 (必需)
JWT_SECRET=                # JWT签名密钥
```

#### 可选配置
```env
# 缓存
REDIS_URL=                 # Redis连接URL (可选，提升性能)

# 监控
SENTRY_DSN=                # Sentry错误监控
VERCEL_ANALYTICS_ID=       # Vercel分析

# 性能调优
MAX_CONCURRENT_SESSIONS=5  # 最大并发会话数
TOKEN_LIMIT_PER_SESSION=20000  # 每会话Token限制
CACHE_TTL=300             # 缓存过期时间(秒)
```

### 配置验证
```bash
# 验证配置
npm run config:validate

# 测试数据库连接
npm run db:test

# 测试外部API
npm run api:test
```

## 📊 监控与日志

### 应用监控
```bash
# 安装监控工具
npm install @sentry/nextjs

# 配置Sentry
echo "SENTRY_DSN=your_sentry_dsn" >> .env.local
```

### 性能监控
```typescript
// next.config.js
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
  // Vercel Analytics
  analytics: {
    id: process.env.VERCEL_ANALYTICS_ID,
  },
}
```

### 日志配置
```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' }),
  ],
});
```

## 🧪 测试部署

### 运行测试
```bash
# 单元测试
npm run test

# 集成测试
npm run test:integration

# E2E测试
npm run test:e2e

# 覆盖率测试
npm run test:coverage
```

### 性能测试
```bash
# 安装性能测试工具
npm install -g lighthouse

# 运行性能测试
lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
```

## 🔒 安全配置

### HTTPS配置
```bash
# 生产环境自动启用HTTPS
# 本地开发使用mkcert生成证书
mkcert localhost
```

### 安全头配置
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

## 🚨 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 清理缓存
npm run clean
rm -rf .next node_modules
npm install

# 检查TypeScript错误
npm run type-check
```

#### 2. 数据库连接失败
```bash
# 检查环境变量
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# 测试连接
npm run db:test
```

#### 3. API调用失败
```bash
# 检查API密钥
echo $OPENAI_API_KEY
echo $AMAP_API_KEY

# 测试API连接
npm run api:test
```

### 日志查看
```bash
# Vercel部署日志
vercel logs

# Docker容器日志
docker-compose logs -f app

# 本地开发日志
tail -f logs/app.log
```

## 📈 性能优化

### 构建优化
```bash
# 分析包大小
npm run analyze

# 优化构建
npm run build:optimize
```

### 运行时优化
```typescript
// next.config.js
module.exports = {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // 图片优化
  images: {
    domains: ['images.unsplash.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 实验性功能
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
};
```

## 🔄 CI/CD流水线

### GitHub Actions配置
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

这个部署指南提供了从本地开发到生产环境的完整部署流程，确保智游助手v5.0能够稳定、安全地运行在各种环境中。
