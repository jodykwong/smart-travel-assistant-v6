/**
 * 智游助手v6.2 - 旅行服务容器
 * 遵循原则: [SOLID-依赖倒置] + [SOLID-接口隔离] + [工厂模式]
 * 
 * 核心功能:
 * 1. 统一服务依赖管理
 * 2. 解决构造函数参数过多问题
 * 3. 支持服务生命周期管理
 * 4. 提供类型安全的服务注册和解析
 */

import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';
import { ServiceQualityMonitor } from '@/lib/geo/quality-monitor';
import { IntelligentGeoQueue } from '@/lib/queue/intelligent-queue';
import { UserFriendlyErrorHandler } from '@/lib/error/user-friendly-error-handler';
import IntelligentCacheManager from '@/lib/cache/intelligent-cache-manager';
import CacheStrategyFactory from '@/lib/cache/cache-strategy-factory';
import TravelStateManager from '@/lib/langgraph/state-manager';
import LangGraphErrorMiddleware from '@/lib/langgraph/error-middleware';

// ============= 服务容器接口定义 =============

export interface ITravelServiceContainer {
  // 核心服务注册
  registerGeoService(service: UnifiedGeoService): void;
  registerQualityMonitor(monitor: ServiceQualityMonitor): void;
  registerQueue(queue: IntelligentGeoQueue): void;
  registerErrorHandler(handler: UserFriendlyErrorHandler): void;
  registerCacheManager(manager: IntelligentCacheManager): void;
  registerStateManager(manager: TravelStateManager): void;

  // 服务解析
  getGeoService(): UnifiedGeoService;
  getQualityMonitor(): ServiceQualityMonitor;
  getQueue(): IntelligentGeoQueue;
  getErrorHandler(): UserFriendlyErrorHandler;
  getCacheManager(): IntelligentCacheManager;
  getStateManager(): TravelStateManager;

  // 生命周期管理
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  isInitialized(): boolean;

  // 健康检查
  healthCheck(): Promise<ServiceHealthStatus>;
}

export interface ServiceHealthStatus {
  healthy: boolean;
  services: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: number;
    responseTime?: number;
    error?: string;
  }>;
  overallScore: number;
}

export interface ServiceRegistration<T = any> {
  instance: T;
  singleton: boolean;
  initialized: boolean;
  dependencies: string[];
  factory?: () => T | Promise<T>;
}

export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped';

// ============= 服务容器实现 =============

export class TravelServiceContainer implements ITravelServiceContainer {
  private services: Map<string, ServiceRegistration> = new Map();
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    console.log('旅行服务容器初始化');
  }

  // ============= 服务注册方法 =============

  /**
   * 注册地理服务
   * 遵循原则: [SOLID-依赖倒置] - 依赖抽象而非具体实现
   */
  registerGeoService(service: UnifiedGeoService): void {
    this.registerService('geoService', service, true);
  }

  registerQualityMonitor(monitor: ServiceQualityMonitor): void {
    this.registerService('qualityMonitor', monitor, true);
  }

  registerQueue(queue: IntelligentGeoQueue): void {
    this.registerService('queue', queue, true);
  }

  registerErrorHandler(handler: UserFriendlyErrorHandler): void {
    this.registerService('errorHandler', handler, true);
  }

  registerCacheManager(manager: IntelligentCacheManager): void {
    this.registerService('cacheManager', manager, true);
  }

  registerStateManager(manager: TravelStateManager): void {
    this.registerService('stateManager', manager, true);
  }

  /**
   * 通用服务注册方法
   * 支持单例和工厂模式
   */
  private registerService<T>(
    name: string, 
    instanceOrFactory: T | (() => T | Promise<T>), 
    singleton: boolean = true,
    dependencies: string[] = []
  ): void {
    
    if (typeof instanceOrFactory === 'function') {
      // 工厂模式注册
      this.services.set(name, {
        instance: null,
        singleton,
        initialized: false,
        dependencies,
        factory: instanceOrFactory as () => T | Promise<T>
      });
    } else {
      // 实例注册
      this.services.set(name, {
        instance: instanceOrFactory,
        singleton,
        initialized: true,
        dependencies
      });
    }

    console.log(`服务已注册: ${name} (${singleton ? '单例' : '瞬态'})`);
  }

  // ============= 服务解析方法 =============

  getGeoService(): UnifiedGeoService {
    return this.resolveService<UnifiedGeoService>('geoService');
  }

  getQualityMonitor(): ServiceQualityMonitor {
    return this.resolveService<ServiceQualityMonitor>('qualityMonitor');
  }

  getQueue(): IntelligentGeoQueue {
    return this.resolveService<IntelligentGeoQueue>('queue');
  }

  getErrorHandler(): UserFriendlyErrorHandler {
    return this.resolveService<UserFriendlyErrorHandler>('errorHandler');
  }

  getCacheManager(): IntelligentCacheManager {
    return this.resolveService<IntelligentCacheManager>('cacheManager');
  }

  getStateManager(): TravelStateManager {
    return this.resolveService<TravelStateManager>('stateManager');
  }

  /**
   * 通用服务解析方法
   * 遵循原则: [SOLID-接口隔离] - 客户端只依赖需要的接口
   */
  private resolveService<T>(name: string): T {
    const registration = this.services.get(name);
    
    if (!registration) {
      throw new Error(`服务未注册: ${name}`);
    }

    // 如果是单例且已初始化，直接返回
    if (registration.singleton && registration.initialized && registration.instance) {
      return registration.instance as T;
    }

    // 如果有工厂方法，使用工厂创建
    if (registration.factory) {
      const instance = registration.factory();
      
      if (registration.singleton) {
        registration.instance = instance;
        registration.initialized = true;
      }
      
      return instance as T;
    }

    // 返回已注册的实例
    if (registration.instance) {
      return registration.instance as T;
    }

    throw new Error(`无法解析服务: ${name}`);
  }

  // ============= 生命周期管理 =============

  /**
   * 初始化所有服务
   * 遵循原则: [为失败而设计] - 优雅处理初始化失败
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    console.log('开始初始化旅行服务容器...');
    
    const initializationSteps = [
      { name: '质量监控服务', action: () => this.initializeQualityMonitor() },
      { name: '缓存管理服务', action: () => this.initializeCacheManager() },
      { name: '地理服务', action: () => this.initializeGeoService() },
      { name: '队列服务', action: () => this.initializeQueue() },
      { name: '错误处理服务', action: () => this.initializeErrorHandler() },
      { name: '状态管理服务', action: () => this.initializeStateManager() }
    ];

    for (const step of initializationSteps) {
      try {
        console.log(`初始化 ${step.name}...`);
        await step.action();
        console.log(`✅ ${step.name} 初始化完成`);
      } catch (error) {
        console.error(`❌ ${step.name} 初始化失败:`, error);
        throw new Error(`服务容器初始化失败: ${step.name} - ${error}`);
      }
    }

    this.initialized = true;
    console.log('🎉 旅行服务容器初始化完成');
  }

  private async initializeQualityMonitor(): Promise<void> {
    const monitor = this.getQualityMonitor();
    // ServiceQualityMonitor不需要特殊初始化，它是被动监控
    console.log('服务质量监控器已就绪');
  }

  private async initializeCacheManager(): Promise<void> {
    const cacheManager = this.getCacheManager();
    // 缓存管理器通常不需要特殊初始化
    console.log('缓存管理器已就绪');
  }

  private async initializeGeoService(): Promise<void> {
    const geoService = this.getGeoService();
    if (geoService && typeof geoService.initialize === 'function') {
      await geoService.initialize();
    }
  }

  private async initializeQueue(): Promise<void> {
    const queue = this.getQueue();
    if (queue && typeof queue.start === 'function') {
      await queue.start();
    }
  }

  private async initializeErrorHandler(): Promise<void> {
    const errorHandler = this.getErrorHandler();
    // 错误处理器通常不需要特殊初始化
    console.log('错误处理器已就绪');
  }

  private async initializeStateManager(): Promise<void> {
    const stateManager = this.getStateManager();
    // 状态管理器通常不需要特殊初始化
    console.log('状态管理器已就绪');
  }

  /**
   * 销毁所有服务
   */
  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log('开始销毁旅行服务容器...');

    const destroySteps = [
      { name: '状态管理服务', action: () => this.destroyStateManager() },
      { name: '错误处理服务', action: () => this.destroyErrorHandler() },
      { name: '队列服务', action: () => this.destroyQueue() },
      { name: '地理服务', action: () => this.destroyGeoService() },
      { name: '缓存管理服务', action: () => this.destroyCacheManager() },
      { name: '质量监控服务', action: () => this.destroyQualityMonitor() }
    ];

    for (const step of destroySteps) {
      try {
        console.log(`销毁 ${step.name}...`);
        await step.action();
        console.log(`✅ ${step.name} 销毁完成`);
      } catch (error) {
        console.error(`⚠️  ${step.name} 销毁失败:`, error);
        // 继续销毁其他服务，不抛出异常
      }
    }

    this.services.clear();
    this.initialized = false;
    this.initializationPromise = null;
    console.log('🎉 旅行服务容器销毁完成');
  }

  private async destroyQualityMonitor(): Promise<void> {
    try {
      const monitor = this.getQualityMonitor();
      // ServiceQualityMonitor不需要特殊销毁，它是被动监控
      console.log('服务质量监控器已停止');
    } catch (error) {
      // 服务可能已经不存在
    }
  }

  private async destroyCacheManager(): Promise<void> {
    try {
      const cacheManager = this.getCacheManager();
      if (cacheManager && typeof cacheManager.destroy === 'function') {
        cacheManager.destroy();
      }
    } catch (error) {
      // 服务可能已经不存在
    }
  }

  private async destroyGeoService(): Promise<void> {
    try {
      const geoService = this.getGeoService();
      if (geoService && typeof geoService.destroy === 'function') {
        geoService.destroy();
      }
    } catch (error) {
      // 服务可能已经不存在
    }
  }

  private async destroyQueue(): Promise<void> {
    try {
      const queue = this.getQueue();
      if (queue && typeof queue.stop === 'function') {
        await queue.stop();
      }
    } catch (error) {
      // 服务可能已经不存在
    }
  }

  private async destroyErrorHandler(): Promise<void> {
    // 错误处理器通常不需要特殊销毁
  }

  private async destroyStateManager(): Promise<void> {
    // 状态管理器通常不需要特殊销毁
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ============= 健康检查 =============

  /**
   * 执行服务健康检查
   * 遵循原则: [为失败而设计] - 主动监控服务健康状态
   */
  async healthCheck(): Promise<ServiceHealthStatus> {
    const services: Record<string, any> = {};
    let healthyCount = 0;
    let totalCount = 0;

    const healthChecks = [
      { name: 'geoService', check: () => this.checkGeoServiceHealth() },
      { name: 'qualityMonitor', check: () => this.checkQualityMonitorHealth() },
      { name: 'cacheManager', check: () => this.checkCacheManagerHealth() },
      { name: 'queue', check: () => this.checkQueueHealth() },
      { name: 'errorHandler', check: () => this.checkErrorHandlerHealth() },
      { name: 'stateManager', check: () => this.checkStateManagerHealth() }
    ];

    for (const healthCheck of healthChecks) {
      totalCount++;
      try {
        const startTime = Date.now();
        const result = await healthCheck.check();
        const responseTime = Date.now() - startTime;

        services[healthCheck.name] = {
          status: result ? 'healthy' : 'degraded',
          lastCheck: Date.now(),
          responseTime
        };

        if (result) {
          healthyCount++;
        }
      } catch (error) {
        services[healthCheck.name] = {
          status: 'unhealthy',
          lastCheck: Date.now(),
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    const overallScore = totalCount > 0 ? (healthyCount / totalCount) : 0;
    const healthy = overallScore >= 0.8; // 80%的服务健康才认为整体健康

    return {
      healthy,
      services,
      overallScore
    };
  }

  private async checkGeoServiceHealth(): Promise<boolean> {
    try {
      const geoService = this.getGeoService();
      return geoService && typeof geoService.getServiceStatus === 'function';
    } catch {
      return false;
    }
  }

  private async checkQualityMonitorHealth(): Promise<boolean> {
    try {
      const monitor = this.getQualityMonitor();
      // 检查监控器是否存在并有基本方法
      return monitor && typeof monitor.getAverageQualityScore === 'function';
    } catch {
      return false;
    }
  }

  private async checkCacheManagerHealth(): Promise<boolean> {
    try {
      const cacheManager = this.getCacheManager();
      return cacheManager && typeof cacheManager.getMetrics === 'function';
    } catch {
      return false;
    }
  }

  private async checkQueueHealth(): Promise<boolean> {
    try {
      const queue = this.getQueue();
      return queue && typeof queue.getStatus === 'function';
    } catch {
      return false;
    }
  }

  private async checkErrorHandlerHealth(): Promise<boolean> {
    try {
      const errorHandler = this.getErrorHandler();
      return errorHandler && typeof errorHandler.handleError === 'function';
    } catch {
      return false;
    }
  }

  private async checkStateManagerHealth(): Promise<boolean> {
    try {
      const stateManager = this.getStateManager();
      return stateManager && typeof stateManager.getCurrentState === 'function';
    } catch {
      return false;
    }
  }

  // ============= 调试和监控方法 =============

  /**
   * 获取服务注册信息
   */
  getServiceRegistrations(): Array<{ name: string; initialized: boolean; singleton: boolean }> {
    return Array.from(this.services.entries()).map(([name, registration]) => ({
      name,
      initialized: registration.initialized,
      singleton: registration.singleton
    }));
  }

  /**
   * 获取容器统计信息
   */
  getContainerStats() {
    const registrations = this.getServiceRegistrations();
    return {
      totalServices: registrations.length,
      initializedServices: registrations.filter(r => r.initialized).length,
      singletonServices: registrations.filter(r => r.singleton).length,
      containerInitialized: this.initialized
    };
  }
}

export default TravelServiceContainer;
