/**
 * 智游助手v6.5版本信息
 * 自动生成，请勿手动修改
 */

export const VERSION_INFO = {
  "version": "6.5.0",
  "buildTime": "2025-08-10T00:54:13.214Z",
  "buildHash": "3ihnesu6",
  "features": [
    "Timeline解析架构v2.0",
    "LLM+Map双链路容错",
    "Feature Flag支持",
    "高性能缓存策略",
    "完整监控告警"
  ],
  "architecture": {
    "frontend": "Next.js 14 + TypeScript",
    "backend": "Node.js + API Routes",
    "database": "SQLite + Redis",
    "ai": "DeepSeek + SiliconFlow",
    "maps": "AMap + Tencent Maps"
  }
} as const;

export function getVersion(): string {
  return VERSION_INFO.version;
}

export function getBuildInfo(): string {
  return `v${VERSION_INFO.version} (build ${VERSION_INFO.buildHash})`;
}

export function getFullVersionInfo(): typeof VERSION_INFO {
  return VERSION_INFO;
}

export function isTimelineV2Supported(): boolean {
  return true; // v6.5+支持Timeline解析架构v2.0
}

export function getTimelineParserVersion(): string {
  return '2.0.0';
}
