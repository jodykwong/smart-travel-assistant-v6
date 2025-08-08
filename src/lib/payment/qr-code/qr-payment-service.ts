
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 二维码支付服务实现
 * 遵循原则: [高内聚低耦合] + [为失败而设计] + [SOLID原则]
 * 
 * 核心功能：
 * 1. 个人收款码支付订单管理
 * 2. 支付凭证验证流程
 * 3. 与现有JWT认证系统集成
 * 4. 为未来MCP升级预留接口
 */

import {
  QRPaymentService,
  QRPaymentRequest,
  QRPaymentResponse,
  QRPaymentQueryRequest,
  QRPaymentQueryResponse,
  PaymentVerificationRequest,
  PaymentVerificationResponse,
  QRPaymentOrder,
  QRPaymentConfig,
  QRPaymentError,
  QR_PAYMENT_CONSTANTS
} from './qr-payment-types';

import { Logger } from '../../utils/logger';
import { configManager } from '../../config/config-manager';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

// ============= 二维码支付服务实现 =============

// // export class QRPaymentServiceImpl // 临时禁用支付功能 // 临时禁用支付功能 implements QRPaymentService {
  private logger: Logger;
  private paymentOrders: Map<string, QRPaymentOrder> = new Map();
  private qrConfigs: Map<string, QRPaymentConfig> = new Map();
  private initialized = false;

  constructor() {
    this.logger = new Logger('QRPaymentService');
  }

  /**
   * 初始化二维码支付服务
   * 遵循原则: [为失败而设计] - 详细的初始化验证
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.info('Initializing QR Payment Service...');
      
      // 加载配置
      await this.loadQRConfigs();
      
      // 初始化订单清理定时器
      this.startOrderCleanupTimer();
      
      this.initialized = true;
      this.logger.info('QR Payment Service initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize QR Payment Service:', error);
      throw new QRPaymentError(
        'QR Payment Service initialization failed',
        'INIT_FAILED',
        undefined,
        error as Error
      );
    }
  }

  /**
   * 创建二维码支付订单
   * 遵循原则: [API优先设计] - 统一的支付接口
   */
  async createQRPayment(request: QRPaymentRequest): Promise<QRPaymentResponse> {
    await this.ensureInitialized();
    
    try {
      this.logger.info('Creating QR payment order', {
        orderId: request.orderId,
        amount: request.amount,
        qrType: request.qrType
      });

      // 验证请求参数
      await this.validatePaymentRequest(request);
      
      // 生成支付订单ID
      const paymentOrderId = this.generatePaymentOrderId();
      
      // 获取收款码配置
      const qrConfig = this.qrConfigs.get(request.qrType);
      if (!qrConfig || !qrConfig.enabled) {
        throw new QRPaymentError(
          `QR payment type ${request.qrType} is not available`,
          'QR_TYPE_UNAVAILABLE'
        );
      }

      // 生成支付备注（用于订单匹配）
      const paymentRemark = this.generatePaymentRemark(paymentOrderId);
      
      // 生成收款二维码
      const qrCodeData = await this.generatePaymentQRCode(
        request.amount,
        paymentRemark,
        request.qrType
      );
      
      // 生成二维码图片
      const qrCodeImageUrl = await this.generateQRCodeImage(qrCodeData);
      
      // 创建支付订单
      const paymentOrder: QRPaymentOrder = {
        paymentOrderId,
        outTradeNo: request.orderId,
        userId: request.userId,
        amount: request.amount,
        description: request.description,
        qrType: request.qrType,
        paymentRemark,
        qrCodeData,
        status: 'created',
        createdAt: new Date(),
        expireTime: new Date(Date.now() + request.expireMinutes * 60 * 1000),
        metadata: request.metadata
      };

      // 保存订单
      this.paymentOrders.set(paymentOrderId, paymentOrder);
      
      // 构建响应
      const response: QRPaymentResponse = {
        success: true,
        paymentOrderId,
        outTradeNo: request.orderId,
        qrCodeData,
        qrCodeImageUrl,
        amount: request.amount,
        paymentRemark,
        payeeInfo: {
          name: qrConfig.payeeInfo.name,
          avatar: qrConfig.payeeInfo.avatar
        },
        status: 'created',
        expireTime: paymentOrder.expireTime.toISOString(),
        paymentInstructions: this.generatePaymentInstructions(request.qrType, request.amount, paymentRemark),
        metadata: {
          qrType: request.qrType,
          paymentOrderId
        }
      };

      this.logger.info('QR payment order created successfully', {
        paymentOrderId,
        outTradeNo: request.orderId
      });

      return response;

    } catch (error) {
      this.logger.error('Failed to create QR payment order', error);
      
      if (error instanceof QRPaymentError) {
        throw error;
      }
      
      throw new QRPaymentError(
        'QR payment creation failed',
        'PAYMENT_CREATE_FAILED',
        undefined,
        error as Error
      );
    }
  }

  /**
   * 查询支付订单状态
   * 遵循原则: [为失败而设计] - 完善的查询错误处理
   */
  async queryQRPayment(request: QRPaymentQueryRequest): Promise<QRPaymentQueryResponse> {
    await this.ensureInitialized();
    
    try {
      this.logger.info('Querying QR payment status', {
        outTradeNo: request.outTradeNo,
        paymentOrderId: request.paymentOrderId
      });

      // 查找订单
      let paymentOrder: QRPaymentOrder | undefined;
      
      if (request.paymentOrderId) {
        paymentOrder = this.paymentOrders.get(request.paymentOrderId);
      } else if (request.outTradeNo) {
        // 通过商户订单号查找
        for (const order of this.paymentOrders.values()) {
          if (order.outTradeNo === request.outTradeNo) {
            paymentOrder = order;
            break;
          }
        }
      }

      if (!paymentOrder) {
        throw new QRPaymentError(
          'Payment order not found',
          'ORDER_NOT_FOUND'
        );
      }

      // 检查订单是否过期
      if (paymentOrder.status === 'created' && new Date() > paymentOrder.expireTime) {
        paymentOrder.status = 'expired';
        this.paymentOrders.set(paymentOrder.paymentOrderId, paymentOrder);
      }

      // 构建查询响应
      const response: QRPaymentQueryResponse = {
        success: true,
        outTradeNo: paymentOrder.outTradeNo,
        status: paymentOrder.status,
        amount: paymentOrder.amount,
        createdAt: paymentOrder.createdAt.toISOString(),
        expireTime: paymentOrder.expireTime.toISOString(),
        paidAt: paymentOrder.paidAt?.toISOString(),
        paymentProof: paymentOrder.paymentProof
      };

      this.logger.info('QR payment status queried successfully', {
        outTradeNo: paymentOrder.outTradeNo,
        status: paymentOrder.status
      });

      return response;

    } catch (error) {
      this.logger.error('Failed to query QR payment status', error);
      
      if (error instanceof QRPaymentError) {
        throw error;
      }
      
      throw new QRPaymentError(
        'QR payment query failed',
        'PAYMENT_QUERY_FAILED',
        undefined,
        error as Error
      );
    }
  }

  /**
   * 提交支付凭证
   * 遵循原则: [纵深防御] - 多重验证机制
   */
  async submitPaymentProof(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    await this.ensureInitialized();
    
    try {
      this.logger.info('Processing payment proof submission', {
        paymentOrderId: request.paymentOrderId,
        userId: request.userId
      });

      // 查找订单
      const paymentOrder = this.paymentOrders.get(request.paymentOrderId);
      if (!paymentOrder) {
        throw new QRPaymentError(
          'Payment order not found',
          'ORDER_NOT_FOUND'
        );
      }

      // 验证用户权限
      if (paymentOrder.userId !== request.userId) {
        throw new QRPaymentError(
          'Unauthorized access to payment order',
          'UNAUTHORIZED'
        );
      }

      // 验证订单状态
      if (paymentOrder.status !== 'created' && paymentOrder.status !== 'pending') {
        throw new QRPaymentError(
          `Cannot submit proof for order in status: ${paymentOrder.status}`,
          'INVALID_ORDER_STATUS'
        );
      }

      // 验证订单是否过期
      if (new Date() > paymentOrder.expireTime) {
        paymentOrder.status = 'expired';
        this.paymentOrders.set(request.paymentOrderId, paymentOrder);
        throw new QRPaymentError(
          'Payment order has expired',
          'ORDER_EXPIRED'
        );
      }

      // 保存支付凭证
      paymentOrder.paymentProof = {
        screenshotUrl: request.paymentProof.screenshot,
        paidTime: new Date(request.paymentProof.paidTime),
        paidAmount: request.paymentProof.paidAmount,
        verificationStatus: 'pending'
      };
      
      paymentOrder.status = 'pending';
      this.paymentOrders.set(request.paymentOrderId, paymentOrder);

      // 启动自动验证流程（简化版本，实际可能需要人工审核）
      const autoVerificationResult = await this.performAutoVerification(paymentOrder);
      
      if (autoVerificationResult.verified) {
        paymentOrder.status = 'paid';
        paymentOrder.paidAt = new Date();
        paymentOrder.paymentProof!.verificationStatus = 'verified';
        paymentOrder.paymentProof!.verifiedAt = new Date();
        this.paymentOrders.set(request.paymentOrderId, paymentOrder);
      }

      const response: PaymentVerificationResponse = {
        success: true,
        verificationStatus: paymentOrder.paymentProof.verificationStatus,
        message: autoVerificationResult.verified 
          ? '支付验证成功，订单已完成' 
          : '支付凭证已提交，正在验证中',
        orderInfo: autoVerificationResult.verified ? {
          orderId: paymentOrder.outTradeNo,
          amount: paymentOrder.amount,
          status: paymentOrder.status
        } : undefined
      };

      this.logger.info('Payment proof processed successfully', {
        paymentOrderId: request.paymentOrderId,
        verificationStatus: paymentOrder.paymentProof.verificationStatus
      });

      return response;

    } catch (error) {
      this.logger.error('Failed to process payment proof', error);
      
      if (error instanceof QRPaymentError) {
        throw error;
      }
      
      throw new QRPaymentError(
        'Payment proof processing failed',
        'PROOF_PROCESSING_FAILED',
        undefined,
        error as Error
      );
    }
  }

  /**
   * 取消支付订单
   */
  async cancelQRPayment(paymentOrderId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      const paymentOrder = this.paymentOrders.get(paymentOrderId);
      if (!paymentOrder) {
        throw new QRPaymentError('Payment order not found', 'ORDER_NOT_FOUND');
      }

      if (paymentOrder.userId !== userId) {
        throw new QRPaymentError('Unauthorized access', 'UNAUTHORIZED');
      }

      if (paymentOrder.status === 'paid') {
        throw new QRPaymentError('Cannot cancel paid order', 'CANNOT_CANCEL_PAID');
      }

      paymentOrder.status = 'cancelled';
      this.paymentOrders.set(paymentOrderId, paymentOrder);

      this.logger.info('Payment order cancelled', { paymentOrderId });
      return true;

    } catch (error) {
      this.logger.error('Failed to cancel payment order', error);
      throw error;
    }
  }

  /**
   * 获取用户支付订单列表
   */
  async getUserPaymentOrders(userId: string, status?: string): Promise<QRPaymentOrder[]> {
    await this.ensureInitialized();
    
    const userOrders = Array.from(this.paymentOrders.values())
      .filter(order => order.userId === userId)
      .filter(order => !status || order.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return userOrders;
  }

  // ============= 私有方法 =============

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      throw new QRPaymentError(
        'QR Payment Service not initialized',
        'NOT_INITIALIZED'
      );
    }
  }

  private async loadQRConfigs(): Promise<void> {
    // 加载微信个人收款码配置
    const wechatConfig: QRPaymentConfig = {
      type: 'wechat_personal',
      qrCodeData: process.env.WECHAT_PERSONAL_QR_CODE || '',
      payeeInfo: {
        name: process.env.WECHAT_PAYEE_NAME || '智游助手',
        account: process.env.WECHAT_PAYEE_ACCOUNT || '',
        avatar: process.env.WECHAT_PAYEE_AVATAR
      },
      enabled: process.env.WECHAT_PERSONAL_QR_ENABLED === 'true',
      maxAmount: parseInt(process.env.WECHAT_PERSONAL_MAX_AMOUNT || '50000'),
      dailyLimit: parseInt(process.env.WECHAT_PERSONAL_DAILY_LIMIT || '500000'),
      remarkTemplate: 'ST{orderId}'
    };

    // 加载支付宝个人收款码配置
    const alipayConfig: QRPaymentConfig = {
      type: 'alipay_personal',
      qrCodeData: process.env.ALIPAY_PERSONAL_QR_CODE || '',
      payeeInfo: {
        name: process.env.ALIPAY_PAYEE_NAME || '智游助手',
        account: process.env.ALIPAY_PAYEE_ACCOUNT || '',
        avatar: process.env.ALIPAY_PAYEE_AVATAR
      },
      enabled: process.env.ALIPAY_PERSONAL_QR_ENABLED === 'true',
      maxAmount: parseInt(process.env.ALIPAY_PERSONAL_MAX_AMOUNT || '50000'),
      dailyLimit: parseInt(process.env.ALIPAY_PERSONAL_DAILY_LIMIT || '500000'),
      remarkTemplate: 'ST{orderId}'
    };

    this.qrConfigs.set('wechat_personal', wechatConfig);
    this.qrConfigs.set('alipay_personal', alipayConfig);
  }

  private generatePaymentOrderId(): string {
    return `QR_${Date.now()}_${uuidv4().substring(0, 8)}`;
  }

  private generatePaymentRemark(paymentOrderId: string): string {
    // 生成简短的订单标识，便于用户输入
    const shortId = paymentOrderId.substring(paymentOrderId.length - 8);
    return `${QR_PAYMENT_CONSTANTS.PAYMENT_REMARK_PREFIX}${shortId}`;
  }

  private async generatePaymentQRCode(amount: number, remark: string, qrType: string): Promise<string> {
    const config = this.qrConfigs.get(qrType);
    if (!config) {
      throw new QRPaymentError(`QR config not found for type: ${qrType}`, 'CONFIG_NOT_FOUND');
    }

    // 这里返回配置中的收款码，实际项目中可能需要动态生成
    // 包含金额和备注信息的收款码
    return config.qrCodeData;
  }

  private async generateQRCodeImage(qrCodeData: string): Promise<string> {
    try {
      // 生成二维码图片的base64数据
      const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return qrCodeImage;
    } catch (error) {
      this.logger.error('Failed to generate QR code image', error);
      throw new QRPaymentError('QR code image generation failed', 'QR_IMAGE_FAILED');
    }
  }

  private generatePaymentInstructions(qrType: string, amount: number, remark: string): string[] {
    const amountYuan = (amount / 100).toFixed(2);
    const paymentMethod = qrType === 'wechat_personal' ? '微信' : '支付宝';
    
    return [
      `1. 使用${paymentMethod}扫描上方二维码`,
      `2. 确认支付金额为 ¥${amountYuan}`,
      `3. 在备注中输入：${remark}`,
      `4. 完成支付后，截图支付成功页面`,
      `5. 点击"上传支付凭证"按钮提交截图`,
      `6. 等待系统验证，通常1-3分钟内完成`
    ];
  }

  private async validatePaymentRequest(request: QRPaymentRequest): Promise<void> {
    if (request.amount < QR_PAYMENT_CONSTANTS.MIN_PAYMENT_AMOUNT) {
      throw new QRPaymentError(
        `Payment amount too small: ${request.amount}`,
        'AMOUNT_TOO_SMALL'
      );
    }

    if (request.amount > QR_PAYMENT_CONSTANTS.MAX_PAYMENT_AMOUNT) {
      throw new QRPaymentError(
        `Payment amount too large: ${request.amount}`,
        'AMOUNT_TOO_LARGE'
      );
    }

    const config = this.qrConfigs.get(request.qrType);
    if (!config || !config.enabled) {
      throw new QRPaymentError(
        `QR payment type not available: ${request.qrType}`,
        'QR_TYPE_UNAVAILABLE'
      );
    }
  }

  private async performAutoVerification(order: QRPaymentOrder): Promise<{ verified: boolean; reason?: string }> {
    // 简化的自动验证逻辑
    // 实际项目中可能需要更复杂的验证机制
    
    if (!order.paymentProof) {
      return { verified: false, reason: 'No payment proof' };
    }

    // 验证支付金额
    if (Math.abs(order.paymentProof.paidAmount - order.amount) > 1) {
      return { verified: false, reason: 'Amount mismatch' };
    }

    // 验证支付时间（不能太早或太晚）
    const now = new Date();
    const paidTime = order.paymentProof.paidTime;
    const timeDiff = Math.abs(now.getTime() - paidTime.getTime());
    
    if (timeDiff > 30 * 60 * 1000) { // 30分钟
      return { verified: false, reason: 'Payment time too old' };
    }

    // 简单验证通过
    return { verified: true };
  }

  private startOrderCleanupTimer(): void {
    // 每小时清理过期订单
    setInterval(() => {
      this.cleanupExpiredOrders();
    }, 60 * 60 * 1000);
  }

  private cleanupExpiredOrders(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [orderId, order] of this.paymentOrders.entries()) {
      if (order.status === 'created' && now > order.expireTime) {
        order.status = 'expired';
        this.paymentOrders.set(orderId, order);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} expired orders`);
    }
  }
}

// 导出单例实例
// // export const qrPaymentService // 临时禁用支付功能 // 临时禁用支付功能 = new QRPaymentServiceImpl();
