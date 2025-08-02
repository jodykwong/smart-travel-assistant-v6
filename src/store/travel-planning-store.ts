/**
 * 智游助手v5.0 - 旅行规划状态管理
 * 基于Zustand实现的全局状态管理
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  TravelPlanningState,
  TravelPreferencesForm,
  PlanningProgress,
  ProcessingError,
  SessionId,
  PlanningPhase,
  RegionInfo,
  RegionData,
  RegionPlan,
  CompleteTravelPlan,
} from '@/types/travel-planning';

// ============= 状态接口定义 =============

interface TravelPlanningStore extends TravelPlanningState {
  // 状态更新方法
  updatePreferences: (preferences: Partial<TravelPreferencesForm>) => void;
  setCurrentPhase: (phase: PlanningPhase) => void;
  updateProgress: (progress: number) => void;
  addError: (error: ProcessingError) => void;
  clearErrors: () => void;
  
  // 区域管理
  setRegions: (regions: RegionInfo[]) => void;
  setCurrentRegionIndex: (index: number) => void;
  updateRegionData: (regionName: string, data: RegionData) => void;
  updateRegionPlan: (regionName: string, plan: RegionPlan) => void;
  
  // 最终结果
  setMasterPlan: (plan: CompleteTravelPlan) => void;
  setHtmlOutput: (html: string) => void;
  
  // Token管理
  updateTokenUsage: (used: number, remaining: number) => void;
  
  // 会话管理
  startNewSession: (sessionId: SessionId) => void;
  resetState: () => void;
  
  // 计算属性
  getCurrentRegion: () => RegionInfo | undefined;
  getCompletedRegions: () => string[];
  getTotalEstimatedCost: () => number;
  getOverallQualityScore: () => number;
}

// ============= 初始状态 =============

const createInitialState = (): Omit<TravelPlanningState, keyof TravelPlanningStore> => ({
  sessionId: '' as SessionId,
  destination: '',
  totalDays: 0,
  startDate: '',
  endDate: '',
  userPreferences: {
    budget: 'mid-range',
    travelStyles: [],
    accommodation: 'hotel',
    groupSize: 2,
  },
  regions: [],
  currentRegionIndex: 0,
  currentPhase: 'analyze_complexity',
  realData: {},
  regionPlans: {},
  progress: 0,
  errors: [],
  retryCount: 0,
  qualityScore: 0 as any,
  tokensUsed: 0 as any,
  tokensRemaining: 20000 as any,
});

// ============= 状态存储实现 =============

export const useTravelPlanningStore = create<TravelPlanningStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...createInitialState(),

          // ============= 基础状态更新 =============
          
          updatePreferences: (preferences) => {
            set((state) => {
              Object.assign(state.userPreferences, preferences);
              if (preferences.destination) {
                state.destination = preferences.destination;
              }
              if (preferences.startDate) {
                state.startDate = preferences.startDate;
              }
              if (preferences.endDate) {
                state.endDate = preferences.endDate;
              }
              if (preferences.groupSize) {
                state.userPreferences.groupSize = preferences.groupSize;
              }
            });
          },

          setCurrentPhase: (phase) => {
            set((state) => {
              state.currentPhase = phase;
            });
          },

          updateProgress: (progress) => {
            set((state) => {
              state.progress = Math.max(0, Math.min(100, progress));
            });
          },

          addError: (error) => {
            set((state) => {
              state.errors = [...state.errors, error];
              if (error.retryable) {
                state.retryCount += 1;
              }
            });
          },

          clearErrors: () => {
            set((state) => {
              state.errors = [];
              state.retryCount = 0;
            });
          },

          // ============= 区域管理 =============

          setRegions: (regions) => {
            set((state) => {
              state.regions = regions;
              state.currentRegionIndex = 0;
            });
          },

          setCurrentRegionIndex: (index) => {
            set((state) => {
              const maxIndex = state.regions.length - 1;
              state.currentRegionIndex = Math.max(0, Math.min(maxIndex, index));
            });
          },

          updateRegionData: (regionName, data) => {
            set((state) => {
              state.realData = {
                ...state.realData,
                [regionName]: data,
              };
            });
          },

          updateRegionPlan: (regionName, plan) => {
            set((state) => {
              state.regionPlans = {
                ...state.regionPlans,
                [regionName]: plan,
              };
            });
          },

          // ============= 最终结果 =============

          setMasterPlan: (plan) => {
            set((state) => {
              state.masterPlan = plan;
              state.currentPhase = 'completed';
              state.progress = 100;
            });
          },

          setHtmlOutput: (html) => {
            set((state) => {
              state.htmlOutput = html;
            });
          },

          // ============= Token管理 =============

          updateTokenUsage: (used, remaining) => {
            set((state) => {
              state.tokensUsed = used as any;
              state.tokensRemaining = remaining as any;
            });
          },

          // ============= 会话管理 =============

          startNewSession: (sessionId) => {
            set((state) => {
              Object.assign(state, createInitialState());
              state.sessionId = sessionId;
            });
          },

          resetState: () => {
            set((state) => {
              Object.assign(state, createInitialState());
            });
          },

          // ============= 计算属性 =============

          getCurrentRegion: () => {
            const state = get();
            return state.regions[state.currentRegionIndex];
          },

          getCompletedRegions: () => {
            const state = get();
            return Object.keys(state.regionPlans);
          },

          getTotalEstimatedCost: () => {
            const state = get();
            return Object.values(state.regionPlans).reduce(
              (total, plan) => total + plan.totalCost,
              0
            );
          },

          getOverallQualityScore: () => {
            const state = get();
            const plans = Object.values(state.regionPlans);
            if (plans.length === 0) return 0;
            
            const totalScore = plans.reduce(
              (sum, plan) => sum + plan.qualityScore,
              0
            );
            return totalScore / plans.length;
          },
        }))
      ),
      {
        name: 'travel-planning-store',
        partialize: (state) => ({
          sessionId: state.sessionId,
          destination: state.destination,
          totalDays: state.totalDays,
          startDate: state.startDate,
          endDate: state.endDate,
          userPreferences: state.userPreferences,
          masterPlan: state.masterPlan,
        }),
      }
    ),
    {
      name: 'travel-planning-store',
    }
  )
);

// ============= 选择器钩子 =============

export const useCurrentRegion = () => 
  useTravelPlanningStore((state) => state.getCurrentRegion());

export const useCompletedRegions = () => 
  useTravelPlanningStore((state) => state.getCompletedRegions());

export const useTotalEstimatedCost = () => 
  useTravelPlanningStore((state) => state.getTotalEstimatedCost());

export const useOverallQualityScore = () => 
  useTravelPlanningStore((state) => state.getOverallQualityScore());

export const usePlanningProgress = () => 
  useTravelPlanningStore((state) => ({
    progress: state.progress,
    phase: state.currentPhase,
    currentRegion: state.getCurrentRegion()?.name,
    errors: state.errors,
  }));

// ============= 状态订阅钩子 =============

export const useProgressSubscription = (callback: (progress: number) => void) => {
  return useTravelPlanningStore.subscribe(
    (state) => state.progress,
    callback
  );
};

export const usePhaseSubscription = (callback: (phase: PlanningPhase) => void) => {
  return useTravelPlanningStore.subscribe(
    (state) => state.currentPhase,
    callback
  );
};
