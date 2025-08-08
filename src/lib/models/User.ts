/**
 * 智游助手v6.2 - 用户数据模型
 * 遵循原则: [SOLID-单一职责] + [DDD领域驱动设计] + [为失败而设计]
 * 
 * 核心功能:
 * 1. 用户数据结构定义
 * 2. 用户CRUD操作
 * 3. 用户偏好管理
 * 4. 用户会话管理
 */

import { PasswordHashResult } from '../auth/password-manager';

// ============= 用户数据接口定义 =============

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  displayName: string;
  avatar?: string;
  phone?: string;
  
  // 认证信息
  passwordHash: string;
  passwordSalt: string;
  passwordUpdatedAt: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  
  // 用户状态
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  role: 'user' | 'vip' | 'admin';
  permissions: string[];
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  
  // 统计信息
  loginCount: number;
  planCount: number;
  
  // 扩展信息
  metadata: Record<string, any>;
}

export interface UserPreferences {
  id: string;
  userId: string;
  
  // 旅行偏好
  travelStyles: string[];           // 旅行风格: ['adventure', 'culture', 'relaxation']
  budgetRange: string;              // 预算范围: 'budget' | 'mid-range' | 'luxury'
  accommodationType: string[];      // 住宿偏好: ['hotel', 'hostel', 'bnb']
  transportMode: string[];          // 交通偏好: ['flight', 'train', 'car']
  cuisinePreferences: string[];     // 美食偏好: ['local', 'international', 'vegetarian']
  interests: string[];              // 兴趣标签: ['history', 'nature', 'shopping']
  
  // 个人偏好
  language: string;                 // 语言偏好
  currency: string;                 // 货币偏好
  timezone: string;                 // 时区
  
  // 通知偏好
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  
  // 隐私设置
  profileVisibility: 'public' | 'private' | 'friends';
  shareLocation: boolean;
  shareItinerary: boolean;
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  
  // 设备信息
  deviceType: string;
  deviceId?: string;
  userAgent: string;
  ipAddress: string;
  location?: {
    country: string;
    city: string;
    coordinates?: [number, number];
  };
  
  // 会话状态
  status: 'active' | 'expired' | 'revoked';
  expiresAt: Date;
  lastActiveAt: Date;
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
  username?: string;
  phone?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserData {
  displayName?: string;
  username?: string;
  avatar?: string;
  phone?: string;
  preferences?: Partial<UserPreferences>;
  metadata?: Record<string, any>;
}

// ============= 用户模型类实现 =============

export class User {
  private profile: UserProfile;
  private preferences?: UserPreferences;
  private sessions: UserSession[] = [];

  constructor(profile: UserProfile, preferences?: UserPreferences) {
    this.profile = profile;
    this.preferences = preferences || this.createDefaultPreferences();
  }

  // ============= 基础属性访问 =============

  get id(): string {
    return this.profile.id;
  }

  get email(): string {
    return this.profile.email;
  }

  get displayName(): string {
    return this.profile.displayName;
  }

  get role(): string {
    return this.profile.role;
  }

  get status(): string {
    return this.profile.status;
  }

  get passwordHash(): string {
    return this.profile.passwordHash;
  }

  get passwordSalt(): string {
    return this.profile.passwordSalt;
  }

  get emailVerified(): boolean {
    return this.profile.emailVerified;
  }

  get phoneVerified(): boolean {
    return this.profile.phoneVerified;
  }

  get permissions(): string[] {
    return this.profile.permissions;
  }

  get createdAt(): Date {
    return this.profile.createdAt;
  }

  get updatedAt(): Date {
    return this.profile.updatedAt;
  }

  get lastLoginAt(): Date | undefined {
    return this.profile.lastLoginAt;
  }

  get lastActiveAt(): Date | undefined {
    return this.profile.lastActiveAt;
  }

  get loginCount(): number {
    return this.profile.loginCount;
  }

  get planCount(): number {
    return this.profile.planCount;
  }

  get metadata(): Record<string, any> {
    return this.profile.metadata;
  }

  get isActive(): boolean {
    return this.profile.status === 'active';
  }

  get isVerified(): boolean {
    return this.profile.emailVerified;
  }

  // ============= 用户状态管理 =============

  /**
   * 激活用户
   */
  activate(): void {
    this.profile.status = 'active';
    this.profile.updatedAt = new Date();
  }

  /**
   * 停用用户
   */
  deactivate(): void {
    this.profile.status = 'inactive';
    this.profile.updatedAt = new Date();
  }

  /**
   * 暂停用户
   */
  suspend(): void {
    this.profile.status = 'suspended';
    this.profile.updatedAt = new Date();
  }

  /**
   * 验证邮箱
   */
  verifyEmail(): void {
    this.profile.emailVerified = true;
    this.profile.updatedAt = new Date();
  }

  /**
   * 验证手机
   */
  verifyPhone(): void {
    this.profile.phoneVerified = true;
    this.profile.updatedAt = new Date();
  }

  // ============= 用户偏好管理 =============

  /**
   * 更新用户偏好
   */
  updatePreferences(newPreferences: Partial<UserPreferences>): void {
    if (!this.preferences) {
      this.preferences = this.createDefaultPreferences();
    }

    Object.assign(this.preferences, newPreferences);
    this.preferences.updatedAt = new Date();
    this.profile.updatedAt = new Date();
  }

  /**
   * 获取用户偏好
   */
  getPreferences(): UserPreferences | undefined {
    return this.preferences;
  }

  /**
   * 创建默认偏好
   */
  private createDefaultPreferences(): UserPreferences {
    return {
      id: `pref_${this.profile.id}_${Date.now()}`,
      userId: this.profile.id,
      travelStyles: [],
      budgetRange: 'mid-range',
      accommodationType: ['hotel'],
      transportMode: ['flight'],
      cuisinePreferences: ['local'],
      interests: [],
      language: 'zh-CN',
      currency: 'CNY',
      timezone: 'Asia/Shanghai',
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      marketingEmails: false,
      profileVisibility: 'private',
      shareLocation: false,
      shareItinerary: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // ============= 会话管理 =============

  /**
   * 添加会话
   */
  addSession(session: UserSession): void {
    this.sessions.push(session);
    this.profile.lastLoginAt = new Date();
    this.profile.loginCount++;
    this.profile.updatedAt = new Date();
  }

  /**
   * 移除会话
   */
  removeSession(sessionId: string): boolean {
    const index = this.sessions.findIndex(s => s.sessionId === sessionId);
    if (index !== -1) {
      this.sessions.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取活跃会话
   */
  getActiveSessions(): UserSession[] {
    const now = new Date();
    return this.sessions.filter(s => 
      s.status === 'active' && s.expiresAt > now
    );
  }

  /**
   * 撤销所有会话
   */
  revokeAllSessions(): void {
    this.sessions.forEach(session => {
      session.status = 'revoked';
      session.updatedAt = new Date();
    });
  }

  // ============= 权限管理 =============

  /**
   * 检查权限
   */
  hasPermission(permission: string): boolean {
    return this.profile.permissions.includes(permission);
  }

  /**
   * 添加权限
   */
  addPermission(permission: string): void {
    if (!this.hasPermission(permission)) {
      this.profile.permissions.push(permission);
      this.profile.updatedAt = new Date();
    }
  }

  /**
   * 移除权限
   */
  removePermission(permission: string): void {
    const index = this.profile.permissions.indexOf(permission);
    if (index !== -1) {
      this.profile.permissions.splice(index, 1);
      this.profile.updatedAt = new Date();
    }
  }

  /**
   * 检查角色
   */
  hasRole(role: string): boolean {
    return this.profile.role === role;
  }

  /**
   * 更新角色
   */
  updateRole(role: 'user' | 'vip' | 'admin'): void {
    this.profile.role = role;
    this.profile.updatedAt = new Date();
  }

  // ============= 数据序列化 =============

  /**
   * 转换为JSON对象
   */
  toJSON(): {
    profile: UserProfile;
    preferences?: UserPreferences;
    activeSessions: number;
  } {
    return {
      profile: { ...this.profile },
      preferences: { ...this.preferences } as UserPreferences,
      activeSessions: this.getActiveSessions().length
    };
  }

  /**
   * 转换为公开信息
   */
  toPublicJSON(): {
    id: string;
    displayName: string;
    avatar?: string;
    role: string;
    createdAt: Date;
    lastActiveAt?: Date;
  } {
    return {
      id: this.profile.id,
      displayName: this.profile.displayName,
      ...(this.profile.avatar && { avatar: this.profile.avatar }),
      role: this.profile.role,
      createdAt: this.profile.createdAt,
      ...(this.profile.lastActiveAt && { lastActiveAt: this.profile.lastActiveAt })
    };
  }

  /**
   * 从JSON创建用户实例
   */
  static fromJSON(data: {
    profile: UserProfile;
    preferences?: UserPreferences;
  }): User {
    return new User(data.profile, data.preferences);
  }
}

export default User;
