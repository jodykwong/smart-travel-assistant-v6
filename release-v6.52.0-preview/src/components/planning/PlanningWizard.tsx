/**
 * 智游助手v5.0 - 规划向导组件
 * 重构前: 混乱的HTML+内联JS
 * 重构后: 模块化React组件 + TypeScript + 状态管理
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import { useTravelPlanningStore } from '@/store/travel-planning-store';
import { travelPlanningService } from '@/services/travel-planning-service';
import type { TravelPreferencesForm, TravelStyle } from '@/types/travel-planning';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/Textarea';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Card } from '@/components/ui/Card';

// ============= 表单验证Schema =============

const travelPreferencesSchema = z.object({
  destination: z.string().min(1, '请输入目的地'),
  startDate: z.string().min(1, '请选择出发日期'),
  endDate: z.string().min(1, '请选择返回日期'),
  groupSize: z.number().min(1, '人数至少为1').max(20, '人数不能超过20'),
  budget: z.enum(['budget', 'mid-range', 'luxury', 'premium']),
  travelStyles: z.array(z.enum(['adventure', 'culture', 'relaxation', 'food', 'nature', 'shopping'])).min(1, '请至少选择一种旅行风格'),
  accommodation: z.enum(['hotel', 'hostel', 'bnb', 'resort', 'camping', 'rv', 'other']),
  specialRequirements: z.string().optional(),
});

// ============= 步骤配置 =============

const STEPS = [
  { id: 1, title: '目的地与时间', description: '告诉我们您想去哪里' },
  { id: 2, title: '预算和风格', description: '设置您的预算和偏好' },
  { id: 3, title: '住宿偏好', description: '选择您的住宿类型' },
  { id: 4, title: '确认信息', description: '检查并确认您的选择' },
] as const;

const TRAVEL_STYLES: Array<{ value: TravelStyle; label: string; icon: string }> = [
  { value: 'adventure', label: '冒险探索', icon: '🏔️' },
  { value: 'culture', label: '文化历史', icon: '🏛️' },
  { value: 'relaxation', label: '休闲度假', icon: '🏖️' },
  { value: 'food', label: '美食体验', icon: '🍜' },
  { value: 'nature', label: '自然风光', icon: '🌲' },
  { value: 'shopping', label: '购物娱乐', icon: '🛍️' },
];

const BUDGET_OPTIONS = [
  { value: 'budget', label: '经济型', description: '< ¥3,000', icon: '💰' },
  { value: 'mid-range', label: '中等', description: '¥3,000 - ¥8,000', icon: '💳' },
  { value: 'luxury', label: '豪华', description: '¥8,000 - ¥15,000', icon: '💎' },
  { value: 'premium', label: '顶级', description: '> ¥15,000', icon: '👑' },
] as const;

// ============= 主组件 =============

export const PlanningWizard: React.FC = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const { updatePreferences, startNewSession } = useTravelPlanningStore();

  // 表单管理
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    trigger,
  } = useForm<TravelPreferencesForm>({
    resolver: zodResolver(travelPreferencesSchema),
    mode: 'onChange',
    defaultValues: {
      groupSize: 2,
      budget: 'mid-range',
      travelStyles: [],
      accommodation: 'hotel',
    },
  });

  const watchedValues = watch();

  // 创建会话的Mutation
  const createSessionMutation = useMutation({
    mutationFn: travelPlanningService.createSession,
    onSuccess: (sessionId) => {
      startNewSession(sessionId);
      router.push('/planning/generating');
    },
    onError: (error) => {
      toast.error('创建规划会话失败，请重试');
      console.error('Create session error:', error);
    },
  });

  // ============= 事件处理 =============

  const handleNext = useCallback(async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  }, [currentStep, trigger]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSubmitForm = useCallback((data: TravelPreferencesForm) => {
    updatePreferences(data);
    createSessionMutation.mutate(data);
  }, [updatePreferences, createSessionMutation]);

  const handleTravelStyleChange = useCallback((style: TravelStyle, checked: boolean) => {
    const currentStyles = watchedValues.travelStyles || [];
    const newStyles = checked
      ? [...currentStyles, style]
      : currentStyles.filter(s => s !== style);
    setValue('travelStyles', newStyles);
  }, [watchedValues.travelStyles, setValue]);

  // ============= 渲染方法 =============

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1DestinationAndTime register={register} errors={errors} />;
      case 2:
        return (
          <Step2BudgetAndStyle
            register={register}
            errors={errors}
            watchedValues={watchedValues}
            onTravelStyleChange={handleTravelStyleChange}
            setValue={setValue}
          />
        );
      case 3:
        return <Step3Accommodation register={register} errors={errors} setValue={setValue} />;
      case 4:
        return <Step4Confirmation watchedValues={watchedValues} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 进度指示器 */}
        <div className="mb-8">
          <ProgressBar
            steps={STEPS}
            currentStep={currentStep}
            className="max-w-4xl mx-auto"
          />
        </div>

        {/* 主要内容 */}
        <Card className="max-w-4xl mx-auto p-8">
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

            {/* 导航按钮 */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={currentStep === 1 ? 'invisible' : ''}
              >
                上一步
              </Button>

              <div className="flex-1" />

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!isValid}
                >
                  下一步
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!isValid || createSessionMutation.isPending}
                  loading={createSessionMutation.isPending}
                >
                  开始生成规划
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

// ============= 步骤组件 =============

interface Step1Props {
  register: any;
  errors: any;
}

const Step1DestinationAndTime: React.FC<Step1Props> = ({ register, errors }) => (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">您想去哪里旅行？</h2>
      <p className="text-gray-600">告诉我们您的目的地和旅行时间</p>
    </div>

    <div className="space-y-6">
      <Input
        label="目的地"
        placeholder="输入城市或国家名称"
        error={errors.destination?.message}
        {...register('destination')}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Input
          label="出发日期"
          type="date"
          error={errors.startDate?.message}
          {...register('startDate')}
        />
        <Input
          label="返回日期"
          type="date"
          error={errors.endDate?.message}
          {...register('endDate')}
        />
      </div>

      <Input
        label="旅行人数"
        type="number"
        min={1}
        max={20}
        error={errors.groupSize?.message}
        {...register('groupSize', { valueAsNumber: true })}
      />
    </div>
  </div>
);

// 其他步骤组件的实现...
// (由于篇幅限制，这里省略了Step2、Step3、Step4的完整实现)

// ============= 辅助函数 =============

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
