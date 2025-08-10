# 智游助手v5.0 - 环境管理指南

## 🎯 环境架构概览

智游助手v5.0采用**双环境架构**，确保原型开发与生产环境的完全隔离：

```
智游助手v5.0 环境架构
├── 🟦 Node.js生产环境 (主要)
│   ├── Next.js 14 + React 18
│   ├── TypeScript + Zustand
│   ├── package.json 依赖管理
│   └── .env.local 配置管理
│
└── 🟨 Python原型环境 (辅助)
    ├── Jupyter Notebook
    ├── LangGraph + LangChain
    ├── requirements.txt 依赖管理
    └── .env 配置管理
```

## 🚀 快速启动指南

### Node.js生产环境 (主要环境)

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入真实的API密钥

# 3. 验证环境
node scripts/verify-environment.js

# 4. 启动开发服务器
npm run dev

# 5. 访问应用
open http://localhost:3000
```

### Python原型环境 (可选)

```bash
# 1. 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动Jupyter
jupyter notebook

# 4. 运行原型文件
# - 01_langgraph_architecture.ipynb
# - 02_amap_integration.ipynb
# - 03_intelligent_planning.ipynb
# - 04_complete_integration_test.ipynb
```

## 🔧 环境配置详解

### 必需环境变量

| 变量名 | 用途 | 获取方式 |
|--------|------|----------|
| `SUPABASE_URL` | 数据库连接 | [Supabase Dashboard](https://supabase.com) |
| `SUPABASE_ANON_KEY` | 数据库认证 | Supabase项目设置 |
| `OPENAI_API_KEY` | AI服务 | [OpenAI Platform](https://platform.openai.com) |
| `AMAP_API_KEY` | 地图服务 | [高德开放平台](https://lbs.amap.com) |
| `JWT_SECRET` | 认证加密 | 自定义强密码 |

### 可选环境变量

| 变量名 | 用途 | 影响 |
|--------|------|------|
| `REDIS_URL` | 缓存服务 | 性能提升 |
| `SENTRY_DSN` | 错误监控 | 生产环境推荐 |
| `VERCEL_ANALYTICS_ID` | 用户分析 | 数据洞察 |

## 🔍 环境验证清单

### 自动验证
```bash
# 运行自动验证脚本
node scripts/verify-environment.js

# 预期输出: 成功率 > 80%
```

### 手动验证
```bash
# 1. 检查依赖安装
npm list --depth=0

# 2. 检查TypeScript编译
npm run type-check

# 3. 检查代码格式
npm run lint

# 4. 运行测试
npm run test

# 5. 构建项目
npm run build
```

## 🐛 常见问题解决

### 问题1: npm install失败
```bash
# 解决方案
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 问题2: TypeScript编译错误
```bash
# 解决方案
npm run type-check
# 根据错误信息修复类型问题
```

### 问题3: 环境变量未生效
```bash
# 检查文件名
ls -la | grep env

# 确保文件名为 .env.local
# 重启开发服务器
npm run dev
```

### 问题4: Python notebook无法运行
```bash
# 确保Python环境激活
source venv/bin/activate

# 重新安装依赖
pip install -r requirements.txt

# 启动Jupyter
jupyter notebook
```

## 📊 性能监控

### 开发环境监控
```bash
# 内存使用监控
npm run dev -- --inspect

# 构建分析
npm run analyze

# 性能测试
npm run lighthouse
```

### 生产环境监控
- **错误监控**: Sentry集成
- **性能监控**: Vercel Analytics
- **用户行为**: Google Analytics

## 🔒 安全最佳实践

### 环境变量安全
```bash
# ❌ 错误做法
git add .env.local

# ✅ 正确做法
echo ".env.local" >> .gitignore
```

### API密钥管理
- 使用环境变量存储敏感信息
- 定期轮换API密钥
- 限制API密钥权限范围
- 监控API使用情况

## 🚀 部署环境配置

### Vercel部署
```bash
# 1. 连接GitHub仓库
vercel --prod

# 2. 配置环境变量
# 在Vercel Dashboard中设置所有必需的环境变量

# 3. 自动部署
git push origin main
```

### Docker部署
```bash
# 1. 构建镜像
docker build -t smart-travel-assistant .

# 2. 运行容器
docker run -p 3000:3000 --env-file .env.local smart-travel-assistant

# 3. 使用docker-compose
docker-compose up -d
```

## 📋 环境维护清单

### 每周维护
- [ ] 检查依赖更新: `npm outdated`
- [ ] 运行安全审计: `npm audit`
- [ ] 清理缓存: `npm cache clean --force`
- [ ] 验证环境: `node scripts/verify-environment.js`

### 每月维护
- [ ] 更新依赖: `npm update`
- [ ] 轮换API密钥
- [ ] 检查性能指标
- [ ] 备份环境配置

### 季度维护
- [ ] 主要版本升级
- [ ] 安全漏洞修复
- [ ] 架构优化评估
- [ ] 文档更新

## 🆘 紧急故障处理

### 服务无法启动
1. 检查环境变量配置
2. 验证依赖安装状态
3. 查看错误日志
4. 回滚到上一个工作版本

### 性能问题
1. 检查内存使用情况
2. 分析网络请求
3. 优化数据库查询
4. 启用缓存机制

### 安全问题
1. 立即轮换受影响的API密钥
2. 检查访问日志
3. 更新安全补丁
4. 通知相关团队

## 📞 支持联系

- **技术支持**: tech-support@smart-travel-assistant.com
- **紧急联系**: emergency@smart-travel-assistant.com
- **文档更新**: docs@smart-travel-assistant.com
