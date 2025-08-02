/**
 * 智游助手v5.0 - 规划启动API
 * 启动真实的LLM旅行规划流程
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionManager } from '@/lib/database/session-manager';
import { getDeepSeekCacheService } from '@/lib/cache/deepseek-cache-service';
import { getAmapCacheService } from '@/lib/cache/amap-cache-service';

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

interface StartPlanningRequest {
  options?: {
    priority?: 'speed' | 'quality' | 'balanced';
    maxTokens?: number;
  };
}

// 真实的LLM调用函数（带缓存和重试机制）
async function callDeepSeekAPI(prompt: string, maxTokens: number = 4000, retryCount: number = 0, useCache: boolean = true): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避：1s, 2s, 4s

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  // 构建请求对象
  const request = {
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: maxTokens,
    temperature: 0.3, // 较低的温度以获得更一致的结果，适合缓存
  };

  // 尝试使用缓存
  if (useCache) {
    try {
      const cacheService = getDeepSeekCacheService();
      const cachedResponse = await cacheService.smartCache(request);

      if (cachedResponse && cachedResponse.choices && cachedResponse.choices[0]) {
        console.log('🎯 缓存命中，跳过API调用');
        return cachedResponse.choices[0].message.content;
      }
    } catch (cacheError) {
      console.warn('⚠️ 缓存查询失败，继续API调用:', cacheError.message);
    }
  }

  console.log(`🤖 调用DeepSeek API... (尝试 ${retryCount + 1}/${maxRetries + 1})`);
  console.log('📝 Prompt长度:', prompt.length);

  try {
    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟超时

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的旅行规划师，擅长为用户制定详细、实用的旅行计划。请根据用户需求生成具体的旅行规划。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`DeepSeek API error: ${response.status} ${errorText}`);

      // 检查是否应该重试
      if (shouldRetry(response.status, retryCount, maxRetries)) {
        console.log(`⚠️ API调用失败，${retryDelay}ms后重试... (${response.status})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return callDeepSeekAPI(prompt, maxTokens, retryCount + 1);
      }

      throw error;
    }

    const result = await response.json();
    console.log('✅ DeepSeek API调用成功');
    console.log('📊 Token使用情况:', result.usage);

    return result.choices[0]?.message?.content || '';

  } catch (error) {
    // 处理网络错误和超时
    if (error.name === 'AbortError') {
      console.log('⏰ API调用超时');
      if (retryCount < maxRetries) {
        console.log(`⚠️ 超时重试，${retryDelay}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return callDeepSeekAPI(prompt, maxTokens, retryCount + 1);
      }
      throw new Error('API调用超时，请稍后重试');
    }

    // 网络错误重试
    if (shouldRetryNetworkError(error, retryCount, maxRetries)) {
      console.log(`⚠️ 网络错误，${retryDelay}ms后重试...`, error.message);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return callDeepSeekAPI(prompt, maxTokens, retryCount + 1);
    }

    throw error;
  }
}

// 判断是否应该重试
function shouldRetry(statusCode: number, retryCount: number, maxRetries: number): boolean {
  if (retryCount >= maxRetries) return false;

  // 重试的HTTP状态码
  const retryableStatusCodes = [429, 500, 502, 503, 504];
  return retryableStatusCodes.includes(statusCode);
}

// 判断网络错误是否应该重试
function shouldRetryNetworkError(error: any, retryCount: number, maxRetries: number): boolean {
  if (retryCount >= maxRetries) return false;

  // 重试的网络错误类型
  const retryableErrors = ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'];
  return retryableErrors.some(code => error.code === code || error.message.includes(code));
}

// 生成降级方案
function generateFallbackPlan(destination: string, preferences: any): string {
  const totalDays = preferences?.totalDays || 7;
  const groupSize = preferences?.groupSize || 2;
  const budget = preferences?.budget || 'mid-range';

  return `# ${destination}旅行规划 (${totalDays}天)

## 行程概览
- **目的地**: ${destination}
- **旅行天数**: ${totalDays}天
- **人数**: ${groupSize}人
- **预算类型**: ${budget}

## 每日行程安排

${Array.from({ length: totalDays }, (_, i) => {
  const day = i + 1;
  return `### 第${day}天
- **上午**: 探索${destination}当地景点
- **下午**: 体验当地文化活动
- **晚上**: 品尝当地特色美食
- **住宿**: 当地推荐酒店`;
}).join('\n\n')}

## 实用建议

### 交通指南
- 建议提前预订机票和火车票
- 当地可选择公共交通或包车服务
- 注意查看当地交通规则和限制

### 住宿推荐
- 根据预算选择合适的住宿类型
- 建议预订市中心或景区附近的酒店
- 提前查看酒店评价和设施

### 美食体验
- 尝试当地特色菜肴
- 注意饮食卫生和个人体质
- 可以向当地人询问推荐餐厅

### 注意事项
- 关注当地天气变化，准备合适衣物
- 保管好个人证件和贵重物品
- 了解当地风俗习惯，尊重当地文化
- 购买旅行保险，确保出行安全

---
*注意：此为基础规划模板，建议根据实际情况调整行程安排。如需更详细的个性化规划，请稍后重试或联系客服。*`;
}

// 模拟规划流程，但使用真实LLM
async function simulatePlanningProcess(sessionId: string, session: any, options: any) {
  const phases = [
    'analyze_complexity',
    'region_decomposition',
    'collect_data',
    'plan_region',
    'validate_region',
    'merge_regions',
    'optimize_transitions',
    'generate_output'
  ];

  let currentProgress = 0;
  const progressIncrement = 100 / phases.length;

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    currentProgress = Math.round((i + 1) * progressIncrement);

    console.log(`📍 执行阶段: ${phase} (${currentProgress}%)`);

    // 更新进度 - 遵循高内聚原则：保留现有结果数据
    const sessionManager = getSessionManager();
    const currentSession = sessionManager.getSession(sessionId);
    const existingResult = currentSession?.result || {};

    sessionManager.updateSession(sessionId, {
      status: 'processing',
      progress: currentProgress,
      result: {
        ...existingResult, // 保留现有数据，包括LLM响应
        currentPhase: phase,
        progress: currentProgress,
        timestamp: new Date().toISOString(),
      },
    });

    // 在关键阶段调用真实LLM
    if (phase === 'plan_region') {
      try {
        const preferences = typeof session.preferences === 'string'
          ? JSON.parse(session.preferences)
          : session.preferences;

        const prompt = `请为以下旅行需求制定详细的旅行规划：

目的地：${session.destination}
出发日期：${preferences.startDate}
返回日期：${preferences.endDate}
旅行天数：${preferences.totalDays}天
人数：${preferences.groupSize}人
预算：${preferences.budget}
旅行风格：${preferences.travelStyles?.join(', ')}
住宿偏好：${preferences.accommodation}
特殊要求：${preferences.specialRequirements || '无'}

请生成一个详细的${preferences.totalDays}天旅行规划，包括：
1. 每日具体行程安排
2. 推荐的景点和活动
3. 餐厅推荐
4. 住宿建议
5. 交通安排
6. 预算估算
7. 实用小贴士

请确保规划具体、实用，包含真实的地点名称和详细信息。`;

        console.log('🚀 开始调用DeepSeek生成旅行规划...');
        const llmResponse = await callDeepSeekAPI(prompt, options.maxTokens || 4000);

        console.log('✅ LLM规划生成完成，长度:', llmResponse.length);

        // 保存LLM响应
        const sessionManager = getSessionManager();
        sessionManager.updateSession(sessionId, {
          status: 'processing',
          progress: currentProgress,
          result: {
            currentPhase: phase,
            progress: currentProgress,
            llmResponse: llmResponse,
            tokensUsed: llmResponse.length / 4, // 粗略估算
            timestamp: new Date().toISOString(),
          },
        });

      } catch (llmError) {
        console.error('❌ LLM调用失败:', llmError);

        // 优雅降级：提供基础的旅行规划模板
        const fallbackResponse = generateFallbackPlan(session.destination, session.preferences);
        console.log('🔄 使用降级方案，生成基础规划模板');

        // 保存降级响应
        const sessionManager = getSessionManager();
        sessionManager.updateSession(sessionId, {
          status: 'processing',
          progress: currentProgress,
          result: {
            currentPhase: phase,
            progress: currentProgress,
            llmResponse: fallbackResponse,
            tokensUsed: 0,
            fallback: true,
            error: llmError.message,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 遵循KISS原则：直接从最新会话状态获取LLM响应
  const sessionManager = getSessionManager();
  const finalSession = sessionManager.getSession(sessionId);

  // 遵循为失败而设计：确保数据完整性
  if (!finalSession) {
    throw new Error(`会话不存在: ${sessionId}`);
  }

  const llmResponse = finalSession.result?.llmResponse || '';
  const tokensUsed = finalSession.result?.tokensUsed || 0;
  const isFallback = finalSession.result?.fallback || false;

  // 遵循纵深防御：最终验证
  if (!llmResponse && !isFallback) {
    console.error('❌ 最终验证失败：LLM响应为空且非降级模式');
    throw new Error('LLM响应数据丢失');
  }

  console.log(`✅ 规划流程完成，返回数据: LLM响应长度=${llmResponse.length}, tokens=${tokensUsed}, 降级=${isFallback}`);

  return {
    success: true,
    destination: session.destination,
    totalDays: session.preferences?.totalDays || 0,
    completedAt: new Date().toISOString(),
    llmResponse: llmResponse,
    tokensUsed: tokensUsed,
    fallback: isFallback,
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
    const { sessionId } = req.query;

    // 验证会话ID
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json(createErrorResponse('Invalid session ID', 'INVALID_SESSION_ID'));
    }

    console.log(`🚀 启动真实LLM规划流程，会话ID: ${sessionId}`);

    // 获取会话状态
    const sessionManager = getSessionManager();
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json(createErrorResponse('Session not found', 'SESSION_NOT_FOUND'));
    }

    // 解析请求选项
    const { options = {} }: StartPlanningRequest = req.body;
    let {
      priority = 'balanced',
      maxTokens = 8000, // DeepSeek API限制为8192，保留一些余量
    } = options;

    // 验证并限制maxTokens参数
    if (maxTokens > 8192) {
      console.log(`⚠️ maxTokens ${maxTokens} 超过DeepSeek API限制，调整为8000`);
      maxTokens = 8000;
    }

    console.log(`⚙️ 规划选项: priority=${priority}, maxTokens=${maxTokens}`);
    console.log(`📍 目的地: ${session.destination}`);

    // 立即返回响应，异步执行真实LLM规划
    res.status(200).json(createSuccessResponse({
      message: 'Real LLM planning started successfully',
      sessionId,
      estimatedDuration: 120, // 2分钟预计时间
      llmProvider: 'DeepSeek',
      destination: session.destination,
    }));

    // 异步执行真实LLM规划流程
    simulatePlanningProcess(sessionId, session, { priority, maxTokens })
      .then(async (result) => {
        console.log(`✅ 真实LLM规划完成，会话ID: ${sessionId}`);

        // 更新会话状态为完成 - 遵循KISS原则：简化数据流
        const sessionManager = getSessionManager();

        // 遵循为失败而设计：确保LLM响应存在
        if (!result.llmResponse || result.llmResponse.length === 0) {
          console.error('❌ LLM响应为空，无法完成会话');
          throw new Error('LLM响应为空');
        }

        // 遵循单一职责原则：原子性更新会话状态
        const finalResult = {
          success: true,
          destination: session.destination,
          totalDays: session.preferences?.totalDays || 0,
          currentPhase: 'completed',
          completedAt: new Date().toISOString(),
          llmProvider: 'DeepSeek',
          llmResponse: result.llmResponse,
          tokensUsed: result.tokensUsed,
          fallback: result.fallback || false,
        };

        sessionManager.updateSession(sessionId, {
          status: 'completed',
          progress: 100,
          result: finalResult,
        });

        // 遵循纵深防御：验证数据保存成功
        const verificationSession = sessionManager.getSession(sessionId);
        if (!verificationSession?.result?.llmResponse) {
          console.error('❌ 数据保存验证失败');
          throw new Error('数据保存验证失败');
        }

        console.log(`✅ 会话完成验证通过，LLM响应长度: ${verificationSession.result.llmResponse.length}`);
      })
      .catch(async (error) => {
        console.error(`❌ 真实LLM规划失败，会话ID: ${sessionId}:`, error);

        // 更新会话状态为错误
        const sessionManager = getSessionManager();
        sessionManager.updateSession(sessionId, {
          status: 'failed',
          progress: 0,
          result: {
            error: error.message,
            currentPhase: 'error',
            timestamp: new Date().toISOString(),
            llmProvider: 'DeepSeek',
          },
        });
      });

  } catch (error) {
    console.error('❌ 启动真实LLM规划失败:', error);

    return res.status(500).json(createErrorResponse(
      'Failed to start real LLM planning',
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      } : undefined
    ));
  }
}


