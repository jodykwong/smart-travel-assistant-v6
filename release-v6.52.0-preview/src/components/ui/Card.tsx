/**
 * 智游助手v6.5 标准化卡片组件
 * 基于Apple HIG和Material Design规范
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'filled' | 'outlined';
  platform?: 'ios' | 'material' | 'auto';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: React.ElementType;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant = 'elevated',
    platform = 'auto',
    interactive = false,
    padding = 'md',
    as: Component = 'div',
    children,
    ...props
  }, ref) => {
    // 检测平台偏好
    const detectedPlatform = platform === 'auto' 
      ? (typeof window !== 'undefined' && /iPhone|iPad|iPod|Mac/.test(navigator.userAgent) ? 'ios' : 'material')
      : platform;

    const cardClasses = cn(
      // 基础样式
      'relative overflow-hidden transition-all duration-medium',
      'bg-md-surface text-md-on-surface',
      
      // 平台特定样式
      detectedPlatform === 'ios' ? [
        'rounded-lg', // Apple HIG: 16px border radius
        variant === 'elevated' && 'border border-md-on-surface-variant/10',
        variant === 'outlined' && 'border border-md-on-surface-variant/30',
        interactive && [
          'cursor-pointer',
          'hover:-translate-y-1 hover:shadow-elevation-2',
          'active:translate-y-0 active:shadow-elevation-1',
        ],
      ] : [
        'rounded-md', // Material Design: 12px border radius
        
        // Material Design variant styles
        variant === 'elevated' && [
          'shadow-elevation-1',
          interactive && 'hover:shadow-elevation-2 active:shadow-elevation-1',
        ],
        
        variant === 'filled' && [
          'bg-md-surface-variant',
          interactive && 'hover:bg-md-surface-variant/80',
        ],
        
        variant === 'outlined' && [
          'border border-md-on-surface-variant/30',
          interactive && 'hover:border-md-on-surface-variant/50',
        ],
        
        interactive && 'cursor-pointer',
      ],
      
      // 内边距
      padding === 'none' && 'p-0',
      padding === 'sm' && 'p-sm',
      padding === 'md' && 'p-md',
      padding === 'lg' && 'p-lg',
    );

    return (
      <Component
        ref={ref}
        className={cn(cardClasses, className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

// 卡片子组件
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  avatar?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, avatar, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start justify-between gap-4 pb-md',
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {avatar && (
            <div className="flex-shrink-0">
              {avatar}
            </div>
          )}
          
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-md-title-large font-medium text-md-on-surface truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-md-body-medium text-md-on-surface-variant mt-1">
                {subtitle}
              </p>
            )}
            {children}
          </div>
        </div>
        
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('text-md-body-medium text-md-on-surface', className)}
        {...props}
      />
    );
  }
);

CardContent.displayName = 'CardContent';

export interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'end' | 'center' | 'between';
}

const CardActions = React.forwardRef<HTMLDivElement, CardActionsProps>(
  ({ className, justify = 'end', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2 pt-md',
          justify === 'start' && 'justify-start',
          justify === 'end' && 'justify-end',
          justify === 'center' && 'justify-center',
          justify === 'between' && 'justify-between',
          className
        )}
        {...props}
      />
    );
  }
);

CardActions.displayName = 'CardActions';

// 特殊卡片组件
export interface ItineraryCardProps extends CardProps {
  day?: number;
  date?: string;
  weather?: string;
  temperature?: string;
  location?: string;
  cost?: number;
  activities?: Array<{
    time: string;
    title: string;
    description?: string;
    icon?: string;
    cost?: number;
    duration?: string;
  }>;
}

const ItineraryCard = React.forwardRef<HTMLDivElement, ItineraryCardProps>(
  ({
    day,
    date,
    weather,
    temperature,
    location,
    cost,
    activities = [],
    className,
    ...props
  }, ref) => {
    return (
      <Card
        ref={ref}
        variant="elevated"
        interactive
        className={cn('hover:shadow-elevation-3', className)}
        {...props}
      >
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              {day && (
                <span className="inline-flex items-center justify-center w-8 h-8 bg-md-primary text-md-on-primary rounded-full text-md-label-large font-bold">
                  {day}
                </span>
              )}
              <span>Day {day}</span>
              {date && <span className="text-md-on-surface-variant">• {date}</span>}
            </div>
          }
          subtitle={
            <div className="flex items-center gap-4 text-md-body-small">
              {location && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {location}
                </span>
              )}
              {weather && temperature && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  {weather} {temperature}
                </span>
              )}
              {cost && (
                <span className="flex items-center gap-1 text-md-primary font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  ¥{cost}
                </span>
              )}
            </div>
          }
        />
        
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-sm bg-md-surface-variant/30">
                <div className="flex-shrink-0 w-12 text-center">
                  <div className="text-md-label-small text-md-on-surface-variant font-medium">
                    {activity.time}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    {activity.icon && (
                      <span className="text-lg flex-shrink-0">{activity.icon}</span>
                    )}
                    <div className="flex-1">
                      <h4 className="text-md-body-large font-medium text-md-on-surface">
                        {activity.title}
                      </h4>
                      {activity.description && (
                        <p className="text-md-body-medium text-md-on-surface-variant mt-1">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-md-body-small text-md-on-surface-variant">
                        {activity.duration && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {activity.duration}
                          </span>
                        )}
                        {activity.cost && (
                          <span className="flex items-center gap-1 text-md-primary font-medium">
                            ¥{activity.cost}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);

ItineraryCard.displayName = 'ItineraryCard';

export { Card, CardHeader, CardContent, CardActions, ItineraryCard };
