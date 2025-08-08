/**
 * 安全服务接口定义
 * 基于Phase 1架构扩展，实现商业化安全需求
 * 遵循SOLID原则和依赖倒置
 */

// ============= 安全上下文接口 =============

export interface ISecurityContext {
  readonly sessionId: string;
  readonly userId: string;
  readonly timestamp: number;
  readonly signature: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  
  // 验证方法
  validate(): Promise<boolean>;
  
  // 加密解密
  encrypt(data: any): Promise<string>;
  decrypt(encryptedData: string): Promise<any>;
  
  // 签名验证
  sign(data: any): Promise<string>;
  verifySignature(data: any, signature: string): Promise<boolean>;
  
  // 权限检查
  hasPermission(resource: string, action: string): Promise<boolean>;
  
  // 会话管理
  refreshSession(): Promise<void>;
  invalidateSession(): Promise<void>;
}

// ============= 加密服务接口 =============

export interface IEncryptionService {
  // 对称加密
  encrypt(data: string, key?: string): Promise<string>;
  decrypt(encryptedData: string, key?: string): Promise<string>;
  
  // 哈希
  hash(data: string, algorithm?: string): Promise<string>;
  compareHash(data: string, hash: string): Promise<boolean>;
  
  // 数字签名
  sign(data: any, privateKey?: string): Promise<string>;
  verify(data: any, signature: string, publicKey?: string): Promise<boolean>;
  
  // 密钥管理
  generateKey(length?: number): Promise<string>;
  rotateKey(keyId: string): Promise<string>;
  
  // JWT
  signJWT(payload: any, expiresIn?: string): Promise<string>;
  verifyJWT(token: string): Promise<any>;
  
  // 随机数生成
  generateNonce(length?: number): string;
  generateSalt(length?: number): string;
}

// ============= 审计日志接口 =============

export interface IAuditLogger {
  // 安全事件日志
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  
  // 支付事件日志
  logPaymentEvent(event: PaymentEvent): Promise<void>;
  
  // 用户事件日志
  logUserEvent(event: UserEvent): Promise<void>;
  
  // 系统事件日志
  logSystemEvent(event: SystemEvent): Promise<void>;
  
  // 查询日志
  queryLogs(filter: LogFilter): Promise<AuditLog[]>;
  
  // 日志统计
  getLogStatistics(timeRange: TimeRange): Promise<LogStatistics>;
}

// ============= 事件类型定义 =============

export interface BaseEvent {
  eventType: string;
  eventCategory: 'SECURITY' | 'PAYMENT' | 'USER' | 'SYSTEM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

export interface SecurityEvent extends BaseEvent {
  eventCategory: 'SECURITY';
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  attackType?: string;
  blocked?: boolean;
  mitigationAction?: string;
}

export interface PaymentEvent extends BaseEvent {
  eventCategory: 'PAYMENT';
  orderId: string;
  amount?: number;
  provider?: string;
  transactionId?: string;
  verificationMethod?: string;
  result: 'SUCCESS' | 'FAILURE' | 'PENDING';
}

export interface UserEvent extends BaseEvent {
  eventCategory: 'USER';
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  result: 'SUCCESS' | 'FAILURE';
}

export interface SystemEvent extends BaseEvent {
  eventCategory: 'SYSTEM';
  component: string;
  action: string;
  performance?: {
    duration: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

// ============= 审计日志数据结构 =============

export interface AuditLog {
  id: string;
  eventType: string;
  eventCategory: string;
  severity: string;
  userId?: string;
  sessionId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  result?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
}

export interface LogFilter {
  eventType?: string;
  eventCategory?: string;
  severity?: string;
  userId?: string;
  ipAddress?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export interface LogStatistics {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topUsers: Array<{ userId: string; eventCount: number }>;
  topIpAddresses: Array<{ ipAddress: string; eventCount: number }>;
  timeRange: TimeRange;
}

export interface TimeRange {
  startTime: Date;
  endTime: Date;
}

// ============= 威胁检测接口 =============

export interface IThreatDetectionService {
  // 异常行为检测
  detectAnomalousActivity(user: User, action: string): Promise<ThreatLevel>;
  
  // 恶意IP检测
  checkMaliciousIP(ipAddress: string): Promise<boolean>;
  
  // 暴力破解检测
  detectBruteForceAttack(userId: string, ipAddress: string): Promise<boolean>;
  
  // 异常登录检测
  detectAnomalousLogin(userId: string, loginData: LoginData): Promise<ThreatLevel>;
  
  // 异常支付检测
  detectAnomalousPayment(userId: string, paymentData: PaymentData): Promise<ThreatLevel>;
  
  // 威胁响应
  handleThreatDetection(threat: ThreatDetection): Promise<void>;
}

export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ThreatDetection {
  threatLevel: ThreatLevel;
  threatType: string;
  userId?: string;
  ipAddress?: string;
  details: Record<string, any>;
  timestamp: Date;
  mitigationRequired: boolean;
}

export interface LoginData {
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
  };
  timestamp: Date;
}

export interface PaymentData {
  amount: number;
  provider: string;
  paymentMethod: string;
  ipAddress: string;
  timestamp: Date;
}

// ============= 访问控制接口 =============

export interface IAccessControlService {
  // 权限检查
  checkPermission(userId: string, resource: string, action: string): Promise<boolean>;
  
  // 角色管理
  assignRole(userId: string, role: string): Promise<void>;
  removeRole(userId: string, role: string): Promise<void>;
  getUserRoles(userId: string): Promise<string[]>;
  
  // 资源权限
  grantPermission(userId: string, resource: string, actions: string[]): Promise<void>;
  revokePermission(userId: string, resource: string, actions: string[]): Promise<void>;
  
  // 权限继承
  inheritPermissions(fromUserId: string, toUserId: string): Promise<void>;
}

// ============= 会话管理接口 =============

export interface ISessionManager {
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

export interface SessionData {
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
  };
  deviceInfo?: {
    type: string;
    os: string;
    browser: string;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken?: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  lastAccessAt: Date;
  isActive: boolean;
}

// ============= 用户相关接口 =============

export interface User {
  id: string;
  email: string;
  phone?: string;
  nickname: string;
  avatar?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
  preferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============= 错误类型定义 =============

export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string = 'SECURITY_ERROR',
    public severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class AuthenticationError extends SecurityError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 'HIGH');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends SecurityError {
  constructor(message: string = 'Authorization failed') {
    super(message, 'AUTHORIZATION_ERROR', 'MEDIUM');
    this.name = 'AuthorizationError';
  }
}

export class EncryptionError extends SecurityError {
  constructor(message: string = 'Encryption operation failed') {
    super(message, 'ENCRYPTION_ERROR', 'HIGH');
    this.name = 'EncryptionError';
  }
}

export class ThreatDetectedError extends SecurityError {
  constructor(
    message: string,
    public threatLevel: ThreatLevel,
    public threatType: string
  ) {
    super(message, 'THREAT_DETECTED', threatLevel as any);
    this.name = 'ThreatDetectedError';
  }
}
