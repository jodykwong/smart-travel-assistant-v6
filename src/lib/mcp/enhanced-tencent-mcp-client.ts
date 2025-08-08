/**
 * 智游助手v6.2 - 增强型腾讯地图MCP客户端
 * 遵循原则: [SOLID-开闭原则] + [API优先设计] + [为失败而设计]
 * 
 * 核心功能:
 * 1. 扩展腾讯地图生活服务API调用
 * 2. 美食推荐和生活服务数据获取
 * 3. 与原有TencentMCPClient完全兼容
 * 4. 智能API选择和降级策略
 */

import { TencentMCPClient } from './tencent-mcp-client';

// ============= 增强型API响应接口 =============

export interface TencentLifestyleSearchResponse {
  status: number;
  message: string;
  result: {
    data: Array<{
      id: string;
      title: string;
      location: { lat: number; lng: number };
      address: string;
      category: string;
      
      // 生活服务增强数据
      detail: {
        // 基础信息
        rating?: number;
        price_level?: number;
        price_desc?: string;
        
        // 美食特色数据
        cuisine_info?: {
          cuisine_type: string[];
          signature_dishes: string[];
          taste_rating: {
            overall: number;
            taste: number;
            environment: number;
            service: number;
            value: number;
          };
        };
        
        // 营业和服务信息
        business_info?: {
          opening_hours: string;
          phone: string;
          website?: string;
          booking_supported: boolean;
          delivery_supported: boolean;
        };
        
        // 设施和服务
        facilities: string[];
        services: string[];
        
        // 社交和热度数据
        social_data?: {
          checkin_count: number;
          review_count: number;
          hot_score: number;
          trending_reason?: string;
          user_tags: string[];
          recommend_reason?: string;
        };
        
        // 图片和媒体
        photos?: string[];
        videos?: string[];
      };
    }>;
    count: number;
    has_more: boolean;
  };
}

export interface TencentFoodRecommendResponse {
  status: number;
  message: string;
  result: {
    recommendations: Array<{
      id: string;
      name: string;
      location: { lat: number; lng: number };
      address: string;
      cuisine_type: string[];
      rating: number;
      price_range: string;
      signature_dishes: string[];
      recommend_reason: string;
      distance?: number;
      popularity_score: number;
    }>;
    total: number;
    recommendation_context: {
      location: string;
      preferences?: string[];
      time_of_day?: string;
    };
  };
}

// ============= 增强型腾讯地图MCP客户端 =============

export class EnhancedTencentMCPClient extends TencentMCPClient {
  private readonly lifestyleApiBase: string;
  private readonly recommendApiBase: string;

  constructor(apiKey: string, options: any = {}) {
    super();
    
    // 腾讯地图生活服务API端点
    this.lifestyleApiBase = 'https://apis.map.qq.com/ws/place/v1';
    this.recommendApiBase = 'https://apis.map.qq.com/ws/lifestyle/v1';
    
    console.log('增强型腾讯地图MCP客户端初始化完成');
  }

  // ============= 生活服务增强API =============

  /**
   * 生活服务增强搜索
   * 遵循原则: [API优先设计] - 专门的生活服务数据获取
   */
  async lifestyleSearch(
    keywords: string,
    location: string,
    options: {
      category?: 'food' | 'shopping' | 'entertainment' | 'service';
      radius?: number;
      includeDetails?: boolean;
      sortBy?: 'distance' | 'rating' | 'popularity';
    } = {}
  ): Promise<TencentLifestyleSearchResponse> {
    
    const params: any = {
      keyword: keywords,
      boundary: `nearby(${location},${options.radius || 2000})`,
      key: this.getApiKey(),
      page_size: 20,
      page_index: 1,
      
      // 增强参数
      get_detail: options.includeDetails !== false ? 1 : 0,
      orderby: this.mapSortBy(options.sortBy || 'distance'),
      filter: options.category ? `category:${options.category}` : undefined
    };

    try {
      console.log(`🔍 腾讯地图生活服务搜索: ${keywords} (${location})`);
      
      const response = await this.makeEnhancedRequest<TencentLifestyleSearchResponse>(
        `${this.lifestyleApiBase}/search`,
        params
      );

      console.log(`✅ 生活服务搜索完成，找到 ${response.result.count} 个结果`);
      return response;

    } catch (error) {
      console.error('❌ 腾讯地图生活服务搜索失败:', error);
      
      // 降级到基础POI搜索
      console.log('🔄 降级到基础POI搜索...');
      return await this.fallbackToBasicSearch(keywords, location, options);
    }
  }

  /**
   * 美食推荐API
   * 遵循原则: [第一性原理] - 专门优化美食推荐场景
   */
  async getFoodRecommendations(
    location: string,
    preferences: {
      cuisineTypes?: string[];
      priceRange?: 'budget' | 'mid' | 'high' | 'luxury';
      mealTime?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      dietaryRestrictions?: string[];
      radius?: number;
    } = {}
  ): Promise<TencentFoodRecommendResponse> {
    
    const params: any = {
      location: location,
      key: this.getApiKey(),
      
      // 美食推荐专用参数
      cuisine_types: preferences.cuisineTypes?.join(','),
      price_range: preferences.priceRange,
      meal_time: preferences.mealTime,
      dietary_restrictions: preferences.dietaryRestrictions?.join(','),
      radius: preferences.radius || 3000,
      recommendation_count: 10
    };

    try {
      console.log(`🍽️  腾讯地图美食推荐: ${location}`);
      
      const response = await this.makeEnhancedRequest<TencentFoodRecommendResponse>(
        `${this.recommendApiBase}/food/recommend`,
        params
      );

      console.log(`✅ 美食推荐完成，推荐 ${response.result.recommendations.length} 家餐厅`);
      return response;

    } catch (error) {
      console.error('❌ 腾讯地图美食推荐失败:', error);
      
      // 降级到生活服务搜索
      return await this.fallbackToLifestyleSearch(location, '美食', preferences);
    }
  }

  /**
   * 热门生活服务获取
   * 遵循原则: [为失败而设计] - 多重降级策略
   */
  async getTrendingLifestyleServices(
    location: string,
    category: 'food' | 'shopping' | 'entertainment' | 'all' = 'all'
  ): Promise<TencentLifestyleSearchResponse> {
    
    const params: any = {
      location: location,
      category: category,
      key: this.getApiKey(),
      sort_by: 'trending',
      time_range: '7d', // 最近7天的热门数据
      limit: 15
    };

    try {
      console.log(`🔥 获取热门生活服务: ${location} (${category})`);
      
      const response = await this.makeEnhancedRequest<TencentLifestyleSearchResponse>(
        `${this.lifestyleApiBase}/trending`,
        params
      );

      return response;

    } catch (error) {
      console.error('❌ 获取热门生活服务失败:', error);
      
      // 多级降级策略
      return await this.executeMultiLevelFallback(location, category);
    }
  }

  // ============= 智能降级策略 =============

  /**
   * 降级到基础POI搜索
   * 遵循原则: [为失败而设计] - 确保服务可用性
   */
  private async fallbackToBasicSearch(
    keywords: string,
    location: string,
    options: any
  ): Promise<TencentLifestyleSearchResponse> {
    
    try {
      // 调用父类的基础搜索方法
      const basicResponse = await super.placeSearch(keywords, location, options.radius);
      
      // 转换为增强格式
      return this.convertBasicToEnhanced(basicResponse, keywords, location);
      
    } catch (error) {
      console.error('❌ 基础POI搜索也失败了:', error);
      throw new Error('腾讯地图服务完全不可用');
    }
  }

  /**
   * 美食推荐降级到生活服务搜索
   */
  private async fallbackToLifestyleSearch(
    location: string,
    keywords: string,
    preferences: any
  ): Promise<TencentFoodRecommendResponse> {
    
    try {
      const lifestyleResponse = await this.lifestyleSearch(keywords, location, {
        category: 'food',
        radius: preferences.radius,
        sortBy: 'rating'
      });
      
      return this.convertLifestyleToFoodRecommend(lifestyleResponse, location, preferences);
      
    } catch (error) {
      console.error('❌ 生活服务搜索降级也失败了:', error);
      throw new Error('美食推荐服务不可用');
    }
  }

  /**
   * 多级降级策略
   */
  private async executeMultiLevelFallback(
    location: string,
    category: string
  ): Promise<TencentLifestyleSearchResponse> {
    
    const fallbackStrategies = [
      () => this.lifestyleSearch(this.getCategoryKeywords(category), location),
      () => super.placeSearch(this.getCategoryKeywords(category), location),
      () => this.getEmptyLifestyleResponse(location, category)
    ];

    for (const strategy of fallbackStrategies) {
      try {
        const result = await strategy();
        if (result) return result as TencentLifestyleSearchResponse;
      } catch (error) {
        console.warn('降级策略失败，尝试下一个:', (error as Error).message);
      }
    }

    throw new Error('所有降级策略都失败了');
  }

  // ============= 辅助方法 =============

  private async makeEnhancedRequest<T>(endpoint: string, params: Record<string, any>): Promise<T> {
    // 复用父类的请求方法，但添加增强功能
    const url = new URL(endpoint);
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key].toString());
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'SmartTravelAssistant/6.2',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private mapSortBy(sortBy: string): string {
    const mapping: Record<string, string> = {
      'distance': '_distance',
      'rating': '_rating',
      'popularity': '_popularity'
    };
    return mapping[sortBy] || '_distance';
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

  private convertBasicToEnhanced(basicResponse: any, keywords: string, location: string): TencentLifestyleSearchResponse {
    // 将基础响应转换为增强格式
    return {
      status: basicResponse.status,
      message: basicResponse.message,
      result: {
        data: basicResponse.result.data.map((item: any) => ({
          ...item,
          detail: {
            rating: item.rating,
            facilities: [],
            services: [],
            social_data: {
              checkin_count: 0,
              review_count: 0,
              hot_score: 0.5,
              user_tags: []
            }
          }
        })),
        count: basicResponse.result.count,
        has_more: false
      }
    };
  }

  private convertLifestyleToFoodRecommend(
    lifestyleResponse: TencentLifestyleSearchResponse,
    location: string,
    preferences: any
  ): TencentFoodRecommendResponse {
    
    return {
      status: lifestyleResponse.status,
      message: lifestyleResponse.message,
      result: {
        recommendations: lifestyleResponse.result.data.map(item => ({
          id: item.id,
          name: item.title,
          location: item.location,
          address: item.address,
          cuisine_type: item.detail.cuisine_info?.cuisine_type || [],
          rating: item.detail.rating || 0,
          price_range: item.detail.price_desc || '未知',
          signature_dishes: item.detail.cuisine_info?.signature_dishes || [],
          recommend_reason: item.detail.social_data?.recommend_reason || '推荐餐厅',
          popularity_score: item.detail.social_data?.hot_score || 0.5
        })),
        total: lifestyleResponse.result.count,
        recommendation_context: {
          location,
          preferences: preferences.cuisineTypes
        }
      }
    };
  }

  private getEmptyLifestyleResponse(location: string, category: string): TencentLifestyleSearchResponse {
    return {
      status: 0,
      message: 'No data available',
      result: {
        data: [],
        count: 0,
        has_more: false
      }
    };
  }

  private getApiKey(): string {
    // 访问父类的私有属性需要通过反射或公共方法
    return (this as any).apiKey;
  }
}

export default EnhancedTencentMCPClient;
