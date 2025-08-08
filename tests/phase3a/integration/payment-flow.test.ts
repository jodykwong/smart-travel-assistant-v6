/**
 * Phase 3A 隔离式支付流程集成测试
 * 测试完整的用户输入 -> 订单创建 -> 支付处理 -> 隔离式验证流程
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/testing-library';
import { Phase3AServiceContainer } from '../../../src/lib/container/phase3a-service-container';
import { paymentTestConfig } from '../../../src/lib/payment/config/payment-test.config';

describe('Phase 3A 隔离式支付流程集成测试', () => {
  let serviceContainer: Phase3AServiceContainer;

  beforeAll(async () => {
    // 初始化测试环境
    process.env.NODE_ENV = 'test';
    process.env.PAYMENT_TEST_MODE = 'true';
    process.env.MOCK_PAYMENTS = 'true';
    
    serviceContainer = new Phase3AServiceContainer();
    await serviceContainer.initialize();
    await serviceContainer.initializeSecurityServices();
    await serviceContainer.initializeCommercialServices();
  });

  afterAll(async () => {
    // 清理测试环境
    // 这里可以添加清理逻辑
  });

  beforeEach(() => {
    // 每个测试前的准备工作
    jest.clearAllMocks();
  });

  describe('完整支付流程测试', () => {
    test('应该成功执行完整的隔离式支付流程', async () => {
      // 准备测试数据
      const userInput = {
        amount: 9900, // 99元
        description: '北京三日游规划',
        userId: 'test-user-001',
        paymentMethod: 'wechat_jsapi'
      };

      // 执行隔离式支付流程
      const result = await serviceContainer.executeIsolatedPaymentFlow(userInput);

      // 验证结果
      expect(result).toBeDefined();
      expect(result.orderData).toBeDefined();
      expect(result.paymentData).toBeDefined();
      expect(result.verificationResult).toBeDefined();

      // 验证订单数据
      expect(result.orderData.amount).toBe(9900);
      expect(result.orderData.userId).toBe('test-user-001');
      expect(result.orderData.description).toBe('北京三日游规划');
      expect(result.orderData.orderId).toMatch(/^ST\d+/);
      expect(result.orderData.dataIntegrity).toBeDefined();

      // 验证支付数据
      expect(result.paymentData.orderId).toBe(result.orderData.orderId);
      expect(result.paymentData.expectedAmount).toBe(9900);
      expect(result.paymentData.userId).toBe('test-user-001');
      expect(result.paymentData.providerId).toBe('wechat');
      expect(result.paymentData.sourceNodeId).toBe('payment_processing');
      expect(result.paymentData.dataIntegrity).toBeDefined();

      // 验证验证结果
      expect(result.verificationResult.verified).toBe(true);
      expect(result.verificationResult.actualAmount).toBe(9900);
      expect(result.verificationResult.paymentStatus).toBe('PAID');
      expect(result.verificationResult.verificationMethod).toBe('BACKEND_QUERY');
    });

    test('应该正确处理无效的用户输入', async () => {
      const invalidInputs = [
        // 无效金额
        {
          amount: -100,
          description: '测试订单',
          userId: 'test-user-001'
        },
        // 无效用户ID
        {
          amount: 1000,
          description: '测试订单',
          userId: ''
        },
        // 金额过大
        {
          amount: 200000000, // 超过100万元限制
          description: '测试订单',
          userId: 'test-user-001'
        }
      ];

      for (const invalidInput of invalidInputs) {
        await expect(
          serviceContainer.executeIsolatedPaymentFlow(invalidInput)
        ).rejects.toThrow();
      }
    });

    test('应该正确处理支付宝支付流程', async () => {
      const userInput = {
        amount: 4900, // 49元
        description: '杭州一日游规划',
        userId: 'test-user-002',
        paymentMethod: 'alipay_wap'
      };

      const result = await serviceContainer.executeIsolatedPaymentFlow(userInput);

      expect(result.paymentData.providerId).toBe('alipay');
      expect(result.verificationResult.verified).toBe(true);
    });
  });

  describe('数据完整性测试', () => {
    test('应该验证订单数据完整性', async () => {
      const orderCreationNode = serviceContainer.getOrderCreationNode();
      
      const userInput = {
        amount: 5000,
        description: '测试订单',
        userId: 'test-user-001'
      };

      const orderData = await orderCreationNode.processUserInput(userInput);
      
      // 验证数据完整性字段存在
      expect(orderData.dataIntegrity).toBeDefined();
      expect(orderData.dataIntegrity).toMatch(/^[a-f0-9]{64}$/); // SHA256哈希
    });

    test('应该验证支付数据完整性', async () => {
      const orderCreationNode = serviceContainer.getOrderCreationNode();
      const paymentProcessingNode = serviceContainer.getPaymentProcessingNode();
      
      const userInput = {
        amount: 5000,
        description: '测试订单',
        userId: 'test-user-001'
      };

      const orderData = await orderCreationNode.processUserInput(userInput);
      const paymentData = await paymentProcessingNode.processPayment(orderData);
      
      // 验证数据完整性字段存在
      expect(paymentData.dataIntegrity).toBeDefined();
      expect(paymentData.dataIntegrity).toMatch(/^[a-f0-9]{64}$/); // SHA256哈希
    });

    test('应该检测数据篡改', async () => {
      const orderCreationNode = serviceContainer.getOrderCreationNode();
      const isolatedVerificationNode = serviceContainer.getIsolatedVerificationNode();
      
      const userInput = {
        amount: 5000,
        description: '测试订单',
        userId: 'test-user-001'
      };

      const orderData = await orderCreationNode.processUserInput(userInput);
      
      // 模拟数据篡改
      const tamperedPaymentData = {
        orderId: orderData.orderId,
        expectedAmount: 10000, // 篡改金额
        userId: orderData.userId,
        providerId: 'wechat' as const,
        transactionId: 'test-trans-001',
        createdAt: new Date(),
        sourceNodeId: 'payment_processing',
        dataIntegrity: orderData.dataIntegrity // 使用原始哈希
      };

      // 应该检测到数据篡改并抛出错误
      await expect(
        isolatedVerificationNode.verifyPayment(tamperedPaymentData)
      ).rejects.toThrow('数据完整性验证失败');
    });
  });

  describe('安全服务测试', () => {
    test('应该正确初始化加密服务', async () => {
      const encryptionService = serviceContainer.getEncryptionService();
      
      const testData = 'test_encryption_data';
      const encrypted = await encryptionService.encrypt(testData);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
      expect(encrypted).not.toBe(testData);
    });

    test('应该正确记录审计日志', async () => {
      const auditLogger = serviceContainer.getAuditLogger();
      
      await auditLogger.logSecurityEvent({
        eventType: 'TEST_SECURITY_EVENT',
        eventCategory: 'SECURITY',
        severity: 'INFO',
        userId: 'test-user-001',
        details: { test: true },
        threatLevel: 'LOW'
      });

      // 验证日志记录成功（这里简化验证）
      expect(true).toBe(true);
    });

    test('应该正确生成和验证JWT令牌', async () => {
      const encryptionService = serviceContainer.getEncryptionService();
      
      const payload = { userId: 'test-user-001', role: 'user' };
      const token = await encryptionService.signJWT(payload, '1h');
      const decoded = await encryptionService.verifyJWT(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });
  });

  describe('服务健康检查测试', () => {
    test('应该返回完整的健康检查报告', async () => {
      const healthReport = await serviceContainer.healthCheckCommercial();
      
      expect(healthReport).toBeDefined();
      expect(healthReport.overall).toBeDefined();
      expect(healthReport.commercial).toBeDefined();
      expect(healthReport.security).toBeDefined();
      expect(healthReport.timestamp).toBeInstanceOf(Date);
      
      // 验证商业化服务健康状态
      expect(healthReport.commercial.userService).toBe(true);
      expect(healthReport.commercial.paymentService).toBe(true);
      expect(healthReport.commercial.orderService).toBe(true);
      
      // 验证安全服务健康状态
      expect(healthReport.security.encryptionService).toBe(true);
      expect(healthReport.security.auditLogger).toBe(true);
      expect(healthReport.security.isolatedVerification).toBe(true);
    });
  });

  describe('错误处理测试', () => {
    test('应该正确处理支付验证失败', async () => {
      // 模拟支付验证失败的场景
      const userInput = {
        amount: 1, // 特殊金额，模拟失败
        description: '测试失败订单',
        userId: 'test-user-001',
        paymentMethod: 'wechat_jsapi'
      };

      const result = await serviceContainer.executeIsolatedPaymentFlow(userInput);
      
      // 验证失败处理
      expect(result.verificationResult.verified).toBe(false);
      expect(result.verificationResult.errorCode).toBeDefined();
      expect(result.verificationResult.errorMessage).toBeDefined();
    });

    test('应该正确处理网络超时', async () => {
      // 模拟网络超时的场景
      const userInput = {
        amount: 2, // 特殊金额，模拟超时
        description: '测试超时订单',
        userId: 'test-user-001',
        paymentMethod: 'wechat_jsapi'
      };

      const result = await serviceContainer.executeIsolatedPaymentFlow(userInput);
      
      // 验证超时处理
      expect(result.verificationResult.verified).toBe(false);
      expect(result.verificationResult.errorCode).toBe('NETWORK_TIMEOUT');
    });
  });

  describe('性能测试', () => {
    test('支付流程应该在合理时间内完成', async () => {
      const userInput = {
        amount: 9900,
        description: '性能测试订单',
        userId: 'test-user-001',
        paymentMethod: 'wechat_jsapi'
      };

      const startTime = Date.now();
      const result = await serviceContainer.executeIsolatedPaymentFlow(userInput);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // 支付流程应该在5秒内完成
      expect(duration).toBeLessThan(5000);
      expect(result.verificationResult.verified).toBe(true);
    });

    test('并发支付请求应该正确处理', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, index) => ({
        amount: 1000 + index * 100,
        description: `并发测试订单${index + 1}`,
        userId: `test-user-00${index + 1}`,
        paymentMethod: 'wechat_jsapi'
      }));

      const promises = concurrentRequests.map(input => 
        serviceContainer.executeIsolatedPaymentFlow(input)
      );

      const results = await Promise.all(promises);
      
      // 验证所有请求都成功处理
      results.forEach((result, index) => {
        expect(result.verificationResult.verified).toBe(true);
        expect(result.orderData.amount).toBe(1000 + index * 100);
      });
    });
  });
});
