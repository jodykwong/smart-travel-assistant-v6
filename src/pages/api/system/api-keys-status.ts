/**
 * 智游助手v6.5 - API密钥状态检查端点
 * 用于诊断API密钥配置问题
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getApiKeyStatus, generateApiKeyGuide, validateAllApiKeys } from '@/lib/api-key-validator';

interface ApiKeyStatusResponse {
  success: boolean;
  data?: {
    status: any;
    guide: string;
    validation?: any;
  };
  error?: {
    message: string;
    code: string;
  };
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiKeyStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      },
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('🔍 检查API密钥状态...');

    // 获取基本状态
    const status = getApiKeyStatus();
    const guide = generateApiKeyGuide();

    // 如果请求包含validate参数，执行完整验证
    let validation = null;
    if (req.query.validate === 'true') {
      console.log('🧪 执行API密钥验证...');
      try {
        validation = await validateAllApiKeys();
      } catch (error) {
        console.error('❌ API密钥验证失败:', error);
        validation = {
          allValid: false,
          error: error.message
        };
      }
    }

    console.log('✅ API密钥状态检查完成:', {
      deepseekConfigured: status.deepseek.configured,
      amapConfigured: status.amap.configured,
      siliconflowConfigured: status.siliconflow.configured,
      validationRequested: !!validation
    });

    return res.status(200).json({
      success: true,
      data: {
        status,
        guide,
        validation
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ API密钥状态检查失败:', error);

    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to check API keys status',
        code: 'INTERNAL_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
}
