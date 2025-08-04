# 测试标准和规范

## 测试策略概述

### 测试金字塔
- **单元测试 (70%)**: 测试独立的函数和类
- **集成测试 (20%)**: 测试组件间的交互
- **端到端测试 (10%)**: 测试完整的用户流程

### 测试覆盖率要求
- 代码覆盖率目标：≥ 80%
- 关键业务逻辑：≥ 95%
- 新增代码必须包含相应测试

## 单元测试标准

### 测试文件组织
```
src/
├── services/
│   ├── userService.ts
│   └── __tests__/
│       └── userService.test.ts
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
```

### 测试命名规范
- 测试文件：`*.test.ts` 或 `*.spec.ts`
- 测试描述：使用 `describe` 和 `it` 的清晰描述
- 遵循 "Given-When-Then" 模式

### 测试结构模板
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<DependencyType>;

  beforeEach(() => {
    mockDependency = createMockDependency();
    service = new ServiceName(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle normal case successfully', async () => {
      // Given
      const input = createValidInput();
      mockDependency.method.mockResolvedValue(expectedResult);

      // When
      const result = await service.methodName(input);

      // Then
      expect(result).toEqual(expectedResult);
      expect(mockDependency.method).toHaveBeenCalledWith(input);
    });

    it('should handle error case gracefully', async () => {
      // Given
      const input = createInvalidInput();
      mockDependency.method.mockRejectedValue(new Error('Test error'));

      // When & Then
      await expect(service.methodName(input)).rejects.toThrow('Test error');
    });
  });
});
```

## 集成测试标准

### API 集成测试
```typescript
describe('API Integration Tests', () => {
  let app: Application;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = createTestApp(testDb);
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDb);
  });

  beforeEach(async () => {
    await testDb.seed();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it('should create user successfully', async () => {
    const userData = createValidUserData();
    
    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(userData.email);
  });
});
```

### 数据库集成测试
- 使用测试数据库或内存数据库
- 每个测试前重置数据状态
- 测试数据迁移和种子数据

## 端到端测试标准

### Playwright 测试配置
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
```

### E2E 测试模式
```typescript
test.describe('Travel Planning Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete travel planning successfully', async ({ page }) => {
    // 步骤 1: 填写基本信息
    await page.fill('[data-testid="destination"]', '新疆');
    await page.fill('[data-testid="duration"]', '7');
    await page.click('[data-testid="next-button"]');

    // 步骤 2: 选择偏好
    await page.check('[data-testid="preference-nature"]');
    await page.click('[data-testid="generate-plan"]');

    // 步骤 3: 验证结果
    await expect(page.locator('[data-testid="travel-plan"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-title"]')).toContainText('新疆');
  });
});
```

## Mock 和测试数据

### Mock 策略
- 外部 API 调用必须 Mock
- 数据库操作使用 Mock 或测试数据库
- 时间相关的测试使用固定时间
- **严禁硬编码 Mock 数据**：所有 Mock 数据必须通过工厂函数、配置文件或外部数据源生成

### 测试数据管理原则

#### ❌ 错误做法：硬编码 Mock 数据
```typescript
// 不要这样做 - 硬编码数据难以维护和复用
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2024-01-01')
};

const mockTravelPlan = {
  id: 'plan-123',
  destination: '新疆',
  duration: 7,
  budget: 5000,
  userId: 'user-123'
};
```

#### ✅ 正确做法：使用数据工厂和配置
```typescript
// 1. 测试数据工厂 - 支持参数化和覆盖
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: generateTestId('user'),
  email: generateTestEmail(),
  name: generateTestName(),
  createdAt: getFixedTestDate(),
  ...overrides,
});

export const createMockTravelPlan = (overrides?: Partial<TravelPlan>): TravelPlan => ({
  id: generateTestId('plan'),
  destination: getRandomDestination(),
  duration: getRandomDuration(),
  budget: getRandomBudget(),
  userId: generateTestId('user'),
  ...overrides,
});

// 2. 测试配置文件
// tests/fixtures/test-data.json
{
  "users": [
    {
      "template": "standard_user",
      "email": "test@example.com",
      "name": "Test User"
    }
  ],
  "destinations": ["新疆", "西藏", "云南", "四川"],
  "budgetRanges": [3000, 5000, 8000, 12000]
}

// 3. 从配置加载测试数据
import testData from '../fixtures/test-data.json';

export const loadTestUser = (template: string = 'standard_user') => {
  const userTemplate = testData.users.find(u => u.template === template);
  return createMockUser(userTemplate);
};
```

### 测试数据生成工具
```typescript
// tests/utils/data-generators.ts
export class TestDataGenerator {
  private static idCounter = 1;
  
  static generateTestId(prefix: string): string {
    return `${prefix}-${this.idCounter++}-${Date.now()}`;
  }
  
  static generateTestEmail(domain: string = 'test.com'): string {
    return `user${this.idCounter}@${domain}`;
  }
  
  static getRandomDestination(): string {
    const destinations = testData.destinations;
    return destinations[Math.floor(Math.random() * destinations.length)];
  }
  
  static getFixedTestDate(offset: number = 0): Date {
    // 使用固定基准时间，避免时间相关的测试不稳定
    const baseDate = new Date('2024-01-01T00:00:00Z');
    return new Date(baseDate.getTime() + offset);
  }
}
```

### 外部数据源集成
```typescript
// tests/utils/mock-data-loader.ts
export class MockDataLoader {
  // 从 JSON 文件加载
  static async loadFromFile<T>(filePath: string): Promise<T[]> {
    const data = await import(filePath);
    return data.default;
  }
  
  // 从测试数据库加载
  static async loadFromTestDb<T>(table: string, conditions?: any): Promise<T[]> {
    const testDb = getTestDatabase();
    return testDb.select().from(table).where(conditions);
  }
  
  // 从 API 端点加载（用于集成测试）
  static async loadFromApi<T>(endpoint: string): Promise<T[]> {
    const response = await fetch(`${TEST_API_BASE}${endpoint}`);
    return response.json();
  }
}
```

## 性能测试

### 负载测试要求
- API 响应时间 < 200ms (P95)
- 并发用户数支持 > 100
- 数据库查询优化验证

### 性能测试工具
- 使用 Artillery 或 k6 进行负载测试
- 监控内存使用和 CPU 占用
- 数据库连接池性能测试

## 测试环境管理

### 环境配置
```typescript
// test.config.ts
export const testConfig = {
  database: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
  },
  redis: {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
  },
  external: {
    mockMode: true,
    deepseekApi: 'mock',
    gaodeApi: 'mock',
  },
};
```

### CI/CD 集成
- 所有测试必须在 CI 中通过
- 测试失败时阻止部署
- 生成测试报告和覆盖率报告

## 测试最佳实践

### 测试原则
1. **独立性**: 测试之间不应相互依赖
2. **可重复性**: 测试结果应该一致
3. **快速执行**: 单元测试应在秒级完成
4. **清晰断言**: 使用明确的断言和错误消息

### 常见反模式避免
- 不要测试实现细节，测试行为
- 避免过度 Mock，保持测试的真实性
- 不要忽略异步操作的测试
- **严禁硬编码测试数据**：使用数据工厂、配置文件或生成器
- 避免魔法数字和字符串，使用命名常量
- 不要在测试中直接写死 API 响应数据

### 测试维护
- 定期审查和更新测试用例
- 删除过时或重复的测试
- 保持测试代码的质量标准
- 文档化复杂的测试场景

## 测试报告和分析

### 覆盖率报告
- 生成 HTML 格式的覆盖率报告
- 识别未覆盖的代码分支
- 设置覆盖率阈值检查

### 测试结果分析
- 跟踪测试执行时间趋势
- 分析测试失败模式
- 监控测试稳定性指标