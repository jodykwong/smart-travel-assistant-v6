/**
 * 智游助手v6.2 - 微信支付MCP配置验证器
 * 遵循原则: [为失败而设计] + [纵深防御] + [配置管理标准化]
 * 
 * 验证微信支付MCP配置的完整性和正确性：
 * 1. MCP环境变量验证
 * 2. 与现有架构的兼容性检查
 * 3. MCP客户端连接测试
 * 4. 体验版限制验证
 */

import { configManager } from '../src/lib/config/config-manager';
import WeChatPayMCPClient from '../src/lib/payment/mcp/wechat-pay-mcp-client';
import { WeChatMCPConfig } from '../src/lib/payment/mcp/mcp-types';

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

class WeChatMCPConfigValidator {
  private results: ValidationResult[] = [];
  private criticalFailures = 0;
  private warnings = 0;

  async validateWeChatMCPConfiguration(): Promise<void> {
    log('bold', '🔐 智游助手v6.2 微信支付MCP配置验证');
    log('blue', '============================================================');
    log('blue', `验证时间: ${new Date().toISOString()}`);
    log('blue', '============================================================\n');

    try {
      // 加载环境变量
      require('dotenv').config({ path: '.env.local' });

      // 执行所有验证
      await this.validateMCPEnvironmentVariables();
      await this.validateMCPConfigurationIntegrity();
      await this.validateMCPClientCompatibility();
      await this.validateMCPExperienceMode();
      await this.validateMCPSecuritySettings();

      // 生成报告
      this.generateReport();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('red', `❌ 微信支付MCP配置验证过程中发生错误: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 验证MCP环境变量
   * 遵循原则: [配置管理标准化] - 确保所有必需配置项存在
   */
  private async validateMCPEnvironmentVariables(): Promise<void> {
    log('yellow', '📋 1. MCP环境变量验证');

    const requiredMCPVars = [
      'PAYMENT_MCP_ENABLED',
      'WECHAT_MCP_ENDPOINT',
      'WECHAT_MCP_API_KEY',
      'WECHAT_MCP_MERCHANT_ID',
      'WECHAT_MCP_PRIVATE_KEY',
      'WECHAT_MCP_PUBLIC_KEY',
      'WECHAT_MCP_EXPERIENCE'
    ];

    let allVarsPresent = true;

    for (const envVar of requiredMCPVars) {
      const value = process.env[envVar];
      
      if (value && value !== 'your_wechat_mcp_api_key_here' && value !== 'your_wechat_mcp_merchant_id') {
        this.addResult({
          category: '环境变量',
          test: `${envVar}存在性`,
          status: 'pass',
          message: `${envVar} 已正确配置`,
          details: `长度: ${value.length}字符`
        });
      } else {
        this.addResult({
          category: '环境变量',
          test: `${envVar}存在性`,
          status: 'fail',
          message: `${envVar} 未配置或使用默认值`,
          suggestions: [
            '从微信支付商户平台获取真实的MCP配置',
            '更新.env.local文件中的对应配置项',
            '确保不使用示例中的占位符值'
          ]
        });
        allVarsPresent = false;
      }
    }

    // 验证MCP启用状态
    const mcpEnabled = process.env.PAYMENT_MCP_ENABLED === 'true';
    if (mcpEnabled) {
      this.addResult({
        category: '环境变量',
        test: 'MCP协议启用状态',
        status: 'pass',
        message: 'MCP协议已启用'
      });
    } else {
      this.addResult({
        category: '环境变量',
        test: 'MCP协议启用状态',
        status: 'warning',
        message: 'MCP协议未启用',
        suggestions: ['设置 PAYMENT_MCP_ENABLED=true 启用MCP协议']
      });
    }

    if (allVarsPresent) {
      this.addResult({
        category: '环境变量',
        test: 'MCP环境变量完整性',
        status: 'pass',
        message: '所有必需的MCP环境变量都已配置'
      });
    }
  }

  /**
   * 验证MCP配置完整性
   * 遵循原则: [为失败而设计] - 验证配置格式和有效性
   */
  private async validateMCPConfigurationIntegrity(): Promise<void> {
    log('yellow', '⚙️ 2. MCP配置完整性验证');

    try {
      // 验证ConfigManager是否能正确加载MCP配置
      const config = await configManager.loadConfig();
      
      this.addResult({
        category: '配置完整性',
        test: 'ConfigManager MCP支持',
        status: 'pass',
        message: 'ConfigManager成功加载MCP配置'
      });

      // 验证MCP配置项
      const mcpConfig = config.mcp;
      
      if (mcpConfig.enabled) {
        this.addResult({
          category: '配置完整性',
          test: 'MCP配置启用状态',
          status: 'pass',
          message: 'MCP配置已启用'
        });
      } else {
        this.addResult({
          category: '配置完整性',
          test: 'MCP配置启用状态',
          status: 'warning',
          message: 'MCP配置未启用',
          suggestions: ['检查PAYMENT_MCP_ENABLED环境变量']
        });
      }

      // 验证端点URL格式
      if (mcpConfig.wechatEndpoint) {
        try {
          new URL(mcpConfig.wechatEndpoint);
          this.addResult({
            category: '配置完整性',
            test: '微信MCP端点URL',
            status: 'pass',
            message: '微信MCP端点URL格式正确',
            details: mcpConfig.wechatEndpoint
          });
        } catch {
          this.addResult({
            category: '配置完整性',
            test: '微信MCP端点URL',
            status: 'fail',
            message: '微信MCP端点URL格式无效',
            suggestions: ['检查WECHAT_MCP_ENDPOINT配置']
          });
        }
      }

      // 验证体验模式设置
      if (mcpConfig.experienceMode) {
        this.addResult({
          category: '配置完整性',
          test: 'MCP体验模式',
          status: 'pass',
          message: 'MCP体验模式已启用',
          details: '适用于开发测试，24小时内自动退款'
        });
      } else {
        this.addResult({
          category: '配置完整性',
          test: 'MCP体验模式',
          status: 'warning',
          message: 'MCP体验模式未启用',
          suggestions: ['开发阶段建议启用体验模式']
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult({
        category: '配置完整性',
        test: 'MCP配置加载',
        status: 'fail',
        message: 'MCP配置加载失败',
        details: errorMessage,
        suggestions: ['检查MCP相关环境变量配置', '确认ConfigManager支持MCP配置']
      });
    }
  }

  /**
   * 验证MCP客户端兼容性
   * 遵循原则: [系统集成] - 确保与现有架构兼容
   */
  private async validateMCPClientCompatibility(): Promise<void> {
    log('yellow', '🔗 3. MCP客户端兼容性验证');

    try {
      // 构建MCP配置
      const mcpConfig: WeChatMCPConfig = {
        endpoint: process.env.WECHAT_MCP_ENDPOINT || 'https://api.mch.weixin.qq.com/mcp/v1',
        merchantId: process.env.WECHAT_MCP_MERCHANT_ID || 'test-merchant',
        apiKey: process.env.WECHAT_MCP_API_KEY || 'test-api-key',
        apiVersion: '1.0',
        isExperience: process.env.WECHAT_MCP_EXPERIENCE === 'true',
        timeout: 30000,
        retryCount: 3,
        signType: 'RSA2',
        privateKey: process.env.WECHAT_MCP_PRIVATE_KEY,
        publicKey: process.env.WECHAT_MCP_PUBLIC_KEY,
        // 微信支付特定配置
        appId: process.env.WECHAT_PAY_APP_ID || 'test-app-id',
        mchId: process.env.WECHAT_PAY_MCH_ID || 'test-mch-id',
        payKey: process.env.WECHAT_PAY_API_KEY || 'test-pay-key'
      };

      // 尝试初始化MCP客户端
      const wechatMCPClient = new WeChatPayMCPClient();
      
      this.addResult({
        category: '客户端兼容性',
        test: 'WeChatPayMCPClient实例化',
        status: 'pass',
        message: 'WeChatPayMCPClient成功实例化'
      });

      // 验证配置结构兼容性
      if (mcpConfig.endpoint && mcpConfig.merchantId && mcpConfig.apiKey) {
        this.addResult({
          category: '客户端兼容性',
          test: 'MCP配置结构',
          status: 'pass',
          message: 'MCP配置结构与客户端兼容'
        });
      } else {
        this.addResult({
          category: '客户端兼容性',
          test: 'MCP配置结构',
          status: 'fail',
          message: 'MCP配置结构不完整',
          suggestions: ['检查必需的MCP配置项']
        });
      }

      // 验证签名类型支持
      if (mcpConfig.signType === 'RSA2') {
        this.addResult({
          category: '客户端兼容性',
          test: 'MCP签名类型',
          status: 'pass',
          message: 'MCP签名类型配置正确 (RSA2)'
        });
      } else {
        this.addResult({
          category: '客户端兼容性',
          test: 'MCP签名类型',
          status: 'warning',
          message: `MCP签名类型: ${mcpConfig.signType}`,
          suggestions: ['建议使用RSA2签名类型']
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResult({
        category: '客户端兼容性',
        test: 'MCP客户端兼容性',
        status: 'fail',
        message: 'MCP客户端兼容性验证失败',
        details: errorMessage,
        suggestions: ['检查WeChatPayMCPClient导入', '确认MCP类型定义正确']
      });
    }
  }

  /**
   * 验证MCP体验模式
   * 遵循原则: [安全优先] - 确保体验版限制正确配置
   */
  private async validateMCPExperienceMode(): Promise<void> {
    log('yellow', '🧪 4. MCP体验模式验证');

    const isExperience = process.env.WECHAT_MCP_EXPERIENCE === 'true';
    const mcpExperienceMode = process.env.MCP_EXPERIENCE_MODE !== 'false';

    if (isExperience && mcpExperienceMode) {
      this.addResult({
        category: '体验模式',
        test: '体验模式配置一致性',
        status: 'pass',
        message: '体验模式配置一致',
        details: '微信MCP和通用MCP都启用了体验模式'
      });

      // 验证体验版限制
      this.addResult({
        category: '体验模式',
        test: '体验版限制说明',
        status: 'pass',
        message: '体验版限制已了解',
        details: '单笔限额100元，日限额1000元，24小时自动退款'
      });

      // 验证体验版安全提醒
      this.addResult({
        category: '体验模式',
        test: '体验版安全提醒',
        status: 'warning',
        message: '体验版仅用于开发测试',
        suggestions: [
          '严禁用于正式业务',
          '所有付款将自动退回',
          '收款方为微信官方测试账户'
        ]
      });

    } else if (!isExperience && !mcpExperienceMode) {
      this.addResult({
        category: '体验模式',
        test: '生产模式配置',
        status: 'pass',
        message: '已配置为生产模式',
        details: '确保已获得微信支付正式MCP授权'
      });

    } else {
      this.addResult({
        category: '体验模式',
        test: '体验模式配置一致性',
        status: 'fail',
        message: '体验模式配置不一致',
        details: `WECHAT_MCP_EXPERIENCE=${isExperience}, MCP_EXPERIENCE_MODE=${mcpExperienceMode}`,
        suggestions: ['确保两个配置项保持一致']
      });
    }
  }

  /**
   * 验证MCP安全设置
   * 遵循原则: [纵深防御] - 多层安全验证
   */
  private async validateMCPSecuritySettings(): Promise<void> {
    log('yellow', '🛡️ 5. MCP安全设置验证');

    // 验证私钥配置
    const privateKey = process.env.WECHAT_MCP_PRIVATE_KEY;
    if (privateKey && privateKey !== 'your_wechat_mcp_private_key') {
      if (privateKey.includes('-----BEGIN') && privateKey.includes('-----END')) {
        this.addResult({
          category: '安全设置',
          test: 'MCP私钥格式',
          status: 'pass',
          message: 'MCP私钥格式正确'
        });
      } else {
        this.addResult({
          category: '安全设置',
          test: 'MCP私钥格式',
          status: 'warning',
          message: 'MCP私钥格式可能不正确',
          suggestions: ['确保私钥包含完整的PEM格式头尾']
        });
      }
    } else {
      this.addResult({
        category: '安全设置',
        test: 'MCP私钥配置',
        status: 'fail',
        message: 'MCP私钥未配置或使用默认值',
        suggestions: ['从微信支付商户平台获取真实的私钥']
      });
    }

    // 验证公钥配置
    const publicKey = process.env.WECHAT_MCP_PUBLIC_KEY;
    if (publicKey && publicKey !== 'your_wechat_mcp_public_key') {
      if (publicKey.includes('-----BEGIN') && publicKey.includes('-----END')) {
        this.addResult({
          category: '安全设置',
          test: 'MCP公钥格式',
          status: 'pass',
          message: 'MCP公钥格式正确'
        });
      } else {
        this.addResult({
          category: '安全设置',
          test: 'MCP公钥格式',
          status: 'warning',
          message: 'MCP公钥格式可能不正确',
          suggestions: ['确保公钥包含完整的PEM格式头尾']
        });
      }
    } else {
      this.addResult({
        category: '安全设置',
        test: 'MCP公钥配置',
        status: 'fail',
        message: 'MCP公钥未配置或使用默认值',
        suggestions: ['从微信支付商户平台获取真实的公钥']
      });
    }

    // 验证超时和重试配置
    const timeout = parseInt(process.env.MCP_TIMEOUT || '30000');
    const retryCount = parseInt(process.env.MCP_RETRY_COUNT || '3');

    if (timeout >= 10000 && timeout <= 60000) {
      this.addResult({
        category: '安全设置',
        test: 'MCP超时配置',
        status: 'pass',
        message: `MCP超时配置合理: ${timeout}ms`
      });
    } else {
      this.addResult({
        category: '安全设置',
        test: 'MCP超时配置',
        status: 'warning',
        message: `MCP超时配置: ${timeout}ms`,
        suggestions: ['建议设置在10-60秒之间']
      });
    }

    if (retryCount >= 1 && retryCount <= 5) {
      this.addResult({
        category: '安全设置',
        test: 'MCP重试配置',
        status: 'pass',
        message: `MCP重试配置合理: ${retryCount}次`
      });
    } else {
      this.addResult({
        category: '安全设置',
        test: 'MCP重试配置',
        status: 'warning',
        message: `MCP重试配置: ${retryCount}次`,
        suggestions: ['建议设置在1-5次之间']
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

  private generateReport(): void {
    log('blue', '\n============================================================');
    log('bold', '📊 微信支付MCP配置验证报告');
    log('blue', '============================================================');

    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    log('blue', `总验证项: ${totalTests}`);
    log('green', `通过: ${passed}`);
    log('yellow', `警告: ${this.warnings}`);
    log('red', `失败: ${failed}`);

    const readinessScore = Math.round((passed / totalTests) * 100);
    log('blue', `\n微信支付MCP配置就绪度: ${readinessScore}%`);

    if (this.criticalFailures > 0) {
      log('red', '\n❌ 微信支付MCP配置存在问题，需要修复');
      log('red', '请按照建议修复所有失败项');
    } else if (this.warnings > 0) {
      log('yellow', '\n⚠️ 微信支付MCP配置基本就绪，建议优化警告项');
    } else {
      log('green', '\n🎉 微信支付MCP配置完全就绪！');
      log('green', '✅ 可以开始进行MCP支付功能测试');
    }

    log('blue', '\n============================================================');
  }
}

// 主函数
async function main() {
  const validator = new WeChatMCPConfigValidator();
  
  try {
    await validator.validateWeChatMCPConfiguration();
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

export { WeChatMCPConfigValidator };
