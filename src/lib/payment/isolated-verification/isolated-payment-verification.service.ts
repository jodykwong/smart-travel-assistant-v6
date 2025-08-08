
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 隔离式支付验证服务
 * 核心特性: 完全不依赖用户输入，只处理结构化数据
 * 遵循原则: [输入隔离] + [结构化验证] + [传统后端逻辑]
 */

import { IAuditLogger, IEncryptionService } from '../../security/interfaces/security.interfaces';

// ============= 结构化数据接口定义 =============

export interface StructuredPaymentVerificationInput {
  readonly orderId: string;
  readonly expectedAmount: number;
  readonly userId: string;
  readonly providerId: 'wechat' | 'alipay';
  readonly transactionId?: string;
  readonly verificationTimestamp: number;
  readonly sourceNodeId: string; // 来源节点标识
  readonly dataIntegrity: string; // 数据完整性校验
}

export interface PaymentVerificationResult {
  readonly verified: boolean;
  readonly actualAmount: number;
  readonly paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  readonly verificationTime: Date;
  readonly verificationMethod: 'BACKEND_QUERY' | 'CALLBACK_VERIFIED';
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly transactionId?: string;
  readonly providerResponse?: any;
}

export interface StructuredOrderData {
  readonly orderId: string;
  readonly amount: number;
  readonly userId: string;
  readonly description: string;
  readonly createdAt: Date;
  readonly dataIntegrity: string;
}

export interface StructuredPaymentData {
  readonly orderId: string;
  readonly expectedAmount: number;
  readonly userId: string;
  readonly providerId: 'wechat' | 'alipay';
  readonly transactionId?: string;
  readonly paymentUrl?: string;
  readonly createdAt: Date;
  readonly sourceNodeId: string;
  readonly dataIntegrity: string;
}

// ============= 支付提供商配置接口 =============

export interface PaymentProviderConfig {
  wechat: {
    appId: string;
    mchId: string;
    apiKey: string;
    apiUrl: string;
  };
  alipay: {
    appId: string;
    merchantId: string;
    privateKey: string;
    apiUrl: string;
  };
}

/**
 * 隔离式支付验证服务实现
 */
export class IsolatedPaymentVerificationService {
  constructor(
    private auditLogger: IAuditLogger,
    private encryptionService: IEncryptionService,
    private paymentConfig: PaymentProviderConfig
  ) {
    console.log('🔒 隔离式支付验证服务初始化完成');
  }

  /**
   * 执行隔离式支付验证
   * 输入: 来源于前置节点的结构化数据
   * 输出: 结构化验证结果
   * 特点: 完全不涉及用户输入或LLM推理
   */
  async verifyPaymentIsolated(
    input: StructuredPaymentVerificationInput
  ): Promise<PaymentVerificationResult> {
    
    // 第一步: 验证输入数据完整性（防止数据被篡改）
    await this.validateDataIntegrity(input);
    
    // 第二步: 记录验证开始
    await this.auditLogger.logPaymentEvent({
      eventType: 'PAYMENT_VERIFICATION_STARTED',
      eventCategory: 'PAYMENT',
      severity: 'INFO',
      orderId: input.orderId,
      userId: input.userId,
      details: {
        sourceNode: input.sourceNodeId,
        method: 'ISOLATED_VERIFICATION',
        providerId: input.providerId
      },
      result: 'SUCCESS'
    });

    try {
      // 第三步: 直接查询支付提供商API（绕过LLM）
      const backendResult = await this.queryPaymentProviderDirectly(input);
      
      // 第四步: 传统后端逻辑验证
      const verificationResult = await this.performBackendVerification(input, backendResult);
      
      // 第五步: 记录验证结果
      await this.auditLogger.logPaymentEvent({
        eventType: 'PAYMENT_VERIFICATION_COMPLETED',
        eventCategory: 'PAYMENT',
        severity: verificationResult.verified ? 'INFO' : 'HIGH',
        orderId: input.orderId,
        userId: input.userId,
        amount: verificationResult.actualAmount,
        provider: input.providerId,
        transactionId: verificationResult.transactionId,
        details: {
          verified: verificationResult.verified,
          method: 'BACKEND_VERIFICATION',
          verificationTime: verificationResult.verificationTime,
          errorCode: verificationResult.errorCode
        },
        result: verificationResult.verified ? 'SUCCESS' : 'FAILURE'
      });

      return verificationResult;

    } catch (error) {
      // 验证失败处理
      await this.auditLogger.logSecurityEvent({
        eventType: 'PAYMENT_VERIFICATION_FAILED',
        eventCategory: 'SECURITY',
        severity: 'HIGH',
        userId: input.userId,
        details: {
          orderId: input.orderId,
          providerId: input.providerId,
          error: error.message,
          sourceNode: input.sourceNodeId
        },
        threatLevel: 'HIGH'
      });

      return {
        verified: false,
        actualAmount: 0,
        paymentStatus: 'FAILED',
        verificationTime: new Date(),
        verificationMethod: 'BACKEND_QUERY',
        errorCode: 'VERIFICATION_ERROR',
        errorMessage: error.message
      };
    }
  }

  /**
   * 直接查询支付提供商API
   * 特点: 绕过MCP和LLM，直接调用支付API
   */
  private async queryPaymentProviderDirectly(
    input: StructuredPaymentVerificationInput
  ): Promise<any> {
    
    console.log(`🔍 直接查询${input.providerId}支付状态: ${input.orderId}`);
    
    switch (input.providerId) {
      case 'wechat':
        return await this.queryWeChatPayDirect(input.orderId);
      case 'alipay':
        return await this.queryAlipayDirect(input.orderId);
      default:
        throw new Error(`不支持的支付提供商: ${input.providerId}`);
    }
  }

  /**
   * 直接查询微信支付API
   * 使用传统HTTP API，不经过MCP
   */
  private async queryWeChatPayDirect(orderId: string): Promise<any> {
    const config = this.paymentConfig.wechat;
    
    // 构造微信支付查询请求
    const queryData = {
      appid: config.appId,
      mch_id: config.mchId,
      out_trade_no: orderId,
      nonce_str: this.generateNonce(),
    };
    
    // 生成签名
    const signString = this.buildWeChatSignString(queryData, config.apiKey);
    queryData['sign'] = await this.encryptionService.hash(signString, 'md5');
    
    try {
      // 直接调用微信支付API
      const response = await fetch(`${config.apiUrl}/pay/orderquery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'User-Agent': 'SmartTravel-v6.2'
        },
        body: this.buildXmlRequest(queryData),
        timeout: 10000 // 10秒超时
      });
      
      if (!response.ok) {
        throw new Error(`微信支付API请求失败: ${response.status}`);
      }
      
      const xmlResult = await response.text();
      return this.parseWeChatPayResponse(xmlResult);
      
    } catch (error) {
      console.error('❌ 微信支付API查询失败:', error);
      throw new Error(`微信支付查询失败: ${error.message}`);
    }
  }

  /**
   * 直接查询支付宝API
   * 使用传统HTTP API，不经过MCP
   */
  private async queryAlipayDirect(orderId: string): Promise<any> {
    const config = this.paymentConfig.alipay;
    
    // 构造支付宝查询请求
    const queryParams = {
      app_id: config.appId,
      method: 'alipay.trade.query',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      version: '1.0',
      biz_content: JSON.stringify({
        out_trade_no: orderId
      })
    };
    
    // 生成签名
    const signString = this.buildAlipaySignString(queryParams);
    queryParams['sign'] = await this.signWithRSA(signString, config.privateKey);
    
    try {
      // 直接调用支付宝API
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SmartTravel-v6.2'
        },
        body: new URLSearchParams(queryParams),
        timeout: 10000 // 10秒超时
      });
      
      if (!response.ok) {
        throw new Error(`支付宝API请求失败: ${response.status}`);
      }
      
      const jsonResult = await response.json();
      return jsonResult.alipay_trade_query_response;
      
    } catch (error) {
      console.error('❌ 支付宝API查询失败:', error);
      throw new Error(`支付宝查询失败: ${error.message}`);
    }
  }

  /**
   * 传统后端验证逻辑
   * 特点: 纯逻辑判断，不依赖LLM
   */
  private async performBackendVerification(
    input: StructuredPaymentVerificationInput,
    providerResult: any
  ): Promise<PaymentVerificationResult> {
    
    // 验证订单ID匹配
    if (providerResult.out_trade_no !== input.orderId) {
      return {
        verified: false,
        actualAmount: 0,
        paymentStatus: 'FAILED',
        verificationTime: new Date(),
        verificationMethod: 'BACKEND_QUERY',
        errorCode: 'ORDER_ID_MISMATCH',
        errorMessage: '订单ID不匹配',
        providerResponse: providerResult
      };
    }

    // 验证金额匹配
    const actualAmount = this.parseAmount(providerResult.total_fee || providerResult.total_amount);
    if (Math.abs(actualAmount - input.expectedAmount) > 1) { // 允许1分的误差
      return {
        verified: false,
        actualAmount,
        paymentStatus: 'FAILED',
        verificationTime: new Date(),
        verificationMethod: 'BACKEND_QUERY',
        errorCode: 'AMOUNT_MISMATCH',
        errorMessage: `金额不匹配: 期望${input.expectedAmount}分，实际${actualAmount}分`,
        providerResponse: providerResult
      };
    }

    // 验证支付状态
    const paymentStatus = this.mapProviderStatus(providerResult.trade_state || providerResult.trade_status);
    const verified = paymentStatus === 'PAID';

    return {
      verified,
      actualAmount,
      paymentStatus,
      verificationTime: new Date(),
      verificationMethod: 'BACKEND_QUERY',
      transactionId: providerResult.transaction_id || providerResult.trade_no,
      providerResponse: providerResult
    };
  }

  /**
   * 验证数据完整性
   * 确保输入数据未被篡改
   */
  private async validateDataIntegrity(input: StructuredPaymentVerificationInput): Promise<void> {
    const expectedHash = await this.calculateDataHash({
      orderId: input.orderId,
      expectedAmount: input.expectedAmount,
      userId: input.userId,
      providerId: input.providerId,
      sourceNodeId: input.sourceNodeId
    });

    if (expectedHash !== input.dataIntegrity) {
      throw new Error('数据完整性验证失败');
    }
  }

  // ============= 辅助方法 =============

  private parseAmount(amountStr: string | number): number {
    if (typeof amountStr === 'number') return amountStr;
    if (typeof amountStr === 'string') {
      // 支付宝返回的是元，需要转换为分
      if (amountStr.includes('.')) {
        return Math.round(parseFloat(amountStr) * 100);
      }
      return parseInt(amountStr);
    }
    return 0;
  }

  private mapProviderStatus(status: string): 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' {
    const statusMap: Record<string, 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'> = {
      // 微信支付状态
      'SUCCESS': 'PAID',
      'REFUND': 'PAID',
      'NOTPAY': 'PENDING',
      'CLOSED': 'CANCELLED',
      'REVOKED': 'CANCELLED',
      'USERPAYING': 'PENDING',
      'PAYERROR': 'FAILED',
      
      // 支付宝状态
      'TRADE_SUCCESS': 'PAID',
      'TRADE_FINISHED': 'PAID',
      'WAIT_BUYER_PAY': 'PENDING',
      'TRADE_CLOSED': 'CANCELLED'
    };

    return statusMap[status] || 'FAILED';
  }

  private async calculateDataHash(data: any): Promise<string> {
    const sortedKeys = Object.keys(data).sort();
    const hashInput = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    return await this.encryptionService.hash(hashInput, 'sha256');
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private buildWeChatSignString(data: any, apiKey: string): string {
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    return `${signString}&key=${apiKey}`;
  }

  private buildAlipaySignString(data: any): string {
    const sortedKeys = Object.keys(data).filter(key => key !== 'sign').sort();
    return sortedKeys.map(key => `${key}=${data[key]}`).join('&');
  }

  private buildXmlRequest(data: any): string {
    let xml = '<xml>';
    for (const [key, value] of Object.entries(data)) {
      xml += `<${key}>${value}</${key}>`;
    }
    xml += '</xml>';
    return xml;
  }

  private parseWeChatPayResponse(xml: string): any {
    // 简化的XML解析，生产环境建议使用专业的XML解析库
    const result: any = {};
    const regex = /<(\w+)>([^<]*)<\/\1>/g;
    let match;
    
    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2];
    }
    
    return result;
  }

  private async signWithRSA(data: string, privateKey: string): Promise<string> {
    // 这里应该使用RSA私钥签名，简化实现
    return await this.encryptionService.sign(data, privateKey);
  }
}
