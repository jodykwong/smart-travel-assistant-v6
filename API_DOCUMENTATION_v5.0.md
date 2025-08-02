# 智游助手v5.0 API文档

**版本**: v5.0.0  
**基础URL**: `https://your-domain.com/api`  
**更新日期**: 2025年8月1日  

---

## 📋 API概览

智游助手v5.0提供RESTful API和WebSocket接口，支持旅行规划的完整生命周期管理。所有API都采用JSON格式进行数据交换。

### 认证方式
```http
# 当前版本暂不需要认证
# v5.1版本将支持JWT认证
Authorization: Bearer <token>
```

### 通用响应格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

## 🚀 核心API端点

### 1. 健康检查

#### GET /api/health
检查系统健康状态

**请求示例**:
```bash
curl -X GET https://your-domain.com/api/health
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "version": "5.0.0",
    "timestamp": "2025-08-01T12:00:00.000Z",
    "uptime": 3600,
    "environment": "production"
  }
}
```

### 2. 旅行规划会话管理

#### POST /api/sessions
创建新的旅行规划会话

**请求体**:
```typescript
interface CreateSessionRequest {
  destination: string;
  startDate: string;        // ISO 8601格式
  endDate: string;          // ISO 8601格式
  groupSize: number;
  budget: 'economy' | 'mid-range' | 'luxury' | 'premium';
  styles: string[];         // ['adventure', 'culture', 'food', 'relaxation']
  preferences?: {
    accommodation?: string;
    transportation?: string;
    activities?: string[];
  };
}
```

**请求示例**:
```bash
curl -X POST https://your-domain.com/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "北京",
    "startDate": "2025-08-20",
    "endDate": "2025-08-25",
    "groupSize": 2,
    "budget": "mid-range",
    "styles": ["culture", "food"],
    "preferences": {
      "accommodation": "hotel",
      "transportation": "public"
    }
  }'
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1754086826801_payfrty1x",
    "status": "created",
    "destination": "北京",
    "duration": 5,
    "estimatedBudget": 12500,
    "createdAt": "2025-08-01T12:00:00.000Z"
  },
  "timestamp": "2025-08-01T12:00:00.000Z"
}
```

#### GET /api/sessions/{sessionId}
获取会话详情

**响应示例**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1754086826801_payfrty1x",
    "status": "completed",
    "progress": 100,
    "destination": "北京",
    "plan": {
      "title": "北京文化美食之旅",
      "description": "5天深度体验北京文化和美食",
      "totalBudget": 12500,
      "dailyPlans": [...]
    }
  }
}
```

### 3. 旅行规划生成

#### POST /api/sessions/{sessionId}/generate
启动旅行规划生成

**请求示例**:
```bash
curl -X POST https://your-domain.com/api/sessions/session_123/generate
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "status": "generating",
    "estimatedTime": 30,
    "websocketUrl": "wss://your-domain.com/ws/session_123"
  }
}
```

#### GET /api/sessions/{sessionId}/status
获取生成状态

**响应示例**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "status": "plan_region",
    "progress": 65,
    "currentStage": "正在规划第3个区域",
    "estimatedTimeRemaining": 10
  }
}
```

### 4. 功能模块数据

#### GET /api/sessions/{sessionId}/accommodation
获取住宿推荐

**响应示例**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "name": "北京王府井希尔顿酒店",
        "type": "豪华型",
        "location": "王府井商业区",
        "priceRange": "800-1200元/晚",
        "rating": 4.5,
        "features": ["地理位置优越", "设施完善", "服务优质"]
      }
    ],
    "tips": [
      "建议提前1-2周预订",
      "选择交通便利的位置"
    ]
  }
}
```

#### GET /api/sessions/{sessionId}/food
获取美食推荐

**响应示例**:
```json
{
  "success": true,
  "data": {
    "specialties": [
      {
        "name": "北京烤鸭",
        "description": "北京最著名的传统美食",
        "recommendedRestaurants": ["全聚德", "便宜坊"]
      }
    ],
    "foodStreets": [
      {
        "name": "王府井小吃街",
        "description": "汇聚各地特色小吃",
        "location": "王府井大街"
      }
    ],
    "budgetGuide": "人均消费: 50-150元，高端餐厅200-500元"
  }
}
```

#### GET /api/sessions/{sessionId}/transport
获取交通指南

**响应示例**:
```json
{
  "success": true,
  "data": {
    "arrivalOptions": [
      {
        "type": "航班",
        "duration": "2-4小时",
        "cost": "500-2000元",
        "description": "最快捷的到达方式"
      }
    ],
    "localTransport": {
      "metro": {
        "name": "北京地铁",
        "coverage": "覆盖主要景点",
        "cost": "起步价3元"
      }
    },
    "tips": [
      "建议使用公共交通出行",
      "下载北京地铁APP获取实时信息"
    ]
  }
}
```

#### GET /api/sessions/{sessionId}/tips
获取实用贴士

**响应示例**:
```json
{
  "success": true,
  "data": {
    "cultural": [
      "尊重当地文化传统",
      "了解基本礼仪规范"
    ],
    "safety": [
      "保管好个人财物",
      "避免夜间独自外出"
    ],
    "communication": [
      "学习基本当地用语",
      "准备翻译软件"
    ],
    "emergency": {
      "police": "110",
      "medical": "120",
      "fire": "119",
      "tourism": "12301"
    }
  }
}
```

## 🔌 WebSocket接口

### 连接地址
```
wss://your-domain.com/ws/{sessionId}
```

### 消息格式
```typescript
interface WebSocketMessage {
  type: 'progress' | 'status' | 'error' | 'complete';
  data: any;
  timestamp: string;
}
```

### 进度更新消息
```json
{
  "type": "progress",
  "data": {
    "sessionId": "session_123",
    "stage": "plan_region",
    "progress": 65,
    "message": "正在规划第3个区域",
    "details": {
      "currentRegion": "朝阳区",
      "completedRegions": 2,
      "totalRegions": 4
    }
  },
  "timestamp": "2025-08-01T12:00:00.000Z"
}
```

### 完成消息
```json
{
  "type": "complete",
  "data": {
    "sessionId": "session_123",
    "status": "completed",
    "planUrl": "/planning/result?sessionId=session_123"
  },
  "timestamp": "2025-08-01T12:00:00.000Z"
}
```

## 🚨 错误处理

### 错误代码
| 代码 | 描述 | HTTP状态码 |
|------|------|------------|
| `INVALID_REQUEST` | 请求参数无效 | 400 |
| `SESSION_NOT_FOUND` | 会话不存在 | 404 |
| `GENERATION_FAILED` | 规划生成失败 | 500 |
| `API_LIMIT_EXCEEDED` | API调用限制 | 429 |
| `EXTERNAL_SERVICE_ERROR` | 外部服务错误 | 502 |

### 错误响应示例
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "目的地不能为空",
    "details": {
      "field": "destination",
      "value": "",
      "constraint": "required"
    }
  },
  "timestamp": "2025-08-01T12:00:00.000Z"
}
```

## 📊 速率限制

### 限制规则
- **通用API**: 100请求/15分钟/IP
- **生成API**: 5请求/小时/IP
- **WebSocket**: 1连接/会话

### 限制头部
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1627834800
```

## 🔧 SDK和示例

### JavaScript/TypeScript SDK
```typescript
import { TravelAssistantAPI } from '@travel-assistant/sdk';

const api = new TravelAssistantAPI({
  baseURL: 'https://your-domain.com/api',
  // apiKey: 'your-api-key' // v5.1版本支持
});

// 创建会话
const session = await api.sessions.create({
  destination: '北京',
  startDate: '2025-08-20',
  endDate: '2025-08-25',
  groupSize: 2,
  budget: 'mid-range',
  styles: ['culture', 'food']
});

// 生成规划
await api.sessions.generate(session.sessionId);

// 监听进度
api.sessions.onProgress(session.sessionId, (progress) => {
  console.log(`进度: ${progress.progress}%`);
});
```

### Python示例
```python
import requests
import json

# 创建会话
response = requests.post('https://your-domain.com/api/sessions', 
  json={
    'destination': '北京',
    'startDate': '2025-08-20',
    'endDate': '2025-08-25',
    'groupSize': 2,
    'budget': 'mid-range',
    'styles': ['culture', 'food']
  }
)

session = response.json()['data']
print(f"会话ID: {session['sessionId']}")
```

## 📞 技术支持

如需API技术支持，请提供：
1. **API版本**: v5.0.0
2. **请求详情**: 完整的请求和响应
3. **错误信息**: 具体的错误代码和消息
4. **环境信息**: 客户端环境和网络状况

---

**API文档持续更新中，最新版本请访问在线文档。**
