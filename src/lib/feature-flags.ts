/**
 * Feature Flags配置
 * 支持Timeline解析架构v2.0的零停机切换
 */

export interface FeatureFlags {
  TIMELINE_V2_ENABLED: boolean;
  TIMELINE_V2_PERCENTAGE: number; // 0-100，控制流量百分比
  TIMELINE_V2_WHITELIST: string[]; // 白名单sessionId
  TIMELINE_V2_BLACKLIST: string[]; // 黑名单sessionId
}

// 默认Feature Flags配置
const DEFAULT_FLAGS: FeatureFlags = {
  TIMELINE_V2_ENABLED: true, // 默认启用Timeline v2.0
  TIMELINE_V2_PERCENTAGE: 100, // 100%流量使用v2.0
  TIMELINE_V2_WHITELIST: [], // 白名单为空表示不限制
  TIMELINE_V2_BLACKLIST: [], // 黑名单为空表示不限制
};

// 从环境变量读取配置
function getFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  const flags: Partial<FeatureFlags> = {};

  // 读取环境变量
  if (process.env.TIMELINE_V2_ENABLED !== undefined) {
    flags.TIMELINE_V2_ENABLED = process.env.TIMELINE_V2_ENABLED === 'true';
  }

  if (process.env.TIMELINE_V2_PERCENTAGE !== undefined) {
    const percentage = parseInt(process.env.TIMELINE_V2_PERCENTAGE, 10);
    if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
      flags.TIMELINE_V2_PERCENTAGE = percentage;
    }
  }

  if (process.env.TIMELINE_V2_WHITELIST !== undefined) {
    flags.TIMELINE_V2_WHITELIST = process.env.TIMELINE_V2_WHITELIST
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
  }

  if (process.env.TIMELINE_V2_BLACKLIST !== undefined) {
    flags.TIMELINE_V2_BLACKLIST = process.env.TIMELINE_V2_BLACKLIST
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
  }

  return flags;
}

// 获取当前Feature Flags配置
export function getFeatureFlags(): FeatureFlags {
  const envFlags = getFeatureFlagsFromEnv();
  return { ...DEFAULT_FLAGS, ...envFlags };
}

/**
 * 检查Timeline v2.0是否对指定session启用
 */
export function isTimelineV2Enabled(sessionId: string): boolean {
  const flags = getFeatureFlags();

  // 如果全局禁用，直接返回false
  if (!flags.TIMELINE_V2_ENABLED) {
    return false;
  }

  // 检查黑名单
  if (flags.TIMELINE_V2_BLACKLIST.includes(sessionId)) {
    return false;
  }

  // 检查白名单（如果白名单不为空，只有在白名单中的session才启用）
  if (flags.TIMELINE_V2_WHITELIST.length > 0) {
    return flags.TIMELINE_V2_WHITELIST.includes(sessionId);
  }

  // 基于百分比和sessionId哈希决定
  if (flags.TIMELINE_V2_PERCENTAGE < 100) {
    const hash = simpleHash(sessionId);
    const percentage = hash % 100;
    return percentage < flags.TIMELINE_V2_PERCENTAGE;
  }

  return true;
}

/**
 * 简单哈希函数，用于一致性分流
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash);
}

/**
 * 记录Feature Flag使用情况
 */
export function logFeatureFlagUsage(sessionId: string, enabled: boolean, reason: string): void {
  console.log('[FeatureFlag] Timeline v2.0', {
    sessionId,
    enabled,
    reason,
    timestamp: new Date().toISOString()
  });
}

/**
 * 获取Feature Flag状态摘要
 */
export function getFeatureFlagSummary(): {
  enabled: boolean;
  percentage: number;
  whitelistCount: number;
  blacklistCount: number;
} {
  const flags = getFeatureFlags();
  return {
    enabled: flags.TIMELINE_V2_ENABLED,
    percentage: flags.TIMELINE_V2_PERCENTAGE,
    whitelistCount: flags.TIMELINE_V2_WHITELIST.length,
    blacklistCount: flags.TIMELINE_V2_BLACKLIST.length,
  };
}
