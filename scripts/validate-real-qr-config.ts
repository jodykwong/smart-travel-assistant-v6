/**
 * 智游助手v6.2 - 真实收款码配置验证器
 * 遵循原则: [为失败而设计] + [用户体验优先] + [安全验证]
 * 
 * 快速验证真实收款码配置的有效性和安全性
 */

import * as fs from 'fs';
import * as path from 'path';

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

class RealQRConfigValidator {
  private results: ValidationResult[] = [];
  private criticalFailures = 0;
  private warnings = 0;
  private envLocalPath: string;

  constructor() {
    this.envLocalPath = path.join(process.cwd(), '.env.local');
  }

  async validateRealQRConfiguration(): Promise<void> {
    log('bold', '🔍 智游助手v6.2 真实收款码配置验证器');
    log('blue', '============================================================');
    log('blue', `验证时间: ${new Date().toISOString()}`);
    log('blue', '============================================================\n');

    try {
      // 加载环境变量
      require('dotenv').config({ path: '.env.local' });

      // 执行验证
      await this.validateConfigFileExists();
      await this.validateQRCodeDataFormat();
      await this.validatePayeeInformation();
      await this.validateAmountLimits();
      await this.validateSecuritySettings();
      await this.validateIntegrationReadiness();

      // 生成报告
      this.generateValidationReport();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('red', `❌ 验证过程中发生错误: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 验证配置文件存在性
   */
  private async validateConfigFileExists(): Promise<void> {
    log('yellow', '📁 1. 配置文件存在性验证');

    if (fs.existsSync(this.envLocalPath)) {
      this.addResult({
        category: '配置文件',
        test: '.env.local文件存在性',
        status: 'pass',
        message: '.env.local文件存在'
      });

      const envContent = fs.readFileSync(this.envLocalPath, 'utf8');
      
      if (envContent.includes('QR_PAYMENT_ENABLED=true')) {
        this.addResult({
          category: '配置文件',
          test: 'QR支付启用状态',
          status: 'pass',
          message: 'QR支付已启用'
        });
      } else {
        this.addResult({
          category: '配置文件',
          test: 'QR支付启用状态',
          status: 'fail',
          message: 'QR支付未启用',
          suggestions: ['设置 QR_PAYMENT_ENABLED=true']
        });
      }
    } else {
      this.addResult({
        category: '配置文件',
        test: '.env.local文件存在性',
        status: 'fail',
        message: '.env.local文件不存在',
        suggestions: ['运行配置生成脚本创建配置文件']
      });
    }
  }

  /**
   * 验证收款码数据格式
   */
  private async validateQRCodeDataFormat(): Promise<void> {
    log('yellow', '📱 2. 收款码数据格式验证');

    // 验证微信收款码
    const wechatQRCode = process.env.WECHAT_PERSONAL_QR_CODE;
    if (wechatQRCode) {
      if (wechatQRCode.includes('example') || wechatQRCode.includes('your_real_')) {
        this.addResult({
          category: '收款码格式',
          test: '微信收款码数据',
          status: 'warning',
          message: '微信收款码仍使用占位符数据',
          suggestions: ['替换为真实的微信个人收款码数据']
        });
      } else if (wechatQRCode.startsWith('wxp://') || wechatQRCode.startsWith('weixin://')) {
        this.addResult({
          category: '收款码格式',
          test: '微信收款码数据',
          status: 'pass',
          message: '微信收款码格式正确',
          details: `长度: ${wechatQRCode.length}字符`
        });
      } else {
        this.addResult({
          category: '收款码格式',
          test: '微信收款码数据',
          status: 'warning',
          message: '微信收款码格式可能不正确',
          details: `当前格式: ${wechatQRCode.substring(0, 20)}...`,
          suggestions: ['确认收款码格式为 wxp:// 或 weixin:// 开头']
        });
      }
    } else {
      this.addResult({
        category: '收款码格式',
        test: '微信收款码数据',
        status: 'fail',
        message: '微信收款码数据未配置',
        suggestions: ['配置 WECHAT_PERSONAL_QR_CODE 环境变量']
      });
    }

    // 验证支付宝收款码
    const alipayQRCode = process.env.ALIPAY_PERSONAL_QR_CODE;
    if (alipayQRCode) {
      if (alipayQRCode.includes('example') || alipayQRCode.includes('your_real_')) {
        this.addResult({
          category: '收款码格式',
          test: '支付宝收款码数据',
          status: 'warning',
          message: '支付宝收款码仍使用占位符数据',
          suggestions: ['替换为真实的支付宝个人收款码数据']
        });
      } else if (alipayQRCode.startsWith('https://qr.alipay.com/') || alipayQRCode.startsWith('alipays://')) {
        this.addResult({
          category: '收款码格式',
          test: '支付宝收款码数据',
          status: 'pass',
          message: '支付宝收款码格式正确',
          details: `长度: ${alipayQRCode.length}字符`
        });
      } else {
        this.addResult({
          category: '收款码格式',
          test: '支付宝收款码数据',
          status: 'warning',
          message: '支付宝收款码格式可能不正确',
          details: `当前格式: ${alipayQRCode.substring(0, 30)}...`,
          suggestions: ['确认收款码格式为 https://qr.alipay.com/ 或 alipays:// 开头']
        });
      }
    } else {
      this.addResult({
        category: '收款码格式',
        test: '支付宝收款码数据',
        status: 'fail',
        message: '支付宝收款码数据未配置',
        suggestions: ['配置 ALIPAY_PERSONAL_QR_CODE 环境变量']
      });
    }
  }

  /**
   * 验证收款人信息
   */
  private async validatePayeeInformation(): Promise<void> {
    log('yellow', '👤 3. 收款人信息验证');

    // 验证微信收款人信息
    const wechatPayeeName = process.env.WECHAT_PAYEE_NAME;
    if (wechatPayeeName && wechatPayeeName !== '智游助手') {
      this.addResult({
        category: '收款人信息',
        test: '微信收款人姓名',
        status: 'pass',
        message: '微信收款人信息已自定义',
        details: `收款人: ${wechatPayeeName}`
      });
    } else {
      this.addResult({
        category: '收款人信息',
        test: '微信收款人姓名',
        status: 'warning',
        message: '微信收款人信息使用默认值',
        suggestions: ['建议配置真实的收款人姓名']
      });
    }

    // 验证支付宝收款人信息
    const alipayPayeeName = process.env.ALIPAY_PAYEE_NAME;
    if (alipayPayeeName && alipayPayeeName !== '智游助手') {
      this.addResult({
        category: '收款人信息',
        test: '支付宝收款人姓名',
        status: 'pass',
        message: '支付宝收款人信息已自定义',
        details: `收款人: ${alipayPayeeName}`
      });
    } else {
      this.addResult({
        category: '收款人信息',
        test: '支付宝收款人姓名',
        status: 'warning',
        message: '支付宝收款人信息使用默认值',
        suggestions: ['建议配置真实的收款人姓名']
      });
    }
  }

  /**
   * 验证金额限制设置
   */
  private async validateAmountLimits(): Promise<void> {
    log('yellow', '💰 4. 金额限制验证');

    // 验证微信金额限制
    const wechatMaxAmount = parseInt(process.env.WECHAT_PERSONAL_MAX_AMOUNT || '0');
    if (wechatMaxAmount > 0 && wechatMaxAmount <= 100000) {
      this.addResult({
        category: '金额限制',
        test: '微信单笔限额',
        status: 'pass',
        message: `微信单笔限额设置合理: ¥${(wechatMaxAmount / 100).toFixed(2)}`
      });
    } else if (wechatMaxAmount > 100000) {
      this.addResult({
        category: '金额限制',
        test: '微信单笔限额',
        status: 'warning',
        message: `微信单笔限额较高: ¥${(wechatMaxAmount / 100).toFixed(2)}`,
        suggestions: ['个人收款码建议限制在1000元以内']
      });
    } else {
      this.addResult({
        category: '金额限制',
        test: '微信单笔限额',
        status: 'fail',
        message: '微信单笔限额未配置或无效',
        suggestions: ['配置 WECHAT_PERSONAL_MAX_AMOUNT 环境变量']
      });
    }

    // 验证支付宝金额限制
    const alipayMaxAmount = parseInt(process.env.ALIPAY_PERSONAL_MAX_AMOUNT || '0');
    if (alipayMaxAmount > 0 && alipayMaxAmount <= 100000) {
      this.addResult({
        category: '金额限制',
        test: '支付宝单笔限额',
        status: 'pass',
        message: `支付宝单笔限额设置合理: ¥${(alipayMaxAmount / 100).toFixed(2)}`
      });
    } else if (alipayMaxAmount > 100000) {
      this.addResult({
        category: '金额限制',
        test: '支付宝单笔限额',
        status: 'warning',
        message: `支付宝单笔限额较高: ¥${(alipayMaxAmount / 100).toFixed(2)}`,
        suggestions: ['个人收款码建议限制在1000元以内']
      });
    } else {
      this.addResult({
        category: '金额限制',
        test: '支付宝单笔限额',
        status: 'fail',
        message: '支付宝单笔限额未配置或无效',
        suggestions: ['配置 ALIPAY_PERSONAL_MAX_AMOUNT 环境变量']
      });
    }
  }

  /**
   * 验证安全设置
   */
  private async validateSecuritySettings(): Promise<void> {
    log('yellow', '🛡️ 5. 安全设置验证');

    // 检查是否使用了示例数据
    const envContent = fs.existsSync(this.envLocalPath) ? fs.readFileSync(this.envLocalPath, 'utf8') : '';
    
    if (envContent.includes('example') || envContent.includes('your_real_')) {
      this.addResult({
        category: '安全设置',
        test: '示例数据检查',
        status: 'warning',
        message: '配置中仍包含示例数据',
        suggestions: ['替换所有示例数据为真实配置']
      });
    } else {
      this.addResult({
        category: '安全设置',
        test: '示例数据检查',
        status: 'pass',
        message: '未发现示例数据'
      });
    }

    // 检查环境变量安全性
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
      this.addResult({
        category: '安全设置',
        test: '环境变量安全性',
        status: 'warning',
        message: '生产环境中使用个人收款码',
        suggestions: ['确保收款码数据安全，考虑升级到MCP协议']
      });
    } else {
      this.addResult({
        category: '安全设置',
        test: '环境变量安全性',
        status: 'pass',
        message: '开发环境配置正常'
      });
    }
  }

  /**
   * 验证集成就绪性
   */
  private async validateIntegrationReadiness(): Promise<void> {
    log('yellow', '🔗 6. 集成就绪性验证');

    // 检查JWT配置
    const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
    if (jwtAccessSecret && jwtAccessSecret.length >= 32) {
      this.addResult({
        category: '集成就绪性',
        test: 'JWT认证配置',
        status: 'pass',
        message: 'JWT认证配置正常'
      });
    } else {
      this.addResult({
        category: '集成就绪性',
        test: 'JWT认证配置',
        status: 'warning',
        message: 'JWT认证配置可能有问题',
        suggestions: ['检查JWT相关环境变量配置']
      });
    }

    // 检查数据库配置
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (databaseUrl) {
      this.addResult({
        category: '集成就绪性',
        test: '数据库配置',
        status: 'pass',
        message: '数据库配置存在'
      });
    } else {
      this.addResult({
        category: '集成就绪性',
        test: '数据库配置',
        status: 'warning',
        message: '数据库配置未找到',
        suggestions: ['检查数据库连接配置']
      });
    }
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

  private generateValidationReport(): void {
    log('blue', '\n============================================================');
    log('bold', '📊 真实收款码配置验证报告');
    log('blue', '============================================================');

    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    log('blue', `总验证项: ${totalTests}`);
    log('green', `通过: ${passed}`);
    log('yellow', `警告: ${this.warnings}`);
    log('red', `失败: ${failed}`);

    const readinessScore = Math.round((passed / totalTests) * 100);
    log('blue', `\n真实收款码配置就绪度: ${readinessScore}%`);

    if (this.criticalFailures > 0) {
      log('red', '\n❌ 配置存在严重问题，需要修复');
      log('red', '请按照建议修复所有失败项');
    } else if (this.warnings > 0) {
      log('yellow', '\n⚠️ 配置基本可用，建议优化警告项');
      log('yellow', '特别注意替换示例数据为真实收款码');
    } else {
      log('green', '\n🎉 真实收款码配置完全就绪！');
      log('green', '✅ 可以开始使用真实收款功能');
    }

    log('blue', '\n📋 后续建议：');
    if (readinessScore < 80) {
      log('cyan', '• 运行配置生成脚本：npx tsx scripts/generate-real-qr-config.ts');
    }
    log('cyan', '• 启动开发服务器：npm run dev');
    log('cyan', '• 进行小额测试：访问 http://localhost:3004/payment');
    log('cyan', '• 查看完整教程：docs/qr-payment-real-setup-tutorial.html');

    log('blue', '\n============================================================');
  }
}

// 主函数
async function main() {
  const validator = new RealQRConfigValidator();
  
  try {
    await validator.validateRealQRConfiguration();
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

export { RealQRConfigValidator };
