
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - MCP协议工具函数
 * 遵循原则: [DRY] + [单一职责] + [为失败而设计]
 * 
 * 提供MCP协议的通用工具函数：
 * 1. 请求构建器
 * 2. 签名服务
 * 3. 状态映射
 * 4. 错误处理
 */

import crypto from 'crypto';
import { 
  MCPRequest, 
  MCPPaymentRequest, 
  MCPPaymentQueryRequest,
  MCPRequestBuilder,
  MCPSignatureService,
  MCP_CONSTANTS,
  PaymentStatusMapping
} from './mcp-types';
import { Logger } from '../../utils/logger';

// ============= MCP请求构建器 =============

// // export class MCPRequestBuilderImpl // 临时禁用支付功能 // 临时禁用支付功能 implements MCPRequestBuilder {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MCPRequestBuilder');
  }

  /**
   * 构建基础MCP请求
   * 遵循原则: [单一职责] - 专门负责基础请求构建
   */
  buildBaseRequest(merchantId: string): MCPRequest {
    const requestId = this.generateRequestId();
    const timestamp = Date.now();

    return {
      version: MCP_CONSTANTS.VERSION,
      requestId,
      timestamp,
      merchantId,
      signature: '' // 将在签名时填充
    };
  }

  /**
   * 构建支付请求
   * 遵循原则: [接口隔离] - 专门的支付请求构建
   */
  buildPaymentRequest(base: MCPRequest, params: {
    outTradeNo: string;
    totalAmount: number;
    subject: string;
    paymentMethod: 'wechat' | 'alipay';
    paymentType: 'h5' | 'qr' | 'jsapi' | 'app';
    userId?: string;
    notifyUrl?: string;
    returnUrl?: string;
    extraParams?: Record<string, any>;
  }): MCPPaymentRequest {
    return {
      ...base,
      ...params
    };
  }

  /**
   * 构建查询请求
   * 遵循原则: [接口隔离] - 专门的查询请求构建
   */
  buildQueryRequest(base: MCPRequest, params: {
    outTradeNo?: string;
    paymentId?: string;
    paymentMethod: 'wechat' | 'alipay';
  }): MCPPaymentQueryRequest {
    if (!params.outTradeNo && !params.paymentId) {
      throw new Error('Either outTradeNo or paymentId must be provided');
    }

    return {
      ...base,
      ...params
    };
  }

  /**
   * 生成唯一请求ID
   * 遵循原则: [为失败而设计] - 确保请求ID唯一性
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `MCP_${timestamp}_${random}`;
  }
}

// ============= MCP签名服务 =============

// // export class MCPSignatureServiceImpl // 临时禁用支付功能 // 临时禁用支付功能 implements MCPSignatureService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MCPSignatureService');
  }

  /**
   * 生成请求签名
   * 遵循原则: [纵深防御] - 多重签名验证
   */
  sign(data: any, privateKey: string, signType: string): string {
    try {
      const signString = this.buildSignString(data);
      this.logger.debug('Sign string built', { length: signString.length });

      switch (signType.toUpperCase()) {
        case 'RSA2':
          return this.signWithRSA2(signString, privateKey);
        case 'MD5':
          return this.signWithMD5(signString, privateKey);
        default:
          throw new Error(`Unsupported sign type: ${signType}`);
      }
    } catch (error) {
      this.logger.error('Failed to generate signature', error);
      throw new Error(`Signature generation failed: ${error.message}`);
    }
  }

  /**
   * 验证响应签名
   * 遵循原则: [纵深防御] - 严格的签名验证
   */
  verify(data: any, signature: string, publicKey: string, signType: string): boolean {
    try {
      const signString = this.buildSignString(data);
      
      switch (signType.toUpperCase()) {
        case 'RSA2':
          return this.verifyWithRSA2(signString, signature, publicKey);
        case 'MD5':
          return this.verifyWithMD5(signString, signature, publicKey);
        default:
          this.logger.warn('Unsupported sign type for verification', { signType });
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to verify signature', error);
      return false;
    }
  }

  /**
   * 构建签名字符串
   * 遵循原则: [DRY] - 统一的签名字符串构建逻辑
   */
  private buildSignString(data: any): string {
    // 排除签名字段
    const { signature, ...signData } = data;
    
    // 按键名排序
    const sortedKeys = Object.keys(signData).sort();
    
    // 构建签名字符串
    const signPairs = sortedKeys
      .filter(key => signData[key] !== undefined && signData[key] !== null && signData[key] !== '')
      .map(key => `${key}=${signData[key]}`);
    
    return signPairs.join('&');
  }

  /**
   * RSA2签名
   * 遵循原则: [为失败而设计] - 详细的错误处理
   */
  private signWithRSA2(signString: string, privateKey: string): string {
    try {
      // 确保私钥格式正确
      const formattedKey = this.formatPrivateKey(privateKey);
      
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(signString, 'utf8');
      
      return sign.sign(formattedKey, 'base64');
    } catch (error) {
      throw new Error(`RSA2 signing failed: ${error.message}`);
    }
  }

  /**
   * RSA2验签
   */
  private verifyWithRSA2(signString: string, signature: string, publicKey: string): boolean {
    try {
      const formattedKey = this.formatPublicKey(publicKey);
      
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(signString, 'utf8');
      
      return verify.verify(formattedKey, signature, 'base64');
    } catch (error) {
      this.logger.error('RSA2 verification failed', error);
      return false;
    }
  }

  /**
   * MD5签名
   */
  private signWithMD5(signString: string, key: string): string {
    const signStringWithKey = `${signString}&key=${key}`;
    return crypto.createHash('md5').update(signStringWithKey, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * MD5验签
   */
  private verifyWithMD5(signString: string, signature: string, key: string): boolean {
    const expectedSignature = this.signWithMD5(signString, key);
    return expectedSignature === signature.toUpperCase();
  }

  /**
   * 格式化私钥
   */
  private formatPrivateKey(privateKey: string): string {
    if (privateKey.includes('-----BEGIN')) {
      return privateKey;
    }
    
    return `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
  }

  /**
   * 格式化公钥
   */
  private formatPublicKey(publicKey: string): string {
    if (publicKey.includes('-----BEGIN')) {
      return publicKey;
    }
    
    return `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  }
}

// ============= 状态映射工具 =============

// // export class MCPStatusMapper // 临时禁用支付功能 // 临时禁用支付功能 {
  /**
   * 映射支付状态到统一状态
   * 遵循原则: [开闭原则] - 易于扩展新的支付方式
   */
  static mapPaymentStatus(
    originalStatus: string, 
    paymentMethod: 'wechat' | 'alipay'
  ): 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' {
    const mapping = MCP_CONSTANTS.PAYMENT_STATUS[paymentMethod.toUpperCase() as 'WECHAT' | 'ALIPAY'];
    
    if (!mapping) {
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    const mappedStatus = mapping[originalStatus];
    if (!mappedStatus) {
      // 默认返回pending状态，记录警告
      console.warn(`Unknown payment status: ${originalStatus} for ${paymentMethod}`);
      return 'pending';
    }

    return mappedStatus;
  }

  /**
   * 获取支付方式的所有可能状态
   */
  static getAvailableStatuses(paymentMethod: 'wechat' | 'alipay'): string[] {
    const mapping = MCP_CONSTANTS.PAYMENT_STATUS[paymentMethod.toUpperCase() as 'WECHAT' | 'ALIPAY'];
    return Object.keys(mapping);
  }
}

// ============= HTTP客户端工具 =============

// // export class MCPHttpClient // 临时禁用支付功能 // 临时禁用支付功能 {
  private timeout: number;
  private retryCount: number;
  private logger: Logger;

  constructor(timeout = MCP_CONSTANTS.DEFAULT_TIMEOUT, retryCount = MCP_CONSTANTS.DEFAULT_RETRY_COUNT) {
    this.timeout = timeout;
    this.retryCount = retryCount;
    this.logger = new Logger('MCPHttpClient');
  }

  /**
   * 发送HTTP请求
   * 遵循原则: [为失败而设计] - 重试机制和错误处理
   */
  async request<T>(
    url: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        this.logger.debug(`HTTP request attempt ${attempt}`, { url, method });

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SmartTravel-v6.2-MCP-Client',
            ...headers
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        this.logger.debug('HTTP request successful', { url, status: response.status });
        
        return result;

      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`HTTP request attempt ${attempt} failed`, { 
          url, 
          error: error.message,
          willRetry: attempt < this.retryCount
        });

        if (attempt < this.retryCount) {
          // 指数退避
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error('All HTTP request attempts failed', { url, error: lastError.message });
    throw new Error(`HTTP request failed after ${this.retryCount} attempts: ${lastError.message}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============= 数据验证工具 =============

// // export class MCPValidator // 临时禁用支付功能 // 临时禁用支付功能 {
  /**
   * 验证支付请求参数
   * 遵循原则: [为失败而设计] - 详细的参数验证
   */
  static validatePaymentRequest(request: MCPPaymentRequest): void {
    const errors: string[] = [];

    if (!request.outTradeNo || request.outTradeNo.length === 0) {
      errors.push('outTradeNo is required');
    }

    if (!request.totalAmount || request.totalAmount <= 0) {
      errors.push('totalAmount must be greater than 0');
    }

    if (request.totalAmount > 100000000) { // 100万元限制
      errors.push('totalAmount exceeds maximum limit (100,000,000 cents)');
    }

    if (!request.subject || request.subject.length === 0) {
      errors.push('subject is required');
    }

    if (!['wechat', 'alipay'].includes(request.paymentMethod)) {
      errors.push('paymentMethod must be either "wechat" or "alipay"');
    }

    if (!['h5', 'qr', 'jsapi', 'app'].includes(request.paymentType)) {
      errors.push('paymentType must be one of: h5, qr, jsapi, app');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid payment request: ${errors.join(', ')}`);
    }
  }

  /**
   * 验证查询请求参数
   */
  static validateQueryRequest(request: MCPPaymentQueryRequest): void {
    if (!request.outTradeNo && !request.paymentId) {
      throw new Error('Either outTradeNo or paymentId must be provided');
    }

    if (!['wechat', 'alipay'].includes(request.paymentMethod)) {
      throw new Error('paymentMethod must be either "wechat" or "alipay"');
    }
  }
}

// ============= 导出实例 =============

// // export const mcpRequestBuilder // 临时禁用支付功能 // 临时禁用支付功能 = new MCPRequestBuilderImpl();
// // export const mcpSignatureService // 临时禁用支付功能 // 临时禁用支付功能 = new MCPSignatureServiceImpl();
// // export const mcpHttpClient // 临时禁用支付功能 // 临时禁用支付功能 = new MCPHttpClient();
