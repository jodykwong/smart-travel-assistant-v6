/**
 * 智游助手v6.2 - 支付配置验证脚本
 * 验证支付网关配置是否正确，能否连接到真实或沙盒支付服务
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyPaymentConfiguration() {
  log('blue', '🔍 开始验证支付配置...');
  log('blue', '============================================================');

  let allConfigValid = true;
  const issues = [];

  // 1. 检查环境变量文件
  log('yellow', '📋 1. 检查环境变量文件...');
  
  const envFiles = ['.env', '.env.local', '.env.development'];
  let envFileExists = false;
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      log('green', `✅ 找到环境变量文件: ${envFile}`);
      envFileExists = true;
      break;
    }
  }
  
  if (!envFileExists) {
    log('red', '❌ 未找到环境变量文件 (.env, .env.local, .env.development)');
    log('yellow', '💡 请复制 .env.example 为 .env.local 并填入真实配置');
    allConfigValid = false;
    issues.push('缺少环境变量文件');
  }

  // 2. 检查必需的支付配置
  log('yellow', '🔑 2. 检查支付API密钥配置...');
  
  const requiredWechatConfig = [
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_API_KEY', 
    'WECHAT_PAY_APP_ID'
  ];
  
  const requiredAlipayConfig = [
    'ALIPAY_APP_ID',
    'ALIPAY_PRIVATE_KEY',
    'ALIPAY_PUBLIC_KEY'
  ];

  // 检查微信支付配置
  log('blue', '   微信支付配置检查:');
  for (const config of requiredWechatConfig) {
    const value = process.env[config];
    if (!value || value.includes('your_') || value.includes('change_this')) {
      log('red', `   ❌ ${config}: 未配置或使用默认值`);
      allConfigValid = false;
      issues.push(`微信支付配置缺失: ${config}`);
    } else {
      log('green', `   ✅ ${config}: 已配置`);
    }
  }

  // 检查支付宝配置
  log('blue', '   支付宝配置检查:');
  for (const config of requiredAlipayConfig) {
    const value = process.env[config];
    if (!value || value.includes('your_') || value.includes('change_this')) {
      log('red', `   ❌ ${config}: 未配置或使用默认值`);
      allConfigValid = false;
      issues.push(`支付宝配置缺失: ${config}`);
    } else {
      log('green', `   ✅ ${config}: 已配置`);
    }
  }

  // 3. 检查JWT配置
  log('yellow', '🔐 3. 检查JWT认证配置...');
  
  const jwtConfigs = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const config of jwtConfigs) {
    const value = process.env[config];
    if (!value || value.includes('your-') || value.includes('change-this')) {
      log('red', `   ❌ ${config}: 未配置或使用默认值`);
      allConfigValid = false;
      issues.push(`JWT配置缺失: ${config}`);
    } else if (value.length < 32) {
      log('yellow', `   ⚠️ ${config}: 密钥长度过短 (建议至少32字符)`);
      issues.push(`JWT密钥强度不足: ${config}`);
    } else {
      log('green', `   ✅ ${config}: 已配置且长度合适`);
    }
  }

  // 4. 测试支付网关连接
  log('yellow', '🌐 4. 测试支付网关连接...');
  
  try {
    // 测试支付宝网关连接
    if (process.env.ALIPAY_GATEWAY_URL) {
      log('blue', '   测试支付宝网关连接...');
      const response = await fetch(process.env.ALIPAY_GATEWAY_URL, {
        method: 'GET',
        timeout: 5000
      }).catch(err => ({ ok: false, error: err.message }));
      
      if (response.ok !== false) {
        log('green', '   ✅ 支付宝网关连接正常');
      } else {
        log('red', `   ❌ 支付宝网关连接失败: ${response.error || '未知错误'}`);
        issues.push('支付宝网关连接失败');
      }
    }
  } catch (error) {
    log('red', `   ❌ 网关连接测试失败: ${error.message}`);
    issues.push('网关连接测试失败');
  }

  // 5. 检查API端点文件
  log('yellow', '📁 5. 检查支付API端点文件...');
  
  const apiFiles = [
    'src/pages/api/payment/create-order.ts',
    'src/pages/api/payment/query.ts',
    'src/pages/api/payment/refund.ts',
    'src/pages/api/user/register.ts',
    'src/pages/api/user/login.ts'
  ];

  for (const apiFile of apiFiles) {
    if (fs.existsSync(apiFile)) {
      log('green', `   ✅ ${apiFile}: 存在`);
    } else {
      log('red', `   ❌ ${apiFile}: 缺失`);
      allConfigValid = false;
      issues.push(`API文件缺失: ${apiFile}`);
    }
  }

  // 6. 检查依赖包
  log('yellow', '📦 6. 检查必需的依赖包...');
  
  const packageJsonPath = 'package.json';
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredPackages = [
      'jsonwebtoken',
      'bcryptjs', 
      'validator',
      'prom-client',
      '@playwright/test'
    ];

    for (const pkg of requiredPackages) {
      if (dependencies[pkg]) {
        log('green', `   ✅ ${pkg}: ${dependencies[pkg]}`);
      } else {
        log('red', `   ❌ ${pkg}: 未安装`);
        allConfigValid = false;
        issues.push(`依赖包缺失: ${pkg}`);
      }
    }
  }

  // 7. 生成配置报告
  log('blue', '============================================================');
  log('blue', '📊 配置验证报告');
  log('blue', '============================================================');

  if (allConfigValid && issues.length === 0) {
    log('green', '🎉 所有配置验证通过！支付功能已准备就绪。');
    log('green', '✅ 可以进行真实的支付流程测试');
  } else {
    log('red', '❌ 配置验证失败，发现以下问题:');
    issues.forEach((issue, index) => {
      log('red', `   ${index + 1}. ${issue}`);
    });
    
    log('yellow', '');
    log('yellow', '🔧 修复建议:');
    log('yellow', '1. 复制 .env.example 为 .env.local');
    log('yellow', '2. 申请微信支付商户号和支付宝开发者账号');
    log('yellow', '3. 填入真实的API密钥和配置信息');
    log('yellow', '4. 安装缺失的依赖包: npm install <package-name>');
    log('yellow', '5. 重新运行此验证脚本');
  }

  return { valid: allConfigValid && issues.length === 0, issues };
}

// 主函数
async function main() {
  try {
    // 加载环境变量
    require('dotenv').config({ path: '.env.local' });
    require('dotenv').config({ path: '.env' });
    
    const result = await verifyPaymentConfiguration();
    
    if (!result.valid) {
      process.exit(1);
    }
  } catch (error) {
    log('red', `❌ 验证过程中发生错误: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { verifyPaymentConfiguration };
