/**
 * 智游助手v6.2 用户认证功能状态检查脚本
 * 运行方式: node tests/manual/verify-user-auth-status.js
 */

const http = require('http');

console.log('🔐 智游助手v6.2 用户认证功能状态检查');
console.log('==========================================');

// 测试配置
const TEST_CONFIG = {
  BASE_URL: 'http://localhost:3001',
  TEST_USER: {
    email: 'test@smarttravel.com',
    password: 'TestPassword123!',
    displayName: '测试用户'
  },
  TIMEOUT: 5000
};

// HTTP请求工具函数
function makeRequest(options, data = null) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            parseError: true
          });
        }
      });
    });
    
    req.on('error', () => {
      resolve({ status: 'ERROR', error: 'Connection failed' });
    });
    
    req.setTimeout(TEST_CONFIG.TIMEOUT, () => {
      req.destroy();
      resolve({ status: 'TIMEOUT', error: 'Request timeout' });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 检查页面是否可访问
async function checkPageAccess(path, expectedTitle) {
  console.log(`📄 检查页面访问: ${path}`);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'GET'
  };
  
  const result = await makeRequest(options);
  
  if (result.status === 200) {
    if (result.body && typeof result.body === 'string') {
      const hasTitle = result.body.includes(expectedTitle);
      console.log(`   ✅ 页面可访问 (${result.status})`);
      console.log(`   ${hasTitle ? '✅' : '❌'} 页面标题${hasTitle ? '正确' : '不正确'}`);
      return { accessible: true, hasCorrectTitle: hasTitle };
    } else {
      console.log(`   ✅ 页面可访问 (${result.status})`);
      return { accessible: true, hasCorrectTitle: false };
    }
  } else {
    console.log(`   ❌ 页面不可访问 (${result.status})`);
    return { accessible: false, hasCorrectTitle: false };
  }
}

// 测试API端点
async function testAPIEndpoint(path, method, data, expectedStatus) {
  console.log(`🔌 测试API端点: ${method} ${path}`);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const result = await makeRequest(options, data);
  
  if (result.status === expectedStatus) {
    console.log(`   ✅ API响应正确 (${result.status})`);
    return { success: true, data: result.body };
  } else if (result.status === 'ERROR') {
    console.log(`   ❌ API连接失败`);
    return { success: false, error: 'Connection failed' };
  } else if (result.status === 'TIMEOUT') {
    console.log(`   ⏰ API请求超时`);
    return { success: false, error: 'Timeout' };
  } else {
    console.log(`   ❌ API响应异常 (期望: ${expectedStatus}, 实际: ${result.status})`);
    return { success: false, status: result.status, data: result.body };
  }
}

// 主检查函数
async function runAuthStatusCheck() {
  console.log('🚀 开始用户认证功能状态检查...\n');
  
  const results = {
    pageAccess: {},
    apiEndpoints: {},
    userRegistration: {},
    userLogin: {},
    jwtValidation: {},
    paymentIntegration: {}
  };
  
  // ============= 页面访问检查 =============
  console.log('📋 1. 页面访问状态检查');
  console.log('========================');
  
  results.pageAccess.register = await checkPageAccess('/register', '用户注册');
  results.pageAccess.login = await checkPageAccess('/login', '用户登录');
  results.pageAccess.payment = await checkPageAccess('/payment', '支付中心');
  
  // ============= API端点检查 =============
  console.log('\n📋 2. API端点状态检查');
  console.log('=====================');
  
  // 测试注册API（应该返回400因为缺少必需字段）
  results.apiEndpoints.register = await testAPIEndpoint('/api/user/register', 'POST', {}, 400);
  
  // 测试登录API（应该返回400因为缺少必需字段）
  results.apiEndpoints.login = await testAPIEndpoint('/api/user/login', 'POST', {}, 400);
  
  // 测试支付创建API（应该返回401因为未认证）
  results.apiEndpoints.paymentCreate = await testAPIEndpoint('/api/payment/create', 'POST', {
    amount: 9900,
    description: '测试订单',
    paymentMethod: 'wechat',
    paymentType: 'qr'
  }, 401);
  
  // ============= 用户注册功能检查 =============
  console.log('\n📋 3. 用户注册功能检查');
  console.log('======================');
  
  // 测试完整的注册请求
  const registerResult = await testAPIEndpoint('/api/user/register', 'POST', {
    email: TEST_CONFIG.TEST_USER.email,
    password: TEST_CONFIG.TEST_USER.password,
    displayName: TEST_CONFIG.TEST_USER.displayName
  }, 201);
  
  results.userRegistration = registerResult;
  
  if (registerResult.success) {
    console.log('   ✅ 用户注册功能正常');
    console.log(`   ✅ JWT Token生成: ${registerResult.data.tokens ? '正常' : '异常'}`);
    console.log(`   ✅ 用户数据返回: ${registerResult.data.user ? '正常' : '异常'}`);
  } else {
    console.log('   ❌ 用户注册功能异常');
  }
  
  // ============= 用户登录功能检查 =============
  console.log('\n📋 4. 用户登录功能检查');
  console.log('======================');
  
  // 测试登录（使用刚注册的用户）
  const loginResult = await testAPIEndpoint('/api/user/login', 'POST', {
    email: TEST_CONFIG.TEST_USER.email,
    password: TEST_CONFIG.TEST_USER.password
  }, 200);
  
  results.userLogin = loginResult;
  
  if (loginResult.success) {
    console.log('   ✅ 用户登录功能正常');
    console.log(`   ✅ JWT Token生成: ${loginResult.data.tokens ? '正常' : '异常'}`);
    console.log(`   ✅ 用户信息返回: ${loginResult.data.user ? '正常' : '异常'}`);
  } else {
    console.log('   ❌ 用户登录功能异常');
  }
  
  // ============= JWT验证检查 =============
  console.log('\n📋 5. JWT认证机制检查');
  console.log('=====================');
  
  if (loginResult.success && loginResult.data.tokens) {
    const token = loginResult.data.tokens.accessToken;
    
    // 使用token访问需要认证的API
    const authOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/payment/query?outTradeNo=test123',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const authResult = await makeRequest(authOptions);
    
    if (authResult.status === 200 || authResult.status === 404) {
      console.log('   ✅ JWT认证机制正常工作');
      results.jwtValidation.success = true;
    } else if (authResult.status === 401) {
      console.log('   ❌ JWT认证验证失败');
      results.jwtValidation.success = false;
    } else {
      console.log(`   ⚠️ JWT认证测试结果不确定 (${authResult.status})`);
      results.jwtValidation.success = false;
    }
  } else {
    console.log('   ❌ 无法获取JWT Token进行测试');
    results.jwtValidation.success = false;
  }
  
  // ============= 支付功能集成检查 =============
  console.log('\n📋 6. 支付功能集成检查');
  console.log('======================');
  
  if (loginResult.success && loginResult.data.tokens) {
    const token = loginResult.data.tokens.accessToken;
    
    // 测试创建支付订单（带认证）
    const paymentOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/payment/create',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const paymentData = {
      serviceType: 'travel-planning',
      amount: 9900,
      description: '智游助手旅游规划服务',
      paymentMethod: 'wechat',
      paymentType: 'qr'
    };
    
    const paymentResult = await makeRequest(paymentOptions, paymentData);
    
    if (paymentResult.status === 201 || paymentResult.status === 200) {
      console.log('   ✅ 支付功能与用户认证集成正常');
      results.paymentIntegration.success = true;
    } else if (paymentResult.status === 401) {
      console.log('   ❌ 支付功能认证集成失败');
      results.paymentIntegration.success = false;
    } else {
      console.log(`   ⚠️ 支付功能集成测试结果: ${paymentResult.status}`);
      results.paymentIntegration.success = paymentResult.status < 500;
    }
  } else {
    console.log('   ❌ 无法测试支付功能集成（缺少认证）');
    results.paymentIntegration.success = false;
  }
  
  // ============= 总结报告 =============
  console.log('\n📊 检查结果总结');
  console.log('================');
  
  const pageAccessScore = Object.values(results.pageAccess).filter(r => r.accessible).length;
  const apiEndpointScore = Object.values(results.apiEndpoints).filter(r => r.success).length;
  
  console.log(`📄 页面访问: ${pageAccessScore}/3 正常`);
  console.log(`🔌 API端点: ${apiEndpointScore}/3 正常`);
  console.log(`👤 用户注册: ${results.userRegistration.success ? '✅ 正常' : '❌ 异常'}`);
  console.log(`🔑 用户登录: ${results.userLogin.success ? '✅ 正常' : '❌ 异常'}`);
  console.log(`🎫 JWT认证: ${results.jwtValidation.success ? '✅ 正常' : '❌ 异常'}`);
  console.log(`💳 支付集成: ${results.paymentIntegration.success ? '✅ 正常' : '❌ 异常'}`);
  
  const totalScore = [
    pageAccessScore >= 2,
    apiEndpointScore >= 2,
    results.userRegistration.success,
    results.userLogin.success,
    results.jwtValidation.success,
    results.paymentIntegration.success
  ].filter(Boolean).length;
  
  console.log(`\n🎯 总体评分: ${totalScore}/6 (${Math.round(totalScore/6*100)}%)`);
  
  if (totalScore >= 5) {
    console.log('🎉 用户认证功能基本就绪，可以进行详细测试！');
  } else if (totalScore >= 3) {
    console.log('⚠️ 用户认证功能部分就绪，需要修复一些问题');
  } else {
    console.log('❌ 用户认证功能存在重大问题，需要全面检查');
  }
  
  return results;
}

// 运行检查
runAuthStatusCheck().catch(console.error);
