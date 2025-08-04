import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// 格式化内容组件 - 将LLM原始文本转换为结构化展示
const FormattedContent: React.FC<{ content: string }> = ({ content }) => {
  // 处理内容格式化
  const formatContent = (text: string) => {
    if (!text) return [];

    // 分割段落
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);

    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();

      // 检测emoji开头的重要提醒信息
      if (trimmed.match(/^💡\s/)) {
        return {
          type: 'highlight',
          content: trimmed.replace(/^💡\s/, ''),
          key: `highlight-${index}`
        };
      }

      // 检测emoji开头的费用信息
      if (trimmed.match(/^💰\s/)) {
        return {
          type: 'cost-info',
          content: trimmed.replace(/^💰\s/, ''),
          key: `cost-${index}`
        };
      }

      // 检测emoji开头的交通信息
      if (trimmed.match(/^🚗\s/)) {
        return {
          type: 'transport-info',
          content: trimmed.replace(/^🚗\s/, ''),
          key: `transport-${index}`
        };
      }

      // 检测列表项（包括emoji和符号）
      if (trimmed.match(/^[-*•]\s/)) {
        return {
          type: 'list-item',
          content: trimmed.replace(/^[-*•]\s/, ''),
          key: `list-${index}`
        };
      }

      // 检测时间信息
      if (trimmed.match(/\d{1,2}[:：]\d{2}|\d{1,2}[点时]/)) {
        return {
          type: 'time-info',
          content: trimmed,
          key: `time-${index}`
        };
      }

      // 检测传统格式的重要信息（包含关键词）
      if (trimmed.match(/注意|提醒|建议|推荐|特别|重要/)) {
        return {
          type: 'highlight',
          content: trimmed,
          key: `highlight-${index}`
        };
      }

      // 检测传统格式的费用信息
      if (trimmed.match(/[¥￥]\d+|费用|价格|门票/)) {
        return {
          type: 'cost-info',
          content: trimmed,
          key: `cost-${index}`
        };
      }

      // 普通段落
      return {
        type: 'paragraph',
        content: trimmed,
        key: `para-${index}`
      };
    });
  };

  const formattedItems = formatContent(content);

  return (
    <div className="space-y-3">
      {formattedItems.map((item) => {
        switch (item.type) {
          case 'list-item':
            return (
              <div key={item.key} className="flex items-start gap-2 pl-2">
                <span className="text-pink-500 mt-1 font-bold">•</span>
                <span className="flex-1 text-gray-700 leading-relaxed">{item.content}</span>
              </div>
            );

          case 'time-info':
            return (
              <div key={item.key} className="inline-flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                <span className="text-blue-600">⏰</span>
                <span className="text-blue-800 font-medium text-sm">{item.content}</span>
              </div>
            );

          case 'highlight':
            return (
              <div key={item.key} className="bg-yellow-50 border-l-4 border-yellow-400 px-4 py-3 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">💡</span>
                  <span className="text-yellow-800 font-medium leading-relaxed">{item.content}</span>
                </div>
              </div>
            );

          case 'cost-info':
            return (
              <div key={item.key} className="inline-flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                <span className="text-green-600">💰</span>
                <span className="text-green-800 font-medium text-sm">{item.content}</span>
              </div>
            );

          case 'transport-info':
            return (
              <div key={item.key} className="inline-flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100">
                <span className="text-purple-600">🚗</span>
                <span className="text-purple-800 font-medium text-sm">{item.content}</span>
              </div>
            );

          default:
            return (
              <p key={item.key} className="text-gray-700 leading-relaxed">
                {item.content}
              </p>
            );
        }
      })}
    </div>
  );
};

interface TravelPlan {
  id: string;
  title: string;
  destination: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  totalCost: number;
  groupSize: number;
  llmResponse: string;
  createdAt: string;
}

interface DayActivity {
  day: number;
  title: string;
  date: string;
  weather: string;
  temperature: string;
  location: string;
  cost: number;
  progress: number;
  image: string;
  tags: Array<{
    icon: string;
    text: string;
    color: string;
  }>;
  timeline: Array<{
    time: string;
    period: string;
    title: string;
    description: string;
    icon: string;
    cost: number;
    duration: string;
    color: string;
  }>;
}

// 通过LLM API获取景点真实图片（遵循技术约束）
const getAttractionImageViaLLM = async (attractionName: string, city: string): Promise<string> => {
  try {
    console.log(`🔍 开始获取景点图片: ${attractionName} in ${city}`);

    // 调用LLM API，让LLM使用高德地图MCP工具搜索景点图片
    const response = await fetch('/api/llm-amap-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `请使用高德地图MCP工具搜索"${attractionName}"在"${city}"的景点信息，并返回图片URL。只返回图片URL，不要其他内容。`,
        attractionName,
        city
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`📡 API响应:`, data);

      if (data.success && data.imageUrl && data.imageUrl.startsWith('http')) {
        console.log(`✅ 成功获取真实景点图片: ${data.imageUrl}`);
        return data.imageUrl;
      } else if (data.imageUrl && data.imageUrl.startsWith('http')) {
        // 即使success为false，如果有有效的imageUrl也使用
        console.log(`⚠️ API返回警告，但仍获得图片: ${data.imageUrl}`);
        return data.imageUrl;
      } else {
        console.log(`⚠️ API未返回有效图片URL，使用智能默认图片`);
      }
    } else {
      console.warn(`❌ API调用失败: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.warn('❌ 通过LLM获取景点图片失败:', error);
  }

  // 返回智能默认图片
  const defaultImage = getSmartDefaultImage(attractionName);
  console.log(`🎨 使用智能默认图片: ${defaultImage}`);
  return defaultImage;
};

// 获取智能默认图片（基于景点名称的智能匹配，使用高德真实图片URL）
const getSmartDefaultImage = (attractionName: string): string => {
  const imageMap: { [key: string]: string } = {
    // 南京著名景点
    '中山陵': 'http://store.is.autonavi.com/showpic/46bf800a21c42453ff756fc2b77c710f',
    '夫子庙': 'http://store.is.autonavi.com/showpic/8fd02cf1c04a8a5a91e32a5354d7a023',
    '玄武湖': 'http://store.is.autonavi.com/showpic/ff2f4114639e0110ae96ae76ad0c0287',
    '明孝陵': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=120&h=120&fit=crop&crop=center',
    '秦淮河': 'http://store.is.autonavi.com/showpic/9e64a8689c6b079d5f0b86a354274188',
    '总统府': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&h=120&fit=crop&crop=center',
    '鸡鸣寺': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=120&h=120&fit=crop&crop=center',
    '栖霞山': 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=120&h=120&fit=crop&crop=center'
  };

  // 尝试匹配景点名称
  for (const [key, url] of Object.entries(imageMap)) {
    if (attractionName.includes(key)) {
      return url;
    }
  }

  // 默认图片轮换
  const defaultImages = [
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=120&h=120&fit=crop&crop=center",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&h=120&fit=crop&crop=center",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=120&h=120&fit=crop&crop=center",
    "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=120&h=120&fit=crop&crop=center"
  ];

  return defaultImages[Math.floor(Math.random() * defaultImages.length)];
};

// 解析单日详细数据
const parseSingleDayData = (llmResponse: string, day: number, destination: string) => {
  // 尝试多种日期格式匹配
  const dayPatterns = [
    new RegExp(`Day\\s*${day}[:\\s]*([^\\n]+)`, 'i'),
    new RegExp(`第${day}天[：:\\s]*([^\\n]+)`, 'i'),
    new RegExp(`${day}\\.[\\s]*([^\\n]+)`, 'i'),
    new RegExp(`## Day ${day}[:\\s]*([^\\n]+)`, 'i')
  ];

  let title = `第${day}天行程`;
  let mainAttraction = destination;
  let activities = [];
  let totalCost = 0;

  // 查找标题
  for (const pattern of dayPatterns) {
    const match = llmResponse.match(pattern);
    if (match && match[1]) {
      title = match[1].replace(/[#*_`]/g, '').trim();
      if (title.length > 40) {
        title = title.substring(0, 40) + '...';
      }
      break;
    }
  }

  // 查找该天的详细内容块
  const dayContentPattern = new RegExp(
    `(?:Day\\s*${day}|第${day}天)[\\s\\S]*?(?=(?:Day\\s*${day + 1}|第${day + 1}天)|$)`,
    'i'
  );
  const dayContentMatch = llmResponse.match(dayContentPattern);

  if (dayContentMatch) {
    const dayContent = dayContentMatch[0];

    // 解析时间段活动
    activities = parseTimelineActivities(dayContent, destination);

    // 计算总费用
    totalCost = activities.reduce((sum, activity) => sum + (activity.cost || 0), 0);

    // 提取主要景点
    const attractionMatches = dayContent.match(/(?:游览|参观|前往)([^，。\n]+)/g);
    if (attractionMatches && attractionMatches.length > 0) {
      mainAttraction = attractionMatches[0].replace(/(?:游览|参观|前往)/, '').trim();
    }
  }

  // 如果没有解析到活动，使用智能默认数据
  if (activities.length === 0) {
    activities = generateIntelligentDefaultActivities(title, destination);
    totalCost = activities.reduce((sum, activity) => sum + (activity.cost || 0), 0);
  }

  return {
    title,
    mainAttraction,
    activities,
    totalCost
  };
};

// 解析时间线活动
const parseTimelineActivities = (dayContent: string, destination: string) => {
  const activities = [];

  console.log('🔍 解析时间线活动，内容长度:', dayContent.length);

  // 使用更精确的方法：先按时间段分割，再提取内容
  const timeBlockRegex = /-\s*\*\*\s*(上午|下午|晚上|早上|中午)\s*\*\*\s*/g;
  const timeBlocks = [];
  let lastIndex = 0;
  let match;

  // 找到所有时间段标记的位置
  while ((match = timeBlockRegex.exec(dayContent)) !== null) {
    if (lastIndex > 0) {
      // 保存上一个时间段的内容
      const prevContent = dayContent.substring(lastIndex, match.index).trim();
      if (prevContent) {
        timeBlocks[timeBlocks.length - 1].content = prevContent;
      }
    }

    timeBlocks.push({
      period: match[1],
      startIndex: match.index,
      content: ''
    });
    lastIndex = match.index + match[0].length;
  }

  // 处理最后一个时间段
  if (timeBlocks.length > 0) {
    const lastContent = dayContent.substring(lastIndex).trim();
    timeBlocks[timeBlocks.length - 1].content = lastContent;
  }

  console.log(`🔍 找到 ${timeBlocks.length} 个时间段:`, timeBlocks.map(b => b.period));

  // 处理每个时间段
  timeBlocks.forEach((block, index) => {
    const { period, content } = block;

    if (!content || content.length < 10) {
      console.log(`⚠️ 时间段 ${period} 内容太短，跳过`);
      return;
    }

    // 提取该时间段下的活动项
    const activityLines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 5 && (trimmed.startsWith('-') || trimmed.includes('：') || trimmed.includes(':'));
    });

    if (activityLines.length === 0) {
      // 如果没有找到明确的活动项，将整个内容作为一个活动
      activityLines.push(content);
    }

    // 合并所有活动项为一个描述
    const description = activityLines.map(line =>
      line.replace(/^-\s*/, '').replace(/\*\*/g, '').trim()
    ).join('\n');

    if (description && description.length > 10) {
      console.log(`📅 找到活动: ${period} - ${description.substring(0, 50)}...`);

      activities.push({
        time: normalizeTimeString(period),
        period: getPeriodFromTime(period),
        title: extractActivityTitle(description),
        description: enhanceActivityDescription(description, period),
        icon: getActivityIcon(description),
        cost: extractCostFromDescription(description) || generateReasonableCost(description),
        duration: extractDurationFromDescription(description) || '约2-3小时',
        color: getActivityColor(period)
      });
    }
  });

  // 如果没有找到任何时间段，尝试其他格式
  if (activities.length === 0) {
    console.log('🔍 未找到标准时间段格式，尝试其他解析方式...');

    // 尝试匹配具体时间格式
    const specificTimePattern = /(\d{1,2}:\d{2}[-~]\d{1,2}:\d{2})[：:\s]*([^\\n]+)/g;
    let specificMatch;
    while ((specificMatch = specificTimePattern.exec(dayContent)) !== null) {
      const timeStr = specificMatch[1];
      const description = specificMatch[2].trim();

      if (description && description.length > 10) {
        activities.push({
          time: normalizeTimeString(timeStr),
          period: getPeriodFromTime(timeStr),
          title: extractActivityTitle(description),
          description: enhanceActivityDescription(description, timeStr),
          icon: getActivityIcon(description),
          cost: extractCostFromDescription(description) || generateReasonableCost(description),
          duration: extractDurationFromDescription(description) || '约2-3小时',
          color: getActivityColor(timeStr)
        });
      }
    }
  }

  console.log(`✅ 解析完成，找到 ${activities.length} 个活动`);
  return activities;
};

// 辅助函数
const normalizeTimeString = (timeStr: string): string => {
  if (timeStr.includes('上午')) return '09:00-12:00';
  if (timeStr.includes('下午')) return '14:00-17:00';
  if (timeStr.includes('晚上')) return '19:00-21:00';
  if (timeStr.includes('早上')) return '08:00-10:00';
  if (timeStr.includes('中午')) return '12:00-14:00';
  return timeStr.replace(/[点时]/g, ':').replace(/[-~]/g, '-');
};

const getPeriodFromTime = (timeStr: string): string => {
  if (timeStr.includes('上午') || timeStr.includes('早上')) return '上午';
  if (timeStr.includes('下午')) return '下午';
  if (timeStr.includes('晚上')) return '晚上';
  if (timeStr.includes('中午')) return '中午';

  const hour = parseInt(timeStr.split(':')[0] || '12');
  if (hour < 12) return '上午';
  if (hour < 18) return '下午';
  return '晚上';
};

const extractActivityTitle = (description: string): string => {
  // 提取活动标题的逻辑
  const titleMatch = description.match(/^([^，。：:]+)/);
  return titleMatch ? titleMatch[1].trim() : description.substring(0, 20);
};

// 增强活动描述 - 将原始LLM文本转换为结构化描述
const enhanceActivityDescription = (description: string, timeStr: string): string => {
  if (!description) return '';



  // 清理描述文本，保留换行符
  let enhanced = description.trim();

  // 移除重复的时间信息
  enhanced = enhanced.replace(/\d{1,2}[:：]\d{2}[-~]\d{1,2}[:：]\d{2}/, '').trim();
  enhanced = enhanced.replace(/^[：:]\s*/, '').trim();

  // 处理多行内容，按行分割而不是按句子分割
  const lines = enhanced.split(/\n/).filter(line => line.trim().length > 0);

  if (lines.length === 0) return enhanced;

  // 重新组织内容
  const organizedContent = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // 移除Markdown格式标记
    const cleanLine = trimmed.replace(/\*\*/g, '').replace(/^\-\s*/, '').trim();

    if (cleanLine.length < 3) return; // 过滤太短的内容

    // 检查是否是建议或提醒
    if (cleanLine.match(/建议|推荐|注意|提醒|小贴士|温馨提示/)) {
      organizedContent.push(`💡 ${cleanLine}`);
    }
    // 检查是否是费用信息
    else if (cleanLine.match(/[¥￥]\d+|费用|门票|价格|约.*元|人均.*元/)) {
      organizedContent.push(`💰 ${cleanLine}`);
    }
    // 检查是否是交通信息
    else if (cleanLine.match(/交通|地铁|公交|打车|步行|乘坐|前往|到达|约.*分钟/)) {
      organizedContent.push(`🚗 ${cleanLine}`);
    }
    // 检查是否是时间信息
    else if (cleanLine.match(/\d{1,2}[:：]\d{2}|\d{1,2}[点时]|约.*小时|约.*分钟/)) {
      organizedContent.push(`⏰ ${cleanLine}`);
    }
    // 如果是第一行且比较长，作为主要描述
    else if (index === 0 && cleanLine.length > 10) {
      organizedContent.push(cleanLine);
    }
    // 其他内容作为列表项
    else {
      organizedContent.push(`• ${cleanLine}`);
    }
  });

  const result = organizedContent.join('\n');

  // 不限制长度，让FormattedContent组件处理显示
  return result;
};

const getActivityIcon = (description: string): string => {
  if (description.includes('游览') || description.includes('参观')) return '🏛️';
  if (description.includes('美食') || description.includes('品尝') || description.includes('餐厅')) return '🍜';
  if (description.includes('购物') || description.includes('商场')) return '🛍️';
  if (description.includes('休息') || description.includes('酒店')) return '🏨';
  if (description.includes('交通') || description.includes('前往')) return '🚗';
  return '📍';
};

const extractCostFromDescription = (description: string): number | null => {
  const costMatch = description.match(/[￥¥](\d+)/);
  return costMatch ? parseInt(costMatch[1]) : null;
};

const generateReasonableCost = (description: string): number => {
  if (description.includes('门票') || description.includes('景点')) return Math.floor(Math.random() * 100) + 50;
  if (description.includes('美食') || description.includes('餐厅')) return Math.floor(Math.random() * 80) + 40;
  if (description.includes('交通')) return Math.floor(Math.random() * 30) + 10;
  return Math.floor(Math.random() * 60) + 30;
};

const extractDurationFromDescription = (description: string): string | null => {
  const durationMatch = description.match(/(\d+[小时分钟]+)/);
  return durationMatch ? durationMatch[1] : null;
};

const getActivityColor = (timeStr: string): string => {
  if (timeStr.includes('上午') || timeStr.includes('早上')) return 'from-yellow-400 to-orange-400';
  if (timeStr.includes('下午')) return 'from-orange-400 to-red-400';
  if (timeStr.includes('晚上')) return 'from-purple-400 to-indigo-500';
  return 'from-blue-400 to-cyan-400';
};

// 生成智能默认活动（当无法解析LLM内容时使用）
const generateIntelligentDefaultActivities = (title: string, destination: string) => {
  // 基于标题和目的地生成更智能的活动描述
  const generateSmartDescription = (period: string, title: string, destination: string): string => {
    const descriptions = [];

    if (period === '上午') {
      descriptions.push(`开始${destination}的精彩一天`);
      if (title.includes('西湖')) {
        descriptions.push('• 漫步苏堤白堤，感受湖光山色');
        descriptions.push('• 参观断桥残雪，聆听白娘子传说');
        descriptions.push('💡 建议：清晨游览人少景美，适合拍照');
      } else if (title.includes('古镇') || title.includes('文化')) {
        descriptions.push('• 探索古色古香的街道巷弄');
        descriptions.push('• 参观传统建筑和文化遗迹');
        descriptions.push('💡 建议：穿着舒适的鞋子，便于步行游览');
      } else {
        descriptions.push(`• 游览${destination}标志性景点`);
        descriptions.push('• 了解当地历史文化背景');
        descriptions.push('💡 建议：提前了解景点开放时间');
      }
    } else if (period === '下午') {
      descriptions.push(`继续深度探索${destination}`);
      if (title.includes('美食')) {
        descriptions.push('• 品尝地道的当地特色菜肴');
        descriptions.push('• 探访知名餐厅和街边小吃');
        descriptions.push('💰 预算：人均100-200元');
      } else if (title.includes('购物')) {
        descriptions.push('• 逛当地特色商业街区');
        descriptions.push('• 选购纪念品和特产');
        descriptions.push('🚗 交通：建议乘坐地铁或公交');
      } else {
        descriptions.push('• 深入体验当地生活方式');
        descriptions.push('• 参与互动性强的文化活动');
        descriptions.push('💡 建议：保持充足的体力和好奇心');
      }
    } else {
      descriptions.push(`享受${destination}的夜晚时光`);
      descriptions.push('• 欣赏城市夜景和灯光秀');
      descriptions.push('• 体验当地夜生活文化');
      descriptions.push('💡 建议：注意安全，结伴而行');
    }

    return descriptions.join('\n');
  };

  const baseActivities = [
    {
      time: '09:00-12:00',
      period: '上午',
      title: '上午游览',
      description: generateSmartDescription('上午', title, destination),
      icon: '🌅',
      cost: Math.floor(Math.random() * 100) + 50,
      duration: '约3小时',
      color: 'from-yellow-400 to-orange-400'
    },
    {
      time: '14:00-17:00',
      period: '下午',
      title: '下午探索',
      description: generateSmartDescription('下午', title, destination),
      icon: '☀️',
      cost: Math.floor(Math.random() * 150) + 100,
      duration: '约3小时',
      color: 'from-orange-400 to-red-400'
    },
    {
      time: '19:00-21:00',
      period: '晚上',
      title: '夜间体验',
      description: generateSmartDescription('晚上', title, destination),
      icon: '🌙',
      cost: Math.floor(Math.random() * 80) + 40,
      duration: '约2小时',
      color: 'from-purple-400 to-indigo-500'
    }
  ];

  // 根据标题内容进一步调整活动标题
  if (title.includes('西湖')) {
    baseActivities[0].title = '西湖晨游';
    baseActivities[1].title = '湖滨漫步';
    baseActivities[2].title = '夜游西湖';
  } else if (title.includes('美食')) {
    baseActivities[0].title = '早茶体验';
    baseActivities[1].title = '美食探索';
    baseActivities[2].title = '夜市品尝';
  } else if (title.includes('文化')) {
    baseActivities[0].title = '文化探访';
    baseActivities[1].title = '深度体验';
    baseActivities[2].title = '文化夜游';
  }

  return baseActivities;
};

// 从LLM响应中解析每日活动数据
const parseDayActivities = (llmResponse: string, totalDays: number, startDate: string, destination: string): DayActivity[] => {
  const activities: DayActivity[] = [];

  console.log('🔍 开始解析LLM响应数据:', {
    responseLength: llmResponse.length,
    totalDays,
    destination
  });

  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day - 1);

    // 解析每日详细内容
    const dayData = parseSingleDayData(llmResponse, day, destination);

    let dayTitle = dayData.title || `第${day}天行程`;
    let attractionName = dayData.mainAttraction || destination;

    // 尝试从标题中提取景点名称（用于图片匹配）
    const attractions = ['西湖', '灵隐寺', '西溪湿地', '宋城', '天目山', '运河', '小河直街', '千岛湖', '虎跑泉'];
    const foundAttraction = attractions.find(attr => dayTitle.includes(attr));
    if (foundAttraction) {
      attractionName = foundAttraction;
    }

    // 生成基于内容的智能标签
    const tags = generateIntelligentTags(dayData.title, dayData.activities);

    // 使用解析的真实时间线活动
    const timeline = dayData.activities;

    // 获取智能默认图片（使用高德真实图片）
    const dayImage = getSmartDefaultImage(attractionName);

    console.log(`📅 第${day}天解析结果:`, {
      title: dayTitle,
      activitiesCount: timeline.length,
      totalCost: dayData.totalCost,
      mainAttraction: attractionName
    });

    activities.push({
      day,
      title: dayTitle,
      date: currentDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }),
      weather: generateReasonableWeather(day, destination),
      temperature: generateReasonableTemperature(day, destination),
      location: destination,
      cost: dayData.totalCost || timeline.reduce((sum, item) => sum + (item.cost || 0), 0),
      progress: Math.floor(Math.random() * 30) + 70, // 保持随机进度
      image: dayImage,
      tags,
      timeline
    });
  }

  console.log('✅ LLM响应解析完成:', {
    totalActivities: activities.length,
    totalDays: activities.length,
    destination
  });

  return activities;
};

// 生成智能标签
const generateIntelligentTags = (title: string, activities: any[]) => {
  const allTags = [
    { icon: 'fas fa-map-marker-alt', text: '景点游览', color: 'pink' },
    { icon: 'fas fa-utensils', text: '特色美食', color: 'orange' },
    { icon: 'fas fa-camera', text: '拍照打卡', color: 'purple' },
    { icon: 'fas fa-walking', text: '休闲漫步', color: 'green' },
    { icon: 'fas fa-water', text: '水上活动', color: 'blue' },
    { icon: 'fas fa-mountain', text: '自然风光', color: 'emerald' },
    { icon: 'fas fa-building', text: '文化古迹', color: 'amber' },
    { icon: 'fas fa-shopping-bag', text: '购物体验', color: 'rose' }
  ];

  const selectedTags = [];

  // 基于标题内容选择标签
  if (title.includes('西湖') || title.includes('湿地') || title.includes('千岛湖')) {
    selectedTags.push(allTags.find(tag => tag.text === '水上活动'));
  }
  if (title.includes('美食') || title.includes('品尝')) {
    selectedTags.push(allTags.find(tag => tag.text === '特色美食'));
  }
  if (title.includes('古迹') || title.includes('寺') || title.includes('文化')) {
    selectedTags.push(allTags.find(tag => tag.text === '文化古迹'));
  }
  if (title.includes('山') || title.includes('自然')) {
    selectedTags.push(allTags.find(tag => tag.text === '自然风光'));
  }

  // 基于活动内容选择标签
  activities.forEach(activity => {
    if (activity.description.includes('游览') || activity.description.includes('参观')) {
      if (!selectedTags.find(tag => tag.text === '景点游览')) {
        selectedTags.push(allTags.find(tag => tag.text === '景点游览'));
      }
    }
    if (activity.description.includes('拍照') || activity.description.includes('打卡')) {
      if (!selectedTags.find(tag => tag.text === '拍照打卡')) {
        selectedTags.push(allTags.find(tag => tag.text === '拍照打卡'));
      }
    }
  });

  // 确保至少有2个标签
  while (selectedTags.length < 2) {
    const randomTag = allTags[Math.floor(Math.random() * allTags.length)];
    if (!selectedTags.find(tag => tag.text === randomTag.text)) {
      selectedTags.push(randomTag);
    }
  }

  return selectedTags.filter(tag => tag).slice(0, 3); // 最多3个标签
};

// 生成合理的天气
const generateReasonableWeather = (day: number, destination: string): string => {
  const weatherOptions = ['晴朗', '多云', '阴天'];
  // 基于目的地和日期生成相对稳定的天气
  const weatherIndex = (day + destination.length) % weatherOptions.length;
  return weatherOptions[weatherIndex];
};

// 生成合理的温度
const generateReasonableTemperature = (day: number, destination: string): string => {
  // 基于目的地生成合理的温度范围
  let baseTemp = 25; // 默认温度

  if (destination.includes('杭州')) {
    baseTemp = 26; // 杭州夏季温度
  } else if (destination.includes('南京')) {
    baseTemp = 28; // 南京夏季温度
  }

  // 添加一些随机变化
  const variation = Math.floor(Math.random() * 6) - 3; // -3 到 +3 的变化
  return `${baseTemp + variation}°C`;
};

export default function PlanningResult() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [activeDay, setActiveDay] = useState<number>(1);
  const [currentView, setCurrentView] = useState<'itinerary' | 'map' | 'timeline'>('itinerary');
  const [dayActivities, setDayActivities] = useState<DayActivity[]>([]);
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (!sessionId) return;
    fetchTravelPlan();
  }, [sessionId]);

  const fetchTravelPlan = async () => {
    try {
      console.log('📋 获取旅行计划结果:', sessionId);

      const response = await fetch(`/api/v1/planning/sessions/${sessionId}`);
      const result = await response.json();

      if (result.success && result.data) {
        let planData = {
          id: sessionId as string,
          title: `${result.data.destination}深度游`,
          destination: result.data.destination,
          totalDays: result.data.totalDays || 0,
          startDate: result.data.startDate || '',
          endDate: result.data.endDate || '',
          totalCost: 12500,
          groupSize: result.data.userPreferences?.groupSize || 2,
          llmResponse: '',
          createdAt: new Date().toISOString(),
        };

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

        // 解析每日活动数据
        const activities = parseDayActivities(
          planData.llmResponse || '',
          planData.totalDays,
          planData.startDate,
          planData.destination
        );
        setDayActivities(activities);

        // 异步加载真实景点图片
        setTimeout(() => {
          loadRealAttractionImages(activities);
        }, 2000); // 延迟2秒开始加载，避免影响页面初始渲染

        console.log('✅ 旅行计划加载成功');
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

  const toggleDay = (dayNumber: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayNumber)) {
        newSet.delete(dayNumber);
      } else {
        newSet.add(dayNumber);
      }
      return newSet;
    });
  };

  const scrollToDay = (dayNumber: number) => {
    setActiveDay(dayNumber);
    const element = document.getElementById(`day-${dayNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleEditPlan = () => {
    router.push(`/planning?sessionId=${sessionId}`);
  };

  const handleSharePlan = async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    } catch (error) {
      console.error('分享失败:', error);
      alert('分享失败，请手动复制链接');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  // 异步加载真实景点图片
  const loadRealAttractionImages = async (activities: DayActivity[]) => {
    console.log(`🖼️ 开始加载${activities.length}个景点的真实图片...`);

    for (const activity of activities) {
      try {
        console.log(`📸 正在加载第${activity.day}天的景点图片: ${activity.title}`);
        setImageLoadingStates(prev => ({ ...prev, [activity.day]: true }));

        // 智能提取景点名称 - 扩展更多景点
        const attractions = [
          // 南京景点
          '中山陵', '夫子庙', '玄武湖', '明孝陵', '秦淮河', '总统府', '鸡鸣寺', '栖霞山', '雨花台', '莫愁湖',
          // 杭州景点
          '西湖', '灵隐寺', '雷峰塔', '断桥', '苏堤', '白堤', '三潭印月', '花港观鱼', '曲院风荷', '平湖秋月',
          '西溪湿地', '千岛湖', '天目山', '运河', '宋城',
          // 通用景点类型
          '古镇', '寺庙', '公园', '湖泊', '山峰', '博物馆', '广场', '街道'
        ];

        const foundAttraction = attractions.find(attr => activity.title.includes(attr));
        let attractionName = foundAttraction || activity.location;

        // 如果没有找到具体景点，尝试从标题中提取关键词
        if (!foundAttraction) {
          const titleWords = activity.title.split(/[：、，。\s]+/).filter(word => word.length > 1);
          attractionName = titleWords[0] || activity.location;
        }

        console.log(`🎯 提取的景点名称: ${attractionName} (来源: ${activity.title})`);

        // 通过LLM API获取真实图片
        const realImageUrl = await getAttractionImageViaLLM(attractionName, activity.location);

        // 更新活动图片
        setDayActivities(prevActivities =>
          prevActivities.map(act =>
            act.day === activity.day
              ? { ...act, image: realImageUrl }
              : act
          )
        );

        console.log(`✅ 第${activity.day}天图片加载完成: ${realImageUrl}`);
        setImageLoadingStates(prev => ({ ...prev, [activity.day]: false }));

        // 添加延迟避免API调用过于频繁
        await new Promise(resolve => setTimeout(resolve, 800));

      } catch (error) {
        console.warn(`❌ 加载第${activity.day}天真实图片失败:`, error);
        setImageLoadingStates(prev => ({ ...prev, [activity.day]: false }));

        // 即使失败也要继续加载其他图片
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`🎉 所有景点图片加载完成！`);
  };

  // 每日行程卡片组件
  const DayItineraryCard = ({ activity }: { activity: DayActivity }) => {
    const isExpanded = expandedDays.has(activity.day);

    return (
      <div
        id={`day-${activity.day}`}
        className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden animate-fade-in"
      >
        {/* 卡片头部 */}
        <div
          className="p-4 lg:p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50/50 transition-all duration-300 hover:shadow-sm active:scale-[0.995] focus:outline-none focus:ring-2 focus:ring-pink-500/20"
          onClick={() => toggleDay(activity.day)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleDay(activity.day);
            }
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:gap-4">
            {/* 景点图片 */}
            <div className="relative">
              <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl overflow-hidden group">
                <img
                  src={activity.image}
                  alt={activity.title}
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getSmartDefaultImage(activity.title);
                  }}
                />
                {/* 图片加载状态指示器 */}
                {imageLoadingStates[activity.day] && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 bg-opacity-90 flex items-center justify-center backdrop-blur-sm">
                    <div className="relative">
                      <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-5 h-5 border-2 border-pink-200 rounded-full animate-ping"></div>
                    </div>
                  </div>
                )}
                {/* Hover遮罩 */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
              </div>
              <div className="absolute -top-2 -left-2 w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xs lg:text-sm">{activity.day}</span>
              </div>
            </div>

              {/* 主要信息 */}
              <div>
                <h3 className="text-lg lg:text-xl font-bold text-gray-800">{activity.title}</h3>
                <p className="text-gray-500 mb-2 text-sm lg:text-base">{activity.date}</p>
                <div className="flex flex-wrap items-center gap-3 lg:gap-6 text-xs lg:text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="text-base lg:text-lg">☀️</span>
                    <span>{activity.temperature} {activity.weather}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base lg:text-lg">📍</span>
                    <span>{activity.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base lg:text-lg">💰</span>
                    <span>¥{activity.cost}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 展开/收起图标 */}
            <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} sm:self-start sm:mt-2`}>
              <i className="fas fa-chevron-down text-gray-400"></i>
            </div>
          </div>

          {/* 活动标签 */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {activity.tags.map((tag, index) => (
              <span
                key={index}
                className={`px-2 lg:px-3 py-1 bg-${tag.color}-50 text-${tag.color}-700 text-xs lg:text-sm rounded-full font-medium`}
              >
                <i className={`${tag.icon} mr-1`}></i>
                {tag.text}
              </span>
            ))}
          </div>
        </div>

        {/* 可展开的详细内容 */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className={`transform transition-all duration-500 ease-in-out ${
            isExpanded ? 'translate-y-0 scale-100' : '-translate-y-4 scale-95'
          }`}>
            <div className="p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-pink-50/30 border-t border-gray-100">
              {/* 时间线 */}
              <div className="grid grid-cols-1 gap-6">
                {activity.timeline.map((item, index) => (
                  <div key={index} className="flex gap-4 lg:gap-6">
                    {/* 时间轴 */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center shadow-lg`}>
                        <span className="text-white font-bold text-sm lg:text-base">{item.icon}</span>
                      </div>
                      {index < activity.timeline.length - 1 && (
                        <div className={`w-0.5 h-16 lg:h-20 bg-gradient-to-b ${item.color} mt-2`}></div>
                      )}
                    </div>

                    {/* 活动内容 */}
                    <div className="flex-1">
                      <div className="bg-white rounded-xl p-4 lg:p-5 shadow-sm border border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                          <h4 className="text-base lg:text-lg font-semibold text-gray-800">{item.title}</h4>
                          <span className="text-xs lg:text-sm text-gray-500 bg-gray-100 px-2 lg:px-3 py-1 rounded-full">{item.time}</span>
                        </div>
                        <div className="text-sm lg:text-base text-gray-600 mb-3 lg:mb-4">
                          <FormattedContent content={item.description} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-4 text-xs lg:text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">💰</span>
                            <span className="text-gray-600">¥{item.cost}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600">⏱️</span>
                            <span className="text-gray-600">{item.duration}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-purple-600">📍</span>
                            <span className="text-gray-600">{item.period}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="border-t border-gray-100 p-4 lg:p-6 bg-gray-50/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 lg:gap-4">
                  <button className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <i className="fas fa-edit text-gray-600 text-sm lg:text-base"></i>
                  </button>
                  <button className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <i className="fas fa-copy text-gray-600 text-sm lg:text-base"></i>
                  </button>
                  <button
                    className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-pink-100 hover:text-pink-600 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                    title="收藏行程"
                  >
                    <i className="fas fa-heart text-gray-600 text-sm lg:text-base hover:text-pink-600 transition-colors"></i>
                  </button>
                  <button
                    className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    title="分享行程"
                  >
                    <i className="fas fa-share-alt text-gray-600 text-sm lg:text-base hover:text-blue-600 transition-colors"></i>
                  </button>
                  <button
                    className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-green-100 hover:text-green-600 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    title="查看地图"
                  >
                    <i className="fas fa-map text-gray-600 text-sm lg:text-base hover:text-green-600 transition-colors"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载旅行计划...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ 加载失败</div>
          <p className="text-gray-600 mb-4">{error || '未找到旅行计划'}</p>
          <button
            onClick={() => router.push('/planning')}
            className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style jsx global>{`
          /* 原型配色系统 - 完全匹配prototype/web-daily-itinerary.html */
          :root {
            --primary: #db2777;
            --secondary: #ec4899;
            --accent: #10b981;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
          }

          /* 原型动画系统 */
          @keyframes slideDown {
            0% { opacity: 0; transform: translateY(-20px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }

          @keyframes scaleIn {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          .animate-slide-down { animation: slideDown 0.4s ease-out; }
          .animate-fade-in { animation: fadeIn 0.6s ease-out; }
          .animate-scale-in { animation: scaleIn 0.3s ease-out; }
          .animate-float { animation: float 3s ease-in-out infinite; }

          /* 原型样式类 */
          .bg-primary { background-color: var(--primary); }
          .bg-secondary { background-color: var(--secondary); }
          .text-primary { color: var(--primary); }
          .text-secondary { color: var(--secondary); }
          .border-primary { border-color: var(--primary); }

          @media print {
            .no-print { display: none !important; }
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50 to-rose-50">
        {/* 顶部导航栏 - 完全匹配原型 */}
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                    <i className="fas fa-plane text-white"></i>
                  </div>
                  <h1 className="text-xl font-bold text-gray-800">智游助手</h1>
                </div>
                <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === 'itinerary'
                        ? 'bg-white shadow-sm text-gray-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setCurrentView('itinerary')}
                  >
                    行程详情
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === 'map'
                        ? 'bg-white shadow-sm text-gray-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setCurrentView('map')}
                  >
                    地图视图
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === 'timeline'
                        ? 'bg-white shadow-sm text-gray-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setCurrentView('timeline')}
                  >
                    时间线
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleEditPlan}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                  title="编辑行程"
                >
                  <i className="fas fa-edit mr-2 transition-transform duration-300 hover:rotate-12"></i>编辑
                </button>
                <button
                  onClick={handleSharePlan}
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  title="分享行程"
                >
                  <i className="fas fa-share-alt mr-2 transition-transform duration-300 hover:scale-110"></i>分享
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 hover:scale-105 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                  title="导出PDF"
                >
                  <i className="fas fa-download mr-2 transition-transform duration-300 hover:translate-y-[-2px]"></i>导出PDF
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* 主要内容区域 - 完全匹配原型 */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* 行程头部信息 - 完全匹配原型 */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden mb-8">
            <div className="relative h-64">
              <img
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&h=400&fit=crop&crop=center"
                alt={`${plan.destination}风光`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"></div>
              <div className="absolute inset-0 flex items-center">
                <div className="px-8">
                  <h1 className="text-4xl font-bold text-white mb-4">{plan.title}</h1>
                  <div className="flex items-center gap-8 text-white/90">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{plan.startDate} - {plan.endDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-users"></i>
                      <span>{plan.groupSize}人</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-map-marked-alt"></i>
                      <span>{plan.totalDays * 3}个景点</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fas fa-dollar-sign"></i>
                      <span className="text-2xl font-bold">¥{Math.round(plan.totalCost / plan.groupSize).toLocaleString()}</span>
                      <span>/人</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 响应式布局 - 完全匹配原型 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* 左侧边栏 - 行程导航 */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-4 lg:p-6 lg:sticky lg:top-24">
                <h3 className="text-lg font-bold text-gray-800 mb-4">行程导航</h3>
                <div className="space-y-2">
                  {Array.from({ length: plan.totalDays }, (_, index) => {
                    const dayNumber = index + 1;
                    const isActive = activeDay === dayNumber;
                    return (
                      <button
                        key={dayNumber}
                        className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-xl font-medium transition-all hover:bg-primary/20 ${
                          isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        onClick={() => scrollToDay(dayNumber)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isActive ? 'bg-primary' : 'bg-gray-200'
                          }`}>
                            <span className={`text-sm font-bold ${
                              isActive ? 'text-white' : 'text-gray-600'
                            }`}>{dayNumber}</span>
                          </div>
                          <div>
                            <div className="font-medium">第{dayNumber}天</div>
                            <div className="text-xs opacity-70">
                              {new Date(new Date(plan.startDate).getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000)
                                .toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 快速统计 */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3">行程统计</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">总天数</span>
                      <span className="font-semibold">{plan.totalDays}天</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">景点数量</span>
                      <span className="font-semibold">{plan.totalDays * 3}个</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">预计费用</span>
                      <span className="font-semibold text-primary">¥{plan.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 中间主要内容 - 每日行程 */}
            <div className="lg:col-span-6 xl:col-span-6 order-1 lg:order-2">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-800">每日详细行程</h2>
                  <div className="flex items-center gap-3">
                    <button className="px-3 lg:px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm lg:text-base">
                      <i className="fas fa-expand-alt mr-1 lg:mr-2"></i><span className="hidden sm:inline">全屏查看</span>
                    </button>
                    <button className="px-3 lg:px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm lg:text-base">
                      <i className="fas fa-print mr-1 lg:mr-2"></i><span className="hidden sm:inline">打印</span>
                    </button>
                  </div>
                </div>

                {/* 每日行程卡片展示 */}
                {dayActivities.length > 0 ? (
                  <div className="space-y-6">
                    {dayActivities.map((activity) => (
                      <DayItineraryCard key={activity.day} activity={activity} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-8 text-center">
                    <div className="text-gray-500 mb-4">
                      <i className="fas fa-calendar-day text-4xl mb-4"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">行程详情生成中</h3>
                    <p className="text-gray-600">正在为您生成详细的每日行程安排...</p>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧边栏 - 预留空间 */}
            <div className="lg:col-span-3 order-3">
              <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">旅行贴士</h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-lightbulb text-yellow-500 mt-1"></i>
                    <div>
                      <p className="font-medium text-gray-800">最佳出行时间</p>
                      <p>建议提前1-2周预订机票和酒店</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <i className="fas fa-umbrella text-blue-500 mt-1"></i>
                    <div>
                      <p className="font-medium text-gray-800">天气准备</p>
                      <p>关注天气预报，准备合适的衣物</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <i className="fas fa-credit-card text-green-500 mt-1"></i>
                    <div>
                      <p className="font-medium text-gray-800">支付方式</p>
                      <p>建议携带现金和银行卡</p>
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