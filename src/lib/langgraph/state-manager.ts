/**
 * 智游助手v6.2 - 智能状态管理器
 * 遵循原则: [SOLID-单一职责] + [为失败而设计] + [代码规约]
 * 
 * 核心功能:
 * 1. 原子性状态更新
 * 2. 状态序列化/反序列化
 * 3. 状态验证和完整性检查
 * 4. 状态快照和恢复
 */

import { 
  SmartTravelState, 
  TravelPlanningState, 
  AnalysisState, 
  ExecutionState, 
  MonitoringState,
  StateMetadata,
  CoreTravelContext,
  PlanningStatus
} from './smart-travel-state';

// ============= 状态验证接口 =============

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============= 状态快照接口 =============

export interface StateSnapshot {
  data: string; // JSON序列化的状态数据
  checksum: string; // 完整性校验
  timestamp: number;
  version: number;
}

// ============= 状态管理器实现 =============

export class TravelStateManager {
  private state: SmartTravelState;
  private readonly validators: StateValidator[];
  private readonly serializer: StateSerializer;

  constructor(initialState: SmartTravelState) {
    this.validators = [
      new CoreContextValidator(),
      new PlanningStateValidator(),
      new BusinessLogicValidator()
    ];
    this.serializer = new StateSerializer();
    this.state = this.validateAndNormalize(initialState);
  }

  // ============= 原子性状态更新方法 =============

  /**
   * 更新分析状态
   * 遵循原则: [SOLID-单一职责] + [为失败而设计]
   */
  updateAnalysis(analysis: Partial<AnalysisState>): ValidationResult {
    const newState = {
      ...this.state,
      analysis: { ...this.state.analysis, ...analysis },
      metadata: this.updateMetadata()
    };

    const validation = this.validateState(newState);
    if (validation.isValid) {
      this.state = newState;
    }
    
    return validation;
  }

  /**
   * 更新执行状态
   */
  updateExecution(execution: Partial<ExecutionState>): ValidationResult {
    const newState = {
      ...this.state,
      execution: { ...this.state.execution, ...execution },
      metadata: this.updateMetadata()
    };

    const validation = this.validateState(newState);
    if (validation.isValid) {
      this.state = newState;
    }
    
    return validation;
  }

  /**
   * 更新监控状态
   */
  updateMonitoring(monitoring: Partial<MonitoringState>): ValidationResult {
    const newState = {
      ...this.state,
      monitoring: { 
        ...this.state.monitoring, 
        ...monitoring,
        // 确保错误数组正确合并
        errors: monitoring.errors ? 
          [...this.state.monitoring.errors, ...monitoring.errors] : 
          this.state.monitoring.errors
      },
      metadata: this.updateMetadata()
    };

    const validation = this.validateState(newState);
    if (validation.isValid) {
      this.state = newState;
    }
    
    return validation;
  }

  /**
   * 更新规划状态
   */
  updatePlanningStatus(status: PlanningStatus): ValidationResult {
    const newState = {
      ...this.state,
      planning: {
        ...this.state.planning,
        status
      },
      metadata: this.updateMetadata()
    };

    const validation = this.validateState(newState);
    if (validation.isValid) {
      this.state = newState;
    }
    
    return validation;
  }

  // ============= 状态快照和恢复 =============

  /**
   * 创建状态快照
   * 遵循原则: [为失败而设计]
   */
  createSnapshot(): StateSnapshot {
    return this.serializer.serialize(this.state);
  }

  /**
   * 从快照恢复状态
   */
  restoreFromSnapshot(snapshot: StateSnapshot): ValidationResult {
    try {
      const restoredState = this.serializer.deserialize(snapshot);
      const validation = this.validateState(restoredState);
      
      if (validation.isValid) {
        this.state = restoredState;
      }
      
      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'snapshot',
          message: `快照恢复失败: ${(error as Error).message}`,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  // ============= 状态访问方法 =============

  /**
   * 获取当前状态（只读）
   */
  getCurrentState(): Readonly<SmartTravelState> {
    return Object.freeze({ ...this.state });
  }

  /**
   * 获取状态进度
   */
  getProgress(): number {
    let progress = 0;
    
    if (this.state.analysis.complexity) progress += 0.1;
    if (this.state.analysis.serviceQuality) progress += 0.1;
    if (this.state.execution.dataCollection) progress += 0.4;
    if (this.state.execution.optimization) progress += 0.2;
    if (this.state.execution.results) progress += 0.2;
    
    return Math.min(progress, 1.0);
  }

  /**
   * 检查状态是否完成
   */
  isCompleted(): boolean {
    return this.state.planning.status === 'completed' && 
           !!this.state.execution.results;
  }

  // ============= 私有辅助方法 =============

  private validateAndNormalize(state: SmartTravelState): SmartTravelState {
    const validation = this.validateState(state);
    if (!validation.isValid) {
      throw new Error(`状态验证失败: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    return state;
  }

  private validateState(state: SmartTravelState): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(state);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  private updateMetadata(): StateMetadata {
    return {
      version: this.state.metadata.version + 1,
      lastUpdated: Date.now(),
      checksum: this.calculateChecksum()
    };
  }

  private calculateChecksum(): string {
    // 简化的校验和计算
    const stateString = JSON.stringify(this.state);
    let hash = 0;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }
}

// ============= 状态验证器实现 =============

abstract class StateValidator {
  abstract validate(state: SmartTravelState): ValidationResult;
}

class CoreContextValidator extends StateValidator {
  validate(state: SmartTravelState): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 必填字段验证
    if (!state.planning.context.sessionId) {
      errors.push({
        field: 'sessionId',
        message: 'Session ID is required',
        severity: 'error'
      });
    }

    if (!state.planning.context.requestId) {
      errors.push({
        field: 'requestId',
        message: 'Request ID is required',
        severity: 'error'
      });
    }

    // 时间戳验证
    if (state.planning.context.timestamp <= 0) {
      errors.push({
        field: 'timestamp',
        message: 'Valid timestamp is required',
        severity: 'error'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}

class PlanningStateValidator extends StateValidator {
  validate(state: SmartTravelState): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 旅行请求验证
    if (!state.planning.request.origin) {
      errors.push({
        field: 'origin',
        message: 'Origin is required',
        severity: 'error'
      });
    }

    if (!state.planning.request.destination) {
      errors.push({
        field: 'destination',
        message: 'Destination is required',
        severity: 'error'
      });
    }

    if (state.planning.request.duration <= 0) {
      errors.push({
        field: 'duration',
        message: 'Duration must be positive',
        severity: 'error'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}

class BusinessLogicValidator extends StateValidator {
  validate(state: SmartTravelState): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 复杂度评分验证
    if (state.analysis.complexity && state.analysis.complexity.overall > 1) {
      errors.push({
        field: 'complexity.overall',
        message: 'Complexity score must be <= 1',
        severity: 'error'
      });
    }

    // 服务质量评分验证
    if (state.analysis.serviceQuality && state.analysis.serviceQuality.qualityScore > 1) {
      errors.push({
        field: 'serviceQuality.qualityScore',
        message: 'Quality score must be <= 1',
        severity: 'error'
      });
    }

    // 恢复尝试次数警告
    if (state.monitoring.recoveryAttempts > 3) {
      warnings.push({
        field: 'recoveryAttempts',
        message: 'High number of recovery attempts detected',
        severity: 'warning'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}

// ============= 状态序列化器实现 =============

class StateSerializer {
  /**
   * 序列化状态为快照
   * 遵循原则: [为失败而设计]
   */
  serialize(state: SmartTravelState): StateSnapshot {
    try {
      const data = JSON.stringify(state);
      const checksum = this.calculateChecksum(data);
      
      return {
        data,
        checksum,
        timestamp: Date.now(),
        version: state.metadata.version
      };
    } catch (error) {
      throw new Error(`状态序列化失败: ${(error as Error).message}`);
    }
  }

  /**
   * 反序列化快照为状态
   */
  deserialize(snapshot: StateSnapshot): SmartTravelState {
    try {
      // 校验和验证
      const calculatedChecksum = this.calculateChecksum(snapshot.data);
      if (calculatedChecksum !== snapshot.checksum) {
        throw new Error('快照校验和不匹配，数据可能已损坏');
      }

      const state = JSON.parse(snapshot.data) as SmartTravelState;
      
      // 版本兼容性检查
      if (snapshot.version > state.metadata.version) {
        throw new Error('快照版本不兼容');
      }

      return state;
    } catch (error) {
      throw new Error(`状态反序列化失败: ${(error as Error).message}`);
    }
  }

  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

export default TravelStateManager;
