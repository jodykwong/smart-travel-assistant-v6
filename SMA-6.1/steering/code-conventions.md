# 代码风格和命名规范

## 文件和目录命名

### 文件命名规范
- **React 组件**: PascalCase - `UserProfile.tsx`, `TravelPlanCard.tsx`
- **服务类**: camelCase - `userService.ts`, `travelPlanService.ts`
- **工具函数**: camelCase - `formatDate.ts`, `validateInput.ts`
- **类型定义**: camelCase - `userTypes.ts`, `apiTypes.ts`
- **常量文件**: camelCase - `apiConstants.ts`, `appConfig.ts`
- **测试文件**: 与源文件同名 + `.test.ts` - `userService.test.ts`

### 目录命名规范
- **功能模块**: kebab-case - `user-management/`, `travel-planning/`
- **组件目录**: kebab-case - `ui-components/`, `form-elements/`
- **API 路由**: kebab-case - `travel-plans/`, `user-preferences/`

## TypeScript 编码规范

### 接口和类型定义
```typescript
// 接口使用 PascalCase，以 I 开头（可选）
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// 类型别名使用 PascalCase
type UserRole = 'admin' | 'user' | 'guest';

// 泛型参数使用单个大写字母
interface ApiResponse<T> {
  data: T;
  success: boolean;
}

// 枚举使用 PascalCase
enum TravelPlanStatus {
  Draft = 'draft',
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled'
}
```

### 变量和函数命名
```typescript
// 变量使用 camelCase
const userName = 'John Doe';
const travelPlanList = [];

// 函数使用 camelCase，动词开头
const getUserById = (id: string) => { /* ... */ };
const createTravelPlan = (data: TravelPlanData) => { /* ... */ };

// 布尔值使用 is/has/can/should 前缀
const isAuthenticated = true;
const hasPermission = false;
const canEdit = true;
const shouldValidate = false;

// 常量使用 SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 20;

// 避免硬编码，使用配置或常量
// ❌ 错误：硬编码值
const processData = (data: any[]) => {
  if (data.length > 100) { // 硬编码的魔法数字
    return data.slice(0, 50); // 硬编码的魔法数字
  }
  return data;
};

// ✅ 正确：使用命名常量
const MAX_DATA_ITEMS = 100;
const TRUNCATE_LIMIT = 50;

const processData = (data: any[]) => {
  if (data.length > MAX_DATA_ITEMS) {
    return data.slice(0, TRUNCATE_LIMIT);
  }
  return data;
};
```

### 类和方法命名
```typescript
// 类使用 PascalCase
class UserService {
  // 私有属性使用下划线前缀
  private _apiClient: ApiClient;
  
  // 公共方法使用 camelCase
  async getUserProfile(userId: string): Promise<User> {
    return this._fetchUserData(userId);
  }
  
  // 私有方法使用下划线前缀
  private async _fetchUserData(userId: string): Promise<User> {
    // 实现细节
  }
}
```

## React 组件规范

### 组件文件结构
```typescript
// 导入顺序：外部库 -> 内部模块 -> 类型 -> 相对导入
import React, { useState, useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { User } from '@/types';
import './UserProfile.css';

// 接口定义在组件前
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

// 组件使用 PascalCase，导出在底部
const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
  // Hooks 在组件顶部
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 事件处理函数使用 handle 前缀
  const handleUpdateClick = () => {
    // 处理逻辑
  };
  
  // 渲染辅助函数
  const renderUserInfo = () => {
    if (!user) return null;
    return <div>{user.name}</div>;
  };
  
  return (
    <Card>
      {renderUserInfo()}
      <Button onClick={handleUpdateClick}>
        更新用户信息
      </Button>
    </Card>
  );
};

export default UserProfile;
```

### Hook 命名规范
```typescript
// 自定义 Hook 使用 use 前缀
const useUserProfile = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  
  // Hook 内部函数使用动词开头
  const fetchUser = async () => {
    // 获取用户逻辑
  };
  
  const updateUser = async (userData: Partial<User>) => {
    // 更新用户逻辑
  };
  
  return {
    user,
    fetchUser,
    updateUser,
    isLoading: user === null
  };
};
```

## 导入和导出规范

### 导入顺序
```typescript
// 1. Node.js 内置模块
import path from 'path';
import fs from 'fs';

// 2. 外部依赖包
import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 3. 内部模块（按字母顺序）
import { ApiResponse } from '@/types/api';
import { User } from '@/types/user';
import { authService } from '@/lib/services/authService';
import { validateInput } from '@/lib/utils/validation';

// 4. 相对导入
import './styles.css';
import { helper } from '../utils/helper';
```

### 导出规范
```typescript
// 优先使用命名导出
export const userService = new UserService();
export const validateUser = (user: User) => { /* ... */ };

// 默认导出用于主要功能
export default class UserRepository {
  // 类实现
}

// 重新导出用于模块聚合
export { UserService } from './UserService';
export { UserRepository } from './UserRepository';
export type { User, UserRole } from './types';
```

## 注释和文档规范

### JSDoc 注释
```typescript
/**
 * 获取用户旅行计划列表
 * @param userId - 用户ID
 * @param options - 查询选项
 * @param options.page - 页码，默认为1
 * @param options.limit - 每页数量，默认为20
 * @returns 旅行计划列表和分页信息
 * @throws {UserNotFoundError} 当用户不存在时
 * @example
 * ```typescript
 * const plans = await getTravelPlans('user-123', { page: 1, limit: 10 });
 * console.log(plans.data.length); // 最多10个计划
 * ```
 */
async function getTravelPlans(
  userId: string,
  options: {
    page?: number;
    limit?: number;
  } = {}
): Promise<PaginatedResponse<TravelPlan>> {
  // 实现逻辑
}
```

### 内联注释
```typescript
// 使用单行注释解释复杂逻辑
const calculateTravelCost = (plan: TravelPlan) => {
  // 基础费用包括交通和住宿
  const baseCost = plan.transportation + plan.accommodation;
  
  // 根据旅行天数应用折扣
  const discount = plan.duration > 7 ? 0.1 : 0;
  
  return baseCost * (1 - discount);
};

/* 
 * 多行注释用于解释算法或复杂业务逻辑
 * 这里实现了智能路线规划算法：
 * 1. 分析地理位置约束
 * 2. 计算最优路径
 * 3. 考虑用户偏好权重
 */
const optimizeRoute = (destinations: Destination[]) => {
  // 算法实现
};
```

## 错误处理规范

### 自定义错误类
```typescript
// 错误类使用 PascalCase + Error 后缀
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 错误处理模式
```typescript
// 使用 Result 模式处理可能失败的操作
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

const safeParseUser = (data: unknown): Result<User, ValidationError> => {
  try {
    const user = userSchema.parse(data);
    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: new ValidationError('Invalid user data', 'user', data)
    };
  }
};
```

## 性能和优化规范

### 避免不必要的重新渲染
```typescript
// 使用 React.memo 优化组件
const UserCard = React.memo<UserCardProps>(({ user, onEdit }) => {
  return (
    <Card>
      <h3>{user.name}</h3>
      <Button onClick={() => onEdit(user.id)}>编辑</Button>
    </Card>
  );
});

// 使用 useCallback 优化事件处理函数
const UserList: React.FC<UserListProps> = ({ users }) => {
  const handleUserEdit = useCallback((userId: string) => {
    // 编辑逻辑
  }, []);
  
  return (
    <div>
      {users.map(user => (
        <UserCard 
          key={user.id} 
          user={user} 
          onEdit={handleUserEdit}
        />
      ))}
    </div>
  );
};
```

### 异步操作规范
```typescript
// 使用 async/await 而不是 Promise.then
const fetchUserData = async (userId: string): Promise<User> => {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw new UserNotFoundError(userId);
  }
};

// 并行处理独立的异步操作
const loadUserDashboard = async (userId: string) => {
  const [user, plans, preferences] = await Promise.all([
    fetchUser(userId),
    fetchTravelPlans(userId),
    fetchUserPreferences(userId)
  ]);
  
  return { user, plans, preferences };
};
```

## 避免硬编码的最佳实践

### 配置外部化
```typescript
// ❌ 错误：硬编码配置值
const sendEmail = async (to: string, subject: string) => {
  const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'noreply@travel-app.com',
      pass: 'hardcoded-password'
    }
  });
  // ...
};

// ✅ 正确：使用配置文件
// config/email.ts
export const emailConfig = {
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  defaults: {
    from: process.env.EMAIL_FROM || 'noreply@travel-app.com'
  }
};

const sendEmail = async (to: string, subject: string) => {
  const transporter = nodemailer.createTransporter(emailConfig.smtp);
  // ...
};
```

### 数据结构外部化
```typescript
// ❌ 错误：硬编码数据结构
const validateTravelPlan = (plan: TravelPlan) => {
  const validDestinations = ['新疆', '西藏', '云南', '四川', '内蒙古'];
  const validDurations = [3, 5, 7, 10, 14];
  
  if (!validDestinations.includes(plan.destination)) {
    throw new Error('无效的目的地');
  }
  // ...
};

// ✅ 正确：使用配置文件或数据库
// data/travel-config.json
{
  "destinations": [
    { "code": "xinjiang", "name": "新疆", "minDays": 5, "maxDays": 21 },
    { "code": "tibet", "name": "西藏", "minDays": 7, "maxDays": 15 }
  ],
  "validDurations": [3, 5, 7, 10, 14, 21]
}

// services/travelConfigService.ts
import travelConfig from '../data/travel-config.json';

export class TravelConfigService {
  static getValidDestinations(): string[] {
    return travelConfig.destinations.map(d => d.name);
  }
  
  static getValidDurations(): number[] {
    return travelConfig.validDurations;
  }
  
  static getDestinationLimits(destination: string) {
    const dest = travelConfig.destinations.find(d => d.name === destination);
    return dest ? { min: dest.minDays, max: dest.maxDays } : null;
  }
}
```

### 业务规则外部化
```typescript
// ❌ 错误：硬编码业务规则
const calculateDiscount = (plan: TravelPlan) => {
  let discount = 0;
  
  if (plan.duration >= 7) {
    discount += 0.1; // 7天以上打9折
  }
  
  if (plan.budget >= 10000) {
    discount += 0.05; // 预算1万以上额外5%折扣
  }
  
  if (plan.travelers >= 4) {
    discount += 0.08; // 4人以上团体折扣8%
  }
  
  return Math.min(discount, 0.2); // 最大折扣20%
};

// ✅ 正确：使用规则引擎或配置
// config/discount-rules.ts
export interface DiscountRule {
  condition: (plan: TravelPlan) => boolean;
  discount: number;
  description: string;
}

export const discountRules: DiscountRule[] = [
  {
    condition: (plan) => plan.duration >= 7,
    discount: 0.1,
    description: '长期旅行折扣'
  },
  {
    condition: (plan) => plan.budget >= 10000,
    discount: 0.05,
    description: '高预算折扣'
  },
  {
    condition: (plan) => plan.travelers >= 4,
    discount: 0.08,
    description: '团体折扣'
  }
];

export const MAX_DISCOUNT = 0.2;

// services/discountService.ts
import { discountRules, MAX_DISCOUNT } from '../config/discount-rules';

export const calculateDiscount = (plan: TravelPlan): number => {
  const totalDiscount = discountRules
    .filter(rule => rule.condition(plan))
    .reduce((sum, rule) => sum + rule.discount, 0);
    
  return Math.min(totalDiscount, MAX_DISCOUNT);
};
```

### 测试数据外部化
```typescript
// ❌ 错误：硬编码测试数据
describe('UserService', () => {
  it('should create user', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      age: 25
    };
    
    const result = await userService.create(userData);
    expect(result.email).toBe('test@example.com');
  });
});

// ✅ 正确：使用测试数据工厂
// tests/factories/userFactory.ts
export const createUserData = (overrides?: Partial<User>) => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  age: faker.number.int({ min: 18, max: 80 }),
  ...overrides
});

describe('UserService', () => {
  it('should create user', async () => {
    const userData = createUserData({
      email: 'specific@test.com' // 只在需要时指定特定值
    });
    
    const result = await userService.create(userData);
    expect(result.email).toBe(userData.email);
  });
});
```

### 环境特定配置
```typescript
// config/environments.ts
interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  features: {
    enableAnalytics: boolean;
    enableDebugMode: boolean;
  };
}

const configs: Record<string, AppConfig> = {
  development: {
    api: {
      baseUrl: 'http://localhost:3000/api',
      timeout: 10000,
      retries: 1
    },
    features: {
      enableAnalytics: false,
      enableDebugMode: true
    }
  },
  
  production: {
    api: {
      baseUrl: 'https://api.travel-assistant.com',
      timeout: 5000,
      retries: 3
    },
    features: {
      enableAnalytics: true,
      enableDebugMode: false
    }
  }
};

export const getConfig = (): AppConfig => {
  const env = process.env.NODE_ENV || 'development';
  return configs[env] || configs.development;
};
```

## 代码组织和模块化

### 单一职责原则
```typescript
// ❌ 错误：一个类承担太多职责
class UserManager {
  validateUser() { /* ... */ }
  saveUser() { /* ... */ }
  sendEmail() { /* ... */ }
  generateReport() { /* ... */ }
}

// ✅ 正确：职责分离
class UserValidator {
  validate(user: User): ValidationResult { /* ... */ }
}

class UserRepository {
  save(user: User): Promise<User> { /* ... */ }
}

class EmailService {
  sendWelcomeEmail(user: User): Promise<void> { /* ... */ }
}
```

### 依赖注入模式
```typescript
// 使用依赖注入提高可测试性
class UserService {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private validator: UserValidator
  ) {}
  
  async createUser(userData: CreateUserData): Promise<User> {
    const validationResult = this.validator.validate(userData);
    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.message);
    }
    
    const user = await this.userRepository.save(userData);
    await this.emailService.sendWelcomeEmail(user);
    
    return user;
  }
}
```

## React Hook Form 最佳实践 (v6.1新增)

### 多步骤表单规范

```typescript
// ✅ 推荐：使用onChange模式进行实时验证
const {
  register,
  handleSubmit,
  watch,
  setValue,
  formState: { errors },
} = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: 'onChange', // 实时验证
  defaultValues: {
    // 提供所有字段的默认值
    field1: '',
    field2: '',
    arrayField: [],
  },
});

// ✅ 推荐：使用隐藏字段保存多步骤数据
<form onSubmit={handleSubmit(handleSubmitForm)}>
  {/* 隐藏字段保存所有步骤数据 */}
  <input type="hidden" {...register('field1')} />
  <input type="hidden" {...register('field2')} />

  {/* 数组字段特殊处理 */}
  <input
    type="hidden"
    name="arrayField"
    value={JSON.stringify(watchedValues.arrayField || [])}
  />

  {/* 当前步骤的可见字段 */}
  {renderCurrentStep()}
</form>

// ✅ 推荐：按步骤验证而非全局验证
const isCurrentStepValid = useMemo(() => {
  const fieldsToValidate = getFieldsForStep(currentStep);
  return fieldsToValidate.every(field => {
    const value = watchedValues[field];
    return value != null && value !== '';
  });
}, [watchedValues, currentStep]);

// ✅ 推荐：提交按钮只依赖提交状态
<button
  type="submit"
  disabled={isSubmitting} // 只依赖提交状态
  // disabled={!isValid || isSubmitting} // ❌ 避免依赖全局isValid
>
  提交
</button>
```

### 数组字段处理规范

```typescript
// ✅ 推荐：正确注册数组字段
<input
  type="checkbox"
  value={option.value}
  {...register('arrayField')} // 正确注册
  checked={watchedValues.arrayField?.includes(option.value) || false}
  onChange={(e) => handleArrayFieldChange(option.value, e.target.checked)}
/>

// ✅ 推荐：数组字段变更处理
const handleArrayFieldChange = useCallback((value: string, checked: boolean) => {
  const currentValues = watchedValues.arrayField || [];
  const newValues = checked
    ? [...currentValues, value]
    : currentValues.filter(v => v !== value);

  setValue('arrayField', newValues, { shouldValidate: true });
}, [watchedValues.arrayField, setValue]);
```