/**
 * 智游助手v6.5 进度指示器组件
 * 基于Apple HIG和Material Design规范
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0-100
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  platform?: 'ios' | 'material' | 'auto';
  indeterminate?: boolean;
  showLabel?: boolean;
  label?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({
    className,
    value = 0,
    variant = 'linear',
    size = 'md',
    platform = 'auto',
    indeterminate = false,
    showLabel = false,
    label,
    color = 'primary',
    ...props
  }, ref) => {
    // 检测平台偏好
    const detectedPlatform = platform === 'auto' 
      ? (typeof window !== 'undefined' && /iPhone|iPad|iPod|Mac/.test(navigator.userAgent) ? 'ios' : 'material')
      : platform;

    // 确保值在有效范围内
    const clampedValue = Math.min(100, Math.max(0, value));

    if (variant === 'circular') {
      return (
        <CircularProgress
          ref={ref}
          value={clampedValue}
          size={size}
          platform={detectedPlatform}
          indeterminate={indeterminate}
          showLabel={showLabel}
          label={label}
          color={color}
          className={className}
          {...props}
        />
      );
    }

    return (
      <LinearProgress
        ref={ref}
        value={clampedValue}
        size={size}
        platform={detectedPlatform}
        indeterminate={indeterminate}
        showLabel={showLabel}
        label={label}
        color={color}
        className={className}
        {...props}
      />
    );
  }
);

Progress.displayName = 'Progress';

// 线性进度条
interface LinearProgressProps extends Omit<ProgressProps, 'variant'> {
  platform: 'ios' | 'material';
}

const LinearProgress = React.forwardRef<HTMLDivElement, LinearProgressProps>(
  ({
    className,
    value = 0,
    size = 'md',
    platform,
    indeterminate = false,
    showLabel = false,
    label,
    color = 'primary',
    ...props
  }, ref) => {
    const containerClasses = cn(
      'relative overflow-hidden',
      
      // 平台特定样式
      platform === 'ios' ? [
        'rounded-full bg-md-surface-variant',
        size === 'sm' && 'h-1',
        size === 'md' && 'h-2',
        size === 'lg' && 'h-3',
      ] : [
        'rounded-full bg-md-surface-variant',
        size === 'sm' && 'h-1',
        size === 'md' && 'h-1',
        size === 'lg' && 'h-1.5',
      ],
    );

    const progressClasses = cn(
      'h-full transition-all duration-medium ease-out',
      'rounded-full',
      
      // 颜色变体
      color === 'primary' && 'bg-md-primary',
      color === 'secondary' && 'bg-md-secondary',
      color === 'success' && 'bg-green-500',
      color === 'warning' && 'bg-yellow-500',
      color === 'error' && 'bg-md-error',
      
      // 不确定状态动画
      indeterminate && 'animate-pulse',
    );

    const progressStyle = indeterminate 
      ? { width: '100%' }
      : { width: `${value}%` };

    return (
      <div className={cn('w-full', className)} ref={ref} {...props}>
        {showLabel && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-md-body-small text-md-on-surface-variant">
              {label || 'Progress'}
            </span>
            <span className="text-md-body-small text-md-on-surface-variant font-medium">
              {indeterminate ? '...' : `${Math.round(value)}%`}
            </span>
          </div>
        )}
        
        <div className={containerClasses}>
          <div
            className={progressClasses}
            style={progressStyle}
            role="progressbar"
            aria-valuenow={indeterminate ? undefined : value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
          />
        </div>
      </div>
    );
  }
);

LinearProgress.displayName = 'LinearProgress';

// 圆形进度条
interface CircularProgressProps extends Omit<ProgressProps, 'variant'> {
  platform: 'ios' | 'material';
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({
    className,
    value = 0,
    size = 'md',
    platform,
    indeterminate = false,
    showLabel = false,
    label,
    color = 'primary',
    ...props
  }, ref) => {
    // 尺寸配置
    const sizeConfig = {
      sm: { size: 32, strokeWidth: 3 },
      md: { size: 48, strokeWidth: 4 },
      lg: { size: 64, strokeWidth: 5 },
    };

    const { size: circleSize, strokeWidth } = sizeConfig[size];
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = indeterminate ? 0 : circumference - (value / 100) * circumference;

    const colorClasses = {
      primary: 'text-md-primary',
      secondary: 'text-md-secondary',
      success: 'text-green-500',
      warning: 'text-yellow-500',
      error: 'text-md-error',
    };

    return (
      <div
        className={cn(
          'relative inline-flex items-center justify-center',
          className
        )}
        ref={ref}
        {...props}
      >
        <svg
          width={circleSize}
          height={circleSize}
          className={cn(
            'transform -rotate-90',
            indeterminate && 'animate-spin',
          )}
        >
          {/* 背景圆环 */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-md-surface-variant"
          />
          
          {/* 进度圆环 */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              'transition-all duration-medium ease-out',
              colorClasses[color]
            )}
            role="progressbar"
            aria-valuenow={indeterminate ? undefined : value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
          />
        </svg>
        
        {/* 中心标签 */}
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {label ? (
                <div className="text-md-body-small text-md-on-surface-variant">
                  {label}
                </div>
              ) : (
                <div className="text-md-label-large font-medium text-md-on-surface">
                  {indeterminate ? '...' : `${Math.round(value)}%`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';

// 步骤进度条
export interface StepProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Array<{
    label: string;
    description?: string;
    completed?: boolean;
    active?: boolean;
    error?: boolean;
  }>;
  orientation?: 'horizontal' | 'vertical';
  platform?: 'ios' | 'material' | 'auto';
}

const StepProgress = React.forwardRef<HTMLDivElement, StepProgressProps>(
  ({
    className,
    steps,
    orientation = 'horizontal',
    platform = 'auto',
    ...props
  }, ref) => {
    const detectedPlatform = platform === 'auto' 
      ? (typeof window !== 'undefined' && /iPhone|iPad|iPod|Mac/.test(navigator.userAgent) ? 'ios' : 'material')
      : platform;

    const containerClasses = cn(
      'flex',
      orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
      className
    );

    return (
      <div className={containerClasses} ref={ref} {...props}>
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center',
              orientation === 'horizontal' ? 'flex-row' : 'flex-col',
              index < steps.length - 1 && orientation === 'horizontal' && 'flex-1',
            )}
          >
            {/* 步骤指示器 */}
            <div className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center rounded-full border-2 transition-all duration-medium',
                  detectedPlatform === 'ios' ? 'w-8 h-8' : 'w-10 h-10',
                  
                  step.error ? [
                    'border-md-error bg-md-error text-md-on-error',
                  ] : step.completed ? [
                    'border-md-primary bg-md-primary text-md-on-primary',
                  ] : step.active ? [
                    'border-md-primary bg-md-primary-container text-md-on-primary-container',
                  ] : [
                    'border-md-on-surface-variant bg-md-surface text-md-on-surface-variant',
                  ]
                )}
              >
                {step.error ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : step.completed ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-md-label-medium font-medium">{index + 1}</span>
                )}
              </div>
              
              {/* 步骤标签 */}
              <div className={cn(
                'ml-3',
                orientation === 'vertical' && 'mb-4',
              )}>
                <div className={cn(
                  'font-medium',
                  detectedPlatform === 'ios' ? 'text-ios-callout' : 'text-md-body-medium',
                  step.active ? 'text-md-on-surface' : 'text-md-on-surface-variant',
                )}>
                  {step.label}
                </div>
                {step.description && (
                  <div className={cn(
                    'mt-1',
                    detectedPlatform === 'ios' ? 'text-ios-footnote' : 'text-md-body-small',
                    'text-md-on-surface-variant',
                  )}>
                    {step.description}
                  </div>
                )}
              </div>
            </div>
            
            {/* 连接线 */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'bg-md-on-surface-variant/30',
                  orientation === 'horizontal' ? 'flex-1 h-0.5 mx-4' : 'w-0.5 h-8 ml-4',
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  }
);

StepProgress.displayName = 'StepProgress';

export { Progress, StepProgress };
