/**
 * 智游助手v6.2 - 统一支付网关
 * 使用特性开关模式替代代码注释，支持动态启用/禁用支付功能
 * 遵循原则: [SOLID-单一职责] + [策略模式] + [为失败而设计]
 *
 * 核心功能:
 * 1. 整合微信支付和支付宝支付
 * 2. 统一支付接口
 * 3. 支付数据加密存储
 * 4. 支付状态管理
 * 5. 特性开关控制
 */

import { featureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

// 条件导入 - 仅在相应特性启用时导入
// import { WeChatPayMCPClient } from './wechat-pay-mcp-client';
// import { AlipayClient } from './alipay-client';
// import { encryptionService } from '../security/encryption-service';

export interface PaymentGatewayConfig {
  wechat: {
    appId: string;
    mchId: string;
    apiKey: string;
    certPath?: string;
    keyPath?: string;
  };
  alipay: {
    appId: string;
    privateKey: string;
    publicKey: string;
    gateway: string;
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
  };
}

export interface UnifiedPaymentRequest {
  amount: number;
  description: string;
  outTradeNo: string;
  paymentMethod: 'wechat' | 'alipay';
  paymentType: 'jsapi' | 'h5' | 'app' | 'native' | 'qr';
  openid?: string; // 微信支付需要
  notifyUrl?: string;
  returnUrl?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UnifiedPaymentResponse {
  success: boolean;
  paymentId: string;
  paymentUrl?: string;
  qrCode?: string;
  tradeNo?: string;
  encryptedData?: any; // 加密的支付数据
  error?: string;
  timestamp: Date;
}

export interface PaymentRecord {
  id: string;
  outTradeNo: string;
  tradeNo?: string;
  amount: number;
  description: string;
  paymentMethod: 'wechat' | 'alipay';
  paymentType: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  userId?: string;
  encryptedData: any; // 加密存储的敏感数据
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  metadata?: Record<string, any>;
}

export class PaymentGateway {
  // 临时禁用的客户端 - 使用特性开关控制
  // private wechatClient: WeChatPayMCPClient;
  // private alipayClient: AlipayClient;
  private config: PaymentGatewayConfig;
  private paymentRecords: Map<string, PaymentRecord> = new Map();

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
    // 临时禁用客户端初始化 - 使用特性开关控制
    // this.wechatClient = new WeChatPayMCPClient();
    // this.alipayClient = new AlipayClient();

    console.log('✅ 统一支付网关初始化完成 (特性开关模式)');
  }

  // ============= 统一支付接口 =============

  /**
   * 创建支付订单
   * 遵循原则: [策略模式] - 根据支付方式选择不同的处理策略
   */
  async createPayment(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    // 检查支付功能是否启用
    if (!isFeatureEnabled('PAYMENT_ENABLED')) {
      return {
        success: false,
        paymentId: '',
        error: '支付功能暂时不可用，系统正在升级中，请稍后再试',
        timestamp: new Date()
      };
    }

    try {
      // 生成支付记录ID
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 参数验证
      this.validatePaymentRequest(request);

      let result: UnifiedPaymentResponse;

      // 根据支付方式选择处理策略
      switch (request.paymentMethod) {
        case 'wechat':
          result = await this.processWeChatPayment(request, paymentId);
          break;
        case 'alipay':
          result = await this.processAlipayPayment(request, paymentId);
          break;
        default:
          throw new Error(`不支持的支付方式: ${request.paymentMethod}`);
      }

      // 创建支付记录
      if (result.success) {
        await this.createPaymentRecord(request, paymentId, result);
      }

      console.log(`✅ 支付订单创建成功: ${paymentId} (${request.paymentMethod})`);
      return result;

    } catch (error) {
      console.error('❌ 支付订单创建失败:', error);
      return {
        success: false,
        paymentId: '',
        error: `支付创建失败: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * 获取支付功能状态
   */
  getPaymentStatus(): {
    enabled: boolean;
    availableMethods: string[];
    message: string;
  } {
    const enabled = isFeatureEnabled('PAYMENT_ENABLED');
    const availableMethods = featureFlags.getAvailablePaymentMethods();

    let message = '';
    if (!enabled) {
      message = '支付功能当前已禁用，正在进行系统升级';
    } else if (availableMethods.length === 0) {
      message = '暂无可用的支付方式';
    } else {
      message = `支持 ${availableMethods.length} 种支付方式: ${availableMethods.join(', ')}`;
    }

    return {
      enabled,
      availableMethods,
      message
    };
  }

  /**
   * 检查支付功能是否完全可用
   */
  isPaymentAvailable(): boolean {
    return isFeatureEnabled('PAYMENT_ENABLED') && featureFlags.isPaymentFullyEnabled();
  }

  // ============= 微信支付处理 =============

  /**
   * 处理微信支付
   */
  private async processWeChatPayment(
    request: UnifiedPaymentRequest,
    paymentId: string
  ): Promise<UnifiedPaymentResponse> {
    // 检查微信支付是否启用
    if (!isFeatureEnabled('WECHAT_PAY_ENABLED')) {
      return {
        success: false,
        paymentId,
        error: '微信支付功能暂时不可用',
        timestamp: new Date()
      };
    }

    try {
      const wechatOrderData = {
        amount: request.amount,
        description: request.description,
        outTradeNo: request.outTradeNo,
        paymentMethod: request.paymentType as any,
        openid: request.openid,
        notifyUrl: request.notifyUrl,
        returnUrl: request.returnUrl
      };

      const wechatResult = await this.wechatClient.createOrder(wechatOrderData);

      if (!wechatResult.success) {
        throw new Error(wechatResult.error || '微信支付创建失败');
      }

      // 加密敏感数据
      let encryptedData;
      if (this.config.encryption.enabled) {
        encryptedData = await encryptionService.encryptPaymentData({
          paymentMethod: 'wechat',
          wechatData: wechatResult,
          timestamp: new Date()
        });
      }

      return {
        success: true,
        paymentId,
        paymentUrl: wechatResult.paymentUrl,
        qrCode: wechatResult.qrCode,
        tradeNo: wechatResult.prepayId,
        encryptedData,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`微信支付处理失败: ${error.message}`);
    }
  }

  // ============= 支付宝支付处理 =============

  /**
   * 处理支付宝支付
   */
  private async processAlipayPayment(
    request: UnifiedPaymentRequest,
    paymentId: string
  ): Promise<UnifiedPaymentResponse> {
    // 检查支付宝支付是否启用
    if (!isFeatureEnabled('ALIPAY_ENABLED')) {
      return {
        success: false,
        paymentId,
        error: '支付宝支付功能暂时不可用',
        timestamp: new Date()
      };
    }

    try {
      const alipayOrderData = {
        outTradeNo: request.outTradeNo,
        totalAmount: (request.amount / 100).toFixed(2), // 转换为元
        subject: request.description,
        productCode: request.paymentType === 'qr' ? 'FACE_TO_FACE_PAYMENT' : 'QUICK_WAP_WAY',
        notifyUrl: request.notifyUrl,
        returnUrl: request.returnUrl
      };

      let alipayResult;
      if (request.paymentType === 'qr') {
        alipayResult = await this.alipayClient.createQRPayment(alipayOrderData);
      } else {
        alipayResult = await this.alipayClient.createMobilePayment(alipayOrderData);
      }

      if (!alipayResult.success) {
        throw new Error(alipayResult.error || '支付宝支付创建失败');
      }

      // 加密敏感数据
      let encryptedData;
      if (this.config.encryption.enabled) {
        encryptedData = await encryptionService.encryptPaymentData({
          paymentMethod: 'alipay',
          alipayData: alipayResult,
          timestamp: new Date()
        });
      }

      return {
        success: true,
        paymentId,
        paymentUrl: alipayResult.paymentUrl,
        qrCode: alipayResult.qrCode,
        tradeNo: alipayResult.tradeNo,
        encryptedData,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`支付宝支付处理失败: ${error.message}`);
    }
  }

  // ============= 支付查询功能 =============

  /**
   * 查询支付状态
   */
  async queryPayment(outTradeNo: string, paymentMethod?: 'wechat' | 'alipay'): Promise<any> {
    try {
      // 从记录中获取支付方式
      const record = this.getPaymentRecord(outTradeNo);
      const method = paymentMethod || record?.paymentMethod;

      if (!method) {
        throw new Error('无法确定支付方式');
      }

      let result;
      switch (method) {
        case 'wechat':
          result = await this.wechatClient.queryOrder(outTradeNo);
          break;
        case 'alipay':
//           result = await this.alipayClient.queryPayment( // 临时禁用outTradeNo);
          break;
        default:
          throw new Error(`不支持的支付方式: ${method}`);
      }

      // 更新支付记录状态
      if (record && result.success) {
        this.updatePaymentStatus(outTradeNo, this.mapTradeStatus(result.tradeStatus));
      }

      return result;

    } catch (error) {
      console.error('❌ 支付查询失败:', error);
      throw error;
    }
  }

  // ============= 退款功能 =============

  /**
   * 申请退款
   */
  async refund(outTradeNo: string, refundAmount: number, refundReason?: string): Promise<any> {
    try {
      const record = this.getPaymentRecord(outTradeNo);
      if (!record) {
        throw new Error('支付记录不存在');
      }

      if (record.status !== 'paid') {
        throw new Error('只能对已支付订单申请退款');
      }

      let result;
      switch (record.paymentMethod) {
        case 'wechat':
          // 微信退款逻辑（需要实现）
          throw new Error('微信退款功能待实现');
        case 'alipay':
          result = await this.alipayClient.refund({
            outTradeNo,
            refundAmount: (refundAmount / 100).toFixed(2),
            refundReason: refundReason || '用户申请退款'
          });
          break;
        default:
          throw new Error(`不支持的支付方式: ${record.paymentMethod}`);
      }

      // 更新支付记录状态
      if (result.success) {
        this.updatePaymentStatus(outTradeNo, 'refunded');
      }

      return result;

    } catch (error) {
      console.error('❌ 退款申请失败:', error);
      throw error;
    }
  }

  // ============= 支付记录管理 =============

  /**
   * 创建支付记录
   */
  private async createPaymentRecord(
    request: UnifiedPaymentRequest,
    paymentId: string,
    result: UnifiedPaymentResponse
  ): Promise<void> {
    try {
      const record: PaymentRecord = {
        id: paymentId,
        outTradeNo: request.outTradeNo,
        tradeNo: result.tradeNo,
        amount: request.amount,
        description: request.description,
        paymentMethod: request.paymentMethod,
        paymentType: request.paymentType,
        status: 'pending',
        userId: request.userId,
        encryptedData: result.encryptedData,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: request.metadata
      };

      this.paymentRecords.set(request.outTradeNo, record);
      console.log(`✅ 支付记录创建成功: ${paymentId}`);

    } catch (error) {
      console.error('❌ 支付记录创建失败:', error);
    }
  }

  /**
   * 获取支付记录
   */
  private getPaymentRecord(outTradeNo: string): PaymentRecord | undefined {
    return this.paymentRecords.get(outTradeNo);
  }

  /**
   * 更新支付状态
   */
  private updatePaymentStatus(outTradeNo: string, status: PaymentRecord['status']): void {
    const record = this.paymentRecords.get(outTradeNo);
    if (record) {
      record.status = status;
      record.updatedAt = new Date();
      if (status === 'paid') {
        record.paidAt = new Date();
      }
      this.paymentRecords.set(outTradeNo, record);
    }
  }

  // ============= 工具方法 =============

  /**
   * 验证支付请求参数
   */
  private validatePaymentRequest(request: UnifiedPaymentRequest): void {
    if (!request.outTradeNo) {
      throw new Error('商户订单号不能为空');
    }
    if (!request.amount || request.amount <= 0) {
      throw new Error('支付金额必须大于0');
    }
    if (!request.description) {
      throw new Error('订单描述不能为空');
    }
    if (!['wechat', 'alipay'].includes(request.paymentMethod)) {
      throw new Error('不支持的支付方式');
    }
    if (request.paymentMethod === 'wechat' && request.paymentType === 'jsapi' && !request.openid) {
      throw new Error('微信JSAPI支付需要提供openid');
    }
  }

  /**
   * 映射交易状态
   */
  private mapTradeStatus(tradeStatus: string): PaymentRecord['status'] {
    const statusMap: Record<string, PaymentRecord['status']> = {
      'TRADE_SUCCESS': 'paid',
      'TRADE_FINISHED': 'paid',
      'WAIT_BUYER_PAY': 'pending',
      'TRADE_CLOSED': 'cancelled',
      'TRADE_REFUND': 'refunded'
    };
    return statusMap[tradeStatus] || 'pending';
  }

  /**
   * 获取支付统计信息
   */
  public getPaymentStats(): {
    total: number;
    pending: number;
    paid: number;
    failed: number;
    refunded: number;
  } {
    const stats = {
      total: this.paymentRecords.size,
      pending: 0,
      paid: 0,
      failed: 0,
      refunded: 0
    };

    for (const record of this.paymentRecords.values()) {
      stats[record.status]++;
    }

    return stats;
  }
}

// ============= 单例导出 =============

const defaultConfig: PaymentGatewayConfig = {
  wechat: {
    appId: process.env.WECHAT_PAY_APP_ID || '',
    mchId: process.env.WECHAT_PAY_MCH_ID || '',
    apiKey: process.env.WECHAT_PAY_API_KEY || ''
  },
  alipay: {
    appId: process.env.ALIPAY_APP_ID || '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do'
  },
  encryption: {
    enabled: process.env.PAYMENT_ENCRYPTION_ENABLED === 'true',
    algorithm: 'aes-256-gcm'
  }
};

// 创建支付网关实例 - 使用特性开关控制
export const paymentGateway = new PaymentGateway(defaultConfig);
export default PaymentGateway;
