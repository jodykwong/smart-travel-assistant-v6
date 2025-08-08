#!/usr/bin/env node

/**
 * 简单的监控端点测试
 * 不依赖外部包，直接生成Prometheus格式的指标
 */

const http = require('http');

// 简单的指标存储
const metrics = {
  httpRequestsTotal: new Map(),
  paymentSuccessRate: 0.99,
  paymentResponseTime: [],
  systemInfo: {
    startTime: Date.now(),
    requestCount: 0
  }
};

// 增加HTTP请求计数
function incrementHttpRequests(method, route, statusCode, service = 'smart-travel-v6.2') {
  const key = `${method}|${route}|${statusCode}|${service}`;
  const current = metrics.httpRequestsTotal.get(key) || 0;
  metrics.httpRequestsTotal.set(key, current + 1);
  metrics.systemInfo.requestCount++;
}

// 记录支付响应时间
function recordPaymentTime(stage, provider, duration) {
  metrics.paymentResponseTime.push({
    stage,
    provider,
    duration,
    timestamp: Date.now()
  });
  
  // 只保留最近100条记录
  if (metrics.paymentResponseTime.length > 100) {
    metrics.paymentResponseTime = metrics.paymentResponseTime.slice(-100);
  }
}

// 生成Prometheus格式的指标
function generatePrometheusMetrics() {
  const lines = [];
  const now = Date.now();
  
  // HTTP请求总数
  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  
  for (const [key, value] of metrics.httpRequestsTotal.entries()) {
    const [method, route, statusCode, service] = key.split('|');
    lines.push(`http_requests_total{method="${method}",route="${route}",status_code="${statusCode}",service="${service}"} ${value}`);
  }
  
  // 支付成功率
  lines.push('');
  lines.push('# HELP smart_travel_payment_success_rate Payment success rate (0-1)');
  lines.push('# TYPE smart_travel_payment_success_rate gauge');
  lines.push(`smart_travel_payment_success_rate ${metrics.paymentSuccessRate}`);
  
  // 支付响应时间直方图（简化版）
  lines.push('');
  lines.push('# HELP smart_travel_payment_response_time_seconds Payment processing response time');
  lines.push('# TYPE smart_travel_payment_response_time_seconds histogram');
  
  // 计算直方图桶
  const buckets = [0.1, 0.5, 1, 2, 5, 10, 30, Infinity];
  const histogramData = new Map();
  
  metrics.paymentResponseTime.forEach(record => {
    const key = `${record.stage}|${record.provider}`;
    if (!histogramData.has(key)) {
      histogramData.set(key, { count: 0, sum: 0, buckets: new Map() });
    }
    
    const data = histogramData.get(key);
    data.count++;
    data.sum += record.duration;
    
    buckets.forEach(bucket => {
      const bucketKey = bucket === Infinity ? '+Inf' : bucket.toString();
      if (record.duration <= bucket) {
        data.buckets.set(bucketKey, (data.buckets.get(bucketKey) || 0) + 1);
      }
    });
  });
  
  for (const [key, data] of histogramData.entries()) {
    const [stage, provider] = key.split('|');
    
    // 输出桶
    for (const [bucket, count] of data.buckets.entries()) {
      lines.push(`smart_travel_payment_response_time_seconds_bucket{stage="${stage}",provider="${provider}",le="${bucket}"} ${count}`);
    }
    
    // 输出总数和总和
    lines.push(`smart_travel_payment_response_time_seconds_count{stage="${stage}",provider="${provider}"} ${data.count}`);
    lines.push(`smart_travel_payment_response_time_seconds_sum{stage="${stage}",provider="${provider}"} ${data.sum}`);
  }
  
  // 系统指标
  lines.push('');
  lines.push('# HELP smart_travel_uptime_seconds Application uptime in seconds');
  lines.push('# TYPE smart_travel_uptime_seconds counter');
  lines.push(`smart_travel_uptime_seconds ${Math.floor((now - metrics.systemInfo.startTime) / 1000)}`);
  
  lines.push('');
  lines.push('# HELP smart_travel_requests_total Total requests processed');
  lines.push('# TYPE smart_travel_requests_total counter');
  lines.push(`smart_travel_requests_total ${metrics.systemInfo.requestCount}`);
  
  // 内存使用情况
  const memUsage = process.memoryUsage();
  lines.push('');
  lines.push('# HELP smart_travel_memory_usage_bytes Memory usage in bytes');
  lines.push('# TYPE smart_travel_memory_usage_bytes gauge');
  lines.push(`smart_travel_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}`);
  lines.push(`smart_travel_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}`);
  lines.push(`smart_travel_memory_usage_bytes{type="rss"} ${memUsage.rss}`);
  
  return lines.join('\n') + '\n';
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  const startTime = Date.now();
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  if (req.url === '/metrics' && req.method === 'GET') {
    try {
      // 更新支付成功率（模拟波动）
      metrics.paymentSuccessRate = 0.99 + (Math.random() - 0.5) * 0.02;
      
      const metricsText = generatePrometheusMetrics();
      
      res.writeHead(200, {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.end(metricsText);
      
      // 记录这次请求
      const duration = (Date.now() - startTime) / 1000;
      incrementHttpRequests('GET', '/metrics', '200');
      console.log(`✅ Metrics served successfully (${duration}s)`);
      
    } catch (error) {
      console.error('❌ Error serving metrics:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error collecting metrics');
      incrementHttpRequests('GET', '/metrics', '500');
    }
    
  } else if (req.url === '/health' && req.method === 'GET') {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'smart-travel-v6.2-test',
      version: '6.2.0',
      uptime: Math.floor((Date.now() - metrics.systemInfo.startTime) / 1000),
      requestCount: metrics.systemInfo.requestCount
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
    
    incrementHttpRequests('GET', '/health', '200');
    console.log('✅ Health check served');
    
  } else if (req.url === '/api/payment/test' && req.method === 'POST') {
    // 模拟支付API调用
    const processingTime = Math.random() * 2 + 0.5; // 0.5-2.5秒
    
    setTimeout(() => {
      const success = Math.random() > 0.05; // 95%成功率
      const provider = Math.random() > 0.5 ? 'wechat' : 'alipay';
      
      // 记录支付指标
      recordPaymentTime('payment_processing', provider, processingTime);
      
      const response = {
        success,
        provider,
        duration: processingTime,
        timestamp: new Date().toISOString()
      };
      
      res.writeHead(success ? 200 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response, null, 2));
      
      incrementHttpRequests('POST', '/api/payment/test', success ? '200' : '500');
      console.log(`✅ Payment test - Provider: ${provider}, Success: ${success}, Duration: ${processingTime.toFixed(2)}s`);
      
    }, processingTime * 1000);
    
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    incrementHttpRequests(req.method, req.url, '404');
  }
});

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('🚀 智游助手v6.2 监控测试服务器启动');
  console.log(`📊 监控端点: http://localhost:${PORT}/metrics`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
  console.log(`💳 支付测试: POST http://localhost:${PORT}/api/payment/test`);
  console.log('');
  console.log('📝 测试命令:');
  console.log(`curl http://localhost:${PORT}/metrics`);
  console.log(`curl http://localhost:${PORT}/health`);
  console.log(`curl -X POST http://localhost:${PORT}/api/payment/test`);
  console.log('');
  console.log('⏹️  按 Ctrl+C 停止服务器');
  
  // 初始化一些测试数据
  incrementHttpRequests('GET', '/api/health', '200');
  incrementHttpRequests('POST', '/api/user/register', '201');
  incrementHttpRequests('POST', '/api/payment/create-order', '200');
  recordPaymentTime('order_creation', 'wechat', 0.5);
  recordPaymentTime('payment_processing', 'alipay', 1.2);
  recordPaymentTime('isolated_verification', 'wechat', 2.1);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

// 定期生成一些测试数据
setInterval(() => {
  // 模拟随机API调用
  const routes = ['/api/health', '/api/travel-data', '/api/user/profile', '/api/payment/status'];
  const methods = ['GET', 'POST'];
  const statusCodes = ['200', '201', '400', '404', '500'];
  
  const route = routes[Math.floor(Math.random() * routes.length)];
  const method = methods[Math.floor(Math.random() * methods.length)];
  const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
  
  incrementHttpRequests(method, route, statusCode);
  
  // 模拟支付操作
  if (Math.random() < 0.3) { // 30%概率生成支付指标
    const stages = ['order_creation', 'payment_processing', 'isolated_verification'];
    const providers = ['wechat', 'alipay'];
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const duration = Math.random() * 3 + 0.1; // 0.1-3.1秒
    
    recordPaymentTime(stage, provider, duration);
  }
  
  // 更新支付成功率
  metrics.paymentSuccessRate = 0.99 + (Math.random() - 0.5) * 0.02;
  
}, 3000); // 每3秒生成一些测试数据
