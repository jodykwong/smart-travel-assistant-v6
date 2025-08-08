# 智游助手v6.2 - 支付功能设置指南

## 概述

本文档详细说明如何在智游助手v6.2中设置和启用支付功能。系统使用特性开关(Feature Flags)模式，支持动态控制支付功能的启用/禁用。

## 特性开关系统

### 核心概念

特性开关允许在不修改代码的情况下控制功能的启用状态，具有以下优势：

- **动态控制**: 运行时启用/禁用功能
- **精细管理**: 独立控制各支付方式
- **安全可控**: 管理员权限验证
- **配置验证**: 自动检查依赖关系

### 支付相关开关

| 开关名称 | 环境变量 | 默认值 | 说明 |
|---------|----------|--------|------|
| PAYMENT_ENABLED | ENABLE_PAYMENT | false | 支付功能总开关 |
| WECHAT_PAY_ENABLED | ENABLE_WECHAT_PAY | false | 微信支付 |
| ALIPAY_ENABLED | ENABLE_ALIPAY | false | 支付宝支付 |
| STRIPE_ENABLED | ENABLE_STRIPE | false | Stripe支付 |
| PAYMENT_QR_CODE_ENABLED | ENABLE_PAYMENT_QR_CODE | false | 二维码支付 |
| PAYMENT_ENCRYPTION_ENABLED | ENABLE_PAYMENT_ENCRYPTION | false | 支付数据加密 |

## 启用方法

### 方法一：管理员界面 (推荐)

1. **访问管理界面**
   ```
   http://localhost:3001/admin/payment-features
   ```

2. **身份验证**
   - 开发环境：自动获取演示权限
   - 生产环境：需要有效的管理员凭据

3. **功能控制**
   - 使用批量操作快速启用/禁用
   - 单独控制各支付方式
   - 实时查看配置状态

### 方法二：环境变量配置

1. **编辑环境变量文件**
   ```bash
   # .env 或 .env.local
   ENABLE_PAYMENT=true
   ENABLE_WECHAT_PAY=true
   ENABLE_ALIPAY=true
   ENABLE_PAYMENT_QR_CODE=true
   ENABLE_PAYMENT_ENCRYPTION=true
   ```

2. **重启应用**
   ```bash
   # 开发环境
   npm run dev
   
   # 生产环境
   npm run build
   npm start
   ```

### 方法三：代码中动态控制 (仅开发环境)

```typescript
import { featureFlags } from '@/lib/config/feature-flags';

// 启用支付功能
featureFlags.updateFlag('PAYMENT_ENABLED', true);
featureFlags.updateFlag('WECHAT_PAY_ENABLED', true);

// 检查状态
console.log('支付功能状态:', featureFlags.isEnabled('PAYMENT_ENABLED'));
console.log('可用支付方式:', featureFlags.getAvailablePaymentMethods());
```

## 支付服务配置

### 微信支付配置

1. **申请微信支付商户号**
   - 访问: https://pay.weixin.qq.com/
   - 完成商户认证流程
   - 获取必要的配置信息

2. **配置环境变量**
   ```bash
   # 微信支付基础配置
   WECHAT_PAY_APP_ID=wx1234567890abcdef
   WECHAT_PAY_MCH_ID=1234567890
   WECHAT_PAY_API_KEY=your_32_character_api_key_here
   
   # 证书配置 (API v3)
   WECHAT_PAY_CERT_PATH=./certs/wechat/apiclient_cert.pem
   WECHAT_PAY_KEY_PATH=./certs/wechat/apiclient_key.pem
   WECHAT_PAY_SERIAL_NO=your_certificate_serial_number
   
   # 回调配置
   WECHAT_PAY_NOTIFY_URL=https://yourdomain.com/api/payment/wechat/notify
   ```

3. **证书文件配置**
   ```bash
   # 创建证书目录
   mkdir -p certs/wechat
   
   # 下载并放置证书文件
   # apiclient_cert.pem - 商户证书
   # apiclient_key.pem - 商户私钥
   ```

### 支付宝配置

1. **申请支付宝开放平台账号**
   - 访问: https://open.alipay.com/
   - 创建应用并完成审核
   - 配置应用公钥和获取支付宝公钥

2. **配置环境变量**
   ```bash
   # 支付宝基础配置
   ALIPAY_APP_ID=2021000000000000
   ALIPAY_PRIVATE_KEY=MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwgg...
   ALIPAY_PUBLIC_KEY=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
   
   # 网关配置
   ALIPAY_GATEWAY_URL=https://openapi.alipay.com/gateway.do
   # 沙盒环境: https://openapi.alipaydev.com/gateway.do
   
   # 回调配置
   ALIPAY_NOTIFY_URL=https://yourdomain.com/api/payment/alipay/notify
   ALIPAY_RETURN_URL=https://yourdomain.com/payment/result
   ```

### Stripe配置

1. **申请Stripe账号**
   - 访问: https://stripe.com/
   - 完成账号验证
   - 获取API密钥

2. **配置环境变量**
   ```bash
   # Stripe配置
   STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   
   # 生产环境使用 pk_live_ 和 sk_live_ 前缀的密钥
   ```

## 数据库配置

### 支付相关表结构

```sql
-- 支付记录表
CREATE TABLE payments (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    status ENUM('pending', 'completed', 'failed', 'cancelled') NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 支付日志表
CREATE TABLE payment_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    request_data JSON,
    response_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_payment_id (payment_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);
```

## 安全配置

### 支付数据加密

1. **启用加密功能**
   ```bash
   ENABLE_PAYMENT_ENCRYPTION=true
   PAYMENT_ENCRYPTION_KEY=your_32_character_encryption_key
   PAYMENT_ENCRYPTION_ALGORITHM=aes-256-gcm
   ```

2. **加密范围**
   - 支付凭据信息
   - 用户敏感数据
   - 交易记录详情

### 网络安全

1. **HTTPS配置**
   ```bash
   # 生产环境必须使用HTTPS
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

2. **IP白名单** (可选)
   ```bash
   # 限制支付回调来源IP
   PAYMENT_ALLOWED_IPS=127.0.0.1,::1,支付服务商IP
   ```

## 测试验证

### 单元测试

```bash
# 运行支付相关测试
npm run test -- --grep "payment"

# 运行特性开关测试
npm run test -- --grep "feature-flag"
```

### 集成测试

```bash
# 端到端支付流程测试
npm run test:e2e:payment

# 支付回调测试
npm run test:webhook
```

### 手动测试清单

- [ ] 支付功能开关控制
- [ ] 各支付方式创建订单
- [ ] 支付成功回调处理
- [ ] 支付失败处理
- [ ] 订单状态查询
- [ ] 退款功能 (如果支持)
- [ ] 异常情况处理

## 监控和日志

### 日志配置

```bash
# 启用支付日志
ENABLE_PAYMENT_LOGGING=true
PAYMENT_LOG_LEVEL=info

# 日志文件路径
PAYMENT_LOG_FILE=./logs/payment.log
```

### 监控指标

- 支付成功率
- 平均处理时间
- 错误率统计
- 各支付方式使用情况

## 故障排除

### 常见问题

1. **支付功能无法启用**
   - 检查特性开关配置
   - 验证环境变量设置
   - 查看管理员权限

2. **支付接口调用失败**
   - 验证API凭据配置
   - 检查网络连接
   - 查看支付服务商状态

3. **回调处理异常**
   - 验证回调URL配置
   - 检查签名验证逻辑
   - 查看服务器日志

### 获取支持

- **文档**: 查看本文档和相关API文档
- **日志**: 检查 `/admin/logs` 页面
- **管理界面**: 使用 `/admin/payment-features` 诊断
- **技术支持**: tech-support@smarttravel.ai

## 版本历史

- **v6.2.0**: 引入特性开关系统
- **v6.1.0**: 基础支付功能实现
- **v6.0.0**: 项目初始版本

---
**文档版本**: v6.2.0  
**最后更新**: 2025年8月8日  
**维护者**: 智游助手开发团队
