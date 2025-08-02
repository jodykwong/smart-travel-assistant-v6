# 智游助手v6.0 - 部署指南

## 📋 目录

- [1. 部署概述](#1-部署概述)
- [2. 环境准备](#2-环境准备)
- [3. 本地开发部署](#3-本地开发部署)
- [4. Docker部署](#4-docker部署)
- [5. 生产环境部署](#5-生产环境部署)
- [6. Kubernetes部署](#6-kubernetes部署)
- [7. 监控和维护](#7-监控和维护)
- [8. 故障排除](#8-故障排除)

---

## 1. 部署概述

### 1.1 部署架构

智游助手v6.0支持多种部署方式，基于**为失败而设计**的原则，提供高可用的部署方案：

```
┌─────────────────────────────────────────────────────────────┐
│                        负载均衡层                            │
├─────────────────────────────────────────────────────────────┤
│  Nginx/HAProxy  │  CDN  │  SSL终端  │  DDoS防护            │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                        应用服务层                            │
├─────────────────────────────────────────────────────────────┤
│  App Instance 1  │  App Instance 2  │  App Instance 3      │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                        数据服务层                            │
├─────────────────────────────────────────────────────────────┤
│  Redis Cluster  │  SQLite DB  │  File Storage              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 部署选项

| 部署方式 | 适用场景 | 复杂度 | 可扩展性 | 推荐指数 |
|----------|----------|--------|----------|----------|
| 本地开发 | 开发测试 | ⭐ | ⭐ | 开发环境 |
| Docker单机 | 小型部署 | ⭐⭐ | ⭐⭐ | 个人项目 |
| Docker Compose | 中型部署 | ⭐⭐⭐ | ⭐⭐⭐ | 中小企业 |
| Kubernetes | 企业级 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 大型企业 |

---

## 2. 环境准备

### 2.1 系统要求

#### 最低配置
- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 20GB SSD
- **网络**: 10Mbps带宽

#### 推荐配置
- **CPU**: 4核心以上
- **内存**: 8GB RAM以上
- **存储**: 50GB SSD以上
- **网络**: 100Mbps带宽以上

### 2.2 软件依赖

#### 必需软件
```bash
# Node.js (推荐使用nvm管理)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Python 3.8+
sudo apt-get install python3 python3-pip

# Redis (可选，用于生产环境缓存)
sudo apt-get install redis-server

# Docker (用于容器化部署)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

#### 可选软件
```bash
# PM2 (进程管理)
npm install -g pm2

# Nginx (反向代理)
sudo apt-get install nginx

# Certbot (SSL证书)
sudo apt-get install certbot python3-certbot-nginx
```

---

## 3. 本地开发部署

### 3.1 快速启动

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/smart-travel-assistant-v6.git
cd smart-travel-assistant-v6.0

# 2. 安装依赖
npm install
pip3 install python-dotenv openai tiktoken

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的API密钥

# 4. 启动开发服务器
npm run dev
```

### 3.2 环境配置

创建 `.env` 文件：

```env
# === 应用配置 ===
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3001
PORT=3001

# === API密钥 ===
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
AMAP_MCP_API_KEY=your-amap-key

# === 数据库配置 ===
DATABASE_URL=file:./dev.db
DATABASE_TYPE=sqlite
DATABASE_TIMEOUT=10000

# === 缓存配置 ===
CACHE_ENABLED=false
REDIS_URL=redis://localhost:6379

# === 认证配置 ===
JWT_SECRET=your-development-jwt-secret
JWT_EXPIRES_IN=7d
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret

# === 日志配置 ===
LOG_LEVEL=debug
```

### 3.3 开发工具

```bash
# 代码格式化
npm run format

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 运行测试
npm run test:e2e
```

---

## 4. Docker部署

### 4.1 单容器部署

#### Dockerfile
```dockerfile
# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 生产镜像
FROM node:20-alpine AS runner

WORKDIR /app

# 安装Python依赖
RUN apk add --no-cache python3 py3-pip
RUN pip3 install python-dotenv openai tiktoken

# 复制构建产物
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3001
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 构建和运行
```bash
# 构建镜像
docker build -t smart-travel-assistant:v6.0 .

# 运行容器
docker run -d \
  --name smart-travel-app \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e DEEPSEEK_API_KEY=your-key \
  -e AMAP_MCP_API_KEY=your-key \
  -v $(pwd)/data:/app/data \
  smart-travel-assistant:v6.0
```

### 4.2 Docker Compose部署

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./data/production.db
      - REDIS_URL=redis://redis:6379
      - CACHE_ENABLED=true
    env_file:
      - .env.production
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
```

#### 启动服务
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 5. 生产环境部署

### 5.1 服务器配置

#### 系统优化
```bash
# 增加文件描述符限制
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# 优化内核参数
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p

# 配置防火墙
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

#### Nginx配置
```nginx
# /etc/nginx/sites-available/smart-travel
upstream app_servers {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://app_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.2 PM2部署

#### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'smart-travel-assistant',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=4096'
  }]
};
```

#### 部署命令
```bash
# 构建项目
npm run build

# 启动PM2
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save
pm2 startup

# 监控
pm2 monit
```

---

## 6. Kubernetes部署

### 6.1 基础配置

#### Namespace
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: smart-travel
```

#### ConfigMap
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: smart-travel
data:
  NODE_ENV: "production"
  DATABASE_TYPE: "sqlite"
  CACHE_ENABLED: "true"
  LOG_LEVEL: "info"
```

#### Secret
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: smart-travel
type: Opaque
data:
  DEEPSEEK_API_KEY: <base64-encoded-key>
  AMAP_MCP_API_KEY: <base64-encoded-key>
  JWT_SECRET: <base64-encoded-secret>
```

### 6.2 应用部署

#### Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smart-travel-app
  namespace: smart-travel
spec:
  replicas: 3
  selector:
    matchLabels:
      app: smart-travel-app
  template:
    metadata:
      labels:
        app: smart-travel-app
    spec:
      containers:
      - name: app
        image: smart-travel-assistant:v6.0
        ports:
        - containerPort: 3001
        env:
        - name: PORT
          value: "3001"
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: app-data-pvc
```

#### Service
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: smart-travel-service
  namespace: smart-travel
spec:
  selector:
    app: smart-travel-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP
```

#### Ingress
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: smart-travel-ingress
  namespace: smart-travel
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: smart-travel-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: smart-travel-service
            port:
              number: 80
```

### 6.3 部署命令

```bash
# 应用所有配置
kubectl apply -f k8s/

# 查看部署状态
kubectl get pods -n smart-travel

# 查看日志
kubectl logs -f deployment/smart-travel-app -n smart-travel

# 扩容
kubectl scale deployment smart-travel-app --replicas=5 -n smart-travel
```

---

## 7. 监控和维护

### 7.1 健康检查

```bash
# 应用健康检查
curl -f http://localhost:3001/api/health

# 缓存状态检查
curl -f http://localhost:3001/api/cache/stats

# 系统资源监控
htop
iostat -x 1
```

### 7.2 日志管理

```bash
# PM2日志
pm2 logs smart-travel-assistant

# Docker日志
docker logs -f smart-travel-app

# 系统日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 7.3 备份策略

```bash
#!/bin/bash
# backup.sh - 数据备份脚本

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/smart-travel"

# 备份数据库
cp ./data/production.db $BACKUP_DIR/db_backup_$DATE.db

# 备份配置文件
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz .env* *.config.js

# 清理旧备份（保留30天）
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $DATE"
```

---

## 8. 故障排除

### 8.1 常见问题

#### 应用无法启动
```bash
# 检查端口占用
netstat -tlnp | grep 3001

# 检查环境变量
printenv | grep -E "(DEEPSEEK|AMAP)"

# 检查依赖
npm ls
pip3 list
```

#### 性能问题
```bash
# 检查内存使用
free -h
ps aux --sort=-%mem | head

# 检查CPU使用
top -p $(pgrep -f "node")

# 检查磁盘IO
iotop -o
```

#### 缓存问题
```bash
# 检查Redis连接
redis-cli ping

# 清理缓存
redis-cli flushall

# 检查缓存统计
curl http://localhost:3001/api/cache/stats
```

### 8.2 应急处理

#### 服务重启
```bash
# PM2重启
pm2 restart smart-travel-assistant

# Docker重启
docker-compose restart app

# Kubernetes重启
kubectl rollout restart deployment/smart-travel-app -n smart-travel
```

#### 回滚部署
```bash
# PM2回滚
pm2 stop smart-travel-assistant
git checkout previous-version
npm run build
pm2 start ecosystem.config.js

# Kubernetes回滚
kubectl rollout undo deployment/smart-travel-app -n smart-travel
```

---

**部署指南版本**: v6.0.0  
**最后更新**: 2025年8月2日  
**维护团队**: 智游助手DevOps团队
