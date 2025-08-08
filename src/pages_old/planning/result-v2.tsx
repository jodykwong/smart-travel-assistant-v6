/**
 * 智游助手v5.0 - 旅行计划展示页面（重构版）
 * 使用新的数据架构和组件系统
 */

import React, { useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { useTravelPlan, useTravelPlanValidation, useTravelPlanStats } from '../../hooks/useTravelPlan';
import { TravelPlanDisplay } from '../../components/travel-plan/TravelPlanDisplay';

export default function TravelPlanResultPageV2() {
  const router = useRouter();
  const { sessionId } = router.query;
  const reportRef = useRef<HTMLDivElement>(null);

  // 使用新的 Hook 系统
  const {
    plan,
    isLoading,
    error,
    createPlan,
    stats,
    cacheStats,
  } = useTravelPlan({
    serviceConfig: {
      cacheEnabled: true,
      cacheTTL: 3600,
      parseConfig: {
        enabledModules: ['accommodation', 'food', 'transport', 'tips'],
        strictMode: false,
        fallbackToDefault: true,
      },
    },
  });

  // 验证和统计
  const { isValid, validationErrors } = useTravelPlanValidation(plan);
  const planStats = useTravelPlanStats(plan);

  useEffect(() => {
    if (!sessionId) return;
    fetchAndCreateTravelPlan();
  }, [sessionId]);

  const fetchAndCreateTravelPlan = async () => {
    try {
      console.log('📋 获取旅行计划结果:', sessionId);

      const response = await fetch(`/api/v1/planning/sessions/${sessionId}`);
      const result = await response.json();

      if (result.success && result.data) {
        // 准备元数据
        const metadata = {
          id: sessionId as string,
          title: `${result.data.destination}深度游`,
          destination: result.data.destination,
          totalDays: result.data.totalDays || 0,
          startDate: result.data.startDate || '',
          endDate: result.data.endDate || '',
          totalCost: result.data.userPreferences?.budget || 12500,
          groupSize: result.data.userPreferences?.groupSize || 2,
        };

        // 获取LLM响应
        let llmResponse = '';
        if (result.data.result) {
          try {
            const sessionResult = typeof result.data.result === 'string' 
              ? JSON.parse(result.data.result) 
              : result.data.result;
            
            llmResponse = sessionResult.llmResponse || '';
          } catch (parseError) {
            console.warn('解析LLM响应失败:', parseError);
          }
        }

        // 使用新的服务创建结构化计划
        const success = await createPlan(llmResponse, metadata);
        
        if (success) {
          console.log('✅ 旅行计划创建成功');
        } else {
          console.error('❌ 旅行计划创建失败');
        }
      } else {
        throw new Error('获取旅行计划失败');
      }
    } catch (error) {
      console.error('❌ 获取旅行计划失败:', error);
    }
  };

  const handleGoBack = () => {
    router.push('/planning');
  };

  const handleSavePlan = () => {
    // TODO: 实现保存功能
    alert('保存功能开发中...');
  };

  const handleSharePlan = () => {
    if (navigator.share && plan) {
      navigator.share({
        title: plan.title,
        text: `查看我的${plan.destination}旅行计划`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  const handleEditPlan = () => {
    router.push(`/planning?sessionId=${sessionId}`);
  };

  const handleExportImage = async (format: 'png' | 'jpg' = 'png') => {
    if (!reportRef.current || !plan) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: reportRef.current.scrollWidth,
        height: reportRef.current.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const link = document.createElement('a');
      link.download = `${plan.destination}旅行计划_${new Date().toISOString().split('T')[0]}.${format}`;

      if (format === 'jpg') {
        link.href = canvas.toDataURL('image/jpeg', 0.9);
      } else {
        link.href = canvas.toDataURL('image/png');
      }

      link.click();
    } catch (error) {
      console.error('导出图片失败:', error);
      alert('导出失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">正在解析旅行计划...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            返回规划页面
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-file-alt text-gray-400 text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">暂无计划数据</h2>
          <p className="text-gray-600 mb-4">请重新生成旅行计划</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            返回规划页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{plan.title} - 智游助手</title>
        <meta name="description" content={`${plan.destination}旅行计划 - 智游助手为您精心规划`} />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50">
        {/* 顶部操作栏 */}
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={handleGoBack}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  <span>返回</span>
                </button>
                <div className="ml-6">
                  <h1 className="text-xl font-bold text-gray-900">{plan.title}</h1>
                  <p className="text-sm text-gray-600">{plan.destination} · {plan.totalDays}天{plan.groupSize}人</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* 统计信息 */}
                {planStats && (
                  <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
                    <span>{planStats.accommodationCount}个住宿</span>
                    <span>{planStats.restaurantCount}家餐厅</span>
                    <span>{planStats.transportOptionCount}种交通</span>
                    <span>{planStats.tipCount}条贴士</span>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEditPlan}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    编辑
                  </button>
                  <button
                    onClick={handleSharePlan}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <i className="fas fa-share mr-2"></i>
                    分享
                  </button>
                  <button
                    onClick={() => handleExportImage('png')}
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    <i className="fas fa-download mr-2"></i>
                    导出
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 验证错误提示 */}
        {!isValid && validationErrors.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
                <h3 className="font-medium text-yellow-800">数据验证警告</h3>
              </div>
              <ul className="mt-2 text-sm text-yellow-700">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 主要内容 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div ref={reportRef}>
            <TravelPlanDisplay data={plan} />
          </div>
        </div>

        {/* 调试信息（开发环境） */}
        {process.env.NODE_ENV === 'development' && stats && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <details className="bg-gray-100 rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-gray-900">
                调试信息 (开发环境)
              </summary>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div>解析统计: {stats.successfulModules}/{stats.totalModules} 模块成功</div>
                <div>错误数量: {stats.totalErrors}</div>
                <div>警告数量: {stats.totalWarnings}</div>
                <div>缓存状态: {cacheStats.enabled ? '启用' : '禁用'} ({cacheStats.size} 项)</div>
              </div>
            </details>
          </div>
        )}
      </div>
    </>
  );
}
