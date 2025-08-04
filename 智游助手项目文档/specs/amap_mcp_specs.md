# 高德地图MCP Server技术规格文档

## 项目概述

高德MCP Server旨在为大模型在出行领域的应用落地高效赋能，提供基于位置服务、地点信息搜索、路径规划、天气查询等12大核心高鲜度数据。通过MCP（Model Context Protocol）协议，为AI应用提供标准化的地图服务调用能力。

## 技术架构

### 支持的传输方式
- **stdio**（默认）：标准输入输出
- **sse**：Server-Sent Events，支持实时数据推送
- **streamable-http**：可流式HTTP传输

### 环境要求
- Python 3.8+
- Node.js环境（部分功能）
- 高德开放平台API密钥

## 核心功能模块

### 1. 地理编码服务

#### 1.1 逆地理编码
- **功能描述**：将一个高德经纬度坐标转换为行政区划地址信息
- **工具名称**：`reverse_geocoding`
- **参数**：
  - `location`（必需）：经纬度坐标，格式："经度,纬度"

#### 1.2 地理编码
- **功能描述**：将详细的结构化地址转换为经纬度坐标。支持对地标性名胜景区、建筑物名称解析为经纬度坐标
- **工具名称**：`geocoding`
- **参数**：
  - `address`（必需）：结构化地址
  - `city`（可选）：指定查询的城市

#### 1.3 IP定位
- **功能描述**：IP 定位根据用户输入的 IP 地址，定位 IP 的所在位置
- **工具名称**：`ip_location`
- **参数**：
  - `ip`（必需）：IP地址

### 2. 天气查询服务

- **功能描述**：根据城市名称或者标准adcode查询指定城市的天气
- **工具名称**：`weather_query`
- **参数**：
  - `city`（必需）：城市名称或者adcode

### 3. 路径规划服务

#### 3.1 骑行路径规划
- **功能描述**：骑行路径规划用于规划骑行通勤方案，规划时会考虑天桥、单行线、封路等情况。最大支持 500km 的骑行路线规划
- **工具名称**：
  - `cycling_route`：使用坐标
  - `cycling_route_by_address`：使用地址（推荐）
- **参数**：
  - 坐标版：`origin`（起点坐标）、`destination`（终点坐标）
  - 地址版：`origin_address`、`destination_address`、`origin_city`（可选）、`destination_city`（可选）

#### 3.2 步行路径规划
- **功能描述**：步行路径规划 API 可以根据输入起点终点经纬度坐标规划100km 以内的步行通勤方案
- **工具名称**：
  - `walking_route`：使用坐标
  - `walking_route_by_address`：使用地址（推荐）
- **参数**：同骑行路径规划

#### 3.3 驾车路径规划
- **功能描述**：驾车路径规划 API 可以根据用户起终点经纬度坐标规划以小客车、轿车通勤出行的方案
- **工具名称**：
  - `driving_route`：使用坐标
  - `driving_route_by_address`：使用地址（推荐）
- **参数**：同骑行路径规划

#### 3.4 公共交通路径规划
- **功能描述**：根据用户起终点经纬度坐标规划综合各类公共（火车、公交、地铁）交通方式的通勤方案
- **工具名称**：
  - `transit_route`：使用坐标
  - `transit_route_by_address`：使用地址（推荐）
- **参数**：
  - 坐标版：`origin`、`destination`、`city`（起点城市）、`cityd`（终点城市）
  - 地址版：`origin_address`、`destination_address`、`origin_city`（必需）、`destination_city`（必需）

### 4. 距离测量服务

- **功能描述**：测量两个经纬度坐标之间的距离,支持驾车、步行以及球面距离测量
- **工具名称**：`distance_measurement`
- **参数**：
  - `origins`（必需）：起点经纬度坐标
  - `destination`（必需）：终点经纬度坐标
  - `type`（可选，默认为"1"）：测量类型

### 5. POI搜索服务

#### 5.1 关键词搜索
- **功能描述**：关键词搜索 API 根据用户输入的关键字进行 POI 搜索，并返回相关的信息
- **工具名称**：`poi_search`
- **参数**：
  - `keywords`（必需）：搜索关键词
  - `city`（可选）：查询城市
  - `citylimit`（可选，默认为"false"）：是否限制城市范围内搜索

#### 5.2 周边搜索
- **功能描述**：周边搜，根据用户传入关键词以及坐标location，搜索出radius半径范围的POI
- **工具名称**：`nearby_search`
- **参数**：
  - `location`（必需）：中心点经纬度坐标
  - `radius`（可选，默认为"1000"）：搜索半径
  - `keywords`（可选）：搜索关键词

#### 5.3 POI详情查询
- **功能描述**：查询关键词搜或者周边搜获取到的POI ID的详细信息
- **工具名称**：`poi_detail`
- **参数**：
  - `id`（必需）：POI ID

## 部署配置

### 1. 环境变量配置

```bash
export AMAP_MAPS_API_KEY="your_valid_amap_maps_api_key"
```

### 2. 安装方式

#### 方式一：使用PyPI（推荐）
```bash
pip install amap-mcp-server
```

#### 方式二：使用uvx
```bash
uvx amap-mcp-server
```

### 3. MCP客户端配置

#### 3.1 stdio模式（默认）
```json
{
  "mcpServers": {
    "amap-mcp-server": {
      "command": "uvx",
      "args": ["amap-mcp-server"],
      "env": {
        "AMAP_MAPS_API_KEY": "your_valid_amap_maps_api_key"
      }
    }
  }
}
```

#### 3.2 SSE模式
启动服务器：
```bash
uvx amap-mcp-server sse
```

客户端配置：
```json
{
  "mcpServers": {
    "amap-mcp-server": {
      "url": "http://0.0.0.0:8000/sse"
    }
  }
}
```

#### 3.3 Streamable HTTP模式
启动服务器：
```bash
uvx amap-mcp-server streamable-http
```

客户端配置：
```json
{
  "mcpServers": {
    "amap-mcp-server": {
      "url": "http://localhost:8000/mcp"
    }
  }
}
```

## 高级应用场景

### 1. 智能旅游路线规划
- 最多支持16个途经点的旅游路线规划，自动计算最优顺序，并提供可视化地图链接
- 支持多种交通方式组合规划
- 实时考虑天气因素

### 2. 景点详情与周边服务
- 查询景点的详细信息，包括评分、开放时间、门票价格等
- 根据景点位置查询周边的餐厅、酒店、停车场等设施

### 3. 基于位置的智能推荐
- 结合天气信息的景点推荐
- 特色餐厅与住宿推荐
- 交通方式智能选择

## API限制与注意事项

1. **API密钥管理**：
   - 需要在高德开放平台注册获取API密钥
   - API密钥有调用次数限制
   - 超出限制可能需要付费

2. **数据准确性**：
   - 路径规划考虑实时路况
   - 天气数据保持高频更新
   - POI信息定期同步

3. **使用限制**：
   - 遵守高德地图服务条款
   - 合理使用API避免超限
   - 妥善保管API密钥安全

## 相关资源

- **官方文档**：https://lbs.amap.com/api/mcp-server/summary
- **GitHub仓库**：https://github.com/sugarforever/amap-mcp-server
- **PyPI包**：https://pypi.org/project/amap-mcp-server/
- **高德开放平台**：https://lbs.amap.com/

## 技术支持

如遇到技术问题，可通过以下方式获取支持：
- GitHub Issues：提交bug报告和功能请求
- 高德开放平台客服：API相关问题
- 社区论坛：经验分享与讨论