# 智游助手v5.0 环境配置与运行指南

## 📋 概述

本指南将帮助您配置智游助手v5.0项目的开发环境，包括DeepSeek API集成、高德MCP服务配置，以及4个核心Jupyter Notebook的运行。

## 🔧 前置要求

### 系统要求
- Python 3.8+
- pip 或 conda 包管理器
- Jupyter Notebook 或 JupyterLab
- 网络连接（用于API调用）

### API服务要求
- DeepSeek API账户和密钥
- 高德地图开发者账户和API密钥
- （可选）高德MCP服务部署

## ⚙️ 环境配置

### 1. 克隆项目并安装依赖

```bash
# 进入项目目录
cd smart-travel-assistant-v5.0

# 安装Python依赖
pip install -r requirements.txt

# 或者手动安装核心依赖
pip install openai tiktoken jinja2 pydantic python-dotenv aiohttp asyncio requests tenacity nest-asyncio langgraph langchain-core typing-extensions
```

### 2. 环境变量配置

#### 2.1 创建.env文件
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑.env文件
nano .env  # 或使用您喜欢的编辑器
```

#### 2.2 必需的环境变量

**DeepSeek API配置**：
```env
# DeepSeek API密钥 (必需)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# DeepSeek API配置
DEEPSEEK_API_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_MAX_TOKENS=4000
DEEPSEEK_TEMPERATURE=0.7
```

**高德MCP配置**：
```env
# 高德地图MCP API密钥 (必需)
AMAP_MCP_API_KEY=your_amap_key_here

# 高德MCP服务端点
AMAP_MCP_BASE_URL=http://localhost:8080/mcp
AMAP_MCP_TIMEOUT=30000
AMAP_MCP_MAX_CONCURRENT=4
```

**LangGraph配置**：
```env
# LangGraph状态图配置
LANGGRAPH_TIMEOUT=300
LANGGRAPH_MAX_ITERATIONS=10
COMPLEXITY_THRESHOLD_SIMPLE=30
COMPLEXITY_THRESHOLD_MEDIUM=60
COMPLEXITY_THRESHOLD_COMPLEX=100
```

#### 2.3 获取API密钥

**DeepSeek API密钥**：
1. 访问 [DeepSeek平台](https://platform.deepseek.com/)
2. 注册账户并登录
3. 进入API密钥管理页面
4. 创建新的API密钥
5. 复制密钥到.env文件中

**高德地图API密钥**：
1. 访问 [高德开放平台](https://console.amap.com/)
2. 注册开发者账户
3. 创建应用并获取API密钥
4. 复制密钥到.env文件中

### 3. 验证环境配置

运行连接测试脚本：
```bash
python test_deepseek_connection.py
```

预期输出：
```
🚀 开始智游助手v5.0 API连接综合测试
============================================================
🔍 检查环境变量配置...
✅ DEEPSEEK_API_KEY 已配置
✅ AMAP_MCP_API_KEY 已配置
🤖 测试DeepSeek API连接...
✅ DeepSeek API连接成功
📝 响应内容: 连接测试成功
⏱️ 响应时间: 1.23秒
🔢 Token使用: 15
🔢 测试Token计数功能...
✅ Token计数功能正常
🎯 测试旅游规划提示词生成...
✅ 提示词生成成功
============================================================
📊 测试结果汇总:
  environment: ✅ 通过
  deepseek_api: ✅ 通过
  token_counting: ✅ 通过
  prompt_generation: ✅ 通过
📈 测试通过率: 100.0% (4/4)
🎉 系统基本就绪，可以运行Notebook测试
```

## 📓 Notebook运行指南

### 运行顺序

建议按以下顺序运行Notebook：

1. **01_langgraph_architecture.ipynb** - LangGraph架构实现
2. **02_amap_integration.ipynb** - 高德MCP集成
3. **03_intelligent_planning.ipynb** - 智能规划逻辑
4. **04_complete_integration_test.ipynb** - 完整集成测试

### 启动Jupyter

```bash
# 启动Jupyter Notebook
jupyter notebook

# 或启动JupyterLab
jupyter lab
```

### Notebook运行说明

#### 1. 01_langgraph_architecture.ipynb
**目标**：构建和测试LangGraph状态图

**关键功能**：
- DeepSeek API客户端初始化
- 8节点状态图构建
- 复杂度分析算法
- 智能条件路由

**预期结果**：
- ✅ DeepSeek客户端就绪
- ✅ LangGraph状态图构建完成
- ✅ 复杂度分析测试通过

#### 2. 02_amap_integration.ipynb
**目标**：测试高德MCP数据收集

**关键功能**：
- 异步并发数据收集
- 数据质量评估
- 降级机制测试
- 缓存策略验证

**预期结果**：
- ✅ 高德MCP连接成功
- ✅ 并发数据收集完成
- ✅ 数据质量评分 > 0.7

#### 3. 03_intelligent_planning.ipynb
**目标**：测试智能规划生成

**关键功能**：
- Token精确管理
- 分片规划算法
- DeepSeek API调用
- 质量评估体系

**预期结果**：
- ✅ Token控制 < 3000 per request
- ✅ 规划质量评分 > 0.7
- ✅ DeepSeek API调用成功

#### 4. 04_complete_integration_test.ipynb
**目标**：端到端集成测试

**关键功能**：
- 13天新疆规划完整流程
- 性能指标验证
- 验收标准检查
- 错误处理测试

**预期结果**：
- ✅ 端到端响应时间 < 30秒
- ✅ API调用成功率 > 95%
- ✅ 数据准确性 > 90%
- ✅ 规划质量评分 > 8.5/10

## 🚨 常见问题与解决方案

### 1. API密钥问题

**问题**：`❌ DEEPSEEK_API_KEY 环境变量未设置`
**解决**：
1. 检查.env文件是否存在
2. 确认API密钥格式正确
3. 重启Jupyter内核

### 2. 网络连接问题

**问题**：`❌ DeepSeek API调用失败: Connection timeout`
**解决**：
1. 检查网络连接
2. 确认API端点URL正确
3. 检查防火墙设置

### 3. Token限制问题

**问题**：`Token预算超出限制`
**解决**：
1. 调整TOKEN_LIMIT_PER_REQUEST参数
2. 优化提示词长度
3. 使用分片规划策略

### 4. 依赖包问题

**问题**：`ModuleNotFoundError: No module named 'xxx'`
**解决**：
```bash
pip install xxx
# 或重新安装所有依赖
pip install -r requirements.txt
```

### 5. 异步代码问题

**问题**：`RuntimeError: asyncio.run() cannot be called from a running event loop`
**解决**：
- 确保已安装nest-asyncio
- 在Notebook中运行`nest_asyncio.apply()`

## 📊 性能基准

### 预期性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| API响应时间 | < 5秒 | 单次DeepSeek API调用 |
| 数据收集时间 | < 15秒 | 4个区域并发收集 |
| 规划生成时间 | < 10秒 | 单个区域规划 |
| 端到端时间 | < 30秒 | 完整13天规划 |
| Token使用量 | < 12000 | 完整规划流程 |
| 内存使用 | < 512MB | 运行时峰值 |

### 性能优化建议

1. **并发控制**：限制同时API调用数量
2. **缓存策略**：缓存重复的数据请求
3. **Token优化**：精简提示词，使用分片策略
4. **错误处理**：实现智能重试和降级机制

## 🔄 更新和维护

### 定期更新

1. **依赖包更新**：
```bash
pip list --outdated
pip install --upgrade package_name
```

2. **API配置更新**：
- 检查DeepSeek API版本更新
- 验证高德MCP服务状态
- 更新模型参数配置

3. **性能监控**：
- 监控API调用成功率
- 跟踪响应时间趋势
- 分析Token使用效率

### 故障排除

1. **日志分析**：检查详细的错误日志
2. **API状态**：确认外部服务可用性
3. **资源监控**：检查内存和CPU使用情况
4. **网络诊断**：测试网络连接和延迟

## 📞 技术支持

如果遇到问题，请按以下步骤获取帮助：

1. **查看日志**：检查详细的错误信息
2. **运行测试**：执行`test_deepseek_connection.py`
3. **检查配置**：验证环境变量设置
4. **查阅文档**：参考API官方文档
5. **社区支持**：在相关技术社区寻求帮助

---

**最后更新**：2025年8月2日
**版本**：v5.0.0
**维护者**：Augment Agent (CTO级技术架构师)
