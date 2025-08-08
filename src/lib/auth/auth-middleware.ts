/**
 * 智游助手v6.2 - 认证中间件
 * 遵循原则: [纵深防御] + [为失败而设计] + [SOLID-单一职责]
 * 
 * 核心功能:
 * 1. 路由保护
 * 2. 用户身份验证
 * 3. 权限检查
 * 4. 会话管理
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { jwtManager, TokenPayload } from './jwt-manager';

// ============= 中间件接口定义 =============

export interface AuthenticatedRequest extends NextApiRequest {
  user?: TokenPayload;
  sessionId?: string;
  isAuthenticated: boolean;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
  skipPaths?: string[];
}

export interface AuthResult {
  success: boolean;
  user?: TokenPayload | undefined;
  error?: string;
  statusCode?: number;
}

// ============= 认证中间件实现 =============

export class AuthMiddleware {
  private skipPaths: Set<string> = new Set([
    '/api/health',
    '/api/user/register',
    '/api/user/login',
    '/api/travel-data',
    '/api/intelligent-default-data'
  ]);

  constructor() {
    console.log('✅ 认证中间件初始化完成');
  }

  // ============= 主要中间件函数 =============

  /**
   * 认证中间件包装器
   * 遵循原则: [为失败而设计] - 完整的错误处理和降级
   */
  public withAuth(
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
    options: AuthMiddlewareOptions = {}
  ) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // 检查是否跳过认证
        if (this.shouldSkipAuth(req.url || '', options.skipPaths)) {
          const authenticatedReq = req as AuthenticatedRequest;
          authenticatedReq.isAuthenticated = false;
          return await handler(authenticatedReq, res);
        }

        // 执行认证
        const authResult = await this.authenticate(req);

        // 认证失败处理
        if (!authResult.success) {
          if (options.required !== false) {
            return res.status(authResult.statusCode || 401).json({
              success: false,
              error: authResult.error || '认证失败',
              code: 'AUTHENTICATION_FAILED',
              timestamp: new Date().toISOString()
            });
          }
        }

        // 权限检查
        if (authResult.success && authResult.user) {
          const permissionResult = this.checkPermissions(authResult.user, options);
          if (!permissionResult.success) {
            return res.status(403).json({
              success: false,
              error: permissionResult.error || '权限不足',
              code: 'INSUFFICIENT_PERMISSIONS',
              timestamp: new Date().toISOString()
            });
          }
        }

        // 设置认证信息到请求对象
        const authenticatedReq = req as AuthenticatedRequest;
        if (authResult.user) {
          authenticatedReq.user = authResult.user;
          if (authResult.user.sessionId) {
            authenticatedReq.sessionId = authResult.user.sessionId;
          }
        }
        authenticatedReq.isAuthenticated = authResult.success;

        // 调用原始处理器
        return await handler(authenticatedReq, res);

      } catch (error) {
        console.error('❌ 认证中间件异常:', error);
        return res.status(500).json({
          success: false,
          error: '服务器内部错误',
          code: 'INTERNAL_SERVER_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  // ============= 认证功能 =============

  /**
   * 执行用户认证
   * 遵循原则: [纵深防御] - 多层验证机制
   */
  private async authenticate(req: NextApiRequest): Promise<AuthResult> {
    try {
      // 提取token
      const token = this.extractToken(req);
      if (!token) {
        return {
          success: false,
          error: '缺少认证令牌',
          statusCode: 401
        };
      }

      // 验证token
      const validation = await jwtManager.validateAccessToken(token);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Token验证失败',
          statusCode: validation.expired ? 401 : 403
        };
      }

      // 额外的会话验证
      if (validation.payload) {
        const sessionValid = await this.validateSession(validation.payload.sessionId);
        if (!sessionValid) {
          return {
            success: false,
            error: '会话已失效',
            statusCode: 401
          };
        }
      }

      console.log(`✅ 用户认证成功: ${validation.payload?.userId}`);

      return {
        success: true,
        user: validation.payload || undefined
      };

    } catch (error) {
      console.error('❌ 认证过程异常:', error);
      return {
        success: false,
        error: '认证过程异常',
        statusCode: 500
      };
    }
  }

  /**
   * 提取认证令牌
   */
  private extractToken(req: NextApiRequest): string | null {
    // 从Authorization头提取
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 从Cookie提取
    const cookieToken = req.cookies.accessToken;
    if (cookieToken) {
      return cookieToken;
    }

    // 从查询参数提取（不推荐，仅用于特殊情况）
    const queryToken = req.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  // ============= 权限检查功能 =============

  /**
   * 检查用户权限
   * 遵循原则: [SOLID-单一职责] - 专门处理权限验证
   */
  private checkPermissions(user: TokenPayload, options: AuthMiddlewareOptions): AuthResult {
    try {
      // 角色检查
      if (options.roles && options.roles.length > 0) {
        if (!options.roles.includes(user.role)) {
          return {
            success: false,
            error: `需要以下角色之一: ${options.roles.join(', ')}`,
            statusCode: 403
          };
        }
      }

      // 权限检查
      if (options.permissions && options.permissions.length > 0) {
        const hasPermission = options.permissions.some(permission => 
          user.permissions.includes(permission)
        );

        if (!hasPermission) {
          return {
            success: false,
            error: `需要以下权限之一: ${options.permissions.join(', ')}`,
            statusCode: 403
          };
        }
      }

      return { success: true };

    } catch (error) {
      console.error('❌ 权限检查异常:', error);
      return {
        success: false,
        error: '权限检查异常',
        statusCode: 500
      };
    }
  }

  // ============= 会话管理功能 =============

  /**
   * 验证会话有效性
   */
  private async validateSession(sessionId: string): Promise<boolean> {
    try {
      // 这里应该从数据库或缓存中验证会话
      // 简化实现，实际应该检查会话是否存在且未过期
      if (!sessionId || sessionId.length < 10) {
        return false;
      }

      // 模拟会话验证
      return true;

    } catch (error) {
      console.error('❌ 会话验证异常:', error);
      return false;
    }
  }

  // ============= 工具方法 =============

  /**
   * 检查是否应该跳过认证
   */
  private shouldSkipAuth(path: string, additionalSkipPaths?: string[]): boolean {
    // 检查默认跳过路径
    if (this.skipPaths.has(path)) {
      return true;
    }

    // 检查额外跳过路径
    if (additionalSkipPaths) {
      for (const skipPath of additionalSkipPaths) {
        if (path.startsWith(skipPath)) {
          return true;
        }
      }
    }

    // 检查静态资源
    if (path.startsWith('/_next/') || path.startsWith('/static/')) {
      return true;
    }

    return false;
  }

  /**
   * 添加跳过路径
   */
  public addSkipPath(path: string): void {
    this.skipPaths.add(path);
  }

  /**
   * 移除跳过路径
   */
  public removeSkipPath(path: string): void {
    this.skipPaths.delete(path);
  }
}

// ============= 便捷函数 =============

/**
 * 创建认证中间件实例
 */
export const authMiddleware = new AuthMiddleware();

/**
 * 便捷的认证装饰器
 */
export function requireAuth(options: AuthMiddlewareOptions = { required: true }) {
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
    return authMiddleware.withAuth(handler, options);
  };
}

/**
 * 可选认证装饰器
 */
export function optionalAuth(options: AuthMiddlewareOptions = { required: false }) {
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
    return authMiddleware.withAuth(handler, options);
  };
}

/**
 * 角色检查装饰器
 */
export function requireRole(roles: string | string[]) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
    return authMiddleware.withAuth(handler, { required: true, roles: roleArray });
  };
}

/**
 * 权限检查装饰器
 */
export function requirePermission(permissions: string | string[]) {
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
    return authMiddleware.withAuth(handler, { required: true, permissions: permissionArray });
  };
}

export default authMiddleware;
