/**
 * 智游助手v5.0 - 旅行计划数据模型
 * 基于领域驱动设计的结构化数据模型
 */

// 基础数据类型
export interface BaseLocation {
  name: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  priceRange?: string;
}

export interface TimeSlot {
  startTime?: string;
  endTime?: string;
  duration?: string;
}

// 住宿数据模型
export interface AccommodationOption extends BaseLocation {
  type: 'hotel' | 'hostel' | 'apartment' | 'resort' | 'guesthouse';
  amenities: string[];
  pricePerNight?: number;
  bookingAdvice?: string;
  nearbyAttractions?: string[];
  checkInTime?: string;
  checkOutTime?: string;
}

export interface AccommodationData {
  overview: string;
  recommendations: AccommodationOption[];
  bookingTips: string[];
  budgetAdvice: string;
  seasonalConsiderations?: string[];
}

// 美食体验数据模型
export interface FoodOption extends BaseLocation {
  type: 'restaurant' | 'street_food' | 'market' | 'cafe' | 'bar';
  cuisine: string;
  specialties: string[];
  averagePrice?: number;
  openingHours?: string;
  mustTryDishes?: string[];
}

export interface FoodDistrict {
  name: string;
  description: string;
  highlights: string[];
  bestTimeToVisit?: string;
}

export interface FoodExperienceData {
  overview: string;
  specialties: string[];
  recommendedRestaurants: FoodOption[];
  foodDistricts: FoodDistrict[];
  localTips: string[];
  dietaryConsiderations?: string[];
}

// 交通数据模型
export interface TransportOption {
  type: 'flight' | 'train' | 'bus' | 'taxi' | 'metro' | 'walking' | 'bike';
  name: string;
  description: string;
  cost?: string;
  duration?: string;
  frequency?: string;
  tips?: string[];
}

export interface RouteInfo {
  from: string;
  to: string;
  options: TransportOption[];
  recommendedOption?: string;
  estimatedCost?: number;
  estimatedTime?: string;
}

export interface TransportationData {
  overview: string;
  arrivalOptions: TransportOption[];
  localTransport: TransportOption[];
  routes: RouteInfo[];
  transportCards?: {
    name: string;
    description: string;
    cost: string;
    benefits: string[];
  }[];
  tips: string[];
}

// 实用贴士数据模型
export interface WeatherInfo {
  season: string;
  temperature: string;
  rainfall: string;
  clothing: string[];
}

export interface CulturalTip {
  category: 'etiquette' | 'customs' | 'language' | 'religion' | 'social';
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
}

export interface SafetyTip {
  category: 'general' | 'health' | 'emergency' | 'scam' | 'transport';
  title: string;
  description: string;
  urgency: 'critical' | 'important' | 'advisory';
}

export interface ShoppingInfo {
  category: string;
  items: string[];
  locations: string[];
  bargainingTips?: string[];
  priceRange?: string;
}

export interface TravelTipsData {
  overview: string;
  weather: WeatherInfo[];
  cultural: CulturalTip[];
  safety: SafetyTip[];
  shopping: ShoppingInfo[];
  emergencyContacts?: {
    service: string;
    number: string;
    description?: string;
  }[];
  budgetTips: string[];
  packingList?: string[];
}

// 主要旅行计划数据模型
export interface TravelPlanData {
  id: string;
  title: string;
  destination: string;
  totalDays: number;
  startDate: string;
  endDate: string;
  totalCost: number;
  groupSize: number;
  overview: string;
  accommodation: AccommodationData;
  foodExperience: FoodExperienceData;
  transportation: TransportationData;
  tips: TravelTipsData;
  createdAt: string;
  updatedAt?: string;
}

// 解析配置
export interface ParseConfig {
  enabledModules: ('accommodation' | 'food' | 'transport' | 'tips')[];
  strictMode: boolean;
  fallbackToDefault: boolean;
  customKeywords?: {
    accommodation?: string[];
    food?: string[];
    transport?: string[];
    tips?: string[];
  };
}

// API集成接口
export interface ExternalServiceConfig {
  accommodation?: {
    provider: 'booking' | 'airbnb' | 'agoda';
    apiKey?: string;
    enabled: boolean;
  };
  food?: {
    provider: 'yelp' | 'tripadvisor' | 'google';
    apiKey?: string;
    enabled: boolean;
  };
  transport?: {
    provider: 'google_maps' | 'amap' | 'baidu';
    apiKey?: string;
    enabled: boolean;
  };
}
