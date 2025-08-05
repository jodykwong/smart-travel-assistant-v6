# 表单组件使用指南

**版本**: v6.1.0  
**更新日期**: 2025年8月4日  

---

## 📋 概述

本文档提供智游助手v6.1中表单组件的使用指南和最佳实践，特别是针对多步骤表单的实现方案。

---

## 🔧 多步骤表单最佳实践

### 1. React Hook Form配置

#### ✅ 推荐配置
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const {
  register,
  handleSubmit,
  watch,
  setValue,
  formState: { errors },
  trigger,
  getValues,
} = useForm<FormType>({
  resolver: zodResolver(schema),
  mode: 'onChange', // 🔑 关键：使用onChange模式
  defaultValues: {
    // 🔑 关键：提供所有字段的默认值
    field1: '',
    field2: '',
    arrayField: [],
  },
});
```

#### ❌ 避免的配置
```typescript
// 不要使用onBlur模式在多步骤表单中
useForm({
  mode: 'onBlur', // ❌ 会导致验证问题
})

// 不要省略默认值
useForm({
  // ❌ 缺少defaultValues会导致数据丢失
})
```

### 2. 数据持久化策略

#### ✅ 隐藏字段方案
```typescript
<form onSubmit={handleSubmit(handleSubmitForm)}>
  {/* 隐藏字段保存所有步骤的数据 */}
  <input type="hidden" {...register('destination')} />
  <input type="hidden" {...register('startDate')} />
  <input type="hidden" {...register('endDate')} />
  <input type="hidden" {...register('groupSize', { valueAsNumber: true })} />
  <input type="hidden" {...register('budget')} />
  <input type="hidden" {...register('accommodation')} />
  
  {/* 数组字段特殊处理 */}
  <input 
    type="hidden" 
    name="travelStyles" 
    value={JSON.stringify(watchedValues.travelStyles || [])} 
  />
  
  {/* 当前步骤的可见字段 */}
  {renderCurrentStep()}
</form>
```

### 3. 步骤验证逻辑

#### ✅ 推荐实现
```typescript
// 按步骤验证，而不是全局验证
const isCurrentStepValid = useMemo(() => {
  const fieldsToValidate = getFieldsForStep(currentStep);
  
  for (const field of fieldsToValidate) {
    const value = watchedValues[field];
    if (field === 'travelStyles') {
      if (!Array.isArray(value) || value.length === 0) return false;
    } else if (typeof value === 'string') {
      if (!value || value.trim().length === 0) return false;
    } else if (typeof value === 'number') {
      if (value <= 0) return false;
    } else {
      if (value == null) return false;
    }
  }
  return true;
}, [watchedValues, currentStep]);

// 最终提交按钮只依赖提交状态
<button
  type="submit"
  disabled={isSubmitting} // ✅ 只依赖提交状态
  // disabled={!isValid || isSubmitting} // ❌ 避免依赖全局isValid
>
  提交
</button>
```

### 4. 数组字段处理

#### ✅ 正确处理方式
```typescript
// 1. 正确注册数组字段
<input
  type="checkbox"
  value={style.value}
  {...register('travelStyles')} // ✅ 正确注册
  checked={watchedValues.travelStyles?.includes(style.value) || false}
  onChange={(e) => handleArrayFieldChange(style.value, e.target.checked)}
/>

// 2. 数组字段变更处理
const handleArrayFieldChange = useCallback((value: string, checked: boolean) => {
  const currentValues = watchedValues.travelStyles || [];
  const newValues = checked
    ? [...currentValues, value]
    : currentValues.filter(v => v !== value);
  
  setValue('travelStyles', newValues, { shouldValidate: true });
}, [watchedValues.travelStyles, setValue]);
```

---

## 🚨 常见问题和解决方案

### 问题1: 表单数据在步骤切换时丢失

**原因**: 只有当前步骤的字段在DOM中，其他字段被隐藏

**解决方案**: 使用隐藏字段保存所有数据
```typescript
// ✅ 正确做法
{Object.keys(defaultValues).map(key => (
  <input key={key} type="hidden" {...register(key)} />
))}
```

### 问题2: 最终提交按钮始终禁用

**原因**: 全局`isValid`在多步骤表单中永远为false

**解决方案**: 移除对全局验证的依赖
```typescript
// ❌ 错误做法
disabled={!isValid || isSubmitting}

// ✅ 正确做法
disabled={isSubmitting}
```

### 问题3: 数组字段无法正确提交

**原因**: 数组字段注册方式不正确

**解决方案**: 正确注册并使用JSON序列化
```typescript
// ✅ 正确做法
<input 
  type="hidden" 
  name="arrayField" 
  value={JSON.stringify(watchedValues.arrayField || [])} 
/>
```

---

## 📝 表单组件模板

### 多步骤表单模板
```typescript
import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. 定义验证Schema
const formSchema = z.object({
  field1: z.string().min(1, '必填字段'),
  field2: z.string().min(1, '必填字段'),
  arrayField: z.array(z.string()).min(1, '至少选择一项'),
});

type FormData = z.infer<typeof formSchema>;

// 2. 组件实现
export default function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      field1: '',
      field2: '',
      arrayField: [],
    },
  });

  const watchedValues = watch();

  // 3. 步骤验证
  const isCurrentStepValid = useMemo(() => {
    // 实现步骤验证逻辑
    return true;
  }, [watchedValues, currentStep]);

  // 4. 提交处理
  const handleFormSubmit = useCallback(async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // 提交逻辑
      console.log('提交数据:', data);
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      {/* 隐藏字段 */}
      <input type="hidden" {...register('field1')} />
      <input type="hidden" {...register('field2')} />
      <input 
        type="hidden" 
        name="arrayField" 
        value={JSON.stringify(watchedValues.arrayField || [])} 
      />

      {/* 步骤内容 */}
      {renderStep(currentStep)}

      {/* 导航按钮 */}
      <div>
        {currentStep > 1 && (
          <button type="button" onClick={() => setCurrentStep(currentStep - 1)}>
            上一步
          </button>
        )}
        
        {currentStep < totalSteps ? (
          <button 
            type="button" 
            disabled={!isCurrentStepValid}
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            下一步
          </button>
        ) : (
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : '提交'}
          </button>
        )}
      </div>
    </form>
  );
}
```

---

## 🧪 测试建议

### 1. 单元测试
```typescript
// 测试表单数据收集
test('should collect all form data correctly', () => {
  // 测试实现
});

// 测试步骤验证
test('should validate each step correctly', () => {
  // 测试实现
});
```

### 2. 集成测试
```typescript
// 测试完整表单流程
test('should complete multi-step form submission', () => {
  // 测试实现
});
```

### 3. E2E测试
```typescript
// 测试用户完整操作流程
test('user can complete travel planning form', () => {
  // 测试实现
});
```

---

## 📚 参考资源

- [React Hook Form官方文档](https://react-hook-form.com/)
- [Zod验证库文档](https://zod.dev/)
- [多步骤表单最佳实践](https://react-hook-form.com/advanced-usage#WizardFormFunnel)

---

**最后更新**: 2025年8月4日  
**维护者**: 智游助手开发团队
