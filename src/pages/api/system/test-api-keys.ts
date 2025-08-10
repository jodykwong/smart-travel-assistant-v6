/**
 * 智游助手v6.5 - API密钥测试端点
 * 实际测试API密钥的有效性
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface ApiTestResult {
  service: string;
  configured: boolean;
  valid: boolean;
  error?: string;
  details?: any;
}

interface ApiTestResponse {
  success: boolean;
  data?: {
    results: ApiTestResult[];
    summary: {
      total: number;
      configured: number;
      valid: number;
      invalid: number;
    };
  };
  error?: {
    message: string;
    code: string;
  };
  timestamp: string;
}

async function testDeepSeekAPI(apiKey: string): Promise<ApiTestResult> {
  if (!apiKey || apiKey === 'sk-your-deepseek-api-key-here') {
    return {
      service: 'DeepSeek',
      configured: false,
      valid: false,
      error: 'API密钥未配置'
    };
  }

  try {
    console.log('🧪 测试DeepSeek API...');
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.ok) {
      const data = await response.json();
      return {
        service: 'DeepSeek',
        configured: true,
        valid: true,
        details: {
          status: response.status,
          models: data.data?.length || 0
        }
      };
    } else {
      const errorText = await response.text();
      return {
        service: 'DeepSeek',
        configured: true,
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: { errorText }
      };
    }
  } catch (error) {
    return {
      service: 'DeepSeek',
      configured: true,
      valid: false,
      error: `网络错误: ${error.message}`
    };
  }
}

async function testSiliconFlowAPI(apiKey: string): Promise<ApiTestResult> {
  if (!apiKey || apiKey === 'your-siliconflow-api-key-here') {
    return {
      service: 'SiliconFlow',
      configured: false,
      valid: false,
      error: 'API密钥未配置'
    };
  }

  try {
    console.log('🧪 测试SiliconFlow API...');
    const response = await fetch('https://api.siliconflow.cn/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.ok) {
      const data = await response.json();
      return {
        service: 'SiliconFlow',
        configured: true,
        valid: true,
        details: {
          status: response.status,
          models: data.data?.length || 0
        }
      };
    } else {
      const errorText = await response.text();
      return {
        service: 'SiliconFlow',
        configured: true,
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: { errorText }
      };
    }
  } catch (error) {
    return {
      service: 'SiliconFlow',
      configured: true,
      valid: false,
      error: `网络错误: ${error.message}`
    };
  }
}

async function testAmapAPI(apiKey: string): Promise<ApiTestResult> {
  if (!apiKey || apiKey === 'your-amap-api-key-here') {
    return {
      service: 'Amap',
      configured: false,
      valid: false,
      error: 'API密钥未配置'
    };
  }

  try {
    console.log('🧪 测试高德地图API...');
    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?address=北京市&key=${apiKey}`,
      {
        method: 'GET',
        timeout: 10000
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.status === '1') {
        return {
          service: 'Amap',
          configured: true,
          valid: true,
          details: {
            status: data.status,
            info: data.info
          }
        };
      } else {
        return {
          service: 'Amap',
          configured: true,
          valid: false,
          error: `API返回错误: ${data.info}`,
          details: data
        };
      }
    } else {
      return {
        service: 'Amap',
        configured: true,
        valid: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      service: 'Amap',
      configured: true,
      valid: false,
      error: `网络错误: ${error.message}`
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiTestResponse>
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
    console.log('🔬 开始API密钥有效性测试...');

    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const siliconflowKey = process.env.SILICONFLOW_API_KEY;
    const amapKey = process.env.AMAP_MCP_API_KEY;

    // 并行测试所有API
    const [deepseekResult, siliconflowResult, amapResult] = await Promise.all([
      testDeepSeekAPI(deepseekKey),
      testSiliconFlowAPI(siliconflowKey),
      testAmapAPI(amapKey)
    ]);

    const results = [deepseekResult, siliconflowResult, amapResult];
    
    const summary = {
      total: results.length,
      configured: results.filter(r => r.configured).length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => r.configured && !r.valid).length
    };

    console.log('✅ API密钥测试完成:', summary);

    return res.status(200).json({
      success: true,
      data: {
        results,
        summary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ API密钥测试失败:', error);

    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to test API keys',
        code: 'INTERNAL_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
}
