/**
 * 智游助手v5.0 - 核心类型定义
 * 基于LangGraph分治征服架构设计
 */

// ============= 基础类型 =============

export type SessionId = string & { readonly __brand: 'SessionId' };
export type TokenCount = number & { readonly __brand: 'TokenCount' };
export type QualityScore = number & { readonly __brand: 'QualityScore' };

// ============= 规划阶段枚举 =============

export type PlanningPhase = 
  | 'analyze_complexity'
  | 'region_decomposition' 
  | 'collect_data'
  | 'plan_region'
  | 'validate_region'
  | 'merge_regions'
  | 'optimize_transitions'
  | 'generate_output'
  | 'completed'
  | 'error';

export type PlanningStrategy = 'simple' | 'standard' | 'comprehensive';

// ============= 用户偏好类型 =============

export interface UserPreferences {
  readonly budget: 'budget' | 'mid-range' | 'luxury' | 'premium';
  readonly travelStyles: readonly TravelStyle[];
  readonly accommodation: 'hotel' | 'hostel' | 'bnb' | 'resort';
  readonly groupSize: number;
  readonly specialRequirements?: string;
}

export type TravelStyle = 
  | 'adventure' 
  | 'culture' 
  | 'relaxation' 
  | 'food' 
  | 'nature' 
  | 'shopping';

// ============= 地理数据类型 =============

export interface RegionInfo {
  readonly name: string;
  readonly priority: number;
  readonly estimatedDays: number;
  readonly complexity: number;
  readonly coordinates: readonly [number, number]; // [lng, lat]
  readonly description: string;
}

export interface POIData {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly location: string; // "lng,lat"
  readonly category: 'attraction' | 'restaurant' | 'hotel' | 'transport';
  readonly rating: number;
  readonly priceLevel: '$' | '$$' | '$$$' | '$$$$';
  readonly description: string;
  readonly openingHours?: string;
  readonly imageUrl?: string;
}

export interface RegionData {
  readonly attractions: readonly POIData[];
  readonly restaurants: readonly POIData[];
  readonly hotels: readonly POIData[];
  readonly weather: WeatherData;
  readonly transportation: TransportationData;
  readonly dataQuality: QualityScore;
  readonly lastUpdated: string;
}

export interface WeatherData {
  readonly temperature: {
    readonly min: number;
    readonly max: number;
    readonly avg: number;
  };
  readonly condition: string;
  readonly humidity: number;
  readonly rainfall: number;
}

export interface TransportationData {
  readonly flights: readonly FlightInfo[];
  readonly trains: readonly TrainInfo[];
  readonly buses: readonly BusInfo[];
}

export interface FlightInfo {
  readonly from: string;
  readonly to: string;
  readonly duration: number; // minutes
  readonly price: number;
  readonly airline: string;
}

export interface TrainInfo {
  readonly from: string;
  readonly to: string;
  readonly duration: number; // minutes
  readonly price: number;
  readonly type: string;
}

export interface BusInfo {
  readonly from: string;
  readonly to: string;
  readonly duration: number; // minutes
  readonly price: number;
  readonly company: string;
}

// ============= 规划结果类型 =============

export interface DailyPlan {
  readonly day: number;
  readonly date: string;
  readonly activities: readonly Activity[];
  readonly accommodation: POIData;
  readonly estimatedCost: number;
  readonly notes?: string;
}

export interface Activity {
  readonly id: string;
  readonly name: string;
  readonly type: 'sightseeing' | 'dining' | 'transport' | 'rest';
  readonly startTime: string;
  readonly endTime: string;
  readonly location: POIData;
  readonly description: string;
  readonly cost: number;
  readonly duration: number; // minutes
}

export interface RegionPlan {
  readonly regionName: string;
  readonly days: readonly DailyPlan[];
  readonly totalCost: number;
  readonly highlights: readonly string[];
  readonly tips: readonly string[];
  readonly qualityScore: QualityScore;
  readonly tokensUsed: TokenCount;
}

export interface CompleteTravelPlan {
  readonly id: string;
  readonly title: string;
  readonly destination: string;
  readonly totalDays: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly regions: readonly RegionPlan[];
  readonly totalCost: number;
  readonly overallQualityScore: QualityScore;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ============= 错误处理类型 =============

export interface ProcessingError {
  readonly type: string;
  readonly message: string;
  readonly context: string;
  readonly retryable: boolean;
  readonly userFriendly: boolean;
  readonly timestamp: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// ============= LangGraph状态类型 =============

export interface TravelPlanningState {
  // 基础信息 - 必需字段
  readonly sessionId: SessionId;
  readonly destination: string;
  readonly totalDays: number;
  readonly startDate: string;
  readonly endDate: string;
  
  // 用户偏好 - 可选但推荐
  readonly userPreferences: UserPreferences;
  
  // 分片信息 - 运行时状态
  regions: readonly RegionInfo[];
  currentRegionIndex: number;
  currentPhase: PlanningPhase;
  
  // 数据层 - 可变状态
  realData: Readonly<Record<string, RegionData>>;
  regionPlans: Readonly<Record<string, RegionPlan>>;
  
  // 最终结果 - 可选
  masterPlan?: CompleteTravelPlan;
  htmlOutput?: string;
  
  // 执行状态 - 监控信息
  readonly progress: number;
  readonly errors: readonly ProcessingError[];
  readonly retryCount: number;
  readonly qualityScore: QualityScore;
  
  // Token管理 - 性能监控
  readonly tokensUsed: TokenCount;
  readonly tokensRemaining: TokenCount;
}

// ============= API响应类型 =============

export interface APIResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly timestamp: string;
}

export interface PlanningProgress {
  readonly sessionId: SessionId;
  readonly phase: PlanningPhase;
  readonly progress: number;
  readonly currentRegion?: string;
  readonly estimatedTimeRemaining?: number;
  readonly message: string;
}

// ============= 表单验证类型 =============

export interface TravelPreferencesForm {
  destination: string;
  startDate: string;
  endDate: string;
  groupSize: number;
  budget: UserPreferences['budget'];
  travelStyles: TravelStyle[];
  accommodation: UserPreferences['accommodation'];
  specialRequirements?: string;
}

// ============= 工具函数类型 =============

export type CreateSessionId = (prefix?: string) => SessionId;
export type CreateTokenCount = (count: number) => TokenCount;
export type CreateQualityScore = (score: number) => QualityScore;
