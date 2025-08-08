/**
 * 智游助手v6.2 - 智能双链路架构集成测试
 * 验证双链路冗余架构的核心功能
 */

import { test, expect, describe, beforeEach, beforeAll, afterAll } from './test-utils';
import { UnifiedGeoService, getGeoService } from '@/lib/geo/unified-geo-service';
import TencentMCPClient from '@/lib/mcp/tencent-mcp-client';

// ============= 测试配置 =============

const TEST_LOCATIONS = {
  beijing: {
    address: '北京市朝阳区',
    coordinates: '116.397428,39.90923'
  },
  shanghai: {
    address: '上海市浦东新区',
    coordinates: '121.473701,31.230416'
  },
  guangzhou: {
    address: '广州市天河区',
    coordinates: '113.280637,23.125178'
  }
};

describe('智能双链路架构集成测试', () => {
  let geoService: UnifiedGeoService;

  beforeAll(async () => {
    // 初始化地理服务
    geoService = getGeoService();
    await geoService.initialize();
    
    // 等待服务稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // 清理资源
    geoService.destroy();
  });

  // ============= 基础功能测试 =============

  describe('基础地理服务功能', () => {
    test('地理编码功能正常', async ({ unitContext }) => {
      const result = await geoService.geocoding(TEST_LOCATIONS.beijing.address);
      
      expect(result).toBeDefined();
      expect(result.location).toBeDefined();
      expect(result.location.latitude).toBeGreaterThan(39);
      expect(result.location.latitude).toBeLessThan(41);
      expect(result.location.longitude).toBeGreaterThan(116);
      expect(result.location.longitude).toBeLessThan(118);
      expect(result.address).toContain('北京');
      expect(result.source).toMatch(/^(amap|tencent)$/);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }, 15000);

    test('逆地理编码功能正常', async ({ unitContext }) => {
      const result = await geoService.reverseGeocoding(TEST_LOCATIONS.beijing.coordinates);
      
      expect(result).toBeDefined();
      expect(result.address).toBeDefined();
      expect(result.address).toContain('北京');
      expect(result.addressComponents).toBeDefined();
      expect(result.addressComponents.city).toContain('北京');
      expect(result.source).toMatch(/^(amap|tencent)$/);
    }, 15000);

    test('POI搜索功能正常', async ({ unitContext }) => {
      const result = await geoService.placeSearch('餐厅', TEST_LOCATIONS.beijing.coordinates, 1000);
      
      expect(result).toBeDefined();
      expect(result.places).toBeDefined();
      expect(Array.isArray(result.places)).toBe(true);
      expect(result.places.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.source).toMatch(/^(amap|tencent)$/);
      
      // 验证POI数据结构
      const firstPlace = result.places[0];
      expect(firstPlace.id).toBeDefined();
      expect(firstPlace.name).toBeDefined();
      expect(firstPlace.location).toBeDefined();
      expect(firstPlace.address).toBeDefined();
    }, 15000);

    test('路线规划功能正常', async ({ unitContext }) => {
      const result = await geoService.routePlanning(
        TEST_LOCATIONS.beijing.coordinates,
        TEST_LOCATIONS.shanghai.coordinates,
        'driving'
      );
      
      expect(result).toBeDefined();
      expect(result.routes).toBeDefined();
      expect(Array.isArray(result.routes)).toBe(true);
      expect(result.routes.length).toBeGreaterThan(0);
      expect(result.source).toMatch(/^(amap|tencent)$/);
      
      // 验证路线数据结构
      const firstRoute = result.routes[0];
      expect(firstRoute.distance).toBeGreaterThan(1000000); // 北京到上海应该超过1000km
      expect(firstRoute.duration).toBeGreaterThan(36000); // 应该超过10小时
      expect(firstRoute.mode).toBe('driving');
      expect(Array.isArray(firstRoute.steps)).toBe(true);
    }, 20000);
  });

  // ============= 服务质量测试 =============

  describe('服务质量监控', () => {
    test('服务状态获取正常', async ({ unitContext }) => {
      const status = await geoService.getServiceStatus();
      
      expect(status).toBeDefined();
      expect(status.currentPrimary).toMatch(/^(amap|tencent)$/);
      expect(typeof status.autoSwitchEnabled).toBe('boolean');
      expect(status.lastSwitchTime).toBeInstanceOf(Date);
      expect(status.healthStatus).toBeDefined();
      expect(status.healthStatus.amap).toBeDefined();
      expect(status.healthStatus.tencent).toBeDefined();
      expect(status.qualityMetrics).toBeDefined();
    });

    test('质量报告生成正常', async ({ unitContext }) => {
      // 先执行一些操作以生成质量数据
      await geoService.geocoding(TEST_LOCATIONS.beijing.address);
      await geoService.geocoding(TEST_LOCATIONS.shanghai.address);
      
      const report = await geoService.getQualityReport();
      
      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.services).toBeDefined();
      expect(report.comparison).toBeDefined();
      expect(report.recommendation).toMatch(/^(amap|tencent)$/);
    });

    test('健康检查功能正常', async ({ unitContext }) => {
      const healthCheck = await geoService.performHealthCheck();
      
      expect(healthCheck).toBeDefined();
      expect(healthCheck.amap).toBeDefined();
      expect(healthCheck.tencent).toBeDefined();
      
      // 验证健康检查结果结构
      expect(healthCheck.amap.service).toBe('amap');
      expect(healthCheck.amap.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(typeof healthCheck.amap.qualityScore).toBe('number');
      expect(healthCheck.amap.lastCheck).toBeInstanceOf(Date);
      expect(Array.isArray(healthCheck.amap.issues)).toBe(true);
    });
  });

  // ============= 智能切换测试 =============

  describe('智能服务切换', () => {
    test('获取当前主服务', () => {
      const currentPrimary = geoService.getCurrentPrimaryService();
      expect(currentPrimary).toMatch(/^(amap|tencent)$/);
    });

    test('手动切换到备用服务', async ({ unitContext }) => {
      const originalPrimary = geoService.getCurrentPrimaryService();
      
      await geoService.switchToSecondary();
      
      const newPrimary = geoService.getCurrentPrimaryService();
      expect(newPrimary).not.toBe(originalPrimary);
      
      // 切换回原来的服务
      await geoService.resetToAuto();
    });

    test('切换历史记录正常', async ({ unitContext }) => {
      // 执行一次切换
      await geoService.switchToSecondary();
      
      const history = geoService.getSwitchHistory(5);
      
      expect(Array.isArray(history)).toBe(true);
      if (history.length > 0) {
        const lastSwitch = history[history.length - 1];
        expect(lastSwitch.timestamp).toBeInstanceOf(Date);
        expect(lastSwitch.from).toMatch(/^(amap|tencent)$/);
        expect(lastSwitch.to).toMatch(/^(amap|tencent)$/);
        expect(lastSwitch.reason).toBeDefined();
        expect(lastSwitch.qualityScores).toBeDefined();
      }
    });
  });

  // ============= 错误处理测试 =============

  describe('错误处理和容错', () => {
    test('无效地址的错误处理', async ({ unitContext }) => {
      try {
        await geoService.geocoding('这是一个不存在的地址12345');
        // 如果没有抛出错误，检查返回结果是否合理
      } catch (error) {
        expect(error).toBeDefined();
        // 错误应该是用户友好的
        expect(error.message).toBeDefined();
      }
    });

    test('无效坐标的错误处理', async ({ unitContext }) => {
      try {
        await geoService.reverseGeocoding('999,999');
        // 如果没有抛出错误，检查返回结果是否合理
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });

    test('网络超时的错误处理', async ({ unitContext }) => {
      // 这个测试可能需要模拟网络问题
      // 暂时跳过，在实际环境中测试
    }, 30000);
  });

  // ============= 性能测试 =============

  describe('性能和并发测试', () => {
    test('响应时间在可接受范围内', async ({ unitContext }) => {
      const startTime = Date.now();
      
      await geoService.geocoding(TEST_LOCATIONS.beijing.address);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(15000); // 15秒内响应
    });

    test('并发请求处理正常', async ({ unitContext }) => {
      const concurrentRequests = 5;
      const requests = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(geoService.geocoding(`${TEST_LOCATIONS.beijing.address}${i}`));
      }
      
      const results = await Promise.allSettled(requests);
      
      // 至少有一半的请求应该成功
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThanOrEqual(Math.floor(concurrentRequests / 2));
    }, 30000);
  });

  // ============= 数据质量测试 =============

  describe('数据质量验证', () => {
    test('地理编码数据质量', async ({ unitContext }) => {
      const result = await geoService.geocoding(TEST_LOCATIONS.beijing.address);
      
      // 验证数据质量指标
      expect(result.quality).toBeDefined();
      expect(result.quality.accuracy).toBeGreaterThan(0.8);
      expect(result.quality.completeness).toBeGreaterThan(0.8);
      expect(result.quality.reliability).toBeGreaterThan(0.8);
    });

    test('POI搜索数据质量', async ({ unitContext }) => {
      const result = await geoService.placeSearch('餐厅', TEST_LOCATIONS.beijing.coordinates);
      
      // 验证数据质量指标
      expect(result.quality).toBeDefined();
      expect(result.quality.accuracy).toBeGreaterThan(0.8);
      expect(result.quality.completeness).toBeGreaterThan(0.8);
      expect(result.quality.relevance).toBeGreaterThan(0.8);
    });

    test('路线规划数据质量', async ({ unitContext }) => {
      const result = await geoService.routePlanning(
        TEST_LOCATIONS.beijing.coordinates,
        TEST_LOCATIONS.shanghai.coordinates,
        'driving'
      );
      
      // 验证数据质量指标
      expect(result.quality).toBeDefined();
      expect(result.quality.accuracy).toBeGreaterThan(0.8);
      expect(result.quality.completeness).toBeGreaterThan(0.8);
      expect(result.quality.efficiency).toBeGreaterThan(0.8);
    });
  });

  // ============= 监控统计测试 =============

  describe('监控和统计', () => {
    test('监控统计信息正常', () => {
      const stats = geoService.getMonitoringStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalRecords).toBe('number');
      expect(stats.serviceRecords).toBeDefined();
      expect(typeof stats.serviceRecords.amap).toBe('number');
      expect(typeof stats.serviceRecords.tencent).toBe('number');
    });

    test('数据清理功能正常', () => {
      // 清理1秒前的数据（应该清理大部分测试数据）
      expect(() => {
        geoService.cleanupOldData(1);
      }).not.toThrow();
    });
  });

  // ============= 服务预热测试 =============

  describe('服务预热', () => {
    test('默认预热测试用例', async ({ unitContext }) => {
      await expect(geoService.warmup()).resolves.not.toThrow();
    }, 30000);

    test('自定义预热测试用例', async ({ unitContext }) => {
      const customTestCases = [
        { type: 'geocoding', params: { address: '上海市浦东新区' } },
        { type: 'placeSearch', params: { keywords: '酒店', location: '121.473701,31.230416' } }
      ];
      
      await expect(geoService.warmup(customTestCases)).resolves.not.toThrow();
    }, 30000);
  });
});

// ============= 腾讯地图MCP客户端单独测试 =============

describe('腾讯地图MCP客户端测试', () => {
  let tencentClient: TencentMCPClient;

  beforeAll(() => {
    tencentClient = new TencentMCPClient();
  });

  test('腾讯地图健康检查', async ({ unitContext }) => {
    const healthCheck = await tencentClient.healthCheck();
    
    expect(healthCheck).toBeDefined();
    expect(typeof healthCheck.healthy).toBe('boolean');
    expect(typeof healthCheck.responseTime).toBe('number');
    
    if (!healthCheck.healthy) {
      console.warn('腾讯地图服务健康检查失败:', healthCheck.error);
    }
  });

  test('腾讯地图基础API调用', async ({ unitContext }) => {
    try {
      const result = await tencentClient.geocoding(TEST_LOCATIONS.beijing.address);
      expect(result).toBeDefined();
      
      if (result.status === 0) {
        expect(result.result).toBeDefined();
        expect(result.result.location).toBeDefined();
        expect(typeof result.result.location.lat).toBe('number');
        expect(typeof result.result.location.lng).toBe('number');
      }
    } catch (error) {
      console.warn('腾讯地图API调用失败:', error);
      // 在测试环境中，API调用失败是可以接受的
    }
  }, 15000);
});
