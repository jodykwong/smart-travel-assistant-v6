/**
 * 时间线活动相关类型定义
 */

export interface TimelineActivity {
  time: string;           // 时间范围，如 "09:00-12:00"
  period: string;         // 时间段，如 "上午"
  title: string;          // 活动标题
  description: string;    // 活动描述
  icon: string;          // 活动图标
  cost: number;          // 费用
  duration: string;      // 持续时间
  color: string;         // 颜色主题
}

export interface TimeBlock {
  period: string;        // 时间段名称，如 "上午"
  startIndex: number;    // 在原文中的起始位置
  content: string;       // 该时间段的内容
}

export interface ParsingContext {
  destination: string;   // 目的地
  dayNumber?: number;    // 第几天
  totalDays?: number;    // 总天数
}
