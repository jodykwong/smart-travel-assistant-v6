/**
 * 智游助手v6.2 - 腾讯地图MCP客户端
 * 基于腾讯位置服务API实现，作为高德MCP的备用链路
 * 
 * 核心特性:
 * 1. 与高德MCP功能对等的API调用
 * 2. 标准化错误处理
 * 3. 性能监控和质量评估
 * 4. 智能重试机制
 */

import type { 
  RegionData, 
  POIData, 
  WeatherData, 
  TransportationData 
} from '@/types/travel-planning';

// ============= 腾讯地图API响应接口 =============

interface TencentBaseResponse {
  status: number;
  message: string;
  request_id?: string;
}

interface TencentGeocodingResponse extends TencentBaseResponse {
  result: {
    location: {
      lat: number;
      lng: number;
    };
    formatted_addresses: {
      recommend: string;
      rough: string;
    };
    address_components: {
      province: string;
      city: string;
      district: string;
      street: string;
      street_number: string;
    };
    similarity: number;
    deviation: number;
    reliability: number;
  };
}

interface TencentReverseGeocodingResponse extends TencentBaseResponse {
  result: {
    location: {
      lat: number;
      lng: number;
    };
    formatted_addresses: {
      recommend: string;
      rough: string;
    };
    address_components: {
      province: string;
      city: string;
      district: string;
      street: string;
      street_number: string;
    };
    ad_info: {
      nation_code: string;
      adcode: string;
      city_code: string;
    };
  };
}

interface TencentPlaceSearchResponse extends TencentBaseResponse {
  result: {
    data: Array<{
      id: string;
      title: string;
      address: string;
      location: {
        lat: number;
        lng: number;
      };
      category: string;
      type: number;
      tel?: string;
      _distance?: number;
    }>;
    count: number;
  };
}

interface TencentDirectionResponse extends TencentBaseResponse {
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

interface TencentWeatherResponse extends TencentBaseResponse {
  result: {
    location: {
      lat: number;
      lng: number;
    };
    now: {
      temperature: number;
      weather: string;
      weather_code: number;
      wind_direction: string;
      wind_speed: number;
      humidity: number;
      visibility: number;
    };
    forecast: Array<{
      date: string;
      weather: string;
      weather_code: number;
      temperature_max: number;
      temperature_min: number;
    }>;
  };
}

// ============= 腾讯地图MCP客户端实现 =============

export class TencentMCPClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryAttempts: number;

  constructor() {
    this.apiKey = process.env.TENCENT_MCP_API_KEY!;
    this.baseUrl = process.env.TENCENT_WEBSERVICE_BASE_URL!;
    this.timeout = parseInt(process.env.MCP_TIMEOUT!) || 30000;
    this.retryAttempts = parseInt(process.env.MCP_RETRY_ATTEMPTS!) || 3;

    if (!this.apiKey) {
      throw new Error('腾讯地图API密钥未配置');
    }
  }

  // ============= 地理编码服务 =============

  /**
   * 地理编码：地址转经纬度
   */
  async geocoding(address: string, city?: string): Promise<TencentGeocodingResponse> {
    const params = {
      address: city ? `${city}${address}` : address,
      key: this.apiKey
    };

    return await this.makeRequest<TencentGeocodingResponse>('/geocoder/v1/', params);
  }

  /**
   * 逆地理编码：经纬度转地址
   */
  async reverseGeocoding(location: string): Promise<TencentReverseGeocodingResponse> {
    const params = {
      location,
      key: this.apiKey,
      get_poi: 1
    };

    return await this.makeRequest<TencentReverseGeocodingResponse>('/geocoder/v1/', params);
  }

  // ============= POI搜索服务 =============

  /**
   * POI搜索
   */
  async placeSearch(keywords: string, location?: string, radius?: number): Promise<TencentPlaceSearchResponse> {
    const params: any = {
      keyword: keywords,
      key: this.apiKey,
      page_size: 20
    };

    if (location) {
      params.boundary = `nearby(${location},${radius || 1000})`;
    }

    return await this.makeRequest<TencentPlaceSearchResponse>('/place/v1/search', params);
  }

  /**
   * POI建议搜索
   */
  async placeSuggestion(keywords: string, location?: string): Promise<TencentPlaceSearchResponse> {
    const params: any = {
      keyword: keywords,
      key: this.apiKey,
      page_size: 10
    };

    if (location) {
      params.location = location;
    }

    return await this.makeRequest<TencentPlaceSearchResponse>('/place/v1/suggestion', params);
  }

  /**
   * 周边搜索
   */
  async placeSearchNearby(location: string, keywords?: string, radius: number = 1000): Promise<TencentPlaceSearchResponse> {
    const params: any = {
      boundary: `nearby(${location},${radius})`,
      key: this.apiKey,
      page_size: 20
    };

    if (keywords) {
      params.keyword = keywords;
    }

    return await this.makeRequest<TencentPlaceSearchResponse>('/place/v1/search', params);
  }

  // ============= 路线规划服务 =============

  /**
   * 驾车路线规划
   */
  async directionDriving(origin: string, destination: string, waypoints?: string[]): Promise<TencentDirectionResponse> {
    const params: any = {
      from: origin,
      to: destination,
      key: this.apiKey
    };

    if (waypoints && waypoints.length > 0) {
      params.waypoints = waypoints.join(';');
    }

    return await this.makeRequest<TencentDirectionResponse>('/direction/v1/driving/', params);
  }

  /**
   * 步行路线规划
   */
  async directionWalking(origin: string, destination: string): Promise<TencentDirectionResponse> {
    const params = {
      from: origin,
      to: destination,
      key: this.apiKey
    };

    return await this.makeRequest<TencentDirectionResponse>('/direction/v1/walking/', params);
  }

  /**
   * 公交路线规划
   */
  async directionTransit(origin: string, destination: string, city: string): Promise<TencentDirectionResponse> {
    const params = {
      from: origin,
      to: destination,
      city,
      key: this.apiKey
    };

    return await this.makeRequest<TencentDirectionResponse>('/direction/v1/transit/', params);
  }

  /**
   * 骑行路线规划
   */
  async directionBicycling(origin: string, destination: string): Promise<TencentDirectionResponse> {
    const params = {
      from: origin,
      to: destination,
      key: this.apiKey
    };

    return await this.makeRequest<TencentDirectionResponse>('/direction/v1/bicycling/', params);
  }

  // ============= 天气服务 =============

  /**
   * 天气查询
   */
  async weather(location: string): Promise<TencentWeatherResponse> {
    const params = {
      location,
      key: this.apiKey,
      get_forecast: 1
    };

    return await this.makeRequest<TencentWeatherResponse>('/weather/v1/', params);
  }

  // ============= 距离计算服务 =============

  /**
   * 距离矩阵计算
   */
  async matrix(origins: string[], destinations: string[], mode: 'driving' | 'walking' = 'driving'): Promise<any> {
    const params = {
      from: origins.join(';'),
      to: destinations.join(';'),
      mode,
      key: this.apiKey
    };

    return await this.makeRequest('/distance/v1/matrix/', params);
  }

  // ============= IP定位服务 =============

  /**
   * IP定位
   */
  async ipLocation(ip?: string): Promise<any> {
    const params: any = {
      key: this.apiKey
    };

    if (ip) {
      params.ip = ip;
    }

    return await this.makeRequest('/location/v1/ip', params);
  }

  // ============= 私有方法 =============

  /**
   * 发起HTTP请求
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    
    // 添加查询参数
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key].toString());
      }
    });

    let lastError: Error = new Error('未知错误');

    // 重试机制
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const startTime = Date.now();
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'SmartTravelAssistant/6.2',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(this.timeout)
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`腾讯地图API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as T;
        
        // 记录性能指标
        this.recordMetrics(endpoint, responseTime, true);
        
        return data;

      } catch (error) {
        lastError = error as Error;
        
        // 记录失败指标
        this.recordMetrics(endpoint, 0, false);
        
        console.warn(`腾讯地图API请求失败 (尝试 ${attempt}/${this.retryAttempts}):`, error);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.retryAttempts) {
          await this.delay(1000 * attempt); // 指数退避
        }
      }
    }

    throw new Error(`腾讯地图API请求最终失败: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 记录性能指标
   */
  private recordMetrics(endpoint: string, responseTime: number, success: boolean): void {
    // 这里可以集成到监控系统
    console.log(`腾讯地图API指标 - 端点: ${endpoint}, 响应时间: ${responseTime}ms, 成功: ${success}`);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    try {
      const startTime = Date.now();
      await this.ipLocation(); // 使用IP定位作为健康检查
      const responseTime = Date.now() - startTime;
      
      return { healthy: true, responseTime };
    } catch (error) {
      return { 
        healthy: false, 
        responseTime: 0, 
        error: (error as Error).message 
      };
    }
  }
}

export default TencentMCPClient;
