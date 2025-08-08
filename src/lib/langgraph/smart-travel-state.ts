/**
 * 智游助手v6.2 - LangGraph智能旅行状态定义
 * 基于Phase 1智能双链路架构的状态管理
 */

import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';
import ServiceQualityMonitor from '@/lib/geo/quality-monitor';

// ============= 核心状态接口定义 (重构后) =============
// 遵循原则: [SOLID-单一职责] + [领域驱动设计] + [为失败而设计]

// 核心上下文 - 不可变的会话信息
export interface CoreTravelContext {
  readonly sessionId: string;
  readonly requestId: string;
  readonly userId?: string;
  readonly timestamp: number; // 使用number避免Date序列化问题
}

// 旅行规划状态 - 用户需求和基础状态
export interface TravelPlanningState {
  readonly context: CoreTravelContext;
  readonly request: TravelRequest;
  status: PlanningStatus;
  currentNode?: string;
}

// 分析状态 - 智能分析结果
export interface AnalysisState {
  complexity?: TravelComplexityAnalysis;
  serviceQuality?: ServiceQualityContext;
  strategy?: ProcessingStrategy;
}

// 执行状态 - 数据收集和处理
export interface ExecutionState {
  dataCollection?: any;
  optimization?: any;
  results?: any;
}

// 监控状态 - 质量和性能指标
export interface MonitoringState {
  qualityMetrics?: QualityMetrics;
  performanceMetrics?: PerformanceMetrics;
  errors: ProcessingError[]; // 非可选，确保错误追踪
  recoveryAttempts: number;
}

// 状态元数据 - 版本和更新信息
export interface StateMetadata {
  version: number;
  lastUpdated: number; // 使用number避免Date序列化问题
  checksum?: string; // 状态完整性校验
}

// 组合状态 - 遵循组合优于继承原则
export interface SmartTravelState {
  readonly planning: TravelPlanningState;
  analysis: AnalysisState;
  execution: ExecutionState;
  monitoring: MonitoringState;
  metadata: StateMetadata;
}

// 规划状态枚举
export type PlanningStatus =
  | 'pending'     // 等待处理
  | 'analyzing'   // 分析中
  | 'collecting'  // 数据收集中
  | 'optimizing'  // 优化中
  | 'completed'   // 已完成
  | 'failed'      // 失败
  | 'recovered';  // 已恢复

export interface TravelRequest {
  origin: string;
  destination: string;
  travelDate: Date;
  duration: number; // 天数
  travelers: number;
  budget?: number;
  preferences: TravelPreferences;
  constraints?: TravelConstraints;
}

export interface TravelPreferences {
  travelStyle: 'budget' | 'comfort' | 'luxury';
  interests: string[]; // ['文化', '美食', '自然', '购物', '娱乐']
  transportation: 'driving' | 'walking' | 'transit' | 'mixed';
  accommodation?: 'hotel' | 'hostel' | 'apartment' | 'any';
  dining?: 'local' | 'international' | 'vegetarian' | 'any';
}

export interface TravelConstraints {
  maxBudget?: number;
  timeConstraints?: TimeConstraint[];
  accessibilityNeeds?: string[];
  dietaryRestrictions?: string[];
}

export interface TimeConstraint {
  type: 'must_visit' | 'avoid_time' | 'preferred_time';
  location?: string;
  timeRange: { start: Date; end: Date };
  priority: number;
}

// ============= 分析和决策状态 =============

export interface TravelComplexityAnalysis {
  overall: number; // 0-1 综合复杂度评分
  factors: {
    distance: number;
    duration: number;
    preferences: number;
    constraints: number;
    seasonality: number;
  };
  recommendation: 'simple' | 'standard' | 'comprehensive';
  estimatedProcessingTime: number; // 预估处理时间(秒)
}

export interface ServiceQualityContext {
  primaryService: 'amap' | 'tencent';
  qualityScore: number;
  availability: {
    amap: boolean;
    tencent: boolean;
  };
  responseTime: {
    amap: number;
    tencent: number;
  };
  recommendedStrategy: ProcessingStrategy;
  lastUpdated: Date;
}

export type ProcessingStrategy = 
  | 'fast_single_service'      // 简单需求，单服务快速处理
  | 'intelligent_dual_service' // 中等复杂度，智能双链路
  | 'comprehensive_analysis'   // 复杂需求，全面分析
  | 'parallel_processing'      // 高并发，并行处理
  | 'fallback_mode';          // 降级模式

// ============= 数据收集状态 =============

export interface DataCollection {
  geoData?: {
    originGeocode?: any;
    destinationGeocode?: any;
    status: 'pending' | 'completed' | 'failed';
  };
  weatherData?: {
    current?: any;
    forecast?: any;
    status: 'pending' | 'completed' | 'failed';
  };
  poiData?: {
    attractions?: any[];
    restaurants?: any[];
    accommodations?: any[];
    status: 'pending' | 'completed' | 'failed';
  };
  routeData?: {
    primaryRoute?: any;
    alternativeRoutes?: any[];
    status: 'pending' | 'completed' | 'failed';
  };
  collectionProgress: number; // 0-1 数据收集进度
  estimatedCompletion: Date;
}

// ============= 智能处理状态 =============

export interface RouteOptimization {
  optimizedRoute?: OptimizedRoute;
  alternatives?: OptimizedRoute[];
  optimizationCriteria: string[];
  processingTime: number;
  confidence: number;
}

export interface OptimizedRoute {
  id: string;
  waypoints: Waypoint[];
  totalDistance: number;
  totalDuration: number;
  estimatedCost: number;
  highlights: string[];
  score: number; // 综合评分
}

export interface Waypoint {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
  type: 'origin' | 'destination' | 'attraction' | 'restaurant' | 'accommodation' | 'transit';
  plannedArrival: Date;
  plannedDeparture: Date;
  duration: number; // 停留时间(分钟)
  priority: number;
  description?: string;
  tips?: string[];
}

export interface RecommendationEngine {
  personalizedRecommendations?: Recommendation[];
  contextualSuggestions?: ContextualSuggestion[];
  processingStatus: 'pending' | 'processing' | 'completed';
  confidence: number;
}

export interface Recommendation {
  id: string;
  type: 'attraction' | 'restaurant' | 'activity' | 'route' | 'timing';
  title: string;
  description: string;
  location?: { latitude: number; longitude: number };
  score: number;
  reasoning: string;
  tags: string[];
}

export interface ContextualSuggestion {
  context: string; // 'weather', 'season', 'crowd', 'budget'
  suggestion: string;
  impact: 'positive' | 'neutral' | 'negative';
  actionable: boolean;
}

// ============= 最终结果状态 =============

export interface ComprehensiveTravelPlan {
  id: string;
  title: string;
  summary: string;
  itinerary: DayItinerary[];
  logistics: TravelLogistics;
  budget: BudgetBreakdown;
  tips: TravelTip[];
  alternatives: PlanAlternative[];
  metadata: PlanMetadata;
}

export interface DayItinerary {
  day: number;
  date: Date;
  theme?: string;
  activities: PlannedActivity[];
  meals: PlannedMeal[];
  transportation: PlannedTransportation[];
  accommodation?: PlannedAccommodation;
  dailySummary: string;
  estimatedCost: number;
}

export interface PlannedActivity {
  id: string;
  name: string;
  type: string;
  location: { latitude: number; longitude: number };
  startTime: Date;
  endTime: Date;
  duration: number;
  cost: number;
  description: string;
  tips: string[];
  bookingRequired: boolean;
  priority: number;
}

export interface PlannedMeal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  restaurant: string;
  cuisine: string;
  location: { latitude: number; longitude: number };
  time: Date;
  estimatedCost: number;
  specialNotes?: string;
}

export interface PlannedTransportation {
  id: string;
  mode: 'driving' | 'walking' | 'transit' | 'taxi' | 'bike';
  from: string;
  to: string;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  cost: number;
  details?: string;
}

export interface PlannedAccommodation {
  id: string;
  name: string;
  type: string;
  location: { latitude: number; longitude: number };
  checkIn: Date;
  checkOut: Date;
  nights: number;
  costPerNight: number;
  amenities: string[];
  rating?: number;
}

export interface TravelLogistics {
  totalDistance: number;
  totalDuration: number; // 小时
  transportationModes: string[];
  packingList: string[];
  importantContacts: Contact[];
  emergencyInfo: EmergencyInfo;
}

export interface BudgetBreakdown {
  total: number;
  categories: {
    transportation: number;
    accommodation: number;
    food: number;
    activities: number;
    shopping: number;
    miscellaneous: number;
  };
  dailyAverage: number;
  budgetTips: string[];
}

export interface TravelTip {
  category: 'transportation' | 'accommodation' | 'dining' | 'activities' | 'culture' | 'safety';
  tip: string;
  priority: 'high' | 'medium' | 'low';
  applicableTime?: string;
}

export interface PlanAlternative {
  id: string;
  title: string;
  description: string;
  keyDifferences: string[];
  costDifference: number;
  timeDifference: number;
  score: number;
}

export interface TravelAlternative {
  id: string;
  type: 'route' | 'timing' | 'budget' | 'style';
  title: string;
  description: string;
  changes: string[];
  impact: {
    cost: number;
    time: number;
    experience: number;
  };
  recommendation: string;
}

// ============= 质量和性能指标 =============

export interface QualityMetrics {
  dataQuality: number; // 数据质量评分
  planCoherence: number; // 计划连贯性
  personalization: number; // 个性化程度
  feasibility: number; // 可行性评分
  overallQuality: number; // 综合质量评分
  qualityFactors: string[]; // 影响质量的因素
}

export interface PerformanceMetrics {
  totalProcessingTime: number;
  dataCollectionTime: number;
  analysisTime: number;
  optimizationTime: number;
  nodeExecutionTimes: Record<string, number>;
  memoryUsage: number;
  apiCallCount: number;
  cacheHitRate: number;
}

// ============= 错误和恢复 =============

export interface ProcessingError {
  id: string;
  node: string;
  type: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  context?: any;
}

// ============= 辅助接口 =============

export interface Contact {
  type: 'hotel' | 'restaurant' | 'attraction' | 'emergency' | 'transport';
  name: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface EmergencyInfo {
  localEmergency: string;
  nearestHospital: Contact;
  embassy?: Contact;
  insurance?: string;
}

export interface PlanMetadata {
  createdAt: Date;
  updatedAt: Date;
  version: string;
  generatedBy: string;
  processingStrategy: ProcessingStrategy;
  dataSource: string[];
  confidence: number;
  reviewStatus: 'draft' | 'reviewed' | 'approved';
}

// ============= 状态工厂函数 (重构后) =============
// 遵循原则: [SOLID-单一职责] + [为失败而设计]

export function createInitialState(request: TravelRequest, userId?: string): SmartTravelState {
  const timestamp = Date.now();

  const context: CoreTravelContext = {
    sessionId: generateSessionId(),
    requestId: generateRequestId(),
    userId: userId || 'anonymous',
    timestamp
  };

  const planning: TravelPlanningState = {
    context,
    request,
    status: 'pending'
  };

  const analysis: AnalysisState = {};

  const execution: ExecutionState = {};

  const monitoring: MonitoringState = {
    errors: [],
    recoveryAttempts: 0
  };

  const metadata: StateMetadata = {
    version: 1,
    lastUpdated: timestamp
  };

  return {
    planning,
    analysis,
    execution,
    monitoring,
    metadata
  };
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============= 状态验证函数 (重构后) =============
// 遵循原则: [为失败而设计] + [代码规约-类型安全]

export function validateTravelState(state: SmartTravelState): boolean {
  return !!(
    state.planning?.context?.sessionId &&
    state.planning?.context?.requestId &&
    state.planning?.request &&
    state.metadata?.version > 0
  );
}

export function isStateComplete(state: SmartTravelState): boolean {
  return state.planning.status === 'completed' && !!state.execution.results;
}

export function getStateProgress(state: SmartTravelState): number {
  let progress = 0;

  if (state.analysis.complexity) progress += 0.1;
  if (state.analysis.serviceQuality) progress += 0.1;
  if (state.execution.dataCollection) progress += 0.4;
  if (state.execution.optimization) progress += 0.2;
  if (state.execution.results) progress += 0.2;

  return Math.min(progress, 1.0);
}

// 新增：类型守卫函数
export function isTravelPlanningState(obj: unknown): obj is TravelPlanningState {
  return typeof obj === 'object' &&
         obj !== null &&
         'context' in obj &&
         'request' in obj &&
         'status' in obj;
}

export function isAnalysisState(obj: unknown): obj is AnalysisState {
  return typeof obj === 'object' && obj !== null;
}

export function isExecutionState(obj: unknown): obj is ExecutionState {
  return typeof obj === 'object' && obj !== null;
}

export default SmartTravelState;
