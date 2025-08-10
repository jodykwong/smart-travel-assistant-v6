/**
 * 智游助手v5.0 - 每日行程展示组件
 * 解决每日行程展示可读性问题
 * 
 * 设计原则：
 * - 信息架构：清晰的视觉层次
 * - KISS原则：简单直观的时间线设计
 * - 高内聚低耦合：独立的行程展示组件
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface DayActivity {
  time: string;
  activity: string;
  location?: string;
  type: 'sightseeing' | 'food' | 'transport' | 'accommodation' | 'other';
  duration?: string;
  cost?: string;
  tips?: string;
}

interface DayItinerary {
  day: number;
  date: string;
  title: string;
  activities: DayActivity[];
  summary: string;
}

interface DailyItinerarySectionProps {
  llmResponse?: string; // 保持向后兼容，但设为可选
  legacyFormat?: any[]; // 新增：Timeline解析架构v2.0的标准化数据
  startDate: string;
  totalDays: number;
  className?: string;
}

// 活动类型图标映射
const ACTIVITY_ICONS = {
  sightseeing: 'fas fa-camera',
  food: 'fas fa-utensils',
  transport: 'fas fa-car',
  accommodation: 'fas fa-bed',
  other: 'fas fa-map-marker-alt',
};

// 活动类型颜色映射
const ACTIVITY_COLORS = {
  sightseeing: 'from-blue-500 to-indigo-600',
  food: 'from-orange-500 to-red-600',
  transport: 'from-purple-500 to-violet-600',
  accommodation: 'from-green-500 to-emerald-600',
  other: 'from-gray-500 to-slate-600',
};

export const DailyItinerarySection: React.FC<DailyItinerarySectionProps> = ({
  llmResponse,
  legacyFormat,
  startDate,
  totalDays,
  className = '',
}) => {
  // Timeline解析架构v2.0：优先使用服务端解析的legacyFormat数据
  const dailyItineraries = useMemo(() => {
    if (legacyFormat && Array.isArray(legacyFormat) && legacyFormat.length > 0) {
      console.log('[DailyItinerarySection] 使用Timeline解析架构v2.0数据', {
        daysCount: legacyFormat.length,
        totalActivities: legacyFormat.reduce((sum: number, day: any) => sum + (day.timeline?.length || 0), 0)
      });
      return convertLegacyFormatToItineraries(legacyFormat);
    } else if (llmResponse) {
      console.log('[DailyItinerarySection] 回退到客户端解析', {
        contentLength: llmResponse.length
      });
      return parseDailyItineraries(llmResponse, startDate, totalDays);
    } else {
      console.warn('[DailyItinerarySection] 没有可用的数据源');
      return [];
    }
  }, [legacyFormat, llmResponse, startDate, totalDays]);

  if (dailyItineraries.length === 0) {
    return null;
  }

  return (
    <motion.div
      id="daily-itinerary"
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      {/* 标题区域 */}
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
          <i className="fas fa-calendar-alt text-white text-lg"></i>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">每日行程安排</h2>
          <p className="text-sm text-gray-600">详细的时间安排和活动规划</p>
        </div>
      </div>

      {/* 每日行程列表 */}
      <div className="space-y-8">
        {dailyItineraries.map((dayItinerary, index) => (
          <DayItineraryCard
            key={dayItinerary.day}
            dayItinerary={dayItinerary}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
};

// 单日行程卡片组件
const DayItineraryCard: React.FC<{
  dayItinerary: DayItinerary;
  index: number;
}> = ({ dayItinerary, index }) => {
  return (
    <motion.div
      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* 日期标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
            <span className="text-white font-bold text-sm">D{dayItinerary.day}</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{dayItinerary.title}</h3>
            <p className="text-sm text-gray-600">{formatDate(dayItinerary.date)}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">共{dayItinerary.activities.length}项活动</div>
        </div>
      </div>

      {/* 行程概要 */}
      {dayItinerary.summary && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-700 leading-relaxed">{dayItinerary.summary}</p>
        </div>
      )}

      {/* 活动时间线 */}
      <div className="relative">
        {/* 时间线 */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 to-purple-300"></div>
        
        {/* 活动列表 */}
        <div className="space-y-4">
          {dayItinerary.activities.map((activity, activityIndex) => (
            <ActivityItem
              key={activityIndex}
              activity={activity}
              isLast={activityIndex === dayItinerary.activities.length - 1}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// 活动项组件
const ActivityItem: React.FC<{
  activity: DayActivity;
  isLast: boolean;
}> = ({ activity, isLast }) => {
  return (
    <div className="relative flex items-start">
      {/* 时间线节点 */}
      <div className={`relative z-10 w-12 h-12 bg-gradient-to-br ${ACTIVITY_COLORS[activity.type]} rounded-full flex items-center justify-center shadow-lg`}>
        <i className={`${ACTIVITY_ICONS[activity.type]} text-white text-sm`}></i>
      </div>

      {/* 活动内容 */}
      <div className="ml-4 flex-1 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full mr-2">
                {activity.time}
              </span>
              {activity.duration && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {activity.duration}
                </span>
              )}
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">{activity.activity}</h4>
            {activity.location && (
              <p className="text-sm text-gray-600 flex items-center">
                <i className="fas fa-map-marker-alt text-gray-400 mr-1"></i>
                {activity.location}
              </p>
            )}
          </div>
          {activity.cost && (
            <div className="text-right">
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {activity.cost}
              </span>
            </div>
          )}
        </div>
        
        {activity.tips && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <i className="fas fa-lightbulb text-yellow-600 text-sm mt-0.5 mr-2"></i>
              <p className="text-sm text-yellow-800">{activity.tips}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 将Timeline解析架构v2.0的legacyFormat数据转换为组件格式
function convertLegacyFormatToItineraries(legacyFormat: any[]): DayItinerary[] {
  return legacyFormat.map(legacyDay => ({
    day: legacyDay.day,
    date: legacyDay.date,
    title: legacyDay.title,
    summary: `${legacyDay.location} - ${legacyDay.weather} ${legacyDay.temperature}`,
    activities: legacyDay.timeline.map((timelineItem: any) => ({
      time: timelineItem.time,
      activity: timelineItem.title,
      location: timelineItem.description,
      type: inferActivityTypeFromIcon(timelineItem.icon) as any,
      duration: timelineItem.duration,
      cost: timelineItem.cost > 0 ? `¥${timelineItem.cost}` : undefined,
      tips: undefined
    }))
  }));
}

// 从图标推断活动类型
function inferActivityTypeFromIcon(icon: string): string {
  if (icon.includes('camera') || icon.includes('eye')) return 'sightseeing';
  if (icon.includes('utensils') || icon.includes('coffee')) return 'food';
  if (icon.includes('car') || icon.includes('bus') || icon.includes('plane')) return 'transport';
  if (icon.includes('bed') || icon.includes('home')) return 'accommodation';
  return 'other';
}

// 解析每日行程的函数（回退方案）
function parseDailyItineraries(llmResponse: string, startDate: string, totalDays: number): DayItinerary[] {
  const itineraries: DayItinerary[] = [];
  const lines = llmResponse.split('\n');
  
  let currentDay: DayItinerary | null = null;
  let currentActivity: DayActivity | null = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 检测日期标题（Day 1, 第1天等）
    const dayMatch = trimmedLine.match(/(?:Day\s*(\d+)|第(\d+)[天日])[：:]?\s*(.*)/) || 
                    trimmedLine.match(/(\d+)\s*[\.、]\s*(.*)/);
    
    if (dayMatch) {
      // 保存上一天的数据
      if (currentDay) {
        if (currentActivity) {
          currentDay.activities.push(currentActivity);
        }
        itineraries.push(currentDay);
      }
      
      const dayNumber = parseInt(dayMatch[1] || dayMatch[2] || '1');
      const dayTitle = dayMatch[3] || dayMatch[2] || `第${dayNumber}天`;
      
      currentDay = {
        day: dayNumber,
        date: calculateDate(startDate, dayNumber - 1),
        title: dayTitle,
        activities: [],
        summary: '',
      };
      currentActivity = null;
      continue;
    }

    // 检测时间活动（09:00, 上午等）
    const timeMatch = trimmedLine.match(/^(\d{1,2}[:：]\d{2}|上午|下午|晚上|早上|中午)\s*[：:]?\s*(.+)/) ||
                     trimmedLine.match(/^[-•]\s*(\d{1,2}[:：]\d{2}|上午|下午|晚上|早上|中午)\s*[：:]?\s*(.+)/);
    
    if (timeMatch && currentDay) {
      // 保存上一个活动
      if (currentActivity) {
        currentDay.activities.push(currentActivity);
      }
      
      currentActivity = {
        time: timeMatch[1],
        activity: timeMatch[2],
        type: inferActivityType(timeMatch[2]),
      };
      continue;
    }

    // 检测活动详情
    if (currentActivity && currentDay) {
      if (trimmedLine.includes('地点') || trimmedLine.includes('位置')) {
        currentActivity.location = trimmedLine.replace(/^.*[地位]点[：:]?\s*/, '');
      } else if (trimmedLine.includes('费用') || trimmedLine.includes('价格')) {
        currentActivity.cost = trimmedLine.replace(/^.*[费价][用格][：:]?\s*/, '');
      } else if (trimmedLine.includes('建议') || trimmedLine.includes('提示') || trimmedLine.includes('注意')) {
        currentActivity.tips = trimmedLine.replace(/^.*[建提注][议示意][：:]?\s*/, '');
      } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        // 这可能是活动的补充信息
        currentActivity.activity += ' ' + trimmedLine.replace(/^[-•]\s*/, '');
      }
    } else if (currentDay && !currentActivity) {
      // 这可能是当天的概要信息
      if (trimmedLine.length > 10 && !trimmedLine.includes('Day') && !trimmedLine.includes('第')) {
        currentDay.summary = trimmedLine;
      }
    }
  }

  // 保存最后一天的数据
  if (currentDay) {
    if (currentActivity) {
      currentDay.activities.push(currentActivity);
    }
    itineraries.push(currentDay);
  }

  return itineraries.slice(0, totalDays); // 限制天数
}

// 推断活动类型
function inferActivityType(activity: string): DayActivity['type'] {
  const activityLower = activity.toLowerCase();
  
  if (activityLower.includes('餐') || activityLower.includes('食') || activityLower.includes('吃') || 
      activityLower.includes('lunch') || activityLower.includes('dinner') || activityLower.includes('breakfast')) {
    return 'food';
  }
  
  if (activityLower.includes('住') || activityLower.includes('酒店') || activityLower.includes('宾馆') ||
      activityLower.includes('hotel') || activityLower.includes('check')) {
    return 'accommodation';
  }
  
  if (activityLower.includes('车') || activityLower.includes('机场') || activityLower.includes('火车') ||
      activityLower.includes('地铁') || activityLower.includes('交通') || activityLower.includes('transport')) {
    return 'transport';
  }
  
  return 'sightseeing';
}

// 计算日期
function calculateDate(startDate: string, dayOffset: number): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().split('T')[0];
}

// 格式化日期显示
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  } catch {
    return dateString;
  }
}
