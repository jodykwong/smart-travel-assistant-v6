# 智游助手 v6.5 - Playwright 端到端测试基线

仅使用 Playwright 作为唯一测试工具（禁用 vitest）。本清单覆盖东三省三城（哈尔滨/长春/沈阳）的五大核心业务场景与故障转移验证。

## 1. 测试文件结构与命名

```
tests/e2e/
  ├─ cities/
  │   ├─ harbin/
  │   │   ├─ budget.spec.ts
  │   │   ├─ style.spec.ts
  │   │   ├─ lodging.spec.ts
  │   │   ├─ routing.spec.ts
  │   │   └─ local-experience.spec.ts
  │   ├─ changchun/
  │   │   ├─ budget.spec.ts
  │   │   ├─ style.spec.ts
  │   │   ├─ lodging.spec.ts
  │   │   ├─ routing.spec.ts
  │   │   └─ local-experience.spec.ts
  │   └─ shenyang/
  │       ├─ budget.spec.ts
  │       ├─ style.spec.ts
  │       ├─ lodging.spec.ts
  │       ├─ routing.spec.ts
  │       └─ local-experience.spec.ts
  ├─ failover/
  │   ├─ llm-failover.spec.ts
  │   └─ map-failover.spec.ts
  └─ helpers/
      └─ planning-helpers.ts
```

命名规范：`{city}/{scenario}.spec.ts`；城市英文目录名：`harbin/changchun/shenyang`。

## 2. 公共前置与工具
- 使用 tests/e2e/playwright.config.ts（项目现有）
- helpers/planning-helpers.ts：封装创建会话、启动规划、等待结果的 UI/API 操作
- BASE_URL: http://localhost:3001
- 统一超时：UI操作 120s；规划完成等待 180s（可按环境调优）

## 3. 五大核心场景（每城各一套）

### 3.1 预算规划模块（budget.spec.ts）
断言点：
- 创建“目的地=城市，预算=medium”的会话，启动规划
- 结果页存在预算模块（Total/Breakdown 字段），数值类型正确
- 住宿价格区间存在（P50/P75 或均值/区间），字段为 number
- 交通费用估算存在（机场/火车站→中心点），字段为 number
- 页面渲染时长：首次展现核心结果 < 120s

### 3.2 风格偏好匹配（style.spec.ts）
断言点：
- 偏好包含 culture/nature/food/shopping 中至少两项
- 结果存在对应类别 POI 推荐列表，列表长度>0
- 每个 POI 包含 name、category、rating（可选）、address（可选）

### 3.3 住宿推荐引擎（lodging.spec.ts）
断言点：
- 输入住宿偏好=hotel，启动规划
- 结果存在酒店推荐列表，字段包含 name、price（number）、rating（number，可选）、facilities（string[]，可选）
- 距离目的地中心（或用户选定点）排序合理（若提供距离字段）

### 3.4 交通路线优化（routing.spec.ts）
断言点：
- 规划中至少存在 1 段跨点路线
- 给出多方式比较（transit/driving/walking 至少两种）
- 每种方式包含 duration 分钟数（number）与换乘/步行距离等辅助信息（可选）

### 3.5 本地体验发现（local-experience.spec.ts）
断言点：
- 至少给出 1 类本地体验（餐厅/景点/活动）
- 包含 name、category、score（可选）、openHours（可选）

## 4. 故障转移测试

### 4.1 LLM 故障转移（llm-failover.spec.ts）
流程：
1. 暂时置错 DEEPSEEK_API_KEY（或在启动前通过 UI/配置开关注入故障）
2. 发起哈尔滨的预算场景
3. 断言：
   - 业务结果仍可得（允许为降级数据）
   - 读取只读端点 /api/health/failover（若启用），断言 llm.activeProvider=siliconflow
   - UI 中可选展示“使用备用服务商”提示（如实现）
4. 恢复 key 后再次执行，断言 activeProvider=deepseek

### 4.2 地图 故障转移（map-failover.spec.ts）
流程：
1. MCP_AMAP_ENABLED=true, MCP_TENCENT_ENABLED=true
2. 模拟 AMap MCP 不可用
3. 发起长春风格或沈阳交通场景
4. 断言：/api/health/failover 的 map.activeProvider=tencent（若启用）；页面结果仍可用
5. 恢复 AMap 后再次执行，断言回切到 amap

## 5. 断言策略
- UI 元素检查：等待可视化模块出现（预算/住宿/路线/推荐）
- 数据完整性：对关键字段做类型验证（number/string/array），空列表时允许降级但需有用户提示
- 响应时间：从开始规划到核心结果渲染 < 180s（可按环境调整）
- 失败时截图与网络日志收集：使用 Playwright trace/screenshot

## 6. 注意事项
- 地图数据必须通过 LLM function calling 调用 MCP 工具；禁止直连地图 API
- 测试城市固定为：哈尔滨、长春、沈阳
- E2E 用例只使用 Playwright，不引入 Vitest

