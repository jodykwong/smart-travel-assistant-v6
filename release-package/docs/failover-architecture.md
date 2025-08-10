# 智游助手 v6.5 - 双链路冗余架构说明

## 概述
v6.5 引入 AI 服务与地图服务的双链路冗余：
- LLM：DeepSeek（主）+ SiliconFlow（备）
- 地图：高德MCP（主）+ 腾讯MCP（备）
- 统一故障转移：超时/重试、熔断器、健康检查、自动回切；策略默认为 health_based

## 架构图（文字版）
- 业务模块（预算/风格/住宿/交通/本地体验）
  -> MapFailoverService（仅通过 LLM tools 调用 MCP 工具）
  -> LLMFailoverService（选择 DeepSeek or SiliconFlow）
  -> LLM 侧连接 MCP（SSE）执行工具

- 其他使用 LLM 的模块（含 deepseek-cache-service）
  -> LLMFailoverService（主备切换）

## 设计原则
- 高内聚低耦合：Failover 封装在 /src/services/failover 内；调用方接口保持不变
- 为失败而设计：超时+重试+熔断+健康检查+自动回切
- API 优先：仅通过 LLM function calling 使用 MCP 工具，禁止直连地图 API
- 东三省测试约束：健康检查与示例均选用哈尔滨/长春/沈阳

## 关键组件
- 配置（/src/lib/config/failover-config.ts）
  - LLM_PROVIDERS, LLM_PRIMARY_PROVIDER, LLM_FALLBACK_PROVIDER
  - MAP_PROVIDERS, MAP_PRIMARY_PROVIDER, MAP_FALLBACK_PROVIDER
  - FAILOVER_*（超时/重试/熔断/策略/健康检查）
  - MCP_*（SSE/timeout/重试，AMAP/TENCENT 开关与端点，仅用于识别，不直连）

- 熔断器（/src/services/failover/circuit-breaker.ts）
- 健康检查器（/src/services/failover/health-checker.ts）
- LLM 冗余（/src/services/failover/llm-failover-service.ts）
- 地图冗余（/src/services/failover/map-failover-service.ts）

## 环境变量一览（v6.5）

### AI 服务（必需）
- DEEPSEEK_API_KEY
- DEEPSEEK_API_URL（默认 https://api.deepseek.com/v1）
- DEEPSEEK_MODEL_NAME（默认 deepseek-chat）
- SILICONFLOW_API_KEY
- SILICONFLOW_BASE_URL（默认 https://api.siliconflow.cn/v1）
- SILICONFLOW_DEEPSEEK_MODEL（默认 deepseek-ai/DeepSeek-V3）
- LLM_PROVIDERS=deepseek,siliconflow
- LLM_PRIMARY_PROVIDER=deepseek
- LLM_FALLBACK_PROVIDER=siliconflow

### 地图 MCP（通过 LLM 工具访问）
- AMAP_MCP_SERVER_URL（例如 https://mcp.amap.com/sse）
- AMAP_MCP_API_KEY
- MCP_AMAP_ENABLED=true
- TENCENT_MCP_BASE_URL（例如 https://apis.map.qq.com/mcp）
- TENCENT_MCP_API_KEY
- MCP_TENCENT_ENABLED=true
- MCP_TRANSPORT_TYPE=sse
- MCP_TIMEOUT=30000
- MCP_RETRY_ATTEMPTS=3

### 故障转移与健康检查
- FAILOVER_ENABLED=true
- FAILOVER_TIMEOUT=5000
- FAILOVER_RETRY_ATTEMPTS=3
- FAILOVER_CIRCUIT_BREAKER_THRESHOLD=5
- LOAD_BALANCER_STRATEGY=health_based
- HEALTH_CHECK_ENABLED=true
- HEALTH_CHECK_INTERVAL=30000
- HEALTH_CHECK_TIMEOUT=5000

## 集成方式
- deepseek-cache-service 内部改用 LLMFailoverService，外部接口不变
- simplified-amap-service 内部改用 MapFailoverService.query，通过 LLM tools 调用 MCP 工具
- 规划启动 API 改用 LLMFailoverService（上层契约不变）

## 故障转移流程
1) 首选 primary 提供商；若不健康或超时/失败，按 retry 次数重试
2) 失败后切换到 fallback；成功则记录成功并保持可用
3) 连续失败达阈值触发熔断；半开后试探恢复；健康后自动回切

## 运维与测试
- 故障转移演练：
  - 临时置错 DEEPSEEK_API_KEY，观察切换至 siliconflow
  - 关闭/禁用 AMap MCP，观察切到 tencent（东三省城市：哈尔滨/长春/沈阳）
- 监控：
  - 日志关注 provider、attempt、error 摘要
  - 建议新增 /api/health/failover（只读）导出当前健康与熔断状态
- 常见问题：
  - 工具名不匹配：统一通过 MapFailoverService 的工具注册映射
  - 直连地图 API：禁止；一切通过 LLM tools 实现
  - 东三省数据异常：优先使用地理编码与 POI 基线词进行验证

## 版本
- 文档版本：v6.5
- 最后更新：2025-08-09

