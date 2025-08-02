# 智游助手v5.0 - 高德MCP深度集成指南

## 🎯 集成概览

基于高德开放平台官方MCP Server的深度集成，实现智游助手的核心地理数据收集能力。

### 核心价值
- **官方支持**: 基于高德官方MCP服务，稳定可靠
- **标准化协议**: 遵循MCP(Model Context Protocol)标准
- **智能数据处理**: 结合AI能力优化地理数据
- **缓存优化**: 减少API调用，提升性能

## 🏗️ 架构设计

### MCP协议栈
```
智游助手应用层
    ↓
TravelMCPAdapter (业务适配层)
    ↓
AmapMCPOfficialClient (协议客户端)
    ↓
高德MCP Server (https://mcp.amap.com/sse)
    ↓
高德地图API服务
```

### 核心组件

#### 1. AmapMCPOfficialClient
**职责**: MCP协议标准实现
- SSE连接管理
- 工具发现和调用
- 错误处理和重试
- 数据格式标准化

#### 2. TravelMCPAdapter  
**职责**: 旅行业务逻辑适配
- 区域数据收集
- 用户偏好筛选
- 数据质量评估
- 缓存管理

#### 3. LangGraph集成
**职责**: AI规划流程集成
- 数据收集节点
- 状态管理
- 进度监控

## 🔧 配置说明

### 环境变量配置
```bash
# 高德MCP官方服务配置
AMAP_MCP_SERVER_URL=https://mcp.amap.com/sse
AMAP_MCP_API_KEY=your_amap_api_key
MCP_AMAP_ENABLED=true

# MCP传输配置
MCP_TRANSPORT_TYPE=sse
MCP_TIMEOUT=30000
MCP_RETRY_ATTEMPTS=3
```

### API Key获取
1. 访问 [高德开放平台](https://lbs.amap.com)
2. 注册开发者账号
3. 创建应用获取API Key
4. 配置到环境变量中

## 🚀 使用指南

### 基础用法

#### 1. 初始化MCP客户端
```typescript
import { AmapMCPOfficialClient } from '@/lib/mcp/amap-mcp-official-client';

const mcpClient = new AmapMCPOfficialClient({
  serverUrl: 'https://mcp.amap.com/sse',
  apiKey: 'your_api_key',
  timeout: 30000,
});

// 初始化连接
await mcpClient.initialize();
```

#### 2. 搜索POI
```typescript
// 搜索景点
const attractions = await mcpClient.searchPOI({
  keywords: '景点',
  region: '乌鲁木齐',
  category: 'attraction',
  limit: 10,
});

// 搜索餐厅
const restaurants = await mcpClient.searchPOI({
  keywords: '餐厅',
  region: '乌鲁木齐', 
  category: 'restaurant',
  limit: 10,
});
```

#### 3. 查询天气
```typescript
const weather = await mcpClient.getWeather({
  location: '乌鲁木齐',
});

console.log(`温度: ${weather.temperature.avg}°C`);
console.log(`天气: ${weather.condition}`);
```

### 高级用法

#### 1. 使用旅行适配器
```typescript
import { TravelMCPAdapter } from '@/lib/mcp/travel-mcp-adapter';

const adapter = new TravelMCPAdapter();

// 收集完整区域数据
const regionData = await adapter.collectRegionData(
  {
    name: '乌鲁木齐',
    priority: 1,
    estimatedDays: 3,
    complexity: 0.8,
    coordinates: [87.6168, 43.8256],
    description: '新疆首府',
  },
  {
    budget: 'mid-range',
    travelStyles: ['culture', 'food'],
    accommodation: 'hotel',
    groupSize: 2,
  },
  {
    maxPOIsPerCategory: 15,
    includeWeather: true,
    cacheEnabled: true,
  }
);
```

#### 2. 数据质量监控
```typescript
// 获取数据质量报告
const qualityReport = await adapter.getDataQualityReport('乌鲁木齐');

console.log(`数据质量评分: ${qualityReport.overallScore}`);
console.log(`改进建议: ${qualityReport.recommendations.join(', ')}`);
```

#### 3. 健康检查
```typescript
// MCP服务健康检查
const isHealthy = await mcpClient.healthCheck();

// 适配器健康检查
const adapterHealth = await adapter.healthCheck();
console.log(`状态: ${adapterHealth.status}`);
console.log(`可用工具: ${adapterHealth.details.availableTools.join(', ')}`);
```

## 🔍 测试验证

### 运行测试脚本
```bash
# 设置API Key
export AMAP_MCP_API_KEY=your_api_key

# 运行完整测试
node scripts/test-amap-mcp.js
```

### 测试覆盖范围
- [x] MCP连接测试
- [x] POI搜索功能
- [x] 天气查询功能  
- [x] 旅行适配器测试
- [x] 健康检查测试

### 预期测试结果
```
🔍 测试结果汇总
总测试数: 5
通过测试: 5
失败测试: 0
成功率: 100.0%
✅ 高德MCP集成测试通过！
```

## 📊 性能优化

### 缓存策略
- **缓存时间**: 30分钟
- **缓存范围**: 区域数据
- **缓存键**: `region_data_{regionName}`
- **自动清理**: 过期自动删除

### 并发控制
```typescript
// 并行收集多种数据
const [attractions, restaurants, hotels, weather] = await Promise.allSettled([
  this.collectAttractions(region, preferences, maxCount),
  this.collectRestaurants(region, preferences, maxCount),
  this.collectHotels(region, preferences, maxCount),
  this.collectWeather(region),
]);
```

### 错误处理
- **重试机制**: 最多3次重试
- **降级策略**: 部分数据失败不影响整体
- **超时控制**: 30秒超时保护

## 🛠️ 故障排除

### 常见问题

#### 1. MCP连接失败
```
❌ MCP连接失败: HTTP 401: Unauthorized
```
**解决方案**: 检查API Key是否正确配置

#### 2. 工具调用超时
```
❌ 工具调用失败: 请求超时 (30000ms)
```
**解决方案**: 增加超时时间或检查网络连接

#### 3. 数据解析失败
```
⚠️ POI数据解析失败: Unexpected token
```
**解决方案**: 检查返回数据格式，可能是API响应变化

### 调试技巧

#### 1. 启用详细日志
```typescript
// 在环境变量中设置
DEBUG=true
LOG_LEVEL=debug
```

#### 2. 检查可用工具
```typescript
const tools = mcpClient.getAvailableTools();
console.log('可用工具:', tools.map(t => t.name));
```

#### 3. 监控API调用
```typescript
// 在MCP客户端中添加日志
console.log('发送MCP请求:', JSON.stringify(message, null, 2));
```

## 📈 监控指标

### 关键指标
- **连接成功率**: > 99%
- **数据质量评分**: > 0.8
- **API响应时间**: < 5秒
- **缓存命中率**: > 70%

### 监控方法
```typescript
// 性能监控
const startTime = Date.now();
const result = await mcpClient.searchPOI(params);
const duration = Date.now() - startTime;

console.log(`API调用耗时: ${duration}ms`);
```

## 🔮 未来扩展

### 计划功能
- [ ] 路径规划集成
- [ ] 实时交通信息
- [ ] 周边推荐算法
- [ ] 多语言支持

### 技术优化
- [ ] WebSocket长连接
- [ ] 数据预加载
- [ ] 智能缓存策略
- [ ] 离线数据支持

## 📞 技术支持

### 官方资源
- [高德MCP文档](https://lbs.amap.com/api/mcp-server/gettingstarted)
- [MCP协议规范](https://modelcontextprotocol.io)
- [高德开放平台](https://lbs.amap.com)

### 内部支持
- **技术文档**: `docs/AMAP_MCP_INTEGRATION.md`
- **测试脚本**: `scripts/test-amap-mcp.js`
- **示例代码**: `src/lib/mcp/`

---

## 📋 集成检查清单

- [ ] 环境变量配置完成
- [ ] API Key获取并配置
- [ ] MCP客户端初始化成功
- [ ] 基础功能测试通过
- [ ] 性能指标达标
- [ ] 错误处理验证
- [ ] 缓存机制启用
- [ ] 监控告警配置

**完成以上检查清单后，高德MCP集成即可投入生产使用。**
