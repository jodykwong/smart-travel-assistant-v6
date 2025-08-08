#!/usr/bin/env node

/**
 * 地理服务配置验证脚本
 * 验证高德地图MCP和腾讯地图MCP的双链路配置
 * 
 * 使用方法: node scripts/verify-geo-services.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 颜色输出工具
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 加载环境变量
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env.local 文件不存在', 'red');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key] = valueParts.join('=');
      }
    }
  });
  
  return envVars;
}

// 验证必需的环境变量
function validateEnvironmentVariables(envVars) {
  log('\n🔍 验证环境变量配置...', 'blue');
  
  const requiredVars = {
    // 高德地图MCP配置
    'AMAP_MCP_SERVER_URL': '高德MCP服务端点',
    'AMAP_MCP_API_KEY': '高德MCP API密钥',
    'MCP_AMAP_ENABLED': '高德MCP启用状态',
    
    // 腾讯地图MCP配置
    'TENCENT_MCP_SERVER_URL': '腾讯MCP服务端点',
    'TENCENT_MCP_API_KEY': '腾讯MCP API密钥',
    'MCP_TENCENT_ENABLED': '腾讯MCP启用状态',
    
    // 双链路配置
    'GEO_SERVICE_STRATEGY': '地理服务策略',
    'GEO_PRIMARY_PROVIDER': '主要服务提供商',
    'GEO_SECONDARY_PROVIDER': '备用服务提供商'
  };
  
  let allValid = true;
  
  Object.entries(requiredVars).forEach(([key, description]) => {
    if (envVars[key]) {
      log(`  ✅ ${key}: ${description}`, 'green');
    } else {
      log(`  ❌ ${key}: ${description} - 缺失`, 'red');
      allValid = false;
    }
  });
  
  return allValid;
}

// 验证API密钥格式
function validateApiKeys(envVars) {
  log('\n🔑 验证API密钥格式...', 'blue');
  
  const apiKeys = {
    'AMAP_MCP_API_KEY': {
      name: '高德地图API密钥',
      pattern: /^[a-f0-9]{32}$/,
      value: envVars['AMAP_MCP_API_KEY']
    },
    'TENCENT_MCP_API_KEY': {
      name: '腾讯地图API密钥',
      pattern: /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/,
      value: envVars['TENCENT_MCP_API_KEY']
    }
  };
  
  let allValid = true;
  
  Object.entries(apiKeys).forEach(([key, config]) => {
    if (config.value) {
      if (config.pattern.test(config.value)) {
        log(`  ✅ ${config.name}: 格式正确`, 'green');
      } else {
        log(`  ⚠️  ${config.name}: 格式可能不正确`, 'yellow');
        log(`     期望格式: ${config.pattern}`, 'yellow');
        log(`     实际值: ${config.value}`, 'yellow');
      }
    } else {
      log(`  ❌ ${config.name}: 未配置`, 'red');
      allValid = false;
    }
  });
  
  return allValid;
}

// 测试网络连接
function testNetworkConnection(url, name) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'HEAD',
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        log(`  ✅ ${name}: 网络连接正常 (${res.statusCode})`, 'green');
        resolve(true);
      } else {
        log(`  ⚠️  ${name}: 响应状态码 ${res.statusCode}`, 'yellow');
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      log(`  ❌ ${name}: 连接失败 - ${err.message}`, 'red');
      resolve(false);
    });
    
    req.on('timeout', () => {
      log(`  ❌ ${name}: 连接超时`, 'red');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// 验证服务端点连接
async function validateServiceEndpoints(envVars) {
  log('\n🌐 验证服务端点连接...', 'blue');
  
  const endpoints = [
    {
      url: envVars['AMAP_MCP_SERVER_URL'] || 'https://mcp.amap.com',
      name: '高德MCP服务'
    },
    {
      url: envVars['TENCENT_MCP_SERVER_URL'] || 'https://mcp.qq.com',
      name: '腾讯MCP服务'
    }
  ];
  
  const results = await Promise.all(
    endpoints.map(endpoint => testNetworkConnection(endpoint.url, endpoint.name))
  );
  
  return results.every(result => result);
}

// 验证双链路配置
function validateDualChainConfig(envVars) {
  log('\n🔗 验证双链路冗余配置...', 'blue');
  
  const strategy = envVars['GEO_SERVICE_STRATEGY'];
  const primary = envVars['GEO_PRIMARY_PROVIDER'];
  const secondary = envVars['GEO_SECONDARY_PROVIDER'];
  
  let configValid = true;
  
  // 验证策略配置
  if (strategy === 'dual_redundancy') {
    log('  ✅ 地理服务策略: 双链路冗余', 'green');
  } else {
    log(`  ⚠️  地理服务策略: ${strategy} (建议使用 dual_redundancy)`, 'yellow');
  }
  
  // 验证主备配置
  if (primary === 'amap' && secondary === 'tencent') {
    log('  ✅ 主备配置: 高德主链路，腾讯备用链路', 'green');
  } else {
    log(`  ⚠️  主备配置: ${primary} -> ${secondary} (建议 amap -> tencent)`, 'yellow');
  }
  
  // 验证质量阈值
  const qualityThreshold = parseFloat(envVars['GEO_QUALITY_THRESHOLD'] || '0');
  if (qualityThreshold >= 0.9) {
    log(`  ✅ 质量阈值: ${qualityThreshold} (高质量标准)`, 'green');
  } else {
    log(`  ⚠️  质量阈值: ${qualityThreshold} (建议 >= 0.9)`, 'yellow');
  }
  
  // 验证响应时间阈值
  const responseThreshold = parseInt(envVars['GEO_RESPONSE_TIME_THRESHOLD'] || '0');
  if (responseThreshold <= 10000) {
    log(`  ✅ 响应时间阈值: ${responseThreshold}ms`, 'green');
  } else {
    log(`  ⚠️  响应时间阈值: ${responseThreshold}ms (建议 <= 10000ms)`, 'yellow');
  }
  
  return configValid;
}

// 生成配置报告
function generateConfigReport(envVars) {
  log('\n📊 配置报告', 'bold');
  log('=' .repeat(50), 'blue');
  
  log('\n🎯 双链路冗余架构配置:', 'blue');
  log(`  主链路: ${envVars['GEO_PRIMARY_PROVIDER']} (${envVars['AMAP_MCP_SERVER_URL']})`);
  log(`  备用链路: ${envVars['GEO_SECONDARY_PROVIDER']} (${envVars['TENCENT_MCP_SERVER_URL']})`);
  log(`  策略: ${envVars['GEO_SERVICE_STRATEGY']}`);
  log(`  自动切换: ${envVars['GEO_AUTO_SWITCH_ENABLED'] === 'true' ? '启用' : '禁用'}`);
  
  log('\n⚙️  质量控制配置:', 'blue');
  log(`  质量阈值: ${envVars['GEO_QUALITY_THRESHOLD']}`);
  log(`  响应时间阈值: ${envVars['GEO_RESPONSE_TIME_THRESHOLD']}ms`);
  log(`  准确性阈值: ${envVars['GEO_ACCURACY_THRESHOLD']}`);
  
  log('\n🔧 MCP传输配置:', 'blue');
  log(`  传输类型: ${envVars['MCP_TRANSPORT_TYPE']}`);
  log(`  超时时间: ${envVars['MCP_TIMEOUT']}ms`);
  log(`  重试次数: ${envVars['MCP_RETRY_ATTEMPTS']}`);
}

// 主函数
async function main() {
  log('🚀 智游助手地理服务配置验证', 'bold');
  log('验证双链路冗余架构配置...', 'blue');
  
  try {
    // 加载环境变量
    const envVars = loadEnvFile();
    
    // 执行各项验证
    const envValid = validateEnvironmentVariables(envVars);
    const keysValid = validateApiKeys(envVars);
    const networkValid = await validateServiceEndpoints(envVars);
    const configValid = validateDualChainConfig(envVars);
    
    // 生成报告
    generateConfigReport(envVars);
    
    // 总结
    log('\n📋 验证总结', 'bold');
    log('=' .repeat(50), 'blue');
    
    const allValid = envValid && keysValid && networkValid && configValid;
    
    if (allValid) {
      log('✅ 所有配置验证通过！双链路冗余架构已就绪。', 'green');
      log('🎉 可以开始使用地理服务双链路功能。', 'green');
    } else {
      log('⚠️  部分配置需要调整，请检查上述警告和错误。', 'yellow');
    }
    
    log(`\n📈 配置完成度: ${allValid ? '100%' : '部分完成'}`, allValid ? 'green' : 'yellow');
    
  } catch (error) {
    log(`❌ 验证过程中发生错误: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 运行验证
if (require.main === module) {
  main();
}

module.exports = {
  loadEnvFile,
  validateEnvironmentVariables,
  validateApiKeys,
  validateServiceEndpoints,
  validateDualChainConfig
};
