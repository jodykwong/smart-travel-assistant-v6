/**
 * 智游助手v6.2 - 智能告警管理器
 * 遵循原则: [主动监控] + [智能分析] + [自适应阈值]
 * 
 * 核心功能:
 * 1. 智能告警规则引擎
 * 2. 自适应阈值调整
 * 3. 告警聚合和去重
 * 4. 多渠道告警通知
 */

import LangGraphMetricsCollector from './langgraph-metrics-collector';
import EnhancedMonitoringDashboard, { Alert } from './enhanced-monitoring-dashboard';

// ============= 告警规则接口定义 =============

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'info' | 'warning' | 'critical';
  condition: AlertCondition;
  threshold: AlertThreshold;
  cooldownPeriod: number; // 冷却期，避免重复告警
  notificationChannels: string[];
  autoResolve: boolean;
  tags: string[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  timeWindow: number; // 时间窗口（毫秒）
  aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count';
}

export interface AlertThreshold {
  warning: number;
  critical: number;
  adaptive: boolean; // 是否启用自适应阈值
  baselineWindow: number; // 基线计算窗口
}

export interface AlertNotification {
  id: string;
  alertId: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed';
  timestamp: number;
  retryCount: number;
  error?: string;
}

export interface AlertAnalytics {
  totalAlerts: number;
  alertsByLevel: Record<string, number>;
  alertsByType: Record<string, number>;
  averageResolutionTime: number;
  falsePositiveRate: number;
  topAlertSources: Array<{ source: string; count: number }>;
  alertTrends: Array<{ timestamp: number; count: number }>;
}

// ============= 智能告警管理器实现 =============

export class IntelligentAlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private notifications: AlertNotification[] = [];
  private metricsCollector: LangGraphMetricsCollector;
  private dashboard: EnhancedMonitoringDashboard;
  private evaluationInterval: NodeJS.Timeout;
  private baselines: Map<string, number[]> = new Map();

  constructor(
    metricsCollector: LangGraphMetricsCollector,
    dashboard: EnhancedMonitoringDashboard
  ) {
    this.metricsCollector = metricsCollector;
    this.dashboard = dashboard;
    this.initializeDefaultRules();
    this.startRuleEvaluation();
    console.log('智能告警管理器初始化完成');
  }

  // ============= 告警规则管理 =============

  /**
   * 初始化默认告警规则
   * 遵循原则: [主动监控] - 预设关键性能指标的监控规则
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_response_time',
        name: '响应时间过高',
        description: 'LangGraph节点平均响应时间超过阈值',
        enabled: true,
        severity: 'warning',
        condition: {
          metric: 'averageResponseTime',
          operator: '>',
          value: 2000,
          timeWindow: 300000, // 5分钟
          aggregation: 'avg'
        },
        threshold: {
          warning: 2000,
          critical: 5000,
          adaptive: true,
          baselineWindow: 3600000 // 1小时基线
        },
        cooldownPeriod: 600000, // 10分钟冷却期
        notificationChannels: ['console', 'dashboard'],
        autoResolve: true,
        tags: ['performance', 'langgraph']
      },
      {
        id: 'high_error_rate',
        name: '错误率过高',
        description: 'LangGraph执行错误率超过5%',
        enabled: true,
        severity: 'critical',
        condition: {
          metric: 'errorRate',
          operator: '>',
          value: 0.05,
          timeWindow: 300000,
          aggregation: 'avg'
        },
        threshold: {
          warning: 0.05,
          critical: 0.1,
          adaptive: false,
          baselineWindow: 3600000
        },
        cooldownPeriod: 300000, // 5分钟冷却期
        notificationChannels: ['console', 'dashboard', 'email'],
        autoResolve: true,
        tags: ['reliability', 'langgraph']
      },
      {
        id: 'memory_usage_high',
        name: '内存使用率过高',
        description: '系统内存使用率超过80%',
        enabled: true,
        severity: 'warning',
        condition: {
          metric: 'memoryUtilization',
          operator: '>',
          value: 0.8,
          timeWindow: 600000, // 10分钟
          aggregation: 'avg'
        },
        threshold: {
          warning: 0.8,
          critical: 0.9,
          adaptive: true,
          baselineWindow: 7200000 // 2小时基线
        },
        cooldownPeriod: 900000, // 15分钟冷却期
        notificationChannels: ['console', 'dashboard'],
        autoResolve: true,
        tags: ['system', 'resource']
      },
      {
        id: 'service_quality_degraded',
        name: '服务质量下降',
        description: 'Phase 1服务质量评分低于阈值',
        enabled: true,
        severity: 'warning',
        condition: {
          metric: 'serviceQualityScore',
          operator: '<',
          value: 0.8,
          timeWindow: 300000,
          aggregation: 'avg'
        },
        threshold: {
          warning: 0.8,
          critical: 0.6,
          adaptive: false,
          baselineWindow: 3600000
        },
        cooldownPeriod: 600000,
        notificationChannels: ['console', 'dashboard'],
        autoResolve: true,
        tags: ['phase1', 'quality']
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    console.log(`初始化了 ${defaultRules.length} 个默认告警规则`);
  }

  /**
   * 添加自定义告警规则
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    console.log(`添加告警规则: ${rule.name}`);
  }

  /**
   * 更新告警规则
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    this.rules.set(ruleId, rule);
    console.log(`更新告警规则: ${ruleId}`);
    return true;
  }

  /**
   * 删除告警规则
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      console.log(`删除告警规则: ${ruleId}`);
    }
    return deleted;
  }

  // ============= 告警评估和触发 =============

  /**
   * 开始规则评估
   */
  private startRuleEvaluation(): void {
    this.evaluationInterval = setInterval(() => {
      this.evaluateAllRules();
    }, 30000); // 每30秒评估一次
  }

  /**
   * 评估所有告警规则
   * 遵循原则: [智能分析] - 基于历史数据和趋势进行智能判断
   */
  private async evaluateAllRules(): Promise<void> {
    const currentMetrics = await this.getCurrentMetrics();
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        await this.evaluateRule(rule, currentMetrics);
      } catch (error) {
        console.error(`规则评估失败: ${rule.id}`, error);
      }
    }
  }

  /**
   * 评估单个告警规则
   */
  private async evaluateRule(rule: AlertRule, metrics: any): Promise<void> {
    const metricValue = this.extractMetricValue(metrics, rule.condition.metric);
    if (metricValue === undefined) return;

    // 检查自适应阈值
    const threshold = await this.getAdaptiveThreshold(rule, metricValue);
    
    // 评估条件
    const conditionMet = this.evaluateCondition(rule.condition, metricValue, threshold);
    
    if (conditionMet) {
      await this.triggerAlert(rule, metricValue, threshold);
    } else {
      await this.checkAutoResolve(rule);
    }
  }

  /**
   * 获取自适应阈值
   * 遵循原则: [自适应阈值] - 基于历史数据动态调整阈值
   */
  private async getAdaptiveThreshold(rule: AlertRule, currentValue: number): Promise<number> {
    if (!rule.threshold.adaptive) {
      return rule.condition.value;
    }

    const baselineKey = `${rule.id}_baseline`;
    let baseline = this.baselines.get(baselineKey) || [];
    
    // 添加当前值到基线
    baseline.push(currentValue);
    
    // 保持基线窗口大小
    const maxBaselineSize = Math.floor(rule.threshold.baselineWindow / 30000); // 30秒间隔
    if (baseline.length > maxBaselineSize) {
      baseline = baseline.slice(-maxBaselineSize);
    }
    
    this.baselines.set(baselineKey, baseline);
    
    if (baseline.length < 10) {
      // 数据不足，使用静态阈值
      return rule.condition.value;
    }

    // 计算动态阈值（基于标准差）
    const mean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const variance = baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baseline.length;
    const stdDev = Math.sqrt(variance);
    
    // 动态阈值 = 均值 + 2倍标准差
    const adaptiveThreshold = mean + (2 * stdDev);
    
    console.log(`自适应阈值计算: ${rule.id}, 基线均值: ${mean.toFixed(2)}, 动态阈值: ${adaptiveThreshold.toFixed(2)}`);
    
    return Math.max(adaptiveThreshold, rule.condition.value); // 不低于最小阈值
  }

  /**
   * 评估告警条件
   */
  private evaluateCondition(condition: AlertCondition, value: number, threshold: number): boolean {
    switch (condition.operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return Math.abs(value - threshold) < 0.001;
      case '!=': return Math.abs(value - threshold) >= 0.001;
      default: return false;
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(rule: AlertRule, value: number, threshold: number): Promise<void> {
    const alertKey = `${rule.id}_${rule.condition.metric}`;
    const existingAlert = this.activeAlerts.get(alertKey);
    
    // 检查冷却期
    if (existingAlert && Date.now() - existingAlert.timestamp < rule.cooldownPeriod) {
      return;
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level: rule.severity,
      type: rule.id,
      message: `${rule.name}: ${rule.condition.metric} = ${value.toFixed(2)} (阈值: ${threshold.toFixed(2)})`,
      timestamp: Date.now(),
      source: 'intelligent_alert_manager',
      resolved: false
    };

    this.activeAlerts.set(alertKey, alert);
    this.alertHistory.push(alert);
    
    // 添加到仪表板
    this.dashboard.addAlert(alert.level, alert.type, alert.message, alert.source);
    
    // 发送通知
    await this.sendNotifications(alert, rule.notificationChannels);
    
    console.log(`🚨 触发告警: ${alert.message}`);
  }

  /**
   * 检查自动解决
   */
  private async checkAutoResolve(rule: AlertRule): Promise<void> {
    if (!rule.autoResolve) return;

    const alertKey = `${rule.id}_${rule.condition.metric}`;
    const activeAlert = this.activeAlerts.get(alertKey);
    
    if (activeAlert && !activeAlert.resolved) {
      activeAlert.resolved = true;
      activeAlert.resolvedAt = Date.now();
      
      this.activeAlerts.delete(alertKey);
      this.dashboard.resolveAlert(activeAlert.id);
      
      console.log(`✅ 自动解决告警: ${activeAlert.id}`);
    }
  }

  // ============= 通知管理 =============

  /**
   * 发送告警通知
   */
  private async sendNotifications(alert: Alert, channels: string[]): Promise<void> {
    for (const channel of channels) {
      const notification: AlertNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        alertId: alert.id,
        channel,
        status: 'pending',
        timestamp: Date.now(),
        retryCount: 0
      };

      try {
        await this.sendNotification(notification, alert);
        notification.status = 'sent';
      } catch (error) {
        notification.status = 'failed';
        notification.error = error instanceof Error ? error.message : String(error);
        console.error(`通知发送失败: ${channel}`, error);
      }

      this.notifications.push(notification);
    }
  }

  /**
   * 发送单个通知
   */
  private async sendNotification(notification: AlertNotification, alert: Alert): Promise<void> {
    switch (notification.channel) {
      case 'console':
        console.log(`📢 [${alert.level.toUpperCase()}] ${alert.message}`);
        break;
      
      case 'dashboard':
        // 已在triggerAlert中处理
        break;
      
      case 'email':
        // 模拟邮件发送
        console.log(`📧 邮件通知: ${alert.message}`);
        break;
      
      case 'webhook':
        // 模拟Webhook调用
        console.log(`🔗 Webhook通知: ${alert.message}`);
        break;
      
      default:
        throw new Error(`不支持的通知渠道: ${notification.channel}`);
    }
  }

  // ============= 分析和统计 =============

  /**
   * 获取告警分析数据
   */
  getAlertAnalytics(timeRangeHours: number = 24): AlertAnalytics {
    const cutoffTime = Date.now() - (timeRangeHours * 60 * 60 * 1000);
    const recentAlerts = this.alertHistory.filter(a => a.timestamp >= cutoffTime);
    
    const alertsByLevel: Record<string, number> = {};
    const alertsByType: Record<string, number> = {};
    const alertSources: Record<string, number> = {};
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    recentAlerts.forEach(alert => {
      // 按级别统计
      alertsByLevel[alert.level] = (alertsByLevel[alert.level] || 0) + 1;
      
      // 按类型统计
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      
      // 按来源统计
      alertSources[alert.source] = (alertSources[alert.source] || 0) + 1;
      
      // 计算解决时间
      if (alert.resolved && alert.resolvedAt) {
        totalResolutionTime += alert.resolvedAt - alert.timestamp;
        resolvedCount++;
      }
    });

    const topAlertSources = Object.entries(alertSources)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 生成趋势数据（简化版）
    const alertTrends = this.generateAlertTrends(recentAlerts, timeRangeHours);

    return {
      totalAlerts: recentAlerts.length,
      alertsByLevel,
      alertsByType,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      falsePositiveRate: 0.05, // 模拟值，实际需要基于用户反馈计算
      topAlertSources,
      alertTrends
    };
  }

  /**
   * 生成告警趋势数据
   */
  private generateAlertTrends(alerts: Alert[], timeRangeHours: number): Array<{ timestamp: number; count: number }> {
    const bucketSize = Math.max(1, timeRangeHours / 24) * 60 * 60 * 1000; // 每小时一个数据点
    const buckets: Record<number, number> = {};
    
    alerts.forEach(alert => {
      const bucketKey = Math.floor(alert.timestamp / bucketSize) * bucketSize;
      buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
    });

    return Object.entries(buckets)
      .map(([timestamp, count]) => ({ timestamp: parseInt(timestamp), count }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // ============= 辅助方法 =============

  private async getCurrentMetrics(): Promise<any> {
    const performanceAggregates = this.metricsCollector.getPerformanceAggregates(5);
    const dashboardMetrics = await this.dashboard.getCurrentMetrics();
    
    return {
      averageResponseTime: performanceAggregates.averageResponseTime,
      errorRate: performanceAggregates.errorRate,
      memoryUtilization: performanceAggregates.memoryUtilization / (1024 * 1024 * 1024), // 转换为GB比例
      serviceQualityScore: dashboardMetrics.phase1.serviceQuality?.score || 0.9,
      throughput: performanceAggregates.throughput,
      concurrentExecutions: performanceAggregates.concurrentExecutions
    };
  }

  private extractMetricValue(metrics: any, metricPath: string): number | undefined {
    const keys = metricPath.split('.');
    let value = metrics;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  // ============= 公共接口方法 =============

  /**
   * 获取所有告警规则
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 手动解决告警
   */
  resolveAlert(alertId: string): boolean {
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId) {
        alert.resolved = true;
        alert.resolvedAt = Date.now();
        this.activeAlerts.delete(key);
        this.dashboard.resolveAlert(alertId);
        console.log(`手动解决告警: ${alertId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * 获取管理器状态
   */
  getManagerStatus() {
    return {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      activeAlerts: this.activeAlerts.size,
      totalNotifications: this.notifications.length,
      evaluationInterval: 30000
    };
  }

  /**
   * 销毁告警管理器
   */
  destroy(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }
    
    this.rules.clear();
    this.activeAlerts.clear();
    this.alertHistory = [];
    this.notifications = [];
    this.baselines.clear();
    
    console.log('智能告警管理器已销毁');
  }
}

export default IntelligentAlertManager;
