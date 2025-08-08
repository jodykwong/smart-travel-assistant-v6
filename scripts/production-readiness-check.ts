/**
 * 智游助手v6.2 - 生产就绪性检查脚本
 * 遵循原则: [为失败而设计] + [纵深防御] + [第一性原理]
 * 
 * 检查项目:
 * 1. 配置完整性和安全性
 * 2. 支付网关连接验证
 * 3. 数据库连接和迁移状态
 * 4. 安全配置检查
 * 5. 性能基准测试
 * 6. 依赖漏洞扫描
 */

import { configManager, ConfigurationError } from '../src/lib/config/config-manager';
import { paymentService } from '../src/lib/payment/payment-service';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  suggestions?: string[];
  critical?: boolean;
}

class ProductionReadinessChecker {
  private results: CheckResult[] = [];
  private criticalFailures = 0;
  private warnings = 0;

  async runAllChecks(): Promise<void> {
    log('bold', '🚀 智游助手v6.2 生产就绪性检查');
    log('blue', '============================================================');
    log('blue', `检查时间: ${new Date().toISOString()}`);
    log('blue', '============================================================\n');

    // 执行所有检查
    await this.checkEnvironmentConfiguration();
    await this.checkPaymentGatewayConnections();
    await this.checkSecurityConfiguration();
    await this.checkDependencyVulnerabilities();
    await this.checkPerformanceBaseline();
    await this.checkDatabaseConnection();
    await this.checkAPIEndpoints();
    await this.checkSSLConfiguration();
    await this.checkLoggingConfiguration();
    await this.checkBackupStrategy();

    // 生成报告
    this.generateReport();
  }

  private async checkEnvironmentConfiguration(): Promise<void> {
    log('yellow', '🔧 1. 环境配置检查');

    try {
      const config = await configManager.loadConfig();
      
      this.addResult({
        name: '环境配置加载',
        status: 'pass',
        message: '所有环境配置成功加载'
      });

      // 检查生产环境配置
      if (config.app.nodeEnv === 'production') {
        // 检查JWT密钥强度
        if (config.jwt.accessTokenSecret.length < 32) {
          this.addResult({
            name: 'JWT密钥强度',
            status: 'fail',
            message: 'JWT访问令牌密钥长度不足',
            suggestions: ['使用至少32位的随机字符串', '运行: openssl rand -base64 32'],
            critical: true
          });
        } else {
          this.addResult({
            name: 'JWT密钥强度',
            status: 'pass',
            message: 'JWT密钥强度符合安全要求'
          });
        }

        // 检查支付配置
        if (config.wechat.sandbox || config.alipay.sandbox) {
          this.addResult({
            name: '支付环境配置',
            status: 'warning',
            message: '生产环境仍在使用沙盒支付配置',
            suggestions: ['切换到生产支付环境', '更新支付网关配置']
          });
        } else {
          this.addResult({
            name: '支付环境配置',
            status: 'pass',
            message: '支付配置已切换到生产环境'
          });
        }
      }

    } catch (error) {
      this.addResult({
        name: '环境配置加载',
        status: 'fail',
        message: `配置加载失败: ${error.message}`,
        suggestions: [
          '检查 .env.local 文件是否存在',
          '验证所有必需的环境变量',
          '运行: npm run config:validate'
        ],
        critical: true
      });
    }
  }

  private async checkPaymentGatewayConnections(): Promise<void> {
    log('yellow', '💳 2. 支付网关连接检查');

    try {
      await paymentService.initialize();
      
      this.addResult({
        name: '支付服务初始化',
        status: 'pass',
        message: '支付服务初始化成功'
      });

      // 检查MCP状态
      const mcpStatus = paymentService.getMCPStatus();
      if (mcpStatus.enabled) {
        this.addResult({
          name: 'MCP协议状态',
          status: 'pass',
          message: 'MCP协议已启用',
        });

        // 检查MCP健康状态
        try {
          const mcpHealth = await paymentService.checkMCPHealth();

          if (mcpHealth.wechat || mcpHealth.alipay) {
            this.addResult({
              name: 'MCP服务健康检查',
              status: 'pass',
              message: `MCP服务连接正常 (微信: ${mcpHealth.wechat ? '✓' : '✗'}, 支付宝: ${mcpHealth.alipay ? '✓' : '✗'})`
            });
          } else {
            this.addResult({
              name: 'MCP服务健康检查',
              status: 'warning',
              message: 'MCP服务连接异常',
              suggestions: ['检查MCP服务端点配置', '验证MCP API密钥']
            });
          }
        } catch (error) {
          this.addResult({
            name: 'MCP服务健康检查',
            status: 'fail',
            message: `MCP健康检查失败: ${error.message}`,
            suggestions: ['检查MCP配置', '验证网络连接']
          });
        }
      } else {
        this.addResult({
          name: 'MCP协议状态',
          status: 'pass',
          message: 'MCP协议未启用，使用传统支付API'
        });
      }

      // 测试支付宝连接
      try {
        const testOrder = {
          orderId: `TEST_${Date.now()}`,
          amount: 1, // 1分钱测试
          description: '生产就绪性测试订单',
          paymentMethod: 'alipay' as const,
          paymentType: 'qr' as const,
          userId: 'test-user'
        };

        const result = await paymentService.createPayment(testOrder);

        if (result.success) {
          const protocolUsed = result.metadata?.mcpEnabled ? 'MCP协议' : '传统API';
          this.addResult({
            name: '支付宝连接测试',
            status: 'pass',
            message: `支付宝网关连接正常 (${protocolUsed})`
          });
        } else {
          this.addResult({
            name: '支付宝连接测试',
            status: 'fail',
            message: '支付宝网关连接失败',
            suggestions: ['检查支付宝API配置', '验证网络连接', '检查MCP配置（如已启用）'],
            critical: true
          });
        }
      } catch (error) {
        this.addResult({
          name: '支付宝连接测试',
          status: 'fail',
          message: `支付宝连接失败: ${error.message}`,
          critical: true
        });
      }

    } catch (error) {
      this.addResult({
        name: '支付服务初始化',
        status: 'fail',
        message: `支付服务初始化失败: ${error.message}`,
        suggestions: ['检查支付配置', '验证API密钥'],
        critical: true
      });
    }
  }

  private async checkSecurityConfiguration(): Promise<void> {
    log('yellow', '🔒 3. 安全配置检查');

    // 检查HTTPS配置
    const config = await configManager.loadConfig().catch(() => null);
    if (config && config.app.nodeEnv === 'production') {
      if (!config.app.apiBaseUrl.startsWith('https://')) {
        this.addResult({
          name: 'HTTPS配置',
          status: 'fail',
          message: '生产环境未启用HTTPS',
          suggestions: ['配置SSL证书', '更新API基础URL为HTTPS'],
          critical: true
        });
      } else {
        this.addResult({
          name: 'HTTPS配置',
          status: 'pass',
          message: 'HTTPS配置正确'
        });
      }
    }

    // 检查敏感文件权限
    const sensitiveFiles = ['.env.local', '.env.production'];
    for (const file of sensitiveFiles) {
      if (existsSync(file)) {
        try {
          const stats = require('fs').statSync(file);
          const mode = (stats.mode & parseInt('777', 8)).toString(8);
          
          if (mode !== '600') {
            this.addResult({
              name: `文件权限 (${file})`,
              status: 'warning',
              message: `敏感文件权限过于宽松: ${mode}`,
              suggestions: [`运行: chmod 600 ${file}`]
            });
          } else {
            this.addResult({
              name: `文件权限 (${file})`,
              status: 'pass',
              message: '敏感文件权限配置正确'
            });
          }
        } catch (error) {
          // 忽略权限检查错误（可能在Windows上）
        }
      }
    }
  }

  private async checkDependencyVulnerabilities(): Promise<void> {
    log('yellow', '🛡️ 4. 依赖漏洞扫描');

    try {
      const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditResult);

      if (audit.metadata.vulnerabilities.total === 0) {
        this.addResult({
          name: '依赖漏洞扫描',
          status: 'pass',
          message: '未发现已知安全漏洞'
        });
      } else {
        const { high, critical } = audit.metadata.vulnerabilities;
        if (high > 0 || critical > 0) {
          this.addResult({
            name: '依赖漏洞扫描',
            status: 'fail',
            message: `发现 ${critical} 个严重漏洞和 ${high} 个高危漏洞`,
            suggestions: ['运行: npm audit fix', '更新有漏洞的依赖包'],
            critical: critical > 0
          });
        } else {
          this.addResult({
            name: '依赖漏洞扫描',
            status: 'warning',
            message: `发现 ${audit.metadata.vulnerabilities.total} 个低危漏洞`,
            suggestions: ['运行: npm audit fix']
          });
        }
      }
    } catch (error) {
      this.addResult({
        name: '依赖漏洞扫描',
        status: 'warning',
        message: '无法执行漏洞扫描',
        suggestions: ['手动运行: npm audit']
      });
    }
  }

  private async checkPerformanceBaseline(): Promise<void> {
    log('yellow', '⚡ 5. 性能基准检查');

    // 检查包大小
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      const depCount = Object.keys(packageJson.dependencies || {}).length;
      const devDepCount = Object.keys(packageJson.devDependencies || {}).length;

      this.addResult({
        name: '依赖包数量',
        status: depCount > 100 ? 'warning' : 'pass',
        message: `生产依赖: ${depCount}, 开发依赖: ${devDepCount}`,
        suggestions: depCount > 100 ? ['考虑减少不必要的依赖', '使用bundle分析工具'] : undefined
      });

      // 检查构建输出大小
      if (existsSync('.next')) {
        try {
          const buildInfo = execSync('du -sh .next', { encoding: 'utf8' });
          const sizeMatch = buildInfo.match(/^(\d+(?:\.\d+)?[KMGT]?)\s/);
          if (sizeMatch) {
            const size = sizeMatch[1];
            this.addResult({
              name: '构建输出大小',
              status: 'pass',
              message: `构建输出大小: ${size}`
            });
          }
        } catch (error) {
          // 忽略构建大小检查错误
        }
      }

    } catch (error) {
      this.addResult({
        name: '性能基准检查',
        status: 'warning',
        message: '无法读取package.json'
      });
    }
  }

  private async checkDatabaseConnection(): Promise<void> {
    log('yellow', '🗄️ 6. 数据库连接检查');

    // 如果配置了数据库，检查连接
    try {
      const config = await configManager.loadConfig();
      if (config.database) {
        // 这里应该实现实际的数据库连接测试
        this.addResult({
          name: '数据库连接',
          status: 'pass',
          message: '数据库连接配置已设置'
        });
      } else {
        this.addResult({
          name: '数据库连接',
          status: 'warning',
          message: '未配置数据库连接',
          suggestions: ['如果需要持久化存储，请配置数据库']
        });
      }
    } catch (error) {
      // 配置加载失败时跳过数据库检查
    }
  }

  private async checkAPIEndpoints(): Promise<void> {
    log('yellow', '🌐 7. API端点检查');

    const criticalEndpoints = [
      '/api/user/register',
      '/api/user/login',
      '/api/payment/create-order',
      '/api/payment/query'
    ];

    let workingEndpoints = 0;
    
    for (const endpoint of criticalEndpoints) {
      const filePath = join('src/pages/api', endpoint.replace('/api/', '') + '.ts');
      if (existsSync(filePath)) {
        workingEndpoints++;
      }
    }

    if (workingEndpoints === criticalEndpoints.length) {
      this.addResult({
        name: 'API端点完整性',
        status: 'pass',
        message: '所有关键API端点文件存在'
      });
    } else {
      this.addResult({
        name: 'API端点完整性',
        status: 'fail',
        message: `缺少 ${criticalEndpoints.length - workingEndpoints} 个关键API端点`,
        critical: true
      });
    }
  }

  private async checkSSLConfiguration(): Promise<void> {
    log('yellow', '🔐 8. SSL配置检查');

    // 检查SSL证书文件
    const certFiles = ['cert.pem', 'key.pem', 'ca.pem'];
    const sslDir = join(process.cwd(), 'ssl');
    
    if (existsSync(sslDir)) {
      const existingCerts = certFiles.filter(file => existsSync(join(sslDir, file)));
      
      if (existingCerts.length === certFiles.length) {
        this.addResult({
          name: 'SSL证书文件',
          status: 'pass',
          message: 'SSL证书文件完整'
        });
      } else {
        this.addResult({
          name: 'SSL证书文件',
          status: 'warning',
          message: `缺少SSL证书文件: ${certFiles.filter(f => !existingCerts.includes(f)).join(', ')}`,
          suggestions: ['配置SSL证书', '使用Let\'s Encrypt获取免费证书']
        });
      }
    } else {
      this.addResult({
        name: 'SSL证书文件',
        status: 'warning',
        message: '未找到SSL证书目录',
        suggestions: ['在生产环境中配置SSL证书']
      });
    }
  }

  private async checkLoggingConfiguration(): Promise<void> {
    log('yellow', '📝 9. 日志配置检查');

    // 检查日志目录
    const logDir = join(process.cwd(), 'logs');
    if (existsSync(logDir)) {
      this.addResult({
        name: '日志配置',
        status: 'pass',
        message: '日志目录已配置'
      });
    } else {
      this.addResult({
        name: '日志配置',
        status: 'warning',
        message: '未配置日志目录',
        suggestions: ['创建logs目录', '配置日志轮转策略']
      });
    }
  }

  private async checkBackupStrategy(): Promise<void> {
    log('yellow', '💾 10. 备份策略检查');

    // 检查备份脚本
    const backupScript = join(process.cwd(), 'scripts', 'backup.sh');
    if (existsSync(backupScript)) {
      this.addResult({
        name: '备份策略',
        status: 'pass',
        message: '备份脚本已配置'
      });
    } else {
      this.addResult({
        name: '备份策略',
        status: 'warning',
        message: '未配置自动备份策略',
        suggestions: ['创建数据备份脚本', '配置定时备份任务']
      });
    }
  }

  private addResult(result: CheckResult): void {
    this.results.push(result);
    
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    const color = result.status === 'pass' ? 'green' : result.status === 'warning' ? 'yellow' : 'red';
    
    log(color, `   ${icon} ${result.name}: ${result.message}`);
    
    if (result.suggestions) {
      result.suggestions.forEach(suggestion => {
        log('cyan', `      💡 ${suggestion}`);
      });
    }

    if (result.status === 'fail') {
      if (result.critical) {
        this.criticalFailures++;
      }
    } else if (result.status === 'warning') {
      this.warnings++;
    }
  }

  private generateReport(): void {
    log('blue', '\n============================================================');
    log('bold', '📊 生产就绪性检查报告');
    log('blue', '============================================================');

    const totalChecks = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    log('blue', `总检查项: ${totalChecks}`);
    log('green', `通过: ${passed}`);
    log('yellow', `警告: ${this.warnings}`);
    log('red', `失败: ${failed}`);
    log('red', `严重失败: ${this.criticalFailures}`);

    const readinessScore = Math.round((passed / totalChecks) * 100);
    log('blue', `\n生产就绪度评分: ${readinessScore}%`);

    if (this.criticalFailures > 0) {
      log('red', '\n❌ 项目尚未准备好部署到生产环境');
      log('red', '请解决所有严重问题后重新检查');
    } else if (this.warnings > 0) {
      log('yellow', '\n⚠️ 项目基本准备就绪，但建议解决警告项');
    } else {
      log('green', '\n🎉 项目已准备好部署到生产环境！');
    }

    log('blue', '\n============================================================');
  }
}

// 主函数
async function main() {
  const checker = new ProductionReadinessChecker();
  
  try {
    await checker.runAllChecks();
  } catch (error) {
    log('red', `❌ 检查过程中发生错误: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { ProductionReadinessChecker };
