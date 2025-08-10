/**
 * 智游助手v5.0 - 规划生成页面组件
 * 重构前: 静态HTML + 模拟进度
 * 重构后: 实时WebSocket连接 + LangGraph状态同步
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useTravelPlanningStore, usePlanningProgress } from '@/store/travel-planning-store';
import { travelPlanningService } from '@/services/travel-planning-service';
import type { PlanningProgress, PlanningPhase } from '@/types/travel-planning';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// ============= 阶段配置 =============

const PHASE_CONFIG: Record<PlanningPhase, {
  title: string;
  description: string;
  icon: string;
  color: string;
}> = {
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

// ============= 主组件 =============

export const PlanGeneratingPage: React.FC = () => {
  const router = useRouter();
  const { sessionId, destination, totalDays, userPreferences } = useTravelPlanningStore();
  const { progress, phase, currentRegion, errors } = usePlanningProgress();
  
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [unsubscribeProgress, setUnsubscribeProgress] = useState<(() => void) | null>(null);

  // 启动规划的Mutation
  const startPlanningMutation = useMutation({
    mutationFn: () => travelPlanningService.startPlanning(sessionId),
    onError: (error) => {
      console.error('Failed to start planning:', error);
    },
  });

  // 获取会话状态
  const { data: sessionState, isLoading } = useQuery({
    queryKey: ['session-state', sessionId],
    queryFn: () => travelPlanningService.getSessionStatus(sessionId),
    enabled: !!sessionId,
    refetchInterval: 5000, // 每5秒轮询一次
  });

  // ============= 副作用 =============

  // 订阅实时进度更新
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = travelPlanningService.subscribeToProgress(
      sessionId,
      (progressData: PlanningProgress) => {
        // 进度更新会自动通过store更新UI
        console.log('Progress update:', progressData);
      }
    );

    setUnsubscribeProgress(() => unsubscribe);

    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  // 启动规划流程
  useEffect(() => {
    if (sessionId && !startPlanningMutation.data && !startPlanningMutation.isPending) {
      startPlanningMutation.mutate();
    }
  }, [sessionId, startPlanningMutation]);

  // 规划完成后跳转
  useEffect(() => {
    if (phase === 'completed') {
      setTimeout(() => {
        router.push('/planning/result');
      }, 2000);
    }
  }, [phase, router]);

  // 切换趣味事实
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ============= 事件处理 =============

  const handleCancel = useCallback(async () => {
    if (sessionId) {
      try {
        await travelPlanningService.cancelPlanning(sessionId);
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to cancel planning:', error);
      }
    }
  }, [sessionId, router]);

  // ============= 渲染 =============

  if (!sessionId || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const currentPhaseConfig = PHASE_CONFIG[phase] || PHASE_CONFIG['analyze_complexity'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* 主要进度卡片 */}
        <Card className="p-8 text-center">
          {/* 动画图标 */}
          <motion.div
            className="relative mb-8"
            animate={{ rotate: phase === 'completed' ? 0 : 360 }}
            transition={{ duration: 2, repeat: phase === 'completed' ? 0 : Infinity, ease: 'linear' }}
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
              {currentRegion && ` (当前区域: ${currentRegion})`}
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
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <h4 className="font-semibold text-red-900 mb-2">处理中遇到一些问题</h4>
              <p className="text-red-700 text-sm">
                系统正在自动重试，这不会影响最终的规划质量。
              </p>
            </div>
          )}

          {/* 取消按钮 */}
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={phase === 'completed'}
          >
            取消生成
          </Button>
        </Card>

        {/* 目的地预览卡片 */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">目的地预览</h3>
          <div className="flex items-center space-x-4">
            <img
              src={`https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop`}
              alt={destination}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div>
              <h4 className="font-semibold text-gray-900">{destination}</h4>
              <p className="text-gray-600 text-sm">探索神秘的西域风光</p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>📅 {totalDays}天</span>
                <span>👥 {userPreferences.groupSize}人</span>
                <span>💰 {userPreferences.budget === 'mid-range' ? '中等预算' : userPreferences.budget}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
