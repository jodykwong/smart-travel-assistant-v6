# 智游助手v6.52-preview 快速开始指南

## 🚀 5分钟快速部署

### 1. 系统要求
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **现代浏览器** (Chrome 90+, Firefox 88+, Safari 14+)

### 2. 安装步骤

#### 自动安装 (推荐)
```bash
# Unix/Linux/macOS
chmod +x install.sh
./install.sh

# Windows
install.bat
```

#### 手动安装
```bash
# 1. 安装依赖
npm install

# 2. 安装Playwright浏览器
npx playwright install

# 3. 复制环境变量文件
cp .env.example .env.local

# 4. 编辑环境变量文件
# 填入您的API密钥 (DeepSeek, SiliconFlow, 高德, 腾讯地图)

# 5. 运行测试
npm run test:environment

# 6. 启动开发服务器
npm run dev
```

### 3. 访问应用
- **主应用**: http://localhost:3001
- **UI原型**: http://localhost:3001/prototype/main-index.html

## 🔑 API密钥配置

编辑 `.env.local` 文件，填入以下API密钥:

```env
# DeepSeek API (必需)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# 硅基流动API (可选，用于故障转移)
SILICONFLOW_API_KEY=sk-your-siliconflow-api-key-here

# 高德地图API (必需)
AMAP_MCP_API_KEY=your-amap-api-key-here

# 腾讯地图API (可选，用于故障转移)
TENCENT_MCP_API_KEY=your-tencent-map-api-key-here
```

### API密钥获取指南:
- **DeepSeek**: https://platform.deepseek.com/
- **硅基流动**: https://siliconflow.cn/
- **高德地图**: https://lbs.amap.com/
- **腾讯地图**: https://lbs.qq.com/

## 🎨 v6.52-preview 新功能

### 高保真UI原型系统
- **行程概览页面**: 解决信息密度问题，优化13天49个活动展示
- **每日详情页面**: 时间轴布局，清晰展示单日行程安排
- **费用明细页面**: 修复费用显示错误，展示¥20,500预算分解
- **导航索引页面**: 快速跳转、搜索、筛选功能

### 前端问题诊断SOP
- **Playwright集成**: 自动化前端问题检测和验证
- **问题分类**: 渲染、数据、交互、性能四大类问题
- **标准化流程**: 系统性的前端问题排查和解决方案

### 关键修复
- ✅ **费用显示错误**: 从"预算¥0" → "预算¥20,500"
- ✅ **信息过载**: 13天49个活动分页展示，提升查找效率50%
- ✅ **视觉层次混乱**: 采用智游助手v6.5品牌配色
- ✅ **导航功能缺失**: 完整的快速跳转和搜索功能
- ✅ **移动端适配**: 完整响应式设计优化

## 🧪 测试验证

```bash
# 环境测试
npm run test:environment

# API连接测试
npm run test:api

# E2E测试
npm run test:e2e

# 前端测试
npm run test:playwright

# UI原型测试
npm run test:playwright:ui
```

## 🎯 核心功能演示

### 1. 旅行规划
1. 访问 http://localhost:3001
2. 点击"开始规划"
3. 输入目的地和时间
4. 查看AI生成的行程

### 2. UI原型体验
1. 访问 http://localhost:3001/prototype/main-index.html
2. 查看4个核心页面原型
3. 体验现代化交互动画
4. 测试响应式设计

### 3. 前端诊断
1. 运行 `npm run test:playwright`
2. 查看自动化前端问题检测
3. 参考 `docs/frontend-debugging-sop.md`

## 📚 文档资源

### 核心文档
- **README.md**: 项目概述和技术栈
- **CHANGELOG.md**: 版本更新日志
- **BUILD_INFO.json**: 发布信息和技术规格

### 技术文档
- **docs/API.md**: API接口文档
- **docs/ARCHITECTURE.md**: 系统架构设计
- **docs/DEPLOYMENT.md**: 部署指南
- **docs/frontend-debugging-sop.md**: 前端问题诊断SOP

### UI/UX文档
- **prototype/PROTOTYPE-GUIDE.md**: UI原型使用指南
- **prototype/main-index.html**: 原型展示入口
- **docs/ui-ux-analysis-report.md**: UI/UX分析报告

## 🔧 开发工具

### 可用脚本
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run test         # 运行单元测试
npm run test:e2e     # 运行E2E测试
npm run lint         # 代码检查
npm run format       # 代码格式化
```

### 调试工具
```bash
npm run test:playwright:debug    # Playwright调试模式
npm run test:playwright:ui       # Playwright UI模式
npm run test:environment         # 环境检查
```

## 🆘 故障排除

### 常见问题

#### 1. API密钥错误
```bash
# 检查API密钥配置
npm run test:api
```

#### 2. 前端显示问题
```bash
# 运行前端诊断
npm run test:playwright
# 查看诊断指南
cat docs/frontend-debugging-sop.md
```

#### 3. 依赖安装失败
```bash
# 清理缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 4. 端口占用
```bash
# 检查端口占用
lsof -i :3001
# 或使用其他端口
PORT=3002 npm run dev
```

### 获取帮助
- **GitHub Issues**: https://github.com/your-repo/smart-travel-assistant/issues
- **技术文档**: docs/README.md
- **故障排除**: docs/frontend-debugging-sop.md

## 🎉 成功部署检查清单

- [ ] Node.js版本 >= 18.0.0
- [ ] 依赖安装成功
- [ ] API密钥配置完成
- [ ] 开发服务器启动成功
- [ ] 主页面正常访问 (http://localhost:3001)
- [ ] UI原型正常显示 (http://localhost:3001/prototype/main-index.html)
- [ ] 基础测试通过
- [ ] 旅行规划功能正常

---

**智游助手v6.52-preview** - 企业级AI旅行规划系统  
发布日期: 2025-01-10  
技术支持: docs/frontend-debugging-sop.md
