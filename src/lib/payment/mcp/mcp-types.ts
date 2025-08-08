
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - MCP协议类型定义
 * 遵循原则: [API优先设计] + [类型安全] + [接口隔离原则]
 * 
 * MCP (Model Context Protocol) 支付协议类型定义
 * 支持微信支付和支付宝的统一MCP接口
 */

// ============= MCP基础协议类型 =============

export interface MCPRequest {
  /** MCP协议版本 */
  version: string;
  /** 请求ID，用于追踪 */
  requestId: string;
  /** 时间戳 */
  timestamp: number;
  /** 请求签名 */
  signature: string;
  /** 商户ID */
  merchantId: string;
}

export interface MCPResponse<T = any> {
  /** 响应状态码 */
  code: string;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data?: T;
  /** 请求ID */
  requestId: string;
  /** 响应时间戳 */
  timestamp: number;
  /** 响应签名 */
  signature?: string;
}

// ============= MCP支付请求类型 =============

export interface MCPPaymentRequest extends MCPRequest {
  /** 商户订单号 */
  outTradeNo: string;
  /** 支付金额（分） */
  totalAmount: number;
  /** 商品描述 */
  subject: string;
  /** 支付方式 */
  paymentMethod: 'wechat' | 'alipay';
  /** 支付类型 */
  paymentType: 'h5' | 'qr' | 'jsapi' | 'app';
  /** 用户标识 */
  userId?: string;
  /** 回调通知URL */
  notifyUrl?: string;
  /** 同步返回URL */
  returnUrl?: string;
  /** 扩展参数 */
  extraParams?: Record<string, any>;
}

export interface MCPPaymentResponse {
  /** 支付ID */
  paymentId: string;
  /** 商户订单号 */
  outTradeNo: string;
  /** 支付URL（H5支付） */
  paymentUrl?: string;
  /** 二维码内容（扫码支付） */
  qrCode?: string;
  /** JSAPI支付参数 */
  jsapiParams?: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  };
  /** 支付状态 */
  status: 'created' | 'pending' | 'processing';
  /** 过期时间 */
  expireTime?: string;
}

// ============= MCP支付查询类型 =============

export interface MCPPaymentQueryRequest extends MCPRequest {
  /** 商户订单号 */
  outTradeNo?: string;
  /** 支付ID */
  paymentId?: string;
  /** 支付方式 */
  paymentMethod: 'wechat' | 'alipay';
}

export interface MCPPaymentQueryResponse {
  /** 商户订单号 */
  outTradeNo: string;
  /** 支付ID */
  paymentId: string;
  /** 支付状态 */
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  /** 支付金额（分） */
  totalAmount: number;
  /** 实际支付金额（分） */
  paidAmount?: number;
  /** 支付时间 */
  paidTime?: string;
  /** 支付方式 */
  paymentMethod: 'wechat' | 'alipay';
  /** 第三方交易号 */
  transactionId?: string;
  /** 买家信息 */
  buyerInfo?: {
    buyerId?: string;
    buyerName?: string;
  };
}

// ============= MCP退款类型 =============

export interface MCPRefundRequest extends MCPRequest {
  /** 原支付订单号 */
  outTradeNo: string;
  /** 退款订单号 */
  outRefundNo: string;
  /** 退款金额（分） */
  refundAmount: number;
  /** 退款原因 */
  refundReason: string;
  /** 支付方式 */
  paymentMethod: 'wechat' | 'alipay';
}

export interface MCPRefundResponse {
  /** 退款ID */
  refundId: string;
  /** 退款订单号 */
  outRefundNo: string;
  /** 退款状态 */
  status: 'processing' | 'success' | 'failed';
  /** 退款金额（分） */
  refundAmount: number;
  /** 退款时间 */
  refundTime?: string;
}

// ============= MCP回调通知类型 =============

export interface MCPNotifyRequest {
  /** 通知类型 */
  notifyType: 'payment' | 'refund';
  /** 商户订单号 */
  outTradeNo: string;
  /** 支付ID */
  paymentId: string;
  /** 支付状态 */
  status: string;
  /** 支付金额（分） */
  totalAmount: number;
  /** 支付时间 */
  paidTime?: string;
  /** 第三方交易号 */
  transactionId?: string;
  /** 签名 */
  signature: string;
  /** 时间戳 */
  timestamp: number;
  /** 扩展数据 */
  extraData?: Record<string, any>;
}

// ============= MCP错误类型 =============

export interface MCPError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 详细错误信息 */
  details?: string;
  /** 错误发生时间 */
  timestamp: number;
  /** 请求ID */
  requestId?: string;
}

// ============= MCP配置类型 =============

export interface MCPConfig {
  /** MCP服务端点 */
  endpoint: string;
  /** 商户ID */
  merchantId: string;
  /** API密钥 */
  apiKey: string;
  /** API密钥版本 */
  apiVersion: string;
  /** 是否为体验版 */
  isExperience: boolean;
  /** 超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retryCount: number;
  /** 签名算法 */
  signType: 'RSA2' | 'MD5';
  /** 私钥（RSA2签名用） */
  privateKey?: string;
  /** 公钥（验签用） */
  publicKey?: string;
}

// ============= MCP客户端接口 =============

export interface MCPClient {
  /** 初始化客户端 */
  initialize(config: MCPConfig): Promise<void>;
  
  /** 创建支付订单 */
  createPayment(request: MCPPaymentRequest): Promise<MCPResponse<MCPPaymentResponse>>;
  
  /** 查询支付状态 */
  queryPayment(request: MCPPaymentQueryRequest): Promise<MCPResponse<MCPPaymentQueryResponse>>;
  
  /** 申请退款 */
  refund(request: MCPRefundRequest): Promise<MCPResponse<MCPRefundResponse>>;
  
  /** 验证回调通知 */
  verifyNotify(notify: MCPNotifyRequest): Promise<boolean>;
  
  /** 健康检查 */
  healthCheck(): Promise<boolean>;
}

// ============= 状态映射类型 =============

export type PaymentStatusMapping = {
  [key: string]: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
};

// ============= 微信支付MCP特定类型 =============

export interface WeChatMCPConfig extends MCPConfig {
  /** 微信AppID */
  appId: string;
  /** 微信商户号 */
  mchId: string;
  /** 微信支付密钥 */
  payKey: string;
  /** 证书路径 */
  certPath?: string;
  /** 私钥路径 */
  keyPath?: string;
}

export interface WeChatMCPPaymentRequest extends MCPPaymentRequest {
  /** 微信OpenID（JSAPI支付必需） */
  openid?: string;
  /** 场景信息 */
  sceneInfo?: {
    payer_client_ip?: string;
    device_id?: string;
    store_info?: {
      id: string;
      name?: string;
      area_code?: string;
      address?: string;
    };
  };
}

// ============= 支付宝MCP特定类型 =============

export interface AlipayMCPConfig extends MCPConfig {
  /** 支付宝应用ID */
  appId: string;
  /** 支付宝网关地址 */
  gatewayUrl: string;
  /** 应用私钥 */
  appPrivateKey: string;
  /** 支付宝公钥 */
  alipayPublicKey: string;
  /** 字符集 */
  charset: string;
  /** 签名类型 */
  signType: 'RSA2';
  /** 数据格式 */
  format: 'JSON';
}

export interface AlipayMCPPaymentRequest extends MCPPaymentRequest {
  /** 销售产品码 */
  productCode: string;
  /** 商品类目 */
  goodsType?: string;
  /** 超时时间 */
  timeoutExpress?: string;
  /** 用户付款中途退出返回商户网站的地址 */
  quitUrl?: string;
}

// ============= 工具类型 =============

export interface MCPRequestBuilder {
  /** 构建基础请求 */
  buildBaseRequest(merchantId: string): MCPRequest;
  
  /** 构建支付请求 */
  buildPaymentRequest(base: MCPRequest, params: any): MCPPaymentRequest;
  
  /** 构建查询请求 */
  buildQueryRequest(base: MCPRequest, params: any): MCPPaymentQueryRequest;
}

export interface MCPSignatureService {
  /** 生成请求签名 */
  sign(data: any, privateKey: string, signType: string): string;
  
  /** 验证响应签名 */
  verify(data: any, signature: string, publicKey: string, signType: string): boolean;
}

// ============= 常量定义 =============

export const MCP_CONSTANTS = {
  /** MCP协议版本 */
  VERSION: '1.0',
  
  /** 默认超时时间 */
  DEFAULT_TIMEOUT: 30000,
  
  /** 默认重试次数 */
  DEFAULT_RETRY_COUNT: 3,
  
  /** 支付状态映射 */
  PAYMENT_STATUS: {
    WECHAT: {
      'SUCCESS': 'paid',
      'REFUND': 'refunded',
      'NOTPAY': 'pending',
      'CLOSED': 'cancelled',
      'REVOKED': 'cancelled',
      'USERPAYING': 'pending',
      'PAYERROR': 'failed'
    } as PaymentStatusMapping,
    
    ALIPAY: {
      'TRADE_SUCCESS': 'paid',
      'TRADE_FINISHED': 'paid',
      'WAIT_BUYER_PAY': 'pending',
      'TRADE_CLOSED': 'cancelled',
      'TRADE_CANCELLED': 'cancelled'
    } as PaymentStatusMapping
  },
  
  /** 错误码 */
  ERROR_CODES: {
    INVALID_REQUEST: 'INVALID_REQUEST',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  }
} as const;
