/**
 * Timeline解析架构 - 统一数据契约接口
 * 遵循API优先设计原则，定义标准化的数据结构
 */

export type Period = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export interface Activity {
  title: string;
  description: string;
  cost?: number;
  duration?: string;
  tips?: string[];
  location?: string;
  icon?: string;
}

export interface Segment {
  period: Period;
  time: string;
  activities: Activity[];
}

export interface DayPlan {
  day: number;
  title: string;
  date: string;
  segments: Segment[];
  weather?: {
    condition: string;
    temperature: string;
    icon: string;
  };
  location?: string;
  totalCost?: number;
  progress?: number;
  image?: string;
  tags?: string[];
}

export interface ParseContext {
  destination: string;
  startDate?: string;
  totalDays: number;
  sessionId: string;
}

export interface ParseResult {
  success: boolean;
  data?: DayPlan[];
  error?: string;
  parser?: string;
  metadata?: {
    structuredHit: boolean;
    parseTime: number;
    repairAttempts: number;
  };
}

export interface ParserPlugin {
  name: string;
  priority: number;
  tryParse(raw: string, context: ParseContext): Promise<DayPlan[] | null>;
  canHandle(raw: string): boolean;
  score?(result: DayPlan[]): number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// 兼容现有系统的接口
export interface LegacyDayActivity {
  day: number;
  title: string;
  date: string;
  weather: string;
  temperature: string;
  location: string;
  cost: number;
  progress: number;
  image: string;
  tags: string[];
  timeline: LegacyTimelineItem[];
}

export interface LegacyTimelineItem {
  time: string;
  period: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
  duration: string;
  color: string;
}
