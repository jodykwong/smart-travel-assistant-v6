# 智游助手v6.5前端问题排查标准操作程序(SOP)

## 📋 概述
本SOP用于系统性排查智游助手前端页面问题，特别是sessionId参数获取失败和数据渲染阻塞问题。

## 🔍 排查步骤

### 1. 环境准备
- [ ] 确认后端服务运行状态 (http://localhost:3000)
- [ ] 确认前端服务运行状态 (http://localhost:3001)
- [ ] 准备测试用的sessionId和URL

### 2. SessionId参数获取检查
#### 2.1 URL参数验证
- [ ] 检查URL格式：`/planning/result?sessionId=xxx`
- [ ] 验证sessionId是否存在于URL中
- [ ] 确认sessionId格式正确性

#### 2.2 前端参数获取验证
- [ ] 检查`router.query.sessionId`获取结果
- [ ] 检查`window.location.search`解析结果
- [ ] 检查`router.asPath`解析结果
- [ ] 验证多种获取方式的fallback机制

### 3. API调用状态验证
#### 3.1 网络请求检查
- [ ] 监控Network标签页中的API请求
- [ ] 验证请求URL格式：`/api/planning/result/${sessionId}`
- [ ] 检查请求状态码和响应时间
- [ ] 确认响应数据结构完整性

#### 3.2 API响应数据验证
- [ ] 检查`result.data.result.legacyFormat`数据存在性
- [ ] 验证行程数据数量和结构
- [ ] 确认数据解析逻辑正确性

### 4. 控制台错误日志分析
#### 4.1 JavaScript错误检查
- [ ] 检查Console中的错误信息
- [ ] 分析Warning和Error级别日志
- [ ] 识别组件渲染错误
- [ ] 检查异步操作错误

#### 4.2 React组件状态检查
- [ ] 验证loading状态管理
- [ ] 检查数据状态更新
- [ ] 确认组件生命周期正常

### 5. 页面渲染状态检测
#### 5.1 UI元素检查
- [ ] 验证加载指示器显示状态
- [ ] 检查数据渲染完成状态
- [ ] 确认页面布局正确性
- [ ] 验证交互元素可用性

#### 5.2 性能指标检查
- [ ] 测量页面加载时间
- [ ] 检查资源加载状态
- [ ] 验证渲染性能

## 🛠️ 使用Playwright执行排查

### 自动化检查脚本
```javascript
// 基本页面访问和状态检查
await page.goto(testUrl);
await page.waitForLoadState('networkidle');

// SessionId获取检查
const sessionIdFromUrl = await page.evaluate(() => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('sessionId');
});

// 控制台日志收集
const logs = [];
page.on('console', msg => logs.push(msg.text()));

// API请求监控
const apiRequests = [];
page.on('request', request => {
  if (request.url().includes('/api/planning/result/')) {
    apiRequests.push(request);
  }
});
```

## 📊 问题分类和解决方案

### A类问题：参数获取失败
- **症状**：sessionId为null或undefined
- **排查**：检查URL参数和路由配置
- **解决**：修复参数获取逻辑

### B类问题：API调用失败
- **症状**：网络请求错误或超时
- **排查**：检查API端点和网络状态
- **解决**：修复API调用逻辑

### C类问题：数据渲染阻塞
- **症状**：持续显示加载状态
- **排查**：检查数据处理和状态管理
- **解决**：修复渲染逻辑

### D类问题：UI/UX问题
- **症状**：页面布局异常或可读性差
- **排查**：检查CSS样式和组件结构
- **解决**：优化页面设计

## 📝 报告模板

### 问题排查报告
- **问题类型**：[A/B/C/D类]
- **发现时间**：[时间戳]
- **问题描述**：[详细描述]
- **排查步骤**：[执行的检查项]
- **根本原因**：[技术分析]
- **解决方案**：[具体修复方法]
- **验证结果**：[修复后的测试结果]

## 🔄 持续改进
- [ ] 定期更新SOP内容
- [ ] 收集常见问题模式
- [ ] 优化自动化检查脚本
- [ ] 建立问题知识库
