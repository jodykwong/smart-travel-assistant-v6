/**
 * 智游助手v5.0 - 旅行规划MCP适配器
 * 将高德MCP官方客户端适配为智游助手的业务需求
 * 
 * 核心功能:
 * 1. 区域数据收集 - 景点、餐厅、酒店、天气
 * 2. 智能数据筛选 - 基于用户偏好过滤
 * 3. 数据质量评估 - 确保规划数据的可靠性
 * 4. 缓存优化 - 减少重复API调用
 */

import { AmapMCPOfficialClient } from './amap-mcp-official-client';
import type {
  RegionData,
  POIData,
  WeatherData,
  UserPreferences,
  RegionInfo,
  TravelStyle,
} from '@/types/travel-planning';

// ============= 旅行规划专用接口 =============

interface TravelDataCollectionOptions {
  region: RegionInfo;
  preferences: UserPreferences;
  maxPOIsPerCategory: number;
  includeWeather: boolean;
  cacheEnabled: boolean;
}

interface DataQualityMetrics {
  attractionsCount: number;
  restaurantsCount: number;
  hotelsCount: number;
  weatherAvailable: boolean;
  overallScore: number;
  recommendations: string[];
}

interface CachedRegionData {
  data: RegionData;
  timestamp: number;
  expiresAt: number;
}

// ============= 旅行规划MCP适配器 =============

export class TravelMCPAdapter {
  private readonly mcpClient: AmapMCPOfficialClient;
  private readonly cache = new Map<string, CachedRegionData>();
  private readonly cacheTimeout = 30 * 60 * 1000; // 30分钟缓存

  constructor(mcpClient?: AmapMCPOfficialClient) {
    this.mcpClient = mcpClient || new AmapMCPOfficialClient();
  }

  // ============= 核心业务方法 =============

  /**
   * 收集区域完整数据 - 智游助手核心功能
   */
  async collectRegionData(
    region: RegionInfo,
    preferences: UserPreferences,
    options: Partial<TravelDataCollectionOptions> = {}
  ): Promise<RegionData> {
    const opts: TravelDataCollectionOptions = {
      region,
      preferences,
      maxPOIsPerCategory: options.maxPOIsPerCategory || 15,
      includeWeather: options.includeWeather ?? true,
      cacheEnabled: options.cacheEnabled ?? true,
      ...options,
    };

    console.log(`🔍 开始收集${region.name}的旅行数据...`);

    // 检查缓存
    if (opts.cacheEnabled) {
      const cached = this.getCachedData(region.name);
      if (cached) {
        console.log(`📦 使用缓存数据: ${region.name}`);
        return cached;
      }
    }

    try {
      // 并行收集各类数据
      const [attractions, restaurants, hotels, weather] = await Promise.allSettled([
        this.collectAttractions(region, preferences, opts.maxPOIsPerCategory),
        this.collectRestaurants(region, preferences, opts.maxPOIsPerCategory),
        this.collectHotels(region, preferences, opts.maxPOIsPerCategory),
        opts.includeWeather ? this.collectWeather(region) : Promise.resolve(this.getDefaultWeather()),
      ]);

      // 构建区域数据
      const regionData: RegionData = {
        attractions: attractions.status === 'fulfilled' ? attractions.value : [],
        restaurants: restaurants.status === 'fulfilled' ? restaurants.value : [],
        hotels: hotels.status === 'fulfilled' ? hotels.value : [],
        weather: weather.status === 'fulfilled' ? weather.value : this.getDefaultWeather(),
        transportation: { flights: [], trains: [], buses: [] }, // 暂时为空
        dataQuality: 0 as any, // 稍后计算
        lastUpdated: new Date().toISOString(),
      };

      // 计算数据质量
      const calculatedQuality = this.calculateDataQuality(regionData);
      (regionData as any).dataQuality = calculatedQuality;

      // 缓存数据
      if (opts.cacheEnabled) {
        this.setCachedData(region.name, regionData);
      }

      console.log(`✅ ${region.name}数据收集完成，质量评分: ${regionData.dataQuality}`);
      return regionData;

    } catch (error) {
      console.error(`❌ ${region.name}数据收集失败:`, error);
      throw new Error(`区域数据收集失败: ${(error as Error).message}`);
    }
  }

  /**
   * 收集景点数据
   */
  private async collectAttractions(
    region: RegionInfo,
    preferences: UserPreferences,
    maxCount: number
  ): Promise<POIData[]> {
    const keywords = this.generateAttractionKeywords(preferences.travelStyles);
    const allAttractions: POIData[] = [];

    for (const keyword of keywords) {
      try {
        const pois = await this.mcpClient.searchPOI({
          keywords: keyword,
          region: region.name,
          category: 'attraction',
          limit: Math.ceil(maxCount / keywords.length),
        });

        allAttractions.push(...pois);
      } catch (error) {
        console.warn(`景点搜索失败 [${keyword}]:`, error);
      }
    }

    // 去重和筛选
    const uniqueAttractions = this.deduplicatePOIs(allAttractions);
    const filteredAttractions = this.filterAttractionsByPreferences(uniqueAttractions, preferences);

    return filteredAttractions.slice(0, maxCount);
  }

  /**
   * 收集餐厅数据
   */
  private async collectRestaurants(
    region: RegionInfo,
    preferences: UserPreferences,
    maxCount: number
  ): Promise<POIData[]> {
    const keywords = this.generateRestaurantKeywords(preferences);
    const allRestaurants: POIData[] = [];

    for (const keyword of keywords) {
      try {
        const pois = await this.mcpClient.searchPOI({
          keywords: keyword,
          region: region.name,
          category: 'restaurant',
          limit: Math.ceil(maxCount / keywords.length),
        });

        allRestaurants.push(...pois);
      } catch (error) {
        console.warn(`餐厅搜索失败 [${keyword}]:`, error);
      }
    }

    // 去重和筛选
    const uniqueRestaurants = this.deduplicatePOIs(allRestaurants);
    const filteredRestaurants = this.filterRestaurantsByPreferences(uniqueRestaurants, preferences);

    return filteredRestaurants.slice(0, maxCount);
  }

  /**
   * 收集酒店数据
   */
  private async collectHotels(
    region: RegionInfo,
    preferences: UserPreferences,
    maxCount: number
  ): Promise<POIData[]> {
    const keywords = this.generateHotelKeywords(preferences);
    const allHotels: POIData[] = [];

    for (const keyword of keywords) {
      try {
        const pois = await this.mcpClient.searchPOI({
          keywords: keyword,
          region: region.name,
          category: 'hotel',
          limit: Math.ceil(maxCount / keywords.length),
        });

        allHotels.push(...pois);
      } catch (error) {
        console.warn(`酒店搜索失败 [${keyword}]:`, error);
      }
    }

    // 去重和筛选
    const uniqueHotels = this.deduplicatePOIs(allHotels);
    const filteredHotels = this.filterHotelsByPreferences(uniqueHotels, preferences);

    return filteredHotels.slice(0, maxCount);
  }

  /**
   * 收集天气数据
   */
  private async collectWeather(region: RegionInfo): Promise<WeatherData> {
    try {
      return await this.mcpClient.getWeather({
        location: region.name,
      });
    } catch (error) {
      console.warn(`天气数据收集失败 [${region.name}]:`, error);
      return this.getDefaultWeather();
    }
  }

  // ============= 智能筛选方法 =============

  private generateAttractionKeywords(travelStyles: readonly TravelStyle[]): string[] {
    const keywordMap: Record<TravelStyle, string[]> = {
      adventure: ['户外', '探险', '徒步', '攀岩', '漂流'],
      culture: ['博物馆', '古迹', '文化', '历史', '寺庙'],
      relaxation: ['公园', '温泉', '度假村', '湖泊', '花园'],
      food: ['美食街', '特色餐厅', '小吃', '夜市', '农家乐'],
      nature: ['自然保护区', '森林', '山峰', '草原', '湿地'],
      shopping: ['商业街', '购物中心', '特产店', '市场', '步行街'],
    };

    const keywords = ['景点', '旅游']; // 基础关键词
    
    travelStyles.forEach(style => {
      keywords.push(...keywordMap[style] || []);
    });

    return [...new Set(keywords)]; // 去重
  }

  private generateRestaurantKeywords(preferences: UserPreferences): string[] {
    const baseKeywords = ['餐厅', '美食'];
    
    // 根据预算添加关键词
    const budgetKeywords: Record<string, string[]> = {
      budget: ['小吃', '快餐', '面馆', '家常菜'],
      'mid-range': ['特色餐厅', '地方菜', '川菜', '湘菜'],
      luxury: ['高档餐厅', '精品餐厅', '米其林', '五星'],
      premium: ['顶级餐厅', '私人定制', '米其林三星', '奢华'],
    };

    return [...baseKeywords, ...(budgetKeywords[preferences.budget] || [])];
  }

  private generateHotelKeywords(preferences: UserPreferences): string[] {
    const accommodationKeywords: Record<string, string[]> = {
      hotel: ['酒店', '宾馆'],
      hostel: ['青年旅社', '客栈', '民宿'],
      bnb: ['民宿', '家庭旅馆', '客栈'],
      resort: ['度假村', '度假酒店', '温泉酒店'],
    };

    const budgetKeywords: Record<string, string[]> = {
      budget: ['经济型', '快捷'],
      'mid-range': ['商务', '精选'],
      luxury: ['豪华', '五星'],
      premium: ['顶级', '奢华', '六星'],
    };

    return [
      ...(accommodationKeywords[preferences.accommodation] || ['酒店']),
      ...(budgetKeywords[preferences.budget] || []),
    ];
  }

  private filterAttractionsByPreferences(pois: POIData[], preferences: UserPreferences): POIData[] {
    return pois
      .filter(poi => poi.rating >= 3.5) // 基础评分筛选
      .sort((a, b) => b.rating - a.rating); // 按评分排序
  }

  private filterRestaurantsByPreferences(pois: POIData[], preferences: UserPreferences): POIData[] {
    // 根据预算筛选价格等级
    const budgetPriceLevels: Record<string, POIData['priceLevel'][]> = {
      budget: ['$', '$$'],
      'mid-range': ['$$', '$$$'],
      luxury: ['$$$', '$$$$'],
      premium: ['$$$$'],
    };

    const allowedPriceLevels = budgetPriceLevels[preferences.budget] || ['$$', '$$$'];

    return pois
      .filter(poi => allowedPriceLevels.includes(poi.priceLevel))
      .filter(poi => poi.rating >= 3.0)
      .sort((a, b) => b.rating - a.rating);
  }

  private filterHotelsByPreferences(pois: POIData[], preferences: UserPreferences): POIData[] {
    // 根据预算和住宿偏好筛选
    const budgetPriceLevels: Record<string, POIData['priceLevel'][]> = {
      budget: ['$', '$$'],
      'mid-range': ['$$', '$$$'],
      luxury: ['$$$', '$$$$'],
      premium: ['$$$$'],
    };

    const allowedPriceLevels = budgetPriceLevels[preferences.budget] || ['$$', '$$$'];

    return pois
      .filter(poi => allowedPriceLevels.includes(poi.priceLevel))
      .filter(poi => poi.rating >= 3.5)
      .sort((a, b) => b.rating - a.rating);
  }

  // ============= 工具方法 =============

  private deduplicatePOIs(pois: POIData[]): POIData[] {
    const seen = new Set<string>();
    return pois.filter(poi => {
      const key = `${poi.name}_${poi.address}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private calculateDataQuality(data: RegionData): number {
    const weights = {
      attractions: 0.4,
      restaurants: 0.3,
      hotels: 0.2,
      weather: 0.1,
    };

    const scores = {
      attractions: Math.min(data.attractions.length / 10, 1),
      restaurants: Math.min(data.restaurants.length / 8, 1),
      hotels: Math.min(data.hotels.length / 5, 1),
      weather: data.weather.condition !== 'unknown' ? 1 : 0,
    };

    const totalScore = Object.entries(weights).reduce(
      (sum, [key, weight]) => sum + scores[key as keyof typeof scores] * weight,
      0
    );

    return Math.round(totalScore * 100) / 100;
  }

  private getDefaultWeather(): WeatherData {
    return {
      temperature: { min: 15, max: 25, avg: 20 },
      condition: 'unknown',
      humidity: 60,
      rainfall: 0,
    };
  }

  // ============= 缓存管理 =============

  private getCacheKey(regionName: string): string {
    return `region_data_${regionName}`;
  }

  private getCachedData(regionName: string): RegionData | null {
    const key = this.getCacheKey(regionName);
    const cached = this.cache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    if (cached) {
      this.cache.delete(key); // 清除过期缓存
    }

    return null;
  }

  private setCachedData(regionName: string, data: RegionData): void {
    const key = this.getCacheKey(regionName);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.cacheTimeout,
    });
  }

  // ============= 健康检查和诊断 =============

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    mcpClient: boolean;
    cacheSize: number;
    details: any;
  }> {
    const mcpHealthy = await this.mcpClient.healthCheck();

    return {
      status: mcpHealthy ? 'healthy' : 'unhealthy',
      mcpClient: mcpHealthy,
      cacheSize: this.cache.size,
      details: {
        availableTools: this.mcpClient.getAvailableTools().map(t => t.name),
        cacheTimeout: this.cacheTimeout,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ MCP缓存已清除');
  }

  /**
   * 获取数据质量报告
   */
  async getDataQualityReport(regionName: string): Promise<DataQualityMetrics | null> {
    const cached = this.getCachedData(regionName);
    if (!cached) return null;

    return {
      attractionsCount: cached.attractions.length,
      restaurantsCount: cached.restaurants.length,
      hotelsCount: cached.hotels.length,
      weatherAvailable: cached.weather.condition !== 'unknown',
      overallScore: cached.dataQuality,
      recommendations: this.generateQualityRecommendations(cached),
    };
  }

  private generateQualityRecommendations(data: RegionData): string[] {
    const recommendations: string[] = [];

    if (data.attractions.length < 5) {
      recommendations.push('建议增加更多景点数据');
    }
    if (data.restaurants.length < 3) {
      recommendations.push('建议增加更多餐厅数据');
    }
    if (data.hotels.length < 2) {
      recommendations.push('建议增加更多住宿数据');
    }
    if (data.weather.condition === 'unknown') {
      recommendations.push('建议获取准确的天气数据');
    }

    return recommendations;
  }
}
