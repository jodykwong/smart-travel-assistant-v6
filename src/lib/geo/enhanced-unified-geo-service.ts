/**
 * 智游助手v6.2 - 增强型统一地理服务
 * 遵循原则: [SOLID-依赖倒置] + [为失败而设计] + [第一性原理]
 * 
 * 重构目标:
 * 1. 解决腾讯地图数据利用不足问题
 * 2. 实现专业化数据源选择策略
 * 3. 保持与Phase 1/Phase 2架构100%兼容
 */

import { UnifiedGeoService } from './unified-geo-service';
import EnhancedTencentMCPClient from '../mcp/enhanced-tencent-mcp-client';
import EnhancedGeoDataAdapter, { 
  EnhancedStandardPlaceSearchResponse,
  SpecializedServiceSelector 
} from './enhanced-geo-data-adapter';

// ============= 增强型统一地理服务实现 =============

export class EnhancedUnifiedGeoService extends UnifiedGeoService {
  private enhancedTencentClient: EnhancedTencentMCPClient;
  private enhancedAdapter: EnhancedGeoDataAdapter;
  private serviceSelector: typeof SpecializedServiceSelector;

  constructor(config: any, originalAdapter: any) {
    super(config);
    
    // 初始化增强组件
    this.enhancedTencentClient = new EnhancedTencentMCPClient(config.tencentApiKey);
    this.enhancedAdapter = new EnhancedGeoDataAdapter(originalAdapter);
    this.serviceSelector = SpecializedServiceSelector;
    
    console.log('增强型统一地理服务初始化完成');
  }

  // ============= 向后兼容方法 =============

  /**
   * 保持与原有接口100%兼容
   * 遵循原则: [SOLID-里氏替换原则]
   */
  override async placeSearch(keywords: string, location: string, radius?: number): Promise<any> {
    // 委托给父类，确保兼容性
    return await super.placeSearch(keywords, location, radius);
  }

  override async geocoding(address: string): Promise<any> {
    return await super.geocoding(address);
  }

  override async routePlanning(origin: string, destination: string, mode?: string): Promise<any> {
    const validMode = (mode as 'walking' | 'driving' | 'transit' | 'bicycling') || 'driving';
    return await super.routePlanning(origin, destination, validMode);
  }

  // ============= 增强型方法 =============

  /**
   * 智能POI搜索 - 核心增强功能
   * 遵循原则: [第一性原理] - 根据查询类型选择最优数据源
   */
  async intelligentPlaceSearch(
    keywords: string,
    location: string,
    options: {
      radius?: number;
      category?: string;
      includeLifestyleData?: boolean;
      userPreferences?: string[];
    } = {}
  ): Promise<EnhancedStandardPlaceSearchResponse> {
    
    console.log(`🧠 智能POI搜索: ${keywords} (${location})`);
    
    // 1. 智能服务选择
    const serviceStrategy = this.serviceSelector.selectOptimalService(
      keywords,
      options.category,
      {
        ...(options.userPreferences && { userPreferences: options.userPreferences }),
        ...(location && { location })
      }
    );
    
    console.log(`📊 服务选择策略: ${serviceStrategy.primary} (${serviceStrategy.reason})`);
    
    try {
      // 2. 执行主要服务查询
      const primaryResult = await this.executeEnhancedSearch(
        serviceStrategy.primary,
        keywords,
        location,
        options
      );
      
      // 3. 评估是否需要数据融合
      if (serviceStrategy.strategy === 'fusion' || 
          this.serviceSelector.shouldFuseData(primaryResult, keywords)) {
        
        console.log('🔄 执行数据融合策略...');
        return await this.fuseSearchResults(
          primaryResult,
          serviceStrategy.secondary,
          keywords,
          location,
          options
        );
      }
      
      return primaryResult;
      
    } catch (error) {
      console.error(`❌ 主要服务 ${serviceStrategy.primary} 查询失败:`, error);
      
      // 4. 降级到备用服务
      console.log(`🔄 降级到备用服务: ${serviceStrategy.secondary}`);
      return await this.executeEnhancedSearch(
        serviceStrategy.secondary,
        keywords,
        location,
        options
      );
    }
  }

  /**
   * 专业美食推荐
   * 遵循原则: [第一性原理] - 充分利用腾讯地图的美食数据优势
   */
  async getFoodRecommendations(
    location: string,
    preferences: {
      cuisineTypes?: string[];
      priceRange?: 'budget' | 'mid' | 'high' | 'luxury';
      mealTime?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      radius?: number;
    } = {}
  ): Promise<EnhancedStandardPlaceSearchResponse> {
    
    console.log(`🍽️  专业美食推荐: ${location}`);
    
    try {
      // 优先使用腾讯地图的美食推荐API
      const tencentResponse = await this.enhancedTencentClient.getFoodRecommendations(
        location,
        preferences
      );
      
      // 转换为标准格式
      return this.convertFoodRecommendToStandard(tencentResponse, location);
      
    } catch (error) {
      console.error('❌ 腾讯地图美食推荐失败:', error);
      
      // 降级到生活服务搜索
      return await this.intelligentPlaceSearch('美食餐厅', location, {
        category: 'food',
        ...(preferences.radius && { radius: preferences.radius }),
        includeLifestyleData: true
      });
    }
  }

  /**
   * 热门生活服务获取
   */
  async getTrendingLifestyleServices(
    location: string,
    category: 'food' | 'shopping' | 'entertainment' | 'all' = 'all'
  ): Promise<EnhancedStandardPlaceSearchResponse> {
    
    console.log(`🔥 获取热门生活服务: ${location} (${category})`);
    
    try {
      // 优先使用腾讯地图的热门数据
      const tencentResponse = await this.enhancedTencentClient.getTrendingLifestyleServices(
        location,
        category
      );
      
      return await this.enhancedAdapter.adaptTencentEnhancedPlaceSearch(
        tencentResponse,
        { query: '热门生活服务', location, category }
      );
      
    } catch (error) {
      console.error('❌ 获取热门生活服务失败:', error);
      
      // 降级策略
      const keywords = this.getCategoryKeywords(category);
      return await this.intelligentPlaceSearch(keywords, location, {
        category,
        includeLifestyleData: true
      });
    }
  }

  // ============= 私有辅助方法 =============

  /**
   * 执行增强搜索
   */
  private async executeEnhancedSearch(
    service: 'amap' | 'tencent',
    keywords: string,
    location: string,
    options: any
  ): Promise<EnhancedStandardPlaceSearchResponse> {
    
    if (service === 'tencent') {
      // 使用增强型腾讯地图客户端
      const response = await this.enhancedTencentClient.lifestyleSearch(
        keywords,
        location,
        {
          ...(this.mapCategoryToTencent(options.category) && {
            category: this.mapCategoryToTencent(options.category)
          }),
          ...(options.radius && { radius: options.radius }),
          includeDetails: options.includeLifestyleData !== false,
          sortBy: 'rating' as const
        }
      );
      
      return await this.enhancedAdapter.adaptTencentEnhancedPlaceSearch(
        response,
        { query: keywords, location, category: options.category }
      );
      
    } else {
      // 使用高德地图 (通过原有服务)
      const response = await super.placeSearch(keywords, location, options.radius);
      
      // 转换为增强格式
      return this.convertAmapToEnhanced(response, keywords, location);
    }
  }

  /**
   * 数据融合策略
   * 遵循原则: [为失败而设计] - 多数据源互补
   */
  private async fuseSearchResults(
    primaryResult: EnhancedStandardPlaceSearchResponse,
    secondaryService: 'amap' | 'tencent',
    keywords: string,
    location: string,
    options: any
  ): Promise<EnhancedStandardPlaceSearchResponse> {
    
    try {
      const secondaryResult = await this.executeEnhancedSearch(
        secondaryService,
        keywords,
        location,
        options
      );
      
      // 融合结果
      const fusedPlaces = this.mergePlaceResults(
        primaryResult.places,
        secondaryResult.places
      );
      
      return {
        ...primaryResult,
        places: fusedPlaces,
        total: fusedPlaces.length,
        searchContext: {
          ...primaryResult.searchContext,
          dataType: 'enhanced'
        },
        quality: {
          accuracy: Math.max(primaryResult.quality.accuracy, secondaryResult.quality.accuracy),
          completeness: (primaryResult.quality.completeness + secondaryResult.quality.completeness) / 2,
          reliability: Math.max(primaryResult.quality.reliability, secondaryResult.quality.reliability),
          dataRichness: Math.max(primaryResult.quality.dataRichness, secondaryResult.quality.dataRichness)
        }
      };
      
    } catch (error) {
      console.warn('⚠️  数据融合失败，返回主要结果:', error);
      return primaryResult;
    }
  }

  /**
   * 合并POI结果
   */
  private mergePlaceResults(primary: any[], secondary: any[]): any[] {
    const merged = [...primary];
    const primaryIds = new Set(primary.map(p => p.id));
    
    // 添加不重复的次要结果
    secondary.forEach(place => {
      if (!primaryIds.has(place.id)) {
        merged.push(place);
      }
    });
    
    // 按数据丰富度和评分排序
    return merged
      .sort((a, b) => {
        const scoreA = (a.dataRichness || 0) * 0.6 + (a.rating || 0) * 0.4;
        const scoreB = (b.dataRichness || 0) * 0.6 + (b.rating || 0) * 0.4;
        return scoreB - scoreA;
      })
      .slice(0, 20); // 限制结果数量
  }

  /**
   * 转换美食推荐为标准格式
   */
  private convertFoodRecommendToStandard(response: any, location: string): EnhancedStandardPlaceSearchResponse {
    const places = response.result.recommendations.map((item: any) => ({
      id: item.id,
      name: item.name,
      location: item.location,
      address: item.address,
      category: '美食餐厅',
      rating: item.rating,
      distance: item.distance,
      source: 'tencent' as const,
      dataRichness: 0.8, // 美食推荐数据丰富度较高
      lastUpdated: new Date(),
      lifeServiceData: {
        cuisine: {
          type: item.cuisine_type,
          priceRange: item.price_range,
          signature: item.signature_dishes,
          taste: {
            overall: item.rating,
            environment: 0,
            service: 0,
            value: 0
          }
        },
        social: {
          hotness: item.popularity_score,
          recommendReason: item.recommend_reason,
          userTags: [],
          trendingReason: undefined
        }
      }
    }));

    return {
      places,
      total: response.result.total,
      source: 'tencent',
      timestamp: new Date(),
      searchContext: {
        query: '美食推荐',
        location,
        dataType: 'enhanced'
      },
      quality: {
        accuracy: 0.9,
        completeness: 0.85,
        reliability: 0.88,
        dataRichness: 0.8
      }
    };
  }

  private convertAmapToEnhanced(response: any, keywords: string, location: string): EnhancedStandardPlaceSearchResponse {
    // 将高德地图响应转换为增强格式
    const places = response.places?.map((place: any) => ({
      ...place,
      source: 'amap' as const,
      dataRichness: 0.4, // 高德地图基础数据丰富度较低
      lastUpdated: new Date()
    })) || [];

    return {
      places,
      total: response.total || places.length,
      source: 'amap',
      timestamp: new Date(),
      searchContext: {
        query: keywords,
        location,
        dataType: 'basic'
      },
      quality: {
        accuracy: 0.92,
        completeness: 0.7,
        reliability: 0.9,
        dataRichness: 0.4
      }
    };
  }

  private mapCategoryToTencent(category?: string): 'food' | 'shopping' | 'entertainment' | 'service' | undefined {
    const mapping: Record<string, any> = {
      '美食': 'food',
      '餐厅': 'food',
      '购物': 'shopping',
      '娱乐': 'entertainment',
      '生活': 'service'
    };
    return category ? mapping[category] : undefined;
  }

  private getCategoryKeywords(category: string): string {
    const keywords: Record<string, string> = {
      'food': '美食餐厅',
      'shopping': '购物商场',
      'entertainment': '娱乐休闲',
      'all': '生活服务'
    };
    return keywords[category] || '生活服务';
  }
}

export default EnhancedUnifiedGeoService;
