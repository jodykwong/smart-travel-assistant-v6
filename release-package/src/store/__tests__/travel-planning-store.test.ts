/**
 * 智游助手v5.0 - 旅行规划状态管理测试
 * 测试Zustand store的状态管理逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTravelPlanningStore } from '../travel-planning-store';
import { createMockSessionId, createMockUserPreferences, createMockTravelPlanningState } from '@/test/setup';
import type { ProcessingError, RegionInfo, RegionData, RegionPlan } from '@/types/travel-planning';

describe('TravelPlanningStore', () => {
  beforeEach(() => {
    // 重置store状态
    const { result } = renderHook(() => useTravelPlanningStore());
    act(() => {
      result.current.resetState();
    });
  });

  describe('基础状态管理', () => {
    it('应该正确初始化状态', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      
      expect(result.current.sessionId).toBe('');
      expect(result.current.destination).toBe('');
      expect(result.current.totalDays).toBe(0);
      expect(result.current.progress).toBe(0);
      expect(result.current.currentPhase).toBe('analyze_complexity');
      expect(result.current.regions).toEqual([]);
      expect(result.current.errors).toEqual([]);
    });

    it('应该正确更新用户偏好', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const mockPreferences = {
        destination: '新疆',
        startDate: '2024-06-15',
        endDate: '2024-06-27',
        groupSize: 2,
        budget: 'mid-range' as const,
      };

      act(() => {
        result.current.updatePreferences(mockPreferences);
      });

      expect(result.current.destination).toBe('新疆');
      expect(result.current.startDate).toBe('2024-06-15');
      expect(result.current.endDate).toBe('2024-06-27');
      expect(result.current.userPreferences.groupSize).toBe(2);
      expect(result.current.userPreferences.budget).toBe('mid-range');
    });

    it('应该正确设置当前阶段', () => {
      const { result } = renderHook(() => useTravelPlanningStore());

      act(() => {
        result.current.setCurrentPhase('collect_data');
      });

      expect(result.current.currentPhase).toBe('collect_data');
    });

    it('应该正确更新进度', () => {
      const { result } = renderHook(() => useTravelPlanningStore());

      act(() => {
        result.current.updateProgress(50);
      });

      expect(result.current.progress).toBe(50);

      // 测试边界值
      act(() => {
        result.current.updateProgress(-10);
      });
      expect(result.current.progress).toBe(0);

      act(() => {
        result.current.updateProgress(150);
      });
      expect(result.current.progress).toBe(100);
    });
  });

  describe('错误处理', () => {
    it('应该正确添加错误', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const mockError: ProcessingError = {
        type: 'TEST_ERROR',
        message: 'Test error message',
        context: 'test',
        retryable: true,
        userFriendly: false,
        timestamp: new Date().toISOString(),
        severity: 'MEDIUM',
      };

      act(() => {
        result.current.addError(mockError);
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0]).toEqual(mockError);
      expect(result.current.retryCount).toBe(1);
    });

    it('应该正确清除错误', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const mockError: ProcessingError = {
        type: 'TEST_ERROR',
        message: 'Test error message',
        context: 'test',
        retryable: false,
        userFriendly: false,
        timestamp: new Date().toISOString(),
        severity: 'LOW',
      };

      act(() => {
        result.current.addError(mockError);
      });

      expect(result.current.errors).toHaveLength(1);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toHaveLength(0);
      expect(result.current.retryCount).toBe(0);
    });

    it('不可重试的错误不应该增加重试计数', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const mockError: ProcessingError = {
        type: 'NON_RETRYABLE_ERROR',
        message: 'Non-retryable error',
        context: 'test',
        retryable: false,
        userFriendly: true,
        timestamp: new Date().toISOString(),
        severity: 'HIGH',
      };

      act(() => {
        result.current.addError(mockError);
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('区域管理', () => {
    const mockRegions: RegionInfo[] = [
      {
        name: '乌鲁木齐',
        priority: 1,
        estimatedDays: 3,
        complexity: 0.8,
        coordinates: [87.6168, 43.8256],
        description: '新疆首府',
      },
      {
        name: '喀什',
        priority: 2,
        estimatedDays: 4,
        complexity: 1.2,
        coordinates: [75.9877, 39.4677],
        description: '古丝绸之路重镇',
      },
    ];

    it('应该正确设置区域列表', () => {
      const { result } = renderHook(() => useTravelPlanningStore());

      act(() => {
        result.current.setRegions(mockRegions);
      });

      expect(result.current.regions).toEqual(mockRegions);
      expect(result.current.currentRegionIndex).toBe(0);
    });

    it('应该正确设置当前区域索引', () => {
      const { result } = renderHook(() => useTravelPlanningStore());

      act(() => {
        result.current.setRegions(mockRegions);
        result.current.setCurrentRegionIndex(1);
      });

      expect(result.current.currentRegionIndex).toBe(1);

      // 测试边界值
      act(() => {
        result.current.setCurrentRegionIndex(-1);
      });
      expect(result.current.currentRegionIndex).toBe(0);

      act(() => {
        result.current.setCurrentRegionIndex(10);
      });
      expect(result.current.currentRegionIndex).toBe(1); // 最大索引
    });

    it('应该正确更新区域数据', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const mockRegionData: RegionData = {
        attractions: [],
        restaurants: [],
        hotels: [],
        weather: {
          temperature: { min: 15, max: 25, avg: 20 },
          condition: 'sunny',
          humidity: 60,
          rainfall: 0,
        },
        transportation: {
          flights: [],
          trains: [],
          buses: [],
        },
        dataQuality: 0.9 as any,
        lastUpdated: new Date().toISOString(),
      };

      act(() => {
        result.current.updateRegionData('乌鲁木齐', mockRegionData);
      });

      expect(result.current.realData['乌鲁木齐']).toEqual(mockRegionData);
    });

    it('应该正确更新区域规划', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const mockRegionPlan: RegionPlan = {
        regionName: '乌鲁木齐',
        days: [],
        totalCost: 3000,
        highlights: ['天山天池', '新疆博物馆'],
        tips: ['注意防晒', '准备厚衣服'],
        qualityScore: 0.85 as any,
        tokensUsed: 2500 as any,
      };

      act(() => {
        result.current.updateRegionPlan('乌鲁木齐', mockRegionPlan);
      });

      expect(result.current.regionPlans['乌鲁木齐']).toEqual(mockRegionPlan);
    });
  });

  describe('计算属性', () => {
    const mockRegions: RegionInfo[] = [
      {
        name: '乌鲁木齐',
        priority: 1,
        estimatedDays: 3,
        complexity: 0.8,
        coordinates: [87.6168, 43.8256],
        description: '新疆首府',
      },
      {
        name: '喀什',
        priority: 2,
        estimatedDays: 4,
        complexity: 1.2,
        coordinates: [75.9877, 39.4677],
        description: '古丝绸之路重镇',
      },
    ];

    it('应该正确获取当前区域', () => {
      const { result } = renderHook(() => useTravelPlanningStore());

      act(() => {
        result.current.setRegions(mockRegions);
        result.current.setCurrentRegionIndex(1);
      });

      const currentRegion = result.current.getCurrentRegion();
      expect(currentRegion).toEqual(mockRegions[1]);
    });

    it('应该正确获取已完成的区域', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const mockPlan: RegionPlan = {
        regionName: '乌鲁木齐',
        days: [],
        totalCost: 3000,
        highlights: [],
        tips: [],
        qualityScore: 0.8 as any,
        tokensUsed: 2000 as any,
      };

      act(() => {
        result.current.updateRegionPlan('乌鲁木齐', mockPlan);
      });

      const completedRegions = result.current.getCompletedRegions();
      expect(completedRegions).toEqual(['乌鲁木齐']);
    });

    it('应该正确计算总预估费用', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const mockPlan1: RegionPlan = {
        regionName: '乌鲁木齐',
        days: [],
        totalCost: 3000,
        highlights: [],
        tips: [],
        qualityScore: 0.8 as any,
        tokensUsed: 2000 as any,
      };
      const mockPlan2: RegionPlan = {
        regionName: '喀什',
        days: [],
        totalCost: 4000,
        highlights: [],
        tips: [],
        qualityScore: 0.9 as any,
        tokensUsed: 2500 as any,
      };

      act(() => {
        result.current.updateRegionPlan('乌鲁木齐', mockPlan1);
        result.current.updateRegionPlan('喀什', mockPlan2);
      });

      const totalCost = result.current.getTotalEstimatedCost();
      expect(totalCost).toBe(7000);
    });

    it('应该正确计算整体质量评分', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const mockPlan1: RegionPlan = {
        regionName: '乌鲁木齐',
        days: [],
        totalCost: 3000,
        highlights: [],
        tips: [],
        qualityScore: 0.8 as any,
        tokensUsed: 2000 as any,
      };
      const mockPlan2: RegionPlan = {
        regionName: '喀什',
        days: [],
        totalCost: 4000,
        highlights: [],
        tips: [],
        qualityScore: 0.9 as any,
        tokensUsed: 2500 as any,
      };

      act(() => {
        result.current.updateRegionPlan('乌鲁木齐', mockPlan1);
        result.current.updateRegionPlan('喀什', mockPlan2);
      });

      const overallScore = result.current.getOverallQualityScore();
      expect(overallScore).toBe(0.85); // (0.8 + 0.9) / 2
    });
  });

  describe('会话管理', () => {
    it('应该正确启动新会话', () => {
      const { result } = renderHook(() => useTravelPlanningStore());
      const sessionId = createMockSessionId();

      // 先设置一些状态
      act(() => {
        result.current.updatePreferences({ destination: '北京' });
        result.current.updateProgress(50);
      });

      // 启动新会话应该重置状态
      act(() => {
        result.current.startNewSession(sessionId);
      });

      expect(result.current.sessionId).toBe(sessionId);
      expect(result.current.destination).toBe('');
      expect(result.current.progress).toBe(0);
      expect(result.current.currentPhase).toBe('analyze_complexity');
    });

    it('应该正确重置状态', () => {
      const { result } = renderHook(() => useTravelPlanningStore());

      // 设置一些状态
      act(() => {
        result.current.updatePreferences({ destination: '上海' });
        result.current.updateProgress(75);
        result.current.setCurrentPhase('merge_regions');
      });

      // 重置状态
      act(() => {
        result.current.resetState();
      });

      expect(result.current.sessionId).toBe('');
      expect(result.current.destination).toBe('');
      expect(result.current.progress).toBe(0);
      expect(result.current.currentPhase).toBe('analyze_complexity');
    });
  });
});
