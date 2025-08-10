# 🚀 智游助手v6.5快速开始指南

## 📋 系统要求

- **Node.js**: v18.17.0+
- **npm**: v9.0.0+
- **操作系统**: macOS, Linux, Windows
- **内存**: 最少4GB，推荐8GB

## ⚡ 5分钟快速部署

### 1. 获取代码
```bash
# 克隆仓库
git clone https://github.com/your-org/smart-travel-assistant-v6.git
cd smart-travel-assistant-v6

# 或下载发布包
wget https://github.com/your-org/smart-travel-assistant-v6/releases/download/v6.5.0-preview/smart-travel-assistant-v6.5.0.tar.gz
tar -xzf smart-travel-assistant-v6.5.0.tar.gz
cd smart-travel-assistant-v6
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑配置文件
nano .env.local
```

**必需配置**：
```bash
# LLM服务 (必需)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
AMAP_API_KEY=your_amap_api_key_here

# Timeline解析架构v2.0 (推荐)
TIMELINE_V2_ENABLED=true
TIMELINE_V2_PERCENTAGE=100
```

### 4. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 5. 验证部署
```bash
# 访问应用
open http://localhost:3000

# 检查健康状态
curl http://localhost:3000/api/health
```

## 🎯 Timeline解析架构v2.0配置

### 基础配置
```bash
# 启用Timeline v2.0 (推荐)
TIMELINE_V2_ENABLED=true
TIMELINE_V2_PERCENTAGE=100
```

### 灰度发布配置
```bash
# 50%流量使用Timeline v2.0
TIMELINE_V2_ENABLED=true
TIMELINE_V2_PERCENTAGE=50
```

### 白名单配置
```bash
# 仅特定会话使用Timeline v2.0
TIMELINE_V2_ENABLED=true
TIMELINE_V2_WHITELIST=session_123,session_456
```

### 紧急回滚
```bash
# 完全禁用Timeline v2.0
TIMELINE_V2_ENABLED=false
```

## 🔑 API密钥获取

### DeepSeek API密钥
1. 访问 [DeepSeek平台](https://platform.deepseek.com)
2. 注册账户并登录
3. 进入API密钥管理页面
4. 创建新的API密钥
5. 复制密钥到 `DEEPSEEK_API_KEY`

### 高德地图API密钥
1. 访问 [高德开放平台](https://console.amap.com)
2. 注册开发者账户
3. 创建应用并申请Web服务API
4. 获取API Key
5. 复制密钥到 `AMAP_API_KEY`

### SiliconFlow API密钥 (可选)
1. 访问 [SiliconFlow平台](https://siliconflow.cn)
2. 注册账户并获取API密钥
3. 复制密钥到 `SILICONFLOW_API_KEY`

## 🧪 功能测试

### 1. 基础功能测试
```bash
# 访问首页
curl http://localhost:3000

# 测试API健康检查
curl http://localhost:3000/api/health
```

### 2. Timeline解析测试
```bash
# 创建测试会话
curl -X POST http://localhost:3000/api/v1/planning/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "北京",
    "totalDays": 3,
    "startDate": "2025-02-01"
  }'

# 获取会话详情 (包含Timeline v2.0数据)
curl http://localhost:3000/api/v1/planning/sessions/{sessionId}
```

### 3. 前端功能测试
1. 访问 http://localhost:3000
2. 创建新的旅行计划
3. 验证Timeline数据正确显示
4. 检查是否有原始文本片段显示

## 🔍 故障排查

### 常见问题

#### 1. 服务启动失败
```bash
# 检查端口占用
lsof -i :3000

# 检查Node.js版本
node --version  # 应该 >= 18.17.0

# 检查依赖安装
npm list --depth=0
```

#### 2. API密钥错误
```bash
# 验证DeepSeek API密钥
curl -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  https://api.deepseek.com/v1/models

# 验证高德地图API密钥
curl "https://restapi.amap.com/v3/geocode/geo?address=北京&key=$AMAP_API_KEY"
```

#### 3. Timeline解析问题
```bash
# 检查Feature Flag状态
curl http://localhost:3000/api/v1/planning/sessions/test | jq '.data.timelineVersion'

# 查看解析日志
grep "Timeline" logs/app.log
```

### 日志查看
```bash
# 查看应用日志
tail -f logs/app.log

# 查看Timeline解析日志
grep "Timeline" logs/app.log | tail -20

# 查看错误日志
grep "ERROR" logs/app.log | tail -10
```

## 📊 性能监控

### 关键指标
- **Timeline解析时间**: 应该 <500ms
- **前端渲染时间**: 应该 <200ms
- **解析成功率**: 应该 >99%
- **内存使用**: 应该 <512MB

### 监控命令
```bash
# 检查内存使用
ps aux | grep node

# 检查Timeline解析性能
curl -w "@curl-format.txt" http://localhost:3000/api/v1/planning/sessions/test

# 检查解析成功率
grep "parseSuccess.*true" logs/app.log | wc -l
```

## 🚀 生产部署

### Docker部署
```bash
# 构建镜像
docker build -t smart-travel-v6.5 .

# 运行容器
docker run -d \
  --name smart-travel \
  -p 3000:3000 \
  -e DEEPSEEK_API_KEY=your_key \
  -e AMAP_API_KEY=your_key \
  -e TIMELINE_V2_ENABLED=true \
  smart-travel-v6.5
```

### 云平台部署
```bash
# Vercel部署
vercel --prod

# 配置环境变量
vercel env add DEEPSEEK_API_KEY
vercel env add AMAP_API_KEY
vercel env add TIMELINE_V2_ENABLED
```

## 📚 更多资源

- 📖 [完整文档](docs/)
- 🏗️ [Timeline解析架构](docs/timeline-architecture.md)
- 🔍 [问题排查SOP](docs/timeline-troubleshooting-sop.md)
- 📋 [API文档](docs/API.md)
- 🚀 [部署指南](docs/DEPLOYMENT.md)
- 🤝 [贡献指南](CONTRIBUTING.md)

## 💬 获取帮助

- **GitHub Issues**: [报告问题](https://github.com/your-org/smart-travel-assistant-v6/issues)
- **GitHub Discussions**: [技术讨论](https://github.com/your-org/smart-travel-assistant-v6/discussions)
- **Email**: support@smart-travel.ai

---

**智游助手v6.5 - Timeline解析架构v2.0，5分钟即可体验！** 🌟
