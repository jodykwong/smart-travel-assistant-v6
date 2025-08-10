/**
 * 智游助手v6.5 - 会话详情API
 * 获取和更新特定会话的状态
 * 集成新的Timeline解析架构
 */

/**
 * 智游助手v6.5 - 会话详情API
 * 版本: 6.5.0
 * Timeline解析架构: v2.0
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionManager } from '@/lib/database/session-manager';
import { parseTimelineToLegacy, createParseContext } from '@/lib/timeline';
import { isTimelineV2Enabled, logFeatureFlagUsage } from '@/lib/feature-flags';

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

// 新的Timeline解析工具：使用Timeline解析架构v2.0
async function parseItineraryFromLLM(
  llmResponse: string,
  destination: string,
  totalDays: number = 0,
  sessionId: string,
  startDate?: string
) {
  console.log('[API] 开始Timeline解析v2.0', {
    sessionId,
    destination,
    totalDays,
    contentLength: llmResponse?.length || 0
  });

  // 如果没有LLM响应，返回空结果
  if (!llmResponse || llmResponse.length < 10) {
    console.log('[API] LLM响应为空，返回空结果');
    return { items: [], length: 0, parseSuccess: false };
  }

  // 检查Feature Flag是否启用Timeline v2.0
  const timelineV2Enabled = isTimelineV2Enabled(sessionId);
  logFeatureFlagUsage(sessionId, timelineV2Enabled, timelineV2Enabled ? 'enabled' : 'disabled');

  if (!timelineV2Enabled) {
    console.log('[API] Timeline v2.0被Feature Flag禁用，使用回退解析');
    return parseItineraryFromLLMFallback(llmResponse, totalDays);
  }

  try {
    // 创建解析上下文
    const parseContext = createParseContext(destination, totalDays, sessionId, startDate);

    // 使用新的Timeline解析架构v2.0
    const legacyFormat = await parseTimelineToLegacy(llmResponse, parseContext);

    console.log('[API] Timeline解析v2.0成功', {
      sessionId,
      daysCount: legacyFormat.length,
      totalActivities: legacyFormat.reduce((sum, day) => sum + day.timeline.length, 0)
    });

    // 转换为API响应格式
    const items = legacyFormat.map(day => ({
      day: day.day,
      title: day.title,
      content: `Day ${day.day}：${day.title}\n\n${day.timeline.map(item =>
        `**${item.period}** (${item.time})\n${item.title}\n${item.description}`
      ).join('\n\n')}`
    }));

    return {
      items,
      length: items.length,
      parseSuccess: true,
      legacyFormat // 新增：提供完整的解析结果
    };

  } catch (error) {
    console.error('[API] Timeline解析v2.0失败，回退到简单解析', {
      sessionId,
      error: error instanceof Error ? error.message : '未知错误'
    });

    // 回退到简单解析
    return parseItineraryFromLLMFallback(llmResponse, totalDays);
  }
}

// 回退解析函数（保持向后兼容）
function parseItineraryFromLLMFallback(llmResponse: string, totalDays: number = 0) {
  const items: Array<{ day: number; title: string; content: string }> = [];
  if (!llmResponse || llmResponse.length < 10) return { items, length: 0, parseSuccess: false };

  let inferredDays = 0;
  for (let d = 1; d <= 30; d++) {
    const pattern = new RegExp(`(?:^|\n)\s*(?:Day\s*${d}|第${d}天)`, 'i');
    if (pattern.test(llmResponse)) inferredDays = d;
  }
  const days = totalDays && totalDays > 0 ? totalDays : inferredDays;
  if (!days) return { items, length: 0, parseSuccess: false };

  for (let day = 1; day <= days; day++) {
    const blockPattern = new RegExp(
      `(?:Day\\s*${day}|第${day}天)[\\s\\S]*?(?=(?:Day\\s*${day + 1}|第${day + 1}天)|$)`,
      'i'
    );
    const blockMatch = llmResponse.match(blockPattern);
    const block = blockMatch ? blockMatch[0] : '';

    let title = `第${day}天`;
    if (block) {
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const headerIndex = lines.findIndex(l => /(Day\s*\d+|第\d+天)/i.test(l));
      const candidate = lines.find((l, idx) => idx > headerIndex && !/^[-*]/.test(l));
      if (candidate) title = candidate.replace(/^#+\s*/, '').slice(0, 60);
    }
    items.push({ day, title, content: (block || '').trim() });
  }
  return { items, length: items.length, parseSuccess: false };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { sessionId } = req.query;

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json(createErrorResponse(
      'Invalid session ID',
      'INVALID_SESSION_ID'
    ));
  }

  if (req.method === 'GET') {
    try {
      console.log('📋 获取会话状态:', sessionId);

      // 从数据库获取会话信息
      const sessionManager = getSessionManager();
      const session = sessionManager.getSession(sessionId);

      if (!session) {
        return res.status(404).json(createErrorResponse(
          'Session not found',
          'SESSION_NOT_FOUND'
        ));
      }

      // 构建会话状态响应（API优先：契约清晰且向后兼容）
      const rawResult = typeof session.result === 'string' ? JSON.parse(session.result) : (session.result || {});
      const llmResponse: string = rawResult?.llmResponse || '';
      const totalDays = session.preferences?.totalDays || 0;
      const startDate = session.preferences?.startDate;

      // 使用新的Timeline解析架构v2.0
      const parsed = await parseItineraryFromLLM(
        llmResponse,
        session.destination,
        totalDays,
        sessionId as string,
        startDate
      );

      let sessionState = {
        sessionId: session.id,
        destination: session.destination,
        totalDays: totalDays,
        startDate: session.preferences?.startDate || '',
        endDate: session.preferences?.endDate || '',
        userPreferences: session.preferences || {},
        regions: [],
        currentRegionIndex: 0,
        currentPhase: session.status === 'completed' ? 'completed' :
                     session.status === 'failed' ? 'error' :
                     session.status === 'processing' ? 'plan_region' : 'analyze_complexity',
        realData: {},
        regionPlans: {},
        progress: session.progress || 0,
        errors: [],
        retryCount: 0,
        qualityScore: 0,
        tokensUsed: rawResult?.tokensUsed || 0,
        tokensRemaining: 20000,
        masterPlan: null,
        htmlOutput: null,
        // 新增：标准字段，前端不再需要fallback解析
        result: {
          ...rawResult,
          itinerary: parsed.items,
          itineraryLength: parsed.length,
          // Timeline解析架构v2.0新增字段
          parseSuccess: parsed.parseSuccess,
          legacyFormat: parsed.legacyFormat, // 完整的解析结果，供前端直接使用
          timelineVersion: '2.0.0',
        },
      } as any;

      console.log('✅ 会话状态获取成功:', {
        sessionId,
        destination: sessionState.destination,
        phase: sessionState.currentPhase,
        progress: sessionState.progress,
        timelineVersion: '2.0.0',
        parseSuccess: parsed.parseSuccess,
        itineraryLength: parsed.length,
      });

      return res.status(200).json(createSuccessResponse(sessionState));

    } catch (error) {
      console.error('❌ 获取会话状态失败:', error);
      
      return res.status(500).json(createErrorResponse(
        'Failed to get session state',
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5),
        } : undefined
      ));
    }
  }

  if (req.method === 'PUT') {
    try {
      console.log('📝 更新会话状态:', sessionId, req.body);

      const updates = req.body;

      // 更新数据库中的会话
      const sessionManager = getSessionManager();
      const updatedSession = sessionManager.updateSession(sessionId, {
        status: updates.status,
        progress: updates.progress,
        result: updates.result,
      });

      if (!updatedSession) {
        return res.status(404).json(createErrorResponse(
          'Session not found',
          'SESSION_NOT_FOUND'
        ));
      }

      console.log('✅ 会话状态更新成功');

      return res.status(200).json(createSuccessResponse({
        sessionId: updatedSession.id,
        status: updatedSession.status,
        progress: updatedSession.progress,
      }, '会话状态更新成功'));

    } catch (error) {
      console.error('❌ 更新会话状态失败:', error);
      
      return res.status(500).json(createErrorResponse(
        'Failed to update session state',
        'INTERNAL_ERROR'
      ));
    }
  }

  if (req.method === 'DELETE') {
    try {
      console.log('🗑️ 删除会话:', sessionId);

      const sessionManager = getSessionManager();
      const deleted = sessionManager.deleteSession(sessionId);

      if (!deleted) {
        return res.status(404).json(createErrorResponse(
          'Session not found',
          'SESSION_NOT_FOUND'
        ));
      }

      console.log('✅ 会话删除成功');

      return res.status(200).json(createSuccessResponse(
        { sessionId },
        '会话删除成功'
      ));

    } catch (error) {
      console.error('❌ 删除会话失败:', error);
      
      return res.status(500).json(createErrorResponse(
        'Failed to delete session',
        'INTERNAL_ERROR'
      ));
    }
  }

  // 不支持的方法
  return res.status(405).json(createErrorResponse(
    'Method not allowed',
    'METHOD_NOT_ALLOWED'
  ));
}
