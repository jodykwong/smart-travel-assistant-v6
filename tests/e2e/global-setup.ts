import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 智游助手v6.0 全局测试设置
 * 在所有测试开始前执行的初始化工作
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 开始智游助手v6.0全自动测试套件');
  console.log('============================================================');

  const setupResults = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
    baseUrl: config.projects[0].use?.baseURL || 'http://localhost:3000',
    results: {} as Record<string, any>
  };

  try {
    // 1. 环境配置验证
    console.log('🔧 步骤1: 验证环境配置...');
    const envValidation = await validateEnvironment();
    setupResults.results.environment = envValidation;
    
    if (!envValidation.success) {
      throw new Error(`环境配置验证失败: ${envValidation.errors.join(', ')}`);
    }

    // 2. API连接测试
    console.log('🌐 步骤2: 测试API连接...');
    const apiTests = await testAPIConnections();
    setupResults.results.apiConnections = apiTests;

    // 3. 依赖检查
    console.log('📦 步骤3: 检查依赖包...');
    const dependencyCheck = await checkDependencies();
    setupResults.results.dependencies = dependencyCheck;

    // 4. 创建测试目录
    console.log('📁 步骤4: 创建测试目录...');
    createTestDirectories();

    // 5. 启动服务检查
    console.log('🖥️ 步骤5: 检查服务状态...');
    const serviceCheck = await checkServices();
    setupResults.results.services = serviceCheck;

    // 保存设置结果
    const resultsPath = path.join(process.cwd(), 'test-results', 'setup-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(setupResults, null, 2));

    console.log('✅ 全局设置完成');
    console.log(`📊 设置结果已保存到: ${resultsPath}`);

  } catch (error) {
    console.error('❌ 全局设置失败:', error);
    
    // 保存错误信息
    setupResults.results.error = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    
    const resultsPath = path.join(process.cwd(), 'test-results', 'setup-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(setupResults, null, 2));
    
    throw error;
  }
}

/**
 * 验证环境配置
 */
async function validateEnvironment() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查必需的环境变量
  const requiredEnvVars = [
    'DEEPSEEK_API_KEY',
    'AMAP_MCP_API_KEY',
    'NEXT_PUBLIC_APP_URL'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`缺少环境变量: ${envVar}`);
    }
  }

  // 检查可选的环境变量
  const optionalEnvVars = [
    'SILICONFLOW_API_KEY',
    'REDIS_URL',
    'DATABASE_URL'
  ];

  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(`可选环境变量未设置: ${envVar}`);
    }
  }

  // 检查.env文件
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    errors.push('.env文件不存在');
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    envVarsChecked: requiredEnvVars.length + optionalEnvVars.length,
    envVarsValid: requiredEnvVars.length - errors.length
  };
}

/**
 * 测试API连接
 */
async function testAPIConnections() {
  const results = {
    deepseek: { success: false, responseTime: 0, error: null as string | null },
    siliconflow: { success: false, responseTime: 0, error: null as string | null },
    amapMcp: { success: false, responseTime: 0, error: null as string | null }
  };

  // 测试DeepSeek API
  try {
    const startTime = Date.now();
    // 这里应该调用实际的API测试
    // 暂时模拟测试
    await new Promise(resolve => setTimeout(resolve, 100));
    results.deepseek.responseTime = Date.now() - startTime;
    results.deepseek.success = !!process.env.DEEPSEEK_API_KEY;
  } catch (error) {
    results.deepseek.error = error instanceof Error ? error.message : String(error);
  }

  // 测试硅基流动API
  try {
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    results.siliconflow.responseTime = Date.now() - startTime;
    results.siliconflow.success = !!process.env.SILICONFLOW_API_KEY;
  } catch (error) {
    results.siliconflow.error = error instanceof Error ? error.message : String(error);
  }

  // 测试高德MCP API
  try {
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    results.amapMcp.responseTime = Date.now() - startTime;
    results.amapMcp.success = !!process.env.AMAP_MCP_API_KEY;
  } catch (error) {
    results.amapMcp.error = error instanceof Error ? error.message : String(error);
  }

  return results;
}

/**
 * 检查依赖包
 */
async function checkDependencies() {
  try {
    // 检查Node.js版本
    const nodeVersion = process.version;
    
    // 检查npm包
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // 检查关键依赖
    const criticalDeps = [
      '@playwright/test',
      'next',
      'react',
      'typescript'
    ];

    const missingDeps = criticalDeps.filter(dep => 
      !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
    );

    return {
      success: missingDeps.length === 0,
      nodeVersion,
      missingDependencies: missingDeps,
      totalDependencies: Object.keys(packageJson.dependencies || {}).length +
                        Object.keys(packageJson.devDependencies || {}).length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 创建测试目录
 */
function createTestDirectories() {
  const directories = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'test-results/html-report',
    'test-results/artifacts'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

/**
 * 检查服务状态
 */
async function checkServices() {
  const results = {
    nextjs: { running: false, port: 3000, error: null as string | null },
    jupyter: { available: false, error: null as string | null }
  };

  // 检查Next.js服务
  try {
    const response = await fetch('http://localhost:3000/api/health').catch(() => null);
    results.nextjs.running = response?.ok || false;
  } catch (error) {
    results.nextjs.error = error instanceof Error ? error.message : String(error);
  }

  // 检查Jupyter是否可用
  try {
    execSync('jupyter --version', { stdio: 'pipe' });
    results.jupyter.available = true;
  } catch (error) {
    results.jupyter.error = 'Jupyter未安装或不可用';
  }

  return results;
}

export default globalSetup;
