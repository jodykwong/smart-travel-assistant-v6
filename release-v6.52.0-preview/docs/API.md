# 智游助手v6.5 - API文档

## 📋 目录

- [1. API概述](#1-api概述)
- [2. 认证授权](#2-认证授权)
- [3. 规划管理API](#3-规划管理api)
- [4. 缓存管理API](#4-缓存管理api)
- [5. 诊断工具API](#5-诊断工具api)
- [6. 错误处理](#6-错误处理)
- [7. 限流和配额](#7-限流和配额)

---

## 1. API概述

### 1.1 基础信息

- **Base URL**: `https://api.smart-travel.ai` (生产环境)
- **Base URL**: `http://localhost:3001` (开发环境)
- **API版本**: v1
- **系统版本**: v6.5.0
- **Timeline解析架构**: v2.0
- **协议**: HTTPS (生产环境)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 1.2 v6.5新特性

#### Timeline解析架构v2.0
- **服务端解析**: API返回标准化的`legacyFormat`数据，前端无需客户端解析
- **Feature Flag支持**: 通过`timelineVersion`字段标识解析版本
- **高可靠性**: 解析成功率>99%，支持JSON、Markdown、数字列表等多种LLM输出格式
- **性能优化**: 解析时间<500ms，前端渲染时间<200ms

#### 新增响应字段
```typescript
interface SessionResponse {
  // ... 原有字段
  parseSuccess: boolean;        // Timeline解析是否成功
  legacyFormat: DayActivity[];  // 标准化的Timeline数据
  timelineVersion: string;      // Timeline解析架构版本 (如 "2.0.0")
}
```

### 1.2 通用响应格式

所有API响应都遵循统一的格式：

```typescript
interface ApiResponse<T> {
  success: boolean;           // 请求是否成功
  data?: T;                  // 响应数据
  error?: {                  // 错误信息
    message: string;         // 错误描述
    code: string;           // 错误代码
    details?: any;          // 错误详情
  };
  timestamp: string;         // 响应时间戳
  requestId?: string;        // 请求ID（用于追踪）
}
```

#### 成功响应示例
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1754126415612_5yisoqje1",
    "status": "processing",
    "progress": 50
  },
  "timestamp": "2025-08-02T09:21:13.769Z",
  "requestId": "req_abc123"
}
```

#### 错误响应示例
```json
{
  "success": false,
  "error": {
    "message": "Session not found",
    "code": "SESSION_NOT_FOUND",
    "details": {
      "sessionId": "invalid_session_id"
    }
  },
  "timestamp": "2025-08-02T09:21:13.769Z",
  "requestId": "req_abc123"
}
```

### 1.3 HTTP状态码

| 状态码 | 含义 | 说明 |
|--------|------|------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未授权访问 |
| 403 | Forbidden | 禁止访问 |
| 404 | Not Found | 资源不存在 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |

---

## 2. 认证授权

### 2.1 JWT认证

API使用JWT (JSON Web Token) 进行身份认证。

#### 获取访问令牌
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "张三"
    }
  }
}
```

### 2.2 请求头认证

在需要认证的API请求中包含Authorization头：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. 规划管理API

### 3.1 创建规划会话

创建新的旅游规划会话。

```http
POST /api/v1/planning/sessions
Content-Type: application/json
Authorization: Bearer {token}

{
  "destination": "新疆",
  "startDate": "2025-08-15",
  "endDate": "2025-08-27",
  "budget": "luxury",
  "travelStyle": ["adventure", "culture", "nature"],
  "accommodation": "guesthouse",
  "groupSize": 2,
  "specialRequests": "希望体验当地文化"
}
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| destination | string | ✅ | 目的地 |
| startDate | string | ✅ | 出发日期 (YYYY-MM-DD) |
| endDate | string | ✅ | 返回日期 (YYYY-MM-DD) |
| budget | string | ✅ | 预算等级: budget/medium/luxury |
| travelStyle | string[] | ✅ | 旅行风格数组 |
| accommodation | string | ✅ | 住宿偏好: hotel/guesthouse/hostel |
| groupSize | number | ❌ | 人数，默认2人 |
| specialRequests | string | ❌ | 特殊要求 |

#### 响应
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1754126415612_5yisoqje1",
    "destination": "新疆",
    "totalDays": 13,
    "status": "pending",
    "createdAt": "2025-08-02T09:21:13.769Z"
  }
}
```

### 3.2 启动规划流程

启动指定会话的规划生成流程。

```http
POST /api/v1/planning/sessions/{sessionId}/start
Authorization: Bearer {token}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1754126415612_5yisoqje1",
    "status": "processing",
    "estimatedTime": 120,
    "message": "规划生成已启动，预计120秒完成"
  }
}
```

### 3.3 获取会话状态

获取规划会话的当前状态（轻量级接口）。

```http
GET /api/v1/planning/sessions/{sessionId}/status
Authorization: Bearer {token}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1754126415612_5yisoqje1",
    "status": "processing",
    "progress": 75,
    "currentPhase": "plan_region",
    "destination": "新疆",
    "totalDays": 13,
    "isCompleted": false,
    "hasError": false,
    "lastUpdated": "2025-08-02T09:21:13.769Z"
  }
}
```

#### 状态说明

| 状态 | 说明 |
|------|------|
| pending | 等待开始 |
| processing | 规划中 |
| completed | 已完成 |
| failed | 失败 |

#### 阶段说明

| 阶段 | 说明 |
|------|------|
| analyze_complexity | 分析目的地复杂度 |
| plan_region | 生成区域规划 |
| optimize_route | 优化路线 |
| finalize_plan | 完善规划细节 |
| completed | 规划完成 |

### 3.4 获取会话详情

获取规划会话的完整信息。

```http
GET /api/v1/planning/sessions/{sessionId}
Authorization: Bearer {token}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1754126415612_5yisoqje1",
    "destination": "新疆",
    "preferences": {
      "startDate": "2025-08-15",
      "endDate": "2025-08-27",
      "budget": "luxury",
      "travelStyle": ["adventure", "culture", "nature"],
      "accommodation": "guesthouse"
    },
    "status": "completed",
    "progress": 100,
    "result": {
      "title": "新疆13天深度文化探索之旅",
      "summary": "这是一次深度的新疆文化探索之旅...",
      "itinerary": [
        {
          "day": 1,
          "location": "乌鲁木齐",
          "activities": ["抵达乌鲁木齐", "入住酒店", "新疆博物馆"],
          "accommodation": "乌鲁木齐希尔顿酒店",
          "meals": ["晚餐：大盘鸡"]
        }
      ],
      "budget": {
        "total": 85000,
        "breakdown": {
          "accommodation": 25000,
          "transportation": 20000,
          "food": 15000,
          "activities": 15000,
          "shopping": 10000
        }
      },
      // Timeline解析架构v2.0新增字段
      "parseSuccess": true,
      "legacyFormat": [
        {
          "day": 1,
          "title": "抵达乌鲁木齐，开启新疆之旅",
          "date": "2025-08-15",
          "weather": "晴朗",
          "temperature": "28°C",
          "location": "乌鲁木齐",
          "cost": 800,
          "progress": 85,
          "timeline": [
            {
              "period": "上午",
              "time": "09:00-12:00",
              "title": "抵达乌鲁木齐",
              "description": "乘坐航班抵达乌鲁木齐地窝堡国际机场",
              "icon": "fas fa-plane",
              "cost": 0,
              "duration": "3小时"
            }
          ]
        }
      ],
      "timelineVersion": "2.0.0"
    },
    "createdAt": "2025-08-02T09:21:13.769Z",
    "completedAt": "2025-08-02T09:23:13.769Z"
  }
}
```

### 3.5 删除会话

删除指定的规划会话。

```http
DELETE /api/v1/planning/sessions/{sessionId}
Authorization: Bearer {token}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "message": "会话已成功删除"
  }
}
```

---

## 4. 缓存管理API

### 4.1 获取缓存统计

获取系统缓存的统计信息。

```http
GET /api/cache/stats
Authorization: Bearer {token}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "general": {
      "memoryItems": 150,
      "maxMemoryItems": 1000,
      "redisEnabled": true
    },
    "amap": {
      "regionDataTTL": 3600,
      "weatherDataTTL": 1800,
      "poiDataTTL": 7200
    },
    "deepseek": {
      "planningTTL": 86400,
      "commonQueryTTL": 3600,
      "complexityTTL": 7200
    },
    "performance": {
      "cacheHitRate": 0.75,
      "averageResponseTime": 150,
      "totalRequests": 1000,
      "cachedRequests": 750,
      "apiCallsSaved": 750,
      "estimatedCostSavings": 45.5
    }
  }
}
```

### 4.2 预热缓存

预热指定服务的缓存。

```http
POST /api/cache/warmup
Content-Type: application/json
Authorization: Bearer {token}

{
  "target": "deepseek",
  "queries": [
    "新疆旅游推荐",
    "13天新疆行程规划"
  ]
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "message": "DeepSeek缓存预热完成",
    "warmedQueries": 2,
    "duration": 5.2
  }
}
```

### 4.3 清理缓存

清理指定模式的缓存。

```http
DELETE /api/cache/clear
Content-Type: application/json
Authorization: Bearer {token}

{
  "target": "amap",
  "pattern": "新疆"
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "message": "缓存清理完成",
    "clearedItems": 25
  }
}
```

---

## 5. 诊断工具API

### 5.1 系统健康检查

检查系统各组件的健康状态。

```http
GET /api/health
```

#### 响应
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-08-02T09:21:13.769Z",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "deepseek": "healthy",
      "amap": "healthy"
    },
    "metrics": {
      "uptime": 86400,
      "memoryUsage": 0.65,
      "cpuUsage": 0.45
    }
  }
}

### 5.3 冗余健康状态（建议）

> 说明：v6.5 引入 LLM 与 地图MCP 的 failover 机制。建议新增只读端点（若后续启用）：

```http
GET /api/health/failover
```

响应建议（示例）：
```json
{
  "success": true,
  "data": {
    "llm": { "deepseek": "healthy", "siliconflow": "healthy" },
    "map": { "amap": "healthy", "tencent": "healthy" },
    "circuit": { "deepseek": "closed", "siliconflow": "closed", "amap": "closed", "tencent": "closed" },
    "timestamp": "2025-08-09T00:00:00.000Z"
  }
}
```

```

### 5.2 高德API诊断

诊断高德MCP API的连接状态。

```http
POST /api/diagnostic/amap
Content-Type: application/json

{
  "testType": "geocode",
  "params": {
    "address": "天安门",
    "city": "北京"
  }
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "responseTime": 245,
    "result": {
      "location": "116.397477,39.909652",
      "formatted_address": "北京市东城区天安门"
    }
  }
}
```

---

## 6. 错误处理

### 6.1 错误代码

| 错误代码 | HTTP状态码 | 说明 |
|----------|------------|------|
| INVALID_REQUEST | 400 | 请求参数无效 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 禁止访问 |
| SESSION_NOT_FOUND | 404 | 会话不存在 |
| PLANNING_FAILED | 500 | 规划生成失败 |
| API_TIMEOUT | 500 | API调用超时 |
| CACHE_ERROR | 500 | 缓存服务错误 |
| INTERNAL_ERROR | 500 | 内部服务器错误 |

### 6.2 错误响应示例

```json
{
  "success": false,
  "error": {
    "message": "规划生成失败，请稍后重试",
    "code": "PLANNING_FAILED",
    "details": {
      "sessionId": "session_123",
      "phase": "analyze_complexity",
      "retryAfter": 60
    }
  },
  "timestamp": "2025-08-02T09:21:13.769Z",
  "requestId": "req_abc123"
}
```

---

## 7. 限流和配额

### 7.1 限流策略

| 用户类型 | 每分钟请求数 | 每日请求数 | 并发规划数 |
|----------|--------------|------------|------------|
| 免费用户 | 60 | 1000 | 1 |
| 付费用户 | 300 | 10000 | 3 |
| 企业用户 | 1000 | 50000 | 10 |

### 7.2 限流响应头

API响应会包含限流相关的头信息：

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1625097600
```

### 7.3 超限响应

```json
{
  "success": false,
  "error": {
    "message": "请求频率超限，请稍后重试",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "limit": 60,
      "remaining": 0,
      "resetTime": "2025-08-02T09:22:00.000Z"
    }
  },
  "timestamp": "2025-08-02T09:21:13.769Z"
}
```

---

## 8. SDK和示例

### 8.1 JavaScript SDK

```javascript
import { SmartTravelAPI } from '@smart-travel/sdk';

const client = new SmartTravelAPI({
  baseURL: 'https://api.smart-travel.ai',
  apiKey: 'your-api-key'
});

// 创建规划会话
const session = await client.planning.createSession({
  destination: '新疆',
  startDate: '2025-08-15',
  endDate: '2025-08-27',
  budget: 'luxury',
  travelStyle: ['adventure', 'culture']
});

// 启动规划
await client.planning.startPlanning(session.sessionId);

// 监听进度
client.planning.onProgress(session.sessionId, (progress) => {
  console.log(`规划进度: ${progress.progress}%`);
});
```

### 8.2 Python SDK

```python
from smart_travel import SmartTravelAPI

client = SmartTravelAPI(

---

## 9. 东三省验收用例（v6.5 双链路冗余）

本章节定义了哈尔滨、长春、沈阳三座城市的双链路冗余系统验收基线与测试方法。

### 9.1 目标城市
- 哈尔滨（黑龙江省）
- 长春（吉林省）
- 沈阳（辽宁省）

> 说明：所有地图数据访问必须通过 LLM 的 function calling 机制调用 MCP 工具，严禁直连地图 API。

### 9.2 典型 API 请求示例

#### 9.2.1 创建规划会话（以哈尔滨为例）
```http
POST /api/v1/planning/sessions
Content-Type: application/json
Authorization: Bearer {token}

{
  "destination": "哈尔滨",
  "startDate": "2025-12-20",
  "endDate": "2025-12-26",
  "budget": "medium",
  "travelStyle": ["culture", "food"],
  "accommodation": "hotel",
  "groupSize": 2,
  "specialRequests": "优先品尝当地特色美食，晚间活动安排"
}
```

成功响应断言：
- HTTP 201/200
- data.sessionId: string（非空）
- data.destination: "哈尔滨"
- data.status in ["pending", "processing", "completed"]
- timestamp: ISO 8601 字符串

> 长春/沈阳：将 destination 分别换为“长春”/“沈阳”，其余参数一致。

#### 9.2.2 启动规划（适用于三城）
```http
POST /api/v1/planning/sessions/{sessionId}/start
Authorization: Bearer {token}
```
成功响应断言：
- HTTP 200
- data.sessionId: string（与上一步一致）
- data.status: "processing"
- data.estimatedTime: number（秒）
- data.message: string

### 9.3 预期响应断言（规划完成后获取详情）
```http
GET /api/v1/planning/sessions/{sessionId}
Authorization: Bearer {token}
```
成功响应断言：
- HTTP 200
- data.destination: in ["哈尔滨", "长春", "沈阳"]
- data.result.budget: object（包含 total:number 与 breakdown:object）
- data.result.itinerary: array（长度>0）
  - 每日项包含：day:number, location:string, activities:string[]
- 住宿推荐：data.result.accommodation 或 itinerary 中包含住宿字段
- 交通优化：行程中存在跨点移动且附带方式/时长信息

### 9.4 故障转移验证

> 以下步骤用于验证 LLM 双链路（DeepSeek→SiliconFlow）与 地图MCP 双链路（高德→腾讯）的自动切换与回切。请在测试环境执行。

1) LLM 故障转移（DeepSeek → SiliconFlow）
- 暂时置错 DEEPSEEK_API_KEY 或模拟 DeepSeek 不可用
- 重复 9.2 的创建与启动流程（建议目的地：哈尔滨）
- 通过以下方式验证：
  - 调用只读端点 GET /api/health/failover，期望 llm.activeProvider = "siliconflow"（若已启用）
  - 服务器日志应记录 provider=siliconflow
  - 业务响应仍满足 9.3 的断言（可允许数据为降级结果）
- 恢复正确 DEEPSEEK_API_KEY 后再次发起流程，应自动回切为 deepseek

2) 地图故障转移（AMap → Tencent）
- MCP_AMAP_ENABLED=true, MCP_TENCENT_ENABLED=true
- 模拟 AMap MCP 不可用（例如关闭权限/服务）
- 以“长春”或“沈阳”为目的地重复 9.2 流程
- 验证方式：
  - GET /api/health/failover 期望 map.activeProvider = "tencent"（若已启用）
  - 服务器日志应记录 provider=tencent
  - 规划结果中 POI/路线仍可用（允许智能降级）
- 恢复 AMap 后再次发起流程，应回切为 amap

3) MCP 工具调用约束
- 所有地图数据获取必须通过 LLM function calling 执行 MCP 工具（如 maps_text_search_amap-maps / maps_text_search_tencent-maps 等），禁止在应用层直连地图 API。
- 若工具不可用，应返回结构化空结果并由上层触发智能降级，不得抛出未处理异常。

    base_url='https://api.smart-travel.ai',
    api_key='your-api-key'
)

# 创建规划会话
session = client.planning.create_session(
    destination='新疆',
    start_date='2025-08-15',
    end_date='2025-08-27',
    budget='luxury',
    travel_style=['adventure', 'culture']
)

# 启动规划
client.planning.start_planning(session['sessionId'])

# 获取结果
result = client.planning.get_session(session['sessionId'])
```

---

**API文档版本**: v6.5
**最后更新**: 2025年8月9日
**维护团队**: 智游助手开发团队
