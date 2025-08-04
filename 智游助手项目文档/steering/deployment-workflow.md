# 部署流程和 CI/CD 策略

## 构建和部署环境

### 环境分层
```yaml
# 环境配置层级
environments:
  development:
    description: "本地开发环境"
    database: "本地 PostgreSQL"
    external_apis: "Mock 服务"
    debug: true
    
  staging:
    description: "预发布测试环境"
    database: "测试数据库"
    external_apis: "测试 API"
    debug: false
    
  production:
    description: "生产环境"
    database: "生产数据库"
    external_apis: "生产 API"
    debug: false
    monitoring: "全面监控"
```

### Docker 容器化
```dockerfile
# 多阶段构建优化
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

## CI/CD 管道配置

### GitHub Actions 工作流
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run type checking
        run: npm run type-check
        
      - name: Run linting
        run: npm run lint
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Generate test coverage
        run: npm run test:coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run security audit
        run: npm audit --audit-level high
        
      - name: Scan for vulnerabilities
        uses: securecodewarrior/github-action-add-sarif@v1
        with:
          sarif-file: 'security-scan-results.sarif'

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker image
        run: |
          docker build -t smart-travel-assistant:${{ github.sha }} .
          docker tag smart-travel-assistant:${{ github.sha }} smart-travel-assistant:latest
          
      - name: Push to registry
        if: github.ref == 'refs/heads/main'
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push smart-travel-assistant:${{ github.sha }}
          docker push smart-travel-assistant:latest

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          # 部署到预发布环境的脚本
          ./scripts/deploy-staging.sh
          
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to production
        run: |
          # 部署到生产环境的脚本
          ./scripts/deploy-production.sh
```

### 部署脚本标准
```bash
#!/bin/bash
# scripts/deploy.sh

set -e  # 遇到错误立即退出

# 环境变量验证
validate_environment() {
    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "DEEPSEEK_API_KEY"
        "GAODE_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            echo "错误: 环境变量 $var 未设置"
            exit 1
        fi
    done
}

# 数据库迁移
run_migrations() {
    echo "运行数据库迁移..."
    npm run db:migrate
    
    if [[ $? -ne 0 ]]; then
        echo "数据库迁移失败"
        exit 1
    fi
}

# 健康检查
health_check() {
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:3000/api/health; then
            echo "应用启动成功"
            return 0
        fi
        
        echo "等待应用启动... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    echo "应用启动失败"
    exit 1
}

# 回滚机制
rollback() {
    echo "执行回滚..."
    docker-compose down
    docker-compose up -d --scale app=0
    docker tag smart-travel-assistant:previous smart-travel-assistant:latest
    docker-compose up -d
}

# 主部署流程
main() {
    validate_environment
    
    # 备份当前版本
    docker tag smart-travel-assistant:latest smart-travel-assistant:previous
    
    # 拉取新镜像
    docker pull smart-travel-assistant:latest
    
    # 运行数据库迁移
    run_migrations
    
    # 滚动更新
    docker-compose up -d --no-deps app
    
    # 健康检查
    if ! health_check; then
        rollback
        exit 1
    fi
    
    echo "部署成功完成"
}

main "$@"
```

## 环境配置管理

### 配置文件结构
```typescript
// config/environments.ts
interface EnvironmentConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  external: ExternalServicesConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

const environments: Record<string, EnvironmentConfig> = {
  development: {
    database: {
      url: process.env.DEV_DATABASE_URL,
      ssl: false,
      logging: true
    },
    redis: {
      url: process.env.DEV_REDIS_URL,
      keyPrefix: 'dev:'
    },
    external: {
      deepseek: {
        baseUrl: 'https://api.deepseek.com',
        timeout: 30000,
        retries: 3
      },
      gaode: {
        baseUrl: 'https://restapi.amap.com',
        timeout: 15000,
        retries: 2
      }
    },
    monitoring: {
      enabled: false,
      logLevel: 'debug'
    },
    security: {
      corsOrigins: ['http://localhost:3000'],
      rateLimiting: false
    }
  },
  
  production: {
    database: {
      url: process.env.DATABASE_URL,
      ssl: true,
      logging: false,
      pool: {
        min: 5,
        max: 20
      }
    },
    redis: {
      url: process.env.REDIS_URL,
      keyPrefix: 'prod:',
      cluster: true
    },
    external: {
      deepseek: {
        baseUrl: 'https://api.deepseek.com',
        timeout: 30000,
        retries: 3,
        circuitBreaker: true
      },
      gaode: {
        baseUrl: 'https://restapi.amap.com',
        timeout: 15000,
        retries: 2,
        circuitBreaker: true
      }
    },
    monitoring: {
      enabled: true,
      logLevel: 'error',
      metrics: true,
      tracing: true
    },
    security: {
      corsOrigins: ['https://travel-assistant.com'],
      rateLimiting: true,
      helmet: true
    }
  }
};
```

### 环境变量模板
```bash
# .env.example
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/travel_assistant
DB_SSL_CA=path/to/ca-certificate.crt

# Redis 配置
REDIS_URL=redis://localhost:6379

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters
JWT_REFRESH_SECRET=your-refresh-token-secret

# 外部服务 API 密钥
DEEPSEEK_API_KEY=your-deepseek-api-key
GAODE_API_KEY=your-gaode-map-api-key

# 加密密钥
ENCRYPTION_KEY=your-32-byte-encryption-key

# 监控和日志
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn

# 邮件服务
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# 文件存储
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_REGION=us-east-1
```

## 监控和日志

### 应用监控配置
```typescript
// monitoring/setup.ts
import { createPrometheusMetrics } from './prometheus';
import { setupSentry } from './sentry';
import { configureWinston } from './winston';

export const setupMonitoring = () => {
  // Prometheus 指标收集
  const metrics = createPrometheusMetrics({
    httpRequests: 'http_requests_total',
    httpDuration: 'http_request_duration_seconds',
    dbConnections: 'database_connections_active',
    externalApiCalls: 'external_api_calls_total'
  });
  
  // Sentry 错误追踪
  setupSentry({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
  });
  
  // Winston 日志配置
  const logger = configureWinston({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
    transports: [
      'console',
      ...(process.env.NODE_ENV === 'production' ? ['file', 'cloudwatch'] : [])
    ]
  });
  
  return { metrics, logger };
};
```

### 健康检查端点
```typescript
// api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/database';
import { checkRedisHealth } from '@/lib/redis';
import { checkExternalServices } from '@/lib/external-services';

export async function GET(request: NextRequest) {
  const checks = await Promise.allSettled([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkExternalServices()
  ]);
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || 'unknown',
    checks: {
      database: checks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      redis: checks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      external: checks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy'
    }
  };
  
  const isHealthy = Object.values(health.checks).every(status => status === 'healthy');
  health.status = isHealthy ? 'healthy' : 'unhealthy';
  
  return NextResponse.json(health, {
    status: isHealthy ? 200 : 503
  });
}
```

## 性能优化

### 构建优化
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生产环境优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  
  // 图片优化
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif']
  },
  
  // 压缩配置
  compress: true,
  
  // 实验性功能
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  
  // Webpack 优化
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false
      };
    }
    
    // Bundle 分析
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false
        })
      );
    }
    
    return config;
  }
};

module.exports = nextConfig;
```

### 缓存策略
```typescript
// lib/cache-strategy.ts
export const cacheConfig = {
  // 静态资源缓存
  static: {
    maxAge: 31536000, // 1年
    staleWhileRevalidate: 86400 // 1天
  },
  
  // API 响应缓存
  api: {
    travelPlans: {
      maxAge: 3600, // 1小时
      tags: ['travel-plans']
    },
    userPreferences: {
      maxAge: 1800, // 30分钟
      tags: ['user-preferences']
    },
    mapData: {
      maxAge: 86400, // 1天
      tags: ['map-data']
    }
  },
  
  // 数据库查询缓存
  database: {
    userProfiles: 900, // 15分钟
    travelHistory: 1800, // 30分钟
    systemConfig: 3600 // 1小时
  }
};
```

## 安全部署检查

### 部署前安全检查清单
```bash
#!/bin/bash
# scripts/security-check.sh

echo "执行部署前安全检查..."

# 1. 环境变量检查
check_env_vars() {
    echo "检查敏感环境变量..."
    
    if [[ -z "$JWT_SECRET" ]] || [[ ${#JWT_SECRET} -lt 32 ]]; then
        echo "❌ JWT_SECRET 未设置或长度不足32字符"
        return 1
    fi
    
    if [[ -z "$ENCRYPTION_KEY" ]] || [[ ${#ENCRYPTION_KEY} -lt 32 ]]; then
        echo "❌ ENCRYPTION_KEY 未设置或长度不足32字符"
        return 1
    fi
    
    echo "✅ 环境变量检查通过"
}

# 2. 依赖安全检查
check_dependencies() {
    echo "检查依赖包安全性..."
    
    npm audit --audit-level high
    if [[ $? -ne 0 ]]; then
        echo "❌ 发现高危安全漏洞"
        return 1
    fi
    
    echo "✅ 依赖包安全检查通过"
}

# 3. 代码安全扫描
check_code_security() {
    echo "执行代码安全扫描..."
    
    # 使用 semgrep 或其他安全扫描工具
    if command -v semgrep &> /dev/null; then
        semgrep --config=auto --error .
        if [[ $? -ne 0 ]]; then
            echo "❌ 代码安全扫描发现问题"
            return 1
        fi
    fi
    
    echo "✅ 代码安全扫描通过"
}

# 4. 配置安全检查
check_config_security() {
    echo "检查配置安全性..."
    
    # 检查是否禁用了调试模式
    if [[ "$NODE_ENV" == "production" ]] && [[ "$DEBUG" == "true" ]]; then
        echo "❌ 生产环境不应启用调试模式"
        return 1
    fi
    
    # 检查 CORS 配置
    if [[ "$CORS_ORIGIN" == "*" ]]; then
        echo "❌ CORS 不应允许所有域名"
        return 1
    fi
    
    echo "✅ 配置安全检查通过"
}

# 执行所有检查
main() {
    check_env_vars && \
    check_dependencies && \
    check_code_security && \
    check_config_security
    
    if [[ $? -eq 0 ]]; then
        echo "🎉 所有安全检查通过，可以部署"
        exit 0
    else
        echo "❌ 安全检查失败，请修复问题后重试"
        exit 1
    fi
}

main "$@"
```

## 回滚和灾难恢复

### 自动回滚机制
```bash
#!/bin/bash
# scripts/rollback.sh

BACKUP_RETENTION_DAYS=7

# 数据库备份回滚
rollback_database() {
    local backup_file=$1
    
    echo "回滚数据库到备份: $backup_file"
    
    # 创建当前状态备份
    pg_dump $DATABASE_URL > "rollback_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # 恢复到指定备份
    psql $DATABASE_URL < "$backup_file"
    
    if [[ $? -eq 0 ]]; then
        echo "✅ 数据库回滚成功"
    else
        echo "❌ 数据库回滚失败"
        exit 1
    fi
}

# 应用版本回滚
rollback_application() {
    local previous_version=$1
    
    echo "回滚应用到版本: $previous_version"
    
    # 停止当前服务
    docker-compose down
    
    # 切换到之前版本
    docker tag "smart-travel-assistant:$previous_version" smart-travel-assistant:latest
    
    # 重启服务
    docker-compose up -d
    
    # 健康检查
    sleep 30
    if curl -f http://localhost:3000/api/health; then
        echo "✅ 应用回滚成功"
    else
        echo "❌ 应用回滚失败"
        exit 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    echo "清理 $BACKUP_RETENTION_DAYS 天前的备份..."
    find ./backups -name "*.sql" -mtime +$BACKUP_RETENTION_DAYS -delete
    find ./backups -name "*.tar.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
}

main() {
    local action=${1:-"app"}
    local target=${2:-"previous"}
    
    case $action in
        "database")
            rollback_database "$target"
            ;;
        "app")
            rollback_application "$target"
            ;;
        "full")
            rollback_database "$target.sql"
            rollback_application "$target"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            echo "用法: $0 [database|app|full|cleanup] [target]"
            exit 1
            ;;
    esac
}

main "$@"
```

## 部署检查清单

### 部署前检查
- [ ] 所有测试通过（单元测试、集成测试、E2E测试）
- [ ] 代码审查完成
- [ ] 安全扫描通过
- [ ] 性能测试通过
- [ ] 数据库迁移脚本准备就绪
- [ ] 环境变量配置正确
- [ ] 监控和告警配置完成
- [ ] 回滚计划准备就绪

### 部署后验证
- [ ] 应用健康检查通过
- [ ] 关键功能验证完成
- [ ] 性能指标正常
- [ ] 错误率在可接受范围内
- [ ] 监控数据正常收集
- [ ] 日志输出正常
- [ ] 外部服务连接正常
- [ ] 用户反馈收集机制正常