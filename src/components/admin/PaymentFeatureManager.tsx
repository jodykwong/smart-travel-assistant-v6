/**
 * 智游助手v6.2 - 支付功能管理界面
 * 管理员界面，用于控制支付功能的启用/禁用
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { featureFlags, type FeatureFlags } from '@/lib/config/feature-flags';
import { paymentGateway } from '@/lib/payment/payment-gateway';

interface PaymentFeatureManagerProps {
  isAdmin?: boolean;
}

export const PaymentFeatureManager: React.FC<PaymentFeatureManagerProps> = ({
  isAdmin = false
}) => {
  const [flags, setFlags] = useState<FeatureFlags>(featureFlags.getAllFlags());
  const [paymentStatus, setPaymentStatus] = useState(paymentGateway.getPaymentStatus());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 监听特性开关变更
    const handleFlagsChange = (newFlags: FeatureFlags) => {
      setFlags(newFlags);
      setPaymentStatus(paymentGateway.getPaymentStatus());
    };

    featureFlags.addListener(handleFlagsChange);

    return () => {
      featureFlags.removeListener(handleFlagsChange);
    };
  }, []);

  const handleFeatureToggle = async (feature: keyof FeatureFlags, enabled: boolean) => {
    if (!isAdmin) {
      setMessage('❌ 需要管理员权限才能修改特性开关');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // 更新特性开关
      featureFlags.updateFlag(feature, enabled);
      
      // 验证配置
      const validation = featureFlags.validateConfiguration();
      if (!validation.valid) {
        setMessage(`⚠️ 配置警告: ${validation.errors.join(', ')}`);
      } else {
        setMessage(`✅ ${feature} ${enabled ? '已启用' : '已禁用'}`);
      }

      // 更新状态
      setFlags(featureFlags.getAllFlags());
      setPaymentStatus(paymentGateway.getPaymentStatus());

    } catch (error) {
      setMessage(`❌ 更新失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchToggle = async (enable: boolean) => {
    if (!isAdmin) {
      setMessage('❌ 需要管理员权限才能批量修改');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const paymentFeatures: (keyof FeatureFlags)[] = [
        'PAYMENT_ENABLED',
        'WECHAT_PAY_ENABLED',
        'ALIPAY_ENABLED',
        'PAYMENT_QR_CODE_ENABLED'
      ];

      paymentFeatures.forEach(feature => {
        featureFlags.updateFlag(feature, enable);
      });

      setMessage(`✅ 支付功能已${enable ? '批量启用' : '批量禁用'}`);
      setFlags(featureFlags.getAllFlags());
      setPaymentStatus(paymentGateway.getPaymentStatus());

    } catch (error) {
      setMessage(`❌ 批量操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 支付功能状态概览 */}
      <Card title="支付功能状态" className="mb-6">
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${paymentStatus.enabled ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-semibold ${paymentStatus.enabled ? 'text-green-800' : 'text-red-800'}`}>
                  {paymentStatus.enabled ? '✅ 支付功能已启用' : '❌ 支付功能已禁用'}
                </h3>
                <p className={`text-sm ${paymentStatus.enabled ? 'text-green-600' : 'text-red-600'}`}>
                  {paymentStatus.message}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">可用支付方式</p>
                <p className="font-mono text-lg">
                  {paymentStatus.availableMethods.length}
                </p>
              </div>
            </div>
          </div>

          {paymentStatus.availableMethods.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">支持的支付方式:</h4>
              <div className="flex flex-wrap gap-2">
                {paymentStatus.availableMethods.map(method => (
                  <span
                    key={method}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 特性开关控制 */}
      <Card title="支付特性开关控制" subtitle={isAdmin ? "管理员模式" : "只读模式"}>
        <div className="space-y-6">
          {/* 批量操作 */}
          {isAdmin && (
            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
              <Button
                onClick={() => handleBatchToggle(true)}
                disabled={isLoading}
                variant="primary"
                size="sm"
              >
                批量启用支付
              </Button>
              <Button
                onClick={() => handleBatchToggle(false)}
                disabled={isLoading}
                variant="secondary"
                size="sm"
              >
                批量禁用支付
              </Button>
            </div>
          )}

          {/* 主要支付开关 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">主要支付功能</h4>
            
            <Checkbox
              checked={flags.PAYMENT_ENABLED}
              onChange={(e) => handleFeatureToggle('PAYMENT_ENABLED', e.target.checked)}
              disabled={!isAdmin || isLoading}
              label="支付功能总开关"
            />

            <div className="ml-6 space-y-3">
              <Checkbox
                checked={flags.WECHAT_PAY_ENABLED}
                onChange={(e) => handleFeatureToggle('WECHAT_PAY_ENABLED', e.target.checked)}
                disabled={!isAdmin || isLoading || !flags.PAYMENT_ENABLED}
                label="微信支付"
              />

              <Checkbox
                checked={flags.ALIPAY_ENABLED}
                onChange={(e) => handleFeatureToggle('ALIPAY_ENABLED', e.target.checked)}
                disabled={!isAdmin || isLoading || !flags.PAYMENT_ENABLED}
                label="支付宝支付"
              />

              <Checkbox
                checked={flags.STRIPE_ENABLED}
                onChange={(e) => handleFeatureToggle('STRIPE_ENABLED', e.target.checked)}
                disabled={!isAdmin || isLoading || !flags.PAYMENT_ENABLED}
                label="Stripe支付"
              />

              <Checkbox
                checked={flags.PAYMENT_QR_CODE_ENABLED}
                onChange={(e) => handleFeatureToggle('PAYMENT_QR_CODE_ENABLED', e.target.checked)}
                disabled={!isAdmin || isLoading || !flags.PAYMENT_ENABLED}
                label="二维码支付"
              />
            </div>
          </div>

          {/* 安全功能 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">安全功能</h4>
            
            <Checkbox
              checked={flags.PAYMENT_ENCRYPTION_ENABLED}
              onChange={(e) => handleFeatureToggle('PAYMENT_ENCRYPTION_ENABLED', e.target.checked)}
              disabled={!isAdmin || isLoading}
              label="支付数据加密"
            />
          </div>

          {/* 状态消息 */}
          {message && (
            <div className={`p-3 rounded-lg ${
              message.startsWith('✅') ? 'bg-green-50 text-green-800' :
              message.startsWith('⚠️') ? 'bg-yellow-50 text-yellow-800' :
              'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* 环境提示 */}
          {process.env.NODE_ENV === 'production' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 text-sm">
                ⚠️ 生产环境：特性开关修改需要重启服务才能生效
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* 使用说明 */}
      <Card title="使用说明">
        <div className="space-y-3 text-sm text-gray-600">
          <p>• <strong>支付功能总开关</strong>：控制整个支付系统的启用状态</p>
          <p>• <strong>具体支付方式</strong>：在总开关启用的前提下，可单独控制各支付渠道</p>
          <p>• <strong>批量操作</strong>：快速启用或禁用所有支付相关功能</p>
          <p>• <strong>实时生效</strong>：开发环境下修改立即生效，生产环境需重启服务</p>
          <p>• <strong>安全提示</strong>：只有管理员可以修改特性开关配置</p>
        </div>
      </Card>
    </div>
  );
};

export default PaymentFeatureManager;
