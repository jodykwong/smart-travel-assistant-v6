
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 支付流程节点实现
 * 遵循原则: [数据流隔离] + [结构化传递] + [节点职责分离]
 * 
 * 数据流: 用户输入 → 订单创建节点 → 支付处理节点 → 隔离式验证节点
 */

import { IEncryptionService, IAuditLogger } from '../../security/interfaces/security.interfaces';
import { 
  StructuredOrderData, 
  StructuredPaymentData, 
  StructuredPaymentVerificationInput,
  PaymentVerificationResult,
  IsolatedPaymentVerificationService 
} from './isolated-payment-verification.service';

// ============= 输入输出接口定义 =============

export interface UserPaymentInput {
  amount: number;
  description: string;
  userId: string;
  paymentMethod?: string;
  returnUrl?: string;
  [key: string]: any; // 其他用户输入字段
}

export interface PaymentOrderRequest {
  orderId: string;
  amount: number;
  description: string;
  userId: string;
  paymentMethod: string;
  returnUrl?: string;
  callbackUrl: string;
}

export interface PaymentOrderResponse {
  success: boolean;
  orderId: string;
  paymentUrl?: string;
  qrCode?: string;
  jsApiParams?: any;
  expiresAt: Date;
  errorMessage?: string;
}

export interface PaymentFlowResult {
  orderData: StructuredOrderData;
  paymentData: StructuredPaymentData;
  verificationResult: PaymentVerificationResult;
}

// ============= 订单创建节点 =============

/**
 * 订单创建节点（处理用户输入）
 * 职责: 唯一接触用户输入的节点，负责输入清理和验证
 */
export class OrderCreationNode {
  constructor(
    private encryptionService: IEncryptionService,
    private auditLogger: IAuditLogger
  ) {}

  /**
   * 处理用户输入，生成结构化订单数据
   * 输入: 用户输入（不可信）
   * 输出: 结构化订单数据（可信）
   */
  async processUserInput(userInput: UserPaymentInput): Promise<StructuredOrderData> {
    try {
      // 记录用户输入处理开始
      await this.auditLogger.logUserEvent({
        eventType: 'ORDER_INPUT_PROCESSING_STARTED',
        eventCategory: 'USER',
        severity: 'INFO',
        userId: userInput.userId,
        action: 'PROCESS_PAYMENT_INPUT',
        details: {
          inputKeys: Object.keys(userInput),
          amount: userInput.amount
        },
        result: 'SUCCESS'
      });

      // 第一步: 严格的输入清理和验证
      const sanitizedInput = await this.sanitizeUserInput(userInput);
      
      // 第二步: 生成结构化订单数据
      const orderData: StructuredOrderData = {
        orderId: this.generateOrderId(),
        amount: sanitizedInput.amount,
        userId: sanitizedInput.userId,
        description: sanitizedInput.description,
        createdAt: new Date(),
        dataIntegrity: '', // 稍后计算
      };
      
      // 第三步: 计算数据完整性校验
      orderData.dataIntegrity = await this.calculateDataHash(orderData);
      
      // 第四步: 记录订单创建
      await this.auditLogger.logUserEvent({
        eventType: 'ORDER_CREATED',
        eventCategory: 'USER',
        severity: 'INFO',
        userId: orderData.userId,
        resourceType: 'ORDER',
        resourceId: orderData.orderId,
        action: 'CREATE',
        details: {
          amount: orderData.amount,
          description: orderData.description,
          dataIntegrity: orderData.dataIntegrity
        },
        result: 'SUCCESS'
      });
      
      console.log(`✅ 订单创建完成: ${orderData.orderId}`);
      return orderData;
      
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        eventType: 'ORDER_INPUT_PROCESSING_FAILED',
        eventCategory: 'SECURITY',
        severity: 'HIGH',
        userId: userInput.userId,
        details: {
          error: error.message,
          inputData: this.sanitizeForLog(userInput)
        },
        threatLevel: 'MEDIUM'
      });
      
      throw error;
    }
  }

  /**
   * 严格的输入清理和验证
   */
  private async sanitizeUserInput(input: UserPaymentInput): Promise<{
    amount: number;
    userId: string;
    description: string;
  }> {
    // 验证用户ID
    const userId = this.validateUserId(input.userId);
    
    // 验证和清理金额
    const amount = this.validateAndParseAmount(input.amount);
    
    // 验证和清理描述
    const description = this.sanitizeDescription(input.description);
    
    return { userId, amount, description };
  }

  private validateUserId(userId: any): string {
    if (!userId || typeof userId !== 'string') {
      throw new Error('无效的用户ID');
    }
    
    // 清理用户ID，只允许字母数字和连字符
    const cleanUserId = userId.replace(/[^a-zA-Z0-9\-]/g, '');
    
    if (cleanUserId.length < 3 || cleanUserId.length > 36) {
      throw new Error('用户ID长度无效');
    }
    
    return cleanUserId;
  }

  private validateAndParseAmount(amount: any): number {
    if (typeof amount === 'string') {
      amount = parseFloat(amount);
    }
    
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('无效的支付金额');
    }
    
    // 限制金额范围：1分到100万元
    if (amount < 1 || amount > 100000000) {
      throw new Error('支付金额超出允许范围');
    }
    
    return amount;
  }

  private sanitizeDescription(description: any): string {
    if (!description || typeof description !== 'string') {
      return '智游助手服务';
    }
    
    // 清理描述，移除HTML标签和特殊字符
    return description
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/[<>\"'&]/g, '') // 移除危险字符
      .trim()
      .substring(0, 200); // 限制长度
  }

  private generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `ST${timestamp}${random}`.toUpperCase();
  }

  private async calculateDataHash(data: Omit<StructuredOrderData, 'dataIntegrity'>): Promise<string> {
    const hashInput = `${data.orderId}:${data.amount}:${data.userId}:${data.description}:${data.createdAt.getTime()}`;
    return await this.encryptionService.hash(hashInput, 'sha256');
  }

  private sanitizeForLog(input: any): any {
    // 移除敏感信息用于日志记录
    const sanitized = { ...input };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }
}

// ============= 支付处理节点 =============

/**
 * 支付处理节点（处理结构化数据）
 * 职责: 调用支付服务，生成支付数据
 */
export class PaymentProcessingNode {
  constructor(
    private encryptionService: IEncryptionService,
    private auditLogger: IAuditLogger
  ) {}

  /**
   * 处理支付请求
   * 输入: 结构化订单数据（来自订单创建节点）
   * 输出: 结构化支付数据（传递给验证节点）
   */
  async processPayment(
    orderData: StructuredOrderData,
    paymentMethod: string = 'wechat_jsapi'
  ): Promise<StructuredPaymentData> {
    
    try {
      // 第一步: 验证输入数据完整性
      await this.validateDataIntegrity(orderData);
      
      // 第二步: 记录支付处理开始
      await this.auditLogger.logPaymentEvent({
        eventType: 'PAYMENT_PROCESSING_STARTED',
        eventCategory: 'PAYMENT',
        severity: 'INFO',
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        details: {
          paymentMethod,
          sourceNode: 'order_creation'
        },
        result: 'SUCCESS'
      });
      
      // 第三步: 调用支付服务（这里简化实现）
      const paymentResult = await this.callPaymentService(orderData, paymentMethod);
      
      // 第四步: 生成结构化支付数据
      const paymentData: StructuredPaymentData = {
        orderId: orderData.orderId,
        expectedAmount: orderData.amount,
        userId: orderData.userId,
        providerId: this.getProviderFromMethod(paymentMethod),
        transactionId: paymentResult.transactionId,
        paymentUrl: paymentResult.paymentUrl,
        createdAt: new Date(),
        sourceNodeId: 'payment_processing',
        dataIntegrity: '', // 稍后计算
      };
      
      // 第五步: 计算数据完整性校验
      paymentData.dataIntegrity = await this.calculateDataHash(paymentData);
      
      // 第六步: 记录支付处理完成
      await this.auditLogger.logPaymentEvent({
        eventType: 'PAYMENT_PROCESSING_COMPLETED',
        eventCategory: 'PAYMENT',
        severity: 'INFO',
        orderId: paymentData.orderId,
        userId: paymentData.userId,
        amount: paymentData.expectedAmount,
        provider: paymentData.providerId,
        transactionId: paymentData.transactionId,
        details: {
          paymentUrl: paymentData.paymentUrl,
          dataIntegrity: paymentData.dataIntegrity
        },
        result: 'SUCCESS'
      });
      
      console.log(`✅ 支付处理完成: ${paymentData.orderId} -> ${paymentData.providerId}`);
      return paymentData;
      
    } catch (error) {
      await this.auditLogger.logPaymentEvent({
        eventType: 'PAYMENT_PROCESSING_FAILED',
        eventCategory: 'PAYMENT',
        severity: 'HIGH',
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        details: {
          error: error.message,
          paymentMethod
        },
        result: 'FAILURE'
      });
      
      throw error;
    }
  }

  private async validateDataIntegrity(orderData: StructuredOrderData): Promise<void> {
    const expectedHash = await this.calculateOrderDataHash(orderData);
    if (expectedHash !== orderData.dataIntegrity) {
      throw new Error('订单数据完整性验证失败');
    }
  }

  private async callPaymentService(
    orderData: StructuredOrderData,
    paymentMethod: string
  ): Promise<{ transactionId: string; paymentUrl: string }> {
    
    // 这里应该调用实际的支付服务
    // 为了演示，返回模拟数据
    const providerId = this.getProviderFromMethod(paymentMethod);
    const transactionId = `${providerId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const paymentUrl = `https://pay.${providerId}.com/pay?order=${orderData.orderId}&amount=${orderData.amount}`;
    
    return { transactionId, paymentUrl };
  }

  private getProviderFromMethod(paymentMethod: string): 'wechat' | 'alipay' {
    if (paymentMethod.startsWith('wechat')) {
      return 'wechat';
    } else if (paymentMethod.startsWith('alipay')) {
      return 'alipay';
    }
    return 'wechat'; // 默认微信
  }

  private async calculateOrderDataHash(orderData: StructuredOrderData): Promise<string> {
    const hashInput = `${orderData.orderId}:${orderData.amount}:${orderData.userId}:${orderData.description}:${orderData.createdAt.getTime()}`;
    return await this.encryptionService.hash(hashInput, 'sha256');
  }

  private async calculateDataHash(data: Omit<StructuredPaymentData, 'dataIntegrity'>): Promise<string> {
    const hashInput = `${data.orderId}:${data.expectedAmount}:${data.userId}:${data.providerId}:${data.sourceNodeId}:${data.createdAt.getTime()}`;
    return await this.encryptionService.hash(hashInput, 'sha256');
  }
}

// ============= 隔离式验证节点 =============

/**
 * 隔离式支付验证节点（完全隔离的验证）
 * 职责: 执行支付验证，完全不接触用户输入
 */
export class IsolatedPaymentVerificationNode {
  constructor(
    private verificationService: IsolatedPaymentVerificationService,
    private auditLogger: IAuditLogger
  ) {}

  /**
   * 执行隔离式支付验证
   * 输入: 结构化支付数据（来自支付处理节点）
   * 输出: 结构化验证结果
   * 特点: 完全不接触用户输入
   */
  async verifyPayment(paymentData: StructuredPaymentData): Promise<PaymentVerificationResult> {
    
    try {
      // 第一步: 构造验证输入（完全来源于前置节点）
      const verificationInput: StructuredPaymentVerificationInput = {
        orderId: paymentData.orderId,
        expectedAmount: paymentData.expectedAmount,
        userId: paymentData.userId,
        providerId: paymentData.providerId,
        transactionId: paymentData.transactionId,
        verificationTimestamp: Date.now(),
        sourceNodeId: paymentData.sourceNodeId,
        dataIntegrity: paymentData.dataIntegrity
      };
      
      // 第二步: 执行隔离式验证
      const verificationResult = await this.verificationService.verifyPaymentIsolated(verificationInput);
      
      // 第三步: 记录验证节点处理结果
      await this.auditLogger.logPaymentEvent({
        eventType: 'ISOLATED_VERIFICATION_NODE_COMPLETED',
        eventCategory: 'PAYMENT',
        severity: verificationResult.verified ? 'INFO' : 'HIGH',
        orderId: paymentData.orderId,
        userId: paymentData.userId,
        amount: verificationResult.actualAmount,
        provider: paymentData.providerId,
        transactionId: verificationResult.transactionId,
        verificationMethod: verificationResult.verificationMethod,
        details: {
          verified: verificationResult.verified,
          paymentStatus: verificationResult.paymentStatus,
          verificationTime: verificationResult.verificationTime,
          sourceNode: paymentData.sourceNodeId,
          errorCode: verificationResult.errorCode
        },
        result: verificationResult.verified ? 'SUCCESS' : 'FAILURE'
      });
      
      console.log(`🔍 隔离式验证完成: ${paymentData.orderId} -> ${verificationResult.verified ? '✅ 验证通过' : '❌ 验证失败'}`);
      return verificationResult;
      
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        eventType: 'ISOLATED_VERIFICATION_NODE_ERROR',
        eventCategory: 'SECURITY',
        severity: 'CRITICAL',
        userId: paymentData.userId,
        details: {
          orderId: paymentData.orderId,
          providerId: paymentData.providerId,
          error: error.message,
          sourceNode: paymentData.sourceNodeId
        },
        threatLevel: 'HIGH'
      });
      
      throw error;
    }
  }
}
