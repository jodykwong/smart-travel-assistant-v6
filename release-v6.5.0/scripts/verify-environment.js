#!/usr/bin/env node

/**
 * 智游助手v5.0 - 环境配置验证脚本
 * 基于诊断报告创建的自动化验证工具
 */

const fs = require('fs');
const path = require('path');

// 颜色输出工具
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bold}${colors.blue}\n🔍 ${msg}${colors.reset}`)
};

// 必需的环境变量 (基于新架构)
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET'
];

// AI服务变量 (至少需要一个)
const AI_SERVICE_VARS = [
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'TENCENT_CLOUD_AI_KEY'
];

// 可选的环境变量
const OPTIONAL_ENV_VARS = [
  'REDIS_URL',
  'SENTRY_DSN',
  'VERCEL_ANALYTICS_ID'
];

// 必需的文件
const REQUIRED_FILES = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  '.env.local'
];

// 必需的目录
const REQUIRED_DIRECTORIES = [
  'src',
  'src/components',
  'src/store', 
  'src/services',
  'src/types',
  'src/lib'
];

async function verifyEnvironment() {
  log.title('智游助手v5.0 环境配置验证');
  
  let totalChecks = 0;
  let passedChecks = 0;
  
  // 1. 验证文件存在性
  log.title('1. 验证项目文件结构');
  for (const file of REQUIRED_FILES) {
    totalChecks++;
    if (fs.existsSync(file)) {
      log.success(`文件存在: ${file}`);
      passedChecks++;
    } else {
      log.error(`文件缺失: ${file}`);
    }
  }
  
  // 2. 验证目录结构
  log.title('2. 验证目录结构');
  for (const dir of REQUIRED_DIRECTORIES) {
    totalChecks++;
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      log.success(`目录存在: ${dir}`);
      passedChecks++;
    } else {
      log.error(`目录缺失: ${dir}`);
    }
  }
  
  // 3. 验证node_modules
  log.title('3. 验证依赖安装状态');
  totalChecks++;
  if (fs.existsSync('node_modules')) {
    log.success('node_modules 目录存在');
    passedChecks++;
    
    // 检查关键依赖
    const keyDependencies = ['next', 'react', 'typescript', 'zustand'];
    for (const dep of keyDependencies) {
      totalChecks++;
      if (fs.existsSync(`node_modules/${dep}`)) {
        log.success(`关键依赖已安装: ${dep}`);
        passedChecks++;
      } else {
        log.error(`关键依赖缺失: ${dep}`);
      }
    }
  } else {
    log.error('node_modules 目录不存在 - 请运行 npm install');
  }
  
  // 4. 验证环境变量
  log.title('4. 验证环境变量配置');
  
  // 加载.env.local
  if (fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    // 检查必需变量
    for (const envVar of REQUIRED_ENV_VARS) {
      totalChecks++;
      if (envVars[envVar] && envVars[envVar] !== `your_${envVar.toLowerCase()}`) {
        log.success(`必需环境变量已配置: ${envVar}`);
        passedChecks++;
      } else {
        log.error(`必需环境变量未配置: ${envVar}`);
      }
    }

    // 检查AI服务变量 (至少需要一个)
    totalChecks++;
    const hasAIService = AI_SERVICE_VARS.some(envVar =>
      envVars[envVar] && envVars[envVar] !== `your_${envVar.toLowerCase()}`
    );

    if (hasAIService) {
      log.success('AI服务已配置');
      passedChecks++;
    } else {
      log.error('未配置任何AI服务 (需要OpenAI、DeepSeek或腾讯云中的一个)');
    }
    
    // 检查可选变量
    for (const envVar of OPTIONAL_ENV_VARS) {
      if (envVars[envVar] && envVars[envVar] !== `your_${envVar.toLowerCase()}`) {
        log.success(`可选环境变量已配置: ${envVar}`);
      } else {
        log.warning(`可选环境变量未配置: ${envVar}`);
      }
    }
  } else {
    log.error('.env.local 文件不存在');
  }
  
  // 5. 验证package.json配置
  log.title('5. 验证package.json配置');
  totalChecks++;
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.name === 'smart-travel-assistant-v5') {
      log.success('项目名称正确');
      passedChecks++;
    } else {
      log.error('项目名称不匹配');
    }
    
    // 检查脚本
    const requiredScripts = ['dev', 'build', 'start', 'test'];
    for (const script of requiredScripts) {
      totalChecks++;
      if (packageJson.scripts && packageJson.scripts[script]) {
        log.success(`脚本存在: ${script}`);
        passedChecks++;
      } else {
        log.error(`脚本缺失: ${script}`);
      }
    }
  } catch (error) {
    log.error('package.json 解析失败');
  }
  
  // 6. 生成报告
  log.title('6. 验证结果汇总');
  
  const successRate = (passedChecks / totalChecks * 100).toFixed(1);
  
  console.log(`\n${colors.bold}📊 验证结果统计:${colors.reset}`);
  console.log(`   总检查项: ${totalChecks}`);
  console.log(`   通过检查: ${colors.green}${passedChecks}${colors.reset}`);
  console.log(`   失败检查: ${colors.red}${totalChecks - passedChecks}${colors.reset}`);
  console.log(`   成功率: ${successRate >= 80 ? colors.green : colors.red}${successRate}%${colors.reset}`);
  
  if (successRate >= 80) {
    log.success('环境配置基本完整，可以尝试启动项目');
    console.log(`\n${colors.blue}🚀 下一步操作:${colors.reset}`);
    console.log('   1. npm run dev');
    console.log('   2. 访问 http://localhost:3000');
    console.log('   3. 检查控制台是否有错误');
  } else {
    log.error('环境配置不完整，请先解决上述问题');
    console.log(`\n${colors.yellow}🔧 建议操作:${colors.reset}`);
    console.log('   1. npm install');
    console.log('   2. 配置 .env.local 中的必需环境变量');
    console.log('   3. 重新运行此验证脚本');
  }
  
  return successRate >= 80;
}

// Python notebook环境检查
function checkPythonNotebooks() {
  log.title('7. Python Notebook环境分析');
  
  const notebooks = [
    '01_langgraph_architecture.ipynb',
    '02_amap_integration.ipynb', 
    '03_intelligent_planning.ipynb',
    '04_complete_integration_test.ipynb'
  ];
  
  log.info('发现的Jupyter Notebook文件:');
  notebooks.forEach(notebook => {
    if (fs.existsSync(notebook)) {
      log.success(`原型文件: ${notebook}`);
    }
  });
  
  log.info('这些notebook文件用于原型开发，与Node.js生产环境无冲突');
  log.info('如需运行notebook，请单独配置Python环境');
}

// 主函数
async function main() {
  try {
    const isHealthy = await verifyEnvironment();
    checkPythonNotebooks();
    
    process.exit(isHealthy ? 0 : 1);
  } catch (error) {
    log.error(`验证过程出错: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyEnvironment };
