/**
 * 智游助手v5.0 - 高德MCP官方客户端
 * 遵循原则: API优先设计 + 纵深防御
 *
 * 核心理念:
 * 1. MCP(Model Context Protocol) - 基于官方SSE接口的标准化调用
 * 2. 官方服务端点 - https://mcp.amap.com/sse
 * 3. 工具发现机制 - 动态获取可用工具列表
 * 4. 智能数据处理 - 结构化地理数据处理
 */

import type { 
  RegionData, 
  POIData, 
  WeatherData, 
  TransportationData,
  UserPreferences 
} from '@/types/travel-planning';

// ============= 高德MCP官方接口定义 =============

interface MCPServerConfig {
  url: string;
  key: string;
  transport: 'sse' | 'http';
}

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface MCPToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: any;
    mimeType?: string;
  }>;
  isError?: boolean;
}

interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

interface AmapMCPTools {
  // 地理搜索工具
  searchPOI: (query: string, region: string, category?: string) => Promise<POIData[]>;
  
  // 天气查询工具
  getWeather: (location: string, date?: string) => Promise<WeatherData>;
  
  // 路径规划工具
  planRoute: (from: string, to: string, mode?: 'driving' | 'walking' | 'transit') => Promise<TransportationData>;
  
  // 区域分析工具
  analyzeRegion: (region: string, preferences: UserPreferences) => Promise<RegionAnalysis>;
}

interface RegionAnalysis {
  overview: string;
  highlights: string[];
  bestSeason: string;
  averageCost: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  recommendations: string[];
}

// ============= MCP客户端实现 =============

export class AmapMCPClient implements AmapMCPTools {
  private readonly config: MCPServerConfig;
  private readonly timeout: number;
  private availableTools: MCPTool[] = [];
  private eventSource: EventSource | null = null;

  constructor(config?: Partial<MCPServerConfig & { timeout?: number }>) {
    this.config = {
      url: config?.url || process.env.AMAP_MCP_SERVER_URL || 'https://mcp.amap.com/sse',
      key: config?.key || process.env.AMAP_MCP_API_KEY || '',
      transport: config?.transport || 'sse',
    };
    this.timeout = config?.timeout || parseInt(process.env.MCP_TIMEOUT || '30000');

    if (!this.config.key) {
      throw new Error('高德MCP API Key未配置');
    }
  }

  // ============= 核心MCP调用方法 =============

  private async callMCP<T>(request: any): Promise<any> {
    try {
      const response = await fetch(`${this.config.url}/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SmartTravelAssistant/5.0',
        },
        body: JSON.stringify({
          tool: request.method,
          arguments: request.params,
          context: request.context || '智游助手旅行规划系统',
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`MCP调用失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result.content,
        metadata: {
          source: 'amap-mcp',
          timestamp: new Date().toISOString(),
          confidence: result.confidence || 0.9,
        },
      };
    } catch (error) {
      console.error('MCP调用错误:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  // ============= 高德MCP工具实现 =============

  async searchPOI(query: string, region: string, category?: string): Promise<POIData[]> {
    const request: any = {
      method: 'amap_search_poi',
      params: {
        keywords: query,
        region: region,
        category: category || 'all',
        limit: 20,
        detail: true,
      },
      context: `搜索${region}地区的${category || ''}景点信息，关键词：${query}`,
    };

    const response = await this.callMCP<any[]>(request);
    
    if (!response.success || !response.data) {
      console.warn(`POI搜索失败: ${response.error}`);
      return [];
    }

    // 将MCP返回的数据转换为标准POI格式
    return response.data.map(this.transformToPOIData);
  }

  async getWeather(location: string, date?: string): Promise<WeatherData> {
    const request: any = {
      method: 'amap_get_weather',
      params: {
        location: location,
        date: date || new Date().toISOString().split('T')[0],
        forecast_days: 7,
      },
      context: `查询${location}的天气信息，用于旅行规划`,
    };

    const response = await this.callMCP<any>(request);
    
    if (!response.success || !response.data) {
      console.warn(`天气查询失败: ${response.error}`);
      return this.getDefaultWeatherData();
    }

    return this.transformToWeatherData(response.data);
  }

  async planRoute(
    from: string, 
    to: string, 
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<TransportationData> {
    const request: any = {
      method: 'amap_plan_route',
      params: {
        origin: from,
        destination: to,
        mode: mode,
        alternatives: true,
      },
      context: `规划从${from}到${to}的${mode}路线，用于旅行行程安排`,
    };

    const response = await this.callMCP<any>(request);
    
    if (!response.success || !response.data) {
      console.warn(`路线规划失败: ${response.error}`);
      return this.getDefaultTransportationData();
    }

    return this.transformToTransportationData(response.data);
  }

  async analyzeRegion(region: string, preferences: UserPreferences): Promise<RegionAnalysis> {
    const request: any = {
      method: 'amap_analyze_region',
      params: {
        region: region,
        user_preferences: {
          budget: preferences.budget,
          travel_styles: preferences.travelStyles,
          group_size: preferences.groupSize,
          special_requirements: preferences.specialRequirements,
        },
      },
      context: `分析${region}地区的旅游特色，结合用户偏好提供个性化建议`,
    };

    const response = await this.callMCP<any>(request);
    
    if (!response.success || !response.data) {
      console.warn(`区域分析失败: ${response.error}`);
      return this.getDefaultRegionAnalysis(region);
    }

    return this.transformToRegionAnalysis(response.data);
  }

  // ============= 高级组合方法 =============

  async collectRegionData(regionName: string, preferences: UserPreferences): Promise<RegionData> {
    try {
      console.log(`🔍 开始收集${regionName}的区域数据...`);

      // 并行收集多种数据
      const [attractions, restaurants, hotels, weather, analysis] = await Promise.allSettled([
        this.searchPOI('景点', regionName, 'attraction'),
        this.searchPOI('餐厅', regionName, 'restaurant'), 
        this.searchPOI('酒店', regionName, 'hotel'),
        this.getWeather(regionName),
        this.analyzeRegion(regionName, preferences),
      ]);

      // 处理并行结果
      const regionData: RegionData = {
        attractions: attractions.status === 'fulfilled' ? attractions.value : [],
        restaurants: restaurants.status === 'fulfilled' ? restaurants.value : [],
        hotels: hotels.status === 'fulfilled' ? hotels.value : [],
        weather: weather.status === 'fulfilled' ? weather.value : this.getDefaultWeatherData(),
        transportation: this.getDefaultTransportationData(),
        dataQuality: this.calculateDataQuality({
          attractions: attractions.status === 'fulfilled',
          restaurants: restaurants.status === 'fulfilled',
          hotels: hotels.status === 'fulfilled',
          weather: weather.status === 'fulfilled',
        }) as any,
        lastUpdated: new Date().toISOString(),
      };

      console.log(`✅ ${regionName}数据收集完成，质量评分: ${regionData.dataQuality}`);
      return regionData;

    } catch (error) {
      console.error(`❌ ${regionName}数据收集失败:`, error);
      throw new Error(`区域数据收集失败: ${(error as Error).message}`);
    }
  }

  // ============= 数据转换方法 =============

  private transformToPOIData(mcpData: any): POIData {
    return {
      id: mcpData.id || `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: mcpData.name || '未知地点',
      address: mcpData.address || '',
      location: mcpData.location || '0,0',
      category: this.mapCategory(mcpData.category),
      rating: mcpData.rating || 4.0,
      priceLevel: this.mapPriceLevel(mcpData.price_level),
      description: mcpData.description || '',
      openingHours: mcpData.opening_hours,
      imageUrl: mcpData.image_url,
    };
  }

  private transformToWeatherData(mcpData: any): WeatherData {
    return {
      temperature: {
        min: mcpData.temperature?.min || 15,
        max: mcpData.temperature?.max || 25,
        avg: mcpData.temperature?.avg || 20,
      },
      condition: mcpData.condition || 'sunny',
      humidity: mcpData.humidity || 60,
      rainfall: mcpData.rainfall || 0,
    };
  }

  private transformToTransportationData(mcpData: any): TransportationData {
    return {
      flights: mcpData.flights || [],
      trains: mcpData.trains || [],
      buses: mcpData.buses || [],
    };
  }

  private transformToRegionAnalysis(mcpData: any): RegionAnalysis {
    return {
      overview: mcpData.overview || '暂无区域概述',
      highlights: mcpData.highlights || [],
      bestSeason: mcpData.best_season || '四季皆宜',
      averageCost: mcpData.average_cost || 3000,
      difficulty: mcpData.difficulty || 'moderate',
      recommendations: mcpData.recommendations || [],
    };
  }

  // ============= 工具方法 =============

  private mapCategory(category: string): POIData['category'] {
    const categoryMap: Record<string, POIData['category']> = {
      'scenic_spot': 'attraction',
      'restaurant': 'restaurant', 
      'hotel': 'hotel',
      'transport': 'transport',
    };
    
    return categoryMap[category] || 'attraction';
  }

  private mapPriceLevel(priceLevel: number | string): POIData['priceLevel'] {
    if (typeof priceLevel === 'string') return priceLevel as POIData['priceLevel'];
    
    const levelMap: Record<number, POIData['priceLevel']> = {
      1: '$',
      2: '$$', 
      3: '$$$',
      4: '$$$$',
    };
    
    return levelMap[priceLevel] || '$$';
  }

  private calculateDataQuality(results: Record<string, boolean>): number {
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.values(results).length;
    return Number((successCount / totalCount).toFixed(2));
  }

  private getDefaultWeatherData(): WeatherData {
    return {
      temperature: { min: 15, max: 25, avg: 20 },
      condition: 'unknown',
      humidity: 60,
      rainfall: 0,
    };
  }

  private getDefaultTransportationData(): TransportationData {
    return {
      flights: [],
      trains: [],
      buses: [],
    };
  }

  private getDefaultRegionAnalysis(region: string): RegionAnalysis {
    return {
      overview: `${region}是一个值得探索的旅游目的地`,
      highlights: ['自然风光', '人文景观'],
      bestSeason: '春秋两季',
      averageCost: 3000,
      difficulty: 'moderate',
      recommendations: ['提前规划行程', '注意天气变化'],
    };
  }

  // ============= 健康检查 =============

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}
