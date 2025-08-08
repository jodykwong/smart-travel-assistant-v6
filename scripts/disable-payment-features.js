#!/usr/bin/env node

/**
 * 批量注释支付功能脚本
 * 临时禁用所有支付相关功能，确保不影响其他核心功能
 */

const fs = require('fs');
const path = require('path');

// 需要处理的支付相关文件
const paymentFiles = [
  // 支付服务核心文件
  'src/lib/payment/wechat-pay-mcp-client.ts',
  'src/lib/payment/mcp/wechat-pay-mcp-client.ts',
  'src/lib/payment/mcp/alipay-mcp-client.ts',
  'src/lib/payment/mcp/mcp-types.ts',
  'src/lib/payment/mcp/mcp-utils.ts',
  'src/lib/payment/qr-code/qr-payment-adapter.ts',
  'src/lib/payment/qr-code/qr-payment-service.ts',
  
  // API路由
  'src/pages/api/payment/create-order.ts',
  'src/pages/api/payment/process-payment.ts',
  'src/pages/api/payment/query.ts',
  'src/pages/api/payment/refund.ts',
  'src/pages/api/payment/verify-payment.ts',
  'src/pages/api/wechat-pay-mcp/create-order.ts',
  
  // React组件
  'src/components/payment/PaymentProofUpload.tsx',
  'src/components/payment/WechatPayMCPDemo.tsx',
  
  // API文件
  'src/api/wechat-pay-mcp.ts'
];

// 需要在文件开头添加的注释
const disableComment = `
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================
`;

// 需要注释的导入语句模式
const importPatterns = [
  /import.*from.*payment.*mcp.*/g,
  /import.*WeChatPayMCPClient.*/g,
  /import.*AlipayMCPClient.*/g,
  /import.*qr-payment.*/g,
  /import.*payment-gateway.*/g
];

// 需要注释的函数调用模式
const functionPatterns = [
  /.*\.createPayment\(/g,
  /.*\.processPayment\(/g,
  /.*\.queryPayment\(/g,
  /.*\.refundPayment\(/g,
  /.*wechatMCPClient\./g,
  /.*alipayMCPClient\./g
];

function commentOutFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return;
  }

  console.log(`🔄 处理文件: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 在文件开头添加禁用注释
  if (!content.includes('支付功能临时禁用')) {
    content = disableComment + '\n' + content;
  }
  
  // 注释掉导入语句
  importPatterns.forEach(pattern => {
    content = content.replace(pattern, (match) => `// ${match} // 临时禁用`);
  });
  
  // 注释掉函数调用
  functionPatterns.forEach(pattern => {
    content = content.replace(pattern, (match) => `// ${match} // 临时禁用`);
  });
  
  // 添加导出禁用标记
  if (content.includes('export default') || content.includes('export class') || content.includes('export function')) {
    content = content.replace(
      /(export\s+(default\s+)?(class|function|const|let|var)\s+\w+)/g,
      '// $1 // 临时禁用支付功能'
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ 完成处理: ${filePath}`);
}

function commentOutDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  目录不存在: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      commentOutDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      commentOutFile(filePath);
    }
  });
}

// 创建支付功能状态文件
function createPaymentStatusFile() {
  const statusContent = `# 支付功能状态

## 当前状态: 临时禁用 ❌

### 禁用原因:
- 依赖问题导致支付模块无法正常工作
- 微信支付MCP客户端配置缺失
- 支付宝客户端认证问题

### 禁用范围:
- 微信支付MCP集成
- 支付宝支付集成  
- QR码支付功能
- 支付网关服务
- 支付相关API接口
- 支付UI组件

### 不受影响的功能:
✅ 旅游规划核心功能
✅ 用户认证系统
✅ 地图服务集成
✅ 数据缓存服务
✅ 监控和日志系统

### 重新启用计划:
1. 第二阶段完成核心功能开发后
2. 解决支付服务依赖问题
3. 配置正确的支付服务凭证
4. 完成端到端支付流程测试

### 临时解决方案:
- 用户可以正常使用旅游规划功能
- 支付相关页面显示"功能维护中"提示
- 保留支付代码结构，便于后续恢复

---
生成时间: ${new Date().toISOString()}
`;

  fs.writeFileSync('PAYMENT_STATUS.md', statusContent);
  console.log('📄 创建支付状态文件: PAYMENT_STATUS.md');
}

// 主执行逻辑
console.log('🚀 开始批量禁用支付功能...\n');

// 处理单个文件
paymentFiles.forEach(filePath => {
  commentOutFile(filePath);
});

// 处理整个支付目录
console.log('\n📁 处理支付相关目录...');
commentOutDirectory('src/lib/payment');
commentOutDirectory('src/pages/api/payment');
commentOutDirectory('src/pages/api/wechat-pay-mcp');
commentOutDirectory('src/components/payment');

// 创建状态文件
createPaymentStatusFile();

console.log('\n🎉 支付功能禁用完成！');
console.log('📋 查看 PAYMENT_STATUS.md 了解详细状态');
console.log('🔄 可以安全地继续开发其他核心功能');
