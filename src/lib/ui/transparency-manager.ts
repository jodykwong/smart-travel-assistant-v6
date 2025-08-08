/**
 * 智游助手v6.2 - 智能透明度管理器
 * 基于用户认知负担最小化原则的服务状态展示系统
 * 
 * 核心理念:
 * 1. 适度透明：只展示用户需要知道的信息
 * 2. 渐进式披露：根据用户类型和情况调整透明度
 * 3. 诚实但不技术化：用用户能理解的语言说明问题
 * 4. 主动通知：重要状态变化时主动告知用户
 * 5. 可选深度：高级用户可选择查看更多技术细节
 */

import { UnifiedGeoService } from '@/lib/geo/unified-geo-service';
import MonitoringDashboard, { type DashboardMetrics } from '@/lib/monitoring/monitoring-dashboard';
import IntelligentGeoQueue, { type QueueMetrics } from '@/lib/queue/intelligent-queue';

// ============= 透明度管理接口定义 =============

export type UserType = 'basic' | 'advanced' | 'developer';
export type TransparencyLevel = 'minimal' | 'moderate' | 'detailed' | 'technical';
export type ServiceStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'unavailable';

export interface UserStatusDisplay {
  level: TransparencyLevel;
  status: ServiceStatus;
  message: string;
  icon: string;
  color: 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  showProgress?: boolean;
  progressValue?: number;
  actionable?: boolean;
  actionText?: string;
  actionCallback?: () => void;
  details?: StatusDetail[];
  timestamp: Date;
}

export interface StatusDetail {
  label: string;
  value: string;
  type: 'info' | 'warning' | 'error' | 'success';
  technical?: boolean;
}

export interface TransparencyConfig {
  defaultUserType: UserType;
  autoAdjustLevel: boolean;          // 根据情况自动调整透明度
  showTechnicalDetails: boolean;     // 是否显示技术细节
  enableProgressIndicators: boolean; // 启用进度指示器
  notificationThreshold: number;     // 通知阈值
  updateInterval: number;            // 状态更新间隔
}

export interface NotificationEvent {
  id: string;
  type: 'service_switch' | 'quality_change' | 'error_recovery' | 'maintenance' | 'improvement';
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
  autoHide: boolean;
  hideAfter?: number;
}

// ============= 智能透明度管理器实现 =============

export class IntelligentTransparencyManager {
  private geoService: UnifiedGeoService;
  private dashboard: MonitoringDashboard;
  private queue: IntelligentGeoQueue;
  private config: TransparencyConfig;
  private notifications: NotificationEvent[] = [];
  private lastStatus: ServiceStatus = 'good';
  private statusHistory: Array<{ status: ServiceStatus; timestamp: Date }> = [];

  constructor(
    geoService: UnifiedGeoService,
    dashboard: MonitoringDashboard,
    queue: IntelligentGeoQueue,
    config?: Partial<TransparencyConfig>
  ) {
    this.geoService = geoService;
    this.dashboard = dashboard;
    this.queue = queue;
    this.config = {
      defaultUserType: 'basic',
      autoAdjustLevel: true,
      showTechnicalDetails: false,
      enableProgressIndicators: true,
      notificationThreshold: 0.8,
      updateInterval: 30000,
      ...config
    };
  }

  // ============= 主要状态展示方法 =============

  /**
   * 获取适合用户的状态展示
   */
  async getUserStatusDisplay(userType: UserType = this.config.defaultUserType): Promise<UserStatusDisplay> {
    const [serviceStatus, dashboardMetrics, queueMetrics] = await Promise.all([
      this.geoService.getServiceStatus(),
      this.dashboard.getCurrentMetrics(),
      this.queue.getMetrics()
    ]);

    const overallStatus = this.calculateOverallStatus(serviceStatus, dashboardMetrics, queueMetrics);
    const transparencyLevel = this.determineTransparencyLevel(userType, overallStatus);

    return this.generateStatusDisplay(overallStatus, transparencyLevel, serviceStatus, dashboardMetrics, queueMetrics);
  }

  /**
   * 计算整体服务状态
   */
  private calculateOverallStatus(serviceStatus: any, dashboardMetrics: DashboardMetrics, queueMetrics: QueueMetrics): ServiceStatus {
    // 基于多个指标计算综合状态
    let score = 1.0;

    // 服务质量评分 (40%权重)
    const avgQualityScore = (serviceStatus.qualityMetrics.amap + serviceStatus.qualityMetrics.tencent) / 2;
    score *= (avgQualityScore * 0.4 + 0.6);

    // 响应时间评分 (25%权重)
    const avgResponseTime = (dashboardMetrics.services.amap.responseTime + dashboardMetrics.services.tencent.responseTime) / 2;
    const responseScore = Math.max(0, 1 - avgResponseTime / 20000); // 20秒为最差
    score *= (responseScore * 0.25 + 0.75);

    // 错误率评分 (20%权重)
    const avgErrorRate = (dashboardMetrics.services.amap.errorRate + dashboardMetrics.services.tencent.errorRate) / 2;
    const errorScore = Math.max(0, 1 - avgErrorRate * 10); // 10%错误率为最差
    score *= (errorScore * 0.2 + 0.8);

    // 队列状态评分 (15%权重)
    const queueScore = Math.max(0, 1 - queueMetrics.currentQueueLength / 100); // 100个请求为满载
    score *= (queueScore * 0.15 + 0.85);

    // 转换为状态等级
    if (score >= 0.9) return 'excellent';
    if (score >= 0.75) return 'good';
    if (score >= 0.6) return 'fair';
    if (score >= 0.3) return 'poor';
    return 'unavailable';
  }

  /**
   * 确定透明度级别
   */
  private determineTransparencyLevel(userType: UserType, status: ServiceStatus): TransparencyLevel {
    if (!this.config.autoAdjustLevel) {
      // 固定透明度级别
      switch (userType) {
        case 'basic': return 'minimal';
        case 'advanced': return 'moderate';
        case 'developer': return 'technical';
      }
    }

    // 动态调整透明度
    if (status === 'excellent' || status === 'good') {
      return userType === 'developer' ? 'moderate' : 'minimal';
    } else if (status === 'fair') {
      return userType === 'basic' ? 'minimal' : 'moderate';
    } else {
      return userType === 'basic' ? 'moderate' : 'detailed';
    }
  }

  /**
   * 生成状态展示
   */
  private generateStatusDisplay(
    status: ServiceStatus,
    level: TransparencyLevel,
    serviceStatus: any,
    dashboardMetrics: DashboardMetrics,
    queueMetrics: QueueMetrics
  ): UserStatusDisplay {
    const display: UserStatusDisplay = {
      level,
      status,
      message: this.generateStatusMessage(status, level),
      icon: this.getStatusIcon(status),
      color: this.getStatusColor(status),
      timestamp: new Date()
    };

    // 添加进度指示器
    if (this.config.enableProgressIndicators && queueMetrics.currentQueueLength > 0) {
      display.showProgress = true;
      display.progressValue = Math.min(100, (queueMetrics.currentQueueLength / 50) * 100);
    }

    // 添加操作建议
    if (status === 'poor' || status === 'unavailable') {
      display.actionable = true;
      display.actionText = '重试请求';
      display.actionCallback = () => this.handleRetryAction();
    }

    // 添加详细信息
    if (level !== 'minimal') {
      display.details = this.generateStatusDetails(level, serviceStatus, dashboardMetrics, queueMetrics);
    }

    return display;
  }

  /**
   * 生成状态消息
   */
  private generateStatusMessage(status: ServiceStatus, level: TransparencyLevel): string {
    const messages = {
      excellent: {
        minimal: '服务运行正常',
        moderate: '所有服务运行良好，响应迅速',
        detailed: '双链路服务均正常运行，质量评分优秀',
        technical: '高德和腾讯地图服务均健康，质量评分>90%'
      },
      good: {
        minimal: '服务正常',
        moderate: '服务运行稳定，偶有轻微延迟',
        detailed: '主要服务正常，备用服务待命',
        technical: '主服务健康，平均响应时间<10秒'
      },
      fair: {
        minimal: '服务稍慢，请耐心等待',
        moderate: '服务响应较慢，我们正在优化',
        detailed: '检测到性能下降，已启用智能优化',
        technical: '服务质量评分60-75%，已触发性能优化'
      },
      poor: {
        minimal: '服务繁忙，建议稍后重试',
        moderate: '当前服务负载较高，可能需要等待',
        detailed: '服务质量下降，已自动切换到备用服务',
        technical: '主服务降级，已切换至备用链路'
      },
      unavailable: {
        minimal: '服务暂时不可用，请稍后重试',
        moderate: '服务正在恢复中，预计几分钟后恢复',
        detailed: '双链路服务均遇到问题，正在执行故障恢复',
        technical: '所有服务链路故障，执行紧急恢复程序'
      }
    };

    return messages[status][level];
  }

  /**
   * 生成状态详细信息
   */
  private generateStatusDetails(
    level: TransparencyLevel,
    serviceStatus: any,
    dashboardMetrics: DashboardMetrics,
    queueMetrics: QueueMetrics
  ): StatusDetail[] {
    const details: StatusDetail[] = [];

    if (level === 'moderate' || level === 'detailed' || level === 'technical') {
      // 响应时间
      const avgResponseTime = (dashboardMetrics.services.amap.responseTime + dashboardMetrics.services.tencent.responseTime) / 2;
      details.push({
        label: '平均响应时间',
        value: `${(avgResponseTime / 1000).toFixed(1)}秒`,
        type: avgResponseTime < 10000 ? 'success' : avgResponseTime < 15000 ? 'warning' : 'error'
      });

      // 队列状态
      if (queueMetrics.currentQueueLength > 0) {
        details.push({
          label: '等待处理',
          value: `${queueMetrics.currentQueueLength}个请求`,
          type: queueMetrics.currentQueueLength < 10 ? 'info' : queueMetrics.currentQueueLength < 50 ? 'warning' : 'error'
        });
      }
    }

    if (level === 'detailed' || level === 'technical') {
      // 服务质量
      details.push({
        label: '服务质量',
        value: `${((serviceStatus.qualityMetrics.amap + serviceStatus.qualityMetrics.tencent) / 2 * 100).toFixed(1)}%`,
        type: serviceStatus.qualityMetrics.amap > 0.8 ? 'success' : 'warning'
      });

      // 当前服务
      details.push({
        label: '当前主服务',
        value: serviceStatus.currentPrimary === 'amap' ? '高德地图' : '腾讯地图',
        type: 'info'
      });
    }

    if (level === 'technical') {
      // 技术细节
      details.push({
        label: '高德地图状态',
        value: this.translateHealthStatus(dashboardMetrics.services.amap.status),
        type: dashboardMetrics.services.amap.status === 'healthy' ? 'success' : 'warning',
        technical: true
      });

      details.push({
        label: '腾讯地图状态',
        value: this.translateHealthStatus(dashboardMetrics.services.tencent.status),
        type: dashboardMetrics.services.tencent.status === 'healthy' ? 'success' : 'warning',
        technical: true
      });

      details.push({
        label: '吞吐量',
        value: `${queueMetrics.throughput.toFixed(1)} 请求/秒`,
        type: 'info',
        technical: true
      });
    }

    return details;
  }

  // ============= 通知管理 =============

  /**
   * 检查并生成通知
   */
  async checkAndGenerateNotifications(): Promise<NotificationEvent[]> {
    const currentStatus = await this.getUserStatusDisplay();
    const newNotifications: NotificationEvent[] = [];

    // 检查状态变化
    if (currentStatus.status !== this.lastStatus) {
      const notification = this.createStatusChangeNotification(this.lastStatus, currentStatus.status);
      if (notification) {
        newNotifications.push(notification);
      }
      this.lastStatus = currentStatus.status;
    }

    // 检查服务切换
    const switchHistory = this.geoService.getSwitchHistory(1);
    if (switchHistory.length > 0) {
      const lastSwitch = switchHistory[0];
      const timeSinceSwitch = Date.now() - lastSwitch.timestamp.getTime();
      
      if (timeSinceSwitch < this.config.updateInterval) {
        newNotifications.push(this.createServiceSwitchNotification(lastSwitch));
      }
    }

    // 添加新通知
    newNotifications.forEach(notification => {
      this.notifications.push(notification);
    });

    return newNotifications;
  }

  /**
   * 创建状态变化通知
   */
  private createStatusChangeNotification(oldStatus: ServiceStatus, newStatus: ServiceStatus): NotificationEvent | null {
    if (oldStatus === newStatus) return null;

    const isImprovement = this.isStatusImprovement(oldStatus, newStatus);
    const isDegradation = this.isStatusDegradation(oldStatus, newStatus);

    if (!isImprovement && !isDegradation) return null;

    return {
      id: this.generateNotificationId(),
      type: isImprovement ? 'improvement' : 'quality_change',
      severity: isImprovement ? 'info' : isDegradation ? 'warning' : 'info',
      title: isImprovement ? '服务质量提升' : '服务状态变化',
      message: this.generateStatusChangeMessage(oldStatus, newStatus),
      timestamp: new Date(),
      dismissed: false,
      autoHide: isImprovement,
      hideAfter: isImprovement ? 5000 : undefined
    };
  }

  /**
   * 创建服务切换通知
   */
  private createServiceSwitchNotification(switchEvent: any): NotificationEvent {
    const serviceName = switchEvent.to === 'amap' ? '高德地图' : '腾讯地图';
    
    return {
      id: this.generateNotificationId(),
      type: 'service_switch',
      severity: 'info',
      title: '服务自动切换',
      message: `为了提供更好的服务质量，已自动切换到${serviceName}`,
      timestamp: new Date(),
      dismissed: false,
      autoHide: true,
      hideAfter: 8000
    };
  }

  // ============= 辅助方法 =============

  private getStatusIcon(status: ServiceStatus): string {
    const icons = {
      excellent: '🟢',
      good: '🟡',
      fair: '🟠',
      poor: '🔴',
      unavailable: '⚫'
    };
    return icons[status];
  }

  private getStatusColor(status: ServiceStatus): 'green' | 'yellow' | 'orange' | 'red' | 'gray' {
    const colors = {
      excellent: 'green',
      good: 'yellow',
      fair: 'orange',
      poor: 'red',
      unavailable: 'gray'
    } as const;
    return colors[status];
  }

  private translateHealthStatus(status: string): string {
    const translations = {
      healthy: '健康',
      degraded: '降级',
      unhealthy: '不健康'
    };
    return translations[status as keyof typeof translations] || status;
  }

  private isStatusImprovement(oldStatus: ServiceStatus, newStatus: ServiceStatus): boolean {
    const statusOrder = ['unavailable', 'poor', 'fair', 'good', 'excellent'];
    return statusOrder.indexOf(newStatus) > statusOrder.indexOf(oldStatus);
  }

  private isStatusDegradation(oldStatus: ServiceStatus, newStatus: ServiceStatus): boolean {
    const statusOrder = ['unavailable', 'poor', 'fair', 'good', 'excellent'];
    return statusOrder.indexOf(newStatus) < statusOrder.indexOf(oldStatus);
  }

  private generateStatusChangeMessage(oldStatus: ServiceStatus, newStatus: ServiceStatus): string {
    if (this.isStatusImprovement(oldStatus, newStatus)) {
      return `服务质量已从"${this.translateStatus(oldStatus)}"提升到"${this.translateStatus(newStatus)}"`;
    } else {
      return `服务状态已变更为"${this.translateStatus(newStatus)}"，我们正在优化`;
    }
  }

  private translateStatus(status: ServiceStatus): string {
    const translations = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      poor: '较差',
      unavailable: '不可用'
    };
    return translations[status];
  }

  private handleRetryAction(): void {
    // 实现重试逻辑
    console.log('用户触发重试操作');
  }

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============= 公共接口方法 =============

  /**
   * 获取未读通知
   */
  getUnreadNotifications(): NotificationEvent[] {
    return this.notifications.filter(n => !n.dismissed);
  }

  /**
   * 标记通知为已读
   */
  dismissNotification(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.dismissed = true;
      return true;
    }
    return false;
  }

  /**
   * 清理过期通知
   */
  cleanupNotifications(maxAge: number = 3600000): void {
    const cutoffTime = Date.now() - maxAge;
    this.notifications = this.notifications.filter(
      n => n.timestamp.getTime() > cutoffTime || !n.dismissed
    );
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<TransparencyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取透明度统计
   */
  getTransparencyStats(): {
    totalNotifications: number;
    unreadNotifications: number;
    statusHistory: Array<{ status: ServiceStatus; timestamp: Date }>;
    currentTransparencyLevel: TransparencyLevel;
  } {
    return {
      totalNotifications: this.notifications.length,
      unreadNotifications: this.getUnreadNotifications().length,
      statusHistory: this.statusHistory.slice(-10),
      currentTransparencyLevel: 'moderate' // 默认值，实际应该基于当前用户类型
    };
  }
}

export default IntelligentTransparencyManager;
