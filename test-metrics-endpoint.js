#!/usr/bin/env node

/**
 * 独立的监控端点测试脚本
 * 验证Prometheus指标生成和格式
 */

const http = require('http');
const { register, Counter, Histogram, Gauge, collectDefaultMetrics } = require('prom-client');

// 初始化默认指标收集
collectDefaultMetrics({ register });

// 创建测试指标
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register]
});

const paymentSuccessRate = new Gauge({
  name: 'smart_travel_payment_success_rate',
  help: 'Payment success rate (0-1)',
  registers: [register]
});

const paymentResponseTime = new Histogram({
  name: 'smart_travel_payment_response_time_seconds',
  help: 'Payment processing response time by stage and provider',
  labelNames: ['stage', 'provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register]
});

// 初始化一些测试数据
paymentSuccessRate.set(0.99);
httpRequestsTotal.labels('GET', '/api/health', '200', 'smart-travel-v6.2').inc(10);
httpRequestsTotal.labels('POST', '/api/payment/create-order', '200', 'smart-travel-v6.2').inc(5);
httpRequestsTotal.labels('POST', '/api/payment/create-order', '400', 'smart-travel-v6.2').inc(1);

paymentResponseTime.labels('order_creation', 'wechat').observe(0.5);
paymentResponseTime.labels('order_creation', 'alipay').observe(0.3);
paymentResponseTime.labels('payment_processing', 'wechat').observe(1.2);
paymentResponseTime.labels('payment_processing', 'alipay').observe(0.8);

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  if (req.url === '/metrics' && req.method === 'GET') {
    try {
      // 更新一些动态指标
      const memoryUsage = process.memoryUsage();
      const memoryUtilization = memoryUsage.heapUsed / memoryUsage.heapTotal;
      
      // 模拟一些随机的业务指标
      paymentSuccessRate.set(0.99 + (Math.random() - 0.5) * 0.02);
      
      // 记录这次请求
      httpRequestsTotal.labels('GET', '/metrics', '200', 'smart-travel-v6.2').inc();

      const metrics = await register.metrics();
      
      res.writeHead(200, {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.end(metrics);
      console.log('✅ Metrics served successfully');
      
    } catch (error) {
      console.error('❌ Error serving metrics:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error collecting metrics');
    }
    
  } else if (req.url === '/health' && req.method === 'GET') {
    // 简单的健康检查端点
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'smart-travel-v6.2-test',
      version: '6.2.0',
      uptime: process.uptime()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
    console.log('✅ Health check served');
    
  } else if (req.url === '/api/payment/test' && req.method === 'POST') {
    // 模拟支付API调用来生成指标
    const startTime = Date.now();
    
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));
    
    const duration = (Date.now() - startTime) / 1000;
    const success = Math.random() > 0.05; // 95%成功率
    
    // 记录指标
    paymentResponseTime.labels('payment_processing', 'wechat').observe(duration);
    httpRequestsTotal.labels('POST', '/api/payment/test', success ? '200' : '500', 'smart-travel-v6.2').inc();
    
    const response = {
      success,
      duration,
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(success ? 200 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
    console.log(`✅ Payment test API called - Success: ${success}, Duration: ${duration}s`);
    
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
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
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

// 定期更新一些指标来模拟真实应用
setInterval(() => {
  // 模拟一些随机的API调用
  const routes = ['/api/health', '/api/travel-data', '/api/user/profile'];
  const methods = ['GET', 'POST'];
  const statusCodes = ['200', '201', '400', '500'];
  
  const route = routes[Math.floor(Math.random() * routes.length)];
  const method = methods[Math.floor(Math.random() * methods.length)];
  const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
  
  httpRequestsTotal.labels(method, route, statusCode, 'smart-travel-v6.2').inc();
  
  // 更新支付成功率
  paymentSuccessRate.set(0.99 + (Math.random() - 0.5) * 0.02);
  
}, 5000); // 每5秒更新一次
