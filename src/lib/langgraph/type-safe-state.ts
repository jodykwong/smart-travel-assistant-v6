/**
 * 智游助手v6.2 - 类型安全状态操作
 * 遵循原则: [代码规约-类型安全] + [为失败而设计] + [SOLID-单一职责]
 * 
 * 核心功能:
 * 1. 类型安全的状态更新函数
 * 2. 编译时类型检查
 * 3. 运行时类型守卫
 * 4. 状态不变性保证
 */

import { 
  SmartTravelState,
  TravelPlanningState, 
  AnalysisState, 
  ExecutionState, 
  MonitoringState,
  StateMetadata,
  PlanningStatus,
  ProcessingError
} from './smart-travel-state';

// ============= 类型安全的状态更新函数 =============

/**
 * 类型安全的状态更新 - 泛型版本
 * 遵循原则: [代码规约-类型安全] + [为失败而设计]
 */
export function updateTravelState<K extends keyof SmartTravelState>(
  state: SmartTravelState,
  key: K,
  value: SmartTravelState[K]
): SmartTravelState {
  // 类型检查
  if (!isValidStateKey(key)) {
    throw new TypeError(`Invalid state key: ${String(key)}`);
  }

  // 创建新状态，保证不变性
  const newState: SmartTravelState = {
    ...state,
    [key]: value,
    metadata: {
      ...state.metadata,
      version: state.metadata.version + 1,
      lastUpdated: Date.now()
    }
  };

  // 运行时验证
  if (!validateStateStructure(newState)) {
    throw new Error('State update resulted in invalid state structure');
  }

  return newState;
}

/**
 * 安全更新规划状态
 */
export function updatePlanningState(
  state: SmartTravelState,
  updates: Partial<TravelPlanningState>
): SmartTravelState {
  const newPlanning: TravelPlanningState = {
    ...state.planning,
    ...updates
  };

  // 业务逻辑验证
  if (updates.status && !isValidStatusTransition(state.planning.status, updates.status)) {
    throw new Error(`Invalid status transition: ${state.planning.status} -> ${updates.status}`);
  }

  return updateTravelState(state, 'planning', newPlanning);
}

/**
 * 安全更新分析状态
 */
export function updateAnalysisState(
  state: SmartTravelState,
  updates: Partial<AnalysisState>
): SmartTravelState {
  const newAnalysis: AnalysisState = {
    ...state.analysis,
    ...updates
  };

  // 复杂度评分验证
  if (updates.complexity && updates.complexity.overall > 1) {
    throw new Error('Complexity score must be <= 1');
  }

  // 服务质量评分验证
  if (updates.serviceQuality && updates.serviceQuality.qualityScore > 1) {
    throw new Error('Quality score must be <= 1');
  }

  return updateTravelState(state, 'analysis', newAnalysis);
}

/**
 * 安全更新执行状态
 */
export function updateExecutionState(
  state: SmartTravelState,
  updates: Partial<ExecutionState>
): SmartTravelState {
  const newExecution: ExecutionState = {
    ...state.execution,
    ...updates
  };

  return updateTravelState(state, 'execution', newExecution);
}

/**
 * 安全更新监控状态
 */
export function updateMonitoringState(
  state: SmartTravelState,
  updates: Partial<MonitoringState>
): SmartTravelState {
  const newMonitoring: MonitoringState = {
    ...state.monitoring,
    ...updates,
    // 特殊处理错误数组的合并
    errors: updates.errors ? 
      [...state.monitoring.errors, ...updates.errors] : 
      state.monitoring.errors
  };

  return updateTravelState(state, 'monitoring', newMonitoring);
}

/**
 * 添加错误到监控状态
 */
export function addError(
  state: SmartTravelState,
  error: ProcessingError
): SmartTravelState {
  return updateMonitoringState(state, {
    errors: [error]
  });
}

/**
 * 增加恢复尝试次数
 */
export function incrementRecoveryAttempts(
  state: SmartTravelState
): SmartTravelState {
  return updateMonitoringState(state, {
    recoveryAttempts: state.monitoring.recoveryAttempts + 1
  });
}

// ============= 类型守卫函数 =============

/**
 * 验证状态键的有效性
 */
function isValidStateKey(key: unknown): key is keyof SmartTravelState {
  const validKeys: (keyof SmartTravelState)[] = [
    'planning', 'analysis', 'execution', 'monitoring', 'metadata'
  ];
  return typeof key === 'string' && validKeys.includes(key as keyof SmartTravelState);
}

/**
 * 验证状态结构的完整性
 */
function validateStateStructure(state: SmartTravelState): boolean {
  try {
    // 检查必需的顶级属性
    if (!state.planning || !state.analysis || !state.execution || 
        !state.monitoring || !state.metadata) {
      return false;
    }

    // 检查核心上下文
    if (!state.planning.context || 
        !state.planning.context.sessionId || 
        !state.planning.context.requestId) {
      return false;
    }

    // 检查旅行请求
    if (!state.planning.request || 
        !state.planning.request.origin || 
        !state.planning.request.destination) {
      return false;
    }

    // 检查监控状态
    if (!Array.isArray(state.monitoring.errors) || 
        typeof state.monitoring.recoveryAttempts !== 'number') {
      return false;
    }

    // 检查元数据
    if (typeof state.metadata.version !== 'number' || 
        typeof state.metadata.lastUpdated !== 'number') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * 验证状态转换的有效性
 */
function isValidStatusTransition(
  currentStatus: PlanningStatus, 
  newStatus: PlanningStatus
): boolean {
  // 定义有效的状态转换
  const validTransitions: Record<PlanningStatus, PlanningStatus[]> = {
    'pending': ['analyzing', 'failed'],
    'analyzing': ['collecting', 'failed', 'recovered'],
    'collecting': ['optimizing', 'failed', 'recovered'],
    'optimizing': ['completed', 'failed', 'recovered'],
    'completed': [], // 完成状态不能转换
    'failed': ['recovered', 'analyzing'], // 失败可以恢复或重新分析
    'recovered': ['analyzing', 'collecting', 'optimizing'] // 恢复后可以继续
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

// ============= 高级类型操作 =============

/**
 * 深度只读类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 状态差异类型
 */
export type StateDiff<T> = {
  [K in keyof T]?: T[K] extends object ? StateDiff<T[K]> : T[K];
};

/**
 * 计算状态差异
 */
export function calculateStateDiff(
  oldState: SmartTravelState,
  newState: SmartTravelState
): StateDiff<SmartTravelState> {
  const diff: StateDiff<SmartTravelState> = {};

  // 比较各个状态部分
  if (JSON.stringify(oldState.planning) !== JSON.stringify(newState.planning)) {
    (diff as any).planning = newState.planning;
  }

  if (JSON.stringify(oldState.analysis) !== JSON.stringify(newState.analysis)) {
    (diff as any).analysis = newState.analysis;
  }

  if (JSON.stringify(oldState.execution) !== JSON.stringify(newState.execution)) {
    (diff as any).execution = newState.execution;
  }

  if (JSON.stringify(oldState.monitoring) !== JSON.stringify(newState.monitoring)) {
    (diff as any).monitoring = newState.monitoring;
  }

  if (JSON.stringify(oldState.metadata) !== JSON.stringify(newState.metadata)) {
    (diff as any).metadata = newState.metadata;
  }

  return diff;
}

/**
 * 创建不可变状态
 */
export function createImmutableState(state: SmartTravelState): DeepReadonly<SmartTravelState> {
  return Object.freeze({
    planning: Object.freeze({
      ...state.planning,
      context: Object.freeze(state.planning.context),
      request: Object.freeze(state.planning.request)
    }),
    analysis: Object.freeze(state.analysis),
    execution: Object.freeze(state.execution),
    monitoring: Object.freeze({
      ...state.monitoring,
      errors: Object.freeze([...state.monitoring.errors])
    }),
    metadata: Object.freeze(state.metadata)
  }) as DeepReadonly<SmartTravelState>;
}

// ============= 状态查询辅助函数 =============

/**
 * 检查状态是否处于特定阶段
 */
export function isInPhase(state: SmartTravelState, phase: PlanningStatus): boolean {
  return state.planning.status === phase;
}

/**
 * 检查是否有错误
 */
export function hasErrors(state: SmartTravelState): boolean {
  return state.monitoring.errors.length > 0;
}

/**
 * 获取最新错误
 */
export function getLatestError(state: SmartTravelState): ProcessingError | undefined {
  const errors = state.monitoring.errors;
  return errors.length > 0 ? errors[errors.length - 1] : undefined;
}

/**
 * 检查是否需要恢复
 */
export function needsRecovery(state: SmartTravelState): boolean {
  return state.planning.status === 'failed' && 
         state.monitoring.recoveryAttempts < 3;
}

export default {
  updateTravelState,
  updatePlanningState,
  updateAnalysisState,
  updateExecutionState,
  updateMonitoringState,
  addError,
  incrementRecoveryAttempts,
  calculateStateDiff,
  createImmutableState,
  isInPhase,
  hasErrors,
  getLatestError,
  needsRecovery
};
