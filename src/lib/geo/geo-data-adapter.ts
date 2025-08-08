/**
 * 智游助手v6.2 - 地理数据适配器
 * 统一高德地图和腾讯地图的数据格式，实现标准化接口
 * 
 * 核心功能:
 * 1. 数据格式标准化转换
 * 2. 错误处理统一化
 * 3. 质量评估和验证
 * 4. 性能监控集成
 */

// 导入类型定义
interface TencentGeocodingResponse {
  status: number;
  message: string;
  result: {
    location: { lat: number; lng: number };
    formatted_addresses: { recommend: string };
    address_components: {
      province: string;
      city: string;
      district: string;
      street: string;
      street_number: string;
    };
    reliability: number;
  };
}

interface TencentReverseGeocodingResponse {
  status: number;
  message: string;
  result: {
    location: { lat: number; lng: number };
    formatted_addresses: { recommend: string };
    address_components: {
      province: string;
      city: string;
      district: string;
      street: string;
      street_number: string;
    };
  };
}

interface TencentPlaceSearchResponse {
  status: number;
  message: string;
  result: {
    data: Array<{
      id: string;
      title: string;
      address: string;
      location: { lat: number; lng: number };
      category: string;
      type: number;
      tel?: string;
      _distance?: number;
    }>;
    count: number;
  };
}

interface TencentDirectionResponse {
  status: number;
  message: string;
  result: {
    routes: Array<{
      mode: string;
      distance: number;
      duration: number;
      polyline: string;
      steps: Array<{
        instruction: string;
        road_name: string;
        distance: number;
        duration: number;
        polyline: string;
      }>;
    }>;
  };
}

// ============= 标准化数据接口定义 =============

export interface StandardLocation {
  latitude: number;
  longitude: number;
}

export interface StandardAddressComponents {
  province: string;
  city: string;
  district: string;
  street: string;
  streetNumber?: string;
}

export interface StandardGeocodingResponse {
  location: StandardLocation;
  address: string;
  addressComponents: StandardAddressComponents;
  confidence: number;
  source: 'amap' | 'tencent';
  timestamp: Date;
  quality: {
    accuracy: number;
    completeness: number;
    reliability: number;
  };
}

export interface StandardReverseGeocodingResponse {
  location: StandardLocation;
  address: string;
  addressComponents: StandardAddressComponents;
  confidence: number;
  source: 'amap' | 'tencent';
  timestamp: Date;
  quality: {
    accuracy: number;
    completeness: number;
    reliability: number;
  };
}

export interface StandardPlace {
  id: string;
  name: string;
  location: StandardLocation;
  address: string;
  category: string;
  rating?: number;
  distance?: number;
  phone?: string;
  type?: string;
  businessArea?: string;  // 商圈信息
  openingHours?: string;  // 营业时间
  website?: string;       // 官网
  photos?: string[];      // 照片URLs
}

export interface StandardPlaceSearchResponse {
  places: StandardPlace[];
  total: number;
  source: 'amap' | 'tencent';
  timestamp: Date;
  quality: {
    accuracy: number;
    completeness: number;
    relevance: number;
  };
}

export interface StandardRouteStep {
  instruction: string;
  roadName: string;
  distance: number;
  duration: number;
  polyline?: string;
  maneuver?: string;      // 转向动作
  orientation?: string;   // 方向
}

export interface StandardRoute {
  mode: 'driving' | 'walking' | 'transit' | 'bicycling';
  distance: number;
  duration: number;
  polyline?: string;
  steps: StandardRouteStep[];
  tolls?: number;         // 过路费
  trafficInfo?: string;   // 交通信息
  restrictions?: string[]; // 限制信息
}

export interface StandardDirectionResponse {
  routes: StandardRoute[];
  source: 'amap' | 'tencent';
  timestamp: Date;
  quality: {
    accuracy: number;
    completeness: number;
    efficiency: number;
  };
}

// ============= 高德地图响应接口（简化） =============

interface AmapGeocodingResponse {
  status: string;
  info: string;
  geocodes: Array<{
    formatted_address: string;
    location: string;
    level: string;
    province: string;
    city: string;
    district: string;
    street: string;
  }>;
}

interface AmapPlaceSearchResponse {
  status: string;
  info: string;
  pois: Array<{
    id: string;
    name: string;
    location: string;
    address: string;
    pname: string;
    cityname: string;
    adname: string;
    type: string;
    typecode: string;
    distance?: string;
    tel?: string;
  }>;
  count: string;
}

// ============= 地理数据适配器实现 =============

export class GeoDataAdapter {
  
  // ============= 地理编码适配 =============

  /**
   * 标准化地理编码响应
   */
  normalizeGeocodingResponse(
    response: AmapGeocodingResponse | TencentGeocodingResponse,
    source: 'amap' | 'tencent'
  ): StandardGeocodingResponse {
    if (source === 'amap') {
      return this.convertAmapGeocoding(response as AmapGeocodingResponse);
    } else {
      return this.convertTencentGeocoding(response as TencentGeocodingResponse);
    }
  }

  private convertAmapGeocoding(response: AmapGeocodingResponse): StandardGeocodingResponse {
    if (!response.geocodes || response.geocodes.length === 0) {
      throw new Error('高德地理编码无结果');
    }

    const geocode = response.geocodes[0];

    // 验证坐标格式
    if (!geocode || !geocode.location || !geocode.location.includes(',')) {
      throw new Error('高德地理编码坐标格式无效');
    }

    const coords = geocode.location.split(',');
    if (coords.length !== 2) {
      throw new Error('高德地理编码坐标格式错误');
    }

    const [longitude, latitude] = coords.map(Number);

    // 验证坐标范围（中国境内）
    if (longitude !== undefined && latitude !== undefined &&
        (longitude < 73 || longitude > 135 || latitude < 3 || latitude > 54)) {
      console.warn(`高德地理编码坐标超出中国范围: ${longitude}, ${latitude}`);
    }

    const confidence = this.calculateAmapConfidence(geocode.level);
    const accuracy = this.calculateEnhancedAmapAccuracy(geocode);
    const completeness = this.calculateAmapCompleteness(geocode);

    return {
      location: {
        latitude: latitude || 0,
        longitude: longitude || 0
      },
      address: geocode.formatted_address || '',
      addressComponents: {
        province: geocode.province || '',
        city: geocode.city || '',
        district: geocode.district || '',
        street: geocode.street || ''
      },
      confidence,
      source: 'amap',
      timestamp: new Date(),
      quality: {
        accuracy,
        completeness,
        reliability: 0.95 // 高德地图基础可靠性
      }
    };
  }

  private convertTencentGeocoding(response: TencentGeocodingResponse): StandardGeocodingResponse {
    if (response.status !== 0) {
      throw new Error(`腾讯地理编码失败: ${response.message}`);
    }

    const result = response.result;

    // 验证坐标有效性
    if (!result.location || typeof result.location.lat !== 'number' || typeof result.location.lng !== 'number') {
      throw new Error('腾讯地理编码坐标数据无效');
    }

    const { lat: latitude, lng: longitude } = result.location;

    // 验证坐标范围（中国境内）
    if (longitude < 73 || longitude > 135 || latitude < 3 || latitude > 54) {
      console.warn(`腾讯地理编码坐标超出中国范围: ${longitude}, ${latitude}`);
    }

    // 使用增强的质量评估
    const qualityMetrics = this.calculateEnhancedTencentQuality(result);
    const confidence = qualityMetrics.reliability;

    return {
      location: { latitude, longitude },
      address: result.formatted_addresses?.recommend || '',
      addressComponents: {
        province: result.address_components?.province || '',
        city: result.address_components?.city || '',
        district: result.address_components?.district || '',
        street: result.address_components?.street || '',
        streetNumber: result.address_components?.street_number || ''
      },
      confidence,
      source: 'tencent',
      timestamp: new Date(),
      quality: qualityMetrics
    };
  }

  // ============= 逆地理编码适配 =============

  /**
   * 标准化逆地理编码响应
   */
  normalizeReverseGeocodingResponse(
    response: any,
    source: 'amap' | 'tencent'
  ): StandardReverseGeocodingResponse {
    if (source === 'amap') {
      return this.convertAmapReverseGeocoding(response);
    } else {
      return this.convertTencentReverseGeocoding(response as TencentReverseGeocodingResponse);
    }
  }

  private convertAmapReverseGeocoding(response: any): StandardReverseGeocodingResponse {
    const regeocode = response.regeocode;
    const addressComponent = regeocode.addressComponent;
    
    return {
      location: {
        latitude: parseFloat(response.regeocode.location?.split(',')[1] || '0'),
        longitude: parseFloat(response.regeocode.location?.split(',')[0] || '0')
      },
      address: regeocode.formatted_address,
      addressComponents: {
        province: addressComponent.province,
        city: addressComponent.city,
        district: addressComponent.district,
        street: addressComponent.streetNumber?.street || ''
      },
      confidence: 0.9,
      source: 'amap',
      timestamp: new Date(),
      quality: {
        accuracy: 0.9,
        completeness: this.calculateAmapCompleteness(addressComponent),
        reliability: 0.95
      }
    };
  }

  private convertTencentReverseGeocoding(response: TencentReverseGeocodingResponse): StandardReverseGeocodingResponse {
    if (response.status !== 0) {
      throw new Error(`腾讯逆地理编码失败: ${response.message}`);
    }

    const result = response.result;

    return {
      location: {
        latitude: result.location.lat,
        longitude: result.location.lng
      },
      address: result.formatted_addresses.recommend,
      addressComponents: {
        province: result.address_components.province,
        city: result.address_components.city,
        district: result.address_components.district,
        street: result.address_components.street,
        streetNumber: result.address_components.street_number
      },
      confidence: 0.9,
      source: 'tencent',
      timestamp: new Date(),
      quality: {
        accuracy: 0.9,
        completeness: this.calculateTencentCompleteness(result.address_components),
        reliability: 0.93
      }
    };
  }

  // ============= POI搜索适配 =============

  /**
   * 标准化POI搜索响应
   */
  normalizePlaceSearchResponse(
    response: AmapPlaceSearchResponse | TencentPlaceSearchResponse,
    source: 'amap' | 'tencent'
  ): StandardPlaceSearchResponse {
    if (source === 'amap') {
      return this.convertAmapPlaceSearch(response as AmapPlaceSearchResponse);
    } else {
      return this.convertTencentPlaceSearch(response as TencentPlaceSearchResponse);
    }
  }

  private convertAmapPlaceSearch(response: AmapPlaceSearchResponse): StandardPlaceSearchResponse {
    if (!response.pois || response.pois.length === 0) {
      return {
        places: [],
        total: 0,
        source: 'amap',
        timestamp: new Date(),
        quality: {
          accuracy: 0,
          completeness: 0,
          relevance: 0
        }
      };
    }

    const places: StandardPlace[] = response.pois.map(poi => {
      // 验证坐标格式
      if (!poi.location || !poi.location.includes(',')) {
        console.warn(`高德POI坐标格式无效: ${poi.id}`);
        return null;
      }

      const coords = poi.location.split(',');
      if (coords.length !== 2) {
        console.warn(`高德POI坐标格式错误: ${poi.id}`);
        return null;
      }

      const [longitude, latitude] = coords.map(Number);

      // 验证坐标有效性
      if (longitude === undefined || latitude === undefined ||
          isNaN(longitude) || isNaN(latitude)) {
        console.warn(`高德POI坐标数值无效: ${poi.id}`);
        return null;
      }

      return {
        id: poi.id || '',
        name: poi.name || '',
        location: { latitude, longitude },
        address: poi.address || '',
        category: poi.type || '',
        distance: poi.distance ? parseInt(poi.distance) : undefined,
        phone: poi.tel || undefined,
        type: poi.typecode || undefined,
        // 新增字段
        rating: this.extractAmapRating(poi),
        businessArea: poi.adname || undefined
      };
    }).filter(place => place !== null) as StandardPlace[];

    const completeness = this.calculatePlaceCompleteness(places);
    const relevance = this.calculateAmapPlaceRelevance(places, response);

    return {
      places,
      total: parseInt(response.count) || places.length,
      source: 'amap',
      timestamp: new Date(),
      quality: {
        accuracy: 0.92,
        completeness,
        relevance
      }
    };
  }

  /**
   * 提取高德POI评分信息
   */
  private extractAmapRating(poi: any): number | undefined {
    // 高德地图可能在扩展信息中包含评分
    if (poi.rating && !isNaN(parseFloat(poi.rating))) {
      return parseFloat(poi.rating);
    }
    return undefined;
  }

  /**
   * 计算高德POI搜索相关性
   */
  private calculateAmapPlaceRelevance(places: StandardPlace[], response: any): number {
    if (places.length === 0) return 0;

    let relevanceScore = 0.9; // 基础相关性

    // 根据结果数量调整相关性
    if (places.length > 20) relevanceScore *= 0.95;
    else if (places.length < 5) relevanceScore *= 0.9;

    // 根据数据完整性调整
    const avgCompleteness = places.reduce((sum, place) => {
      let fields = 0;
      let filledFields = 0;

      ['name', 'address', 'category', 'phone'].forEach(field => {
        fields++;
        if (place[field as keyof StandardPlace]) filledFields++;
      });

      return sum + (filledFields / fields);
    }, 0) / places.length;

    relevanceScore *= (0.7 + avgCompleteness * 0.3);

    return Math.min(1.0, relevanceScore);
  }

  private convertTencentPlaceSearch(response: TencentPlaceSearchResponse): StandardPlaceSearchResponse {
    if (response.status !== 0) {
      throw new Error(`腾讯POI搜索失败: ${response.message}`);
    }

    if (!response.result || !response.result.data || response.result.data.length === 0) {
      return {
        places: [],
        total: 0,
        source: 'tencent',
        timestamp: new Date(),
        quality: {
          accuracy: 0,
          completeness: 0,
          relevance: 0
        }
      };
    }

    const places: StandardPlace[] = response.result.data.map(place => {
      // 验证坐标有效性
      if (!place.location || typeof place.location.lat !== 'number' || typeof place.location.lng !== 'number') {
        console.warn(`腾讯POI坐标数据无效: ${place.id}`);
        return null;
      }

      const { lat: latitude, lng: longitude } = place.location;

      // 验证坐标范围
      if (isNaN(latitude) || isNaN(longitude)) {
        console.warn(`腾讯POI坐标数值无效: ${place.id}`);
        return null;
      }

      return {
        id: place.id || '',
        name: place.title || '',
        location: { latitude, longitude },
        address: place.address || '',
        category: place.category || '',
        distance: place._distance || undefined,
        phone: place.tel || undefined,
        type: place.type?.toString() || undefined,
        // 新增字段
        rating: this.extractTencentRating(place),
        businessArea: this.extractTencentBusinessArea(place)
      };
    }).filter(place => place !== null) as StandardPlace[];

    const completeness = this.calculatePlaceCompleteness(places);
    const relevance = this.calculateTencentPlaceRelevance(places, response);

    return {
      places,
      total: response.result.count || places.length,
      source: 'tencent',
      timestamp: new Date(),
      quality: {
        accuracy: 0.90,
        completeness,
        relevance
      }
    };
  }

  /**
   * 提取腾讯POI评分信息
   */
  private extractTencentRating(place: any): number | undefined {
    // 腾讯地图可能在不同字段中包含评分信息
    if (place.rating && !isNaN(parseFloat(place.rating))) {
      return parseFloat(place.rating);
    }
    if (place.score && !isNaN(parseFloat(place.score))) {
      return parseFloat(place.score);
    }
    return undefined;
  }

  /**
   * 提取腾讯POI商圈信息
   */
  private extractTencentBusinessArea(place: any): string | undefined {
    return place.ad_info?.district || place.district || undefined;
  }

  /**
   * 计算腾讯POI搜索相关性
   */
  private calculateTencentPlaceRelevance(places: StandardPlace[], response: any): number {
    if (places.length === 0) return 0;

    let relevanceScore = 0.88; // 基础相关性（略低于高德）

    // 根据结果数量调整相关性
    if (places.length > 20) relevanceScore *= 0.95;
    else if (places.length < 5) relevanceScore *= 0.9;

    // 根据距离信息调整相关性
    const placesWithDistance = places.filter(p => p.distance !== undefined);
    if (placesWithDistance.length > 0) {
      relevanceScore *= 1.02; // 有距离信息的结果相关性更高
    }

    // 根据数据完整性调整
    const avgCompleteness = places.reduce((sum, place) => {
      let fields = 0;
      let filledFields = 0;

      ['name', 'address', 'category', 'phone'].forEach(field => {
        fields++;
        if (place[field as keyof StandardPlace]) filledFields++;
      });

      return sum + (filledFields / fields);
    }, 0) / places.length;

    relevanceScore *= (0.7 + avgCompleteness * 0.3);

    return Math.min(1.0, relevanceScore);
  }

  // ============= 路线规划适配 =============

  /**
   * 标准化路线规划响应
   */
  normalizeDirectionResponse(
    response: any,
    source: 'amap' | 'tencent',
    mode: 'driving' | 'walking' | 'transit' | 'bicycling'
  ): StandardDirectionResponse {
    if (source === 'amap') {
      return this.convertAmapDirection(response, mode);
    } else {
      return this.convertTencentDirection(response as TencentDirectionResponse, mode);
    }
  }

  private convertAmapDirection(response: any, mode: 'driving' | 'walking' | 'transit' | 'bicycling'): StandardDirectionResponse {
    if (!response.route) {
      throw new Error('高德路线规划无结果');
    }

    const routeKey = mode === 'driving' ? 'routes' : mode === 'walking' ? 'paths' : 'transits';
    const routes = response.route[routeKey] || [];

    if (routes.length === 0) {
      return {
        routes: [],
        source: 'amap',
        timestamp: new Date(),
        quality: {
          accuracy: 0,
          completeness: 0,
          efficiency: 0
        }
      };
    }

    const standardRoutes: StandardRoute[] = routes.map((route: any) => {
      // 验证路线数据完整性
      const distance = this.parseDistance(route.distance);
      const duration = this.parseDuration(route.duration);

      if (distance <= 0 || duration <= 0) {
        console.warn(`高德路线数据异常: distance=${distance}, duration=${duration}`);
      }

      const steps = this.convertAmapRouteSteps(route.steps || [], mode);

      return {
        mode,
        distance,
        duration,
        polyline: route.polyline || '',
        steps,
        // 新增字段
        tolls: this.parseAmapTolls(route),
        trafficInfo: this.parseAmapTraffic(route),
        restrictions: this.parseAmapRestrictions(route)
      };
    }).filter((route: any) => route.distance > 0 && route.duration > 0);

    const completeness = this.calculateRouteCompleteness(standardRoutes);
    const efficiency = this.calculateAmapRouteEfficiency(standardRoutes, mode);

    return {
      routes: standardRoutes,
      source: 'amap',
      timestamp: new Date(),
      quality: {
        accuracy: 0.94,
        completeness,
        efficiency
      }
    };
  }

  /**
   * 转换高德路线步骤
   */
  private convertAmapRouteSteps(steps: any[], mode: string): StandardRouteStep[] {
    return steps.map(step => ({
      instruction: step.instruction || '',
      roadName: step.road || step.road_name || '',
      distance: this.parseDistance(step.distance),
      duration: this.parseDuration(step.duration),
      polyline: step.polyline || '',
      // 新增字段
      maneuver: step.action || undefined,
      orientation: step.orientation || undefined
    }));
  }

  /**
   * 解析高德路线过路费信息
   */
  private parseAmapTolls(route: any): number | undefined {
    if (route.tolls && !isNaN(parseFloat(route.tolls))) {
      return parseFloat(route.tolls);
    }
    return undefined;
  }

  /**
   * 解析高德交通信息
   */
  private parseAmapTraffic(route: any): string | undefined {
    return route.traffic_lights || route.traffic || undefined;
  }

  /**
   * 解析高德路线限制信息
   */
  private parseAmapRestrictions(route: any): string[] {
    const restrictions: string[] = [];
    if (route.restriction) {
      restrictions.push(route.restriction);
    }
    return restrictions;
  }

  /**
   * 计算高德路线效率评分
   */
  private calculateAmapRouteEfficiency(routes: StandardRoute[], mode: string): number {
    if (routes.length === 0) return 0;

    let efficiency = 0.92; // 基础效率

    // 根据路线模式调整
    const modeEfficiency = {
      driving: 0.94,
      walking: 0.90,
      transit: 0.88,
      bicycling: 0.91
    };

    efficiency = (modeEfficiency as any)[mode] || 0.90;

    // 根据路线数量调整（多路线选择更好）
    if (routes.length > 1) {
      efficiency *= 1.02;
    }

    // 根据步骤详细程度调整
    const avgStepsPerRoute = routes.reduce((sum, route) => sum + route.steps.length, 0) / routes.length;
    if (avgStepsPerRoute > 10) {
      efficiency *= 1.01; // 详细步骤提高效率评分
    }

    return Math.min(1.0, efficiency);
  }

  private convertTencentDirection(response: TencentDirectionResponse, mode: 'driving' | 'walking' | 'transit' | 'bicycling'): StandardDirectionResponse {
    if (response.status !== 0) {
      throw new Error(`腾讯路线规划失败: ${response.message}`);
    }

    if (!response.result || !response.result.routes || response.result.routes.length === 0) {
      return {
        routes: [],
        source: 'tencent',
        timestamp: new Date(),
        quality: {
          accuracy: 0,
          completeness: 0,
          efficiency: 0
        }
      };
    }

    const standardRoutes: StandardRoute[] = response.result.routes.map(route => {
      // 验证路线数据
      const distance = route.distance || 0;
      const duration = route.duration || 0;

      if (distance <= 0 || duration <= 0) {
        console.warn(`腾讯路线数据异常: distance=${distance}, duration=${duration}`);
      }

      const steps = this.convertTencentRouteSteps(route.steps || []);

      return {
        mode,
        distance,
        duration,
        polyline: route.polyline || '',
        steps,
        // 新增字段
        tolls: this.parseTencentTolls(route) || 0,
        trafficInfo: this.parseTencentTraffic(route) || '',
        restrictions: this.parseTencentRestrictions(route)
      };
    }).filter(route => route.distance > 0 && route.duration > 0);

    const completeness = this.calculateRouteCompleteness(standardRoutes);
    const efficiency = this.calculateTencentRouteEfficiency(standardRoutes, mode);

    return {
      routes: standardRoutes,
      source: 'tencent',
      timestamp: new Date(),
      quality: {
        accuracy: 0.91,
        completeness,
        efficiency
      }
    };
  }

  /**
   * 转换腾讯路线步骤
   */
  private convertTencentRouteSteps(steps: any[]): StandardRouteStep[] {
    return steps.map(step => ({
      instruction: step.instruction || '',
      roadName: step.road_name || '',
      distance: step.distance || 0,
      duration: step.duration || 0,
      polyline: step.polyline || '',
      // 新增字段
      maneuver: step.maneuver || undefined,
      orientation: step.direction || undefined
    }));
  }

  /**
   * 解析腾讯路线过路费信息
   */
  private parseTencentTolls(route: any): number | undefined {
    if (route.toll && !isNaN(parseFloat(route.toll))) {
      return parseFloat(route.toll);
    }
    return undefined;
  }

  /**
   * 解析腾讯交通信息
   */
  private parseTencentTraffic(route: any): string | undefined {
    return route.traffic || route.traffic_light || undefined;
  }

  /**
   * 解析腾讯路线限制信息
   */
  private parseTencentRestrictions(route: any): string[] {
    const restrictions: string[] = [];
    if (route.restriction) {
      if (Array.isArray(route.restriction)) {
        restrictions.push(...route.restriction);
      } else {
        restrictions.push(route.restriction);
      }
    }
    return restrictions;
  }

  /**
   * 计算腾讯路线效率评分
   */
  private calculateTencentRouteEfficiency(routes: StandardRoute[], mode: string): number {
    if (routes.length === 0) return 0;

    let efficiency = 0.89; // 基础效率（略低于高德）

    // 根据路线模式调整
    const modeEfficiency = {
      driving: 0.91,
      walking: 0.88,
      transit: 0.86,
      bicycling: 0.89
    };

    efficiency = (modeEfficiency as any)[mode] || 0.88;

    // 根据路线数量调整
    if (routes.length > 1) {
      efficiency *= 1.02;
    }

    // 根据步骤详细程度调整
    const avgStepsPerRoute = routes.reduce((sum, route) => sum + route.steps.length, 0) / routes.length;
    if (avgStepsPerRoute > 8) {
      efficiency *= 1.01;
    }

    return Math.min(1.0, efficiency);
  }

  // ============= 质量评估辅助方法 =============

  private calculateAmapConfidence(level: string): number {
    const levelMap: Record<string, number> = {
      '国家': 0.6,
      '省': 0.7,
      '市': 0.8,
      '区县': 0.85,
      '开发区': 0.85,
      '乡镇': 0.9,
      '村庄': 0.9,
      '热点商圈': 0.95,
      '兴趣点': 0.98,
      '门牌号': 1.0,
      // 新增更多级别支持
      '道路': 0.92,
      '路口': 0.88,
      '建筑物': 0.95,
      '小区': 0.93,
      '写字楼': 0.96
    };
    return levelMap[level] || 0.8;
  }

  /**
   * 增强的高德地图准确性计算
   */
  private calculateEnhancedAmapAccuracy(geocode: any): number {
    let accuracy = this.calculateAmapConfidence(geocode.level);

    // 根据地址完整性调整准确性
    const completeness = this.calculateAmapCompleteness(geocode);
    accuracy = accuracy * (0.7 + completeness * 0.3);

    // 根据坐标精度调整（如果有小数位数信息）
    if (geocode.location) {
      const coords = geocode.location.split(',');
      if (coords.length === 2) {
        const lngPrecision = (coords[0].split('.')[1] || '').length;
        const latPrecision = (coords[1].split('.')[1] || '').length;
        const avgPrecision = (lngPrecision + latPrecision) / 2;

        // 精度越高，准确性越高
        if (avgPrecision >= 6) accuracy *= 1.05;
        else if (avgPrecision >= 4) accuracy *= 1.02;
        else if (avgPrecision < 2) accuracy *= 0.95;
      }
    }

    return Math.min(1.0, accuracy);
  }

  private calculateAmapAccuracy(level: string): number {
    return this.calculateAmapConfidence(level);
  }

  private calculateAmapCompleteness(data: any): number {
    let score = 0;
    let total = 0;

    const fields = ['province', 'city', 'district', 'street'];
    fields.forEach(field => {
      total++;
      if (data[field] && data[field].trim()) {
        score++;
      }
    });

    return total > 0 ? score / total : 0;
  }

  private calculateTencentCompleteness(addressComponents: any): number {
    let score = 0;
    let total = 0;

    // 基础字段权重
    const fieldWeights = {
      province: 0.2,
      city: 0.3,
      district: 0.3,
      street: 0.15,
      street_number: 0.05
    };

    Object.entries(fieldWeights).forEach(([field, weight]) => {
      total += weight;
      if (addressComponents[field] && addressComponents[field].trim()) {
        score += weight;
      }
    });

    return total > 0 ? score / total : 0;
  }

  /**
   * 增强的腾讯地图质量评估
   */
  private calculateEnhancedTencentQuality(result: any): {
    accuracy: number;
    completeness: number;
    reliability: number;
  } {
    // 基础可靠性评分
    let reliability = result.reliability || 0.8;

    // 根据相似度和偏差调整可靠性
    if (result.similarity !== undefined) {
      reliability = reliability * (0.5 + result.similarity * 0.5);
    }

    if (result.deviation !== undefined) {
      // 偏差越小，可靠性越高
      const deviationFactor = Math.max(0.5, 1 - result.deviation / 1000);
      reliability = reliability * deviationFactor;
    }

    // 计算完整性
    const completeness = this.calculateTencentCompleteness(result.address_components);

    // 准确性基于可靠性和完整性
    const accuracy = reliability * (0.7 + completeness * 0.3);

    return {
      accuracy: Math.min(1.0, accuracy),
      completeness,
      reliability: Math.min(1.0, reliability)
    };
  }

  private calculatePlaceCompleteness(places: StandardPlace[]): number {
    if (places.length === 0) return 0;

    let totalScore = 0;
    places.forEach(place => {
      let score = 0;
      let total = 0;

      const fields = ['name', 'address', 'category'];
      fields.forEach(field => {
        total++;
        if (place[field as keyof StandardPlace] && 
            String(place[field as keyof StandardPlace]).trim()) {
          score++;
        }
      });

      totalScore += total > 0 ? score / total : 0;
    });

    return totalScore / places.length;
  }

  private calculateRouteCompleteness(routes: StandardRoute[]): number {
    if (routes.length === 0) return 0;

    let totalScore = 0;
    routes.forEach(route => {
      let score = 0;
      let total = 3; // distance, duration, steps

      if (route.distance > 0) score++;
      if (route.duration > 0) score++;
      if (route.steps && route.steps.length > 0) score++;

      totalScore += score / total;
    });

    return totalScore / routes.length;
  }

  // ============= 辅助方法 =============

  /**
   * 解析距离字符串为数字（米）
   */
  private parseDistance(distance: any): number {
    if (typeof distance === 'number') {
      return distance;
    }

    if (typeof distance === 'string') {
      const num = parseFloat(distance);
      return isNaN(num) ? 0 : num;
    }

    return 0;
  }

  /**
   * 解析时间字符串为数字（秒）
   */
  private parseDuration(duration: any): number {
    if (typeof duration === 'number') {
      return duration;
    }

    if (typeof duration === 'string') {
      const num = parseFloat(duration);
      return isNaN(num) ? 0 : num;
    }

    return 0;
  }

  /**
   * 验证坐标是否在中国境内
   */
  private isCoordinateInChina(longitude: number, latitude: number): boolean {
    return longitude >= 73 && longitude <= 135 && latitude >= 3 && latitude <= 54;
  }

  /**
   * 格式化地址组件
   */
  private formatAddressComponent(component: any): string {
    if (!component) return '';
    if (typeof component === 'string') return component.trim();
    return String(component).trim();
  }

  /**
   * 安全的数值转换
   */
  private safeParseFloat(value: any, defaultValue: number = 0): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }

    return defaultValue;
  }
}

export default GeoDataAdapter;
