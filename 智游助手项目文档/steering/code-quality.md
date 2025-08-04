# 代码质量标准和最佳实践

## 概述

本文档记录了智能旅行助手项目的代码质量标准和最佳实践，基于HTML报告生成服务的重构经验总结。所有开发者在编写代码时都应遵循这些标准，以确保代码质量、可维护性和可扩展性。

## 1. 模块化架构原则

### 1.1 文件大小限制
- **单个文件不应超过500行代码**
- 超过限制时，应拆分成多个模块
- 每个模块应有明确的职责

### 1.2 模块拆分策略
当服务类变得复杂时，按以下方式拆分：

```
service/
├── serviceTypes.ts          # 类型定义和常量
├── serviceComponents.ts     # 可重用组件
├── serviceTemplates/        # 模板相关
│   ├── main.ts
│   ├── header.ts
│   └── footer.ts
├── service.ts              # 主服务类（简洁版）
└── __tests__/
    └── service.test.ts
```

### 1.3 职责分离
- **类型定义**：独立的types文件
- **组件逻辑**：可重用的组件类
- **模板生成**：独立的模板文件
- **主服务**：协调和验证逻辑

## 2. 类型安全性要求

### 2.1 禁止使用any类型
- **严格禁止**使用`any`类型
- 使用具体的接口定义
- 为复杂对象创建专门的类型

### 2.2 类型定义规范
```typescript
// ✅ 正确：具体的接口定义
export interface ComponentProps {
  data: SpecificDataType;
  options: ConfigOptions;
}

// ❌ 错误：使用any类型
function processData(data: any): any {
  // ...
}

// ✅ 正确：具体的类型定义
function processData(data: TravelPlan): HTMLReportResult {
  // ...
}
```

### 2.3 常量映射
使用类型安全的常量映射：

```typescript
export const mealTypeIcons: Record<string, string> = {
  breakfast: 'fa-coffee',
  lunch: 'fa-hamburger',
  dinner: 'fa-wine-glass-alt',
  snack: 'fa-cookie-bite'
};
```

## 3. 错误处理标准

### 3.1 自定义错误类
为每个服务创建专门的错误类：

```typescript
export class ServiceNameError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ServiceNameError';
  }
}
```

### 3.2 数据验证
每个服务的主要方法都应包含数据验证：

```typescript
private validateInput(input: InputType): void {
  if (!input) {
    throw new ServiceError('输入数据不能为空');
  }
  
  if (!input.requiredField) {
    throw new ServiceError('必填字段缺失');
  }
  
  // 更多验证逻辑...
}
```

### 3.3 错误处理模式
```typescript
async serviceMethod(input: InputType): Promise<OutputType> {
  try {
    // 验证输入数据
    this.validateInput(input);
    
    // 执行业务逻辑
    const result = await this.processData(input);
    
    return result;
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }
    throw new ServiceError(
      `操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
      error instanceof Error ? error : undefined
    );
  }
}
```

## 4. 代码组织规范

### 4.1 导入顺序
```typescript
// 1. 外部库导入
import { describe, it, expect } from 'vitest';

// 2. 内部类型导入
import { TravelPlan, HTMLReportResult } from '@/types';

// 3. 内部模块导入
import { ServiceError } from './serviceTypes';
import { generateTemplate } from './templates/main';

// 4. 相对导入
import { helper } from '../utils/helper';
```

### 4.2 类结构组织
```typescript
export class ServiceName {
  // 1. 公共方法
  async publicMethod(): Promise<ResultType> {
    // ...
  }
  
  // 2. 私有验证方法
  private validateInput(input: InputType): void {
    // ...
  }
  
  // 3. 私有业务逻辑方法
  private processData(data: DataType): ProcessedType {
    // ...
  }
  
  // 4. 私有工具方法
  private generateId(): string {
    // ...
  }
}
```

## 5. 文档和注释标准

### 5.1 JSDoc注释要求
每个公共方法都必须包含完整的JSDoc注释：

```typescript
/**
 * 生成HTML报告的详细描述
 * @param travelPlan 旅行计划数据
 * @returns HTML报告结果
 * @throws ServiceError 当生成失败时抛出
 * @example
 * ```typescript
 * const service = new HTMLReportService();
 * const result = await service.generateReport(plan);
 * ```
 */
async generateReport(travelPlan: TravelPlan): Promise<HTMLReportResult> {
  // ...
}
```

### 5.2 类和接口注释
```typescript
/**
 * HTML报告生成服务
 * 基于HTML5、Tailwind CSS、Font Awesome创建响应式杂志风格的旅行报告
 * 
 * 特性：
 * - 模块化的HTML模板结构
 * - 类型安全的组件系统
 * - 完整的错误处理
 * - 高度可维护的代码结构
 */
export class HTMLReportService {
  // ...
}
```

## 6. 测试标准

### 6.1 测试覆盖率要求
- **每个服务类至少4个测试用例**
- 覆盖正常流程、错误处理、边界条件
- 测试覆盖率应达到80%以上

### 6.2 测试用例结构
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockData: MockDataType;

  beforeEach(() => {
    service = new ServiceName();
    mockData = createMockData();
  });

  it('should handle normal case successfully', async () => {
    // 正常情况测试
  });

  it('should handle errors gracefully', async () => {
    // 错误处理测试
  });

  it('should validate input data', async () => {
    // 数据验证测试
  });

  it('should generate unique identifiers', async () => {
    // 特定功能测试
  });
});
```

## 7. 性能和可维护性

### 7.1 代码复用
- 创建可重用的组件和工具函数
- 避免代码重复
- 使用组合而非继承

### 7.2 关注点分离
- 每个类/函数只负责一个明确的职责
- 业务逻辑与表现层分离
- 数据处理与UI生成分离

### 7.3 可扩展性设计
- 使用接口定义契约
- 支持依赖注入
- 预留扩展点

## 8. 代码审查检查清单

在提交代码前，请检查以下项目：

### 8.1 结构检查
- [ ] 单个文件不超过500行
- [ ] 模块职责明确
- [ ] 导入顺序正确
- [ ] 类结构组织合理

### 8.2 类型安全检查
- [ ] 没有使用any类型
- [ ] 所有接口都有明确定义
- [ ] 常量使用类型安全的映射

### 8.3 错误处理检查
- [ ] 有自定义错误类
- [ ] 包含数据验证
- [ ] 错误信息清晰明确

### 8.4 文档检查
- [ ] 公共方法有JSDoc注释
- [ ] 类和接口有描述性注释
- [ ] 复杂逻辑有内联注释

### 8.5 测试检查
- [ ] 至少4个测试用例
- [ ] 覆盖正常和异常情况
- [ ] 测试用例命名清晰

## 9. 重构指导原则

### 9.1 何时重构
- 文件超过500行
- 方法超过50行
- 圈复杂度过高
- 代码重复率高

### 9.2 重构步骤
1. **分析现有代码**：识别问题和改进点
2. **设计新结构**：规划模块拆分方案
3. **创建类型定义**：建立类型安全基础
4. **拆分组件**：创建可重用组件
5. **重写主服务**：简化主要逻辑
6. **更新测试**：确保功能完整性
7. **验证构建**：确保系统正常运行

## 10. 工具和自动化

### 10.1 推荐工具
- **ESLint**：代码质量检查
- **Prettier**：代码格式化
- **TypeScript**：类型检查
- **Vitest**：单元测试

### 10.2 自动化检查
在CI/CD流程中集成：
- 类型检查：`npm run type-check`
- 代码检查：`npm run lint`
- 测试运行：`npm run test:run`
- 构建验证：`npm run build`

## 结论

遵循这些代码质量标准将确保：
- **可维护性**：代码易于理解和修改
- **可扩展性**：新功能易于添加
- **可靠性**：减少bug和运行时错误
- **团队协作**：统一的代码风格和结构

所有开发者都应该将这些标准作为日常开发的指导原则，并在代码审查中严格执行。