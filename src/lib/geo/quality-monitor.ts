/**
 * 智游助手v6.2 - 服务质量监控系统
 * 实时监控地理服务质量，支持智能切换决策
 * 
 * 核心功能:
 * 1. 多维度服务质量评估
 * 2. 实时性能指标收集
 * 3. 质量趋势分析
 * 4. 智能告警机制
 */

// ============= 质量指标接口定义 =============

export interface ServiceQualityMetrics {
  responseTime: number;      // 响应时间 (ms)
  accuracy: number;          // 数据准确性 (0-1)
  completeness: number;      // 数据完整性 (0-1)
  availability: number;      // 服务可用性 (0-1)
  errorRate: number;         // 错误率 (0-1)
  timestamp: Date;           // 记录时间
}

export interface QualityScore {
  overall: number;           // 综合评分 (0-1)
  breakdown: {
    performance: number;     // 性能评分
    reliability: number;     // 可靠性评分
    dataQuality: number;     // 数据质量评分
  };
  timestamp: Date;
}

export interface ServiceHealthStatus {
  service: 'amap' | 'tencent';
  status: 'healthy' | 'degraded' | 'unhealthy';
  qualityScore: number;
  lastCheck: Date;
  issues: string[];
}

export interface QualityTrend {
  service: 'amap' | 'tencent';
  trend: 'improving' | 'stable' | 'degrading';
  changeRate: number;       // 变化率
  timeWindow: number;       // 时间窗口 (分钟)
}

// ============= 服务质量监控器 =============

export class ServiceQualityMonitor {
  private metrics: Map<string, ServiceQualityMetrics[]> = new Map();
  private readonly maxHistorySize = 1000; // 最大历史记录数
  private readonly qualityThreshold: number;
  private readonly responseTimeThreshold: number;
  private readonly accuracyThreshold: number;

  constructor() {
    this.qualityThreshold = parseFloat(process.env.GEO_QUALITY_THRESHOLD!) || 0.9;
    this.responseTimeThreshold = parseInt(process.env.GEO_RESPONSE_TIME_THRESHOLD!) || 10000;
    this.accuracyThreshold = parseFloat(process.env.GEO_ACCURACY_THRESHOLD!) || 0.95;
  }

  // ============= 质量评分算法 =============

  /**
   * 计算综合质量评分
   */
  calculateQualityScore(metrics: ServiceQualityMetrics): QualityScore {
    // 性能评分 (响应时间)
    const performanceScore = Math.max(0, 1 - metrics.responseTime / this.responseTimeThreshold);
    
    // 可靠性评分 (可用性 + 错误率)
    const reliabilityScore = metrics.availability * (1 - metrics.errorRate);
    
    // 数据质量评分 (准确性 + 完整性)
    const dataQualityScore = (metrics.accuracy * 0.6 + metrics.completeness * 0.4);
    
    // 综合评分 (加权平均)
    const overallScore = (
      performanceScore * 0.3 +
      reliabilityScore * 0.4 +
      dataQualityScore * 0.3
    );

    return {
      overall: Math.max(0, Math.min(1, overallScore)),
      breakdown: {
        performance: performanceScore,
        reliability: reliabilityScore,
        dataQuality: dataQualityScore
      },
      timestamp: new Date()
    };
  }

  /**
   * 判断质量是否可接受
   */
  isQualityAcceptable(score: number): boolean {
    return score >= this.qualityThreshold;
  }

  /**
   * 判断服务是否健康
   */
  isServiceHealthy(metrics: ServiceQualityMetrics): boolean {
    const score = this.calculateQualityScore(metrics);
    return this.isQualityAcceptable(score.overall) &&
           metrics.responseTime < this.responseTimeThreshold &&
           metrics.accuracy >= this.accuracyThreshold;
  }

  // ============= 指标记录和管理 =============

  /**
   * 记录服务质量指标
   */
  recordMetrics(service: 'amap' | 'tencent', metrics: ServiceQualityMetrics): void {
    const key = service;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const serviceMetrics = this.metrics.get(key)!;
    serviceMetrics.push(metrics);
    
    // 保持历史记录在限制范围内
    if (serviceMetrics.length > this.maxHistorySize) {
      serviceMetrics.shift();
    }
    
    // 记录日志
    const score = this.calculateQualityScore(metrics);
    console.log(`服务质量记录 - ${service}: 综合评分=${score.overall.toFixed(3)}, 响应时间=${metrics.responseTime}ms`);
  }

  /**
   * 获取最近的质量指标
   */
  getRecentMetrics(service: 'amap' | 'tencent', timeWindow: number = 300): ServiceQualityMetrics[] {
    const key = service;
    const serviceMetrics = this.metrics.get(key) || [];
    const cutoffTime = new Date(Date.now() - timeWindow * 1000);
    
    return serviceMetrics.filter(metric => metric.timestamp >= cutoffTime);
  }

  /**
   * 获取平均质量评分
   */
  getAverageQualityScore(service: 'amap' | 'tencent', timeWindow: number = 300): number {
    const recentMetrics = this.getRecentMetrics(service, timeWindow);
    
    if (recentMetrics.length === 0) {
      return 0;
    }
    
    const totalScore = recentMetrics.reduce((sum, metrics) => {
      const score = this.calculateQualityScore(metrics);
      return sum + score.overall;
    }, 0);
    
    return totalScore / recentMetrics.length;
  }

  // ============= 健康检查和状态评估 =============

  /**
   * 执行服务健康检查
   */
  async performHealthCheck(service: 'amap' | 'tencent'): Promise<ServiceHealthStatus> {
    const recentMetrics = this.getRecentMetrics(service, 300); // 最近5分钟
    
    if (recentMetrics.length === 0) {
      return {
        service,
        status: 'unhealthy',
        qualityScore: 0,
        lastCheck: new Date(),
        issues: ['无可用的质量数据']
      };
    }
    
    const averageScore = this.getAverageQualityScore(service, 300);
    const latestMetrics = recentMetrics[recentMetrics.length - 1];
    const issues: string[] = [];
    
    // 检查各项指标
    if (latestMetrics && latestMetrics.responseTime > this.responseTimeThreshold) {
      issues.push(`响应时间过长: ${latestMetrics.responseTime}ms`);
    }
    
    if (latestMetrics && latestMetrics.accuracy < this.accuracyThreshold) {
      issues.push(`数据准确性不足: ${(latestMetrics.accuracy * 100).toFixed(1)}%`);
    }

    if (latestMetrics && latestMetrics.errorRate > 0.05) {
      issues.push(`错误率过高: ${(latestMetrics.errorRate * 100).toFixed(1)}%`);
    }

    if (latestMetrics && latestMetrics.availability < 0.95) {
      issues.push(`可用性不足: ${(latestMetrics.availability * 100).toFixed(1)}%`);
    }
    
    // 确定健康状态
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (averageScore >= this.qualityThreshold && issues.length === 0) {
      status = 'healthy';
    } else if (averageScore >= this.qualityThreshold * 0.8) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      service,
      status,
      qualityScore: averageScore,
      lastCheck: new Date(),
      issues
    };
  }

  // ============= 趋势分析 =============

  /**
   * 计算质量趋势
   */
  calculateQualityTrend(service: 'amap' | 'tencent', timeWindow: number = 900): QualityTrend {
    const recentMetrics = this.getRecentMetrics(service, timeWindow);
    
    if (recentMetrics.length < 2) {
      return {
        service,
        trend: 'stable',
        changeRate: 0,
        timeWindow
      };
    }
    
    // 将数据分为前半段和后半段
    const midPoint = Math.floor(recentMetrics.length / 2);
    const firstHalf = recentMetrics.slice(0, midPoint);
    const secondHalf = recentMetrics.slice(midPoint);
    
    // 计算两个时间段的平均评分
    const firstHalfScore = this.calculateAverageScore(firstHalf);
    const secondHalfScore = this.calculateAverageScore(secondHalf);
    
    const changeRate = secondHalfScore - firstHalfScore;
    
    let trend: 'improving' | 'stable' | 'degrading';
    if (changeRate > 0.05) {
      trend = 'improving';
    } else if (changeRate < -0.05) {
      trend = 'degrading';
    } else {
      trend = 'stable';
    }
    
    return {
      service,
      trend,
      changeRate,
      timeWindow
    };
  }

  private calculateAverageScore(metrics: ServiceQualityMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalScore = metrics.reduce((sum, metric) => {
      const score = this.calculateQualityScore(metric);
      return sum + score.overall;
    }, 0);
    
    return totalScore / metrics.length;
  }

  // ============= 比较和推荐 =============

  /**
   * 比较两个服务的质量
   */
  compareServices(timeWindow: number = 300): {
    better: 'amap' | 'tencent' | 'equal';
    amapScore: number;
    tencentScore: number;
    difference: number;
  } {
    const amapScore = this.getAverageQualityScore('amap', timeWindow);
    const tencentScore = this.getAverageQualityScore('tencent', timeWindow);
    const difference = Math.abs(amapScore - tencentScore);
    
    let better: 'amap' | 'tencent' | 'equal';
    if (difference < 0.02) { // 差异小于2%认为相等
      better = 'equal';
    } else if (amapScore > tencentScore) {
      better = 'amap';
    } else {
      better = 'tencent';
    }
    
    return {
      better,
      amapScore,
      tencentScore,
      difference
    };
  }

  /**
   * 推荐最佳服务
   */
  recommendBestService(): 'amap' | 'tencent' {
    const comparison = this.compareServices();
    
    // 如果质量相当，优先选择高德（主服务）
    if (comparison.better === 'equal') {
      return 'amap';
    }
    
    return comparison.better;
  }

  // ============= 监控报告 =============

  /**
   * 生成质量监控报告
   */
  generateQualityReport(): {
    timestamp: Date;
    services: {
      amap: ServiceHealthStatus;
      tencent: ServiceHealthStatus;
    };
    comparison: any; // 服务比较结果
    recommendation: 'amap' | 'tencent';
    trends: {
      amap: QualityTrend;
      tencent: QualityTrend;
    };
  } {
    return {
      timestamp: new Date(),
      services: {
        amap: this.performHealthCheck('amap') as any, // 简化类型处理
        tencent: this.performHealthCheck('tencent') as any
      },
      comparison: this.compareServices(),
      recommendation: this.recommendBestService(),
      trends: {
        amap: this.calculateQualityTrend('amap'),
        tencent: this.calculateQualityTrend('tencent')
      }
    };
  }

  // ============= 清理和维护 =============

  /**
   * 清理过期数据
   */
  cleanupOldData(maxAge: number = 86400): void { // 默认24小时
    const cutoffTime = new Date(Date.now() - maxAge * 1000);
    
    for (const [service, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(metric => metric.timestamp >= cutoffTime);
      this.metrics.set(service, filteredMetrics);
    }
    
    console.log(`质量监控数据清理完成，保留${maxAge}秒内的数据`);
  }

  /**
   * 获取监控统计信息
   */
  getMonitoringStats(): {
    totalRecords: number;
    serviceRecords: { amap: number; tencent: number };
    oldestRecord: Date | null;
    newestRecord: Date | null;
  } {
    let totalRecords = 0;
    let oldestRecord: Date | null = null;
    let newestRecord: Date | null = null;
    
    const serviceRecords = { amap: 0, tencent: 0 };
    
    for (const [service, metrics] of this.metrics.entries()) {
      totalRecords += metrics.length;
      serviceRecords[service as 'amap' | 'tencent'] = metrics.length;
      
      if (metrics.length > 0 && metrics[0] && metrics[metrics.length - 1]) {
        const serviceOldest = metrics[0]!.timestamp;
        const serviceNewest = metrics[metrics.length - 1]!.timestamp;
        
        if (!oldestRecord || serviceOldest < oldestRecord) {
          oldestRecord = serviceOldest;
        }
        
        if (!newestRecord || serviceNewest > newestRecord) {
          newestRecord = serviceNewest;
        }
      }
    }
    
    return {
      totalRecords,
      serviceRecords,
      oldestRecord,
      newestRecord
    };
  }
}

export default ServiceQualityMonitor;
