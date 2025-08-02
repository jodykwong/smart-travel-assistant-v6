/**
 * 智游助手v5.0 - 旅行计划展示页面
 * 优化版本：包含图片导出功能和增强的视觉设计
 */

import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
// TravelDataService 现在通过API调用，不需要直接导入
import { AccommodationData, FoodExperienceData, TransportationData, TravelTipsData } from '../../types/travel-plan';

interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  totalCost: number;
  groupSize: number;
  llmResponse?: string;
  createdAt: string;
}

// 格式化LLM响应内容
const formatLLMResponse = (content: string) => {
  if (!content) return '';

  // 将Markdown格式转换为JSX
  const lines = content.split('\n');
  const formattedContent: JSX.Element[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith('### ')) {
      // 三级标题
      formattedContent.push(
        <h3 key={index} className="text-xl font-bold text-gray-900 mt-6 mb-3 border-l-4 border-pink-500 pl-4">
          {line.replace('### ', '')}
        </h3>
      );
    } else if (line.startsWith('#### ')) {
      // 四级标题
      formattedContent.push(
        <h4 key={index} className="text-lg font-semibold text-gray-800 mt-4 mb-2">
          {line.replace('#### ', '')}
        </h4>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      // 粗体文本
      formattedContent.push(
        <p key={index} className="font-semibold text-gray-800 mb-2">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    } else if (line.startsWith('- ')) {
      // 列表项
      formattedContent.push(
        <div key={index} className="flex items-start mb-2">
          <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
          <span className="text-gray-700">{line.replace('- ', '')}</span>
        </div>
      );
    } else if (line.startsWith('---')) {
      // 分隔线
      formattedContent.push(
        <hr key={index} className="my-6 border-gray-200" />
      );
    } else if (line.trim() !== '') {
      // 普通段落
      formattedContent.push(
        <p key={index} className="text-gray-700 mb-3 leading-relaxed">
          {line}
        </p>
      );
    }
  });

  return <div className="space-y-2">{formattedContent}</div>;
};

// 提取行程概览信息
const extractOverview = (content: string) => {
  if (!content) return '';

  const lines = content.split('\n');
  const overviewLines: string[] = [];
  let dayDetailStarted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行
    if (!line) continue;

    // 检测是否开始每日详细安排
    if (line.includes('Day ') || (line.includes('第') && (line.includes('天') || line.includes('日')))) {
      dayDetailStarted = true;
      break;
    }

    // 如果还没开始每日详细安排，且行数不超过12行，则包含在概览中
    if (!dayDetailStarted && overviewLines.length < 12) {
      overviewLines.push(line);
    }
  }

  // 如果没有找到明显的概览信息，则取前8行作为概览
  if (overviewLines.length === 0) {
    return lines.slice(0, 8).join('\n');
  }

  return overviewLines.join('\n');
};

export default function TravelPlanResultPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // 功能模块数据状态
  const [accommodationData, setAccommodationData] = useState<AccommodationData | null>(null);
  const [foodData, setFoodData] = useState<FoodExperienceData | null>(null);
  const [transportData, setTransportData] = useState<TransportationData | null>(null);
  const [tipsData, setTipsData] = useState<TravelTipsData | null>(null);
  const [moduleDataLoading, setModuleDataLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    fetchTravelPlan();
  }, [sessionId]);

  // 验证DOM元素存在性（调试和诊断用）
  useEffect(() => {
    if (plan && !isLoading) {
      // 延迟检查，确保DOM已完全渲染
      const timer = setTimeout(() => {
        validateNavigationTargets();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [plan, isLoading]);

  const fetchTravelPlan = async () => {
    try {
      console.log('📋 获取旅行计划结果:', sessionId);

      const response = await fetch(`/api/v1/planning/sessions/${sessionId}`);
      const result = await response.json();

      if (result.success && result.data) {
        // 解析LLM响应
        let planData = {
          id: sessionId as string,
          title: `${result.data.destination}深度游`,
          destination: result.data.destination,
          totalDays: result.data.totalDays || 0,
          startDate: result.data.startDate || '',
          endDate: result.data.endDate || '',
          totalCost: 12500, // 默认预算
          groupSize: result.data.userPreferences?.groupSize || 2,
          llmResponse: '',
          createdAt: new Date().toISOString(),
        };

        // 尝试解析会话结果中的LLM响应
        if (result.data.result) {
          try {
            const sessionResult = typeof result.data.result === 'string' 
              ? JSON.parse(result.data.result) 
              : result.data.result;
            
            if (sessionResult.llmResponse) {
              planData.llmResponse = sessionResult.llmResponse;
            }
          } catch (parseError) {
            console.warn('解析LLM响应失败:', parseError);
          }
        }

        setPlan(planData);
        console.log('✅ 旅行计划加载成功');

        // 获取功能模块数据
        await fetchModuleData(planData.destination);

      } else {
        throw new Error('获取旅行计划失败');
      }
    } catch (error) {
      console.error('❌ 获取旅行计划失败:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取功能模块数据
  const fetchModuleData = async (destination: string) => {
    try {
      console.log('🔄 开始获取功能模块数据...');
      setModuleDataLoading(true);

      // 调用服务器端API而不是直接调用高德API
      const response = await fetch('/api/travel-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destination }),
      });

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }

      const moduleResults = await response.json();

      // 设置各模块数据
      if (moduleResults.accommodation.success) {
        setAccommodationData(moduleResults.accommodation.data);
        console.log('✅ 住宿数据加载成功');
      } else {
        console.warn('⚠️ 住宿数据加载失败，使用默认数据');
        setAccommodationData(moduleResults.accommodation.data); // 包含默认数据
      }

      if (moduleResults.food.success) {
        setFoodData(moduleResults.food.data);
        console.log('✅ 美食数据加载成功');
      } else {
        console.warn('⚠️ 美食数据加载失败，使用智能默认数据');
        // 确保使用智能默认数据而不是空数据
        setFoodData(moduleResults.food.data || {
          specialties: [`${destination}特色美食`, `${destination}传统小吃`, `${destination}地方菜系`],
          recommendedRestaurants: [],
          foodDistricts: [{
            name: `${destination}美食中心`,
            description: `${destination}主要美食聚集区域`,
            location: '市中心区域'
          }],
          budgetGuide: `${destination}人均消费: 经济型30-80元，中档80-200元，高端200-500元`,
          diningEtiquette: `在${destination}用餐时，建议尊重当地饮食文化，注意用餐礼仪`,
        });
      }

      if (moduleResults.transport.success) {
        setTransportData(moduleResults.transport.data);
        console.log('✅ 交通数据加载成功');
      } else {
        console.warn('⚠️ 交通数据加载失败，使用默认数据');
        setTransportData(moduleResults.transport.data);
      }

      if (moduleResults.tips.success) {
        setTipsData(moduleResults.tips.data);
        console.log('✅ 贴士数据加载成功');
      } else {
        console.warn('⚠️ 贴士数据加载失败，使用默认数据');
        setTipsData(moduleResults.tips.data);
      }

      console.log(`🎉 功能模块数据加载完成 (成功率: ${(moduleResults.overall.successRate * 100).toFixed(1)}%)`);

    } catch (error) {
      console.error('❌ 功能模块数据获取失败:', error);

      try {
        // 尝试获取智能默认数据（通过API）
        const fallbackResponse = await fetch('/api/intelligent-default-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ destination }),
        });

        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          const defaultResults = fallbackResult.data;

          setAccommodationData(defaultResults.accommodation);
          setFoodData(defaultResults.food);
          setTransportData(defaultResults.transport);
          setTipsData(defaultResults.tips);

          console.log('✅ 使用智能默认数据作为降级方案');
        } else {
          throw new Error('智能默认数据API调用失败');
        }
      } catch (fallbackError) {
        console.error('❌ 智能默认数据获取也失败:', fallbackError);

        // 最后的保底方案：基于目的地的最小可用数据
        setAccommodationData({
          recommendations: [],
          bookingTips: `建议提前预订${destination}的住宿，关注官方渠道获取最新信息`,
          priceRanges: [`${destination}经济型: 200-400元`, `${destination}舒适型: 400-800元`, `${destination}豪华型: 800元以上`],
          amenitiesComparison: [],
        });

        setFoodData({
          specialties: [`${destination}风味菜`, `${destination}特色小食`, `${destination}传统美食`],
          recommendedRestaurants: [],
          foodDistricts: [{
            name: `${destination}美食中心`,
            description: `${destination}主要美食聚集区域`,
            location: '市中心区域'
          }],
          budgetGuide: `${destination}人均消费: 经济型30-80元，中档80-200元，高端200-500元`,
          diningEtiquette: `在${destination}用餐时，建议尊重当地饮食文化，注意用餐礼仪`,
        });

        setTransportData({
          arrivalOptions: [],
          localTransport: [],
          transportCards: [],
          routePlanning: `建议在${destination}使用公共交通或打车软件`,
        });

        setTipsData({
          weather: [],
          cultural: [`尊重${destination}当地文化`, '遵守当地法规'],
          safety: ['保管好个人财物', '注意人身安全'],
          shopping: ['理性消费', '注意商品质量'],
          communication: ['学习基本用语', '准备翻译软件'],
          emergency: ['紧急电话: 110, 120, 119'],
        });
      }
    } finally {
      setModuleDataLoading(false);
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
    // TODO: 实现分享功能
    if (navigator.share) {
      navigator.share({
        title: plan?.title,
        text: `查看我的${plan?.destination}旅行计划`,
        url: window.location.href,
      });
    } else {
      // 复制链接到剪贴板
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  const handleEditPlan = () => {
    router.push(`/planning?sessionId=${sessionId}`);
  };

  // 修复核心功能模块无响应问题：智能滚动到指定区域（第二版）
  // 遵循"为失败而设计"原则，确保在任何情况下都能提供良好的用户体验
  const scrollToSection = (sectionId: string) => {
    console.log(`🔍 [导航] 尝试滚动到区域: ${sectionId}`);

    // 智能等待策略：如果元素不存在，等待一段时间后重试
    const attemptScroll = (retryCount = 0) => {
      const element = document.getElementById(sectionId);

      if (element) {
        console.log(`🎯 [导航] 找到目标元素: ${sectionId}`);
        console.log(`📍 [导航] 元素位置:`, {
          offsetTop: element.offsetTop,
          offsetHeight: element.offsetHeight,
          visible: element.offsetHeight > 0
        });

        // 平滑滚动到目标元素
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });

        // 增强的视觉反馈 - 多层次反馈机制
        const addVisualFeedback = () => {
          // 高亮边框
          element.classList.add('ring-4', 'ring-pink-400', 'ring-opacity-75', 'transition-all', 'duration-500');

          // 背景色变化
          const originalBg = element.style.backgroundColor;
          element.style.backgroundColor = 'rgba(236, 72, 153, 0.05)';

          // 轻微的缩放效果
          element.style.transform = 'scale(1.01)';
          element.style.transition = 'all 0.3s ease-in-out';

          // 恢复原状
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-pink-400', 'ring-opacity-75', 'transition-all', 'duration-500');
            element.style.backgroundColor = originalBg;
            element.style.transform = '';
            console.log(`✨ [导航] 视觉反馈已移除: ${sectionId}`);
          }, 2500);
        };

        // 延迟添加视觉反馈，确保滚动完成
        setTimeout(addVisualFeedback, 300);

        console.log(`✅ [导航] 成功滚动到: ${sectionId}`);
        return true;

      } else {
        console.warn(`⚠️ [导航] 元素未找到: ${sectionId} (尝试 ${retryCount + 1}/3)`);

        // 智能重试机制
        if (retryCount < 2) {
          console.log(`🔄 [导航] 等待500ms后重试...`);
          setTimeout(() => attemptScroll(retryCount + 1), 500);
          return false;
        } else {
          // 最终失败处理
          console.error(`❌ [导航] 最终失败: 无法找到元素 "${sectionId}"`);

          // 调试信息
          const allElements = document.querySelectorAll('[id]');
          const availableIds = Array.from(allElements).map(el => el.id).filter(id => id);
          console.log('📋 [导航] 当前页面所有ID:', availableIds);

          // 用户友好的错误处理
          handleScrollFailure(sectionId);
          return false;
        }
      }
    };

    return attemptScroll();
  };

  // 滚动失败处理函数 - 遵循KISS原则
  const handleScrollFailure = (sectionId: string) => {
    const sectionNames: Record<string, string> = {
      'overview': '行程概览',
      'daily-plan': '每日安排',
      'accommodation': '住宿推荐',
      'food': '美食体验',
      'transport': '交通指南',
      'tips': '实用贴士'
    };

    const sectionName = sectionNames[sectionId] || sectionId;

    // 检查是否是数据加载问题
    if (!plan.llmResponse && ['overview', 'daily-plan'].includes(sectionId)) {
      // 数据还在加载中
      alert(`"${sectionName}"正在生成中，请稍等片刻后再试。`);
    } else {
      // 其他未知错误
      const retry = confirm(
        `无法定位到"${sectionName}"部分。\n\n这可能是页面加载问题。\n\n点击"确定"刷新页面，点击"取消"继续浏览。`
      );
      if (retry) {
        window.location.reload();
      }
    }
  };

  // 通用加载状态组件 - 遵循DRY原则
  const LoadingPlaceholder: React.FC<{
    icon: string;
    title: string;
    color: string;
  }> = ({ icon, title, color }) => (
    <div className="text-center py-8">
      <div className={`w-16 h-16 bg-${color}-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse`}>
        <i className={`fas fa-${icon} text-${color}-400 text-xl`}></i>
      </div>
      <p className="text-gray-500">正在生成{title}...</p>
      <div className="mt-4 flex justify-center">
        <div className={`animate-spin rounded-full h-6 w-6 border-b-2 border-${color}-500`}></div>
      </div>
    </div>
  );

  // 验证导航目标元素是否存在
  const validateNavigationTargets = () => {
    console.log('🔍 开始验证导航目标元素...');

    const expectedTargets = [
      { id: 'overview', name: '行程概览' },
      { id: 'daily-plan', name: '每日安排' },
      { id: 'accommodation', name: '住宿推荐' },
      { id: 'food', name: '美食体验' },
      { id: 'transport', name: '交通指南' },
      { id: 'tips', name: '实用贴士' }
    ];

    const validationResults = expectedTargets.map(target => {
      const element = document.getElementById(target.id);
      const exists = !!element;

      console.log(`${exists ? '✅' : '❌'} ${target.name} (${target.id}):`,
        exists ? '存在' : '不存在');

      if (exists && element) {
        console.log(`   📍 位置: top=${element.offsetTop}, height=${element.offsetHeight}`);
        console.log(`   🎨 类名: ${element.className.substring(0, 50)}...`);
      }

      return { ...target, exists, element };
    });

    const missingTargets = validationResults.filter(result => !result.exists);

    if (missingTargets.length === 0) {
      console.log('🎉 所有导航目标元素都存在！');
    } else {
      console.warn('⚠️ 以下导航目标元素缺失:');
      missingTargets.forEach(target => {
        console.warn(`   - ${target.name} (${target.id})`);
      });
    }

    // 返回验证结果供其他函数使用
    return validationResults;
  };

  const handleExportImage = async (format: 'png' | 'jpg' = 'png') => {
    if (!reportRef.current || !plan) return;

    setIsExporting(true);
    try {
      // 创建导出专用的容器
      const exportElement = reportRef.current;

      // 配置html2canvas选项
      const canvas = await html2canvas(exportElement, {
        scale: 2, // 高分辨率
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: exportElement.scrollWidth,
        height: exportElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      // 转换为图片并下载
      const link = document.createElement('a');
      link.download = `${plan.destination}旅行计划_${new Date().toISOString().split('T')[0]}.${format}`;

      if (format === 'jpg') {
        link.href = canvas.toDataURL('image/jpeg', 0.9);
      } else {
        link.href = canvas.toDataURL('image/png');
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 显示成功提示
      alert('图片导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载您的旅行计划...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">加载失败</h1>
          <p className="text-gray-600 mb-4">{error || '未找到旅行计划'}</p>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
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
        <meta name="description" content={`您的${plan.destination}旅行计划已生成完成`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 导航栏 */}
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button onClick={handleGoBack} className="mr-4 text-gray-600 hover:text-pink-600">
                  <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <h1 className="text-2xl font-bold text-pink-600">
                  <i className="fas fa-compass mr-2"></i>智游助手
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSavePlan}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-pink-500 hover:text-pink-600 transition-all duration-200"
                >
                  <i className="fas fa-bookmark mr-1"></i>保存
                </button>
                <button
                  onClick={handleSharePlan}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-pink-500 hover:text-pink-600 transition-all duration-200"
                >
                  <i className="fas fa-share mr-1"></i>分享
                </button>
                <div className="relative group">
                  <button
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-pink-500 hover:text-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isExporting}
                  >
                    <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'} mr-1`}></i>
                    {isExporting ? '导出中...' : '导出'}
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button
                      onClick={() => handleExportImage('png')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                      disabled={isExporting}
                    >
                      <i className="fas fa-image mr-2"></i>PNG图片
                    </button>
                    <button
                      onClick={() => handleExportImage('jpg')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                      disabled={isExporting}
                    >
                      <i className="fas fa-file-image mr-2"></i>JPG图片
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleEditPlan}
                  className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors shadow-sm"
                >
                  <i className="fas fa-edit mr-1"></i>编辑
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero区域 */}
        <div className="relative h-80 overflow-hidden">
          {/* 背景渐变 */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600"></div>

          {/* 背景图片 */}
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop"
            alt={`${plan.destination}风光`}
            className="w-full h-full object-cover opacity-30"
          />

          {/* 装饰性几何图形 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 right-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 bg-white opacity-10 rounded-full"></div>
            <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white opacity-10 transform rotate-45"></div>
          </div>

          {/* 内容 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-center text-white max-w-4xl px-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1
                className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-100"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {plan.title}
              </motion.h1>
              <motion.p
                className="text-xl md:text-2xl opacity-90 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {plan.totalDays}天探索{plan.destination}风情
              </motion.p>
              <motion.div
                className="flex flex-wrap items-center justify-center gap-6 text-sm md:text-base"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <div className="flex items-center bg-white bg-opacity-20 rounded-full px-4 py-2 backdrop-blur-sm">
                  <i className="fas fa-calendar mr-2"></i>
                  {plan.startDate} - {plan.endDate}
                </div>
                <div className="flex items-center bg-white bg-opacity-20 rounded-full px-4 py-2 backdrop-blur-sm">
                  <i className="fas fa-users mr-2"></i>
                  {plan.groupSize}人
                </div>
                <div className="flex items-center bg-white bg-opacity-20 rounded-full px-4 py-2 backdrop-blur-sm">
                  <i className="fas fa-wallet mr-2"></i>
                  ¥{plan.totalCost.toLocaleString()}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* 主要内容 */}
        <div ref={reportRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* 侧边栏 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24 backdrop-blur-sm bg-opacity-95">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-map-marked-alt text-white text-xl"></i>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">行程概览</h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <i className="fas fa-calendar-alt text-blue-500 mr-2"></i>
                        <span className="text-gray-600 text-sm">总天数</span>
                      </div>
                      <span className="font-bold text-blue-600">{plan.totalDays}天</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <i className="fas fa-map-marker-alt text-green-500 mr-2"></i>
                        <span className="text-gray-600 text-sm">目的地</span>
                      </div>
                      <span className="font-bold text-green-600">{plan.destination}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <i className="fas fa-users text-purple-500 mr-2"></i>
                        <span className="text-gray-600 text-sm">人数</span>
                      </div>
                      <span className="font-bold text-purple-600">{plan.groupSize}人</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <i className="fas fa-wallet text-orange-500 mr-2"></i>
                        <span className="text-gray-600 text-sm">预计花费</span>
                      </div>
                      <span className="font-bold text-orange-600">¥{plan.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="my-6 border-t border-gray-100"></div>

                {/* 快速导航 */}
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-4 text-center">快速导航</h4>
                  <nav className="space-y-3">
                    <button onClick={() => scrollToSection('overview')} className="w-full group flex items-center p-3 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 transition-all duration-200">
                      <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                        <i className="fas fa-map-marked-alt text-white text-sm"></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-pink-600">行程概览</span>
                    </button>
                    <button onClick={() => scrollToSection('daily-plan')} className="w-full group flex items-center p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                        <i className="fas fa-calendar-day text-white text-sm"></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">每日安排</span>
                    </button>
                    <button onClick={() => scrollToSection('accommodation')} className="w-full group flex items-center p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-200">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                        <i className="fas fa-bed text-white text-sm"></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-green-600">住宿推荐</span>
                    </button>
                    <button onClick={() => scrollToSection('food')} className="w-full group flex items-center p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition-all duration-200">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                        <i className="fas fa-utensils text-white text-sm"></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">美食体验</span>
                    </button>
                    <button onClick={() => scrollToSection('transport')} className="w-full group flex items-center p-3 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 transition-all duration-200">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                        <i className="fas fa-car text-white text-sm"></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600">交通指南</span>
                    </button>
                    <button onClick={() => scrollToSection('tips')} className="w-full group flex items-center p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 transition-all duration-200">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                        <i className="fas fa-lightbulb text-white text-sm"></i>
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-yellow-600">实用贴士</span>
                    </button>
                  </nav>
                </div>

                <div className="my-6 border-t border-gray-100"></div>

                <div className="text-center bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-robot text-white text-lg"></i>
                  </div>
                  <div className="text-sm font-medium text-gray-700 mb-3">AI生成质量</div>
                  <div className="flex items-center justify-center space-x-1 mb-3">
                    {[1,2,3,4,5].map(star => (
                      <motion.i
                        key={star}
                        className="fas fa-star text-yellow-400 text-lg"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: star * 0.1 }}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 bg-white bg-opacity-50 rounded-full px-3 py-1 inline-block">
                    基于DeepSeek AI
                  </div>
                </div>
              </div>
            </div>

            {/* 主要内容区域 */}
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* 确保导航目标始终存在 - 遵循KISS原则 */}
                <div className="space-y-8">
                  {/* 行程概览 */}
                  <motion.div
                    id="overview"
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                          <i className="fas fa-map-marked-alt text-white text-lg"></i>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">行程概览</h2>
                          <p className="text-sm text-gray-600">总体路线和时间安排</p>
                        </div>
                      </div>

                      <div className="prose max-w-none">
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
                          {plan.llmResponse ? (
                            formatLLMResponse(extractOverview(plan.llmResponse))
                          ) : (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <i className="fas fa-map-marked-alt text-gray-400 text-xl"></i>
                              </div>
                              <p className="text-gray-500">正在生成行程概览...</p>
                              <div className="mt-4 flex justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* 每日安排 */}
                    <motion.div
                      id="daily-plan"
                      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                    >
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                          <i className="fas fa-calendar-day text-white text-lg"></i>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">每日详细安排</h2>
                          <p className="text-sm text-gray-600">具体的每日行程规划</p>
                        </div>
                      </div>

                      <div className="prose max-w-none">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                          {plan.llmResponse ? (
                            formatLLMResponse(plan.llmResponse)
                          ) : (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <i className="fas fa-calendar-day text-blue-400 text-xl"></i>
                              </div>
                              <p className="text-gray-500">正在生成每日详细安排...</p>
                              <div className="mt-4 flex justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>


                    </motion.div>

                    {/* 住宿推荐 */}
                    <motion.div
                      id="accommodation"
                      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    >
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                          <i className="fas fa-bed text-white text-lg"></i>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">住宿推荐</h2>
                          <p className="text-sm text-gray-600">精选酒店和住宿建议</p>
                        </div>
                      </div>

                      {accommodationData ? (
                        <div className="space-y-6">
                          {/* 预订建议 */}
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                            <div className="flex items-center mb-3">
                              <i className="fas fa-calendar-check text-green-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">预订建议</h4>
                            </div>
                            <p className="text-sm text-gray-700">{accommodationData.bookingTips}</p>
                          </div>

                          {/* 价格区间 */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                            <div className="flex items-center mb-3">
                              <i className="fas fa-dollar-sign text-blue-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">价格参考（人均每晚）</h4>
                            </div>
                            <div className="space-y-2">
                              {accommodationData.priceRanges.map((range, index) => (
                                <div key={index} className="text-sm text-gray-700 flex items-center">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                  {range}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 推荐住宿列表 */}
                          {accommodationData.recommendations.length > 0 && (
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-100">
                              <div className="flex items-center mb-4">
                                <i className="fas fa-hotel text-gray-600 text-lg mr-3"></i>
                                <h4 className="font-bold text-gray-900">推荐住宿</h4>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                {accommodationData.recommendations.slice(0, 4).map((hotel, index) => (
                                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                    <h5 className="font-semibold text-gray-900 mb-2">{hotel.name}</h5>
                                    <p className="text-sm text-gray-600 mb-2">{hotel.address}</p>
                                    {hotel.rating && (
                                      <div className="flex items-center mb-2">
                                        <div className="flex text-yellow-400 mr-2">
                                          {[...Array(5)].map((_, i) => (
                                            <i key={i} className={`fas fa-star ${i < Math.floor(hotel.rating) ? '' : 'text-gray-300'}`}></i>
                                          ))}
                                        </div>
                                        <span className="text-sm text-gray-600">{hotel.rating}</span>
                                      </div>
                                    )}
                                    {hotel.priceRange && (
                                      <p className="text-sm text-green-600 font-medium">{hotel.priceRange}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : moduleDataLoading ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <i className="fas fa-bed text-green-400 text-xl"></i>
                          </div>
                          <p className="text-gray-500">正在加载住宿推荐...</p>
                          <div className="mt-4 flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-exclamation-triangle text-gray-400 text-xl"></i>
                          </div>
                          <p className="text-gray-500">住宿数据暂时无法加载</p>
                        </div>
                      )}
                    </motion.div>

                    {/* 美食体验 */}
                    <motion.div
                      id="food"
                      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    >
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                          <i className="fas fa-utensils text-white text-lg"></i>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">美食体验</h2>
                          <p className="text-sm text-gray-600">当地特色美食和餐厅推荐</p>
                        </div>
                      </div>

                      {foodData ? (
                        <div className="space-y-6">
                          {/* 特色美食 */}
                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-100">
                            <div className="flex items-center mb-4">
                              <i className="fas fa-star text-yellow-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">特色美食</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {foodData.specialties.map((specialty, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg shadow-sm border border-yellow-200">
                                  <span className="text-sm font-medium text-gray-800">{specialty}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 推荐餐厅 */}
                          {foodData.recommendedRestaurants.length > 0 && (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                              <div className="flex items-center mb-4">
                                <i className="fas fa-store text-blue-600 text-lg mr-3"></i>
                                <h4 className="font-bold text-gray-900">推荐餐厅</h4>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                {foodData.recommendedRestaurants.slice(0, 4).map((restaurant, index) => (
                                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
                                    <h5 className="font-semibold text-gray-900 mb-2">{restaurant.name}</h5>
                                    <p className="text-sm text-gray-600 mb-2">{restaurant.address}</p>
                                    {restaurant.cuisine && (
                                      <p className="text-sm text-blue-600 mb-2">菜系: {restaurant.cuisine}</p>
                                    )}
                                    {restaurant.rating && (
                                      <div className="flex items-center">
                                        <div className="flex text-yellow-400 mr-2">
                                          {[...Array(5)].map((_, i) => (
                                            <i key={i} className={`fas fa-star ${i < Math.floor(restaurant.rating) ? '' : 'text-gray-300'}`}></i>
                                          ))}
                                        </div>
                                        <span className="text-sm text-gray-600">{restaurant.rating}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 美食街区 */}
                          {foodData.foodDistricts.length > 0 && (
                            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border border-red-100">
                              <div className="flex items-center mb-4">
                                <i className="fas fa-map-marker-alt text-red-600 text-lg mr-3"></i>
                                <h4 className="font-bold text-gray-900">美食街区</h4>
                              </div>
                              <div className="space-y-3">
                                {foodData.foodDistricts.map((district, index) => (
                                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
                                    <h5 className="font-semibold text-gray-900 mb-1">{district.name}</h5>
                                    <p className="text-sm text-gray-600 mb-1">{district.description}</p>
                                    <p className="text-sm text-red-600">位置: {district.location}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 预算指南 */}
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                            <div className="flex items-center mb-3">
                              <i className="fas fa-dollar-sign text-green-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">预算指南</h4>
                            </div>
                            <p className="text-sm text-gray-700">{foodData.budgetGuide}</p>
                          </div>

                          {/* 用餐礼仪 - 仅在有具体内容时显示 */}
                          {foodData.diningEtiquette &&
                           !foodData.diningEtiquette.includes('尊重当地饮食文化，注意用餐礼仪') &&
                           foodData.diningEtiquette.length > 20 && (
                            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-100">
                              <div className="flex items-center mb-3">
                                <i className="fas fa-heart text-purple-600 text-lg mr-3"></i>
                                <h4 className="font-bold text-gray-900">用餐礼仪</h4>
                              </div>
                              <p className="text-sm text-gray-700">{foodData.diningEtiquette}</p>
                            </div>
                          )}
                        </div>
                      ) : moduleDataLoading ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <i className="fas fa-utensils text-orange-400 text-xl"></i>
                          </div>
                          <p className="text-gray-500">正在加载美食推荐...</p>
                          <div className="mt-4 flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-exclamation-triangle text-gray-400 text-xl"></i>
                          </div>
                          <p className="text-gray-500">美食数据暂时无法加载</p>
                        </div>
                      )}
                    </motion.div>

                    {/* 交通指南 */}
                    <motion.div
                      id="transport"
                      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    >
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                          <i className="fas fa-car text-white text-lg"></i>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">交通指南</h2>
                          <p className="text-sm text-gray-600">出行方式和路线建议</p>
                        </div>
                      </div>

                      {transportData ? (
                        <div className="space-y-6">
                          {/* 到达方式 */}
                          {transportData.arrivalOptions.length > 0 && (
                            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-100">
                              <div className="flex items-center mb-4">
                                <i className="fas fa-route text-purple-600 text-lg mr-3"></i>
                                <h4 className="font-bold text-gray-900">到达方式</h4>
                              </div>
                              <div className="space-y-3">
                                {transportData.arrivalOptions.map((option, index) => (
                                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-purple-200">
                                    <div className="flex items-center mb-2">
                                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                                        <i className={`fas fa-${option.type === 'plane' ? 'plane' : option.type === 'train' ? 'train' : 'bus'} text-white text-sm`}></i>
                                      </div>
                                      <h5 className="font-semibold text-gray-900">{option.description}</h5>
                                    </div>
                                    <div className="ml-11 space-y-1">
                                      <p className="text-sm text-gray-600">时长: {option.duration}</p>
                                      <p className="text-sm text-gray-600">费用: {option.cost}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 当地交通 */}
                          {transportData.localTransport.length > 0 && (
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100">
                              <div className="flex items-center mb-4">
                                <i className="fas fa-map-signs text-indigo-600 text-lg mr-3"></i>
                                <h4 className="font-bold text-gray-900">当地交通</h4>
                              </div>
                              <div className="space-y-3">
                                {transportData.localTransport.map((transport, index) => (
                                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-indigo-200">
                                    <div className="flex items-center mb-2">
                                      <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
                                        <i className={`fas fa-${transport.type === 'taxi' ? 'taxi' : transport.type === 'subway' ? 'subway' : 'bus'} text-white text-sm`}></i>
                                      </div>
                                      <h5 className="font-semibold text-gray-900">{transport.name}</h5>
                                    </div>
                                    <p className="text-sm text-gray-600 ml-11">{transport.description}</p>
                                    {transport.price && (
                                      <p className="text-sm text-indigo-600 ml-11 font-medium">价格: {transport.price}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 交通卡 */}
                          {transportData.transportCards.length > 0 && (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                              <div className="flex items-center mb-4">
                                <i className="fas fa-credit-card text-green-600 text-lg mr-3"></i>
                                <h4 className="font-bold text-gray-900">交通卡</h4>
                              </div>
                              <div className="space-y-3">
                                {transportData.transportCards.map((card, index) => (
                                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                                    <h5 className="font-semibold text-gray-900 mb-1">{card.name}</h5>
                                    <p className="text-sm text-gray-600 mb-1">{card.description}</p>
                                    <p className="text-sm text-green-600 font-medium">{card.price}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 路线规划建议 */}
                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-100">
                            <div className="flex items-center mb-3">
                              <i className="fas fa-map text-yellow-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">路线规划建议</h4>
                            </div>
                            <p className="text-sm text-gray-700">{transportData.routePlanning}</p>
                          </div>
                        </div>
                      ) : moduleDataLoading ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <i className="fas fa-car text-purple-400 text-xl"></i>
                          </div>
                          <p className="text-gray-500">正在加载交通指南...</p>
                          <div className="mt-4 flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-exclamation-triangle text-gray-400 text-xl"></i>
                          </div>
                          <p className="text-gray-500">交通数据暂时无法加载</p>
                        </div>
                      )}
                    </motion.div>

                    {/* 实用贴士 */}
                    <motion.div
                      id="tips"
                      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                    >
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                          <i className="fas fa-lightbulb text-white text-lg"></i>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">实用贴士</h2>
                          <p className="text-sm text-gray-600">旅行注意事项和实用建议</p>
                        </div>
                      </div>

                      {tipsData ? (
                        <div className="space-y-6">
                          {/* 天气信息 */}
                          {tipsData.weather.length > 0 && (
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-100">
                              <div className="flex items-center mb-4">
                                <i className="fas fa-cloud-sun text-blue-600 text-lg mr-3"></i>
                                <h4 className="font-bold text-gray-900">天气信息</h4>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                {tipsData.weather.map((weather, index) => (
                                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-gray-900">{weather.date}</span>
                                      <span className="text-sm text-blue-600">{weather.weather}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                      <span>温度: {weather.temperature}</span>
                                      <span>风力: {weather.wind}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 文化礼仪 */}
                          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-100">
                            <div className="flex items-center mb-4">
                              <i className="fas fa-heart text-purple-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">文化礼仪</h4>
                            </div>
                            <div className="space-y-2">
                              {tipsData.cultural.map((tip, index) => (
                                <div key={index} className="flex items-start">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                  <span className="text-sm text-gray-700">{tip}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 安全提示 */}
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                            <div className="flex items-center mb-4">
                              <i className="fas fa-shield-alt text-green-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">安全提示</h4>
                            </div>
                            <div className="space-y-2">
                              {tipsData.safety.map((tip, index) => (
                                <div key={index} className="flex items-start">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                  <span className="text-sm text-gray-700">{tip}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 购物建议 */}
                          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-100">
                            <div className="flex items-center mb-4">
                              <i className="fas fa-shopping-bag text-orange-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">购物建议</h4>
                            </div>
                            <div className="space-y-2">
                              {tipsData.shopping.map((tip, index) => (
                                <div key={index} className="flex items-start">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                  <span className="text-sm text-gray-700">{tip}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 沟通交流 */}
                          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-xl border border-yellow-100">
                            <div className="flex items-center mb-4">
                              <i className="fas fa-comments text-yellow-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">沟通交流</h4>
                            </div>
                            <div className="space-y-2">
                              {tipsData.communication.map((tip, index) => (
                                <div key={index} className="flex items-start">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                  <span className="text-sm text-gray-700">{tip}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 紧急联系 */}
                          <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border border-red-100">
                            <div className="flex items-center mb-4">
                              <i className="fas fa-phone text-red-600 text-lg mr-3"></i>
                              <h4 className="font-bold text-gray-900">紧急联系</h4>
                            </div>
                            <div className="space-y-2">
                              {tipsData.emergency.map((info, index) => (
                                <div key={index} className="flex items-start">
                                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                  <span className="text-sm text-gray-700 font-medium">{info}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : moduleDataLoading ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <i className="fas fa-lightbulb text-yellow-400 text-xl"></i>
                          </div>
                          <p className="text-gray-500">正在加载实用贴士...</p>
                          <div className="mt-4 flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-exclamation-triangle text-gray-400 text-xl"></i>
                          </div>
                          <p className="text-gray-500">贴士数据暂时无法加载</p>
                        </div>
                      )}
                    </motion.div>
                  </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
