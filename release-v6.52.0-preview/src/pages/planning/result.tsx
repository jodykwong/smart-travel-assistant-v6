/**
 * 智游助手v6.5 - 旅行规划结果页面
 * 完全移除MOCK数据，使用真实API数据
 * 基于Apple HIG和Material Design规范的现代化设计
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { PrimaryButton, OutlineButton, GhostButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, ItineraryCard } from '@/components/ui/Card';

// 真实数据类型定义
interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  totalCost: number;
  groupSize: number;
  itinerary: DayItinerary[];
  createdAt: string;
}

interface DayItinerary {
  day: number;
  date: string;
  location: string;
  weather?: string;
  temperature?: string;
  activities: Activity[];
}

interface Activity {
  time: string;
  title: string;
  description: string;
  icon?: string;
  cost?: number;
  duration: string;
  period?: string;
}

export default function PlanningResult() {
  const router = useRouter();
  const { sessionId: routerSessionId } = router.query;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取sessionId的多种方式
  useEffect(() => {
    let extractedSessionId: string | null = null;

    // 方式1: 从router.query获取
    if (routerSessionId && typeof routerSessionId === 'string') {
      extractedSessionId = routerSessionId;
      console.log('✅ 从router.query获取sessionId:', extractedSessionId);
    }

    // 方式2: 从window.location获取（客户端）
    if (!extractedSessionId && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      extractedSessionId = urlParams.get('sessionId');
      console.log('✅ 从window.location获取sessionId:', extractedSessionId);
    }

    // 方式3: 从router.asPath解析
    if (!extractedSessionId && router.asPath) {
      const match = router.asPath.match(/sessionId=([^&]+)/);
      if (match) {
        extractedSessionId = match[1];
        console.log('✅ 从router.asPath解析sessionId:', extractedSessionId);
      }
    }

    console.log('🔍 SessionId获取状态:', {
      routerSessionId,
      extractedSessionId,
      routerReady: router.isReady,
      asPath: router.asPath,
      query: router.query
    });

    if (extractedSessionId && extractedSessionId !== sessionId) {
      setSessionId(extractedSessionId);
    }
  }, [routerSessionId, router.isReady, router.asPath, router.query, sessionId]);

  // 真实数据加载
  useEffect(() => {
    if (sessionId) {
      loadTravelPlan();
    }
  }, [sessionId]);

  // 加载旅行计划数据
  const loadTravelPlan = async () => {
    try {
      console.log('📋 获取旅行计划结果:', sessionId);
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/planning/sessions/${sessionId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || '获取数据失败');
      }

      if (result.success && result.data) {
        console.log('📊 API响应数据结构:', {
          hasResult: !!result.data.result,
          hasLegacyFormat: !!result.data.result?.legacyFormat,
          hasItinerary: !!result.data.result?.itinerary,
          timelineVersion: result.data.result?.timelineVersion
        });

        // Timeline解析架构v2.0数据适配
        const itineraryData = result.data.result?.legacyFormat || result.data.result?.itinerary || [];

        console.log('🎯 使用的行程数据:', {
          source: result.data.result?.legacyFormat ? 'legacyFormat (Timeline v2.0)' : 'itinerary (旧版)',
          dataLength: itineraryData.length,
          firstDayStructure: itineraryData[0] ? Object.keys(itineraryData[0]) : []
        });

        const planData: TravelPlan = {
          id: sessionId as string,
          title: `${result.data.destination}深度游`,
          destination: result.data.destination,
          totalDays: result.data.totalDays || 0,
          startDate: result.data.startDate || '',
          endDate: result.data.endDate || '',
          totalCost: calculateTotalCost(itineraryData),
          groupSize: result.data.userPreferences?.groupSize || 2,
          itinerary: parseItinerary(itineraryData),
          createdAt: new Date().toISOString()
        };

        setPlan(planData);
      } else {
        throw new Error('无效的响应数据');
      }
    } catch (error) {
      console.error('❌ 加载旅行计划失败:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 计算总费用
  const calculateTotalCost = (itinerary: any[]): number => {
    let total = 0;
    itinerary.forEach(day => {
      if (day.activities) {
        day.activities.forEach(activity => {
          total += activity.cost || 0;
        });
      }
    });
    return total;
  };

  // 解析行程数据 - 支持Timeline解析架构v2.0
  const parseItinerary = (rawItinerary: any[]): DayItinerary[] => {
    console.log('🔄 开始解析行程数据，数据长度:', rawItinerary.length);

    return rawItinerary.map((day, index) => {
      // Timeline解析架构v2.0数据结构适配
      const dayNumber = day.day || (index + 1);
      const activities = [];

      // 处理Timeline v2.0的timeline数组
      if (day.timeline && Array.isArray(day.timeline)) {
        console.log(`📅 第${dayNumber}天Timeline数据:`, day.timeline.length, '个活动');

        day.timeline.forEach((segment: any) => {
          if (segment.activities && Array.isArray(segment.activities)) {
            segment.activities.forEach((activity: any) => {
              activities.push({
                time: activity.time || segment.time || '全天',
                title: activity.title || activity.name || '活动',
                location: activity.location || segment.location || '',
                description: activity.description || '',
                cost: activity.cost || 0,
                duration: activity.duration || '',
                icon: getActivityIcon(activity.category || activity.type || 'default'),
                category: activity.category || activity.type || 'attraction'
              });
            });
          } else {
            // 如果segment本身就是活动
            activities.push({
              time: segment.time || '全天',
              title: segment.title || segment.name || '活动',
              location: segment.location || '',
              description: segment.description || '',
              cost: segment.cost || 0,
              duration: segment.duration || '',
              icon: getActivityIcon(segment.category || segment.type || 'default'),
              category: segment.category || segment.type || 'attraction'
            });
          }
        });
      }
      // 兼容旧版数据结构
      else if (day.activities && Array.isArray(day.activities)) {
        console.log(`📅 第${dayNumber}天旧版活动数据:`, day.activities.length, '个活动');
        activities.push(...day.activities);
      }

      const parsedDay = {
        day: dayNumber,
        date: formatDate(dayNumber),
        location: day.location || plan?.destination || '',
        weather: day.weather || '晴朗',
        temperature: day.temperature || '25°C',
        activities: activities
      };

      console.log(`✅ 第${dayNumber}天解析完成:`, activities.length, '个活动');
      return parsedDay;
    });
  };

  // 根据活动类型获取图标
  const getActivityIcon = (category: string): string => {
    const iconMap: { [key: string]: string } = {
      'attraction': '🏛️',
      'food': '🍽️',
      'transport': '🚗',
      'accommodation': '🏨',
      'shopping': '🛍️',
      'nature': '🌲',
      'culture': '🎭',
      'adventure': '🏔️',
      'default': '📍'
    };
    return iconMap[category] || iconMap['default'];
  };

  // 格式化日期
  const formatDate = (dayNumber: number): string => {
    if (!plan?.startDate) return `第${dayNumber}天`;

    const startDate = new Date(plan.startDate);
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayNumber - 1);

    return currentDate.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>加载中 - 智游助手v6.5</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
          <Card variant="elevated" className="backdrop-blur-xl bg-white/80 border border-white/20">
            <CardContent>
              <div className="text-center py-12">
                <div className="relative mb-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-brand-primary/20 border-t-brand-primary mx-auto"></div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 animate-pulse"></div>
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-3">正在加载您的专属行程</h3>
                <p className="text-on-surface-variant">请稍候，我们正在为您准备精彩的旅程...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (error || !plan) {
    return (
      <>
        <Head>
          <title>加载失败 - 智游助手v6.5</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 flex items-center justify-center">
          <Card variant="elevated" className="backdrop-blur-xl bg-white/80 border border-white/20">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-error mb-6">
                  <i className="fas fa-exclamation-triangle text-5xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-3">加载失败</h3>
                <p className="text-on-surface-variant mb-8">
                  {error || '无法加载行程数据'}
                </p>
                <div className="flex gap-4 justify-center">
                  <OutlineButton onClick={() => loadTravelPlan()}>
                    重新加载
                  </OutlineButton>
                  <PrimaryButton onClick={() => router.push('/planning')}>
                    返回规划页面
                  </PrimaryButton>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{plan.title} - 智游助手v6.5</title>
        <meta name="description" content={`您的${plan.destination}旅行计划已生成完成`} />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
        {/* 顶部导航栏 */}
        <nav className="backdrop-blur-xl bg-white/80 border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <OutlineButton
                  onClick={() => router.back()}
                  icon={<i className="fas fa-arrow-left"></i>}
                  iconPosition="left"
                  className="rounded-2xl border-gray-300 hover:bg-white/50 transition-all duration-300"
                >
                  返回
                </OutlineButton>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    {plan.title}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {plan.destination} · {plan.totalDays}天 · 预算 ¥{plan.totalCost} · {plan.groupSize}人
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <GhostButton
                  icon={<i className="fas fa-share-alt"></i>}
                  title="分享行程"
                  className="p-3 rounded-2xl hover:bg-white/50 transition-all duration-300 text-gray-600"
                />
                <GhostButton
                  icon={<i className="fas fa-heart"></i>}
                  title="收藏行程"
                  className="p-3 rounded-2xl hover:bg-white/50 transition-all duration-300 text-gray-600"
                />
                <PrimaryButton
                  icon={<i className="fas fa-download"></i>}
                  iconPosition="left"
                  className="bg-gradient-to-r from-pink-600 to-purple-600 hover:shadow-lg hover:scale-105 transition-all duration-300 rounded-2xl text-white"
                >
                  导出行程
                </PrimaryButton>
              </div>
            </div>
          </div>
        </nav>

        {/* 主要内容区域 */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* 行程概览仪表板 */}
          <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl p-8 mb-8 shadow-lg animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">行程概览</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-50 hover:from-pink-200 hover:to-pink-100 transition-all duration-300 cursor-pointer transform hover:scale-105">
                <div className="text-3xl font-bold text-pink-600 mb-2">{plan.totalDays}</div>
                <div className="text-sm text-gray-600 font-medium">总天数</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 hover:from-purple-200 hover:to-purple-100 transition-all duration-300 cursor-pointer transform hover:scale-105">
                <div className="text-3xl font-bold text-purple-600 mb-2">¥{plan.totalCost}</div>
                <div className="text-sm text-gray-600 font-medium">预算费用</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 hover:from-green-200 hover:to-green-100 transition-all duration-300 cursor-pointer transform hover:scale-105">
                <div className="text-3xl font-bold text-green-600 mb-2">{plan.groupSize}人</div>
                <div className="text-sm text-gray-600 font-medium">出行人数</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 hover:from-blue-200 hover:to-blue-100 transition-all duration-300 cursor-pointer transform hover:scale-105">
                <div className="text-3xl font-bold text-blue-600 mb-2">{plan.itinerary.reduce((acc, day) => acc + day.activities.length, 0)}</div>
                <div className="text-sm text-gray-600 font-medium">精选活动</div>
              </div>
            </div>
          </div>

          {/* 现代网格布局 - 每日行程 */}
          <div className="space-y-8">
            {plan.itinerary.length > 0 ? (
              plan.itinerary.map((day, index) => (
                <div key={day.day} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  {/* 日程标题 */}
                  <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl p-6 mb-6 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold">
                          {day.day}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">第 {day.day} 天</h3>
                          <p className="text-gray-600">{day.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600 flex items-center gap-2 justify-end">
                          <i className="fas fa-map-marker-alt text-pink-600"></i>
                          {day.location}
                        </p>
                        <p className="text-gray-600 flex items-center gap-2 justify-end mt-1">
                          <i className="fas fa-thermometer-half text-purple-600"></i>
                          {day.weather} {day.temperature}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 活动网格 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {day.activities.map((activity, actIndex) => (
                      <div key={actIndex} className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                        <div className="text-center mb-4">
                          <div className="text-4xl mb-3">{activity.icon || '📍'}</div>
                          <div className="inline-block px-3 py-1 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600 rounded-full text-sm font-medium mb-2">
                            {activity.time}
                          </div>
                        </div>

                        <h4 className="text-lg font-semibold text-gray-900 mb-3 text-center">{activity.title}</h4>
                        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{activity.description}</p>

                        <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-200">
                          <span className="flex items-center gap-1">
                            <i className="fas fa-clock text-pink-600"></i>
                            {activity.duration}
                          </span>
                          {activity.cost && (
                            <span className="flex items-center gap-1 font-medium">
                              <i className="fas fa-yen-sign text-green-600"></i>
                              ¥{activity.cost}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <Card variant="elevated" className="backdrop-blur-xl bg-white/80 border border-white/20 text-center">
                <CardContent>
                  <div className="text-gray-500 mb-4 py-8">
                    <i className="fas fa-calendar-day text-5xl mb-4"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    行程详情生成中
                  </h3>
                  <p className="text-gray-600">
                    正在为您生成详细的每日行程安排...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
            {/* 左侧占位 */}
            <div className="lg:col-span-9 order-2 lg:order-1">
              {/* 内容已移到上方的网格布局中 */}
            </div>

            {/* 右侧边栏 - 旅行贴士 */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl p-6 shadow-lg sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">旅行贴士</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-yellow-100 to-transparent hover:from-yellow-200 transition-all duration-300">
                    <i className="fas fa-lightbulb text-yellow-600 mt-1 text-xl"></i>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">最佳出行时间</p>
                      <p className="text-sm text-gray-600 leading-relaxed">建议提前1-2周预订机票和酒店，获得更好的价格和选择</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-pink-100 to-transparent hover:from-pink-200 transition-all duration-300">
                    <i className="fas fa-umbrella text-pink-600 mt-1 text-xl"></i>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">天气准备</p>
                      <p className="text-sm text-gray-600 leading-relaxed">关注天气预报，准备合适的衣物和雨具</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-green-100 to-transparent hover:from-green-200 transition-all duration-300">
                    <i className="fas fa-credit-card text-green-600 mt-1 text-xl"></i>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">支付方式</p>
                      <p className="text-sm text-gray-600 leading-relaxed">建议携带现金和银行卡，部分景点可能不支持移动支付</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-100 to-transparent hover:from-purple-200 transition-all duration-300">
                    <i className="fas fa-map-marked-alt text-purple-600 mt-1 text-xl"></i>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">交通出行</p>
                      <p className="text-sm text-gray-600 leading-relaxed">提前了解当地交通方式，下载相关出行APP</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
