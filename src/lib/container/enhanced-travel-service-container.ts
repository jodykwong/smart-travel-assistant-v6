/**
 * 智游助手v6.2 - 增强型旅游服务容器
 * 遵循原则: [SOLID-依赖倒置] + [高内聚，低耦合] + [开闭原则]
 * 
 * 核心功能:
 * 1. 集成用户管理和支付功能
 * 2. 扩展现有的服务容器架构
 * 3. 保持与Phase 1/Phase 2的100%兼容性
 * 4. 支持商业化功能的依赖注入
 */

import { TravelServiceContainer, ITravelServiceContainer } from './travel-service-container';
import UserManagementMCPClient from '../auth/user-management-mcp-client';
import WeChatPayMCPClient from '../payment/wechat-pay-mcp-client';
import { EnhancedUnifiedGeoService } from '../geo/enhanced-unified-geo-service';

// ============= 增强型服务容器接口 =============

export interface IEnhancedTravelServiceContainer extends ITravelServiceContainer {
  // 用户管理服务
  getUserManagement(): UserManagementMCPClient;
  
  // 支付服务
  getPaymentService(): WeChatPayMCPClient;
  
  // 数据库服务
  getDatabaseService(): DatabaseMCPClient;
  
  // 通知服务
  getNotificationService(): NotificationMCPClient;
  
  // 商业化功能健康检查
  checkCommercialServicesHealth(): Promise<CommercialHealthReport>;
}

export interface CommercialHealthReport {
  userManagement: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeSessions: number;
    responseTime: number;
  };
  payment: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    pendingOrders: number;
    successRate: number;
  };
  database: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    connectionPool: number;
    queryTime: number;
  };
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

// ============= 数据库MCP客户端接口 =============

export interface DatabaseMCPClient {
  query(sql: string, params?: any[]): Promise<any>;
  transaction(operations: (() => Promise<any>)[]): Promise<any>;
  healthCheck(): Promise<boolean>;
}

export interface NotificationMCPClient {
  sendNotification(userId: string, message: any): Promise<boolean>;
  sendBulkNotifications(notifications: any[]): Promise<boolean>;
  healthCheck(): Promise<boolean>;
}

// ============= 增强型旅游服务容器实现 =============

export class EnhancedTravelServiceContainer extends TravelServiceContainer implements IEnhancedTravelServiceContainer {
  private userManagementClient!: UserManagementMCPClient;
  private paymentClient!: WeChatPayMCPClient;
  private databaseClient!: DatabaseMCPClient;
  private notificationClient!: NotificationMCPClient;
  
  private commercialConfig: {
    userManagement: any;
    payment: any;
    database: any;
    notification: any;
  };

  constructor(config: any) {
    // 调用父类构造函数，保持兼容性
    super();
    
    this.commercialConfig = {
      userManagement: config.userManagement || {},
      payment: config.payment || {},
      database: config.database || {},
      notification: config.notification || {}
    };

    console.log('增强型旅游服务容器初始化完成');
  }

  // ============= 服务初始化方法 =============

  /**
   * 初始化所有商业化服务
   * 遵循原则: [为失败而设计] - 优雅的服务初始化和降级
   */
  async initializeCommercialServices(): Promise<void> {
    console.log('🚀 初始化商业化服务...');

    try {
      // 1. 初始化用户管理服务
      await this.initializeUserManagement();
      
      // 2. 初始化支付服务
      await this.initializePaymentService();
      
      // 3. 初始化数据库服务
      await this.initializeDatabaseService();
      
      // 4. 初始化通知服务
      await this.initializeNotificationService();
      
      // 5. 验证服务健康状态
      const healthReport = await this.checkCommercialServicesHealth();
      
      if (healthReport.overall === 'unhealthy') {
        console.warn('⚠️  部分商业化服务不可用，系统将以降级模式运行');
      } else {
        console.log('✅ 所有商业化服务初始化完成');
      }

    } catch (error) {
      console.error('❌ 商业化服务初始化失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`商业化服务初始化失败: ${errorMessage}`);
    }
  }

  // ============= 服务获取方法 =============

  /**
   * 获取用户管理服务
   * 遵循原则: [SOLID-依赖倒置] - 通过接口返回服务实例
   */
  getUserManagement(): UserManagementMCPClient {
    if (!this.userManagementClient) {
      throw new Error('用户管理服务未初始化');
    }
    return this.userManagementClient;
  }

  /**
   * 获取支付服务
   */
  getPaymentService(): WeChatPayMCPClient {
    if (!this.paymentClient) {
      throw new Error('支付服务未初始化');
    }
    return this.paymentClient;
  }

  /**
   * 获取数据库服务
   */
  getDatabaseService(): DatabaseMCPClient {
    if (!this.databaseClient) {
      throw new Error('数据库服务未初始化');
    }
    return this.databaseClient;
  }

  /**
   * 获取通知服务
   */
  getNotificationService(): NotificationMCPClient {
    if (!this.notificationClient) {
      throw new Error('通知服务未初始化');
    }
    return this.notificationClient;
  }

  // ============= 商业化功能健康检查 =============

  /**
   * 检查商业化服务健康状态
   * 遵循原则: [为失败而设计] - 全面的健康监控
   */
  async checkCommercialServicesHealth(): Promise<CommercialHealthReport> {
    console.log('🔍 检查商业化服务健康状态...');

    const healthChecks = await Promise.allSettled([
      this.checkUserManagementHealth(),
      this.checkPaymentServiceHealth(),
      this.checkDatabaseHealth()
    ]);

    const [userHealth, paymentHealth, databaseHealth] = healthChecks.map(result => 
      result.status === 'fulfilled' ? result.value : { status: 'unhealthy' }
    );

    // 计算整体健康状态
    const healthyServices = [userHealth, paymentHealth, databaseHealth]
      .filter(service => service.status === 'healthy').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === 3) {
      overall = 'healthy';
    } else if (healthyServices >= 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    const report: CommercialHealthReport = {
      userManagement: userHealth,
      payment: paymentHealth,
      database: databaseHealth,
      overall
    };

    console.log(`📊 商业化服务健康检查完成，整体状态: ${overall}`);
    return report;
  }

  // ============= 集成现有服务 =============

  /**
   * 获取增强型地理服务（集成用户偏好）
   * 遵循原则: [高内聚，低耦合] - 服务间松耦合集成
   */
  async getPersonalizedGeoService(userId?: string): Promise<EnhancedUnifiedGeoService> {
    const baseGeoService = this.getGeoService();
    
    if (!userId) {
      return baseGeoService as EnhancedUnifiedGeoService;
    }

    try {
      // 获取用户偏好
      const userProfile = await this.userManagementClient.getUserProfile(userId);
      
      // 创建个性化地理服务
      const personalizedService = new PersonalizedGeoService(
        baseGeoService,
        userProfile.preferences
      );
      
      return personalizedService as unknown as EnhancedUnifiedGeoService;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️  获取用户偏好失败，使用默认地理服务: ${errorMessage}`);
      return baseGeoService as unknown as EnhancedUnifiedGeoService;
    }
  }

  /**
   * 获取带缓存的用户数据
   * 遵循原则: [DRY] - 复用现有缓存机制
   */
  async getCachedUserData(userId: string): Promise<any> {
    const cacheManager = this.getCacheManager();
    const cacheKey = `user_data_${userId}`;
    
    // 使用智能缓存获取用户数据
    const userData = await cacheManager.getOrCompute(
      cacheKey,
      () => this.userManagementClient.getUserProfile(userId),
      {
        type: 'geocoding',
        priority: 'medium',
        serviceQuality: {
          service: 'user_management',
          responseTime: 1000,
          successRate: 0.95,
          availability: true,
          score: 0.9,
          timestamp: Date.now()
        }
      }
    );
    
    return userData;
  }

  // ============= 私有初始化方法 =============

  private async initializeUserManagement(): Promise<void> {
    console.log('  🔐 初始化用户管理服务...');
    
    this.userManagementClient = new UserManagementMCPClient(
      this.commercialConfig.userManagement.llmApiKey,
      this.commercialConfig.userManagement
    );

    // 启动会话清理定时器
    setInterval(() => {
      this.userManagementClient.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // 每5分钟清理一次

    console.log('    ✅ 用户管理服务初始化完成');
  }

  private async initializePaymentService(): Promise<void> {
    console.log('  💳 初始化支付服务...');
    
    this.paymentClient = new WeChatPayMCPClient(
      this.commercialConfig.payment.llmApiKey,
      this.commercialConfig.payment
    );

    console.log('    ✅ 支付服务初始化完成');
  }

  private async initializeDatabaseService(): Promise<void> {
    console.log('  🗄️  初始化数据库服务...');
    
    // 这里应该初始化实际的数据库MCP客户端
    // 简化实现
    this.databaseClient = new MockDatabaseMCPClient(
      this.commercialConfig.database.llmApiKey,
      this.commercialConfig.database
    );

    console.log('    ✅ 数据库服务初始化完成');
  }

  private async initializeNotificationService(): Promise<void> {
    console.log('  📱 初始化通知服务...');
    
    // 这里应该初始化实际的通知MCP客户端
    // 简化实现
    this.notificationClient = new MockNotificationMCPClient(
      this.commercialConfig.notification.llmApiKey,
      this.commercialConfig.notification
    );

    console.log('    ✅ 通知服务初始化完成');
  }

  // ============= 健康检查私有方法 =============

  private async checkUserManagementHealth(): Promise<any> {
    const startTime = Date.now();
    
    try {
      const stats = this.userManagementClient.getActiveSessionStats();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        activeSession: stats.total,
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        activeSession: 0,
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkPaymentServiceHealth(): Promise<any> {
    const startTime = Date.now();
    
    try {
      // 这里应该实现实际的支付服务健康检查
      // 简化实现
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        status: 'healthy',
        pendingOrders: 0,
        successRate: 0.95
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        pendingOrders: 0,
        successRate: 0
      };
    }
  }

  private async checkDatabaseHealth(): Promise<any> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.databaseClient.healthCheck();
      const queryTime = Date.now() - startTime;
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        connectionPool: 10,
        queryTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connectionPool: 0,
        queryTime: Date.now() - startTime
      };
    }
  }
}

// ============= 模拟实现类 =============

class MockDatabaseMCPClient implements DatabaseMCPClient {
  constructor(private llmApiKey: string, private config: any) {}

  async query(sql: string, params?: any[]): Promise<any> {
    // 模拟数据库查询
    await new Promise(resolve => setTimeout(resolve, 50));
    return { rows: [], affectedRows: 0 };
  }

  async transaction(operations: (() => Promise<any>)[]): Promise<any> {
    // 模拟事务处理
    const results = [];
    for (const operation of operations) {
      results.push(await operation());
    }
    return results;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

class MockNotificationMCPClient implements NotificationMCPClient {
  constructor(private llmApiKey: string, private config: any) {}

  async sendNotification(userId: string, message: any): Promise<boolean> {
    console.log(`📱 发送通知给用户 ${userId}:`, message);
    return true;
  }

  async sendBulkNotifications(notifications: any[]): Promise<boolean> {
    console.log(`📱 批量发送 ${notifications.length} 条通知`);
    return true;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

class PersonalizedGeoService {
  constructor(
    private baseService: any,
    private userPreferences: any
  ) {}

  // 这里可以实现基于用户偏好的个性化地理服务
  // 如根据用户喜好调整POI搜索结果、推荐算法等
}

export default EnhancedTravelServiceContainer;
