/**
 * 智游助手v6.5 - 规划页面
 * 基于Apple HIG和Material Design规范优化
 * Pages Router 兼容版本
 */

import React, { useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorAlert from '@/components/ui/ErrorAlert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';
import { Input, DateInput } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

// 表单验证Schema（修复时间选择器逻辑缺陷）
const travelPreferencesSchema = z.object({
  destination: z.string().min(1, '请输入目的地'),
  startDate: z.string()
    .min(1, '请选择出发日期')
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 重置时间为当天开始
      return selectedDate >= today;
    }, '出发日期不能早于今天'),
  endDate: z.string()
    .min(1, '请选择返回日期')
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, '返回日期不能早于今天'),
  groupSize: z.number().min(1, '人数至少为1').max(20, '人数不能超过20'),
  budget: z.enum(['budget', 'mid-range', 'luxury', 'premium']),
  travelStyles: z.array(z.enum(['adventure', 'culture', 'relaxation', 'food', 'nature', 'shopping'])).min(1, '请至少选择一种旅行风格'),
  accommodation: z.enum(['hotel', 'hostel', 'bnb', 'resort', 'camping', 'rv', 'other']),
  specialRequirements: z.string().optional(),
}).refine((data) => {
  // 交叉验证：返回日期必须晚于或等于出发日期
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return endDate >= startDate;
}, {
  message: '返回日期不能早于出发日期',
  path: ['endDate'], // 错误显示在endDate字段
});

type TravelPreferencesForm = z.infer<typeof travelPreferencesSchema>;

const STEPS = [
  { id: 1, title: '目的地与时间', description: '告诉我们您想去哪里' },
  { id: 2, title: '预算和风格', description: '设置您的预算和偏好' },
  { id: 3, title: '住宿偏好', description: '选择您的住宿类型' },
  { id: 4, title: '确认信息', description: '检查并确认您的选择' },
] as const;

const TRAVEL_STYLES = [
  { value: 'adventure', label: '冒险探索', icon: '🏔️' },
  { value: 'culture', label: '文化历史', icon: '🏛️' },
  { value: 'relaxation', label: '休闲度假', icon: '🏖️' },
  { value: 'food', label: '美食体验', icon: '🍜' },
  { value: 'nature', label: '自然风光', icon: '🌲' },
  { value: 'shopping', label: '购物娱乐', icon: '🛍️' },
] as const;

const BUDGET_OPTIONS = [
  { value: 'budget', label: '经济型', description: '< ¥3,000', icon: '💰' },
  { value: 'mid-range', label: '中等', description: '¥3,000 - ¥8,000', icon: '💳' },
  { value: 'luxury', label: '豪华', description: '¥8,000 - ¥15,000', icon: '💎' },
  { value: 'premium', label: '顶级', description: '> ¥15,000', icon: '👑' },
] as const;

export default function PlanningPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    trigger,
    getValues,
  } = useForm<TravelPreferencesForm>({
    resolver: zodResolver(travelPreferencesSchema),
    mode: 'onChange', // 修复：改为onChange模式，符合Material Design即时反馈原则
    reValidateMode: 'onChange', // 添加：确保重新验证也是即时的
    defaultValues: {
      destination: '', // 添加默认值
      startDate: '',   // 添加默认值
      endDate: '',     // 添加默认值
      groupSize: 2,
      budget: 'mid-range',
      travelStyles: [],
      accommodation: 'hotel',
      specialRequirements: '', // 添加默认值
    },
  });

  const watchedValues = watch();

  // 检查当前步骤的有效性（简化版本，不使用状态更新）
  const isCurrentStepValid = useMemo(() => {
    const fieldsToValidate = getFieldsForStep(currentStep);

    // 简单检查必填字段是否有值
    for (const field of fieldsToValidate) {
      const value = watchedValues[field];
      if (field === 'travelStyles') {
        if (!Array.isArray(value) || value.length === 0) return false;
      } else if (typeof value === 'string') {
        if (!value || value.trim().length === 0) return false;
      } else if (typeof value === 'number') {
        if (!value || value <= 0) return false;
      } else {
        if (value == null) return false;
      }
    }
    return true;
  }, [watchedValues, currentStep]);

  const handleNext = useCallback(() => {
    if (isCurrentStepValid) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      // 显示验证错误
      console.log('当前步骤验证失败:', errors);
    }
  }, [currentStep, isCurrentStepValid, errors]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSubmitForm = useCallback(async (data: TravelPreferencesForm) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🚀 开始创建旅行规划会话...', data);

      // 调用API创建会话
      const response = await fetch('/api/v1/planning/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: data,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ 会话创建成功:', result);

      if (result.success && result.data?.sessionId) {
        // 跳转到生成页面
        router.push(`/planning/generating?sessionId=${result.data.sessionId}`);
      } else {
        throw new Error('会话创建失败');
      }
    } catch (error) {
      console.error('❌ 创建会话失败:', error);
      setError(error instanceof Error ? error.message : '创建规划失败，请重试');
      setRetryCount(prev => prev + 1);
    } finally {
      setIsSubmitting(false);
    }
  }, [router]);

  const handleRetry = useCallback(() => {
    setError(null);
    const formData = getValues();
    handleSubmitForm(formData);
  }, [handleSubmitForm, getValues]);

  const handleTravelStyleChange = useCallback(async (style: string, checked: boolean) => {
    const currentStyles = watchedValues.travelStyles || [];
    const newStyles = checked
      ? [...currentStyles, style]
      : currentStyles.filter(s => s !== style);

    setValue('travelStyles', newStyles, { shouldValidate: true });
  }, [watchedValues.travelStyles, setValue]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">您想去哪里旅行？</h2>
              <p className="text-gray-600">告诉我们您的目的地和旅行时间</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目的地</label>
                <input
                  type="text"
                  placeholder="输入城市或国家名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                  {...register('destination')}
                />
                {errors.destination && (
                  <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">出发日期</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]} // 禁用过去日期
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                    {...register('startDate')}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">返回日期</label>
                  <input
                    type="date"
                    min={watchedValues.startDate || new Date().toISOString().split('T')[0]} // 最小日期为出发日期或今天
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                    {...register('endDate')}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">旅行人数</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                  {...register('groupSize', { valueAsNumber: true })}
                />
                {errors.groupSize && (
                  <p className="mt-1 text-sm text-red-600">{errors.groupSize.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">预算和旅行风格</h2>
              <p className="text-gray-600">设置您的预算范围和偏好风格</p>
            </div>

            <div className="space-y-8">
              {/* 预算选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">预算范围（人均总预算）</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {BUDGET_OPTIONS.map((option) => (
                    <label key={option.value} className="cursor-pointer">
                      <input
                        type="radio"
                        value={option.value}
                        className="sr-only"
                        {...register('budget')}
                      />
                      <div className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        watchedValues.budget === option.value
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="text-2xl mb-2">{option.icon}</div>
                        <div className="font-semibold">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.budget && (
                  <p className="mt-2 text-sm text-red-600">{errors.budget.message}</p>
                )}
              </div>

              {/* 旅行风格 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">旅行风格 (可多选)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {TRAVEL_STYLES.map((style) => (
                    <label key={style.value} className="cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={watchedValues.travelStyles?.includes(style.value) || false}
                        onChange={(e) => handleTravelStyleChange(style.value, e.target.checked)}
                      />
                      <div className={`p-4 border-2 rounded-lg text-center transition-colors ${
                        watchedValues.travelStyles?.includes(style.value)
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="text-2xl mb-2">{style.icon}</div>
                        <div className="font-semibold">{style.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.travelStyles && (
                  <p className="mt-2 text-sm text-red-600">{errors.travelStyles.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">住宿偏好</h2>
              <p className="text-gray-600">选择您偏好的住宿类型</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">住宿类型</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { value: 'hotel', label: '酒店', icon: '🏨', description: '标准酒店服务' },
                  { value: 'hostel', label: '青年旅社', icon: '🏠', description: '经济实惠选择' },
                  { value: 'bnb', label: '民宿', icon: '🏡', description: '当地特色体验' },
                  { value: 'resort', label: '度假村', icon: '🏖️', description: '全包式度假' },
                  { value: 'camping', label: '户外露营', icon: '⛺', description: '亲近自然体验' },
                  { value: 'rv', label: '房车', icon: '🚐', description: '移动住宿体验' },
                  { value: 'other', label: '其他', icon: '🏘️', description: '其他住宿方式' },
                ].map((option) => (
                  <label key={option.value} className="cursor-pointer">
                    <input
                      type="radio"
                      value={option.value}
                      className="sr-only"
                      {...register('accommodation')}
                    />
                    <div className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      watchedValues.accommodation === option.value
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="text-2xl mb-2">{option.icon}</div>
                      <div className="font-semibold mb-1">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">特殊要求 (可选)</label>
              <textarea
                rows={4}
                placeholder="请描述您的特殊需求，如无障碍设施、饮食限制等..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                {...register('specialRequirements')}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">确认您的选择</h2>
              <p className="text-gray-600">请检查以下信息，确认无误后开始生成规划</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div><strong>目的地:</strong> {watchedValues.destination}</div>
              <div><strong>时间:</strong> {watchedValues.startDate} 至 {watchedValues.endDate}</div>
              <div><strong>人数:</strong> {watchedValues.groupSize}人</div>
              <div><strong>预算:</strong> {BUDGET_OPTIONS.find(b => b.value === watchedValues.budget)?.label}</div>
              <div><strong>风格:</strong> {watchedValues.travelStyles?.map(s => 
                TRAVEL_STYLES.find(ts => ts.value === s)?.label
              ).join(', ')}</div>
              <div><strong>住宿:</strong> {(() => {
                const accommodationOptions = [
                  { value: 'hotel', label: '酒店' },
                  { value: 'hostel', label: '青年旅社' },
                  { value: 'bnb', label: '民宿' },
                  { value: 'resort', label: '度假村' },
                  { value: 'camping', label: '户外露营' },
                  { value: 'rv', label: '房车' },
                  { value: 'other', label: '其他' },
                ];
                return accommodationOptions.find(a => a.value === watchedValues.accommodation)?.label || watchedValues.accommodation;
              })()}</div>
              {watchedValues.specialRequirements && (
                <div><strong>特殊要求:</strong> {watchedValues.specialRequirements}</div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>旅行规划 - 智游助手v6.5</title>
        <meta name="description" content="创建您的个性化旅行规划" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* 进度指示器 */}
          <div className="mb-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.id
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step.id}
                    </div>
                    <div className="ml-2 text-sm">
                      <div className="font-medium">{step.title}</div>
                      <div className="text-gray-500">{step.description}</div>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`w-16 h-1 mx-4 ${
                        currentStep > step.id ? 'bg-pink-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 主要内容 */}
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
            <form onSubmit={handleSubmit(handleSubmitForm)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {/* 全局错误提示 */}
              {error && (
                <div className="mt-6">
                  <ErrorAlert
                    error={error}
                    onRetry={handleRetry}
                    onDismiss={() => setError(null)}
                    retryable={true}
                    type="error"
                    title="创建规划失败"
                  />
                </div>
              )}

              {/* 验证错误提示 */}
              {!stepValidation[currentStep] && Object.keys(errors).length > 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <h4 className="text-sm font-medium text-red-800 mb-2">请完善以下信息：</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {Object.entries(errors).map(([field, error]) => {
                      const fieldsForCurrentStep = getFieldsForStep(currentStep);
                      if (fieldsForCurrentStep.includes(field as keyof TravelPreferencesForm)) {
                        return (
                          <li key={field}>• {error?.message}</li>
                        );
                      }
                      return null;
                    })}
                  </ul>
                </div>
              )}

              {/* 导航按钮 */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <OutlineButton
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className={currentStep === 1 ? 'invisible' : ''}
                >
                  上一步
                </OutlineButton>

                <div className="flex-1" />

                {currentStep < STEPS.length ? (
                  <PrimaryButton
                    type="button"
                    onClick={handleNext}
                    disabled={!isCurrentStepValid}
                  >
                    下一步
                  </PrimaryButton>
                ) : (
                  <PrimaryButton
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    loading={isSubmitting}
                    icon={isSubmitting ? undefined : <i className="fas fa-magic"></i>}
                    iconPosition="left"
                  >
                    {isSubmitting ? '正在创建...' : '开始生成规划'}
                  </PrimaryButton>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function getFieldsForStep(step: number): (keyof TravelPreferencesForm)[] {
  switch (step) {
    case 1:
      return ['destination', 'startDate', 'endDate', 'groupSize'];
    case 2:
      return ['budget', 'travelStyles'];
    case 3:
      return ['accommodation'];
    case 4:
      return [];
    default:
      return [];
  }
}
