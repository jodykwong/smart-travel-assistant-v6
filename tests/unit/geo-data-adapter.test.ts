/**
 * 智游助手v6.2 - 地理数据适配器单元测试
 * 验证数据格式转换的准确性和质量评估
 */

import { test, expect, describe, beforeEach, beforeAll, afterAll } from './test-utils';
import GeoDataAdapter from '@/lib/geo/geo-data-adapter';

describe('GeoDataAdapter 地理数据适配器', () => {
  let adapter: GeoDataAdapter;

  beforeEach(() => {
    adapter = new GeoDataAdapter();
  });

  // ============= 地理编码测试 =============

  describe('地理编码数据转换', () => {
    test('高德地理编码正常转换', () => {
      const amapResponse = {
        status: '1',
        info: 'OK',
        geocodes: [{
          formatted_address: '北京市朝阳区建国路93号万达广场',
          location: '116.457428,39.909236',
          level: '门牌号',
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          street: '建国路'
        }]
      };

      const result = adapter.normalizeGeocodingResponse(amapResponse, 'amap');

      expect(result).toBeDefined();
      expect(result.source).toBe('amap');
      expect(result.location.latitude).toBeCloseTo(39.909236, 5);
      expect(result.location.longitude).toBeCloseTo(116.457428, 5);
      expect(result.address).toBe('北京市朝阳区建国路93号万达广场');
      expect(result.addressComponents.province).toBe('北京市');
      expect(result.addressComponents.city).toBe('北京市');
      expect(result.addressComponents.district).toBe('朝阳区');
      expect(result.addressComponents.street).toBe('建国路');
      expect(result.confidence).toBeGreaterThan(0.9); // 门牌号级别应该有高置信度
      expect(result.quality.accuracy).toBeGreaterThan(0.9);
      expect(result.quality.completeness).toBeGreaterThan(0.8);
      expect(result.quality.reliability).toBe(0.95);
    });

    test('腾讯地理编码正常转换', () => {
      const tencentResponse = {
        status: 0,
        message: 'query ok',
        result: {
          location: {
            lat: 39.909236,
            lng: 116.457428
          },
          formatted_addresses: {
            recommend: '北京市朝阳区建国路93号万达广场'
          },
          address_components: {
            province: '北京市',
            city: '北京市',
            district: '朝阳区',
            street: '建国路',
            street_number: '93号'
          },
          reliability: 0.95,
          similarity: 0.9,
          deviation: 50
        }
      };

      const result = adapter.normalizeGeocodingResponse(tencentResponse, 'tencent');

      expect(result).toBeDefined();
      expect(result.source).toBe('tencent');
      expect(result.location.latitude).toBeCloseTo(39.909236, 5);
      expect(result.location.longitude).toBeCloseTo(116.457428, 5);
      expect(result.address).toBe('北京市朝阳区建国路93号万达广场');
      expect(result.addressComponents.province).toBe('北京市');
      expect(result.addressComponents.city).toBe('北京市');
      expect(result.addressComponents.district).toBe('朝阳区');
      expect(result.addressComponents.street).toBe('建国路');
      expect(result.addressComponents.streetNumber).toBe('93号');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.quality.accuracy).toBeGreaterThan(0.8);
      expect(result.quality.completeness).toBeGreaterThan(0.8);
      expect(result.quality.reliability).toBeGreaterThan(0.8);
    });

    test('高德地理编码无结果处理', () => {
      const amapResponse = {
        status: '1',
        info: 'OK',
        geocodes: []
      };

      expect(() => {
        adapter.normalizeGeocodingResponse(amapResponse, 'amap');
      }).toThrow('高德地理编码无结果');
    });

    test('腾讯地理编码错误状态处理', () => {
      const tencentResponse = {
        status: 1,
        message: 'Invalid request',
        result: {}
      };

      expect(() => {
        adapter.normalizeGeocodingResponse(tencentResponse, 'tencent');
      }).toThrow('腾讯地理编码失败: Invalid request');
    });

    test('高德地理编码坐标格式验证', () => {
      const amapResponse = {
        status: '1',
        info: 'OK',
        geocodes: [{
          formatted_address: '测试地址',
          location: 'invalid_format',
          level: '市',
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          street: '建国路'
        }]
      };

      expect(() => {
        adapter.normalizeGeocodingResponse(amapResponse, 'amap');
      }).toThrow('高德地理编码坐标格式无效');
    });

    test('腾讯地理编码坐标有效性验证', () => {
      const tencentResponse = {
        status: 0,
        message: 'query ok',
        result: {
          location: {
            lat: 'invalid',
            lng: 116.457428
          },
          formatted_addresses: {
            recommend: '测试地址'
          },
          address_components: {
            province: '北京市',
            city: '北京市',
            district: '朝阳区',
            street: '建国路'
          }
        }
      };

      expect(() => {
        adapter.normalizeGeocodingResponse(tencentResponse, 'tencent');
      }).toThrow('腾讯地理编码坐标数据无效');
    });

    test('坐标范围验证（超出中国境内）', () => {
      // 测试控制台警告，不应该抛出错误
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const amapResponse = {
        status: '1',
        info: 'OK',
        geocodes: [{
          formatted_address: '海外地址',
          location: '0,0', // 非洲几内亚湾
          level: '市',
          province: '',
          city: '',
          district: '',
          street: ''
        }]
      };

      const result = adapter.normalizeGeocodingResponse(amapResponse, 'amap');
      
      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('高德地理编码坐标超出中国范围')
      );

      consoleSpy.mockRestore();
    });
  });

  // ============= 质量评估测试 =============

  describe('质量评估算法', () => {
    test('高德地图不同级别的置信度计算', () => {
      const testCases = [
        { level: '门牌号', expectedMin: 0.98 },
        { level: '兴趣点', expectedMin: 0.95 },
        { level: '热点商圈', expectedMin: 0.93 },
        { level: '区县', expectedMin: 0.83 },
        { level: '市', expectedMin: 0.78 },
        { level: '未知级别', expectedMin: 0.78 } // 默认值
      ];

      testCases.forEach(({ level, expectedMin }) => {
        const amapResponse = {
          status: '1',
          info: 'OK',
          geocodes: [{
            formatted_address: '测试地址',
            location: '116.457428,39.909236',
            level,
            province: '北京市',
            city: '北京市',
            district: '朝阳区',
            street: '建国路'
          }]
        };

        const result = adapter.normalizeGeocodingResponse(amapResponse, 'amap');
        expect(result.confidence).toBeGreaterThanOrEqual(expectedMin);
      });
    });

    test('腾讯地图质量评估综合计算', () => {
      const tencentResponse = {
        status: 0,
        message: 'query ok',
        result: {
          location: { lat: 39.909236, lng: 116.457428 },
          formatted_addresses: { recommend: '完整地址' },
          address_components: {
            province: '北京市',
            city: '北京市',
            district: '朝阳区',
            street: '建国路',
            street_number: '93号'
          },
          reliability: 0.9,
          similarity: 0.95,
          deviation: 30
        }
      };

      const result = adapter.normalizeGeocodingResponse(tencentResponse, 'tencent');
      
      // 高质量数据应该有高评分
      expect(result.quality.accuracy).toBeGreaterThan(0.85);
      expect(result.quality.completeness).toBeGreaterThan(0.9); // 所有字段都完整
      expect(result.quality.reliability).toBeGreaterThan(0.85);
      expect(result.confidence).toBeGreaterThan(0.85);
    });

    test('数据完整性评分计算', () => {
      // 测试不完整数据的评分
      const incompleteResponse = {
        status: 0,
        message: 'query ok',
        result: {
          location: { lat: 39.909236, lng: 116.457428 },
          formatted_addresses: { recommend: '部分地址' },
          address_components: {
            province: '北京市',
            city: '', // 缺失
            district: '朝阳区',
            street: '', // 缺失
            street_number: ''
          },
          reliability: 0.8
        }
      };

      const result = adapter.normalizeGeocodingResponse(incompleteResponse, 'tencent');
      
      // 不完整数据应该有较低的完整性评分
      expect(result.quality.completeness).toBeLessThan(0.8);
    });
  });

  // ============= 边界条件测试 =============

  describe('边界条件和异常处理', () => {
    test('空字符串地址处理', () => {
      const amapResponse = {
        status: '1',
        info: 'OK',
        geocodes: [{
          formatted_address: '',
          location: '116.457428,39.909236',
          level: '市',
          province: '',
          city: '',
          district: '',
          street: ''
        }]
      };

      const result = adapter.normalizeGeocodingResponse(amapResponse, 'amap');
      
      expect(result.address).toBe('');
      expect(result.addressComponents.province).toBe('');
      expect(result.quality.completeness).toBe(0); // 所有字段都为空
    });

    test('null/undefined 字段处理', () => {
      const tencentResponse = {
        status: 0,
        message: 'query ok',
        result: {
          location: { lat: 39.909236, lng: 116.457428 },
          formatted_addresses: null,
          address_components: {
            province: null,
            city: undefined,
            district: '朝阳区',
            street: null,
            street_number: undefined
          },
          reliability: 0.8
        }
      };

      const result = adapter.normalizeGeocodingResponse(tencentResponse, 'tencent');
      
      expect(result.address).toBe('');
      expect(result.addressComponents.province).toBe('');
      expect(result.addressComponents.city).toBe('');
      expect(result.addressComponents.street).toBe('');
      expect(result.addressComponents.streetNumber).toBe('');
    });

    test('极端坐标值处理', () => {
      const extremeCoords = [
        { lng: 73, lat: 3 },     // 中国西南极点
        { lng: 135, lat: 54 },   // 中国东北极点
        { lng: 116.457428, lat: 39.909236 } // 正常坐标
      ];

      extremeCoords.forEach(coord => {
        const tencentResponse = {
          status: 0,
          message: 'query ok',
          result: {
            location: coord,
            formatted_addresses: { recommend: '极端坐标测试' },
            address_components: {
              province: '测试省',
              city: '测试市',
              district: '测试区',
              street: '测试街道'
            },
            reliability: 0.8
          }
        };

        expect(() => {
          const result = adapter.normalizeGeocodingResponse(tencentResponse, 'tencent');
          expect(result.location.latitude).toBe(coord.lat);
          expect(result.location.longitude).toBe(coord.lng);
        }).not.toThrow();
      });
    });
  });

  // ============= POI搜索测试 =============

  describe('POI搜索数据转换', () => {
    test('高德POI搜索正常转换', () => {
      const amapResponse = {
        status: '1',
        info: 'OK',
        count: '2',
        pois: [
          {
            id: '001',
            name: '北京万达广场',
            location: '116.457428,39.909236',
            address: '北京市朝阳区建国路93号',
            type: '购物中心',
            typecode: '060101',
            distance: '100',
            tel: '010-12345678',
            adname: '朝阳区'
          },
          {
            id: '002',
            name: '星巴克咖啡',
            location: '116.458428,39.910236',
            address: '北京市朝阳区建国路95号',
            type: '咖啡厅',
            typecode: '050301',
            distance: '200',
            tel: '010-87654321'
          }
        ]
      };

      const result = adapter.normalizePlaceSearchResponse(amapResponse, 'amap');

      expect(result).toBeDefined();
      expect(result.source).toBe('amap');
      expect(result.places).toHaveLength(2);
      expect(result.total).toBe(2);

      const firstPlace = result.places[0];
      expect(firstPlace.id).toBe('001');
      expect(firstPlace.name).toBe('北京万达广场');
      expect(firstPlace.location.latitude).toBeCloseTo(39.909236, 5);
      expect(firstPlace.location.longitude).toBeCloseTo(116.457428, 5);
      expect(firstPlace.address).toBe('北京市朝阳区建国路93号');
      expect(firstPlace.category).toBe('购物中心');
      expect(firstPlace.distance).toBe(100);
      expect(firstPlace.phone).toBe('010-12345678');
      expect(firstPlace.type).toBe('060101');
      expect(firstPlace.businessArea).toBe('朝阳区');

      expect(result.quality.accuracy).toBeGreaterThan(0.9);
      expect(result.quality.completeness).toBeGreaterThan(0.8);
      expect(result.quality.relevance).toBeGreaterThan(0.8);
    });

    test('腾讯POI搜索正常转换', () => {
      const tencentResponse = {
        status: 0,
        message: 'query ok',
        result: {
          count: 2,
          data: [
            {
              id: 'tx001',
              title: '北京万达广场',
              location: { lat: 39.909236, lng: 116.457428 },
              address: '北京市朝阳区建国路93号',
              category: '购物中心',
              type: 1,
              tel: '010-12345678',
              _distance: 100,
              ad_info: { district: '朝阳区' }
            },
            {
              id: 'tx002',
              title: '星巴克咖啡',
              location: { lat: 39.910236, lng: 116.458428 },
              address: '北京市朝阳区建国路95号',
              category: '咖啡厅',
              type: 2,
              tel: '010-87654321',
              _distance: 200
            }
          ]
        }
      };

      const result = adapter.normalizePlaceSearchResponse(tencentResponse, 'tencent');

      expect(result).toBeDefined();
      expect(result.source).toBe('tencent');
      expect(result.places).toHaveLength(2);
      expect(result.total).toBe(2);

      const firstPlace = result.places[0];
      expect(firstPlace.id).toBe('tx001');
      expect(firstPlace.name).toBe('北京万达广场');
      expect(firstPlace.location.latitude).toBeCloseTo(39.909236, 5);
      expect(firstPlace.location.longitude).toBeCloseTo(116.457428, 5);
      expect(firstPlace.address).toBe('北京市朝阳区建国路93号');
      expect(firstPlace.category).toBe('购物中心');
      expect(firstPlace.distance).toBe(100);
      expect(firstPlace.phone).toBe('010-12345678');
      expect(firstPlace.type).toBe('1');
      expect(firstPlace.businessArea).toBe('朝阳区');

      expect(result.quality.accuracy).toBeGreaterThan(0.85);
      expect(result.quality.completeness).toBeGreaterThan(0.8);
      expect(result.quality.relevance).toBeGreaterThan(0.8);
    });

    test('高德POI搜索无结果处理', () => {
      const amapResponse = {
        status: '1',
        info: 'OK',
        count: '0',
        pois: []
      };

      const result = adapter.normalizePlaceSearchResponse(amapResponse, 'amap');

      expect(result.places).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.quality.accuracy).toBe(0);
      expect(result.quality.completeness).toBe(0);
      expect(result.quality.relevance).toBe(0);
    });

    test('腾讯POI搜索错误状态处理', () => {
      const tencentResponse = {
        status: 1,
        message: 'Invalid request',
        result: { count: 0, data: [] }
      };

      expect(() => {
        adapter.normalizePlaceSearchResponse(tencentResponse, 'tencent');
      }).toThrow('腾讯POI搜索失败: Invalid request');
    });

    test('POI坐标格式验证', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const amapResponse = {
        status: '1',
        info: 'OK',
        count: '2',
        pois: [
          {
            id: '001',
            name: '正常POI',
            location: '116.457428,39.909236',
            address: '正常地址',
            type: '正常类型'
          },
          {
            id: '002',
            name: '异常POI',
            location: 'invalid_format',
            address: '异常地址',
            type: '异常类型'
          }
        ]
      };

      const result = adapter.normalizePlaceSearchResponse(amapResponse, 'amap');

      // 应该只返回有效的POI
      expect(result.places).toHaveLength(1);
      expect(result.places[0].id).toBe('001');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('高德POI坐标格式无效')
      );

      consoleSpy.mockRestore();
    });

    test('POI数据完整性评分', () => {
      // 测试完整数据
      const completeResponse = {
        status: '1',
        info: 'OK',
        count: '1',
        pois: [{
          id: '001',
          name: '完整POI',
          location: '116.457428,39.909236',
          address: '完整地址',
          type: '完整类型',
          tel: '010-12345678',
          typecode: '060101'
        }]
      };

      const completeResult = adapter.normalizePlaceSearchResponse(completeResponse, 'amap');

      // 测试不完整数据
      const incompleteResponse = {
        status: '1',
        info: 'OK',
        count: '1',
        pois: [{
          id: '002',
          name: '不完整POI',
          location: '116.457428,39.909236',
          address: '',
          type: '',
          tel: '',
          typecode: ''
        }]
      };

      const incompleteResult = adapter.normalizePlaceSearchResponse(incompleteResponse, 'amap');

      // 完整数据应该有更高的完整性评分
      expect(completeResult.quality.completeness).toBeGreaterThan(incompleteResult.quality.completeness);
    });
  });

  // ============= 路线规划测试 =============

  describe('路线规划数据转换', () => {
    test('高德驾车路线规划正常转换', () => {
      const amapResponse = {
        status: '1',
        info: 'OK',
        route: {
          routes: [{
            distance: '120000',
            duration: '7200',
            polyline: 'encoded_polyline_data',
            tolls: '25',
            steps: [
              {
                instruction: '沿建国路向东行驶',
                road: '建国路',
                distance: '1000',
                duration: '120',
                polyline: 'step_polyline',
                action: 'straight'
              },
              {
                instruction: '右转进入东三环',
                road: '东三环',
                distance: '5000',
                duration: '600',
                polyline: 'step_polyline2',
                action: 'turn-right'
              }
            ]
          }]
        }
      };

      const result = adapter.normalizeDirectionResponse(amapResponse, 'amap', 'driving');

      expect(result).toBeDefined();
      expect(result.source).toBe('amap');
      expect(result.routes).toHaveLength(1);

      const route = result.routes[0];
      expect(route.mode).toBe('driving');
      expect(route.distance).toBe(120000);
      expect(route.duration).toBe(7200);
      expect(route.polyline).toBe('encoded_polyline_data');
      expect(route.tolls).toBe(25);
      expect(route.steps).toHaveLength(2);

      const firstStep = route.steps[0];
      expect(firstStep.instruction).toBe('沿建国路向东行驶');
      expect(firstStep.roadName).toBe('建国路');
      expect(firstStep.distance).toBe(1000);
      expect(firstStep.duration).toBe(120);
      expect(firstStep.maneuver).toBe('straight');

      expect(result.quality.accuracy).toBeGreaterThan(0.9);
      expect(result.quality.completeness).toBeGreaterThan(0.8);
      expect(result.quality.efficiency).toBeGreaterThan(0.9);
    });

    test('腾讯步行路线规划正常转换', () => {
      const tencentResponse = {
        status: 0,
        message: 'query ok',
        result: {
          routes: [{
            distance: 2000,
            duration: 1800,
            polyline: 'tencent_polyline_data',
            steps: [
              {
                instruction: '向北步行至建国路',
                road_name: '建国路',
                distance: 500,
                duration: 450,
                polyline: 'step_polyline1',
                maneuver: 'walk',
                direction: 'north'
              },
              {
                instruction: '沿建国路向东步行',
                road_name: '建国路',
                distance: 1500,
                duration: 1350,
                polyline: 'step_polyline2',
                maneuver: 'walk',
                direction: 'east'
              }
            ]
          }]
        }
      };

      const result = adapter.normalizeDirectionResponse(tencentResponse, 'tencent', 'walking');

      expect(result).toBeDefined();
      expect(result.source).toBe('tencent');
      expect(result.routes).toHaveLength(1);

      const route = result.routes[0];
      expect(route.mode).toBe('walking');
      expect(route.distance).toBe(2000);
      expect(route.duration).toBe(1800);
      expect(route.steps).toHaveLength(2);

      const firstStep = route.steps[0];
      expect(firstStep.instruction).toBe('向北步行至建国路');
      expect(firstStep.roadName).toBe('建国路');
      expect(firstStep.distance).toBe(500);
      expect(firstStep.duration).toBe(450);
      expect(firstStep.maneuver).toBe('walk');
      expect(firstStep.orientation).toBe('north');

      expect(result.quality.accuracy).toBeGreaterThan(0.85);
      expect(result.quality.completeness).toBeGreaterThan(0.8);
      expect(result.quality.efficiency).toBeGreaterThan(0.85);
    });

    test('高德路线规划无结果处理', () => {
      const amapResponse = {
        status: '1',
        info: 'OK',
        route: {
          routes: []
        }
      };

      const result = adapter.normalizeDirectionResponse(amapResponse, 'amap', 'driving');

      expect(result.routes).toHaveLength(0);
      expect(result.quality.accuracy).toBe(0);
      expect(result.quality.completeness).toBe(0);
      expect(result.quality.efficiency).toBe(0);
    });

    test('腾讯路线规划错误状态处理', () => {
      const tencentResponse = {
        status: 1,
        message: 'No route found',
        result: { routes: [] }
      };

      expect(() => {
        adapter.normalizeDirectionResponse(tencentResponse, 'tencent', 'driving');
      }).toThrow('腾讯路线规划失败: No route found');
    });

    test('路线数据异常处理', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const amapResponse = {
        status: '1',
        info: 'OK',
        route: {
          routes: [
            {
              distance: '0',      // 异常距离
              duration: '0',      // 异常时间
              steps: []
            },
            {
              distance: '50000',  // 正常数据
              duration: '3600',
              steps: [{
                instruction: '正常步骤',
                road: '正常道路',
                distance: '1000',
                duration: '120'
              }]
            }
          ]
        }
      };

      const result = adapter.normalizeDirectionResponse(amapResponse, 'amap', 'driving');

      // 应该过滤掉异常路线，只保留正常路线
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].distance).toBe(50000);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('高德路线数据异常')
      );

      consoleSpy.mockRestore();
    });

    test('路线效率评分计算', () => {
      // 测试多路线的效率评分
      const multiRouteResponse = {
        status: '1',
        info: 'OK',
        route: {
          routes: [
            {
              distance: '50000',
              duration: '3600',
              steps: Array(15).fill({
                instruction: '详细步骤',
                road: '道路',
                distance: '1000',
                duration: '120'
              })
            },
            {
              distance: '55000',
              duration: '3900',
              steps: Array(12).fill({
                instruction: '详细步骤',
                road: '道路',
                distance: '1000',
                duration: '120'
              })
            }
          ]
        }
      };

      const result = adapter.normalizeDirectionResponse(multiRouteResponse, 'amap', 'driving');

      // 多路线且步骤详细应该有更高的效率评分
      expect(result.quality.efficiency).toBeGreaterThan(0.94);
    });
  });

  // ============= 性能测试 =============

  describe('性能测试', () => {
    test('大量数据转换性能', () => {
      const startTime = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const amapResponse = {
          status: '1',
          info: 'OK',
          geocodes: [{
            formatted_address: `测试地址${i}`,
            location: `${116.457428 + i * 0.001},${39.909236 + i * 0.001}`,
            level: '兴趣点',
            province: '北京市',
            city: '北京市',
            district: '朝阳区',
            street: '建国路'
          }]
        };

        adapter.normalizeGeocodingResponse(amapResponse, 'amap');
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / iterations;

      // 平均每次转换应该在1ms以内
      expect(avgTime).toBeLessThan(1);
    });

    test('内存使用稳定性', () => {
      // 测试多次转换不会导致内存泄漏
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10000; i++) {
        const tencentResponse = {
          status: 0,
          message: 'query ok',
          result: {
            location: { lat: 39.909236, lng: 116.457428 },
            formatted_addresses: { recommend: `地址${i}` },
            address_components: {
              province: '北京市',
              city: '北京市',
              district: '朝阳区',
              street: '建国路'
            },
            reliability: 0.8
          }
        };

        adapter.normalizeGeocodingResponse(tencentResponse, 'tencent');
      }

      // 强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // 内存增长应该在合理范围内（小于10MB）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
