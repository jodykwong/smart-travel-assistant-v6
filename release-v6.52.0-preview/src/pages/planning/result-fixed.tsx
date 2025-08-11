/**
 * 智游助手v6.5 - 旅行规划结果页面（修复版）
 * 使用标准化设计系统组件
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { PrimaryButton, OutlineButton, GhostButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, ItineraryCard } from '@/components/ui/Card';

// 类型定义
interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  duration: string;
  totalCost: number;
  activities: DayActivity[];
}

interface DayActivity {
  day: number;
  date: string;
  title: string;
  location: string;
  weather: string;
  temperature: string;
  cost: number;
  image: string;
  tags: Array<{
    text: string;
    color: string;
    icon: string;
  }>;
  timeline: Array<{
    time: string;
    title: string;
    description: string;
    icon: string;
    cost: number;
    duration: string;
    period: string;
  }>;
}

export default function PlanningResult() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  // 模拟数据加载
  useEffect(() => {
    if (sessionId) {
      // 模拟API调用
      setTimeout(() => {
        const mockPlan: TravelPlan = {
          id: sessionId as string,
          title: '杭州3日深度游',
          destination: '杭州',
          duration: '3天2夜',
          totalCost: 1200,
          activities: [
            {
              day: 1,
              date: '8月11日周日',
              title: '西湖文化之旅',
              location: '杭州西湖',
              weather: '晴朗',
              temperature: '26°C',
              cost: 120,
              image: '/images/xihu.jpg',
              tags: [
                { text: '文化古迹', color: 'blue', icon: 'fas fa-landmark' },
                { text: '自然风光', color: 'green', icon: 'fas fa-leaf' }
              ],
              timeline: [
                {
                  time: '09:00-12:00',
                  title: '西湖晨游',
                  description: '漫步苏堤白堤，感受湖光山色\n• 参观断桥残雪，聆听白娘子传说\n💡 建议：清晨游览人少景美，适合拍照',
                  icon: '🌅',
                  cost: 0,
                  duration: '约3小时',
                  period: '上午'
                },
                {
                  time: '14:00-17:00',
                  title: '灵隐寺参观',
                  description: '探访千年古刹，感受佛教文化\n• 参观飞来峰石窟造像\n💰 门票：45元/人',
                  icon: '🏛️',
                  cost: 45,
                  duration: '约3小时',
                  period: '下午'
                }
              ]
            }
          ]
        };
        setPlan(mockPlan);
        setIsLoading(false);
      }, 1000);
    }
  }, [sessionId]);

  const toggleDay = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>加载中 - 智游助手v6.5</title>
        </Head>
        <div className="min-h-screen bg-md-background flex items-center justify-center">
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-md-primary mx-auto mb-4"></div>
                <h3 className="text-md-headline-small font-semibold text-md-on-surface mb-2">正在加载行程</h3>
                <p className="text-md-body-medium text-md-on-surface-variant">请稍候...</p>
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
        <div className="min-h-screen bg-md-background flex items-center justify-center">
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-8">
                <div className="text-md-error mb-4">
                  <i className="fas fa-exclamation-triangle text-4xl"></i>
                </div>
                <h3 className="text-md-headline-small font-semibold text-md-on-surface mb-2">加载失败</h3>
                <p className="text-md-body-medium text-md-on-surface-variant mb-4">
                  {error || '无法加载行程数据'}
                </p>
                <PrimaryButton onClick={() => router.push('/planning')}>
                  返回规划页面
                </PrimaryButton>
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

      <div className="min-h-screen bg-md-background">
        {/* 顶部导航栏 */}
        <nav className="bg-md-surface border-b border-md-outline sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <OutlineButton
                  onClick={() => router.back()}
                  icon={<i className="fas fa-arrow-left"></i>}
                  iconPosition="left"
                >
                  返回
                </OutlineButton>
                <div>
                  <h1 className="text-md-headline-medium font-bold text-md-on-surface">
                    {plan.title}
                  </h1>
                  <p className="text-md-body-medium text-md-on-surface-variant">
                    {plan.destination} · {plan.duration} · 预算 ¥{plan.totalCost}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <GhostButton
                  icon={<i className="fas fa-share-alt"></i>}
                  title="分享行程"
                />
                <GhostButton
                  icon={<i className="fas fa-heart"></i>}
                  title="收藏行程"
                />
                <PrimaryButton
                  icon={<i className="fas fa-download"></i>}
                  iconPosition="left"
                >
                  导出行程
                </PrimaryButton>
              </div>
            </div>
          </div>
        </nav>

        {/* 主要内容区域 */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* 左侧行程列表 */}
            <div className="lg:col-span-9 order-2 lg:order-1">
              <div className="space-y-6">
                {plan.activities.length > 0 ? (
                  plan.activities.map((activity) => (
                    <ItineraryCard
                      key={activity.day}
                      id={`day-${activity.day}`}
                      day={activity.day}
                      date={activity.date}
                      weather={activity.weather}
                      temperature={activity.temperature}
                      location={activity.location}
                      cost={activity.cost}
                      activities={activity.timeline}
                      interactive
                      className="animate-fade-in"
                    />
                  ))
                ) : (
                  <Card variant="elevated" className="text-center">
                    <CardContent>
                      <div className="text-md-on-surface-variant mb-4">
                        <i className="fas fa-calendar-day text-4xl mb-4"></i>
                      </div>
                      <h3 className="text-md-headline-medium font-semibold text-md-on-surface mb-2">
                        行程详情生成中
                      </h3>
                      <p className="text-md-body-medium text-md-on-surface-variant">
                        正在为您生成详细的每日行程安排...
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* 右侧边栏 - 旅行贴士 */}
            <div className="lg:col-span-3 order-3">
              <Card variant="elevated">
                <CardHeader title="旅行贴士" />
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <i className="fas fa-lightbulb text-yellow-500 mt-1"></i>
                      <div>
                        <p className="font-medium text-md-on-surface text-md-body-medium">最佳出行时间</p>
                        <p className="text-md-body-small text-md-on-surface-variant">建议提前1-2周预订机票和酒店</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <i className="fas fa-umbrella text-blue-500 mt-1"></i>
                      <div>
                        <p className="font-medium text-md-on-surface text-md-body-medium">天气准备</p>
                        <p className="text-md-body-small text-md-on-surface-variant">关注天气预报，准备合适的衣物</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <i className="fas fa-credit-card text-green-500 mt-1"></i>
                      <div>
                        <p className="font-medium text-md-on-surface text-md-body-medium">支付方式</p>
                        <p className="text-md-body-small text-md-on-surface-variant">建议携带现金和银行卡</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
