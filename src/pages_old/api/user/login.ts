/**
 * 智游助手v6.2 - 用户登录API端点
 * 集成JWT认证和bcrypt密码验证
 * 支持防暴力破解机制
 */

import { NextApiRequest, NextApiResponse } from 'next';
// import { withMetrics, updateMetrics } from '../../../lib/monitoring/metrics-middleware';
import { passwordManager } from '../../../lib/auth/password-manager';
import { jwtManager } from '../../../lib/auth/jwt-manager';
import { userRepository } from '../../../lib/database/database-manager';
import validator from 'validator';

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    type: string;
    name: string;
    userAgent: string;
  };
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    emailVerified: boolean;
    lastLoginAt: Date;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
  message?: string;
  error?: string;
  lockInfo?: {
    attempts: number;
    lockedUntil?: Date;
  };
  timestamp: string;
}

async function loginHandler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  try {
    // 只允许POST请求
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      res.status(405).json({
        success: false,
        error: `Method ${req.method} Not Allowed`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { email, password, rememberMe, deviceInfo }: LoginRequest = req.body;

    // 输入验证
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 邮箱格式验证
    if (!validator.isEmail(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 获取客户端IP（用于安全日志）
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    console.log(`🔐 登录尝试: ${email} from ${clientIp}`);

    // 从数据库获取用户信息
    let user;
    try {
      user = await userRepository.findByEmail(email);



      if (!user) {
        // 用户不存在，但不要泄露这个信息
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          timestamp: new Date().toISOString()
        });
        return;
      }
    } catch (error) {
      console.error('❌ 查询用户失败:', error);
      res.status(500).json({
        success: false,
        error: 'Database error during login',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 检查用户状态
    if (user.status !== 'active') {
      let errorMessage = 'Account is not active';
      if (user.status === 'suspended') {
        errorMessage = 'Account has been suspended';
      } else if (user.status === 'deleted') {
        errorMessage = 'Account not found';
      }

      res.status(403).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 验证密码
    const passwordValidation = await passwordManager.verifyPassword(
      password,
      user.passwordHash,
      user.id
    );

    if (!passwordValidation.valid) {
      const response: LoginResponse = {
        success: false,
        error: passwordValidation.error || 'Invalid email or password',
        timestamp: new Date().toISOString()
      };

      // 如果有锁定信息，包含在响应中
      if (passwordValidation.attempts || passwordValidation.lockedUntil) {
        response.lockInfo = {
          attempts: passwordValidation.attempts || 0,
          lockedUntil: passwordValidation.lockedUntil
        };
      }

      const statusCode = passwordValidation.lockedUntil ? 423 : 401; // 423 Locked
      res.status(statusCode).json(response);
      return;
    }

    // 生成JWT令牌
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const tokens = await jwtManager.generateTokenPair(tokenPayload);

    // 更新用户登录信息
    try {
      await userRepository.updateLoginInfo(user.id, {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
        loginCount: user.loginCount + 1,
        lastActiveAt: new Date(),
        failedLoginAttempts: 0 // 重置失败次数
      });
    } catch (error) {
      console.error('❌ 更新登录信息失败:', error);
      // 不影响登录流程，继续执行
    }

    // 更新业务指标（暂时禁用）
    // updateMetrics({
    //   userLoginRate: 0.85 + (Math.random() - 0.5) * 0.1, // 85%左右的登录成功率
    //   activeUsers: Math.floor(Math.random() * 30) + 200,
    // });

    const response: LoginResponse = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        emailVerified: user.emailVerified,
        lastLoginAt: new Date()
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType
      },
      message: 'Login successful',
      timestamp: new Date().toISOString()
    };

    // 设置Cookie
    const cookieOptions = rememberMe 
      ? `Max-Age=${30 * 24 * 60 * 60}` // 30天
      : `Max-Age=${tokens.expiresIn}`; // 访问令牌过期时间

    res.setHeader('Set-Cookie', [
      `refreshToken=${tokens.refreshToken}; HttpOnly; Secure; SameSite=Strict; ${cookieOptions}; Path=/`,
      `accessToken=${tokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${tokens.expiresIn}; Path=/`
    ]);

    res.status(200).json(response);

    console.log(`✅ 用户登录成功: ${user.email} (${user.id})`);
    console.log(`🔐 JWT令牌已生成，过期时间: ${tokens.expiresIn}秒`);
    console.log(`📱 设备信息: ${JSON.stringify(deviceInfo || { userAgent })}`);

  } catch (error) {
    console.error('❌ 登录处理异常:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during login',
      timestamp: new Date().toISOString()
    });
  }
}

// 模拟用户数据获取函数已移除，现在使用真实数据库查询

// 导出处理器（暂时禁用监控以便测试）
export default loginHandler;
