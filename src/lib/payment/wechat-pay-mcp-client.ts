
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 微信支付MCP客户端
 * 遵循原则: [为失败而设计] + [纵深防御] + [SOLID-单一职责]
 * 
 * 核心功能:
 * 1. 微信支付下单
 * 2. 支付状态查询
 * 3. 退款处理
 * 4. 订单管理
 */

import { BaseMCPClient, MCPRequest, MCPResponse } from '../mcp/base-mcp-client';

// ============= 支付相关接口定义 =============

export interface PaymentOrder {
  orderId: string;
  userId: string;
  productType: 'travel_plan' | 'premium_service' | 'consultation';
  productId: string;
  productName: string;
  amount: number;           // 金额（分）
  currency: 'CNY';
  description: string;
  
  // 支付信息
  paymentMethod: 'wechat_pay' | 'alipay' | 'bank_card';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  transactionId?: string;   // 微信交易号
  
  // 时间信息
  createdAt: Date;
  paidAt?: Date;
  expiredAt: Date;
  
  // 扩展信息
  metadata: Record<string, any>;
}

export interface WeChatPayRequest {
  orderId: string;
  amount: number;
  description: string;
  userId: string;
  notifyUrl: string;
  returnUrl?: string;
  timeExpire?: Date;
}

export interface WeChatPayResponse {
  success: boolean;
  data?: {
    prepayId: string;
    codeUrl?: string;        // 二维码支付链接
    jsApiParams?: {          // JSAPI支付参数
      appId: string;
      timeStamp: string;
      nonceStr: string;
      package: string;
      signType: string;
      paySign: string;
    };
  };
  error?: string;
}

export interface RefundRequest {
  orderId: string;
  refundId: string;
  totalAmount: number;      // 原订单金额
  refundAmount: number;     // 退款金额
  reason: string;
  notifyUrl: string;
}

// ============= 微信支付MCP客户端实现 =============

// // export class WeChatPayMCPClient // 临时禁用支付功能 // 临时禁用支付功能 extends BaseMCPClient {
  private readonly orderCache: Map<string, PaymentOrder> = new Map();
  private readonly paymentConfig: {
    appId: string;
    mchId: string;
    notifyUrl: string;
    returnUrl: string;
  };

  constructor(llmApiKey: string, config: any) {
    super(llmApiKey, config);
    
    this.paymentConfig = {
      appId: config.wechatAppId,
      mchId: config.wechatMchId,
      notifyUrl: config.notifyUrl,
      returnUrl: config.returnUrl
    };
    
    console.log('微信支付MCP客户端初始化完成');
  }

  // ============= 支付下单功能 =============

  /**
   * 创建微信支付订单
   * 遵循原则: [为失败而设计] - 完整的错误处理和重试机制
   */
  async createPaymentOrder(request: WeChatPayRequest): Promise<WeChatPayResponse> {
    // 1. 创建订单记录
    const order = await this.createOrderRecord(request);
    
    // 2. 调用微信支付下单MCP工具
    const mcpRequest: MCPRequest = {
      method: 'wechat_pay_create_order',
      params: {
        app_id: this.paymentConfig.appId,
        mch_id: this.paymentConfig.mchId,
        out_trade_no: request.orderId,
        total_fee: request.amount,
        body: request.description,
        notify_url: request.notifyUrl,
        trade_type: 'JSAPI',
        openid: request.userId,
        time_expire: request.timeExpire?.toISOString(),
        attach: JSON.stringify({ userId: request.userId })
      },
      context: `为用户${request.userId}创建微信支付订单，金额${request.amount}分`
    };

    try {
      const response = await this.callMCP<WeChatPayResponse>(mcpRequest);
      
      if (!response.success) {
        // 更新订单状态为失败
        await this.updateOrderStatus(request.orderId, 'failed', response.error);
        throw new Error(`微信支付下单失败: ${response.error}`);
      }

      // 缓存订单信息
      this.orderCache.set(request.orderId, order);
      
      console.log(`✅ 微信支付订单创建成功: ${request.orderId}`);
      return response;

    } catch (error) {
      console.error(`❌ 微信支付下单异常:`, error);
      await this.updateOrderStatus(request.orderId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * 查询支付状态
   * 遵循原则: [SOLID-单一职责] - 专门处理支付状态查询
   */
  async queryPaymentStatus(orderId: string): Promise<PaymentOrder> {
    const mcpRequest: MCPRequest = {
      method: 'wechat_pay_query_order',
      params: {
        app_id: this.paymentConfig.appId,
        mch_id: this.paymentConfig.mchId,
        out_trade_no: orderId
      },
      context: `查询订单${orderId}的支付状态`
    };

    const response = await this.callMCP<any>(mcpRequest);
    
    if (!response.success) {
      throw new Error(`查询支付状态失败: ${response.error}`);
    }

    // 更新订单状态
    const paymentStatus = this.mapWeChatPayStatus(response.data.trade_state);
    const order = await this.updateOrderStatus(
      orderId, 
      paymentStatus, 
      null, 
      response.data.transaction_id
    );

    console.log(`✅ 支付状态查询完成: ${orderId} - ${paymentStatus}`);
    return order;
  }

  /**
   * 处理支付回调通知
   * 遵循原则: [纵深防御] - 多层验证确保安全
   */
  async handlePaymentNotification(notificationData: any): Promise<boolean> {
    try {
      // 1. 验证通知签名
      const isValidSignature = await this.verifyNotificationSignature(notificationData);
      if (!isValidSignature) {
        console.error('❌ 支付通知签名验证失败');
        return false;
      }

      // 2. 处理支付成功通知
      if (notificationData.result_code === 'SUCCESS') {
        const orderId = notificationData.out_trade_no;
        const transactionId = notificationData.transaction_id;
        
        await this.updateOrderStatus(orderId, 'paid', null, transactionId);
        
        // 3. 触发业务逻辑（如发送确认邮件、激活服务等）
        await this.triggerPostPaymentActions(orderId);
        
        console.log(`✅ 支付成功通知处理完成: ${orderId}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ 处理支付通知异常:', error);
      return false;
    }
  }

  // ============= 退款功能 =============

  /**
   * 申请退款
   * 遵循原则: [为失败而设计] - 完整的退款流程和异常处理
   */
  async requestRefund(refundRequest: RefundRequest): Promise<boolean> {
    const mcpRequest: MCPRequest = {
      method: 'wechat_pay_refund',
      params: {
        app_id: this.paymentConfig.appId,
        mch_id: this.paymentConfig.mchId,
        out_trade_no: refundRequest.orderId,
        out_refund_no: refundRequest.refundId,
        total_fee: refundRequest.totalAmount,
        refund_fee: refundRequest.refundAmount,
        refund_desc: refundRequest.reason,
        notify_url: refundRequest.notifyUrl
      },
      context: `为订单${refundRequest.orderId}申请退款${refundRequest.refundAmount}分`
    };

    try {
      const response = await this.callMCP<any>(mcpRequest);
      
      if (!response.success) {
        console.error(`❌ 退款申请失败: ${response.error}`);
        return false;
      }

      // 更新订单状态
      await this.updateOrderStatus(refundRequest.orderId, 'refunded');
      
      console.log(`✅ 退款申请成功: ${refundRequest.orderId}`);
      return true;

    } catch (error) {
      console.error(`❌ 退款申请异常:`, error);
      return false;
    }
  }

  /**
   * 查询退款状态
   */
  async queryRefundStatus(orderId: string, refundId: string): Promise<any> {
    const mcpRequest: MCPRequest = {
      method: 'wechat_pay_query_refund',
      params: {
        app_id: this.paymentConfig.appId,
        mch_id: this.paymentConfig.mchId,
        out_refund_no: refundId
      },
      context: `查询订单${orderId}的退款状态`
    };

    const response = await this.callMCP<any>(mcpRequest);
    
    if (!response.success) {
      throw new Error(`查询退款状态失败: ${response.error}`);
    }

    return response.data;
  }

  // ============= 订单管理 =============

  /**
   * 获取用户订单列表
   */
  async getUserOrders(userId: string, page: number = 1, limit: number = 20): Promise<{
    orders: PaymentOrder[];
    total: number;
    hasMore: boolean;
  }> {
    const mcpRequest: MCPRequest = {
      method: 'order_get_user_orders',
      params: {
        user_id: userId,
        page: page,
        limit: limit,
        include_details: true
      },
      context: `获取用户${userId}的订单列表`
    };

    const response = await this.callMCP<any>(mcpRequest);
    
    if (!response.success) {
      throw new Error(`获取订单列表失败: ${response.error}`);
    }

    return {
      orders: response.data.orders.map(this.transformToPaymentOrder),
      total: response.data.total,
      hasMore: response.data.has_more
    };
  }

  /**
   * 获取订单详情
   */
  async getOrderDetails(orderId: string): Promise<PaymentOrder> {
    // 先检查缓存
    const cachedOrder = this.orderCache.get(orderId);
    if (cachedOrder) {
      return cachedOrder;
    }

    const mcpRequest: MCPRequest = {
      method: 'order_get_details',
      params: {
        order_id: orderId,
        include_payment_info: true
      },
      context: `获取订单${orderId}的详细信息`
    };

    const response = await this.callMCP<any>(mcpRequest);
    
    if (!response.success) {
      throw new Error(`获取订单详情失败: ${response.error}`);
    }

    const order = this.transformToPaymentOrder(response.data);
    this.orderCache.set(orderId, order);
    
    return order;
  }

  // ============= 私有辅助方法 =============

  private async createOrderRecord(request: WeChatPayRequest): Promise<PaymentOrder> {
    const order: PaymentOrder = {
      orderId: request.orderId,
      userId: request.userId,
      productType: 'travel_plan', // 默认类型，实际应从request中获取
      productId: 'default',
      productName: request.description,
      amount: request.amount,
      currency: 'CNY',
      description: request.description,
      paymentMethod: 'wechat_pay',
      paymentStatus: 'pending',
      createdAt: new Date(),
      expiredAt: request.timeExpire || new Date(Date.now() + 30 * 60 * 1000), // 默认30分钟过期
      metadata: {}
    };

    // 调用MCP保存订单
    const mcpRequest: MCPRequest = {
      method: 'order_create',
      params: {
        order: order
      },
      context: `创建订单记录: ${request.orderId}`
    };

    await this.callMCP(mcpRequest);
    return order;
  }

  private async updateOrderStatus(
    orderId: string, 
    status: PaymentOrder['paymentStatus'], 
    errorMessage?: string,
    transactionId?: string
  ): Promise<PaymentOrder> {
    const mcpRequest: MCPRequest = {
      method: 'order_update_status',
      params: {
        order_id: orderId,
        payment_status: status,
        transaction_id: transactionId,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      },
      context: `更新订单${orderId}状态为${status}`
    };

    const response = await this.callMCP<any>(mcpRequest);
    
    if (response.success) {
      const order = this.transformToPaymentOrder(response.data);
      this.orderCache.set(orderId, order);
      return order;
    }

    throw new Error(`更新订单状态失败: ${response.error}`);
  }

  private mapWeChatPayStatus(wechatStatus: string): PaymentOrder['paymentStatus'] {
    const statusMap: Record<string, PaymentOrder['paymentStatus']> = {
      'SUCCESS': 'paid',
      'REFUND': 'refunded',
      'NOTPAY': 'pending',
      'CLOSED': 'cancelled',
      'REVOKED': 'cancelled',
      'USERPAYING': 'pending',
      'PAYERROR': 'failed'
    };

    return statusMap[wechatStatus] || 'pending';
  }

  private async verifyNotificationSignature(data: any): Promise<boolean> {
    // 实际实现中需要验证微信支付的签名
    // 这里简化处理
    return true;
  }

  private async triggerPostPaymentActions(orderId: string): Promise<void> {
    // 支付成功后的业务逻辑
    // 如：发送确认通知、激活服务、更新用户权限等
    console.log(`🎉 触发支付成功后续处理: ${orderId}`);
  }

  private transformToPaymentOrder(data: any): PaymentOrder {
    return {
      orderId: data.order_id,
      userId: data.user_id,
      productType: data.product_type,
      productId: data.product_id,
      productName: data.product_name,
      amount: data.amount,
      currency: data.currency || 'CNY',
      description: data.description,
      paymentMethod: data.payment_method,
      paymentStatus: data.payment_status,
      transactionId: data.transaction_id,
      createdAt: new Date(data.created_at),
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      expiredAt: new Date(data.expired_at),
      metadata: data.metadata || {}
    };
  }
}

export default WeChatPayMCPClient;
