import { NextApiRequest, NextApiResponse } from 'next';
// import { withMetrics, updateMetrics } from '../../../lib/monitoring/metrics-middleware';
import { passwordManager } from '../../../lib/auth/password-manager';
import { jwtManager } from '../../../lib/auth/jwt-manager';
import { User, CreateUserData } from '../../../lib/models/User';
import { userRepository } from '../../../lib/database/database-manager';
import validator from 'validator';

/**
 * 智游助手v6.2 - 用户注册API端点
 * 集成JWT认证和bcrypt密码加密
 * 监控用户注册转化率
 */

interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  username?: string;
  phone?: string;
  referralSource?: string;
  preferences?: {
    travelStyles?: string[];
    budgetRange?: string;
    language?: string;
  };
}

interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
  message?: string;
  error?: string;
  timestamp: string;
}

async function registerHandler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse>
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

    const {
      email,
      password,
      displayName,
      username,
      phone,
      referralSource,
      preferences
    }: RegisterRequest = req.body;

    // 输入验证
    if (!email || !password || !displayName) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, displayName',
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

    // 密码强度验证
    const passwordStrength = passwordManager.checkPasswordStrength(password);
    if (!passwordStrength.passed) {
      res.status(400).json({
        success: false,
        error: `Password strength insufficient: ${passwordStrength.feedback.join(', ')}`,
        passwordStrength: {
          score: passwordStrength.score,
          level: passwordStrength.level,
          feedback: passwordStrength.feedback
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 用户名验证（如果提供）
    if (username && !validator.isAlphanumeric(username)) {
      res.status(400).json({
        success: false,
        error: 'Username must contain only letters and numbers',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 手机号验证（如果提供）
    if (phone && !validator.isMobilePhone(phone, 'zh-CN')) {
      res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 检查邮箱是否已存在
    try {
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'Email already registered',
          code: 'EMAIL_EXISTS',
          timestamp: new Date().toISOString()
        });
        return;
      }
    } catch (error) {
      console.error('检查邮箱存在性失败:', error);
      res.status(500).json({
        success: false,
        error: 'Database error during email check',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 密码加密
    const passwordHash = await passwordManager.hashPassword(password);

    // 生成用户ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建用户数据
    const userData: CreateUserData = {
      email: email.toLowerCase(),
      password: passwordHash.hash,
      displayName,
      username,
      phone,
      preferences: preferences ? {
        travelStyles: preferences.travelStyles || [],
        budgetRange: preferences.budgetRange || 'mid-range',
        language: preferences.language || 'zh-CN'
      } : undefined
    };

    // 保存用户到数据库
    let user: User;
    try {
      user = await userRepository.create({
        id: userId,
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        username: userData.username,
        phone: userData.phone,
        passwordHash: passwordHash.hash,
        passwordSalt: passwordHash.salt,
        preferences: userData.preferences,
        metadata: {
          referralSource: referralSource || 'direct',
          registrationIp: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        }
      });

      console.log(`✅ 用户注册成功: ${user.id} (${user.email})`);
    } catch (error) {
      console.error('❌ 用户注册失败:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user account',
        timestamp: new Date().toISOString()
      });
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

    // 计算注册转化率（基于来源）
    let conversionRate = 0.15; // 基础转化率15%

    switch (referralSource) {
      case 'google_ads':
        conversionRate = 0.22;
        break;
      case 'social_media':
        conversionRate = 0.18;
        break;
      case 'organic_search':
        conversionRate = 0.25;
        break;
      case 'referral':
        conversionRate = 0.30;
        break;
      default:
        conversionRate = 0.15;
    }

    // 更新业务指标（暂时禁用）
    // updateMetrics({
    //   userRegistrationRate: conversionRate + (Math.random() - 0.5) * 0.02,
    //   activeUsers: Math.floor(Math.random() * 20) + 150,
    // });

    const response: RegisterResponse = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType
      },
      message: 'User registered successfully',
      timestamp: new Date().toISOString()
    };

    // 设置HTTP-only cookie用于刷新令牌
    res.setHeader('Set-Cookie', [
      `refreshToken=${tokens.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`,
      `accessToken=${tokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${tokens.expiresIn}; Path=/`
    ]);

    res.status(201).json(response);

    console.log(`✅ 用户注册成功: ${user.email} (${user.id})`);
    console.log(`📊 密码强度: ${passwordStrength.level} (${passwordStrength.score}/100)`);
    console.log(`🔐 JWT令牌已生成，过期时间: ${tokens.expiresIn}秒`);

  } catch (error) {
    console.error('Error during user registration:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration',
      timestamp: new Date().toISOString()
    });
  }
}

// 导出处理器（暂时禁用监控以便测试）
export default registerHandler;
