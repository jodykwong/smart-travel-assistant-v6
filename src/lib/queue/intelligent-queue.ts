/**
 * 智游助手v6.2 - 智能队列管理系统
 * 基于双链路架构的高并发请求处理和智能队列管理
 * 
 * 核心功能:
 * 1. 智能优先级队列管理
 * 2. 并发控制和负载均衡
 * 3. 基于服务质量的动态调度
 * 4. 请求去重和缓存优化
 * 5. 实时性能监控和调优
 */

import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';
import ServiceQualityMonitor from '@/lib/geo/quality-monitor';

// ============= 队列系统接口定义 =============

export interface QueueRequest {
  id: string;
  type: 'geocoding' | 'reverse_geocoding' | 'place_search' | 'route_planning' | 'weather';
  params: Record<string, any>;
  priority: number;           // 优先级 (1-10, 10最高)
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  timeout: number;           // 超时时间 (毫秒)
  retryCount: number;        // 重试次数
  maxRetries: number;        // 最大重试次数
  callback?: (result: any, error?: Error) => void;
}

export interface QueueConfig {
  maxConcurrent: number;      // 最大并发数
  maxQueueSize: number;       // 最大队列长度
  defaultTimeout: number;     // 默认超时时间
  defaultMaxRetries: number;  // 默认最大重试次数
  priorityLevels: number;     // 优先级级别数
  loadBalancingStrategy: 'round_robin' | 'quality_based' | 'least_loaded';
  enableDeduplication: boolean; // 启用请求去重
  enableCaching: boolean;     // 启用结果缓存
}

export interface QueueMetrics {
  totalRequests: number;
  processedRequests: number;
  failedRequests: number;
  currentQueueLength: number;
  currentConcurrency: number;
  averageProcessingTime: number;
  averageWaitTime: number;
  throughput: number;         // 请求/秒
  cacheHitRate: number;
  deduplicationRate: number;
}

export interface ProcessingResult<T = any> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: Error;
  processingTime: number;
  waitTime: number;
  serviceUsed: 'amap' | 'tencent';
  fromCache: boolean;
  deduplicated: boolean;
}

// ============= 优先级队列实现 =============

class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number): void {
    const queueElement = { item, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (queueElement.priority > this.items[i].priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(queueElement);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0]?.item;
  }

  clear(): void {
    this.items = [];
  }
}

// ============= 智能队列管理器实现 =============

export class IntelligentGeoQueue {
  private geoService: UnifiedGeoService;
  private qualityMonitor: ServiceQualityMonitor;
  private config: QueueConfig;
  private queue: PriorityQueue<QueueRequest>;
  private processing: Map<string, QueueRequest> = new Map();
  private results: Map<string, ProcessingResult> = new Map();
  private cache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map();
  private deduplicationMap: Map<string, string[]> = new Map(); // 请求签名 -> 请求ID列表
  private metrics: QueueMetrics;
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(
    geoService: UnifiedGeoService,
    qualityMonitor: ServiceQualityMonitor,
    config?: Partial<QueueConfig>
  ) {
    this.geoService = geoService;
    this.qualityMonitor = qualityMonitor;
    this.config = {
      maxConcurrent: 50,
      maxQueueSize: 1000,
      defaultTimeout: 30000,
      defaultMaxRetries: 3,
      priorityLevels: 10,
      loadBalancingStrategy: 'quality_based',
      enableDeduplication: true,
      enableCaching: true,
      ...config
    };
    this.queue = new PriorityQueue<QueueRequest>();
    this.metrics = this.initializeMetrics();
  }

  // ============= 队列管理 =============

  /**
   * 启动队列处理
   */
  start(): void {
    if (this.isProcessing) {
      console.log('智能队列已在运行中');
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 100); // 每100ms检查一次队列

    console.log('智能队列管理器已启动');
  }

  /**
   * 停止队列处理
   */
  stop(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    console.log('智能队列管理器已停止');
  }

  /**
   * 添加请求到队列
   */
  async enqueue(request: Omit<QueueRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    // 检查队列容量
    if (this.queue.size() >= this.config.maxQueueSize) {
      throw new Error('队列已满，请稍后重试');
    }

    const requestId = this.generateRequestId();
    const fullRequest: QueueRequest = {
      id: requestId,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.config.defaultMaxRetries,
      timeout: this.config.defaultTimeout,
      ...request
    };

    // 检查缓存
    if (this.config.enableCaching) {
      const cacheKey = this.generateCacheKey(fullRequest);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        this.handleCachedResult(fullRequest, cachedResult);
        return requestId;
      }
    }

    // 检查去重
    if (this.config.enableDeduplication) {
      const signature = this.generateRequestSignature(fullRequest);
      const existingRequests = this.deduplicationMap.get(signature);
      if (existingRequests && existingRequests.length > 0) {
        this.handleDuplicateRequest(fullRequest, existingRequests[0]);
        return requestId;
      }
      
      // 记录请求签名
      if (!this.deduplicationMap.has(signature)) {
        this.deduplicationMap.set(signature, []);
      }
      this.deduplicationMap.get(signature)!.push(requestId);
    }

    // 添加到队列
    this.queue.enqueue(fullRequest, fullRequest.priority);
    this.metrics.totalRequests++;

    console.log(`请求 ${requestId} 已加入队列，当前队列长度: ${this.queue.size()}`);
    return requestId;
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    // 检查是否可以处理更多请求
    while (this.processing.size < this.config.maxConcurrent && !this.queue.isEmpty()) {
      const request = this.queue.dequeue();
      if (request) {
        this.processRequest(request);
      }
    }

    // 更新队列指标
    this.updateQueueMetrics();
  }

  /**
   * 处理单个请求
   */
  private async processRequest(request: QueueRequest): Promise<void> {
    const startTime = Date.now();
    const waitTime = startTime - request.timestamp.getTime();

    this.processing.set(request.id, request);
    this.metrics.currentConcurrency = this.processing.size;
    this.metrics.currentQueueLength = this.queue.size();

    try {
      console.log(`开始处理请求 ${request.id}, 类型: ${request.type}`);

      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), request.timeout);
      });

      // 执行请求
      const resultPromise = this.executeRequest(request);
      const result = await Promise.race([resultPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;

      // 创建成功结果
      const processResult: ProcessingResult = {
        requestId: request.id,
        success: true,
        data: result.data,
        processingTime,
        waitTime,
        serviceUsed: result.serviceUsed,
        fromCache: false,
        deduplicated: false
      };

      this.handleRequestSuccess(request, processResult);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // 检查是否需要重试
      if (request.retryCount < request.maxRetries) {
        request.retryCount++;
        console.log(`请求 ${request.id} 失败，准备重试 (${request.retryCount}/${request.maxRetries})`);
        
        // 降低优先级后重新入队
        this.queue.enqueue(request, Math.max(1, request.priority - 1));
      } else {
        // 创建失败结果
        const processResult: ProcessingResult = {
          requestId: request.id,
          success: false,
          error: error as Error,
          processingTime,
          waitTime,
          serviceUsed: 'amap', // 默认值
          fromCache: false,
          deduplicated: false
        };

        this.handleRequestFailure(request, processResult);
      }
    } finally {
      this.processing.delete(request.id);
      this.metrics.currentConcurrency = this.processing.size();
    }
  }

  /**
   * 执行地理服务请求
   */
  private async executeRequest(request: QueueRequest): Promise<{ data: any; serviceUsed: 'amap' | 'tencent' }> {
    const currentService = this.geoService.getCurrentPrimaryService();

    switch (request.type) {
      case 'geocoding':
        const geocodingResult = await this.geoService.geocoding(request.params.address, request.params.city);
        return { data: geocodingResult, serviceUsed: currentService };

      case 'reverse_geocoding':
        const reverseResult = await this.geoService.reverseGeocoding(request.params.location);
        return { data: reverseResult, serviceUsed: currentService };

      case 'place_search':
        const placeResult = await this.geoService.placeSearch(
          request.params.keywords,
          request.params.location,
          request.params.radius
        );
        return { data: placeResult, serviceUsed: currentService };

      case 'route_planning':
        const routeResult = await this.geoService.routePlanning(
          request.params.origin,
          request.params.destination,
          request.params.mode,
          request.params.city
        );
        return { data: routeResult, serviceUsed: currentService };

      case 'weather':
        const weatherResult = await this.geoService.weather(request.params.location);
        return { data: weatherResult, serviceUsed: currentService };

      default:
        throw new Error(`不支持的请求类型: ${request.type}`);
    }
  }

  // ============= 缓存管理 =============

  private generateCacheKey(request: QueueRequest): string {
    const params = JSON.stringify(request.params);
    return `${request.type}:${Buffer.from(params).toString('base64')}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp.getTime() > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });
  }

  private handleCachedResult(request: QueueRequest, cachedData: any): void {
    const result: ProcessingResult = {
      requestId: request.id,
      success: true,
      data: cachedData,
      processingTime: 0,
      waitTime: 0,
      serviceUsed: 'amap', // 缓存结果无法确定来源
      fromCache: true,
      deduplicated: false
    };

    this.handleRequestSuccess(request, result);
    this.metrics.cacheHitRate = this.calculateCacheHitRate();
  }

  // ============= 去重管理 =============

  private generateRequestSignature(request: QueueRequest): string {
    const signature = {
      type: request.type,
      params: request.params
    };
    return Buffer.from(JSON.stringify(signature)).toString('base64');
  }

  private handleDuplicateRequest(request: QueueRequest, originalRequestId: string): void {
    const result: ProcessingResult = {
      requestId: request.id,
      success: true,
      data: null, // 将在原始请求完成后更新
      processingTime: 0,
      waitTime: 0,
      serviceUsed: 'amap',
      fromCache: false,
      deduplicated: true
    };

    this.results.set(request.id, result);
    this.metrics.deduplicationRate = this.calculateDeduplicationRate();
    
    console.log(`请求 ${request.id} 被去重，关联到原始请求 ${originalRequestId}`);
  }

  // ============= 结果处理 =============

  private handleRequestSuccess(request: QueueRequest, result: ProcessingResult): void {
    this.results.set(request.id, result);
    this.metrics.processedRequests++;

    // 更新缓存
    if (this.config.enableCaching && !result.fromCache) {
      const cacheKey = this.generateCacheKey(request);
      this.setCache(cacheKey, result.data);
    }

    // 调用回调
    if (request.callback) {
      request.callback(result.data);
    }

    // 清理去重映射
    this.cleanupDeduplication(request);

    console.log(`请求 ${request.id} 处理成功，耗时: ${result.processingTime}ms`);
  }

  private handleRequestFailure(request: QueueRequest, result: ProcessingResult): void {
    this.results.set(request.id, result);
    this.metrics.failedRequests++;

    // 调用回调
    if (request.callback) {
      request.callback(null, result.error);
    }

    // 清理去重映射
    this.cleanupDeduplication(request);

    console.error(`请求 ${request.id} 处理失败:`, result.error?.message);
  }

  private cleanupDeduplication(request: QueueRequest): void {
    if (this.config.enableDeduplication) {
      const signature = this.generateRequestSignature(request);
      const requestIds = this.deduplicationMap.get(signature);
      if (requestIds) {
        const index = requestIds.indexOf(request.id);
        if (index > -1) {
          requestIds.splice(index, 1);
        }
        if (requestIds.length === 0) {
          this.deduplicationMap.delete(signature);
        }
      }
    }
  }

  // ============= 指标计算 =============

  private initializeMetrics(): QueueMetrics {
    return {
      totalRequests: 0,
      processedRequests: 0,
      failedRequests: 0,
      currentQueueLength: 0,
      currentConcurrency: 0,
      averageProcessingTime: 0,
      averageWaitTime: 0,
      throughput: 0,
      cacheHitRate: 0,
      deduplicationRate: 0
    };
  }

  private updateQueueMetrics(): void {
    this.metrics.currentQueueLength = this.queue.size();
    this.metrics.currentConcurrency = this.processing.size;
    
    // 计算平均处理时间
    const completedResults = Array.from(this.results.values()).filter(r => r.success);
    if (completedResults.length > 0) {
      this.metrics.averageProcessingTime = completedResults.reduce((sum, r) => sum + r.processingTime, 0) / completedResults.length;
      this.metrics.averageWaitTime = completedResults.reduce((sum, r) => sum + r.waitTime, 0) / completedResults.length;
    }

    // 计算吞吐量 (最近1分钟)
    const oneMinuteAgo = Date.now() - 60000;
    const recentResults = Array.from(this.results.values()).filter(
      r => r.requestId && Date.now() - parseInt(r.requestId.split('_')[1]) < 60000
    );
    this.metrics.throughput = recentResults.length / 60; // 请求/秒
  }

  private calculateCacheHitRate(): number {
    const totalResults = Array.from(this.results.values());
    if (totalResults.length === 0) return 0;
    
    const cacheHits = totalResults.filter(r => r.fromCache).length;
    return cacheHits / totalResults.length;
  }

  private calculateDeduplicationRate(): number {
    const totalResults = Array.from(this.results.values());
    if (totalResults.length === 0) return 0;
    
    const deduplicated = totalResults.filter(r => r.deduplicated).length;
    return deduplicated / totalResults.length;
  }

  // ============= 公共接口方法 =============

  /**
   * 获取请求结果
   */
  getResult(requestId: string): ProcessingResult | undefined {
    return this.results.get(requestId);
  }

  /**
   * 获取队列指标
   */
  getMetrics(): QueueMetrics {
    this.updateQueueMetrics();
    return { ...this.metrics };
  }

  /**
   * 获取队列状态
   */
  getStatus(): {
    isProcessing: boolean;
    queueLength: number;
    processingCount: number;
    config: QueueConfig;
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.size(),
      processingCount: this.processing.size,
      config: this.config
    };
  }

  /**
   * 清理过期结果
   */
  cleanupResults(maxAge: number = 3600000): void {
    const cutoffTime = Date.now() - maxAge;
    
    for (const [requestId, result] of this.results.entries()) {
      const requestTime = parseInt(requestId.split('_')[1]);
      if (requestTime < cutoffTime) {
        this.results.delete(requestId);
      }
    }

    // 清理过期缓存
    for (const [key, cached] of this.cache.entries()) {
      if (Date.now() - cached.timestamp.getTime() > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('队列配置已更新');
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default IntelligentGeoQueue;
