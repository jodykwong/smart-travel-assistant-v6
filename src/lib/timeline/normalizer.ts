/**
 * Timeline解析架构 - 规范化层
 * 将各种解析器输出映射为统一的DayPlan格式
 */

import type { DayPlan, Segment, Activity, ParseContext, LegacyDayActivity, LegacyTimelineItem } from './types';

/**
 * 规范化LLM结构化输出
 */
export function normalizeLLMOutput(data: any, context: ParseContext): DayPlan[] {
  if (!data || !data.days || !Array.isArray(data.days)) {
    throw new Error('Invalid LLM output structure');
  }

  return data.days.map((day: any, index: number) => {
    const dayDate = calculateDayDate(context.startDate, day.day - 1);
    
    return {
      day: day.day || (index + 1),
      title: sanitizeTitle(day.title || `第${day.day || (index + 1)}天`),
      date: dayDate,
      segments: normalizeSegments(day.segments || []),
      location: context.destination,
      weather: generateWeatherInfo(day.day || (index + 1), context.destination),
      totalCost: calculateTotalCost(day.segments || []),
      progress: Math.floor(Math.random() * 30) + 70,
      image: '', // 将由图片服务填充
      tags: extractTags(day.title, day.segments),
    };
  });
}

/**
 * 规范化Markdown解析输出
 */
export function normalizeMarkdownOutput(data: any, context: ParseContext): DayPlan[] {
  if (!Array.isArray(data)) {
    throw new Error('Invalid markdown output structure');
  }

  return data.map((day: any, index: number) => {
    const dayDate = calculateDayDate(context.startDate, index);
    
    return {
      day: index + 1,
      title: sanitizeTitle(day.title || `第${index + 1}天`),
      date: dayDate,
      segments: normalizeSegments(day.segments || []),
      location: context.destination,
      weather: generateWeatherInfo(index + 1, context.destination),
      totalCost: calculateTotalCost(day.segments || []),
      progress: Math.floor(Math.random() * 30) + 70,
      image: '',
      tags: extractTags(day.title, day.segments),
    };
  });
}

/**
 * 规范化数字列表解析输出
 */
export function normalizeNumberedListOutput(data: any, context: ParseContext): DayPlan[] {
  if (!Array.isArray(data)) {
    throw new Error('Invalid numbered list output structure');
  }

  return data.map((day: any, index: number) => {
    const dayDate = calculateDayDate(context.startDate, index);
    
    return {
      day: index + 1,
      title: sanitizeTitle(day.title || `第${index + 1}天`),
      date: dayDate,
      segments: normalizeSegments(day.segments || []),
      location: context.destination,
      weather: generateWeatherInfo(index + 1, context.destination),
      totalCost: calculateTotalCost(day.segments || []),
      progress: Math.floor(Math.random() * 30) + 70,
      image: '',
      tags: extractTags(day.title, day.segments),
    };
  });
}

/**
 * 将新格式转换为兼容旧系统的格式
 */
export function convertToLegacyFormat(dayPlans: DayPlan[]): LegacyDayActivity[] {
  return dayPlans.map(day => ({
    day: day.day,
    title: day.title,
    date: day.date,
    weather: day.weather?.condition || '晴朗',
    temperature: day.weather?.temperature || '25°C',
    location: day.location || '',
    cost: day.totalCost || 0,
    progress: day.progress || 80,
    image: day.image || '',
    tags: day.tags || [],
    timeline: convertSegmentsToTimeline(day.segments),
  }));
}

/**
 * 规范化时段数据
 */
function normalizeSegments(segments: any[]): Segment[] {
  return segments.map(segment => ({
    period: normalizePeriod(segment.period),
    time: normalizeTime(segment.time),
    activities: normalizeActivities(segment.activities || []),
  }));
}

/**
 * 规范化活动数据
 */
function normalizeActivities(activities: any[]): Activity[] {
  return activities.map(activity => ({
    title: sanitizeTitle(activity.title || '未命名活动'),
    description: activity.description || activity.desc || '',
    cost: typeof activity.cost === 'number' ? activity.cost : undefined,
    duration: activity.duration || '约2-3小时',
    tips: Array.isArray(activity.tips) ? activity.tips : [],
    location: activity.location,
    icon: activity.icon || getDefaultIcon(activity.title),
  }));
}

/**
 * 规范化时段标识
 */
function normalizePeriod(period: string): 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' {
  const periodMap: Record<string, 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'> = {
    '上午': 'morning',
    '早上': 'morning',
    '中午': 'noon',
    '午餐': 'noon',
    '下午': 'afternoon',
    '傍晚': 'evening',
    '晚上': 'night',
    '晚餐': 'evening',
    'morning': 'morning',
    'noon': 'noon',
    'afternoon': 'afternoon',
    'evening': 'evening',
    'night': 'night',
  };

  return periodMap[period] || 'morning';
}

/**
 * 规范化时间格式
 */
function normalizeTime(time: string): string {
  if (!time) return '09:00-12:00';
  
  // 如果已经是标准格式，直接返回
  if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(time)) {
    return time;
  }
  
  // 尝试解析其他格式
  const timeMatch = time.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2];
    const endHour = Math.min(hour + 3, 23);
    return `${hour.toString().padStart(2, '0')}:${minute}-${endHour.toString().padStart(2, '0')}:${minute}`;
  }
  
  return '09:00-12:00';
}

/**
 * 清理标题文本
 */
function sanitizeTitle(title: string): string {
  if (!title) return '';
  
  return title
    .replace(/\*\*|#+|__|~~|`/g, '') // 移除Markdown标记
    .replace(/^Day\s*\d+[：:]\s*/i, '') // 移除"Day 1："前缀
    .replace(/^\d+\.\s*\*\*[^*]*\*\*[：:]\s*/i, '') // 移除"1. **午餐**："格式
    .replace(/^\d+\.\s*[^：:]*[：:]\s*/i, '') // 移除"1. 早餐："格式
    .trim()
    .slice(0, 60); // 限制长度
}

/**
 * 计算日期
 */
function calculateDayDate(startDate: string | undefined, dayOffset: number): string {
  const date = startDate ? new Date(startDate) : new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toLocaleDateString('zh-CN', { 
    month: 'long', 
    day: 'numeric', 
    weekday: 'short' 
  });
}

/**
 * 生成天气信息
 */
function generateWeatherInfo(day: number, destination: string) {
  const conditions = ['晴朗', '多云', '阴天'];
  const temperatures = ['22°C', '24°C', '26°C', '25°C'];
  
  return {
    condition: conditions[day % conditions.length],
    temperature: temperatures[day % temperatures.length],
    icon: '☀️',
  };
}

/**
 * 计算总费用
 */
function calculateTotalCost(segments: any[]): number {
  let total = 0;
  segments.forEach(segment => {
    if (segment.activities) {
      segment.activities.forEach((activity: any) => {
        if (typeof activity.cost === 'number') {
          total += activity.cost;
        }
      });
    }
  });
  return total;
}

/**
 * 提取标签
 */
function extractTags(title: string, segments: any[]): string[] {
  const tags: string[] = [];
  
  if (title?.includes('文化') || title?.includes('历史')) {
    tags.push('文化古迹');
  }
  if (title?.includes('美食') || title?.includes('餐')) {
    tags.push('特色美食');
  }
  if (title?.includes('自然') || title?.includes('公园')) {
    tags.push('自然风光');
  }
  if (title?.includes('购物')) {
    tags.push('购物体验');
  }
  
  return tags;
}

/**
 * 获取默认图标
 */
function getDefaultIcon(title: string): string {
  if (title?.includes('餐') || title?.includes('食')) return '🍜';
  if (title?.includes('景') || title?.includes('游')) return '🏛️';
  if (title?.includes('购物')) return '🛍️';
  if (title?.includes('交通')) return '🚗';
  return '📍';
}

/**
 * 转换时段为旧系统的timeline格式
 */
function convertSegmentsToTimeline(segments: Segment[]): LegacyTimelineItem[] {
  const timeline: LegacyTimelineItem[] = [];
  
  segments.forEach(segment => {
    segment.activities.forEach(activity => {
      timeline.push({
        time: segment.time,
        period: segment.period,
        title: activity.title,
        description: activity.description,
        icon: activity.icon || '📍',
        cost: activity.cost || 0,
        duration: activity.duration || '约2-3小时',
        color: getPeriodColor(segment.period),
      });
    });
  });
  
  return timeline;
}

/**
 * 获取时段颜色
 */
function getPeriodColor(period: string): string {
  const colorMap: Record<string, string> = {
    'morning': 'from-yellow-400 to-orange-500',
    'noon': 'from-orange-400 to-red-500',
    'afternoon': 'from-blue-400 to-indigo-500',
    'evening': 'from-purple-400 to-pink-500',
    'night': 'from-indigo-500 to-purple-600',
  };
  
  return colorMap[period] || 'from-gray-400 to-gray-500';
}
