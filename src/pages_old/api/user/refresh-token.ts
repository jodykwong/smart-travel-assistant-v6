/**
 * 智游助手v6.2 - JWT令牌刷新API端点
 * 实现安全的令牌刷新机制
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withMetrics } from '../../../lib/monitoring/metrics-middleware';
import { jwtManager } from '../../../lib/auth/jwt-manager';

interface RefreshTokenRequest {
  refreshToken?: string; // 可选，优先从body获取，其次从cookie
}

interface RefreshTokenResponse {
  success: boolean;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
  error?: string;
  timestamp: string;
}

async function refreshTokenHandler(
  req: NextApiRequest,
  res: NextApiResponse<RefreshTokenResponse>
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

    // 获取刷新令牌（优先从body，其次从cookie）
    const { refreshToken: bodyRefreshToken }: RefreshTokenRequest = req.body;
    const cookieRefreshToken = req.cookies.refreshToken;
    
    const refreshToken = bodyRefreshToken || cookieRefreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('🔄 令牌刷新请求');

    // 验证刷新令牌
    const validation = await jwtManager.validateRefreshToken(refreshToken);
    
    if (!validation.valid) {
      // 清除无效的cookie
      res.setHeader('Set-Cookie', [
        'refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
        'accessToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
      ]);

      const statusCode = validation.expired ? 401 : 403;
      res.status(statusCode).json({
        success: false,
        error: validation.error || 'Invalid refresh token',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 获取用户信息（模拟从数据库查询）
    const userPayload = await getUserPayloadFromRefreshToken(validation.payload!);
    
    if (!userPayload) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 生成新的令牌对
    const newTokens = await jwtManager.refreshAccessToken(refreshToken, userPayload);

    const response: RefreshTokenResponse = {
      success: true,
      tokens: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: newTokens.expiresIn,
        tokenType: newTokens.tokenType
      },
      timestamp: new Date().toISOString()
    };

    // 设置新的cookie
    res.setHeader('Set-Cookie', [
      `refreshToken=${newTokens.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`,
      `accessToken=${newTokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=${newTokens.expiresIn}; Path=/`
    ]);

    res.status(200).json(response);

    console.log(`✅ 令牌刷新成功: ${userPayload.userId}`);
    console.log(`🔐 新令牌过期时间: ${newTokens.expiresIn}秒`);

  } catch (error) {
    console.error('❌ 令牌刷新异常:', error);
    
    // 清除可能有问题的cookie
    res.setHeader('Set-Cookie', [
      'refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
      'accessToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    ]);

    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh',
      timestamp: new Date().toISOString()
    });
  }
}

// 从刷新令牌获取用户载荷（模拟数据库查询）
async function getUserPayloadFromRefreshToken(tokenPayload: any) {
  try {
    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20));

    const userId = tokenPayload.userId;
    
    if (!userId) {
      return null;
    }

    // 模拟用户不存在或已停用的情况（5%概率）
    if (Math.random() < 0.05) {
      return null;
    }

    // 模拟用户数据
    return {
      userId: userId,
      email: `user${userId.split('_')[1]}@example.com`,
      role: Math.random() > 0.95 ? 'admin' : (Math.random() > 0.8 ? 'vip' : 'user') as const,
      permissions: ['user:read', 'user:update', 'travel:create'],
      sessionId: tokenPayload.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

  } catch (error) {
    console.error('❌ 获取用户载荷失败:', error);
    return null;
  }
}

// 导出带监控的处理器
export default withMetrics(refreshTokenHandler, {
  service: 'smart-travel-v6.2-auth-service'
});
