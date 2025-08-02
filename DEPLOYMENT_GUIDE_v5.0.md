# 智游助手v5.0 部署指南

**版本**: v5.0.0  
**更新日期**: 2025年8月1日  
**适用环境**: 开发、测试、生产  

---

## 🎯 部署概览

智游助手v5.0采用现代化的全栈架构，支持多种部署方式。本指南提供从开发环境到生产环境的完整部署流程。

## 📋 系统要求

### 基础环境
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **内存**: >= 2GB RAM
- **存储**: >= 5GB 可用空间
- **网络**: 稳定的互联网连接

### 操作系统支持
- ✅ **macOS**: 10.15+ (推荐)
- ✅ **Linux**: Ubuntu 20.04+, CentOS 8+
- ✅ **Windows**: Windows 10+ (WSL2推荐)

## 🚀 快速部署 (推荐)

### 1. Vercel部署 (生产环境推荐)

#### 一键部署
```bash
# 1. 克隆项目
git clone <repository-url>
cd smart-travel-assistant-v5

# 2. 安装Vercel CLI
npm install -g vercel

# 3. 部署到Vercel
vercel --prod

# 4. 配置环境变量 (在Vercel Dashboard)
# AMAP_MCP_API_KEY=your_key
# OPENAI_API_KEY=your_key
# DATABASE_URL=your_database_url
```

#### 环境变量配置
在Vercel Dashboard中配置以下环境变量：
```env
# 必需变量
AMAP_MCP_API_KEY=your_amap_key_here
OPENAI_API_KEY=your_openai_key_here

# 可选变量
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://user:pass@host:port
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# 生产环境配置
NODE_ENV=production
VERCEL_ENV=production
```

### 2. Docker部署

#### 构建和运行
```bash
# 1. 构建Docker镜像
docker build -t smart-travel-assistant:v5.0 .

# 2. 运行容器
docker run -d \
  --name travel-assistant \
  -p 3001:3001 \
  -e AMAP_MCP_API_KEY=your_key \
  -e OPENAI_API_KEY=your_key \
  smart-travel-assistant:v5.0

# 3. 验证部署
curl http://localhost:3001/api/health
```

#### Docker Compose (推荐)
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - AMAP_MCP_API_KEY=${AMAP_MCP_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=travel_assistant
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🔧 详细部署步骤

### 开发环境部署

#### 1. 环境准备
```bash
# 检查Node.js版本
node --version  # 应该 >= 18.0.0
npm --version   # 应该 >= 9.0.0

# 克隆项目
git clone <repository-url>
cd smart-travel-assistant-v5

# 安装依赖
npm install
```

#### 2. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

```env
# .env.local 配置示例
# 高德地图API密钥 (必需)
AMAP_MCP_API_KEY=your_amap_key_here

# OpenAI API密钥 (必需)
OPENAI_API_KEY=your_openai_key_here

# 数据库配置 (开发环境可选)
DATABASE_URL=file:./dev.db

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3001
NODE_ENV=development
```

#### 3. 启动开发服务器
```bash
# 启动开发服务器
npm run dev

# 验证启动
curl http://localhost:3001/api/health

# 访问应用
open http://localhost:3001
```

### 生产环境部署

#### 1. 构建优化
```bash
# 安装生产依赖
npm ci --only=production

# 构建应用
npm run build

# 启动生产服务器
npm start
```

#### 2. 性能优化配置
```javascript
// next.config.js 生产优化
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 性能优化
  compress: true,
  poweredByHeader: false,
  
  // 图片优化
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 缓存优化
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=300, stale-while-revalidate=60',
        },
      ],
    },
  ],
};

module.exports = nextConfig;
```

#### 3. 数据库配置
```bash
# PostgreSQL生产配置
# 1. 创建数据库
createdb travel_assistant_prod

# 2. 运行迁移
npm run db:migrate

# 3. 初始化数据
npm run db:seed
```

## 🔒 安全配置

### 环境变量安全
```bash
# 生产环境安全检查
# 1. 确保敏感信息不在代码中
grep -r "sk-" src/  # 检查是否有硬编码的API密钥

# 2. 使用强密码
openssl rand -base64 32  # 生成随机密钥

# 3. 配置HTTPS
# 在Vercel/Nginx中配置SSL证书
```

### API安全
```typescript
// 生产环境API安全配置
export const securityConfig = {
  // CORS配置
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
    credentials: true,
  },
  
  // 速率限制
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 100次请求
  },
  
  // 请求大小限制
  bodyParser: {
    json: { limit: '1mb' },
    urlencoded: { limit: '1mb', extended: true },
  },
};
```

## 📊 监控和日志

### 健康检查端点
```typescript
// pages/api/health.ts
export default function handler(req, res) {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
  
  res.status(200).json(healthCheck);
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
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## 🔄 CI/CD配置

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 🚨 故障排除

### 常见问题

#### 1. 端口占用
```bash
# 检查端口占用
lsof -i :3001

# 杀死占用进程
kill -9 <PID>
```

#### 2. 依赖问题
```bash
# 清理依赖
rm -rf node_modules package-lock.json
npm install

# 检查依赖冲突
npm ls
```

#### 3. 环境变量问题
```bash
# 验证环境变量
node -e "console.log(process.env.AMAP_MCP_API_KEY)"

# 检查.env文件
cat .env.local
```

#### 4. 数据库连接问题
```bash
# 测试数据库连接
npm run db:test

# 检查数据库状态
npm run db:status
```

### 性能问题诊断
```bash
# 内存使用监控
node --inspect app.js

# 性能分析
npm run analyze

# 包大小分析
npx @next/bundle-analyzer
```

## 📞 技术支持

如果在部署过程中遇到问题，请：

1. **检查日志**: 查看应用和系统日志
2. **验证配置**: 确认环境变量和配置文件
3. **测试连接**: 验证外部服务连接
4. **查看文档**: 参考详细的技术文档
5. **联系支持**: 提供详细的错误信息和环境描述

---

**部署成功标志**: 访问健康检查端点返回200状态码，应用功能正常运行。
