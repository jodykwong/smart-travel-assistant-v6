/**
 * 智游助手v6.2 - 用户管理MCP客户端
 * 遵循原则: [SOLID-单一职责] + [纵深防御] + [API优先设计]
 * 
 * 核心功能:
 * 1. 微信登录集成
 * 2. 用户权限管理
 * 3. 会话管理
 * 4. 用户偏好存储
 */

import { BaseMCPClient, MCPRequest, MCPResponse } from '../mcp/base-mcp-client';

// ============= 用户管理接口定义 =============

export interface UserProfile {
  id: string;
  openId?: string;          // 微信OpenID
  unionId?: string;         // 微信UnionID
  phone?: string;           // 手机号
  nickname: string;         // 用户昵称
  avatar?: string;          // 头像URL
  email?: string;           // 邮箱
  
  // 用户偏好
  preferences: {
    travelStyles: string[];     // 旅行风格偏好
    budgetRange: string;        // 预算范围
    accommodationType: string;  // 住宿偏好
    transportMode: string;      // 交通偏好
    cuisinePreferences: string[]; // 美食偏好
    interests: string[];        // 兴趣标签
  };
  
  // 系统信息
  status: 'active' | 'inactive' | 'suspended';
  role: 'user' | 'vip' | 'admin';
  createdAt: Date;
  lastLoginAt: Date;
  loginCount: number;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  deviceInfo: {
    platform: string;
    userAgent: string;
    ip: string;
  };
}

export interface WeChatAuthResponse {
  success: boolean;
  data?: {
    openId: string;
    unionId?: string;
    nickname: string;
    avatar: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
}

// ============= 用户管理MCP客户端实现 =============

export class UserManagementMCPClient extends BaseMCPClient {
  private readonly sessionCache: Map<string, UserSession> = new Map();

  constructor(llmApiKey: string, options: any = {}) {
    super({
      apiKey: llmApiKey,
      timeout: options.timeout || 30000,
      retries: options.retries || 3
    });
    console.log('用户管理MCP客户端初始化完成');
  }

  /**
   * 实现基类的抽象方法
   */
  protected async executeRequest<T>(request: MCPRequest): Promise<MCPResponse<T>> {
    // 模拟MCP请求执行
    try {
      // 这里应该是实际的MCP协议通信
      // 当前返回模拟响应
      return {
        success: true,
        data: {} as T,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  // ============= 微信登录集成 =============

  /**
   * 微信登录认证
   * 遵循原则: [纵深防御] - 多层安全验证
   */
  async authenticateWithWeChat(authCode: string, deviceInfo: any): Promise<UserSession> {
    const request: MCPRequest = {
      method: 'wechat_auth_login',
      params: {
        auth_code: authCode,
        device_info: deviceInfo,
        security_level: 'high',
        include_user_info: true,
        context: '微信登录认证，获取用户基本信息和访问令牌'
      }
    };

    const response = await this.sendRequest<WeChatAuthResponse>(request);
    
    if (!response.success || !response.data) {
      throw new Error(`微信登录失败: ${response.error}`);
    }

    // 创建用户会话
    const session = await this.createUserSession(response.data, deviceInfo);
    
    // 缓存会话信息
    this.sessionCache.set(session.sessionId, session);
    
    console.log(`✅ 微信登录成功，用户: ${response.data?.data?.nickname || '未知用户'}`);
    return session;
  }

  /**
   * 手机号登录
   * 遵循原则: [为失败而设计] - 多种登录方式备选
   */
  async authenticateWithPhone(phone: string, verificationCode: string): Promise<UserSession> {
    const request: MCPRequest = {
      method: 'phone_auth_login',
      params: {
        phone_number: phone,
        verification_code: verificationCode,
        code_type: 'login',
        expire_minutes: 5,
        context: '手机号验证码登录'
      }
    };

    const response = await this.sendRequest<any>(request);
    
    if (!response.success) {
      throw new Error(`手机号登录失败: ${response.error}`);
    }

    const session = await this.createPhoneUserSession(phone, response.data);
    this.sessionCache.set(session.sessionId, session);
    
    console.log(`✅ 手机号登录成功: ${phone}`);
    return session;
  }

  /**
   * 游客模式登录
   * 遵循原则: [YAGNI] - 简单实用的功能
   */
  async authenticateAsGuest(deviceInfo: any): Promise<UserSession> {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: UserSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: guestId,
      accessToken: `guest_token_${Date.now()}`,
      refreshToken: '',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时
      deviceInfo
    };

    this.sessionCache.set(session.sessionId, session);
    
    console.log(`✅ 游客登录成功: ${guestId}`);
    return session;
  }

  // ============= 用户管理功能 =============

  /**
   * 获取用户资料
   * 遵循原则: [SOLID-单一职责] - 专门处理用户数据
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const request: MCPRequest = {
      method: 'user_get_profile',
      params: {
        user_id: userId,
        include_preferences: true,
        include_statistics: true,
        context: '获取用户完整资料信息'
      }
    };

    const response = await this.sendRequest<any>(request);
    
    if (!response.success) {
      throw new Error(`获取用户资料失败: ${response.error}`);
    }

    return this.transformToUserProfile(response.data);
  }

  /**
   * 更新用户偏好
   * 遵循原则: [API优先设计] - 清晰的接口定义
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserProfile['preferences']>): Promise<boolean> {
    const request: MCPRequest = {
      method: 'user_update_preferences',
      params: {
        user_id: userId,
        preferences: preferences,
        update_timestamp: new Date().toISOString(),
        context: '更新用户旅行偏好设置'
      }
    };

    const response = await this.sendRequest<any>(request);
    
    if (!response.success) {
      console.error(`更新用户偏好失败: ${response.error}`);
      return false;
    }

    console.log(`✅ 用户偏好更新成功: ${userId}`);
    return true;
  }

  /**
   * 用户会话验证
   * 遵循原则: [纵深防御] - 多层会话安全验证
   */
  async validateSession(sessionId: string): Promise<UserSession | null> {
    // 首先检查本地缓存
    const cachedSession = this.sessionCache.get(sessionId);
    if (cachedSession && cachedSession.expiresAt > new Date()) {
      return cachedSession;
    }

    // 远程验证
    const request: MCPRequest = {
      method: 'user_validate_session',
      params: {
        session_id: sessionId,
        check_expiry: true,
        update_last_active: true,
        context: '验证用户会话有效性'
      }
    };

    const response = await this.sendRequest<any>(request);
    
    if (!response.success || !response.data) {
      // 清理无效会话
      this.sessionCache.delete(sessionId);
      return null;
    }

    const session = this.transformToUserSession(response.data);
    this.sessionCache.set(sessionId, session);
    
    return session;
  }

  /**
   * 用户登出
   */
  async logout(sessionId: string): Promise<boolean> {
    const request: MCPRequest = {
      method: 'user_logout',
      params: {
        session_id: sessionId,
        revoke_tokens: true,
        context: '用户登出，撤销访问令牌'
      }
    };

    const response = await this.sendRequest<any>(request);
    
    // 清理本地缓存
    this.sessionCache.delete(sessionId);
    
    console.log(`✅ 用户登出成功: ${sessionId}`);
    return response.success;
  }

  // ============= 私有辅助方法 =============

  private async createUserSession(wechatData: any, deviceInfo: any): Promise<UserSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      sessionId,
      userId: wechatData.openId,
      accessToken: wechatData.accessToken,
      refreshToken: wechatData.refreshToken,
      expiresAt: new Date(Date.now() + wechatData.expiresIn * 1000),
      deviceInfo
    };
  }

  private async createPhoneUserSession(phone: string, authData: any): Promise<UserSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      sessionId,
      userId: authData.userId || `phone_${phone}`,
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天
      deviceInfo: authData.deviceInfo
    };
  }

  private transformToUserProfile(data: any): UserProfile {
    return {
      id: data.id,
      openId: data.open_id,
      unionId: data.union_id,
      phone: data.phone,
      nickname: data.nickname || '用户',
      avatar: data.avatar,
      email: data.email,
      preferences: {
        travelStyles: data.preferences?.travel_styles || [],
        budgetRange: data.preferences?.budget_range || 'medium',
        accommodationType: data.preferences?.accommodation_type || 'hotel',
        transportMode: data.preferences?.transport_mode || 'mixed',
        cuisinePreferences: data.preferences?.cuisine_preferences || [],
        interests: data.preferences?.interests || []
      },
      status: data.status || 'active',
      role: data.role || 'user',
      createdAt: new Date(data.created_at),
      lastLoginAt: new Date(data.last_login_at),
      loginCount: data.login_count || 0
    };
  }

  private transformToUserSession(data: any): UserSession {
    return {
      sessionId: data.session_id,
      userId: data.user_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
      deviceInfo: data.device_info
    };
  }

  // ============= 会话管理 =============

  /**
   * 清理过期会话
   * 遵循原则: [KISS] - 简单有效的清理机制
   */
  public cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    this.sessionCache.forEach((session, sessionId) => {
      if (session.expiresAt <= now) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      this.sessionCache.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`🧹 清理了 ${expiredSessions.length} 个过期会话`);
    }
  }

  /**
   * 获取活跃会话统计
   */
  public getActiveSessionStats(): { total: number; byRole: Record<string, number> } {
    const now = new Date();
    let total = 0;
    const byRole: Record<string, number> = {};

    this.sessionCache.forEach(session => {
      if (session.expiresAt > now) {
        total++;
        // 这里可以根据userId获取用户角色，简化处理
        const role = session.userId.startsWith('guest_') ? 'guest' : 'user';
        byRole[role] = (byRole[role] || 0) + 1;
      }
    });

    return { total, byRole };
  }
}

export default UserManagementMCPClient;
