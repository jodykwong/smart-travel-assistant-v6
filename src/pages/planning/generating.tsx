/**
 * 智游助手v6.5 - 规划生成页面
 * 基于Apple HIG和Material Design规范优化
 * Pages Router 兼容版本 - 实时监控LLM调用
 */

import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress, StepProgress } from '@/components/ui/Progress';
import { Button, OutlineButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

// 阶段配置
const PHASE_CONFIG = {
  'analyze_complexity': {
    title: '正在分析目的地复杂度',
    description: '评估旅行规划的复杂程度和所需资源...',
    icon: '🔍',
    color: 'text-blue-600',
  },
  'region_decomposition': {
    title: '正在进行区域分解',
    description: '将目的地分解为多个可管理的区域...',
    icon: '🗺️',
    color: 'text-green-600',
  },
  'collect_data': {
    title: '正在收集地理数据',
    description: '从高德地图获取最新的景点、餐厅、住宿信息...',
    icon: '📊',
    color: 'text-purple-600',
  },
  'plan_region': {
    title: '正在生成区域规划',
    description: 'AI正在为每个区域制定详细的旅行计划...',
    icon: '🤖',
    color: 'text-orange-600',
  },
  'validate_region': {
    title: '正在验证规划质量',
    description: '检查规划的可行性和质量评分...',
    icon: '✅',
    color: 'text-teal-600',
  },
  'merge_regions': {
    title: '正在合并区域规划',
    description: '将各个区域的规划整合为完整的旅行计划...',
    icon: '🔗',
    color: 'text-indigo-600',
  },
  'optimize_transitions': {
    title: '正在优化行程安排',
    description: '优化区域间的交通和时间安排...',
    icon: '⚡',
    color: 'text-yellow-600',
  },
  'generate_output': {
    title: '正在生成最终规划',
    description: '创建您的专属旅行规划文档...',
    icon: '📝',
    color: 'text-pink-600',
  },
  'completed': {
    title: '规划生成完成',
    description: '您的专属旅行规划已经准备就绪！',
    icon: '🎉',
    color: 'text-green-600',
  },
  'error': {
    title: '规划过程出现错误',
    description: '系统遇到了一些问题，正在尝试恢复...',
    icon: '❌',
    color: 'text-red-600',
  },
};

const FUN_FACTS = [
  '我们的AI系统每秒可以处理超过10,000个旅行数据点',
  '平均而言，使用智游助手可以节省15-20小时的规划时间',
  '我们的算法考虑了超过50个因素，包括天气、交通、当地节庆等',
  '全球已有超过100万用户使用我们的服务规划了完美的旅行',
  '我们的推荐准确率达到95%，用户满意度超过4.8/5星',
];

export default function GeneratingPage() {
  const router = useRouter();
  const { sessionId } = router.query;
  
  const [sessionState, setSessionState] = useState(null);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  // 启动规划流程
  const startPlanning = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log('🚀 启动规划流程，会话ID:', sessionId);
      setLogs(prev => [...prev, `🚀 启动规划流程，会话ID: ${sessionId}`]);

      const response = await fetch(`/api/v1/planning/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          options: {
            priority: 'quality',
            maxTokens: 8000, // DeepSeek API限制为8192，保留一些余量
          },
        }),
      });

      const result = await response.json();
      console.log('✅ 规划启动响应:', result);
      setLogs(prev => [...prev, `✅ 规划启动响应: ${JSON.stringify(result)}`]);

      if (!result.success) {
        throw new Error(result.error?.message || '启动规划失败');
      }

    } catch (error) {
      console.error('❌ 启动规划失败:', error);
      setLogs(prev => [...prev, `❌ 启动规划失败: ${error.message}`]);
      setError(error.message);
    }
  }, [sessionId]);

  // 轮询会话状态 - 优化版本
  const pollSessionState = useCallback(async () => {
    if (!sessionId) return;

    try {
      // 使用专门的status端点，减少数据传输
      const response = await fetch(`/api/v1/planning/sessions/${sessionId}/status`);
      const result = await response.json();

      if (result.success && result.data) {
        const newData = result.data;

        // 只在状态真正变化时更新
        setSessionState(prevState => {
          if (!prevState ||
              prevState.progress !== newData.progress ||
              prevState.currentPhase !== newData.currentPhase ||
              prevState.status !== newData.status) {

            setIsLoading(false);

            // 只在有实际变化时记录日志
            const logMessage = `📊 会话状态更新: ${newData.currentPhase} - ${newData.progress}%`;
            console.log(logMessage);
            setLogs(prev => {
              // 避免重复日志
              const lastLog = prev[prev.length - 1];
              if (lastLog !== logMessage) {
                const newLogs = [...prev, logMessage];
                return newLogs.slice(-10); // 只保留最近10条日志
              }
              return prev;
            });

            // 如果完成，跳转到结果页面
            if (newData.currentPhase === 'completed' || newData.progress >= 100) {
              setTimeout(() => {
                router.push(`/planning/result?sessionId=${sessionId}`);
              }, 1500);
            }

            // 如果失败，跳转到错误恢复页面
            if (newData.currentPhase === 'error' || newData.status === 'failed') {
              const errorMessage = newData.errors?.length > 0
                ? newData.errors[newData.errors.length - 1].message
                : '规划生成失败，请检查API密钥配置或重试';

              console.error('❌ 规划会话失败:', {
                sessionId,
                phase: newData.currentPhase,
                status: newData.status,
                error: errorMessage
              });

              // 延迟跳转到错误恢复页面
              setTimeout(() => {
                router.push(`/planning/error-recovery?sessionId=${sessionId}&error=${encodeURIComponent(errorMessage)}`);
              }, 2000);

              setError(errorMessage);
            }

            return {
              ...prevState,
              ...newData,
            };
          }
          return prevState;
        });
      }
    } catch (error) {
      console.error('❌ 获取会话状态失败:', error);
      setError(error.message);
    }
  }, [sessionId, router]);

  // 初始化和自适应轮询
  useEffect(() => {
    if (!sessionId) return;

    // 启动规划
    startPlanning();

    // 自适应轮询间隔
    let pollInterval = 1000; // 初始1秒
    let consecutiveNoChange = 0;
    let maxPollAttempts = 300; // 最大轮询次数（5分钟）
    let currentPollAttempts = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    const adaptivePoll = () => {
      // 安全措施：检查最大轮询次数
      if (currentPollAttempts >= maxPollAttempts) {
        console.error('❌ 轮询超时，停止轮询');
        setError('规划生成超时，请重试');
        return;
      }

      currentPollAttempts++;

      pollSessionState().then(() => {
        // 检查终止条件：完成、失败或错误状态
        if (sessionState?.progress >= 100 ||
            sessionState?.currentPhase === 'completed' ||
            sessionState?.currentPhase === 'error' ||
            sessionState?.status === 'failed') {

          console.log('🛑 轮询停止条件满足:', {
            progress: sessionState?.progress,
            phase: sessionState?.currentPhase,
            status: sessionState?.status
          });

          // 如果是错误状态，显示错误信息
          if (sessionState?.currentPhase === 'error' || sessionState?.status === 'failed') {
            setError('规划生成失败，请检查API密钥配置或重试');
          }

          return; // 停止轮询
        }

        consecutiveNoChange++;

        // 如果连续多次无变化，降低轮询频率
        if (consecutiveNoChange > 3) {
          pollInterval = Math.min(pollInterval * 1.2, 5000); // 最大5秒
        } else {
          pollInterval = Math.max(pollInterval * 0.9, 1000); // 最小1秒
        }

        timeoutId = setTimeout(adaptivePoll, pollInterval);
      }).catch((error) => {
        console.error('❌ 轮询过程中发生错误:', error);
        setError(`轮询错误: ${error.message}`);
      });
    };

    // 开始自适应轮询
    timeoutId = setTimeout(adaptivePoll, 1000);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [sessionId, startPlanning, pollSessionState]);

  // 切换趣味事实
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCancel = useCallback(async () => {
    if (sessionId) {
      try {
        await fetch(`/api/v1/planning/sessions/${sessionId}/cancel`, {
          method: 'POST',
        });
        router.push('/');
      } catch (error) {
        console.error('取消规划失败:', error);
      }
    }
  }, [sessionId, router]);

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">会话ID缺失</h1>
          <Button
            onClick={() => router.push('/planning')}
            variant="primary"
          >
            返回规划页面
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">规划生成失败</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={() => router.push('/planning')}
            variant="primary"
          >
            重新开始
          </Button>
        </div>
      </div>
    );
  }

  const currentPhase = sessionState?.currentPhase || 'analyze_complexity';
  const progress = sessionState?.progress || 0;
  const currentPhaseConfig = PHASE_CONFIG[currentPhase] || PHASE_CONFIG['analyze_complexity'];

  return (
    <>
      <Head>
        <title>正在生成规划 - 智游助手v5.0</title>
        <meta name="description" content="AI正在为您生成个性化的旅行规划" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          {/* 主要进度卡片 */}
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {/* 动画图标 */}
            <motion.div
              className="relative mb-8"
              animate={{ rotate: currentPhase === 'completed' ? 0 : 360 }}
              transition={{ duration: 2, repeat: currentPhase === 'completed' ? 0 : Infinity, ease: 'linear' }}
            >
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">{currentPhaseConfig.icon}</span>
              </div>
              <motion.div
                className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span className="text-white text-sm">✨</span>
              </motion.div>
            </motion.div>

            {/* 标题和描述 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              AI正在为您量身定制旅行计划
            </h1>
            <p className="text-gray-600 mb-8">
              我们的智能系统正在分析您的偏好，为您生成最完美的旅行体验
            </p>

            {/* 进度条 */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>生成进度</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* 当前步骤 */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentPhaseConfig.color} bg-current bg-opacity-10`}>
                  <span className={currentPhaseConfig.color}>{currentPhaseConfig.icon}</span>
                </div>
                <h3 className={`text-lg font-semibold ${currentPhaseConfig.color}`}>
                  {currentPhaseConfig.title}
                </h3>
              </div>
              <p className="text-gray-600">
                {currentPhaseConfig.description}
                {sessionState?.currentRegion && ` (当前区域: ${sessionState.currentRegion})`}
              </p>
            </div>

            {/* 趣味事实 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
              <h4 className="font-semibold text-gray-900 mb-3">
                💡 您知道吗？
              </h4>
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentFactIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-gray-700 text-sm"
                >
                  {FUN_FACTS[currentFactIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* 错误显示 */}
            {sessionState?.errors?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                <h4 className="font-semibold text-red-900 mb-2">处理中遇到一些问题</h4>
                <p className="text-red-700 text-sm">
                  系统正在自动重试，这不会影响最终的规划质量。
                </p>
              </div>
            )}

            {/* 取消按钮 */}
            <OutlineButton
              onClick={handleCancel}
              disabled={currentPhase === 'completed'}
              variant="outline"
            >
              取消生成
            </OutlineButton>
          </div>

          {/* 会话信息卡片 */}
          {sessionState && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">规划详情</h3>
              <div className="space-y-2 text-sm">
                <div><strong>会话ID:</strong> {sessionId}</div>
                <div><strong>目的地:</strong> {sessionState.destination}</div>
                <div><strong>总天数:</strong> {sessionState.totalDays}天</div>
                <div><strong>当前阶段:</strong> {currentPhaseConfig.title}</div>
                <div><strong>进度:</strong> {progress}%</div>
                {sessionState.tokensUsed > 0 && (
                  <div><strong>Token使用:</strong> {sessionState.tokensUsed} / {sessionState.tokensRemaining}</div>
                )}
              </div>
            </div>
          )}

          {/* 实时日志 */}
          {logs.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">实时日志</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono max-h-40 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
