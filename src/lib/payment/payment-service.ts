/**
 * 智游助手v6.2 - 统一支付服务
 * 遵循原则: [高内聚低耦合] + [为失败而设计] + [API优先设计]
 * 
 * 解决问题:
 * 1. 支付网关配置缺失导致的不可用
 * 2. 微信支付和支付宝的统一接口
 * 3. 支付状态管理和错误处理
 * 4. 真实支付流程的端到端验证
 */

import { configManager, WechatConfig, AlipayConfig } from '../config/config-manager';
import { AlipayClient } from './alipay-client';
// TODO: 支付功能临时禁用 - 需要在第二阶段重新启用
// MCP客户端导入
// // import WeChatPayMCPClient from './mcp/wechat-pay-mcp-client'; // 临时禁用
// // import AlipayMCPClient from './mcp/alipay-mcp-client'; // 临时禁用
// import { WeChatMCPConfig, AlipayMCPConfig, MCPPaymentRequest, MCPPaymentQueryRequest } from './mcp/mcp-types';

// TODO: 支付功能临时禁用 - QR支付集成
// QR支付客户端导入
// // import { qrPaymentIntegration, QRPaymentServiceIntegration } from './qr-code/qr-payment-adapter'; // 临时禁用
import { EncryptionService } from '../security/encryption-service';
import { Logger } from '../utils/logger';

// ============= 统一支付接口定义 =============

export interface PaymentRequest {
  orderId: string;
  amount: number; // 金额（分）
  description: string;
  paymentMethod: 'wechat' | 'alipay';
  paymentType: 'h5' | 'qr' | 'jsapi' | 'app';
  userId: string;
  notifyUrl?: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  outTradeNo: string;
  paymentUrl?: string;
  qrCode?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaymentQueryRequest {
  outTradeNo: string;
  paymentMethod: 'wechat' | 'alipay';
}

export interface PaymentQueryResponse {
  success: boolean;
  outTradeNo: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  amount?: number;
  paidAt?: Date;
  error?: string;
}

export interface RefundRequest {
  outTradeNo: string;
  refundAmount: number;
  refundReason: string;
  paymentMethod: 'wechat' | 'alipay';
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  refundStatus: 'processing' | 'success' | 'failed';
  error?: string;
}

// ============= 支付服务错误类型 =============

// TODO: 支付功能临时禁用 - PaymentServiceError 类
/*
export class PaymentServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public paymentMethod?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PaymentServiceError';
  }
}
*/

// ============= 统一支付服务 =============

// export class PaymentService // 临时禁用支付功能 {
  // TODO: 支付功能临时禁用 - 所有支付客户端
  // 传统客户端
  // private wechatClient: WeChatPayMCPClient | null = null;
  private alipayClient: AlipayClient | null = null;

  // MCP客户端 - 临时禁用
  // private wechatMCPClient: WeChatPayMCPClient | null = null;
  // private alipayMCPClient: AlipayMCPClient | null = null;

  // QR支付集成 - 临时禁用
  // private qrPaymentIntegration: QRPaymentServiceIntegration | null = null;

  // 服务组件
  private encryptionService: EncryptionService;
  private logger: Logger;
  private initialized = false;

  // 支付配置
  private mcpEnabled = false;
  private qrPaymentEnabled = false;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.logger = new Logger('PaymentService');
  }

  /**
   * 初始化支付服务
   * 遵循原则: [为失败而设计] - 提供详细的初始化错误信息
   * 支持MCP协议和传统API的双重初始化
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.logger.info('Initializing payment service with MCP support...');

      // 加载配置
      const config = await configManager.loadConfig();

      // 检查支付方式配置
      this.mcpEnabled = process.env.PAYMENT_MCP_ENABLED === 'true';
      this.qrPaymentEnabled = process.env.QR_PAYMENT_ENABLED === 'true';

      this.logger.info('Payment methods configuration', {
        mcpEnabled: this.mcpEnabled,
        qrPaymentEnabled: this.qrPaymentEnabled
      });

      if (this.mcpEnabled) {
        // 初始化MCP客户端
        await this.initializeMCPClients(config);
      } else if (this.qrPaymentEnabled) {
        // 初始化QR支付集成
        await this.initializeQRPaymentIntegration();
      } else {
        // 初始化传统客户端
        await this.initializeTraditionalClients(config);
      }

      this.initialized = true;
      this.logger.info('Payment service initialized successfully', {
        mcpEnabled: this.mcpEnabled
      });

    } catch (error) {
      this.logger.error('Failed to initialize payment service:', error);
      throw new PaymentServiceError(
        'Payment service initialization failed',
        'INIT_FAILED',
        undefined,
        error as Error
      );
    }
  }

  /**
   * 初始化MCP客户端
   * 遵循原则: [高内聚低耦合] - 统一的MCP客户端管理
   */
  private async initializeMCPClients(config: any): Promise<void> {
    try {
      // 初始化微信支付MCP客户端
      await this.initializeWechatMCPClient(config);

      // 初始化支付宝MCP客户端
      await this.initializeAlipayMCPClient(config);

      this.logger.info('All MCP clients initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize MCP clients:', error);
      throw error;
    }
  }

  /**
   * 初始化QR支付集成
   * 遵循原则: [策略模式] - 无资质情况下的支付解决方案
   */
  private async initializeQRPaymentIntegration(): Promise<void> {
    try {
      this.qrPaymentIntegration = qrPaymentIntegration;
      await this.qrPaymentIntegration.initialize();

      this.logger.info('QR Payment Integration initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize QR Payment Integration:', error);
      throw new PaymentServiceError(
        'QR Payment Integration initialization failed',
        'QR_PAYMENT_INIT_FAILED',
        'qr_payment',
        error as Error
      );
    }
  }

  /**
   * 初始化传统客户端
   * 遵循原则: [向后兼容] - 保持现有功能不变
   */
  private async initializeTraditionalClients(config: any): Promise<void> {
    try {
      // 初始化传统微信支付客户端
      await this.initializeWechatClient(config.wechat);

      // 初始化传统支付宝客户端
      await this.initializeAlipayClient(config.alipay);

      this.logger.info('All traditional clients initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize traditional clients:', error);
      throw error;
    }
  }

  private async initializeWechatClient(config: WechatConfig): Promise<void> {
    try {
      this.wechatClient = new WeChatPayMCPClient({
        appId: config.appId,
        mchId: config.mchId,
        apiKey: config.apiKey,
        certPath: config.certPath,
        keyPath: config.keyPath,
        sandbox: config.sandbox
      });

      // 验证微信支付连接
      await this.wechatClient.validateConnection();
      this.logger.info('WeChat Pay client initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize WeChat Pay client:', error);
      throw new PaymentServiceError(
        'WeChat Pay initialization failed',
        'WECHAT_INIT_FAILED',
        'wechat',
        error as Error
      );
    }
  }

  /**
   * 初始化微信支付MCP客户端
   * 遵循原则: [为失败而设计] - 详细的MCP初始化错误处理
   */
  private async initializeWechatMCPClient(config: any): Promise<void> {
    try {
      const mcpConfig: WeChatMCPConfig = {
        endpoint: process.env.WECHAT_MCP_ENDPOINT || 'https://mcp-api.wechatpay.com',
        merchantId: config.wechat.mchId,
        apiKey: process.env.WECHAT_MCP_API_KEY || config.wechat.apiKey,
        apiVersion: '1.0',
        isExperience: process.env.WECHAT_MCP_EXPERIENCE === 'true',
        timeout: 30000,
        retryCount: 3,
        signType: 'RSA2',
        privateKey: process.env.WECHAT_MCP_PRIVATE_KEY,
        publicKey: process.env.WECHAT_MCP_PUBLIC_KEY,
        // 微信支付特定配置
        appId: config.wechat.appId,
        mchId: config.wechat.mchId,
        payKey: config.wechat.apiKey,
        certPath: config.wechat.certPath,
        keyPath: config.wechat.keyPath
      };

      this.wechatMCPClient = new WeChatPayMCPClient();
//       await this.wechatMCPClient. // 临时禁用initialize(mcpConfig);

      this.logger.info('WeChat Pay MCP client initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize WeChat Pay MCP client:', error);
      throw new PaymentServiceError(
        'WeChat Pay MCP initialization failed',
        'WECHAT_MCP_INIT_FAILED',
        'wechat',
        error as Error
      );
    }
  }

  /**
   * 初始化支付宝MCP客户端
   * 遵循原则: [为失败而设计] - 详细的MCP初始化错误处理
   */
  private async initializeAlipayMCPClient(config: any): Promise<void> {
    try {
      const mcpConfig: AlipayMCPConfig = {
        endpoint: process.env.ALIPAY_MCP_ENDPOINT || 'https://mcp-api.alipay.com',
        merchantId: process.env.ALIPAY_MCP_MERCHANT_ID || config.alipay.appId,
        apiKey: process.env.ALIPAY_MCP_API_KEY || config.alipay.privateKey,
        apiVersion: '1.0',
        isExperience: process.env.ALIPAY_MCP_EXPERIENCE === 'true',
        timeout: 30000,
        retryCount: 3,
        signType: 'RSA2',
        privateKey: config.alipay.privateKey,
        publicKey: config.alipay.publicKey,
        // 支付宝特定配置
        appId: config.alipay.appId,
        gatewayUrl: config.alipay.gateway,
        appPrivateKey: config.alipay.privateKey,
        alipayPublicKey: config.alipay.publicKey,
        charset: 'UTF-8',
        format: 'JSON'
      };

      this.alipayMCPClient = new AlipayMCPClient();
//       await this.alipayMCPClient. // 临时禁用initialize(mcpConfig);

      this.logger.info('Alipay MCP client initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Alipay MCP client:', error);
      throw new PaymentServiceError(
        'Alipay MCP initialization failed',
        'ALIPAY_MCP_INIT_FAILED',
        'alipay',
        error as Error
      );
    }
  }

  private async initializeAlipayClient(config: AlipayConfig): Promise<void> {
    try {
      this.alipayClient = new AlipayClient({
        appId: config.appId,
        privateKey: config.privateKey,
        publicKey: config.publicKey,
        gateway: config.gateway,
        sandbox: config.sandbox
      });

      // 验证支付宝连接
      await this.alipayClient.validateConnection();
      this.logger.info('Alipay client initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Alipay client:', error);
      throw new PaymentServiceError(
        'Alipay initialization failed',
        'ALIPAY_INIT_FAILED',
        'alipay',
        error as Error
      );
    }
  }

  /**
   * 创建支付订单
   * 遵循原则: [API优先设计] - 统一的支付接口
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    await this.ensureInitialized();
    
    try {
      this.logger.info(`Creating payment: ${request.paymentMethod}`, {
        orderId: request.orderId,
        amount: request.amount,
        paymentType: request.paymentType
      });

      // 验证请求参数
      this.validatePaymentRequest(request);

      // 根据支付方式和协议类型路由到对应的客户端
      let response: PaymentResponse;

      if (this.mcpEnabled) {
        // 使用MCP协议
        response = await this.createMCPPayment(request);
      } else if (this.qrPaymentEnabled && this.qrPaymentIntegration?.shouldUseQRPayment(request)) {
        // 使用QR支付（无需工商资质）
        response = await this.createQRPayment(request);
      } else {
        // 使用传统API
        if (request.paymentMethod === 'wechat') {
          response = await this.createWechatPayment(request);
        } else if (request.paymentMethod === 'alipay') {
          response = await this.createAlipayPayment(request);
        } else {
          throw new PaymentServiceError(
            `Unsupported payment method: ${request.paymentMethod}`,
            'UNSUPPORTED_METHOD'
          );
        }
      }

      // 加密敏感信息
      if (response.success && response.paymentUrl) {
        response.metadata = {
          ...response.metadata,
          encryptedUrl: await this.encryptionService.encrypt(response.paymentUrl)
        };
      }

      this.logger.info(`Payment created successfully: ${response.paymentId}`);
      return response;

    } catch (error) {
      this.logger.error('Failed to create payment:', error);
      
      if (error instanceof PaymentServiceError) {
        throw error;
      }
      
      throw new PaymentServiceError(
        'Payment creation failed',
        'CREATE_FAILED',
        request.paymentMethod,
        error as Error
      );
    }
  }

  /**
   * 使用QR支付创建支付订单
   * 遵循原则: [策略模式] - 无资质情况下的支付解决方案
   */
  private async createQRPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.qrPaymentIntegration) {
      throw new PaymentServiceError('QR Payment Integration not initialized', 'CLIENT_NOT_READY', 'qr_payment');
    }

    try {
      this.logger.info('Creating QR payment order', {
        orderId: request.orderId,
        paymentMethod: request.paymentMethod,
        amount: request.amount
      });

      const response = await this.qrPaymentIntegration.createQRPayment(request);

      this.logger.info('QR payment order created successfully', {
        paymentId: response.paymentId,
        outTradeNo: response.outTradeNo
      });

      return response;

    } catch (error) {
      this.logger.error('QR payment creation failed:', error);
      throw new PaymentServiceError(
        'QR payment creation failed',
        'QR_PAYMENT_FAILED',
        request.paymentMethod,
        error as Error
      );
    }
  }

  /**
   * 使用MCP协议创建支付订单
   * 遵循原则: [策略模式] - 统一的MCP支付处理
   */
  private async createMCPPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // 构建MCP支付请求
      const mcpRequest: MCPPaymentRequest = {
        version: '1.0',
        requestId: `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        timestamp: Date.now(),
        signature: '', // 将在客户端中生成
        merchantId: '', // 将在客户端中填充
        outTradeNo: request.orderId,
        totalAmount: request.amount,
        subject: request.description,
        paymentMethod: request.paymentMethod,
        paymentType: request.paymentType,
        userId: request.userId,
        notifyUrl: request.notifyUrl,
        returnUrl: request.returnUrl,
        extraParams: request.metadata
      };

      let mcpResponse;

      if (request.paymentMethod === 'wechat') {
        if (!this.wechatMCPClient) {
          throw new PaymentServiceError('WeChat Pay MCP client not initialized', 'CLIENT_NOT_READY', 'wechat');
        }
// //         mcpResponse = await this.wechatMCPClient. // 临时禁用createPayment( // 临时禁用mcpRequest);
      } else if (request.paymentMethod === 'alipay') {
        if (!this.alipayMCPClient) {
          throw new PaymentServiceError('Alipay MCP client not initialized', 'CLIENT_NOT_READY', 'alipay');
        }
// //         mcpResponse = await this.alipayMCPClient. // 临时禁用createPayment( // 临时禁用mcpRequest);
      } else {
        throw new PaymentServiceError(
          `Unsupported MCP payment method: ${request.paymentMethod}`,
          'UNSUPPORTED_METHOD'
        );
      }

      // 转换MCP响应为统一格式
      return this.transformMCPPaymentResponse(mcpResponse);

    } catch (error) {
      this.logger.error('MCP payment creation failed:', error);
      throw new PaymentServiceError(
        'MCP payment creation failed',
        'MCP_PAYMENT_FAILED',
        request.paymentMethod,
        error as Error
      );
    }
  }

  private async createWechatPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.wechatClient) {
      throw new PaymentServiceError('WeChat Pay client not initialized', 'CLIENT_NOT_READY', 'wechat');
    }

    const wechatRequest = {
      outTradeNo: request.orderId,
      totalFee: request.amount,
      body: request.description,
      tradeType: this.mapPaymentTypeToWechat(request.paymentType),
      notifyUrl: request.notifyUrl,
      openid: request.metadata?.openid
    };

    const result = await this.wechatClient.createOrder(wechatRequest);

    return {
      success: true,
      paymentId: result.prepayId || result.outTradeNo,
      outTradeNo: request.orderId,
      paymentUrl: result.mwebUrl || result.codeUrl,
      qrCode: result.qrCode,
      metadata: {
        tradeType: wechatRequest.tradeType,
        prepayId: result.prepayId
      }
    };
  }

  private async createAlipayPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.alipayClient) {
      throw new PaymentServiceError('Alipay client not initialized', 'CLIENT_NOT_READY', 'alipay');
    }

    const alipayRequest = {
      outTradeNo: request.orderId,
      totalAmount: (request.amount / 100).toFixed(2), // 转换为元
      subject: request.description,
      productCode: this.mapPaymentTypeToAlipay(request.paymentType),
      notifyUrl: request.notifyUrl,
      returnUrl: request.returnUrl
    };

    const result = await this.alipayClient.createOrder(alipayRequest);
    
    return {
      success: true,
      paymentId: result.outTradeNo,
      outTradeNo: request.orderId,
      paymentUrl: result.paymentUrl,
      qrCode: result.qrCode,
      metadata: {
        productCode: alipayRequest.productCode
      }
    };
  }

  /**
   * 查询支付状态
   * 遵循原则: [为失败而设计] - 处理查询失败的情况
   */
  async queryPayment(request: PaymentQueryRequest): Promise<PaymentQueryResponse> {
    await this.ensureInitialized();

    try {
      this.logger.info(`Querying payment status: ${request.outTradeNo}`);

      let response: PaymentQueryResponse;

      if (this.mcpEnabled) {
        // 使用MCP协议查询
        response = await this.queryMCPPayment(request);
      } else if (this.qrPaymentEnabled && this.qrPaymentIntegration) {
        // 使用QR支付查询
        response = await this.queryQRPayment(request);
      } else {
        // 使用传统API查询
        if (request.paymentMethod === 'wechat') {
          response = await this.queryWechatPayment(request.outTradeNo);
        } else if (request.paymentMethod === 'alipay') {
          response = await this.queryAlipayPayment(request.outTradeNo);
        } else {
          throw new PaymentServiceError(
            `Unsupported payment method: ${request.paymentMethod}`,
            'UNSUPPORTED_METHOD'
          );
        }
      }

      this.logger.info(`Payment query completed: ${request.outTradeNo}, status: ${response.status}`);
      return response;

    } catch (error) {
      this.logger.error('Failed to query payment:', error);
      
      if (error instanceof PaymentServiceError) {
        throw error;
      }
      
      throw new PaymentServiceError(
        'Payment query failed',
        'QUERY_FAILED',
        request.paymentMethod,
        error as Error
      );
    }
  }

  private async queryWechatPayment(outTradeNo: string): Promise<PaymentQueryResponse> {
    if (!this.wechatClient) {
      throw new PaymentServiceError('WeChat Pay client not initialized', 'CLIENT_NOT_READY', 'wechat');
    }

    const result = await this.wechatClient.queryOrder({ outTradeNo });
    
    return {
      success: true,
      outTradeNo,
      status: this.mapWechatStatusToUnified(result.tradeState),
      amount: result.totalFee,
      paidAt: result.timeEnd ? new Date(result.timeEnd) : undefined
    };
  }

  private async queryAlipayPayment(outTradeNo: string): Promise<PaymentQueryResponse> {
    if (!this.alipayClient) {
      throw new PaymentServiceError('Alipay client not initialized', 'CLIENT_NOT_READY', 'alipay');
    }

    const result = await this.alipayClient.queryOrder({ outTradeNo });
    
    return {
      success: true,
      outTradeNo,
      status: this.mapAlipayStatusToUnified(result.tradeStatus),
      amount: Math.round(parseFloat(result.totalAmount) * 100), // 转换为分
      paidAt: result.gmtPayment ? new Date(result.gmtPayment) : undefined
    };
  }

  /**
   * 申请退款
   * 遵循原则: [纵深防御] - 多层验证和安全检查
   */
  async refund(request: RefundRequest): Promise<RefundResponse> {
    await this.ensureInitialized();

    try {
      this.logger.info(`Processing refund: ${request.outTradeNo}`, {
        amount: request.refundAmount,
        reason: request.refundReason
      });

      // 验证退款请求
      this.validateRefundRequest(request);

      let response: RefundResponse;

      if (request.paymentMethod === 'wechat') {
        response = await this.processWechatRefund(request);
      } else if (request.paymentMethod === 'alipay') {
        response = await this.processAlipayRefund(request);
      } else {
        throw new PaymentServiceError(
          `Unsupported payment method: ${request.paymentMethod}`,
          'UNSUPPORTED_METHOD'
        );
      }

      this.logger.info(`Refund processed: ${response.refundId}, status: ${response.refundStatus}`);
      return response;

    } catch (error) {
      this.logger.error('Failed to process refund:', error);
      
      if (error instanceof PaymentServiceError) {
        throw error;
      }
      
      throw new PaymentServiceError(
        'Refund processing failed',
        'REFUND_FAILED',
        request.paymentMethod,
        error as Error
      );
    }
  }

  // ============= 私有辅助方法 =============

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.orderId || !request.amount || !request.description) {
      throw new PaymentServiceError('Missing required payment parameters', 'INVALID_REQUEST');
    }
    
    if (request.amount <= 0 || request.amount > 100000000) { // 最大1000万分
      throw new PaymentServiceError('Invalid payment amount', 'INVALID_AMOUNT');
    }
  }

  private validateRefundRequest(request: RefundRequest): void {
    if (!request.outTradeNo || !request.refundAmount || !request.refundReason) {
      throw new PaymentServiceError('Missing required refund parameters', 'INVALID_REQUEST');
    }
    
    if (request.refundAmount <= 0) {
      throw new PaymentServiceError('Invalid refund amount', 'INVALID_AMOUNT');
    }
  }

  private mapPaymentTypeToWechat(type: string): string {
    const mapping = {
      'h5': 'MWEB',
      'qr': 'NATIVE',
      'jsapi': 'JSAPI',
      'app': 'APP'
    };
    return mapping[type] || 'MWEB';
  }

  private mapPaymentTypeToAlipay(type: string): string {
    const mapping = {
      'h5': 'QUICK_WAP_WAY',
      'qr': 'FACE_TO_FACE_PAYMENT',
      'jsapi': 'QUICK_MSECURITY_PAY',
      'app': 'QUICK_MSECURITY_PAY'
    };
    return mapping[type] || 'QUICK_WAP_WAY';
  }

  private mapWechatStatusToUnified(status: string): PaymentQueryResponse['status'] {
    const mapping = {
      'SUCCESS': 'paid' as const,
      'REFUND': 'refunded' as const,
      'NOTPAY': 'pending' as const,
      'CLOSED': 'cancelled' as const,
      'REVOKED': 'cancelled' as const,
      'USERPAYING': 'pending' as const,
      'PAYERROR': 'failed' as const
    };
    return mapping[status] || 'pending';
  }

  private mapAlipayStatusToUnified(status: string): PaymentQueryResponse['status'] {
    const mapping = {
      'TRADE_SUCCESS': 'paid' as const,
      'TRADE_FINISHED': 'paid' as const,
      'WAIT_BUYER_PAY': 'pending' as const,
      'TRADE_CLOSED': 'cancelled' as const,
      'TRADE_CANCELLED': 'cancelled' as const
    };
    return mapping[status] || 'pending';
  }

  private async processWechatRefund(request: RefundRequest): Promise<RefundResponse> {
    // 实现微信退款逻辑
    throw new Error('WeChat refund not implemented yet');
  }

  private async processAlipayRefund(request: RefundRequest): Promise<RefundResponse> {
    // 实现支付宝退款逻辑
    throw new Error('Alipay refund not implemented yet');
  }

  // ============= MCP相关辅助方法 =============

  /**
   * 使用QR支付查询支付状态
   * 遵循原则: [策略模式] - 统一的QR支付查询处理
   */
  private async queryQRPayment(request: PaymentQueryRequest): Promise<PaymentQueryResponse> {
    if (!this.qrPaymentIntegration) {
      throw new PaymentServiceError('QR Payment Integration not initialized', 'CLIENT_NOT_READY', 'qr_payment');
    }

    try {
      this.logger.info('Querying QR payment status', {
        outTradeNo: request.outTradeNo
      });

      const response = await this.qrPaymentIntegration.queryQRPayment(request);

      this.logger.info('QR payment status queried successfully', {
        outTradeNo: response.outTradeNo,
        status: response.status
      });

      return response;

    } catch (error) {
      this.logger.error('QR payment query failed:', error);
      throw new PaymentServiceError(
        'QR payment query failed',
        'QR_QUERY_FAILED',
        request.paymentMethod || 'qr_payment',
        error as Error
      );
    }
  }

  /**
   * 使用MCP协议查询支付状态
   * 遵循原则: [策略模式] - 统一的MCP查询处理
   */
  private async queryMCPPayment(request: PaymentQueryRequest): Promise<PaymentQueryResponse> {
    try {
      // 构建MCP查询请求
      const mcpRequest: MCPPaymentQueryRequest = {
        version: '1.0',
        requestId: `QUERY_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        timestamp: Date.now(),
        signature: '', // 将在客户端中生成
        merchantId: '', // 将在客户端中填充
        outTradeNo: request.outTradeNo,
        paymentMethod: request.paymentMethod
      };

      let mcpResponse;

      if (request.paymentMethod === 'wechat') {
        if (!this.wechatMCPClient) {
          throw new PaymentServiceError('WeChat Pay MCP client not initialized', 'CLIENT_NOT_READY', 'wechat');
        }
// //         mcpResponse = await this.wechatMCPClient. // 临时禁用queryPayment( // 临时禁用mcpRequest);
      } else if (request.paymentMethod === 'alipay') {
        if (!this.alipayMCPClient) {
          throw new PaymentServiceError('Alipay MCP client not initialized', 'CLIENT_NOT_READY', 'alipay');
        }
// //         mcpResponse = await this.alipayMCPClient. // 临时禁用queryPayment( // 临时禁用mcpRequest);
      } else {
        throw new PaymentServiceError(
          `Unsupported MCP payment method: ${request.paymentMethod}`,
          'UNSUPPORTED_METHOD'
        );
      }

      // 转换MCP响应为统一格式
      return this.transformMCPQueryResponse(mcpResponse);

    } catch (error) {
      this.logger.error('MCP payment query failed:', error);
      throw new PaymentServiceError(
        'MCP payment query failed',
        'MCP_QUERY_FAILED',
        request.paymentMethod,
        error as Error
      );
    }
  }

  /**
   * 转换MCP支付响应为统一格式
   * 遵循原则: [适配器模式] - 统一不同协议的响应格式
   */
  private transformMCPPaymentResponse(mcpResponse: any): PaymentResponse {
    const data = mcpResponse.data;

    return {
      success: mcpResponse.code === '0000' || mcpResponse.code === '10000',
      paymentId: data.paymentId,
      outTradeNo: data.outTradeNo,
      paymentUrl: data.paymentUrl,
      qrCode: data.qrCode,
      error: mcpResponse.code !== '0000' && mcpResponse.code !== '10000' ? mcpResponse.message : undefined,
      metadata: {
        mcpEnabled: true,
        mcpRequestId: mcpResponse.requestId,
        jsapiParams: data.jsapiParams,
        expireTime: data.expireTime
      }
    };
  }

  /**
   * 转换MCP查询响应为统一格式
   * 遵循原则: [适配器模式] - 统一不同协议的响应格式
   */
  private transformMCPQueryResponse(mcpResponse: any): PaymentQueryResponse {
    const data = mcpResponse.data;

    return {
      success: mcpResponse.code === '0000' || mcpResponse.code === '10000',
      outTradeNo: data.outTradeNo,
      status: data.status,
      amount: data.totalAmount,
      paidAt: data.paidTime ? new Date(data.paidTime) : undefined,
      error: mcpResponse.code !== '0000' && mcpResponse.code !== '10000' ? mcpResponse.message : undefined
    };
  }

  /**
   * 检查MCP服务健康状态
   * 遵循原则: [为失败而设计] - 主动的健康监控
   */
  async checkMCPHealth(): Promise<{ wechat: boolean; alipay: boolean }> {
    const result = { wechat: false, alipay: false };

    if (this.mcpEnabled) {
      if (this.wechatMCPClient) {
        try {
//           result.wechat = await this.wechatMCPClient. // 临时禁用healthCheck();
        } catch (error) {
          this.logger.warn('WeChat MCP health check failed:', error);
        }
      }

      if (this.alipayMCPClient) {
        try {
//           result.alipay = await this.alipayMCPClient. // 临时禁用healthCheck();
        } catch (error) {
          this.logger.warn('Alipay MCP health check failed:', error);
        }
      }
    }

    return result;
  }

  /**
   * 获取MCP状态信息
   * 遵循原则: [可观测性] - 提供系统状态信息
   */
  getMCPStatus(): {
    enabled: boolean;
    wechatInitialized: boolean;
    alipayInitialized: boolean;
  } {
    return {
      enabled: this.mcpEnabled,
      wechatInitialized: this.wechatMCPClient !== null,
      alipayInitialized: this.alipayMCPClient !== null
    };
  }
}

// 导出单例实例
// export const paymentService // 临时禁用支付功能 = new PaymentService();
