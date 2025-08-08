/**
 * 智游助手v6.2 - 增强型地理数据适配器
 * 遵循原则: [SOLID-开闭原则] + [第一性原理] + [高内聚，低耦合]
 * 
 * 核心功能:
 * 1. 扩展腾讯地图生活服务数据集成
 * 2. 专业化数据源选择策略
 * 3. 丰富的生活服务数据模型
 * 4. 与Phase 1/Phase 2架构100%兼容
 */

// ============= 增强型数据接口定义 =============

export interface EnhancedStandardPlace {
  // 基础信息 (保持与原有接口兼容)
  id: string;
  name: string;
  location: { lat: number; lng: number };
  address: string;
  category: string;
  rating?: number;
  distance?: number;
  
  // 增强型生活服务数据
  lifeServiceData?: {
    // 美食相关
    cuisine?: {
      type: string[];           // 菜系类型
      priceRange: string;       // 价格区间
      signature: string[];      // 招牌菜
      taste: {                  // 口味评价
        overall: number;        // 综合评分
        environment: number;    // 环境评分
        service: number;        // 服务评分
        value: number;          // 性价比评分
      };
      checkinCount?: number;    // 签到次数
      reviewCount?: number;     // 评论数量
    };
    
    // 生活服务
    services?: {
      type: 'shopping' | 'entertainment' | 'healthcare' | 'education' | 'finance' | 'other';
      features: string[];       // 服务特色
      facilities: string[];     // 设施信息
      accessibility: boolean;   // 无障碍设施
      parking: boolean;         // 停车场
      wifi: boolean;           // WiFi
    };
    
    // 社交数据 (腾讯地图特色)
    social?: {
      hotness: number;         // 热度指数
      trendingReason?: string; // 热门原因
      userTags: string[];      // 用户标签
      recommendReason?: string; // 推荐理由
    };
    
    // 营业信息
    business?: {
      hours: string;           // 营业时间
      phone?: string;          // 联系电话
      website?: string;        // 官网
      booking?: boolean;       // 是否支持预订
      delivery?: boolean;      // 是否支持外卖
    };
  };
  
  // 数据来源和质量
  source: 'amap' | 'tencent';
  dataRichness: number;        // 数据丰富度评分 (0-1)
  lastUpdated: Date;
}

export interface EnhancedStandardPlaceSearchResponse {
  places: EnhancedStandardPlace[];
  total: number;
  source: 'amap' | 'tencent';
  timestamp: Date;
  searchContext: {
    query: string;
    location?: string;
    category?: string;
    dataType: 'basic' | 'enhanced' | 'lifestyle';  // 数据类型标识
  };
  quality: {
    accuracy: number;
    completeness: number;
    reliability: number;
    dataRichness: number;      // 新增：数据丰富度
  };
}

// ============= 腾讯地图增强API响应接口 =============

interface TencentEnhancedPlaceResponse {
  status: number;
  message: string;
  result: {
    data: Array<{
      id: string;
      title: string;
      location: { lat: number; lng: number };
      address: string;
      category: string;
      
      // 腾讯地图特有的生活服务数据
      detail?: {
        rating?: number;
        price?: string;
        taste?: {
          overall_rating: number;
          environment_rating: number;
          service_rating: number;
          value_rating: number;
        };
        cuisine_type?: string[];
        signature_dishes?: string[];
        checkin_num?: number;
        comment_num?: number;
        tel?: string;
        opening_hours?: string;
        facilities?: string[];
        tags?: string[];
        hot_reason?: string;
        recommend_reason?: string;
      };
    }>;
    count: number;
  };
}

// ============= 增强型地理数据适配器实现 =============

export class EnhancedGeoDataAdapter {
  private originalAdapter: any; // 原有适配器实例，保持兼容性

  constructor(originalAdapter: any) {
    this.originalAdapter = originalAdapter;
    console.log('增强型地理数据适配器初始化完成');
  }

  // ============= 向后兼容方法 =============

  /**
   * 保持与原有接口的100%兼容性
   * 遵循原则: [SOLID-里氏替换原则]
   */
  async adaptTencentPlaceSearch(response: any): Promise<any> {
    // 委托给原有适配器，确保兼容性
    return await this.originalAdapter.adaptTencentPlaceSearch(response);
  }

  async adaptAmapPlaceSearch(response: any): Promise<any> {
    return await this.originalAdapter.adaptAmapPlaceSearch(response);
  }

  // ============= 增强型适配方法 =============

  /**
   * 腾讯地图增强型POI搜索适配
   * 遵循原则: [第一性原理] - 最大化保留原始数据价值
   */
  async adaptTencentEnhancedPlaceSearch(
    response: TencentEnhancedPlaceResponse,
    searchContext: { query: string; location?: string; category?: string }
  ): Promise<EnhancedStandardPlaceSearchResponse> {
    
    if (response.status !== 0) {
      throw new Error(`腾讯地图API错误: ${response.message}`);
    }

    const places: EnhancedStandardPlace[] = response.result.data.map(item => {
      // 基础数据适配
      const basePlace: EnhancedStandardPlace = {
        id: item.id,
        name: item.title,
        location: item.location,
        address: item.address,
        category: item.category,
        rating: item.detail?.rating || 0,
        source: 'tencent',
        dataRichness: this.calculateDataRichness(item),
        lastUpdated: new Date()
      };

      // 增强型生活服务数据适配
      if (item.detail) {
        const lifeServiceData = this.adaptLifeServiceData(item.detail);
        if (lifeServiceData) {
          basePlace.lifeServiceData = lifeServiceData;
        }
      }

      return basePlace;
    });

    return {
      places,
      total: response.result.count,
      source: 'tencent',
      timestamp: new Date(),
      searchContext: {
        ...searchContext,
        dataType: 'enhanced'
      },
      quality: {
        accuracy: 0.92,
        completeness: this.calculateCompleteness(places),
        reliability: 0.88,
        dataRichness: this.calculateAverageDataRichness(places)
      }
    };
  }

  /**
   * 生活服务数据适配
   * 遵循原则: [高内聚，低耦合] - 专门处理生活服务数据
   */
  private adaptLifeServiceData(detail: any): EnhancedStandardPlace['lifeServiceData'] {
    const lifeServiceData: EnhancedStandardPlace['lifeServiceData'] = {};

    // 美食数据适配
    if (detail.taste || detail.cuisine_type || detail.signature_dishes) {
      lifeServiceData.cuisine = {
        type: detail.cuisine_type || [],
        priceRange: detail.price || '未知',
        signature: detail.signature_dishes || [],
        taste: {
          overall: detail.taste?.overall_rating || 0,
          environment: detail.taste?.environment_rating || 0,
          service: detail.taste?.service_rating || 0,
          value: detail.taste?.value_rating || 0
        },
        checkinCount: detail.checkin_num,
        reviewCount: detail.comment_num
      };
    }

    // 生活服务数据适配
    if (detail.facilities || detail.tags) {
      lifeServiceData.services = {
        type: this.categorizeServiceType(detail.tags || []),
        features: detail.tags || [],
        facilities: detail.facilities || [],
        accessibility: this.checkAccessibility(detail.facilities || []),
        parking: this.checkParking(detail.facilities || []),
        wifi: this.checkWifi(detail.facilities || [])
      };
    }

    // 社交数据适配 (腾讯地图特色)
    if (detail.hot_reason || detail.recommend_reason || detail.tags) {
      lifeServiceData.social = {
        hotness: this.calculateHotness(detail),
        trendingReason: detail.hot_reason,
        userTags: detail.tags || [],
        recommendReason: detail.recommend_reason
      };
    }

    // 营业信息适配
    if (detail.opening_hours || detail.tel) {
      lifeServiceData.business = {
        hours: detail.opening_hours || '营业时间未知',
        phone: detail.tel,
        booking: this.checkBookingSupport(detail.facilities || []),
        delivery: this.checkDeliverySupport(detail.tags || [])
      };
    }

    return lifeServiceData;
  }

  // ============= 数据质量评估方法 =============

  /**
   * 计算数据丰富度
   * 遵循原则: [第一性原理] - 量化数据价值
   */
  private calculateDataRichness(item: any): number {
    let score = 0.3; // 基础分

    if (item.detail) {
      if (item.detail.rating) score += 0.1;
      if (item.detail.taste) score += 0.2;
      if (item.detail.cuisine_type?.length > 0) score += 0.1;
      if (item.detail.signature_dishes?.length > 0) score += 0.1;
      if (item.detail.facilities?.length > 0) score += 0.1;
      if (item.detail.tags?.length > 0) score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private calculateCompleteness(places: EnhancedStandardPlace[]): number {
    if (places.length === 0) return 0;

    const totalScore = places.reduce((sum, place) => {
      let score = 0.5; // 基础信息分
      
      if (place.lifeServiceData?.cuisine) score += 0.2;
      if (place.lifeServiceData?.services) score += 0.15;
      if (place.lifeServiceData?.social) score += 0.1;
      if (place.lifeServiceData?.business) score += 0.05;
      
      return sum + Math.min(score, 1.0);
    }, 0);

    return totalScore / places.length;
  }

  private calculateAverageDataRichness(places: EnhancedStandardPlace[]): number {
    if (places.length === 0) return 0;
    return places.reduce((sum, place) => sum + place.dataRichness, 0) / places.length;
  }

  // ============= 辅助方法 =============

  private categorizeServiceType(tags: string[]): 'shopping' | 'entertainment' | 'healthcare' | 'education' | 'finance' | 'other' {
    const shoppingTags = ['购物', '商场', '超市', '便利店'];
    const entertainmentTags = ['娱乐', '电影', 'KTV', '游戏'];
    const healthcareTags = ['医院', '诊所', '药店', '体检'];
    
    if (tags.some(tag => shoppingTags.some(st => tag.includes(st)))) return 'shopping';
    if (tags.some(tag => entertainmentTags.some(et => tag.includes(et)))) return 'entertainment';
    if (tags.some(tag => healthcareTags.some(ht => tag.includes(ht)))) return 'healthcare';
    
    return 'other';
  }

  private checkAccessibility(facilities: string[]): boolean {
    return facilities.some(f => f.includes('无障碍') || f.includes('轮椅'));
  }

  private checkParking(facilities: string[]): boolean {
    return facilities.some(f => f.includes('停车') || f.includes('车位'));
  }

  private checkWifi(facilities: string[]): boolean {
    return facilities.some(f => f.includes('WiFi') || f.includes('无线网络'));
  }

  private checkBookingSupport(facilities: string[]): boolean {
    return facilities.some(f => f.includes('预订') || f.includes('预约'));
  }

  private checkDeliverySupport(tags: string[]): boolean {
    return tags.some(t => t.includes('外卖') || t.includes('配送'));
  }

  private calculateHotness(detail: any): number {
    let hotness = 0.5; // 基础热度
    
    if (detail.checkin_num) {
      hotness += Math.min(detail.checkin_num / 1000, 0.3);
    }
    
    if (detail.comment_num) {
      hotness += Math.min(detail.comment_num / 500, 0.2);
    }
    
    return Math.min(hotness, 1.0);
  }

  // ============= 智能数据源选择 =============

  /**
   * 基于数据类型的智能服务选择建议
   * 遵循原则: [第一性原理] - 发挥各服务的数据优势
   */
  getOptimalServiceForDataType(dataType: 'navigation' | 'lifestyle' | 'basic'): 'amap' | 'tencent' {
    switch (dataType) {
      case 'navigation':
        return 'amap';      // 高德在导航数据上更优
      case 'lifestyle':
        return 'tencent';   // 腾讯在生活服务数据上更优
      case 'basic':
        return 'amap';      // 默认使用高德
      default:
        return 'amap';
    }
  }

  /**
   * 数据融合建议
   * 遵循原则: [为失败而设计] - 多数据源互补
   */
  shouldUseDataFusion(searchContext: { category?: string; query: string }): boolean {
    const lifestyleCategories = ['餐厅', '美食', '购物', '娱乐', '生活服务'];
    const query = searchContext.query.toLowerCase();
    const category = searchContext.category?.toLowerCase() || '';
    
    return lifestyleCategories.some(lc => 
      query.includes(lc) || category.includes(lc)
    );
  }
}

// ============= 专业化服务选择策略 =============

export class SpecializedServiceSelector {
  /**
   * 基于查询内容的智能服务选择
   * 遵循原则: [第一性原理] - 发挥各服务的天然优势
   */
  static selectOptimalService(
    query: string,
    category?: string,
    context?: { userPreferences?: string[]; location?: string }
  ): {
    primary: 'amap' | 'tencent';
    secondary: 'amap' | 'tencent';
    strategy: 'single' | 'fusion' | 'fallback';
    reason: string;
  } {

    const queryLower = query.toLowerCase();
    const categoryLower = category?.toLowerCase() || '';

    // 生活服务关键词
    const lifestyleKeywords = [
      '美食', '餐厅', '小吃', '火锅', '烧烤', '咖啡', '奶茶',
      '购物', '商场', '超市', '便利店', '专卖店',
      '娱乐', '电影', 'KTV', '酒吧', '夜店', '游戏厅',
      '生活', '服务', '理发', '美容', '洗衣', '维修'
    ];

    // 导航交通关键词
    const navigationKeywords = [
      '路线', '导航', '驾车', '公交', '地铁', '步行', '骑行',
      '交通', '路况', '拥堵', '限行', '停车', '加油站'
    ];

    // 检查是否为生活服务查询
    const isLifestyleQuery = lifestyleKeywords.some(keyword =>
      queryLower.includes(keyword) || categoryLower.includes(keyword)
    );

    // 检查是否为导航查询
    const isNavigationQuery = navigationKeywords.some(keyword =>
      queryLower.includes(keyword) || categoryLower.includes(keyword)
    );

    if (isLifestyleQuery) {
      return {
        primary: 'tencent',
        secondary: 'amap',
        strategy: 'fusion',
        reason: '腾讯地图在生活服务数据方面更丰富，建议数据融合'
      };
    }

    if (isNavigationQuery) {
      return {
        primary: 'amap',
        secondary: 'tencent',
        strategy: 'single',
        reason: '高德地图在导航和交通数据方面更专业'
      };
    }

    // 默认策略
    return {
      primary: 'amap',
      secondary: 'tencent',
      strategy: 'fallback',
      reason: '通用查询，优先使用高德地图，腾讯地图作为备选'
    };
  }

  /**
   * 评估是否需要数据融合
   */
  static shouldFuseData(
    primaryResult: EnhancedStandardPlaceSearchResponse,
    query: string
  ): boolean {
    // 如果主要结果数据丰富度较低，建议融合
    if (primaryResult.quality.dataRichness < 0.6) {
      return true;
    }

    // 如果是生活服务查询且结果较少，建议融合
    const isLifestyleQuery = this.selectOptimalService(query).primary === 'tencent';
    if (isLifestyleQuery && primaryResult.places.length < 5) {
      return true;
    }

    return false;
  }
}

export default EnhancedGeoDataAdapter;
