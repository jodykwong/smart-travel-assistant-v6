/**
 * LLM API连接诊断脚本
 * 专门诊断DeepSeek和SiliconFlow API连接问题
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
require('dotenv').config();

// 配置
const config = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL_NAME || 'deepseek-chat'
  },
  siliconflow: {
    apiKey: process.env.SILICONFLOW_API_KEY,
    baseURL: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
    model: process.env.SILICONFLOW_DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3'
  }
};

// 工具函数：发送HTTP请求
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    };

    const req = client.request(requestOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// 1. 基础连接测试
async function testBasicConnectivity() {
  console.log('🔍 1. 基础连接测试');
  console.log('=' * 50);

  const tests = [
    { name: 'DeepSeek API', url: config.deepseek.baseURL },
    { name: 'SiliconFlow API', url: config.siliconflow.baseURL }
  ];

  for (const test of tests) {
    try {
      console.log(`测试 ${test.name}: ${test.url}`);
      const start = Date.now();
      const response = await makeRequest(test.url, { method: 'GET', timeout: 5000 });
      const duration = Date.now() - start;
      
      console.log(`  ✅ 连接成功 - 状态码: ${response.statusCode}, 耗时: ${duration}ms`);
    } catch (error) {
      console.log(`  ❌ 连接失败: ${error.message}`);
    }
  }
  console.log('');
}

// 2. API密钥验证
async function testAPIKeys() {
  console.log('🔑 2. API密钥验证');
  console.log('=' * 50);

  // 测试DeepSeek
  if (config.deepseek.apiKey) {
    try {
      console.log('测试DeepSeek API密钥...');
      const response = await makeRequest(`${config.deepseek.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.deepseek.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.statusCode === 200) {
        console.log('  ✅ DeepSeek API密钥有效');
        try {
          const models = JSON.parse(response.body);
          console.log(`  📋 可用模型数量: ${models.data?.length || 0}`);
        } catch (e) {
          console.log('  ⚠️ 响应解析失败，但密钥可能有效');
        }
      } else {
        console.log(`  ❌ DeepSeek API密钥无效 - 状态码: ${response.statusCode}`);
        console.log(`  📝 响应: ${response.body.substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`  ❌ DeepSeek API测试失败: ${error.message}`);
    }
  } else {
    console.log('  ⚠️ DeepSeek API密钥未配置');
  }

  // 测试SiliconFlow
  if (config.siliconflow.apiKey) {
    try {
      console.log('测试SiliconFlow API密钥...');
      const response = await makeRequest(`${config.siliconflow.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.siliconflow.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.statusCode === 200) {
        console.log('  ✅ SiliconFlow API密钥有效');
        try {
          const models = JSON.parse(response.body);
          console.log(`  📋 可用模型数量: ${models.data?.length || 0}`);
        } catch (e) {
          console.log('  ⚠️ 响应解析失败，但密钥可能有效');
        }
      } else {
        console.log(`  ❌ SiliconFlow API密钥无效 - 状态码: ${response.statusCode}`);
        console.log(`  📝 响应: ${response.body.substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`  ❌ SiliconFlow API测试失败: ${error.message}`);
    }
  } else {
    console.log('  ⚠️ SiliconFlow API密钥未配置');
  }
  console.log('');
}

// 3. 实际LLM调用测试
async function testLLMCalls() {
  console.log('🤖 3. 实际LLM调用测试');
  console.log('=' * 50);

  const testPrompt = {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: '你是一个测试助手，请简短回复。'
      },
      {
        role: 'user',
        content: '请回复"连接测试成功"来确认API工作正常。'
      }
    ],
    max_tokens: 50,
    temperature: 0.1
  };

  // 测试DeepSeek
  if (config.deepseek.apiKey) {
    try {
      console.log('测试DeepSeek LLM调用...');
      const start = Date.now();
      const response = await makeRequest(`${config.deepseek.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.deepseek.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }, JSON.stringify({ ...testPrompt, model: config.deepseek.model }));
      
      const duration = Date.now() - start;
      
      if (response.statusCode === 200) {
        try {
          const result = JSON.parse(response.body);
          const content = result.choices?.[0]?.message?.content || '';
          console.log(`  ✅ DeepSeek LLM调用成功 - 耗时: ${duration}ms`);
          console.log(`  📝 响应内容: ${content}`);
          console.log(`  🔢 Token使用: ${result.usage?.total_tokens || 'N/A'}`);
        } catch (e) {
          console.log(`  ❌ DeepSeek响应解析失败: ${e.message}`);
          console.log(`  📝 原始响应: ${response.body.substring(0, 300)}`);
        }
      } else {
        console.log(`  ❌ DeepSeek LLM调用失败 - 状态码: ${response.statusCode}`);
        console.log(`  📝 错误响应: ${response.body.substring(0, 300)}`);
      }
    } catch (error) {
      console.log(`  ❌ DeepSeek LLM调用异常: ${error.message}`);
    }
  }

  // 测试SiliconFlow
  if (config.siliconflow.apiKey) {
    try {
      console.log('测试SiliconFlow LLM调用...');
      const start = Date.now();
      const response = await makeRequest(`${config.siliconflow.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.siliconflow.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }, JSON.stringify({ ...testPrompt, model: config.siliconflow.model }));
      
      const duration = Date.now() - start;
      
      if (response.statusCode === 200) {
        try {
          const result = JSON.parse(response.body);
          const content = result.choices?.[0]?.message?.content || '';
          console.log(`  ✅ SiliconFlow LLM调用成功 - 耗时: ${duration}ms`);
          console.log(`  📝 响应内容: ${content}`);
          console.log(`  🔢 Token使用: ${result.usage?.total_tokens || 'N/A'}`);
        } catch (e) {
          console.log(`  ❌ SiliconFlow响应解析失败: ${e.message}`);
          console.log(`  📝 原始响应: ${response.body.substring(0, 300)}`);
        }
      } else {
        console.log(`  ❌ SiliconFlow LLM调用失败 - 状态码: ${response.statusCode}`);
        console.log(`  📝 错误响应: ${response.body.substring(0, 300)}`);
      }
    } catch (error) {
      console.log(`  ❌ SiliconFlow LLM调用异常: ${error.message}`);
    }
  }
  console.log('');
}

// 4. 环境配置检查
function checkEnvironmentConfig() {
  console.log('⚙️ 4. 环境配置检查');
  console.log('=' * 50);

  const requiredVars = [
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_API_URL',
    'DEEPSEEK_MODEL_NAME',
    'SILICONFLOW_API_KEY',
    'SILICONFLOW_BASE_URL',
    'SILICONFLOW_DEEPSEEK_MODEL'
  ];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: ${varName.includes('KEY') ? value.substring(0, 10) + '...' : value}`);
    } else {
      console.log(`  ❌ ${varName}: 未设置`);
    }
  });
  console.log('');
}

// 主函数
async function runDiagnosis() {
  console.log('🚀 LLM API连接诊断开始');
  console.log('时间:', new Date().toISOString());
  console.log('=' * 60);
  console.log('');

  // 运行所有测试
  checkEnvironmentConfig();
  await testBasicConnectivity();
  await testAPIKeys();
  await testLLMCalls();

  console.log('📊 诊断完成');
  console.log('=' * 60);
  console.log('');
  console.log('💡 如果所有测试都失败，请检查:');
  console.log('   1. 网络连接是否正常');
  console.log('   2. API密钥是否有效且未过期');
  console.log('   3. 是否有防火墙或代理阻止连接');
  console.log('   4. API服务商是否有服务中断');
}

// 运行诊断
if (require.main === module) {
  runDiagnosis().catch(console.error);
}

module.exports = { runDiagnosis, config };
