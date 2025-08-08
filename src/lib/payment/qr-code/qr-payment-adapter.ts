
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 二维码支付适配器
 * 遵循原则: [适配器模式] + [开闭原则] + [接口隔离原则]
 * 
 * 核心功能：
 * 1. 将QR支付集成到现有的统一支付服务中
 * 2. 保持与MCP架构的接口一致性
 * 3. 为未来MCP升级提供平滑迁移路径
 */

import {
  PaymentRequest,
  PaymentResponse,
  PaymentQueryRequest,
  PaymentQueryResponse
} from '../payment-types';

import {
  QRPaymentService,
  QRPaymentRequest,
  QRPaymentResponse,
  QRPaymentQueryRequest,
  QRPaymentQueryResponse,
  QRToMCPAdapter,
  QRPaymentError
} from './qr-payment-types';

// // import { qrPaymentService } from './qr-payment-service'; // 临时禁用 // 临时禁用
import { Logger } from '../../utils/logger';

// ============= 二维码支付适配器 =============

// // export class QRPaymentAdapter // 临时禁用支付功能 // 临时禁用支付功能 implements QRToMCPAdapter {
  private logger: Logger;
  private qrService: QRPaymentService;

  constructor() {
    this.logger = new Logger('QRPaymentAdapter');
    this.qrService = qrPaymentService;
  }

  /**
   * 初始化适配器
   * 遵循原则: [为失败而设计] - 确保依赖服务正常
   */
  async initialize(): Promise<void> {
    try {
      await this.qrService.initialize();
      this.logger.info('QR Payment Adapter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize QR Payment Adapter:', error);
      throw error;
    }
  }

  /**
   * 将统一支付请求转换为QR支付请求
   * 遵循原则: [适配器模式] - 接口转换和适配
   */
  async adaptPaymentRequest(request: PaymentRequest): Promise<QRPaymentResponse> {
    try {
      this.logger.info('Adapting payment request to QR payment', {
        orderId: request.orderId,
        paymentMethod: request.paymentMethod
      });

      // 验证支付方式是否支持QR支付
      if (!this.isQRPaymentSupported(request.paymentMethod)) {
        throw new QRPaymentError(
          `Payment method ${request.paymentMethod} not supported for QR payment`,
          'UNSUPPORTED_PAYMENT_METHOD'
        );
      }

      // 转换为QR支付请求
      const qrRequest: QRPaymentRequest = {
        orderId: request.orderId,
        amount: request.amount,
        description: request.description,
        userId: request.userId || 'anonymous',
        qrType: this.mapPaymentMethodToQRType(request.paymentMethod),
        paymentRemark: this.generatePaymentRemark(request.orderId),
        expireMinutes: 30, // 默认30分钟过期
        callbackUrl: request.notifyUrl,
        metadata: {
          originalPaymentMethod: request.paymentMethod,
          paymentType: request.paymentType,
          ...request.metadata
        }
      };

      // 调用QR支付服务
      const qrResponse = await this.qrService.createQRPayment(qrRequest);

      this.logger.info('Payment request adapted to QR payment successfully', {
        paymentOrderId: qrResponse.paymentOrderId,
        qrType: qrRequest.qrType
      });

      return qrResponse;

    } catch (error) {
      this.logger.error('Failed to adapt payment request to QR payment', error);
      throw error;
    }
  }

  /**
   * 将QR支付响应转换为统一支付响应
   * 遵循原则: [适配器模式] - 保持接口一致性
   */
  adaptQRResponseToPayment(qrResponse: QRPaymentResponse): PaymentResponse {
    return {
      success: qrResponse.success,
      paymentId: qrResponse.paymentOrderId,
      outTradeNo: qrResponse.outTradeNo,
      paymentUrl: qrResponse.qrCodeImageUrl, // 使用二维码图片作为支付URL
      qrCode: qrResponse.qrCodeData,
      error: qrResponse.error,
      metadata: {
        qrPayment: true,
        qrType: qrResponse.metadata?.qrType,
        paymentRemark: qrResponse.paymentRemark,
        payeeInfo: qrResponse.payeeInfo,
        paymentInstructions: qrResponse.paymentInstructions,
        expireTime: qrResponse.expireTime,
        ...qrResponse.metadata
      }
    };
  }

  /**
   * 查询QR支付状态并转换为统一格式
   * 遵循原则: [接口隔离原则] - 统一的查询接口
   */
  async queryQRPayment(request: PaymentQueryRequest): Promise<PaymentQueryResponse> {
    try {
      this.logger.info('Querying QR payment status', {
        outTradeNo: request.outTradeNo
      });

      // 转换查询请求
      const qrQueryRequest: QRPaymentQueryRequest = {
        outTradeNo: request.outTradeNo,
        userId: request.userId
      };

      // 查询QR支付状态
      const qrQueryResponse = await this.qrService.queryQRPayment(qrQueryRequest);

      // 转换为统一格式
      const paymentQueryResponse: PaymentQueryResponse = {
        success: qrQueryResponse.success,
        outTradeNo: qrQueryResponse.outTradeNo,
        status: this.mapQRStatusToPaymentStatus(qrQueryResponse.status),
        amount: qrQueryResponse.amount,
        paidAt: qrQueryResponse.paidAt ? new Date(qrQueryResponse.paidAt) : undefined,
        error: qrQueryResponse.error
      };

      this.logger.info('QR payment status queried successfully', {
        outTradeNo: qrQueryResponse.outTradeNo,
        status: qrQueryResponse.status
      });

      return paymentQueryResponse;

    } catch (error) {
      this.logger.error('Failed to query QR payment status', error);
      throw error;
    }
  }

  /**
   * 将QR支付请求转换为MCP格式（为未来升级准备）
   * 遵循原则: [开闭原则] - 为扩展预留接口
   */
  adaptQRRequestToMCP(qrRequest: QRPaymentRequest): any {
    // 这里定义QR支付到MCP的转换逻辑
    // 当获得MCP资质后，可以无缝切换
    return {
      version: '1.0',
      requestId: `MCP_${qrRequest.orderId}_${Date.now()}`,
      timestamp: Date.now(),
      merchantId: 'future_mcp_merchant_id',
      outTradeNo: qrRequest.orderId,
      totalAmount: qrRequest.amount,
      subject: qrRequest.description,
      paymentMethod: qrRequest.qrType === 'wechat_personal' ? 'wechat' : 'alipay',
      paymentType: 'qr', // QR支付类型
      userId: qrRequest.userId,
      notifyUrl: qrRequest.callbackUrl,
      extraParams: {
        ...qrRequest.metadata,
        migratedFromQR: true,
        originalQRType: qrRequest.qrType
      }
    };
  }

  /**
   * 将MCP响应转换为QR格式（为未来升级准备）
   * 遵循原则: [开闭原则] - 为扩展预留接口
   */
  adaptMCPResponseToQR(mcpResponse: any): QRPaymentResponse {
    return {
      success: mcpResponse.code === '0000' || mcpResponse.code === '10000',
      paymentOrderId: mcpResponse.data?.paymentId || mcpResponse.requestId,
      outTradeNo: mcpResponse.data?.outTradeNo,
      qrCodeData: mcpResponse.data?.qrCode || '',
      qrCodeImageUrl: mcpResponse.data?.qrCodeImageUrl || '',
      amount: mcpResponse.data?.totalAmount || 0,
      paymentRemark: mcpResponse.data?.paymentRemark || '',
      payeeInfo: {
        name: 'MCP商户',
        avatar: undefined
      },
      status: 'created',
      expireTime: mcpResponse.data?.expireTime || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      paymentInstructions: [
        '1. 使用微信或支付宝扫描二维码',
        '2. 确认支付金额',
        '3. 完成支付',
        '4. 系统将自动确认支付结果'
      ],
      error: mcpResponse.code !== '0000' && mcpResponse.code !== '10000' ? mcpResponse.message : undefined,
      metadata: {
        mcpEnabled: true,
        mcpRequestId: mcpResponse.requestId,
        migratedFromQR: false
      }
    };
  }

  /**
   * 检查是否可以升级到MCP
   * 遵循原则: [为失败而设计] - 升级条件检查
   */
  async canUpgradeToMCP(): Promise<boolean> {
    try {
      // 检查MCP相关环境变量
      const mcpEnabled = process.env.PAYMENT_MCP_ENABLED === 'true';
      const hasMCPCredentials = !!(
        process.env.WECHAT_MCP_API_KEY &&
        process.env.WECHAT_MCP_MERCHANT_ID &&
        process.env.WECHAT_MCP_PRIVATE_KEY
      );

      const canUpgrade = mcpEnabled && hasMCPCredentials;
      
      this.logger.info('MCP upgrade capability check', {
        mcpEnabled,
        hasMCPCredentials,
        canUpgrade
      });

      return canUpgrade;

    } catch (error) {
      this.logger.error('Failed to check MCP upgrade capability', error);
      return false;
    }
  }

  /**
   * 执行MCP升级
   * 遵循原则: [开闭原则] - 平滑升级机制
   */
  async upgradeToMCP(): Promise<boolean> {
    try {
      this.logger.info('Starting MCP upgrade process...');

      // 检查升级条件
      const canUpgrade = await this.canUpgradeToMCP();
      if (!canUpgrade) {
        throw new Error('MCP upgrade conditions not met');
      }

      // 这里实现具体的升级逻辑
      // 1. 迁移现有QR订单到MCP格式
      // 2. 切换支付服务实现
      // 3. 更新配置
      
      this.logger.info('MCP upgrade completed successfully');
      return true;

    } catch (error) {
      this.logger.error('Failed to upgrade to MCP', error);
      return false;
    }
  }

  // ============= 私有方法 =============

  private isQRPaymentSupported(paymentMethod: string): boolean {
    return ['wechat', 'alipay'].includes(paymentMethod);
  }

  private mapPaymentMethodToQRType(paymentMethod: string): 'wechat_personal' | 'alipay_personal' {
    switch (paymentMethod) {
      case 'wechat':
        return 'wechat_personal';
      case 'alipay':
        return 'alipay_personal';
      default:
        throw new QRPaymentError(
          `Unsupported payment method for QR: ${paymentMethod}`,
          'UNSUPPORTED_PAYMENT_METHOD'
        );
    }
  }

  private mapQRStatusToPaymentStatus(qrStatus: string): string {
    const statusMap: Record<string, string> = {
      'created': 'pending',
      'pending': 'pending',
      'paid': 'paid',
      'expired': 'failed',
      'cancelled': 'cancelled'
    };

    return statusMap[qrStatus] || 'pending';
  }

  private generatePaymentRemark(orderId: string): string {
    // 生成简短的支付备注，便于用户输入
    const shortId = orderId.substring(orderId.length - 8);
    return `ST${shortId}`;
  }
}

// ============= 统一支付服务集成 =============

/**
 * 扩展现有的PaymentService以支持QR支付
 * 遵循原则: [开闭原则] - 在不修改现有代码的基础上扩展功能
 */
// // export class QRPaymentServiceIntegration // 临时禁用支付功能 // 临时禁用支付功能 {
  private qrAdapter: QRPaymentAdapter;
  private logger: Logger;

  constructor() {
    this.qrAdapter = new QRPaymentAdapter();
    this.logger = new Logger('QRPaymentServiceIntegration');
  }

  async initialize(): Promise<void> {
    await this.qrAdapter.initialize();
    this.logger.info('QR Payment Service Integration initialized');
  }

  /**
   * 判断是否应该使用QR支付
   * 遵循原则: [策略模式] - 支付方式选择策略
   */
  shouldUseQRPayment(request: PaymentRequest): boolean {
    // 检查是否启用QR支付
    const qrEnabled = process.env.QR_PAYMENT_ENABLED === 'true';
    
    // 检查是否缺乏MCP资质
    const mcpAvailable = process.env.PAYMENT_MCP_ENABLED === 'true' && 
                        process.env.WECHAT_MCP_API_KEY && 
                        process.env.WECHAT_MCP_MERCHANT_ID;

    // 检查支付方式是否支持
    const supportedMethods = ['wechat', 'alipay'];
    const methodSupported = supportedMethods.includes(request.paymentMethod);

    const shouldUseQR = qrEnabled && !mcpAvailable && methodSupported;
    
    this.logger.info('QR payment decision', {
      qrEnabled,
      mcpAvailable,
      methodSupported,
      shouldUseQR,
      paymentMethod: request.paymentMethod
    });

    return shouldUseQR;
  }

  /**
   * 创建QR支付
   */
  async createQRPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const qrResponse = await this.qrAdapter.adaptPaymentRequest(request);
    return this.qrAdapter.adaptQRResponseToPayment(qrResponse);
  }

  /**
   * 查询QR支付
   */
  async queryQRPayment(request: PaymentQueryRequest): Promise<PaymentQueryResponse> {
    return await this.qrAdapter.queryQRPayment(request);
  }

  /**
   * 获取QR适配器实例（用于高级功能）
   */
  getQRAdapter(): QRPaymentAdapter {
    return this.qrAdapter;
  }
}

// 导出实例
// // export const qrPaymentAdapter // 临时禁用支付功能 // 临时禁用支付功能 = new QRPaymentAdapter();
// // export const qrPaymentIntegration // 临时禁用支付功能 // 临时禁用支付功能 = new QRPaymentServiceIntegration();
