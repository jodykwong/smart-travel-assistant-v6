# Timeline解析架构v2.0技术文档

## 🎯 架构概述

Timeline解析架构v2.0是智游助手v6.5的核心组件，采用可插拔的解析器系统，实现了对多种LLM输出格式的智能解析和标准化处理。

## 🏗️ 系统架构

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                    Timeline解析架构v2.0                      │
├─────────────────────────────────────────────────────────────┤
│  LLM输出 → Orchestrator → 解析器选择 → 数据规范化 → 前端渲染  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   LLM原始输出     │    │   核心调度器      │    │   标准化数据      │
│                 │    │                 │    │                 │
│ • JSON格式      │───▶│ • 解析器注册     │───▶│ • DayPlan[]     │
│ • Markdown格式  │    │ • 优先级管理     │    │ • LegacyFormat  │
│ • 数字列表格式   │    │ • 错误处理      │    │ • 前端兼容      │
│ • 自由文本格式   │    │ • 性能监控      │    │                 │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                │
                                ▼
                    ┌──────────────────────────┐
                    │      解析器插件系统       │
                    ├──────────────────────────┤
                    │ JsonParser (优先级100)   │
                    │ MarkdownParser (优先级80) │
                    │ NumberedParser (优先级70) │
                    │ HeuristicParser (优先级10)│
                    └──────────────────────────┘
```

### 数据流向

1. **LLM输出** → 原始文本数据
2. **Orchestrator** → 调度器分析内容格式
3. **解析器选择** → 根据优先级选择最适合的解析器
4. **数据解析** → 将原始文本转换为结构化数据
5. **数据规范化** → 统一数据格式和验证
6. **前端渲染** → 标准化数据传递给前端组件

## 🔧 核心组件详解

### 1. TimelineOrchestrator (核心调度器)

```typescript
class TimelineOrchestrator {
  // 解析Timeline内容的主入口
  async parseTimeline(raw: string, context: ParseContext): Promise<ParseResult>
  
  // 转换为兼容格式
  async parseTimelineToLegacyFormat(raw: string, context: ParseContext): Promise<LegacyDayActivity[]>
}
```

**职责**：
- 管理解析器插件的注册和调度
- 根据内容特征选择最适合的解析器
- 处理解析失败的降级逻辑
- 收集性能指标和错误日志

### 2. 解析器插件系统

#### JsonParser (优先级: 100)
- **适用场景**: LLM输出包含JSON结构
- **检测条件**: 包含`{}`、`"days"`、`"day"`或````json`
- **解析策略**: 提取JSON并验证Schema

#### MarkdownPeriodParser (优先级: 80)
- **适用场景**: Markdown格式的时间段输出
- **检测条件**: 包含时间段标记和Markdown结构
- **解析策略**: 解析Markdown标题和时间段

#### NumberedListParser (优先级: 70)
- **适用场景**: 数字列表格式的输出
- **检测条件**: 包含数字列表标记
- **解析策略**: 解析数字列表结构

#### HeuristicTimeParser (优先级: 10)
- **适用场景**: 兜底解析器，处理任意格式
- **检测条件**: 内容长度>50字符
- **解析策略**: 启发式规则解析

### 3. 数据规范化层 (Normalizer)

```typescript
// 规范化函数
export function normalizeLLMOutput(data: any, context: ParseContext): DayPlan[]
export function convertToLegacyFormat(dayPlans: DayPlan[]): LegacyDayActivity[]
```

**职责**：
- 将不同解析器的输出统一为DayPlan格式
- 数据验证和清洗
- 生成前端兼容的LegacyFormat数据
- 添加默认值和计算字段

### 4. Schema验证器

```typescript
// Zod Schema定义
export const DayPlanSchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1),
  date: z.string(),
  segments: z.array(SegmentSchema).min(1)
});
```

**职责**：
- 验证解析结果的数据结构
- 提供详细的错误信息
- 确保数据类型安全

## 🚀 Feature Flag系统

### 配置选项

```typescript
interface FeatureFlags {
  TIMELINE_V2_ENABLED: boolean;        // 全局开关
  TIMELINE_V2_PERCENTAGE: number;      // 流量百分比 (0-100)
  TIMELINE_V2_WHITELIST: string[];     // 白名单sessionId
  TIMELINE_V2_BLACKLIST: string[];     // 黑名单sessionId
}
```

### 使用方式

```typescript
// 检查是否启用Timeline v2.0
const enabled = isTimelineV2Enabled(sessionId);

// 环境变量配置
TIMELINE_V2_ENABLED=true
TIMELINE_V2_PERCENTAGE=100
TIMELINE_V2_WHITELIST=session_123,session_456
```

## 📊 性能指标

### 关键指标
- **解析时间**: <500ms (目标)
- **解析成功率**: >99% (目标)
- **前端渲染时间**: <200ms (目标)
- **内存使用**: <50MB (单次解析)

### 监控实现

```typescript
// 性能监控埋点
console.log('[MONITOR] Timeline解析', {
  sessionId,
  parseSuccess: result.success,
  parseTime: Date.now() - startTime,
  parser: result.parser,
  daysCount: result.data?.length || 0
});
```

## 🔧 使用指南

### 基本用法

```typescript
import { parseTimelineToLegacy, createParseContext } from '@/lib/timeline';

// 创建解析上下文
const context = createParseContext(
  destination,    // 目的地
  totalDays,     // 总天数
  sessionId,     // 会话ID
  startDate      // 开始日期
);

// 解析Timeline
const legacyFormat = await parseTimelineToLegacy(llmResponse, context);
```

### 前端集成

```typescript
// API响应包含legacyFormat
const response = await fetch(`/api/v1/planning/sessions/${sessionId}`);
const { data } = await response.json();

// 前端组件使用legacyFormat
<DailyItinerarySection
  legacyFormat={data.legacyFormat}
  startDate={data.startDate}
  totalDays={data.totalDays}
/>
```

## 🛠️ 扩展开发

### 添加新解析器

```typescript
class CustomParser extends BaseParser {
  name = 'CustomParser';
  priority = 60; // 设置优先级
  
  canHandle(raw: string): boolean {
    // 检测逻辑
    return raw.includes('custom-format');
  }
  
  async tryParse(raw: string, context: ParseContext): Promise<DayPlan[] | null> {
    // 解析逻辑
    return parsedData;
  }
}

// 注册解析器
parserRegistry.register(new CustomParser());
```

### 自定义规范化

```typescript
export function normalizeCustomOutput(data: any, context: ParseContext): DayPlan[] {
  // 自定义规范化逻辑
  return normalizedData;
}
```

## 🔍 故障排查

### 常见问题

1. **解析失败**: 检查LLM输出格式，查看解析器日志
2. **数据不完整**: 验证规范化过程，检查Schema验证
3. **性能问题**: 查看解析时间监控，优化解析逻辑

### 调试工具

```typescript
// 启用详细日志
process.env.TIMELINE_DEBUG = 'true';

// 查看解析器选择过程
const capableParsers = parserRegistry.getCapable(raw);
console.log('可用解析器:', capableParsers.map(p => p.name));
```

## 📈 版本历史

### v2.0.0 (2025-01-09)
- ✨ 初始版本发布
- 🔧 可插拔解析器系统
- ⚡ Feature Flag支持
- 📊 完整监控和日志

### 未来规划
- v2.1.0: 增加更多解析器插件
- v2.2.0: 支持自定义解析规则
- v2.3.0: 机器学习辅助解析优化
