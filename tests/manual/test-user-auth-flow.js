/**
 * 智游助手v6.2 用户认证流程完整测试
 * 运行方式: node tests/manual/test-user-auth-flow.js
 */

const http = require('http');

console.log('🔐 智游助手v6.2 用户认证流程完整测试');
console.log('==========================================');

// 测试配置
const TEST_CONFIG = {
  BASE_URL: 'http://localhost:3001',
  TEST_USER: {
    email: `test${Date.now()}@smarttravel.com`, // 使用时间戳避免重复
    password: 'MyStr0ng!P@ssw0rd#2024$',
    displayName: '测试用户'
  },
  TIMEOUT: 10000
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
    
    req.on('error', (error) => {
      resolve({ status: 'ERROR', error: error.message });
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

// 主测试函数
async function runAuthFlowTest() {
  console.log('🚀 开始用户认证流程测试...\n');
  
  let testResults = {
    registration: { success: false },
    login: { success: false },
    jwtValidation: { success: false },
    paymentIntegration: { success: false }
  };
  
  // ============= 1. 用户注册测试 =============
  console.log('📋 1. 用户注册测试');
  console.log('==================');
  
  const registerOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/user/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const registerData = {
    email: TEST_CONFIG.TEST_USER.email,
    password: TEST_CONFIG.TEST_USER.password,
    displayName: TEST_CONFIG.TEST_USER.displayName
  };
  
  console.log(`📧 测试邮箱: ${registerData.email}`);
  console.log(`👤 用户名: ${registerData.displayName}`);
  console.log(`🔒 密码强度: ${registerData.password.length}字符`);
  
  const registerResult = await makeRequest(registerOptions, registerData);
  
  if (registerResult.status === 201) {
    console.log('✅ 用户注册成功');
    console.log(`   用户ID: ${registerResult.body.user?.id || 'N/A'}`);
    console.log(`   JWT Token: ${registerResult.body.tokens?.accessToken ? '已生成' : '未生成'}`);
    console.log(`   Token类型: ${registerResult.body.tokens?.tokenType || 'N/A'}`);
    console.log(`   过期时间: ${registerResult.body.tokens?.expiresIn || 'N/A'}秒`);
    
    testResults.registration = {
      success: true,
      user: registerResult.body.user,
      tokens: registerResult.body.tokens
    };
  } else {
    console.log(`❌ 用户注册失败 (${registerResult.status})`);
    console.log(`   错误信息: ${registerResult.body.error || registerResult.error || '未知错误'}`);
    
    if (registerResult.body.details) {
      console.log(`   详细信息: ${JSON.stringify(registerResult.body.details, null, 2)}`);
    }
    
    testResults.registration = {
      success: false,
      error: registerResult.body.error || registerResult.error
    };
  }
  
  // ============= 2. 用户登录测试 =============
  console.log('\n📋 2. 用户登录测试');
  console.log('==================');
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/user/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const loginData = {
    email: TEST_CONFIG.TEST_USER.email,
    password: TEST_CONFIG.TEST_USER.password
  };
  
  console.log(`📧 登录邮箱: ${loginData.email}`);
  
  const loginResult = await makeRequest(loginOptions, loginData);
  
  if (loginResult.status === 200) {
    console.log('✅ 用户登录成功');
    console.log(`   用户ID: ${loginResult.body.user?.id || 'N/A'}`);
    console.log(`   用户名: ${loginResult.body.user?.displayName || 'N/A'}`);
    console.log(`   JWT Token: ${loginResult.body.tokens?.accessToken ? '已生成' : '未生成'}`);
    console.log(`   Token类型: ${loginResult.body.tokens?.tokenType || 'N/A'}`);
    console.log(`   过期时间: ${loginResult.body.tokens?.expiresIn || 'N/A'}秒`);
    
    testResults.login = {
      success: true,
      user: loginResult.body.user,
      tokens: loginResult.body.tokens
    };
  } else {
    console.log(`❌ 用户登录失败 (${loginResult.status})`);
    console.log(`   错误信息: ${loginResult.body.error || loginResult.error || '未知错误'}`);
    
    testResults.login = {
      success: false,
      error: loginResult.body.error || loginResult.error
    };
  }
  
  // ============= 3. JWT认证验证测试 =============
  console.log('\n📋 3. JWT认证验证测试');
  console.log('=====================');
  
  if (testResults.login.success && testResults.login.tokens) {
    const token = testResults.login.tokens.accessToken;
    
    // 测试JWT token格式
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      console.log('✅ JWT Token格式正确 (3个部分)');
      
      try {
        // 解码JWT header和payload (不验证签名)
        const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        
        console.log(`   算法: ${header.alg || 'N/A'}`);
        console.log(`   类型: ${header.typ || 'N/A'}`);
        console.log(`   用户ID: ${payload.userId || payload.sub || 'N/A'}`);
        console.log(`   发行者: ${payload.iss || 'N/A'}`);
        console.log(`   过期时间: ${payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'N/A'}`);
        
        testResults.jwtValidation = {
          success: true,
          header: header,
          payload: payload
        };
      } catch (e) {
        console.log('❌ JWT Token解码失败');
        console.log(`   错误: ${e.message}`);
        
        testResults.jwtValidation = {
          success: false,
          error: 'JWT解码失败'
        };
      }
    } else {
      console.log('❌ JWT Token格式错误');
      testResults.jwtValidation = {
        success: false,
        error: 'JWT格式错误'
      };
    }
  } else {
    console.log('❌ 无法进行JWT验证（缺少token）');
    testResults.jwtValidation = {
      success: false,
      error: '缺少JWT token'
    };
  }
  
  // ============= 4. 支付功能集成测试 =============
  console.log('\n📋 4. 支付功能集成测试');
  console.log('======================');
  
  if (testResults.login.success && testResults.login.tokens) {
    const token = testResults.login.tokens.accessToken;
    
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
      amount: 9900, // 99元
      description: '智游助手旅游规划服务测试',
      paymentMethod: 'wechat',
      paymentType: 'qr'
    };
    
    console.log(`💰 测试金额: ${paymentData.amount/100}元`);
    console.log(`💳 支付方式: ${paymentData.paymentMethod}`);
    console.log(`📱 支付类型: ${paymentData.paymentType}`);
    
    const paymentResult = await makeRequest(paymentOptions, paymentData);
    
    if (paymentResult.status === 201 || paymentResult.status === 200) {
      console.log('✅ 支付订单创建成功');
      console.log(`   订单ID: ${paymentResult.body.paymentId || 'N/A'}`);
      console.log(`   商户订单号: ${paymentResult.body.outTradeNo || 'N/A'}`);
      console.log(`   支付链接: ${paymentResult.body.paymentUrl ? '已生成' : 'N/A'}`);
      console.log(`   二维码: ${paymentResult.body.qrCode ? '已生成' : 'N/A'}`);
      
      testResults.paymentIntegration = {
        success: true,
        paymentId: paymentResult.body.paymentId,
        outTradeNo: paymentResult.body.outTradeNo
      };
    } else {
      console.log(`❌ 支付订单创建失败 (${paymentResult.status})`);
      console.log(`   错误信息: ${paymentResult.body.error || paymentResult.error || '未知错误'}`);
      
      testResults.paymentIntegration = {
        success: false,
        error: paymentResult.body.error || paymentResult.error
      };
    }
  } else {
    console.log('❌ 无法测试支付功能（缺少认证token）');
    testResults.paymentIntegration = {
      success: false,
      error: '缺少认证token'
    };
  }
  
  // ============= 测试结果总结 =============
  console.log('\n📊 测试结果总结');
  console.log('================');
  
  const successCount = Object.values(testResults).filter(r => r.success).length;
  const totalTests = Object.keys(testResults).length;
  
  console.log(`👤 用户注册: ${testResults.registration.success ? '✅ 成功' : '❌ 失败'}`);
  console.log(`🔑 用户登录: ${testResults.login.success ? '✅ 成功' : '❌ 失败'}`);
  console.log(`🎫 JWT验证: ${testResults.jwtValidation.success ? '✅ 成功' : '❌ 失败'}`);
  console.log(`💳 支付集成: ${testResults.paymentIntegration.success ? '✅ 成功' : '❌ 失败'}`);
  
  console.log(`\n🎯 总体评分: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`);
  
  if (successCount === totalTests) {
    console.log('🎉 所有测试通过！用户认证功能完全正常！');
  } else if (successCount >= totalTests * 0.75) {
    console.log('✅ 大部分测试通过，用户认证功能基本正常');
  } else if (successCount >= totalTests * 0.5) {
    console.log('⚠️ 部分测试通过，用户认证功能需要改进');
  } else {
    console.log('❌ 多数测试失败，用户认证功能需要重大修复');
  }
  
  // 输出详细的失败信息
  const failures = Object.entries(testResults).filter(([_, result]) => !result.success);
  if (failures.length > 0) {
    console.log('\n🔍 失败详情:');
    failures.forEach(([testName, result]) => {
      console.log(`   ${testName}: ${result.error || '未知错误'}`);
    });
  }
  
  return testResults;
}

// 运行测试
runAuthFlowTest().catch(console.error);
