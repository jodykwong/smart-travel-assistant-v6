# Timeline解析问题排查SOP (Standard Operating Procedure)

## 🎯 SOP概述

本SOP遵循"为失败而设计"原则，提供系统化的Timeline解析问题诊断和解决流程。

## 📊 问题分类矩阵

| 问题类型 | 症状 | 优先级 | 预期解决时间 |
|---------|------|--------|-------------|
| **数据展示异常** | 活动显示为原始文本、格式错乱 | P0 | 2小时 |
| **解析失败** | Timeline完全无法显示 | P0 | 1小时 |
| **性能问题** | 生成时间>30秒 | P1 | 4小时 |
| **部分数据丢失** | 活动数量不完整 | P1 | 2小时 |

## 🔍 标准化诊断流程

### 第一阶段：快速状态检查 (5分钟)

#### 1.1 Feature Flag状态验证
```bash
# 检查Timeline v2.0是否启用
curl -X GET "/api/v1/planning/sessions/{sessionId}" | jq '.data.timelineVersion'

# 预期结果：
# - "2.0.0" = 使用新架构
# - null/undefined = 使用旧架构
```

#### 1.2 API响应结构验证
```bash
# 检查API返回的关键字段
curl -X GET "/api/v1/planning/sessions/{sessionId}" | jq '{
  parseSuccess: .data.parseSuccess,
  legacyFormat: (.data.legacyFormat | length),
  timelineVersion: .data.timelineVersion
}'

# 预期结果：
# {
#   "parseSuccess": true,
#   "legacyFormat": 4,  // 天数
#   "timelineVersion": "2.0.0"
# }
```

#### 1.3 前端控制台检查
```javascript
// 在浏览器控制台执行
console.log('Timeline数据检查:', {
  sessionData: window.__NEXT_DATA__?.props?.pageProps?.sessionData,
  legacyFormat: window.__NEXT_DATA__?.props?.pageProps?.sessionData?.legacyFormat
});
```

### 第二阶段：深度数据流向分析 (10分钟)

#### 2.1 LLM输出质量检查
```bash
# 获取原始LLM响应
curl -X GET "/api/v1/planning/sessions/{sessionId}" | jq -r '.data.result.llmResponse' > llm_output.txt

# 检查关键指标
echo "LLM输出分析:"
echo "总长度: $(wc -c < llm_output.txt)"
echo "包含JSON: $(grep -c '{' llm_output.txt)"
echo "包含Day标记: $(grep -c -i 'day\|第.*天' llm_output.txt)"
echo "包含时间标记: $(grep -c '\d\{1,2\}:\d\{2\}' llm_output.txt)"
```

#### 2.2 解析器选择验证
```bash
# 检查服务端日志中的解析器选择
grep "TimelineOrchestrator.*找到可用解析器" /var/log/app.log | tail -5
grep "TimelineOrchestrator.*解析成功" /var/log/app.log | tail -5

# 预期看到类似：
# [TimelineOrchestrator] 找到可用解析器 {"parsers":["JsonParser","HeuristicTimeParser"]}
# [TimelineOrchestrator] 解析成功 {"parser":"JsonParser","daysCount":4}
```

#### 2.3 数据规范化验证
```javascript
// 在Node.js环境中验证规范化过程
const { parseTimelineToLegacy, createParseContext } = require('./src/lib/timeline');

async function validateNormalization(sessionId, llmResponse, destination, totalDays) {
  const context = createParseContext(destination, totalDays, sessionId);
  try {
    const result = await parseTimelineToLegacy(llmResponse, context);
    console.log('规范化结果:', {
      daysCount: result.length,
      totalActivities: result.reduce((sum, day) => sum + day.timeline.length, 0),
      sampleDay: result[0]
    });
    return result;
  } catch (error) {
    console.error('规范化失败:', error.message);
    return null;
  }
}
```

### 第三阶段：前端渲染链路检查 (10分钟)

#### 3.1 组件数据接收验证
```javascript
// 在DailyItinerarySection组件中添加调试代码
console.log('DailyItinerarySection接收数据:', {
  llmResponse: llmResponse?.substring(0, 200) + '...',
  startDate,
  totalDays,
  // 检查是否正确接收legacyFormat
  legacyFormat: props.legacyFormat
});
```

#### 3.2 解析结果对比
```javascript
// 对比客户端解析vs服务端解析结果
const clientParsed = parseDailyItineraries(llmResponse, startDate, totalDays);
const serverParsed = props.legacyFormat; // 来自API

console.log('解析结果对比:', {
  client: {
    daysCount: clientParsed.length,
    totalActivities: clientParsed.reduce((sum, day) => sum + day.activities.length, 0)
  },
  server: {
    daysCount: serverParsed?.length || 0,
    totalActivities: serverParsed?.reduce((sum, day) => sum + day.timeline.length, 0) || 0
  }
});
```

## 🔧 常见问题解决方案

### 问题1：活动显示为原始文本片段
**症状**：显示"「开海红岛海鲜虾水饺」（万象城店）"等原始文本
**根本原因**：前端使用客户端解析，无法处理复杂LLM输出
**解决方案**：
1. 确认API返回`legacyFormat`数据
2. 修改前端组件使用`legacyFormat`而非`llmResponse`
3. 移除客户端解析逻辑

### 问题2：Timeline完全无法显示
**症状**：页面空白或显示"无数据"
**诊断步骤**：
1. 检查Feature Flag是否正确启用
2. 验证API响应结构完整性
3. 检查前端组件是否正确接收数据

### 问题3：部分活动数据丢失
**症状**：活动数量少于预期
**诊断步骤**：
1. 对比LLM原始输出与解析结果
2. 检查解析器选择是否合适
3. 验证数据规范化过程

## 📈 监控指标

### 关键性能指标 (KPI)
- **解析成功率**：>99%
- **解析时间**：<500ms
- **前端渲染时间**：<200ms
- **数据完整性**：活动数量匹配率>95%

### 监控实现
```javascript
// 在API中添加监控埋点
console.log('[MONITOR] Timeline解析', {
  sessionId,
  parseSuccess: parsed.parseSuccess,
  parseTime: Date.now() - startTime,
  daysCount: parsed.legacyFormat?.length || 0,
  totalActivities: parsed.legacyFormat?.reduce((sum, day) => sum + day.timeline.length, 0) || 0
});
```

## 🚨 升级路径

### 立即修复 (0-2小时)
1. 修改`DailyItinerarySection`组件使用`legacyFormat`
2. 添加前端数据接收验证
3. 部署并验证修复效果

### 中期优化 (1-2天)
1. 完善监控和告警机制
2. 优化解析器性能
3. 建立自动化测试

### 长期改进 (1-2周)
1. 实现解析结果缓存
2. 添加A/B测试框架
3. 建立完整的性能基准
