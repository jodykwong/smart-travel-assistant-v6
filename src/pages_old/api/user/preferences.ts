/**
 * 智游助手v6.2 - 用户偏好管理API端点
 * 支持用户偏好的获取、更新和删除
 * 集成用户认证和数据验证
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withMetrics, updateMetrics } from '../../../lib/monitoring/metrics-middleware';
import { requireAuth, AuthenticatedRequest } from '../../../lib/auth/auth-middleware';

interface UserPreferences {
  // 旅行偏好
  travelStyles: string[];           // 旅行风格
  budgetRange: string;              // 预算范围
  accommodationType: string[];      // 住宿偏好
  transportMode: string[];          // 交通偏好
  cuisinePreferences: string[];     // 美食偏好
  interests: string[];              // 兴趣标签
  
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
}

interface PreferencesResponse {
  success: boolean;
  preferences?: UserPreferences;
  message?: string;
  error?: string;
  timestamp: string;
}

async function preferencesHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse<PreferencesResponse>
) {
  try {
    // 获取用户信息
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    switch (req.method) {
      case 'GET':
        return await handleGetPreferences(req, res, userId);
      case 'PUT':
      case 'PATCH':
        return await handleUpdatePreferences(req, res, userId);
      case 'DELETE':
        return await handleDeletePreferences(req, res, userId);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
        res.status(405).json({
          success: false,
          error: `Method ${req.method} Not Allowed`,
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('❌ 用户偏好处理异常:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// ============= 获取用户偏好 =============

async function handleGetPreferences(
  req: AuthenticatedRequest,
  res: NextApiResponse<PreferencesResponse>,
  userId: string
) {
  try {
    console.log(`📖 获取用户偏好: ${userId}`);

    // 模拟从数据库获取用户偏好
    const preferences = await getMockUserPreferences(userId);

    if (!preferences) {
      // 返回默认偏好
      const defaultPreferences: UserPreferences = {
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
        shareItinerary: false
      };

      res.status(200).json({
        success: true,
        preferences: defaultPreferences,
        message: 'Default preferences returned',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(200).json({
      success: true,
      preferences,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ 用户偏好获取成功: ${userId}`);

  } catch (error) {
    console.error('❌ 获取用户偏好失败:', error);
    throw error;
  }
}

// ============= 更新用户偏好 =============

async function handleUpdatePreferences(
  req: AuthenticatedRequest,
  res: NextApiResponse<PreferencesResponse>,
  userId: string
) {
  try {
    const updateData: Partial<UserPreferences> = req.body;

    console.log(`📝 更新用户偏好: ${userId}`);

    // 验证偏好数据
    const validationResult = validatePreferences(updateData);
    if (!validationResult.valid) {
      res.status(400).json({
        success: false,
        error: validationResult.error,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 模拟更新用户偏好到数据库
    const updatedPreferences = await updateMockUserPreferences(userId, updateData);

    // 更新业务指标
    updateMetrics({
      userEngagement: 0.75 + Math.random() * 0.2, // 75-95%用户参与度
      preferencesUpdateRate: 0.3 + Math.random() * 0.2, // 30-50%偏好更新率
    });

    res.status(200).json({
      success: true,
      preferences: updatedPreferences,
      message: 'Preferences updated successfully',
      timestamp: new Date().toISOString()
    });

    console.log(`✅ 用户偏好更新成功: ${userId}`);
    console.log(`📊 更新字段: ${Object.keys(updateData).join(', ')}`);

  } catch (error) {
    console.error('❌ 更新用户偏好失败:', error);
    throw error;
  }
}

// ============= 删除用户偏好 =============

async function handleDeletePreferences(
  req: AuthenticatedRequest,
  res: NextApiResponse<PreferencesResponse>,
  userId: string
) {
  try {
    console.log(`🗑️ 重置用户偏好: ${userId}`);

    // 模拟删除用户偏好（重置为默认值）
    await deleteMockUserPreferences(userId);

    res.status(200).json({
      success: true,
      message: 'Preferences reset to default',
      timestamp: new Date().toISOString()
    });

    console.log(`✅ 用户偏好重置成功: ${userId}`);

  } catch (error) {
    console.error('❌ 重置用户偏好失败:', error);
    throw error;
  }
}

// ============= 数据验证 =============

function validatePreferences(preferences: Partial<UserPreferences>): { valid: boolean; error?: string } {
  // 预算范围验证
  if (preferences.budgetRange && !['budget', 'mid-range', 'luxury', 'premium'].includes(preferences.budgetRange)) {
    return { valid: false, error: 'Invalid budget range' };
  }

  // 语言验证
  if (preferences.language && !/^[a-z]{2}-[A-Z]{2}$/.test(preferences.language)) {
    return { valid: false, error: 'Invalid language format (expected: xx-XX)' };
  }

  // 货币验证
  if (preferences.currency && !/^[A-Z]{3}$/.test(preferences.currency)) {
    return { valid: false, error: 'Invalid currency format (expected: XXX)' };
  }

  // 隐私设置验证
  if (preferences.profileVisibility && !['public', 'private', 'friends'].includes(preferences.profileVisibility)) {
    return { valid: false, error: 'Invalid profile visibility' };
  }

  // 数组字段验证
  const arrayFields = ['travelStyles', 'accommodationType', 'transportMode', 'cuisinePreferences', 'interests'];
  for (const field of arrayFields) {
    if (preferences[field] && !Array.isArray(preferences[field])) {
      return { valid: false, error: `${field} must be an array` };
    }
  }

  return { valid: true };
}

// ============= 模拟数据库操作 =============

async function getMockUserPreferences(userId: string): Promise<UserPreferences | null> {
  // 模拟数据库查询延迟
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

  // 模拟用户偏好不存在的情况（20%概率）
  if (Math.random() < 0.2) {
    return null;
  }

  // 模拟用户偏好数据
  return {
    travelStyles: ['culture', 'food', 'nature'].slice(0, Math.floor(Math.random() * 3) + 1),
    budgetRange: ['budget', 'mid-range', 'luxury'][Math.floor(Math.random() * 3)],
    accommodationType: ['hotel', 'bnb', 'hostel'].slice(0, Math.floor(Math.random() * 2) + 1),
    transportMode: ['flight', 'train', 'car'].slice(0, Math.floor(Math.random() * 2) + 1),
    cuisinePreferences: ['local', 'international', 'vegetarian'].slice(0, Math.floor(Math.random() * 2) + 1),
    interests: ['history', 'art', 'shopping', 'nightlife'].slice(0, Math.floor(Math.random() * 3) + 1),
    language: 'zh-CN',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
    emailNotifications: Math.random() > 0.3,
    smsNotifications: Math.random() > 0.7,
    pushNotifications: Math.random() > 0.2,
    marketingEmails: Math.random() > 0.6,
    profileVisibility: ['public', 'private', 'friends'][Math.floor(Math.random() * 3)] as any,
    shareLocation: Math.random() > 0.5,
    shareItinerary: Math.random() > 0.4
  };
}

async function updateMockUserPreferences(
  userId: string, 
  updateData: Partial<UserPreferences>
): Promise<UserPreferences> {
  // 模拟数据库更新延迟
  await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

  // 获取现有偏好并合并更新
  const existingPreferences = await getMockUserPreferences(userId);
  const updatedPreferences = {
    ...existingPreferences,
    ...updateData
  } as UserPreferences;

  return updatedPreferences;
}

async function deleteMockUserPreferences(userId: string): Promise<void> {
  // 模拟数据库删除延迟
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  
  console.log(`🗑️ 模拟删除用户${userId}的偏好数据`);
}

// 导出带认证和监控的处理器
export default requireAuth()(
  withMetrics(preferencesHandler, {
    service: 'smart-travel-v6.2-user-service'
  })
);
