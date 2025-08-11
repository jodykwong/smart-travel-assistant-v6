/**
 * 智游助手v6.5 标准化输入组件
 * 基于Apple HIG和Material Design规范
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'outlined' | 'filled' | 'standard';
  platform?: 'ios' | 'material' | 'auto';
  label?: string;
  helperText?: string;
  error?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant = 'outlined',
    platform = 'auto',
    label,
    helperText,
    error,
    startIcon,
    endIcon,
    fullWidth = false,
    disabled,
    id,
    ...props
  }, ref) => {
    // 检测平台偏好
    const detectedPlatform = platform === 'auto' 
      ? (typeof window !== 'undefined' && /iPhone|iPad|iPod|Mac/.test(navigator.userAgent) ? 'ios' : 'material')
      : platform;

    // 生成唯一ID
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const containerClasses = cn(
      'relative',
      fullWidth && 'w-full',
      disabled && 'opacity-50 cursor-not-allowed',
    );

    const inputClasses = cn(
      // 基础样式
      'w-full transition-all duration-medium',
      'focus:outline-none',
      'disabled:cursor-not-allowed disabled:opacity-50',
      
      // 平台特定样式
      detectedPlatform === 'ios' ? [
        'min-h-touch-ios', // 44px minimum touch target
        'px-4 py-3',
        'text-ios-body',
        'bg-md-surface text-md-on-surface',
        'border border-md-on-surface-variant/30',
        'rounded-sm', // 8px border radius
        'focus:border-md-primary focus:ring-2 focus:ring-md-primary/10',
        hasError && 'border-md-error focus:border-md-error focus:ring-md-error/10',
      ] : [
        'min-h-14', // 56px Material Design standard
        'px-4 py-4',
        'text-md-body-large',
        
        // Material Design variant styles
        variant === 'outlined' && [
          'bg-transparent',
          'border border-md-on-surface-variant',
          'rounded-xs', // 4px border radius
          'focus:border-md-primary focus:border-2',
          hasError && 'border-md-error focus:border-md-error',
        ],
        
        variant === 'filled' && [
          'bg-md-surface-variant',
          'border-0 border-b-2 border-md-on-surface-variant',
          'rounded-t-xs rounded-b-none',
          'focus:border-b-md-primary',
          hasError && 'border-b-md-error focus:border-b-md-error',
        ],
        
        variant === 'standard' && [
          'bg-transparent',
          'border-0 border-b border-md-on-surface-variant',
          'rounded-none',
          'focus:border-b-2 focus:border-b-md-primary',
          hasError && 'border-b-md-error focus:border-b-md-error',
        ],
      ],
      
      // 图标间距调整
      startIcon && 'pl-12',
      endIcon && 'pr-12',
    );

    const labelClasses = cn(
      'block mb-2 font-medium',
      detectedPlatform === 'ios' ? 'text-ios-subhead' : 'text-md-body-medium',
      hasError ? 'text-md-error' : 'text-md-on-surface',
    );

    const helperTextClasses = cn(
      'mt-1 text-sm',
      detectedPlatform === 'ios' ? 'text-ios-footnote' : 'text-md-body-small',
      hasError ? 'text-md-error' : 'text-md-on-surface-variant',
    );

    const iconClasses = cn(
      'absolute top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none',
      hasError ? 'text-md-error' : 'text-md-on-surface-variant',
    );

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={inputId} className={labelClasses}>
            {label}
            {props.required && (
              <span className="ml-1 text-md-error" aria-label="required">*</span>
            )}
          </label>
        )}
        
        <div className="relative">
          {startIcon && (
            <div className={cn(iconClasses, 'left-4')}>
              {startIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={cn(inputClasses, className)}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : 
              helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          
          {endIcon && (
            <div className={cn(iconClasses, 'right-4')}>
              {endIcon}
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <div
            id={error ? `${inputId}-error` : `${inputId}-helper`}
            className={helperTextClasses}
            role={error ? 'alert' : undefined}
          >
            {error || helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

// 特殊输入组件
export interface DateInputProps extends Omit<InputProps, 'type'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <Input
        ref={ref}
        type="date"
        value={value}
        onChange={handleChange}
        startIcon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        {...props}
      />
    );
  }
);

DateInput.displayName = 'DateInput';

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onClear, showClearButton = true, value, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onSearch?.(e.currentTarget.value);
      }
    };

    const handleClear = () => {
      onClear?.();
    };

    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        onKeyDown={handleKeyDown}
        startIcon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        endIcon={
          showClearButton && value ? (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto hover:text-md-on-surface transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : undefined
        }
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';
