# 智游助手v6.0 Playwright自动化测试指南

## 📋 概述

本指南介绍如何使用Playwright自动化测试框架执行智游助手v6.0项目的全自动端到端测试。

## 🎯 测试范围

### 1. 环境配置验证
- ✅ .env文件配置检查
- ✅ API密钥格式验证
- ✅ Python环境和依赖检查
- ✅ Node.js环境和依赖检查
- ✅ 测试脚本可执行性验证
- ✅ Jupyter Notebook文件完整性检查

### 2. API连接测试
- ✅ DeepSeek API连接和响应时间测试
- ✅ 硅基流动API连接测试（应急链路）
- ✅ 高德MCP API连接和数据质量测试
- ✅ API性能基准测试和健康评分

### 3. Jupyter Notebook自动化执行
- ✅ 01_langgraph_architecture.ipynb - LangGraph架构测试
- ✅ 02_amap_integration.ipynb - 高德MCP集成测试
- ✅ 03_intelligent_planning.ipynb - 智能规划生成测试
- ✅ 04_complete_integration_test.ipynb - 完整集成测试

### 4. Next.js应用测试
- ✅ 应用启动和健康检查
- ✅ 首页加载和基本功能测试
- ✅ 旅游规划页面功能测试
- ✅ API路由可用性测试
- ✅ 性能基准测试（FCP、LCP等）

### 5. 13天新疆旅游规划端到端测试
- ✅ 用户旅程：访问首页并开始规划
- ✅ 用户旅程：填写旅游偏好和需求
- ✅ 用户旅程：等待规划生成并查看结果
- ✅ 规划质量和完整性验证
- ✅ 用户体验流程完整性测试

## 🚀 快速开始

### 前置要求

1. **系统环境**：
   - Node.js 18+
   - Python 3.8+
   - npm 或 yarn

2. **API密钥配置**：
   ```bash
   # 确保.env文件包含以下密钥
   DEEPSEEK_API_KEY=your_deepseek_api_key
   AMAP_MCP_API_KEY=your_amap_api_key
   SILICONFLOW_API_KEY=your_siliconflow_api_key
   ```

### 安装依赖

```bash
# 安装Node.js依赖
npm install

# 安装Playwright浏览器
npm run playwright:install

# 安装Python依赖（可选）
pip3 install jupyter python-dotenv openai tiktoken
```

## 🧪 执行测试

### 方式1：一键执行完整测试套件（推荐）

```bash
# 执行完整的自动化测试套件
npm run test:e2e

# 或者使用有头模式（可以看到浏览器操作）
npm run test:e2e:headed
```

### 方式2：分步执行测试

```bash
# 1. 基础环境测试
npm run test:environment

# 2. API连接测试
npm run test:api

# 3. Jupyter Notebook测试
npm run test:notebooks

# 4. Playwright端到端测试
npm run test:playwright

# 5. 调试模式（逐步执行）
npm run test:playwright:debug
```

### 方式3：直接使用脚本

```bash
# 执行主测试脚本
node run-e2e-tests.js

# 或者直接使用Playwright
npx playwright test --config=tests/e2e/playwright.config.ts
```

## 📊 测试报告

### 自动生成的报告文件

测试完成后，在`test-results/`目录下会生成以下报告：

#### 主要报告
- **`test-report.html`** - 可视化HTML测试报告
- **`comprehensive-test-report.json`** - 综合测试结果JSON报告
- **`performance-benchmark-report.json`** - 性能基准测试报告

#### 模块测试结果
- **`environment-test-results.json`** - 环境配置验证结果
- **`api-test-results.json`** - API连接测试结果
- **`notebook-test-results.json`** - Jupyter Notebook执行结果
- **`nextjs-test-results.json`** - Next.js应用测试结果
- **`e2e-travel-planning-results.json`** - 端到端旅游规划测试结果

#### 辅助文件
- **`test-execution-summary.json`** - 测试执行摘要
- **`test-metadata.json`** - 测试元数据
- **`README.md`** - 测试结果说明文档

### 查看报告

```bash
# 在浏览器中打开HTML报告
open test-results/test-report.html

# 查看综合测试结果
cat test-results/comprehensive-test-report.json | jq

# 查看性能基准
cat test-results/performance-benchmark-report.json | jq
```

## 🔧 配置选项

### 环境变量配置

```bash
# 测试配置
TEST_MODE=false                    # 是否使用测试模式
HEADLESS=true                      # 是否无头模式运行
INTEGRATION_TEST_TIMEOUT=120000    # 集成测试超时时间

# 性能配置
MAX_CONCURRENT_SESSIONS=5          # 最大并发会话数
TOKEN_LIMIT_PER_SESSION=20000      # 每会话Token限制
```

### Playwright配置

编辑`tests/e2e/playwright.config.ts`来自定义：

```typescript
export default defineConfig({
  // 测试超时
  timeout: 300000, // 5分钟

  // 浏览器配置
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // 报告配置
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
  ],
});
```

## 🐛 故障排除

### 常见问题

1. **API密钥配置问题**
   ```bash
   # 检查环境变量
   cat .env | grep API_KEY
   
   # 验证API连接
   npm run test:api
   ```

2. **Python依赖问题**
   ```bash
   # 检查Python环境
   python3 --version
   pip3 list | grep -E "(jupyter|openai|tiktoken)"
   
   # 重新安装依赖
   pip3 install -r requirements.txt
   ```

3. **Playwright浏览器问题**
   ```bash
   # 重新安装浏览器
   npx playwright install
   
   # 安装系统依赖
   npx playwright install-deps
   ```

4. **测试超时问题**
   ```bash
   # 增加超时时间
   export INTEGRATION_TEST_TIMEOUT=300000
   
   # 使用有头模式调试
   npm run test:e2e:headed
   ```

### 调试技巧

1. **使用调试模式**：
   ```bash
   npm run test:playwright:debug
   ```

2. **查看详细日志**：
   ```bash
   DEBUG=pw:api npm run test:playwright
   ```

3. **保留测试痕迹**：
   ```bash
   npx playwright test --trace on
   ```

4. **截图和视频**：
   测试失败时会自动生成截图和视频，保存在`test-results/`目录

## 📈 性能基准

### 预期性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| API响应时间 | < 5秒 | 单次API调用 |
| 页面加载时间 | < 8秒 | 首页完整加载 |
| Notebook执行 | < 5分钟 | 单个Notebook |
| 端到端测试 | < 30分钟 | 完整测试套件 |
| 成功率 | > 90% | 整体测试通过率 |

### 性能优化建议

1. **API优化**：
   - 使用连接池
   - 实现请求缓存
   - 设置合理的超时时间

2. **前端优化**：
   - 代码分割和懒加载
   - 图片优化和CDN
   - 减少不必要的重渲染

3. **测试优化**：
   - 并行执行独立测试
   - 使用测试数据缓存
   - 优化等待策略

## 🔄 持续集成

### GitHub Actions配置示例

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          AMAP_MCP_API_KEY: ${{ secrets.AMAP_MCP_API_KEY }}
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## 📞 技术支持

如果遇到问题，请按以下步骤获取帮助：

1. **查看测试日志**：检查`test-results/`目录下的详细日志
2. **运行基础测试**：执行`npm run test:environment`验证环境
3. **检查API连接**：运行`npm run test:api`验证API状态
4. **查阅文档**：参考本指南和Playwright官方文档
5. **提交Issue**：在项目仓库中提交详细的问题报告

---

**最后更新**：2025年8月2日  
**版本**：v6.0.0  
**维护者**：Augment Agent (CTO级技术架构师)
