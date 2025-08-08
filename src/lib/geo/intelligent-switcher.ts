/**
 * 智游助手v6.2 - 智能地理服务切换器
 * 基于服务质量自动选择最佳地理数据源
 * 
 * 核心功能:
 * 1. 智能服务选择和切换
 * 2. 故障检测和自动恢复
 * 3. 质量监控集成
 * 4. 用户透明的服务切换
 */

// 临时类型定义，避免导入错误
class AmapMCPOfficialClient {
  async geocoding(address: string, city?: string): Promise<any> { return {}; }
  async reverseGeocoding(location: string): Promise<any> { return {}; }
  async placeSearch(keywords: string, location?: string): Promise<any> { return {}; }
  async directionDriving(origin: string, destination: string): Promise<any> { return {}; }
  async directionWalking(origin: string, destination: string): Promise<any> { return {}; }
  async directionTransit(origin: string, destination: string, city: string): Promise<any> { return {}; }
  async directionBicycling(origin: string, destination: string): Promise<any> { return {}; }
  async weather(location: string): Promise<any> { return {}; }
  async ipLocation(ip?: string): Promise<any> { return {}; }
}
import TencentMCPClient from '@/lib/mcp/tencent-mcp-client';
import GeoDataAdapter from '@/lib/geo/geo-data-adapter';
import ServiceQualityMonitor, { type ServiceQualityMetrics } from '@/lib/geo/quality-monitor';
import type { 
  StandardGeocodingResponse, 
  StandardReverseGeocodingResponse, 
  StandardPlaceSearchResponse, 
  StandardDirectionResponse 
} from '@/lib/geo/geo-data-adapter';

// ============= 接口定义 =============

export interface GeoOperation {
  name: string;
  type: 'geocoding' | 'reverse_geocoding' | 'place_search' | 'route_planning' | 'weather' | 'ip_location';
}

export interface GeoParams {
  [key: string]: any;
}

export interface QualityResult<T> {
  data: T;
  qualityScore: number;
  responseTime: number;
  source: 'amap' | 'tencent';
  timestamp: Date;
  error?: string;
}

export interface SwitchEvent {
  timestamp: Date;
  from: 'amap' | 'tencent';
  to: 'amap' | 'tencent';
  reason: string;
  qualityScores: {
    from: number;
    to: number;
  };
}

// ============= 自定义错误类型 =============

export class ServiceQualityError extends Error {
  constructor(
    message: string,
    public readonly details: {
      primaryQuality?: number;
      secondaryQuality?: number;
      operation?: string;
    } = {}
  ) {
    super(message);
    this.name = 'ServiceQualityError';
  }
}

// ============= 智能地理服务切换器 =============

export class IntelligentGeoServiceSwitcher {
  private currentPrimary: 'amap' | 'tencent';
  private lastSwitchTime: Date = new Date(0);
  private readonly cooldownPeriod: number;
  private readonly autoSwitchEnabled: boolean;
  private readonly healthCheckInterval: number;
  private switchHistory: SwitchEvent[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(
    private amapClient: AmapMCPOfficialClient,
    private tencentClient: TencentMCPClient,
    private adapter: GeoDataAdapter,
    private qualityMonitor: ServiceQualityMonitor
  ) {
    // 从环境变量读取配置
    this.currentPrimary = (process.env.GEO_PRIMARY_PROVIDER as 'amap' | 'tencent') || 'amap';
    this.cooldownPeriod = parseInt(process.env.GEO_SWITCH_COOLDOWN!) || 300000; // 5分钟
    this.autoSwitchEnabled = process.env.GEO_AUTO_SWITCH_ENABLED === 'true';
    this.healthCheckInterval = parseInt(process.env.GEO_HEALTH_CHECK_INTERVAL!) || 60000; // 1分钟

    // 启动定期健康检查
    if (this.autoSwitchEnabled) {
      this.startHealthCheck();
    }

    console.log(`智能地理服务切换器初始化完成 - 主服务: ${this.currentPrimary}, 自动切换: ${this.autoSwitchEnabled}`);
  }

  // ============= 核心执行方法 =============

  /**
   * 执行地理操作，自动选择最佳服务
   */
  async executeGeoOperation<T>(
    operation: GeoOperation,
    params: GeoParams
  ): Promise<QualityResult<T>> {
    console.log(`执行地理操作: ${operation.name}, 当前主服务: ${this.currentPrimary}`);

    // 1. 尝试主服务
    const primaryResult = await this.tryService<T>(this.currentPrimary, operation, params);
    
    if (this.qualityMonitor.isQualityAcceptable(primaryResult.qualityScore)) {
      console.log(`主服务 ${this.currentPrimary} 质量良好: ${primaryResult.qualityScore.toFixed(3)}`);
      return primaryResult;
    }

    console.warn(`主服务 ${this.currentPrimary} 质量不达标: ${primaryResult.qualityScore.toFixed(3)}`);

    // 2. 主服务质量不达标，尝试备用服务
    const secondaryService = this.currentPrimary === 'amap' ? 'tencent' : 'amap';
    const secondaryResult = await this.tryService<T>(secondaryService, operation, params);

    if (this.qualityMonitor.isQualityAcceptable(secondaryResult.qualityScore)) {
      console.log(`备用服务 ${secondaryService} 质量良好: ${secondaryResult.qualityScore.toFixed(3)}`);
      
      // 考虑切换主服务
      await this.considerSwitching(secondaryService, primaryResult.qualityScore, secondaryResult.qualityScore);
      
      return secondaryResult;
    }

    // 3. 两个服务都无法提供高质量结果
    console.error(`所有服务质量都不达标 - 主服务: ${primaryResult.qualityScore.toFixed(3)}, 备用服务: ${secondaryResult.qualityScore.toFixed(3)}`);
    
    throw new ServiceQualityError('无法提供高质量的地理数据服务，请稍后重试', {
      primaryQuality: primaryResult.qualityScore,
      secondaryQuality: secondaryResult.qualityScore,
      operation: operation.name
    });
  }

  // ============= 服务尝试方法 =============

  /**
   * 尝试使用指定服务执行操作
   */
  private async tryService<T>(
    service: 'amap' | 'tencent',
    operation: GeoOperation,
    params: GeoParams
  ): Promise<QualityResult<T>> {
    const startTime = Date.now();
    let responseTime = 0;
    let error: string | undefined;
    let data: T | null = null;
    let qualityScore = 0;

    try {
      // 根据服务类型和操作执行相应的API调用
      const rawResult = await this.executeServiceOperation(service, operation, params);
      responseTime = Date.now() - startTime;

      // 标准化数据格式
      data = await this.normalizeResponse<T>(rawResult, service, operation);
      
      // 计算质量评分
      qualityScore = this.calculateOperationQuality(data, responseTime, service);

      // 记录质量指标
      this.recordQualityMetrics(service, responseTime, qualityScore, true);

    } catch (err) {
      responseTime = Date.now() - startTime;
      error = (err as Error).message;
      qualityScore = 0;

      // 记录失败指标
      this.recordQualityMetrics(service, responseTime, 0, false);

      console.error(`服务 ${service} 执行失败:`, error);
    }

    return {
      data: data as T,
      qualityScore,
      responseTime,
      source: service,
      timestamp: new Date(),
      error: error || ''
    };
  }

  /**
   * 执行具体的服务操作
   */
  private async executeServiceOperation(
    service: 'amap' | 'tencent',
    operation: GeoOperation,
    params: GeoParams
  ): Promise<any> {
    const client = service === 'amap' ? this.amapClient : this.tencentClient;

    switch (operation.type) {
      case 'geocoding':
        return await client.geocoding(params.address, params.city);
      
      case 'reverse_geocoding':
        return await client.reverseGeocoding(params.location);
      
      case 'place_search':
        if (service === 'amap') {
          return await (client as AmapMCPOfficialClient).placeSearch(params.keywords, params.location);
        } else {
          return await (client as TencentMCPClient).placeSearch(params.keywords, params.location, params.radius);
        }
      
      case 'route_planning':
        switch (params.mode) {
          case 'driving':
            return await client.directionDriving(params.origin, params.destination);
          case 'walking':
            return await client.directionWalking(params.origin, params.destination);
          case 'transit':
            if (service === 'amap') {
              return await (client as AmapMCPOfficialClient).directionTransit(params.origin, params.destination, params.city);
            } else {
              return await (client as TencentMCPClient).directionTransit(params.origin, params.destination, params.city);
            }
          case 'bicycling':
            if (service === 'amap') {
              return await (client as AmapMCPOfficialClient).directionBicycling(params.origin, params.destination);
            } else {
              return await (client as TencentMCPClient).directionBicycling(params.origin, params.destination);
            }
          default:
            throw new Error(`不支持的路线规划模式: ${params.mode}`);
        }
      
      case 'weather':
        return await client.weather(params.location);
      
      case 'ip_location':
        if (service === 'amap') {
          return await (client as AmapMCPOfficialClient).ipLocation(params.ip);
        } else {
          return await (client as TencentMCPClient).ipLocation(params.ip);
        }
      
      default:
        throw new Error(`不支持的操作类型: ${operation.type}`);
    }
  }

  /**
   * 标准化响应数据
   */
  private async normalizeResponse<T>(
    rawResult: any,
    service: 'amap' | 'tencent',
    operation: GeoOperation
  ): Promise<T> {
    switch (operation.type) {
      case 'geocoding':
        return this.adapter.normalizeGeocodingResponse(rawResult, service) as T;
      
      case 'reverse_geocoding':
        return this.adapter.normalizeReverseGeocodingResponse(rawResult, service) as T;
      
      case 'place_search':
        return this.adapter.normalizePlaceSearchResponse(rawResult, service) as T;
      
      case 'route_planning':
        return this.adapter.normalizeDirectionResponse(rawResult, service, operation.name as any) as T;
      
      default:
        // 对于其他类型，直接返回原始数据
        return rawResult as T;
    }
  }

  // ============= 质量评估和记录 =============

  /**
   * 计算操作质量评分
   */
  private calculateOperationQuality(data: any, responseTime: number, service: 'amap' | 'tencent'): number {
    // 基础质量评分
    let qualityScore = 0.8; // 基础分

    // 响应时间评分
    const timeThreshold = parseInt(process.env.GEO_RESPONSE_TIME_THRESHOLD!) || 10000;
    const timeScore = Math.max(0, 1 - responseTime / timeThreshold);
    
    // 数据完整性评分
    let completenessScore = 0.8;
    if (data && typeof data === 'object') {
      if (data.quality) {
        completenessScore = data.quality.completeness || 0.8;
      }
    }

    // 服务特定调整
    const serviceBonus = service === 'amap' ? 0.02 : 0; // 高德地图轻微加分

    qualityScore = (timeScore * 0.3 + completenessScore * 0.7) + serviceBonus;
    
    return Math.max(0, Math.min(1, qualityScore));
  }

  /**
   * 记录质量指标
   */
  private recordQualityMetrics(
    service: 'amap' | 'tencent',
    responseTime: number,
    qualityScore: number,
    success: boolean
  ): void {
    const metrics: ServiceQualityMetrics = {
      responseTime,
      accuracy: success ? qualityScore : 0,
      completeness: success ? qualityScore : 0,
      availability: success ? 1 : 0,
      errorRate: success ? 0 : 1,
      timestamp: new Date()
    };

    this.qualityMonitor.recordMetrics(service, metrics);
  }

  // ============= 智能切换逻辑 =============

  /**
   * 考虑是否切换主服务
   */
  private async considerSwitching(
    betterService: 'amap' | 'tencent',
    currentQuality: number,
    betterQuality: number
  ): Promise<void> {
    if (!this.autoSwitchEnabled) {
      console.log('自动切换已禁用，跳过切换考虑');
      return;
    }

    const now = new Date();
    const timeSinceLastSwitch = now.getTime() - this.lastSwitchTime.getTime();

    // 检查冷却期
    if (timeSinceLastSwitch < this.cooldownPeriod) {
      const remainingCooldown = Math.ceil((this.cooldownPeriod - timeSinceLastSwitch) / 1000);
      console.log(`切换冷却期中，剩余 ${remainingCooldown} 秒`);
      return;
    }

    // 检查质量差异是否足够大
    const qualityDifference = betterQuality - currentQuality;
    const minDifference = 0.1; // 最小质量差异阈值

    if (qualityDifference < minDifference) {
      console.log(`质量差异不足 (${qualityDifference.toFixed(3)} < ${minDifference})，不进行切换`);
      return;
    }

    // 执行切换
    await this.switchPrimaryService(betterService, `质量优化切换 (${currentQuality.toFixed(3)} -> ${betterQuality.toFixed(3)})`);
  }

  /**
   * 切换主服务
   */
  private async switchPrimaryService(newPrimary: 'amap' | 'tencent', reason: string): Promise<void> {
    const oldPrimary = this.currentPrimary;
    
    if (oldPrimary === newPrimary) {
      console.log(`主服务已经是 ${newPrimary}，无需切换`);
      return;
    }

    console.log(`切换主服务: ${oldPrimary} -> ${newPrimary}, 原因: ${reason}`);

    // 记录切换事件
    const switchEvent: SwitchEvent = {
      timestamp: new Date(),
      from: oldPrimary,
      to: newPrimary,
      reason,
      qualityScores: {
        from: this.qualityMonitor.getAverageQualityScore(oldPrimary, 300),
        to: this.qualityMonitor.getAverageQualityScore(newPrimary, 300)
      }
    };

    this.switchHistory.push(switchEvent);
    
    // 保持切换历史在合理范围内
    if (this.switchHistory.length > 100) {
      this.switchHistory.shift();
    }

    // 执行切换
    this.currentPrimary = newPrimary;
    this.lastSwitchTime = new Date();

    console.log(`主服务切换完成: ${newPrimary}`);
  }

  // ============= 健康检查 =============

  /**
   * 启动定期健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('健康检查失败:', error);
      }
    }, this.healthCheckInterval);

    console.log(`定期健康检查已启动，间隔: ${this.healthCheckInterval}ms`);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    const amapHealth = await this.qualityMonitor.performHealthCheck('amap');
    const tencentHealth = await this.qualityMonitor.performHealthCheck('tencent');

    console.log(`健康检查结果 - 高德: ${amapHealth.status} (${amapHealth.qualityScore.toFixed(3)}), 腾讯: ${tencentHealth.status} (${tencentHealth.qualityScore.toFixed(3)})`);

    // 如果当前主服务不健康，考虑切换
    const currentHealth = this.currentPrimary === 'amap' ? amapHealth : tencentHealth;
    const alternativeHealth = this.currentPrimary === 'amap' ? tencentHealth : amapHealth;

    if (currentHealth.status === 'unhealthy' && alternativeHealth.status !== 'unhealthy') {
      const alternativeService = this.currentPrimary === 'amap' ? 'tencent' : 'amap';
      await this.switchPrimaryService(alternativeService, `主服务不健康，切换到备用服务`);
    }
  }

  // ============= 公共接口方法 =============

  /**
   * 获取当前主服务
   */
  getCurrentPrimaryService(): 'amap' | 'tencent' {
    return this.currentPrimary;
  }

  /**
   * 手动切换到备用服务
   */
  async switchToSecondary(): Promise<void> {
    const secondaryService = this.currentPrimary === 'amap' ? 'tencent' : 'amap';
    await this.switchPrimaryService(secondaryService, '手动切换到备用服务');
  }

  /**
   * 重置为自动模式
   */
  async resetToAuto(): Promise<void> {
    const recommendation = this.qualityMonitor.recommendBestService();
    if (recommendation !== this.currentPrimary) {
      await this.switchPrimaryService(recommendation, '重置为自动推荐服务');
    }
    console.log('已重置为自动模式');
  }

  /**
   * 获取切换历史
   */
  getSwitchHistory(limit: number = 10): SwitchEvent[] {
    return this.switchHistory.slice(-limit);
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<{
    currentPrimary: 'amap' | 'tencent';
    autoSwitchEnabled: boolean;
    lastSwitchTime: Date;
    timeSinceLastSwitch: number;
    cooldownRemaining: number;
    healthStatus: {
      amap: Awaited<ReturnType<ServiceQualityMonitor['performHealthCheck']>>;
      tencent: Awaited<ReturnType<ServiceQualityMonitor['performHealthCheck']>>;
    };
  }> {
    const now = new Date();
    const timeSinceLastSwitch = now.getTime() - this.lastSwitchTime.getTime();
    const cooldownRemaining = Math.max(0, this.cooldownPeriod - timeSinceLastSwitch);

    return {
      currentPrimary: this.currentPrimary,
      autoSwitchEnabled: this.autoSwitchEnabled,
      lastSwitchTime: this.lastSwitchTime,
      timeSinceLastSwitch,
      cooldownRemaining,
      healthStatus: {
        amap: await this.qualityMonitor.performHealthCheck('amap'),
        tencent: await this.qualityMonitor.performHealthCheck('tencent')
      }
    };
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    console.log('智能地理服务切换器已销毁');
  }
}

export default IntelligentGeoServiceSwitcher;
