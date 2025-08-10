# 智游助手 v6.5 - 运维指南（故障转移与健康检查）

## 1. 目标
- 确保 LLM 与 地图MCP 双链路冗余在生产环境稳定运行
- 提供标准化的故障转移演练步骤与回滚方案
- 统一健康检查与监控视图

## 2. 核心组件
- LLMFailoverService（DeepSeek 主 + SiliconFlow 备）
- MapFailoverService（AMap 主 + Tencent 备，经由 LLM tools 调用）
- CircuitBreaker / HealthChecker / FailoverConfig（环境变量驱动）

## 3. 环境变量检查清单
- LLM：DEEPSEEK_API_KEY / SILICONFLOW_API_KEY / LLM_PRIMARY_PROVIDER / LLM_FALLBACK_PROVIDER
- MCP：AMAP_MCP_SERVER_URL / TENCENT_MCP_BASE_URL / MCP_* / MCP_AMAP_ENABLED / MCP_TENCENT_ENABLED
- 统一：FAILOVER_* / LOAD_BALANCER_STRATEGY / HEALTH_CHECK_*

## 4. 故障转移演练

### 4.1 DeepSeek 故障 → 切换 SiliconFlow
1. 暂时置错 DEEPSEEK_API_KEY
2. 访问规划流程（目的地：哈尔滨/长春/沈阳）
3. 观察日志出现 provider=siliconflow
4. 恢复 DEEPSEEK_API_KEY，确认回切到 deepseek

### 4.2 AMap 故障 → 切换 Tencent
1. MCP_AMAP_ENABLED=true, MCP_TENCENT_ENABLED=true
2. 模拟 AMap MCP 不可用（例如关闭权限/服务）
3. 触发 POI/地理编码（哈尔滨/长春/沈阳）
4. 观察日志出现 provider=tencent
5. 恢复 AMap，确认回切

## 5. 健康检查监控
- 建议新增只读端点：`GET /api/health/failover`（当前状态：建议项）
- 日志关键字段：provider, attempt, error, circuit_state
- 健康探测：地理编码（哈尔滨市政府/沈阳市政府）作为轻量探测

## 6. 常见问题排查
- 工具调用失败：核对工具名映射（amap-maps/tencent-maps + 下划线变体）
- 直连地图 API：禁止；统一通过 LLM tools 调用
- 超时过多：调大 FAILOVER_TIMEOUT 或降低并发；检查 LLM 提供商与 MCP 服务端健康
- 连续熔断：检查 API key 配置与流量限制；适度提高 FAILOVER_CIRCUIT_BREAKER_THRESHOLD

## 7. 变更与回滚
- 配置变更仅通过环境变量
- 回滚策略：
  - 紧急：将 LLM_PROVIDERS/ MAP_PROVIDERS 暂时缩减为单一可用提供商
  - 稳妥：恢复正确的 key 与服务状态后重启服务

## 8. 版本
- 文档版本：v6.5
- 最后更新：2025-08-09

