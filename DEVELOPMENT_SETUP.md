# 智游助手 v6.5 开发环境搭建指南

## 🎯 项目概述

本项目基于 **v6.5** 版本的智游助手AI旅行规划系统，已成功拉取到本地并配置好开发环境。

## ✅ 已完成的配置

### 1. 代码拉取
- ✅ 从 GitHub 仓库同步到 v6.5 开发基线
- ✅ 创建了开发分支 `development-v6.5`
- ✅ 当前工作目录：`/Users/jodykwong/Documents/augment-projects/smart-travel-assistant-augment-v6.5`

### 2. 环境配置
- ✅ 创建了 `.env` 配置文件（基于 `.env.example`）
- ✅ 安装了所有 npm 依赖包
- ✅ 开发服务器已启动，运行在 http://localhost:3001

### 3. 项目结构
```
smart-travel-assistant-augment-v6.5/
├── src/                    # 源代码目录
│   ├── components/         # React 组件
│   ├── pages/             # Next.js 页面
│   ├── services/          # 业务服务
│   ├── lib/               # 工具库
│   └── types/             # TypeScript 类型定义
├── docs/                  # 项目文档
├── tests/                 # 测试文件
├── prototype/             # 原型文件
├── .env                   # 环境变量配置
├── package.json           # 项目依赖
└── README.md              # 项目说明
```

## 🚀 快速开始

### 1. 访问应用
开发服务器已启动，可以通过以下地址访问：
- **主页**: http://localhost:3001
- **旅行规划**: http://localhost:3001/planning

### 2. 开发命令
```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 运行测试
npm run test

# 运行 E2E 测试
npm run test:e2e

# 类型检查
npm run type-check

# 代码格式化
npm run format
```

## 🔧 环境变量配置（v6.5 双链路）

### 必需配置
在开始开发前，需要配置以下关键的 API 密钥：

```bash
# 编辑 .env 文件
nano .env

# LLM（主备）
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL_NAME=deepseek-chat
SILICONFLOW_API_KEY=your_siliconflow_api_key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_DEEPSEEK_MODEL=deepseek-ai/DeepSeek-V3
LLM_PROVIDERS=deepseek,siliconflow
LLM_PRIMARY_PROVIDER=deepseek
LLM_FALLBACK_PROVIDER=siliconflow

# 地图 MCP（经由 LLM 工具）
AMAP_MCP_SERVER_URL=https://mcp.amap.com/sse
AMAP_MCP_API_KEY=your_amap_key
MCP_AMAP_ENABLED=true
TENCENT_MCP_BASE_URL=https://apis.map.qq.com/mcp
TENCENT_MCP_API_KEY=your_tencent_key
MCP_TENCENT_ENABLED=true
MCP_TRANSPORT_TYPE=sse
MCP_TIMEOUT=30000
MCP_RETRY_ATTEMPTS=3

# Failover
FAILOVER_ENABLED=true
FAILOVER_TIMEOUT=5000
FAILOVER_RETRY_ATTEMPTS=3
FAILOVER_CIRCUIT_BREAKER_THRESHOLD=5
LOAD_BALANCER_STRATEGY=health_based
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
```

### API 密钥获取
1. **DeepSeek API**: https://platform.deepseek.com/api-keys
2. **高德地图 API**: https://console.amap.com/dev/key/app
3. **腾讯地图 API**: https://lbs.qq.com

## 📋 技术栈

### 前端技术
- **Next.js 14**: React 全栈框架
- **React 18**: 用户界面库
- **TypeScript**: 类型安全的 JavaScript
- **Tailwind CSS**: 原子化 CSS 框架
- **Framer Motion**: 动画库

### 后端技术
- **Next.js API Routes**: 服务端 API
- **LangGraph**: AI 工作流编排
- **DeepSeek**: 大语言模型
- **高德地图 MCP**: 地理数据服务

### 开发工具
- **Vitest**: 单元测试框架
- **Playwright**: E2E 测试框架
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Husky**: Git 钩子管理

## 🧪 测试指南

### 1. 环境测试
```bash
# 测试 DeepSeek API 连接
python3 test_deepseek_connection.py

# 测试环境配置
python3 simple_test.py
```

### 2. 前端测试
```bash
# 运行单元测试
npm run test

# 运行 E2E 测试
npm run test:e2e

# 运行测试覆盖率
npm run test:coverage
```

### 3. Jupyter Notebook 测试
项目包含 4 个核心测试 Notebook：
1. `01_langgraph_architecture.ipynb` - LangGraph 架构测试
2. `02_amap_integration.ipynb` - 高德 MCP 集成测试
3. `03_intelligent_planning.ipynb` - 智能规划测试
4. `04_complete_integration_test.ipynb` - 完整集成测试

## 🔄 开发工作流

### 1. 分支管理
```bash
# 查看当前分支
git branch

# 创建新功能分支
git checkout -b feature/your-feature-name

# 提交更改
git add .
git commit -m "feat: 添加新功能"

# 推送到远程
git push origin feature/your-feature-name
```

### 2. 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 编写单元测试和集成测试
- 提交前运行代码检查

## 📚 重要文档

### 项目文档
- `README.md` - 项目总览
- `ENVIRONMENT_SETUP_GUIDE.md` - 环境配置详细指南
- `API_DOCUMENTATION_v5.0.md` - API 文档
- `DEPLOYMENT_GUIDE_v5.0.md` - 部署指南

### 架构文档
- `docs/ARCHITECTURE.md` - 系统架构说明
- `docs/API.md` - API 设计文档
- `docs/DEPLOYMENT.md` - 部署文档

## 🚨 注意事项

### 1. API 密钥安全
- ⚠️ 不要将真实的 API 密钥提交到版本控制
- ⚠️ 使用 `.env` 文件存储敏感信息
- ⚠️ 确保 `.env` 文件在 `.gitignore` 中

### 2. 开发环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- Python 3.8+ (用于测试脚本)

### 3. 端口配置
- 开发服务器：http://localhost:3001
- WebSocket 服务：端口 3002
- 如果端口被占用，Next.js 会自动选择下一个可用端口

## 🎯 下一步开发建议

1. **配置 API 密钥**：获取并配置 DeepSeek 和高德地图 API 密钥
2. **运行测试**：执行完整的测试套件确保系统正常
3. **熟悉代码结构**：浏览 `src/` 目录了解项目架构
4. **查看文档**：阅读 `docs/` 目录中的技术文档
5. **开始开发**：基于现有功能进行二次开发

## 📞 技术支持

如果在开发过程中遇到问题，可以：
1. 查看项目文档和 README
2. 检查 GitHub Issues
3. 运行测试脚本诊断问题
4. 查看开发服务器日志

---

**项目状态**: ✅ 开发环境已就绪
**版本**: v6.5
**最后更新**: 2025年8月9日
