/**
 * 智游助手v5.0 - LangGraph规划引擎
 * 基于状态图的分治征服旅行规划核心引擎
 */

import { StateGraph, END } from '@langchain/langgraph';
import type {
  TravelPlanningState,
  PlanningPhase,
  RegionInfo,
  RegionData,
  RegionPlan,
  ProcessingError,
  SessionId,
} from '@/types/travel-planning';
import { WebSocketManager } from '@/lib/websocket-manager';
import { TravelMCPAdapter } from '@/lib/mcp/travel-mcp-adapter';
import { AIRegionPlanner } from '@/lib/ai-planners/region-planner';
import { PlanMerger } from '@/lib/plan-merger';
import { updateSessionState, broadcastProgress } from '@/lib/session-manager';

// ============= 配置接口 =============

interface PlanningEngineConfig {
  maxTokens: number;
  priority: 'speed' | 'quality' | 'balanced';
  sessionId: SessionId;
}

// ============= 节点函数类型 =============

type NodeFunction = (state: TravelPlanningState) => Promise<TravelPlanningState>;

// ============= LangGraph规划引擎 =============

export class LangGraphPlanningEngine {
  private readonly config: PlanningEngineConfig;
  private readonly wsManager: WebSocketManager;
  private readonly mcpAdapter: TravelMCPAdapter;
  private readonly regionPlanner: AIRegionPlanner;
  private readonly planMerger: PlanMerger;
  private readonly stateGraph: StateGraph<TravelPlanningState>;

  constructor(config: PlanningEngineConfig) {
    this.config = config;
    this.wsManager = new WebSocketManager();
    this.mcpAdapter = new TravelMCPAdapter();
    this.regionPlanner = new AIRegionPlanner();
    this.planMerger = new PlanMerger();

    this.stateGraph = this.buildStateGraph();
  }

  // ============= 状态图构建 =============

  private buildStateGraph(): StateGraph<TravelPlanningState> {
    const graph = new StateGraph<TravelPlanningState>({
      channels: {
        sessionId: { value: null },
        destination: { value: null },
        totalDays: { value: null },
        startDate: { value: null },
        endDate: { value: null },
        userPreferences: { value: null },
        regions: { value: [] },
        currentRegionIndex: { value: 0 },
        currentPhase: { value: 'analyze_complexity' },
        realData: { value: {} },
        regionPlans: { value: {} },
        progress: { value: 0 },
        errors: { value: [] },
        retryCount: { value: 0 },
        qualityScore: { value: 0 },
        tokensUsed: { value: 0 },
        tokensRemaining: { value: 20000 },
      },
    });

    // 添加节点
    graph.addNode('analyze_complexity', this.analyzeComplexity.bind(this));
    graph.addNode('region_decomposition', this.regionDecomposition.bind(this));
    graph.addNode('collect_data', this.collectData.bind(this));
    graph.addNode('plan_region', this.planRegion.bind(this));
    graph.addNode('validate_region', this.validateRegion.bind(this));
    graph.addNode('merge_regions', this.mergeRegions.bind(this));
    graph.addNode('optimize_transitions', this.optimizeTransitions.bind(this));
    graph.addNode('generate_output', this.generateOutput.bind(this));

    // 设置入口点
    graph.setEntryPoint('analyze_complexity');

    // 添加边
    graph.addEdge('analyze_complexity', 'region_decomposition');
    graph.addEdge('region_decomposition', 'collect_data');
    
    // 条件边：数据收集后的路由
    graph.addConditionalEdges(
      'collect_data',
      this.routeAfterDataCollection.bind(this),
      {
        'plan_region': 'plan_region',
        'merge_regions': 'merge_regions',
      }
    );
    
    graph.addEdge('plan_region', 'validate_region');
    
    // 条件边：验证后的路由
    graph.addConditionalEdges(
      'validate_region',
      this.routeAfterValidation.bind(this),
      {
        'collect_data': 'collect_data', // 重新收集数据
        'plan_region': 'plan_region',   // 重新规划
        'merge_regions': 'merge_regions', // 继续合并
      }
    );
    
    graph.addEdge('merge_regions', 'optimize_transitions');
    graph.addEdge('optimize_transitions', 'generate_output');
    graph.addEdge('generate_output', END);

    return graph;
  }

  // ============= 核心节点实现 =============

  private async analyzeComplexity(state: TravelPlanningState): Promise<TravelPlanningState> {
    await this.updateProgress(state, 'analyze_complexity', 5);

    // 分析目的地复杂度
    const complexity = this.calculateDestinationComplexity(state);
    
    return {
      ...state,
      currentPhase: 'region_decomposition',
      progress: 10,
    };
  }

  private async regionDecomposition(state: TravelPlanningState): Promise<TravelPlanningState> {
    await this.updateProgress(state, 'region_decomposition', 15);

    // 基于目的地和天数进行区域分解
    const regions = await this.decomposeIntoRegions(state);
    
    return {
      ...state,
      regions,
      currentRegionIndex: 0,
      currentPhase: 'collect_data',
      progress: 25,
    };
  }

  private async collectData(state: TravelPlanningState): Promise<TravelPlanningState> {
    const currentRegion = state.regions[state.currentRegionIndex];
    if (!currentRegion) {
      throw new Error('No current region to collect data for');
    }

    await this.updateProgress(state, 'collect_data', 30 + state.currentRegionIndex * 10);

    try {
      // 使用高德MCP收集区域数据
      const regionData = await this.mcpAdapter.collectRegionData(
        currentRegion,
        state.userPreferences,
        {
          maxPOIsPerCategory: 15,
          includeWeather: true,
          cacheEnabled: true,
        }
      );

      const updatedRealData = {
        ...state.realData,
        [currentRegion.name]: regionData,
      };

      return {
        ...state,
        realData: updatedRealData,
        currentPhase: 'plan_region',
      };
    } catch (error) {
      const processingError: ProcessingError = {
        type: 'DATA_COLLECTION_FAILED',
        message: `Failed to collect data for ${currentRegion.name}: ${error}`,
        context: 'collect_data',
        retryable: true,
        userFriendly: false,
        timestamp: new Date().toISOString(),
        severity: 'MEDIUM',
      };

      return {
        ...state,
        errors: [...state.errors, processingError],
        retryCount: state.retryCount + 1,
      };
    }
  }

  private async planRegion(state: TravelPlanningState): Promise<TravelPlanningState> {
    const currentRegion = state.regions[state.currentRegionIndex];
    const regionData = state.realData[currentRegion.name];

    if (!regionData) {
      throw new Error(`No data available for region: ${currentRegion.name}`);
    }

    await this.updateProgress(state, 'plan_region', 50 + state.currentRegionIndex * 15);

    try {
      // 使用AI生成区域规划
      const regionPlan = await this.regionPlanner.generateRegionPlan(
        currentRegion,
        regionData,
        state.userPreferences,
        this.config.maxTokens / state.regions.length // Token分片
      );

      const updatedRegionPlans = {
        ...state.regionPlans,
        [currentRegion.name]: regionPlan,
      };

      return {
        ...state,
        regionPlans: updatedRegionPlans,
        currentPhase: 'validate_region',
        tokensUsed: (state.tokensUsed + regionPlan.tokensUsed) as any,
      };
    } catch (error) {
      const processingError: ProcessingError = {
        type: 'REGION_PLANNING_FAILED',
        message: `Failed to plan region ${currentRegion.name}: ${error}`,
        context: 'plan_region',
        retryable: true,
        userFriendly: false,
        timestamp: new Date().toISOString(),
        severity: 'HIGH',
      };

      return {
        ...state,
        errors: [...state.errors, processingError],
        retryCount: state.retryCount + 1,
      };
    }
  }

  private async validateRegion(state: TravelPlanningState): Promise<TravelPlanningState> {
    const currentRegion = state.regions[state.currentRegionIndex];
    const regionPlan = state.regionPlans[currentRegion.name];

    await this.updateProgress(state, 'validate_region', 70 + state.currentRegionIndex * 5);

    // 验证区域规划质量
    const isValid = this.validateRegionPlan(regionPlan, currentRegion);
    
    if (!isValid && state.retryCount < 3) {
      // 重新规划
      return {
        ...state,
        currentPhase: 'plan_region',
        retryCount: state.retryCount + 1,
      };
    }

    // 移动到下一个区域或合并阶段
    const nextRegionIndex = state.currentRegionIndex + 1;
    
    if (nextRegionIndex < state.regions.length) {
      return {
        ...state,
        currentRegionIndex: nextRegionIndex,
        currentPhase: 'collect_data',
        retryCount: 0,
      };
    } else {
      return {
        ...state,
        currentPhase: 'merge_regions',
        progress: 80,
      };
    }
  }

  private async mergeRegions(state: TravelPlanningState): Promise<TravelPlanningState> {
    await this.updateProgress(state, 'merge_regions', 85);

    // 合并所有区域规划
    const masterPlan = await this.planMerger.mergeRegionPlans(
      Object.values(state.regionPlans),
      state
    );

    return {
      ...state,
      masterPlan,
      currentPhase: 'optimize_transitions',
      progress: 90,
    };
  }

  private async optimizeTransitions(state: TravelPlanningState): Promise<TravelPlanningState> {
    await this.updateProgress(state, 'optimize_transitions', 95);

    // 优化区域间的交通和过渡
    // 这里可以添加更复杂的优化逻辑

    return {
      ...state,
      currentPhase: 'generate_output',
    };
  }

  private async generateOutput(state: TravelPlanningState): Promise<TravelPlanningState> {
    await this.updateProgress(state, 'generate_output', 100);

    // 生成最终的HTML输出
    const htmlOutput = await this.generateHTMLOutput(state);

    return {
      ...state,
      htmlOutput,
      currentPhase: 'completed',
      progress: 100,
    };
  }

  // ============= 路由函数 =============

  private routeAfterDataCollection(state: TravelPlanningState): string {
    const currentRegion = state.regions[state.currentRegionIndex];
    const hasData = state.realData[currentRegion.name];
    
    if (hasData) {
      return 'plan_region';
    } else if (state.retryCount >= 3) {
      // 数据收集失败太多次，跳过这个区域
      return 'merge_regions';
    } else {
      return 'collect_data'; // 重试数据收集
    }
  }

  private routeAfterValidation(state: TravelPlanningState): string {
    const currentRegion = state.regions[state.currentRegionIndex];
    const regionPlan = state.regionPlans[currentRegion.name];
    
    if (!regionPlan || regionPlan.qualityScore < 0.6) {
      if (state.retryCount < 3) {
        return 'plan_region'; // 重新规划
      } else {
        return 'merge_regions'; // 放弃优化，继续合并
      }
    }
    
    return 'merge_regions'; // 质量合格，继续合并
  }

  // ============= 辅助方法 =============

  private calculateDestinationComplexity(state: TravelPlanningState): number {
    // 基于目的地和天数计算复杂度
    const dayComplexity = state.totalDays / 10;
    const destinationComplexity = state.destination === '新疆' ? 1.5 : 1.0;
    return dayComplexity * destinationComplexity;
  }

  private async decomposeIntoRegions(state: TravelPlanningState): Promise<RegionInfo[]> {
    // 基于目的地进行区域分解
    if (state.destination === '新疆') {
      return [
        {
          name: '乌鲁木齐',
          priority: 1,
          estimatedDays: 3,
          complexity: 0.8,
          coordinates: [87.6168, 43.8256],
          description: '新疆首府，现代化都市',
        },
        {
          name: '喀什',
          priority: 2,
          estimatedDays: 4,
          complexity: 1.2,
          coordinates: [75.9877, 39.4677],
          description: '古丝绸之路重镇',
        },
        {
          name: '伊犁',
          priority: 3,
          estimatedDays: 3,
          complexity: 1.0,
          coordinates: [81.3179, 43.9219],
          description: '薰衣草之乡',
        },
        {
          name: '吐鲁番',
          priority: 4,
          estimatedDays: 3,
          complexity: 0.9,
          coordinates: [89.1841, 42.9476],
          description: '火洲古城',
        },
      ];
    }
    
    // 其他目的地的分解逻辑
    return [];
  }

  private validateRegionPlan(plan: RegionPlan, region: RegionInfo): boolean {
    return plan.qualityScore >= 0.6 && plan.days.length > 0;
  }

  private async updateProgress(
    state: TravelPlanningState,
    phase: PlanningPhase,
    progress: number
  ): Promise<void> {
    // 更新会话状态
    await updateSessionState(this.config.sessionId, {
      currentPhase: phase,
      progress,
    });

    // 广播进度更新
    await broadcastProgress(this.config.sessionId, {
      sessionId: this.config.sessionId,
      phase,
      progress,
      currentRegion: state.regions[state.currentRegionIndex]?.name,
      message: this.getPhaseMessage(phase),
    });
  }

  private getPhaseMessage(phase: PlanningPhase): string {
    const messages = {
      'analyze_complexity': '正在分析目的地复杂度...',
      'region_decomposition': '正在进行区域分解...',
      'collect_data': '正在收集地理数据...',
      'plan_region': '正在生成区域规划...',
      'validate_region': '正在验证规划质量...',
      'merge_regions': '正在合并区域规划...',
      'optimize_transitions': '正在优化行程安排...',
      'generate_output': '正在生成最终规划...',
      'completed': '规划生成完成！',
      'error': '规划过程出现错误',
    };
    
    return messages[phase] || '正在处理...';
  }

  private async generateHTMLOutput(state: TravelPlanningState): Promise<string> {
    // 生成HTML格式的旅行规划
    // 这里可以使用模板引擎或者直接拼接HTML
    return `<div>Generated travel plan for ${state.destination}</div>`;
  }

  // ============= 公共接口 =============

  async startPlanning(initialState: TravelPlanningState): Promise<void> {
    try {
      const compiledGraph = this.stateGraph.compile();
      await compiledGraph.invoke(initialState);
    } catch (error) {
      console.error('LangGraph planning failed:', error);
      throw error;
    }
  }
}
