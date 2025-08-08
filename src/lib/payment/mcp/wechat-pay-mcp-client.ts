
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 微信支付MCP客户端
 * 遵循原则: [为失败而设计] + [高内聚低耦合] + [接口隔离原则]
 * 
 * 实现微信支付MCP协议集成：
 * 1. 支持H5支付、扫码支付、JSAPI支付
 * 2. 统一的错误处理和重试机制
 * 3. 完整的签名验证和安全保护
 * 4. 与现有支付架构无缝集成
 */

import {
  MCPClient,
  MCPConfig,
  WeChatMCPConfig,
  WeChatMCPPaymentRequest,
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

// ============= 微信支付MCP错误类型 =============

// // export class WeChatPayMCPError // 临时禁用支付功能 // 临时禁用支付功能 extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error,
    public requestId?: string
  ) {
    super(message);
    this.name = 'WeChatPayMCPError';
  }
}

// ============= 微信支付MCP客户端 =============

// // export class WeChatPayMCPClient // 临时禁用支付功能 // 临时禁用支付功能 implements MCPClient {
  private config: WeChatMCPConfig | null = null;
  private logger: Logger;
  private encryptionService: EncryptionService;
  private initialized = false;

  constructor() {
    this.logger = new Logger('WeChatPayMCPClient');
    this.encryptionService = new EncryptionService();
  }

  /**
   * 初始化微信支付MCP客户端
   * 遵循原则: [为失败而设计] - 详细的初始化验证
   */
  async initialize(config: WeChatMCPConfig): Promise<void> {
    try {
      this.logger.info('Initializing WeChat Pay MCP client...');
      
      // 验证配置完整性
      this.validateConfig(config);
      
      // 存储配置
      this.config = { ...config };
      
      // 验证MCP服务连接
      await this.validateConnection();
      
      this.initialized = true;
      this.logger.info('WeChat Pay MCP client initialized successfully', {
        endpoint: config.endpoint,
        merchantId: config.merchantId,
        isExperience: config.isExperience
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize WeChat Pay MCP client', error);
      throw new WeChatPayMCPError(
        'WeChat Pay MCP client initialization failed',
        'INIT_FAILED',
        error as Error
      );
    }
  }

  /**
   * 创建微信支付订单
   * 遵循原则: [API优先设计] - 统一的支付接口
   */
  async createPayment(request: MCPPaymentRequest): Promise<MCPResponse<MCPPaymentResponse>> {
    await this.ensureInitialized();
    
    try {
      this.logger.info('Creating WeChat payment order', {
        outTradeNo: request.outTradeNo,
        amount: request.totalAmount,
        paymentType: request.paymentType
      });

      // 验证请求参数
      MCPValidator.validatePaymentRequest(request);
      
      // 构建微信支付特定请求
      const wechatRequest = this.buildWeChatPaymentRequest(request);
      
      // 生成签名
      wechatRequest.signature = mcpSignatureService.sign(
        wechatRequest,
        this.config!.privateKey || this.config!.payKey,
        this.config!.signType
      );

      // 发送请求到MCP服务
      const response = await mcpHttpClient.request<MCPResponse<any>>(
        `${this.config!.endpoint}/wechat/payment/create`,
        'POST',
        wechatRequest,
        {
          'X-MCP-Version': MCP_CONSTANTS.VERSION,
          'X-Merchant-Id': this.config!.merchantId
        }
      );

      // 验证响应签名
      if (response.signature && !this.verifyResponseSignature(response)) {
        throw new WeChatPayMCPError(
          'Response signature verification failed',
          'SIGNATURE_INVALID',
          undefined,
          request.requestId
        );
      }

      // 转换响应格式
      const paymentResponse = this.transformPaymentResponse(response.data, request.paymentType);
      
      this.logger.info('WeChat payment order created successfully', {
        paymentId: paymentResponse.paymentId,
        outTradeNo: paymentResponse.outTradeNo
      });

      return {
        ...response,
        data: paymentResponse
      };

    } catch (error) {
      this.logger.error('Failed to create WeChat payment order', error);
      
      if (error instanceof WeChatPayMCPError) {
        throw error;
      }
      
      throw new WeChatPayMCPError(
        'WeChat payment creation failed',
        'PAYMENT_CREATE_FAILED',
        error as Error,
        request.requestId
      );
    }
  }

  /**
   * 查询微信支付状态
   * 遵循原则: [为失败而设计] - 完善的查询错误处理
   */
  async queryPayment(request: MCPPaymentQueryRequest): Promise<MCPResponse<MCPPaymentQueryResponse>> {
    await this.ensureInitialized();
    
    try {
      this.logger.info('Querying WeChat payment status', {
        outTradeNo: request.outTradeNo,
        paymentId: request.paymentId
      });

      // 验证请求参数
      MCPValidator.validateQueryRequest(request);
      
      // 生成签名
      request.signature = mcpSignatureService.sign(
        request,
        this.config!.privateKey || this.config!.payKey,
        this.config!.signType
      );

      // 发送查询请求
      const response = await mcpHttpClient.request<MCPResponse<any>>(
        `${this.config!.endpoint}/wechat/payment/query`,
        'POST',
        request,
        {
          'X-MCP-Version': MCP_CONSTANTS.VERSION,
          'X-Merchant-Id': this.config!.merchantId
        }
      );

      // 验证响应签名
      if (response.signature && !this.verifyResponseSignature(response)) {
        throw new WeChatPayMCPError(
          'Response signature verification failed',
          'SIGNATURE_INVALID',
          undefined,
          request.requestId
        );
      }

      // 转换查询响应
      const queryResponse = this.transformQueryResponse(response.data);
      
      this.logger.info('WeChat payment status queried successfully', {
        outTradeNo: queryResponse.outTradeNo,
        status: queryResponse.status
      });

      return {
        ...response,
        data: queryResponse
      };

    } catch (error) {
      this.logger.error('Failed to query WeChat payment status', error);
      
      if (error instanceof WeChatPayMCPError) {
        throw error;
      }
      
      throw new WeChatPayMCPError(
        'WeChat payment query failed',
        'PAYMENT_QUERY_FAILED',
        error as Error,
        request.requestId
      );
    }
  }

  /**
   * 微信支付退款
   * 遵循原则: [纵深防御] - 多重安全验证
   */
  async refund(request: MCPRefundRequest): Promise<MCPResponse<MCPRefundResponse>> {
    await this.ensureInitialized();
    
    try {
      this.logger.info('Processing WeChat payment refund', {
        outTradeNo: request.outTradeNo,
        refundAmount: request.refundAmount
      });

      // 生成签名
      request.signature = mcpSignatureService.sign(
        request,
        this.config!.privateKey || this.config!.payKey,
        this.config!.signType
      );

      // 发送退款请求
      const response = await mcpHttpClient.request<MCPResponse<any>>(
        `${this.config!.endpoint}/wechat/payment/refund`,
        'POST',
        request,
        {
          'X-MCP-Version': MCP_CONSTANTS.VERSION,
          'X-Merchant-Id': this.config!.merchantId
        }
      );

      // 验证响应签名
      if (response.signature && !this.verifyResponseSignature(response)) {
        throw new WeChatPayMCPError(
          'Response signature verification failed',
          'SIGNATURE_INVALID',
          undefined,
          request.requestId
        );
      }

      this.logger.info('WeChat payment refund processed successfully', {
        refundId: response.data.refundId,
        status: response.data.status
      });

      return response;

    } catch (error) {
      this.logger.error('Failed to process WeChat payment refund', error);
      
      if (error instanceof WeChatPayMCPError) {
        throw error;
      }
      
      throw new WeChatPayMCPError(
        'WeChat payment refund failed',
        'REFUND_FAILED',
        error as Error,
        request.requestId
      );
    }
  }

  /**
   * 验证微信支付回调通知
   * 遵循原则: [纵深防御] - 严格的回调验证
   */
  async verifyNotify(notify: MCPNotifyRequest): Promise<boolean> {
    try {
      this.logger.info('Verifying WeChat payment notify', {
        outTradeNo: notify.outTradeNo,
        status: notify.status
      });

      // 验证签名
      const isSignatureValid = mcpSignatureService.verify(
        notify,
        notify.signature,
        this.config!.publicKey || this.config!.payKey,
        this.config!.signType
      );

      if (!isSignatureValid) {
        this.logger.warn('WeChat payment notify signature verification failed', {
          outTradeNo: notify.outTradeNo
        });
        return false;
      }

      // 验证时间戳（防重放攻击）
      const currentTime = Date.now();
      const notifyTime = notify.timestamp;
      const timeDiff = Math.abs(currentTime - notifyTime);
      
      if (timeDiff > 300000) { // 5分钟超时
        this.logger.warn('WeChat payment notify timestamp expired', {
          outTradeNo: notify.outTradeNo,
          timeDiff
        });
        return false;
      }

      this.logger.info('WeChat payment notify verified successfully', {
        outTradeNo: notify.outTradeNo
      });

      return true;

    } catch (error) {
      this.logger.error('Failed to verify WeChat payment notify', error);
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
        this.config.privateKey || this.config.payKey,
        this.config.signType
      );

      const response = await mcpHttpClient.request<MCPResponse<any>>(
        `${this.config.endpoint}/wechat/health`,
        'POST',
        healthRequest,
        {
          'X-MCP-Version': MCP_CONSTANTS.VERSION,
          'X-Merchant-Id': this.config.merchantId
        }
      );

      return response.code === '0000'; // 成功码

    } catch (error) {
      this.logger.warn('WeChat Pay MCP health check failed', error);
      return false;
    }
  }

  // ============= 私有方法 =============

  private validateConfig(config: WeChatMCPConfig): void {
    const requiredFields = ['endpoint', 'merchantId', 'apiKey', 'appId', 'mchId', 'payKey'];
    const missingFields = requiredFields.filter(field => !config[field as keyof WeChatMCPConfig]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required WeChat Pay MCP config fields: ${missingFields.join(', ')}`);
    }

    if (config.signType === 'RSA2' && !config.privateKey) {
      throw new Error('Private key is required for RSA2 signature');
    }
  }

  private async validateConnection(): Promise<void> {
    // 简单的连接测试
    try {
      const testUrl = `${this.config!.endpoint}/health`;
      await fetch(testUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
    } catch (error) {
      throw new Error(`Cannot connect to WeChat Pay MCP endpoint: ${error.message}`);
    }
  }

  private buildWeChatPaymentRequest(request: MCPPaymentRequest): WeChatMCPPaymentRequest {
    const baseRequest = mcpRequestBuilder.buildBaseRequest(this.config!.merchantId);
    
    return {
      ...baseRequest,
      ...request,
      // 微信支付特定字段
      openid: request.extraParams?.openid,
      sceneInfo: request.extraParams?.sceneInfo
    };
  }

  private transformPaymentResponse(data: any, paymentType: string): MCPPaymentResponse {
    const response: MCPPaymentResponse = {
      paymentId: data.paymentId || data.prepayId,
      outTradeNo: data.outTradeNo,
      status: 'created'
    };

    // 根据支付类型设置相应的支付参数
    switch (paymentType) {
      case 'h5':
        response.paymentUrl = data.mwebUrl || data.paymentUrl;
        break;
      case 'qr':
        response.qrCode = data.qrCode || data.codeUrl;
        break;
      case 'jsapi':
        response.jsapiParams = {
          appId: data.appId,
          timeStamp: data.timeStamp,
          nonceStr: data.nonceStr,
          package: data.package,
          signType: data.signType,
          paySign: data.paySign
        };
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
      paymentId: data.paymentId || data.transactionId,
      status: MCPStatusMapper.mapPaymentStatus(data.tradeState || data.status, 'wechat'),
      totalAmount: data.totalFee || data.totalAmount,
      paidAmount: data.cashFee || data.paidAmount,
      paidTime: data.timeEnd || data.paidTime,
      paymentMethod: 'wechat',
      transactionId: data.transactionId,
      buyerInfo: data.buyerInfo ? {
        buyerId: data.buyerInfo.openid,
        buyerName: data.buyerInfo.nickname
      } : undefined
    };
  }

  private verifyResponseSignature(response: MCPResponse<any>): boolean {
    if (!this.config?.publicKey && !this.config?.payKey) {
      this.logger.warn('No public key configured for signature verification');
      return true; // 如果没有配置公钥，跳过验证
    }

    return mcpSignatureService.verify(
      response,
      response.signature!,
      this.config.publicKey || this.config.payKey,
      this.config.signType
    );
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      throw new WeChatPayMCPError(
        'WeChat Pay MCP client not initialized',
        'NOT_INITIALIZED'
      );
    }
  }
}

// ============= 导出 =============

export default WeChatPayMCPClient;
