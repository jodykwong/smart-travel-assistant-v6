# 智游助手v6.2增强架构设计文档

**项目**: 智游助手v6.2
**版本**: v6.2.0 (含商业化和安全增强)
**制定人**: CTO技术合伙人
**制定日期**: 2025年8月6日
**最后更新**: 2025年8月6日
**更新内容**: 商业化服务集成、隔离式支付验证、安全架构增强

---

## 🏗️ 整体架构概览

### 架构演进路径

```
Phase 1: 双链路地理服务架构 (已完成)
    ↓
Phase 2: 性能优化和依赖注入 (已完成)
    ↓
Phase 3: 商业化和安全增强 (进行中)
```

### 增强架构分层设计

```
┌─────────────────────────────────────────────────────────┐
│                    用户界面层                              │
│  Web App │ Mobile App │ Admin Dashboard │ API Docs      │
├─────────────────────────────────────────────────────────┤
│                    API网关层                              │
│  认证授权 │ 限流熔断 │ 路由转发 │ 监控审计              │
├─────────────────────────────────────────────────────────┤
│                  应用服务层                               │
│  旅游规划 │ 个性化推荐 │ 订单管理 │ 用户管理            │
├─────────────────────────────────────────────────────────┤
│                  业务服务层                               │
│  地理服务 │ 支付服务 │ 用户服务 │ 内容服务 │ 分析服务   │
├─────────────────────────────────────────────────────────┤
│                  数据服务层                               │
│  缓存管理 │ 数据访问 │ 消息队列 │ 文件存储              │
├─────────────────────────────────────────────────────────┤
│                  基础设施层                               │
│  数据库 │ Redis │ 监控系统 │ 日志系统 │ 安全服务        │
└─────────────────────────────────────────────────────────┘
```

## 🔧 增强服务容器架构

### 服务容器接口设计

```typescript
/**
 * 增强的服务容器接口
 * 在Phase 1基础上扩展商业化和安全服务
 */
export interface IEnhancedTravelServiceContainer extends ITravelServiceContainer {
  // Phase 1 核心服务 (已实现)
  getGeoService(): UnifiedGeoService;
  getQualityMonitor(): ServiceQualityMonitor;
  getCacheManager(): IntelligentCacheManager;
  getStateManager(): TravelStateManager;
  
  // Phase 3A 商业化服务
  getUserService(): IUserService;
  getPaymentService(): IUnifiedPaymentService;
  getOrderService(): IOrderService;
  
  // Phase 3A 安全服务
  getSecurityContext(): ISecurityContext;
  getAuditLogger(): IAuditLogger;
  getEncryptionService(): IEncryptionService;
  
  // Phase 3B 增强服务
  getAnalyticsService(): IAnalyticsService;
  getRecommendationService(): IRecommendationService;
  getNotificationService(): INotificationService;
  
  // 生命周期管理
  initializeCommercialServices(): Promise<void>;
  initializeSecurityServices(): Promise<void>;
  healthCheckAll(): Promise<ServiceHealthReport>;
}
```

### 服务容器实现

```typescript
export class EnhancedTravelServiceContainer implements IEnhancedTravelServiceContainer {
  // Phase 1 服务 (继承)
  private geoService: UnifiedGeoService;
  private qualityMonitor: ServiceQualityMonitor;
  private cacheManager: IntelligentCacheManager;
  
  // Phase 3A 商业化服务
  private userService: IUserService;
  private paymentService: IUnifiedPaymentService;
  private orderService: IOrderService;
  
  // Phase 3A 安全服务
  private securityContext: ISecurityContext;
  private auditLogger: IAuditLogger;
  private encryptionService: IEncryptionService;
  
  // Phase 3B 增强服务
  private analyticsService: IAnalyticsService;
  private recommendationService: IRecommendationService;

  async initializeCommercialServices(): Promise<void> {
    console.log('🚀 初始化商业化服务...');
    
    // 初始化安全服务
    await this.initializeSecurityServices();
    
    // 初始化用户服务
    this.userService = new UserService(
      this.getDatabaseService(),
      this.encryptionService,
      this.auditLogger
    );
    
    // 初始化支付服务
    this.paymentService = new UnifiedPaymentService(
      new SecureWeChatPayMCPClient(this.config.llmApiKey, this.config.wechatPay),
      new SecureAlipayMCPClient(this.config.llmApiKey, this.config.alipay),
      this.encryptionService,
      this.auditLogger
    );
    
    // 初始化订单服务
    this.orderService = new OrderService(
      this.getDatabaseService(),
      this.paymentService,
      this.auditLogger
    );
    
    console.log('✅ 商业化服务初始化完成');
  }

  async initializeSecurityServices(): Promise<void> {
    console.log('🔒 初始化安全服务...');
    
    // 初始化加密服务
    this.encryptionService = new AESEncryptionService(
      process.env.ENCRYPTION_KEY!
    );
    
    // 初始化审计日志
    this.auditLogger = new DatabaseAuditLogger(
      this.getDatabaseService()
    );
    
    // 初始化安全上下文
    this.securityContext = new SecurityContextManager(
      this.encryptionService,
      this.auditLogger
    );
    
    console.log('✅ 安全服务初始化完成');
  }
}
```

## 🔒 隔离式支付验证架构

### 核心设计原则

1. **输入隔离**: 支付验证节点完全不接触用户输入
2. **结构化数据流**: 节点间传递带完整性校验的结构化数据
3. **传统后端验证**: 直接调用支付API，绕过MCP和LLM

### 数据流架构图

```
用户输入 (不可信)
    ↓
┌─────────────────────┐
│   订单创建节点        │ ← 唯一接触用户输入的节点
│  - 输入清理和验证     │
│  - 生成结构化数据     │
│  - 数据完整性校验     │
└─────────────────────┘
    ↓ 结构化订单数据 (可信)
┌─────────────────────┐
│   支付处理节点        │ ← 处理结构化数据
│  - 调用支付服务       │
│  - 生成支付数据       │
│  - 数据完整性校验     │
└─────────────────────┘
    ↓ 结构化支付数据 (可信)
┌─────────────────────┐
│  隔离式验证节点       │ ← 完全隔离的验证
│  - 直接API调用       │
│  - 传统后端验证       │
│  - 绕过LLM和MCP     │
└─────────────────────┘
    ↓ 验证结果 (可信)
```

### 隔离式验证实现

```typescript
/**
 * 隔离式支付验证服务
 * 核心特性: 完全不依赖用户输入，只处理结构化数据
 */
export class IsolatedPaymentVerificationService {
  constructor(
    private auditLogger: IAuditLogger,
    private encryptionService: IEncryptionService
  ) {}

  /**
   * 执行隔离式支付验证
   * 输入: 来源于前置节点的结构化数据
   * 输出: 结构化验证结果
   * 特点: 完全不涉及用户输入或LLM推理
   */
  async verifyPaymentIsolated(
    input: StructuredPaymentVerificationInput
  ): Promise<PaymentVerificationResult> {
    
    // 第一步: 验证输入数据完整性
    await this.validateDataIntegrity(input);
    
    // 第二步: 直接查询支付提供商API (绕过LLM)
    const backendResult = await this.queryPaymentProviderDirectly(input);
    
    // 第三步: 传统后端逻辑验证
    const verificationResult = await this.performBackendVerification(input, backendResult);
    
    // 第四步: 记录验证结果
    await this.auditLogger.logPaymentEvent({
      event: 'PAYMENT_VERIFICATION_COMPLETED',
      orderId: input.orderId,
      verified: verificationResult.verified,
      method: 'ISOLATED_BACKEND_VERIFICATION'
    });

    return verificationResult;
  }

  /**
   * 直接查询支付提供商API
   * 特点: 绕过MCP和LLM，直接调用支付API
   */
  private async queryPaymentProviderDirectly(
    input: StructuredPaymentVerificationInput
  ): Promise<any> {
    
    switch (input.providerId) {
      case 'wechat':
        return await this.queryWeChatPayDirect(input.orderId);
      case 'alipay':
        return await this.queryAlipayDirect(input.orderId);
      default:
        throw new Error(`不支持的支付提供商: ${input.providerId}`);
    }
  }

  /**
   * 传统后端验证逻辑
   * 特点: 纯逻辑判断，不依赖LLM
   */
  private async performBackendVerification(
    input: StructuredPaymentVerificationInput,
    providerResult: any
  ): Promise<PaymentVerificationResult> {
    
    // 验证订单ID匹配
    if (providerResult.out_trade_no !== input.orderId) {
      return {
        verified: false,
        errorCode: 'ORDER_ID_MISMATCH',
        errorMessage: '订单ID不匹配'
      };
    }

    // 验证金额匹配
    const actualAmount = this.parseAmount(providerResult.total_fee || providerResult.total_amount);
    if (Math.abs(actualAmount - input.expectedAmount) > 1) {
      return {
        verified: false,
        errorCode: 'AMOUNT_MISMATCH',
        errorMessage: `金额不匹配: 期望${input.expectedAmount}分，实际${actualAmount}分`
      };
    }

    // 验证支付状态
    const paymentStatus = this.mapProviderStatus(providerResult.trade_state || providerResult.trade_status);
    const verified = paymentStatus === 'PAID';

    return {
      verified,
      actualAmount,
      paymentStatus,
      verificationTime: new Date(),
      verificationMethod: 'BACKEND_QUERY'
    };
  }
}
```

## 🛡️ 安全架构设计

### 多层安全防护

```
┌─────────────────────────────────────────────────────────┐
│                    第一层: 网络安全                        │
│  HTTPS │ WAF │ DDoS防护 │ IP白名单                      │
├─────────────────────────────────────────────────────────┤
│                    第二层: 应用安全                        │
│  认证授权 │ 输入验证 │ 输出编码 │ 会话管理                │
├─────────────────────────────────────────────────────────┤
│                    第三层: 业务安全                        │
│  支付验证 │ 订单验证 │ 用户验证 │ 权限控制                │
├─────────────────────────────────────────────────────────┤
│                    第四层: 数据安全                        │
│  数据加密 │ 访问控制 │ 审计日志 │ 备份恢复                │
├─────────────────────────────────────────────────────────┤
│                    第五层: 基础安全                        │
│  系统加固 │ 漏洞扫描 │ 安全监控 │ 应急响应                │
└─────────────────────────────────────────────────────────┘
```

### 安全服务架构

```typescript
/**
 * 安全服务架构
 * 提供统一的安全能力
 */
export interface ISecurityService {
  // 认证授权
  authenticate(credentials: any): Promise<AuthResult>;
  authorize(user: User, resource: string, action: string): Promise<boolean>;
  
  // 数据保护
  encrypt(data: any): Promise<string>;
  decrypt(encryptedData: string): Promise<any>;
  hash(data: string): Promise<string>;
  
  // 审计日志
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  logUserAction(action: UserAction): Promise<void>;
  
  // 威胁检测
  detectAnomalousActivity(user: User, action: string): Promise<ThreatLevel>;
  blockSuspiciousRequest(request: any): Promise<boolean>;
}
```

## 📊 数据架构设计

### 数据库设计

```sql
-- 用户表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  nickname VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  password_hash VARCHAR(255) NOT NULL,
  preferences JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_phone (phone)
);

-- 订单表
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  amount INT NOT NULL COMMENT '金额(分)',
  currency VARCHAR(3) DEFAULT 'CNY',
  status ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED') DEFAULT 'PENDING',
  description TEXT,
  payment_provider VARCHAR(20),
  payment_transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- 支付记录表
CREATE TABLE payment_records (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  transaction_id VARCHAR(100),
  amount INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  callback_data JSON,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_order_id (order_id),
  INDEX idx_transaction_id (transaction_id)
);

-- 审计日志表
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id VARCHAR(36),
  resource_type VARCHAR(50),
  resource_id VARCHAR(36),
  action VARCHAR(50) NOT NULL,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

### 缓存架构

```typescript
/**
 * 多级缓存架构
 * 基于Phase 1的80%缓存命中率进行扩展
 */
export interface ICacheManager {
  // L1: 内存缓存 (最快)
  setMemoryCache(key: string, value: any, ttl: number): Promise<void>;
  getMemoryCache(key: string): Promise<any>;
  
  // L2: Redis缓存 (快)
  setRedisCache(key: string, value: any, ttl: number): Promise<void>;
  getRedisCache(key: string): Promise<any>;
  
  // L3: 数据库缓存 (慢)
  setDatabaseCache(key: string, value: any, ttl: number): Promise<void>;
  getDatabaseCache(key: string): Promise<any>;
  
  // 智能缓存策略
  smartSet(key: string, value: any, strategy: CacheStrategy): Promise<void>;
  smartGet(key: string): Promise<any>;
}

// 缓存策略
export enum CacheStrategy {
  MEMORY_ONLY = 'memory_only',      // 仅内存缓存
  REDIS_ONLY = 'redis_only',        // 仅Redis缓存
  MULTI_LEVEL = 'multi_level',      // 多级缓存
  WRITE_THROUGH = 'write_through',  // 写穿透
  WRITE_BACK = 'write_back'         // 写回
}
```

## 🔄 API架构设计

### RESTful API设计

```typescript
/**
 * 统一API响应格式
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

/**
 * API路由设计
 */
// 用户相关API
POST   /api/v1/users/register          // 用户注册
POST   /api/v1/users/login             // 用户登录
GET    /api/v1/users/profile           // 获取用户信息
PUT    /api/v1/users/profile           // 更新用户信息
PUT    /api/v1/users/preferences       // 更新用户偏好

// 订单相关API
POST   /api/v1/orders                  // 创建订单
GET    /api/v1/orders                  // 获取订单列表
GET    /api/v1/orders/:id              // 获取订单详情
PUT    /api/v1/orders/:id/cancel       // 取消订单

// 支付相关API
POST   /api/v1/payments/create         // 创建支付
GET    /api/v1/payments/:id/status     // 查询支付状态
POST   /api/v1/payments/callback       // 支付回调

// 地理服务API (Phase 1)
POST   /api/v1/geo/search              // 地点搜索
POST   /api/v1/geo/route               // 路线规划
POST   /api/v1/geo/nearby              // 周边搜索
```

## 📈 监控和运维架构

### 渐进式CI/CD和监控演进策略

基于现有架构优势，采用务实的三阶段演进方案：

#### **阶段一：立即执行（基于现有架构优势）**

**核心理念**：充分利用已有的Docker容器化、健康检查机制、审计日志系统

```yaml
# 基于现有Docker基础的GitLab CI/CD
stages:
  - test
  - security-scan
  - build
  - deploy

test:
  stage: test
  script:
    - npm install
    - npm run test:phase3a        # 利用现有测试体系
    - npm run test:security       # 利用现有安全测试
    - npm run test:payment        # 基于隔离式支付架构的测试

build:
  stage: build
  script:
    - docker build -t smart-travel:$CI_COMMIT_SHA .  # 利用现有Docker化
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - docker-compose up -d        # 基于现有容器编排
  only:
    - main
```

**监控体系扩展**：
```yaml
# 基于现有健康检查的监控扩展
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

**支付监控专项**：
```typescript
// 基于隔离式支付验证架构的专业监控
export class PaymentMonitoringService {
  async trackPaymentFlow(orderId: string, stage: PaymentStage, metrics: PaymentMetrics) {
    // 利用现有审计日志系统
    await this.auditLogger.logPaymentEvent({
      eventType: 'PAYMENT_PERFORMANCE',
      orderId,
      stage, // 'order_creation' | 'payment_processing' | 'isolated_verification'
      duration: metrics.duration,
      success: metrics.success,
      timestamp: Date.now()
    });
  }
}
```

#### **阶段二：云厂商无关增强（1-3个月）**

**配置中心抽象化**：
```typescript
export interface IConfigService {
  get(key: string): string;
  set(key: string, value: string): Promise<void>;
}

export class ConfigServiceFactory {
  static create(): IConfigService {
    const provider = process.env.CONFIG_PROVIDER || 'local';
    switch (provider) {
      case 'tencent': return new TencentTSFConfigService();
      case 'aliyun': return new AliyunACMConfigService();
      default: return new LocalConfigService(); // 现有方式
    }
  }
}
```

**监控数据标准化**：
```yaml
# 扩展现有健康检查为Prometheus格式
# /metrics 端点输出
smart_travel_payment_success_rate 0.99
smart_travel_response_time_p95 150
smart_travel_active_users 1250
smart_travel_order_completion_rate 0.95
```

#### **阶段三：选择性云化（3-6个月）**

**多云POC测试策略**：
- **腾讯云场景**: 微信支付深度集成 + 金融级安全认证
- **阿里云场景**: 支付宝深度集成 + ARMS监控服务

### 监控指标体系

```typescript
/**
 * 监控指标定义
 */
export interface MonitoringMetrics {
  // 业务指标
  business: {
    userRegistrations: number;        // 用户注册数
    orderCount: number;               // 订单数量
    paymentSuccessRate: number;       // 支付成功率
    revenue: number;                  // 收入
  };
  
  // 技术指标
  technical: {
    responseTime: number;             // 响应时间
    errorRate: number;                // 错误率
    throughput: number;               // 吞吐量
    availability: number;             // 可用性
  };
  
  // 安全指标
  security: {
    failedLoginAttempts: number;      // 登录失败次数
    suspiciousActivities: number;     // 可疑活动
    securityEvents: number;           // 安全事件
  };
}
```

### 告警规则

```yaml
# 告警规则配置
alerts:
  # 业务告警
  - name: payment_failure_rate_high
    condition: payment_success_rate < 0.95
    severity: critical
    
  - name: user_registration_drop
    condition: user_registrations < 10 per hour
    severity: warning
    
  # 技术告警
  - name: response_time_high
    condition: avg_response_time > 5s
    severity: warning
    
  - name: error_rate_high
    condition: error_rate > 0.05
    severity: critical
    
  # 安全告警
  - name: failed_login_spike
    condition: failed_login_attempts > 100 per minute
    severity: critical
    
  - name: suspicious_activity_detected
    condition: suspicious_activities > 0
    severity: high
```

---

## 🎯 架构优势总结

### 技术优势
1. **渐进式演进**: 在Phase 1稳定架构基础上平滑扩展
2. **服务隔离**: 商业化服务与地理服务解耦，互不影响
3. **安全优先**: 多层安全防护，隔离式支付验证
4. **高可用性**: 继承Phase 1的99.5%可用性设计

### 商业优势
1. **快速上市**: 基于成熟架构，缩短开发周期
2. **用户体验**: 统一的用户界面和交互体验
3. **数据驱动**: 完整的数据分析和用户画像
4. **可扩展性**: 支持未来功能扩展和业务增长

### 安全优势
1. **输入隔离**: 支付验证与用户输入完全隔离
2. **纵深防御**: 多层安全防护机制
3. **审计追踪**: 完整的操作日志和安全事件记录
4. **合规保障**: 满足支付安全和数据保护要求

## 🚀 部署架构设计

### 生产环境部署

```yaml
# Docker Compose 生产环境配置
version: '3.8'
services:
  # 应用服务
  smart-travel-app:
    image: smart-travel:latest
    replicas: 3
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - database
      - redis
      - monitoring

  # 数据库服务
  database:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=smart_travel
    volumes:
      - db_data:/var/lib/mysql
      - ./backups:/backups
    ports:
      - "3306:3306"

  # 缓存服务
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  # 监控服务
  monitoring:
    image: prometheus:latest
    volumes:
      - ./monitoring:/etc/prometheus
    ports:
      - "9090:9090"

volumes:
  db_data:
  redis_data:
```

### 负载均衡配置

```nginx
# Nginx 负载均衡配置
upstream smart_travel_backend {
    least_conn;
    server app1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app3:3000 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name api.smarttravel.com;

    # SSL配置
    ssl_certificate /etc/ssl/certs/smarttravel.crt;
    ssl_certificate_key /etc/ssl/private/smarttravel.key;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # API代理
    location /api/ {
        proxy_pass http://smart_travel_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时配置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # 限流配置
        limit_req zone=api burst=20 nodelay;
    }

    # 支付回调特殊处理
    location /api/v1/payments/callback {
        proxy_pass http://smart_travel_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # 支付回调不限流
        limit_req off;

        # 记录详细日志
        access_log /var/log/nginx/payment_callback.log detailed;
    }
}

# 限流配置
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
}
```

## 🔄 CI/CD流水线

### GitHub Actions配置

```yaml
# .github/workflows/deploy.yml
name: Deploy Smart Travel Assistant

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: |
          npm run test:unit
          npm run test:integration
          npm run test:security

      - name: Run security scan
        run: npm audit --audit-level high

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: |
          docker build -t smart-travel:${{ github.sha }} .
          docker tag smart-travel:${{ github.sha }} smart-travel:latest

      - name: Security scan
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy image smart-travel:${{ github.sha }}

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push smart-travel:${{ github.sha }}
          docker push smart-travel:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to production
        run: |
          # 蓝绿部署脚本
          ./scripts/blue-green-deploy.sh smart-travel:${{ github.sha }}

      - name: Health check
        run: |
          # 健康检查
          ./scripts/health-check.sh

      - name: Rollback on failure
        if: failure()
        run: |
          # 自动回滚
          ./scripts/rollback.sh
```

## 📊 性能优化策略

### 数据库优化

```sql
-- 索引优化
CREATE INDEX idx_users_email_status ON users(email, status);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX idx_payments_order_status ON payment_records(order_id, status);

-- 分区表设计 (大数据量时)
CREATE TABLE audit_logs_2024 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 查询优化
EXPLAIN ANALYZE SELECT * FROM orders
WHERE user_id = ? AND status = 'PAID'
ORDER BY created_at DESC LIMIT 10;
```

### 缓存优化策略

```typescript
/**
 * 智能缓存策略
 * 基于Phase 1的80%命中率进行优化
 */
export class SmartCacheStrategy {
  // 热点数据预加载
  async preloadHotData(): Promise<void> {
    const hotUsers = await this.getActiveUsers();
    for (const user of hotUsers) {
      await this.cacheUserData(user.id);
    }
  }

  // 缓存穿透防护
  async getWithBloomFilter(key: string): Promise<any> {
    if (!this.bloomFilter.contains(key)) {
      return null; // 数据肯定不存在
    }

    return await this.cache.get(key);
  }

  // 缓存雪崩防护
  async getWithRandomTTL(key: string, baseTTL: number): Promise<any> {
    const randomTTL = baseTTL + Math.random() * 300; // 随机5分钟
    return await this.cache.setex(key, randomTTL, value);
  }
}
```

## 🛡️ 安全加固措施

### 安全配置清单

```typescript
/**
 * 安全配置检查清单
 */
export const SecurityChecklist = {
  // 认证安全
  authentication: {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    sessionSecurity: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 3600000 // 1小时
    },
    rateLimiting: {
      loginAttempts: 5,
      lockoutDuration: 900000, // 15分钟
      ipWhitelist: ['127.0.0.1']
    }
  },

  // 数据安全
  dataProtection: {
    encryption: {
      algorithm: 'AES-256-GCM',
      keyRotation: 86400000, // 24小时
      saltRounds: 12
    },
    backup: {
      frequency: 'daily',
      retention: 30, // 30天
      encryption: true
    }
  },

  // 网络安全
  networkSecurity: {
    https: {
      enforced: true,
      hsts: true,
      certificateValidation: true
    },
    firewall: {
      enabled: true,
      allowedPorts: [80, 443, 22],
      ddosProtection: true
    }
  }
};
```

### 安全监控

```typescript
/**
 * 安全事件监控
 */
export class SecurityMonitor {
  async detectAnomalousActivity(user: User, action: string): Promise<ThreatLevel> {
    const patterns = await this.analyzeUserBehavior(user, action);

    // 检测异常登录
    if (action === 'login' && patterns.unusualLocation) {
      return ThreatLevel.HIGH;
    }

    // 检测异常支付
    if (action === 'payment' && patterns.unusualAmount) {
      return ThreatLevel.MEDIUM;
    }

    // 检测爬虫行为
    if (patterns.highFrequency && patterns.noUserAgent) {
      return ThreatLevel.HIGH;
    }

    return ThreatLevel.LOW;
  }

  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // 记录安全事件
    await this.auditLogger.logSecurityEvent(incident);

    // 自动响应
    switch (incident.severity) {
      case 'CRITICAL':
        await this.blockUser(incident.userId);
        await this.notifySecurityTeam(incident);
        break;
      case 'HIGH':
        await this.requireAdditionalAuth(incident.userId);
        break;
      case 'MEDIUM':
        await this.increaseMonitoring(incident.userId);
        break;
    }
  }
}
```

---

**文档状态**: ✅ 已批准
**架构版本**: v2.0 (增强版)
**适用阶段**: Phase 3商业化
**维护责任**: CTO + 架构师团队
**最后更新**: 2025年8月6日
