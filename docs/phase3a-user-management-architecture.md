# Phase 3A用户管理系统架构设计

**项目**: 智游助手v6.2  
**版本**: v6.2.0  
**模块**: 用户管理系统  
**设计日期**: 2025年8月6日  

---

## 🏗️ **用户管理系统架构**

### **核心服务组件**

#### 1. 用户认证服务 (Authentication Service)
```typescript
interface IAuthenticationService {
  // 用户注册
  register(userData: UserRegistrationData): Promise<AuthResult>;
  
  // 用户登录
  login(credentials: LoginCredentials): Promise<AuthResult>;
  
  // 令牌刷新
  refreshToken(refreshToken: string): Promise<AuthResult>;
  
  // 用户登出
  logout(userId: string, sessionId: string): Promise<void>;
  
  // 密码重置
  resetPassword(email: string): Promise<void>;
  
  // 邮箱验证
  verifyEmail(token: string): Promise<boolean>;
  
  // 多因素认证
  enableMFA(userId: string): Promise<MFASetupResult>;
  verifyMFA(userId: string, code: string): Promise<boolean>;
}
```

#### 2. 用户授权服务 (Authorization Service)
```typescript
interface IAuthorizationService {
  // 权限检查
  checkPermission(userId: string, resource: string, action: string): Promise<boolean>;
  
  // 角色管理
  assignRole(userId: string, role: string): Promise<void>;
  removeRole(userId: string, role: string): Promise<void>;
  getUserRoles(userId: string): Promise<string[]>;
  
  // 权限管理
  grantPermission(userId: string, permission: Permission): Promise<void>;
  revokePermission(userId: string, permission: Permission): Promise<void>;
  getUserPermissions(userId: string): Promise<Permission[]>;
  
  // 资源访问控制
  canAccessResource(userId: string, resourceId: string): Promise<boolean>;
}
```

#### 3. 用户资料服务 (User Profile Service)
```typescript
interface IUserProfileService {
  // 用户资料管理
  getUserProfile(userId: string): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void>;
  
  // 偏好设置
  getUserPreferences(userId: string): Promise<UserPreferences>;
  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void>;
  
  // 用户统计
  getUserStatistics(userId: string): Promise<UserStatistics>;
  
  // 用户搜索
  searchUsers(query: UserSearchQuery): Promise<UserSearchResult[]>;
}
```

#### 4. 会话管理服务 (Session Management Service)
```typescript
interface ISessionManagementService {
  // 会话创建
  createSession(userId: string, sessionData: SessionData): Promise<UserSession>;
  
  // 会话验证
  validateSession(sessionToken: string): Promise<UserSession | null>;
  
  // 会话刷新
  refreshSession(sessionToken: string): Promise<UserSession>;
  
  // 会话销毁
  destroySession(sessionToken: string): Promise<void>;
  destroyAllUserSessions(userId: string): Promise<void>;
  
  // 会话查询
  getUserSessions(userId: string): Promise<UserSession[]>;
  getActiveSessions(): Promise<UserSession[]>;
  
  // 会话清理
  cleanupExpiredSessions(): Promise<number>;
}
```

### **数据模型设计**

#### 用户表 (users)
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  avatar VARCHAR(500),
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED') DEFAULT 'ACTIVE',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(32),
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

#### 用户角色表 (user_roles)
```sql
CREATE TABLE user_roles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  role_name VARCHAR(50) NOT NULL,
  granted_by VARCHAR(36),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE KEY uk_user_role (user_id, role_name),
  INDEX idx_user_id (user_id),
  INDEX idx_role_name (role_name)
);
```

#### 用户权限表 (user_permissions)
```sql
CREATE TABLE user_permissions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  granted_by VARCHAR(36),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE KEY uk_user_permission (user_id, resource, action),
  INDEX idx_user_id (user_id),
  INDEX idx_resource (resource)
);
```

#### 用户偏好表 (user_preferences)
```sql
CREATE TABLE user_preferences (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  travel_style ENUM('budget', 'comfort', 'luxury') DEFAULT 'comfort',
  transport_modes JSON,
  interests JSON,
  language VARCHAR(10) DEFAULT 'zh-CN',
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
  notification_settings JSON,
  privacy_settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_preferences (user_id)
);
```

### **安全集成设计**

#### 与隔离式支付验证的集成
```typescript
class SecureUserService {
  constructor(
    private authService: IAuthenticationService,
    private auditLogger: IAuditLogger,
    private encryptionService: IEncryptionService
  ) {}
  
  async authenticateForPayment(userId: string, sessionToken: string): Promise<PaymentAuthContext> {
    // 1. 验证用户会话
    const session = await this.authService.validateSession(sessionToken);
    if (!session || session.userId !== userId) {
      await this.auditLogger.logSecurityEvent({
        eventType: 'PAYMENT_AUTH_FAILED',
        eventCategory: 'SECURITY',
        severity: 'HIGH',
        userId,
        details: { reason: 'Invalid session' },
        threatLevel: 'HIGH'
      });
      throw new AuthenticationError('Invalid session for payment');
    }
    
    // 2. 检查支付权限
    const hasPaymentPermission = await this.authService.checkPermission(
      userId, 'payment', 'create'
    );
    if (!hasPaymentPermission) {
      await this.auditLogger.logSecurityEvent({
        eventType: 'PAYMENT_PERMISSION_DENIED',
        eventCategory: 'SECURITY',
        severity: 'MEDIUM',
        userId,
        details: { resource: 'payment', action: 'create' },
        threatLevel: 'MEDIUM'
      });
      throw new AuthorizationError('No payment permission');
    }
    
    // 3. 生成支付认证上下文
    const paymentAuthContext: PaymentAuthContext = {
      userId,
      sessionId: session.id,
      timestamp: Date.now(),
      signature: await this.encryptionService.sign({
        userId,
        sessionId: session.id,
        timestamp: Date.now()
      })
    };
    
    // 4. 记录支付认证事件
    await this.auditLogger.logPaymentEvent({
      eventType: 'PAYMENT_AUTH_SUCCESS',
      eventCategory: 'PAYMENT',
      severity: 'INFO',
      userId,
      details: { sessionId: session.id },
      result: 'SUCCESS'
    });
    
    return paymentAuthContext;
  }
}
```

### **API接口设计**

#### 认证相关API
```typescript
// POST /api/v1/auth/register
interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  phone?: string;
}

// POST /api/v1/auth/login
interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

// POST /api/v1/auth/refresh
interface RefreshTokenRequest {
  refreshToken: string;
}

// POST /api/v1/auth/logout
interface LogoutRequest {
  sessionToken: string;
}
```

#### 用户管理API
```typescript
// GET /api/v1/users/profile
// PUT /api/v1/users/profile
interface UserProfileResponse {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  preferences: UserPreferences;
  statistics: UserStatistics;
}

// GET /api/v1/users/sessions
interface UserSessionsResponse {
  sessions: UserSession[];
  total: number;
}

// DELETE /api/v1/users/sessions/:sessionId
interface TerminateSessionRequest {
  sessionId: string;
}
```

### **性能优化策略**

#### 缓存策略
```typescript
class CachedUserService {
  constructor(
    private userService: IUserService,
    private cacheManager: ICacheManager
  ) {}
  
  async getUserProfile(userId: string): Promise<UserProfile> {
    const cacheKey = `user:profile:${userId}`;
    
    // 尝试从缓存获取
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 从数据库获取
    const profile = await this.userService.getUserProfile(userId);
    
    // 缓存结果 (TTL: 1小时)
    await this.cacheManager.set(cacheKey, JSON.stringify(profile), 3600);
    
    return profile;
  }
  
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    // 更新数据库
    await this.userService.updateUserProfile(userId, updates);
    
    // 清除缓存
    const cacheKey = `user:profile:${userId}`;
    await this.cacheManager.delete(cacheKey);
  }
}
```

### **监控和告警**

#### 关键指标监控
```typescript
interface UserManagementMetrics {
  // 认证指标
  loginSuccessRate: number;
  loginFailureRate: number;
  registrationRate: number;
  
  // 会话指标
  activeSessionCount: number;
  sessionDuration: number;
  concurrentUserCount: number;
  
  // 安全指标
  failedLoginAttempts: number;
  suspiciousActivityCount: number;
  mfaAdoptionRate: number;
  
  // 性能指标
  authenticationLatency: number;
  userProfileLoadTime: number;
  cacheHitRate: number;
}
```

#### 告警规则
```yaml
alerts:
  - name: HighFailedLoginRate
    condition: failed_login_rate > 0.1
    severity: HIGH
    description: "Failed login rate exceeds 10%"
    
  - name: SuspiciousActivity
    condition: suspicious_activity_count > 10
    severity: CRITICAL
    description: "Suspicious activity detected"
    
  - name: AuthenticationLatencyHigh
    condition: authentication_latency > 2000
    severity: MEDIUM
    description: "Authentication latency exceeds 2 seconds"
```

---

## 🔄 **与现有架构集成**

### Phase 1地理服务集成
- 用户位置偏好与地理服务关联
- 用户历史路线与缓存服务集成
- 用户状态与状态管理服务同步

### 隔离式支付验证集成
- 用户认证为支付流程提供安全上下文
- 用户权限控制支付操作访问
- 用户会话验证支付请求合法性

### 审计日志集成
- 所有用户操作记录到审计日志
- 安全事件自动触发告警
- 用户行为分析和异常检测
