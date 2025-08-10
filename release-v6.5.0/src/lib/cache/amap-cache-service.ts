/**
 * 智游助手v6.0 - 高德API缓存服务
 * 为高德MCP API提供智能缓存机制
 */

import { getCacheService } from './cache-service';

interface AmapApiResponse {
  status: string;
  data: any;
  timestamp: string;
}

interface CacheConfig {
  regionDataTTL: number;    // 地区数据缓存时间
  weatherDataTTL: number;   // 天气数据缓存时间
  poiDataTTL: number;       // POI数据缓存时间
  routeDataTTL: number;     // 路线数据缓存时间
}

class AmapCacheService {
  private cacheService = getCacheService();
  private config: CacheConfig;

  constructor() {
    this.config = {
      regionDataTTL: parseInt(process.env.CACHE_TTL_REGION_DATA || '3600'), // 1小时
      weatherDataTTL: parseInt(process.env.CACHE_TTL_WEATHER_DATA || '1800'), // 30分钟
      poiDataTTL: parseInt(process.env.CACHE_TTL_POI_DATA || '7200'), // 2小时
      routeDataTTL: parseInt(process.env.CACHE_TTL_ROUTE_DATA || '1800'), // 30分钟
    };
  }

  /**
   * 缓存地理编码结果
   */
  async cacheGeocode(address: string, city?: string): Promise<any> {
    return this.cacheService.cacheApiResponse(
      'amap_geocode',
      { address, city },
      async () => {
        // 这里调用实际的高德API
        return this.callAmapGeocode(address, city);
      },
      this.config.regionDataTTL
    );
  }

  /**
   * 缓存逆地理编码结果
   */
  async cacheRegeocode(location: string): Promise<any> {
    return this.cacheService.cacheApiResponse(
      'amap_regeocode',
      { location },
      async () => {
        return this.callAmapRegeocode(location);
      },
      this.config.regionDataTTL
    );
  }

  /**
   * 缓存天气数据
   */
  async cacheWeather(city: string): Promise<any> {
    return this.cacheService.cacheApiResponse(
      'amap_weather',
      { city },
      async () => {
        return this.callAmapWeather(city);
      },
      this.config.weatherDataTTL
    );
  }

  /**
   * 缓存POI搜索结果
   */
  async cachePOISearch(keywords: string, city?: string, types?: string): Promise<any> {
    return this.cacheService.cacheApiResponse(
      'amap_poi_search',
      { keywords, city, types },
      async () => {
        return this.callAmapPOISearch(keywords, city, types);
      },
      this.config.poiDataTTL
    );
  }

  /**
   * 缓存周边搜索结果
   */
  async cacheAroundSearch(location: string, keywords?: string, radius?: string): Promise<any> {
    return this.cacheService.cacheApiResponse(
      'amap_around_search',
      { location, keywords, radius },
      async () => {
        return this.callAmapAroundSearch(location, keywords, radius);
      },
      this.config.poiDataTTL
    );
  }

  /**
   * 缓存路径规划结果
   */
  async cacheDirections(origin: string, destination: string, type: 'driving' | 'walking' | 'transit' = 'driving'): Promise<any> {
    return this.cacheService.cacheApiResponse(
      `amap_directions_${type}`,
      { origin, destination },
      async () => {
        return this.callAmapDirections(origin, destination, type);
      },
      this.config.routeDataTTL
    );
  }

  /**
   * 缓存距离测量结果
   */
  async cacheDistance(origins: string, destination: string, type: string = '1'): Promise<any> {
    return this.cacheService.cacheApiResponse(
      'amap_distance',
      { origins, destination, type },
      async () => {
        return this.callAmapDistance(origins, destination, type);
      },
      this.config.routeDataTTL
    );
  }

  // 实际的API调用方法（这些方法调用真实的高德API）
  private async callAmapGeocode(address: string, city?: string): Promise<any> {
    const apiKey = process.env.AMAP_MCP_API_KEY;
    const url = `https://restapi.amap.com/v3/geocode/geo`;
    
    const params = new URLSearchParams({
      key: apiKey!,
      address,
      ...(city && { city }),
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    
    return {
      ...data,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  }

  private async callAmapRegeocode(location: string): Promise<any> {
    const apiKey = process.env.AMAP_MCP_API_KEY;
    const url = `https://restapi.amap.com/v3/geocode/regeo`;
    
    const params = new URLSearchParams({
      key: apiKey!,
      location,
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    
    return {
      ...data,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  }

  private async callAmapWeather(city: string): Promise<any> {
    const apiKey = process.env.AMAP_MCP_API_KEY;
    const url = `https://restapi.amap.com/v3/weather/weatherInfo`;
    
    const params = new URLSearchParams({
      key: apiKey!,
      city,
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    
    return {
      ...data,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  }

  private async callAmapPOISearch(keywords: string, city?: string, types?: string): Promise<any> {
    const apiKey = process.env.AMAP_MCP_API_KEY;
    const url = `https://restapi.amap.com/v3/place/text`;
    
    const params = new URLSearchParams({
      key: apiKey!,
      keywords,
      ...(city && { city }),
      ...(types && { types }),
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    
    return {
      ...data,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  }

  private async callAmapAroundSearch(location: string, keywords?: string, radius?: string): Promise<any> {
    const apiKey = process.env.AMAP_MCP_API_KEY;
    const url = `https://restapi.amap.com/v3/place/around`;
    
    const params = new URLSearchParams({
      key: apiKey!,
      location,
      ...(keywords && { keywords }),
      ...(radius && { radius }),
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    
    return {
      ...data,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  }

  private async callAmapDirections(origin: string, destination: string, type: string): Promise<any> {
    const apiKey = process.env.AMAP_MCP_API_KEY;
    let url = '';
    
    switch (type) {
      case 'driving':
        url = `https://restapi.amap.com/v3/direction/driving`;
        break;
      case 'walking':
        url = `https://restapi.amap.com/v3/direction/walking`;
        break;
      case 'transit':
        url = `https://restapi.amap.com/v3/direction/transit/integrated`;
        break;
      default:
        url = `https://restapi.amap.com/v3/direction/driving`;
    }
    
    const params = new URLSearchParams({
      key: apiKey!,
      origin,
      destination,
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    
    return {
      ...data,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  }

  private async callAmapDistance(origins: string, destination: string, type: string): Promise<any> {
    const apiKey = process.env.AMAP_MCP_API_KEY;
    const url = `https://restapi.amap.com/v3/distance`;
    
    const params = new URLSearchParams({
      key: apiKey!,
      origins,
      destination,
      type,
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    
    return {
      ...data,
      cached: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 清理特定地区的缓存
   */
  async clearRegionCache(region: string): Promise<void> {
    await this.cacheService.clear(region);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      ...this.cacheService.getStats(),
      config: this.config,
    };
  }
}

// 单例模式
let amapCacheServiceInstance: AmapCacheService | null = null;

export function getAmapCacheService(): AmapCacheService {
  if (!amapCacheServiceInstance) {
    amapCacheServiceInstance = new AmapCacheService();
  }
  return amapCacheServiceInstance;
}

export { AmapCacheService };
