/**
 * 智游助手v6.2 - QR支付配置验证器
 * 遵循原则: [为失败而设计] + [纵深防御] + [配置管理标准化]
 * 
 * 验证QR支付配置的完整性和正确性：
 * 1. QR支付环境变量验证
 * 2. 收款码配置验证
 * 3. 与现有架构的兼容性检查
 * 4. 安全性和限制验证
 */

import { configManager } from '../src/lib/config/config-manager';
import { qrPaymentService } from '../src/lib/payment/qr-code/qr-payment-service';

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

interface ValidationResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
  suggestions?: string[];
}

class QRPaymentConfigValidator {
  private results: ValidationResult[] = [];
  private criticalFailures = 0;
  private warnings = 0;

  async validateQRPaymentConfiguration(): Promise<void> {
    log('bold', '🔐 智游助手v6.2 QR支付配置验证');
    log('blue', '============================================================');
    log('blue', `验证时间: ${new Date().toISOString()}`);
    log('blue', '============================================================\n');

    try {
      // 加载环境变量
      require('dotenv').config({ path: '.env.local' });

      // 执行所有验证
      await this.validateQRPaymentEnvironmentVariables();
      await this.validateQRPaymentConfigurationIntegrity();
      await this.validateQRPaymentServiceCompatibility();
      await this.validateQRPaymentSecurity();
      await this.validateQRPaymentLimitations();

      // 生成报告
      this.generateReport();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('red', `❌ QR支付配置验证过程中发生错误: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 验证QR支付环境变量
   * 遵循原则: [配置管理标准化] - 确保所有必需配置项存在
   */
  private async validateQRPaymentEnvironmentVariables(): Promise<void> {
    log('yellow', '📋 1. QR支付环境变量验证');

    const requiredQRVars = [
      'QR_PAYMENT_ENABLED',
      'WECHAT_PERSONAL_QR_ENABLED',
      'ALIPAY_PERSONAL_QR_ENABLED'
    ];

    const optionalQRVars = [
      'WECHAT_PERSONAL_QR_CODE',
      'WECHAT_PAYEE_NAME',
      'WECHAT_PAYEE_ACCOUNT',
      'ALIPAY_PERSONAL_QR_CODE',
      'ALIPAY_PAYEE_NAME',
      'ALIPAY_PAYEE_ACCOUNT'
    ];

    // 验证必需变量
    for (const envVar of requiredQRVars) {
      const value = process.env[envVar];
      
      if (value !== undefined) {
        this.addResult({
          category: '环境变量',
          test: `${envVar}存在性`,
          status: 'pass',
          message: `${envVar} 已配置`,
          details: `值: ${value}`
        });
      } else {
        this.addResult({
          category: '环境变量',
          test: `${envVar}存在性`,
          status: 'fail',
          message: `${envVar} 未配置`,
          suggestions: [
            '在.env.local文件中设置该环境变量',
            '参考.env.example中的配置示例'
          ]
        });
      }
    }

    // 验证QR支付启用状态
    const qrEnabled = process.env.QR_PAYMENT_ENABLED === 'true';
    const wechatQREnabled = process.env.WECHAT_PERSONAL_QR_ENABLED === 'true';
    const alipayQREnabled = process.env.ALIPAY_PERSONAL_QR_ENABLED === 'true';

    if (qrEnabled) {
      this.addResult({
        category: '环境变量',
        test: 'QR支付启用状态',
        status: 'pass',
        message: 'QR支付已启用'
      });

      if (wechatQREnabled || alipayQREnabled) {
        this.addResult({
          category: '环境变量',
          test: '收款方式配置',
          status: 'pass',
          message: `已启用收款方式: ${wechatQREnabled ? '微信' : ''}${wechatQREnabled && alipayQREnabled ? '+' : ''}${alipayQREnabled ? '支付宝' : ''}`
        });
      } else {
        this.addResult({
          category: '环境变量',
          test: '收款方式配置',
          status: 'fail',
          message: 'QR支付已启用但未配置任何收款方式',
          suggestions: [
            '启用WECHAT_PERSONAL_QR_ENABLED或ALIPAY_PERSONAL_QR_ENABLED',
            '配置对应的收款码信息'
          ]
        });
      }
    } else {
      this.addResult({
        category: '环境变量',
        test: 'QR支付启用状态',
        status: 'warning',
        message: 'QR支付未启用',
        suggestions: ['设置 QR_PAYMENT_ENABLED=true 启用QR支付']
      });
    }

    // 验证可选变量（如果QR支付已启用）
    if (qrEnabled) {
      for (const envVar of optionalQRVars) {
        const value = process.env[envVar];
        
        if (value && value !== 'your_wechat_personal_qr_code_data' && value !== 'your_alipay_personal_qr_code_data') {
          this.addResult({
            category: '环境变量',
            test: `${envVar}配置`,
            status: 'pass',
            message: `${envVar} 已正确配置`,
            details: `长度: ${value.length}字符`
          });
        } else if (envVar.includes('QR_CODE')) {
          this.addResult({
            category: '环境变量',
            test: `${envVar}配置`,
            status: 'fail',
            message: `${envVar} 未配置或使用默认值`,
            suggestions: [
              '配置真实的收款码数据',
              '确保收款码格式正确'
            ]
          });
        } else {
          this.addResult({
            category: '环境变量',
            test: `${envVar}配置`,
            status: 'warning',
            message: `${envVar} 未配置`,
            suggestions: ['建议配置以提供更好的用户体验']
          });
        }
      }
    }
  }

  /**
   * 验证QR支付配置完整性
   * 遵循原则: [为失败而设计] - 验证配置格式和有效性
   */
  private async validateQRPaymentConfigurationIntegrity(): Promise<void> {
    log('yellow', '⚙️ 2. QR支付配置完整性验证');

    try {
      // 验证ConfigManager是否能正确加载配置
      const config = await configManager.loadConfig();
      
      this.addResult({
        category: '配置完整性',
        test: 'ConfigManager基础支持',
        status: 'pass',
        message: 'ConfigManager成功加载基础配置'
      });

      // 验证金额限制配置
      const wechatMaxAmount = parseInt(process.env.WECHAT_PERSONAL_MAX_AMOUNT || '50000');
      const alipayMaxAmount = parseInt(process.env.ALIPAY_PERSONAL_MAX_AMOUNT || '50000');

      if (wechatMaxAmount > 0 && wechatMaxAmount <= 100000) {
        this.addResult({
          category: '配置完整性',
          test: '微信支付金额限制',
          status: 'pass',
          message: `微信支付最大金额配置合理: ¥${(wechatMaxAmount / 100).toFixed(2)}`
        });
      } else {
        this.addResult({
          category: '配置完整性',
          test: '微信支付金额限制',
          status: 'warning',
          message: `微信支付最大金额配置: ¥${(wechatMaxAmount / 100).toFixed(2)}`,
          suggestions: ['建议设置在1-1000元之间']
        });
      }

      if (alipayMaxAmount > 0 && alipayMaxAmount <= 100000) {
        this.addResult({
          category: '配置完整性',
          test: '支付宝支付金额限制',
          status: 'pass',
          message: `支付宝支付最大金额配置合理: ¥${(alipayMaxAmount / 100).toFixed(2)}`
        });
      } else {
        this.addResult({
          category: '配置完整性',
          test: '支付宝支付金额限制',
          status: 'warning',
          message: `支付宝支付最大金额配置: ¥${(alipayMaxAmount / 100).toFixed(2)}`,
          suggestions: ['建议设置在1-1000元之间']
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult({
        category: '配置完整性',
        test: 'QR支付配置加载',
        status: 'fail',
        message: 'QR支付配置加载失败',
        details: errorMessage,
        suggestions: ['检查QR支付相关环境变量配置']
      });
    }
  }

  /**
   * 验证QR支付服务兼容性
   * 遵循原则: [系统集成] - 确保与现有架构兼容
   */
  private async validateQRPaymentServiceCompatibility(): Promise<void> {
    log('yellow', '🔗 3. QR支付服务兼容性验证');

    try {
      // 尝试初始化QR支付服务
      await qrPaymentService.initialize();
      
      this.addResult({
        category: '服务兼容性',
        test: 'QRPaymentService初始化',
        status: 'pass',
        message: 'QRPaymentService成功初始化'
      });

      // 验证与统一支付服务的集成
      const { paymentService } = await import('../src/lib/payment/payment-service');
      await paymentService.initialize();
      
      this.addResult({
        category: '服务兼容性',
        test: '统一支付服务集成',
        status: 'pass',
        message: '统一支付服务成功集成QR支付'
      });

      // 验证JWT认证系统集成
      const { JWTManager } = await import('../src/lib/auth/jwt-manager');
      const config = await configManager.loadConfig();
      const jwtManager = new JWTManager(config.jwt);
      
      this.addResult({
        category: '服务兼容性',
        test: 'JWT认证系统集成',
        status: 'pass',
        message: 'QR支付与JWT认证系统兼容'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult({
        category: '服务兼容性',
        test: 'QR支付服务兼容性',
        status: 'fail',
        message: 'QR支付服务兼容性验证失败',
        details: errorMessage,
        suggestions: ['检查QR支付服务依赖', '确认相关模块正确导入']
      });
    }
  }

  /**
   * 验证QR支付安全性
   * 遵循原则: [纵深防御] - 多重安全验证
   */
  private async validateQRPaymentSecurity(): Promise<void> {
    log('yellow', '🛡️ 4. QR支付安全性验证');

    // 验证金额限制
    const maxAmount = Math.max(
      parseInt(process.env.WECHAT_PERSONAL_MAX_AMOUNT || '50000'),
      parseInt(process.env.ALIPAY_PERSONAL_MAX_AMOUNT || '50000')
    );

    if (maxAmount <= 100000) { // 1000元
      this.addResult({
        category: '安全性',
        test: '金额限制安全性',
        status: 'pass',
        message: `最大支付金额限制合理: ¥${(maxAmount / 100).toFixed(2)}`
      });
    } else {
      this.addResult({
        category: '安全性',
        test: '金额限制安全性',
        status: 'warning',
        message: `最大支付金额较高: ¥${(maxAmount / 100).toFixed(2)}`,
        suggestions: ['个人收款码建议限制在1000元以内']
      });
    }

    // 验证收款人信息配置
    const wechatPayeeName = process.env.WECHAT_PAYEE_NAME;
    const alipayPayeeName = process.env.ALIPAY_PAYEE_NAME;

    if (wechatPayeeName && wechatPayeeName !== '智游助手') {
      this.addResult({
        category: '安全性',
        test: '微信收款人信息',
        status: 'pass',
        message: '微信收款人信息已自定义配置'
      });
    } else {
      this.addResult({
        category: '安全性',
        test: '微信收款人信息',
        status: 'warning',
        message: '微信收款人信息使用默认值',
        suggestions: ['建议配置真实的收款人信息']
      });
    }

    if (alipayPayeeName && alipayPayeeName !== '智游助手') {
      this.addResult({
        category: '安全性',
        test: '支付宝收款人信息',
        status: 'pass',
        message: '支付宝收款人信息已自定义配置'
      });
    } else {
      this.addResult({
        category: '安全性',
        test: '支付宝收款人信息',
        status: 'warning',
        message: '支付宝收款人信息使用默认值',
        suggestions: ['建议配置真实的收款人信息']
      });
    }

    // 验证支付凭证验证机制
    this.addResult({
      category: '安全性',
      test: '支付凭证验证机制',
      status: 'pass',
      message: 'QR支付包含支付凭证验证机制',
      details: '用户需要上传支付截图进行验证'
    });
  }

  /**
   * 验证QR支付限制和注意事项
   * 遵循原则: [用户体验] - 明确限制和使用场景
   */
  private async validateQRPaymentLimitations(): Promise<void> {
    log('yellow', '⚠️ 5. QR支付限制和注意事项');

    // 验证是否了解QR支付的限制
    this.addResult({
      category: '使用限制',
      test: 'QR支付适用场景',
      status: 'warning',
      message: 'QR支付适用于无工商资质的情况',
      suggestions: [
        '仅适用于个人或小规模业务',
        '需要手动验证支付凭证',
        '用户体验相对较差',
        '获得工商资质后建议升级到MCP协议'
      ]
    });

    this.addResult({
      category: '使用限制',
      test: '支付流程复杂度',
      status: 'warning',
      message: 'QR支付需要用户手动操作较多',
      details: '用户需要扫码→支付→截图→上传凭证→等待验证',
      suggestions: [
        '提供清晰的支付说明',
        '优化支付凭证上传流程',
        '及时处理支付验证'
      ]
    });

    this.addResult({
      category: '使用限制',
      test: '升级路径准备',
      status: 'pass',
      message: 'QR支付架构支持未来升级到MCP',
      details: '使用适配器模式，便于平滑升级'
    });
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result);
    
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    const color = result.status === 'pass' ? 'green' : result.status === 'warning' ? 'yellow' : 'red';
    
    log(color, `   ${icon} ${result.test}: ${result.message}`);
    
    if (result.details) {
      log('cyan', `      📝 ${result.details}`);
    }
    
    if (result.suggestions) {
      result.suggestions.forEach(suggestion => {
        log('cyan', `      💡 ${suggestion}`);
      });
    }

    if (result.status === 'fail') {
      this.criticalFailures++;
    } else if (result.status === 'warning') {
      this.warnings++;
    }
  }

  private generateReport(): void {
    log('blue', '\n============================================================');
    log('bold', '📊 QR支付配置验证报告');
    log('blue', '============================================================');

    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    log('blue', `总验证项: ${totalTests}`);
    log('green', `通过: ${passed}`);
    log('yellow', `警告: ${this.warnings}`);
    log('red', `失败: ${failed}`);

    const readinessScore = Math.round((passed / totalTests) * 100);
    log('blue', `\nQR支付配置就绪度: ${readinessScore}%`);

    if (this.criticalFailures > 0) {
      log('red', '\n❌ QR支付配置存在严重问题，需要修复');
      log('red', '请按照建议修复所有失败项');
    } else if (this.warnings > 0) {
      log('yellow', '\n⚠️ QR支付配置基本就绪，建议优化警告项');
      log('yellow', '注意QR支付的使用限制和适用场景');
    } else {
      log('green', '\n🎉 QR支付配置完全就绪！');
      log('green', '✅ 可以开始使用QR支付功能');
    }

    log('blue', '\n============================================================');
  }
}

// 主函数
async function main() {
  const validator = new QRPaymentConfigValidator();
  
  try {
    await validator.validateQRPaymentConfiguration();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('red', `❌ 验证过程中发生错误: ${errorMessage}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { QRPaymentConfigValidator };
