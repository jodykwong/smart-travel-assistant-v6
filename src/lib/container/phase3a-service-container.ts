/**
 * Phase 3A 服务容器
 * 基于Phase 1架构扩展，专注于商业化和安全服务
 * 遵循原则: [依赖注入] + [服务隔离] + [渐进式增强]
 */

import { TravelServiceContainer, ITravelServiceContainer, ServiceHealthStatus } from './travel-service-container';
import { IEncryptionService, IAuditLogger, ISecurityContext } from '../security/interfaces/security.interfaces';
import { AESEncryptionService } from '../security/services/encryption.service';
import { DatabaseAuditLogger } from '../security/services/audit-logger.service';
import { IsolatedPaymentVerificationService } from '../payment/isolated-verification/isolated-payment-verification.service';
import { 
  OrderCreationNode, 
  PaymentProcessingNode, 
  IsolatedPaymentVerificationNode,
  PaymentFlowResult 
} from '../payment/isolated-verification/payment-flow-nodes';

// ============= Phase 3A 服务接口定义 =============

export interface IUserService {
  register(userData: any): Promise<any>;
  authenticate(credentials: any): Promise<any>;
  getUserProfile(userId: string): Promise<any>;
  updatePreferences(userId: string, prefs: any): Promise<void>;
}

export interface IUnifiedPaymentService {
  createPaymentOrder(request: any, context: ISecurityContext): Promise<any>;
  queryOrderStatus(orderId: string): Promise<any>;
  processRefund(request: any): Promise<any>;
  healthCheckAll(): Promise<Record<string, boolean>>;
}

export interface IOrderService {
  createOrder(orderData: any): Promise<any>;
  getOrder(orderId: string): Promise<any>;
  updateOrderStatus(orderId: string, status: string): Promise<void>;
  getUserOrders(userId: string): Promise<any[]>;
}

export interface IDatabaseService {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<any>;
}

// ============= Phase 3A 服务容器接口 =============

export interface IPhase3AServiceContainer extends ITravelServiceContainer {
  // Phase 3A 商业化服务
  getUserService(): IUserService;
  getPaymentService(): IUnifiedPaymentService;
  getOrderService(): IOrderService;
  
  // Phase 3A 安全服务
  getSecurityContext(): ISecurityContext;
  getAuditLogger(): IAuditLogger;
  getEncryptionService(): IEncryptionService;
  getDatabaseService(): IDatabaseService;
  
  // Phase 3A 隔离式支付验证
  getIsolatedPaymentVerificationService(): IsolatedPaymentVerificationService;
  getOrderCreationNode(): OrderCreationNode;
  getPaymentProcessingNode(): PaymentProcessingNode;
  getIsolatedVerificationNode(): IsolatedPaymentVerificationNode;
  
  // Phase 3A 生命周期管理
  initializeCommercialServices(): Promise<void>;
  initializeSecurityServices(): Promise<void>;
  executeIsolatedPaymentFlow(userInput: any): Promise<PaymentFlowResult>;
  healthCheckCommercial(): Promise<CommercialHealthReport>;
}

export interface CommercialHealthReport {
  overall: ServiceHealthStatus;
  commercial: {
    userService: boolean;
    paymentService: boolean;
    orderService: boolean;
  };
  security: {
    encryptionService: boolean;
    auditLogger: boolean;
    isolatedVerification: boolean;
  };
  timestamp: Date;
}

// ============= Phase 3A 服务容器实现 =============

export class Phase3AServiceContainer extends TravelServiceContainer implements IPhase3AServiceContainer {
  // Phase 3A 商业化服务
  private userService!: IUserService;
  private paymentService!: IUnifiedPaymentService;
  private orderService!: IOrderService;

  // Phase 3A 安全服务
  private securityContext!: ISecurityContext;
  private auditLogger!: IAuditLogger;
  private encryptionService!: IEncryptionService;
  private databaseService!: IDatabaseService;

  // Phase 3A 隔离式支付验证
  private isolatedPaymentVerificationService!: IsolatedPaymentVerificationService;
  private orderCreationNode!: OrderCreationNode;
  private paymentProcessingNode!: PaymentProcessingNode;
  private isolatedVerificationNode!: IsolatedPaymentVerificationNode;

  // 初始化状态
  private commercialServicesInitialized = false;
  private securityServicesInitialized = false;

  constructor() {
    super();
    console.log('🚀 Phase 3A 服务容器初始化');
  }

  /**
   * 初始化安全服务
   * 必须在商业化服务之前初始化
   */
  async initializeSecurityServices(): Promise<void> {
    if (this.securityServicesInitialized) {
      console.log('⚠️ 安全服务已初始化');
      return;
    }

    console.log('🔒 初始化Phase 3A安全服务...');
    
    try {
      // 初始化数据库服务 (简化实现)
      this.databaseService = {
        async query(sql: string, params?: any[]): Promise<any[]> {
          console.log(`📊 执行查询: ${sql}`);
          // 这里应该连接实际数据库
          return [];
        },
        async execute(sql: string, params?: any[]): Promise<any> {
          console.log(`📝 执行命令: ${sql}`);
          // 这里应该连接实际数据库
          return { affectedRows: 1 };
        }
      };
      
      // 初始化加密服务
      this.encryptionService = new AESEncryptionService(
        process.env.ENCRYPTION_KEY || 'default_key_for_development_only_32_chars',
        process.env.JWT_SECRET || 'default_jwt_secret_for_development'
      );
      
      // 初始化审计日志服务
      this.auditLogger = new DatabaseAuditLogger(
        this.getDatabaseService(),
        process.env.NODE_ENV === 'development'
      );
      
      // 初始化安全上下文管理器 (简化实现)
      this.securityContext = {
        sessionId: 'test-session',
        userId: 'test-user',
        timestamp: Date.now(),
        signature: 'test-signature',
        
        async validate(): Promise<boolean> {
          return true;
        },
        
        async encrypt(data: any): Promise<string> {
          return JSON.stringify(data);
        },
        
        async decrypt(encryptedData: string): Promise<any> {
          return JSON.parse(encryptedData);
        },
        
        async sign(data: any): Promise<string> {
          return 'test-signature';
        },
        
        async verifySignature(data: any, signature: string): Promise<boolean> {
          return true;
        },
        
        async hasPermission(resource: string, action: string): Promise<boolean> {
          return true;
        },
        
        async refreshSession(): Promise<void> {
          console.log('刷新会话');
        },
        
        async invalidateSession(): Promise<void> {
          console.log('销毁会话');
        }
      };
      
      // 初始化隔离式支付验证服务
      this.isolatedPaymentVerificationService = new IsolatedPaymentVerificationService(
        this.getAuditLogger(),
        this.getEncryptionService(),
        {
          wechat: {
            appId: process.env.WECHAT_APP_ID || 'test_app_id',
            mchId: process.env.WECHAT_MCH_ID || 'test_mch_id',
            apiKey: process.env.WECHAT_API_KEY || 'test_api_key',
            apiUrl: process.env.WECHAT_API_URL || 'https://api.mch.weixin.qq.com'
          },
          alipay: {
            appId: process.env.ALIPAY_APP_ID || 'test_app_id',
            merchantId: process.env.ALIPAY_MERCHANT_ID || 'test_merchant_id',
            privateKey: process.env.ALIPAY_PRIVATE_KEY || 'test_private_key',
            apiUrl: process.env.ALIPAY_API_URL || 'https://openapi.alipay.com/gateway.do'
          }
        }
      );
      
      // 初始化支付流程节点
      this.orderCreationNode = new OrderCreationNode(
        this.getEncryptionService(),
        this.getAuditLogger()
      );
      
      this.paymentProcessingNode = new PaymentProcessingNode(
        this.getEncryptionService(),
        this.getAuditLogger()
      );
      
      this.isolatedVerificationNode = new IsolatedPaymentVerificationNode(
        this.getIsolatedPaymentVerificationService(),
        this.getAuditLogger()
      );
      
      this.securityServicesInitialized = true;
      console.log('✅ Phase 3A安全服务初始化完成');
      
    } catch (error) {
      console.error('❌ Phase 3A安全服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化商业化服务
   */
  async initializeCommercialServices(): Promise<void> {
    if (this.commercialServicesInitialized) {
      console.log('⚠️ 商业化服务已初始化');
      return;
    }

    console.log('🚀 初始化Phase 3A商业化服务...');
    
    try {
      // 确保安全服务已初始化
      await this.initializeSecurityServices();
      
      // 初始化用户服务 (简化实现)
      this.userService = {
        async register(userData: any): Promise<any> {
          console.log('📝 用户注册:', userData.email);
          return { id: 'user-' + Date.now(), ...userData };
        },
        
        async authenticate(credentials: any): Promise<any> {
          console.log('🔐 用户认证:', credentials.email);
          return { 
            token: 'jwt-token-' + Date.now(),
            user: { id: 'user-001', email: credentials.email }
          };
        },
        
        async getUserProfile(userId: string): Promise<any> {
          console.log('👤 获取用户资料:', userId);
          return { id: userId, email: 'test@example.com' };
        },
        
        async updatePreferences(userId: string, prefs: any): Promise<void> {
          console.log('⚙️ 更新用户偏好:', userId, prefs);
        }
      };
      
      // 初始化支付服务 (简化实现)
      this.paymentService = {
        async createPaymentOrder(request: any, context: ISecurityContext): Promise<any> {
          console.log('💳 创建支付订单:', request.orderId);
          return {
            orderId: request.orderId,
            paymentUrl: `https://pay.example.com/pay/${request.orderId}`,
            qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`
          };
        },
        
        async queryOrderStatus(orderId: string): Promise<any> {
          console.log('🔍 查询订单状态:', orderId);
          return { orderId, status: 'PENDING' };
        },
        
        async processRefund(request: any): Promise<any> {
          console.log('💰 处理退款:', request.orderId);
          return { refundId: 'refund-' + Date.now(), status: 'SUCCESS' };
        },
        
        async healthCheckAll(): Promise<Record<string, boolean>> {
          return { wechat: true, alipay: true };
        }
      };
      
      // 初始化订单服务 (简化实现)
      this.orderService = {
        async createOrder(orderData: any): Promise<any> {
          console.log('📋 创建订单:', orderData.title);
          return { id: 'order-' + Date.now(), ...orderData };
        },
        
        async getOrder(orderId: string): Promise<any> {
          console.log('📄 获取订单:', orderId);
          return { id: orderId, status: 'PENDING' };
        },
        
        async updateOrderStatus(orderId: string, status: string): Promise<void> {
          console.log('📝 更新订单状态:', orderId, status);
        },
        
        async getUserOrders(userId: string): Promise<any[]> {
          console.log('📋 获取用户订单:', userId);
          return [];
        }
      };
      
      this.commercialServicesInitialized = true;
      console.log('✅ Phase 3A商业化服务初始化完成');
      
    } catch (error) {
      console.error('❌ Phase 3A商业化服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 执行完整的隔离式支付流程
   */
  async executeIsolatedPaymentFlow(userInput: any): Promise<PaymentFlowResult> {
    console.log('🔄 开始执行Phase 3A隔离式支付流程...');
    
    try {
      // 确保服务已初始化
      await this.initializeCommercialServices();
      
      // 第一步: 处理用户输入（唯一接触用户输入的地方）
      const orderData = await this.getOrderCreationNode().processUserInput(userInput);
      
      // 第二步: 处理支付（结构化数据流）
      const paymentData = await this.getPaymentProcessingNode().processPayment(orderData);
      
      // 第三步: 验证支付（完全隔离）
      const verificationResult = await this.getIsolatedVerificationNode().verifyPayment(paymentData);
      
      const result: PaymentFlowResult = {
        orderData,
        paymentData,
        verificationResult
      };
      
      console.log('✅ Phase 3A隔离式支付流程执行完成');
      return result;
      
    } catch (error) {
      console.error('❌ Phase 3A隔离式支付流程执行失败:', error);
      throw error;
    }
  }

  /**
   * 商业化服务健康检查
   */
  async healthCheckCommercial(): Promise<CommercialHealthReport> {
    console.log('🔍 执行Phase 3A商业化健康检查...');
    
    const overall = await this.healthCheck();
    
    const commercial = {
      userService: this.userService ? true : false,
      paymentService: this.paymentService ? await this.testPaymentService() : false,
      orderService: this.orderService ? true : false
    };
    
    const security = {
      encryptionService: this.encryptionService ? await this.testEncryptionService() : false,
      auditLogger: this.auditLogger ? true : false,
      isolatedVerification: this.isolatedPaymentVerificationService ? true : false
    };
    
    return {
      overall,
      commercial,
      security,
      timestamp: new Date()
    };
  }

  // ============= 服务获取方法 =============

  getUserService(): IUserService {
    if (!this.userService) {
      throw new Error('用户服务未初始化，请先调用 initializeCommercialServices()');
    }
    return this.userService;
  }

  getPaymentService(): IUnifiedPaymentService {
    if (!this.paymentService) {
      throw new Error('支付服务未初始化，请先调用 initializeCommercialServices()');
    }
    return this.paymentService;
  }

  getOrderService(): IOrderService {
    if (!this.orderService) {
      throw new Error('订单服务未初始化，请先调用 initializeCommercialServices()');
    }
    return this.orderService;
  }

  getSecurityContext(): ISecurityContext {
    if (!this.securityContext) {
      throw new Error('安全上下文未初始化，请先调用 initializeSecurityServices()');
    }
    return this.securityContext;
  }

  getAuditLogger(): IAuditLogger {
    if (!this.auditLogger) {
      throw new Error('审计日志服务未初始化，请先调用 initializeSecurityServices()');
    }
    return this.auditLogger;
  }

  getEncryptionService(): IEncryptionService {
    if (!this.encryptionService) {
      throw new Error('加密服务未初始化，请先调用 initializeSecurityServices()');
    }
    return this.encryptionService;
  }

  getDatabaseService(): IDatabaseService {
    if (!this.databaseService) {
      throw new Error('数据库服务未初始化，请先调用 initializeSecurityServices()');
    }
    return this.databaseService;
  }

  getIsolatedPaymentVerificationService(): IsolatedPaymentVerificationService {
    if (!this.isolatedPaymentVerificationService) {
      throw new Error('隔离式支付验证服务未初始化，请先调用 initializeSecurityServices()');
    }
    return this.isolatedPaymentVerificationService;
  }

  getOrderCreationNode(): OrderCreationNode {
    if (!this.orderCreationNode) {
      throw new Error('订单创建节点未初始化，请先调用 initializeSecurityServices()');
    }
    return this.orderCreationNode;
  }

  getPaymentProcessingNode(): PaymentProcessingNode {
    if (!this.paymentProcessingNode) {
      throw new Error('支付处理节点未初始化，请先调用 initializeSecurityServices()');
    }
    return this.paymentProcessingNode;
  }

  getIsolatedVerificationNode(): IsolatedPaymentVerificationNode {
    if (!this.isolatedVerificationNode) {
      throw new Error('隔离式验证节点未初始化，请先调用 initializeSecurityServices()');
    }
    return this.isolatedVerificationNode;
  }

  // ============= 私有辅助方法 =============

  private async testPaymentService(): Promise<boolean> {
    try {
      if (this.paymentService) {
        const healthStatus = await this.paymentService.healthCheckAll();
        return Object.values(healthStatus).some(status => status === true);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async testEncryptionService(): Promise<boolean> {
    try {
      if (this.encryptionService) {
        const testData = 'test_encryption';
        const encrypted = await this.encryptionService.encrypt(testData);
        const decrypted = await this.encryptionService.decrypt(encrypted);
        return decrypted === testData;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}
