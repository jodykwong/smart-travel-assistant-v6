#!/usr/bin/env node

/**
 * 智游助手v6.0全自动端到端测试执行器
 * 无人值守的完整测试套件执行脚本
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  testTimeout: 1800000, // 30分钟总超时
  maxRetries: 2,
  outputDir: './test-results',
  browsers: ['chromium'], // 可选: 'firefox', 'webkit'
  headless: true,
  parallel: false
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('='.repeat(60), 'cyan');
  log(message, 'bright');
  log('='.repeat(60), 'cyan');
}

function logStep(step, message) {
  log(`${step}. ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

/**
 * 检查环境依赖
 */
function checkDependencies() {
  logStep('1', '检查环境依赖');
  
  const dependencies = [
    { command: 'node --version', name: 'Node.js' },
    { command: 'npm --version', name: 'npm' },
    { command: 'python3 --version', name: 'Python 3' }
  ];

  for (const dep of dependencies) {
    try {
      const version = execSync(dep.command, { encoding: 'utf8' }).trim();
      logSuccess(`${dep.name}: ${version}`);
    } catch (error) {
      logError(`${dep.name} 未安装或不可用`);
      process.exit(1);
    }
  }

  // 检查.env文件
  if (!fs.existsSync('.env')) {
    logError('.env文件不存在，请先配置环境变量');
    process.exit(1);
  }
  logSuccess('.env文件存在');
}

/**
 * 安装依赖包
 */
function installDependencies() {
  logStep('2', '安装和检查依赖包');
  
  try {
    // 检查package.json
    if (!fs.existsSync('package.json')) {
      logError('package.json文件不存在');
      process.exit(1);
    }

    // 安装npm依赖
    log('安装npm依赖...', 'blue');
    execSync('npm install', { stdio: 'inherit' });
    logSuccess('npm依赖安装完成');

    // 安装Playwright浏览器
    log('安装Playwright浏览器...', 'blue');
    execSync('npx playwright install', { stdio: 'inherit' });
    logSuccess('Playwright浏览器安装完成');

    // 安装Python依赖
    log('检查Python依赖...', 'blue');
    const pythonPackages = ['jupyter', 'python-dotenv', 'openai', 'tiktoken'];
    
    for (const pkg of pythonPackages) {
      try {
        execSync(`python3 -c "import ${pkg.replace('-', '_')}"`, { stdio: 'pipe' });
        logSuccess(`Python包 ${pkg} 已安装`);
      } catch (error) {
        logWarning(`Python包 ${pkg} 未安装，尝试安装...`);
        try {
          execSync(`pip3 install ${pkg}`, { stdio: 'inherit' });
          logSuccess(`Python包 ${pkg} 安装成功`);
        } catch (installError) {
          logWarning(`Python包 ${pkg} 安装失败，将使用模拟模式`);
        }
      }
    }

  } catch (error) {
    logError(`依赖安装失败: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 准备测试环境
 */
function prepareTestEnvironment() {
  logStep('3', '准备测试环境');
  
  try {
    // 创建测试结果目录
    const dirs = [
      CONFIG.outputDir,
      `${CONFIG.outputDir}/screenshots`,
      `${CONFIG.outputDir}/videos`,
      `${CONFIG.outputDir}/traces`,
      `${CONFIG.outputDir}/artifacts`,
      `${CONFIG.outputDir}/reports`
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log(`创建目录: ${dir}`, 'blue');
      }
    });

    // 清理旧的测试结果
    const oldResults = [
      `${CONFIG.outputDir}/*.json`,
      `${CONFIG.outputDir}/*.html`,
      `${CONFIG.outputDir}/screenshots/*.png`,
      `${CONFIG.outputDir}/videos/*.webm`
    ];

    oldResults.forEach(pattern => {
      try {
        execSync(`rm -f ${pattern}`, { stdio: 'pipe' });
      } catch (error) {
        // 忽略删除失败
      }
    });

    logSuccess('测试环境准备完成');

  } catch (error) {
    logError(`测试环境准备失败: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 运行基础环境测试
 */
function runBasicTests() {
  logStep('4', '运行基础环境测试');
  
  try {
    // 运行Python基础测试
    log('执行Python基础环境测试...', 'blue');
    const pythonTestOutput = execSync('python3 simple_test.py', { 
      encoding: 'utf8',
      timeout: 30000 
    });
    
    if (pythonTestOutput.includes('100.0%')) {
      logSuccess('Python基础环境测试通过');
    } else {
      logWarning('Python基础环境测试部分失败');
    }

  } catch (error) {
    logWarning(`基础测试失败: ${error.message}`);
    // 不退出，继续执行Playwright测试
  }
}

/**
 * 执行Playwright测试
 */
async function runPlaywrightTests() {
  logStep('5', '执行Playwright端到端测试');
  
  return new Promise((resolve, reject) => {
    const testCommand = [
      'npx', 'playwright', 'test',
      '--config=tests/e2e/playwright.config.ts',
      `--output-dir=${CONFIG.outputDir}/artifacts`,
      '--reporter=html,json,list'
    ];

    // 添加浏览器配置
    if (CONFIG.browsers.length === 1) {
      testCommand.push(`--project=${CONFIG.browsers[0]}`);
    }

    // 添加其他配置
    if (CONFIG.headless) {
      testCommand.push('--headed=false');
    }

    if (!CONFIG.parallel) {
      testCommand.push('--workers=1');
    }

    log(`执行命令: ${testCommand.join(' ')}`, 'blue');

    const testProcess = spawn(testCommand[0], testCommand.slice(1), {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    const timeout = setTimeout(() => {
      testProcess.kill('SIGTERM');
      reject(new Error('测试执行超时'));
    }, CONFIG.testTimeout);

    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        logSuccess('Playwright测试执行完成');
        resolve(code);
      } else {
        logWarning(`Playwright测试完成，退出码: ${code}`);
        resolve(code); // 不拒绝，允许生成报告
      }
    });

    testProcess.on('error', (error) => {
      clearTimeout(timeout);
      logError(`测试执行失败: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * 生成最终报告
 */
function generateFinalReport() {
  logStep('6', '生成最终测试报告');
  
  try {
    const reportData = {
      testSuite: '智游助手v6.0全自动测试套件',
      executionTime: new Date().toISOString(),
      configuration: CONFIG,
      summary: {
        status: 'COMPLETED',
        totalDuration: 0,
        artifactsGenerated: 0
      },
      artifacts: []
    };

    // 统计生成的文件
    if (fs.existsSync(CONFIG.outputDir)) {
      const files = fs.readdirSync(CONFIG.outputDir, { recursive: true });
      reportData.summary.artifactsGenerated = files.length;
      
      files.forEach(file => {
        if (typeof file === 'string') {
          reportData.artifacts.push(file);
        }
      });
    }

    // 保存执行报告
    const reportPath = path.join(CONFIG.outputDir, 'execution-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    logSuccess(`最终报告已生成: ${reportPath}`);
    logSuccess(`测试结果目录: ${CONFIG.outputDir}`);

    // 显示重要文件
    const importantFiles = [
      'test-report.html',
      'comprehensive-test-report.json',
      'performance-benchmark-report.json'
    ];

    log('\n📋 重要报告文件:', 'bright');
    importantFiles.forEach(file => {
      const filePath = path.join(CONFIG.outputDir, file);
      if (fs.existsSync(filePath)) {
        log(`   ✅ ${file}`, 'green');
      } else {
        log(`   ❌ ${file} (未生成)`, 'red');
      }
    });

  } catch (error) {
    logError(`报告生成失败: ${error.message}`);
  }
}

/**
 * 主执行函数
 */
async function main() {
  const startTime = Date.now();
  
  try {
    logHeader('🚀 智游助手v6.0全自动端到端测试套件');
    log(`开始时间: ${new Date().toLocaleString('zh-CN')}`, 'cyan');
    log(`配置: ${JSON.stringify(CONFIG, null, 2)}`, 'blue');

    // 执行测试步骤
    checkDependencies();
    installDependencies();
    prepareTestEnvironment();
    runBasicTests();
    
    const testResult = await runPlaywrightTests();
    
    generateFinalReport();

    // 计算总耗时
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    logHeader('🎉 测试执行完成');
    log(`总耗时: ${totalTime}秒`, 'cyan');
    log(`结果目录: ${CONFIG.outputDir}`, 'cyan');
    
    if (testResult === 0) {
      logSuccess('所有测试执行成功！');
      process.exit(0);
    } else {
      logWarning('部分测试失败，请查看详细报告');
      process.exit(testResult);
    }

  } catch (error) {
    logError(`测试执行失败: ${error.message}`);
    logError(error.stack);
    process.exit(1);
  }
}

// 处理中断信号
process.on('SIGINT', () => {
  log('\n🛑 测试被用户中断', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n🛑 测试被系统终止', 'yellow');
  process.exit(143);
});

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    logError(`未捕获的错误: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, CONFIG };
