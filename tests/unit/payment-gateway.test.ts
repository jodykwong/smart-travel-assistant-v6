/**
 * 智游助手v6.2 - 支付网关单元测试
 * 测试统一支付网关功能
 */

import { test, expect, describe, beforeEach, beforeAll, afterAll, vi } from './test-utils';

import { PaymentGateway, UnifiedPaymentRequest } from '../../lib/payment/payment-gateway';

// Mock dependencies
vi.mock('../../../lib/payment/wechat-pay-mcp-client');
vi.mock('../../../lib/payment/alipay-client');
vi.mock('../../../lib/security/encryption-service');

describe('PaymentGateway', () => {
  let paymentGateway: PaymentGateway;
  let mockPaymentRequest: UnifiedPaymentRequest;

  beforeEach(() => {
    const mockConfig = {
      wechat: {
        appId: 'test-wechat-app-id',
        mchId: 'test-merchant-id',
        apiKey: 'test-api-key'
      },
      alipay: {
        appId: 'test-alipay-app-id',
        privateKey: 'test-private-key',
        publicKey: 'test-public-key',
        gateway: 'https://openapi.alipay.com/gateway.do'
      },
      encryption: {
        enabled: true,
        algorithm: 'aes-256-gcm'
      }
    };

    paymentGateway = new PaymentGateway(mockConfig);

    mockPaymentRequest = {
      amount: 10000, // 100元
      description: '智游助手旅游服务费',
      outTradeNo: 'ST202401081234567890',
      paymentMethod: 'wechat',
      paymentType: 'jsapi',
      openid: 'test-openid-123',
      userId: 'test-user-123',
      notifyUrl: 'https://api.smarttravel.com/payment/notify',
      returnUrl: 'https://smarttravel.com/payment/result'
    };
  });

  describe('Payment Creation', () => {
    test('should create WeChat payment successfully', async ({ unitContext }) => {
      const result = await paymentGateway.createPayment(mockPaymentRequest);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBeDefined();
      expect(result.paymentUrl || result.qrCode).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should create Alipay payment successfully', async ({ unitContext }) => {
      const alipayRequest = {
        ...mockPaymentRequest,
        paymentMethod: 'alipay' as const,
        paymentType: 'h5' as const
      };

      const result = await paymentGateway.createPayment(alipayRequest);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBeDefined();
      expect(result.paymentUrl || result.qrCode).toBeDefined();
    });

    test('should validate payment request parameters', async ({ unitContext }) => {
      const invalidRequest = {
        ...mockPaymentRequest,
        amount: 0 // 无效金额
      };

      const result = await paymentGateway.createPayment(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('支付金额必须大于0');
    });

    test('should require openid for WeChat JSAPI payment', async ({ unitContext }) => {
      const requestWithoutOpenid = {
        ...mockPaymentRequest,
        openid: undefined
      };

      const result = await paymentGateway.createPayment(requestWithoutOpenid);

      expect(result.success).toBe(false);
      expect(result.error).toContain('微信JSAPI支付需要提供openid');
    });

    test('should reject unsupported payment method', async ({ unitContext }) => {
      const invalidRequest = {
        ...mockPaymentRequest,
        paymentMethod: 'bitcoin' as any
      };

      const result = await paymentGateway.createPayment(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的支付方式');
    });
  });

  describe('Payment Query', () => {
    test('should query payment status successfully', async ({ unitContext }) => {
      const outTradeNo = 'ST202401081234567890';
      
      const result = await paymentGateway.queryPayment(outTradeNo, 'wechat');

      expect(result).toBeDefined();
      // 具体的断言取决于mock的返回值
    });

    test('should handle query for non-existent payment', async ({ unitContext }) => {
      const nonExistentTradeNo = 'ST999999999999999999';

      await expect(
        paymentGateway.queryPayment(nonExistentTradeNo)
      ).rejects.toThrow();
    });
  });

  describe('Refund Processing', () => {
    test('should process refund successfully', async ({ unitContext }) => {
      const outTradeNo = 'ST202401081234567890';
      const refundAmount = 5000; // 50元退款

      const result = await paymentGateway.refund(outTradeNo, refundAmount, '用户申请退款');

      expect(result).toBeDefined();
      // 具体的断言取决于mock的返回值
    });

    test('should reject refund for unpaid order', async ({ unitContext }) => {
      const outTradeNo = 'ST202401081234567890';
      const refundAmount = 5000;

      await expect(
        paymentGateway.refund(outTradeNo, refundAmount)
      ).rejects.toThrow('只能对已支付订单申请退款');
    });
  });

  describe('Payment Records Management', () => {
    test('should create payment record on successful payment creation', async ({ unitContext }) => {
      await paymentGateway.createPayment(mockPaymentRequest);

      const stats = paymentGateway.getPaymentStats();
      expect(stats.total).toBeGreaterThan(0);
    });

    test('should get payment statistics', () => {
      const stats = paymentGateway.getPaymentStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('paid');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('refunded');
      expect(typeof stats.total).toBe('number');
    });
  });

  describe('Parameter Validation', () => {
    test('should validate required fields', async ({ unitContext }) => {
      const incompleteRequest = {
        amount: 10000,
        description: '测试订单'
        // 缺少必要字段
      } as UnifiedPaymentRequest;

      const result = await paymentGateway.createPayment(incompleteRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should validate amount range', async ({ unitContext }) => {
      const negativeAmountRequest = {
        ...mockPaymentRequest,
        amount: -100
      };

      const result = await paymentGateway.createPayment(negativeAmountRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('支付金额必须大于0');
    });

    test('should validate description length', async ({ unitContext }) => {
      const longDescriptionRequest = {
        ...mockPaymentRequest,
        description: 'a'.repeat(300) // 超长描述
      };

      const result = await paymentGateway.createPayment(longDescriptionRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle payment gateway errors gracefully', async ({ unitContext }) => {
      // Mock payment gateway error
      const errorRequest = {
        ...mockPaymentRequest,
        outTradeNo: 'ERROR_TRIGGER_ORDER'
      };

      const result = await paymentGateway.createPayment(errorRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should handle network errors gracefully', async ({ unitContext }) => {
      // Mock network error scenario
      const networkErrorRequest = {
        ...mockPaymentRequest,
        outTradeNo: 'NETWORK_ERROR_ORDER'
      };

      const result = await paymentGateway.createPayment(networkErrorRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Security Features', () => {
    test('should encrypt sensitive payment data when enabled', async ({ unitContext }) => {
      const result = await paymentGateway.createPayment(mockPaymentRequest);

      if (result.success) {
        expect(result.encryptedData).toBeDefined();
      }
    });

    test('should generate unique payment IDs', async ({ unitContext }) => {
      const result1 = await paymentGateway.createPayment(mockPaymentRequest);
      const result2 = await paymentGateway.createPayment({
        ...mockPaymentRequest,
        outTradeNo: 'ST202401081234567891'
      });

      if (result1.success && result2.success) {
        expect(result1.paymentId).not.toBe(result2.paymentId);
      }
    });
  });

  describe('Configuration', () => {
    test('should initialize with default configuration', () => {
      const defaultGateway = new PaymentGateway({
        wechat: {
          appId: 'test-app-id',
          mchId: 'test-mch-id',
          apiKey: 'test-api-key'
        },
        alipay: {
          appId: 'test-alipay-app-id',
          privateKey: 'test-private-key',
          publicKey: 'test-public-key',
          gateway: 'https://openapi.alipay.com/gateway.do'
        },
        encryption: {
          enabled: false,
          algorithm: 'aes-256-gcm'
        }
      });

      expect(defaultGateway).toBeDefined();
    });
  });
});
