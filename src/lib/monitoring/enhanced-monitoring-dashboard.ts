/**
 * 智游助手v6.2 - 增强监控仪表板
 * 遵循原则: [可观测性] + [实时监控] + [数据可视化]
 * 
 * 核心功能:
 * 1. 集成LangGraph执行指标到Phase 1监控
 * 2. 实时性能数据可视化
 * 3. 智能告警和趋势分析
 * 4. 多维度监控视图
 */

import LangGraphMetricsCollector, { 
  PerformanceAggregates, 
  NodeExecutionMetrics,
  StateTransitionMetrics,
  ErrorRecoveryMetrics 
} from './langgraph-metrics-collector';
import { ServiceQualityMonitor } from '@/lib/geo/quality-monitor';

// ============= 仪表板接口定义 =============

export interface DashboardMetrics {
  timestamp: number;
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  langgraph: {
    activeWorkflows: number;
    totalExecutions: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  phase1: {
    serviceQuality: any;
    cacheHitRate: number;
    apiCallCount: number;
    switchingEvents: number;
  };
  alerts: AlertSummary;
}

export interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  recent: Alert[];
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  timestamp: number;
  source: string;
  resolved: boolean;
  resolvedAt?: number;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'alert';
  data: any;
  config: {
    refreshInterval: number;
    autoRefresh: boolean;
    height?: number;
    width?: number;
  };
}

export interface MonitoringView {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: {
    columns: number;
    rows: number;
  };
}

// ============= 增强监控仪表板实现 =============

export class EnhancedMonitoringDashboard {
  private metricsCollector: LangGraphMetricsCollector;
  private qualityMonitor: ServiceQualityMonitor;
  private alerts: Alert[] = [];
  private views: Map<string, MonitoringView> = new Map();
  private refreshInterval!: NodeJS.Timeout;
  private currentMetrics!: DashboardMetrics;

  constructor(
    metricsCollector: LangGraphMetricsCollector,
    qualityMonitor: ServiceQualityMonitor
  ) {
    this.metricsCollector = metricsCollector;
    this.qualityMonitor = qualityMonitor;
    this.initializeDefaultViews();
    this.startMetricsRefresh();
    console.log('增强监控仪表板初始化完成');
  }

  // ============= 核心监控方法 =============

  /**
   * 获取实时仪表板指标
   * 遵循原则: [实时监控] - 提供最新的系统状态
   */
  async getCurrentMetrics(): Promise<DashboardMetrics> {
    const timestamp = Date.now();
    
    // 收集LangGraph指标
    const langGraphMetrics = this.metricsCollector.getRealTimeMetrics();
    const performanceAggregates = this.metricsCollector.getPerformanceAggregates(60);
    
    // 收集Phase 1指标
    const serviceQuality = await this.qualityMonitor.getCurrentQuality();
    
    // 收集系统指标
    const systemMetrics = this.getSystemMetrics();
    
    this.currentMetrics = {
      timestamp,
      system: systemMetrics,
      langgraph: {
        activeWorkflows: langGraphMetrics.activeExecutions,
        totalExecutions: langGraphMetrics.totalNodeExecutions,
        averageResponseTime: performanceAggregates.averageResponseTime,
        errorRate: performanceAggregates.errorRate,
        throughput: performanceAggregates.throughput
      },
      phase1: {
        serviceQuality,
        cacheHitRate: 0.8, // 从缓存管理器获取
        apiCallCount: 1000, // 从API计数器获取
        switchingEvents: 5 // 从切换器获取
      },
      alerts: this.getAlertSummary()
    };

    return this.currentMetrics;
  }

  /**
   * 获取性能趋势数据
   */
  getPerformanceTrends(timeRangeHours: number = 24): {
    timestamps: number[];
    responseTime: number[];
    errorRate: number[];
    throughput: number[];
    memoryUsage: number[];
  } {
    
    const now = Date.now();
    const interval = (timeRangeHours * 60 * 60 * 1000) / 100; // 100个数据点
    const timestamps: number[] = [];
    const responseTime: number[] = [];
    const errorRate: number[] = [];
    const throughput: number[] = [];
    const memoryUsage: number[] = [];

    // 生成模拟趋势数据（实际实现中应该从历史数据获取）
    for (let i = 0; i < 100; i++) {
      const timestamp = now - (timeRangeHours * 60 * 60 * 1000) + (i * interval);
      timestamps.push(timestamp);
      
      // 模拟性能趋势
      responseTime.push(800 + Math.sin(i / 10) * 200 + Math.random() * 100);
      errorRate.push(Math.max(0, 0.02 + Math.sin(i / 15) * 0.01 + Math.random() * 0.01));
      throughput.push(50 + Math.sin(i / 8) * 10 + Math.random() * 5);
      memoryUsage.push(60 + Math.sin(i / 12) * 15 + Math.random() * 5);
    }

    return { timestamps, responseTime, errorRate, throughput, memoryUsage };
  }

  /**
   * 获取节点执行热力图数据
   */
  getNodeExecutionHeatmap(): Array<{
    nodeId: string;
    nodeName: string;
    executionCount: number;
    averageDuration: number;
    errorRate: number;
    intensity: number; // 0-1, 用于热力图颜色
  }> {
    
    const nodeRanking = this.metricsCollector.getNodePerformanceRanking(20);
    const maxExecutions = Math.max(...nodeRanking.map(n => n.executionCount));
    
    return nodeRanking.map(node => ({
      nodeId: node.nodeName.replace(/\s+/g, '_').toLowerCase(),
      nodeName: node.nodeName,
      executionCount: node.executionCount,
      averageDuration: Math.round(node.averageDuration),
      errorRate: Math.round(node.errorCount / node.executionCount * 100) / 100,
      intensity: node.executionCount / maxExecutions
    }));
  }

  // ============= 视图管理 =============

  /**
   * 初始化默认监控视图
   */
  private initializeDefaultViews(): void {
    // 概览视图
    const overviewView: MonitoringView = {
      id: 'overview',
      name: '系统概览',
      description: 'LangGraph和Phase 1系统整体状态',
      layout: { columns: 4, rows: 3 },
      widgets: [
        {
          id: 'system_health',
          title: '系统健康状态',
          type: 'metric',
          data: {},
          config: { refreshInterval: 30000, autoRefresh: true }
        },
        {
          id: 'response_time_chart',
          title: '响应时间趋势',
          type: 'chart',
          data: {},
          config: { refreshInterval: 60000, autoRefresh: true }
        },
        {
          id: 'error_rate_chart',
          title: '错误率趋势',
          type: 'chart',
          data: {},
          config: { refreshInterval: 60000, autoRefresh: true }
        },
        {
          id: 'active_alerts',
          title: '活跃告警',
          type: 'alert',
          data: {},
          config: { refreshInterval: 10000, autoRefresh: true }
        }
      ]
    };

    // LangGraph详细视图
    const langGraphView: MonitoringView = {
      id: 'langgraph',
      name: 'LangGraph执行监控',
      description: 'LangGraph节点执行和状态转换详情',
      layout: { columns: 3, rows: 4 },
      widgets: [
        {
          id: 'node_execution_heatmap',
          title: '节点执行热力图',
          type: 'chart',
          data: {},
          config: { refreshInterval: 120000, autoRefresh: true }
        },
        {
          id: 'state_transition_flow',
          title: '状态转换流程',
          type: 'chart',
          data: {},
          config: { refreshInterval: 60000, autoRefresh: true }
        },
        {
          id: 'workflow_performance',
          title: '工作流性能统计',
          type: 'table',
          data: {},
          config: { refreshInterval: 60000, autoRefresh: true }
        }
      ]
    };

    // Phase 1集成视图
    const phase1View: MonitoringView = {
      id: 'phase1',
      name: 'Phase 1服务监控',
      description: 'Phase 1九大核心组件状态',
      layout: { columns: 3, rows: 3 },
      widgets: [
        {
          id: 'service_quality',
          title: '服务质量监控',
          type: 'metric',
          data: {},
          config: { refreshInterval: 30000, autoRefresh: true }
        },
        {
          id: 'cache_performance',
          title: '缓存性能',
          type: 'chart',
          data: {},
          config: { refreshInterval: 60000, autoRefresh: true }
        },
        {
          id: 'api_usage',
          title: 'API使用统计',
          type: 'table',
          data: {},
          config: { refreshInterval: 120000, autoRefresh: true }
        }
      ]
    };

    this.views.set('overview', overviewView);
    this.views.set('langgraph', langGraphView);
    this.views.set('phase1', phase1View);
  }

  /**
   * 获取监控视图
   */
  getView(viewId: string): MonitoringView | undefined {
    return this.views.get(viewId);
  }

  /**
   * 获取所有可用视图
   */
  getAllViews(): MonitoringView[] {
    return Array.from(this.views.values());
  }

  /**
   * 更新视图配置
   */
  updateView(viewId: string, updates: Partial<MonitoringView>): boolean {
    const view = this.views.get(viewId);
    if (!view) return false;

    Object.assign(view, updates);
    this.views.set(viewId, view);
    return true;
  }

  // ============= 告警管理 =============

  /**
   * 添加告警
   */
  addAlert(
    level: 'info' | 'warning' | 'critical',
    type: string,
    message: string,
    source: string
  ): Alert {
    
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      type,
      message,
      timestamp: Date.now(),
      source,
      resolved: false
    };

    this.alerts.push(alert);
    
    // 保持最近1000条告警
    if (this.alerts.length > 1000) {
      this.alerts.splice(0, this.alerts.length - 1000);
    }

    console.log(`🚨 新告警: [${level.toUpperCase()}] ${message}`);
    return alert;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    
    console.log(`✅ 告警已解决: ${alertId}`);
    return true;
  }

  /**
   * 获取告警摘要
   */
  private getAlertSummary(): AlertSummary {
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    const recentAlerts = this.alerts
      .filter(a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000) // 最近24小时
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      total: activeAlerts.length,
      critical: activeAlerts.filter(a => a.level === 'critical').length,
      warning: activeAlerts.filter(a => a.level === 'warning').length,
      info: activeAlerts.filter(a => a.level === 'info').length,
      recent: recentAlerts
    };
  }

  // ============= 辅助方法 =============

  private getSystemMetrics() {
    const uptime = process.uptime ? process.uptime() * 1000 : Date.now();
    const memoryUsage = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    
    return {
      uptime,
      memoryUsage,
      cpuUsage: Math.random() * 100, // 模拟CPU使用率
      activeConnections: Math.floor(Math.random() * 100) + 50
    };
  }

  private startMetricsRefresh(): void {
    this.refreshInterval = setInterval(async () => {
      try {
        await this.getCurrentMetrics();
        this.checkAlertConditions();
      } catch (error) {
        console.error('指标刷新失败:', error);
      }
    }, 30000); // 每30秒刷新一次
  }

  private checkAlertConditions(): void {
    if (!this.currentMetrics) return;

    const { langgraph, system } = this.currentMetrics;

    // 检查响应时间告警
    if (langgraph.averageResponseTime > 2000) {
      this.addAlert(
        'warning',
        'high_response_time',
        `平均响应时间过高: ${langgraph.averageResponseTime.toFixed(0)}ms`,
        'langgraph'
      );
    }

    // 检查错误率告警
    if (langgraph.errorRate > 0.05) {
      this.addAlert(
        'critical',
        'high_error_rate',
        `错误率过高: ${(langgraph.errorRate * 100).toFixed(1)}%`,
        'langgraph'
      );
    }

    // 检查内存使用告警
    if (system.memoryUsage > 1024 * 1024 * 1024) { // 1GB
      this.addAlert(
        'warning',
        'high_memory_usage',
        `内存使用过高: ${(system.memoryUsage / 1024 / 1024).toFixed(0)}MB`,
        'system'
      );
    }
  }

  // ============= 公共接口方法 =============

  /**
   * 获取仪表板配置
   */
  getDashboardConfig() {
    return {
      views: this.getAllViews().map(v => ({
        id: v.id,
        name: v.name,
        description: v.description
      })),
      refreshInterval: 30000,
      alertThresholds: {
        responseTime: 2000,
        errorRate: 0.05,
        memoryUsage: 1024 * 1024 * 1024
      }
    };
  }

  /**
   * 导出监控数据
   */
  exportMetrics(format: 'json' | 'csv' = 'json') {
    const data = {
      timestamp: Date.now(),
      metrics: this.currentMetrics,
      trends: this.getPerformanceTrends(24),
      nodeHeatmap: this.getNodeExecutionHeatmap(),
      alerts: this.alerts.filter(a => !a.resolved)
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // 简化的CSV导出
      return 'timestamp,responseTime,errorRate,throughput\n' +
        data.trends.timestamps.map((ts, i) => 
          `${ts},${data.trends.responseTime[i]},${data.trends.errorRate[i]},${data.trends.throughput[i]}`
        ).join('\n');
    }
  }

  /**
   * 销毁仪表板
   */
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.views.clear();
    this.alerts = [];
    
    console.log('增强监控仪表板已销毁');
  }
}

export default EnhancedMonitoringDashboard;
