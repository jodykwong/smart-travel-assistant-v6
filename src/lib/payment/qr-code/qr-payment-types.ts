
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 二维码支付类型定义
 * 遵循原则: [API优先设计] + [接口隔离原则] + [开闭原则]
 * 
 * 设计理念：
 * 1. 与MCP架构保持接口一致性，便于未来升级
 * 2. 支持多种收款码类型（微信、支付宝个人码）
 * 3. 完整的订单状态管理和支付验证流程
 */

// ============= 二维码支付基础类型 =============

export interface QRPaymentConfig {
  /** 收款码类型 */
  type: 'wechat_personal' | 'alipay_personal' | 'unified_qr';
  /** 收款码URL或base64数据 */
  qrCodeData: string;
  /** 收款人信息 */
  payeeInfo: {
    name: string;
    account: string;
    avatar?: string;
  };
  /** 是否启用 */
  enabled: boolean;
  /** 单笔限额（分） */
  maxAmount: number;
  /** 日限额（分） */
  dailyLimit: number;
  /** 备注模板 */
  remarkTemplate: string;
}

export interface QRPaymentRequest {
  /** 订单ID */
  orderId: string;
  /** 支付金额（分） */
  amount: number;
  /** 商品描述 */
  description: string;
  /** 用户ID */
  userId: string;
  /** 收款码类型 */
  qrType: 'wechat_personal' | 'alipay_personal';
  /** 支付备注（用于订单匹配） */
  paymentRemark: string;
  /** 过期时间（分钟） */
  expireMinutes: number;
  /** 回调URL */
  callbackUrl?: string;
  /** 扩展参数 */
  metadata?: Record<string, any>;
}

export interface QRPaymentResponse {
  /** 是否成功 */
  success: boolean;
  /** 支付订单ID */
  paymentOrderId: string;
  /** 商户订单ID */
  outTradeNo: string;
  /** 收款二维码数据 */
  qrCodeData: string;
  /** 收款二维码图片URL */
  qrCodeImageUrl: string;
  /** 支付金额 */
  amount: number;
  /** 支付备注 */
  paymentRemark: string;
  /** 收款人信息 */
  payeeInfo: {
    name: string;
    avatar?: string;
  };
  /** 订单状态 */
  status: 'created' | 'pending' | 'paid' | 'expired' | 'cancelled';
  /** 过期时间 */
  expireTime: string;
  /** 支付说明 */
  paymentInstructions: string[];
  /** 错误信息 */
  error?: string;
  /** 扩展数据 */
  metadata?: Record<string, any>;
}

// ============= 订单查询类型 =============

export interface QRPaymentQueryRequest {
  /** 商户订单号 */
  outTradeNo?: string;
  /** 支付订单ID */
  paymentOrderId?: string;
  /** 用户ID */
  userId?: string;
}

export interface QRPaymentQueryResponse {
  /** 是否成功 */
  success: boolean;
  /** 商户订单号 */
  outTradeNo: string;
  /** 支付状态 */
  status: 'created' | 'pending' | 'paid' | 'expired' | 'cancelled';
  /** 支付金额 */
  amount: number;
  /** 创建时间 */
  createdAt: string;
  /** 支付时间 */
  paidAt?: string;
  /** 过期时间 */
  expireTime: string;
  /** 支付凭证信息 */
  paymentProof?: {
    /** 支付截图URL */
    screenshotUrl?: string;
    /** 支付时间 */
    paidTime?: string;
    /** 支付金额 */
    paidAmount?: number;
    /** 验证状态 */
    verificationStatus: 'pending' | 'verified' | 'rejected';
  };
  /** 错误信息 */
  error?: string;
}

// ============= 支付验证类型 =============

export interface PaymentVerificationRequest {
  /** 支付订单ID */
  paymentOrderId: string;
  /** 支付凭证 */
  paymentProof: {
    /** 支付截图（base64或URL） */
    screenshot: string;
    /** 支付时间 */
    paidTime: string;
    /** 支付金额 */
    paidAmount: number;
    /** 支付备注 */
    paymentRemark?: string;
  };
  /** 用户ID */
  userId: string;
}

export interface PaymentVerificationResponse {
  /** 是否成功 */
  success: boolean;
  /** 验证状态 */
  verificationStatus: 'pending' | 'verified' | 'rejected';
  /** 验证消息 */
  message: string;
  /** 如果验证通过，返回订单信息 */
  orderInfo?: {
    orderId: string;
    amount: number;
    status: string;
  };
  /** 错误信息 */
  error?: string;
}

// ============= 收款码管理类型 =============

export interface QRCodeManager {
  /** 生成收款二维码 */
  generateQRCode(amount: number, remark: string, type: 'wechat_personal' | 'alipay_personal'): Promise<string>;
  
  /** 获取收款码配置 */
  getQRConfig(type: 'wechat_personal' | 'alipay_personal'): Promise<QRPaymentConfig>;
  
  /** 更新收款码配置 */
  updateQRConfig(type: 'wechat_personal' | 'alipay_personal', config: Partial<QRPaymentConfig>): Promise<boolean>;
  
  /** 验证收款码有效性 */
  validateQRCode(qrCodeData: string): Promise<boolean>;
}

// ============= 订单管理类型 =============

export interface QRPaymentOrder {
  /** 支付订单ID */
  paymentOrderId: string;
  /** 商户订单ID */
  outTradeNo: string;
  /** 用户ID */
  userId: string;
  /** 支付金额（分） */
  amount: number;
  /** 商品描述 */
  description: string;
  /** 收款码类型 */
  qrType: 'wechat_personal' | 'alipay_personal';
  /** 支付备注 */
  paymentRemark: string;
  /** 收款二维码数据 */
  qrCodeData: string;
  /** 订单状态 */
  status: 'created' | 'pending' | 'paid' | 'expired' | 'cancelled';
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expireTime: Date;
  /** 支付时间 */
  paidAt?: Date;
  /** 支付凭证 */
  paymentProof?: {
    screenshotUrl: string;
    paidTime: Date;
    paidAmount: number;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    verifiedAt?: Date;
    verifiedBy?: string;
  };
  /** 扩展数据 */
  metadata?: Record<string, any>;
}

// ============= 支付服务接口 =============

export interface QRPaymentService {
  /** 创建二维码支付订单 */
  createQRPayment(request: QRPaymentRequest): Promise<QRPaymentResponse>;
  
  /** 查询支付订单状态 */
  queryQRPayment(request: QRPaymentQueryRequest): Promise<QRPaymentQueryResponse>;
  
  /** 提交支付凭证 */
  submitPaymentProof(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse>;
  
  /** 取消支付订单 */
  cancelQRPayment(paymentOrderId: string, userId: string): Promise<boolean>;
  
  /** 获取用户支付订单列表 */
  getUserPaymentOrders(userId: string, status?: string): Promise<QRPaymentOrder[]>;
}

// ============= 错误类型 =============

// export class QRPaymentError // 临时禁用支付功能 extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'QRPaymentError';
  }
}

// ============= 常量定义 =============

// export const QR_PAYMENT_CONSTANTS // 临时禁用支付功能 = {
  /** 默认过期时间（分钟） */
  DEFAULT_EXPIRE_MINUTES: 30,
  
  /** 最大支付金额（分） */
  MAX_PAYMENT_AMOUNT: 50000, // 500元
  
  /** 最小支付金额（分） */
  MIN_PAYMENT_AMOUNT: 100, // 1元
  
  /** 支付备注前缀 */
  PAYMENT_REMARK_PREFIX: 'ST',
  
  /** 订单状态 */
  ORDER_STATUS: {
    CREATED: 'created',
    PENDING: 'pending',
    PAID: 'paid',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
  } as const,
  
  /** 验证状态 */
  VERIFICATION_STATUS: {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
  } as const,
  
  /** 收款码类型 */
  QR_TYPES: {
    WECHAT_PERSONAL: 'wechat_personal',
    ALIPAY_PERSONAL: 'alipay_personal'
  } as const
} as const;

// ============= 配置验证类型 =============

export interface QRPaymentConfigValidation {
  /** 验证收款码配置 */
  validateConfig(config: QRPaymentConfig): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  /** 验证支付金额 */
  validateAmount(amount: number, qrType: string): Promise<{
    valid: boolean;
    error?: string;
  }>;
  
  /** 验证支付备注 */
  validateRemark(remark: string): Promise<{
    valid: boolean;
    error?: string;
  }>;
}

// ============= 与MCP架构兼容的适配器接口 =============

export interface QRToMCPAdapter {
  /** 将QR支付请求转换为MCP格式 */
  adaptQRRequestToMCP(qrRequest: QRPaymentRequest): any;
  
  /** 将MCP响应转换为QR格式 */
  adaptMCPResponseToQR(mcpResponse: any): QRPaymentResponse;
  
  /** 检查是否可以升级到MCP */
  canUpgradeToMCP(): Promise<boolean>;
  
  /** 执行MCP升级 */
  upgradeToMCP(): Promise<boolean>;
}
