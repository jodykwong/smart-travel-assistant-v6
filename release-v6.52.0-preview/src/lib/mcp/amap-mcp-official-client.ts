/**
 * 智游助手v5.0 - 高德MCP官方客户端
 * 基于高德开放平台官方MCP Server实现
 * 
 * 官方文档: https://lbs.amap.com/api/mcp-server/gettingstarted
 * 服务端点: https://mcp.amap.com/sse
 * 
 * 核心特性:
 * 1. 官方SSE协议支持
 * 2. 动态工具发现
 * 3. 标准化数据格式
 * 4. 智能错误处理
 */

import type { 
  RegionData, 
  POIData, 
  WeatherData, 
  TransportationData,
  UserPreferences 
} from '@/types/travel-planning';

// ============= MCP协议标准接口 =============

interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
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

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: any;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// ============= 高德MCP官方客户端 =============

export class AmapMCPOfficialClient {
  private readonly serverUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private availableTools: MCPTool[] = [];
  private isInitialized = false;

  constructor(config?: {
    serverUrl?: string;
    apiKey?: string;
    timeout?: number;
  }) {
    this.serverUrl = config?.serverUrl || process.env.AMAP_MCP_SERVER_URL || 'https://mcp.amap.com/sse';
    this.apiKey = config?.apiKey || process.env.AMAP_MCP_API_KEY || '';
    this.timeout = config?.timeout || parseInt(process.env.MCP_TIMEOUT || '30000');

    if (!this.apiKey) {
      throw new Error('高德MCP API Key未配置，请在环境变量中设置 AMAP_MCP_API_KEY');
    }
  }

  // ============= MCP协议核心方法 =============

  /**
   * 初始化MCP连接并获取可用工具列表
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔗 正在连接高德MCP服务器...');
      
      // 获取服务器能力
      const capabilities = await this.getServerCapabilities();
      console.log('📋 服务器能力:', capabilities);

      // 获取可用工具列表
      this.availableTools = await this.listTools();
      console.log(`🛠️ 发现 ${this.availableTools.length} 个可用工具:`, 
        this.availableTools.map(t => t.name));

      this.isInitialized = true;
      console.log('✅ 高德MCP客户端初始化完成');
    } catch (error) {
      console.error('❌ 高德MCP初始化失败:', error);
      throw new Error(`MCP初始化失败: ${error.message}`);
    }
  }

  /**
   * 获取MCP服务器能力
   */
  private async getServerCapabilities(): Promise<any> {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'SmartTravelAssistant',
          version: '5.0.0',
        },
      },
    };

    return this.sendMessage(message);
  }

  /**
   * 获取可用工具列表
   */
  private async listTools(): Promise<MCPTool[]> {
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/list',
      params: {},
    };

    const response = await this.sendMessage(message);
    return response.tools || [];
  }

  /**
   * 调用MCP工具
   */
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const message: MCPMessage = {
      jsonrpc: '2.0',
      id: this.generateId(),
      method: 'tools/call',
      params: {
        name: toolCall.name,
        arguments: toolCall.arguments,
      },
    };

    try {
      const response = await this.sendMessage(message);
      return response;
    } catch (error) {
      console.error(`工具调用失败 [${toolCall.name}]:`, error);
      return {
        content: [{
          type: 'text',
          text: `工具调用失败: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * 发送MCP消息
   */
  private async sendMessage(message: MCPMessage): Promise<any> {
    const url = `${this.serverUrl}?key=${this.apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 处理SSE响应
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        return this.handleSSEResponse(response);
      } else {
        return response.json();
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`请求超时 (${this.timeout}ms)`);
      }
      throw error;
    }
  }

  /**
   * 处理SSE响应
   */
  private async handleSSEResponse(response: Response): Promise<any> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let result: any = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return result;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.result) {
                result = parsed.result;
              } else if (parsed.error) {
                throw new Error(parsed.error.message);
              }
            } catch (parseError) {
              console.warn('SSE数据解析失败:', data);
            }
          }
        }
      }

      return result;
    } finally {
      reader.releaseLock();
    }
  }

  // ============= 高德地图专用方法 =============

  /**
   * 搜索POI (兴趣点)
   */
  async searchPOI(params: {
    keywords: string;
    region: string;
    category?: string;
    limit?: number;
  }): Promise<POIData[]> {
    const toolCall: MCPToolCall = {
      name: 'amap_search_poi',
      arguments: {
        keywords: params.keywords,
        region: params.region,
        types: params.category,
        offset: params.limit || 20,
      },
    };

    const result = await this.callTool(toolCall);
    
    if (result.isError) {
      console.warn('POI搜索失败:', result.content[0]?.text);
      return [];
    }

    return this.parsePOIResponse(result);
  }

  /**
   * 获取天气信息
   */
  async getWeather(params: {
    location: string;
    date?: string;
  }): Promise<WeatherData> {
    const toolCall: MCPToolCall = {
      name: 'amap_weather',
      arguments: {
        city: params.location,
        extensions: 'all',
      },
    };

    const result = await this.callTool(toolCall);
    
    if (result.isError) {
      console.warn('天气查询失败:', result.content[0]?.text);
      return this.getDefaultWeatherData();
    }

    return this.parseWeatherResponse(result);
  }

  /**
   * 路径规划
   */
  async planRoute(params: {
    origin: string;
    destination: string;
    strategy?: number;
  }): Promise<TransportationData> {
    const toolCall: MCPToolCall = {
      name: 'amap_direction_driving',
      arguments: {
        origin: params.origin,
        destination: params.destination,
        strategy: params.strategy || 0,
      },
    };

    const result = await this.callTool(toolCall);
    
    if (result.isError) {
      console.warn('路径规划失败:', result.content[0]?.text);
      return this.getDefaultTransportationData();
    }

    return this.parseRouteResponse(result);
  }

  /**
   * 地理编码 (地址转坐标)
   */
  async geocode(address: string): Promise<{ lng: number; lat: number } | null> {
    const toolCall: MCPToolCall = {
      name: 'amap_geocode',
      arguments: {
        address: address,
      },
    };

    const result = await this.callTool(toolCall);
    
    if (result.isError) {
      console.warn('地理编码失败:', result.content[0]?.text);
      return null;
    }

    return this.parseGeocodeResponse(result);
  }

  // ============= 数据解析方法 =============

  private parsePOIResponse(result: MCPToolResult): POIData[] {
    try {
      const content = result.content[0];
      if (content?.type === 'text' && content.text) {
        const data = JSON.parse(content.text);
        const pois = data.pois || [];
        
        return pois.map((poi: any) => ({
          id: poi.id || `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: poi.name || '未知地点',
          address: poi.address || '',
          location: poi.location || '0,0',
          category: this.mapPOICategory(poi.type),
          rating: parseFloat(poi.biz_ext?.rating || '4.0'),
          priceLevel: this.mapPriceLevel(poi.biz_ext?.cost || '2'),
          description: poi.biz_ext?.introduction || '',
          openingHours: poi.biz_ext?.open_time,
          imageUrl: poi.photos?.[0]?.url,
        }));
      }
    } catch (error) {
      console.error('POI数据解析失败:', error);
    }
    
    return [];
  }

  private parseWeatherResponse(result: MCPToolResult): WeatherData {
    try {
      const content = result.content[0];
      if (content?.type === 'text' && content.text) {
        const data = JSON.parse(content.text);
        const live = data.lives?.[0] || {};
        
        return {
          temperature: {
            min: parseInt(live.temperature) - 5,
            max: parseInt(live.temperature) + 5,
            avg: parseInt(live.temperature) || 20,
          },
          condition: live.weather || 'unknown',
          humidity: parseInt(live.humidity) || 60,
          rainfall: 0,
        };
      }
    } catch (error) {
      console.error('天气数据解析失败:', error);
    }
    
    return this.getDefaultWeatherData();
  }

  private parseRouteResponse(result: MCPToolResult): TransportationData {
    // 简化实现，返回默认数据
    return this.getDefaultTransportationData();
  }

  private parseGeocodeResponse(result: MCPToolResult): { lng: number; lat: number } | null {
    try {
      const content = result.content[0];
      if (content?.type === 'text' && content.text) {
        const data = JSON.parse(content.text);
        const geocode = data.geocodes?.[0];
        if (geocode?.location) {
          const [lng, lat] = geocode.location.split(',').map(Number);
          return { lng, lat };
        }
      }
    } catch (error) {
      console.error('地理编码数据解析失败:', error);
    }
    
    return null;
  }

  // ============= 工具方法 =============

  private generateId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapPOICategory(type: string): POIData['category'] {
    if (type?.includes('餐饮') || type?.includes('美食')) return 'restaurant';
    if (type?.includes('住宿') || type?.includes('酒店')) return 'hotel';
    if (type?.includes('交通')) return 'transport';
    return 'attraction';
  }

  private mapPriceLevel(cost: string | number): POIData['priceLevel'] {
    const level = typeof cost === 'string' ? parseInt(cost) : cost;
    if (level <= 1) return '$';
    if (level <= 2) return '$$';
    if (level <= 3) return '$$$';
    return '$$$$';
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

  // ============= 健康检查 =============

  async healthCheck(): Promise<boolean> {
    try {
      await this.initialize();
      return this.availableTools.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取可用工具列表
   */
  getAvailableTools(): MCPTool[] {
    return this.availableTools;
  }
}
