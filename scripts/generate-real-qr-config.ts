/**
 * 智游助手v6.2 - 真实收款码配置生成器
 * 遵循原则: [用户体验优先] + [配置管理标准化] + [安全优先]
 * 
 * 帮助用户快速生成真实收款码配置，替换示例数据
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

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

interface RealQRConfig {
  wechatQRCode: string;
  wechatPayeeName: string;
  wechatPayeeAccount: string;
  alipayQRCode: string;
  alipayPayeeName: string;
  alipayPayeeAccount: string;
  maxAmount: number;
  dailyLimit: number;
}

class RealQRConfigGenerator {
  private rl: readline.Interface;
  private envLocalPath: string;
  private config: Partial<RealQRConfig> = {};

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.envLocalPath = path.join(process.cwd(), '.env.local');
  }

  async generateRealQRConfig(): Promise<void> {
    log('bold', '🚀 智游助手v6.2 真实收款码配置生成器');
    log('blue', '============================================================');
    log('blue', '将示例收款码数据替换为真实收款码，实现真实收款功能');
    log('blue', '============================================================\n');

    try {
      // 显示当前状态
      await this.showCurrentStatus();
      
      // 收集真实收款码信息
      await this.collectRealQRData();
      
      // 生成配置文件
      await this.generateConfigFile();
      
      // 验证配置
      await this.validateGeneratedConfig();
      
      // 显示后续步骤
      await this.showNextSteps();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('red', `❌ 配置生成过程中发生错误: ${errorMessage}`);
    } finally {
      this.rl.close();
    }
  }

  private async showCurrentStatus(): Promise<void> {
    log('yellow', '📋 当前配置状态检查：');
    
    if (fs.existsSync(this.envLocalPath)) {
      const envContent = fs.readFileSync(this.envLocalPath, 'utf8');
      
      if (envContent.includes('QR_PAYMENT_ENABLED=true')) {
        log('green', '✅ QR支付已启用');
        
        if (envContent.includes('example_wechat_qr_code_data') || 
            envContent.includes('example_alipay_qr_code_data')) {
          log('yellow', '⚠️ 检测到示例收款码数据，需要替换为真实数据');
        } else {
          log('blue', 'ℹ️ 已配置收款码数据，将进行更新');
        }
      } else {
        log('red', '❌ QR支付未启用或配置缺失');
      }
    } else {
      log('red', '❌ .env.local文件不存在');
    }

    log('blue', '\n🎯 本工具将帮助您：');
    log('cyan', '• 配置真实的微信个人收款码');
    log('cyan', '• 配置真实的支付宝个人收款码');
    log('cyan', '• 设置合理的金额限制');
    log('cyan', '• 生成完整的配置文件');
    log('cyan', '• 验证配置正确性\n');

    await this.question('按回车键开始配置...');
  }

  private async collectRealQRData(): Promise<void> {
    log('cyan', '📝 收集真实收款码信息');

    // 微信收款码配置
    log('blue', '\n🟢 微信个人收款码配置：');
    log('yellow', '提示：请先在微信中生成个人收款码，并使用二维码解析工具获取数据');
    
    this.config.wechatQRCode = await this.question('请输入微信收款码数据（格式如 wxp://f2f0...）: ');
    
    if (!this.config.wechatQRCode || this.config.wechatQRCode.includes('example')) {
      log('yellow', '⚠️ 未输入有效的微信收款码，将使用占位符');
      this.config.wechatQRCode = 'your_real_wechat_qr_code_data_here';
    }
    
    this.config.wechatPayeeName = await this.question('微信收款人姓名（默认：智游助手微信收款）: ') || '智游助手微信收款';
    this.config.wechatPayeeAccount = await this.question('微信账号标识（默认：smart_travel_wx）: ') || 'smart_travel_wx';

    // 支付宝收款码配置
    log('blue', '\n🔵 支付宝个人收款码配置：');
    log('yellow', '提示：请先在支付宝中生成个人收款码，并使用二维码解析工具获取数据');
    
    this.config.alipayQRCode = await this.question('请输入支付宝收款码数据（格式如 https://qr.alipay.com/...）: ');
    
    if (!this.config.alipayQRCode || this.config.alipayQRCode.includes('example')) {
      log('yellow', '⚠️ 未输入有效的支付宝收款码，将使用占位符');
      this.config.alipayQRCode = 'your_real_alipay_qr_code_data_here';
    }
    
    this.config.alipayPayeeName = await this.question('支付宝收款人姓名（默认：智游助手支付宝收款）: ') || '智游助手支付宝收款';
    this.config.alipayPayeeAccount = await this.question('支付宝账号标识（默认：smart_travel_zfb）: ') || 'smart_travel_zfb';

    // 金额限制配置
    log('blue', '\n💰 金额限制配置：');
    const maxAmountInput = await this.question('单笔最大金额（元，建议300-500，默认300）: ');
    this.config.maxAmount = parseInt(maxAmountInput) || 300;

    const dailyLimitInput = await this.question('日限额（元，建议3000-5000，默认3000）: ');
    this.config.dailyLimit = parseInt(dailyLimitInput) || 3000;

    log('green', '\n✅ 收款码信息收集完成');
  }

  private async generateConfigFile(): Promise<void> {
    log('cyan', '\n⚙️ 生成配置文件');

    try {
      // 读取现有的.env.local文件
      let envContent = '';
      if (fs.existsSync(this.envLocalPath)) {
        envContent = fs.readFileSync(this.envLocalPath, 'utf8');
        log('blue', '📁 读取现有.env.local文件');
      } else {
        log('blue', '📁 创建新的.env.local文件');
      }

      // 生成真实QR支付配置
      const realQRConfig = this.generateRealQRConfigContent();
      
      // 检查是否已存在QR支付配置
      if (envContent.includes('# QR支付配置')) {
        // 替换现有配置
        const configStart = envContent.indexOf('# QR支付配置');
        let configEnd = envContent.indexOf('\n\n', configStart);
        
        // 如果找不到结束位置，查找下一个配置块
        if (configEnd === -1) {
          const nextConfigStart = envContent.indexOf('\n# ', configStart + 1);
          configEnd = nextConfigStart !== -1 ? nextConfigStart : envContent.length;
        }
        
        envContent = envContent.substring(0, configStart) + realQRConfig + envContent.substring(configEnd);
        log('green', '✅ 更新现有QR支付配置');
      } else {
        // 添加新配置
        envContent += '\n' + realQRConfig;
        log('green', '✅ 添加新的QR支付配置');
      }

      // 写入文件
      fs.writeFileSync(this.envLocalPath, envContent);
      log('green', `✅ 配置文件已保存到: ${this.envLocalPath}`);

    } catch (error) {
      log('red', `❌ 配置文件生成失败: ${error.message}`);
      throw error;
    }
  }

  private generateRealQRConfigContent(): string {
    const timestamp = new Date().toISOString();
    
    return `# QR支付配置 - 真实收款码配置 - 生成于 ${timestamp}
# ============================================================================
# QR支付配置 (个人收款码) - 真实收款码数据
# ============================================================================

# 启用QR支付
QR_PAYMENT_ENABLED=true

# 微信个人收款码配置
WECHAT_PERSONAL_QR_ENABLED=true
WECHAT_PERSONAL_QR_CODE=${this.config.wechatQRCode}
WECHAT_PAYEE_NAME=${this.config.wechatPayeeName}
WECHAT_PAYEE_ACCOUNT=${this.config.wechatPayeeAccount}
WECHAT_PAYEE_AVATAR=https://example.com/wechat-avatar.jpg
WECHAT_PERSONAL_MAX_AMOUNT=${(this.config.maxAmount || 300) * 100}
WECHAT_PERSONAL_DAILY_LIMIT=${(this.config.dailyLimit || 3000) * 100}

# 支付宝个人收款码配置
ALIPAY_PERSONAL_QR_ENABLED=true
ALIPAY_PERSONAL_QR_CODE=${this.config.alipayQRCode}
ALIPAY_PAYEE_NAME=${this.config.alipayPayeeName}
ALIPAY_PAYEE_ACCOUNT=${this.config.alipayPayeeAccount}
ALIPAY_PAYEE_AVATAR=https://example.com/alipay-avatar.jpg
ALIPAY_PERSONAL_MAX_AMOUNT=${(this.config.maxAmount || 300) * 100}
ALIPAY_PERSONAL_DAILY_LIMIT=${(this.config.dailyLimit || 3000) * 100}

`;
  }

  private async validateGeneratedConfig(): Promise<void> {
    log('cyan', '\n🧪 验证生成的配置');

    try {
      // 基本格式验证
      let validationScore = 0;
      let totalChecks = 6;

      // 检查微信收款码
      if (this.config.wechatQRCode && !this.config.wechatQRCode.includes('your_real_')) {
        if (this.config.wechatQRCode.startsWith('wxp://') || this.config.wechatQRCode.startsWith('weixin://')) {
          log('green', '✅ 微信收款码格式正确');
          validationScore++;
        } else {
          log('yellow', '⚠️ 微信收款码格式可能不正确');
        }
      } else {
        log('yellow', '⚠️ 微信收款码使用占位符，需要替换为真实数据');
      }

      // 检查支付宝收款码
      if (this.config.alipayQRCode && !this.config.alipayQRCode.includes('your_real_')) {
        if (this.config.alipayQRCode.startsWith('https://qr.alipay.com/') || this.config.alipayQRCode.startsWith('alipays://')) {
          log('green', '✅ 支付宝收款码格式正确');
          validationScore++;
        } else {
          log('yellow', '⚠️ 支付宝收款码格式可能不正确');
        }
      } else {
        log('yellow', '⚠️ 支付宝收款码使用占位符，需要替换为真实数据');
      }

      // 检查收款人信息
      if (this.config.wechatPayeeName && this.config.wechatPayeeName !== '智游助手') {
        log('green', '✅ 微信收款人信息已自定义');
        validationScore++;
      }

      if (this.config.alipayPayeeName && this.config.alipayPayeeName !== '智游助手') {
        log('green', '✅ 支付宝收款人信息已自定义');
        validationScore++;
      }

      // 检查金额限制
      if (this.config.maxAmount && this.config.maxAmount > 0 && this.config.maxAmount <= 1000) {
        log('green', `✅ 单笔限额设置合理: ¥${this.config.maxAmount}`);
        validationScore++;
      }

      if (this.config.dailyLimit && this.config.dailyLimit > 0 && this.config.dailyLimit <= 10000) {
        log('green', `✅ 日限额设置合理: ¥${this.config.dailyLimit}`);
        validationScore++;
      }

      const configScore = Math.round((validationScore / totalChecks) * 100);
      log('blue', `\n📊 配置完整度: ${configScore}%`);

      if (configScore >= 80) {
        log('green', '🎉 配置质量良好，可以进行测试');
      } else {
        log('yellow', '⚠️ 建议完善配置以获得更好的效果');
      }

    } catch (error) {
      log('red', `❌ 配置验证失败: ${error.message}`);
    }
  }

  private async showNextSteps(): Promise<void> {
    log('green', '\n🎉 真实收款码配置生成完成！');
    log('blue', '\n📋 后续步骤：');
    
    log('yellow', '1. 验证配置：');
    log('cyan', '   npx tsx scripts/qr-payment-config-validator.ts');
    
    log('yellow', '2. 启动开发服务器：');
    log('cyan', '   npm run dev');
    
    log('yellow', '3. 测试支付功能：');
    log('cyan', '   访问 http://localhost:3004/payment');
    
    log('yellow', '4. 运行端到端测试：');
    log('cyan', '   npx playwright test tests/e2e/qr-payment-flow.spec.ts');
    
    log('blue', '\n⚠️ 重要提醒：');
    log('yellow', '• 如果使用了占位符，请手动替换为真实收款码数据');
    log('yellow', '• 建议先进行小额测试（1-5元）');
    log('yellow', '• 定期检查收款码有效性');
    log('yellow', '• 保护好收款码数据的安全');
    
    log('blue', '\n🚀 配置文件位置：');
    log('cyan', `   ${this.envLocalPath}`);
    
    log('blue', '\n📚 相关文档：');
    log('cyan', '   • 完整教程：docs/qr-payment-real-setup-tutorial.html');
    log('cyan', '   • 技术方案：docs/QR_PAYMENT_SOLUTION.md');
    log('cyan', '   • 修复报告：docs/QR_PAYMENT_FIX_REPORT.md');
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// 主函数
async function main() {
  const generator = new RealQRConfigGenerator();
  
  try {
    await generator.generateRealQRConfig();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('red', `❌ 配置生成过程中发生错误: ${errorMessage}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { RealQRConfigGenerator };
