import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 环境配置验证测试套件
 * 验证.env文件配置和基础环境
 */
test.describe('环境配置验证', () => {
  let testResults: any = {};

  test.beforeAll(async () => {
    console.log('🔧 开始环境配置验证测试');
    testResults = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
  });

  test.afterAll(async () => {
    // 保存测试结果
    const resultsPath = path.join(process.cwd(), 'test-results', 'environment-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`📊 环境测试结果已保存到: ${resultsPath}`);
  });

  test('验证.env文件存在且格式正确', async () => {
    const envPath = path.join(process.cwd(), '.env');
    
    // 检查.env文件是否存在
    expect(fs.existsSync(envPath), '.env文件应该存在').toBeTruthy();
    
    // 读取并解析.env文件
    const envContent = fs.readFileSync(envPath, 'utf8');
    expect(envContent.length, '.env文件不应为空').toBeGreaterThan(0);
    
    // 检查关键配置项
    const requiredKeys = [
      'DEEPSEEK_API_KEY',
      'AMAP_MCP_API_KEY',
      'NEXT_PUBLIC_APP_URL'
    ];
    
    const envLines = envContent.split('\n').filter(line => 
      line.trim() && !line.trim().startsWith('#')
    );
    
    const envKeys = envLines.map(line => line.split('=')[0].trim());
    
    for (const key of requiredKeys) {
      expect(envKeys.includes(key), `环境变量 ${key} 应该存在`).toBeTruthy();
    }

    testResults.tests.envFile = {
      success: true,
      keysFound: envKeys.length,
      requiredKeysPresent: requiredKeys.every(key => envKeys.includes(key))
    };
  });

  test('验证API密钥格式正确', async () => {
    const apiKeyTests = {
      deepseek: {
        key: process.env.DEEPSEEK_API_KEY,
        valid: false,
        format: 'sk-*'
      },
      siliconflow: {
        key: process.env.SILICONFLOW_API_KEY,
        valid: false,
        format: 'sk-*'
      },
      amapMcp: {
        key: process.env.AMAP_MCP_API_KEY,
        valid: false,
        format: '32位字符串'
      }
    };

    // 验证DeepSeek API密钥格式
    if (apiKeyTests.deepseek.key) {
      apiKeyTests.deepseek.valid = apiKeyTests.deepseek.key.startsWith('sk-') && 
                                   apiKeyTests.deepseek.key.length > 10;
      expect(apiKeyTests.deepseek.valid, 'DeepSeek API密钥格式应正确').toBeTruthy();
    }

    // 验证硅基流动API密钥格式
    if (apiKeyTests.siliconflow.key) {
      apiKeyTests.siliconflow.valid = apiKeyTests.siliconflow.key.startsWith('sk-') && 
                                      apiKeyTests.siliconflow.key.length > 10;
      expect(apiKeyTests.siliconflow.valid, '硅基流动API密钥格式应正确').toBeTruthy();
    }

    // 验证高德MCP API密钥格式
    if (apiKeyTests.amapMcp.key) {
      apiKeyTests.amapMcp.valid = apiKeyTests.amapMcp.key.length === 32 && 
                                  /^[a-f0-9]+$/.test(apiKeyTests.amapMcp.key);
      expect(apiKeyTests.amapMcp.valid, '高德MCP API密钥格式应正确').toBeTruthy();
    }

    testResults.tests.apiKeyFormats = apiKeyTests;
  });

  test('验证Python环境和依赖', async () => {
    let pythonVersion = '';
    let pythonPath = '';
    let requiredPackages: Record<string, boolean> = {};

    try {
      // 检查Python版本
      pythonVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
      pythonPath = execSync('which python3', { encoding: 'utf8' }).trim();
      
      expect(pythonVersion, 'Python应该可用').toContain('Python 3.');

      // 检查必需的Python包
      const packages = ['jupyter', 'openai', 'tiktoken', 'python-dotenv'];
      
      for (const pkg of packages) {
        try {
          execSync(`python3 -c "import ${pkg.replace('-', '_')}"`, { stdio: 'pipe' });
          requiredPackages[pkg] = true;
        } catch {
          requiredPackages[pkg] = false;
        }
      }

      // 至少应该有基础包可用
      const availablePackages = Object.values(requiredPackages).filter(Boolean).length;
      expect(availablePackages, '至少应该有一些Python包可用').toBeGreaterThan(0);

    } catch (error) {
      console.warn('Python环境检查失败:', error);
    }

    testResults.tests.pythonEnvironment = {
      version: pythonVersion,
      path: pythonPath,
      packages: requiredPackages
    };
  });

  test('验证Node.js环境和依赖', async () => {
    // 检查Node.js版本
    const nodeVersion = process.version;
    expect(nodeVersion, 'Node.js版本应该是v18+').toMatch(/^v(18|19|20|21)\./);

    // 检查package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    expect(fs.existsSync(packageJsonPath), 'package.json应该存在').toBeTruthy();

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // 检查关键依赖
    const criticalDeps = ['next', 'react', '@playwright/test'];
    const missingDeps: string[] = [];

    for (const dep of criticalDeps) {
      if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
        missingDeps.push(dep);
      }
    }

    expect(missingDeps.length, `关键依赖缺失: ${missingDeps.join(', ')}`).toBe(0);

    testResults.tests.nodeEnvironment = {
      version: nodeVersion,
      packageJson: {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length
      },
      missingDependencies: missingDeps
    };
  });

  test('验证测试脚本可执行', async () => {
    const testScripts = [
      'simple_test.py',
      'test_deepseek_connection.py'
    ];

    const scriptResults: Record<string, any> = {};

    for (const script of testScripts) {
      const scriptPath = path.join(process.cwd(), script);
      
      if (fs.existsSync(scriptPath)) {
        try {
          // 尝试执行测试脚本
          const output = execSync(`python3 ${scriptPath}`, { 
            encoding: 'utf8',
            timeout: 30000 
          });
          
          scriptResults[script] = {
            exists: true,
            executable: true,
            output: output.substring(0, 500) // 限制输出长度
          };
        } catch (error) {
          scriptResults[script] = {
            exists: true,
            executable: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      } else {
        scriptResults[script] = {
          exists: false,
          executable: false,
          error: '文件不存在'
        };
      }
    }

    // 至少应该有一个测试脚本可用
    const executableScripts = Object.values(scriptResults).filter(
      (result: any) => result.executable
    ).length;
    
    expect(executableScripts, '至少应该有一个测试脚本可执行').toBeGreaterThan(0);

    testResults.tests.testScripts = scriptResults;
  });

  test('验证Jupyter Notebook文件', async () => {
    const notebookFiles = [
      '01_langgraph_architecture.ipynb',
      '02_amap_integration.ipynb',
      '03_intelligent_planning.ipynb',
      '04_complete_integration_test.ipynb'
    ];

    const notebookResults: Record<string, any> = {};

    for (const notebook of notebookFiles) {
      const notebookPath = path.join(process.cwd(), notebook);
      
      if (fs.existsSync(notebookPath)) {
        try {
          const content = fs.readFileSync(notebookPath, 'utf8');
          const notebookData = JSON.parse(content);
          
          notebookResults[notebook] = {
            exists: true,
            valid: true,
            cells: notebookData.cells?.length || 0,
            metadata: !!notebookData.metadata
          };
        } catch (error) {
          notebookResults[notebook] = {
            exists: true,
            valid: false,
            error: 'JSON格式无效'
          };
        }
      } else {
        notebookResults[notebook] = {
          exists: false,
          valid: false,
          error: '文件不存在'
        };
      }
    }

    // 所有Notebook文件都应该存在且有效
    const validNotebooks = Object.values(notebookResults).filter(
      (result: any) => result.valid
    ).length;
    
    expect(validNotebooks, '所有Notebook文件都应该有效').toBe(notebookFiles.length);

    testResults.tests.notebookFiles = notebookResults;
  });
});
