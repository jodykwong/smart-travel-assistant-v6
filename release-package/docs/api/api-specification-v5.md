# 智游助手v5.0 - API接口文档

## 📋 API概览

### 基础信息
- **Base URL**: `/api/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8
- **API版本**: v1.0.0

### 通用响应格式
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
```

## 🎯 规划会话管理

### 创建规划会话
```http
POST /api/v1/planning/sessions
```

**请求体**:
```typescript
{
  preferences: {
    destination: string;
    startDate: string;        // YYYY-MM-DD
    endDate: string;          // YYYY-MM-DD
    groupSize: number;
    budget: 'budget' | 'mid-range' | 'luxury' | 'premium';
    travelStyles: TravelStyle[];
    accommodation: 'hotel' | 'hostel' | 'bnb' | 'resort';
    specialRequirements?: string;
  };
  userId?: string;
}
```

**响应**:
```typescript
{
  success: true,
  data: {
    sessionId: string;
    estimatedDuration: number;  // 预计完成时间(秒)
  },
  timestamp: string
}
```

### 获取会话状态
```http
GET /api/v1/planning/sessions/{sessionId}
```

**响应**:
```typescript
{
  success: true,
  data: {
    sessionId: string;
    destination: string;
    totalDays: number;
    startDate: string;
    endDate: string;
    userPreferences: UserPreferences;
    regions: RegionInfo[];
    currentRegionIndex: number;
    currentPhase: PlanningPhase;
    realData: Record<string, RegionData>;
    regionPlans: Record<string, RegionPlan>;
    progress: number;
    errors: ProcessingError[];
    retryCount: number;
    qualityScore: number;
    tokensUsed: number;
    tokensRemaining: number;
    masterPlan?: CompleteTravelPlan;
    htmlOutput?: string;
  },
  timestamp: string
}
```

### 启动规划流程
```http
POST /api/v1/planning/sessions/{sessionId}/start
```

**请求体**:
```typescript
{
  options?: {
    priority?: 'speed' | 'quality' | 'balanced';
    maxTokens?: number;
  }
}
```

**响应**:
```typescript
{
  success: true,
  data: {
    message: string;
    sessionId: string;
    estimatedDuration: number;
  },
  timestamp: string
}
```

### 取消规划流程
```http
POST /api/v1/planning/sessions/{sessionId}/cancel
```

**响应**:
```typescript
{
  success: true,
  data: {
    message: string;
    sessionId: string;
  },
  timestamp: string
}
```

### 获取规划结果
```http
GET /api/v1/planning/sessions/{sessionId}/result
```

**响应**:
```typescript
{
  success: true,
  data: {
    id: string;
    title: string;
    destination: string;
    totalDays: number;
    startDate: string;
    endDate: string;
    regions: RegionPlan[];
    totalCost: number;
    overallQualityScore: number;
    createdAt: string;
    updatedAt: string;
  },
  timestamp: string
}
```

## 📊 区域数据管理

### 获取区域数据
```http
GET /api/v1/planning/sessions/{sessionId}/regions/{regionName}/data
```

**响应**:
```typescript
{
  success: true,
  data: {
    attractions: POIData[];
    restaurants: POIData[];
    hotels: POIData[];
    weather: WeatherData;
    transportation: TransportationData;
    dataQuality: number;
    lastUpdated: string;
  },
  timestamp: string
}
```

### 获取区域规划
```http
GET /api/v1/planning/sessions/{sessionId}/regions/{regionName}/plan
```

**响应**:
```typescript
{
  success: true,
  data: {
    regionName: string;
    days: DailyPlan[];
    totalCost: number;
    highlights: string[];
    tips: string[];
    qualityScore: number;
    tokensUsed: number;
  },
  timestamp: string
}
```

## 📝 旅行计划管理

### 保存旅行计划
```http
POST /api/v1/plans
```

**请求体**:
```typescript
{
  title: string;
  destination: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  regions: RegionPlan[];
  totalCost: number;
  overallQualityScore: number;
  userId: string;
}
```

**响应**:
```typescript
{
  success: true,
  data: {
    planId: string;
  },
  timestamp: string
}
```

### 获取用户计划列表
```http
GET /api/v1/users/{userId}/plans
```

**查询参数**:
- `page?: number` - 页码 (默认: 1)
- `limit?: number` - 每页数量 (默认: 10, 最大: 50)
- `status?: string` - 计划状态筛选
- `destination?: string` - 目的地筛选

**响应**:
```typescript
{
  success: true,
  data: {
    plans: CompleteTravelPlan[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  },
  timestamp: string
}
```

### 获取计划详情
```http
GET /api/v1/plans/{planId}
```

**响应**:
```typescript
{
  success: true,
  data: CompleteTravelPlan,
  timestamp: string
}
```

### 删除旅行计划
```http
DELETE /api/v1/plans/{planId}
```

**响应**:
```typescript
{
  success: true,
  data: {
    message: string;
  },
  timestamp: string
}
```

## 🌍 目的地数据

### 搜索目的地
```http
GET /api/v1/destinations/search
```

**查询参数**:
- `q: string` - 搜索关键词
- `limit?: number` - 结果数量 (默认: 10)

**响应**:
```typescript
{
  success: true,
  data: {
    destinations: Array<{
      name: string;
      country: string;
      coordinates: [number, number];
      description: string;
      imageUrl: string;
      popularity: number;
    }>;
  },
  timestamp: string
}
```

### 获取热门目的地
```http
GET /api/v1/destinations/popular
```

**响应**:
```typescript
{
  success: true,
  data: {
    destinations: Array<{
      name: string;
      country: string;
      coordinates: [number, number];
      description: string;
      imageUrl: string;
      popularity: number;
      averageCost: number;
      bestSeason: string;
    }>;
  },
  timestamp: string
}
```

## 🌤️ 天气数据

### 获取天气信息
```http
GET /api/v1/weather
```

**查询参数**:
- `location: string` - 位置 (经纬度或城市名)
- `date: string` - 日期 (YYYY-MM-DD)
- `days?: number` - 预报天数 (默认: 7)

**响应**:
```typescript
{
  success: true,
  data: {
    current: {
      temperature: number;
      condition: string;
      humidity: number;
      windSpeed: number;
    };
    forecast: Array<{
      date: string;
      temperature: {
        min: number;
        max: number;
      };
      condition: string;
      humidity: number;
      rainfall: number;
    }>;
  },
  timestamp: string
}
```

## 🔌 WebSocket接口

### 规划进度订阅
```
WS /ws/planning/{sessionId}
```

**消息格式**:
```typescript
{
  sessionId: string;
  phase: PlanningPhase;
  progress: number;
  currentRegion?: string;
  estimatedTimeRemaining?: number;
  message: string;
}
```

**连接示例**:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/planning/session-123');

ws.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log('Progress update:', progress);
};
```

## ❌ 错误代码

### 通用错误
- `INVALID_REQUEST` - 请求参数无效
- `UNAUTHORIZED` - 未授权访问
- `FORBIDDEN` - 权限不足
- `NOT_FOUND` - 资源不存在
- `RATE_LIMITED` - 请求频率超限
- `INTERNAL_ERROR` - 服务器内部错误

### 业务错误
- `INVALID_SESSION` - 无效的会话ID
- `SESSION_NOT_FOUND` - 会话不存在
- `SESSION_EXPIRED` - 会话已过期
- `INVALID_SESSION_STATE` - 会话状态无效
- `PLANNING_FAILED` - 规划生成失败
- `DATA_COLLECTION_FAILED` - 数据收集失败
- `REGION_PLANNING_FAILED` - 区域规划失败
- `INSUFFICIENT_TOKENS` - Token不足
- `QUALITY_TOO_LOW` - 规划质量过低

## 🔒 认证与授权

### JWT Token格式
```typescript
{
  sub: string;        // 用户ID
  email: string;      // 用户邮箱
  role: string;       // 用户角色
  iat: number;        // 签发时间
  exp: number;        // 过期时间
}
```

### 请求头示例
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

## 📊 限流策略

### 速率限制
- **普通用户**: 100 requests/hour
- **高级用户**: 500 requests/hour
- **企业用户**: 2000 requests/hour

### WebSocket连接
- **最大连接数**: 每用户5个并发连接
- **连接超时**: 30分钟无活动自动断开

## 🧪 测试环境

### 测试端点
- **Base URL**: `https://api-test.smarttravel.com/v1`
- **WebSocket**: `wss://api-test.smarttravel.com/ws`

### 测试数据
```typescript
// 测试会话ID
sessionId: "test-session-12345"

// 测试用户ID  
userId: "test-user-67890"

// 测试目的地
destination: "新疆"
```
