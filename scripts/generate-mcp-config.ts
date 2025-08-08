/**
 * 智游助手v6.2 - MCP配置生成器
 * 遵循原则: [用户体验优先] + [配置管理标准化] + [为失败而设计]
 * 
 * 交互式生成MCP配置，帮助用户快速配置微信支付MCP服务
 */

import * as readline from 'readline';
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

interface MCPConfigData {
  // MCP基础配置
  mcpEnabled: boolean;
  experienceMode: boolean;
  
  // 微信支付MCP配置
  wechatMcpEndpoint: string;
  wechatMcpApiKey: string;
  wechatMcpMerchantId: string;
  wechatMcpPrivateKey: string;
  wechatMcpPublicKey: string;
  
  // 微信支付基础配置
  wechatPayAppId: string;
  wechatPayMchId: string;
  wechatPayApiKey: string;
  
  // MCP通用配置
  mcpTimeout: number;
  mcpRetryCount: number;
}

class MCPConfigGenerator {
  private rl: readline.Interface;
  private configData: Partial<MCPConfigData> = {};

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async generateMCPConfig(): Promise<void> {
    log('bold', '🚀 智游助手v6.2 微信支付MCP配置生成器');
    log('blue', '============================================================');
    log('blue', '本工具将帮助您交互式配置微信支付MCP服务');
    log('blue', '============================================================\n');

    try {
      // 显示重要提醒
      await this.showImportantNotice();
      
      // 收集配置信息
      await this.collectBasicConfig();
      await this.collectWeChatMCPConfig();
      await this.collectWeChatPayConfig();
      await this.collectAdvancedConfig();
      
      // 生成配置文件
      await this.generateConfigFile();
      
      // 显示后续步骤
      await this.showNextSteps();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('red', `❌ 配置生成过程中发生错误: ${errorMessage}`);
    } finally {
      this.rl.close();
    }
  }

  private async showImportantNotice(): Promise<void> {
    log('yellow', '⚠️ 重要提醒：');
    log('yellow', '1. 请确保您已经申请了微信支付商户账号');
    log('yellow', '2. 请确保您已经获得了微信支付MCP体验版授权');
    log('yellow', '3. 体验版仅用于开发测试，所有付款将在24小时内自动退回');
    log('yellow', '4. 请妥善保管您的API密钥，不要泄露给他人\n');

    await this.question('按回车键继续...');
  }

  private async collectBasicConfig(): Promise<void> {
    log('cyan', '📋 1. 基础配置');

    // MCP启用状态
    const mcpEnabledInput = await this.question('是否启用MCP协议？(y/N): ');
    this.configData.mcpEnabled = mcpEnabledInput.toLowerCase() === 'y' || mcpEnabledInput.toLowerCase() === 'yes';

    // 体验模式
    const experienceModeInput = await this.question('是否使用体验模式？(Y/n): ');
    this.configData.experienceMode = experienceModeInput.toLowerCase() !== 'n' && experienceModeInput.toLowerCase() !== 'no';

    if (this.configData.experienceMode) {
      log('green', '✅ 体验模式已启用 - 适用于开发测试');
    } else {
      log('yellow', '⚠️ 生产模式已启用 - 请确保您有正式授权');
    }
  }

  private async collectWeChatMCPConfig(): Promise<void> {
    log('cyan', '\n📱 2. 微信支付MCP配置');

    // MCP端点
    const defaultEndpoint = 'https://api.mch.weixin.qq.com/mcp/v1';
    const endpointInput = await this.question(`MCP API端点 (${defaultEndpoint}): `);
    this.configData.wechatMcpEndpoint = endpointInput || defaultEndpoint;

    // MCP API密钥
    this.configData.wechatMcpApiKey = await this.question('MCP API密钥: ');
    if (!this.configData.wechatMcpApiKey) {
      log('yellow', '⚠️ 警告：MCP API密钥为空，请稍后手动配置');
    }

    // MCP商户ID
    this.configData.wechatMcpMerchantId = await this.question('MCP商户ID: ');
    if (!this.configData.wechatMcpMerchantId) {
      log('yellow', '⚠️ 警告：MCP商户ID为空，请稍后手动配置');
    }

    // MCP私钥
    log('blue', '请输入MCP私钥（完整的PEM格式，包含-----BEGIN和-----END）:');
    this.configData.wechatMcpPrivateKey = await this.question('MCP私钥: ');
    if (!this.configData.wechatMcpPrivateKey) {
      log('yellow', '⚠️ 警告：MCP私钥为空，请稍后手动配置');
    }

    // MCP公钥
    log('blue', '请输入MCP公钥（完整的PEM格式，包含-----BEGIN和-----END）:');
    this.configData.wechatMcpPublicKey = await this.question('MCP公钥: ');
    if (!this.configData.wechatMcpPublicKey) {
      log('yellow', '⚠️ 警告：MCP公钥为空，请稍后手动配置');
    }
  }

  private async collectWeChatPayConfig(): Promise<void> {
    log('cyan', '\n💳 3. 微信支付基础配置');

    // 微信AppID
    this.configData.wechatPayAppId = await this.question('微信AppID: ');
    if (!this.configData.wechatPayAppId) {
      log('yellow', '⚠️ 警告：微信AppID为空，请稍后手动配置');
    }

    // 微信商户号
    this.configData.wechatPayMchId = await this.question('微信商户号: ');
    if (!this.configData.wechatPayMchId) {
      log('yellow', '⚠️ 警告：微信商户号为空，请稍后手动配置');
    }

    // 微信支付密钥
    this.configData.wechatPayApiKey = await this.question('微信支付API密钥: ');
    if (!this.configData.wechatPayApiKey) {
      log('yellow', '⚠️ 警告：微信支付API密钥为空，请稍后手动配置');
    }
  }

  private async collectAdvancedConfig(): Promise<void> {
    log('cyan', '\n⚙️ 4. 高级配置');

    // 超时时间
    const timeoutInput = await this.question('MCP请求超时时间（毫秒，默认30000）: ');
    this.configData.mcpTimeout = parseInt(timeoutInput) || 30000;

    // 重试次数
    const retryInput = await this.question('MCP请求重试次数（默认3）: ');
    this.configData.mcpRetryCount = parseInt(retryInput) || 3;
  }

  private async generateConfigFile(): Promise<void> {
    log('cyan', '\n📝 5. 生成配置文件');

    const configContent = this.buildConfigContent();
    const envLocalPath = path.join(process.cwd(), '.env.local');
    
    // 检查是否存在现有配置
    if (fs.existsSync(envLocalPath)) {
      const overwriteInput = await this.question('检测到现有的.env.local文件，是否覆盖？(y/N): ');
      if (overwriteInput.toLowerCase() !== 'y' && overwriteInput.toLowerCase() !== 'yes') {
        // 生成备份文件
        const backupPath = `${envLocalPath}.mcp-backup-${Date.now()}`;
        const backupContent = this.buildConfigContent(true);
        fs.writeFileSync(backupPath, backupContent);
        log('green', `✅ MCP配置已保存到: ${backupPath}`);
        log('yellow', '请手动将配置合并到.env.local文件中');
        return;
      }
    }

    // 写入配置文件
    fs.writeFileSync(envLocalPath, configContent);
    log('green', `✅ MCP配置已保存到: ${envLocalPath}`);
  }

  private buildConfigContent(isBackup = false): string {
    const timestamp = new Date().toISOString();
    const prefix = isBackup ? '# MCP配置备份 - ' : '# 智游助手v6.2 MCP配置 - ';
    
    return `${prefix}${timestamp}

# ============================================================================
# MCP协议配置 (Model Context Protocol) - ${this.configData.experienceMode ? '体验版' : '生产版'}
# ============================================================================
# 🚨 重要说明：
# 1. ${this.configData.experienceMode ? 'MCP体验版仅用于开发测试，严禁用于正式业务' : 'MCP生产版用于正式业务，请确保配置正确'}
# 2. ${this.configData.experienceMode ? '所有付款将在24小时内自动退回' : '所有付款为真实交易，请谨慎操作'}
# 3. ${this.configData.experienceMode ? '收款方为微信官方测试账户，非商户自有账户' : '收款方为商户自有账户'}
# ============================================================================

# 启用MCP协议支付
PAYMENT_MCP_ENABLED=${this.configData.mcpEnabled}

# 微信支付MCP配置
WECHAT_MCP_ENDPOINT=${this.configData.wechatMcpEndpoint}
WECHAT_MCP_API_KEY=${this.configData.wechatMcpApiKey || 'your_wechat_mcp_api_key_here'}
WECHAT_MCP_MERCHANT_ID=${this.configData.wechatMcpMerchantId || 'your_wechat_mcp_merchant_id'}
WECHAT_MCP_PRIVATE_KEY=${this.configData.wechatMcpPrivateKey || 'your_wechat_mcp_private_key'}
WECHAT_MCP_PUBLIC_KEY=${this.configData.wechatMcpPublicKey || 'your_wechat_mcp_public_key'}
WECHAT_MCP_EXPERIENCE=${this.configData.experienceMode}

# 微信支付基础配置
WECHAT_PAY_APP_ID=${this.configData.wechatPayAppId || 'your_wechat_app_id'}
WECHAT_PAY_MCH_ID=${this.configData.wechatPayMchId || 'your_wechat_merchant_id'}
WECHAT_PAY_API_KEY=${this.configData.wechatPayApiKey || 'your_wechat_api_key'}
WECHAT_PAY_NOTIFY_URL=http://localhost:3004/api/payment/wechat/notify
WECHAT_PAY_SANDBOX=${this.configData.experienceMode}

# MCP通用配置
MCP_EXPERIENCE_MODE=${this.configData.experienceMode}
MCP_TIMEOUT=${this.configData.mcpTimeout}
MCP_RETRY_COUNT=${this.configData.mcpRetryCount}

# ============================================================================
# JWT认证配置 (已优化) - 保持现有配置
# ============================================================================
JWT_ACCESS_SECRET=BzDrc0S787Kl9x4+d9QwDdh49TTZrsAIwpIuCP9nd1s=
JWT_REFRESH_SECRET=FuW3DmNXa1w9tiWA8ki28rdyOxqZoAEsBbBFUtydKYA=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=smart-travel-v6.2
JWT_AUDIENCE=smart-travel-users

# ============================================================================
# 应用基础配置
# ============================================================================
NODE_ENV=development
PORT=3004
NEXT_PUBLIC_API_BASE_URL=http://localhost:3004
CORS_ORIGINS=http://localhost:3000,http://localhost:3004

# ============================================================================
# 密码加密配置
# ============================================================================
BCRYPT_SALT_ROUNDS=12
`;
  }

  private async showNextSteps(): Promise<void> {
    log('green', '\n🎉 MCP配置生成完成！');
    log('blue', '\n📋 后续步骤：');
    log('yellow', '1. 验证MCP配置：');
    log('cyan', '   npx tsx scripts/wechat-mcp-config-validator.ts');
    log('yellow', '2. 运行JWT配置检查：');
    log('cyan', '   npx tsx scripts/jwt-production-check.ts');
    log('yellow', '3. 运行MCP端到端测试：');
    log('cyan', '   npx playwright test tests/e2e/mcp-payment-flow.spec.ts');
    log('yellow', '4. 启动开发服务器：');
    log('cyan', '   npm run dev');
    
    log('blue', '\n📚 相关文档：');
    log('cyan', '   - 完整实施指南: docs/WECHAT_MCP_IMPLEMENTATION_GUIDE.md');
    log('cyan', '   - MCP集成报告: MCP_INTEGRATION_REPORT.md');
    
    log('blue', '\n⚠️ 重要提醒：');
    if (this.configData.experienceMode) {
      log('yellow', '   - 当前为体验模式，仅用于开发测试');
      log('yellow', '   - 所有付款将在24小时内自动退回');
      log('yellow', '   - 单笔限额100元，日限额1000元');
    } else {
      log('red', '   - 当前为生产模式，所有交易为真实付款');
      log('red', '   - 请确保您有正式的微信支付MCP授权');
      log('red', '   - 请仔细测试后再用于正式业务');
    }
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
  const generator = new MCPConfigGenerator();
  
  try {
    await generator.generateMCPConfig();
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

export { MCPConfigGenerator };
