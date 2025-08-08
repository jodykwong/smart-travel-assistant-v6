
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 支付宝MCP客户端
 * 遵循原则: [为失败而设计] + [高内聚低耦合] + [接口隔离原则]
 * 
 * 实现支付宝MCP协议集成：
 * 1. 与现有AlipayClient保持接口一致
 * 2. 支持支付宝收银台拉起功能
 * 3. 统一的状态映射和错误处理
 * 4. 完整的签名验证机制
 */

import {
  MCPClient,
  AlipayMCPConfig,
  AlipayMCPPaymentRequest,
  MCPRequest,
  MCPResponse,
  MCPPaymentRequest,
  MCPPaymentResponse,
  MCPPaymentQueryRequest,
  MCPPaymentQueryResponse,
  MCPRefundRequest,
  MCPRefundResponse,
  MCPNotifyRequest,
  MCP_CONSTANTS
} from './mcp-types';

import {
  mcpRequestBuilder,
  mcpSignatureService,
  mcpHttpClient,
  MCPStatusMapper,
  MCPValidator
} from './mcp-utils';

import { Logger } from '../../utils/logger';
import { EncryptionService } from '../../security/encryption-service';

// ============= 支付宝MCP错误类型 =============

// // export class AlipayMCPError // 临时禁用支付功能 // 临时禁用支付功能 extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error,
    public requestId?: string
  ) {
    super(message);
    this.name = 'AlipayMCPError';
  }
}

// ============= 支付宝MCP客户端 =============

// // export class AlipayMCPClient // 临时禁用支付功能 // 临时禁用支付功能 implements MCPClient {
  private config: AlipayMCPConfig | null = null;
  private logger: Logger;
  private encryptionService: EncryptionService;
  private initialized = false;

  constructor() {
    this.logger = new Logger('AlipayMCPClient');
    this.encryptionService = new EncryptionService();
  }

  /**
   * 初始化支付宝MCP客户端
   * 遵循原则: [为失败而设计] - 详细的初始化验证
   */
  async initialize(config: AlipayMCPConfig): Promise<void> {
    try {
      this.logger.info('Initializing Alipay MCP client...');
      
      // 验证配置完整性
      this.validateConfig(config);
      
      // 存储配置
      this.config = { ...config };
      
      // 验证MCP服务连接
      await this.validateConnection();
      
      this.initialized = true;
      this.logger.info('Alipay MCP client initialized successfully', {
        endpoint: config.endpoint,
        merchantId: config.merchantId,
        appId: config.appId,
        isExperience: config.isExperience
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize Alipay MCP client', error);
      throw new AlipayMCPError(
        'Alipay MCP client initialization failed',
        'INIT_FAILED',
        error as Error
      );
    }
  }

  /**
   * 创建支付宝支付订单
   * 遵循原则: [API优先设计] - 统一的支付接口
   */
  async createPayment(request: MCPPaymentRequest): Promise<MCPResponse<MCPPaymentResponse>> {
    await this.ensureInitialized();
    
    try {
      this.logger.info('Creating Alipay payment order', {
        outTradeNo: request.outTradeNo,
        amount: request.totalAmount,
        paymentType: request.paymentType
      });

      // 验证请求参数
      MCPValidator.validatePaymentRequest(request);
      
      // 构建支付宝支付特定请求
      const alipayRequest = this.buildAlipayPaymentRequest(request);
      
      // 生成签名
      alipayRequest.signature = mcpSignatureService.sign(
        alipayRequest,
        this.config!.appPrivateKey,
        this.config!.signType
      );

      // 发送请求到MCP服务
      const response = await mcpHttpClient.request<MCPResponse<any>>(
        `${this.config!.endpoint}/alipay/payment/create`,
        'POST',
        alipayRequest,
        {
          'X-MCP-Version': MCP_CONSTANTS.VERSION,
          'X-Merchant-Id': this.config!.merchantId,
          'X-App-Id': this.config!.appId
        }
      );

      // 验证响应签名
      if (response.signature && !this.verifyResponseSignature(response)) {
        throw new AlipayMCPError(
          'Response signature verification failed',
          'SIGNATURE_INVALID',
          undefined,
          request.requestId
        );
      }

      // 转换响应格式
      const paymentResponse = this.transformPaymentResponse(response.data, request.paymentType);
      
      this.logger.info('Alipay payment order created successfully', {
        paymentId: paymentResponse.paymentId,
        outTradeNo: paymentResponse.outTradeNo
      });

      return {
        ...response,
        data: paymentResponse
      };

    } catch (error) {
      this.logger.error('Failed to create Alipay payment order', error);
      
      if (error instanceof AlipayMCPError) {
        throw error;
      }
      
      throw new AlipayMCPError(
        'Alipay payment creation failed',
        'PAYMENT_CREATE_FAILED',
        error as Error,
        request.requestId
      );
    }
  }

  /**
   * 查询支付宝支付状态
   * 遵循原则: [为失败而设计] - 完善的查询错误处理
   */
  async queryPayment(request: MCPPaymentQueryRequest): Promise<MCPResponse<MCPPaymentQueryResponse>> {
    await this.ensureInitialized();
    
    try {
      this.logger.info('Querying Alipay payment status', {
        outTradeNo: request.outTradeNo,
        paymentId: request.paymentId
      });

      // 验证请求参数
      MCPValidator.validateQueryRequest(request);
      
      // 生成签名
      request.signature = mcpSignatureService.sign(
        request,
        this.config!.appPrivateKey,
        this.config!.signType
      );

      // 发送查询请求
      const response = await mcpHttpClient.request<MCPResponse<any>>(
        `${this.config!.endpoint}/alipay/payment/query`,
        'POST',
        request,
        {
          'X-MCP-Version': MCP_CONSTANTS.VERSION,
          'X-Merchant-Id': this.config!.merchantId,
          'X-App-Id': this.config!.appId
        }
      );

      // 验证响应签名
      if (response.signature && !this.verifyResponseSignature(response)) {
        throw new AlipayMCPError(
          'Response signature verification failed',
          'SIGNATURE_INVALID',
          undefined,
          request.requestId
        );
      }

      // 转换查询响应
      const queryResponse = this.transformQueryResponse(response.data);
      
      this.logger.info('Alipay payment status queried successfully', {
        outTradeNo: queryResponse.outTradeNo,
        status: queryResponse.status
      });

      return {
        ...response,
        data: queryResponse
      };

    } catch (error) {
      this.logger.error('Failed to query Alipay payment status', error);
      
      if (error instanceof AlipayMCPError) {
        throw error;
      }
      
      throw new AlipayMCPError(
        'Alipay payment query failed',
        'PAYMENT_QUERY_FAILED',
        error as Error,
        request.requestId
      );
    }
  }

  /**
   * 支付宝退款
   * 遵循原则: [纵深防御] - 多重安全验证
   */
  async refund(request: MCPRefundRequest): Promise<MCPResponse<MCPRefundResponse>> {
    await this.ensureInitialized();
    
    try {
      this.logger.info('Processing Alipay payment refund', {
        outTradeNo: request.outTradeNo,
        refundAmount: request.refundAmount
      });

      // 生成签名
      request.signature = mcpSignatureService.sign(
        request,
        this.config!.appPrivateKey,
        this.config!.signType
      );

      // 发送退款请求
      const response = await mcpHttpClient.request<MCPResponse<any>>(
        `${this.config!.endpoint}/alipay/payment/refund`,
        'POST',
        request,
        {
          'X-MCP-Version': MCP_CONSTANTS.VERSION,
          'X-Merchant-Id': this.config!.merchantId,
          'X-App-Id': this.config!.appId
        }
      );

      // 验证响应签名
      if (response.signature && !this.verifyResponseSignature(response)) {
        throw new AlipayMCPError(
          'Response signature verification failed',
          'SIGNATURE_INVALID',
          undefined,
          request.requestId
        );
      }

      this.logger.info('Alipay payment refund processed successfully', {
        refundId: response.data.refundId,
        status: response.data.status
      });

      return response;

    } catch (error) {
      this.logger.error('Failed to process Alipay payment refund', error);
      
      if (error instanceof AlipayMCPError) {
        throw error;
      }
      
      throw new AlipayMCPError(
        'Alipay payment refund failed',
        'REFUND_FAILED',
        error as Error,
        request.requestId
      );
    }
  }

  /**
   * 验证支付宝回调通知
   * 遵循原则: [纵深防御] - 严格的回调验证
   */
  async verifyNotify(notify: MCPNotifyRequest): Promise<boolean> {
    try {
      this.logger.info('Verifying Alipay payment notify', {
        outTradeNo: notify.outTradeNo,
        status: notify.status
      });

      // 验证签名
      const isSignatureValid = mcpSignatureService.verify(
        notify,
        notify.signature,
        this.config!.alipayPublicKey,
        this.config!.signType
      );

      if (!isSignatureValid) {
        this.logger.warn('Alipay payment notify signature verification failed', {
          outTradeNo: notify.outTradeNo
        });
        return false;
      }

      // 验证时间戳（防重放攻击）
      const currentTime = Date.now();
      const notifyTime = notify.timestamp;
      const timeDiff = Math.abs(currentTime - notifyTime);
      
      if (timeDiff > 300000) { // 5分钟超时
        this.logger.warn('Alipay payment notify timestamp expired', {
          outTradeNo: notify.outTradeNo,
          timeDiff
        });
        return false;
      }

      this.logger.info('Alipay payment notify verified successfully', {
        outTradeNo: notify.outTradeNo
      });

      return true;

    } catch (error) {
      this.logger.error('Failed to verify Alipay payment notify', error);
      return false;
    }
  }

  /**
   * 健康检查
   * 遵循原则: [为失败而设计] - 主动的健康监控
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized || !this.config) {
        return false;
      }

      // 发送健康检查请求
      const healthRequest = mcpRequestBuilder.buildBaseRequest(this.config.merchantId);
      healthRequest.signature = mcpSignatureService.sign(
        healthRequest,
        this.config.appPrivateKey,
        this.config.signType
      );

      const response = await mcpHttpClient.request<MCPResponse<any>>(
        `${this.config.endpoint}/alipay/health`,
        'POST',
        healthRequest,
        {
          'X-MCP-Version': MCP_CONSTANTS.VERSION,
          'X-Merchant-Id': this.config.merchantId,
          'X-App-Id': this.config.appId
        }
      );

      return response.code === '10000'; // 支付宝成功码

    } catch (error) {
      this.logger.warn('Alipay MCP health check failed', error);
      return false;
    }
  }

  // ============= 私有方法 =============

  private validateConfig(config: AlipayMCPConfig): void {
    const requiredFields = [
      'endpoint', 'merchantId', 'apiKey', 'appId', 
      'gatewayUrl', 'appPrivateKey', 'alipayPublicKey'
    ];
    const missingFields = requiredFields.filter(field => !config[field as keyof AlipayMCPConfig]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required Alipay MCP config fields: ${missingFields.join(', ')}`);
    }

    if (config.signType !== 'RSA2') {
      throw new Error('Alipay MCP only supports RSA2 signature');
    }
  }

  private async validateConnection(): Promise<void> {
    try {
      const testUrl = `${this.config!.endpoint}/health`;
      await fetch(testUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
    } catch (error) {
      throw new Error(`Cannot connect to Alipay MCP endpoint: ${error.message}`);
    }
  }

  private buildAlipayPaymentRequest(request: MCPPaymentRequest): AlipayMCPPaymentRequest {
    const baseRequest = mcpRequestBuilder.buildBaseRequest(this.config!.merchantId);
    
    // 根据支付类型确定产品码
    const productCode = this.getProductCode(request.paymentType);
    
    return {
      ...baseRequest,
      ...request,
      // 支付宝特定字段
      productCode,
      goodsType: request.extraParams?.goodsType || '1', // 实物商品
      timeoutExpress: request.extraParams?.timeoutExpress || '30m',
      quitUrl: request.extraParams?.quitUrl
    };
  }

  private getProductCode(paymentType: string): string {
    const productCodeMap = {
      'h5': 'QUICK_WAP_WAY',
      'qr': 'FACE_TO_FACE_PAYMENT', 
      'jsapi': 'QUICK_MSECURITY_PAY',
      'app': 'QUICK_MSECURITY_PAY'
    };
    
    return productCodeMap[paymentType] || 'QUICK_WAP_WAY';
  }

  private transformPaymentResponse(data: any, paymentType: string): MCPPaymentResponse {
    const response: MCPPaymentResponse = {
      paymentId: data.paymentId || data.outTradeNo,
      outTradeNo: data.outTradeNo,
      status: 'created'
    };

    // 根据支付类型设置相应的支付参数
    switch (paymentType) {
      case 'h5':
        response.paymentUrl = data.paymentUrl || data.body;
        break;
      case 'qr':
        response.qrCode = data.qrCode;
        break;
      case 'app':
        response.paymentUrl = data.orderStr || data.paymentUrl;
        break;
    }

    if (data.expireTime) {
      response.expireTime = data.expireTime;
    }

    return response;
  }

  private transformQueryResponse(data: any): MCPPaymentQueryResponse {
    return {
      outTradeNo: data.outTradeNo,
      paymentId: data.paymentId || data.tradeNo,
      status: MCPStatusMapper.mapPaymentStatus(data.tradeStatus || data.status, 'alipay'),
      totalAmount: Math.round(parseFloat(data.totalAmount || '0') * 100), // 转换为分
      paidAmount: Math.round(parseFloat(data.receiptAmount || data.totalAmount || '0') * 100),
      paidTime: data.gmtPayment || data.paidTime,
      paymentMethod: 'alipay',
      transactionId: data.tradeNo,
      buyerInfo: data.buyerInfo ? {
        buyerId: data.buyerInfo.buyerUserId,
        buyerName: data.buyerInfo.buyerLogonId
      } : undefined
    };
  }

  private verifyResponseSignature(response: MCPResponse<any>): boolean {
    if (!this.config?.alipayPublicKey) {
      this.logger.warn('No Alipay public key configured for signature verification');
      return true; // 如果没有配置公钥，跳过验证
    }

    return mcpSignatureService.verify(
      response,
      response.signature!,
      this.config.alipayPublicKey,
      this.config.signType
    );
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      throw new AlipayMCPError(
        'Alipay MCP client not initialized',
        'NOT_INITIALIZED'
      );
    }
  }
}

// ============= 导出 =============

export default AlipayMCPClient;
