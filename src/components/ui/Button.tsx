/**
 * 智游助手v6.5 标准化按钮组件
 * 基于Apple HIG和Material Design规范
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  platform?: 'ios' | 'material' | 'auto';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    platform = 'auto',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    children,
    ...props
  }, ref) => {
    // 检测平台偏好
    const detectedPlatform = platform === 'auto' 
      ? (typeof window !== 'undefined' && /iPhone|iPad|iPod|Mac/.test(navigator.userAgent) ? 'ios' : 'material')
      : platform;

    const baseClasses = cn(
      // 基础样式
      'inline-flex items-center justify-center font-medium transition-all duration-medium',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      
      // 平台特定基础样式
      detectedPlatform === 'ios' ? [
        'rounded-sm', // Apple HIG: 8px border radius
        'min-h-touch-ios', // 44px minimum touch target
      ] : [
        'rounded-lg', // Material Design: 16px border radius
        'min-h-12', // 48px minimum touch target
        'min-w-16', // 64px minimum width
        'uppercase tracking-wide text-sm font-medium',
      ],
      
      // 全宽样式
      fullWidth && 'w-full',
      
      // 尺寸样式
      size === 'sm' && (detectedPlatform === 'ios' ? 'px-4 py-2 text-ios-footnote' : 'px-3 py-2 text-md-label-medium'),
      size === 'md' && (detectedPlatform === 'ios' ? 'px-6 py-3 text-ios-body' : 'px-6 py-3 text-md-label-large'),
      size === 'lg' && (detectedPlatform === 'ios' ? 'px-8 py-4 text-ios-headline' : 'px-8 py-4 text-md-title-medium'),
    );

    const variantClasses = cn(
      // Primary 变体
      variant === 'primary' && [
        'bg-md-primary text-md-on-primary',
        'hover:opacity-80 active:opacity-60',
        'focus:ring-md-primary/20',
        detectedPlatform === 'material' && 'shadow-elevation-1 hover:shadow-elevation-2',
        detectedPlatform === 'ios' && 'hover:-translate-y-0.5 active:translate-y-0',
      ],
      
      // Secondary 变体
      variant === 'secondary' && [
        'bg-md-secondary text-md-on-secondary',
        'hover:opacity-80 active:opacity-60',
        'focus:ring-md-secondary/20',
        detectedPlatform === 'material' && 'shadow-elevation-1 hover:shadow-elevation-2',
        detectedPlatform === 'ios' && 'hover:-translate-y-0.5 active:translate-y-0',
      ],
      
      // Outline 变体
      variant === 'outline' && [
        'border border-md-primary text-md-primary bg-transparent',
        'hover:bg-md-primary hover:text-md-on-primary',
        'focus:ring-md-primary/20',
        detectedPlatform === 'ios' && 'hover:-translate-y-0.5 active:translate-y-0',
      ],
      
      // Ghost 变体
      variant === 'ghost' && [
        'text-md-primary bg-transparent',
        'hover:bg-md-primary/10 active:bg-md-primary/20',
        'focus:ring-md-primary/20',
      ],
      
      // Danger 变体
      variant === 'danger' && [
        'bg-md-error text-md-on-error',
        'hover:opacity-80 active:opacity-60',
        'focus:ring-md-error/20',
        detectedPlatform === 'material' && 'shadow-elevation-1 hover:shadow-elevation-2',
        detectedPlatform === 'ios' && 'hover:-translate-y-0.5 active:translate-y-0',
      ],
    );

    const iconClasses = cn(
      'flex-shrink-0',
      size === 'sm' && 'w-4 h-4',
      size === 'md' && 'w-5 h-5',
      size === 'lg' && 'w-6 h-6',
    );

    const renderIcon = (position: 'left' | 'right') => {
      if (!icon || iconPosition !== position) return null;
      
      return (
        <span className={cn(
          iconClasses,
          position === 'left' && children && 'mr-2',
          position === 'right' && children && 'ml-2',
        )}>
          {icon}
        </span>
      );
    };

    const renderLoadingSpinner = () => (
      <svg
        className={cn(iconClasses, 'animate-spin')}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        className={cn(baseClasses, variantClasses, className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            {renderLoadingSpinner()}
            {children && <span className="ml-2">{children}</span>}
          </>
        ) : (
          <>
            {renderIcon('left')}
            {children}
            {renderIcon('right')}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

// 预设按钮组件
export const PrimaryButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="primary" ref={ref} {...props} />
);

export const SecondaryButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="secondary" ref={ref} {...props} />
);

export const OutlineButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="outline" ref={ref} {...props} />
);

export const GhostButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="ghost" ref={ref} {...props} />
);

export const DangerButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button variant="danger" ref={ref} {...props} />
);

PrimaryButton.displayName = 'PrimaryButton';
SecondaryButton.displayName = 'SecondaryButton';
OutlineButton.displayName = 'OutlineButton';
GhostButton.displayName = 'GhostButton';
DangerButton.displayName = 'DangerButton';
