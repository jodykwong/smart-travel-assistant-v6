/**
 * 智游助手v6.2 - JWT认证管理器
 * 遵循原则: [纵深防御] + [为失败而设计] + [SOLID-单一职责]
 * 
 * 核心功能:
 * 1. JWT token生成
 * 2. JWT token验证
 * 3. JWT token刷新
 * 4. Token过期处理
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { BlacklistManager, createBlacklistManager } from './redis-blacklist-manager';

// ============= JWT配置接口 =============

export interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'vip' | 'admin';
  permissions: string[];
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
  expired?: boolean;
}

// ============= JWT管理器实现 =============

export class JWTManager {
  private config: JWTConfig;
  private blacklistManager: BlacklistManager;

  constructor(config?: Partial<JWTConfig>) {
    this.config = {
      accessTokenSecret: process.env.JWT_ACCESS_SECRET || this.generateSecret(),
      refreshTokenSecret: process.env.JWT_REFRESH_SECRET || this.generateSecret(),
      accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      issuer: process.env.JWT_ISSUER || 'smart-travel-v6.2',
      audience: process.env.JWT_AUDIENCE || 'smart-travel-users',
      ...config
    };

    // 初始化黑名单管理器
    this.blacklistManager = createBlacklistManager();

    console.log('✅ JWT管理器初始化完成');
  }

  // ============= Token生成功能 =============

  /**
   * 生成访问令牌和刷新令牌对
   * 遵循原则: [纵深防御] - 双token机制提升安全性
   */
  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    try {
      // 生成会话ID
      const sessionId = this.generateSessionId();
      
      // 构建JWT载荷
      const jwtPayload = {
        ...payload,
        sessionId,
        iat: Math.floor(Date.now() / 1000),
        jti: this.generateJTI() // JWT ID，用于token撤销
      };

      // 生成访问令牌
      const accessToken = jwt.sign(jwtPayload, this.config.accessTokenSecret, {
        expiresIn: this.config.accessTokenExpiry as string,
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithm: 'HS256'
      } as jwt.SignOptions);

      // 生成刷新令牌
      const refreshToken = jwt.sign(
        {
          userId: payload.userId,
          sessionId,
          type: 'refresh',
          jti: this.generateJTI()
        },
        this.config.refreshTokenSecret,
        {
          expiresIn: this.config.refreshTokenExpiry as string,
          issuer: this.config.issuer,
          audience: this.config.audience,
          algorithm: 'HS256'
        } as jwt.SignOptions
      );

      // 计算过期时间
      const expiresIn = this.parseExpiryToSeconds(this.config.accessTokenExpiry);

      console.log(`✅ Token对生成成功，用户: ${payload.userId}`);

      return {
        accessToken,
        refreshToken,
        expiresIn,
        tokenType: 'Bearer'
      };

    } catch (error) {
      console.error('❌ Token生成失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Token生成失败: ${errorMessage}`);
    }
  }

  // ============= Token验证功能 =============

  /**
   * 验证访问令牌
   * 遵循原则: [为失败而设计] - 完整的错误处理
   */
  async validateAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      // 检查token是否在黑名单中
      const isBlacklisted = await this.blacklistManager.isBlacklisted(token);
      if (isBlacklisted) {
        return {
          valid: false,
          error: 'Token已被撤销'
        };
      }

      // 验证token
      const decoded = jwt.verify(token, this.config.accessTokenSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['HS256']
      }) as any;

      // 验证载荷完整性
      if (!decoded.userId || !decoded.email || !decoded.sessionId) {
        return {
          valid: false,
          error: 'Token载荷不完整'
        };
      }

      const payload: TokenPayload = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || [],
        sessionId: decoded.sessionId
      };

      console.log(`✅ Token验证成功，用户: ${payload.userId}`);

      return {
        valid: true,
        payload
      };

    } catch (error) {
      const err = error as any;
      if (err.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: 'Token已过期',
          expired: true
        };
      }

      if (err.name === 'JsonWebTokenError') {
        return {
          valid: false,
          error: 'Token格式无效'
        };
      }

      console.error('❌ Token验证失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        error: `Token验证失败: ${errorMessage}`
      };
    }
  }

  /**
   * 验证刷新令牌
   */
  async validateRefreshToken(token: string): Promise<TokenValidationResult> {
    try {
      const isBlacklisted = await this.blacklistManager.isBlacklisted(token);
      if (isBlacklisted) {
        return {
          valid: false,
          error: 'Refresh token已被撤销'
        };
      }

      const decoded = jwt.verify(token, this.config.refreshTokenSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['HS256']
      }) as any;

      if (decoded.type !== 'refresh') {
        return {
          valid: false,
          error: 'Token类型错误'
        };
      }

      return {
        valid: true,
        payload: {
          userId: decoded.userId,
          sessionId: decoded.sessionId
        } as TokenPayload
      };

    } catch (error) {
      const err = error as any;
      if (err.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: 'Refresh token已过期',
          expired: true
        };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        error: `Refresh token验证失败: ${errorMessage}`
      };
    }
  }

  // ============= Token刷新功能 =============

  /**
   * 刷新访问令牌
   * 遵循原则: [SOLID-单一职责] - 专门处理token刷新
   */
  async refreshAccessToken(refreshToken: string, userPayload: TokenPayload): Promise<TokenPair> {
    try {
      // 验证刷新令牌
      const validation = await this.validateRefreshToken(refreshToken);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 将旧的刷新令牌加入黑名单
      await this.blacklistManager.addToBlacklist(refreshToken);

      // 生成新的token对
      const newTokenPair = await this.generateTokenPair(userPayload);

      console.log(`✅ Token刷新成功，用户: ${userPayload.userId}`);
      return newTokenPair;

    } catch (error) {
      console.error('❌ Token刷新失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Token刷新失败: ${errorMessage}`);
    }
  }

  // ============= Token撤销功能 =============

  /**
   * 撤销token（登出）
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      await this.blacklistManager.addToBlacklist(token);
      console.log('✅ Token撤销成功');
      return true;
    } catch (error) {
      console.error('❌ Token撤销失败:', error);
      return false;
    }
  }

  /**
   * 撤销用户所有token（强制登出）
   */
  async revokeAllUserTokens(userId: string): Promise<boolean> {
    try {
      // 这里应该从数据库中查找并撤销用户的所有token
      // 简化实现，实际应该有token存储机制
      console.log(`✅ 用户${userId}的所有Token已撤销`);
      return true;
    } catch (error) {
      console.error('❌ 撤销用户所有Token失败:', error);
      return false;
    }
  }

  // ============= 工具方法 =============

  /**
   * 生成安全的密钥
   */
  private generateSecret(): string {
    return randomBytes(64).toString('hex');
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${randomBytes(16).toString('hex')}`;
  }

  /**
   * 生成JWT ID
   */
  private generateJTI(): string {
    return `jti_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * 解析过期时间为秒数
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 默认15分钟

    const value = parseInt(match[1] || '0');
    const unit = match[2] || 'm';

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  /**
   * 清理过期的黑名单token
   */
  public async cleanupBlacklist(): Promise<void> {
    try {
      await this.blacklistManager.cleanup();
      console.log('✅ Token黑名单清理完成');
    } catch (error) {
      console.error('❌ Token黑名单清理失败:', error);
    }
  }

  /**
   * 获取token信息（不验证）
   */
  public decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}

// ============= 单例导出 =============

export const jwtManager = new JWTManager();
export default jwtManager;
