/**
 * 智游助手v5.0 - 直接LLM测试API
 * 用于验证真实LLM调用，绕过数据库和会话管理
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// 统一响应格式
function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

function createErrorResponse(message: string, code: string, details?: any) {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

// 真实的LLM调用函数
async function callDeepSeekAPI(prompt: string, maxTokens: number = 4000): Promise<{
  response: string;
  tokensUsed: number;
  model: string;
}> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  console.log('🤖 调用DeepSeek API...');
  console.log('📝 Prompt长度:', prompt.length);
  console.log('🔑 API Key前缀:', apiKey.substring(0, 10) + '...');

  const requestBody = {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: '你是一个专业的旅行规划师，擅长为用户制定详细、实用的旅行计划。请根据用户需求生成具体的旅行规划，包含真实的地点名称、具体的时间安排和实用的建议。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
    stream: false,
  };

  console.log('📤 发送请求到:', `${apiUrl}/chat/completions`);

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log('📊 响应状态:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ DeepSeek API错误:', errorText);
    throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ DeepSeek API调用成功');
  console.log('📊 Token使用情况:', result.usage);

  const responseText = result.choices[0]?.message?.content || '';
  const tokensUsed = result.usage?.total_tokens || 0;

  return {
    response: responseText,
    tokensUsed,
    model: result.model || 'deepseek-chat',
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method not allowed', 'METHOD_NOT_ALLOWED'));
  }

  try {
    console.log('🚀 开始直接LLM测试...');

    const { destination = '新疆', preferences = {} } = req.body;

    // 构建详细的旅行规划提示
    const prompt = `请为以下旅行需求制定详细的旅行规划：

目的地：${destination}
出发日期：${preferences.startDate || '2025-08-01'}
返回日期：${preferences.endDate || '2025-08-13'}
旅行天数：${preferences.totalDays || 12}天
人数：${preferences.groupSize || 5}人
预算：${preferences.budget || 'mid-range'} (中等预算，约30000元)
旅行风格：${preferences.travelStyles?.join(', ') || '自然风光、美食体验、休闲观光'}
住宿偏好：${preferences.accommodation || 'hotel'} (酒店)
特殊要求：${preferences.specialRequirements || '5人团队，喜欢自然风光和美食体验'}

请生成一个详细的${preferences.totalDays || 12}天旅行规划，包括：

1. **行程概览**
   - 总体路线规划
   - 各区域停留时间分配
   - 最佳旅行季节建议

2. **每日详细行程**
   - 具体的景点名称和地址
   - 游览时间安排
   - 交通方式和路线
   - 用餐建议（具体餐厅名称）

3. **住宿推荐**
   - 每个城市的具体酒店推荐
   - 酒店特色和价格区间
   - 预订建议

4. **美食体验**
   - 当地特色美食介绍
   - 推荐餐厅和小吃店
   - 美食街和夜市推荐

5. **实用信息**
   - 交通指南（飞机、火车、自驾）
   - 天气和穿衣建议
   - 注意事项和安全提醒
   - 预算明细分解

6. **特色体验**
   - 当地文化活动
   - 特色购物推荐
   - 摄影打卡点

请确保规划具体、实用，包含真实的地点名称、详细的时间安排和实用的建议。避免使用模糊的描述，提供具体可执行的旅行计划。`;

    console.log('📝 生成的提示词长度:', prompt.length);

    // 调用真实的DeepSeek API
    const startTime = Date.now();
    const llmResult = await callDeepSeekAPI(prompt, 4000);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ LLM调用完成');
    console.log('⏱️ 调用耗时:', duration, 'ms');
    console.log('📊 响应长度:', llmResult.response.length);
    console.log('🎯 Token使用:', llmResult.tokensUsed);

    // 验证响应质量
    const responseQuality = {
      hasSpecificPlaces: /天山|喀纳斯|吐鲁番|乌鲁木齐|伊犁|阿勒泰/.test(llmResult.response),
      hasDetailedSchedule: /第\d+天|Day\s*\d+|上午|下午|晚上/.test(llmResult.response),
      hasRealRestaurants: /餐厅|饭店|美食|小吃/.test(llmResult.response),
      hasTransportInfo: /交通|飞机|火车|自驾|班车/.test(llmResult.response),
      hasAccommodation: /酒店|住宿|宾馆|民宿/.test(llmResult.response),
    };

    const qualityScore = Object.values(responseQuality).filter(Boolean).length;

    console.log('🎯 响应质量评估:', responseQuality);
    console.log('📊 质量得分:', `${qualityScore}/5`);

    // 返回详细的测试结果
    return res.status(200).json(createSuccessResponse({
      llmProvider: 'DeepSeek',
      model: llmResult.model,
      destination,
      prompt: {
        length: prompt.length,
        preview: prompt.substring(0, 200) + '...',
      },
      response: {
        content: llmResult.response,
        length: llmResult.response.length,
        preview: llmResult.response.substring(0, 500) + '...',
      },
      performance: {
        duration: `${duration}ms`,
        tokensUsed: llmResult.tokensUsed,
        tokensPerSecond: Math.round(llmResult.tokensUsed / (duration / 1000)),
      },
      quality: {
        score: qualityScore,
        maxScore: 5,
        details: responseQuality,
      },
      verification: {
        isRealLLM: true,
        hasSpecificContent: qualityScore >= 3,
        meetsRequirements: qualityScore >= 4,
      },
      timestamp: new Date().toISOString(),
    }, 'LLM直接调用测试成功'));

  } catch (error) {
    console.error('❌ LLM直接调用测试失败:', error);
    
    return res.status(500).json(createErrorResponse(
      'LLM direct call test failed',
      'LLM_TEST_ERROR',
      {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack?.split('\n').slice(0, 5) : undefined,
        apiKey: process.env.DEEPSEEK_API_KEY ? 'configured' : 'missing',
        timestamp: new Date().toISOString(),
      }
    ));
  }
}
