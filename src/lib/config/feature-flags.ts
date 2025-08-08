/**
 * 智游助手v6.2 - 特性开关配置
 * 用于动态控制功能的启用/禁用，替代代码注释方式
 */

import React from 'react';

// ================================
// 特性开关类型定义
// ================================

export interface FeatureFlags {
  // 支付相关特性
  PAYMENT_ENABLED: boolean;
  WECHAT_PAY_ENABLED: boolean;
  ALIPAY_ENABLED: boolean;
  STRIPE_ENABLED: boolean;
  PAYMENT_QR_CODE_ENABLED: boolean;
  PAYMENT_ENCRYPTION_ENABLED: boolean;
  
  // 用户认证特性
  AUTH_ENABLED: boolean;
  SOCIAL_LOGIN_ENABLED: boolean;
  TWO_FACTOR_AUTH_ENABLED: boolean;
  
  // 高级功能特性
  AI_RECOMMENDATIONS_ENABLED: boolean;
  OFFLINE_MODE_ENABLED: boolean;
  MULTI_LANGUAGE_ENABLED: boolean;
  ANALYTICS_ENABLED: boolean;
  
  // 实验性特性
  BETA_FEATURES_ENABLED: boolean;
  DEBUG_MODE_ENABLED: boolean;
}

// ================================
// 默认特性开关配置
// ================================

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // 支付功能 - 当前全部禁用
  PAYMENT_ENABLED: false,
  WECHAT_PAY_ENABLED: false,
  ALIPAY_ENABLED: false,
  STRIPE_ENABLED: false,
  PAYMENT_QR_CODE_ENABLED: false,
  PAYMENT_ENCRYPTION_ENABLED: false,
  
  // 用户认证 - 基础功能启用
  AUTH_ENABLED: true,
  SOCIAL_LOGIN_ENABLED: false,
  TWO_FACTOR_AUTH_ENABLED: false,
  
  // 高级功能 - 核心功能启用
  AI_RECOMMENDATIONS_ENABLED: true,
  OFFLINE_MODE_ENABLED: false,
  MULTI_LANGUAGE_ENABLED: false,
  ANALYTICS_ENABLED: true,
  
  // 实验性功能 - 开发环境启用
  BETA_FEATURES_ENABLED: process.env.NODE_ENV === 'development',
  DEBUG_MODE_ENABLED: process.env.NODE_ENV === 'development',
};

// ================================
// 环境变量映射
// ================================

function getFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  return {
    // 支付功能
    PAYMENT_ENABLED: process.env.ENABLE_PAYMENT === 'true',
    WECHAT_PAY_ENABLED: process.env.ENABLE_WECHAT_PAY === 'true',
    ALIPAY_ENABLED: process.env.ENABLE_ALIPAY === 'true',
    STRIPE_ENABLED: process.env.ENABLE_STRIPE === 'true',
    PAYMENT_QR_CODE_ENABLED: process.env.ENABLE_PAYMENT_QR_CODE === 'true',
    PAYMENT_ENCRYPTION_ENABLED: process.env.ENABLE_PAYMENT_ENCRYPTION === 'true',
    
    // 用户认证
    AUTH_ENABLED: process.env.ENABLE_AUTH !== 'false', // 默认启用
    SOCIAL_LOGIN_ENABLED: process.env.ENABLE_SOCIAL_LOGIN === 'true',
    TWO_FACTOR_AUTH_ENABLED: process.env.ENABLE_2FA === 'true',
    
    // 高级功能
    AI_RECOMMENDATIONS_ENABLED: process.env.ENABLE_AI_RECOMMENDATIONS !== 'false',
    OFFLINE_MODE_ENABLED: process.env.ENABLE_OFFLINE === 'true',
    MULTI_LANGUAGE_ENABLED: process.env.ENABLE_I18N === 'true',
    ANALYTICS_ENABLED: process.env.ENABLE_ANALYTICS !== 'false',
    
    // 实验性功能
    BETA_FEATURES_ENABLED: process.env.ENABLE_BETA_FEATURES === 'true',
    DEBUG_MODE_ENABLED: process.env.ENABLE_DEBUG === 'true',
  };
}

// ================================
// 特性开关管理器
// ================================

class FeatureFlagManager {
  private flags: FeatureFlags;
  private listeners: Array<(flags: FeatureFlags) => void> = [];

  constructor() {
    // 合并默认配置和环境变量配置
    this.flags = {
      ...DEFAULT_FEATURE_FLAGS,
      ...getFeatureFlagsFromEnv(),
    };

    // 开发环境下输出特性开关状态
    if (process.env.NODE_ENV === 'development') {
      console.log('🚩 特性开关状态:', this.getEnabledFeatures());
    }
  }

  /**
   * 获取特定特性的状态
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }

  /**
   * 获取所有特性开关状态
   */
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * 获取已启用的特性列表
   */
  getEnabledFeatures(): string[] {
    return Object.entries(this.flags)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature);
  }

  /**
   * 动态更新特性开关（仅限开发环境）
   */
  updateFlag(feature: keyof FeatureFlags, enabled: boolean): void {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ 生产环境不允许动态更新特性开关');
      return;
    }

    this.flags[feature] = enabled;
    console.log(`🚩 特性开关更新: ${feature} = ${enabled}`);
    
    // 通知监听器
    this.listeners.forEach(listener => listener(this.flags));
  }

  /**
   * 添加特性开关变更监听器
   */
  addListener(listener: (flags: FeatureFlags) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除特性开关变更监听器
   */
  removeListener(listener: (flags: FeatureFlags) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 检查支付功能是否完全可用
   */
  isPaymentFullyEnabled(): boolean {
    return this.flags.PAYMENT_ENABLED && 
           (this.flags.WECHAT_PAY_ENABLED || this.flags.ALIPAY_ENABLED || this.flags.STRIPE_ENABLED);
  }

  /**
   * 获取可用的支付方式
   */
  getAvailablePaymentMethods(): string[] {
    const methods: string[] = [];
    
    if (this.flags.PAYMENT_ENABLED) {
      if (this.flags.WECHAT_PAY_ENABLED) methods.push('wechat');
      if (this.flags.ALIPAY_ENABLED) methods.push('alipay');
      if (this.flags.STRIPE_ENABLED) methods.push('stripe');
      if (this.flags.PAYMENT_QR_CODE_ENABLED) methods.push('qr_code');
    }
    
    return methods;
  }

  /**
   * 验证特性开关配置
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查支付功能依赖
    if (this.flags.PAYMENT_ENABLED) {
      if (!this.isPaymentFullyEnabled()) {
        errors.push('支付功能已启用但没有可用的支付方式');
      }
      
      if (this.flags.PAYMENT_ENCRYPTION_ENABLED && !process.env.PAYMENT_ENCRYPTION_KEY) {
        errors.push('支付加密已启用但缺少加密密钥');
      }
    }

    // 检查认证功能依赖
    if (this.flags.TWO_FACTOR_AUTH_ENABLED && !this.flags.AUTH_ENABLED) {
      errors.push('双因子认证需要基础认证功能');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ================================
// 导出单例实例
// ================================

export const featureFlags = new FeatureFlagManager();

// ================================
// 便捷函数
// ================================

/**
 * 检查特性是否启用
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags.isEnabled(feature);
}

/**
 * 支付功能检查装饰器
 */
export function requirePaymentEnabled(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    if (!featureFlags.isEnabled('PAYMENT_ENABLED')) {
      throw new Error('支付功能当前已禁用');
    }
    return method.apply(this, args);
  };
}

/**
 * 特性开关条件渲染组件
 */
export function withFeatureFlag<T>(
  feature: keyof FeatureFlags,
  Component: React.ComponentType<T>,
  FallbackComponent?: React.ComponentType<T>
) {
  return function FeatureFlagWrapper(props: T) {
    if (featureFlags.isEnabled(feature)) {
      return React.createElement(Component as any, props as any);
    }
    
    if (FallbackComponent) {
      return React.createElement(FallbackComponent as any, props as any);
    }
    
    return null;
  };
}

// 默认导出
export default featureFlags;
