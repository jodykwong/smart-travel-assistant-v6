# API 标准和规范

## REST API 设计原则

### URL 设计规范
- 使用复数名词表示资源集合：`/api/users`, `/api/trips`
- 使用层级结构表示资源关系：`/api/users/{id}/trips`
- 避免动词，使用HTTP方法表示操作
- 使用小写字母和连字符：`/api/travel-plans`

### HTTP 方法使用
- **GET**: 获取资源，幂等操作
- **POST**: 创建新资源
- **PUT**: 完整更新资源，幂等操作
- **PATCH**: 部分更新资源
- **DELETE**: 删除资源，幂等操作

### 状态码标准
- **200 OK**: 成功获取资源
- **201 Created**: 成功创建资源
- **204 No Content**: 成功操作但无返回内容
- **400 Bad Request**: 客户端请求错误
- **401 Unauthorized**: 未认证
- **403 Forbidden**: 已认证但无权限
- **404 Not Found**: 资源不存在
- **422 Unprocessable Entity**: 数据验证失败
- **500 Internal Server Error**: 服务器内部错误

## 统一响应格式

### 成功响应
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  requestId: string;
}
```

### 错误响应
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  requestId: string;
}
```

## 身份验证和授权

### JWT Token 标准
- 使用 Bearer Token 认证：`Authorization: Bearer <token>`
- Token 过期时间：访问令牌 15 分钟，刷新令牌 7 天
- 包含必要的用户信息：userId, email, role

### 权限控制
- 基于角色的访问控制 (RBAC)
- 资源级别的权限验证
- API 端点权限装饰器

## 版本控制策略

### URL 版本控制
- 在 URL 路径中包含版本：`/api/v1/users`
- 主要版本变更时创建新版本
- 向后兼容性维护至少 2 个版本

### 版本废弃流程
1. 新版本发布时通知客户端
2. 在响应头中添加废弃警告
3. 提供 6 个月的迁移期
4. 逐步停止对旧版本的支持

## 错误处理标准

### 错误代码规范
- 使用语义化的错误代码：`USER_NOT_FOUND`, `INVALID_CREDENTIALS`
- 提供用户友好的错误消息
- 包含调试信息（仅开发环境）

### 验证错误格式
```typescript
interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}
```

## 请求/响应处理

### 请求验证
- 使用 JSON Schema 验证请求体
- 参数类型检查和范围验证
- 必填字段验证

### 响应优化
- 支持字段选择：`?fields=id,name,email`
- 分页参数标准化：`?page=1&limit=20`
- 排序参数：`?sort=createdAt:desc`

## 安全要求

### 输入验证
- 所有用户输入必须验证和清理
- 防止 SQL 注入和 XSS 攻击
- 文件上传类型和大小限制

### 速率限制
- 基于用户的请求频率限制
- 不同端点的不同限制策略
- 超限时返回 429 状态码

### CORS 配置
- 明确指定允许的域名
- 限制允许的 HTTP 方法
- 设置适当的预检请求缓存时间

## 日志和监控

### 请求日志
- 记录所有 API 请求和响应
- 包含请求 ID 用于追踪
- 敏感信息脱敏处理

### 性能监控
- 响应时间监控
- 错误率统计
- 资源使用情况追踪

## 文档标准

### API 文档要求
- 使用 OpenAPI 3.0 规范
- 包含完整的请求/响应示例
- 提供交互式 API 测试界面

### 变更日志
- 记录所有 API 变更
- 包含影响范围和迁移指南
- 按版本组织变更记录