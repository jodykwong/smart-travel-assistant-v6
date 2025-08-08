
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 智能支付确认系统
 * 解决个人收款码无回调的技术问题
 */

import { EventEmitter } from 'events';

export interface PaymentConfirmationConfig {
  // 支付确认策略
  confirmationStrategy: 'manual' | 'semi-auto' | 'smart';
  
  // 自动确认阈值
  autoConfirmThreshold: number; // 金额阈值（分）
  
  // 支付超时设置
  paymentTimeout: number; // 分钟
  
  // 通知设置
  notificationChannels: ('sms' | 'email' | 'wechat')[];
  
  // 风控设置
  riskControlEnabled: boolean;
  maxDailyAmount: number;
}

export interface SmartPaymentOrder {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: 'wechat' | 'alipay';
  status: 'created' | 'pending' | 'confirming' | 'paid' | 'expired' | 'cancelled';
  
  // 支付确认相关
  confirmationMethod?: 'auto' | 'manual' | 'smart';
  confirmationScore?: number; // 0-100 确认可信度
  
  // 时间戳
  createdAt: Date;
  expireAt: Date;
  paidAt?: Date;
  confirmedAt?: Date;
  
  // 支付凭证
  paymentProof?: {
    screenshot?: string;
    transactionId?: string;
    paidAmount: number;
    paidTime: Date;
    verificationStatus: 'pending' | 'verified' | 'rejected';
  };
  
  // 智能确认数据
  smartConfirmation?: {
    userBehaviorScore: number; // 用户行为可信度
    paymentPatternScore: number; // 支付模式匹配度
    timeConsistencyScore: number; // 时间一致性
    amountConsistencyScore: number; // 金额一致性
    overallScore: number; // 综合评分
  };
}

/**
 * 智能支付确认服务
 * 通过多维度数据分析提高支付确认的准确性和效率
 */
// export class SmartPaymentConfirmationService // 临时禁用支付功能 extends EventEmitter {
  private config: PaymentConfirmationConfig;
  private orders = new Map<string, SmartPaymentOrder>();
  private userPaymentHistory = new Map<string, PaymentHistoryRecord[]>();

  constructor(config: PaymentConfirmationConfig) {
    super();
    this.config = config;
    this.startPaymentMonitoring();
  }

  /**
   * 创建智能支付订单
   */
  async createSmartPaymentOrder(orderData: {
    orderId: string;
    userId: string;
    amount: number;
    paymentMethod: 'wechat' | 'alipay';
    description: string;
  }): Promise<SmartPaymentOrder> {
    
    const order: SmartPaymentOrder = {
      ...orderData,
      status: 'created',
      createdAt: new Date(),
      expireAt: new Date(Date.now() + this.config.paymentTimeout * 60 * 1000),
      confirmationMethod: this.determineConfirmationMethod(orderData.amount, orderData.userId)
    };

    this.orders.set(orderData.orderId, order);
    
    // 启动智能监控
    this.startSmartMonitoring(order);
    
    return order;
  }

  /**
   * 智能支付确认
   * 结合多种数据源进行支付确认
   */
  async smartPaymentConfirmation(orderId: string, confirmationData: {
    userAction?: 'claimed_paid' | 'uploaded_proof';
    screenshot?: string;
    userReportedAmount?: number;
    userReportedTime?: Date;
    behaviorData?: {
      timeOnPaymentPage: number;
      clickPattern: string[];
      deviceInfo: any;
    };
  }): Promise<{
    confirmed: boolean;
    confidence: number;
    reason: string;
    nextAction?: 'auto_confirm' | 'manual_review' | 'request_more_info';
  }> {
    
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }

    // 计算智能确认评分
    const smartScore = await this.calculateSmartConfirmationScore(order, confirmationData);
    
    order.smartConfirmation = smartScore;
    order.status = 'confirming';

    // 根据评分决定确认策略
    if (smartScore.overallScore >= 85) {
      // 高可信度，自动确认
      return this.autoConfirmPayment(order, '智能分析高可信度');
    } else if (smartScore.overallScore >= 70) {
      // 中等可信度，发送通知给用户确认
      return this.requestUserConfirmation(order);
    } else {
      // 低可信度，人工审核
      return this.requestManualReview(order);
    }
  }

  /**
   * 计算智能确认评分
   */
  private async calculateSmartConfirmationScore(
    order: SmartPaymentOrder, 
    confirmationData: any
  ): Promise<SmartPaymentOrder['smartConfirmation']> {
    
    // 1. 用户行为评分 (0-100)
    const userBehaviorScore = this.calculateUserBehaviorScore(order.userId, confirmationData.behaviorData);
    
    // 2. 支付模式评分 (0-100)
    const paymentPatternScore = this.calculatePaymentPatternScore(order.userId, order.amount);
    
    // 3. 时间一致性评分 (0-100)
    const timeConsistencyScore = this.calculateTimeConsistencyScore(
      order.createdAt, 
      confirmationData.userReportedTime
    );
    
    // 4. 金额一致性评分 (0-100)
    const amountConsistencyScore = this.calculateAmountConsistencyScore(
      order.amount, 
      confirmationData.userReportedAmount
    );

    // 综合评分（加权平均）
    const overallScore = (
      userBehaviorScore * 0.3 +
      paymentPatternScore * 0.25 +
      timeConsistencyScore * 0.25 +
      amountConsistencyScore * 0.2
    );

    return {
      userBehaviorScore,
      paymentPatternScore,
      timeConsistencyScore,
      amountConsistencyScore,
      overallScore: Math.round(overallScore)
    };
  }

  /**
   * 用户行为评分
   * 基于用户在支付页面的行为模式
   */
  private calculateUserBehaviorScore(userId: string, behaviorData?: any): number {
    if (!behaviorData) return 50; // 默认中等分数

    let score = 60; // 基础分数

    // 支付页面停留时间评分
    if (behaviorData.timeOnPaymentPage) {
      if (behaviorData.timeOnPaymentPage >= 30 && behaviorData.timeOnPaymentPage <= 300) {
        score += 20; // 合理的支付时间
      } else if (behaviorData.timeOnPaymentPage < 10) {
        score -= 15; // 时间过短，可疑
      }
    }

    // 点击模式评分
    if (behaviorData.clickPattern && behaviorData.clickPattern.length > 0) {
      const normalPattern = ['payment-method', 'create-payment', 'qr-code'];
      const matchScore = this.calculatePatternMatch(behaviorData.clickPattern, normalPattern);
      score += matchScore * 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 支付模式评分
   * 基于用户历史支付行为
   */
  private calculatePaymentPatternScore(userId: string, amount: number): number {
    const history = this.userPaymentHistory.get(userId) || [];
    
    if (history.length === 0) return 60; // 新用户默认分数

    let score = 70; // 基础分数

    // 支付金额模式分析
    const avgAmount = history.reduce((sum, record) => sum + record.amount, 0) / history.length;
    const amountDeviation = Math.abs(amount - avgAmount) / avgAmount;
    
    if (amountDeviation < 0.5) {
      score += 15; // 金额符合历史模式
    } else if (amountDeviation > 2) {
      score -= 10; // 金额异常
    }

    // 支付频率分析
    const recentPayments = history.filter(record => 
      Date.now() - record.paidAt.getTime() < 30 * 24 * 60 * 60 * 1000 // 30天内
    );
    
    if (recentPayments.length > 0 && recentPayments.length < 10) {
      score += 10; // 正常支付频率
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 时间一致性评分
   */
  private calculateTimeConsistencyScore(orderTime: Date, reportedTime?: Date): number {
    if (!reportedTime) return 50;

    const timeDiff = Math.abs(reportedTime.getTime() - orderTime.getTime());
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff <= 5) return 100; // 5分钟内，完全一致
    if (minutesDiff <= 15) return 80;  // 15分钟内，较好
    if (minutesDiff <= 30) return 60;  // 30分钟内，一般
    if (minutesDiff <= 60) return 40;  // 1小时内，较差
    return 20; // 超过1小时，很差
  }

  /**
   * 金额一致性评分
   */
  private calculateAmountConsistencyScore(orderAmount: number, reportedAmount?: number): number {
    if (!reportedAmount) return 50;

    const amountDiff = Math.abs(orderAmount - reportedAmount);
    const diffPercentage = amountDiff / orderAmount;

    if (diffPercentage === 0) return 100; // 完全一致
    if (diffPercentage <= 0.01) return 90; // 1%以内差异
    if (diffPercentage <= 0.05) return 70; // 5%以内差异
    if (diffPercentage <= 0.1) return 50;  // 10%以内差异
    return 20; // 差异过大
  }

  /**
   * 自动确认支付
   */
  private async autoConfirmPayment(order: SmartPaymentOrder, reason: string): Promise<any> {
    order.status = 'paid';
    order.paidAt = new Date();
    order.confirmedAt = new Date();
    
    this.orders.set(order.orderId, order);
    
    // 触发支付成功事件
    this.emit('payment_confirmed', {
      orderId: order.orderId,
      method: 'auto',
      confidence: order.smartConfirmation?.overallScore || 0
    });

    return {
      confirmed: true,
      confidence: order.smartConfirmation?.overallScore || 0,
      reason: `自动确认: ${reason}`,
      nextAction: 'auto_confirm'
    };
  }

  /**
   * 请求用户确认
   */
  private async requestUserConfirmation(order: SmartPaymentOrder): Promise<any> {
    // 发送确认通知给用户
    await this.sendConfirmationNotification(order);
    
    return {
      confirmed: false,
      confidence: order.smartConfirmation?.overallScore || 0,
      reason: '需要用户确认支付',
      nextAction: 'request_more_info'
    };
  }

  /**
   * 请求人工审核
   */
  private async requestManualReview(order: SmartPaymentOrder): Promise<any> {
    // 添加到人工审核队列
    await this.addToManualReviewQueue(order);
    
    return {
      confirmed: false,
      confidence: order.smartConfirmation?.overallScore || 0,
      reason: '需要人工审核',
      nextAction: 'manual_review'
    };
  }

  /**
   * 启动智能监控
   */
  private startSmartMonitoring(order: SmartPaymentOrder): void {
    // 设置订单过期检查
    setTimeout(() => {
      if (order.status === 'created' || order.status === 'pending') {
        order.status = 'expired';
        this.orders.set(order.orderId, order);
        this.emit('payment_expired', { orderId: order.orderId });
      }
    }, this.config.paymentTimeout * 60 * 1000);
  }

  /**
   * 启动支付监控
   */
  private startPaymentMonitoring(): void {
    // 定期检查订单状态
    setInterval(() => {
      this.checkOrderStatuses();
    }, 30000); // 每30秒检查一次
  }

  private determineConfirmationMethod(amount: number, userId: string): 'auto' | 'manual' | 'smart' {
    if (amount <= this.config.autoConfirmThreshold) {
      return 'auto';
    }
    return this.config.confirmationStrategy as any;
  }

  private calculatePatternMatch(userPattern: string[], normalPattern: string[]): number {
    // 简化的模式匹配算法
    const matches = userPattern.filter(action => normalPattern.includes(action));
    return matches.length / normalPattern.length;
  }

  private async sendConfirmationNotification(order: SmartPaymentOrder): Promise<void> {
    // 实现通知发送逻辑
    console.log(`发送支付确认通知: ${order.orderId}`);
  }

  private async addToManualReviewQueue(order: SmartPaymentOrder): Promise<void> {
    // 实现人工审核队列逻辑
    console.log(`添加到人工审核队列: ${order.orderId}`);
  }

  private checkOrderStatuses(): void {
    // 实现订单状态检查逻辑
    for (const [orderId, order] of this.orders) {
      if (order.status === 'created' && new Date() > order.expireAt) {
        order.status = 'expired';
        this.emit('payment_expired', { orderId });
      }
    }
  }
}

interface PaymentHistoryRecord {
  orderId: string;
  amount: number;
  paidAt: Date;
  paymentMethod: string;
}

// 导出配置和服务
// export const defaultSmartPaymentConfig // 临时禁用支付功能: PaymentConfirmationConfig = {
  confirmationStrategy: 'smart',
  autoConfirmThreshold: 10000, // 100元以下自动确认
  paymentTimeout: 30, // 30分钟超时
  notificationChannels: ['sms', 'wechat'],
  riskControlEnabled: true,
  maxDailyAmount: 500000 // 每日最大5000元
};
