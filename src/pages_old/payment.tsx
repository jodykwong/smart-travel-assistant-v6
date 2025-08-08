import React, { useState } from 'react';
import Head from 'next/head';

// 支付结果接口
interface PaymentResult {
  success: boolean;
  paymentId?: string;
  outTradeNo?: string;
  qrCode?: string;
  paymentUrl?: string;
  error?: string;
}

// 表单数据接口
interface FormData {
  serviceType: string;
  amount: number;
  description: string;
  paymentMethod: 'wechat' | 'alipay';
  paymentType: 'h5' | 'qr';
}

export default function PaymentPage() {
  // 状态定义
  const [formData, setFormData] = useState<FormData>({
    serviceType: 'travel-planning',
    amount: 9900, // 99元，以分为单位
    description: '智游助手旅游规划服务',
    paymentMethod: 'wechat',
    paymentType: 'h5'
  });

  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 退款相关状态
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrderNo, setRefundOrderNo] = useState<string>('');

  // 服务类型选项
  const serviceOptions = [
    { value: 'travel-planning', label: '旅游规划服务', price: 99 },
    { value: 'vip-service', label: 'VIP专属服务', price: 299 },
    { value: 'custom-planning', label: '定制规划服务', price: 599 }
  ];

  // 处理服务类型选择
  const handleServiceChange = (serviceType: string) => {
    const service = serviceOptions.find(s => s.value === serviceType);
    if (service) {
      setFormData(prev => ({
        ...prev,
        serviceType,
        amount: service.price * 100, // 转换为分
        description: `智游助手${service.label}`
      }));
    }
  };

  // 处理支付方式选择
  const handlePaymentMethodChange = (method: 'wechat' | 'alipay') => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
  };

  // 处理支付类型选择
  const handlePaymentTypeChange = (type: 'h5' | 'qr') => {
    setFormData(prev => ({ ...prev, paymentType: type }));
  };

  // 创建支付订单
  const handleCreatePayment = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setPaymentResult(data);
      } else {
        setError(data.error || '创建支付订单失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 查询支付状态
  const handleQueryPayment = async (outTradeNo: string) => {
    try {
      const response = await fetch(`/api/payment/query?outTradeNo=${outTradeNo}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        alert(`支付状态: ${data.status}`);
      } else {
        alert(`查询失败: ${data.error}`);
      }
    } catch (err) {
      alert('查询失败，请稍后重试');
    }
  };

  // 退款相关函数
  const handleRefundRequest = (outTradeNo: string) => {
    setRefundOrderNo(outTradeNo);
    setShowRefundModal(true);
  };

  const handleSubmitRefund = async () => {
    // 实现退款提交逻辑
    setShowRefundModal(false);
    // 显示退款成功提示
    alert('退款申请已提交');
  };

  return (
    <>
      <Head>
        <title>支付中心 - 智游助手v6.2</title>
        <meta name="description" content="智游助手支付中心，支持微信支付和支付宝" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">支付中心</h1>
            <p className="mt-2 text-gray-600">选择服务并完成支付</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            {/* 服务选择 */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">选择服务</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="service-selector">
                {serviceOptions.map(service => (
                  <div
                    key={service.value}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.serviceType === service.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => handleServiceChange(service.value)}
                  >
                    <h3 className="font-medium text-gray-900">{service.label}</h3>
                    <p className="text-2xl font-bold text-indigo-600 mt-2">¥{service.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 订单信息 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">订单信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>服务名称:</span>
                  <span data-testid="order-description">{formData.description}</span>
                </div>
                <div className="flex justify-between">
                  <span>订单金额:</span>
                  <span className="font-medium text-indigo-600" data-testid="order-amount">
                    ¥{(formData.amount / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* 支付方式选择 */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">选择支付方式</h2>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wechat"
                    checked={formData.paymentMethod === 'wechat'}
                    onChange={() => handlePaymentMethodChange('wechat')}
                    className="mr-3"
                    data-testid="payment-method-wechat"
                  />
                  <div>
                    <div className="font-medium text-gray-900">微信支付</div>
                    <div className="text-sm text-gray-500">安全便捷的移动支付</div>
                  </div>
                </label>

                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="alipay"
                    checked={formData.paymentMethod === 'alipay'}
                    onChange={() => handlePaymentMethodChange('alipay')}
                    className="mr-3"
                    data-testid="payment-method-alipay"
                  />
                  <div>
                    <div className="font-medium text-gray-900">支付宝</div>
                    <div className="text-sm text-gray-500">支付宝安全支付</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 支付类型选择 */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">支付类型</h2>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentType"
                    value="h5"
                    checked={formData.paymentType === 'h5'}
                    onChange={() => handlePaymentTypeChange('h5')}
                    className="mr-2"
                    data-testid="payment-type-h5"
                  />
                  <span>手机支付</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentType"
                    value="qr"
                    checked={formData.paymentType === 'qr'}
                    onChange={() => handlePaymentTypeChange('qr')}
                    className="mr-2"
                    data-testid="payment-type-qr"
                  />
                  <span>扫码支付</span>
                </label>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4" data-testid="payment-error">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* 支付按钮 */}
            <div className="mb-6">
              <button
                onClick={handleCreatePayment}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-md text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="create-payment-button"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    创建支付订单...
                  </div>
                ) : (
                  `立即支付 ¥${(formData.amount / 100).toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}