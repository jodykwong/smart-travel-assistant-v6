/**
 * 智游助手v6.2 - 质量感知路由器
 * 基于Phase 1服务质量监控数据的智能路由决策
 */

import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';
import ServiceQualityMonitor from '@/lib/geo/quality-monitor';
import { SmartTravelState, ProcessingStrategy, ServiceQualityContext } from './smart-travel-state';

// ============= 路由决策接口定义 =============

export interface RoutingDecision {
  nextNode: string;
  reasoning: string;
  confidence: number;
  alternativeNodes?: string[];
  estimatedProcessingTime?: number;
  qualityImpact?: number;
}

export interface RoutingContext {
  currentNode: string;
  availableNodes: string[];
  state: SmartTravelState;
  qualityThresholds: QualityThresholds;
  performanceTargets: PerformanceTargets;
}

export interface QualityThresholds {
  excellent: number;    // >0.9
  good: number;        // >0.8
  acceptable: number;  // >0.6
  poor: number;        // >0.4
}

export interface PerformanceTargets {
  maxResponseTime: number;     // 最大响应时间(ms)
  maxErrorRate: number;        // 最大错误率
  minAvailability: number;     // 最小可用性
  maxConcurrency: number;      // 最大并发数
}

export interface RoutingStrategy {
  name: string;
  description: string;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  priority: number;
}

export interface RoutingCondition {
  type: 'quality_score' | 'response_time' | 'error_rate' | 'availability' | 'complexity' | 'load';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  value: number;
  service?: 'amap' | 'tencent' | 'both';
}

export interface RoutingAction {
  type: 'route_to' | 'parallel_process' | 'fallback' | 'skip' | 'retry';
  target: string;
  parameters?: Record<string, any>;
}

// ============= 质量感知路由器实现 =============

export class QualityAwareRouter {
  private geoService: UnifiedGeoService;
  private qualityMonitor: ServiceQualityMonitor;
  private routingStrategies!: RoutingStrategy[];
  private qualityThresholds!: QualityThresholds;
  private performanceTargets!: PerformanceTargets;
  private routingHistory: RoutingDecision[] = [];

  constructor(
    geoService: UnifiedGeoService,
    qualityMonitor: ServiceQualityMonitor,
    config?: {
      qualityThresholds?: Partial<QualityThresholds>;
      performanceTargets?: Partial<PerformanceTargets>;
    }
  ) {
    this.geoService = geoService;
    this.qualityMonitor = qualityMonitor;
    
    this.qualityThresholds = {
      excellent: 0.9,
      good: 0.8,
      acceptable: 0.6,
      poor: 0.4,
      ...config?.qualityThresholds
    };

    this.performanceTargets = {
      maxResponseTime: 15000,
      maxErrorRate: 0.05,
      minAvailability: 0.95,
      maxConcurrency: 100,
      ...config?.performanceTargets
    };

    this.initializeRoutingStrategies();
  }

  // ============= 核心路由方法 =============

  /**
   * 基于服务质量的智能路由决策
   */
  async routeBasedOnQuality(
    currentNode: string,
    availableNodes: string[],
    state: SmartTravelState
  ): Promise<RoutingDecision> {
    try {
      console.log(`开始质量感知路由决策: ${currentNode} -> [${availableNodes.join(', ')}]`);

      // 获取当前服务质量状态
      const [qualityReport, serviceStatus] = await Promise.all([
        this.geoService.getQualityReport(),
        this.geoService.getServiceStatus()
      ]);

      // 构建路由上下文
      const context: RoutingContext = {
        currentNode,
        availableNodes,
        state,
        qualityThresholds: this.qualityThresholds,
        performanceTargets: this.performanceTargets
      };

      // 分析当前质量状况
      const qualityAnalysis = this.analyzeCurrentQuality(qualityReport, serviceStatus);
      
      // 选择最优路由策略
      const strategy = this.selectOptimalStrategy(context, qualityAnalysis);
      
      // 执行路由决策
      const decision = this.executeRoutingStrategy(strategy, context, qualityAnalysis);
      
      // 记录路由历史
      this.routingHistory.push(decision);
      
      console.log(`路由决策完成: ${decision.nextNode} (置信度: ${decision.confidence.toFixed(2)})`);
      console.log(`决策理由: ${decision.reasoning}`);

      return decision;

    } catch (error) {
      console.error('质量感知路由决策失败:', error);
      
      // 降级到默认路由
      return this.getFallbackRouting(currentNode, availableNodes, error as Error);
    }
  }

  /**
   * 基于复杂度的路由优化
   */
  async routeBasedOnComplexity(
    state: SmartTravelState,
    availableNodes: string[]
  ): Promise<RoutingDecision> {
    const complexity = (state as any).complexityAnalysis;
    
    if (!complexity) {
      return {
        nextNode: availableNodes[0] || 'error',
        reasoning: '缺少复杂度分析，使用默认路由',
        confidence: 0.5
      };
    }

    // 基于复杂度选择路由策略
    if (complexity.overall > 0.8) {
      // 高复杂度：使用全面分析路径
      return {
        nextNode: this.selectNodeForStrategy('comprehensive_analysis', availableNodes),
        reasoning: `高复杂度旅行(${complexity.overall.toFixed(2)})，选择全面分析路径`,
        confidence: 0.9,
        estimatedProcessingTime: complexity.estimatedProcessingTime * 1.5
      };
    } else if (complexity.overall > 0.5) {
      // 中等复杂度：使用智能双链路
      return {
        nextNode: this.selectNodeForStrategy('intelligent_dual_service', availableNodes),
        reasoning: `中等复杂度旅行(${complexity.overall.toFixed(2)})，选择智能双链路`,
        confidence: 0.8,
        estimatedProcessingTime: complexity.estimatedProcessingTime
      };
    } else {
      // 低复杂度：使用快速单服务
      return {
        nextNode: this.selectNodeForStrategy('fast_single_service', availableNodes),
        reasoning: `低复杂度旅行(${complexity.overall.toFixed(2)})，选择快速处理`,
        confidence: 0.7,
        estimatedProcessingTime: complexity.estimatedProcessingTime * 0.8
      };
    }
  }

  /**
   * 基于负载的动态路由
   */
  async routeBasedOnLoad(
    availableNodes: string[],
    targetConcurrency: number
  ): Promise<RoutingDecision> {
    const serviceStatus = await this.geoService.getServiceStatus();
    
    // 分析当前负载情况
    const amapLoad = (serviceStatus.healthStatus.amap as any).currentLoad || 0;
    const tencentLoad = (serviceStatus.healthStatus.tencent as any).currentLoad || 0;
    const systemLoad = Math.max(amapLoad, tencentLoad);

    if (systemLoad > 0.8) {
      // 高负载：选择负载均衡策略
      return {
        nextNode: this.selectLeastLoadedPath(availableNodes),
        reasoning: `系统负载过高(${(systemLoad * 100).toFixed(1)}%)，选择负载均衡路径`,
        confidence: 0.8,
        qualityImpact: -0.1 // 可能影响质量
      };
    } else if (systemLoad > 0.6) {
      // 中等负载：选择优化路径
      return {
        nextNode: this.selectOptimizedPath(availableNodes),
        reasoning: `系统负载中等(${(systemLoad * 100).toFixed(1)}%)，选择优化路径`,
        confidence: 0.9
      };
    } else {
      // 低负载：选择最优质量路径
      return {
        nextNode: this.selectHighQualityPath(availableNodes),
        reasoning: `系统负载较低(${(systemLoad * 100).toFixed(1)}%)，选择高质量路径`,
        confidence: 0.95
      };
    }
  }

  // ============= 路由策略实现 =============

  private initializeRoutingStrategies(): void {
    this.routingStrategies = [
      {
        name: 'high_quality_fast_track',
        description: '高质量服务快速通道',
        priority: 1,
        conditions: [
          { type: 'quality_score', operator: 'gte', value: this.qualityThresholds.excellent },
          { type: 'response_time', operator: 'lt', value: 5000 },
          { type: 'availability', operator: 'gte', value: 0.99 }
        ],
        actions: [
          { type: 'route_to', target: 'fast_processing_path' }
        ]
      },
      {
        name: 'dual_service_parallel',
        description: '双服务并行处理',
        priority: 2,
        conditions: [
          { type: 'quality_score', operator: 'gte', value: this.qualityThresholds.good, service: 'both' },
          { type: 'availability', operator: 'gte', value: 0.95, service: 'both' }
        ],
        actions: [
          { type: 'parallel_process', target: 'dual_service_nodes' }
        ]
      },
      {
        name: 'quality_degraded_fallback',
        description: '质量降级后备策略',
        priority: 3,
        conditions: [
          { type: 'quality_score', operator: 'lt', value: this.qualityThresholds.acceptable }
        ],
        actions: [
          { type: 'fallback', target: 'fallback_processing_path' }
        ]
      },
      {
        name: 'load_balancing',
        description: '负载均衡策略',
        priority: 4,
        conditions: [
          { type: 'load', operator: 'gt', value: 0.7 }
        ],
        actions: [
          { type: 'route_to', target: 'load_balanced_path' }
        ]
      }
    ];
  }

  private analyzeCurrentQuality(qualityReport: any, serviceStatus: any): QualityAnalysis {
    const amapQuality = qualityReport.comparison.amapScore;
    const tencentQuality = qualityReport.comparison.tencentScore;
    const avgQuality = (amapQuality + tencentQuality) / 2;

    const amapAvailable = serviceStatus.healthStatus.amap.status === 'healthy';
    const tencentAvailable = serviceStatus.healthStatus.tencent.status === 'healthy';

    const amapResponseTime = serviceStatus.healthStatus.amap.responseTime || 0;
    const tencentResponseTime = serviceStatus.healthStatus.tencent.responseTime || 0;

    return {
      overallQuality: avgQuality,
      serviceQualities: {
        amap: amapQuality,
        tencent: tencentQuality
      },
      availability: {
        amap: amapAvailable,
        tencent: tencentAvailable,
        overall: amapAvailable && tencentAvailable
      },
      responseTimes: {
        amap: amapResponseTime,
        tencent: tencentResponseTime,
        average: (amapResponseTime + tencentResponseTime) / 2
      },
      recommendation: this.getQualityRecommendation(avgQuality, amapAvailable, tencentAvailable)
    };
  }

  private selectOptimalStrategy(
    context: RoutingContext,
    qualityAnalysis: QualityAnalysis
  ): RoutingStrategy {
    // 按优先级排序策略
    const sortedStrategies = [...this.routingStrategies].sort((a, b) => a.priority - b.priority);

    // 找到第一个满足条件的策略
    for (const strategy of sortedStrategies) {
      if (this.evaluateStrategyConditions(strategy, context, qualityAnalysis)) {
        return strategy;
      }
    }

    // 如果没有策略匹配，返回默认策略
    return {
      name: 'default_routing',
      description: '默认路由策略',
      priority: 999,
      conditions: [],
      actions: [{ type: 'route_to', target: context.availableNodes[0] || 'error' }]
    };
  }

  private evaluateStrategyConditions(
    strategy: RoutingStrategy,
    context: RoutingContext,
    qualityAnalysis: QualityAnalysis
  ): boolean {
    return strategy.conditions.every(condition => {
      switch (condition.type) {
        case 'quality_score':
          const qualityValue = condition.service === 'amap' ? qualityAnalysis.serviceQualities.amap :
                              condition.service === 'tencent' ? qualityAnalysis.serviceQualities.tencent :
                              qualityAnalysis.overallQuality;
          return this.evaluateCondition(qualityValue, condition.operator, condition.value);

        case 'response_time':
          const responseTime = condition.service === 'amap' ? qualityAnalysis.responseTimes.amap :
                              condition.service === 'tencent' ? qualityAnalysis.responseTimes.tencent :
                              qualityAnalysis.responseTimes.average;
          return this.evaluateCondition(responseTime, condition.operator, condition.value);

        case 'availability':
          const availability = condition.service === 'amap' ? (qualityAnalysis.availability.amap ? 1 : 0) :
                              condition.service === 'tencent' ? (qualityAnalysis.availability.tencent ? 1 : 0) :
                              (qualityAnalysis.availability.overall ? 1 : 0);
          return this.evaluateCondition(availability, condition.operator, condition.value);

        case 'complexity':
          const complexity = (context.state as any).complexityAnalysis?.overall || 0.5;
          return this.evaluateCondition(complexity, condition.operator, condition.value);

        case 'load':
          // 简化的负载评估
          const load = 0.5; // 实际应该从系统监控获取
          return this.evaluateCondition(load, condition.operator, condition.value);

        default:
          return false;
      }
    });
  }

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return Math.abs(value - threshold) < 0.001;
      case 'neq': return Math.abs(value - threshold) >= 0.001;
      default: return false;
    }
  }

  private executeRoutingStrategy(
    strategy: RoutingStrategy,
    context: RoutingContext,
    qualityAnalysis: QualityAnalysis
  ): RoutingDecision {
    const action = strategy.actions[0]; // 简化处理，取第一个动作

    if (!action) {
      return {
        nextNode: context.availableNodes[0] || 'default',
        confidence: 0.1,
        reasoning: '没有可用的路由动作'
      };
    }

    switch (action.type) {
      case 'route_to':
        return {
          nextNode: this.resolveTargetNode(action.target, context.availableNodes),
          reasoning: `执行策略"${strategy.name}": ${strategy.description}`,
          confidence: this.calculateConfidence(strategy, qualityAnalysis),
          estimatedProcessingTime: this.estimateProcessingTime(action.target, qualityAnalysis)
        };

      case 'parallel_process':
        return {
          nextNode: this.selectParallelProcessingNode(context.availableNodes),
          reasoning: `执行并行处理策略: ${strategy.description}`,
          confidence: this.calculateConfidence(strategy, qualityAnalysis),
          alternativeNodes: this.getParallelNodes(context.availableNodes)
        };

      case 'fallback':
        return {
          nextNode: this.selectFallbackNode(context.availableNodes),
          reasoning: `执行降级策略: ${strategy.description}`,
          confidence: 0.6,
          qualityImpact: -0.2
        };

      default:
        return {
          nextNode: context.availableNodes[0] || 'error',
          reasoning: `未知动作类型，使用默认路由`,
          confidence: 0.3
        };
    }
  }

  // ============= 辅助方法 =============

  private selectNodeForStrategy(strategy: ProcessingStrategy, availableNodes: string[]): string {
    const strategyNodeMap: Record<ProcessingStrategy, string[]> = {
      'fast_single_service': ['gather_destination_data', 'create_travel_plan'],
      'intelligent_dual_service': ['gather_destination_data', 'analyze_route_options'],
      'comprehensive_analysis': ['gather_destination_data', 'analyze_route_options', 'collect_poi_information'],
      'parallel_processing': ['gather_destination_data'],
      'fallback_mode': ['create_travel_plan']
    };

    const preferredNodes = strategyNodeMap[strategy] || [];
    const matchingNode = preferredNodes.find(node => availableNodes.includes(node));
    
    return matchingNode || availableNodes[0] || 'error';
  }

  private selectLeastLoadedPath(availableNodes: string[]): string {
    // 简化实现：选择第一个可用节点
    return availableNodes[0] || 'error';
  }

  private selectOptimizedPath(availableNodes: string[]): string {
    // 简化实现：选择中间节点
    const midIndex = Math.floor(availableNodes.length / 2);
    return availableNodes[midIndex] || availableNodes[0] || 'error';
  }

  private selectHighQualityPath(availableNodes: string[]): string {
    // 优先选择数据收集和分析节点
    const highQualityNodes = ['gather_destination_data', 'analyze_route_options', 'collect_poi_information'];
    const matchingNode = highQualityNodes.find(node => availableNodes.includes(node));
    return matchingNode || availableNodes[0] || 'error';
  }

  private getQualityRecommendation(
    avgQuality: number,
    amapAvailable: boolean,
    tencentAvailable: boolean
  ): string {
    if (avgQuality >= this.qualityThresholds.excellent && amapAvailable && tencentAvailable) {
      return 'parallel_processing';
    } else if (avgQuality >= this.qualityThresholds.good) {
      return 'intelligent_dual_service';
    } else if (avgQuality >= this.qualityThresholds.acceptable) {
      return 'comprehensive_analysis';
    } else {
      return 'fallback_mode';
    }
  }

  private resolveTargetNode(target: string, availableNodes: string[]): string {
    if (availableNodes.includes(target)) {
      return target;
    }
    
    // 目标节点映射
    const targetMap: Record<string, string[]> = {
      'fast_processing_path': ['create_travel_plan'],
      'dual_service_nodes': ['gather_destination_data', 'analyze_route_options'],
      'fallback_processing_path': ['create_travel_plan'],
      'load_balanced_path': ['gather_destination_data']
    };

    const candidates = targetMap[target] || [];
    const matchingNode = candidates.find(node => availableNodes.includes(node));
    
    return matchingNode || availableNodes[0] || 'error';
  }

  private calculateConfidence(strategy: RoutingStrategy, qualityAnalysis: QualityAnalysis): number {
    let confidence = 0.8; // 基础置信度

    // 基于质量调整置信度
    if (qualityAnalysis.overallQuality >= this.qualityThresholds.excellent) {
      confidence += 0.15;
    } else if (qualityAnalysis.overallQuality >= this.qualityThresholds.good) {
      confidence += 0.1;
    } else if (qualityAnalysis.overallQuality < this.qualityThresholds.acceptable) {
      confidence -= 0.2;
    }

    // 基于可用性调整置信度
    if (qualityAnalysis.availability.overall) {
      confidence += 0.05;
    } else {
      confidence -= 0.15;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private estimateProcessingTime(target: string, qualityAnalysis: QualityAnalysis): number {
    const baseTime = 5000; // 5秒基础时间
    const qualityMultiplier = 2 - qualityAnalysis.overallQuality; // 质量越低，时间越长
    
    return Math.ceil(baseTime * qualityMultiplier);
  }

  private selectParallelProcessingNode(availableNodes: string[]): string {
    return availableNodes.find(node => node.includes('gather') || node.includes('collect')) || 
           availableNodes[0] || 'error';
  }

  private getParallelNodes(availableNodes: string[]): string[] {
    return availableNodes.filter(node => 
      node.includes('gather') || node.includes('collect') || node.includes('analyze')
    );
  }

  private selectFallbackNode(availableNodes: string[]): string {
    return availableNodes.find(node => node.includes('create') || node.includes('plan')) ||
           availableNodes[availableNodes.length - 1] || 'error';
  }

  private getFallbackRouting(currentNode: string, availableNodes: string[], error: Error): RoutingDecision {
    return {
      nextNode: availableNodes[0] || 'error',
      reasoning: `路由决策失败(${error.message})，使用降级路由`,
      confidence: 0.2,
      qualityImpact: -0.5
    };
  }

  // ============= 公共接口方法 =============

  /**
   * 获取路由历史
   */
  getRoutingHistory(limit: number = 10): RoutingDecision[] {
    return this.routingHistory.slice(-limit);
  }

  /**
   * 清理路由历史
   */
  clearRoutingHistory(): void {
    this.routingHistory = [];
  }

  /**
   * 更新质量阈值
   */
  updateQualityThresholds(thresholds: Partial<QualityThresholds>): void {
    this.qualityThresholds = { ...this.qualityThresholds, ...thresholds };
  }

  /**
   * 更新性能目标
   */
  updatePerformanceTargets(targets: Partial<PerformanceTargets>): void {
    this.performanceTargets = { ...this.performanceTargets, ...targets };
  }
}

// ============= 辅助接口 =============

interface QualityAnalysis {
  overallQuality: number;
  serviceQualities: {
    amap: number;
    tencent: number;
  };
  availability: {
    amap: boolean;
    tencent: boolean;
    overall: boolean;
  };
  responseTimes: {
    amap: number;
    tencent: number;
    average: number;
  };
  recommendation: string;
}

export default QualityAwareRouter;
