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

// 轻量解析：从LLM文本中提取每日块，生成基本itinerary（KISS 原则）
function parseItineraryFromLLM(llmResponse: string, totalDays: number = 0) {
  const items: Array<{ day: number; title: string; content: string }> = [];
  if (!llmResponse || llmResponse.length < 10) return { items, length: 0 };

  // 如果未提供totalDays，尝试从文本中推断最大天数（为失败而设计）
  let inferredDays = 0;
  for (let d = 1; d <= 30; d++) {
    const pattern = new RegExp(`(?:^|\n)\s*(?:Day\s*${d}|第${d}天)`, 'i');
    if (pattern.test(llmResponse)) inferredDays = d;
  }
  const days = totalDays && totalDays > 0 ? totalDays : inferredDays;

  if (!days) return { items, length: 0 };

  for (let day = 1; day <= days; day++) {
    const blockPattern = new RegExp(
      `(?:Day\\s*${day}|第${day}天)[\\s\\S]*?(?=(?:Day\\s*${day + 1}|第${day + 1}天)|$)`,
      'i'
    );
    const blockMatch = llmResponse.match(blockPattern);
    const block = blockMatch ? blockMatch[0] : '';

    // 提取标题：第1个非空行（排除“第n天/Day n”行）
    let title = `第${day}天`;
    if (block) {
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const headerIndex = lines.findIndex(l => /(Day\s*\d+|第\d+天)/i.test(l));
      const candidate = lines.find((l, idx) => idx > headerIndex && !/^[-*]/.test(l));
      if (candidate) title = candidate.replace(/^#+\s*/, '').slice(0, 60);
    }

    items.push({ day, title, content: (block || '').trim() });
  }

  return { items, length: items.length };
}

// 真实的LLM调用函数（带缓存 + 双链路冗余）
async function callDeepSeekAPI(prompt: string, maxTokens: number = 4000, retryCount: number = 0, useCache: boolean = true): Promise<string> {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避：1s, 2s, 4s

  // 构建请求对象
  const request = {
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  } as const;

  // 尝试使用缓存（内部已接入LLMFailover）
  if (useCache) {
    try {
      const cacheService = getDeepSeekCacheService();
      const cachedResponse = await cacheService.smartCache(request as any);
      if (cachedResponse && cachedResponse.choices && cachedResponse.choices[0]) {
        console.log('🎯 缓存命中，跳过API调用');
        return cachedResponse.choices[0].message.content;
      }
    } catch (cacheError: any) {
      console.warn('⚠️ 缓存查询失败，继续API调用:', cacheError?.message || cacheError);
    }
  }

  // 直接调用 LLMFailoverService
  try {
    const { LLMFailoverService } = await import('@/services/failover/llm-failover-service');
    const llm = new LLMFailoverService();
    const { result, provider } = await llm.chat(request as any);
    console.log(`✅ LLM 调用成功，提供商: ${provider}`);
    return result.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error('❌ LLM 调用失败:', error?.message || error);

    if (retryCount < maxRetries) {
      console.log(`⚠️ 错误重试，${retryDelay}ms后重试...`);
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

// 注意：已移除降级方案 - 本产品只提供基于真实LLM的精确旅游规划

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

        // 标记会话为失败状态
        const sessionManager = getSessionManager();
        sessionManager.updateSession(sessionId, {
          status: 'failed',
          progress: currentProgress,
          result: {
            currentPhase: phase,
            progress: currentProgress,
            error: llmError.message,
            timestamp: new Date().toISOString(),
          },
        });

        // 直接抛出错误，不使用降级方案
        throw new Error(`LLM调用失败，无法生成精确的旅游规划: ${llmError.message}`);
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

  // 严格验证：只接受真实的LLM响应
  if (!llmResponse) {
    console.error('❌ 最终验证失败：LLM响应为空');
    throw new Error('LLM响应数据丢失，无法提供精确的旅游规划');
  }

  console.log(`✅ 规划流程完成，返回数据: LLM响应长度=${llmResponse.length}, tokens=${tokensUsed}`);

  return {
    success: true,
    destination: session.destination,
    totalDays: session.preferences?.totalDays || 0,
    completedAt: new Date().toISOString(),
    llmResponse: llmResponse,
    tokensUsed: tokensUsed,
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


